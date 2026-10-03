/**
 * 创建「官方旗舰店」Merchant（ACTIVE·免入驻），并把其 id 写入 ConfigSystem.official_merchant_id。
 * 官方旗舰店 = 平台自营/官方商品的归属商家，与真实商家走同一套商家端发布流程；
 * 官方店发商品免审自动上架（见 merchant.service.createProduct 的 isOfficialMerchant 判定）。
 * 多操作员：多个工作人员账号以 MerchantMember(role=OPERATOR) 身份共同经营该店（见 merchant.guard）。
 *
 * 幂等：已配置且商家存在则跳过。
 * 执行：cd apps/server && npx tsx scripts/create-official-merchant.ts
 *   （需 DATABASE_URL 与 ENCRYPTION_KEY 环境变量；idCardNumber 加密存储）
 */
import { PrismaClient } from "@prisma/client";
import { encrypt, phoneHmac } from "../src/common/crypto.util";

const prisma = new PrismaClient();

// 官方店 owner（归属锚点·同官方圈默认 admin-0001；仅作商品/订单归属，不必是登录用的运营账号）
// 可用环境变量 OFFICIAL_MERCHANT_OWNER 覆盖（本地库无 admin-0001 时传真实超管 userId）
const OWNER = process.env.OFFICIAL_MERCHANT_OWNER || "admin-0001";
// 操作员手机号清单：这些账号将成为官方旗舰店操作员(商家管理员)，可在个人中心"身份切换"进商家管理台发/管官方商品。
const OPERATOR_PHONES: string[] = ["13311194331", "18631243959", "15383869024"];
// 也可按 user.id 直接指定（可选，与手机号并集）。
const OPERATOR_USER_IDS: string[] = [];

async function main() {
  // 幂等检查
  const existing = await prisma.configSystem.findUnique({ where: { configKey: "official_merchant_id" } });
  if (existing?.configValue) {
    const m = await prisma.merchant.findUnique({ where: { id: existing.configValue } });
    if (m) {
      console.log(`官方旗舰店已存在，跳过：${m.id}  ${m.shopName}  status=${m.status}`);
      await syncOperators(m.id);
      return;
    }
    console.log("配置存在但商家已被删除，重新创建…");
  }

  const owner = await prisma.user.findUnique({ where: { id: OWNER }, select: { id: true } });
  if (!owner) throw new Error(`owner 用户不存在：${OWNER}，请改用一个有效账号`);

  // owner 若已是某商家（Merchant.userId @unique），复用之；否则新建
  let merchant = await prisma.merchant.findUnique({ where: { userId: OWNER } });
  if (merchant) {
    console.log(`owner 已有商家，复用为官方旗舰店：${merchant.id}  ${merchant.shopName}`);
    merchant = await prisma.merchant.update({
      where: { id: merchant.id },
      data: { status: "ACTIVE", depositPaid: true, agreementSigned: true, openedAt: merchant.openedAt ?? new Date() },
    });
  } else {
    merchant = await prisma.merchant.create({
      data: {
        userId: OWNER,
        shopName: "热卜国学官方旗舰店",
        shopIntro: "热卜国学平台官方自营与精选商品。",
        contactName: "平台官方",
        contactPhone: "400-000-0000",
        idCardNumber: encrypt("000000000000000000"), // 官方店占位·加密存储（无真实证件）
        categoryIds: [],
        status: "ACTIVE",
        depositPaid: true,
        agreementSigned: true,
        openedAt: new Date(),
      },
    });
  }

  await prisma.configSystem.upsert({
    where: { configKey: "official_merchant_id" },
    create: {
      configKey: "official_merchant_id",
      configValue: merchant.id,
      description: "官方旗舰店 Merchant ID：官方/平台自营商品的归属商家，发商品免审自动上架",
    },
    update: { configValue: merchant.id },
  });

  await syncOperators(merchant.id);
  console.log(`✅ 官方旗舰店已就绪并写入配置：${merchant.id}  ${merchant.shopName}`);
}

/** 把 owner 记为 OWNER 成员，OPERATOR_PHONES/OPERATOR_USER_IDS 记为 OPERATOR 成员（幂等）。 */
async function syncOperators(merchantId: string) {
  await prisma.merchantMember.upsert({
    where: { merchantId_userId: { merchantId, userId: OWNER } },
    create: { merchantId, userId: OWNER, role: "OWNER", status: "ACTIVE", invitedBy: OWNER },
    update: { role: "OWNER", status: "ACTIVE" },
  });

  const operatorIds = new Set<string>(OPERATOR_USER_IDS);
  // 手机号 → userId（phone 以 phoneHash 存储，用 phoneHmac 查）
  for (const phone of OPERATOR_PHONES) {
    const u = await prisma.user.findFirst({ where: { phoneHash: phoneHmac(phone) }, select: { id: true } });
    if (!u) { console.warn(`⚠ 手机号无对应用户，跳过：${phone}（该账号需先登录过平台）`); continue; }
    operatorIds.add(u.id);
  }

  for (const uid of operatorIds) {
    if (uid === OWNER) continue;
    const u = await prisma.user.findUnique({ where: { id: uid }, select: { id: true } });
    if (!u) { console.warn(`⚠ 操作员用户不存在，跳过：${uid}`); continue; }
    await prisma.merchantMember.upsert({
      where: { merchantId_userId: { merchantId, userId: uid } },
      create: { merchantId, userId: uid, role: "OPERATOR", status: "ACTIVE", invitedBy: OWNER },
      update: { role: "OPERATOR", status: "ACTIVE" },
    });
    console.log(`  + 操作员：${uid}`);
  }
}

main()
  .catch((e) => { console.error("❌ 失败：", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
