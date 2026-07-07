import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { ADMIN_GUIDE, pageHint } from "./admin-guide";

const ASSISTANT_SCENE = "admin_assistant";

export interface AssistantChatDto {
  message: string;
  page?: string; // 当前后台页面路由，供页面感知指导
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface CreateFeedbackDto {
  page?: string;
  category?: string; // BUG / OPTIMIZE / QUESTION / OTHER
  title: string;
  detail: string;
  source?: string; // MANUAL / ASSISTANT
}

@Injectable()
export class AdminAssistantService {
  private readonly logger = new Logger(AdminAssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AiGatewayService,
  ) {}

  /** 助手答疑：接 DeepSeek，系统提示词内置《后台操作手册+已知坑+三类分诊规则》，并注入当前页面上下文 */
  async chat(userId: string, dto: AssistantChatDto): Promise<{ answer: string }> {
    const messages: AiMessage[] = [
      { role: "system", content: ADMIN_GUIDE },
    ];
    if (dto.page) {
      messages.push({ role: "system", content: `【当前员工所在页面】${dto.page}\n${pageHint(dto.page)}` });
    }
    // 带上最近对话（最多 6 轮，控制 token）
    for (const h of (dto.history || []).slice(-6)) {
      messages.push({ role: h.role, content: String(h.content || "").slice(0, 1000) });
    }
    messages.push({ role: "user", content: dto.message.slice(0, 2000) });

    try {
      const res = await this.gateway.chat({
        scene: ASSISTANT_SCENE,
        userId,
        messages,
        options: { temperature: 0.3, maxTokens: 900 },
        skipCache: true,
      });
      return { answer: res.content || "抱歉，我暂时没能理解，请换个说法，或点击「反馈问题」记录下来由技术团队处理。" };
    } catch (err) {
      this.logger.warn(`助手对话失败: ${(err as Error).message}`);
      return { answer: "助手服务暂时不可用。你可以点击「反馈问题」把遇到的问题记录下来，会汇总给管理层处理。" };
    }
  }

  /** 记录一条运营反馈（员工手动 or 助手判定为程序问题后代记） */
  async createFeedback(userId: string, dto: CreateFeedbackDto) {
    if (!dto.title?.trim()) throw new BusinessException(ErrorCode.BAD_REQUEST, "请填写问题标题");
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } }).catch(() => null);
    return this.prisma.adminFeedback.create({
      data: {
        userId,
        userName: user?.nickname || "",
        page: dto.page || "",
        category: dto.category || "OTHER",
        title: dto.title.trim().slice(0, 200),
        detail: (dto.detail || "").slice(0, 4000),
        source: dto.source || "MANUAL",
      },
    });
  }

  /** 反馈列表（管理层审阅·分页·可按状态/分类筛选） */
  async listFeedback(params: { page?: number; pageSize?: number; status?: string; category?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.category) where.category = params.category;
    const [items, total] = await Promise.all([
      this.prisma.adminFeedback.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.adminFeedback.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 更新反馈状态/批复（董事长拍板） */
  async updateFeedback(id: string, dto: { status?: string; reply?: string }) {
    const exists = await this.prisma.adminFeedback.findUnique({ where: { id } });
    if (!exists) throw new BusinessException(ErrorCode.NOT_FOUND, "反馈不存在");
    return this.prisma.adminFeedback.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.reply !== undefined ? { reply: dto.reply.slice(0, 2000) } : {}),
      },
    });
  }

  /** 汇总：各状态/分类计数 + 待处理清单（供董事长一览与我方优化取数） */
  async summary() {
    const [byStatus, byCategory, pending] = await Promise.all([
      this.prisma.adminFeedback.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.adminFeedback.groupBy({ by: ["category"], _count: { _all: true } }),
      this.prisma.adminFeedback.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    return {
      statusCounts: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      categoryCounts: Object.fromEntries(byCategory.map((c) => [c.category, c._count._all])),
      pendingCount: pending.length,
      pending,
    };
  }
}
