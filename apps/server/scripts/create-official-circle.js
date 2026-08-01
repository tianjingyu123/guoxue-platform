/**
 * 创建「热卜官方」圈子并写入 ConfigSystem.official_circle_id（后台/AI 自动发布内容的默认归属圈子）。
 * 幂等。生产执行：cd apps/server && export DATABASE_URL=... && node scripts/create-official-circle.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const OWNER = "admin-0001";

  const existing = await prisma.configSystem.findUnique({ where: { configKey: "official_circle_id" } });
  if (existing && existing.configValue) {
    const c = await prisma.circle.findUnique({ where: { id: existing.configValue } });
    if (c) { console.log(`官方圈子已存在，跳过：${c.id}  ${c.name}  status=${c.status}`); return; }
    console.log("配置存在但圈子已删除，重新创建…");
  }

  const owner = await prisma.user.findUnique({ where: { id: OWNER }, select: { id: true } });
  if (!owner) throw new Error(`owner 用户不存在：${OWNER}`);

  const circle = await prisma.circle.create({
    data: {
      name: "热卜官方",
      intro: "热卜国学平台官方圈子，发布平台官方短视频、文章、课程等内容。",
      tags: ["官方"],
      type: "FREE",
      ownerId: OWNER,
      status: "ACTIVE",
      memberCount: 1,
      members: { create: { userId: OWNER, role: "OWNER" } },
    },
  });

  await prisma.configSystem.upsert({
    where: { configKey: "official_circle_id" },
    create: { configKey: "official_circle_id", configValue: circle.id, description: "官方圈子ID：后台/AI 自动发布内容的默认归属圈子" },
    update: { configValue: circle.id },
  });

  console.log(`✅ 官方圈子已创建并写入配置：${circle.id}  ${circle.name}`);
}

main().catch((e) => { console.error("❌ 失败：", e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
