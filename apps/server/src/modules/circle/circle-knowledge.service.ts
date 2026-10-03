import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "../ai-gateway/vector.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { ModerationService } from "../audit/moderation.service";
import type { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { safePagination } from "../../common/pagination";
import {
  RolePermissionOverrides,
  resolvePermission,
} from "./governance/circle-governance.constants";

@Injectable()
export class CircleKnowledgeService {
  private readonly logger = new Logger(CircleKnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vector: VectorService,
    private readonly aiGateway: AiGatewayService,
    private readonly moderation: ModerationService,
  ) {}

  /**
   * 内容审核闸门（2026-09-14 接入，修复交接书「知识入库不过内容审核」实质缺口）：
   * - Block → 抛异常拒绝入库
   * - Review → 置 pending，不进向量索引，等待人工复核
   * - Pass → 正常入库
   * - 审核服务不可用/异常 → fail-closed 置 pending（绝不静默放行）
   * 返回入库时应使用的 status。
   */
  private async moderateKnowledgeContent(content: string): Promise<string> {
    try {
      const result = await this.moderation.textModeration({ content });
      const suggestion = this.moderation.getTextSuggestion(result);
      if (suggestion === "Block") {
        const labels = this.moderation.getBlockedLabels(result).join("、");
        throw new BusinessException(
          ErrorCode.CONTENT_MODERATION_BLOCKED,
          `内容未通过审核${labels ? `（${labels}）` : ""}`,
        );
      }
      if (suggestion === "Review") {
        this.logger.warn("知识内容审核为 Review，转入待复核");
        return "pending";
      }
      return "active";
    } catch (err) {
      // 审核服务抛业务异常（Block）直接上抛；其余异常 fail-closed
      if (err instanceof BusinessException) throw err;
      this.logger.warn(`内容审核不可用，知识条目转 pending：${(err as Error)?.message || err}`);
      return "pending";
    }
  }

  /**
   * 知识库管理鉴权（治理权限矩阵 #8·knowledge.manage·2026-07-11 起接入）：
   * 圈主恒通过；其余角色按 CircleGovernanceConfig.rolePermissions 覆盖位判断，
   * 缺省回落默认矩阵（管理员✓ 合伙人✓ 嘉宾✗·可由圈主在矩阵中调整）。
   */
  async assertManager(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { role: true },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "仅圈主或被授权的管理角色可管理圈子知识库");
    if (member.role === "OWNER") return;
    const config = await this.prisma.circleGovernanceConfig.findUnique({
      where: { circleId },
      select: { rolePermissions: true },
    });
    const allowed = resolvePermission(
      member.role,
      "knowledge.manage",
      (config?.rolePermissions as RolePermissionOverrides | null) ?? null,
    );
    if (!allowed) throw new BusinessException(ErrorCode.FORBIDDEN, "无知识库管理权限");
  }

  // ───────── 知识库 CRUD ─────────

  /** 手动添加知识条目 */
  async add(params: {
    circleId: string;
    sourceType: string;
    sourceId?: string;
    content: string;
    addedBy: string;
  }) {
    const contentHash = createHash("md5").update(params.content).digest("hex");

    // 检查是否已存在（MD5 去重）
    const existing = await this.prisma.circleKnowledge.findUnique({
      where: { contentHash_circleId: { contentHash, circleId: params.circleId } },
    });
    if (existing) {
      this.logger.warn(`知识条目已存在: circleId=${params.circleId} hash=${contentHash}`);
      return existing;
    }

    // 内容审核：Block 拒绝、Review 转 pending、服务不可用 fail-closed 转 pending
    const moderationStatus = await this.moderateKnowledgeContent(params.content);

    const item = await this.prisma.circleKnowledge.create({
      data: {
        circleId: params.circleId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        content: params.content,
        contentHash,
        addedBy: params.addedBy,
        status: moderationStatus,
      },
    });

    // 仅审核通过的内容才生成向量（pending 内容不进检索，待复核通过后再索引）
    if (moderationStatus === "active") {
      this.indexItem(item.id, item.content).catch((err) =>
        this.logger.error(`向量索引失败 id=${item.id}`, err),
      );
    }

    return item;
  }

  /** 批量添加（用于定时任务） */
  async addBatch(
    items: Array<{
      circleId: string;
      sourceType: string;
      sourceId?: string;
      content: string;
      addedBy: string;
    }>,
  ) {
    const results: string[] = [];
    for (const item of items) {
      try {
        const result = await this.add(item);
        results.push(result.id);
      } catch (err) {
        this.logger.warn(`批量添加跳过: ${err}`);
      }
    }
    return results;
  }

  /** 获取圈子知识库列表 */
  async list(circleId: string, params?: { page?: number; pageSize?: number; sourceType?: string; status?: string }) {
    const { page, pageSize, skip } = safePagination(params?.page, params?.pageSize);
    const where: any = { circleId, status: params?.status || "active" };
    if (params?.sourceType) where.sourceType = params.sourceType;

    const [items, total] = await Promise.all([
      this.prisma.circleKnowledge.findMany({
        where,
        orderBy: [{ addedAt: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
      }),
      this.prisma.circleKnowledge.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** 删除知识条目 */
  async remove(circleId: string, id: string, userId: string) {
    const item = await this.prisma.circleKnowledge.findUnique({ where: { id } });
    if (!item || item.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "知识条目不存在");

    // 记录删除操作
    await this.prisma.circleKnowledgeManual.create({
      data: { circleId, userId, targetType: "knowledge", targetId: id, action: "remove" },
    });

    await this.vector.deleteCircleKnowledge(id);
    return this.prisma.circleKnowledge.update({
      where: { id },
      data: { status: "removed" },
    });
  }

  /** 更新知识条目内容 */
  async update(circleId: string, id: string, content: string) {
    const item = await this.prisma.circleKnowledge.findUnique({ where: { id } });
    if (!item || item.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "知识条目不存在");

    // 内容变更时重新审核（Block 拒绝、Review 转 pending、不可用 fail-closed）
    const moderationStatus = await this.moderateKnowledgeContent(content);

    const contentHash = createHash("md5").update(content).digest("hex");
    const updated = await this.prisma.circleKnowledge.update({
      where: { id },
      data: { content, contentHash, status: moderationStatus },
    });

    // 仅审核通过的内容才重新生成向量
    if (moderationStatus === "active") {
      this.indexItem(id, content).catch((err) =>
        this.logger.error(`向量重新索引失败 id=${id}`, err),
      );
    }

    return updated;
  }

  // ───────── 去重检测 ─────────

  /** 检查内容是否与已有知识高度相似 */
  async checkSimilarity(
    circleId: string,
    content: string,
    threshold = 0.9,
  ): Promise<{ isDuplicate: boolean; similarTo?: { id: string; content: string; score: number } }> {
    const [vec] = await this.vector.embed([content]);
    if (!vec) return { isDuplicate: false };

    const results = await this.vector.searchCircleKnowledge(vec, circleId, 3);
    const top = results[0];
    if (top && top.similarity >= threshold) {
      return { isDuplicate: true, similarTo: { id: top.id, content: top.content, score: top.similarity } };
    }
    return { isDuplicate: false };
  }

  // ───────── 候选内容管理 ─────────

  /** 添加候选内容（由定时任务扫描产生，待圈主审核） */
  async addCandidate(params: {
    circleId: string;
    sourceType: string;
    sourceId?: string;
    content: string;
  }) {
    const contentHash = createHash("md5").update(params.content).digest("hex");

    // 检查是否已存在
    const existKnowledge = await this.prisma.circleKnowledge.findUnique({
      where: { contentHash_circleId: { contentHash, circleId: params.circleId } },
    });
    if (existKnowledge) return null;

    // 精华帖有每日与每六小时两条扫描路径；同一来源的同一内容无需重复排队。
    const pendingCandidate = await this.prisma.circleKnowledgeCandidate.findFirst({
      where: {
        circleId: params.circleId,
        sourceType: params.sourceType,
        sourceId: params.sourceId || null,
        contentHash,
        status: "pending",
      },
      select: { id: true },
    });
    if (pendingCandidate) return null;

    // 相似度检测
    const { similarTo } = await this.checkSimilarity(params.circleId, params.content);

    return this.prisma.circleKnowledgeCandidate.create({
      data: {
        circleId: params.circleId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        content: params.content,
        contentHash,
        similarityScore: similarTo?.score,
        similarToId: similarTo?.id,
        status: "pending",
      },
    });
  }

  /** 获取候选列表（圈主审核用） */
  async listCandidates(circleId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { circleId, status: "pending" };
    const [items, total] = await Promise.all([
      this.prisma.circleKnowledgeCandidate.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
      }),
      this.prisma.circleKnowledgeCandidate.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** 确认候选 → 正式入库 */
  async confirmCandidate(circleId: string, candidateId: string, addedBy: string) {
    const candidate = await this.prisma.circleKnowledgeCandidate.findUnique({ where: { id: candidateId } });
    if (!candidate || candidate.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "候选条目不存在");
    if (candidate.status !== "pending") throw new BusinessException(ErrorCode.FORBIDDEN, "候选条目已处理，请刷新列表");

    // 候选是扫描时的快照；确认前须再次核对来源，避免已撤下或转私密内容被入库。
    if (candidate.sourceType === "post") {
      if (!candidate.sourceId) throw new BusinessException(ErrorCode.FORBIDDEN, "来源帖子缺失，请重新采集");
      const post = await this.prisma.post.findUnique({
        where: { id: candidate.sourceId },
        select: { circleId: true, title: true, content: true, status: true, isEssence: true },
      });
      const currentContent = `${post?.title || ""}\n${post?.content || ""}`.trim();
      if (!post || post.circleId !== circleId || post.status !== "PUBLISHED" || !post.isEssence || currentContent !== candidate.content) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "来源帖子已变更或不再符合入库条件，请重新采集");
      }
    }
    if (candidate.sourceType === "expert_qa") {
      if (!candidate.sourceId) throw new BusinessException(ErrorCode.FORBIDDEN, "来源问答缺失，请重新采集");
      const question = await this.prisma.paidQuestion.findUnique({
        where: { id: candidate.sourceId },
        select: { circleId: true, status: true, isPublic: true, answer: true },
      });
      if (!question || question.circleId !== circleId || question.status !== "ANSWERED" || !question.isPublic || !question.answer?.trim()) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "来源问答已撤回或不再公开，不能入库");
      }
    }

    await this.add({
      circleId,
      sourceType: candidate.sourceType,
      sourceId: candidate.sourceId || undefined,
      content: candidate.content,
      addedBy,
    });

    return this.prisma.circleKnowledgeCandidate.update({
      where: { id: candidateId },
      data: { status: "confirmed" },
    });
  }

  /**
   * #38 从达人回答提炼知识候选（手动触发·POST /circles/:circleId/knowledge/extract-candidates）。
   * 取本圈近 30 天已回答 PaidQuestion 前 10 条 → AiGateway 总结提炼为候选条目（sourceType=expert_qa）落候选队列，
   * 仍走既有「圈主确认才入库」流程。AI 未配置/失败 → 抛友好错误（不落任何数据）。
   * TODO(#38)：命中率统计（AI 代答命中知识条目次数）无数据源暂不做。
   */
  async extractFromExpertAnswers(circleId: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const questions = await this.prisma.paidQuestion.findMany({
      where: { circleId, status: "ANSWERED", isPublic: true, answeredAt: { gte: since }, answer: { not: null } },
      select: { id: true, questionTitle: true, question: true, answer: true },
      orderBy: { answeredAt: "desc" },
      take: 10,
    });
    if (questions.length === 0) {
      return { scanned: 0, created: 0, message: "近 30 天没有已回答的付费问答，暂无可提炼内容" };
    }

    const qaText = questions
      .map((q, i) => `【问答${i + 1}】\n问：${(q.questionTitle || "").trim()} ${q.question.slice(0, 300)}\n答：${(q.answer || "").slice(0, 800)}`)
      .join("\n\n");

    const messages: AiMessage[] = [
      {
        role: "system",
        content:
          "你是圈子知识库整理助手。把达人问答提炼成可复用的知识条目：每条自成一体（不依赖上下文即可读懂）、保留达人的核心观点与方法、120~300字。" +
          '只输出 JSON 数组（不要 markdown 代码块），格式：[{"questionIndex":1,"content":"知识条目正文"}]。' +
          "questionIndex 是来源问答的序号；无提炼价值的问答可跳过；最多输出 10 条。",
      },
      { role: "user", content: qaText },
    ];

    let content = "";
    try {
      const result = await this.aiGateway.chat({ scene: "circle_knowledge_extract", messages, skipCache: true });
      content = result?.content || "";
    } catch (err) {
      this.logger.warn(`知识候选 AI 提炼失败 circleId=${circleId}: ${(err as Error)?.message}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 服务未配置或暂不可用，请稍后再试");
    }

    const entries = this.parseExtractedEntries(content);
    if (entries.length === 0) {
      return { scanned: questions.length, created: 0, message: "AI 未提炼出有效条目，可稍后重试" };
    }

    let created = 0;
    for (const e of entries.slice(0, 10)) {
      const src = questions[e.questionIndex - 1];
      try {
        const r = await this.addCandidate({
          circleId,
          sourceType: "expert_qa",
          sourceId: src?.id,
          content: e.content,
        });
        if (r) created++;
      } catch (err) {
        // 单条失败（如向量服务异常/重复）跳过，不影响其余候选
        this.logger.warn(`知识候选落库跳过: ${(err as Error)?.message}`);
      }
    }
    return { scanned: questions.length, created, message: created > 0 ? `已提炼 ${created} 条候选，请在「待确认」中审核` : "内容均已存在或落库失败" };
  }

  /** 宽容解析 AI 输出的候选数组（剥 ```json 围栏/截取首尾中括号） */
  private parseExtractedEntries(text: string): Array<{ questionIndex: number; content: string }> {
    const stripped = (text || "").replace(/```json|```/g, "").trim();
    const start = stripped.indexOf("[");
    const end = stripped.lastIndexOf("]");
    if (start < 0 || end <= start) return [];
    try {
      const arr = JSON.parse(stripped.slice(start, end + 1));
      if (!Array.isArray(arr)) return [];
      return arr
        .map((x: { questionIndex?: unknown; content?: unknown }) => ({
          questionIndex: Math.floor(Number(x?.questionIndex)) || 0,
          content: String(x?.content || "").trim(),
        }))
        .filter((x) => x.content.length >= 20);
    } catch {
      return [];
    }
  }

  /** 拒绝候选 */
  async rejectCandidate(circleId: string, candidateId: string) {
    const candidate = await this.prisma.circleKnowledgeCandidate.findUnique({ where: { id: candidateId } });
    if (!candidate || candidate.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "候选条目不存在");

    return this.prisma.circleKnowledgeCandidate.update({
      where: { id: candidateId },
      data: { status: "rejected" },
    });
  }

  // ───────── 知识库导出 ─────────

  /** 导出圈子知识库（JSON 格式） */
  async exportJson(circleId: string, params?: { sourceType?: string; startDate?: Date; endDate?: Date }) {
    const where: any = { circleId, status: "active" };
    if (params?.sourceType) where.sourceType = params.sourceType;
    if (params?.startDate || params?.endDate) {
      where.addedAt = {};
      if (params.startDate) where.addedAt.gte = params.startDate;
      if (params.endDate) where.addedAt.lte = params.endDate;
    }

    const items = await this.prisma.circleKnowledge.findMany({
      where,
      select: {
        id: true,
        sourceType: true,
        content: true,
        addedAt: true,
      },
      orderBy: { addedAt: "desc" },
    });

    return {
      exportVersion: "1.0",
      circleId,
      exportedAt: new Date().toISOString(),
      totalItems: items.length,
      items: items.map((item) => ({
        id: item.id,
        type: item.sourceType,
        content: item.content,
        createdAt: item.addedAt?.toISOString(),
      })),
    };
  }

  /** 导出圈子知识库（Markdown 格式） */
  async exportMarkdown(circleId: string, params?: { sourceType?: string; startDate?: Date; endDate?: Date }) {
    const json = await this.exportJson(circleId, params);

    const circle = await this.prisma.circle.findUnique({
      where: { id: circleId },
      select: { name: true },
    });

    let md = `# ${circle?.name || "圈子"} — 知识库导出\n\n`;
    md += `> 导出时间: ${json.exportedAt}\n`;
    md += `> 条目数: ${json.totalItems}\n\n---\n\n`;

    for (let i = 0; i < json.items.length; i++) {
      const item = json.items[i];
      md += `## ${i + 1}. [${item.type}] ${item.content.slice(0, 50)}${item.content.length > 50 ? "..." : ""}\n\n`;
      md += `${item.content}\n\n`;
      md += `*${item.createdAt}* | *ID: ${item.id}*\n\n---\n\n`;
    }

    return { markdown: md, filename: `knowledge-${circleId.slice(0, 8)}.md`, totalItems: json.totalItems };
  }

  // ───────── 只读知识检索（MCP 用）──────────

  /**
   * 校验调用者是该圈「有效成员」（读权限），否则拒绝。
   * 身份由服务端从 JWT 绑定，绝不接受客户端传入 userId，防越权套取私有知识。
   */
  async assertActiveMember(circleId: string, userId?: string) {
    if (!userId) throw new BusinessException(ErrorCode.FORBIDDEN, "请先登录");
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { role: true, expireAt: true, circle: { select: { status: true, deletedAt: true } } },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "请先加入该圈子才能检索圈子知识");
    // 圈子被删除或停用后，成员不得继续通过助理/MCP 读取私有知识
    if (member.circle && (member.circle.deletedAt || member.circle.status !== "ACTIVE")) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "该圈子当前不可用，暂不能检索圈子知识");
    }
    if (member.expireAt && new Date(member.expireAt) < new Date()) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "圈子会员已过期，请续费后使用");
    }
  }

  /**
   * 只读知识检索：返回与本圈相关的已发布知识片段 + 来源。
   * - 仅返回 status=active 的条目（pending/removed 不外泄）
   * - 只返回必要片段，不开放全库导出
   * - 向量服务不可用时回退为关键词 LIKE 检索，保证可用性
   */
  async search(circleId: string, userId: string, query: string, topK = 5) {
    await this.assertActiveMember(circleId, userId);

    const q = (query || "").trim().slice(0, 200);
    if (!q) return { query: "", hits: [] };
    // 单次最多返回 10 条片段，防止通过放大 topK 变相整库导出
    topK = Math.max(1, Math.min(10, Math.floor(Number(topK)) || 5));

    // 向量检索
    let hits: Array<{ id: string; content: string; sourceType: string; similarity: number }> = [];
    try {
      const [vec] = await this.vector.embed([q]);
      if (vec) {
        const results = await this.vector.searchCircleKnowledge(vec, circleId, topK);
        hits = results.map((r) => ({
          id: r.id,
          content: r.content,
          sourceType: "circle",
          similarity: r.similarity,
        }));
      }
    } catch (err) {
      this.logger.warn(`向量检索失败，回退 LIKE：${(err as Error)?.message || err}`);
    }

    // 只信任 DB 中仍为 active 的条目（防向量索引滞后导致已撤回内容外泄）
    if (hits.length > 0) {
      const active = await this.prisma.circleKnowledge.findMany({
        where: { circleId, status: "active", id: { in: hits.map((h) => h.id) } },
        select: { id: true, sourceType: true, content: true },
      });
      const activeMap = new Map(active.map((a) => [a.id, a]));
      hits = hits
        .filter((h) => activeMap.has(h.id))
        .map((h) => ({ ...h, content: activeMap.get(h.id)!.content }));
    }

    // 向量无命中或失败时，关键词兜底（仅 active）
    if (hits.length === 0) {
      const fallback = await this.prisma.circleKnowledge.findMany({
        where: { circleId, status: "active", content: { contains: q } },
        select: { id: true, sourceType: true, content: true },
        orderBy: { addedAt: "desc" },
        take: topK,
      });
      hits = fallback.map((f) => ({
        id: f.id,
        content: f.content,
        sourceType: f.sourceType,
        similarity: 0,
      }));
    }

    return {
      query: q,
      hits: hits.map((h) => ({
        id: h.id,
        sourceType: h.sourceType,
        content: h.content.slice(0, 500), // 只返回必要片段
        similarity: Math.round((h.similarity || 0) * 1000) / 1000,
      })),
    };
  }

  // ───────── 内部工具 ─────────

  /** 为单条知识生成向量 */
  private async indexItem(id: string, content: string) {
    const [vec] = await this.vector.embed([content]);
    if (vec) {
      await this.vector.storeCircleKnowledge(id, vec);
    }
  }
}
