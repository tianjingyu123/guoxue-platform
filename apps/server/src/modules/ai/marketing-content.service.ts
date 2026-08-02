import { Injectable, Logger } from "@nestjs/common";
import { MarketingContentKind } from "@prisma/client";
import { calcAllJieQi } from "@guoxue/bazi-engine";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { AuditService } from "../audit/audit.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { getTermByName } from "../solar-term/solar-term.constants";
import { serverConfig } from "../../config/server-config";

/**
 * 课-P1 AI 获客内容套件（获客环）
 *
 * - 三类生成：短视频脚本 / 朋友圈文案 / 小红书图文 —— 走 AI 网关（scene=marketing_content），
 *   prompt 内置合规定性约束（依据 docs/design/合规违禁词库-首版-20260704.md：
 *   民俗文化推演参考定性、禁功效承诺(改运/化解/辟邪类)与收益承诺）；
 * - 产出过现有三层审核漏斗 audit.moderateTextOrThrow（不过即抛业务异常，不落库）；
 * - 过审后尾部自动拼从业者 ref 归因短链，落 MarketingContent(passedAudit=true)；
 * - 月限额：当月生成 ≥ MARKETING_MONTHLY_LIMIT 次 → 业务异常（限额常量导出，便于后续按角色分档）；
 * - 今日选题：节气（复用 bazi-engine calcAllJieQi 天文算法）+ 固定模板选题按日轮换 —— 纯规则拼装不调 AI。
 */

/** 月生成限额（次/自然月·后续按角色分档时以此为基线） */
export const MARKETING_MONTHLY_LIMIT = 100;

/** ref 归因短链模板（生产 H5 落地页） */
const referralLink = (userId: string): string => {
  return `${serverConfig.publicH5BaseUrl}/?ref=${encodeURIComponent(userId)}`;
};

/** 合规定性系统约束（三类生成共用·A级禁词负面约束+B级替换引导） */
const COMPLIANCE_SYSTEM = `你是国学传统文化平台的资深新媒体文案专家，为平台上的从业者（国学/命理文化老师）创作获客内容。

【合规红线·任何情况下不得违反】
1. 定性约束：所有命理/民俗相关内容一律定性为「民俗文化推演参考」——只谈文化解读、民俗寓意、趋势参考，绝不作断言式判定。
2. 禁功效承诺：绝不出现「改运、转运、改命、化解、化太岁、破解、消灾、挡灾、避祸、辟邪、驱邪、镇宅、开光加持（作功效）、法事、符咒、招财、旺财、催财、斩桃花、还阴债、超度、立杆见影、包灵验、百分百准、铁口直断、灵验」等功效承诺表述。
3. 禁确定性/收益承诺：绝不出现「保证成功/发财/复合、包好包准包过、无效退款、稳赚、必赚、一定能、躺赚、睡后收入、纯利润」等承诺。
4. 禁医疗越界：绝不出现「治病、治愈、疗效、根治」等医疗承诺。
5. 用词规范：算命→命理文化分析；预测→推演参考/趋势分析；大师/神算→老师/研究者；开运→寓意吉祥/雅趣祈愿；辟邪（描述物件时）→传统纹样/民俗寓意平安；命中注定→命理视角下的倾向；占卜→民俗推演/传统文化体验。
6. 不编造联系方式、价格、优惠或效果案例；内容积极向上，突出传统文化之美与陪伴价值。`;

/** 各内容类型的产出结构要求 */
const KIND_INSTRUCTIONS: Record<MarketingContentKind, string> = {
  SHORT_VIDEO: `请产出一份短视频脚本，用于抖音/快手/视频号，结构如下（用小标题分段，纯文本不用 Markdown 表格）：
【封面标题·3选】三个吸引人的封面标题备选
【口播稿】60秒左右的完整口播文案（口语化、有钩子开头）
【分镜建议】3-5个分镜（镜头画面+口播对应段落）`,
  MOMENTS: `请产出朋友圈文案，结构如下（纯文本）：
【文案一】【文案二】【文案三】三条风格不同的备选（每条80-140字，适度使用 emoji，有生活感与文化味）
【配图建议】一句话说明每条适合配什么图（如节气插画/茶席/书法）`,
  XIAOHONGSHU: `请产出一篇小红书图文，结构如下（纯文本）：
【标题】爆款结构标题（含数字或悬念，20字内）
【正文】300-500字正文（分段短句、适度 emoji、有干货有共鸣）
【标签】6-8个相关话题 tag（以#开头，空格分隔）`,
};

/** 固定模板选题池（与节气选题互补·按日轮换） */
const TEMPLATE_TOPICS: Array<{ title: string; desc: string }> = [
  { title: "一分钟看懂你的日主五行", desc: "从生辰天干聊五行属性，纯文化科普切入" },
  { title: "古人如何过好每一天：黄历宜忌里的生活智慧", desc: "把宜忌讲成时间管理与仪式感" },
  { title: "《论语》里最治愈的一句话", desc: "经典金句+现代生活共鸣，涨粉利器" },
  { title: "为什么中国人讲究「天人合一」", desc: "传统文化底层逻辑科普" },
  { title: "案例复盘：一次命理文化咨询能聊些什么", desc: "去神秘化，展示专业与边界感" },
  { title: "茶余饭后聊干支：今年是什么年？", desc: "干支纪年小知识，人人可参与" },
  { title: "老祖宗的育儿观：从《颜氏家训》说起", desc: "家庭教育向选题，妈妈群体友好" },
  { title: "国学入门书单：从零开始读经典", desc: "书单类内容易转发收藏" },
  { title: "传统节日的正确打开方式", desc: "结合最近的节日聊民俗与仪式感" },
  { title: "你的名字里藏着的文化密码", desc: "姓名文化漫谈，互动性强" },
];

export interface TodayTopic {
  id: string;
  title: string;
  desc: string;
  source: "JIEQI" | "TEMPLATE";
}

@Injectable()
export class MarketingContentService {
  private readonly logger = new Logger(MarketingContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AiGatewayService,
    private readonly audit: AuditService,
  ) {}

  // ───────── 日期/节气工具（Asia/Shanghai·复用 solar-term 范式） ─────────

  private todayShanghai(): { year: number; month: number; day: number; utcMidnight: number } {
    const now = new Date();
    const sh = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const year = sh.getFullYear();
    const month = sh.getMonth() + 1;
    const day = sh.getDate();
    return { year, month, day, utcMidnight: Date.UTC(year, month - 1, day) };
  }

  /** 今日是否节气日 → 节气名，否则 null */
  private findTodayTermName(): string | null {
    const { year, month, day } = this.todayShanghai();
    const map = calcAllJieQi(year);
    for (const [name, t] of map) {
      if (t.month === month && t.day === day) return name;
    }
    return null;
  }

  /** 下一节气 + 距今整天数 */
  private findNextTerm(): { name: string; daysUntil: number } | null {
    const { year, utcMidnight } = this.todayShanghai();
    let best: { name: string; daysUntil: number } | null = null;
    for (const y of [year, year + 1]) {
      const map = calcAllJieQi(y);
      for (const [name, t] of map) {
        const days = Math.round((Date.UTC(y, t.month - 1, t.day) - utcMidnight) / 86_400_000);
        if (days >= 1 && (best === null || days < best.daysUntil)) {
          best = { name, daysUntil: days };
        }
      }
    }
    return best;
  }

  // ───────── 今日选题（纯规则拼装·不调 AI） ─────────

  /**
   * GET /ai/marketing/today-topics：3-5 个今日选题
   * = 节气选题（今日节气 / 7天内的下一节气·接 calcAllJieQi 天文引擎）+ 固定模板选题按日轮换补足
   */
  todayTopics(): { date: string; topics: TodayTopic[] } {
    const { year, month, day, utcMidnight } = this.todayShanghai();
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const topics: TodayTopic[] = [];

    // 1) 今日节气（内容库有三候/习俗/诗句，选题给足抓手）
    const todayName = this.findTodayTermName();
    if (todayName) {
      const term = getTermByName(todayName);
      topics.push({
        id: `jieqi-today-${todayName}`,
        title: `今日${todayName}｜应景内容黄金日`,
        desc: term ? `习俗：${term.custom}；养生：${term.health}——节气当天发布互动最高` : `${todayName}节气当天发布互动最高`,
        source: "JIEQI",
      });
    }

    // 2) 7天内的下一节气（提前预热）
    const next = this.findNextTerm();
    if (next && next.daysUntil <= 7) {
      topics.push({
        id: `jieqi-next-${next.name}`,
        title: `${next.daysUntil}天后${next.name}｜提前预热正当时`,
        desc: `节气前2-3天发预热内容，${next.name}当天发正片，形成连载感`,
        source: "JIEQI",
      });
    }

    // 3) 固定模板选题按日轮换补足到 4 个（上限 5）
    const dayIndex = Math.floor(utcMidnight / 86_400_000); // 天序号，稳定轮换
    const want = Math.max(4 - topics.length, 2);
    for (let i = 0; i < want && topics.length < 5; i++) {
      const t = TEMPLATE_TOPICS[(dayIndex + i) % TEMPLATE_TOPICS.length];
      topics.push({ id: `tpl-${(dayIndex + i) % TEMPLATE_TOPICS.length}`, title: t.title, desc: t.desc, source: "TEMPLATE" });
    }

    return { date, topics };
  }

  // ───────── 内容生成（AI 网关 + 审核漏斗 + ref 短链 + 月限额） ─────────

  /** 当月已生成次数 */
  private async monthlyUsed(userId: string): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.prisma.marketingContent.count({
      where: { userId, createdAt: { gte: monthStart } },
    });
  }

  /**
   * 生成营销内容：限额校验 → AI 网关生成（合规 prompt）→ 审核漏斗 → 拼 ref 短链 → 落库(passedAudit=true)
   */
  async generate(userId: string, kind: MarketingContentKind, topic: string, style?: string) {
    // 1. 月限额（常量导出，后续按角色分档）
    const used = await this.monthlyUsed(userId);
    if (used >= MARKETING_MONTHLY_LIMIT) {
      throw new BusinessException(
        ErrorCode.RATE_LIMITED,
        `本月生成额度已用完（${MARKETING_MONTHLY_LIMIT} 次/月），下月自动恢复`,
      );
    }

    // 2. AI 网关生成（合规定性约束内置于 system prompt）
    const messages: AiMessage[] = [
      { role: "system", content: COMPLIANCE_SYSTEM },
      {
        role: "user",
        content: `主题：${topic}${style ? `\n风格要求：${style}` : ""}\n\n${KIND_INSTRUCTIONS[kind]}`,
      },
    ];
    const result = await this.gateway.chat({
      scene: "marketing_content",
      userId,
      messages,
      options: { temperature: 0.8, maxTokens: 1500 },
      // 创作型场景跳过语义缓存：固定指令占比大易误命中，且「重新生成」要求每次都是新内容
      skipCache: true,
    });
    const body = result.content?.trim();
    if (!body) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "生成失败，请稍后重试");
    }

    // 3. 产出过现有三层审核漏斗（词库→腾讯→AI 复审·违规抛业务异常，不落库）
    await this.audit.moderateTextOrThrow(body, { scene: "MARKETING_CONTENT", userId });

    // 4. 尾部自动拼从业者 ref 归因短链（获客内容把客户资产沉淀回平台）
    const content = `${body}\n\n—— 更多传统文化内容：${referralLink(userId)}`;

    // 5. 落库留痕（passedAudit=true）
    const record = await this.prisma.marketingContent.create({
      data: { userId, kind, topic, content, passedAudit: true },
    });
    this.logger.log(`营销内容生成 [user=${userId}] kind=${kind} 当月第${used + 1}次`);

    return {
      id: record.id,
      kind,
      topic,
      content,
      monthlyUsed: used + 1,
      monthlyLimit: MARKETING_MONTHLY_LIMIT,
    };
  }
}
