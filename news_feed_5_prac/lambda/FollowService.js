import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const FOLLOWS_TABLE = "Follows";


export const handler = async (event) => {
  try {

    const body = JSON.parse(event.body);
    const { followerId, followeeId, isHeavyFollowee = false } = body;

    if (!followerId || !followeeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "followerId and followeeId are required" })
      };
    }

    const createdAt = new Date().toISOString();

    await docClient.send(new PutCommand({
      TableName: FOLLOWS_TABLE,
      Item: {
        followerId,
        followeeId,
        isHeavyFollowee,
        createdAt
      }
    }));

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Followed successfully",
        followerId,
        followeeId
      })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" })
    };
  }
};
