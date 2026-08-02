/**
 * 统一账号/权益回填。默认只审计，显式 --apply 才写库；所有写入均有唯一幂等键，可安全重跑。
 * 使用：pnpm migration:backfill-unified-accounts -- --apply
 */
import { PrismaClient } from "@prisma/client";
import { EntitlementService, GrantEntitlementInput } from "../src/modules/entitlement/entitlement.service";

const prisma = new PrismaClient();
const entitlement = new EntitlementService(prisma as any);
const apply = process.argv.includes("--apply");
const now = new Date();

async function inBatches<T>(items: T[], task: (item: T) => Promise<void>, size = 20) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(task));
  }
}

async function main() {
  const unionNamespaceName = process.env.WECHAT_OPEN_PLATFORM_ID?.trim();
  const wechatRows = await prisma.auth.findMany({
    where: { provider: "WECHAT", unionId: { not: null } },
    select: { userId: true, unionId: true },
  });
  const unionOwners = new Map<string, Set<string>>();
  for (const row of wechatRows) {
    if (!row.unionId) continue;
    const owners = unionOwners.get(row.unionId) || new Set<string>();
    owners.add(row.userId);
    unionOwners.set(row.unionId, owners);
  }
  const conflicts = [...unionOwners.entries()].filter(([, owners]) => owners.size > 1);
  if (conflicts.length) {
    throw new Error(`检测到 ${conflicts.length} 个 UnionID 分属多个 userId，已停止回填；请先走人工账号合并审计`);
  }
  if (unionOwners.size > 0 && !unionNamespaceName) {
    throw new Error("存在微信 UnionID，但未配置 WECHAT_OPEN_PLATFORM_ID；无法安全确定跨端作用域");
  }

  const [members, practitioners, accessOrders, ebooks, instituteContents] = await Promise.all([
    prisma.user.findMany({
      where: { memberLevel: { not: "NONE" }, OR: [{ memberExpire: null }, { memberExpire: { gt: now } }] },
      select: { id: true, memberLevel: true, memberExpire: true },
    }),
    prisma.practitionerProfile.findMany({ where: { proExpireAt: { gt: now } }, select: { userId: true, proExpireAt: true } }),
    prisma.order.findMany({
      where: { status: { in: ["PAID", "COMPLETED"] }, type: { in: ["COURSE", "BUNDLE", "BOT_SERVICE", "PAIPAN", "LIVESTREAM"] } },
      select: { id: true, userId: true, type: true, targetId: true },
    }),
    prisma.ebookPurchase.findMany({
      where: { OR: [{ expireAt: null }, { expireAt: { gt: now } }] },
      select: { id: true, userId: true, ebookId: true, expireAt: true },
    }),
    prisma.instituteContentPurchase.findMany({ select: { id: true, userId: true, contentId: true } }),
  ]);

  const grants: GrantEntitlementInput[] = [
    ...members.map((member) => ({
      userId: member.id,
      entitlementKey: "membership.school",
      kind: "MEMBERSHIP",
      resourceType: "MEMBER_PLAN",
      unlimited: true,
      validUntil: member.memberExpire,
      sourceType: "MIGRATION",
      sourceId: member.id,
      idempotencyKey: `migration:membership.school:${member.id}`,
      action: "MIGRATE" as const,
      metadata: { level: member.memberLevel },
    })),
    ...practitioners.map((profile) => ({
      userId: profile.userId,
      entitlementKey: "membership.practitioner",
      kind: "MEMBERSHIP",
      resourceType: "PRACTITIONER_PRO",
      unlimited: true,
      validUntil: profile.proExpireAt,
      sourceType: "MIGRATION",
      sourceId: profile.userId,
      idempotencyKey: `migration:membership.practitioner:${profile.userId}`,
      action: "MIGRATE" as const,
    })),
    ...accessOrders.map((order) => ({
      userId: order.userId,
      entitlementKey: `${order.type.toLowerCase()}.access`,
      kind: "ACCESS",
      resourceType: order.type,
      resourceId: order.targetId,
      quantity: 1,
      validUntil: null,
      sourceType: "ORDER",
      sourceId: order.id,
      idempotencyKey: `order:${order.id}:${order.type.toLowerCase()}.access`,
      action: "MIGRATE" as const,
    })),
    ...ebooks.map((purchase) => ({
      userId: purchase.userId,
      entitlementKey: "ebook.access",
      kind: "ACCESS",
      resourceType: "EBOOK",
      resourceId: purchase.ebookId,
      quantity: 1,
      validUntil: purchase.expireAt,
      sourceType: "MIGRATION",
      sourceId: purchase.id,
      idempotencyKey: `migration:ebook.access:${purchase.id}`,
      action: "MIGRATE" as const,
    })),
    ...instituteContents.map((purchase) => ({
      userId: purchase.userId,
      entitlementKey: "institute-content.access",
      kind: "ACCESS",
      resourceType: "INSTITUTE_CONTENT",
      resourceId: purchase.contentId,
      quantity: 1,
      validUntil: null,
      sourceType: "MIGRATION",
      sourceId: purchase.id,
      idempotencyKey: `migration:institute-content.access:${purchase.id}`,
      action: "MIGRATE" as const,
    })),
  ];

  const report = {
    mode: apply ? "APPLY" : "DRY_RUN",
    unionAnchors: unionOwners.size,
    memberEntitlements: members.length,
    practitionerEntitlements: practitioners.length,
    orderAccessEntitlements: accessOrders.length,
    ebookEntitlements: ebooks.length,
    instituteContentEntitlements: instituteContents.length,
    totalEntitlements: grants.length,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!apply) {
    process.stdout.write("未写入数据库；确认审计结果后追加 --apply 执行。\n");
    return;
  }

  const unionNamespace = `wechat-open:${unionNamespaceName}`;
  await inBatches([...unionOwners.entries()], async ([unionId, owners]) => {
    const userId = [...owners][0];
    await prisma.auth.upsert({
      where: { provider_namespace_subject: { provider: "WECHAT_UNION", namespace: unionNamespace, subject: unionId } },
      create: { userId, provider: "WECHAT_UNION", namespace: unionNamespace, subject: unionId, unionId, metadata: { migrated: true } },
      update: { lastUsedAt: new Date() },
    });
  });
  await inBatches(grants, async (grant) => { await entitlement.grant(grant); });
  process.stdout.write("统一账号与权益回填完成；脚本可幂等重跑。\n");
}

main()
  .catch((error) => {
    process.stderr.write(`${(error as Error).stack || (error as Error).message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
