/**
 * 纯 node 版：把指定手机号设为官方圈(ConfigSystem.official_circle_id)的圈子管理员(role=ADMIN)。
 * 复用生产已编译的 crypto 工具(dist/common/crypto.util)保证 phoneHash 与线上一致。
 * 运行：cd /opt/guoxue/apps/server && set -a; . ./.env; set +a; node scripts/add-official-circle-admins.cjs
 */
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { phoneHmac } = require(path.resolve(__dirname, "../dist/common/crypto.util"));

const prisma = new PrismaClient();
const ADMIN_PHONES = ["13311194331", "18631243959", "15383869024"];

async function main() {
  const cfg = await prisma.configSystem.findUnique({ where: { configKey: "official_circle_id" } });
  const circleId = cfg && cfg.configValue;
  if (!circleId) throw new Error("未找到 official_circle_id 配置");
  const circle = await prisma.circle.findUnique({ where: { id: circleId }, select: { id: true, name: true } });
  if (!circle) throw new Error("官方圈不存在：" + circleId);
  console.log("官方圈：" + circle.id + "  " + circle.name);

  for (const phone of ADMIN_PHONES) {
    const u = await prisma.user.findFirst({ where: { phoneHash: phoneHmac(phone) }, select: { id: true, nickname: true } });
    if (!u) { console.warn("⚠ 手机号无对应用户，跳过：" + phone); continue; }
    const ex = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: u.id } },
      select: { role: true },
    });
    if (ex) {
      if (ex.role === "OWNER") { console.log("  = " + phone + " 已是圈主，跳过"); continue; }
      await prisma.circleMember.update({
        where: { circleId_userId: { circleId, userId: u.id } },
        data: { role: "ADMIN" },
      });
      console.log("  ↑ " + phone + "(" + (u.nickname || "") + ") → 管理员");
    } else {
      await prisma.$transaction([
        prisma.circleMember.create({ data: { circleId, userId: u.id, role: "ADMIN" } }),
        prisma.circle.update({ where: { id: circleId }, data: { memberCount: { increment: 1 } } }),
      ]);
      console.log("  + " + phone + "(" + (u.nickname || "") + ") → 加入并设为管理员");
    }
  }
  console.log("✅ 完成");
}

main().catch((e) => { console.error("❌ 失败：", e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
