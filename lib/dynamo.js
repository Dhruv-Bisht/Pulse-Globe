import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";

const TABLE = process.env.DYNAMODB_TABLE || "PulseNews";
const DAY_MS = 24 * 60 * 60 * 1000;

// Credentials come from the standard AWS SDK chain: an attached IAM role
// (EC2 / App Runner / Amplify compute), an `aws configure` profile, or
// AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars. Nothing is hardcoded.
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const doc = DynamoDBDocumentClient.from(client);

/**
 * Returns every item posted within the last 24 hours, newest first.
 * Uses a Scan + FilterExpression, which is fine at this table's expected
 * size (a rolling day of news items). If you outgrow Scan, add a GSI with
 * a constant partition key and `timestamp` as the sort key and swap this
 * for a Query — the item shape doesn't need to change.
 */
export async function listActiveNews() {
  const cutoff = Date.now() - DAY_MS;
  const res = await doc.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: "#ts > :cutoff",
      ExpressionAttributeNames: { "#ts": "timestamp" },
      ExpressionAttributeValues: { ":cutoff": cutoff }
    })
  );
  const items = res.Items || [];
  items.sort((a, b) => b.timestamp - a.timestamp);
  return items;
}

/**
 * Writes one news item. `ttl` is a DynamoDB Time To Live attribute (epoch
 * seconds) — enable TTL on this attribute in the table settings and
 * DynamoDB will automatically purge the row roughly 24h after it's posted,
 * as background housekeeping. listActiveNews()'s timestamp filter is what
 * actually enforces "gone after 24h" for readers in the meantime, since TTL
 * deletion isn't instant.
 */
export async function putNewsItem(item) {
  const ttl = Math.floor(item.timestamp / 1000) + 24 * 60 * 60;
  await doc.send(
    new PutCommand({
      TableName: TABLE,
      Item: { ...item, ttl }
    })
  );
  return item;
}

export async function deleteNewsItem(id) {
  await doc.send(new DeleteCommand({ TableName: TABLE, Key: { id } }));
}
