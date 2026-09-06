import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "ap-south-1";
const tableName = process.env.DYNAMODB_TABLE || "PulseGlobeNews";

const client = new DynamoDBClient({ region });
const db = DynamoDBDocumentClient.from(client);

export async function listRecentNews() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    IndexName: "NewsByTime",
    KeyConditionExpression: "#pk = :pk AND #createdAt >= :cutoff",
    ExpressionAttributeNames: { "#pk": "pk", "#createdAt": "createdAt" },
    ExpressionAttributeValues: { ":pk": "NEWS", ":cutoff": cutoff },
    ScanIndexForward: false,
    Limit: 100
  }));
  return result.Items || [];
}

export async function putNews(item) {
  await db.send(new PutCommand({ TableName: tableName, Item: item }));
  return item;
}

export async function deleteNews(id) {
  await db.send(new DeleteCommand({
    TableName: tableName,
    Key: { pk: "NEWS", id }
  }));
}