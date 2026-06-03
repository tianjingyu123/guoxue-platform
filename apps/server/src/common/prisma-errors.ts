import { Prisma } from "@prisma/client";

/** 检查 Prisma 唯一约束冲突错误（P2002） */
export function isUniqueConstraintError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}
