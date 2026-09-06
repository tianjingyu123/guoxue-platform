import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CapabilityGrantRow } from "./circle-capability.repository";
import { CapabilityRuntimeContext, CIRCLE_CAPABILITY_CONFIG_KEY, evaluateCapabilityUse, readCircleCapabilityRule } from "./circle-capability.policy";
import { CIRCLE_EXPERT_ROLES } from "../../common/circle-expert-availability";
import { isValidConsultCallPrice } from "../../common/consult-call-pricing";

export interface ConsultCandidate {
  circleId: string; userId: string; role: string;
  questionPriceCoin: number; peekPriceCoin: number; callPricePerMinuteCoin: number;
}

/** 公开入口仅投影当前可用能力，不返回授权快照；真实扣费/接听仍在业务事务里重新验证。 */
@Injectable()
export class CircleConsultVisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async project<T extends ConsultCandidate>(rows: T[]) {
    const result: Array<T & { audioCallApproved: boolean; videoCallApproved: boolean; audioCallEnabled: boolean; videoCallEnabled: boolean }> = [];
    // 每批固定上限，避免逐达人/逐能力查询；不缓存撤权前的结果。
    for (let offset = 0; offset < rows.length; offset += 100) {
      result.push(...await this.prisma.$transaction(tx => this.projectInTransaction(tx, rows.slice(offset, offset + 100)),
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 }));
    }
    return result;
  }

  async projectInTransaction<T extends ConsultCandidate>(tx: Prisma.TransactionClient, rows: T[]) {
    if (!rows.length) return [];
    const circleIds = [...new Set(rows.map(r => r.circleId))];
    const circles = await tx.circle.findMany({ where: { id: { in: circleIds } }, select: {
      id: true, ownerId: true, status: true, deletedAt: true,
      owner: { select: { status: true, deletedAt: true, identityLevel: true } },
    } });
    const userIds = [...new Set([...rows.map(r => r.userId), ...circles.map(c => c.ownerId)])];
    const members = await tx.circleMember.findMany({ where: { circleId: { in: circleIds }, userId: { in: userIds } },
      select: { circleId: true, userId: true, role: true, expireAt: true, user: { select: { status: true, deletedAt: true } } } });
    const subjects = ["circle", ...userIds.map(id => `user:${id}`)];
    const grants = await tx.$queryRaw<CapabilityGrantRow[]>(Prisma.sql`SELECT DISTINCT ON ("circleId", "capability", "subjectKey") *
      FROM "CircleCapabilityGrant" WHERE "circleId" IN (${Prisma.join(circleIds)})
      AND "capability" IN ('AUDIO_QUESTION','VIDEO_QUESTION') AND "subjectKey" IN (${Prisma.join(subjects)})
      ORDER BY "circleId", "capability", "subjectKey", "sequence" DESC`);
    const config = await tx.configSystem.findUnique({ where: { configKey: CIRCLE_CAPABILITY_CONFIG_KEY }, select: { configValue: true } });
    const now = new Date();
    const circleMap = new Map(circles.map(c => [c.id, c]));
    const memberMap = new Map(members.map(m => [`${m.circleId}:${m.userId}`, m]));
    const grantMap = new Map(grants.map(g => [`${g.circleId}:${g.capability}:${g.subjectKey}`, g]));
    const validMember = (m: typeof members[number] | undefined) => !!m && (!m.expireAt || m.expireAt > now);
    return rows.map(row => {
      const circle = circleMap.get(row.circleId), provider = memberMap.get(`${row.circleId}:${row.userId}`);
      const owner = circle && memberMap.get(`${circle.id}:${circle.ownerId}`);
      const context: CapabilityRuntimeContext = { circleId: row.circleId, ownerId: circle?.ownerId ?? "",
        circleActive: circle?.status === "ACTIVE" && !circle.deletedAt,
        ownerActive: circle?.owner.status === "ACTIVE" && !circle.owner.deletedAt,
        ownerMembershipValid: owner?.role === "OWNER" && validMember(owner), ownerIdentity: circle?.owner.identityLevel ?? "NONE",
        ...(provider ? { provider: { userId: provider.userId, role: provider.role, active: provider.user.status === "ACTIVE" && !provider.user.deletedAt,
          membershipValid: validMember(provider) } } : {}) };
      const usable = (cap: "AUDIO_QUESTION" | "VIDEO_QUESTION") => evaluateCapabilityUse(readCircleCapabilityRule(config?.configValue, cap), cap,
        grantMap.get(`${row.circleId}:${cap}:circle`) ?? null, grantMap.get(`${row.circleId}:${cap}:user:${row.userId}`) ?? null, context, now).allowed;
      const audioCallApproved = usable("AUDIO_QUESTION"), videoCallApproved = usable("VIDEO_QUESTION");
      const audioCallEnabled = isValidConsultCallPrice(row.callPricePerMinuteCoin) && audioCallApproved;
      const videoCallEnabled = isValidConsultCallPrice(row.callPricePerMinuteCoin) && videoCallApproved;
      const textAllowed = context.circleActive && !!provider && provider.user.status === "ACTIVE" && !provider.user.deletedAt
        && validMember(provider) && (CIRCLE_EXPERT_ROLES as readonly string[]).includes(provider.role);
      return { ...row, questionPriceCoin: textAllowed ? row.questionPriceCoin : 0, peekPriceCoin: textAllowed ? row.peekPriceCoin : 0,
        callPricePerMinuteCoin: audioCallEnabled || videoCallEnabled ? row.callPricePerMinuteCoin : 0,
        audioCallApproved, videoCallApproved, audioCallEnabled, videoCallEnabled };
    });
  }
}
