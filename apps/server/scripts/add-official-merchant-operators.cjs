/**
 * 纯 node 版：把指定手机号设为官方旗舰店(ConfigSystem.official_merchant_id)的商家操作员(MerchantMember role=OPERATOR)。
 * 复用生产已编译 crypto 工具保证 phoneHash 与线上一致。
 * 运行：cd /opt/guoxue/apps/server && set -a; . ./.env; set +a; node scripts/add-official-merchant-operators.cjs
 */
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { phoneHmac } = require(path.resolve(__dirname, "../dist/common/crypto.util"));

const prisma = new PrismaClient();
const OPERATOR_PHONES = ["13311194331", "18631243959", "15383869024"];

async function main() {
  const cfg = await prisma.configSystem.findUnique({ where: { configKey: "official_merchant_id" } });
  const merchantId = cfg && cfg.configValue;
  if (!merchantId) throw new Error("未找到 official_merchant_id 配置");
  const m = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { id: true, shopName: true, userId: true } });
  if (!m) throw new Error("官方旗舰店不存在：" + merchantId);
  console.log("官方旗舰店：" + m.id + "  " + m.shopName);

  // owner 记一条 OWNER 成员（幂等）
  await prisma.merchantMember.upsert({
    where: { merchantId_userId: { merchantId, userId: m.userId } },
    create: { merchantId, userId: m.userId, role: "OWNER", status: "ACTIVE", invitedBy: m.userId },
    update: { role: "OWNER", status: "ACTIVE" },
  });

  for (const phone of OPERATOR_PHONES) {
    const u = await prisma.user.findFirst({ where: { phoneHash: phoneHmac(phone) }, select: { id: true, nickname: true } });
    if (!u) { console.warn("⚠ 手机号无对应用户，跳过：" + phone); continue; }
    if (u.id === m.userId) { console.log("  = " + phone + " 是店主，跳过"); continue; }
    await prisma.merchantMember.upsert({
      where: { merchantId_userId: { merchantId, userId: u.id } },
      create: { merchantId, userId: u.id, role: "OPERATOR", status: "ACTIVE", invitedBy: m.userId },
      update: { role: "OPERATOR", status: "ACTIVE" },
    });
    console.log("  + " + phone + "(" + (u.nickname || "") + ") → 操作员");
  }
  console.log("✅ 完成");
}

main().catch((e) => { console.error("❌ 失败：", e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
