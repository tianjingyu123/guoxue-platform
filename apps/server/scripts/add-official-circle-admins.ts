/**
 * 把指定手机号账号设为「热卜官方」圈(ConfigSystem.official_circle_id)的**圈子管理员**(CircleMember role=ADMIN)，
 * 使其能在官方圈内发文章/视频/帖子（后端 ensureCircleAdmin 要求 OWNER/PARTNER/ADMIN）。
 *
 * 注意：这与「官方旗舰店的商家操作员」(create-official-merchant.ts)是**两套不同身份**——
 *   商家操作员管商品；圈子管理员管圈内内容。二者互不影响。
 *
 * 执行：cd apps/server && npx tsx scripts/add-official-circle-admins.ts
 *   （需 DATABASE_URL 与 ENCRYPTION_KEY 环境变量；手机号用 phoneHash 查用户）
 */
import { PrismaClient } from "@prisma/client";
import { phoneHmac } from "../src/common/crypto.util";

const prisma = new PrismaClient();

// 要设为官方圈管理员的手机号（须已注册/登录过平台）
const ADMIN_PHONES: string[] = ["13311194331", "18631243959", "15383869024"];

async function main() {
  const cfg = await prisma.configSystem.findUnique({ where: { configKey: "official_circle_id" } });
  const circleId = cfg?.configValue;
  if (!circleId) throw new Error("未找到 official_circle_id 配置，请先建官方圈（create-official-circle.ts）");
  const circle = await prisma.circle.findUnique({ where: { id: circleId }, select: { id: true, name: true } });
  if (!circle) throw new Error(`官方圈不存在：${circleId}`);
  console.log(`官方圈：${circle.id}  ${circle.name}`);

  for (const phone of ADMIN_PHONES) {
    const user = await prisma.user.findFirst({ where: { phoneHash: phoneHmac(phone) }, select: { id: true, nickname: true } });
    if (!user) { console.warn(`⚠ 手机号无对应用户，跳过：${phone}（该账号需先登录过平台）`); continue; }

    const existing = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: user.id } },
      select: { role: true },
    });
    if (existing) {
      if (existing.role === "OWNER") { console.log(`  = ${phone} 已是圈主，跳过`); continue; }
      await prisma.circleMember.update({
        where: { circleId_userId: { circleId, userId: user.id } },
        data: { role: "ADMIN" },
      });
      console.log(`  ↑ ${phone}(${user.nickname ?? ""}) → 管理员`);
    } else {
      await prisma.$transaction([
        prisma.circleMember.create({ data: { circleId, userId: user.id, role: "ADMIN" } }),
        prisma.circle.update({ where: { id: circleId }, data: { memberCount: { increment: 1 } } }),
      ]);
      console.log(`  + ${phone}(${user.nickname ?? ""}) → 加入并设为管理员`);
    }
  }
  console.log("✅ 完成");
}

main()
  .catch((e) => { console.error("❌ 失败：", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
