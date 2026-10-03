/**
 * 创建「官方旗舰店」商家(ACTIVE·跳过入驻审核/保证金/协议)，写入 ConfigSystem.official_merchant_id。
 * 官方旗舰店 = 平台自营商品的商家身份，走与入驻商家一致的商家端发布流程。
 * 幂等。生产执行：cd apps/server && export DATABASE_URL=... && node scripts/create-official-merchant.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const OWNER = "admin-0001"; // 复用超管账号作官方店 owner（与官方圈子一致）

  const existing = await prisma.configSystem.findUnique({ where: { configKey: "official_merchant_id" } });
  if (existing && existing.configValue) {
    const m = await prisma.merchant.findUnique({ where: { id: existing.configValue } });
    if (m) { console.log(`官方旗舰店已存在，跳过：${m.id}  ${m.shopName}  status=${m.status}`); return; }
  }

  const owner = await prisma.user.findUnique({ where: { id: OWNER }, select: { id: true } });
  if (!owner) throw new Error(`owner 用户不存在：${OWNER}`);

  // Merchant.userId 唯一：若 owner 已有商家则直接复用为官方店
  let merchant = await prisma.merchant.findUnique({ where: { userId: OWNER } });
  if (merchant) {
    console.log(`owner 已有商家，复用为官方店：${merchant.id}  ${merchant.shopName}`);
    if (merchant.status !== "ACTIVE") {
      merchant = await prisma.merchant.update({ where: { id: merchant.id }, data: { status: "ACTIVE", depositPaid: true, agreementSigned: true } });
    }
  } else {
    merchant = await prisma.merchant.create({
      data: {
        userId: OWNER,
        shopName: "官方旗舰店",
        contactName: "平台官方",
        contactPhone: "13800000000",
        idCardNumber: "OFFICIAL", // 官方店占位·非真实身份证
        status: "ACTIVE",         // 直接激活·跳过入驻审核链
        depositPaid: true,        // 免保证金
        agreementSigned: true,    // 免协议
        categoryIds: [],
      },
    });
  }

  await prisma.configSystem.upsert({
    where: { configKey: "official_merchant_id" },
    create: { configKey: "official_merchant_id", configValue: merchant.id, description: "官方旗舰店商家ID：平台自营商品的商家身份" },
    update: { configValue: merchant.id },
  });

  console.log(`✅ 官方旗舰店就绪并写入配置：${merchant.id}  ${merchant.shopName}`);
}

main().catch((e) => { console.error("❌ 失败：", e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
