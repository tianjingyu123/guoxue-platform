/**
 * M4 灰度第一步：存量 User 手机号加密回填（一次性脚本，幂等可重跑）。
 * 对 phone 非空且 phoneHash 为空的用户，算 phoneHash(HMAC) + phoneEnc(AES) 回填。
 * 不动 phone 明文列（灰度期保留）。用前台 tsx 连 5433 跑。
 *
 * 跑前需先执行 DDL 加列（db-opt-07）。校验：回填后 decrypt(phoneEnc) 必须 === phone。
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  // DATABASE_URL 取自 apps/server/.env；ENCRYPTION_KEY 取自仓库根 .env
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

async function main() {
  loadEnv();
  // 在 env 就绪后再 import 加密工具（getKey 依赖 ENCRYPTION_KEY）
  const { phoneHmac, encrypt, decrypt } = await import("../src/common/crypto.util");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; phone: string }[]>(
      `SELECT id, phone FROM "User" WHERE phone IS NOT NULL AND "phoneHash" IS NULL`,
    );
    console.log(`待回填用户: ${rows.length}`);
    let ok = 0;
    let mismatch = 0;
    for (const u of rows) {
      const hash = phoneHmac(u.phone);
      const enc = encrypt(u.phone);
      if (decrypt(enc) !== u.phone) {
        mismatch++;
        console.error(`  ✗ 校验失败 user=${u.id}（decrypt 不还原）`);
        continue;
      }
      await prisma.$executeRawUnsafe(`UPDATE "User" SET "phoneHash"=$1, "phoneEnc"=$2 WHERE id=$3`, hash, enc, u.id);
      ok++;
    }
    console.log(`回填完成: 成功 ${ok}，校验失败 ${mismatch}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
