import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
// import { Redis } from '@upstash/redis';

// const redis = new Redis({
//   url: '',
//   token: '',
// });


const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const USERFEED_TABLE = "UserFeed";
const POSTS_TABLE = "Posts";
const FOLLOWS_TABLE = "Follows";

export const handler = async (event) => {
  try {
    const userId = event.queryStringParameters?.userId;
    let cursor = event.queryStringParameters?.cursor;   // nextToken

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ message: "userId is required" }) };
    }

    const limit = 10;
    // const cacheKey = `feed:${userId}:${cursor}`;

    // const cachedFeed = await redis.get(cacheKey);
    // if (cachedFeed) {
    //   console.log("Cache hit for", cacheKey);
    //   return {
    //     statusCode: 200,
    //     body: cachedFeed
    //   };
    // }

    const precomputedPosts = await getPrecomputedFeed(userId, cursor, limit);
    const heavyFollowees = await getHeavyFollowees(userId);

    console.log("heavyFollowees", heavyFollowees)
    console.log("cursor", cursor)

    let celebrityPosts = [];

    if (heavyFollowees.length > 0) {
      celebrityPosts = await getRecentCelebrityPosts(heavyFollowees, cursor);
    }

    let allPosts = [...precomputedPosts, ...celebrityPosts];
    const seen = new Set();
    allPosts = allPosts.filter(post => {
      if (seen.has(post.postId)) {
        return false;
      }
      seen.add(post.postId);
      return true;
    });
    allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Take only 'limit' number of posts
    const resultPosts = allPosts.slice(0, limit);

    // console.log("resultPosts", resultPosts);
    const allPostIds = resultPosts.map(item => item.postId);
    // console.log("allPostIds", allPostIds);
    const fullPostsMap = await getFullPosts(allPostIds);
    // console.log("fullPostsMap", fullPostsMap);

    const finalPosts = resultPosts.map(item => ({
      ...fullPostsMap[item.postId],
    }));



    // Step 5: Generate new cursor for next page
    const newCursor = resultPosts.length > 0
      ? resultPosts[resultPosts.length - 1].createdAt + "#" + resultPosts[resultPosts.length - 1].postId
      : null;
    // console.log("newCursor", newCursor);

    const responseBody = JSON.stringify({
      posts: finalPosts,
      nextCursor: newCursor,
      count: finalPosts.length
    });

    // await redis.set(cacheKey, responseBody, { ex: 60 });

    return {
      statusCode: 200,
      body: responseBody
    };

  } catch (error) {
    console.error("Feed error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" })
    };
  }
};


// Get precomputed feed with cursor support
async function getPrecomputedFeed(userId, cursor, limit) {
  const params = {
    TableName: USERFEED_TABLE,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId
    },
    ScanIndexForward: false,   // descending = newest first
    Limit: limit + 10
  };

  // Add cursor condition only if cursor is provided
  if (cursor) {
    params.KeyConditionExpression += " AND #sortKey < :cursor";
    params.ExpressionAttributeNames = {
      "#sortKey": "createdAt#postId"
    };
    params.ExpressionAttributeValues[":cursor"] = cursor;
  }

  const result = await docClient.send(new QueryCommand(params));
  return result.Items || [];
}

async function getHeavyFollowees(userId) {
  const params = {
    TableName: FOLLOWS_TABLE,
    KeyConditionExpression: "followerId = :userId",
    FilterExpression: "isHeavyFollowee = :true",
    ExpressionAttributeValues: {
      ":userId": userId,
      ":true": true
    }
  };
  const result = await docClient.send(new QueryCommand(params));
  return result.Items ? result.Items.map(item => item.followeeId) : [];
}

async function getRecentCelebrityPosts(celebrityIds, cursor) {
  const posts = [];
  const cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  for (const celebrityId of celebrityIds) {
    const params = {
      TableName: POSTS_TABLE,
      IndexName: "CreatorIndex",
      KeyConditionExpression: "creatorId = :celebId AND createdAt > :cutoff",
      ExpressionAttributeValues: {
        ":celebId": celebrityId,
        ":cutoff": cutoffTime
      },
      ScanIndexForward: false,
      Limit: 10
    };

    const result = await docClient.send(new QueryCommand(params));
    if (result.Items) {
      posts.push(...result.Items);
    }
  }

  return posts;   // ← Moved outside the loop
}


async function getFullPosts(postIds) {
  if (postIds.length === 0) return {};

  const uniquePostIds = [...new Set(postIds)];

  const params = {
    RequestItems: {
      [POSTS_TABLE]: {
        Keys: uniquePostIds.map(postId => ({ postId })),
        ProjectionExpression: "postId, content, creatorId, createdAt"
      }
    }
  };

  const result = await docClient.send(new BatchGetCommand(params));
  const items = result.Responses?.[POSTS_TABLE] || [];

  // 🔹 Step 2: Convert to map
  const postMap = {};
  items.forEach(post => {
    postMap[post.postId] = post;
  });

  return postMap;
}


