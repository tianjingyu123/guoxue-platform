/**
 * 七类公开内容目录的只读翻页盘点。仅输出来源数量和元数据指纹；不读正文、不写库。
 * 必须先从可信运维记录核对数据库名、账号和服务端地址，不能凭本机环境变量猜目标。
 */
import { PrismaClient } from "@prisma/client";
import { scanPublicCatalogReadonly } from "../src/modules/search/public-content-catalog-preview";

export interface CatalogAuditArgs {
  database: string;
  user: string;
  host: string;
}

export function parseCatalogAuditArgs(argv: string[]): CatalogAuditArgs {
  if (!argv.includes("--read-only")) throw new Error("必须显式传 --read-only");
  const read = (name: string) => {
    const value = argv.find((arg) => arg.startsWith(`--expected-${name}=`))?.split("=").slice(1).join("=").trim();
    if (!value) throw new Error(`缺少 --expected-${name}=...；先核对目标数据库身份`);
    return value;
  };
  return { database: read("database"), user: read("user"), host: read("host") };
}

async function main() {
  const expected = parseCatalogAuditArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) throw new Error("缺少经核对的只读 DATABASE_URL");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw<Array<{ database: string; username: string; host: string | null }>>`
      SELECT current_database() AS database, current_user::text AS username, inet_server_addr()::text AS host
    `;
    const actual = rows[0];
    if (!actual || actual.database !== expected.database || actual.username !== expected.user || actual.host !== expected.host) {
      throw new Error("数据库身份与预期不符，已停止；请核对数据库名、只读账号和服务端地址");
    }
    const summary = await scanPublicCatalogReadonly(prisma);
    process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), database: actual.database,
      user: actual.username, host: actual.host, ...summary }, null, 2) + "\n");
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: Error) => {
    process.stderr.write(`目录只读盘点失败：${error.message}\n`);
    process.exitCode = 1;
  });
}
