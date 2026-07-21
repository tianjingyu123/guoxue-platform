import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { isUniqueConstraintError } from "../../../common/prisma-errors";
import { OfflineReminderService } from "../offline-reminder.service";
import { safePagination } from "../../../common/pagination";
import { OfflineSharedService } from "./offline-shared.service";

/**
 * 线下驿站-课程域（从 offline.service 拆出·纯搬家不改逻辑）。
 * 职责：线下课程 CRUD + 报名/取消/签到 + 报名列表 + 课后评价（T8 OMO）+ 课后同学圈（T8 OMO）
 * + 课程审核/推荐 + 核销记录（平台监控 adminListCheckins）。
 * 依赖：共享叶子域（assertStationOwner/loadTeachers）+ 通知触点 reminder + 缓存 redis·单向不循环。
 */
@Injectable()
export class OfflineCourseService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private reminder: OfflineReminderService,
    private shared: OfflineSharedService,
  ) {}

  /** 只有已预约和已到店记录占用名额；CANCELLED 必须释放容量。 */
  private get activeRegWhere(): Prisma.OfflineCourseRegistrationWhereInput {
    return { status: { in: ["REGISTERED", "SIGNED_IN"] } };
  }

  private parseCourseWindow(startRaw: string, endRaw: string) {
    const startTime = new Date(startRaw);
    const endTime = new Date(endRaw);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "课程时间格式无效");
    }
    if (endTime.getTime() <= startTime.getTime()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "结束时间必须晚于开始时间");
    }
    return { startTime, endTime };
  }

  private async assertCourseTeacher(stationId: string, teacherId?: string) {
    if (!teacherId) return;
    const teacher = await this.prisma.stationTeacher.findFirst({
      where: { id: teacherId, stationId, status: "ACTIVE" }, select: { id: true },
    });
    if (!teacher) throw new BusinessException(ErrorCode.BAD_REQUEST, "所选讲师不属于当前驿站或已停用");
  }

  // ───────── 线下课程 ─────────

  // 🔴 契约防再犯（2026-07-17 审计核实）：
  // 1) OfflineCourse.price 单位=元（schema Decimal(10,2)，非分）——前后端展示/入库均按元，勿再 ×100 或 /100；
  // 2) 列表返回键 courses（listOfflineCourses 等）为既有前端契约，保持不改名（前端并行对齐）。
  async createOfflineCourse(userId: string, dto: { stationId: string; title: string; cover?: string; intro?: string; teacherId?: string; price?: number; maxStudents: number; startTime: string; endTime: string; location: string }) {
    await this.shared.assertStationOwner(userId, dto.stationId);
    await this.assertCourseTeacher(dto.stationId, dto.teacherId);
    const { startTime, endTime } = this.parseCourseWindow(dto.startTime, dto.endTime);
    return this.prisma.offlineCourse.create({
      data: {
        ...dto,
        price: dto.price ?? 0, // 单位=元（Decimal(10,2)）
        startTime,
        endTime,
      },
    });
  }

  async updateOfflineCourse(userId: string, courseId: string, dto: {
    title?: string; cover?: string; intro?: string; teacherId?: string; price?: number;
    maxStudents?: number; startTime?: string; endTime?: string; location?: string;
  }) {
    const course = await this.prisma.offlineCourse.findUnique({
      where: { id: courseId },
      include: {
        station: { select: { ownerUserId: true } },
        _count: { select: { registrations: { where: this.activeRegWhere } } },
      },
    });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    if (course.station.ownerUserId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权编辑该驿站课程");
    }
    if (course.startTime.getTime() <= Date.now()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "课程已开课或已结束，不可编辑");
    }
    if (course._count.registrations > 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "课程已有学员报名，为保护学员权益不可编辑");
    }
    if (Object.keys(dto).length === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请至少修改一项课程信息");
    }

    const { startTime, endTime } = this.parseCourseWindow(
      dto.startTime ?? course.startTime.toISOString(),
      dto.endTime ?? course.endTime.toISOString(),
    );
    if (startTime.getTime() <= Date.now()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "上课时间必须晚于当前时间");
    }
    await this.assertCourseTeacher(course.stationId, dto.teacherId);

    return this.prisma.offlineCourse.update({
      where: { id: courseId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.cover !== undefined && { cover: dto.cover }),
        ...(dto.intro !== undefined && { intro: dto.intro }),
        ...(dto.teacherId !== undefined && { teacherId: dto.teacherId }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.maxStudents !== undefined && { maxStudents: dto.maxStudents }),
        ...(dto.startTime !== undefined && { startTime }),
        ...(dto.endTime !== undefined && { endTime }),
        ...(dto.location !== undefined && { location: dto.location }),
        auditStatus: "PENDING",
        auditReason: null,
        status: "DRAFT",
        isRecommended: false,
        recommendedAt: null,
      },
    });
  }

  async listOfflineCourses(stationId?: string, rawPage = 1, rawPageSize = 20, userId?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    // 公开请求即使传 stationId 也只能看 ACTIVE 驿站的已审核已发布课程；
    // 只有已登录驿站主本人可在经营后台预览本驿站全部状态。
    let ownerView = false;
    if (stationId && userId) {
      const station = await this.prisma.stationOffline.findUnique({
        where: { id: stationId },
        select: { ownerUserId: true },
      });
      ownerView = station?.ownerUserId === userId;
    }
    const publicWhere: Prisma.OfflineCourseWhereInput = {
      auditStatus: "APPROVED",
      status: "PUBLISHED",
      station: { status: "ACTIVE" },
    };
    const where: Prisma.OfflineCourseWhereInput = stationId
      ? (ownerView ? { stationId } : { ...publicWhere, stationId })
      : publicWhere;
    const [courses, total] = await Promise.all([
      this.prisma.offlineCourse.findMany({
        where,
        include: {
          _count: { select: { registrations: { where: this.activeRegWhere } } },
          station: { select: { id: true, name: true, city: true } },
        },
        skip,
        take: pageSize,
        orderBy: { startTime: "asc" },
      }),
      this.prisma.offlineCourse.count({ where }),
    ]);
    const teacherMap = await this.shared.loadTeachers(courses.map((c) => c.teacherId));
    return {
      courses: courses.map((c) => ({ ...c, teacher: c.teacherId ? teacherMap.get(c.teacherId) || null : null })),
      total,
      page,
      pageSize,
    };
  }

  async getOfflineCourse(courseId: string, userId?: string) {
    const course = await this.prisma.offlineCourse.findUnique({
      where: { id: courseId },
      include: {
        station: {
          select: {
            id: true, name: true, city: true, address: true, phone: true,
            status: true, ownerUserId: true,
          },
        },
        _count: { select: { registrations: { where: this.activeRegWhere } } },
      },
    });
    const isPublic = course?.status === "PUBLISHED"
      && course.auditStatus === "APPROVED"
      && course.station.status === "ACTIVE";
    const isOwner = !!userId && course?.station.ownerUserId === userId;
    if (!course || (!isPublic && !isOwner)) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    }
    let teacher: { id: string; name: string; avatar: string | null; specialties: string[]; bio: string | null; sourceUserId: string | null } | null = null;
    if (course.teacherId) {
      teacher = await this.prisma.stationTeacher.findUnique({
        where: { id: course.teacherId },
        select: { id: true, name: true, avatar: true, specialties: true, bio: true, sourceUserId: true },
      });
    }
    const safeStation = {
      id: course.station.id,
      name: course.station.name,
      city: course.station.city,
      address: course.station.address,
      phone: course.station.phone,
    };
    // 公开详情只返回有效报名数，绝不返回 userId、qrCode、verifyCode 等报名凭证。
    return { ...course, station: safeStation, teacher };
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

  /** 生成同课程内唯一的 6 位到店核销码（锁内调用·冲突重试） */
  private async genVerifyCode(tx: Prisma.TransactionClient, courseId: string): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const code = String(Math.floor(100000 + Math.random() * 900000)); // 100000–999999
      const dup = await tx.offlineCourseRegistration.findFirst({ where: { courseId, verifyCode: code }, select: { id: true } });
      if (!dup) return code;
    }
    // 极小概率连撞 8 次：退化为时间戳后 6 位兜底（仍受唯一约束保护）
    return String(Date.now()).slice(-6);
  }

  /** 我的所有线下课报名列表（C4 我的报名·含本人凭证 qrCode/verifyCode·按报名时间倒序） */
  async listMyCourseRegistrations(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId };
    const [registrations, total] = await Promise.all([
      this.prisma.offlineCourseRegistration.findMany({
        where,
        include: {
          course: {
            select: {
              id: true, title: true, cover: true, startTime: true, endTime: true,
              location: true, status: true, auditStatus: true, price: true, circleId: true,
              station: { select: { id: true, name: true, city: true, address: true, phone: true } },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.offlineCourseRegistration.count({ where }),
    ]);
    return { registrations, total, page, pageSize };
  }

  async registerCourse(userId: string, courseId: string) {
    const course = await this.prisma.offlineCourse.findUnique({
      where: { id: courseId },
      include: { station: { select: { status: true } } },
    });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    if (course.status !== "PUBLISHED" || course.auditStatus !== "APPROVED" || course.station.status !== "ACTIVE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "课程未开放报名");
    }
    if (course.startTime.getTime() <= Date.now()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "课程已开场，无法报名");
    }

    const qrCode = `QR_${courseId}_${userId}_${Date.now()}`;
    // 行锁串行化防超卖：锁定课程行后，在锁内查重 + 计数 + 创建（消除 count-then-create 竞态）
    const registration = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "OfflineCourse" WHERE id = ${courseId} FOR UPDATE`;

      const existing = await tx.offlineCourseRegistration.findUnique({
        where: { courseId_userId: { courseId, userId } },
      });
      if (existing && existing.status !== "CANCELLED") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "已报名该课程");
      }

      const count = await tx.offlineCourseRegistration.count({
        where: { courseId, ...this.activeRegWhere },
      });
      if (count >= course.maxStudents) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "课程名额已满");
      }

      const verifyCode = await this.genVerifyCode(tx, courseId);
      // 取消后可重新预约：复用唯一报名行并换新凭证。
      if (existing) {
        return tx.offlineCourseRegistration.update({
          where: { id: existing.id },
          data: { status: "REGISTERED", qrCode, verifyCode, signedAt: null },
        });
      }
      try {
        return await tx.offlineCourseRegistration.create({
          data: { courseId, userId, qrCode, verifyCode },
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
    if (reg.status === "CANCELLED") throw new BusinessException(ErrorCode.NOT_FOUND, "报名已取消");
    if (reg.status === "SIGNED_IN") throw new BusinessException(ErrorCode.BAD_REQUEST, "已签到，无法取消");
    if (reg.course.startTime.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "距开课不足24小时，无法在线取消，请联系驿站处理");
    }

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
    await this.shared.assertStationOwner(operatorUserId, stationId);
    const reg = await this.prisma.offlineCourseRegistration.findFirst({
      where: { qrCode, course: { stationId } },
      include: { course: true },
    });
    if (!reg) throw new BusinessException(ErrorCode.NOT_FOUND, "无效的签到码");
    if (reg.status === "CANCELLED") throw new BusinessException(ErrorCode.BAD_REQUEST, "报名已取消");
    if (reg.status === "SIGNED_IN") throw new BusinessException(ErrorCode.BAD_REQUEST, "已签到");
    if (!this.isSameDay(reg.course.startTime, new Date())) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "签到凭证仅限开课当天使用");
    }

    const signedAt = new Date();
    const claimed = await this.prisma.offlineCourseRegistration.updateMany({
      where: { id: reg.id, status: "REGISTERED" },
      data: { status: "SIGNED_IN", signedAt },
    });
    if (claimed.count === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "凭证状态已变化，请刷新后重试");
    }
    return { ...reg, status: "SIGNED_IN", signedAt };
  }

  /**
   * 输码核销（B4 扫码不便兜底）：运营者输入学员口报的 6 位到店核销码完成 sign-in。
   * 防作弊校验（务必服务端做）：
   *   ① 操作者身份=本驿站运营者（assertStationOwner）；
   *   ② 码归属=本驿站本课程（where courseId + course.stationId，跨场次/异地天然拦截）；
   *   ③ 当天有效=仅开课当天可核销（过期拦截）；
   *   ④ 幂等=已核销不可重复（重复拦截）；
   *   ⑤ 状态=报名有效（已取消不可核销）。
   * 失败按拦截类型返回差异化 message，前端红字提示 + 抖动，不写记录。
   */
  async signInByCode(operatorUserId: string, courseId: string, code: string) {
    // 归属以 courseId 反查的真实驿站为准（不信任前端传参），再校验操作者为该驿站主
    const course = await this.prisma.offlineCourse.findUnique({ where: { id: courseId }, select: { stationId: true } });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    await this.shared.assertStationOwner(operatorUserId, course.stationId);

    const reg = await this.prisma.offlineCourseRegistration.findFirst({
      where: { courseId, verifyCode: code },
      include: { course: true },
    });
    if (!reg) throw new BusinessException(ErrorCode.NOT_FOUND, "核销码无效，请核对");
    if (reg.status === "CANCELLED") throw new BusinessException(ErrorCode.BAD_REQUEST, "该报名已取消");
    if (reg.status === "SIGNED_IN") throw new BusinessException(ErrorCode.BAD_REQUEST, "该凭证已核销过，请勿重复核销");
    if (!this.isSameDay(reg.course.startTime, new Date())) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "核销码非当天有效，已失效");
    }

    const signedAt = new Date();
    const claimed = await this.prisma.offlineCourseRegistration.updateMany({
      where: { id: reg.id, status: "REGISTERED" },
      data: { status: "SIGNED_IN", signedAt },
    });
    if (claimed.count === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "凭证状态已变化，请刷新后重试");
    }
    return { ...reg, status: "SIGNED_IN", signedAt };
  }

  /** 同一自然日判定（当天有效核销用·按服务器时区） */
  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  async listRegistrations(operatorUserId: string, courseId: string, rawPage = 1, rawPageSize = 20) {
    // 越权校验：先由 courseId 反查所属驿站，再校验调用者为驿站主
    const course = await this.prisma.offlineCourse.findUnique({ where: { id: courseId }, select: { stationId: true } });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    await this.shared.assertStationOwner(operatorUserId, course.stationId);
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);

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
        skip,
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
  async listCourseReviews(courseId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { courseId };
    const [reviews, total] = await Promise.all([
      this.prisma.offlineCourseReview.findMany({
        where,
        skip,
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

  async listPendingCourses(rawPage = 1, rawPageSize = 20, stationId?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.OfflineCourseWhereInput = { auditStatus: "PENDING" };
    if (stationId) where.stationId = stationId;
    const [courses, total] = await Promise.all([
      this.prisma.offlineCourse.findMany({
        where,
        include: { station: { select: { id: true, name: true } } },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.offlineCourse.count({ where }),
    ]);
    return { courses, total, page, pageSize };
  }

  async listRecommendedCourses(rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.OfflineCourseWhereInput = { isRecommended: true, status: { not: "DRAFT" } };
    const [courses, total] = await Promise.all([
      this.prisma.offlineCourse.findMany({
        where,
        include: { station: { select: { id: true, name: true, city: true } } },
        skip,
        take: pageSize,
        orderBy: { recommendedAt: "desc" },
      }),
      this.prisma.offlineCourse.count({ where }),
    ]);
    return { courses, total, page, pageSize };
  }

  // ───────── 平台管理视图（跨驿站只读监控） ─────────

  /** 手机号脱敏 138****8000 */
  private maskPhone(phone?: string | null): string | null {
    if (!phone) return null;
    return phone.length >= 11 ? phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : phone.replace(/.(?=.{2})/g, "*");
  }

  /** 核销记录（跨驿站签到核销，平台监控）— status=SIGNED_IN */
  async adminListCheckins(params?: { stationId?: string; page?: number; pageSize?: number }) {
    const { page, pageSize, skip } = safePagination(params?.page, params?.pageSize);
    const where: Prisma.OfflineCourseRegistrationWhereInput = { status: "SIGNED_IN" };
    if (params?.stationId) where.course = { stationId: params.stationId };

    const [regs, total] = await Promise.all([
      this.prisma.offlineCourseRegistration.findMany({
        where,
        include: { course: { select: { id: true, title: true, price: true, station: { select: { id: true, name: true, city: true } } } } },
        skip,
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
}
