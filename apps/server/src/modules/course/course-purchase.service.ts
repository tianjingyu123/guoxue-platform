import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma, OrderStatus } from "@prisma/client";
import { safePagination } from "../../common/pagination";
import { RedisService } from "../../redis/redis.service";
import { UnifiedPricingService } from "../pricing/unified-pricing.service";
import { ShopAttributionService } from "../shop/shop-attribution.service";
import { PurchaseCourseDto } from "./course.dto";

/**
 * 课程-购买与访问权限域（从 course.service 拆出·纯搬家不改逻辑）。
 * 职责：下单购买、访问权限校验、会员精品课标记、有效期检查、已购课程列表。
 * 叶子域·先抽·破环关键：checkAccess 被学习域/评价域依赖，独立成叶子供它们注入。
 */
@Injectable()
export class CoursePurchaseService {
  private readonly logger = new Logger(CoursePurchaseService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private unifiedPricing: UnifiedPricingService,
    private attribution: ShopAttributionService,
  ) {}

  /**
   * 课程订单复用商城统一归因口径：
   * 临时分享链接 / 有效 ChannelClick 优先，永久分站归属兜底。
   * 任一归因查询失败均 fail-open，不能阻断正常下单。
   */
  private async resolveOrderAttribution(userId: string, courseId: string, dto?: PurchaseCourseDto) {
    let tempReferrerId: string | null = null;
    let tempRefSubjectType: string | null = null;
    try {
      // referrerId 是历史客户端字段，按临时分享推荐人兼容读取；新客户端使用 tempReferrerId。
      tempReferrerId = await this.attribution.resolveReferrerUserId(
        dto?.tempReferrerId || dto?.referrerId,
        userId,
      );
      if (await this.attribution.isChannelAttributionEnabled()) {
        const click = await this.attribution.findLatestChannelClick(userId, courseId);
        if (click && click.beneficiaryUserId !== userId) {
          tempReferrerId = click.beneficiaryUserId;
          tempRefSubjectType = click.subjectType;
        }
      }
    } catch (error) {
      this.logger.warn("课程临时归因查询失败，回落永久归属或无推荐人", error);
    }

    let permanentReferrerId: string | null = null;
    try {
      const relation = await this.prisma.referralRelation.findFirst({
        where: { userId, referrerType: "STATION_MASTER", relationStatus: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { referrerId: true },
      });
      permanentReferrerId = relation?.referrerId ?? null;
    } catch (error) {
      this.logger.warn("课程永久归属查询失败，按无永久归属继续下单", error);
    }

    return { permanentReferrerId, tempReferrerId, tempRefSubjectType };
  }

  /** 创建课程购买订单（Redis 锁防并发重复下单） */
  async purchase(userId: string, courseId: string, dto?: PurchaseCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, price: true, title: true, validityDays: true },
    });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    // 通过统一价格引擎计算实付价格（检查限时折扣）
    const pricing = await this.unifiedPricing.calculateTargetPrice(courseId, "COURSE", userId);

    // Redis 锁防并发：同一用户对同一课程只能有一个下单流程
    const lockKey = `purchase:lock:${userId}:${courseId}`;
    const locked = await this.redis.setNX(lockKey, "1", 10);
    if (!locked) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "订单处理中，请稍后再试");
    }

    try {
      // 锁内再次检查是否已购买（含有效期判断）
      const existingOrder = await this.prisma.order.findFirst({
        where: { userId, type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } },
        orderBy: { paidAt: "desc" },
      });
      if (existingOrder && existingOrder.paidAt) {
        if (course.validityDays > 0) {
          const expiresAt = new Date(existingOrder.paidAt.getTime() + course.validityDays * 86400000);
          if (expiresAt > new Date()) {
            throw new BusinessException(ErrorCode.COURSE_ALREADY_ENROLLED, "该课程仍在有效期内，无需重复购买");
          }
        } else {
          throw new BusinessException(ErrorCode.COURSE_ALREADY_ENROLLED, "已购买该课程");
        }
      }

      // 检查是否有待支付订单（复用）
      const pendingOrder = await this.prisma.order.findFirst({
        where: { userId, type: "COURSE", targetId: courseId, status: "PENDING" },
      });
      if (pendingOrder) return pendingOrder;

      const attribution = await this.resolveOrderAttribution(userId, courseId, dto);
      const orderData: any = {
        userId,
        type: "COURSE",
        targetId: courseId,
        amount: pricing.effectivePrice,
        originalAmount: pricing.originalPrice > pricing.effectivePrice ? pricing.originalPrice : undefined,
        couponId: dto?.couponId,
        referrerId: attribution.permanentReferrerId,
        tempReferrerId: attribution.tempReferrerId,
        tempRefSubjectType: attribution.tempRefSubjectType,
        status: "PENDING",
      };
      if (pricing.appliedPromotion) {
        orderData.promotionType = pricing.appliedPromotion.type;
        orderData.promotionId = pricing.appliedPromotion.id;
      }
      // 免费课「订阅即完成」（董事长 2026-07-18 拍板：免费课也要订阅动作，统一进「我的课程」）：
      // ¥0 单无需支付流程直接置 PAID——getMyCourses 查 PAID/COMPLETED 即自动收录；
      // checkAccess 对 price=0 本就放行，此单的意义是让用户在「我的课程」里找得到它。幂等由上方已购检查保证
      if (Number(pricing.effectivePrice) === 0) {
        orderData.status = "PAID";
        orderData.paidAt = new Date();
        orderData.payMethod = "FREE";
        orderData.payAmount = 0;
      }
      const order = await this.prisma.order.create({ data: orderData });
      return order;
    } finally {
      await this.redis.del(lockKey).catch(() => {});
    }
  }

  /** 检查用户是否有课程访问权限（含有效期检查；会员专属精品课对有效会员免费） */
  async checkAccess(userId: string, courseId: string): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { price: true, userId: true, validityDays: true, memberFree: true },
    });
    if (!course) return false;
    if (Number(course.price) === 0 || course.userId === userId) return true;

    // 会员权益（2026-07-03 拍板）：memberFree 课程对有效会员直接放行，无需下单
    if (course.memberFree && (await this.isActiveMember(userId))) return true;

    const order = await this.prisma.order.findFirst({
      where: { userId, type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } },
    });
    if (!order || !order.paidAt) return false;

    // 如果课程有有效期，检查是否过期
    if (course.validityDays > 0) {
      const expiresAt = new Date(order.paidAt.getTime() + course.validityDays * 86400000);
      if (expiresAt <= new Date()) return false;
    }

    return true;
  }

  /** 会员精品课标记（平台运营专属：精品课遴选是平台与讲师协商的运营决策，讲师端不可自标蹭会员流量） */
  async setMemberFree(operatorUserId: string, courseId: string, memberFree: boolean) {
    const admin = await this.prisma.userRole.findFirst({
      where: { userId: operatorUserId, roleType: { in: ["SUPER_ADMIN", "OPERATION_ADMIN"] } },
      select: { id: true },
    });
    if (!admin) throw new BusinessException(ErrorCode.FORBIDDEN, "仅平台运营可设置会员精品课");
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");
    return this.prisma.course.update({ where: { id: courseId }, data: { memberFree }, select: { id: true, memberFree: true } });
  }

  /** 是否有效会员（终身会员 memberExpire 为空；到期视为失效） */
  private async isActiveMember(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true, memberExpire: true },
    });
    if (!user?.memberLevel || user.memberLevel === "NONE") return false;
    return !user.memberExpire || user.memberExpire > new Date();
  }

  /** 检查用户课程是否过期 */
  async checkCourseExpiry(userId: string, courseId: string): Promise<{
    expired: boolean;
    expiresAt: string | null;
    remainingDays: number | null;
  }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { validityDays: true },
    });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    // validityDays === 0 表示永久有效
    if (course.validityDays === 0) {
      return { expired: false, expiresAt: null, remainingDays: null };
    }

    const order = await this.prisma.order.findFirst({
      where: { userId, type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } },
      orderBy: { paidAt: "desc" },
    });
    if (!order || !order.paidAt) {
      return { expired: true, expiresAt: null, remainingDays: null };
    }

    const expiresAt = new Date(order.paidAt.getTime() + course.validityDays * 86400000);
    const now = new Date();
    const expired = now > expiresAt;
    const remainingDays = expired ? 0 : Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);

    return {
      expired,
      expiresAt: expiresAt.toISOString(),
      remainingDays,
    };
  }

  /** 获取用户有效期内课程列表 */
  async getUserValidCourses(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId, type: "COURSE", status: { in: ["PAID", "COMPLETED"] }, paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
    });

    if (orders.length === 0) return { courses: [], total: 0 };

    const courseIds = orders.map((o) => o.targetId);
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true, cover: true, type: true, validityDays: true, price: true },
    });

    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const validCourses = orders
      .filter((o) => {
        const course = courseMap.get(o.targetId);
        if (!course || !o.paidAt) return false;
        if (course.validityDays === 0) return true; // 永久有效
        const expiresAt = new Date(o.paidAt.getTime() + course.validityDays * 86400000);
        return expiresAt > new Date();
      })
      .map((o) => {
        const course = courseMap.get(o.targetId)!;
        const expiresAt =
          course.validityDays > 0 && o.paidAt
            ? new Date(o.paidAt.getTime() + course.validityDays * 86400000)
            : null;
        return {
          orderId: o.id,
          paidAt: o.paidAt,
          amount: o.amount,
          course: {
            id: course.id,
            title: course.title,
            cover: course.cover,
            type: course.type,
            price: course.price,
            validityDays: course.validityDays,
          },
          expiresAt: expiresAt?.toISOString() || null,
          remainingDays: expiresAt
            ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))
            : null,
        };
      });

    return { courses: validCourses, total: validCourses.length };
  }

  /** 获取我购买的课程 */
  async getMyCourses(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.OrderWhereInput = { userId, type: "COURSE" as const, status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] } };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { paidAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    // 批量获取课程信息
    const courseIds = orders.map(o => o.targetId);
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({
          where: { id: { in: courseIds } },
          select: {
            id: true, title: true, cover: true, type: true,
            user: { select: { id: true, nickname: true, avatar: true } },
          },
        })
      : [];

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const enriched = orders.map(o => ({
      orderId: o.id,
      paidAt: o.paidAt,
      amount: o.amount,
      course: courseMap.get(o.targetId) || null,
      // 查询学习进度
    }));

    return { courses: enriched, total, page, pageSize };
  }
}
