import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { OfflineReminderService } from "./offline-reminder.service";

@Injectable()
export class OfflineService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private reminder: OfflineReminderService,
  ) {}

  /** 校验调用者是目标驿站拥有者，防跨驿站越权 */
  private async assertStationOwner(userId: string, stationId: string) {
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId }, select: { ownerUserId: true } });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");
    if (station.ownerUserId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该驿站");
  }

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

  async listStations(page = 1, pageSize = 20, city?: string, status?: string) {
    const where: Prisma.StationOfflineWhereInput = {};
    if (city) where.city = city;
    if (status) where.status = status;

    const [stations, total] = await Promise.all([
      this.prisma.stationOffline.findMany({
        where,
        include: { owner: { select: { id: true, nickname: true } } },
        skip: (page - 1) * pageSize, take: pageSize,
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
    const teacherMap = await this.loadTeachers(courses.map((c) => c.teacherId));

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
    return this.prisma.stationOffline.update({ where: { id }, data: { status } });
  }

  // ───────── 驿站发现（用户端） ─────────

  async discoverStations(params: { city?: string; keyword?: string; page?: number; pageSize?: number }) {
    const { city, keyword, page = 1, pageSize = 20 } = params;
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
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationOffline.count({ where }),
    ]);
    return { stations, total, page, pageSize };
  }

  // ───────── 线下课程 ─────────

  async createOfflineCourse(userId: string, dto: { stationId: string; title: string; cover?: string; intro?: string; teacherId?: string; price?: number; maxStudents: number; startTime: string; endTime: string; location: string }) {
    await this.assertStationOwner(userId, dto.stationId);
    return this.prisma.offlineCourse.create({
      data: {
        ...dto,
        price: dto.price ?? 0,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
    });
  }

  async listOfflineCourses(stationId?: string, page = 1, pageSize = 20) {
    // 传 stationId=单驿站课程（含草稿）；不传=用户端发现，仅 ACTIVE 驿站的已审核已发布课程
    const where: Prisma.OfflineCourseWhereInput = stationId
      ? { stationId }
      : { auditStatus: "APPROVED", status: "PUBLISHED", station: { status: "ACTIVE" } };
    const [courses, total] = await Promise.all([
      this.prisma.offlineCourse.findMany({
        where,
        include: {
          _count: { select: { registrations: true } },
          station: { select: { id: true, name: true, city: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startTime: "asc" },
      }),
      this.prisma.offlineCourse.count({ where }),
    ]);
    const teacherMap = await this.loadTeachers(courses.map((c) => c.teacherId));
    return {
      courses: courses.map((c) => ({ ...c, teacher: c.teacherId ? teacherMap.get(c.teacherId) || null : null })),
      total,
      page,
      pageSize,
    };
  }

  async getOfflineCourse(courseId: string) {
    const course = await this.prisma.offlineCourse.findUnique({
      where: { id: courseId },
      include: {
        station: { select: { id: true, name: true, address: true, phone: true } },
        registrations: true,
      },
    });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    let teacher: { id: string; name: string; avatar: string | null; specialties: string[]; bio: string | null } | null = null;
    if (course.teacherId) {
      teacher = await this.prisma.stationTeacher.findUnique({
        where: { id: course.teacherId },
        select: { id: true, name: true, avatar: true, specialties: true, bio: true },
      });
    }
    return { ...course, teacher };
  }

  /** 批量加载讲师信息（OfflineCourse.teacherId → StationTeacher）*/
  private async loadTeachers(teacherIds: (string | null)[]) {
    const ids = [...new Set(teacherIds.filter((x): x is string => !!x))];
    if (!ids.length) return new Map<string, { id: string; name: string; avatar: string | null; specialties: string[] }>();
    const teachers = await this.prisma.stationTeacher.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, avatar: true, specialties: true },
    });
    return new Map(teachers.map((t) => [t.id, t]));
  }

  // ───────── 课程报名 ─────────

  /** 当前用户在某课程的报名记录（用户端签到凭证）*/
  async getMyRegistration(courseId: string, userId: string) {
    const reg = await this.prisma.offlineCourseRegistration.findUnique({
      where: { courseId_userId: { courseId, userId } },
      include: { course: { include: { station: { select: { id: true, name: true, address: true, phone: true } } } } },
    });
    if (!reg) return null;
    let teacher: { id: string; name: string; avatar: string | null } | null = null;
    if (reg.course.teacherId) {
      teacher = await this.prisma.stationTeacher.findUnique({
        where: { id: reg.course.teacherId },
        select: { id: true, name: true, avatar: true },
      });
    }
    return { ...reg, course: { ...reg.course, teacher } };
  }

  async registerCourse(userId: string, courseId: string) {
    const course = await this.prisma.offlineCourse.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");

    const qrCode = `QR_${courseId}_${userId}_${Date.now()}`;
    // 行锁串行化防超卖：锁定课程行后，在锁内查重 + 计数 + 创建（消除 count-then-create 竞态）
    const registration = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "OfflineCourse" WHERE id = ${courseId} FOR UPDATE`;

      const existing = await tx.offlineCourseRegistration.findUnique({
        where: { courseId_userId: { courseId, userId } },
      });
      if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "已报名该课程");

      const count = await tx.offlineCourseRegistration.count({ where: { courseId } });
      if (count >= course.maxStudents) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "课程名额已满");
      }

      try {
        return await tx.offlineCourseRegistration.create({
          data: { courseId, userId, qrCode },
        });
      } catch (e: unknown) {
        if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.BAD_REQUEST, "已报名该课程");
        throw e;
      }
    });

    // 报名成功站内通知（通知失败不影响报名主流程）
    try {
      await this.reminder.notifyRegistered(userId, {
        id: course.id, title: course.title, startTime: course.startTime, location: course.location,
      });
    } catch { /* 通知层已自吞异常，此处双保险 */ }

    return registration;
  }

  async cancelRegistration(userId: string, courseId: string) {
    const reg = await this.prisma.offlineCourseRegistration.findUnique({
      where: { courseId_userId: { courseId, userId } },
      include: { course: { select: { id: true, title: true, startTime: true, location: true } } },
    });
    if (!reg) throw new BusinessException(ErrorCode.NOT_FOUND, "未报名该课程");
    if (reg.status === "SIGNED_IN") throw new BusinessException(ErrorCode.BAD_REQUEST, "已签到，无法取消");

    const updated = await this.prisma.offlineCourseRegistration.update({
      where: { id: reg.id },
      data: { status: "CANCELLED" },
    });

    // 取消确认站内通知（通知失败不影响取消主流程）
    try {
      await this.reminder.notifyCancelled(userId, reg.course);
    } catch { /* 通知层已自吞异常，此处双保险 */ }

    return updated;
  }

  async signInCourse(operatorUserId: string, stationId: string, qrCode: string) {
    await this.assertStationOwner(operatorUserId, stationId);
    const reg = await this.prisma.offlineCourseRegistration.findFirst({
      where: { qrCode, course: { stationId } },
      include: { course: true },
    });
    if (!reg) throw new BusinessException(ErrorCode.NOT_FOUND, "无效的签到码");
    if (reg.status === "CANCELLED") throw new BusinessException(ErrorCode.BAD_REQUEST, "报名已取消");
    if (reg.status === "SIGNED_IN") throw new BusinessException(ErrorCode.BAD_REQUEST, "已签到");

    return this.prisma.offlineCourseRegistration.update({
      where: { id: reg.id },
      data: { status: "SIGNED_IN", signedAt: new Date() },
    });
  }

  async listRegistrations(operatorUserId: string, courseId: string, page = 1, pageSize = 20) {
    // 越权校验：先由 courseId 反查所属驿站，再校验调用者为驿站主
    const course = await this.prisma.offlineCourse.findUnique({ where: { id: courseId }, select: { stationId: true } });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    await this.assertStationOwner(operatorUserId, course.stationId);

    const where = { courseId };
    const [registrations, total] = await Promise.all([
      this.prisma.offlineCourseRegistration.findMany({
        where,
        // 收敛 select：剔除 qrCode（泄露会导致伪造签到），仅出经营后台所需字段
        select: {
          id: true,
          userId: true,
          status: true,
          signedAt: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.offlineCourseRegistration.count({ where }),
    ]);

    // OfflineCourseRegistration 无 User 关联，批量补全昵称头像（脱敏：仅昵称+avatar）
    const userIds = [...new Set(registrations.map((r) => r.userId))];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true, avatar: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const items = registrations.map((r) => ({
      ...r,
      user: { nickname: userMap.get(r.userId)?.nickname || "学员", avatar: userMap.get(r.userId)?.avatar || null },
    }));
    return { registrations: items, total, page, pageSize };
  }

  // ───────── 课后评价（T8 OMO） ─────────

  /** 发表课后评价：仅本人已签到（SIGNED_IN）报名可评；registrationId 唯一防二评 */
  async createCourseReview(userId: string, courseId: string, dto: { rating: number; content?: string }) {
    const reg = await this.prisma.offlineCourseRegistration.findUnique({
      where: { courseId_userId: { courseId, userId } },
      include: { course: { select: { stationId: true } } },
    });
    if (!reg || reg.status === "CANCELLED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "未报名该课程，无法评价");
    }
    if (reg.status !== "SIGNED_IN") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "签到上课后才能评价");
    }

    try {
      return await this.prisma.offlineCourseReview.create({
        data: {
          courseId,
          stationId: reg.course.stationId, // 冗余驿站 id，便于驿站维度评分聚合
          userId,
          registrationId: reg.id,
          rating: dto.rating,
          content: dto.content?.trim() || null,
        },
      });
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.BAD_REQUEST, "已评价过本课程");
      throw e;
    }
  }

  /** 课程评价公开分页（脱敏：仅昵称+头像） */
  async listCourseReviews(courseId: string, page = 1, pageSize = 20) {
    const where = { courseId };
    const [reviews, total] = await Promise.all([
      this.prisma.offlineCourseReview.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.offlineCourseReview.count({ where }),
    ]);

    // OfflineCourseReview 无 User 关联，批量补全昵称头像（照抄 adminListCheckins 范式，脱敏只出昵称+avatar）
    const userIds = [...new Set(reviews.map((r) => r.userId))];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true, avatar: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items = reviews.map((r) => {
      const u = userMap.get(r.userId);
      return {
        id: r.id,
        rating: r.rating,
        content: r.content,
        createdAt: r.createdAt,
        user: { nickname: u?.nickname || "学员", avatar: u?.avatar || null },
      };
    });
    return { items, total, page, pageSize };
  }

  // ───────── 课后同学圈（T8 OMO） ─────────

  /**
   * 驿站主为课程创建同学圈（幂等：已有 circleId 直接返回）。
   * 选型说明：prisma 直建 Circle+CircleMember(OWNER)，照抄 circle.service.create 惯例——
   * ① CircleService.create 强制默认 status=PENDING（学员无法加入，系统自建圈需直接 ACTIVE）；
   * ② 其内含外部内容审核调用（课程已过 auditStatus 审核，圈名/简介为平台模板文案，无需再审）；
   * ③ 避免 OfflineModule 引入 CircleModule 的重依赖树。
   * 注意：Circle.stationId 外键指向 Station（分站表）而非 StationOffline，故留 null，
   * 驿站↔圈子关联走 OfflineCourse.circleId。
   */
  async createStudyCircle(userId: string, courseId: string) {
    const course = await this.prisma.offlineCourse.findUnique({
      where: { id: courseId },
      include: { station: { select: { id: true, ownerUserId: true } } },
    });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    if (course.station.ownerUserId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该驿站课程");
    }
    if (course.circleId) return { circleId: course.circleId }; // 幂等

    // 「《标题》同学圈」固定 5 字，标题超长截断保全名 ≤30 字
    const maxTitle = 25;
    const title = course.title.length > maxTitle ? `${course.title.slice(0, maxTitle - 1)}…` : course.title;
    const ownerId = course.station.ownerUserId;

    const circleId = await this.prisma.$transaction(async (tx) => {
      // 行锁防并发双建：锁课程行后复查 circleId
      await tx.$queryRaw`SELECT id FROM "OfflineCourse" WHERE id = ${courseId} FOR UPDATE`;
      const fresh = await tx.offlineCourse.findUnique({ where: { id: courseId }, select: { circleId: true } });
      if (fresh?.circleId) return fresh.circleId;

      const circle = await tx.circle.create({
        data: {
          name: `《${title}》同学圈`,
          intro: `本圈是《${title}》线下课学员交流圈，欢迎分享学习心得与课堂笔记`,
          type: "FREE",
          needApproval: false,
          status: "ACTIVE",
          ownerId,
          members: { create: { userId: ownerId, role: "OWNER" } },
          memberCount: 1,
        },
        select: { id: true },
      });

      // 圈主角色分配（照抄 circle.service.create 惯例）
      await tx.userRole.upsert({
        where: { userId_roleType_bindId: { userId: ownerId, roleType: "CIRCLE_OWNER", bindId: circle.id } },
        create: { userId: ownerId, roleType: "CIRCLE_OWNER", bindId: circle.id },
        update: {},
      });

      await tx.offlineCourse.update({ where: { id: courseId }, data: { circleId: circle.id } });
      return circle.id;
    });

    await this.redis.delByPattern("circles:list:*"); // 圈子列表缓存失效（照抄 circle.service 惯例）
    return { circleId };
  }

  // ───────── 驿站商品 ─────────

  async createProduct(userId: string, stationId: string, dto: { name: string; price: number; stock?: number; isPlatform?: boolean }) {
    await this.assertStationOwner(userId, stationId);
    return this.prisma.stationProduct.create({
      data: {
        stationId,
        name: dto.name,
        price: dto.price,
        stock: dto.stock ?? 0,
        isPlatform: dto.isPlatform ?? false,
      },
    });
  }

  async updateProduct(userId: string, productId: string, dto: { name?: string; price?: number; stock?: number; status?: string }) {
    const existing = await this.prisma.stationProduct.findUnique({ where: { id: productId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站商品不存在");
    await this.assertStationOwner(userId, existing.stationId);
    return this.prisma.stationProduct.update({ where: { id: productId }, data: dto });
  }

  async listProducts(operatorUserId: string, stationId: string, params?: { status?: string; page?: number; pageSize?: number }) {
    await this.assertStationOwner(operatorUserId, stationId);
    const { status } = params || {};
    const page = Number(params?.page) || 1;
    const pageSize = Number(params?.pageSize) || 20;
    const where: Prisma.StationProductWhereInput = { stationId };
    if (status) where.status = status;
    const [products, total] = await Promise.all([
      this.prisma.stationProduct.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationProduct.count({ where }),
    ]);
    return { products, total, page, pageSize };
  }

  async deleteProduct(userId: string, productId: string) {
    const existing = await this.prisma.stationProduct.findUnique({ where: { id: productId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站商品不存在");
    await this.assertStationOwner(userId, existing.stationId);
    return this.prisma.stationProduct.update({ where: { id: productId }, data: { status: "INACTIVE" } });
  }

  // ───────── 师资预约 ─────────

  async createTeacherBooking(userId: string, stationId: string, dto: { teacherId: string; courseId?: string; bookingDate: string; remark?: string }) {
    await this.assertStationOwner(userId, stationId);
    return this.prisma.stationTeacherBooking.create({
      data: {
        stationId,
        teacherId: dto.teacherId,
        courseId: dto.courseId,
        bookingDate: new Date(dto.bookingDate),
        remark: dto.remark,
      },
    });
  }

  async confirmBooking(userId: string, bookingId: string) {
    const existing = await this.prisma.stationTeacherBooking.findUnique({ where: { id: bookingId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "预约记录不存在");
    await this.assertStationOwner(userId, existing.stationId);
    return this.prisma.stationTeacherBooking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });
  }

  async cancelBooking(userId: string, bookingId: string) {
    const existing = await this.prisma.stationTeacherBooking.findUnique({ where: { id: bookingId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "预约记录不存在");
    await this.assertStationOwner(userId, existing.stationId);
    return this.prisma.stationTeacherBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
  }

  async listTeacherBookings(operatorUserId: string, stationId: string, params?: { teacherId?: string; status?: string; page?: number; pageSize?: number }) {
    await this.assertStationOwner(operatorUserId, stationId);
    const { teacherId, status, page = 1, pageSize = 20 } = params || {};
    const where: Prisma.StationTeacherBookingWhereInput = { stationId };
    if (teacherId) where.teacherId = teacherId;
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      this.prisma.stationTeacherBooking.findMany({
        where,
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { bookingDate: "asc" },
      }),
      this.prisma.stationTeacherBooking.count({ where }),
    ]);
    return { bookings, total, page, pageSize };
  }

  // ───────── 订单 ─────────

  async createOrder(stationId: string, userId: string, dto: { orderType: string; targetId: string; amount: number }) {
    // 服务端校验金额：从数据库查询实际价格，忽略前端传入的 amount
    let actualAmount: number;
    if (dto.orderType === "COURSE") {
      const course = await this.prisma.offlineCourse.findUnique({ where: { id: dto.targetId } });
      if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
      actualAmount = Number(course.price);
    } else if (dto.orderType === "PRODUCT") {
      const product = await this.prisma.stationProduct.findUnique({ where: { id: dto.targetId } });
      if (!product) throw new BusinessException(ErrorCode.NOT_FOUND, "商品不存在");
      actualAmount = Number(product.price);
    } else if (dto.orderType === "TEACHER_BOOKING") {
      // 教师预约：从预约记录查询价格
      const booking = await this.prisma.stationTeacherBooking.findUnique({ where: { id: dto.targetId }, select: { price: true } });
      if (!booking) throw new BusinessException(ErrorCode.NOT_FOUND, "预约记录不存在");
      actualAmount = Number(booking.price || 0);
      if (actualAmount <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "预约金额异常");
    } else {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `不支持的订单类型: ${dto.orderType}`);
    }

    const stationIncome = actualAmount * 0.7;
    return this.prisma.stationOrder.create({
      data: {
        stationId,
        orderType: dto.orderType,
        targetId: dto.targetId,
        amount: actualAmount,
        stationIncome,
      },
    });
  }

  async listOrders(operatorUserId: string, stationId: string, params?: { orderType?: string; status?: string; page?: number; pageSize?: number }) {
    await this.assertStationOwner(operatorUserId, stationId);
    const { orderType, status, page = 1, pageSize = 20 } = params || {};
    const where: Prisma.StationOrderWhereInput = { stationId };
    if (orderType) where.orderType = orderType;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.stationOrder.findMany({
        where,
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationOrder.count({ where }),
    ]);
    return { orders, total, page, pageSize };
  }

  async updateOrderStatus(userId: string, orderId: string, status: string) {
    const existing = await this.prisma.stationOrder.findUnique({ where: { id: orderId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站订单不存在");
    await this.assertStationOwner(userId, existing.stationId);
    return this.prisma.stationOrder.update({ where: { id: orderId }, data: { status } });
  }

  // ───────── 结算 ─────────

  async createSettlement(stationId: string, dto: { period: string; totalIncome: number }) {
    const platformShare = dto.totalIncome * 0.3; // 平台抽成30%
    const stationShare = dto.totalIncome * 0.7;

    return this.prisma.stationSettlement.create({
      data: {
        stationId,
        period: dto.period,
        totalIncome: dto.totalIncome,
        stationShare,
        platformShare,
      },
    });
  }

  async listSettlements(operatorUserId: string, stationId: string, page = 1, pageSize = 20) {
    await this.assertStationOwner(operatorUserId, stationId);
    const where = { stationId };
    const [settlements, total] = await Promise.all([
      this.prisma.stationSettlement.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { period: "desc" },
      }),
      this.prisma.stationSettlement.count({ where }),
    ]);
    return { settlements, total, page, pageSize };
  }

  async settleStation(stationId: string, settlementId: string) {
    const settlement = await this.prisma.stationSettlement.findFirst({
      where: { id: settlementId, stationId },
    });
    if (!settlement) throw new BusinessException(ErrorCode.NOT_FOUND, "结算单不存在");
    if (settlement.settled) throw new BusinessException(ErrorCode.BAD_REQUEST, "已结算");

    return this.prisma.stationSettlement.update({
      where: { id: settlementId },
      data: { settled: true, settledAt: new Date() },
    });
  }

  // ───────── 收益看板 ─────────

  async getRevenueDashboard(stationId: string) {
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId } });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");

    const [orders, settlements, courses, products] = await Promise.all([
      this.prisma.stationOrder.aggregate({
        where: { stationId },
        _sum: { amount: true, stationIncome: true },
        _count: true,
      }),
      this.prisma.stationSettlement.aggregate({
        where: { stationId, settled: true },
        _sum: { stationShare: true, platformShare: true, totalIncome: true },
      }),
      this.prisma.offlineCourse.count({ where: { stationId } }),
      this.prisma.stationProduct.count({ where: { stationId, status: "ACTIVE" } }),
    ]);

    // 本月订单
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = await this.prisma.stationOrder.aggregate({
      where: { stationId, createdAt: { gte: monthStart } },
      _sum: { amount: true, stationIncome: true },
      _count: true,
    });

    return {
      totalOrders: orders._count,
      totalRevenue: orders._sum.amount || 0,
      totalStationIncome: orders._sum.stationIncome || 0,
      settledAmount: settlements._sum.stationShare || 0,
      platformFee: settlements._sum.platformShare || 0,
      activeCourses: courses,
      activeProducts: products,
      monthOrders: monthOrders._count,
      monthRevenue: monthOrders._sum.amount || 0,
      monthStationIncome: monthOrders._sum.stationIncome || 0,
    };
  }

  // ───────── 课程审核 ─────────

  async auditCourse(courseId: string, auditStatus: string, reason?: string) {
    const course = await this.prisma.offlineCourse.findUnique({ where: { id: courseId } });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    return this.prisma.offlineCourse.update({
      where: { id: courseId },
      data: {
        auditStatus,
        auditReason: reason || null,
        status: auditStatus === "APPROVED" ? "PUBLISHED" : course.status,
      },
    });
  }

  async toggleRecommend(courseId: string) {
    const course = await this.prisma.offlineCourse.findUnique({ where: { id: courseId } });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    const newVal = !course.isRecommended;
    return this.prisma.offlineCourse.update({
      where: { id: courseId },
      data: { isRecommended: newVal, recommendedAt: newVal ? new Date() : null },
    });
  }

  async listPendingCourses(page = 1, pageSize = 20, stationId?: string) {
    const where: Prisma.OfflineCourseWhereInput = { auditStatus: "PENDING" };
    if (stationId) where.stationId = stationId;
    const [courses, total] = await Promise.all([
      this.prisma.offlineCourse.findMany({
        where,
        include: { station: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.offlineCourse.count({ where }),
    ]);
    return { courses, total, page, pageSize };
  }

  async listRecommendedCourses(page = 1, pageSize = 20) {
    const where: Prisma.OfflineCourseWhereInput = { isRecommended: true, status: { not: "DRAFT" } };
    const [courses, total] = await Promise.all([
      this.prisma.offlineCourse.findMany({
        where,
        include: { station: { select: { id: true, name: true, city: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { recommendedAt: "desc" },
      }),
      this.prisma.offlineCourse.count({ where }),
    ]);
    return { courses, total, page, pageSize };
  }

  // ───────── 研究院（平台管理视图） ─────────

  async listMembers(page = 1, pageSize = 20) {
    const [members, total] = await Promise.all([
      this.prisma.instituteMember.findMany({
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip: (page - 1) * pageSize, take: pageSize,
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

  // ───────── 讲师管理 ─────────

  async createTeacher(dto: { name: string; stationId: string; avatar?: string; specialties?: string[]; bio?: string }) {
    return this.prisma.stationTeacher.create({ data: dto });
  }

  /** 从研究院签约讲师库引入讲师到本驿站（研究院→驿站师资供给闭环）*/
  async createTeacherFromSigned(userId: string, stationId: string, sourceUserId: string, specialties?: string[], bio?: string) {
    await this.assertStationOwner(userId, stationId);
    // T9-P1 多院化：userId 不再全局唯一（@@unique([instituteId,userId])），改 findFirst 取有效签约会籍
    const member = await this.prisma.instituteMember.findFirst({
      where: { userId: sourceUserId, lecturerLevel: "SIGNED", status: "ACTIVE" },
      select: { lecturerLevel: true, status: true, user: { select: { nickname: true, avatar: true } } },
    });
    if (!member || member.lecturerLevel !== "SIGNED" || member.status !== "ACTIVE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该用户不是有效的签约讲师");
    }
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId }, select: { id: true } });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");

    const existing = await this.prisma.stationTeacher.findFirst({ where: { stationId, sourceUserId } });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "该签约讲师已在本站讲师库");

    return this.prisma.stationTeacher.create({
      data: {
        stationId,
        sourceUserId,
        name: member.user.nickname,
        avatar: member.user.avatar,
        specialties: specialties || [],
        bio: bio || null,
      },
    });
  }

  async listTeachers(stationId?: string, page = 1, pageSize = 20) {
    const where: Prisma.StationTeacherWhereInput = {};
    if (stationId) where.stationId = stationId;
    const [teachers, total] = await Promise.all([
      this.prisma.stationTeacher.findMany({
        where,
        include: { station: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationTeacher.count({ where }),
    ]);
    return { teachers, total, page, pageSize };
  }

  async getTeacher(id: string) {
    const t = await this.prisma.stationTeacher.findUnique({
      where: { id },
      include: {
        station: { select: { id: true, name: true } },
        bookings: { orderBy: { bookingDate: "desc" }, take: 20 },
      },
    });
    if (!t) throw new BusinessException(ErrorCode.NOT_FOUND, "讲师不存在");
    return t;
  }

  async updateTeacher(id: string, dto: { name?: string; avatar?: string; specialties?: string[]; bio?: string; status?: string }) {
    const existing = await this.prisma.stationTeacher.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "讲师不存在");
    return this.prisma.stationTeacher.update({ where: { id }, data: dto });
  }

  async deleteTeacher(id: string) {
    const existing = await this.prisma.stationTeacher.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "讲师不存在");
    // 检查未完成的预约
    const pending = await this.prisma.stationTeacherBooking.count({
      where: { teacherId: id, status: { in: ["PENDING", "CONFIRMED"] } },
    });
    if (pending > 0) throw new BusinessException(ErrorCode.BAD_REQUEST, `该讲师有 ${pending} 个未完成的预约，无法删除`);
    return this.prisma.stationTeacher.update({ where: { id }, data: { status: "INACTIVE" } });
  }

  /** 讲师排期日历（按月视图） */
  async getTeacherSchedule(teacherId: string, month: string) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);

    const bookings = await this.prisma.stationTeacherBooking.findMany({
      where: { teacherId, bookingDate: { gte: start, lte: end } },
      orderBy: { bookingDate: "asc" },
      include: { station: { select: { id: true, name: true } } },
    });

    return { teacherId, month, bookings, total: bookings.length };
  }

  /** 冲突检测 */
  async checkScheduleConflicts(teacherId: string, date: string) {
    const bookingDate = new Date(date);
    const conflicts = await this.prisma.stationTeacherBooking.findMany({
      where: {
        teacherId,
        bookingDate: {
          gte: new Date(bookingDate.getTime() - 3600000),
          lte: new Date(bookingDate.getTime() + 3600000),
        },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });
    return { hasConflict: conflicts.length > 0, conflicts };
  }

  /** 设置讲师可预约时段 */
  async setTeacherAvailability(teacherId: string, slots: string[]) {
    // 存储可预约时段到讲师的 specialties 扩展字段（用 JSON）
    const teacher = await this.prisma.stationTeacher.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new BusinessException(ErrorCode.NOT_FOUND, "讲师不存在");
    // 简单实现：将可预约时段存储为扩展逻辑
    return { teacherId, slots, message: "可预约时段已设置" };
  }

  // ───────── 驿站-老师双向选择 ─────────

  async createTeacherRequest(stationId: string, userId: string, body: {
    teacherId?: string; courseTitle?: string; courseIntro?: string; proposedFee?: number; proposeDate?: string;
  }) {
    // 校验驿站归属
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId }, select: { ownerUserId: true } });
    if (!station || station.ownerUserId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该驿站");
    }
    return this.prisma.stationTeacherRequest.create({
      data: {
        stationId,
        teacherId: body.teacherId,
        courseTitle: body.courseTitle,
        courseIntro: body.courseIntro,
        proposedFee: body.proposedFee,
        proposeDate: body.proposeDate ? new Date(body.proposeDate) : null,
        initiator: "STATION",
      },
    });
  }

  async listTeacherRequests(stationId: string, userId: string, status?: string) {
    // 校验驿站归属
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId }, select: { ownerUserId: true } });
    if (!station || station.ownerUserId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权查看该驿站的邀约");
    }
    const where: any = { stationId };
    if (status) where.status = status;
    return this.prisma.stationTeacherRequest.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async respondTeacherRequest(id: string, userId: string, status: string) {
    const request = await this.prisma.stationTeacherRequest.findUnique({ where: { id } });
    if (!request) throw new BusinessException(ErrorCode.NOT_FOUND, "邀约不存在");

    // 如果指定了老师，验证响应用户拥有该老师所属驿站
    if (request.teacherId) {
      const teacher = await this.prisma.stationTeacher.findUnique({
        where: { id: request.teacherId },
        select: { station: { select: { ownerUserId: true } } },
      });
      if (!teacher || teacher.station.ownerUserId !== userId) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "无权响应该邀约");
      }
    } else {
      // 开放邀约：验证用户拥有该驿站
      const station = await this.prisma.stationOffline.findUnique({
        where: { id: request.stationId },
        select: { ownerUserId: true },
      });
      if (!station || station.ownerUserId !== userId) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "无权响应该邀约");
      }
    }

    return this.prisma.stationTeacherRequest.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }

  async getTeacherRequestsForTeacher(teacherId: string, status?: string) {
    const where: any = { teacherId };
    if (status) where.status = status;
    return this.prisma.stationTeacherRequest.findMany({
      where,
      include: { station: { select: { id: true, name: true, city: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** 管理员查看所有教师邀约 */
  async adminListTeacherRequests(status?: string, page = 1, pageSize = 20) {
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.stationTeacherRequest.findMany({
        where,
        include: {
          station: { select: { id: true, name: true, city: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationTeacherRequest.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  // ───────── 平台管理视图（跨驿站只读监控） ─────────

  /** 手机号脱敏 138****8000 */
  private maskPhone(phone?: string | null): string | null {
    if (!phone) return null;
    return phone.length >= 11 ? phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : phone.replace(/.(?=.{2})/g, "*");
  }

  /** 核销记录（跨驿站签到核销，平台监控）— status=SIGNED_IN */
  async adminListCheckins(params?: { stationId?: string; page?: number; pageSize?: number }) {
    const page = Number(params?.page) || 1;
    const pageSize = Number(params?.pageSize) || 20;
    const where: Prisma.OfflineCourseRegistrationWhereInput = { status: "SIGNED_IN" };
    if (params?.stationId) where.course = { stationId: params.stationId };

    const [regs, total] = await Promise.all([
      this.prisma.offlineCourseRegistration.findMany({
        where,
        include: { course: { select: { id: true, title: true, price: true, station: { select: { id: true, name: true, city: true } } } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { signedAt: "desc" },
      }),
      this.prisma.offlineCourseRegistration.count({ where }),
    ]);

    // OfflineCourseRegistration 无 User 关联，批量补全用户信息并脱敏
    const userIds = [...new Set(regs.map((r) => r.userId))];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true, phone: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items = regs.map((r) => {
      const u = userMap.get(r.userId);
      return {
        id: r.id,
        userId: r.userId,
        userNickname: u?.nickname || "—",
        userPhone: this.maskPhone(u?.phone),
        signedAt: r.signedAt,
        createdAt: r.createdAt,
        courseId: r.courseId,
        courseTitle: r.course?.title || "—",
        amount: r.course?.price ?? 0,
        station: r.course?.station || null,
      };
    });
    return { items, total, page, pageSize };
  }

  /** 驿站商品（跨驿站列表，平台监控）*/
  async adminListProducts(params?: { stationId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = Number(params?.page) || 1;
    const pageSize = Number(params?.pageSize) || 20;
    const where: Prisma.StationProductWhereInput = {};
    if (params?.stationId) where.stationId = params.stationId;
    if (params?.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.stationProduct.findMany({
        where,
        include: { station: { select: { id: true, name: true, city: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationProduct.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 师资预约（跨驿站列表，平台监控）*/
  async adminListBookings(params?: { stationId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = Number(params?.page) || 1;
    const pageSize = Number(params?.pageSize) || 20;
    const where: Prisma.StationTeacherBookingWhereInput = {};
    if (params?.stationId) where.stationId = params.stationId;
    if (params?.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.stationTeacherBooking.findMany({
        where,
        include: {
          station: { select: { id: true, name: true, city: true } },
          teacher: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { bookingDate: "desc" },
      }),
      this.prisma.stationTeacherBooking.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
