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

/**
 * UGC 后审分级（审核无感化·发布权限与实名认证体系-20260711 第八节）：
 * - pass      机审通过 → 内容不动，用户无感知
 * - mild      轻度违规（敏感但非红线）→ 内容降级「仅自己可见」SELF_ONLY + 温和站内信
 * - severe    严重违规（红线词/Block 级）→ 下架/软删 + 站内信（附原因类别）
 * - uncertain 机审拿不准 → 进 admin 人工复审队列（内容保持可见，用户无感知）
 */
export type UgcRiskVerdict = "pass" | "mild" | "severe" | "uncertain";
/** 先发后审适用的三类内容（帖子/文章/商品维持现状，勿扩） */
export type PostPublishContentType = "VIDEO" | "COURSE" | "LIVE";

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

  // ───────── 审核无感化：先发后审 · 异步机审 · 三档处置（2026-07-11 第八节）─────────

  /** 分级处置的内容表配置：模型名 / 各档更新数据 / 缓存失效 pattern / 通知内容类型名 */
  private static readonly POST_PUBLISH_TARGETS: Record<
    PostPublishContentType,
    { model: "video" | "course" | "liveRoom"; typeName: string; cachePatterns: string[]; detailKey: (id: string) => string }
  > = {
    VIDEO: { model: "video", typeName: "短视频", cachePatterns: ["video:list:*"], detailKey: (id) => `video:detail:${id}` },
    COURSE: { model: "course", typeName: "课程", cachePatterns: ["courses:list:*"], detailKey: (id) => `courses:detail:${id}` },
    LIVE: { model: "liveRoom", typeName: "直播", cachePatterns: ["live:rooms:*"], detailKey: (id) => `live:rooms:${id}` },
  };

  /**
   * 三层漏斗文本分级（非阻断版·与 moderateTextOrThrow 同漏斗不同出口）：
   * - 本地红线词库命中 → severe（红线级·硬违规）
   * - 腾讯云 Block → severe
   * - 腾讯云 Review + DeepSeek block → mild（敏感但非红线）
   * - 腾讯云 Review + DeepSeek pass → pass（救回疑似误杀）
   * - 腾讯云 Review + DeepSeek 不可用 → uncertain（转人工·内容保持可见）
   * - 审核基建异常 → pass（延续 fail-open 基调，不因第三方抖动错杀内容）
   */
  async classifyTextRisk(
    content: string | undefined | null,
    opts: { scene: string; userId?: string; dataId?: string },
  ): Promise<{ verdict: UgcRiskVerdict; category?: string }> {
    const text = (content ?? "").trim();
    if (!text) return { verdict: "pass" };

    // 第1层：本地红线词库
    const hits = this.sensitiveWord.check(text);
    if (hits.length > 0) {
      await this.log({
        userId: opts.userId,
        action: "CONTENT_BLOCK_LOCAL",
        targetType: opts.scene,
        targetId: opts.dataId,
        detail: JSON.stringify({ hits, sample: text.slice(0, 100) }),
      }).catch((err) => this.logger.warn("审核日志写入失败", err));
      return { verdict: "severe", category: "违禁信息" };
    }

    // 第2层：腾讯云 TMS
    let suggestion: "Pass" | "Review" | "Block";
    let labels: string[];
    try {
      const result = await this.moderateText(text, opts.scene, opts.dataId);
      suggestion = result.suggestion;
      labels = result.labels;
    } catch (err) {
      this.logger.warn(`腾讯云文本审核不可用，后审 fail-open [scene=${opts.scene}]`, err instanceof Error ? err.message : err);
      return { verdict: "pass" };
    }
    if (suggestion === "Pass") return { verdict: "pass" };
    if (suggestion === "Block") return { verdict: "severe", category: labels?.[0] || "违规内容" };

    // 第3层：DeepSeek 语义复审（仅 Review）
    const aiVerdict = await this.moderationAi.review(text, { labels, scene: opts.scene });
    if (aiVerdict?.decision === "block") return { verdict: "mild", category: aiVerdict.category || labels?.[0] || "敏感内容" };
    if (aiVerdict?.decision === "pass") return { verdict: "pass" };
    return { verdict: "uncertain", category: labels?.[0] };
  }

  /** 图片分级（非阻断版）：Block → severe；Review → uncertain（图片无 AI 二次复审）；异常 → pass */
  async classifyImageRisk(
    images: string | string[] | undefined | null,
    opts: { scene: string; userId?: string; dataId?: string },
  ): Promise<{ verdict: UgcRiskVerdict; category?: string }> {
    const urls = (Array.isArray(images) ? images : [images]).map((u) => (u ?? "").trim()).filter((u) => u.length > 0);
    if (urls.length === 0) return { verdict: "pass" };
    let worst: UgcRiskVerdict = "pass";
    let category: string | undefined;
    for (const url of urls) {
      try {
        const raw = await this.moderation.imageModeration({ imageUrl: url, bizType: opts.scene });
        const suggestion = this.moderation.getImageSuggestion(raw);
        if (suggestion === "Block") return { verdict: "severe", category: this.moderation.getBlockedLabels(raw)?.[0] || "违规图片" };
        if (suggestion === "Review" && worst === "pass") {
          worst = "uncertain";
          category = this.moderation.getBlockedLabels(raw)?.[0];
        }
      } catch (err) {
        this.logger.warn(`腾讯云图片审核不可用，后审 fail-open [scene=${opts.scene}]`, err instanceof Error ? err.message : err);
      }
    }
    return { verdict: worst, category };
  }

  /**
   * 存量内容机审兜底扫描（董事长 2026-07-11 拍板：存量 PENDING 一次性放行 + 机审兜底）。
   * 对指定类型、指定时刻前创建的已可见内容重新排队机审；每条间隔 2s 错峰，避免打爆第三方审核配额。
   */
  async backfillModeration(type: PostPublishContentType, limit = 200, beforeDate?: string) {
    const before = beforeDate ? new Date(beforeDate) : new Date();
    let rows: Array<{ id: string; userId: string; circleId: string | null; text: string; images?: string }> = [];
    if (type === "VIDEO") {
      const list = await this.prisma.video.findMany({
        where: { auditStatus: "APPROVED", createdAt: { lt: before } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, userId: true, circleId: true, title: true, description: true, coverUrl: true },
      });
      rows = list.map((v) => ({ id: v.id, userId: v.userId, circleId: v.circleId, text: [v.title, v.description].filter(Boolean).join(" "), images: v.coverUrl ?? undefined }));
    } else if (type === "COURSE") {
      const list = await this.prisma.course.findMany({
        where: { auditStatus: "APPROVED", deletedAt: null, createdAt: { lt: before } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, userId: true, circleId: true, title: true, intro: true, cover: true },
      });
      rows = list.map((c) => ({ id: c.id, userId: c.userId, circleId: c.circleId, text: [c.title, c.intro].filter(Boolean).join(" "), images: c.cover ?? undefined }));
    } else {
      const list = await this.prisma.liveRoom.findMany({
        where: { auditStatus: "APPROVED", createdAt: { lt: before } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, userId: true, circleId: true, title: true, cover: true },
      });
      rows = list.map((r) => ({ id: r.id, userId: r.userId, circleId: r.circleId, text: r.title, images: r.cover ?? undefined }));
    }
    rows.forEach((r, i) => {
      setTimeout(() => this.queueContentModeration({ contentType: type, contentId: r.id, userId: r.userId, circleId: r.circleId, text: r.text, images: r.images }), i * 2000);
    });
    this.logger.log(`存量机审兜底扫描已排队: type=${type} queued=${rows.length} before=${before.toISOString()}`);
    return { queued: rows.length, type, before: before.toISOString() };
  }

  /**
   * 后审派发（发布即可见的机审入口）：fire-and-forget，不阻塞发布响应；
   * 意外异常重试 2 次（30s/60s 退避）后记 CONTENT_ASYNC_MODERATION_FAILED 兜底日志（漏斗内部已 fail-open，此处只兜编程性异常）。
   */
  queueContentModeration(opts: {
    contentType: PostPublishContentType;
    contentId: string;
    userId: string;
    circleId?: string | null;
    text?: string;
    images?: string | string[];
  }): void {
    const run = (attempt: number) => {
      this.moderateContentAsync(opts).catch((err) => {
        if (attempt < 3) {
          setTimeout(() => run(attempt + 1), 30_000 * attempt);
          return;
        }
        this.logger.error(`异步机审最终失败 [${opts.contentType}:${opts.contentId}]`, err instanceof Error ? err.stack : err);
        void this.log({
          userId: opts.userId,
          action: "CONTENT_ASYNC_MODERATION_FAILED",
          targetType: opts.contentType,
          targetId: opts.contentId,
          detail: JSON.stringify({ message: err instanceof Error ? err.message : String(err) }),
        }).catch(() => undefined);
      });
    };
    setImmediate(() => run(1));
  }

  /** 执行一次后审并按三档处置（pass 不动 / mild 降 SELF_ONLY / severe 下架软删 / uncertain 进人工队列） */
  async moderateContentAsync(opts: {
    contentType: PostPublishContentType;
    contentId: string;
    userId: string;
    circleId?: string | null;
    text?: string;
    images?: string | string[];
  }): Promise<void> {
    const scene = opts.contentType;
    const rank: Record<UgcRiskVerdict, number> = { pass: 0, uncertain: 1, mild: 2, severe: 3 };
    let risk = await this.classifyTextRisk(opts.text, { scene, userId: opts.userId, dataId: opts.contentId });
    if (risk.verdict !== "severe" && opts.images) {
      const imgRisk = await this.classifyImageRisk(opts.images, { scene, userId: opts.userId, dataId: opts.contentId });
      if (rank[imgRisk.verdict] > rank[risk.verdict]) risk = imgRisk;
    }

    if (risk.verdict === "pass") return;

    if (risk.verdict === "uncertain") {
      // 拿不准 → 登记 admin 人工复审队列（POST_PUBLISH·内容保持可见·用户无感知）
      await this.prisma.contentAuditRecord
        .create({
          data: {
            contentType: opts.contentType,
            contentId: opts.contentId,
            circleId: opts.circleId || null,
            submitterId: opts.userId,
            auditMode: "POST_PUBLISH",
            machineStatus: "PENDING",
            machineResult: JSON.stringify({ verdict: "uncertain", category: risk.category ?? null }),
            machineAuditAt: new Date(),
            machineAuditBy: "SYSTEM",
          },
        })
        .catch((err) => this.logger.error(`后审人工复审登记失败 [${opts.contentType}:${opts.contentId}]`, err instanceof Error ? err.stack : err));
      return;
    }

    await this.applyModerationVerdict(opts.contentType, opts.contentId, risk.verdict, risk.category, "SYSTEM");
  }

  /**
   * 分级处置执行器（机审与 admin 人工改判共用）：
   * - mild   → visibility=SELF_ONLY（作者可见带标识·他人/公共流不可见）+ 温和站内信（附申诉指引）
   * - severe → VIDEO status=REJECTED / COURSE 软删 deletedAt+REJECTED / LIVE auditStatus=REJECTED+结束 + 站内信（附原因类别）
   * 原状态存 AuditLog.rollbackData 供申诉恢复。
   */
  async applyModerationVerdict(
    contentType: PostPublishContentType,
    contentId: string,
    verdict: "mild" | "severe",
    category?: string,
    operator = "SYSTEM",
  ): Promise<void> {
    const target = AuditService.POST_PUBLISH_TARGETS[contentType];
    const delegate = this.prisma[target.model] as unknown as {
      findUnique: (args: unknown) => Promise<Record<string, any> | null>;
      update: (args: unknown) => Promise<unknown>;
    };
    const row = await delegate.findUnique({ where: { id: contentId } });
    if (!row) return; // 内容已被删除，无需处置

    const reason = verdict === "mild" ? `轻度违规:${category || "敏感内容"}` : `严重违规:${category || "违规内容"}`;
    const data: Record<string, unknown> = {};
    if (verdict === "mild") {
      data.visibility = "SELF_ONLY";
      if (contentType !== "COURSE") data.auditReason = reason; // Course 无 auditReason 列
    } else {
      if (contentType === "VIDEO") Object.assign(data, { status: "REJECTED", auditStatus: "REJECTED", auditReason: reason });
      else if (contentType === "COURSE") Object.assign(data, { deletedAt: new Date(), auditStatus: "REJECTED" });
      else Object.assign(data, { auditStatus: "REJECTED", auditReason: reason, ...(row.status === "WAITING" || row.status === "LIVING" ? { status: "ENDED", endTime: new Date() } : {}) });
    }

    await delegate.update({ where: { id: contentId }, data });
    await Promise.all([
      ...target.cachePatterns.map((p) => this.redis.delByPattern(p)),
      this.redis.del(target.detailKey(contentId)),
    ]).catch(() => undefined);

    await this.log({
      userId: row.userId,
      executor: operator,
      action: verdict === "mild" ? "CONTENT_DEMOTE_SELF_ONLY" : "CONTENT_REMOVE_VIOLATION",
      targetType: contentType,
      targetId: contentId,
      detail: JSON.stringify({ verdict, category: category ?? null }),
      rollbackData: { visibility: row.visibility, status: row.status ?? null, auditStatus: row.auditStatus ?? null, deletedAt: row.deletedAt ?? null },
    }).catch((err) => this.logger.warn("处置审计日志写入失败", err));

    // 站内信（文案温和·附申诉入口；发送失败不影响处置结果）
    const title = String(row.title || "").slice(0, 30) || target.typeName;
    await this.prisma.notification
      .create({
        data: {
          userId: row.userId,
          type: "AUDIT",
          title: verdict === "mild" ? "内容可见范围调整通知" : "内容下架通知",
          content:
            verdict === "mild"
              ? `您发布的${target.typeName}「${title}」经系统复核，暂时调整为仅自己可见，不影响您查看和管理。如有疑问，请联系客服申诉，我们会尽快为您复核。`
              : `您发布的${target.typeName}「${title}」因涉及${category || "违规内容"}已被下架。如有疑问，请联系客服申诉。`,
          targetType: contentType,
          targetId: contentId,
        },
      })
      .catch((err) => this.logger.warn(`处置通知发送失败 [${contentType}:${contentId}]`, err));
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
   * - instantPublish=true（审核无感化·短视频/课程/直播先发后审）→ 一律 APPROVED 立即可见，机审走 queueContentModeration 异步分级处置
   */
  async resolveContentVisibility(opts: {
    visibility?: string;
    circleId?: string | null;
    isAdmin?: boolean;
    instantPublish?: boolean;
  }): Promise<{ visibility: ContentVisibility; auditStatus: "APPROVED" | "PENDING" }> {
    const visibility: ContentVisibility = opts.visibility === "PLATFORM" ? "PLATFORM" : "CIRCLE_ONLY";
    if (visibility === "CIRCLE_ONLY" || opts.isAdmin || opts.instantPublish) return { visibility, auditStatus: "APPROVED" };
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

    // 审核无感化（第八节）：三类先发后审内容的人工改判驳回 = 轻度违规处置（降 SELF_ONLY + 温和站内信）
    // 严重违规已由机审直接下架，人工队列里的是「拿不准」样本，改判从轻。ARTICLE/POST 维持原有语义。
    if (!approved && (["VIDEO", "COURSE", "LIVE"] as string[]).includes(record.contentType)) {
      await this.applyModerationVerdict(
        record.contentType as PostPublishContentType,
        record.contentId,
        "mild",
        rejectReason ?? undefined,
        auditorId,
      ).catch((err) => this.logger.error(`人工改判处置失败 [${record.contentType}:${record.contentId}]`, err instanceof Error ? err.stack : err));
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
