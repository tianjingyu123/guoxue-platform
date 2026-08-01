import { Injectable, Logger } from "@nestjs/common";
import { decrypt } from "../../common/crypto.util";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { PERSONAL_DATA_EXPORT_TYPES, PersonalDataExportType } from "./user.dto";

/**
 * 用户个人数据导出。
 *
 * 这里刻意使用字段白名单，而不是把 User 关系整棵 include 出去：
 * 密码哈希、支付密码、第三方登录凭据、风控画像和其他用户数据不得进入导出文件。
 */
@Injectable()
export class PersonalDataExportService {
  private readonly logger = new Logger(PersonalDataExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, requestedTypes: string[]) {
    const allowed = new Set<string>(PERSONAL_DATA_EXPORT_TYPES);
    if (!Array.isArray(requestedTypes)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请选择有效的导出数据类型");
    }
    const types = [...new Set(requestedTypes)] as PersonalDataExportType[];
    if (!types.length || types.some((type) => !allowed.has(type))) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请选择有效的导出数据类型");
    }

    const entries = await Promise.all(
      types.map(async (type) => [type, await this.exportSection(userId, type)] as const),
    );
    const sections = Object.fromEntries(entries);
    const summary = Object.fromEntries(
      entries.map(([type, value]) => [type, this.countRows(type, value)]),
    );
    const exportedAt = new Date().toISOString();

    // 审计只记录导出了哪些类别和数量，不记录实际个人数据；失败不阻断用户下载。
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          executor: userId,
          action: "PERSONAL_DATA_EXPORT",
          targetType: "USER",
          detail: JSON.stringify({ types, summary, exportedAt }),
        },
      });
    } catch (error) {
      this.logger.warn(
        "个人数据导出审计写入失败",
        error instanceof Error ? error.message : String(error),
      );
    }

    return {
      schemaVersion: "1.0",
      exportedAt,
      accountId: userId,
      selectedTypes: types,
      summary,
      notice: "本文件仅包含当前登录账号按所选类别导出的数据，不包含密码、支付密码、第三方登录凭据和平台风控内部字段。",
      sections,
    };
  }

  private exportSection(userId: string, type: PersonalDataExportType): Promise<unknown> {
    switch (type) {
      case "profile": return this.exportProfile(userId);
      case "posts": return this.exportPosts(userId);
      case "comments": return this.exportComments(userId);
      case "favorites": return this.exportFavorites(userId);
      case "orders": return this.exportOrders(userId);
      case "learning": return this.exportLearning(userId);
      case "notes": return this.exportNotes(userId);
      case "follows": return this.exportFollows(userId);
      default: throw new BusinessException(ErrorCode.BAD_REQUEST, "请选择有效的导出数据类型");
    }
  }

  private async exportProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        phoneEnc: true,
        email: true,
        nickname: true,
        avatar: true,
        bio: true,
        gender: true,
        birthday: true,
        memberLevel: true,
        memberExpire: true,
        memberAutoRenew: true,
        interestCategories: true,
        identityVerified: true,
        identityVerifiedAt: true,
        attributionSource: true,
        attributionStationId: true,
        status: true,
        timezone: true,
        preferredCurrency: true,
        notifySettings: true,
        creatorSettings: true,
        teenModeEnabled: true,
        teenModeSettings: true,
        deleteRequestedAt: true,
        deleteScheduledAt: true,
        createdAt: true,
        updatedAt: true,
        roles: { select: { roleType: true, createdAt: true } },
      },
    });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");

    const { phoneEnc, ...safeProfile } = user;
    let phone = user.phone;
    if (phoneEnc) {
      try {
        phone = decrypt(phoneEnc);
      } catch {
        // 灰度加密旧数据异常时退回明文字段，绝不把密文写入用户文件。
      }
    }
    return { ...safeProfile, phone };
  }

  private async exportPosts(userId: string) {
    const [posts, articles] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, circleId: true, type: true, title: true, content: true,
          images: true, videoUrl: true, fileUrl: true, linkUrl: true,
          audioUrl: true, audioDuration: true, attachments: true,
          isEssence: true, isTop: true, isPushHome: true, auditStatus: true,
          auditReason: true, status: true, scheduledAt: true, createdAt: true, updatedAt: true,
          circle: { select: { id: true, name: true } },
        },
      }),
      this.prisma.article.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, circleId: true, title: true, content: true, cover: true,
          excerpt: true, tags: true, visibility: true, isPushHome: true,
          auditStatus: true, scheduledAt: true, viewCount: true, likeCount: true,
          collectCount: true, commentCount: true, deletedAt: true,
          createdAt: true, updatedAt: true,
          circle: { select: { id: true, name: true } },
        },
      }),
    ]);
    return { posts, articles };
  }

  private async exportComments(userId: string) {
    const [comments, likes, courseReviews, productReviews, liveReviews, offlineCourseReviews, ebookReviews] = await Promise.all([
      this.prisma.comment.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, targetType: true, targetId: true, parentId: true, content: true, likeCount: true, status: true, deletedAt: true, createdAt: true },
      }),
      this.prisma.like.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, targetType: true, targetId: true, createdAt: true },
      }),
      this.prisma.courseReview.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, courseId: true, orderId: true, rating: true, content: true, reply: true, status: true, createdAt: true, course: { select: { title: true } } },
      }),
      this.prisma.productReview.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, productId: true, orderId: true, rating: true, content: true, images: true, status: true, reply: true, repliedAt: true, createdAt: true },
      }),
      this.prisma.liveReview.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, roomId: true, rating: true, content: true, reply: true, flagged: true, createdAt: true },
      }),
      this.prisma.offlineCourseReview.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, courseId: true, stationId: true, registrationId: true, rating: true, content: true, createdAt: true },
      }),
      this.prisma.ebookReview.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, ebookId: true, rating: true, content: true, reply: true, status: true, createdAt: true, ebook: { select: { title: true } } },
      }),
    ]);
    return { comments, likes, courseReviews, productReviews, liveReviews, offlineCourseReviews, ebookReviews };
  }

  private async exportFavorites(userId: string) {
    const [collects, toolFavorites, classicFavorites, ebookFavorites] = await Promise.all([
      this.prisma.collect.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, targetType: true, targetId: true, createdAt: true },
      }),
      this.prisma.toolFavorite.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, toolId: true, sortOrder: true, createdAt: true },
      }),
      this.prisma.classicFavorite.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, bookId: true, createdAt: true },
      }),
      this.prisma.ebookFavorite.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, ebookId: true, createdAt: true },
      }),
    ]);
    return { collects, toolFavorites, classicFavorites, ebookFavorites };
  }

  private async exportOrders(userId: string) {
    const [orders, memberPurchases, ebookPurchases, invoices] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: {
          id: true, type: true, targetId: true, skuId: true, quantity: true,
          amount: true, payAmount: true, originalAmount: true, couponId: true,
          promotionType: true, promotionId: true, shippingInfo: true,
          status: true, payMethod: true, payTransactionId: true,
          paidAt: true, shippedAt: true, completedAt: true, refundedAt: true,
          createdAt: true, updatedAt: true,
        },
      }),
      this.prisma.memberPurchase.findMany({
        where: { userId }, orderBy: { paidAt: "asc" },
        select: { id: true, memberType: true, amount: true, paidAt: true, expireAt: true },
      }),
      this.prisma.ebookPurchase.findMany({
        where: { userId }, orderBy: { paidAt: "asc" },
        select: { id: true, ebookId: true, amount: true, paidAt: true, expireAt: true, ebook: { select: { title: true } } },
      }),
      this.prisma.invoice.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, orderId: true, type: true, title: true, taxNo: true, amount: true, status: true, invoiceUrl: true, expressNo: true, createdAt: true },
      }),
    ]);
    return { orders, memberPurchases, ebookPurchases, invoices };
  }

  private async exportLearning(userId: string) {
    const [courseProgresses, classicProgresses, ebookProgresses, ebookReadingSessions] = await Promise.all([
      this.prisma.courseProgress.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, courseId: true, chapterId: true, progress: true, completed: true, createdAt: true, updatedAt: true, course: { select: { title: true } }, chapter: { select: { title: true } } },
      }),
      this.prisma.readingProgress.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, bookId: true, chapterId: true, progress: true, createdAt: true, updatedAt: true, book: { select: { title: true } }, chapter: { select: { title: true } } },
      }),
      this.prisma.ebookProgress.findMany({
        where: { userId }, orderBy: { updatedAt: "asc" },
        select: { id: true, ebookId: true, chapterId: true, progress: true, currentPage: true, completed: true, updatedAt: true, ebook: { select: { title: true } }, chapter: { select: { title: true } } },
      }),
      this.prisma.ebookReadingSession.findMany({
        where: { userId }, orderBy: { date: "asc" },
        select: { id: true, ebookId: true, duration: true, pages: true, date: true, createdAt: true, ebook: { select: { title: true } } },
      }),
    ]);
    return { courseProgresses, classicProgresses, ebookProgresses, ebookReadingSessions };
  }

  private async exportNotes(userId: string) {
    const [classicBookmarks, classicNotes, ebookBookmarks, ebookNotes] = await Promise.all([
      this.prisma.bookmark.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, bookId: true, chapterId: true, position: true, note: true, createdAt: true, book: { select: { title: true } }, chapter: { select: { title: true } } },
      }),
      this.prisma.classicReadingNote.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, bookId: true, chapterId: true, content: true, createdAt: true, updatedAt: true, book: { select: { title: true } }, chapter: { select: { title: true } } },
      }),
      this.prisma.ebookBookmark.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, ebookId: true, chapterId: true, page: true, note: true, createdAt: true, ebook: { select: { title: true } }, chapter: { select: { title: true } } },
      }),
      this.prisma.ebookNote.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, ebookId: true, chapterId: true, content: true, page: true, isPublic: true, createdAt: true, updatedAt: true, ebook: { select: { title: true } }, chapter: { select: { title: true } } },
      }),
    ]);
    return { classicBookmarks, classicNotes, ebookBookmarks, ebookNotes };
  }

  private async exportFollows(userId: string) {
    const [followedUsers, joinedCircles] = await Promise.all([
      this.prisma.follow.findMany({
        where: { userId }, orderBy: { createdAt: "asc" },
        select: { id: true, followedUserId: true, createdAt: true, followedUser: { select: { nickname: true, avatar: true } } },
      }),
      this.prisma.circleMember.findMany({
        where: { userId }, orderBy: { joinedAt: "asc" },
        select: { id: true, circleId: true, role: true, joinedAt: true, expireAt: true, circle: { select: { name: true } } },
      }),
    ]);
    return { followedUsers, joinedCircles };
  }

  private countRows(type: PersonalDataExportType, value: unknown): number {
    if (type === "profile") return value ? 1 : 0;
    if (!value || typeof value !== "object") return 0;
    return Object.values(value).reduce(
      (total, item) => total + (Array.isArray(item) ? item.length : 0),
      0,
    );
  }
}
