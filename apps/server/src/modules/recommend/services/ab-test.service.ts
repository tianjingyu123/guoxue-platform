import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import {
  AbTestAssignment,
  AbTestConfig,
  AbTestMetrics,
  AbTestStatus,
  StrategyWeightOverride,
} from "../ab-test.dto";

const CONFIG_KEY = "recommend.ab.configs.v1";
const CACHE_KEY = "recommend:ab:configs:v2";
const LEGACY_CACHE_KEY = "recommend:ab:configs:v1";
const REPORT_CACHE_KEY = "recommend:ab:report:v1";
const CACHE_TTL = 60;
const DEFAULT_DURATION_MS = 7 * 86400000;

type AbTestPatch = {
  name?: string;
  description?: string;
  experimentTraffic?: number;
  status?: AbTestStatus;
  experimentOverrides?: StrategyWeightOverride[];
  controlOverrides?: StrategyWeightOverride[];
  startAt?: string;
  endAt?: string;
};

interface ConfigMutation<T> {
  configs: AbTestConfig[];
  result: T;
  changed: boolean;
}

export interface AbTestReport {
  totalExperiments: number;
  runningCount: number;
  completedCount: number;
  experiments: Array<{ id: string; name: string; status: string; metrics: AbTestMetrics | null }>;
  generatedAt: string;
}

@Injectable()
export class AbTestService {
  private readonly logger = new Logger(AbTestService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** 同一用户在同一实验中始终落入同一桶。 */
  assign(userId: string, experiment: AbTestConfig): AbTestAssignment {
    const hash = this.hashUserId(userId, experiment.id);
    const bucket = hash % 100;
    const group = bucket < experiment.experimentTraffic ? "experiment" : "control";
    return { experimentId: experiment.id, group, bucket };
  }

  async getOverrides(userId: string): Promise<StrategyWeightOverride[]> {
    if (!userId) return [];
    const experiments = await this.getActiveExperiments();
    const overrides: StrategyWeightOverride[] = [];
    for (const exp of experiments) {
      const { group } = this.assign(userId, exp);
      overrides.push(...(group === "experiment" ? exp.experimentOverrides : exp.controlOverrides));
    }
    return overrides;
  }

  async getAssignments(userId: string): Promise<AbTestAssignment[]> {
    if (!userId) return [];
    const experiments = await this.getActiveExperiments();
    return experiments.map((exp) => this.assign(userId, exp));
  }

  async create(dto: {
    name: string;
    description?: string;
    experimentTraffic?: number;
    experimentOverrides?: StrategyWeightOverride[];
    controlOverrides?: StrategyWeightOverride[];
  }): Promise<AbTestConfig> {
    const now = Date.now();
    const config: AbTestConfig = {
      id: `ab_${now}_${crypto.randomUUID().slice(0, 6)}`,
      name: dto.name,
      description: dto.description ?? "",
      experimentTraffic: dto.experimentTraffic ?? 50,
      controlOverrides: dto.controlOverrides ?? [],
      experimentOverrides: dto.experimentOverrides ?? [],
      status: AbTestStatus.DRAFT,
      startAt: new Date(now).toISOString(),
      endAt: new Date(now + DEFAULT_DURATION_MS).toISOString(),
      createdBy: "admin",
    };

    await this.mutateConfigs((configs) => {
      configs.push(config);
      return { configs, result: config, changed: true };
    });
    this.logger.log(`实验 ${config.name} (${config.id}) 已创建`);
    return config;
  }

  async update(experimentId: string, dto: AbTestPatch): Promise<AbTestConfig | null> {
    return this.mutateConfigs((configs) => {
      const current = configs.find((config) => config.id === experimentId);
      if (!current) return { configs, result: null, changed: false };
      if (dto.name !== undefined) current.name = dto.name;
      if (dto.description !== undefined) current.description = dto.description;
      if (dto.experimentTraffic !== undefined) current.experimentTraffic = dto.experimentTraffic;
      if (dto.status !== undefined) current.status = dto.status;
      if (dto.experimentOverrides !== undefined) current.experimentOverrides = dto.experimentOverrides;
      if (dto.controlOverrides !== undefined) current.controlOverrides = dto.controlOverrides;
      if (dto.startAt !== undefined) current.startAt = dto.startAt;
      if (dto.endAt !== undefined) current.endAt = dto.endAt;
      return { configs, result: current, changed: true };
    });
  }

  async remove(experimentId: string): Promise<boolean> {
    return this.mutateConfigs((configs) => {
      const index = configs.findIndex((config) => config.id === experimentId);
      if (index === -1) return { configs, result: false, changed: false };
      configs.splice(index, 1);
      return { configs, result: true, changed: true };
    });
  }

  async list(): Promise<AbTestConfig[]> {
    return this.loadConfigs();
  }

  async get(experimentId: string): Promise<AbTestConfig | null> {
    const configs = await this.loadConfigs();
    return configs.find((config) => config.id === experimentId) ?? null;
  }

  async start(experimentId: string): Promise<AbTestConfig | null> {
    const now = Date.now();
    return this.update(experimentId, {
      status: AbTestStatus.RUNNING,
      startAt: new Date(now).toISOString(),
      endAt: new Date(now + DEFAULT_DURATION_MS).toISOString(),
    });
  }

  async pause(experimentId: string): Promise<AbTestConfig | null> {
    return this.update(experimentId, { status: AbTestStatus.PAUSED });
  }

  async complete(experimentId: string): Promise<AbTestConfig | null> {
    return this.update(experimentId, {
      status: AbTestStatus.COMPLETED,
      endAt: new Date().toISOString(),
    });
  }

  /** 从真实曝光/点击日志计算两组 CTR、百分点变化与双比例显著性。 */
  async getMetrics(experimentId: string): Promise<AbTestMetrics | null> {
    const experiment = await this.get(experimentId);
    if (!experiment) return null;

    const since = new Date(experiment.startAt);
    const until = experiment.status === AbTestStatus.COMPLETED
      ? new Date(experiment.endAt)
      : new Date();
    const tokenPrefix = `ab:${experimentId}:`;
    const logs = await this.prisma.recommendLog.findMany({
      where: {
        createdAt: { gte: since, lte: until },
        strategy: { contains: tokenPrefix },
      },
      select: { strategy: true, isClick: true },
    });

    const controlToken = `${tokenPrefix}control`;
    const experimentToken = `${tokenPrefix}experiment`;
    const controlLogs = logs.filter((log) => log.strategy.split("|").includes(controlToken));
    const experimentLogs = logs.filter((log) => log.strategy.split("|").includes(experimentToken));
    const controlImpressions = controlLogs.filter((log) => !log.isClick).length;
    const controlClicks = controlLogs.filter((log) => log.isClick).length;
    const experimentImpressions = experimentLogs.filter((log) => !log.isClick).length;
    const experimentClicks = experimentLogs.filter((log) => log.isClick).length;
    const controlCtr = controlImpressions > 0 ? controlClicks / controlImpressions : 0;
    const experimentCtr = experimentImpressions > 0 ? experimentClicks / experimentImpressions : 0;

    return {
      experimentId,
      control: { impressions: controlImpressions, clicks: controlClicks, ctr: controlCtr },
      experiment: { impressions: experimentImpressions, clicks: experimentClicks, ctr: experimentCtr },
      // 管理端按“百分点”展示，因此 8%-5% 返回 3。
      lift: +((experimentCtr - controlCtr) * 100).toFixed(2),
      significant: this.isStatisticallySignificant(
        controlImpressions,
        controlClicks,
        experimentImpressions,
        experimentClicks,
      ),
    };
  }

  private async getActiveExperiments(): Promise<AbTestConfig[]> {
    let configs: AbTestConfig[];
    try {
      configs = await this.loadConfigs();
    } catch (err) {
      // 推荐主链 fail-open：配置中心故障时停用实验，不阻断用户获取推荐。
      this.logger.warn(`A/B 实验配置读取失败，已降级为无实验: ${(err as Error).message}`);
      return [];
    }
    const now = new Date();
    return configs.filter((config) =>
      config.status === AbTestStatus.RUNNING
      && new Date(config.startAt) <= now
      && new Date(config.endAt) >= now,
    );
  }

  private async loadConfigs(): Promise<AbTestConfig[]> {
    const cached = await this.redis.getJson<unknown>(CACHE_KEY).catch((err) => {
      this.logger.warn(`A/B 实验缓存读取失败: ${(err as Error).message}`);
      return null;
    });
    if (cached !== null) return this.validateConfigs(cached, CACHE_KEY);

    const row = await this.prisma.configSystem.findUnique({
      where: { configKey: CONFIG_KEY },
      select: { configValue: true },
    });
    if (row) {
      const configs = this.parseConfigs(row.configValue, CONFIG_KEY);
      await this.writeCache(configs);
      return configs;
    }

    // 从旧版 60 秒 Redis 临时配置迁移一次，避免部署瞬间丢失正在运行的实验。
    const legacy = await this.readLegacyConfigs();
    if (legacy.length > 0) {
      await this.prisma.configSystem.upsert({
        where: { configKey: CONFIG_KEY },
        create: this.configRow(legacy, "system:recommend-ab-migration"),
        update: this.configRow(legacy, "system:recommend-ab-migration"),
      });
    }
    await this.writeCache(legacy);
    return legacy;
  }

  private async mutateConfigs<T>(
    mutate: (configs: AbTestConfig[]) => ConfigMutation<T>,
  ): Promise<T> {
    const legacy = await this.readLegacyConfigs();
    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", CONFIG_KEY);
      const row = await tx.configSystem.findUnique({
        where: { configKey: CONFIG_KEY },
        select: { configValue: true },
      });
      const configs = row
        ? this.parseConfigs(row.configValue, CONFIG_KEY)
        : legacy.map((config) => ({ ...config }));
      const next = mutate(configs);
      if (next.changed) {
        await tx.configSystem.upsert({
          where: { configKey: CONFIG_KEY },
          create: this.configRow(next.configs, "system:recommend-ab"),
          update: this.configRow(next.configs, "system:recommend-ab"),
        });
      }
      return next;
    });

    if (outcome.changed) {
      // 先清旧推荐响应，再回填 A/B 配置缓存，避免通配符误删新配置。
      await this.redis.delByPattern("recommend:*:v2").catch((err) =>
        this.logger.warn(`推荐缓存失效失败: ${(err as Error).message}`),
      );
      await this.redis.del(REPORT_CACHE_KEY).catch(() => undefined);
      await this.writeCache(outcome.configs);
    }
    return outcome.result;
  }

  private configRow(configs: AbTestConfig[], updatedBy: string) {
    return {
      configKey: CONFIG_KEY,
      configValue: JSON.stringify(configs),
      description: "推荐 A/B 实验配置（持久化真源）",
      updatedBy,
    };
  }

  private async readLegacyConfigs(): Promise<AbTestConfig[]> {
    const legacy = await this.redis.getJson<unknown>(LEGACY_CACHE_KEY).catch(() => null);
    return legacy === null ? [] : this.validateConfigs(legacy, LEGACY_CACHE_KEY);
  }

  private async writeCache(configs: AbTestConfig[]): Promise<void> {
    await this.redis.setJson(CACHE_KEY, configs, CACHE_TTL).catch((err) =>
      this.logger.warn(`A/B 实验缓存写入失败: ${(err as Error).message}`),
    );
  }

  private parseConfigs(raw: string, source: string): AbTestConfig[] {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error(`${source} 不是合法 JSON，已拒绝覆盖`);
    }
    return this.validateConfigs(value, source);
  }

  private validateConfigs(value: unknown, source: string): AbTestConfig[] {
    if (!Array.isArray(value)) throw new Error(`${source} 必须是实验配置数组，已拒绝覆盖`);
    const statuses = new Set(Object.values(AbTestStatus));
    const valid = value.every((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const config = entry as Partial<AbTestConfig>;
      return typeof config.id === "string"
        && typeof config.name === "string"
        && typeof config.startAt === "string"
        && typeof config.endAt === "string"
        && typeof config.experimentTraffic === "number"
        && statuses.has(config.status as AbTestStatus)
        && Array.isArray(config.controlOverrides)
        && Array.isArray(config.experimentOverrides);
    });
    if (!valid) throw new Error(`${source} 含无效实验配置，已拒绝覆盖`);
    return value as AbTestConfig[];
  }

  private isStatisticallySignificant(
    controlImpressions: number,
    controlClicks: number,
    experimentImpressions: number,
    experimentClicks: number,
  ): boolean {
    // 小样本下正态近似会误导运营，双方至少 30 次真实曝光后才计算双比例 z 检验。
    if (controlImpressions < 30 || experimentImpressions < 30) return false;
    const pooled = (controlClicks + experimentClicks) / (controlImpressions + experimentImpressions);
    const variance = pooled * (1 - pooled)
      * (1 / controlImpressions + 1 / experimentImpressions);
    if (variance <= 0) return false;
    const controlCtr = controlClicks / controlImpressions;
    const experimentCtr = experimentClicks / experimentImpressions;
    return Math.abs(experimentCtr - controlCtr) / Math.sqrt(variance) >= 1.96;
  }

  private hashUserId(userId: string, experimentId: string): number {
    const hash = crypto.createHash("md5").update(`${experimentId}:${userId}`).digest();
    return hash.readUInt32LE(0);
  }

  async generateReport(): Promise<AbTestReport> {
    const all = await this.loadConfigs();
    const running = all.filter((config) => config.status === AbTestStatus.RUNNING);
    const completed = all.filter((config) => config.status === AbTestStatus.COMPLETED);
    const experiments = await Promise.all(all.map(async (experiment) => {
      let metrics: AbTestMetrics | null = null;
      try {
        metrics = await this.getMetrics(experiment.id);
      } catch (err) {
        this.logger.warn(`A/B 测试指标计算失败: ${(err as Error).message}`);
      }
      return { id: experiment.id, name: experiment.name, status: experiment.status, metrics };
    }));
    const report = {
      totalExperiments: all.length,
      runningCount: running.length,
      completedCount: completed.length,
      experiments,
      generatedAt: new Date().toISOString(),
    };
    await this.redis.setJson(REPORT_CACHE_KEY, report, 3600);
    this.logger.log(`实验报告已生成: ${all.length} 个实验, ${running.length} 个运行中`);
    return report;
  }

  async getLatestReport(): Promise<AbTestReport | null> {
    return this.redis.getJson<AbTestReport>(REPORT_CACHE_KEY);
  }
}
