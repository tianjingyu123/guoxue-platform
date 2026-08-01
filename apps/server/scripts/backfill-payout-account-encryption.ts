/**
 * 收款账号加密改造·存量回填（一次性脚本，幂等可重跑）。第一波·资金安全突击。
 *
 * 覆盖两套提现表：
 *   ① WithdrawalApplication.accountInfo(JSON) → accountInfoEnc = encrypt(JSON.stringify(accountInfo))
 *   ② VideoCreatorWithdrawal.account(String)  → accountEnc     = encrypt(account)
 * 只回填 密文列为空 且 明文列非空 的行；不动明文列（过渡期保留，双写切读后再另议清空）。
 *
 * 🔴 跑前置：先执行 DDL 加列（migrations/manual_add_payout_account_encryption/migration.sql）。
 * 校验：回填后 decrypt(密文) 必须与明文一致（accountInfo 逐字段深比对），不一致则跳过并告警。
 * 用前台 tsx 连生产库跑：pnpm --filter @guoxue/server exec tsx scripts/backfill-payout-account-encryption.ts
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

async function main() {
  loadEnv();
  // env 就绪后再 import 加密工具（getKey 依赖 ENCRYPTION_KEY）
  const { encrypt, decrypt } = await import("../src/common/crypto.util");
  const prisma = new PrismaClient();
  try {
    // ── ① WithdrawalApplication.accountInfo(JSON) ──
    const apps = await prisma.$queryRawUnsafe<{ id: string; accountInfo: unknown }[]>(
      `SELECT id, "accountInfo" FROM "WithdrawalApplication" WHERE "accountInfo" IS NOT NULL AND "accountInfoEnc" IS NULL`,
    );
    console.log(`[WithdrawalApplication] 待回填: ${apps.length}`);
    let ok1 = 0, skip1 = 0;
    for (const a of apps) {
      const plain = JSON.stringify(a.accountInfo);
      const enc = encrypt(plain);
      if (decrypt(enc) !== plain) {
        skip1++;
        console.error(`  ✗ 校验失败 application=${a.id}（decrypt 不还原），跳过`);
        continue;
      }
      await prisma.$executeRawUnsafe(`UPDATE "WithdrawalApplication" SET "accountInfoEnc"=$1 WHERE id=$2`, enc, a.id);
      ok1++;
    }
    console.log(`[WithdrawalApplication] 回填完成: 成功 ${ok1}，校验失败 ${skip1}`);

    // ── ② VideoCreatorWithdrawal.account(String) ──
    const rows = await prisma.$queryRawUnsafe<{ id: string; account: string }[]>(
      `SELECT id, account FROM "VideoCreatorWithdrawal" WHERE account IS NOT NULL AND account <> '' AND "accountEnc" IS NULL`,
    );
    console.log(`[VideoCreatorWithdrawal] 待回填: ${rows.length}`);
    let ok2 = 0, skip2 = 0;
    for (const r of rows) {
      const enc = encrypt(r.account);
      if (decrypt(enc) !== r.account) {
        skip2++;
        console.error(`  ✗ 校验失败 withdrawal=${r.id}（decrypt 不还原），跳过`);
        continue;
      }
      await prisma.$executeRawUnsafe(`UPDATE "VideoCreatorWithdrawal" SET "accountEnc"=$1 WHERE id=$2`, enc, r.id);
      ok2++;
    }
    console.log(`[VideoCreatorWithdrawal] 回填完成: 成功 ${ok2}，校验失败 ${skip2}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
