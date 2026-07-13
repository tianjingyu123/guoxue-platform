import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AuditService } from "../audit/audit.service";
import { ThirdPartyConfigLoader } from "./third-party-config.loader";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

const CONFIG_CACHE_TTL = 3600; // 1小时
const CONFIG_CACHE_PREFIX = "sys:config:";

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private audit: AuditService,
    private thirdParty: ThirdPartyConfigLoader,
  ) {}

  async getAllConfigs() {
    const cached = await this.redis.getJson<any[]>(CONFIG_CACHE_PREFIX + "all");
    const configs = cached ?? await this.prisma.configSystem.findMany({ orderBy: { configKey: "asc" } });
    if (!cached) await this.redis.setJson(CONFIG_CACHE_PREFIX + "all", configs, CONFIG_CACHE_TTL);
    // 第三方密钥：解密 + 敏感字段掩码后返回（明文不出后端；缓存里存的仍是密文）
    return configs.map((c: any) =>
      this.thirdParty.isThirdPartyKey(c.configKey)
        ? { ...c, configValue: this.thirdParty.buildDisplayValue(c.configKey, c.configValue) }
        : c,
    );
  }

  async getConfig(key: string) {
    const cached = await this.redis.getJson<any>(CONFIG_CACHE_PREFIX + key);
    let config = cached;
    if (cached === null || cached === undefined) {
      config = await this.prisma.configSystem.findUnique({ where: { configKey: key } });
      if (config) await this.redis.setJson(CONFIG_CACHE_PREFIX + key, config, CONFIG_CACHE_TTL);
    }
    if (config && this.thirdParty.isThirdPartyKey(key)) {
      return { ...config, configValue: this.thirdParty.buildDisplayValue(key, config.configValue) };
    }
    return config;
  }

  /**
   * 前端 UI 运营配置（公开只读·P1 运营配置最小闭环）。
   * 从 ConfigSystem 读取 UI 相关键，缺省用默认值，保证前端永不拿到空配置。
   * 后台改 ConfigSystem 对应键即前端生效（配置驱动展示）。
   */
  async getUiConfig() {
    const readNum = async (key: string, def: number): Promise<number> => {
      try {
        const row = await this.getConfig(key);
        const n = Number((row as { configValue?: string } | null)?.configValue);
        return Number.isFinite(n) && n > 0 ? n : def;
      } catch {
        return def;
      }
    };
    const readJson = async <T>(key: string, def: T): Promise<T> => {
      try {
        const row = await this.getConfig(key);
        const raw = (row as { configValue?: string } | null)?.configValue;
        return raw ? (JSON.parse(raw) as T) : def;
      } catch {
        return def;
      }
    };
    const [bigCardInterval, agentCardColors] = await Promise.all([
      readNum("home.bigCardInterval", 6),
      readJson<Record<string, string>>("agent_card.categoryColors", {
        文案生成: "g-copy",
        分析报告: "g-analyze",
        古籍查询: "g-classic",
        办公效率: "g-office",
      }),
    ]);
    return { home: { bigCardInterval }, agentCard: { categoryColors: agentCardColors } };
  }

  async setConfig(key: string, value: string, description?: string, updatedBy?: string) {
    // 第三方密钥：merge（掩码/空字段不覆盖原值）+ 加密存储
    const storedValue = this.thirdParty.isThirdPartyKey(key)
      ? await this.thirdParty.buildStoredValue(key, value)
      : value;
    const result = await this.prisma.configSystem.upsert({
      where: { configKey: key },
      create: { configKey: key, configValue: storedValue, description, updatedBy },
      update: { configValue: storedValue, description, updatedBy },
    });
    // 失效缓存
    await this.redis.del(CONFIG_CACHE_PREFIX + key);
    await this.redis.del(CONFIG_CACHE_PREFIX + "all");
    // 第三方密钥：保存后立即同步到 process.env（热生效，无需重启）
    if (this.thirdParty.isThirdPartyKey(key)) {
      await this.thirdParty.syncToEnv();
    }
    return result;
  }

  async deleteConfig(key: string) {
    const existing = await this.prisma.configSystem.findUnique({ where: { configKey: key } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "配置项不存在");
    const result = await this.prisma.configSystem.delete({ where: { configKey: key } });
    await this.redis.del(CONFIG_CACHE_PREFIX + key);
    await this.redis.del(CONFIG_CACHE_PREFIX + "all");
    return result;
  }

  // ───────── 品牌配置（租-T0 品牌抽象·单行表） ─────────

  /** 品牌配置内置默认值（未在后台配置过时返回·与现状"热卜"口径一致，保证不破坏现状） */
  private static readonly DEFAULT_BRAND_CONFIG = {
    id: "default",
    siteName: "热卜国学",
    siteNameShort: "热卜",
    siteNameEn: "REBU",
    slogan: "探寻东方智慧",
    sloganAlt: "观天地 · 明心性",
    tagline: "国学知识平台",
    copyright: "热卜国学 · 让国学回归生活",
    qrGuide: "长按识别 · 开启国学之旅",
    logoUrl: "",
    primaryColor: "#c41e3a",
    domain: "api.rebugx.cn",
    h5Url: "https://api.rebugx.cn/h5/",
    servicePhone: "",
    serviceEmail: "",
    serviceWechat: "",
    companyName: "",
    platformName: "热卜国学",
    websiteUrl: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
  };

  /** 公开：获取品牌配置（全端品牌露出的唯一来源·无记录时返回内置默认值） */
  async getBrandConfig() {
    // H5 支付通道开关（pay_h5_provider）：
    //   'urllink'=外部浏览器生成小程序 url_link 唤起 pay-relay 中转页走 JSAPI（直连H5被驳回的自建路径）
    //   'huifu'  =走汇付聚合 H5
    //   其它/未配 =直连微信 H5 兜底（默认 direct）
    // 单独读取、不进品牌缓存 → 后台切换即时生效；前端启动拉 brand-config 时一并拿到。
    const flagRow = await this.getConfig("pay_h5_provider");
    const flagVal = flagRow?.configValue;
    const payH5Provider = flagVal === "urllink" || flagVal === "huifu" ? flagVal : "direct";
    const cached = await this.redis.getJson<Record<string, string>>(CONFIG_CACHE_PREFIX + "brand");
    if (cached) return { ...cached, payH5Provider };
    const row = await this.prisma.brandConfig.findUnique({ where: { id: "default" } });
    // merge 默认值：将来新增字段时旧记录也能拿到兜底值
    const result = { ...SystemService.DEFAULT_BRAND_CONFIG, ...(row ?? {}) };
    await this.redis.setJson(CONFIG_CACHE_PREFIX + "brand", result, CONFIG_CACHE_TTL);
    return { ...result, payH5Provider };
  }

  /** 管理端：更新品牌配置（只更新传入字段·改一处配置全端生效） */
  async updateBrandConfig(dto: Record<string, string | undefined>, updatedBy?: string) {
    // 剔除 undefined，避免覆盖未传字段
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (typeof v === "string") data[k] = v.trim();
    }
    const result = await this.prisma.brandConfig.upsert({
      where: { id: "default" },
      create: { id: "default", ...data, updatedBy },
      update: { ...data, updatedBy },
    });
    await this.redis.del(CONFIG_CACHE_PREFIX + "brand");
    return result;
  }

  /** 获取多个公开配置（供前端/移动端使用） */
  async getPublicConfigs(keys: string[]) {
    const configs = await this.prisma.configSystem.findMany({
      where: { configKey: { in: keys } },
    });
    const map: Record<string, string> = {};
    configs.forEach((c) => (map[c.configKey] = c.configValue));
    return map;
  }

  /** 公开：获取首页 Banner */
  async getPublicBanners() {
    const config = await this.getConfig("home_banners");
    if (!config) return { banners: [] };
    try {
      return { banners: JSON.parse(config.configValue) };
    } catch (err) {
      this.logger.warn(`首页Banner JSON 解析失败`, err);
      return { banners: [] };
    }
  }

  /** 公开：获取首页布局配置 */
  async getHomeConfig() {
    const keys = ["home:layout", "home:paipan_slot", "home:featured_tags"];
    const results = await Promise.all(keys.map((k) => this.getConfig(k)));

    const parseValue = (config: { configValue: string } | null, defaultValue: string) => {
      if (!config) return defaultValue;
      try { return JSON.parse(config.configValue); } catch (_err) { return config.configValue; }
    };

    return {
      layout: parseValue(results[0], "default"),
      paipanSlot: Number(parseValue(results[1], "6")),
      featuredTags: parseValue(results[2], "[]"),
    };
  }

  // ── 审计日志（委托给 AuditService）──

  async logAudit(data: {
    userId?: string;
    /** 执行者标识："CLAUDE"（数字员工）| 用户ID/人名 —— 缺省时 AuditService 回退 userId/SYSTEM */
    executor?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    detail?: string;
    /** 关键操作回滚快照（配置改动/下架/退款类）— admin 可据此一键撤销 */
    rollbackData?: Record<string, any>;
    ip?: string;
  }) {
    return this.audit.log(data);
  }

  async getAuditLogs(params: {
    page: number;
    pageSize: number;
    action?: string;
    userId?: string;
    targetType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.audit.list(params);
  }

  async getAuditActions() {
    const rows = await this.audit.getActions();
    return rows.map((a) => a.action);
  }

  // ── 操作回滚 ──

  /** 获取可回滚的审计日志列表 */
  async getRollbackableLogs(params: { page: number; pageSize: number; targetType?: string; targetId?: string }) {
    return this.audit.listRollbackable(params);
  }

  /** 预览回滚数据 */
  async previewRollback(logId: string) {
    const log = await this.audit.getLogWithRollback(logId);
    return {
      logId: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      executor: log.executor,
      createdAt: log.createdAt,
      rollbackSnapshot: log.rollbackData,
    };
  }

  /** 执行回滚 — 记录回滚操作 */
  async executeRollback(logId: string, operator: string) {
    const log = await this.audit.getLogWithRollback(logId);
    this.logger.log(`回滚操作: logId=${logId}, action=${log.action}, operator=${operator}`);

    // 记录回滚审计
    await this.audit.log({
      executor: operator,
      action: `rollback.${log.action}`,
      targetType: log.targetType || undefined,
      targetId: log.targetId || undefined,
      detail: `回滚操作 ${log.action} (原审计ID: ${logId})，快照数据: ${JSON.stringify(log.rollbackData)}`,
    });

    return {
      success: true,
      rollbackedLogId: logId,
      originalAction: log.action,
      snapshot: log.rollbackData,
      message: "回滚已记录。具体业务数据恢复需由对应模块处理。",
    };
  }

  // ── 健康检查 ──

  async healthCheck() {
    const checks: Record<string, boolean> = {};
    try { await this.prisma.$queryRaw`SELECT 1`; checks.database = true; } catch (_err) { checks.database = false; }
    try { await this.redis.get("health:check"); checks.redis = true; } catch (_err) { checks.redis = false; }

    const allHealthy = Object.values(checks).every(Boolean);
    return {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  // ── 维护模式 ──

  async isMaintenanceMode(): Promise<boolean> {
    const cfg = await this.getConfig("maintenance_mode");
    return cfg?.configValue === "true";
  }

  async toggleMaintenance(enabled: boolean) {
    await this.setConfig("maintenance_mode", enabled ? "true" : "false", "维护模式开关");
    return { maintenanceMode: enabled };
  }

  // ── 自动化开关 ──

  async isAutomationEnabled(): Promise<boolean> {
    const cfg = await this.getConfig("automation_enabled");
    // 默认开启（不存在配置时视为开启）
    return cfg?.configValue !== "false";
  }

  async toggleAutomation(enabled: boolean, operator: string) {
    await this.setConfig("automation_enabled", enabled ? "true" : "false", `自动化开关 — ${operator}`);
    const status = enabled ? "已开启" : "已关闭（Claude 权限降为只读）";
    await this.audit.log({
      userId: operator,
      action: enabled ? "automation.enabled" : "automation.disabled",
      targetType: "system",
      targetId: "automation",
      detail: `自动化开关由 ${operator} ${status}`,
    });
    return { automationEnabled: enabled, operator, status };
  }

  // ── 带回滚的配置变更 + 一键回滚（治理护栏 §2.3 · 验收标准三）──

  /**
   * 改配置并写"可回滚"审计快照（自动化 L2/L3 改配置的标准入口）。
   * rollbackData 存 { kind:"config", key, previousValue, previousExists }，
   * 之后可经 rollbackAudit 一键还原。
   *
   * @param executor    执行者（"CLAUDE" 或用户ID/人名）
   * @param autonomyLevel 该动作的自主档位 L2/L3（供审计留痕，见 autonomy.ts）
   */
  async setConfigWithRollback(
    key: string,
    value: string,
    description: string,
    executor: string,
    autonomyLevel?: string,
  ) {
    const prev = await this.prisma.configSystem.findUnique({ where: { configKey: key } });
    const previousExists = !!prev;
    const previousValue = prev?.configValue ?? null;

    await this.setConfig(key, value, description, executor);

    const audit = await this.audit.log({
      executor,
      autonomyLevel,
      action: "config.change",
      targetType: "config",
      targetId: key,
      detail: `配置 ${key} 由 ${executor} 改为「${value}」${previousExists ? `（原值「${previousValue}」）` : "（新建）"}`,
      rollbackData: { kind: "config", key, previousValue, previousExists },
    });

    return { key, value, previousValue, auditId: audit.id };
  }

  /**
   * 一键回滚：读审计快照，按 kind 反向还原。当前支持 kind="config"。
   * 回滚本身是真人纠错动作（SUPER_ADMIN），再落一条 automation.rollback 审计。
   * 不支持的动作类型抛 ROLLBACK_NOT_AVAILABLE。
   */
  async rollbackAudit(auditId: string, operator: string) {
    const log = await this.audit.getLogWithRollback(auditId); // 无快照即抛
    const data = log.rollbackData as { kind?: string; key?: string; previousValue?: string | null; previousExists?: boolean } | null;

    if (!data || data.kind !== "config" || !data.key) {
      throw new BusinessException(
        ErrorCode.ROLLBACK_NOT_AVAILABLE,
        `审计 ${auditId} 的动作类型「${data?.kind ?? "未知"}」暂不支持自动回滚`,
      );
    }

    if (data.previousExists === false) {
      // 原本不存在 → 回滚 = 删除该配置
      await this.prisma.configSystem.deleteMany({ where: { configKey: data.key } });
      await this.redis.del(CONFIG_CACHE_PREFIX + data.key);
      await this.redis.del(CONFIG_CACHE_PREFIX + "all");
    } else {
      await this.setConfig(data.key, data.previousValue ?? "", `回滚 — ${operator}`, operator);
    }

    await this.audit.log({
      userId: operator,
      action: "automation.rollback",
      targetType: "config",
      targetId: data.key,
      detail: `${operator} 回滚审计 ${auditId}：配置 ${data.key} 还原为「${data.previousExists === false ? "(删除)" : data.previousValue}」`,
    });

    return { rolledBack: true, auditId, key: data.key, restoredValue: data.previousExists === false ? null : data.previousValue };
  }

  /** 可回滚操作列表（透传 audit.listRollbackable，供后台"一键回滚"面板） */
  async listRollbackable(params: { targetType?: string; targetId?: string; page?: number; pageSize?: number }) {
    return this.audit.listRollbackable(params);
  }

  // ───────── 页面文案配置 ─────────

  /** 获取页面文案配置 */
  async getPageContent(pageRoute: string) {
    this.logger.log(`查询页面文案配置: pageRoute=${pageRoute}`);
    const configs = await this.prisma.pageContentConfig.findMany({
      where: { pageRoute },
    });
    const map: Record<string, string> = {};
    configs.forEach((c) => {
      map[c.fieldKey] = c.content;
    });
    return { pageRoute, fields: map };
  }

  /** 创建或更新页面文案 */
  async upsertPageContent(pageRoute: string, fieldKey: string, content: string) {
    this.logger.log(`更新页面文案: pageRoute=${pageRoute}, fieldKey=${fieldKey}`);
    return this.prisma.pageContentConfig.upsert({
      where: { pageRoute_fieldKey: { pageRoute, fieldKey } },
      create: { pageRoute, fieldKey, content },
      update: { content },
    });
  }

  // ───────── 全站弹窗公告 ─────────

  /** 创建全站公告 */
  async createSiteNotice(dto: {
    title: string;
    content: string;
    type?: string;
    isActive?: boolean;
    startTime?: string;
    endTime?: string;
  }) {
    this.logger.log(`创建全站公告: title=${dto.title}`);
    return this.prisma.siteNotice.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type || "INFO",
        isActive: dto.isActive ?? true,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
      },
    });
  }

  /** 获取全站公告列表 */
  async getSiteNotices(rawPage: number, rawPageSize: number) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    this.logger.log(`查询全站公告: page=${page}, pageSize=${pageSize}`);
    const [records, total] = await Promise.all([
      this.prisma.siteNotice.findMany({
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
      this.prisma.siteNotice.count(),
    ]);

    return {
      items: records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 更新全站公告 */
  async updateSiteNotice(id: string, dto: {
    title?: string;
    content?: string;
    type?: string;
    isActive?: boolean;
    startTime?: string;
    endTime?: string;
  }) {
    this.logger.log(`更新全站公告: id=${id}`);
    const existing = await this.prisma.siteNotice.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "站内公告不存在");
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);

    return this.prisma.siteNotice.update({
      where: { id },
      data,
    });
  }

  /** 删除全站公告 */
  async deleteSiteNotice(id: string) {
    this.logger.log(`删除全站公告: id=${id}`);
    const existing = await this.prisma.siteNotice.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "站内公告不存在");
    await this.prisma.siteNotice.delete({ where: { id } });
    return { success: true };
  }

  // ───────── 配置版本管理 ─────────

  /** 查询配置历史版本 */
  async getConfigVersions(configKey: string | undefined, rawPage: number, rawPageSize: number) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    this.logger.log(`查询配置历史版本: configKey=${configKey}`);
    const where: Prisma.ConfigVersionWhereInput = {};
    if (configKey) where.configKey = configKey;

    const [records, total] = await Promise.all([
      this.prisma.configVersion.findMany({
        where,
        orderBy: { version: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.configVersion.count({ where }),
    ]);

    return {
      items: records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 获取单个配置版本详情 */
  async getConfigVersion(id: string) {
    const record = await this.prisma.configVersion.findUnique({ where: { id } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "配置版本不存在");
    return { configValue: record.value, ...record };
  }

  /** 回滚配置到指定版本 */
  async rollbackConfig(configKey: string, version: number, operator?: string) {
    this.logger.log(`回滚配置: configKey=${configKey}, version=${version}`);
    const versionRecord = await this.prisma.configVersion.findFirst({
      where: { configKey, version },
    });
    if (!versionRecord) {
      throw new BusinessException(ErrorCode.NOT_FOUND, `配置版本不存在: ${configKey}@v${version}`);
    }

    const value = versionRecord.value;
    const rollbackValue = typeof value === "string" ? value : JSON.stringify(value);
    await this.setConfig(configKey, rollbackValue, `回滚到版本 v${version}`);

    await this.audit.log({
      action: "config.rollback",
      targetType: "config",
      targetId: configKey,
      detail: `回滚到版本 v${version}，操作人: ${operator || "SYSTEM"}`,
      executor: operator || "SYSTEM",
    });

    return { success: true, configKey, rolledBackTo: version };
  }

  /** 获取两个配置版本的差异 */
  async getConfigDiff(configKey: string, version1: number, version2: number) {
    this.logger.log(`获取配置版本差异: configKey=${configKey}, v${version1} vs v${version2}`);
    const [v1, v2] = await Promise.all([
      this.prisma.configVersion.findFirst({ where: { configKey, version: version1 } }),
      this.prisma.configVersion.findFirst({ where: { configKey, version: version2 } }),
    ]);

    if (!v1 || !v2) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "配置版本不存在");
    }

    return {
      configKey,
      version1: {
        version: v1.version,
        value: v1.value,
        changedBy: v1.changedBy,
        comment: v1.comment,
        createdAt: v1.createdAt,
      },
      version2: {
        version: v2.version,
        value: v2.value,
        changedBy: v2.changedBy,
        comment: v2.comment,
        createdAt: v2.createdAt,
      },
      isDifferent: JSON.stringify(v1.value) !== JSON.stringify(v2.value),
    };
  }

  // ── Cron Webhook ──

  /** 验证 Cron Webhook 密钥 */
  validateCronSecret(secret?: string): void {
    const configured = process.env.CRON_WEBHOOK_SECRET;
    if (!configured) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "Cron Webhook 未配置密钥");
    }
    if (configured !== secret) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "Cron Webhook 密钥无效");
    }
  }

  /** 执行定时任务 */
  async executeCronJob(jobName: string) {
    const startTime = Date.now();
    this.logger.log(`Cron 任务触发: ${jobName}`);

    try {
      let result: any;
      switch (jobName) {
        case "health_check":
          result = await this.healthCheck();
          break;
        case "daily_report":
          result = await this.generateDailyReport();
          break;
        case "content_audit":
          result = await this.autoAuditContent();
          break;
        case "user_growth":
          result = await this.analyzeUserGrowth();
          break;
        case "feedback_process":
          result = await this.processFeedback();
          break;
        case "db_backup_check":
          result = await this.checkDbBackup();
          break;
        default:
          throw new BusinessException(ErrorCode.NOT_FOUND, `未知的定时任务: ${jobName}`);
      }

      await this.prisma.operationLog.create({
        data: {
          action: `cron.${jobName}`,
          targetType: "cron",
          targetId: jobName,
          detail: { duration: Date.now() - startTime, result } as any,
        },
      });

      this.logger.log(`Cron 任务完成: ${jobName}, ${Date.now() - startTime}ms`);
      return { ok: true, job: jobName, duration: Date.now() - startTime, result };
    } catch (err: any) {
      this.logger.error(`Cron 任务失败: ${jobName}`, err.message);
      await this.prisma.operationLog.create({
        data: {
          action: `cron.${jobName}.error`,
          targetType: "cron",
          targetId: jobName,
          detail: { error: err.message, duration: Date.now() - startTime } as any,
        },
      });
      throw err;
    }
  }

  /** 获取最近定时任务执行记录 */
  async getRecentCronJobs(limit: number) {
    return this.prisma.operationLog.findMany({
      where: { action: { startsWith: "cron." } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  // ── 后台定时任务 ──

  private async generateDailyReport() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 86400000);

    const [
      newUsers, activeUsers, newOrders, newContents,
      totalRevenue, pendingReports, pendingWithdrawals,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.userBehavior.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.order.count({ where: { createdAt: { gte: yesterday, lt: today }, status: "PAID" } }),
      this.prisma.content.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: yesterday, lt: today }, status: "PAID" }, _sum: { amount: true } }),
      this.prisma.report.count({ where: { status: "PENDING" } }),
      this.prisma.withdrawal.count({ where: { status: "PENDING" } }),
    ]);

    const report = {
      date: yesterday.toISOString().split("T")[0],
      newUsers,
      activeUsers,
      newOrders,
      newContents,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingReports,
      pendingWithdrawals,
    };

    return report;
  }

  private async autoAuditContent() {
    const pendingContent = await this.prisma.content.findMany({
      where: { status: "PENDING" },
      take: 50,
      orderBy: { createdAt: "asc" },
    });

    let audited = 0;
    for (const content of pendingContent) {
      try {
        const passed = await this.quickContentCheck(content.title, content.body || "");
        await this.prisma.content.update({
          where: { id: content.id },
          data: { status: passed ? "PUBLISHED" : "REJECTED", auditReason: passed ? undefined : "自动审核不通过" },
        });
        audited++;
      } catch (_err) { /* 单条失败不中断整体 */ }
    }

    return { total: pendingContent.length, audited };
  }

  private async quickContentCheck(title: string, body: string): Promise<boolean> {
    const keywords = (await this.getConfig("audit_block_keywords"))?.configValue;
    if (keywords) {
      const blockList = keywords.split(",").map((k: string) => k.trim()).filter(Boolean);
      const text = title + body;
      if (blockList.some((k: string) => text.includes(k))) return false;
    }
    return true;
  }

  private async analyzeUserGrowth() {
    const now = new Date();
    const periods = [7, 30, 90];
    const growth: Record<string, number> = {};
    for (const days of periods) {
      const since = new Date(now.getTime() - days * 86400000);
      growth[`${days}d`] = await this.prisma.user.count({ where: { createdAt: { gte: since } } });
    }
    return growth;
  }

  private async processFeedback() {
    const pending = await this.prisma.report.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    let processed = 0;
    for (const report of pending) {
      try {
        await this.prisma.report.update({
          where: { id: report.id },
          data: { status: "PROCESSED", result: "自动处理", processedAt: new Date() },
        });
        processed++;
      } catch (_err) { /* 单条失败继续 */ }
    }

    return { total: pending.length, processed };
  }

  private async checkDbBackup() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { database: "ok" };
    } catch (err) {
      this.logger.warn(`数据库备份检查失败`, err);
      return { database: "error" };
    }
  }

  // ───────── 会员配置 ─────────

  /** 获取所有会员等级配置 */
  async getMemberConfigs() {
    this.logger.log("查询所有会员等级配置");
    return this.prisma.memberConfig.findMany({
      orderBy: { price: "asc" },
    });
  }

  /** 创建或更新会员等级配置 */
  async upsertMemberConfig(dto: {
    level: string;
    name: string;
    price: number;
    coinBonus?: number;
    benefits?: Record<string, unknown>;
    maxBorrowDays?: number;
    isActive?: boolean;
  }) {
    this.logger.log(`更新会员配置: level=${dto.level}`);
    return this.prisma.memberConfig.upsert({
      where: { level: dto.level },
      create: {
        level: dto.level,
        name: dto.name,
        price: dto.price,
        coinBonus: dto.coinBonus ?? 0,
        benefits: (dto.benefits || {}) as Prisma.InputJsonValue,
        maxBorrowDays: dto.maxBorrowDays ?? 30,
        isActive: dto.isActive ?? true,
      },
      update: {
        name: dto.name,
        price: dto.price,
        coinBonus: dto.coinBonus,
        benefits: dto.benefits as Prisma.InputJsonValue,
        maxBorrowDays: dto.maxBorrowDays,
        isActive: dto.isActive,
      },
    });
  }

  /** 更新会员等级配置 */
  async updateMemberConfig(id: string, dto: {
    name?: string;
    price?: number;
    coinBonus?: number;
    benefits?: Record<string, unknown>;
    maxBorrowDays?: number;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.memberConfig.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "会员配置不存在");
    const data: Prisma.MemberConfigUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.coinBonus !== undefined) data.coinBonus = dto.coinBonus;
    if (dto.benefits !== undefined) data.benefits = dto.benefits as Prisma.InputJsonValue;
    if (dto.maxBorrowDays !== undefined) data.maxBorrowDays = dto.maxBorrowDays;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.memberConfig.update({ where: { id }, data });
  }

  /** 删除会员等级配置 */
  async deleteMemberConfig(id: string) {
    const existing = await this.prisma.memberConfig.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "会员配置不存在");
    return this.prisma.memberConfig.delete({ where: { id } });
  }
}
