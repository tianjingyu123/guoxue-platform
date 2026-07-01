import { Injectable, Logger } from "@nestjs/common";

/**
 * 内容审核第三层 —— DeepSeek 语义复审服务
 *
 * ## 在三层漏斗中的定位
 * 第1层本地敏感词库（硬拦截）→ 第2层腾讯云 TMS（Pass/Review/Block 三档）→
 * **第3层 DeepSeek 复审（本服务）**，只在腾讯云判 `Review`（疑似）时触发。
 *
 * ## 选型理由
 * - **为什么只对 Review 调用：** 降成本。腾讯云已能确定 Pass/Block 的绝大多数内容，
 *   仅"疑似"这一小部分才交大模型语义终判，单条成本可控。
 * - **为什么用 DeepSeek 兜底：** 防误杀。腾讯云 Review 若直接当拦截会误伤正常内容
 *   （国学讨论常含"化解""劫难"等词但语境正当），大模型能读懂语境。
 * - **为什么自建精简 fetch 而非注入 AiGatewayModule：** 审核是被 circle/comment/video
 *   等大量模块依赖的基础设施，保持 audit 模块零跨模块耦合，避免循环依赖。
 *
 * 未配置 DEEPSEEK_API_KEY 时优雅降级（返回 null，编排层按 fail-open 处理）。
 */
@Injectable()
export class ModerationAiService {
  private readonly logger = new Logger(ModerationAiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
    this.model = process.env.DEEPSEEK_MODERATION_MODEL || "deepseek-chat";
    if (!this.apiKey) {
      this.logger.warn("DEEPSEEK_API_KEY 未配置，第三层 AI 复审将降级（不阻断发布）");
    }
  }

  get available(): boolean {
    return !!this.apiKey;
  }

  private readonly systemPrompt = `你是国学传统文化平台的内容安全审核员。平台聚焦《易经》、中医、诗词、古籍等传统文化内容，讨论中常出现"化解""劫难""命理""驱邪"等词，多数属正当学术/文化交流，不应误判。

你的任务：判断给定文本是否应被拦截。仅在存在以下**真实违规**时才拦截（block）：
1. 色情、暴力、赌博、毒品等违法内容；
2. 政治敏感、涉恐、邪教宣传；
3. 诈骗话术（如"花钱消灾保证灵验""包治百病""稳赚不赔"引流敛财）；
4. 冒充正规医疗、承诺根治/治愈疾病；
5. 广告导流（加微信/QQ/群、外部链接引流）、辱骂攻击。

正常的传统文化知识讨论、学术观点、诗词赏析、命理科普（不涉敛财）一律放行（pass）。

只输出一个 JSON 对象，不要任何解释或 markdown 包裹，格式：
{"decision":"pass"|"block","category":"违规类别或normal","reason":"简短中文理由"}`;

  /**
   * 对腾讯云判为 Review 的疑似内容做语义终判。
   *
   * @returns `block`/`pass` 判定 + 理由；调用失败或未配置时返回 `null`（交编排层按 fail-open 决策）
   */
  async review(
    content: string,
    hints?: { labels?: string[]; scene?: string },
  ): Promise<{ decision: "pass" | "block"; category: string; reason: string } | null> {
    if (!this.available) return null;

    const text = (content ?? "").trim();
    if (!text) return { decision: "pass", category: "normal", reason: "空内容" };

    const userParts = [`待审文本：\n${text.slice(0, 2000)}`];
    if (hints?.labels?.length) userParts.push(`腾讯云疑似标签：${hints.labels.join("、")}`);
    if (hints?.scene) userParts.push(`业务场景：${hints.scene}`);

    // 审核链路对时延敏感，短超时；失败即返回 null 交编排层降级
    const signal = AbortSignal.timeout(8000);
    const started = Date.now();

    let resp: Response;
    try {
      resp = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: this.systemPrompt },
            { role: "user", content: userParts.join("\n\n") },
          ],
          temperature: 0, // 审核判定要稳定可复现，关闭随机
          max_tokens: 200,
          response_format: { type: "json_object" },
          stream: false,
        }),
        signal,
      });
    } catch (err) {
      const e = err as Error;
      this.logger.warn(
        `DeepSeek 复审请求失败（${Date.now() - started}ms）：${e.name === "TimeoutError" ? "超时" : e.message}`,
      );
      return null;
    }

    if (!resp.ok) {
      this.logger.error(`DeepSeek 复审返回 ${resp.status}`);
      return null;
    }

    try {
      const data = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = data.choices?.[0]?.message?.content?.trim() || "";
      const parsed = this.parse(raw);
      if (!parsed) {
        this.logger.warn(`DeepSeek 复审输出无法解析：${raw.slice(0, 120)}`);
        return null;
      }
      return parsed;
    } catch (err) {
      this.logger.warn(`DeepSeek 复审响应解析异常：${(err as Error).message}`);
      return null;
    }
  }

  /** 容错解析 DeepSeek 输出（兼容裸 JSON 与 ```json 包裹） */
  private parse(
    raw: string,
  ): { decision: "pass" | "block"; category: string; reason: string } | null {
    if (!raw) return null;
    let jsonStr = raw;
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1].trim();
    else {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start >= 0 && end > start) jsonStr = raw.slice(start, end + 1);
    }
    try {
      const obj = JSON.parse(jsonStr) as {
        decision?: string;
        category?: string;
        reason?: string;
      };
      const decision = obj.decision === "block" ? "block" : "pass";
      return {
        decision,
        category: obj.category || (decision === "block" ? "违规" : "normal"),
        reason: obj.reason || "",
      };
    } catch {
      return null;
    }
  }
}
