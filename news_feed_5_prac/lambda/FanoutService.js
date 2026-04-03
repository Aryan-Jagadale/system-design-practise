import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const FOLLOWS_TABLE = "Follows";
const USERFEED_TABLE = "UserFeed";


export const handler = async (event) => {
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const { postId, creatorId, createdAt } = message;

      console.log(`Processing fanout for post ${postId} by ${creatorId}`);

      // Step 1: Get all followers of this creator
      const followers = await getFollowers(creatorId);

      // Step 2: Hybrid Fan-out
      for (const follower of followers) {
        const isHeavy = follower.isHeavyFollowee || false;

        if (!isHeavy) {
          // Normal user → Precompute (fan-out on write)
          await writeToUserFeed(follower.followerId, postId, creatorId, createdAt);
        }
        // For heavy/celebrity followees → we SKIP (will be pulled on read)
      }

      console.log(`Fanout completed for post ${postId}. Processed ${followers.length} followers.`);

    } catch (error) {
      console.error("Fanout error:", error);
      // In production, you would send to Dead Letter Queue
    }
  }
};


// Helper: Get all followers of a user
async function getFollowers(creatorId) {
  const params = {
    TableName: FOLLOWS_TABLE,
    IndexName: "FolloweeIndex",   // GSI we created
    KeyConditionExpression: "followeeId = :creatorId",
    ExpressionAttributeValues: {
      ":creatorId": creatorId
    }
  };

  const result = await docClient.send(new QueryCommand(params));
  return result.Items || [];
}


// Helper: Write one post to a user's precomputed feed
async function writeToUserFeed(userId, postId, creatorId, createdAt) {
  const sortKey = `${createdAt}#${postId}`;

  await docClient.send(new PutCommand({
    TableName: USERFEED_TABLE,
    Item: {
      userId,
      "createdAt#postId": sortKey,
      postId,
      creatorId,
      createdAt
    }
  }));
}