import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import {
  AbTestConfig,
  AbTestStatus,
  AbTestMetrics,
  AbTestAssignment,
  StrategyWeightOverride,
} from "../ab-test.dto";
import * as crypto from "crypto";

const CACHE_KEY = "recommend:ab:configs:v1";
const CACHE_TTL = 60;

@Injectable()
export class AbTestService {
  private readonly logger = new Logger(AbTestService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ── 用户分桶 ──

  /** 将用户分配到实验组/对照组。同一用户始终落入同一桶。 */
  assign(userId: string, experiment: AbTestConfig): AbTestAssignment {
    const hash = this.hashUserId(userId, experiment.id);
    const bucket = hash % 100;
    const group = bucket < experiment.experimentTraffic ? "experiment" : "control";
    return { experimentId: experiment.id, group, bucket };
  }

  /** 获取用户在当前活跃实验中应应用的策略覆写 */
  async getOverrides(userId: string): Promise<StrategyWeightOverride[]> {
    if (!userId) return [];

    const experiments = await this.getActiveExperiments();
    const overrides: StrategyWeightOverride[] = [];

    for (const exp of experiments) {
      const { group } = this.assign(userId, exp);
      const groupOverrides = group === "experiment" ? exp.experimentOverrides : exp.controlOverrides;
      overrides.push(...groupOverrides);
    }

    return overrides;
  }

  /** 获取用户所有实验的分配结果（供客户端日志上报用） */
  async getAssignments(userId: string): Promise<AbTestAssignment[]> {
    if (!userId) return [];
    const experiments = await this.getActiveExperiments();
    return experiments.map((exp) => this.assign(userId, exp));
  }

  // ── 实验管理 ──

  async create(dto: {
    name: string;
    description?: string;
    experimentTraffic?: number;
    experimentOverrides?: StrategyWeightOverride[];
    controlOverrides?: StrategyWeightOverride[];
  }): Promise<AbTestConfig> {
    const id = `ab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const config: AbTestConfig = {
      id,
      name: dto.name,
      description: dto.description ?? "",
      experimentTraffic: dto.experimentTraffic ?? 50,
      controlOverrides: dto.controlOverrides ?? [],
      experimentOverrides: dto.experimentOverrides ?? [],
      status: AbTestStatus.DRAFT,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdBy: "admin",
    };

    const configs = await this.loadConfigs();
    configs.push(config);
    await this.saveConfigs(configs);
    this.logger.log(`实验 ${config.name} (${config.id}) 已创建`);
    return config;
  }

  async update(
    experimentId: string,
    dto: { name?: string; description?: string; experimentTraffic?: number; status?: AbTestStatus; experimentOverrides?: StrategyWeightOverride[]; controlOverrides?: StrategyWeightOverride[] },
  ): Promise<AbTestConfig | null> {
    const configs = await this.loadConfigs();
    const idx = configs.findIndex((c) => c.id === experimentId);
    if (idx === -1) return null;

    const c = configs[idx];
    if (dto.name !== undefined) c.name = dto.name;
    if (dto.description !== undefined) c.description = dto.description;
    if (dto.experimentTraffic !== undefined) c.experimentTraffic = dto.experimentTraffic;
    if (dto.status !== undefined) c.status = dto.status;
    if (dto.experimentOverrides !== undefined) c.experimentOverrides = dto.experimentOverrides;
    if (dto.controlOverrides !== undefined) c.controlOverrides = dto.controlOverrides;

    await this.saveConfigs(configs);
    return c;
  }

  async remove(experimentId: string): Promise<boolean> {
    const configs = await this.loadConfigs();
    const idx = configs.findIndex((c) => c.id === experimentId);
    if (idx === -1) return false;
    configs.splice(idx, 1);
    await this.saveConfigs(configs);
    return true;
  }

  async list(): Promise<AbTestConfig[]> {
    return this.loadConfigs();
  }

  async get(experimentId: string): Promise<AbTestConfig | null> {
    const configs = await this.loadConfigs();
    return configs.find((c) => c.id === experimentId) ?? null;
  }

  /** 启动实验 */
  async start(experimentId: string): Promise<AbTestConfig | null> {
    return this.update(experimentId, { status: AbTestStatus.RUNNING });
  }

  /** 暂停实验 */
  async pause(experimentId: string): Promise<AbTestConfig | null> {
    return this.update(experimentId, { status: AbTestStatus.PAUSED });
  }

  /** 完成实验 */
  async complete(experimentId: string): Promise<AbTestConfig | null> {
    return this.update(experimentId, { status: AbTestStatus.COMPLETED });
  }

  // ── 效果指标 ──

  /** 计算 A/B 实验效果指标 */
  async getMetrics(experimentId: string): Promise<AbTestMetrics | null> {
    const experiment = await this.get(experimentId);
    if (!experiment) return null;

    // 从推荐日志中聚合实验期间的数据
    const since = new Date(experiment.startAt);
    const until = experiment.status === AbTestStatus.COMPLETED
      ? new Date(experiment.endAt)
      : new Date();

    const logs = await this.prisma.recommendLog.findMany({
      where: {
        createdAt: { gte: since, lte: until },
        recommendId: { contains: experimentId },
      },
      select: { isClick: true },
    });

    // 日志中包含实验标记的字段（recommendId 格式：rec_ts_ab{id}_{group}）
    // 简化：从 recommendId 解析分组
    const controlClicks = logs.filter((l) => l.isClick).length; // 简化处理
    const totalImpressions = logs.length;

    // 实际应区分 control/experiment 组，此处简化演示
    const metrics: AbTestMetrics = {
      experimentId,
      control: { impressions: 0, clicks: 0, ctr: 0 },
      experiment: { impressions: 0, clicks: 0, ctr: 0 },
      lift: 0,
      significant: false,
    };

    if (totalImpressions > 0) {
      const ctr = controlClicks / totalImpressions;
      metrics.control = { impressions: totalImpressions, clicks: controlClicks, ctr };
      metrics.significant = totalImpressions > 100 && Math.abs(ctr) > 0.01;
    }

    return metrics;
  }

  // ── 内部方法 ──

  private async getActiveExperiments(): Promise<AbTestConfig[]> {
    const configs = await this.loadConfigs();
    const now = new Date();
    return configs.filter(
      (c) =>
        c.status === AbTestStatus.RUNNING &&
        new Date(c.startAt) <= now &&
        new Date(c.endAt) >= now,
    );
  }

  private async loadConfigs(): Promise<AbTestConfig[]> {
    const cached = await this.redis.getJson<AbTestConfig[]>(CACHE_KEY);
    return cached ?? [];
  }

  private async saveConfigs(configs: AbTestConfig[]): Promise<void> {
    await this.redis.setJson(CACHE_KEY, configs, CACHE_TTL);
  }

  private hashUserId(userId: string, experimentId: string): number {
    const h = crypto.createHash("md5").update(`${experimentId}:${userId}`).digest();
    return h.readUInt32LE(0);
  }

  /** 自动生成所有已结束实验的汇总报告 */
  async generateReport(): Promise<{
    totalExperiments: number;
    runningCount: number;
    completedCount: number;
    experiments: Array<{ id: string; name: string; status: string; metrics: AbTestMetrics | null }>;
    generatedAt: string;
  }> {
    const all = await this.loadConfigs();
    const running = all.filter((c) => c.status === AbTestStatus.RUNNING);
    const completed = all.filter((c) => c.status === AbTestStatus.COMPLETED);

    const experiments = await Promise.all(
      all.map(async (exp) => {
        let metrics: AbTestMetrics | null = null;
        try {
          metrics = await this.getMetrics(exp.id);
        } catch (err) {
          this.logger.warn(`AB 测试指标计算失败: ${(err as Error).message}`);
        }
        return { id: exp.id, name: exp.name, status: exp.status, metrics };
      }),
    );

    const report = {
      totalExperiments: all.length,
      runningCount: running.length,
      completedCount: completed.length,
      experiments,
      generatedAt: new Date().toISOString(),
    };

    // 缓存1小时
    await this.redis.setJson("recommend:ab:report:v1", report, 3600);
    this.logger.log(`实验报告已生成: ${all.length} 个实验, ${running.length} 个运行中`);
    return report;
  }

  /** 获取最近一次生成的报告 */
  async getLatestReport() {
    return this.redis.getJson<any>("recommend:ab:report:v1");
  }
}
