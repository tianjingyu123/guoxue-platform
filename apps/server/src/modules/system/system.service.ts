import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AuditService } from "../audit/audit.service";

const CONFIG_CACHE_TTL = 3600; // 1小时
const CONFIG_CACHE_PREFIX = "sys:config:";

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private audit: AuditService,
  ) {}

  async getAllConfigs() {
    const cached = await this.redis.getJson<any[]>(CONFIG_CACHE_PREFIX + "all");
    if (cached) return cached;

    const configs = await this.prisma.configSystem.findMany({
      orderBy: { configKey: "asc" },
    });
    await this.redis.setJson(CONFIG_CACHE_PREFIX + "all", configs, CONFIG_CACHE_TTL);
    return configs;
  }

  async getConfig(key: string) {
    const cached = await this.redis.getJson<any>(CONFIG_CACHE_PREFIX + key);
    if (cached !== null) return cached;

    const config = await this.prisma.configSystem.findUnique({ where: { configKey: key } });
    if (config) {
      await this.redis.setJson(CONFIG_CACHE_PREFIX + key, config, CONFIG_CACHE_TTL);
    }
    return config;
  }

  async setConfig(key: string, value: string, description?: string, updatedBy?: string) {
    const result = await this.prisma.configSystem.upsert({
      where: { configKey: key },
      create: { configKey: key, configValue: value, description, updatedBy },
      update: { configValue: value, description, updatedBy },
    });
    // 失效缓存
    await this.redis.del(CONFIG_CACHE_PREFIX + key);
    await this.redis.del(CONFIG_CACHE_PREFIX + "all");
    return result;
  }

  async deleteConfig(key: string) {
    const result = await this.prisma.configSystem.delete({ where: { configKey: key } });
    await this.redis.del(CONFIG_CACHE_PREFIX + key);
    await this.redis.del(CONFIG_CACHE_PREFIX + "all");
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

  // ── 审计日志（委托给 AuditService）──

  async logAudit(data: {
    userId?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    detail?: string;
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

  // ── 健康检查 ──

  async healthCheck() {
    const checks: Record<string, boolean> = {};
    try { await this.prisma.$queryRaw`SELECT 1`; checks.database = true; } catch { checks.database = false; }
    try { await this.redis.get("health:check"); checks.redis = true; } catch { checks.redis = false; }

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
  async getSiteNotices(page: number, pageSize: number) {
    this.logger.log(`查询全站公告: page=${page}, pageSize=${pageSize}`);
    const [records, total] = await Promise.all([
      this.prisma.siteNotice.findMany({
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
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
    await this.prisma.siteNotice.delete({ where: { id } });
    return { success: true };
  }

  // ───────── 配置版本管理 ─────────

  /** 查询配置历史版本 */
  async getConfigVersions(configKey: string, page: number, pageSize: number) {
    this.logger.log(`查询配置历史版本: configKey=${configKey}`);
    const [records, total] = await Promise.all([
      this.prisma.configVersion.findMany({
        where: { configKey },
        orderBy: { version: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.configVersion.count({ where: { configKey } }),
    ]);

    return {
      items: records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 回滚配置到指定版本 */
  async rollbackConfig(configKey: string, version: number) {
    this.logger.log(`回滚配置: configKey=${configKey}, version=${version}`);
    const versionRecord = await this.prisma.configVersion.findFirst({
      where: { configKey, version },
    });
    if (!versionRecord) {
      throw new NotFoundException(`配置版本不存在: ${configKey}@v${version}`);
    }

    const value = versionRecord.value;
    // 将快照值写回系统配置表（JSONB → String）
    const rollbackValue = typeof value === "string" ? value : JSON.stringify(value);
    await this.setConfig(configKey, rollbackValue, `回滚到版本 v${version}`);

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
      throw new NotFoundException("配置版本不存在");
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
}
