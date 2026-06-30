import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface AiCapabilityDef {
  name: string;
  description: string;
  scene: string[];
  modality: string[];
  capabilityType: "generation" | "analysis" | "detection" | "recommendation";
  provider: string;
  model: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  costPerCall?: number;
}

export interface CapabilityFilters {
  scene?: string;
  modality?: string;
  capabilityType?: string;
  provider?: string;
  status?: string;
}

export interface CapabilityHealth {
  id: string;
  name: string;
  status: string;
  totalCalls: number;
  successRate: number;
  avgLatency: number;
  lastHealthCheck: Date | null;
}

/**
 * AI 能力注册中心
 *
 * 所有 AI 能力在一个地方注册、发现、调用。
 * 解决 AI 能力碎片化问题，新功能可以自动发现可用的 AI 能力。
 *
 * 使用方式：
 * - AI 模块启动时调用 register() 注册自身
 * - 调用方调用 discover() 查找可用的 AI 能力
 * - 通过 invoke() 统一调用，自动记录统计
 */
@Injectable()
export class CapabilityRegistryService {
  private readonly logger = new Logger(CapabilityRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 注册 AI 能力 */
  async register(capability: AiCapabilityDef): Promise<string> {
    const existing = await this.prisma.aiCapability.findUnique({
      where: { name: capability.name },
    });

    if (existing) {
      await this.prisma.aiCapability.update({
        where: { id: existing.id },
        data: {
          description: capability.description,
          scene: capability.scene,
          modality: capability.modality,
          capabilityType: capability.capabilityType,
          provider: capability.provider,
          model: capability.model,
          inputSchema: capability.inputSchema as any,
          outputSchema: capability.outputSchema as any,
          costPerCall: capability.costPerCall || 0,
          status: "active",
          updatedAt: new Date(),
        },
      });
      this.logger.log(`能力已更新: ${capability.name}`);
      return existing.id;
    }

    const created = await this.prisma.aiCapability.create({
      data: {
        name: capability.name,
        description: capability.description,
        scene: capability.scene,
        modality: capability.modality,
        capabilityType: capability.capabilityType,
        provider: capability.provider,
        model: capability.model,
        inputSchema: capability.inputSchema as any,
        outputSchema: capability.outputSchema as any,
        costPerCall: capability.costPerCall || 0,
      },
    });

    this.logger.log(`能力已注册: ${capability.name} (${created.id})`);
    return created.id;
  }

  /** 发现可用能力 */
  async discover(filters: CapabilityFilters = {}): Promise<AiCapabilityDef[]> {
    const where: Record<string, unknown> = { status: "active" };
    if (filters.scene) where.scene = { has: filters.scene };
    if (filters.modality) where.modality = { has: filters.modality };
    if (filters.capabilityType) where.capabilityType = filters.capabilityType;
    if (filters.provider) where.provider = filters.provider;

    const capabilities = await this.prisma.aiCapability.findMany({
      where: where as any,
      orderBy: { qualityScore: "desc" },
    });

    return capabilities.map((c) => ({
      name: c.name,
      description: c.description,
      scene: c.scene,
      modality: c.modality,
      capabilityType: c.capabilityType as AiCapabilityDef["capabilityType"],
      provider: c.provider,
      model: c.model,
      inputSchema: c.inputSchema as Record<string, unknown>,
      outputSchema: c.outputSchema as Record<string, unknown>,
      costPerCall: Number(c.costPerCall),
    }));
  }

  /** 按场景分组获取能力 */
  async discoverByScene(): Promise<Record<string, AiCapabilityDef[]>> {
    const all = await this.discover();
    const grouped: Record<string, AiCapabilityDef[]> = {};

    for (const cap of all) {
      for (const scene of cap.scene) {
        if (!grouped[scene]) grouped[scene] = [];
        grouped[scene].push(cap);
      }
    }

    return grouped;
  }

  /** 获取能力详情 */
  async getByName(name: string): Promise<AiCapabilityDef | null> {
    const c = await this.prisma.aiCapability.findUnique({
      where: { name },
    });
    if (!c) return null;

    return {
      name: c.name,
      description: c.description,
      scene: c.scene,
      modality: c.modality,
      capabilityType: c.capabilityType as AiCapabilityDef["capabilityType"],
      provider: c.provider,
      model: c.model,
      inputSchema: c.inputSchema as Record<string, unknown>,
      outputSchema: c.outputSchema as Record<string, unknown>,
      costPerCall: Number(c.costPerCall),
    };
  }

  /** 记录能力调用 */
  async recordCall(
    capabilityName: string,
    success: boolean,
    latencyMs: number,
  ): Promise<void> {
    await this.prisma.aiCapability.update({
      where: { name: capabilityName },
      data: {
        totalCalls: { increment: 1 },
        avgLatency: Math.round(latencyMs), // 简化：直接用最新延迟
        successRate: success ? undefined : undefined, // 由定期任务计算
        lastHealthCheck: new Date(),
      },
    });
  }

  /** 下线能力 */
  async setStatus(
    name: string,
    status: "active" | "degraded" | "offline",
  ): Promise<void> {
    await this.prisma.aiCapability.update({
      where: { name },
      data: { status, updatedAt: new Date() },
    });
    this.logger.warn(`能力状态变更: ${name} → ${status}`);
  }

  /** 健康检查（更新所有能力状态） */
  async healthCheck(): Promise<CapabilityHealth[]> {
    const capabilities = await this.prisma.aiCapability.findMany({
      where: { status: { not: "offline" } },
    });

    const results: CapabilityHealth[] = [];
    const now = new Date();

    for (const cap of capabilities) {
      // 超过24小时未调用，标记为降级
      const stale =
        !cap.lastHealthCheck ||
        now.getTime() - cap.lastHealthCheck.getTime() > 86400_000;

      if (stale && cap.status === "active") {
        await this.setStatus(cap.name, "degraded");
      }

      results.push({
        id: cap.id,
        name: cap.name,
        status: stale ? "degraded" : cap.status,
        totalCalls: cap.totalCalls,
        successRate: cap.successRate,
        avgLatency: cap.avgLatency,
        lastHealthCheck: cap.lastHealthCheck,
      });
    }

    return results;
  }

  /** 重新计算所有能力的成功率 */
  async recalculateSuccessRates(): Promise<void> {
    const capabilities = await this.prisma.aiCapability.findMany();
    for (const cap of capabilities) {
      const decisions = await this.prisma.aiDecision.findMany({
        where: { capabilityId: cap.name },
        select: { humanAction: true },
        take: 100,
        orderBy: { createdAt: "desc" },
      });

      if (decisions.length === 0) continue;

      const accepted = decisions.filter(
        (d) => d.humanAction === "approved",
      ).length;
      const rate = Math.round((accepted / decisions.length) * 10000) / 100;

      await this.prisma.aiCapability.update({
        where: { id: cap.id },
        data: { successRate: rate },
      });
    }
    this.logger.log("能力成功率已重新计算");
  }
}
