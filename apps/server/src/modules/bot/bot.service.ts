import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateBotDto, UpdateBotDto, BindBotToCircleDto, AddKnowledgeDto } from "./bot.dto";

@Injectable()
export class BotService {
  constructor(private prisma: PrismaService) {}

  // ───────── Bot配置 CRUD ─────────

  async create(dto: CreateBotDto) {
    return this.prisma.botConfig.create({
      data: {
        name: dto.name,
        type: dto.type,
        avatar: dto.avatar,
        intro: dto.intro || "",
        botId: dto.botId,
        apiKey: dto.apiKey,
        isFree: dto.isFree ?? true,
        dailyLimit: dto.dailyLimit ?? 5,
        price: dto.price,
        monthlyPrice: dto.monthlyPrice,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateBotDto) {
    return this.prisma.botConfig.update({ where: { id }, data: dto as any });
  }

  async delete(id: string) {
    await this.prisma.botConfig.delete({ where: { id } });
    return { success: true };
  }

  async list(type?: string) {
    const where: any = { status: "ACTIVE" };
    if (type) where.type = type;

    return this.prisma.botConfig.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
  }

  async getDetail(id: string) {
    const bot = await this.prisma.botConfig.findUnique({
      where: { id },
      include: {
        circleBots: { include: { circle: { select: { id: true, name: true } } } },
        knowledgeBases: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!bot) throw new NotFoundException("智能体不存在");
    return bot;
  }

  // ───────── 圈子绑定 ─────────

  async bindToCircle(botConfigId: string, dto: BindBotToCircleDto) {
    return this.prisma.circleBot.upsert({
      where: { circleId: dto.circleId },
      create: { botConfigId, circleId: dto.circleId, knowledgeBaseId: dto.knowledgeBaseId },
      update: { botConfigId, knowledgeBaseId: dto.knowledgeBaseId },
    });
  }

  async unbindCircle(circleId: string) {
    await this.prisma.circleBot.deleteMany({ where: { circleId } });
    return { success: true };
  }

  async getCircleBot(circleId: string) {
    return this.prisma.circleBot.findUnique({
      where: { circleId },
      include: { botConfig: true },
    });
  }

  // ───────── 知识库 ─────────

  async addKnowledge(botConfigId: string, dto: AddKnowledgeDto) {
    return this.prisma.botKnowledgeBase.create({
      data: {
        botConfigId,
        title: dto.title,
        content: dto.content,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
      },
    });
  }

  async deleteKnowledge(knowledgeId: string) {
    await this.prisma.botKnowledgeBase.delete({ where: { id: knowledgeId } });
    return { success: true };
  }
}
