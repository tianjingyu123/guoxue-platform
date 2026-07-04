import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { calcShiShen, GAN, ZHI, NA_YIN, type Gan, type Zhi } from "@guoxue/bazi-engine";

/**
 * 创-P2 AI 实时创作三能力（任务九补完·后端）
 *
 * 1. classic-quotes 古籍引用推荐：关键词检索 46 万章古籍（滑窗分词+去停用词→contains 倒排近似）
 *    + AI 相关性复排（便宜档·失败降级词频排）。
 *    ⚠️ 检索层契约：candidates = retrieveClassicCandidates(keywords) —— embedding 密钥就绪后，
 *    仅需把该函数替换为向量检索实现（text→embedding→topK），上层复排与返回契约无缝保留。
 * 2. paipan-card 命盘卡渲染：四柱干支 或 本人排盘记录 → 结构化盘面 JSON（前端 canvas/组件渲染，不出图片）。
 *    卡内只含干支/五行/十神，**不含姓名与生辰**（R3 脱敏由构造保证）；记录路径强校验归属本人（他人记录=404）。
 * 3. similar-cases 相似案例：检索域=作者本人历史帖 + 全站公开已发布帖（Post.status=PUBLISHED），
 *    严禁触达 CRM/他人私有数据（R3）；按质量分（ContentQualityScore·无分默认0）×关键词命中排序。
 */

/** AI 场景名（未在路由表单配时走 default=deepseek-v4-flash 便宜档，正合复排用途） */
export const CREATION_ASSIST_SCENE = "creation_assist";

/** 古籍候选检索条数（复排前） */
const CLASSIC_CANDIDATE_TAKE = 20;
/** 古籍引用返回条数（复排后） */
const CLASSIC_QUOTE_TOP = 3;
/** 引用片段长度（字） */
const QUOTE_LEN = 120;
/** 相似案例候选条数（排序前） */
const CASE_CANDIDATE_TAKE = 30;
/** 相似案例返回条数 */
const CASE_TOP = 5;

/** 停用字集（常见虚词/功能字——含任一停用字的词组不作为检索关键词） */
const STOP_CHARS = new Set(
  "的了着吗呢吧啊呀哦嘛么些是在有和与及或就都还也很挺太被把让向从对为于因所以但而且然后现已经可以应该能够我你他她它咱您们这那哪谁什怎如果虽由关通随并且不没之其此某每各再又将会要请只更最" .split(""),
);

/** 天干五行（本地查表——bazi-engine 未导出 GAN_WU_XING，此处为标准固定映射） */
const GAN_WU_XING: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
/** 地支五行（本地查表·标准固定映射） */
const ZHI_WU_XING: Record<string, string> = {
  寅: "木", 卯: "木", 巳: "火", 午: "火", 辰: "土", 戌: "土", 丑: "土", 未: "土", 申: "金", 酉: "金", 亥: "水", 子: "水",
};
const WU_XING_LIST = ["木", "火", "土", "金", "水"] as const;

interface ClassicCandidate {
  chapterId: string;
  chapterTitle: string;
  bookId: string;
  bookTitle: string;
  excerpt: string;
  hitScore: number;
}

export interface ClassicQuoteItem {
  quote: string;
  bookTitle: string;
  chapterTitle: string;
  chapterId: string;
  bookId: string;
}

export interface PaipanCardPillar {
  gan: string;
  zhi: string;
  ganZhi: string;
  nayin: string;
  ganShiShen: string;
  zhiShiShen: string;
}

export interface PaipanCard {
  source: "ganzhi" | "record";
  recordId?: string;
  paipanType?: string;
  /** 四柱（含纳音/十神）——不含姓名与生辰（R3 脱敏由构造保证） */
  siZhu: { nian: PaipanCardPillar; yue: PaipanCardPillar; ri: PaipanCardPillar; shi: PaipanCardPillar };
  /** 日主（日柱干支） */
  riZhu: string;
  /** 干支纯文本（前端跳排盘工具带参用） */
  ganZhiText: string;
  /** 五行分布：明字八字逐字计数（不含藏干——藏干权重版可后续复用引擎 calcWuXingEnergy） */
  wuXing: { 木: number; 火: number; 土: number; 金: number; 水: number; desc: string };
}

export interface SimilarCaseItem {
  postId: string;
  title: string;
  excerpt: string;
  qualityScore: number;
  isOwn: boolean;
}

@Injectable()
export class CreationAssistService {
  private readonly logger = new Logger(CreationAssistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AiGatewayService,
  ) {}

  // ═════════════ 能力一：古籍引用推荐 ═════════════

  /**
   * POST /ai/creation/classic-quotes
   * text → 关键词提取 → 古籍章节检索（关键词版·embedding 后无缝替换检索层）→ AI 相关性复排（失败降级词频排）
   */
  async classicQuotes(userId: string, text: string): Promise<{ keywords: string[]; items: ClassicQuoteItem[] }> {
    const keywords = this.extractKeywords(text);
    if (keywords.length === 0) return { keywords: [], items: [] };

    const candidates = await this.retrieveClassicCandidates(keywords);
    if (candidates.length === 0) return { keywords, items: [] };

    const picked = await this.rerankByAi(userId, text, candidates);
    return {
      keywords,
      items: picked.map((c) => ({
        quote: c.excerpt,
        bookTitle: c.bookTitle,
        chapterTitle: c.chapterTitle,
        chapterId: c.chapterId,
        bookId: c.bookId,
      })),
    };
  }

  /**
   * 检索层（契约点）：keywords → 候选章节列表。
   * 现阶段=关键词 contains（title/content·仅已发布未删）；
   * embedding 密钥就绪后：本函数替换为「text 向量→ pgvector topK」实现即可，出入参契约不变。
   */
  private async retrieveClassicCandidates(keywords: string[]): Promise<ClassicCandidate[]> {
    const or = keywords.flatMap((kw) => [
      { title: { contains: kw } },
      { content: { contains: kw } },
    ]);
    const chapters = await this.prisma.classicChapter.findMany({
      where: {
        deletedAt: null,
        book: { status: "PUBLISHED", deletedAt: null },
        OR: or,
      },
      select: {
        id: true,
        title: true,
        content: true,
        book: { select: { id: true, title: true } },
      },
      take: CLASSIC_CANDIDATE_TAKE,
    });

    return chapters.map((ch) => ({
      chapterId: ch.id,
      chapterTitle: ch.title,
      bookId: ch.book.id,
      bookTitle: ch.book.title,
      excerpt: this.makeExcerpt(ch.content, keywords, QUOTE_LEN),
      hitScore: this.hitScore(`${ch.title} ${ch.content}`, keywords),
    }));
  }

  /**
   * AI 相关性复排（便宜档）：原文段+候选列表 → 返回最相关至多3条序号。
   * - AI 明确返回 []（都不相关）→ 诚实返回空；
   * - 调用失败/解析失败 → 降级按词频（hitScore）排。
   */
  private async rerankByAi(userId: string, text: string, candidates: ClassicCandidate[]): Promise<ClassicCandidate[]> {
    const byFreq = [...candidates].sort((a, b) => b.hitScore - a.hitScore).slice(0, CLASSIC_QUOTE_TOP);
    try {
      const listing = candidates
        .map((c, i) => `${i + 1}. 《${c.bookTitle}·${c.chapterTitle}》：${c.excerpt.slice(0, 60)}`)
        .join("\n");
      const messages: AiMessage[] = [
        { role: "system", content: "你是国学内容编辑，负责为用户的创作文段挑选最贴切的古籍引用。只输出 JSON 数组，不输出任何其他文字。" },
        {
          role: "user",
          content: `用户创作文段：\n${text.slice(0, 500)}\n\n候选古籍片段：\n${listing}\n\n请从候选中选出与文段主旨最相关的至多 ${CLASSIC_QUOTE_TOP} 条，按相关度从高到低返回其序号 JSON 数组（如 [2,5,9]）；若都不相关返回 []。`,
        },
      ];
      const res = await this.gateway.chat({
        scene: CREATION_ASSIST_SCENE,
        userId,
        messages,
        options: { temperature: 0.1, maxTokens: 64 },
        // 检索复排每次候选不同，语义缓存易误命中，跳过
        skipCache: true,
      });
      const m = res.content?.match(/\[[\d,\s]*\]/);
      if (!m) return byFreq;
      const indices = (JSON.parse(m[0]) as number[]).filter(
        (n) => Number.isInteger(n) && n >= 1 && n <= candidates.length,
      );
      // AI 明确判定都不相关 → 诚实返回空（不硬塞驴唇不对马嘴的引用）
      return indices.slice(0, CLASSIC_QUOTE_TOP).map((n) => candidates[n - 1]);
    } catch (err) {
      this.logger.warn(`古籍引用 AI 复排失败，降级词频排：${(err as Error).message}`);
      return byFreq;
    }
  }

  // ═════════════ 能力二：命盘卡渲染 ═════════════

  /**
   * POST /ai/creation/paipan-card
   * 四柱干支（nian/yue/ri/shi 各2字）或 paipanRecordId（强校验归属本人·R3）→ 结构化盘面 JSON
   */
  async paipanCard(
    userId: string,
    dto: { paipanRecordId?: string; nian?: string; yue?: string; ri?: string; shi?: string },
  ): Promise<PaipanCard> {
    if (dto.paipanRecordId) return this.cardFromRecord(userId, dto.paipanRecordId);

    const { nian, yue, ri, shi } = dto;
    if (!nian || !yue || !ri || !shi) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供完整四柱干支（nian/yue/ri/shi）或 paipanRecordId");
    }
    return { source: "ganzhi", ...this.buildCard([nian, yue, ri, shi]) };
  }

  /** 从本人排盘记录取盘面（R3：where 带 userId，他人记录与不存在同样 404） */
  private async cardFromRecord(userId: string, recordId: string): Promise<PaipanCard> {
    const record = await this.prisma.paipanRecord.findFirst({
      where: { id: recordId, userId },
      select: { id: true, paipanType: true, resultData: true },
    });
    if (!record) {
      throw new BusinessException(ErrorCode.PAIPAN_RECORD_NOT_FOUND, "排盘记录不存在");
    }
    const pillars = this.extractSiZhuFromResult(record.resultData);
    if (!pillars) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `该盘型（${record.paipanType}）暂不支持命盘卡渲染，当前支持含四柱盘面的记录（八字/阳盘/奇门）`,
      );
    }
    return { source: "record", recordId: record.id, paipanType: record.paipanType, ...this.buildCard(pillars) };
  }

  /**
   * 从记录 resultData 提取四柱干支：
   * BAZI → resultData.siZhu；YANGPAN → resultData.mingli.siZhu；QIMEN → resultData.meta.siZhu；
   * 其余盘型（紫微/六爻/大六壬…）无标准四柱盘面 → null（诚实降级，不硬凑）
   */
  private extractSiZhuFromResult(resultData: unknown): [string, string, string, string] | null {
    const data = resultData as {
      siZhu?: Record<string, { gan?: string; zhi?: string }>;
      mingli?: { siZhu?: Record<string, { gan?: string; zhi?: string }> };
      meta?: { siZhu?: Record<string, { gan?: string; zhi?: string }> };
    } | null;
    const raw = data?.siZhu ?? data?.mingli?.siZhu ?? data?.meta?.siZhu;
    if (!raw) return null;
    const parts: string[] = [];
    for (const key of ["nian", "yue", "ri", "shi"] as const) {
      const p = raw[key];
      if (!p?.gan || !p?.zhi) return null;
      parts.push(`${p.gan}${p.zhi}`);
    }
    return parts as [string, string, string, string];
  }

  /** 由四柱干支构建盘面卡：十神复用排盘引擎 calcShiShen，纳音复用 NA_YIN，五行=明字八字逐字计数 */
  private buildCard(ganZhiList: [string, string, string, string] | string[]): Omit<PaipanCard, "source"> {
    const [nian, yue, ri, shi] = ganZhiList.map((gz) => this.parsePillar(gz));
    const riGan = ri.gan;

    const mk = (p: { gan: Gan; zhi: Zhi }, isRiZhu = false): PaipanCardPillar => ({
      gan: p.gan,
      zhi: p.zhi,
      ganZhi: `${p.gan}${p.zhi}`,
      nayin: NA_YIN[`${p.gan}${p.zhi}`] ?? "",
      ganShiShen: isRiZhu ? "日主" : calcShiShen(riGan, p.gan),
      zhiShiShen: calcShiShen(riGan, p.zhi),
    });

    const siZhu = { nian: mk(nian), yue: mk(yue), ri: mk(ri, true), shi: mk(shi) };

    // 五行分布：明字八字逐字计数（天干+地支各1）
    const counts: Record<(typeof WU_XING_LIST)[number], number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    for (const p of [nian, yue, ri, shi]) {
      counts[GAN_WU_XING[p.gan] as keyof typeof counts]++;
      counts[ZHI_WU_XING[p.zhi] as keyof typeof counts]++;
    }
    let maxWx: (typeof WU_XING_LIST)[number] = "木";
    for (const wx of WU_XING_LIST) if (counts[wx] > counts[maxWx]) maxWx = wx;
    const missing = WU_XING_LIST.filter((wx) => counts[wx] === 0);
    const desc = `五行${maxWx}最旺（${counts[maxWx]}）${missing.length ? `，缺${missing.join("、")}` : ""}`;

    return {
      siZhu,
      riZhu: `${riGan}${ri.zhi}`,
      ganZhiText: [siZhu.nian, siZhu.yue, siZhu.ri, siZhu.shi].map((p) => p.ganZhi).join(" "),
      wuXing: { ...counts, desc },
    };
  }

  /** 校验并解析一柱干支（须为六十甲子合法组合——以 NA_YIN 表存在性为准） */
  private parsePillar(gz: string): { gan: Gan; zhi: Zhi } {
    const t = (gz ?? "").trim();
    if (
      t.length !== 2 ||
      !(GAN as readonly string[]).includes(t[0]) ||
      !(ZHI as readonly string[]).includes(t[1]) ||
      !NA_YIN[t]
    ) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `干支「${gz}」不合法（须为六十甲子组合，如「甲子」）`);
    }
    return { gan: t[0] as Gan, zhi: t[1] as Zhi };
  }

  // ═════════════ 能力三：相似案例检索 ═════════════

  /**
   * POST /ai/creation/similar-cases
   * 检索域（R3 硬边界）：作者本人历史帖 OR 全站公开已发布帖（Post.status=PUBLISHED）——
   * 他人未发布/隐藏帖不可达，CRM/私有客户数据不在 Post 域内更不触达。
   * 排序：质量分（ContentQualityScore.total·无分默认0）优先，其次关键词命中度。
   */
  async similarCases(
    userId: string,
    text: string,
    tags?: string[],
  ): Promise<{ keywords: string[]; items: SimilarCaseItem[] }> {
    const tagKws = (tags ?? []).map((t) => t.trim()).filter(Boolean);
    const keywords = [...new Set([...tagKws, ...this.extractKeywords(text)])].slice(0, 8);
    if (keywords.length === 0) return { keywords: [], items: [] };

    const posts = await this.prisma.post.findMany({
      where: {
        AND: [
          // R3 检索域硬边界：本人历史帖 OR 公开已发布帖
          { OR: [{ userId }, { status: "PUBLISHED" }] },
          { OR: keywords.flatMap((kw) => [{ title: { contains: kw } }, { content: { contains: kw } }]) },
        ],
      },
      select: { id: true, title: true, content: true, userId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: CASE_CANDIDATE_TAKE,
    });
    if (posts.length === 0) return { keywords, items: [] };

    const scores = await this.prisma.contentQualityScore.findMany({
      where: { targetType: "POST", targetId: { in: posts.map((p) => p.id) } },
      select: { targetId: true, total: true },
    });
    const scoreMap = new Map(scores.map((s) => [s.targetId, s.total]));

    const ranked = posts
      .map((p) => ({
        postId: p.id,
        title: p.title || this.plainExcerpt(p.content, 20),
        excerpt: this.plainExcerpt(p.content, 80),
        qualityScore: scoreMap.get(p.id) ?? 0,
        isOwn: p.userId === userId,
        hit: this.hitScore(`${p.title ?? ""} ${p.content}`, keywords),
      }))
      .sort((a, b) => b.qualityScore - a.qualityScore || b.hit - a.hit)
      .slice(0, CASE_TOP)
      .map(({ hit: _hit, ...rest }) => rest);

    return { keywords, items: ranked };
  }

  // ═════════════ 公共工具：分词/命中/摘要 ═════════════

  /**
   * 简单分词：按非汉字切段 → 段内 2-4 字滑窗 n-gram → 去含停用字词组 →
   * 按 频次×长度 打分，去重叠（互为子串只留一个），取前 max 个。
   */
  private extractKeywords(text: string, max = 5): string[] {
    const segs = (text ?? "").split(/[^一-龥]+/).filter(Boolean);
    const freq = new Map<string, number>();
    for (const seg of segs) {
      for (let len = 2; len <= 4; len++) {
        for (let i = 0; i + len <= seg.length; i++) {
          const gram = seg.slice(i, i + len);
          if ([...gram].some((ch) => STOP_CHARS.has(ch))) continue;
          freq.set(gram, (freq.get(gram) ?? 0) + 1);
        }
      }
    }
    const sorted = [...freq.entries()]
      .map(([w, f]) => ({ w, score: f * w.length }))
      .sort((a, b) => b.score - a.score || b.w.length - a.w.length);
    const picked: string[] = [];
    for (const { w } of sorted) {
      if (picked.length >= max) break;
      if (picked.some((p) => p.includes(w) || w.includes(p))) continue;
      picked.push(w);
    }
    return picked;
  }

  /** 关键词命中分：∑ min(出现次数,5)×词长 */
  private hitScore(text: string, keywords: string[]): number {
    let score = 0;
    for (const kw of keywords) {
      if (!kw) continue;
      score += Math.min(text.split(kw).length - 1, 5) * kw.length;
    }
    return score;
  }

  /** 以首个命中关键词为中心截取片段（默认120字·先剔除 mandoku 元数据行「#…」再压空白） */
  private makeExcerpt(content: string, keywords: string[], len = QUOTE_LEN): string {
    const clean = (content ?? "").replace(/^#.*$/gm, "").replace(/\s+/g, "");
    let idx = -1;
    for (const kw of keywords) {
      const i = clean.indexOf(kw);
      if (i >= 0 && (idx < 0 || i < idx)) idx = i;
    }
    const start = Math.max(0, (idx < 0 ? 0 : idx) - Math.floor(len / 4));
    return clean.slice(start, start + len);
  }

  /** 纯文本摘要（压空白+截断） */
  private plainExcerpt(content: string, len: number): string {
    return (content ?? "").replace(/\s+/g, " ").trim().slice(0, len);
  }
}
