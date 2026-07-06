import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ModerationService } from "./moderation.service";
import { ModerationAiService } from "./moderation-ai.service";
import { SensitiveWordService } from "./sensitive-word.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private prisma: PrismaService,
    private moderation: ModerationService,
    private moderationAi: ModerationAiService,
    private sensitiveWord: SensitiveWordService,
  ) {}

  log(params: {
    userId?: string;
    executor?: string;
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
