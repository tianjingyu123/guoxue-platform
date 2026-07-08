import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { ADMIN_GUIDE, pageHint } from "./admin-guide";

const ASSISTANT_SCENE = "admin_assistant";

/** 反转 SanitizePipe 的 HTML 实体转义（页面路由 /system/x 会被转成 &#x2F;system&#x2F;x 乱码·需还原·纯文本展示安全） */
function decodeEntities(s: string): string {
  return String(s || "")
    .replace(/&#x2F;/gi, "/").replace(/&#47;/g, "/")
    .replace(/&#x27;/gi, "'").replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"').replace(/&#34;/g, '"')
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

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
  images?: string[]; // 截图 URL
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
        page: decodeEntities(dto.page || ""),
        category: dto.category || "OTHER",
        title: decodeEntities(dto.title.trim()).slice(0, 200),
        detail: decodeEntities(dto.detail || "").slice(0, 4000),
        source: dto.source || "MANUAL",
        images: Array.isArray(dto.images) ? dto.images.slice(0, 6) : [],
      },
    });
  }

  /** 我的反馈（员工看自己提交的问题及处理结果·状态/批复可见·便于复测追问） */
  async myFeedback(userId: string) {
    return this.prisma.adminFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
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

  // ─────────────────────────────────────────────────
  // M1-1 反馈中枢：高频 TOP10 聚类 + 趋势周报 + 一键导出（自动化的"数据指南针"）
  // ─────────────────────────────────────────────────

  /** 完成态（视为"已解决"，用于处理率/待办口径统一） */
  private readonly RESOLVED = ["DONE", "REJECTED"];
  /** 未决态（还压在池子里的） */
  private readonly OPEN = ["PENDING", "REVIEWED", "ADOPTED"];

  private categoryLabel(c: string): string {
    return { BUG: "程序问题", OPTIMIZE: "优化建议", QUESTION: "操作疑问", OTHER: "其他" }[c] || c;
  }
  private statusLabel(s: string): string {
    return { PENDING: "待审", REVIEWED: "已阅", ADOPTED: "已采纳待优化", REJECTED: "不采纳", DONE: "已优化" }[s] || s;
  }

  /**
   * 高频 TOP10：按后台页面（page）聚合出"员工最常卡在哪"——自动化该先啃哪块的数据指南针。
   * 每个热点附：总数、分类分布、未决数、最近样本标题。page 为空的归入「未标注页面」。
   */
  async hotspots(days = 30, limit = 10) {
    const since = new Date(Date.now() - days * 86400000);
    const [byPage, samplesRaw] = await Promise.all([
      this.prisma.adminFeedback.groupBy({
        by: ["page"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { page: "desc" } },
        take: limit,
      }),
      // 一次拉近窗内反馈（上限 500）在内存里补分类/状态/样本，避免逐页多查
      this.prisma.adminFeedback.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { page: true, category: true, status: true, title: true, createdAt: true },
      }),
    ]);

    const topPages = new Set(byPage.map((p) => p.page));
    const clusters = byPage.map((p) => {
      const rows = samplesRaw.filter((r) => r.page === p.page);
      const categoryCounts: Record<string, number> = {};
      let open = 0;
      for (const r of rows) {
        categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
        if (this.OPEN.includes(r.status)) open++;
      }
      return {
        page: p.page || "(未标注页面)",
        count: p._count._all,
        openCount: open,
        categoryCounts,
        recentTitles: rows.slice(0, 3).map((r) => r.title),
      };
    });
    return { windowDays: days, since, top: clusters, coveredBySample: samplesRaw.filter((r) => topPages.has(r.page)).length };
  }

  /**
   * 反馈趋势周报：本周(近7天) vs 上周(7-14天前)对比 + 处理率 + TOP卡点 + 已优化/待拍板清单 + 大白话摘要。
   * M1-1 验收：一键导出"本周高频问题 + 已优化 + 待拍板"。自动定时推送属 M3-3（后端 cron）。
   */
  async weeklyReport() {
    const now = Date.now();
    const weekAgo = new Date(now - 7 * 86400000);
    const twoWeeksAgo = new Date(now - 14 * 86400000);

    const [thisWeek, lastWeek, byCategoryThisWeek, doneThisWeek, adoptedOpen, pendingRecent, hotspots] = await Promise.all([
      this.prisma.adminFeedback.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.adminFeedback.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
      this.prisma.adminFeedback.groupBy({ by: ["category"], where: { createdAt: { gte: weekAgo } }, _count: { _all: true } }),
      // 本周已优化（DONE 且本周更新）
      this.prisma.adminFeedback.findMany({
        where: { status: "DONE", updatedAt: { gte: weekAgo } },
        orderBy: { updatedAt: "desc" }, take: 50,
        select: { id: true, title: true, page: true, category: true, reply: true, updatedAt: true },
      }),
      // 待拍板/待优化：已采纳但未完成（压着的）
      this.prisma.adminFeedback.findMany({
        where: { status: "ADOPTED" },
        orderBy: { createdAt: "asc" }, take: 50,
        select: { id: true, title: true, page: true, category: true, createdAt: true },
      }),
      // 待审高频（新进未处理）
      this.prisma.adminFeedback.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" }, take: 50,
        select: { id: true, title: true, page: true, category: true, createdAt: true },
      }),
      this.hotspots(7, 5),
    ]);

    const delta = thisWeek - lastWeek;
    const trend = delta > 0 ? "上升" : delta < 0 ? "下降" : "持平";
    const categoryThisWeek = Object.fromEntries(byCategoryThisWeek.map((c) => [c.category, c._count._all]));

    const narrative =
      `本周共收到员工反馈 ${thisWeek} 条（较上周 ${lastWeek} 条${trend}${delta !== 0 ? ` ${Math.abs(delta)} 条` : ""}）。` +
      `其中 ${this.categoryLabel("BUG")} ${categoryThisWeek.BUG || 0} 条、${this.categoryLabel("OPTIMIZE")} ${categoryThisWeek.OPTIMIZE || 0} 条、${this.categoryLabel("QUESTION")} ${categoryThisWeek.QUESTION || 0} 条。` +
      `本周已优化落地 ${doneThisWeek.length} 条；` +
      `还有 ${adoptedOpen.length} 条已采纳待优化、${pendingRecent.length} 条待您拍板。` +
      (hotspots.top[0] ? `员工最常卡在「${hotspots.top[0].page}」（近7天 ${hotspots.top[0].count} 条）。` : "");

    return {
      generatedAt: new Date(),
      period: { from: weekAgo, to: new Date(now) },
      counts: { thisWeek, lastWeek, delta, trend },
      categoryThisWeek,
      hotspots: hotspots.top,
      done: doneThisWeek, // 本周已优化
      adoptedPending: adoptedOpen, // 已采纳待优化
      pending: pendingRecent, // 待拍板
      narrative,
    };
  }

  /** 一键导出周报为纯文本清单（董事长可直接读/转发·markdown 友好） */
  async exportWeeklyDigest(): Promise<{ filename: string; content: string; generatedAt: Date }> {
    const r = await this.weeklyReport();
    const fmt = (d: Date) => new Date(d).toISOString().slice(0, 10);
    const lines: string[] = [];
    lines.push(`# 员工反馈周报（${fmt(r.period.from)} ~ ${fmt(r.period.to)}）`);
    lines.push("");
    lines.push(`> ${r.narrative}`);
    lines.push("");
    lines.push(`## 一、本周高频卡点 TOP${r.hotspots.length}`);
    if (r.hotspots.length === 0) lines.push("（本周暂无反馈）");
    r.hotspots.forEach((h, i) => {
      lines.push(`${i + 1}. **${h.page}** — ${h.count} 条（未决 ${h.openCount}）；示例：${h.recentTitles.join("；") || "—"}`);
    });
    lines.push("");
    lines.push(`## 二、本周已优化（${r.done.length}）`);
    if (r.done.length === 0) lines.push("（本周暂无已优化条目）");
    r.done.forEach((d) => lines.push(`- [${this.categoryLabel(d.category)}] ${d.title}${d.reply ? `（批复：${d.reply}）` : ""}`));
    lines.push("");
    lines.push(`## 三、待拍板 / 待优化（${r.adoptedPending.length + r.pending.length}）`);
    if (r.adoptedPending.length + r.pending.length === 0) lines.push("（无待办）");
    r.adoptedPending.forEach((a) => lines.push(`- ⏳已采纳待优化 [${this.categoryLabel(a.category)}] ${a.title}（${a.page || "未标注"}）`));
    r.pending.forEach((p) => lines.push(`- 🆕待拍板 [${this.categoryLabel(p.category)}] ${p.title}（${p.page || "未标注"}）`));
    lines.push("");

    return { filename: `feedback-weekly-${fmt(r.period.to)}.md`, content: lines.join("\n"), generatedAt: r.generatedAt };
  }
}
