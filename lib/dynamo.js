import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "ap-south-1";
const tableName = process.env.DYNAMODB_TABLE || "PulseGlobeNews";

const client = new DynamoDBClient({ region });
const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
});

export async function listRecentNews() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    IndexName: "NewsByTime",
    KeyConditionExpression: "#pk = :pk AND #createdAt >= :cutoff",
    ExpressionAttributeNames: {
      "#pk": "pk",
      "#createdAt": "createdAt"
    },
    ExpressionAttributeValues: {
      ":pk": "NEWS",
      ":cutoff": cutoff
    },
    ScanIndexForward: false,
    Limit: 100
  }));
  return result.Items || [];
}

export async function putNews(item) {
  await db.send(new PutCommand({
    TableName: tableName,
    Item: {
      pk: "NEWS",
      id: item.id,
      title: item.title,
      summary: item.summary,
      city: item.city,
      category: item.category,
      lat: Number(item.lat),
      lon: Number(item.lon),
      createdAt: Number(item.createdAt),
      expiresAt: Math.floor(Number(item.createdAt) / 1000) + 24 * 60 * 60
    }
  }));
}

export async function deleteNews(id) {
  await db.send(new DeleteCommand({
    TableName: tableName,
    Key: { pk: "NEWS", id }
  }));
}