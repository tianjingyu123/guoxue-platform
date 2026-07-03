import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { InstituteRole } from "@prisma/client";

/**
 * T9-P1 研究院考核制度服务（V5 真源）
 * - 讲席五维/研修席三维准入自动校验（阈值全部环境变量化·INSTITUTE_REQ_* 前缀·后台可配预留）
 * - 年度积分考核（InstituteSharePoint 流水·四档判定：全返/半返/保籍/AT_RISK）
 * - 活动完成自动记分（幂等·refId=eventId 查重）与管理层人工记分
 */

const MGMT_ROLES: InstituteRole[] = ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"];

/** 积分类型全集（V5 §3.3 积分表 + MANUAL 人工调整） */
export const SHARE_POINT_TYPES = [
  "OFFLINE_STATION", // 旗舰驿站线下分享
  "SALON_MONTHLY", // 平台月度线下沙龙主讲
  "QUARTERLY_EVENT", // 季度高规格分享会主讲
  "INSTITUTE_SALON", // 院内沙龙主讲
  "LIVE_COURSE", // 直播公开课
  "ARTICLE", // 深度文章/案例
  "MENTORING", // 带教研修席成员
  "QA", // 回答院内提问
  "MANUAL", // 人工调整（可负·纠错）
] as const;
export type SharePointType = (typeof SHARE_POINT_TYPES)[number];

/** 环境变量数值读取（非法/缺省回落默认值·后台可配预留） */
function envNum(name: string, def: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : def;
}

export interface EligibilityCheck {
  key: string;
  label: string;
  pass: boolean;
  current: number;
  required: number;
}

export interface EligibilityResult {
  seatType: "LECTURE" | "STUDY";
  eligible: boolean;
  checks: EligibilityCheck[];
}

/** 讲席候选圈的三项圈维度指标（成员规模/内容质量/近期活跃） */
interface CircleDimResult {
  circleId: string;
  circleName: string;
  memberCount: number;
  contentTotal: number;
  bGradeCount: number;
  bRatio: number; // 0-1
  recentPosts: number;
  passCount: number;
}

export interface AssessmentTierResponse {
  year: number;
  points: number;
  quarterPoints: [number, number, number, number];
  offline: {
    met: boolean;
    detail: { type: string; label: string; count: number; required: number }[];
  };
  /** EXEMPT=特邀免会费成员（无年费可返·天然豁免返还与转席档位·积分与流水照常返回） */
  tier: "FULL_REFUND" | "HALF_REFUND" | "KEEP" | "AT_RISK" | "EXEMPT";
  /** 永久免会费（特邀名师标志·§3.2 V6） */
  feeExempt: boolean;
  pointItems: {
    id: string;
    pointType: string;
    points: number;
    refId: string | null;
    remark: string | null;
    createdAt: Date;
  }[];
}

@Injectable()
export class InstituteAssessmentService {
  constructor(private prisma: PrismaService) {}

  // ════════════════════════════════════════
  // 准入校验（GET /institute/eligibility）
  // ════════════════════════════════════════

  async getEligibility(userId: string, seatType?: string): Promise<EligibilityResult> {
    const seat: "LECTURE" | "STUDY" = seatType === "STUDY" ? "STUDY" : "LECTURE";
    const checks = seat === "STUDY"
      ? await this.buildStudyChecks(userId)
      : await this.buildLectureChecks(userId);
    return { seatType: seat, eligible: checks.every((c) => c.pass), checks };
  }

  /**
   * 讲席五维硬门槛（§3.2·数据全自动校验）：
   * 1. 任一圈子 OWNER/GUEST → 2-4 在候选圈中取"最接近达标"的一个圈评估
   * 2. 该圈成员≥50 3. 圈内容≥20篇且B级以上占比≥50% 4. 近90天圈内发帖≥10
   * 5. 圈子/课程累计创收≥5000元（用户级·跨圈累计）
   */
  private async buildLectureChecks(userId: string): Promise<EligibilityCheck[]> {
    const reqMembers = envNum("INSTITUTE_REQ_CIRCLE_MEMBERS", 50);
    const reqContent = envNum("INSTITUTE_REQ_CONTENT_COUNT", 20);
    const reqBRatio = envNum("INSTITUTE_REQ_CONTENT_B_RATIO", 0.5); // 0-1
    const reqPosts90 = envNum("INSTITUTE_REQ_ACTIVE_POSTS_90D", 10);
    const reqRevenue = envNum("INSTITUTE_REQ_REVENUE_YUAN", 5000);

    // 维度1：任一 ACTIVE 圈子的 OWNER 或 GUEST
    const memberships = await this.prisma.circleMember.findMany({
      where: {
        userId,
        role: { in: ["OWNER", "GUEST"] },
        circle: { status: "ACTIVE", deletedAt: null },
      },
      select: {
        circleId: true,
        circle: { select: { id: true, name: true, memberCount: true } },
      },
    });

    // 维度2-4：逐候选圈评估（按成员数降序取前5个圈控查询量），取通过项最多的圈
    const candidates = [...memberships]
      .sort((a, b) => (b.circle?.memberCount || 0) - (a.circle?.memberCount || 0))
      .slice(0, 5);
    let best: CircleDimResult | null = null;
    for (const m of candidates) {
      const dim = await this.evaluateCircleDims(userId, m.circleId, m.circle?.name || "", {
        reqMembers, reqContent, reqBRatio, reqPosts90,
      });
      if (!best || dim.passCount > best.passCount ||
        (dim.passCount === best.passCount && dim.memberCount > best.memberCount)) {
        best = dim;
      }
    }

    // 维度5：圈子/课程累计创收（自有圈 CircleRevenueRecord.amount 全类型总额 + 本人课程已支付订单总额）
    const revenueYuan = await this.sumUserRevenue(userId);

    const bRatioPct = best ? Math.round(best.bRatio * 100) : 0;
    return [
      {
        key: "circleRole",
        label: "身份：任一圈子圈主（OWNER）或嘉宾（GUEST）",
        pass: memberships.length >= 1,
        current: memberships.length,
        required: 1,
      },
      {
        key: "circleScale",
        label: `圈子规模：${best ? `「${best.circleName}」` : ""}成员≥${reqMembers}人`,
        pass: !!best && best.memberCount >= reqMembers,
        current: best?.memberCount || 0,
        required: reqMembers,
      },
      {
        key: "contentQuality",
        label: `作品：圈内容≥${reqContent}篇且质量B级以上占比≥${Math.round(reqBRatio * 100)}%（当前占比${bRatioPct}%）`,
        pass: !!best && best.contentTotal >= reqContent && best.bRatio >= reqBRatio,
        current: best?.contentTotal || 0,
        required: reqContent,
      },
      {
        key: "recentActivity",
        label: `活跃：近90天圈内发帖≥${reqPosts90}篇`,
        pass: !!best && best.recentPosts >= reqPosts90,
        current: best?.recentPosts || 0,
        required: reqPosts90,
      },
      {
        key: "revenue",
        label: `经营：圈子/课程累计创收≥${reqRevenue}元`,
        pass: revenueYuan >= reqRevenue,
        current: Math.round(revenueYuan),
        required: reqRevenue,
      },
    ];
  }

  /** 单个候选圈的 2-4 维评估 */
  private async evaluateCircleDims(
    userId: string,
    circleId: string,
    circleName: string,
    req: { reqMembers: number; reqContent: number; reqBRatio: number; reqPosts90: number },
  ): Promise<CircleDimResult> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [circle, posts, articles] = await Promise.all([
      this.prisma.circle.findUnique({ where: { id: circleId }, select: { memberCount: true } }),
      this.prisma.post.findMany({
        where: { circleId, userId, status: "PUBLISHED" },
        select: { id: true, createdAt: true },
      }),
      this.prisma.article.findMany({
        where: { circleId, userId, deletedAt: null },
        select: { id: true },
      }),
    ]);

    const contentTotal = posts.length + articles.length;
    // 质量评分关联口径：ContentQualityScore 以 (targetType, targetId) 关联内容本体，
    // 作者/圈维度 = 先取该作者在该圈的 Post/Article id 集合，再查评分表 grade∈{A,B}；
    // 未评分内容计入分母不计入分子（占比 = B级以上评分数 / 圈内容总数）
    let bGradeCount = 0;
    if (contentTotal > 0) {
      bGradeCount = await this.prisma.contentQualityScore.count({
        where: {
          grade: { in: ["A", "B"] },
          OR: [
            { targetType: "POST", targetId: { in: posts.map((p) => p.id) } },
            { targetType: "ARTICLE", targetId: { in: articles.map((a) => a.id) } },
          ],
        },
      });
    }
    const bRatio = contentTotal > 0 ? bGradeCount / contentTotal : 0;
    const recentPosts = posts.filter((p) => p.createdAt >= ninetyDaysAgo).length;
    const memberCount = circle?.memberCount || 0;

    const passCount =
      (memberCount >= req.reqMembers ? 1 : 0) +
      (contentTotal >= req.reqContent && bRatio >= req.reqBRatio ? 1 : 0) +
      (recentPosts >= req.reqPosts90 ? 1 : 0);

    return { circleId, circleName, memberCount, contentTotal, bGradeCount, bRatio, recentPosts, passCount };
  }

  /** 创收口径：自有圈 CircleRevenueRecord.amount 总额（全类型）+ 本人创建课程的已支付订单 amount 总额（单位：元） */
  private async sumUserRevenue(userId: string): Promise<number> {
    const [ownedCircles, myCourses] = await Promise.all([
      this.prisma.circle.findMany({ where: { ownerId: userId, deletedAt: null }, select: { id: true } }),
      this.prisma.course.findMany({ where: { userId, deletedAt: null }, select: { id: true } }),
    ]);

    let circleRevenue = 0;
    if (ownedCircles.length) {
      const agg = await this.prisma.circleRevenueRecord.aggregate({
        where: { circleId: { in: ownedCircles.map((c) => c.id) } },
        _sum: { amount: true },
      });
      circleRevenue = Number(agg._sum.amount || 0);
    }

    let courseRevenue = 0;
    if (myCourses.length) {
      const agg = await this.prisma.order.aggregate({
        where: {
          type: "COURSE",
          targetId: { in: myCourses.map((c) => c.id) },
          status: { in: ["PAID", "COMPLETED"] },
        },
        _sum: { amount: true },
      });
      courseRevenue = Number(agg._sum.amount || 0);
    }
    return circleRevenue + courseRevenue;
  }

  /** 研修席三维：注册满90天 / 任一圈子成员 / 年费确认（提交入会申请即确认年费义务·支付门控解冻后接真实缴费） */
  private async buildStudyChecks(userId: string): Promise<EligibilityCheck[]> {
    const reqRegDays = envNum("INSTITUTE_REQ_STUDY_REG_DAYS", 90);

    const [user, circleCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
      this.prisma.circleMember.count({ where: { userId } }),
    ]);
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");

    const regDays = Math.floor((Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    return [
      {
        key: "regDays",
        label: `平台注册满${reqRegDays}天`,
        pass: regDays >= reqRegDays,
        current: regDays,
        required: reqRegDays,
      },
      {
        key: "anyCircle",
        label: "任一圈子成员",
        pass: circleCount >= 1,
        current: circleCount,
        required: 1,
      },
      {
        key: "annualFee",
        label: "年费确认（提交入会申请即视为确认年费义务·支付门控解冻后接真实缴费）",
        pass: true,
        current: 1,
        required: 1,
      },
    ];
  }

  // ════════════════════════════════════════
  // 年度考核（GET /institute/my/assessment）
  // ════════════════════════════════════════

  /**
   * V5 四档判定：
   * 全返 = 积分≥100 且线下三选一达标（旗舰驿站≥1场 / 月度沙龙≥2场 / 季度高规格会≥1场）
   * 半返 = 积分≥100 线下未达标；保籍 = 积分≥60 且已结束季度均≥15；其余 AT_RISK
   */
  async getMyAssessment(userId: string): Promise<AssessmentTierResponse> {
    const member = await this.prisma.instituteMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: "asc" },
      select: { id: true, feeExempt: true },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "不是研究院成员");
    const feeExempt = member.feeExempt === true;

    const now = new Date();
    const year = now.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const records = await this.prisma.instituteSharePoint.findMany({
      where: { memberId: member.id, createdAt: { gte: yearStart, lt: yearEnd } },
      orderBy: { createdAt: "desc" },
    });

    const points = records.reduce((sum, r) => sum + r.points, 0);
    const quarterPoints: [number, number, number, number] = [0, 0, 0, 0];
    for (const r of records) {
      const q = Math.floor(new Date(r.createdAt).getMonth() / 3) as 0 | 1 | 2 | 3;
      quarterPoints[q] += r.points;
    }

    // 线下硬指标三选一（当期指标·平台坑位供给即调节阀）
    const offlineReqs: { type: SharePointType; label: string; required: number }[] = [
      { type: "OFFLINE_STATION", label: "旗舰驿站线下分享", required: envNum("INSTITUTE_OFFLINE_STATION_MIN", 1) },
      { type: "SALON_MONTHLY", label: "平台月度线下沙龙主讲", required: envNum("INSTITUTE_OFFLINE_SALON_MIN", 2) },
      { type: "QUARTERLY_EVENT", label: "季度高规格分享会主讲", required: envNum("INSTITUTE_OFFLINE_QUARTERLY_MIN", 1) },
    ];
    const detail = offlineReqs.map((req) => ({
      type: req.type,
      label: req.label,
      count: records.filter((r) => r.pointType === req.type && r.points > 0).length,
      required: req.required,
    }));
    const met = detail.some((d) => d.count >= d.required);

    // 四档判定（阈值环境变量化）
    const fullLine = envNum("INSTITUTE_ASSESS_FULL_POINTS", 100);
    const keepLine = envNum("INSTITUTE_ASSESS_KEEP_POINTS", 60);
    const quarterMin = envNum("INSTITUTE_ASSESS_QUARTER_MIN", 15);
    // 季度线只考已完整结束的季度（年中不苛责未到期季度）
    const elapsedQuarters = Math.floor(now.getMonth() / 3);
    const quarterLineOk = quarterPoints.slice(0, elapsedQuarters).every((p) => p >= quarterMin);

    let tier: AssessmentTierResponse["tier"];
    if (feeExempt) tier = "EXEMPT"; // 特邀免会费：无年费可返·豁免返还与转席档位（积分与流水照常返回进榜单）
    else if (points >= fullLine && met) tier = "FULL_REFUND";
    else if (points >= fullLine) tier = "HALF_REFUND";
    else if (points >= keepLine && quarterLineOk) tier = "KEEP";
    else tier = "AT_RISK";

    return {
      year,
      points,
      quarterPoints,
      offline: { met, detail },
      tier,
      feeExempt,
      pointItems: records.slice(0, 20).map((r) => ({
        id: r.id,
        pointType: r.pointType,
        points: r.points,
        refId: r.refId,
        remark: r.remark,
        createdAt: r.createdAt,
      })),
    };
  }

  // ════════════════════════════════════════
  // 记分（人工 + 活动自动挂点）
  // ════════════════════════════════════════

  private async assertManagement(userId: string) {
    // 多院化：按用户找其 ACTIVE 管理层会籍（findFirst·非 userId 唯一假设）
    const member = await this.prisma.instituteMember.findFirst({
      where: { userId, status: "ACTIVE", role: { in: MGMT_ROLES } },
      select: { id: true, instituteId: true },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "仅研究院管理层可操作");
    return member;
  }

  /** 管理层人工记分/调整（POST /institute/manage/members/:id/points） */
  async addManualPoints(
    operatorUserId: string,
    memberId: string,
    dto: { pointType?: string; points: number; refId?: string; remark?: string },
  ) {
    await this.assertManagement(operatorUserId);

    const member = await this.prisma.instituteMember.findUnique({
      where: { id: memberId },
      select: { id: true, instituteId: true, userId: true },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "研究院成员不存在");

    const pointType = dto.pointType || "MANUAL";
    if (!SHARE_POINT_TYPES.includes(pointType as SharePointType)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `无效积分类型：${pointType}`);
    }
    if (!Number.isInteger(dto.points) || dto.points === 0 || Math.abs(dto.points) > 1000) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "积分须为非零整数且绝对值不超过1000");
    }

    return this.prisma.instituteSharePoint.create({
      data: {
        instituteId: member.instituteId,
        memberId: member.id,
        userId: member.userId,
        pointType,
        points: dto.points,
        refId: dto.refId || null,
        remark: dto.remark || null,
        verifiedBy: operatorUserId, // 记录操作者（人工记分可追溯）
      },
    });
  }

  /**
   * 活动状态变 COMPLETED 时给 lecturer 对应 member 自动记分（幂等：refId=eventId 查重）。
   * SALON→INSTITUTE_SALON（默认20分）·LIVE→LIVE_COURSE（默认15分）·基准分后台可配；其余类型不记分。
   */
  async awardEventPointsForCompletedEvent(event: {
    id: string;
    type: string;
    title?: string | null;
    lecturerId?: string | null;
    instituteId?: string | null;
  }) {
    if (!event.lecturerId) return null;

    const conf: Record<string, { pointType: SharePointType; points: number }> = {
      SALON: { pointType: "INSTITUTE_SALON", points: envNum("INSTITUTE_POINTS_INSTITUTE_SALON", 20) },
      LIVE: { pointType: "LIVE_COURSE", points: envNum("INSTITUTE_POINTS_LIVE_COURSE", 15) },
    };
    const rule = conf[event.type];
    if (!rule) return null;

    const member = await this.prisma.instituteMember.findFirst({
      where: {
        userId: event.lecturerId,
        status: "ACTIVE",
        ...(event.instituteId ? { instituteId: event.instituteId } : {}),
      },
      select: { id: true, instituteId: true, userId: true },
    });
    if (!member) return null;

    // 幂等：同一活动不重复记分
    const existing = await this.prisma.instituteSharePoint.findFirst({
      where: { memberId: member.id, refId: event.id },
      select: { id: true },
    });
    if (existing) return null;

    return this.prisma.instituteSharePoint.create({
      data: {
        instituteId: member.instituteId,
        memberId: member.id,
        userId: member.userId,
        pointType: rule.pointType,
        points: rule.points,
        refId: event.id,
        remark: `活动完成自动记分${event.title ? `：${event.title}` : ""}`,
      },
    });
  }
}
