/**
 * M4 Auth 表手机号加密回填（一次性·幂等）。
 * provider=PHONE 的记录，openId/credential 若是明文手机号 → 改为 phoneHmac（确定性哈希）。
 * 已是哈希(64hex)或非手机号的不动。前台 tsx 连 5433 跑。
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  const pick = (file: string, key: string) => {
    try {
      const env = readFileSync(file, "utf8");
      const m = env.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\n\\r]+)"?`, "m"));
      return m ? m[1].trim() : undefined;
    } catch {
      return undefined;
    }
  };
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      pick(join(__dirname, "..", ".env"), "DATABASE_URL") || pick(join(__dirname, "..", "..", "..", ".env"), "DATABASE_URL")!;
  }
  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY =
      pick(join(__dirname, "..", "..", "..", ".env"), "ENCRYPTION_KEY") || pick(join(__dirname, "..", ".env"), "ENCRYPTION_KEY")!;
  }
}

const PHONE_RE = /^1[3-9]\d{9}$/;

async function main() {
  loadEnv();
  const { phoneHmac } = await import("../src/common/crypto.util");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; openId: string | null; credential: string | null }[]>(
      `SELECT id, "openId", credential FROM "Auth" WHERE provider='PHONE'`,
    );
    console.log(`PHONE provider 记录: ${rows.length}`);
    let upd = 0;
    for (const r of rows) {
      if (r.openId && PHONE_RE.test(r.openId)) {
        await prisma.$executeRawUnsafe(`UPDATE "Auth" SET "openId"=$1 WHERE id=$2`, phoneHmac(r.openId), r.id);
        upd++;
      }
      if (r.credential && PHONE_RE.test(r.credential)) {
        await prisma.$executeRawUnsafe(`UPDATE "Auth" SET credential=$1 WHERE id=$2`, phoneHmac(r.credential), r.id);
        upd++;
      }
    }
    console.log(`回填字段数: ${upd}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
