import { Injectable, Logger, Optional } from "@nestjs/common";
import { AiGatewayService } from "./ai-gateway.service";
import { VectorService } from "./vector.service";
import { AiMessage } from "./adapters/base.adapter";
import { SystemService } from "../system/system.service";

interface CustomerServiceFaqEntry {
  category: string;
  question: string;
  answer: string;
}

interface CustomerServiceRules {
  keywords: string[];
  lowConfidenceThreshold: number;
  maxEmptyResponses: number;
  workHours: [string, string];
  offHoursMessage: string;
}

interface FaqMatch extends CustomerServiceFaqEntry {
  score: number;
}

interface PreparedCustomerReply {
  messages: AiMessage[];
  sources: Array<{ content: string; similarity: number }>;
  needHuman: boolean;
  humanGuidance: string;
  directAnswer?: string;
}

const DEFAULT_FAQ: CustomerServiceFaqEntry[] = [
  {
    category: "平台使用",
    question: "如何注册账号？",
    answer: "打开平台，点击「我的」→「立即登录」，输入手机号获取验证码即可注册。",
  },
  {
    category: "平台使用",
    question: "忘记密码怎么办？",
    answer: "在登录页点击「忘记密码」，输入手机号并完成验证码校验后即可设置新密码。",
  },
  {
    category: "平台使用",
    question: "如何成为会员？",
    answer: "进入「我的」→「会员中心」，选择适合的会员套餐并完成支付后即可享受相应权益。",
  },
  {
    category: "内容学习",
    question: "如何搜索古籍内容？",
    answer: "在首页顶部搜索框输入作者、篇名或名句等关键词，系统会展示相关结果。",
  },
  {
    category: "内容学习",
    question: "内容可以离线阅读吗？",
    answer: "部分内容支持缓存；如果详情页显示「下载」入口，可按页面提示缓存后离线阅读。",
  },
  {
    category: "支付退款",
    question: "支持哪些支付方式？",
    answer: "平台当前支持页面实际展示的支付方式；不同终端和业务可用渠道可能不同，请以下单页为准。",
  },
  {
    category: "支付退款",
    question: "如何申请退款？",
    answer: "请进入对应订单详情，点击「申请退款」并填写原因。是否可退及处理进度以订单页面和平台审核结果为准。",
  },
];

const DEFAULT_RULES: CustomerServiceRules = {
  keywords: ["退款", "投诉", "举报", "人工", "客服"],
  lowConfidenceThreshold: 0.3,
  maxEmptyResponses: 3,
  workHours: ["09:00", "18:00"],
  offHoursMessage: "当前为非工作时间，客服将在工作日 9:00-18:00 处理，请先通过「帮助与反馈」留言。",
};

const HUMAN_REPLY_PATTERN = /转人工|人工客服|人工协助|无法确认|没有找到可靠|暂时无法/;
const SMALL_TALK_PATTERN = /^(你好|您好|在吗|嗨|hello|hi|谢谢|感谢|再见)[！!。,.，\s]*$/i;
const MAX_FAQ_ENTRIES = 100;
const MAX_FAQ_CONTEXT = 6000;

/** 客服系统提示词（品牌名走 BrandConfig 注入·其余语义保持稳定） */
const buildCustomerServicePrompt = (brandName: string) => `你是${brandName}平台的智能客服助手。你的职责是帮助用户解决平台使用问题。

规则：
1. 优先根据“平台 FAQ”和“知识库内容”回答，不要编造信息
2. 平台 FAQ 的优先级高于通用知识库；存在冲突时以平台 FAQ 为准
3. 如果没有可靠资料，诚实说明，并建议用户通过“我的 → 设置 → 帮助与反馈”提交人工协助
4. 回答风格亲切友好，使用简洁中文
5. 除了处理问题，你也是平台内容向导：用户需要继续了解时，优先引导到相关工具、文章、古籍、短视频、直播或智能体
6. 课程、圈子、商品只在用户明确表达系统学习、加入交流或购买意图时推荐；必须说明推荐理由，涉及价格时明确标注，不使用恐吓、夸大、制造焦虑或假装“恰好懂你”的话术
7. 每次最多给两个下一步，相关性不足就不推荐；不要为了销售打断问题处理
8. 不要承诺退款、赔偿、到账时间等需要人工处理的事项
9. 不要声称“已经转接人工”或“已经创建工单”，除非系统明确告知已完成`;

@Injectable()
export class CustomerServiceService {
  private readonly logger = new Logger(CustomerServiceService.name);

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly vector: VectorService,
    // SystemModule 为 @Global 导出；@Optional 保证隔离单测仍可使用安全默认值
    @Optional() private readonly systemService?: SystemService,
  ) {}

  /** 智能客服对话（非流式 + 后台 FAQ + RAG） */
  async ask(
    question: string,
    userId?: string,
    history?: AiMessage[],
  ): Promise<{ answer: string; needHuman: boolean; sources?: Array<{ content: string; similarity: number }> }> {
    const prepared = await this.prepareReply(question, history);
    if (prepared.directAnswer) {
      return {
        answer: this.appendHumanGuidance(prepared.directAnswer, prepared.needHuman, prepared.humanGuidance),
        needHuman: prepared.needHuman,
        sources: prepared.sources,
      };
    }

    const result = await this.gateway.chat({
      scene: "customer_service",
      userId,
      messages: prepared.messages,
      options: { temperature: 0.3, maxTokens: 1024 },
    });

    const needHuman = prepared.needHuman || HUMAN_REPLY_PATTERN.test(result.content);
    return {
      answer: this.appendHumanGuidance(result.content, needHuman, prepared.humanGuidance),
      needHuman,
      sources: prepared.sources,
    };
  }

  /** 智能客服流式对话（后台 FAQ 直接命中时免大模型；其余走 RAG 流式） */
  async *askStream(
    question: string,
    userId?: string,
    history?: AiMessage[],
  ): AsyncIterable<string> {
    const prepared = await this.prepareReply(question, history);
    if (prepared.directAnswer) {
      yield this.appendHumanGuidance(prepared.directAnswer, prepared.needHuman, prepared.humanGuidance);
      return;
    }

    let emitted = "";
    for await (const chunk of this.gateway.chatStream({
      scene: "customer_service",
      userId,
      messages: prepared.messages,
      options: { temperature: 0.3, maxTokens: 1024 },
    })) {
      emitted = (emitted + chunk).slice(-12000);
      yield chunk;
    }

    const needHuman = prepared.needHuman || HUMAN_REPLY_PATTERN.test(emitted);
    if (needHuman && !this.containsHumanGuidance(emitted, prepared.humanGuidance)) {
      yield `\n\n${prepared.humanGuidance}`;
    }
  }

  private async prepareReply(question: string, history?: AiMessage[]): Promise<PreparedCustomerReply> {
    const cleanQuestion = question.trim().slice(0, 4000);
    const [{ faq, rules }, brandName] = await Promise.all([
      this.loadCustomerSettings(),
      this.getBrandName(),
    ]);
    const faqMatches = this.rankFaq(cleanQuestion, faq);
    const directFaq = faqMatches[0]?.score >= 0.9 ? faqMatches[0] : undefined;

    let chunks: Array<{ id: string; content: string; similarity: number }> = [];
    if (!directFaq) {
      try {
        const [queryVector] = await this.vector.embed([cleanQuestion]);
        if (queryVector) chunks = await this.vector.searchPublicKnowledge(queryVector, 5);
      } catch (error) {
        // 客服属于可降级链路：向量服务异常时继续使用后台 FAQ + 大模型，不让整次对话网络失败
        this.logger.warn(`客服知识检索降级：${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const confidence = Math.max(faqMatches[0]?.score ?? 0, chunks[0]?.similarity ?? 0);
    const keywordHit = rules.keywords.some((keyword) => keyword && cleanQuestion.includes(keyword));
    const explicitTransfer = /转人工|人工客服|人工协助/.test(cleanQuestion);
    const repeatedInvalid = this.countTrailingInvalidReplies(history) >= rules.maxEmptyResponses;
    const lowConfidence = !SMALL_TALK_PATTERN.test(cleanQuestion)
      && rules.lowConfidenceThreshold > 0
      && confidence < rules.lowConfidenceThreshold;
    const needHuman = explicitTransfer || keywordHit || repeatedInvalid || lowConfidence;
    const humanGuidance = this.buildHumanGuidance(rules);

    const faqContext = this.buildFaqContext(faqMatches);
    const vectorContext = chunks.length
      ? chunks.map((chunk, index) => `[知识库${index + 1}] ${chunk.content}`).join("\n\n")
      : "";
    const contextSections = [faqContext, vectorContext].filter(Boolean).join("\n\n");
    const transferInstruction = needHuman
      ? "本轮已触发人工协助提示规则。请先尽力回答可确认的信息；不要声称已经转接或已经创建工单。回答结束后系统会自动附加人工协助入口说明。"
      : "";

    const messages: AiMessage[] = [
      { role: "system", content: buildCustomerServicePrompt(brandName) },
      ...(contextSections ? [{ role: "system", content: contextSections } as AiMessage] : []),
      ...(transferInstruction ? [{ role: "system", content: transferInstruction } as AiMessage] : []),
      ...this.sanitizeHistory(history),
      { role: "user", content: cleanQuestion },
    ];

    const faqSources = faqMatches.slice(0, 3).map((entry) => ({
      content: `平台FAQ·${entry.category}：${entry.question} ${entry.answer}`.slice(0, 300),
      similarity: entry.score,
    }));
    const vectorSources = chunks.slice(0, 3).map((chunk) => ({
      content: chunk.content.slice(0, 300),
      similarity: chunk.similarity,
    }));

    return {
      messages,
      sources: [...faqSources, ...vectorSources].slice(0, 3),
      needHuman,
      humanGuidance,
      directAnswer: explicitTransfer && !directFaq
        ? "这个问题需要人工协助处理。"
        : directFaq?.answer,
    };
  }

  private async loadCustomerSettings(): Promise<{ faq: CustomerServiceFaqEntry[]; rules: CustomerServiceRules }> {
    if (!this.systemService) return { faq: DEFAULT_FAQ, rules: DEFAULT_RULES };
    try {
      const [faqRow, rulesRow] = await Promise.all([
        this.systemService.getConfig("customer_service_faq"),
        this.systemService.getConfig("customer_service_rules"),
      ]);
      return {
        faq: this.parseFaqConfig(faqRow?.configValue),
        rules: this.parseRulesConfig(rulesRow?.configValue),
      };
    } catch (error) {
      this.logger.warn(`读取智能客服运营配置失败，使用安全默认值：${error instanceof Error ? error.message : String(error)}`);
      return { faq: DEFAULT_FAQ, rules: DEFAULT_RULES };
    }
  }

  private parseFaqConfig(raw?: string): CustomerServiceFaqEntry[] {
    if (!raw) return DEFAULT_FAQ;
    try {
      const parsed = JSON.parse(raw) as {
        entries?: Record<string, Array<{ q?: unknown; a?: unknown }>>;
        catNames?: Record<string, string>;
      };
      if (!parsed.entries || typeof parsed.entries !== "object" || Array.isArray(parsed.entries)) return DEFAULT_FAQ;
      const entries: CustomerServiceFaqEntry[] = [];
      for (const [categoryKey, categoryEntries] of Object.entries(parsed.entries)) {
        if (!Array.isArray(categoryEntries)) continue;
        const category = String(parsed.catNames?.[categoryKey] || categoryKey).trim().slice(0, 60) || "未分类";
        for (const item of categoryEntries) {
          const question = typeof item?.q === "string" ? item.q.trim().slice(0, 240) : "";
          const answer = typeof item?.a === "string" ? item.a.trim().slice(0, 2000) : "";
          if (question && answer) entries.push({ category, question, answer });
          if (entries.length >= MAX_FAQ_ENTRIES) return entries;
        }
      }
      // 已存在有效配置但运营人员主动清空时应尊重清空结果，不偷偷恢复默认 FAQ
      return entries;
    } catch (error) {
      this.logger.warn(`智能客服 FAQ 配置解析失败，使用安全默认值：${error instanceof Error ? error.message : String(error)}`);
      return DEFAULT_FAQ;
    }
  }

  private parseRulesConfig(raw?: string): CustomerServiceRules {
    if (!raw) return DEFAULT_RULES;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const keywords = Array.isArray(parsed.keywords)
        ? parsed.keywords
        : typeof parsed.keywordsStr === "string"
          ? parsed.keywordsStr.split(/[，,、\n]/)
          : DEFAULT_RULES.keywords;
      const normalizedKeywords = keywords
        .map((item) => String(item).trim())
        .filter(Boolean)
        .slice(0, 50);
      const threshold = Number(parsed.lowConfidenceThreshold);
      const maxEmpty = Number(parsed.maxEmptyResponses);
      const workHours = Array.isArray(parsed.workHours) && parsed.workHours.length >= 2
        ? [this.normalizeClock(parsed.workHours[0], "09:00"), this.normalizeClock(parsed.workHours[1], "18:00")] as [string, string]
        : DEFAULT_RULES.workHours;
      return {
        keywords: normalizedKeywords,
        lowConfidenceThreshold: Number.isFinite(threshold) ? Math.min(1, Math.max(0, threshold)) : DEFAULT_RULES.lowConfidenceThreshold,
        maxEmptyResponses: Number.isInteger(maxEmpty) ? Math.min(10, Math.max(1, maxEmpty)) : DEFAULT_RULES.maxEmptyResponses,
        workHours,
        offHoursMessage: typeof parsed.offHoursMessage === "string" && parsed.offHoursMessage.trim()
          ? parsed.offHoursMessage.trim().slice(0, 500)
          : DEFAULT_RULES.offHoursMessage,
      };
    } catch (error) {
      this.logger.warn(`智能客服规则配置解析失败，使用安全默认值：${error instanceof Error ? error.message : String(error)}`);
      return DEFAULT_RULES;
    }
  }

  private rankFaq(question: string, entries: CustomerServiceFaqEntry[]): FaqMatch[] {
    const normalizedQuestion = this.normalizeText(question);
    if (!normalizedQuestion) return [];
    return entries
      .map((entry) => ({ ...entry, score: this.textSimilarity(normalizedQuestion, this.normalizeText(entry.question)) }))
      .filter((entry) => entry.score >= 0.2)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
  }

  private normalizeText(value: string): string {
    return value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/^(请问|麻烦问一下|麻烦|我想问一下|我想问)/, "")
      .replace(/[\s\p{P}\p{S}]/gu, "");
  }

  private textSimilarity(left: string, right: string): number {
    if (!left || !right) return 0;
    if (left === right) return 1;
    if (left.includes(right) || right.includes(left)) {
      const ratio = Math.min(left.length, right.length) / Math.max(left.length, right.length);
      return 0.78 + ratio * 0.22;
    }
    const leftPairs = this.toPairs(left);
    const rightPairs = this.toPairs(right);
    const pairScore = this.diceScore(leftPairs, rightPairs);
    const charScore = this.diceScore(new Set([...left]), new Set([...right])) * 0.8;
    return Math.max(pairScore, charScore);
  }

  private toPairs(value: string): Set<string> {
    if (value.length < 2) return new Set([value]);
    const result = new Set<string>();
    for (let index = 0; index < value.length - 1; index += 1) result.add(value.slice(index, index + 2));
    return result;
  }

  private diceScore(left: Set<string>, right: Set<string>): number {
    if (!left.size || !right.size) return 0;
    let intersection = 0;
    for (const item of left) if (right.has(item)) intersection += 1;
    return (2 * intersection) / (left.size + right.size);
  }

  private buildFaqContext(matches: FaqMatch[]): string {
    let total = 0;
    const lines: string[] = [];
    for (const [index, match] of matches.entries()) {
      const line = `[平台FAQ${index + 1}·${match.category}] 问：${match.question}\n答：${match.answer}`;
      if (total + line.length > MAX_FAQ_CONTEXT) break;
      lines.push(line);
      total += line.length;
    }
    return lines.join("\n\n");
  }

  private sanitizeHistory(history?: AiMessage[]): AiMessage[] {
    if (!Array.isArray(history)) return [];
    return history
      .slice(-8)
      .filter((message) => ["user", "assistant"].includes(message?.role) && typeof message?.content === "string")
      .map((message) => ({ role: message.role, content: message.content.slice(0, 4000) }));
  }

  private countTrailingInvalidReplies(history?: AiMessage[]): number {
    if (!Array.isArray(history)) return 0;
    let count = 0;
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const message = history[index];
      if (message.role !== "assistant") continue;
      if (HUMAN_REPLY_PATTERN.test(message.content) || !message.content.trim()) count += 1;
      else break;
    }
    return count;
  }

  private normalizeClock(value: unknown, fallback: string): string {
    if (typeof value === "string" && /^([01]?\d|2[0-3]):[0-5]\d$/.test(value)) {
      const [hours, minutes] = value.split(":").map(Number);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
    const date = new Date(String(value ?? ""));
    if (Number.isNaN(date.getTime())) return fallback;
    return this.clockInShanghai(date);
  }

  private clockInShanghai(date: Date): string {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const hour = parts.find((part) => part.type === "hour")?.value || "00";
    const minute = parts.find((part) => part.type === "minute")?.value || "00";
    return `${hour}:${minute}`;
  }

  private isWithinWorkHours(rules: CustomerServiceRules, now = new Date()): boolean {
    const toMinutes = (clock: string) => {
      const [hours, minutes] = clock.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const current = toMinutes(this.clockInShanghai(now));
    const start = toMinutes(rules.workHours[0]);
    const end = toMinutes(rules.workHours[1]);
    return start <= end ? current >= start && current < end : current >= start || current < end;
  }

  private buildHumanGuidance(rules: CustomerServiceRules): string {
    if (!this.isWithinWorkHours(rules)) return rules.offHoursMessage;
    return "如需人工处理，请前往「我的 → 设置 → 帮助与反馈」提交问题，平台客服会在后台跟进。";
  }

  private appendHumanGuidance(answer: string, needHuman: boolean, guidance: string): string {
    if (!needHuman || this.containsHumanGuidance(answer, guidance)) return answer;
    return `${answer.trim()}\n\n${guidance}`;
  }

  private containsHumanGuidance(answer: string, guidance: string): boolean {
    return answer.includes("帮助与反馈") || (guidance.length > 8 && answer.includes(guidance.slice(0, 8)));
  }

  /** 品牌名（后台 BrandConfig 可配·拉取失败/未注入时兜底） */
  private async getBrandName(): Promise<string> {
    try {
      const cfg = await this.systemService?.getBrandConfig();
      return (cfg as { siteName?: string } | undefined)?.siteName || "热卜国学";
    } catch {
      return "热卜国学";
    }
  }
}
