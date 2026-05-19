import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface MarketplaceAgent {
  id: string;
  name: string;
  avatar: string | null;
  intro: string;
  type: string;
  source: "coze_bot" | "operation_robot" | "circle_assistant";
  isFree: boolean;
  price: number | null;
  enabled: boolean;
  extra: Record<string, unknown>;
}

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  /** 聚合三类 agent 的统一列表 */
  async list(params: {
    keyword?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: MarketplaceAgent[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 50);
    const skip = (page - 1) * pageSize;

    // 1. Coze Bots（已审核通过的）
    const [bots, botsTotal] = await Promise.all([
      this.prisma.botConfig.findMany({
        where: {
          status: "ACTIVE",
          ...(params.keyword ? { name: { contains: params.keyword } } : {}),
          ...(params.category ? { type: params.category } : {}),
        },
        select: { id: true, name: true, avatar: true, intro: true, type: true, isFree: true, price: true, monthlyPrice: true, dailyLimit: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
        skip,
        take: pageSize,
      }),
      this.prisma.botConfig.count({ where: { status: "ACTIVE" } }),
    ]);

    // 2. Circle Assistants（已绑定圈子的智能体）
    const circleBots = await this.prisma.circleBot.findMany({
      where: { status: "ACTIVE" },
      include: {
        botConfig: { select: { id: true, name: true, avatar: true, intro: true, type: true, isFree: true, price: true } },
        circle: { select: { id: true, name: true } },
      },
      skip,
      take: pageSize,
    });

    const agents: MarketplaceAgent[] = [
      ...bots.map((b) => ({
        id: b.id,
        name: b.name,
        avatar: b.avatar,
        intro: b.intro,
        type: b.type,
        source: "coze_bot" as const,
        isFree: b.isFree,
        price: b.price ? Number(b.price) : null,
        enabled: true,
        extra: { monthlyPrice: b.monthlyPrice, dailyLimit: b.dailyLimit },
      })),
      ...circleBots.map((cb) => ({
        id: cb.botConfig.id,
        name: `${cb.botConfig.name} · ${cb.circle.name}`,
        avatar: cb.botConfig.avatar,
        intro: cb.botConfig.intro,
        type: cb.botConfig.type,
        source: "circle_assistant" as const,
        isFree: cb.botConfig.isFree,
        price: cb.botConfig.price ? Number(cb.botConfig.price) : null,
        enabled: true,
        extra: { circleId: cb.circle.id, circleName: cb.circle.name },
      })),
    ];

    const total = botsTotal; // 简化：total 只计 Coze bots

    return { items: agents, total };
  }

  /** 获取 agent 详情 */
  async getDetail(id: string): Promise<MarketplaceAgent | null> {
    const bot = await this.prisma.botConfig.findUnique({
      where: { id },
      select: { id: true, name: true, avatar: true, intro: true, type: true, isFree: true, price: true, monthlyPrice: true, dailyLimit: true, sortOrder: true, botId: true, voiceEnabled: true },
    });
    if (!bot) return null;

    return {
      id: bot.id,
      name: bot.name,
      avatar: bot.avatar,
      intro: bot.intro,
      type: bot.type,
      source: "coze_bot",
      isFree: bot.isFree,
      price: bot.price ? Number(bot.price) : null,
      enabled: true,
      extra: {
        monthlyPrice: bot.monthlyPrice,
        dailyLimit: bot.dailyLimit,
        botId: bot.botId,
        voiceEnabled: bot.voiceEnabled,
      },
    };
  }
}
