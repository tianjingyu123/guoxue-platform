/**
 * 圈子成长体系演示数据注入（幂等）。
 * 给测试用户（手机 13800000000）在其名下某圈注入：
 *   - 近 10 天连续签到记录（含连续第 7 天 +20 奖励）+ 对应成长行（streak=10, lastCheckin=昨天）
 *   - 徽章获得记录（newcomer 初来乍到 + persistent 坚持不懈）
 *   - 4 条 PENDING 入圈审批申请（造 4 个演示申请用户）
 * 运行：npx ts-node scripts/seed-growth-demo.ts
 *
 * 说明：4 张新表用原生 SQL 访问（prisma generate 被 dev server 锁）；User/Circle 等既有表走 prisma client。
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DEMO_APPLICANTS = [
  { phone: "13900000101", nickname: "求知者·张三", bio: "国学爱好者，希望系统学习", message: "久仰圈内各位老师，想加入一起精进，恳请通过。" },
  { phone: "13900000102", nickname: "墨香·李四", bio: "书法五年，研习碑帖", message: "对圈子主题非常感兴趣，愿分享我的临帖心得。" },
  { phone: "13900000103", nickname: "易学新人·王五", bio: "刚入门的小白", message: "朋友推荐而来，想跟着大家一起打卡学习。" },
  { phone: "13900000104", nickname: "清茶·赵六", bio: "传统文化从业者", message: "希望在圈内交流，结识同道中人。" },
];

async function main() {
  // 1. 测试用户
  const user = await prisma.user.findFirst({ where: { phone: "13800000000" } });
  if (!user) throw new Error("测试用户 13800000000 不存在");

  // 2. 选一个该用户作为 OWNER 的圈子作为演示圈
  const ownedMember = await prisma.circleMember.findFirst({
    where: { userId: user.id, role: "OWNER" },
    orderBy: { joinedAt: "asc" },
  });
  const circle = ownedMember
    ? await prisma.circle.findUnique({ where: { id: ownedMember.circleId } })
    : await prisma.circle.findFirst({ where: { ownerId: user.id } });
  if (!circle) throw new Error("测试用户没有可用于演示的圈子");
  const circleId = circle.id;
  console.log(`演示圈子: ${circle.name} (${circleId})  用户: ${user.nickname} (${user.id})`);

  // 3. 近 10 天连续签到（today-10 .. today-1，不含今日，便于现场测试今日签到 + 幂等）
  // 先清掉今日的签到行，保证演示初始态「今日未签」，与下方 growth 的 lastCheckin=昨天 一致
  const todayStr = ymd(new Date());
  await prisma.$executeRawUnsafe(
    `DELETE FROM "CircleCheckin" WHERE "circleId"=$1 AND "userId"=$2 AND "checkinDate"=$3`,
    circleId, user.id, todayStr,
  );
  let checkinExp = 0;
  for (let k = 10; k >= 1; k--) {
    const date = ymd(new Date(Date.now() - k * 86_400_000));
    const streakPos = 11 - k; // k=10→1 ... k=1→10
    const exp = 10 + (streakPos === 7 ? 20 : 0); // 连续第 7 天 +20
    checkinExp += exp;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CircleCheckin" ("id","circleId","userId","checkinDate","expGained","createdAt")
       VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)
       ON CONFLICT ("circleId","userId","checkinDate") DO NOTHING`,
      randomUUID(), circleId, user.id, date, exp,
    );
  }
  const yesterday = ymd(new Date(Date.now() - 86_400_000));
  await prisma.$executeRawUnsafe(
    `INSERT INTO "CircleMemberGrowth" ("id","circleId","userId","checkinExp","checkinStreak","lastCheckin","totalCheckins","updatedAt")
     VALUES ($1,$2,$3,$4,10,$5,10,CURRENT_TIMESTAMP)
     ON CONFLICT ("circleId","userId") DO UPDATE SET
       "checkinExp"=$4, "checkinStreak"=10, "lastCheckin"=$5, "totalCheckins"=10, "updatedAt"=CURRENT_TIMESTAMP`,
    randomUUID(), circleId, user.id, checkinExp, yesterday,
  );
  console.log(`签到注入: 10 天, checkinExp=${checkinExp}, lastCheckin=${yesterday}, streak=10`);

  // 4. 徽章记录（newcomer + persistent，幂等）
  for (const code of ["newcomer", "persistent"]) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CircleBadgeRecord" ("id","circleId","userId","badgeCode","gainedAt")
       VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)
       ON CONFLICT ("circleId","userId","badgeCode") DO NOTHING`,
      randomUUID(), circleId, user.id, code,
    );
  }
  console.log("徽章注入: newcomer, persistent");

  // 5. 4 个演示申请用户 + 4 条 PENDING 入圈申请（幂等：先删这些用户对该圈的旧申请再插）
  let jrCount = 0;
  for (const a of DEMO_APPLICANTS) {
    const applicant = await prisma.user.upsert({
      where: { phone: a.phone },
      update: { nickname: a.nickname, bio: a.bio },
      create: {
        phone: a.phone,
        nickname: a.nickname,
        bio: a.bio,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(a.nickname)}`,
      },
    });
    await prisma.$executeRawUnsafe(
      `DELETE FROM "CircleJoinRequest" WHERE "circleId"=$1 AND "userId"=$2 AND "status"='PENDING'`,
      circleId, applicant.id,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CircleJoinRequest" ("id","circleId","userId","status","message","createdAt")
       VALUES ($1,$2,$3,'PENDING',$4,CURRENT_TIMESTAMP)`,
      randomUUID(), circleId, applicant.id, a.message,
    );
    jrCount++;
  }
  console.log(`入圈申请注入: ${jrCount} 条 PENDING`);
  console.log("✅ 演示数据注入完成");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
