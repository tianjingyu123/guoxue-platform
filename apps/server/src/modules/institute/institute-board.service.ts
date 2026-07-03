import { Injectable, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { InstituteRole } from "@prisma/client";

const MGMT_ROLES: InstituteRole[] = ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"];

/** 列表条目（本院成员可见） */
export interface BoardGroupItem {
  id: string;
  name: string;
  topic: string | null;
  circleId: string;
  leader: { userId: string; nickname: string; avatar: string | null };
  memberCount: number;
  memberLimit: number;
  /** 满员软标注（memberCount ≥ memberLimit·前端置灰；硬闸=组长审批 needApproval） */
  full: boolean;
  /** 本人是否已在组内（圈内） */
  joined: boolean;
  status: string;
}

/**
 * 私董会小组（T9 §3.6.5）：6-12 人闭门小组·轮流出题·众人拆解事业课题。
 * 承载=私密子圈（一组一圈）：Circle type=FREE + needApproval=true，圈主=组长。
 * 入组无需新端点——前端跳圈子详情走现有 join（免费审批圈自动进圈主审批流）。
 * 选型说明：prisma 直建 Circle（照抄本模块 autoJoinInstituteCircle / offline.createStudyCircle 惯例）——
 * ① CircleService.create 强制 status=PENDING（系统建圈需直接 ACTIVE）；
 * ② 圈名/简介为平台模板文案，无需外部内容审核；
 * ③ 避免 InstituteModule 引入 CircleModule 的重依赖树。
 */
@Injectable()
export class InstituteBoardService {
  constructor(
    private prisma: PrismaService,
    @Optional() private redis?: RedisService,
  ) {}

  /** 管理层守卫（与 InstituteService.assertManagement 同语义：ACTIVE 管理层会籍） */
  private async assertManagement(userId: string) {
    const member = await this.prisma.instituteMember.findFirst({
      where: { userId, status: "ACTIVE", role: { in: MGMT_ROLES } },
      select: { id: true, instituteId: true, role: true },
    });
    if (!member) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅研究院管理层可操作");
    }
    return member;
  }

  /**
   * 建私董会小组（管理层）：校验组长为本院 ACTIVE 讲席成员 → 事务建私密圈
   * （圈主=组长·OWNER 席+userRole+memberCount=1）+ 关联记录 → 圈子列表缓存失效。
   */
  async createBoardGroup(
    operatorUserId: string,
    dto: { name: string; topic?: string; leaderId: string; memberLimit?: number },
  ) {
    const mgr = await this.assertManagement(operatorUserId);

    // 组长资格：本院 ACTIVE 讲席成员（研修席无分享考核，不担任私董会组长）
    const leader = await this.prisma.instituteMember.findFirst({
      where: { instituteId: mgr.instituteId, userId: dto.leaderId, status: "ACTIVE" },
      select: { seatType: true },
    });
    if (!leader) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "组长须为本研究院 ACTIVE 成员");
    }
    if (leader.seatType !== "LECTURE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "组长须为讲席成员（研修席不可担任私董会组长）");
    }

    const memberLimit = dto.memberLimit ?? 12;
    const name = dto.name.trim();
    const intro =
      `私董会闭门小组（${memberLimit} 人以内）。玩法：轮流出题——每期由一位成员提出自己真实的事业课题，` +
      `其余成员轮流深度拆解、追问与建言，众人智囊、案例沉淀圈内知识库。` +
      `闭门守则：圈内所议不外传。入组需组长审批。`;

    const group = await this.prisma.$transaction(async (tx) => {
      // 私密子圈：免费圈 + 圈主审批闸门（付费圈走支付不审批，故用 FREE+needApproval）
      const circle = await tx.circle.create({
        data: {
          name: `私董会·${name}`,
          intro,
          type: "FREE",
          needApproval: true,
          status: "ACTIVE",
          ownerId: dto.leaderId,
          members: { create: { userId: dto.leaderId, role: "OWNER" } },
          memberCount: 1,
        },
        select: { id: true },
      });

      // 圈主角色分配（照抄 circle.service.create 惯例）
      await tx.userRole.upsert({
        where: { userId_roleType_bindId: { userId: dto.leaderId, roleType: "CIRCLE_OWNER", bindId: circle.id } },
        create: { userId: dto.leaderId, roleType: "CIRCLE_OWNER", bindId: circle.id },
        update: {},
      });

      return tx.instituteBoardGroup.create({
        data: {
          instituteId: mgr.instituteId,
          circleId: circle.id,
          name,
          topic: dto.topic?.trim() || null,
          leaderId: dto.leaderId,
          memberLimit,
        },
        select: { id: true, circleId: true },
      });
    });

    // 圈子列表缓存失效（照抄 circle.service 惯例）
    if (this.redis) await this.redis.delByPattern("circles:list:*");
    return group;
  }

  /**
   * 私董会小组列表（本院 ACTIVE 成员可见·仅 ACTIVE 组）：
   * 实时统计各组圈内人数 + 标注本人是否已入组 + 满员软标注 full。
   */
  async listBoardGroups(userId: string): Promise<{ items: BoardGroupItem[] }> {
    // 可见性闸门：仅本院 ACTIVE 成员（含讲席/研修席/管理层）
    const member = await this.prisma.instituteMember.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { joinedAt: "asc" },
      select: { instituteId: true },
    });
    if (!member) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅研究院成员可查看私董会小组");
    }

    const groups = await this.prisma.instituteBoardGroup.findMany({
      where: { instituteId: member.instituteId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (!groups.length) return { items: [] };

    const circleIds = groups.map((g) => g.circleId);
    const leaderIds = [...new Set(groups.map((g) => g.leaderId))];

    const [countGroups, myMemberships, leaders] = await Promise.all([
      // 实时人数：查 CircleMember（不信任 Circle.memberCount 冗余计数）
      this.prisma.circleMember.groupBy({
        by: ["circleId"],
        where: { circleId: { in: circleIds } },
        _count: { _all: true },
      }),
      this.prisma.circleMember.findMany({
        where: { userId, circleId: { in: circleIds } },
        select: { circleId: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: leaderIds } },
        select: { id: true, nickname: true, avatar: true },
      }),
    ]);

    const countMap = new Map<string, number>();
    for (const g of countGroups) countMap.set(g.circleId, g._count._all);
    const joinedSet = new Set(myMemberships.map((m) => m.circleId));
    const leaderMap = new Map(leaders.map((u) => [u.id, u]));

    const items: BoardGroupItem[] = groups.map((g) => {
      const leader = leaderMap.get(g.leaderId);
      const memberCount = countMap.get(g.circleId) || 0;
      return {
        id: g.id,
        name: g.name,
        topic: g.topic,
        circleId: g.circleId,
        leader: {
          userId: g.leaderId,
          nickname: leader?.nickname || "私董会组长",
          avatar: leader?.avatar ?? null,
        },
        memberCount,
        memberLimit: g.memberLimit,
        full: memberCount >= g.memberLimit,
        joined: joinedSet.has(g.circleId),
        status: g.status,
      };
    });

    return { items };
  }

  /** 解散小组（管理层）：标记 DISBANDED（圈子本体保留，由圈主自管，不动 circle 模块） */
  async disbandBoardGroup(operatorUserId: string, id: string) {
    const mgr = await this.assertManagement(operatorUserId);

    const group = await this.prisma.instituteBoardGroup.findUnique({ where: { id } });
    if (!group) throw new BusinessException(ErrorCode.NOT_FOUND, "私董会小组不存在");
    if (group.instituteId !== mgr.instituteId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅可解散本研究院的私董会小组");
    }
    if (group.status === "DISBANDED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该小组已解散");
    }

    await this.prisma.instituteBoardGroup.update({
      where: { id },
      data: { status: "DISBANDED" },
    });

    return {
      success: true,
      message: "私董会小组已解散。承载圈子本体保留，后续由圈主（组长）自行管理（可继续运营或申请关停）。",
    };
  }
}
