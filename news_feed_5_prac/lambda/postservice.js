import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sqsClient = new SQSClient({});

const POSTS_TABLE = "Posts";
const FANOUT_QUEUE_URL = "";


export const handler = async (event) => {

  try {
    if(!event){
      return {
        statusCode: 400,
        body:
          JSON.stringify({ message: "Invalid request" })
        }
    }
    const body = JSON.parse(event.body);
    const { content, creatorId } = body;

    if (!content || !creatorId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "content and creatorId are required" })
      };
    }
    const postId = `post_${Date.now()}`;
    const createdAt = new Date().toISOString();


    await docClient.send(new PutCommand({
      TableName: POSTS_TABLE,
      Item: {
        postId,
        content,
        creatorId,
        createdAt
      }
    }));


    await sqsClient.send(new SendMessageCommand({
      QueueUrl: FANOUT_QUEUE_URL,
      MessageBody: JSON.stringify({
        postId,
        creatorId,
        createdAt
      }),
      MessageAttributes: {
        Type: {
          DataType: "String",
          StringValue: "NewPost"
        }
      }
    }));


    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Post created successfully",
        postId,
        creatorId
      })
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: error.message })
    };

  }



};
