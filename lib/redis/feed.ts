import { redis } from "./client";

export function rankScore(input: { hoursOld: number; engagement: number; relationship: number }) {
  const recency = Math.exp(-input.hoursOld / 48);
  const engagement = Math.log(1 + input.engagement);
  const relationship = input.relationship / (1 + input.relationship);
  return recency * 0.35 + engagement * 0.40 + relationship * 0.25;
}

export async function pushToFeed(feedKey: string, itemId: string, score: number) {
  await redis.zadd(feedKey, { score, member: itemId });
}

export async function getFeed(feedKey: string, limit = 20) {
  return redis.zrange(feedKey, 0, limit - 1, { rev: true });
}

export async function invalidateFeed(feedKey: string) {
  await redis.del(feedKey);
}

export function userFeedKey(userId: string, tab: string) {
  return `feed:user:${userId}:${tab}`;
}
