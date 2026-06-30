/**
 * 为 Circle 表加 needApproval 列（加入是否需圈主审批，仅免费圈生效）。
 * 幂等可复跑。prisma generate 被 dev server 锁（EPERM），故用原生 SQL ALTER；
 * schema.prisma 已同步加 needApproval 字段，上线走正式 migrate。
 * 运行：cd apps/server && npx ts-node scripts/add-circle-need-approval.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Circle" ADD COLUMN IF NOT EXISTS "needApproval" BOOLEAN NOT NULL DEFAULT false;`,
  );
  const cols = await prisma.$queryRawUnsafe<any[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name='Circle' AND column_name='needApproval';`,
  );
  console.log("needApproval 列:", cols.length ? "已存在 ✅" : "缺失 ❌");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
