// 仅供本机 PostgreSQL 集成测试启动第二个进程；不接触外部或共享数据库。
const { PrismaClient } = require("@prisma/client");
const { BotService } = require("../src/modules/bot/bot.service");

async function main() {
  const raw = process.env.BOT_QUOTA_TEST_DATABASE_URL;
  if (!raw) throw new Error("缺少专用测试库地址");
  const target = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(target.hostname) ||
      !target.pathname.slice(1).startsWith("bot_quota_qa_")) {
    throw new Error("只允许本机额度专用测试库");
  }
  const [botConfigId, userId, reservationId] = process.argv.slice(2);
  if (!botConfigId || !userId || !reservationId) throw new Error("缺少测试预留标识");
  const prisma = new PrismaClient({ datasources: { db: { url: raw } } });
  try {
    const service = new BotService(prisma, {}, {}, {});
    await service.releaseFailedQuota(botConfigId, userId, { charge: "trial", reservationId });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  process.stderr.write("bot quota test worker failed\n");
  process.exitCode = 1;
});
