import { Prisma } from "@prisma/client";

/** Prisma 的 Date 原始参数是 timestamptz；显式传 UTC 文本，避免写入 TIMESTAMP(3) 时受会话时区偏移。 */
export function capabilityTimestamp(value: Date | null): Prisma.Sql {
  if (value !== null && (!(value instanceof Date) || !Number.isFinite(value.getTime()))) throw new Error("CAPABILITY_INVALID_TIMESTAMP");
  return Prisma.sql`${value === null ? null : value.toISOString()}::timestamp(3)`;
}
