import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "./ai-gateway.service";
import { CapabilityRegistryService } from "./capability-registry.service";

export interface NlQueryResult {
  sql: string;
  data: Record<string, unknown>[];
  rowCount: number;
  chartSuggestion?: {
    type: "line" | "bar" | "pie" | "table";
    xField?: string;
    yField?: string;
    title: string;
  };
  aiSummary?: string;
}

/**
 * AI数据探索服务 (NL2SQL MVP)
 *
 * 管理后台的自然语言数据查询能力。
 * 让运营人员用中文提问，AI自动转SQL、查数据、生成图表建议和解读。
 *
 * 使用方式：
 * - 管理后台嵌入 ChatUI，用户输入自然语言问题
 * - 本服务将问题转SQL → 执行查询 → AI解读结果
 * - 返回结构化数据 + 图表建议 + AI摘要
 */
@Injectable()
export class DataExplorerService {
  private readonly logger = new Logger(DataExplorerService.name);

  // 数据库 Schema 摘要，供 AI 理解表结构
  private readonly SCHEMA_CONTEXT = `
你是一个 SQL 专家。数据库是 PostgreSQL。以下是可查询的表和关键字段：

用户相关：
- "User": id, nickname, phone, email, role, status, createdAt
- "Auth": id, userId, provider( WECHAT / PASSWORD), createdAt

内容相关：
- "Content": id, title, type( ARTICLE / POEM / CLASSIC / COURSE), body, excerpt, author, dynasty, tags, status( DRAFT / PUBLISHED), viewCount, createdAt
- "Comment": id, contentId, userId, body, createdAt

付费相关：
- "Order": id, userId, amount, status( pending / paid / refunded / cancelled), createdAt
- "Subscription": id, userId, planId, status, startDate, endDate

用户行为：
- "Favorite": id, userId, contentId, createdAt
- "ToolRecord": id, userId, toolId, input, createdAt

分站相关：
- "Station": id, name, status, createdAt

AI相关：
- "AiEvent": id, type, source, severity, status, createdAt
- "AiDecision": id, agentId, confidence, riskLevel, humanAction, createdAt
- "AiCollaboration": id, type, title, status, riskLevel, createdAt

查询规则：
1. 只生成 SELECT 查询，禁止 INSERT/UPDATE/DELETE/DROP
2. 使用双引号包裹表名和字段名（PostgreSQL 区分大小写）
3. LIMIT 最多 1000 条
4. 时间字段为 TIMESTAMP 类型，用 ISO 8601 格式比较
5. 使用 COALESCE 处理可能的 NULL 聚合
6. 只返回纯 SQL，不要解释，不要 markdown 代码块
`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AiGatewayService,
    private readonly registry: CapabilityRegistryService,
  ) {
    // 自注册到能力注册中心
    this.registry
      .register({
        name: "admin-data-explorer",
        description: "管理端AI数据探索 - 自然语言查询数据库",
        scene: ["管理端"],
        modality: ["text"],
        capabilityType: "analysis",
        provider: "deepseek",
        model: "deepseek-v4-pro",
        inputSchema: {
          type: "object",
          properties: { question: { type: "string", description: "自然语言问题" } },
        },
        outputSchema: {
          type: "object",
          properties: {
            sql: { type: "string" },
            data: { type: "array" },
            chartSuggestion: { type: "object" },
            aiSummary: { type: "string" },
          },
        },
      })
      .catch((err) => this.logger.warn(`能力注册失败: ${err.message}`));
  }

  /** 自然语言查询 */
  async ask(question: string): Promise<NlQueryResult> {
    const startTime = Date.now();

    // 1. NL → SQL
    const sql = await this.generateSql(question);

    // 2. 执行 SQL（安全检查后）
    if (!this.isSafeSql(sql)) {
      throw new Error("生成的SQL包含不安全操作，已被拦截");
    }

    // 3. 服务端强制 LIMIT (defense-in-depth)，包装为子查询避免与已有 LIMIT 冲突
    const safeSql = `SELECT * FROM (${sql.replace(/;+$/, "")}) AS _explorer LIMIT 1000`;

    let data: Record<string, unknown>[] = [];
    try {
      // 超时保护：Prima 层面设置 statement_timeout
      await this.prisma.$executeRawUnsafe("SET LOCAL statement_timeout = '10s'");
      data = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        safeSql,
      );
    } catch (err: any) {
      this.logger.warn(`SQL执行失败: ${err.message}`);
      throw new Error(`查询执行失败: ${err.message}`);
    }

    // 3. 生成图表建议
    const chartSuggestion = this.suggestChart(question, data);

    // 4. AI解读结果
    let aiSummary: string | undefined;
    try {
      aiSummary = await this.summarizeResult(question, data);
    } catch (err: any) {
      this.logger.debug(`AI解读失败: ${err.message}`);
    }

    // 记录调用
    this.registry
      .recordCall("admin-data-explorer", true, Date.now() - startTime)
      .catch(() => {});

    return {
      sql,
      data,
      rowCount: data.length,
      chartSuggestion,
      aiSummary,
    };
  }

  /** NL → SQL */
  private async generateSql(question: string): Promise<string> {
    const result = await this.aiGateway.chat({
      scene: "nl2sql",
      messages: [
        { role: "system", content: this.SCHEMA_CONTEXT },
        { role: "user", content: question },
      ],
      options: { maxTokens: 500, temperature: 0.1 },
    });

    // 清理 AI 输出
    let sql = result.content.trim();
    sql = sql.replace(/```sql\s*/gi, "").replace(/```\s*/g, "");
    sql = sql.replace(/^sql\s*/i, "");
    sql = sql.trim();

    if (!sql.toUpperCase().startsWith("SELECT")) {
      throw new Error("AI 未生成有效的 SELECT 查询");
    }

    return sql;
  }

  /** SQL安全检查：白名单优先 + 黑名单兜底 */
  private isSafeSql(sql: string): boolean {
    // 1. 必须是 SELECT 或 WITH (CTE) 开头
    const trimmed = sql.trim();
    if (!/^SELECT\b|^WITH\b/i.test(trimmed)) {
      this.logger.warn("SQL非SELECT/WITH开头，已拦截");
      return false;
    }

    // 2. 禁止多语句
    if (/;[\s\S]*\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|WITH|EXEC)\b/i.test(trimmed)) {
      this.logger.warn("多语句SQL被拦截");
      return false;
    }

    // 3. 黑名单：DML/DDL 关键字 + 危险函数
    // 用单词边界匹配，避免误杀字段名中的子串
    const upper = trimmed.toUpperCase();
    const forbidden = [
      /\bINSERT\b/, /\bUPDATE\b/, /\bDELETE\b/, /\bDROP\b/,
      /\bALTER\b/, /\bTRUNCATE\b/, /\bCREATE\b/,
      /\bGRANT\b/, /\bREVOKE\b/, /\bEXEC\b/, /\bEXECUTE\b/,
      /\bCOPY\b/,
      /\bPG_READ_FILE\b/, /\bPG_READ_BINARY_FILE\b/,
      /\bPG_WRITE_FILE\b/, /\bPG_LS_DIR\b/,
      /\bPG_SLEEP\b/,
      /\bLO_IMPORT\b/, /\bLO_EXPORT\b/,
      /\bPG_TERMINATE_BACKEND\b/, /\bPG_CANCEL_BACKEND\b/,
      /\bNEXTVAL\b/, /\bSETVAL\b/, /\bCURRVAL\b/,
      /\bTXID_CURRENT\b/,
      /\bINTO\s+(OUTFILE|DUMPFILE)\b/i,
      /\bPG_SHADOW\b/, /\bPG_AUTHID\b/,
    ];
    for (const pattern of forbidden) {
      if (pattern.test(upper)) {
        const match = upper.match(pattern)?.[0] ?? "";
        this.logger.warn(`不安全SQL被拦截: ${match}`);
        return false;
      }
    }
    return true;
  }

  /** 自动推荐图表类型 */
  private suggestChart(
    question: string,
    data: Record<string, unknown>[],
  ): NlQueryResult["chartSuggestion"] {
    if (data.length === 0) return { type: "table", title: "查询结果为空" };

    const keys = Object.keys(data[0]);
    if (keys.length === 0) return { type: "table", title: "查询结果" };

    // 检测可能的时间字段
    const timeKey = keys.find(
      (k) =>
        k.toLowerCase().includes("date") ||
        k.toLowerCase().includes("time") ||
        k.toLowerCase().includes("day") ||
        k.toLowerCase().includes("month") ||
        k.toLowerCase().includes("created") ||
        k.toLowerCase().includes("at"),
    );

    // 检测数值字段
    const numericKey = keys.find((k) => {
      const val = data[0][k];
      return typeof val === "number";
    });

    // 检测分类字段（少量不同值）
    const categoryKey = keys.find((k) => {
      const vals = new Set(data.slice(0, 10).map((d) => String(d[k])));
      return vals.size >= 2 && vals.size <= 10;
    });

    if (timeKey && numericKey) {
      return {
        type: "line",
        title: `${numericKey} 趋势`,
        xField: timeKey,
        yField: numericKey,
      };
    }

    if (categoryKey && numericKey) {
      return {
        type: "bar",
        title: `${categoryKey} 分布对比`,
        xField: categoryKey,
        yField: numericKey,
      };
    }

    if (categoryKey && data.length <= 10) {
      return {
        type: "pie",
        title: `${categoryKey} 占比`,
        xField: categoryKey,
      };
    }

    return { type: "table", title: "查询结果" };
  }

  /** AI解读数据 */
  private async summarizeResult(
    question: string,
    data: Record<string, unknown>[],
  ): Promise<string> {
    if (data.length === 0) return "未查询到相关数据。";

    const sample = data.slice(0, 20);
    const sampleStr = JSON.stringify(sample, null, 2);

    const result = await this.aiGateway.chat({
      scene: "data-summary",
      messages: [
        {
          role: "system",
          content:
            "你是数据分析师。用户问了问题，你拿到了查询结果的前20行。请用2-3句话总结数据要点，包括：最大值/最小值/趋势/异常。控制在150字以内。",
        },
        {
          role: "user",
          content: `用户问题：${question}\n\n查询结果（前${sample.length}行，共${data.length}行）：\n${sampleStr}`,
        },
      ],
      options: { maxTokens: 300 },
    });

    return result.content;
  }

  /** 获取数据库Schema摘要（供AI对话上下文） */
  getSchemaContext(): string {
    return this.SCHEMA_CONTEXT;
  }
}
