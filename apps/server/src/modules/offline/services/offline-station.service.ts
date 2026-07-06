import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { isUniqueConstraintError } from "../../../common/prisma-errors";
import { safePagination } from "../../../common/pagination";
import { OfflineSharedService } from "./offline-shared.service";

/**
 * 线下驿站-驿站域（从 offline.service 拆出·纯搬家不改逻辑）。
 * 职责：驿站 CRUD + 运营者识别 + 品牌主页聚合（驿-P1）+ 品牌资料更新 + 审核/开通赠运营商（佣-V2-P3）
 * + 用户端发现 + 研究院成员（平台管理视图）。
 * 依赖：共享叶子域（loadTeachers）·单向不循环。
 */
@Injectable()
export class OfflineStationService {
  constructor(
    private prisma: PrismaService,
    private shared: OfflineSharedService,
  ) {}

  // ───────── 线下驿站 ─────────

  async createStation(dto: { name: string; city: string; address: string; phone: string; cover?: string; depositAmount?: number }, userId: string) {
    return this.prisma.stationOffline.create({
      data: {
        name: dto.name, city: dto.city, address: dto.address,
        phone: dto.phone, cover: dto.cover, depositAmount: dto.depositAmount ?? 0,
        ownerUserId: userId,
      },
    });
  }

  async listStations(rawPage = 1, rawPageSize = 20, city?: string, status?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.StationOfflineWhereInput = {};
    if (city) where.city = city;
    if (status) where.status = status;

    const [stations, total] = await Promise.all([
      this.prisma.stationOffline.findMany({
        where,
        include: { owner: { select: { id: true, nickname: true } } },
        skip, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationOffline.count({ where }),
    ]);
    return { stations, total, page, pageSize };
  }

  async getStation(id: string) {
    const s = await this.prisma.stationOffline.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, nickname: true, avatar: true } },
        courses: { orderBy: { startTime: "asc" }, take: 10 },
        products: { where: { status: "ACTIVE" } },
        teacherBookings: { orderBy: { bookingDate: "desc" }, take: 10 },
      },
    });
    if (!s) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");

    // 驿站评分聚合（该驿站全部课程评价）；count=0 时不加 rating 字段（前端诚实降级）
    const agg = await this.prisma.offlineCourseReview.aggregate({
      where: { stationId: id },
      _avg: { rating: true },
      _count: true,
    });
    if (agg._count > 0) {
      return { ...s, rating: { avg: Math.round((agg._avg.rating ?? 0) * 10) / 10, count: agg._count } };
    }
    return s;
  }

  /** 运营者识别：当前用户拥有的驿站（B 端经营后台地基）。非驿站主返回 null */
  async getMyStation(userId: string) {
    return this.prisma.stationOffline.findUnique({
      where: { ownerUserId: userId },
      include: { _count: { select: { courses: true, products: true, teachers: true, teacherBookings: true } } },
    });
  }

  // ───────── 品牌主页（驿-P1·驿站对外"店面"） ─────────

  /**
   * 驿站品牌主页聚合（公开·无守卫）：
   * 基础信息+brandStory/photos + 讲师阵容（featuredTeacherIds→StationTeacher·签约讲师补 F1 认证徽章数据）
   * + 特色课程（近期已过审已发布）+ 学员评价聚合（课程评价按驿站维度·无评价诚实省略 rating/空 reviews）。
   * DISABLED 驿站不公开；PENDING 保留可见（驿站长审核前预览，纯展示信息无风险）。
   */
  async getStationHome(id: string) {
    const station = await this.prisma.stationOffline.findUnique({
      where: { id },
      select: {
        id: true, name: true, city: true, address: true, phone: true,
        cover: true, type: true, intro: true, businessHours: true,
        images: true, tags: true, facilities: true, status: true,
        brandStory: true, photos: true, featuredTeacherIds: true,
        owner: { select: { id: true, nickname: true, avatar: true } },
      },
    });
    if (!station || station.status === "DISABLED") {
      throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");
    }

    const now = new Date();
    const [featuredTeachers, courses, ratingAgg, recentReviews] = await Promise.all([
      this.loadFeaturedTeachers(id, station.featuredTeacherIds),
      // 特色课程表：近期未结束的已过审已发布课程（按开课时间升序）
      this.prisma.offlineCourse.findMany({
        where: { stationId: id, auditStatus: "APPROVED", status: "PUBLISHED", endTime: { gte: now } },
        include: { _count: { select: { registrations: true } } },
        orderBy: { startTime: "asc" },
        take: 6,
      }),
      this.prisma.offlineCourseReview.aggregate({ where: { stationId: id }, _avg: { rating: true }, _count: true }),
      this.prisma.offlineCourseReview.findMany({
        where: { stationId: id },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, rating: true, content: true, createdAt: true, userId: true, course: { select: { title: true } } },
      }),
    ]);

    // 课程补讲师名（复用 loadTeachers 批量范式）
    const teacherMap = await this.shared.loadTeachers(courses.map((c) => c.teacherId));

    // 评价补昵称头像（脱敏：仅昵称+avatar，照抄 listCourseReviews 范式）
    const reviewerIds = [...new Set(recentReviews.map((r) => r.userId))];
    const reviewers = reviewerIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, nickname: true, avatar: true } })
      : [];
    const reviewerMap = new Map(reviewers.map((u) => [u.id, u]));

    return {
      station: {
        id: station.id, name: station.name, city: station.city, address: station.address,
        phone: station.phone, cover: station.cover, type: station.type, intro: station.intro,
        businessHours: station.businessHours, images: station.images, tags: station.tags,
        facilities: station.facilities, status: station.status,
        brandStory: station.brandStory, photos: station.photos,
        owner: station.owner,
      },
      featuredTeachers,
      courses: courses.map((c) => ({ ...c, teacher: c.teacherId ? teacherMap.get(c.teacherId) || null : null })),
      // 无评价时省略 rating 字段（前端 v-if 诚实降级）
      ...(ratingAgg._count > 0
        ? { rating: { avg: Math.round((ratingAgg._avg.rating ?? 0) * 10) / 10, count: ratingAgg._count } }
        : {}),
      reviews: recentReviews.map((r) => {
        const u = reviewerMap.get(r.userId);
        return {
          id: r.id, rating: r.rating, content: r.content, createdAt: r.createdAt,
          courseTitle: r.course?.title || "",
          user: { nickname: u?.nickname || "学员", avatar: u?.avatar || null },
        };
      }),
    };
  }

  /**
   * 讲师阵容：featuredTeacherIds → StationTeacher（保持驿站长挑选顺序·仅本驿站在岗讲师）。
   * 未配置时回退本驿站全部在岗讲师（前 6 位）——主页"讲师阵容"区不留白。
   * 签约讲师（sourceUserId 非空）补 F1 认证徽章数据：TeacherCertification.verifiedTitle + 研究院会籍金标。
   */
  private async loadFeaturedTeachers(stationId: string, featuredIds: string[]) {
    const teachers = featuredIds.length
      ? await this.prisma.stationTeacher.findMany({
          where: { id: { in: featuredIds }, stationId, status: "ACTIVE" },
          select: { id: true, name: true, avatar: true, specialties: true, bio: true, sourceUserId: true },
        })
      : await this.prisma.stationTeacher.findMany({
          where: { stationId, status: "ACTIVE" },
          select: { id: true, name: true, avatar: true, specialties: true, bio: true, sourceUserId: true },
          orderBy: { createdAt: "asc" },
          take: 6,
        });
    // 按驿站长挑选顺序排序（回退场景 featuredIds 为空则维持查询顺序）
    const orderMap = new Map(featuredIds.map((tid, i) => [tid, i]));
    const sorted = featuredIds.length
      ? [...teachers].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
      : teachers;

    // 批量补认证徽章数据（仅签约讲师有平台 userId）
    const userIds = [...new Set(sorted.map((t) => t.sourceUserId).filter((x): x is string => !!x))];
    if (!userIds.length) return sorted.map((t) => ({ ...t, verifiedTitle: null as string | null }));
    const [certs, members] = await Promise.all([
      this.prisma.teacherCertification.findMany({
        where: { userId: { in: userIds }, status: "APPROVED" },
        select: { userId: true, verifiedTitle: true },
      }),
      // 研究院会籍（对齐 teacher.service.getPublicProfile：优先 SIGNED 金标语义）
      this.prisma.instituteMember.findMany({
        where: { userId: { in: userIds }, status: "ACTIVE" },
        orderBy: [{ lecturerLevel: "desc" }, { joinedAt: "asc" }],
        select: { userId: true, lecturerLevel: true },
      }),
    ]);
    const certMap = new Map(certs.map((c) => [c.userId, c.verifiedTitle]));
    const memberMap = new Map<string, string>();
    for (const m of members) if (!memberMap.has(m.userId)) memberMap.set(m.userId, m.lecturerLevel);

    return sorted.map((t) => {
      const level = t.sourceUserId ? memberMap.get(t.sourceUserId) : undefined;
      return {
        ...t,
        verifiedTitle: (t.sourceUserId && certMap.get(t.sourceUserId)) || null,
        ...(level ? { institute: { signed: level === "SIGNED", lecturerLevel: level } } : {}),
      };
    });
  }

  /** 驿站长更新品牌资料（brandStory/photos/featuredTeacherIds·仅本人驿站） */
  async updateStationBrand(userId: string, dto: { brandStory?: string; photos?: string[]; featuredTeacherIds?: string[] }) {
    const station = await this.prisma.stationOffline.findUnique({ where: { ownerUserId: userId }, select: { id: true } });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "您还不是驿站运营者");

    const data: Prisma.StationOfflineUpdateInput = {};
    if (dto.brandStory !== undefined) data.brandStory = dto.brandStory.trim() || null;
    if (dto.photos !== undefined) data.photos = dto.photos;
    if (dto.featuredTeacherIds !== undefined) {
      // 只收本驿站在岗讲师 id（防挂他站讲师·保持提交顺序）
      const valid = await this.prisma.stationTeacher.findMany({
        where: { id: { in: dto.featuredTeacherIds }, stationId: station.id, status: "ACTIVE" },
        select: { id: true },
      });
      const validSet = new Set(valid.map((t) => t.id));
      data.featuredTeacherIds = dto.featuredTeacherIds.filter((tid) => validSet.has(tid));
    }
    return this.prisma.stationOffline.update({
      where: { id: station.id },
      data,
      select: { id: true, brandStory: true, photos: true, featuredTeacherIds: true },
    });
  }

  async auditStation(id: string, status: string) {
    const existing = await this.prisma.stationOffline.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");
    const updated = await this.prisma.stationOffline.update({ where: { id }, data: { status } });
    // 佣-V2-P3（拍板规则3）：驿站开通(ACTIVE)时系统赠送"高级线下运营商"。幂等·失败不阻塞审核（仅注明）。
    if (status === "ACTIVE") {
      const operatorGrant = await this.grantOfflineOperator(updated.id, updated.ownerUserId, updated.operatorId ?? null)
        .catch((e) => ({ granted: false, reason: `赠送线下运营商失败（不影响驿站开通）：${(e as Error)?.message || String(e)}` }));
      return { ...updated, operatorGrant };
    }
    return updated;
  }

  /**
   * 佣-V2-P3（拍板规则3）：驿站开通时幂等赠送"高级线下运营商"并回链 StationOffline.operatorId。
   * - 已回链 operatorId → 直接跳过（重复激活幂等）；
   * - 驿站主无 Operator 行 → 创建 channelType=OFFLINE（level=BLACK_GOLD：旧等级率 20% 与 OFFLINE
   *   默认管理奖 20% 口径一致，等级已废止为展示/历史口径·mgmtRate 留空=按渠道默认 20%）并回链；
   * - 已是 OFFLINE 运营商 → 不重复建，仅补回链；
   * - 已是 ONLINE 运营商 → 保持不动（不自动覆盖线上身份·避免影响其名下分站管理奖口径），返回值注明。
   */
  private async grantOfflineOperator(stationId: string, ownerUserId: string, linkedOperatorId: string | null) {
    if (linkedOperatorId) {
      return { granted: false, operatorId: linkedOperatorId, reason: "已赠送过线下运营商（operatorId 已回链），跳过" };
    }
    let operator = await this.prisma.operator.findUnique({
      where: { userId: ownerUserId },
      select: { id: true, channelType: true },
    });
    const created = !operator;
    if (!operator) {
      try {
        operator = await this.prisma.operator.create({
          data: { userId: ownerUserId, level: "BLACK_GOLD", channelType: "OFFLINE", status: "ACTIVE" },
          select: { id: true, channelType: true },
        });
      } catch (e) {
        if (!isUniqueConstraintError(e)) throw e;
        // 并发重复激活：另一请求已建 → 复查复用（幂等）
        operator = await this.prisma.operator.findUnique({
          where: { userId: ownerUserId },
          select: { id: true, channelType: true },
        });
        if (!operator) throw e;
      }
    }
    if (operator.channelType === "ONLINE") {
      return {
        granted: false,
        operatorId: operator.id,
        reason: "驿站主已是线上运营商（channelType=ONLINE），保持线上身份不自动转线下·未回链（冲突需人工处理）",
      };
    }
    await this.prisma.stationOffline.update({ where: { id: stationId }, data: { operatorId: operator.id } });
    return created
      ? { granted: true, operatorId: operator.id }
      : { granted: false, operatorId: operator.id, reason: "驿站主已是线下运营商，不重复创建·仅补回链" };
  }

  // ───────── 驿站发现（用户端） ─────────

  async discoverStations(params: { city?: string; keyword?: string; page?: number; pageSize?: number }) {
    const { city, keyword } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
    const where: Prisma.StationOfflineWhereInput = { status: "ACTIVE" };
    if (city) where.city = city;
    if (keyword) where.name = { contains: keyword };

    const [stations, total] = await Promise.all([
      this.prisma.stationOffline.findMany({
        where,
        select: {
          id: true, name: true, city: true, address: true,
          cover: true, phone: true, type: true, intro: true,
          businessHours: true, images: true, tags: true, facilities: true, status: true,
          _count: { select: { courses: true, products: true } },
        },
        skip, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationOffline.count({ where }),
    ]);
    return { stations, total, page, pageSize };
  }

  // ───────── 研究院（平台管理视图） ─────────

  async listMembers(rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const [members, total] = await Promise.all([
      this.prisma.instituteMember.findMany({
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip, take: pageSize,
        orderBy: { joinedAt: "desc" },
      }),
      this.prisma.instituteMember.count(),
    ]);
    return { members, total, page, pageSize };
  }

  async updateMember(id: string, dto: { role?: string; status?: string }) {
    const existing = await this.prisma.instituteMember.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "书院成员不存在");
    return this.prisma.instituteMember.update({ where: { id }, data: dto as Prisma.InstituteMemberUpdateInput });
  }
}
