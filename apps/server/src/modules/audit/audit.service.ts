import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { ModerationService } from "./moderation.service";
import { ModerationAiService } from "./moderation-ai.service";
import { SensitiveWordService } from "./sensitive-word.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

/** 内容开放范围（方案：docs/design/内容开放范围与审核体系-方案-20260710.md） */
export type ContentVisibility = "CIRCLE_ONLY" | "PLATFORM";
export type ContentAuditType = "ARTICLE" | "POST" | "COURSE" | "VIDEO" | "LIVE";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private moderation: ModerationService,
    private moderationAi: ModerationAiService,
    private sensitiveWord: SensitiveWordService,
  ) {}

  log(params: {
    userId?: string;
    executor?: string;
    autonomyLevel?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    detail?: string;
    rollbackData?: Record<string, any>;
    ip?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        executor: params.executor || params.userId || "SYSTEM",
        autonomyLevel: params.autonomyLevel,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        detail: params.detail,
        rollbackData: params.rollbackData as any,
        ip: params.ip,
      },
    });
  }

  /** 查询含回滚数据的审计日志 */
  async getLogWithRollback(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) throw new BusinessException(ErrorCode.NOT_FOUND, "审计日志不存在");
    if (!log.rollbackData) throw new BusinessException(ErrorCode.NOT_FOUND, "该操作无可回滚数据");
    return log;
  }

  /** 获取可回滚的操作列表 */
  async listRollbackable(params: {
    targetType?: string;
    targetId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.AuditLogWhereInput = {
      rollbackData: { not: Prisma.DbNull },
    };
    if (params.targetType) where.targetType = params.targetType;
    if (params.targetId) where.targetId = params.targetId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page, pageSize };
  }

  // ───────── 内容审核 ─────────

  /** 审核图片 */
  async moderateImage(imageUrl: string, bizType?: string) {
    const result = await this.moderation.imageModeration({ imageUrl, bizType });
    const passed = this.moderation.isImagePass(result);
    const labels = passed ? [] : this.moderation.getBlockedLabels(result);

    await this.prisma.auditLog.create({
      data: {
        action: passed ? "IMAGE_PASS" : "IMAGE_BLOCK",
        targetType: "IMAGE",
        targetId: imageUrl,
        detail: JSON.stringify({ passed, labels, result }),
      },
    });

    return { passed, labels, raw: result };
  }

  /** 审核文本 */
  async moderateText(content: string, bizType?: string, dataId?: string) {
    const result = await this.moderation.textModeration({ content, bizType, dataId });
    const suggestion = this.moderation.getTextSuggestion(result);
    const passed = suggestion === "Pass";
    const labels = passed ? [] : this.moderation.getBlockedLabels(result);

    await this.prisma.auditLog.create({
      data: {
        action: passed ? "TEXT_PASS" : "TEXT_BLOCK",
        targetType: "TEXT",
        targetId: dataId || content.slice(0, 50),
        detail: JSON.stringify({ passed, suggestion, labels }),
      },
    });

    return { passed, suggestion, labels, raw: result };
  }

  /**
   * 统一 UGC 文本审核编排（三层漏斗，先审后发拦截）
   *
   * 第1层：本地敏感词库（<1ms，覆盖国学领域诈骗话术）——命中即硬拦截
   * 第2层：腾讯云 TMS（网络调用，覆盖色情/暴力/涉政）——三档：
   *        · Pass  → 放行
   *        · Block → 拦截
   *        · Review（疑似）→ 交第3层复审（不直接拦，防误杀）
   * 第3层：DeepSeek 语义复审（仅对 Review 内容，降成本）——block 拦截 / pass 放行
   *
   * 容错策略：
   * - 本地词库命中 → 硬拦截（本地零依赖，不放行）
   * - 腾讯云 Block / DeepSeek block → 拦截
   * - 腾讯云网络/密钥异常 → **fail-open 放行**并记日志，避免第三方抖动导致全站发不出内容
   * - DeepSeek 未配置/超时/解析失败 → **fail-open 放行** Review 内容，记 CONTENT_REVIEW_FALLBACK
   *   日志待人工复审（Review 仅"疑似"非确定违规，与整体 fail-open 基调一致）
   *
   * @param content 待审文本（自动 trim；空串直接放行）
   * @param opts.scene 业务场景标识（如 "CIRCLE_POST" / "COMMENT" / "PAID_QUESTION"）
   * @param opts.userId 提交人（用于审计定位）
   * @param opts.dataId 关联业务ID
   */
  async moderateTextOrThrow(
    content: string | undefined | null,
    opts: { scene: string; userId?: string; dataId?: string } = { scene: "UGC" },
  ): Promise<void> {
    const text = (content ?? "").trim();
    if (!text) return;

    // 第1层：本地敏感词库（命中即硬拦截）
    const hits = this.sensitiveWord.check(text);
    if (hits.length > 0) {
      await this.log({
        userId: opts.userId,
        action: "CONTENT_BLOCK_LOCAL",
        targetType: opts.scene,
        targetId: opts.dataId,
        detail: JSON.stringify({ hits, sample: text.slice(0, 100) }),
      }).catch((err) => this.logger.warn("审核日志写入失败", err));
      throw new BusinessException(
        ErrorCode.CONTENT_MODERATION_BLOCKED,
        "内容包含违规信息，请修改后重试",
      );
    }

    // 第2层：腾讯云 TMS（网络调用，异常时 fail-open）
    let suggestion: "Pass" | "Review" | "Block";
    let labels: string[];
    try {
      const result = await this.moderateText(text, opts.scene, opts.dataId);
      suggestion = result.suggestion;
      labels = result.labels;
    } catch (err) {
      // 仅当「内容违规」才拦截；审核服务本身不可用/密钥失效(THIRD_AI_FAILED 等基础设施异常)必须 fail-open 放行，
      // 否则腾讯云凭证未配/失效时会把全部 UGC(发帖/评价/评论)硬阻断为 502，用户完全无法发布内容。
      if (err instanceof BusinessException && err.errorCode === ErrorCode.CONTENT_MODERATION_BLOCKED) throw err;
      this.logger.warn(`腾讯云文本审核不可用，fail-open 放行 [scene=${opts.scene}]`, err instanceof Error ? err.message : err);
      return;
    }

    if (suggestion === "Pass") return;
    if (suggestion === "Block") {
      throw new BusinessException(
        ErrorCode.CONTENT_MODERATION_BLOCKED,
        "内容未通过安全审核，请修改后重试",
      );
    }

    // suggestion === "Review"：第3层 DeepSeek 语义复审
    const verdict = await this.moderationAi.review(text, { labels, scene: opts.scene });

    if (verdict?.decision === "block") {
      await this.log({
        userId: opts.userId,
        action: "CONTENT_BLOCK_AI",
        targetType: opts.scene,
        targetId: opts.dataId,
        detail: JSON.stringify({ category: verdict.category, reason: verdict.reason, labels, sample: text.slice(0, 100) }),
      }).catch((err) => this.logger.warn("审核日志写入失败", err));
      throw new BusinessException(
        ErrorCode.CONTENT_MODERATION_BLOCKED,
        "内容未通过安全审核，请修改后重试",
      );
    }

    if (verdict?.decision === "pass") {
      // 大模型判正常，救回一条本会被误杀的疑似内容
      return;
    }

    // verdict === null：DeepSeek 未配置/超时/解析失败 → fail-open 放行 + 标记待人工复审
    await this.log({
      userId: opts.userId,
      action: "CONTENT_REVIEW_FALLBACK",
      targetType: opts.scene,
      targetId: opts.dataId,
      detail: JSON.stringify({ labels, aiAvailable: this.moderationAi.available, sample: text.slice(0, 100) }),
    }).catch((err) => this.logger.warn("审核日志写入失败", err));
  }

  /**
   * 统一 UGC 图片审核编排（先审后发拦截）——对齐 moderateTextOrThrow 的 fail-open 基调。
   *
   * 腾讯云 IMS 图片审核三档：
   * - Pass  → 放行
   * - Block → 硬拦截（抛业务异常，写库前拦下）
   * - Review（疑似）→ 记 CONTENT_REVIEW_IMAGE 日志转人工，fail-open 放行
   *   （图片无 DeepSeek 二次复审能力，Review 仅"疑似"，不直接拦以防误杀）
   *
   * 容错策略（与文本审核一致）：审核服务不可用/密钥失效/网络超时 → **fail-open 放行**并记日志，
   * 避免第三方抖动把全站图片 UGC（发帖图/评价图/头像）硬阻断。
   *
   * @param images 单张 URL 或 URL 数组（自动过滤空值；无图直接放行）
   * @param opts.scene 业务场景标识（如 "CIRCLE_POST" / "PRODUCT_REVIEW" / "USER_AVATAR"）
   */
  async moderateImageOrThrow(
    images: string | string[] | undefined | null,
    opts: { scene: string; userId?: string; dataId?: string } = { scene: "UGC" },
  ): Promise<void> {
    const urls = (Array.isArray(images) ? images : [images])
      .map((u) => (u ?? "").trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) return;

    // 逐张审核，任一 Block 即拦截；基础设施异常单张 fail-open（不因一张审核失败连累放行判断）
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const raw = await this.moderation.imageModeration({ imageUrl: url, bizType: opts.scene });
          return { url, suggestion: this.moderation.getImageSuggestion(raw), labels: this.moderation.getBlockedLabels(raw) };
        } catch (err) {
          this.logger.warn(
            `腾讯云图片审核不可用，fail-open 放行 [scene=${opts.scene}]`,
            err instanceof Error ? err.message : err,
          );
          return { url, suggestion: "Pass" as const, labels: [] as string[] };
        }
      }),
    );

    const blocked = results.find((r) => r.suggestion === "Block");
    if (blocked) {
      await this.log({
        userId: opts.userId,
        action: "CONTENT_BLOCK_IMAGE",
        targetType: opts.scene,
        targetId: opts.dataId,
        detail: JSON.stringify({ url: blocked.url, labels: blocked.labels }),
      }).catch((err) => this.logger.warn("审核日志写入失败", err));
      throw new BusinessException(
        ErrorCode.CONTENT_MODERATION_BLOCKED,
        "图片未通过安全审核，请更换后重试",
      );
    }

    const review = results.filter((r) => r.suggestion === "Review");
    if (review.length > 0) {
      // Review 转人工复审 + fail-open 放行
      await this.log({
        userId: opts.userId,
        action: "CONTENT_REVIEW_IMAGE",
        targetType: opts.scene,
        targetId: opts.dataId,
        detail: JSON.stringify({ urls: review.map((r) => r.url), labels: review.flatMap((r) => r.labels) }),
      }).catch((err) => this.logger.warn("审核日志写入失败", err));
    }
  }

  // ───────── 内容开放范围 + 平台审核分流（内容开放范围与审核体系 P2/P3）─────────

  /** 审核结果回写目标：各内容表的 auditStatus 快照 + 缓存失效 pattern（Article/Course 无 auditReason 列，驳回原因只存 ContentAuditRecord.rejectReason） */
  private static readonly CONTENT_AUDIT_TARGETS: Record<
    string,
    { model: "article" | "course" | "video" | "liveRoom"; hasReason: boolean; cachePatterns: string[] }
  > = {
    ARTICLE: { model: "article", hasReason: false, cachePatterns: ["articles:list:*"] },
    COURSE: { model: "course", hasReason: false, cachePatterns: ["courses:list:*"] },
    VIDEO: { model: "video", hasReason: true, cachePatterns: ["video:list:*"] },
    LIVE: { model: "liveRoom", hasReason: true, cachePatterns: ["live:rooms:*"] },
  };

  /** 官方圈ID（ConfigSystem.official_circle_id·未配置返回 undefined） */
  private async getOfficialCircleId(): Promise<string | undefined> {
    const cfg = await this.prisma.configSystem.findUnique({ where: { configKey: "official_circle_id" } });
    return cfg?.configValue || undefined;
  }

  /**
   * 发布分流：按开放范围决定内容初始平台审核态。
   * - CIRCLE_ONLY（默认）→ APPROVED：圈内直生效（UGC 机审已在 create 前拦截），圈主自治，不进平台人工审核队列
   * - PLATFORM → 平台管理员 / 官方圈内容自动 APPROVED；其余 PENDING（圈内可见、平台不可见，待人工审）
   */
  async resolveContentVisibility(opts: {
    visibility?: string;
    circleId?: string | null;
    isAdmin?: boolean;
  }): Promise<{ visibility: ContentVisibility; auditStatus: "APPROVED" | "PENDING" }> {
    const visibility: ContentVisibility = opts.visibility === "PLATFORM" ? "PLATFORM" : "CIRCLE_ONLY";
    if (visibility === "CIRCLE_ONLY" || opts.isAdmin) return { visibility, auditStatus: "APPROVED" };
    if (opts.circleId) {
      const officialCircleId = await this.getOfficialCircleId();
      if (officialCircleId && officialCircleId === opts.circleId) return { visibility, auditStatus: "APPROVED" };
    }
    return { visibility, auditStatus: "PENDING" };
  }

  /**
   * PLATFORM 待审内容登记 ContentAuditRecord（责任到人：submitterId + circleId + 审核员全链路可追溯）。
   * UGC 机审漏斗在内容 create 前已跑过 → machineStatus=PASSED。
   * 登记失败只记日志不回滚发布（内容 auditStatus=PENDING 仍圈内可见，可由管理员在内容列表补审）。
   */
  async openContentAudit(opts: {
    contentType: ContentAuditType;
    contentId: string;
    circleId?: string | null;
    submitterId: string;
  }): Promise<void> {
    try {
      await this.prisma.contentAuditRecord.create({
        data: {
          contentType: opts.contentType,
          contentId: opts.contentId,
          circleId: opts.circleId || null,
          submitterId: opts.submitterId,
          auditMode: "PRE_PUBLISH",
          machineStatus: "PASSED",
          machineAuditAt: new Date(),
          machineAuditBy: "SYSTEM",
        },
      });
    } catch (err) {
      this.logger.error(
        `内容审核记录登记失败 [${opts.contentType}:${opts.contentId}]`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  /** 平台内容审核队列（五类内容统一台账·附提交人与内容标题）。finalStatus="ALL" 不过滤状态（C 端「我的提交」用） */
  async listContentAudits(params: {
    finalStatus?: string;
    contentType?: string;
    circleId?: string;
    submitterId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.ContentAuditRecordWhereInput = { deletedAt: null };
    if (params.finalStatus !== "ALL") where.finalStatus = params.finalStatus || "PENDING";
    if (params.contentType) where.contentType = params.contentType;
    if (params.circleId) where.circleId = params.circleId;
    if (params.submitterId) where.submitterId = params.submitterId;

    const [records, total] = await Promise.all([
      this.prisma.contentAuditRecord.findMany({
        where,
        skip,
        take: pageSize,
        // 审核队列先进先审；个人提交列表最新在前
        orderBy: { createdAt: params.submitterId ? "desc" : "asc" },
      }),
      this.prisma.contentAuditRecord.count({ where }),
    ]);

    // 责任到人展示：批量补提交人昵称 + 各类型内容标题
    const submitterIds = [...new Set(records.map((r) => r.submitterId))];
    const users = submitterIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: submitterIds } },
          select: { id: true, nickname: true, avatar: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const idsByType: Record<string, string[]> = {};
    records.forEach((r) => (idsByType[r.contentType] ??= []).push(r.contentId));
    const titleMap = new Map<string, string | null>();
    await Promise.all(
      Object.entries(idsByType).map(async ([type, ids]) => {
        const target = AuditService.CONTENT_AUDIT_TARGETS[type];
        if (!target) return;
        const rows = await (this.prisma[target.model] as unknown as {
          findMany: (args: unknown) => Promise<Array<{ id: string; title: string | null }>>;
        }).findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
        rows.forEach((row) => titleMap.set(`${type}:${row.id}`, row.title));
      }),
    );

    return {
      records: records.map((r) => ({
        ...r,
        submitter: userMap.get(r.submitterId) || null,
        contentTitle: titleMap.get(`${r.contentType}:${r.contentId}`) ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 人工审核裁决：通过 → 内容 auditStatus=APPROVED 进平台公共池；驳回 → 记原因（发布者可见），内容保持圈内可见。
   * 同步回写内容表快照 + 失效对应列表缓存。
   */
  async reviewContent(recordId: string, auditorId: string, action: "approve" | "reject", reason?: string) {
    const record = await this.prisma.contentAuditRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "审核记录不存在");
    if (record.finalStatus !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "该记录已审结，不可重复审核");

    const approved = action === "approve";
    const finalStatus = approved ? "APPROVED" : "REJECTED";
    const rejectReason = approved ? null : reason || "内容不符合平台开放规范";
    const now = new Date();

    const updated = await this.prisma.contentAuditRecord.update({
      where: { id: recordId },
      data: {
        humanAuditorId: auditorId,
        humanStatus: approved ? "PASSED" : "REJECTED",
        humanResult: reason ?? null,
        humanAuditAt: now,
        finalStatus,
        rejectReason,
        finishedAt: now,
      },
    });

    // 回写内容表 auditStatus 快照（内容已被删除等异常不回滚审核结论，只记日志）
    const target = AuditService.CONTENT_AUDIT_TARGETS[record.contentType];
    if (target) {
      const data: Record<string, unknown> = { auditStatus: finalStatus };
      if (target.hasReason) data.auditReason = rejectReason;
      await (this.prisma[target.model] as unknown as {
        update: (args: unknown) => Promise<unknown>;
      })
        .update({ where: { id: record.contentId }, data })
        .catch((err: unknown) =>
          this.logger.error(
            `审核结果回写内容表失败 [${record.contentType}:${record.contentId}]`,
            err instanceof Error ? err.stack : err,
          ),
        );
      await Promise.all(target.cachePatterns.map((p) => this.redis.delByPattern(p))).catch(() => undefined);
    }

    await this.log({
      userId: auditorId,
      action: approved ? "CONTENT_AUDIT_APPROVE" : "CONTENT_AUDIT_REJECT",
      targetType: record.contentType,
      targetId: record.contentId,
      detail: JSON.stringify({ recordId, circleId: record.circleId, submitterId: record.submitterId, reason: reason ?? null }),
    }).catch((err) => this.logger.warn("审核日志写入失败", err));

    return updated;
  }

  async list(params: {
    userId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.AuditLogWhereInput = {};
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = params.action;
    if (params.targetType) where.targetType = params.targetType;
    if (params.targetId) where.targetId = params.targetId;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate + "T23:59:59.999Z");
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page, pageSize };
  }

  async getActions() {
    return this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
    });
  }

  // ───────── 平台操作日志 ─────────

  async listOperationLogs(params: {
    userId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.OperationLogWhereInput = {};
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = params.action;
    if (params.targetType) where.targetType = params.targetType;
    if (params.targetId) where.targetId = params.targetId;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate + "T23:59:59.999Z");
    }

    const [logs, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.operationLog.count({ where }),
    ]);
    return { logs, total, page, pageSize };
  }

  async getOperationLog(id: string) {
    return this.prisma.operationLog.findUnique({ where: { id } });
  }
}
