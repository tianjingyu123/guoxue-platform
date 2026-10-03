import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ContentGuideService } from "../search/content-guide.service";
import { PUBLIC_CLASSIC_BOOK_WHERE } from "../classic/classic-publication-policy";

/**
 * 小卜 MCP 工具服务（供小智官方云智能体的“MCP 接入点”调用）
 *
 * 协议：MCP JSON-RPC 2.0（与作者示例 78/mcp-calculator 相同，接入点为客户端，我们作为 MCP 服务端响应）。
 *
 * 数据边界（重要）：官方云 MCP 接入点按智能体配置，调用中**不携带热卜用户身份**。
 * 因此这里只开放公开数据：
 *   - 公开古籍书目（PUBLIC_CLASSIC_BOOK_WHERE：已发布且授权审核通过）
 *   - 排盘报告知识库中已审核（APPROVED）的门派理论与古籍出处
 *   - 平台公共内容池（全平台开放、审核通过、未删除）
 * 圈子私有知识、个人排盘报告、用户记忆一律不提供，待商业接口提供用户/设备身份后再按权限开放。
 *
 * 身份绑定工具的统一边界（2026-09-21）：
 * - 每次调用带一个 McpCallerIdentity；官方云接入点目前恒为 { verified: false }
 * - 需要身份的工具（IDENTITY_TOOLS）在未验证身份时**不出现在 tools/list**，被硬调用也拒绝（-32001）
 * - 身份只接受由服务端从供应商签名/会话映射解析出的结果，**不接受工具参数里的 userId/circleId 自报**
 * - 即便将来身份已验证，圈子工具仍逐次校验有效成员（圈子 ACTIVE、未过期），只返回本圈 active 片段
 */
export interface McpCallerIdentity {
  /** 身份是否由服务端基于供应商能力验证过（不是模型或客户端说了算） */
  verified: boolean;
  userId?: string;
  /** 本会话绑定的圈子（来自热卜会话上下文，而不是工具参数） */
  circleId?: string;
  source: "none" | "vendor_verified";
}

export const ANONYMOUS_CALLER: McpCallerIdentity = { verified: false, source: "none" };
export const IDENTITY_REQUIRED_CODE = -32001;

const PROTOCOL_VERSION = "2024-11-05";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: any;
}

const TOOLS = [
  {
    name: "search_classics",
    description:
      "在热卜公开古籍库中按书名或作者查找古籍，返回书名、作者、朝代和简介。回答时说明来自热卜古籍库；查不到就如实告诉用户没有找到，不要编造书目。",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "书名、作者或关键词，如：论语、滴天髓" } },
      required: ["query"],
    },
  },
  {
    name: "explain_bazi_term",
    description:
      "查询热卜审核过的八字命理知识（门派理论要点与古籍出处），用于解释格局、用神、十神、神煞等术语。引用时说出门派或书名；没有结果时说明知识库暂未收录，不要编造原文。",
    inputSchema: {
      type: "object",
      properties: { term: { type: "string", description: "术语，如：偏财格、用神、天乙贵人" } },
      required: ["term"],
    },
  },
  {
    name: "find_platform_content",
    description:
      "在热卜平台公开内容中查找相关的文章、课程、古籍和圈子，返回标题与类型，方便建议用户在热卜 App 中打开阅读。不要编造内容或链接。",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "想找的主题，如：易经入门" } },
      required: ["query"],
    },
  },
];

/** 需要已验证调用者身份的工具：未验证时不列出、不执行 */
const IDENTITY_TOOLS = [
  {
    name: "search_circle_knowledge",
    description:
      "在当前会话所属圈子的已发布知识中检索（只限本圈、只限有效成员）。没有结果就如实说明，不要编造圈主观点。",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "要查的主题" } },
      required: ["query"],
    },
  },
];

@Injectable()
export class XiaobuMcpServer {
  private readonly logger = new Logger(XiaobuMcpServer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly guide: ContentGuideService,
  ) {}

  /** 处理一条 JSON-RPC 消息；通知类消息返回 null（不回复） */
  async handle(raw: string, identity: McpCallerIdentity = ANONYMOUS_CALLER): Promise<string | null> {
    let req: JsonRpcRequest;
    try {
      req = JSON.parse(raw);
    } catch {
      return JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    }
    const isNotification = req.id === undefined || req.id === null;
    try {
      const result = await this.dispatch(req, identity);
      if (isNotification) return null;
      return JSON.stringify({ jsonrpc: "2.0", id: req.id, result });
    } catch (error: any) {
      if (isNotification) return null;
      const code = error?.rpcCode ?? -32603;
      return JSON.stringify({ jsonrpc: "2.0", id: req.id, error: { code, message: String(error?.message || "Internal error").slice(0, 200) } });
    }
  }

  private async dispatch(req: JsonRpcRequest, identity: McpCallerIdentity): Promise<unknown> {
    switch (req.method) {
      case "initialize":
        return {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "xiaobu-public-knowledge", version: "1.0.0" },
        };
      case "notifications/initialized":
      case "notifications/cancelled":
        return {};
      case "ping":
        return {};
      case "tools/list":
        return { tools: identity.verified ? [...TOOLS, ...IDENTITY_TOOLS] : TOOLS };
      case "tools/call":
        return this.callTool(req.params?.name, req.params?.arguments ?? {}, identity);
      default:
        throw Object.assign(new Error(`Method not found: ${req.method}`), { rpcCode: -32601 });
    }
  }

  private text(content: string, isError = false) {
    return { content: [{ type: "text", text: content }], isError };
  }

  private arg(args: Record<string, unknown>, key: string): string {
    const v = String(args?.[key] ?? "").trim().slice(0, 50);
    if (!v) throw Object.assign(new Error(`缺少参数 ${key}`), { rpcCode: -32602 });
    return v;
  }

  async callTool(name: string, args: Record<string, unknown>, identity: McpCallerIdentity = ANONYMOUS_CALLER) {
    const started = Date.now();
    try {
      switch (name) {
        case "search_circle_knowledge":
          return await this.searchCircleKnowledge(this.arg(args, "query"), identity);
        case "search_classics":
          return await this.searchClassics(this.arg(args, "query"));
        case "explain_bazi_term":
          return await this.explainTerm(this.arg(args, "term"));
        case "find_platform_content":
          return await this.findContent(this.arg(args, "query"));
        default:
          throw Object.assign(new Error(`Unknown tool: ${name}`), { rpcCode: -32602 });
      }
    } finally {
      // 不记录用户问题原文，只记工具名与耗时
      this.logger.log(`MCP tool ${name} ${Date.now() - started}ms`);
    }
  }

  private async searchClassics(query: string) {
    const books = await this.prisma.classicBook.findMany({
      where: { ...PUBLIC_CLASSIC_BOOK_WHERE, OR: [{ title: { contains: query } }, { author: { contains: query } }] },
      select: { title: true, author: true, dynasty: true, intro: true },
      take: 5,
    });
    if (!books.length) return this.text(`热卜公开古籍库中没有找到与“${query}”相关的书目。`);
    return this.text(
      "来自热卜古籍库：\n" +
        books
          .map((b) => `《${b.title}》${[b.dynasty, b.author].filter(Boolean).join("·") ? `（${[b.dynasty, b.author].filter(Boolean).join("·")}）` : ""}${b.intro ? `：${b.intro.replace(/\s+/g, " ").slice(0, 120)}` : ""}`)
          .join("\n"),
    );
  }

  private async explainTerm(term: string) {
    const rows = await this.prisma.paipanReportKnowledge.findMany({
      where: { status: "APPROVED", OR: [{ tags: { has: term } }, { title: { contains: term } }] },
      select: { kind: true, school: true, topic: true, title: true, content: true, bookTitle: true, chapterTitle: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    });
    if (!rows.length) return this.text(`热卜知识库暂未收录“${term}”的审核条目，请如实告诉用户暂无权威解释，不要编造原文。`);
    return this.text(
      "来自热卜审核知识库：\n" +
        rows
          .map((r) => {
            const source = r.kind === "classic_excerpt" ? `《${r.bookTitle}》${r.chapterTitle ? `·${r.chapterTitle}` : ""}` : r.school ? `门派理论（${r.school}）` : "通用理论";
            return `【${source}】${r.title}：${r.content.replace(/\s+/g, " ").slice(0, 300)}`;
          })
          .join("\n"),
    );
  }

  /** 圈子私有知识：只在已验证身份 + 会话绑定圈子 + 有效成员时返回本圈 active 片段 */
  private async searchCircleKnowledge(query: string, identity: McpCallerIdentity) {
    if (!identity.verified || !identity.userId || !identity.circleId) {
      throw Object.assign(new Error("该工具需要已验证的用户身份，当前语音接入未提供"), { rpcCode: IDENTITY_REQUIRED_CODE });
    }
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: identity.circleId, userId: identity.userId } },
      select: { expireAt: true, circle: { select: { status: true, deletedAt: true } } },
    });
    const valid =
      !!member && !!member.circle && !member.circle.deletedAt && member.circle.status === "ACTIVE" &&
      !(member.expireAt && new Date(member.expireAt) < new Date());
    if (!valid) {
      throw Object.assign(new Error("不是该圈有效成员"), { rpcCode: IDENTITY_REQUIRED_CODE });
    }
    const rows = await this.prisma.circleKnowledge.findMany({
      where: { circleId: identity.circleId, status: "active", content: { contains: query } },
      select: { content: true },
      orderBy: { addedAt: "desc" },
      take: 5,
    });
    if (!rows.length) return this.text(`本圈已发布资料里没有找到与“${query}”相关的内容。`);
    return this.text("来自本圈已发布资料：\n" + rows.map((r) => `- ${r.content.replace(/\s+/g, " ").slice(0, 300)}`).join("\n"));
  }

  private async findContent(query: string) {
    const { cards } = await this.guide.guide(query, 5);
    if (!cards.length) return this.text(`热卜平台暂时没有找到与“${query}”相关的公开内容。`);
    const typeName: Record<string, string> = { classic: "古籍", article: "文章", course: "课程", circle: "圈子", content: "内容" };
    return this.text(
      "热卜平台公开内容（可在热卜 App 中搜索标题打开）：\n" +
        cards.map((c) => `${typeName[c.type] || "内容"}：${c.title}${c.subtitle ? `（${c.subtitle.slice(0, 40)}）` : ""}`).join("\n"),
    );
  }
}
