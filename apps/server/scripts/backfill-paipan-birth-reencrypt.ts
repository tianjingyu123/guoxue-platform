/**
 * M4 生辰假加密修复（一次性·幂等）。
 * PaipanRecord.clientBirth 有早期 demo 数据形如 `enc:AES-256|<明文生辰>|...`——
 * 这是伪装加密的明文泄露（enc: 只是前缀）。去掉前缀取明文，用 encrypt() 真加密回写。
 * 只处理 'enc:%' 前缀的假数据；真密文(base64)不动。前台 tsx 连 5433 跑。
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
  const { encrypt, decrypt } = await import("../src/common/crypto.util");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; clientBirth: string }[]>(
      `SELECT id, "clientBirth" FROM "PaipanRecord" WHERE "clientBirth" LIKE 'enc:%'`,
    );
    console.log(`假加密(enc:前缀)记录: ${rows.length}`);
    let ok = 0;
    for (const r of rows) {
      // 去掉 `enc:AES-256|` 之类前缀，取明文部分
      const plain = r.clientBirth.replace(/^enc:[^|]*\|/, "");
      const newEnc = encrypt(plain);
      if (decrypt(newEnc) !== plain) {
        console.error(`  ✗ 校验失败 id=${r.id}`);
        continue;
      }
      await prisma.$executeRawUnsafe(`UPDATE "PaipanRecord" SET "clientBirth"=$1 WHERE id=$2`, newEnc, r.id);
      ok++;
    }
    console.log(`真加密回写: ${ok}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
