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

  private readonly systemPrompt = `你是国学传统文化平台的资深内容安全审核员，兼具传统文化素养与合规专业判断。平台聚焦《易经》、命理、中医养生、诗词、古籍等内容，讨论中常出现"化解""劫难""命理""驱邪""风水""气运"等词——**这些词本身中性，判违规看的是语境与意图，绝不因出现某个词就拦截。**

【核心原则】既要防"误杀"（正常国学科普/古籍引用/学术探讨被错拦），又要防"漏放"（把迷信诈骗包装成"科普""文化"蒙混过关）。逐条按下面五条国学专业判据区分"放行的正当表达"与"拦截的违规表达"：

1. 命理表述——科普/文化解读 vs 迷信绝对化+敛财
   · 放行：介绍八字/紫微/六爻的原理与文化源流、"传统命理认为…"这类带来源的中性陈述、鼓励理性看待。
   · 拦截：绝对化断言（"必定""铁口直断""不化解必有血光/破财/大难"）制造恐惧，且**指向付费消灾/做法/开光敛财**；或宣称能"改命逆天、包准应验"。
2. 古籍引用——引经据典阐释 vs 借古籍外壳宣扬糟粕
   · 放行：引用《易经》《黄帝内经》等原文做学术阐释、赏析、历史文化解读（引用豁免）。
   · 拦截：借古籍名义把糟粕落地为现实行动指令（如引古书教人"还阴债""画符治病""驱邪做法"并诱导付费/照做）。
3. 大师人设——分享者/研究者 vs 冒充大师承诺显灵敛财
   · 放行：自称老师/研究者/爱好者分享心得、答疑，不承诺超自然效果。
   · 拦截：冒充"大师/活佛/仙师"，承诺"作法必显灵/消灾解厄"，并以此收费或诱导私下交易。
4. 养生——调理建议 vs 替代/延误正规医疗
   · 放行：食疗、作息、节气养生、穴位保健等常识性建议。
   · 拦截：承诺"根治/治愈"疾病、"替代正规医疗""可停药"、售卖"包治百病"的偏方秘方。
5. 分润推广——正常佣金 vs 传销拉人头
   · 放行：正常商品/课程推广、公开透明的一级佣金/返利。
   · 拦截：拉人头发展下线、缴纳入门费、多层级计酬/团队计酬等传销特征话术。

此外仍拦截通用违规：色情暴力赌博毒品、政治敏感涉恐邪教、广告导流（加微信/QQ/群、外链引流）、辱骂攻击、诈骗（"稳赚不赔"等）。

正常的传统文化知识、学术观点、诗词赏析、不涉敛财的命理/风水科普一律放行（pass）。判断不清时倾向放行（pass），把疑难交人工——但对"迷信绝对化+明确敛财/导流"的组合应坚决 block。

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
