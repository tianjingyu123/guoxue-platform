import { randomUUID } from "node:crypto";

const LEGACY_PREFIX = "[public-reply:v1]\n";
/** 事件和公开回复随结案一起保存；只补发新版结案，不扫描旧内部备注。 */
export const FEEDBACK_REPLY_EVENT_PATTERN = String.raw`^\[public-reply:v2:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\]\n`;
const eventPattern = new RegExp(FEEDBACK_REPLY_EVENT_PATTERN);

export function publicFeedbackReply(result: string | null): string | null {
  if (!result) return null;
  if (result.startsWith(LEGACY_PREFIX)) return result.slice(LEGACY_PREFIX.length);
  const match = eventPattern.exec(result);
  return match ? result.slice(match[0].length) : null;
}

export function encodeFeedbackReply(reply: string, isTicket: boolean): string {
  const prefix = isTicket ? `[public-reply:v2:${randomUUID()}]\n` : LEGACY_PREFIX;
  return prefix + reply.trim().slice(0, 1000 - prefix.length);
}
