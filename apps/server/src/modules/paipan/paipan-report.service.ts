import { Injectable, Logger, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { getReportTemplate, modelSections, templateBrief, type ReportTemplate } from "./report-template";
import { extractGlossary, type GlossaryTerm } from "./bazi-glossary";
import { extractZiweiGlossary } from "./ziwei-glossary";
import { extractLiuyaoGlossary } from "./liuyao-glossary";
import { extractMeihuaGlossary } from "./meihua-glossary";
import { extractQimenGlossary } from "./qimen-glossary";
import { extractDaliurenGlossary } from "./daliuren-glossary";
import {
  buildLiuyaoChartView,
  extractLiuyaoFacts,
  liuyaoSignals,
  type LiuyaoChartData,
  type LiuyaoChartView,
} from "./liuyao-report";
import {
  buildMeihuaChartView,
  extractMeihuaFacts,
  meihuaSignals,
  type MeihuaChartView,
  type MeihuaComputed,
} from "./meihua-report";
import {
  buildQimenChartView,
  extractQimenFacts,
  qimenSignals,
  type QimenChartView,
  type QimenResultData,
} from "./qimen-report";
import { extractYangpanFacts, yangpanSignals, yangpanFactLines, type YangpanResultData } from "./yangpan-report";
import { extractXiaoliurenFacts, xiaoliurenSignals, xiaoliurenFactLines, buildXiaoliurenChartView, type XiaoliurenResultData } from "./xiaoliuren-report";
import { extractXuankongFacts, xuankongSignals, xuankongFactLines, buildXuankongChartView, type XuankongResultData } from "./xuankong-report";
import { extractJinkoujueFacts, jinkoujueSignals, jinkoujueFactLines, buildJinkoujueChartView, type JinkoujueResultData } from "./jinkoujue-report";
import { extractBazhaiFacts, bazhaiSignals, bazhaiFactLines, buildBazhaiChartView, type BazhaiResultData } from "./bazhai-report";
import { extractYinpanFacts, yinpanSignals, yinpanFactLines, buildYinpanChartView, type YinpanResultData } from "./yinpan-report";
import {
  buildZiweiChartView,
  extractZiweiFacts,
  ziweiSignals,
  type ZiweiChartView,
  type ZiweiResultData,
} from "./ziwei-report";
import {
  buildDaliurenChartView,
  extractDaliurenFacts,
  daliurenSignals,
  type DaliurenChartView,
  type DaliurenResultData,
} from "./daliuren-report";
import { ErrorCode } from "../../common/error-codes";
import { RISK_DISCLAIMER } from "../../common/ai-disclaimer";
import { PILLAR_LABEL } from "@guoxue/bazi-engine";
import type { BaziResult } from "@guoxue/bazi-engine";
import { createHash } from "node:crypto";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { XiaobuCommerceService } from "../voice/xiaobu-commerce.service";
import {
  PaipanReportKnowledgeService,
  STANCE_LABEL,
  type KnowledgeStance,
  type ReportDebate,
  type ReportSignal,
} from "./paipan-report-knowledge.service";

/**
 * 排盘报告服务（S07：先生成有依据的文字报告，再围绕报告交流）
 *
 * 2026-09-17 按独立复核重写，替换原固定占位文案与写死的《滴天髓》引用：
 * 1. 盘面事实：只由引擎计算结果确定性生成（四柱、十神、格局、用神喜忌、神煞、五行能量），不交给模型改写
 * 2. 依据：只来自“排盘报告知识库”（PaipanReportKnowledge，人工审核 APPROVED 的门派理论与指定古籍原文出处），
 *    不检索整个古籍库（用户 2026-09-17 确认：范围过大、没有重点，古籍质量直接影响报告质量）；
 *    按格局/用神/日主/月令/神煞匹配，每条带命中理由；知识库无命中时明确“无可引用依据”，不编造
 * 6. 报告同时产出 dialogueOutline（按小节的要点与依据编号），作为小卜语音围绕报告问答的主线模板
 * 3. 解读：走热卜模型网关（scene=paipan_report），要求只引用给定依据编号；模型引用了不存在的编号会被剔除并记录
 * 4. 记录实际模型名与 token 用量；模型失败或输出不合格时抛错，不保存空报告/占位报告
 * 5. 同一用户、同一盘面、同一报告类型/流派、同一依据集合与提示词版本命中时复用
 *
 * 紫微斗数（2026-09-18 接入）：十二宫/三方四正/四化自成一套语言，事实提取与模板均独立；
 * 引擎不计算星曜庙旺利陷，因此事实里如实标注、提示词禁止模型自行断庙陷。
 */

const PROMPT_VERSION = "paipan-report-v3";

/** 门派 id → 展示名：报告里不能出现 ziping / mangpai 这种内部标识 */
const SCHOOL_LABEL: Record<string, string> = {
  ziping: "子平法",
  mangpai: "盲派",
  sanhe: "三合派",
  feixing: "飞星派",
  zhongzhou: "中州派",
};

export interface EvidenceItem {
  id: string; // E1..En
  /** classic_excerpt=公版古籍原文（可展示原文、可读原书）/ school_theory=门派理论 / knowledge_point=知识要点（自行重述） */
  kind: "classic_excerpt" | "school_theory" | "knowledge_point";
  refId: string; // PaipanReportKnowledge.id
  knowledgeVersion: number;
  school: string | null; // 门派；null=通用理论
  topic: string;
  bookId?: string; // 关联古籍库时用于“读原书”
  chapterId?: string;
  source: string; // 《书名》或“门派理论”或“知识要点”
  /** 是否可按“原文”呈现：只有公版古籍为 true；其余只能作为知识要点转述 */
  quotable: boolean;
  title: string;
  excerpt: string;
  matchedOn: string[];
  /** 议题键与立场：报告据此把各家说法聚成对照，并标出哪条是主线 */
  debateKey?: string | null;
  stance?: KnowledgeStance;
}

export interface Reference {
  evidenceId: string;
  kind: EvidenceItem["kind"];
  refId: string;
  school: string | null;
  bookId?: string;
  chapterId?: string;
  source: string;
  chapter: string;
  content: string;
  matchedOn: string[];
}

export interface ReportSection {
  /** 稳定小节编号（s1…），语音问答按编号定位“用户哪里没看懂” */
  id: string;
  title: string;
  content: string;
  type: "fact" | "analysis" | "interpretation" | "limitation";
  /**
   * 由引擎数据确定性生成，不经模型。
   * 下游（工作台交付稿改写）据此跳过，**不要按标题文字判断**——
   * 老师在工作台把标题改掉之后，靠标题识别就会把盘面事实当文案重写。
   */
  deterministic?: boolean;
  /** 本节依据的门派（通用理论为空） */
  schools?: string[];
  keyPoints?: string[];
  /** 用户可能想追问的问题，页面展示为“问小卜”预设问题 */
  questions?: string[];
  evidenceIds?: string[];
  references?: Reference[];
}

/** 语音对话主线：小卜按此提纲分节讲解、答疑，不整篇朗读、不脱离报告发散 */
export interface DialogueOutlineItem {
  sectionId: string;
  title: string;
  keyPoints: string[];
  evidenceIds: string[];
}

/**
 * 报告页绘图数据（四柱卡 / 五行能量 / 大运轴 / 关系 / 起盘校验）。
 *
 * 与 facts 分开：facts 参与报告版本哈希，动它会让所有历史报告失效重算模型；
 * chartView 纯展示，随时可补算，旧报告读取时现场生成。
 */
export interface ReportChartView {
  pillars: {
    label: string;
    gan: string;
    zhi: string;
    ganWuXing: string;
    zhiWuXing: string;
    ganShiShen: string;
    zhiShiShen: string;
    cangGan: { gan: string; shiShen: string; type: string }[];
    nayin: string;
    xingYun: string;
    isDay: boolean;
  }[];
  wuXingEnergy: { name: string; value: number }[];
  wuXingCount: Record<string, number>;
  geJu?: { name: string; type?: string; yongShen?: string; xiShen?: string; jiShen?: string };
  daYun: { ganZhi: string; startAge: number; endAge: number; startYear: number; ganShiShen: string; zhiShiShen: string; current: boolean }[];
  relations: { label: string; items: string[] }[];
  shenSha: { name: string; pillar: string; type: string }[];
  provenance: { label: string; value: string }[];
}

export interface StructuredReport {
  title: string;
  summary: string;
  sections: ReportSection[];
  facts: Record<string, unknown>;
  /** 报告页图形数据（按盘类型不同结构）；旧报告读取时现场补算 */
  chartView?: ReportChartView | LiuyaoChartView | MeihuaChartView | QimenChartView | DaliurenChartView | ZiweiChartView;
  /** 正文里出现的术语及释义：小白点开看得懂，专业用户可略过（随文附带，不下发整本词典） */
  glossary?: GlossaryTerm[];
  references: Reference[];
  dialogueOutline: DialogueOutlineItem[];
  disclaimer: string;
  metadata: {
    paipanType: string;
    reportType: string;
    school?: string;
    generatedAt: string;
    version: string;
    promptVersion: string;
    model: string;
    tokenUsage?: unknown;
    evidenceCount: number;
    /** 模型引用了不存在的依据编号（已剔除） */
    droppedEvidenceIds: string[];
    /** 正文提到但不在依据集合中的书名（未核实，提示用户） */
    unverifiedBookMentions: string[];
  };
}

/**
 * 时家奇门特有的「怎么排这张盘」议题，阳盘命理借用奇门知识时要排除。
 * 阳盘以出生时刻起局，不存在转盘飞盘之选，也不用三元定局——
 * 把这两个议题带进命书，等于告诉用户他的盘有一个根本不存在的选项。
 */
const YANGPAN_EXCLUDE_DEBATES = new Set(["qimen:排盘法:转盘与飞盘", "qimen:定局法:拆补置闰"]);

const REPORT_TITLES: Record<string, string> = {
  general: "综合解读",
  career: "事业解读",
  love: "婚恋解读",
  wealth: "财运解读",
  health: "健康相关的传统说法",
};

@Injectable()
export class PaipanReportService {
  private readonly logger = new Logger(PaipanReportService.name);

  /**
   * 本次检索命中的原始条目。
   * 下发给模型的 EvidenceItem 只留了正文摘要，而做观点对照还要用到议题键、立场、门派，
   * 因此在这里留一份完整的，供 buildDebateSection 聚合。
   */
  private lastHits: Awaited<ReturnType<PaipanReportKnowledgeService["findEvidence"]>> = [];

  constructor(
    private prisma: PrismaService,
    private gateway: AiGatewayService,
    private reportKnowledge: PaipanReportKnowledgeService,
    /**
     * 报告付费门禁（决策人 2026-09-21：单份 29 元或小卜AI会员）。模块内总是注入；
     * 可选只为兼容大量以三参数构造本服务的单测（不传即不设门禁）
     */
    @Optional() private readonly commerce?: XiaobuCommerceService,
  ) {}

  async generateReport(
    userId: string,
    paipanRecordId: string,
    reportType: string = "general",
    options?: { includeReferences?: boolean; school?: string; regenerate?: boolean },
  ) {
    const type = REPORT_TITLES[reportType] ? reportType : "general";
    const record = await this.prisma.paipanRecord.findUnique({
      where: { id: paipanRecordId },
      select: { id: true, userId: true, paipanType: true, resultData: true, inputParams: true },
    });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "排盘记录不存在");
    if (record.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该排盘记录");
    // 付费门禁在任何模型调用与复用之前：未购买且非会员不生成
    await this.commerce?.assertReportAccess(userId, paipanRecordId, type);

    const plan = await this.prepareChart(record);
    const { paipanType, facts } = plan;
    const evidence =
      options?.includeReferences === false ? [] : await this.retrieveEvidence(plan, options?.school);
    const version = this.calculateReportVersion(facts, evidence, type, options?.school);
    const analyzeType = `REPORT_${type.toUpperCase()}`;

    const existing = await this.prisma.aiAnalysisRecord.findFirst({
      where: { userId, paipanRecordId, analyzeType, school: options?.school ?? null, scene: "paipan_report" },
      orderBy: { createdAt: "desc" },
    });
    if (existing && !options?.regenerate) {
      const content = this.safeParse(existing.analysisContent);
      if (content?.metadata?.version === version) {
        return { id: existing.id, content, version, createdAt: existing.createdAt, reused: true };
      }
    }

    const template = plan.template;
    const { content, model, usage } = await this.callModel(facts, evidence, type, options?.school, template, plan);
    const report = this.assembleReport(content, facts, evidence, {
      type,
      school: options?.school,
      version,
      model,
      usage,
      template,
      plan,
    });
    report.chartView = plan.chartView;
    report.glossary = this.glossaryOf(paipanType, [report.summary, ...report.sections.map((x) => x.content)]);

    const data = {
      analysisContent: JSON.stringify(report),
      modelName: model,
      modelUsed: model,
      tokenUsage: (usage ?? undefined) as any,
      isCached: false,
      inputSummary: plan.summaryLine.slice(0, 200),
      outputSummary: report.summary.slice(0, 200),
    };
    // (userId, paipanRecordId, analyzeType, school) 在 school 非空时唯一：已有记录则更新，避免重复生成撞约束
    const saved = existing
      ? await this.prisma.aiAnalysisRecord.update({ where: { id: existing.id }, data })
      : await this.prisma.aiAnalysisRecord.create({
          data: {
            userId,
            paipanRecordId,
            analyzeType,
            school: options?.school ?? null,
            scene: "paipan_report",
            ...data,
          },
        });

    // 附带的 30 分钟语音改在报告订单付款成功时发放（xiaobu-commerce.fulfillReportOrderInTx）；
    // 会员生成报告不按份送，改为会员期内每月赠送（决策人 2026-09-21）

    this.logger.log(`排盘报告已生成 ${saved.id} version=${version} model=${model} evidence=${evidence.length}`);
    return { id: saved.id, content: report, version, createdAt: saved.createdAt, reused: false };
  }

  /**
   * 按盘类型准备报告所需的一切（事实、检索信号、模板、图形、盘面明细）。
   *
   * 八字读存库的引擎结果；六爻按起卦参数重算——存库结果是给列表用的精简版，
   * 缺月建日辰、伏神、旬空这些断卦必需的信息，而引擎是确定性的，同参数必出同卦。
   */
  private async prepareChart(record: { paipanType: string; resultData: unknown; inputParams?: unknown }) {
    const paipanType = String(record.paipanType || "").toLowerCase();

    if (paipanType === "bazi") {
      const chart = record.resultData as unknown as BaziResult;
      const facts = this.extractBaziFacts(chart);
      return {
        paipanType: "bazi" as const,
        facts: facts as Record<string, unknown>,
        signals: this.reportKnowledge.baziSignals(facts),
        template: getReportTemplate("bazi"),
        chartView: this.buildChartView(chart) as ReportChartView | LiuyaoChartView,
        titlePrefix: "八字",
        summaryLine: `${facts.siZhu} ${facts.geJu ?? ""}`,
        factLines: [
          `四柱：${facts.siZhu}`,
          ...facts.pillars,
          facts.geJu ? `格局：${facts.geJu}${facts.geJuType ? `（${facts.geJuType}）` : ""}` : "格局：引擎未给出",
          facts.yongShen ? `用神：${facts.yongShen}　喜神：${facts.xiShen || "—"}　忌神：${facts.jiShen || "—"}` : "",
          facts.wuXingEnergy ? `五行能量：${facts.wuXingEnergy}` : "",
          facts.shenSha.length ? `神煞：${facts.shenSha.join("、")}` : "",
          facts.qiYun ? `起运：${facts.qiYun}` : "",
        ].filter(Boolean),
      };
    }

    if (paipanType === "liuyao") {
      const input = (record.inputParams ?? {}) as Record<string, any>;
      const { computeLiuyao } = (await import("@guoxue/shared/paipan")) as any;
      const coins =
        (typeof input.coins === "string" && input.coins.trim()) ||
        (Array.isArray(input.manualYao) && input.manualYao.length === 6 ? input.manualYao.join(",") : undefined);
      const data = computeLiuyao({
        year: Number(input.year),
        month: Number(input.month),
        day: Number(input.day),
        hour: Number(input.hour ?? 12),
        minute: Number(input.minute ?? 0),
        methodKey: String(input.method || input.methodKey || "time"),
        coins,
        numberInput: input.numberInput,
        guaPick: input.guaPick,
      }) as LiuyaoChartData;

      const facts = extractLiuyaoFacts(data, input.matter);
      return {
        paipanType: "liuyao" as const,
        facts: facts as unknown as Record<string, unknown>,
        signals: liuyaoSignals(facts),
        template: getReportTemplate("liuyao"),
        chartView: buildLiuyaoChartView(data, { method: String(input.method || input.methodKey || "time"), matter: input.matter }) as
          | ReportChartView
          | LiuyaoChartView
          | MeihuaChartView,
        titlePrefix: "六爻",
        summaryLine: `${facts.benGua}${facts.isStatic ? "（静卦）" : ` → ${facts.bianGua}`} ${facts.matter ?? ""}`,
        factLines: [
          facts.matter ? `所问：${facts.matter}` : "",
          `本卦：${facts.benGua}${facts.isStatic ? "（静卦）" : `　变卦：${facts.bianGua}`}`,
          `卦宫：${facts.palace}宫（${facts.palaceWuXing}）　卦身：${facts.guashen || "—"}`,
          `四柱：${facts.ganzhi}　日空：${facts.dayKongWang}　月空：${facts.monthKongWang}`,
          `世应：世在第${facts.shiPos}爻（${facts.shiLiuqin ?? "—"}持世），应在第${facts.yingPos}爻（${facts.yingLiuqin ?? "—"}）`,
          ...facts.lines,
          facts.movingLines.length ? `动爻：${facts.movingLines.join("；")}` : "静卦，无动爻",
          ...facts.fushen,
          facts.shensha.length ? `神煞：${facts.shensha.join("、")}` : "",
        ].filter(Boolean),
      };
    }

    if (paipanType === "meihua") {
      const input = (record.inputParams ?? {}) as Record<string, any>;
      const shared = (await import("@guoxue/shared/paipan")) as any;
      const data = shared.computeMeihua({
        year: Number(input.year),
        month: Number(input.month),
        day: Number(input.day),
        hour: Number(input.hour ?? 12),
        minute: Number(input.minute ?? 0),
        mode: String(input.mode || "time"),
        numbers: input.numbers,
        plusHour: input.plusHour === true || input.plusHour === "1",
        yaos: input.yaos,
        moving: input.moving,
        // 农历由起卦端算好后存入：服务端内置历法与移动端 lunar 库在闰月上可能有差，
        // 直接复用起卦时的月日，保证报告与用户看到的卦完全一致
        lunarMonth: input.lunarMonth ? Number(input.lunarMonth) : undefined,
        lunarDay: input.lunarDay ? Number(input.lunarDay) : undefined,
      }) as MeihuaComputed;

      const facts = extractMeihuaFacts(data, { matter: input.matter, ganzhi: input.ganzhi, lunar: input.lunarText });
      return {
        paipanType: "meihua" as const,
        facts: facts as unknown as Record<string, unknown>,
        signals: meihuaSignals(facts),
        template: getReportTemplate("meihua"),
        chartView: buildMeihuaChartView(data, {
          matter: input.matter,
          mode: String(input.mode || "time"),
          ganzhi: input.ganzhi,
          lunar: input.lunarText,
          jieqi: input.jieqi,
        }) as ReportChartView | LiuyaoChartView | MeihuaChartView,
        titlePrefix: "梅花易数",
        summaryLine: `${facts.benGua} → ${facts.bianGua} ${facts.matter ?? ""}`,
        factLines: [
          facts.matter ? `所问：${facts.matter}` : "",
          `本卦：${facts.benGua}（${facts.benPalace}）　互卦：${facts.huGua}　变卦：${facts.bianGua}`,
          `错卦：${facts.cuoGua}　综卦：${facts.zongGua}`,
          `${facts.movingText}　${facts.tiPosition}`,
          `体卦：${facts.tiName}（${facts.tiWx}）　用卦：${facts.yongName}（${facts.yongWx}）`,
          `体用关系：${facts.relation}　${facts.relationHint}`,
          facts.ganzhi ? `四柱：${facts.ganzhi}` : "",
          facts.lunar ? `农历：${facts.lunar}` : "",
          `起卦：${facts.formula}　测数：${facts.ceShu}`,
        ].filter(Boolean),
      };
    }

    // 金口诀：四位课，断的重心在用爻所在位
    if (paipanType === "jinkoujue") {
      const data = record.resultData as unknown as JinkoujueResultData;
      if (!data?.positions?.length || !data?.yongRole) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该金口诀记录缺少四位课数据，无法生成课书，请重新起课");
      }
      const facts = extractJinkoujueFacts(data);
      return {
        paipanType: "jinkoujue" as const,
        facts: facts as unknown as Record<string, unknown>,
        signals: jinkoujueSignals(facts),
        template: getReportTemplate("jinkoujue"),
        chartView: buildJinkoujueChartView(facts) as unknown as
          | ReportChartView
          | LiuyaoChartView
          | MeihuaChartView
          | QimenChartView
          | DaliurenChartView,
        titlePrefix: "金口诀",
        summaryLine: `用在${facts.yongRole} ${facts.yuejiang} 地分${facts.difen} ${facts.matter}`,
        factLines: jinkoujueFactLines(facts),
      };
    }

    // 玄空飞星：断的是房子不是人，结论落在方位与用途上
    if (paipanType === "xuankong") {
      // 2026-09-18：一度因后端算法顺逆判错而暂停出具，现已改用 shared 的正确引擎
      // （教科书标准案例通过，与前端 432 种组合逐宫一致），恢复。
      const data = record.resultData as unknown as XuankongResultData;
      if (!data?.gongs?.length || !data?.basicInfo?.yuanYun) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该玄空记录缺少飞星盘数据，无法生成宅书，请重新排盘");
      }
      const facts = extractXuankongFacts(data);
      facts.name = String((record as any).clientName ?? "");
      return {
        paipanType: "xuankong" as const,
        facts: facts as unknown as Record<string, unknown>,
        signals: xuankongSignals(facts),
        template: getReportTemplate("xuankong"),
        chartView: buildXuankongChartView(facts) as unknown as
          | ReportChartView
          | LiuyaoChartView
          | MeihuaChartView
          | QimenChartView
          | DaliurenChartView,
        titlePrefix: "玄空",
        summaryLine: `${facts.shan}山${facts.xiang}向 ${facts.yuanYun}运 ${facts.activeGeJu.join("、")}`,
        factLines: xuankongFactLines(facts),
      };
    }

    // 八宅：同是看宅，但与玄空的抓手不同——玄空按元运飞星（宅运会换），
    // 八宅按坐山与命卦翻卦（命卦终身不变）。所以这里必须出**两盘**：
    // 宅盘管房子的门主灶，命盘管这个人该朝哪边坐，两盘都吉的方位才是最值得用的。
    if (paipanType === "bazhai") {
      const data = record.resultData as unknown as BazhaiResultData;
      if (!data?.baFang?.length || !data?.mingGua?.guaName) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该八宅记录缺少八方数据，无法生成宅书，请重新排盘");
      }
      // 命盘是 2026-09-19 才补的字段，此前存库的旧记录没有——旧盘缺这一节而不是报错
      const facts = extractBazhaiFacts(data);
      facts.name = String((record as any).clientName ?? "");
      return {
        paipanType: "bazhai" as const,
        facts: facts as unknown as Record<string, unknown>,
        signals: bazhaiSignals(facts),
        template: getReportTemplate("bazhai"),
        chartView: buildBazhaiChartView(facts) as unknown as
          | ReportChartView
          | LiuyaoChartView
          | MeihuaChartView
          | QimenChartView
          | DaliurenChartView,
        titlePrefix: "八宅",
        summaryLine:
          `${facts.mingGua}命（${facts.mingGroup}）坐${facts.zuoShan}朝${facts.chaoXiang}　` +
          `${facts.isMatch ? "宅命相配" : "宅命不配"}`,
        factLines: bazhaiFactLines(facts),
      };
    }

    // 阴盘奇门：取象直读，一切围绕用神落宫。
    // 与别的工具最大的不同——signals 给的是「用神宫上的符号」而不是格局名，
    // 知识库回的是象意扇面而不是现成断语，由模型按所问之事组合。
    if (paipanType === "qimen-yin") {
      const data = record.resultData as unknown as YinpanResultData;
      if (!data?.gongs?.length || !data?.juNumber) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该阴盘奇门记录缺少九宫数据，无法生成课书，请重新起局");
      }
      const inp = (record.inputParams ?? {}) as Record<string, unknown>;
      const facts = extractYinpanFacts(data, {
        matter: String(inp.matter ?? ""),
        juParts: String(inp.juParts ?? ""),
      });
      return {
        paipanType: "qimen-yin" as const,
        facts: facts as unknown as Record<string, unknown>,
        signals: yinpanSignals(facts),
        template: getReportTemplate("qimen-yin"),
        chartView: buildYinpanChartView(facts) as unknown as
          | ReportChartView
          | LiuyaoChartView
          | MeihuaChartView
          | QimenChartView
          | DaliurenChartView,
        titlePrefix: "阴盘奇门",
        summaryLine: [
          facts.ju,
          facts.yongshen.map((y) => `${y.role}落${y.palaceKey || "?"}`).join(" "),
          facts.matter,
        ]
          .filter(Boolean)
          .join(" "),
        factLines: yinpanFactLines(facts),
      };
    }

    // 小六壬：六宫掐指，三宫各管一段（月宫来路、日宫事情、时宫落点）
    if (paipanType === "xiaoliuren") {
      const data = record.resultData as unknown as XiaoliurenResultData;
      if (!data?.palaces?.length || typeof data.hourPalace !== "number") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该小六壬记录缺少课面数据，无法生成课书，请重新起课");
      }
      const facts = extractXiaoliurenFacts(data);
      return {
        paipanType: "xiaoliuren" as const,
        facts: facts as unknown as Record<string, unknown>,
        signals: xiaoliurenSignals(facts),
        template: getReportTemplate("xiaoliuren"),
        chartView: buildXiaoliurenChartView(facts) as unknown as
          | ReportChartView
          | LiuyaoChartView
          | MeihuaChartView
          | QimenChartView
          | DaliurenChartView,
        titlePrefix: "小六壬",
        summaryLine: `月${facts.monthName} 日${facts.dayName} 时${facts.hourName} ${facts.matter}`,
        factLines: xiaoliurenFactLines(facts),
      };
    }

    // 阳盘命理：奇门盘 + 八字命理，看的是一生而不是一事，所以模板与知识来源都与时家奇门不同
    if (paipanType === "yangpan") {
      const data = record.resultData as unknown as YangpanResultData;
      if (!data?.gongs?.length || !data?.juNumber) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该阳盘记录缺少盘面数据，无法生成命书，请重新排盘");
      }
      const facts = extractYangpanFacts(data);
      return {
        paipanType: "yangpan" as const,
        facts: facts as unknown as Record<string, unknown>,
        signals: yangpanSignals(facts),
        template: getReportTemplate("yangpan"),
        chartView: buildQimenChartView(data as unknown as QimenResultData, {}) as
          | ReportChartView
          | LiuyaoChartView
          | MeihuaChartView
          | QimenChartView
          | DaliurenChartView,
        titlePrefix: "阳盘命理",
        summaryLine: `${facts.ju} ${facts.sizhu} ${facts.zhifu}`,
        factLines: yangpanFactLines(facts),
      };
    }

    if (paipanType === "qimen") {
      const input = (record.inputParams ?? {}) as Record<string, any>;
      // 奇门的排盘结果由服务端算好后完整存库（含九宫全字段），直接读取即可，不必重算
      const data = record.resultData as unknown as QimenResultData;
      if (!data?.gongs?.length || !data?.juNumber) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该奇门记录缺少盘面数据，无法生成局书，请重新排盘");
      }
      const facts = extractQimenFacts(data, { matter: input.matter, panMethod: input.panMethod });
      return {
        paipanType: "qimen" as const,
        facts: facts as unknown as Record<string, unknown>,
        signals: qimenSignals(facts),
        template: getReportTemplate("qimen"),
        chartView: buildQimenChartView(data, { matter: input.matter, panMethod: input.panMethod }) as
          | ReportChartView
          | LiuyaoChartView
          | MeihuaChartView
          | QimenChartView
          | DaliurenChartView,
        titlePrefix: "奇门",
        summaryLine: `${facts.ju ?? ""} ${facts.zhifu ?? ""} ${facts.matter ?? ""}`,
        factLines: [
          facts.matter ? `所问：${facts.matter}` : "",
          `${facts.ju ?? ""}　${facts.yuan ?? ""}　排盘法：${facts.panMethodNote}`,
          `四柱：${facts.sizhu}`,
          facts.jieqi ? `节气：${facts.jieqi}` : "",
          facts.zhifu ?? "",
          facts.zhishi ?? "",
          facts.maXing ? `马星：${facts.maXing}` : "",
          facts.kongwang ? `空亡：${facts.kongwang}` : "",
          ...facts.palaces,
        ].filter(Boolean),
      };
    }

    if (paipanType === "daliuren") {
      const input = (record.inputParams ?? {}) as Record<string, any>;
      const data = record.resultData as unknown as DaliurenResultData;
      if (!data?.siKe?.length || !data?.sanChuan?.chu) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该六壬记录缺少四课三传数据，无法生成课书，请重新起课");
      }
      const facts = extractDaliurenFacts(data, input.matter);
      return {
        paipanType: "daliuren" as const,
        facts: facts as unknown as Record<string, unknown>,
        signals: daliurenSignals(facts),
        template: getReportTemplate("daliuren"),
        chartView: buildDaliurenChartView(data, { matter: input.matter, method: input.method }) as
          | ReportChartView
          | LiuyaoChartView
          | MeihuaChartView
          | QimenChartView
          | DaliurenChartView,
        titlePrefix: "大六壬",
        summaryLine: `${facts.summary ?? ""} ${facts.matter ?? ""}`,
        factLines: [
          facts.matter ? `所问：${facts.matter}` : "",
          facts.summary ?? "",
          `日干支：${facts.riGanZhi ?? "—"}　占时：${facts.zhanShi ?? "—"}　月将：${facts.yueJiang ?? "—"}　${facts.dayNight ?? ""}贵`,
          facts.jieQi ? `节气：${facts.jieQi}` : "",
          facts.kongWang ? `旬空：${facts.kongWang}` : "",
          facts.zongMen ? `课体：${facts.zongMen}${facts.zongMenDesc ? `（${facts.zongMenDesc}）` : ""}` : "",
          ...facts.siKe,
          ...facts.sanChuan,
          facts.keti.length ? `课格：${facts.keti.join("；")}` : "",
          facts.shensha.length ? `神煞：${facts.shensha.join("、")}` : "",
        ].filter(Boolean),
      };
    }

    if (paipanType === "ziwei") {
      const input = (record.inputParams ?? {}) as Record<string, any>;
      const data = record.resultData as unknown as ZiweiResultData;
      if (!data?.gongWei?.length || !data?.mingGong) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该紫微记录缺少十二宫数据，无法生成命书，请重新排盘");
      }
      const facts = extractZiweiFacts(data, input);
      return {
        paipanType: "ziwei" as const,
        facts: facts as unknown as Record<string, unknown>,
        signals: ziweiSignals(facts),
        template: getReportTemplate("ziwei"),
        chartView: buildZiweiChartView(data, input) as
          | ReportChartView
          | LiuyaoChartView
          | MeihuaChartView
          | QimenChartView
          | DaliurenChartView
          | ZiweiChartView,
        titlePrefix: "紫微斗数",
        summaryLine: `${facts.wuXingJu ?? ""} 命宫${facts.mingGongZhi ?? ""} ${facts.mingMainStars.join("、") || "无主星"}`,
        factLines: [
          facts.yearGanZhi ? `生年：${facts.yearGanZhi}${facts.lunar ? `　${facts.lunar}` : ""}` : "",
          facts.wuXingJu ? `五行局：${facts.wuXingJu}` : "",
          facts.mingGong ?? "",
          facts.mingNoMainStar ? "命宫无主星，按借对宫论" : "",
          facts.duiGong ?? "",
          facts.shenGongLine ?? "",
          facts.shenSameAsMing ? "命身同宫" : "",
          ...facts.sanFang.map((x) => `三方四正 ${x}`),
          // 四化写全名而不用「禄/权/科/忌」单字简写：读者一眼看得懂，术语注解也才认得出来
          [
            facts.huaLu && `化禄${facts.huaLu}`,
            facts.huaQuan && `化权${facts.huaQuan}`,
            facts.huaKe && `化科${facts.huaKe}`,
            facts.huaJi && `化忌${facts.huaJi}`,
          ]
            .filter(Boolean)
            .join("　") || "",
          facts.geShi.length ? `格局：${facts.geShi.join("、")}` : "",
          ...facts.gongs,
          `说明：${facts.miaoXianNote}`,
        ].filter(Boolean),
      };
    }

    throw new BusinessException(
      ErrorCode.BAD_REQUEST,
      "该盘类型暂不支持生成有依据的文字报告（当前支持八字、紫微斗数、六爻、梅花易数、奇门遁甲与大六壬），请先查看盘面",
    );
  }

  /**
   * 推演页数据：报告生成前先把「我们干了什么」如实摆出来。
   *
   * 全部为确定性计算，不调模型、不写库、很快返回。前端据此逐步展示推演步骤，
   * 同时并行发起真正的生成请求，完成后整页揭幕——仪式感来自真实信息的逐步揭示，
   * 不是假进度条。小程序端不支持 SSE，因此不用流式推送。
   */
  /** 报告生成权限（只校验归属，不调模型）；未注入门禁时视为免费 */
  async reportAccess(userId: string, paipanRecordId: string, reportType: string) {
    const type = REPORT_TITLES[reportType] ? reportType : "general";
    const record = await this.prisma.paipanRecord.findUnique({ where: { id: paipanRecordId }, select: { userId: true } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "排盘记录不存在");
    if (record.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该排盘记录");
    const access = this.commerce ? await this.commerce.reportAccess(userId, paipanRecordId, type) : { granted: true, via: "free" as const };
    return { recordId: paipanRecordId, reportType: type, ...access };
  }

  async preflight(userId: string, paipanRecordId: string, school?: string) {
    const record = await this.prisma.paipanRecord.findUnique({
      where: { id: paipanRecordId },
      select: { id: true, userId: true, paipanType: true, resultData: true, inputParams: true },
    });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "排盘记录不存在");
    if (record.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该排盘记录");

    // 盘类型支持与否由 prepareChart 统一判定（八字 / 六爻）
    const plan = await this.prepareChart(record);
    const evidence = await this.retrieveEvidence(plan, school);
    if (plan.paipanType === "liuyao") return this.liuyaoPreflight(plan, evidence);
    if (plan.paipanType === "meihua") return this.meihuaPreflight(plan, evidence);
    if (plan.paipanType === "qimen") return this.qimenPreflight(plan, evidence);
    if (plan.paipanType === "daliuren") return this.daliurenPreflight(plan, evidence);
    if (plan.paipanType === "ziwei") return this.ziweiPreflight(plan, evidence);

    const chart = record.resultData as unknown as BaziResult;
    const facts = plan.facts as ReturnType<PaipanReportService["extractBaziFacts"]>;
    const view = plan.chartView as ReportChartView;

    const ts = chart.taiYangShi as any;
    const mins = Number(ts?.offsetMinutes ?? 0);
    const books = [...new Set(evidence.filter((e) => e.quotable).map((e) => e.source))];
    const schools = [...new Set(evidence.map((e) => e.school).filter(Boolean) as string[])];

    return {
      steps: [
        {
          key: "time",
          title: "校时定盘",
          detail: ts
            ? `真太阳时已校正 ${mins > 0 ? "+" : ""}${mins} 分钟`
            : "按钟表时间起盘（未提供出生地经度）",
        },
        { key: "chart", title: "排布盘面", detail: `${facts.siZhu}　${view.pillars.length} 柱已排定` },
        {
          key: "structure",
          title: "结构判读",
          detail: facts.geJu
            ? `取${facts.geJu}${facts.geJuType ? `（${facts.geJuType}）` : ""}${facts.yongShen ? `　用神：${facts.yongShen}` : ""}`
            : "引擎未给出明确格局，按五行力量论",
        },
        {
          key: "evidence",
          title: "检索典籍",
          detail: evidence.length
            ? `命中 ${evidence.length} 条已审核依据${books.length ? `，涉及 ${books.length} 部典籍` : ""}${schools.length ? `，门派：${schools.join("、")}` : ""}`
            : "知识库暂无与本盘匹配的已审核依据，报告将如实说明",
        },
        { key: "compose", title: "组织成书", detail: "按平台固定的七段体例组织" },
      ],
      seals: {
        pan: true,
        pai: schools.length > 0,
        dian: books.length > 0,
        evidenceCount: evidence.length,
        schools,
      },
    };
  }

  /** 六壬推演页：起天盘、立四课、取三传与依据命中，全部为确定性结果 */
  private ziweiPreflight(
    plan: Awaited<ReturnType<PaipanReportService["prepareChart"]>>,
    evidence: EvidenceItem[],
  ) {
    const f = plan.facts as unknown as import("./ziwei-report").ZiweiFacts;
    const books = [...new Set(evidence.filter((e) => e.quotable).map((e) => e.source))];
    const schools = [...new Set(evidence.map((e) => e.school).filter(Boolean) as string[])];
    return {
      steps: [
        {
          key: "cast",
          title: "定局安命",
          // 生辰明文按隐私设计不入库（只加密存于 clientBirth），因此这里只摆盘上算得出来的东西，
          // 不写「农历生日」这种取不到值时的占位话
          detail: [f.lunar, f.wuXingJu ?? "五行局待定", `命宫${f.mingGongZhi ?? "—"}`].filter(Boolean).join("　"),
        },
        {
          key: "chart",
          title: "布十二宫",
          detail: `${f.gongs.length} 宫已布${f.shenGong ? `　身宫在${f.shenGong}` : ""}`,
        },
        {
          key: "structure",
          title: "取三方四正与四化",
          detail: `${f.mingNoMainStar ? "命宫无主星，借对宫论" : `命宫主星：${f.mingMainStars.join("、")}`}${f.huaJi ? `　化忌${f.huaJi}` : ""}`,
        },
        {
          key: "evidence",
          title: "检索典籍",
          detail: evidence.length
            ? `命中 ${evidence.length} 条已审核依据${books.length ? `，涉及 ${books.length} 部典籍` : ""}${schools.length ? `，门派：${schools.join("、")}` : ""}`
            : "知识库暂无与本盘匹配的已审核依据，报告将如实说明",
        },
        { key: "compose", title: "组织成书", detail: `按平台固定的紫微命书体例组织（${f.miaoXianNote}）` },
      ],
      seals: { pan: true, pai: schools.length > 0, dian: books.length > 0, evidenceCount: evidence.length, schools },
    };
  }

  private daliurenPreflight(
    plan: Awaited<ReturnType<PaipanReportService["prepareChart"]>>,
    evidence: EvidenceItem[],
  ) {
    const f = plan.facts as unknown as import("./daliuren-report").DaliurenFacts;
    const books = [...new Set(evidence.filter((e) => e.quotable).map((e) => e.source))];
    const schools = [...new Set(evidence.map((e) => e.school).filter(Boolean) as string[])];
    return {
      steps: [
        { key: "cast", title: "月将加时", detail: `${f.riGanZhi ?? ""}日　${f.yueJiang ?? ""}将加${f.zhanShi ?? ""}时　${f.dayNight ?? ""}贵` },
        { key: "chart", title: "立四课", detail: f.siKe.length ? `四课已立：${f.siKe.length} 课` : "四课待立" },
        {
          key: "structure",
          title: "取三传",
          detail: `按${f.zongMen ?? "九宗门"}取传${f.zongMenDesc ? `（${f.zongMenDesc}）` : ""}`,
        },
        {
          key: "evidence",
          title: "检索典籍",
          detail: evidence.length
            ? `命中 ${evidence.length} 条已审核依据${books.length ? `，涉及 ${books.length} 部典籍` : ""}${schools.length ? `，门派：${schools.join("、")}` : ""}`
            : "知识库暂无与本课匹配的已审核依据，报告将如实说明",
        },
        { key: "compose", title: "组织成书", detail: "按平台固定的课书体例组织" },
      ],
      seals: { pan: true, pai: schools.length > 0, dian: books.length > 0, evidenceCount: evidence.length, schools },
    };
  }

  /** 奇门推演页：定局、布盘、值符值使与依据命中，全部为确定性结果 */
  private qimenPreflight(
    plan: Awaited<ReturnType<PaipanReportService["prepareChart"]>>,
    evidence: EvidenceItem[],
  ) {
    const f = plan.facts as unknown as import("./qimen-report").QimenFacts;
    const books = [...new Set(evidence.filter((e) => e.quotable).map((e) => e.source))];
    const schools = [...new Set(evidence.map((e) => e.school).filter(Boolean) as string[])];
    return {
      steps: [
        { key: "cast", title: "定局", detail: `${f.ju ?? ""}　${f.yuan ?? ""}　${f.sizhu}` },
        { key: "chart", title: "布九宫", detail: `九宫门星神已布定　${f.panMethodNote}` },
        { key: "structure", title: "定值符值使", detail: `${f.zhifu ?? ""}　${f.zhishi ?? ""}` },
        {
          key: "evidence",
          title: "检索典籍",
          detail: evidence.length
            ? `命中 ${evidence.length} 条已审核依据${books.length ? `，涉及 ${books.length} 部典籍` : ""}${schools.length ? `，门派：${schools.join("、")}` : ""}`
            : "知识库暂无与本局匹配的已审核依据，报告将如实说明",
        },
        { key: "compose", title: "组织成书", detail: "按平台固定的局书体例组织" },
      ],
      seals: { pan: true, pai: schools.length > 0, dian: books.length > 0, evidenceCount: evidence.length, schools },
    };
  }

  /** 梅花推演页：起卦算式、五卦、体用关系与依据命中，全部为确定性结果 */
  private meihuaPreflight(
    plan: Awaited<ReturnType<PaipanReportService["prepareChart"]>>,
    evidence: EvidenceItem[],
  ) {
    const f = plan.facts as unknown as import("./meihua-report").MeihuaFacts;
    const books = [...new Set(evidence.filter((e) => e.quotable).map((e) => e.source))];
    const schools = [...new Set(evidence.map((e) => e.school).filter(Boolean) as string[])];
    return {
      steps: [
        { key: "cast", title: "起卦成象", detail: f.formula },
        { key: "chart", title: "推五卦", detail: `本卦 ${f.benGua}　互 ${f.huGua}　变 ${f.bianGua}　${f.movingText}` },
        { key: "structure", title: "分体用", detail: `${f.tiPosition}　体${f.tiName}(${f.tiWx}) 用${f.yongName}(${f.yongWx})　${f.relation}` },
        {
          key: "evidence",
          title: "检索典籍",
          detail: evidence.length
            ? `命中 ${evidence.length} 条已审核依据${books.length ? `，涉及 ${books.length} 部典籍` : ""}${schools.length ? `，门派：${schools.join("、")}` : ""}`
            : "知识库暂无与本卦匹配的已审核依据，报告将如实说明",
        },
        { key: "compose", title: "组织成书", detail: "按平台固定的卦书体例组织" },
      ],
      seals: { pan: true, pai: schools.length > 0, dian: books.length > 0, evidenceCount: evidence.length, schools },
    };
  }

  /** 六爻推演页：起卦方式、卦面、用神线索与依据命中，全部为确定性结果 */
  private liuyaoPreflight(
    plan: Awaited<ReturnType<PaipanReportService["prepareChart"]>>,
    evidence: EvidenceItem[],
  ) {
    const f = plan.facts as unknown as import("./liuyao-report").LiuyaoFacts;
    const books = [...new Set(evidence.filter((e) => e.quotable).map((e) => e.source))];
    const schools = [...new Set(evidence.map((e) => e.school).filter(Boolean) as string[])];
    const view = plan.chartView as LiuyaoChartView;
    const method = view.provenance.find((p) => p.label === "起卦方式")?.value || "时间起卦";

    return {
      steps: [
        { key: "cast", title: "起卦装卦", detail: `${method}　${f.ganzhi}` },
        {
          key: "chart",
          title: "排布卦面",
          detail: `${f.benGua}${f.isStatic ? "（静卦）" : ` → ${f.bianGua}`}　${f.palace}宫`,
        },
        {
          key: "structure",
          title: "定世应",
          detail: `世在第${f.shiPos}爻（${f.shiLiuqin ?? "—"}持世），应在第${f.yingPos}爻　日空 ${f.dayKongWang}`,
        },
        {
          key: "evidence",
          title: "检索典籍",
          detail: evidence.length
            ? `命中 ${evidence.length} 条已审核依据${books.length ? `，涉及 ${books.length} 部典籍` : ""}${schools.length ? `，门派：${schools.join("、")}` : ""}`
            : "知识库暂无与本卦匹配的已审核依据，报告将如实说明",
        },
        { key: "compose", title: "组织成书", detail: "按平台固定的卦书体例组织" },
      ],
      seals: { pan: true, pai: schools.length > 0, dian: books.length > 0, evidenceCount: evidence.length, schools },
    };
  }

  /** 引擎结果 → 盘面事实（确定性，不经模型） */
  extractBaziFacts(chart: BaziResult) {
    const sz = chart?.siZhu;
    if (!sz?.nian || !sz?.yue || !sz?.ri || !sz?.shi) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "排盘结果缺少四柱数据，无法生成报告");
    }
    const pillar = (p: BaziResult["siZhu"]["nian"]) => `${p.gan}${p.zhi}`;
    const shiShen = (label: string, p: BaziResult["siZhu"]["nian"]) =>
      `${label}：干${p.gan}(${p.ganShiShen}) 支${p.zhi}(${p.zhiShiShen}) 藏干${(p.cangGan || []).map((c) => `${c.gan}${c.shiShen}`).join("、") || "无"} 纳音${p.nayin || "—"}`;
    const e = chart.wuXingEnergy;
    // 五行字面计数（四柱八字，不含藏干），供报告页五行分布图使用
    const GAN_WX: Record<string, string> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
    const ZHI_WX: Record<string, string> = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
    const wuXingCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    for (const p of [sz.nian, sz.yue, sz.ri, sz.shi]) {
      if (GAN_WX[p.gan]) wuXingCount[GAN_WX[p.gan]]++;
      if (ZHI_WX[p.zhi]) wuXingCount[ZHI_WX[p.zhi]]++;
    }
    const pillarItem = (label: string, p: BaziResult["siZhu"]["nian"]) => ({
      label, gan: p.gan as string, zhi: p.zhi as string, ganShiShen: p.ganShiShen as string, zhiShiShen: p.zhiShiShen as string,
      ganWuXing: GAN_WX[p.gan], zhiWuXing: ZHI_WX[p.zhi],
    });
    return {
      gender: chart.input?.gender,
      siZhu: `${pillar(sz.nian)}年 ${pillar(sz.yue)}月 ${pillar(sz.ri)}日 ${pillar(sz.shi)}时`,
      dayGan: sz.ri.gan as string,
      dayZhi: sz.ri.zhi as string,
      monthZhi: sz.yue.zhi as string,
      pillars: [shiShen("年柱", sz.nian), shiShen("月柱", sz.yue), shiShen("日柱", sz.ri), shiShen("时柱", sz.shi)],
      pillarItems: [pillarItem("年", sz.nian), pillarItem("月", sz.yue), pillarItem("日", sz.ri), pillarItem("时", sz.shi)],
      wuXingCount,
      geJu: chart.geJu?.name,
      geJuType: chart.geJu?.type === "zheng" ? "正格" : chart.geJu?.type === "bian" ? "变格" : undefined,
      yongShen: chart.geJu?.yongShen,
      xiShen: chart.geJu?.xiShen,
      jiShen: chart.geJu?.jiShen,
      // 这是含藏干的加权分（天干10/地支8/藏干3），不是五行个数。
      // 不写清楚口径，「木3 火46」会被当成「木只有 3 个」，模型也会照这个误读往下推。
      wuXingEnergy: e
        ? `木${e.mu} 火${e.huo} 土${e.tu} 金${e.jin} 水${e.shui}（含藏干加权分，非个数）`
        : undefined,
      wangXiang: chart.wangXiang,
      // 引擎里柱位是 nian/yue/ri/shi，直出会把英文标记摆到用户（以及老师的客户）面前
      shenSha: (chart.shenSha || []).map((s) => `${s.name}(${PILLAR_LABEL[s.pillar] || s.pillar})`),
      shenShaNames: [...new Set((chart.shenSha || []).map((s) => s.name))],
      kongWang: chart.kongWang,
      qiYun: chart.qiYun?.desc,
    };
  }

  /**
   * 术语注解按盘型取词表。
   *
   * 六套术数各有各的词汇：八字讲干支旺衰，紫微讲星曜落宫，六爻讲世应用神，
   * 梅花讲体用互变，奇门讲门星神落宫，六壬讲四课三传。混用等于没有注解——
   * 接入前实测：梅花借八字词表命中 0 条，六壬 2 条，六爻 4 条，正文里点不开任何一个专业词。
   */
  private glossaryOf(paipanType: string, texts: string[]): GlossaryTerm[] {
    const pick: Record<string, (t: string[]) => GlossaryTerm[]> = {
      ziwei: extractZiweiGlossary,
      liuyao: extractLiuyaoGlossary,
      meihua: extractMeihuaGlossary,
      qimen: extractQimenGlossary,
      daliuren: extractDaliurenGlossary,
    };
    return (pick[paipanType] ?? extractGlossary)(texts);
  }

  /**
   * 报告页图形数据（确定性，全部来自引擎字段，不经模型）。
   * 独立于 facts：facts 参与版本哈希，这里只管展示，旧报告读取时可现场补算。
   */
  buildChartView(chart: BaziResult): ReportChartView {
    const sz = chart.siZhu;
    const GAN_WX: Record<string, string> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
    const ZHI_WX: Record<string, string> = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
    const mk = (label: string, p: BaziResult["siZhu"]["nian"], isDay = false) => ({
      label,
      gan: p.gan as string,
      zhi: p.zhi as string,
      ganWuXing: GAN_WX[p.gan] || "",
      zhiWuXing: ZHI_WX[p.zhi] || "",
      ganShiShen: (p.ganShiShen as string) || "",
      zhiShiShen: (p.zhiShiShen as string) || "",
      cangGan: (p.cangGan || []).map((c) => ({ gan: c.gan as string, shiShen: c.shiShen as string, type: String(c.type || "") })),
      nayin: p.nayin || "",
      xingYun: (p as any).xingYun || "",
      isDay,
    });

    const e = chart.wuXingEnergy;
    const wuXingEnergy = e
      ? [
          { name: "木", value: e.mu },
          { name: "火", value: e.huo },
          { name: "土", value: e.tu },
          { name: "金", value: e.jin },
          { name: "水", value: e.shui },
        ].sort((a, b) => b.value - a.value)
      : [];

    const wuXingCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    for (const p of [sz.nian, sz.yue, sz.ri, sz.shi]) {
      if (GAN_WX[p.gan]) wuXingCount[GAN_WX[p.gan]]++;
      if (ZHI_WX[p.zhi]) wuXingCount[ZHI_WX[p.zhi]]++;
    }

    // 当前所在大运：按今年年份落在哪一步
    const thisYear = new Date().getFullYear();
    const daYun = (chart.qiYun?.daYun || []).slice(0, 10).map((d) => ({
      ganZhi: d.ganZhi,
      startAge: d.startAge,
      endAge: d.endAge,
      startYear: d.startYear,
      ganShiShen: (d.ganShiShen as string) || "",
      zhiShiShen: (d.zhiShiShen as string) || "",
      current: thisYear >= d.startYear && thisYear <= d.endYear,
    }));

    const f = chart.fenXiTiShi;
    const relations = [
      { label: "天干五合", items: f?.ganHe ?? [] },
      { label: "地支三合", items: f?.sanHe ?? [] },
      { label: "地支三会", items: f?.sanHui ?? [] },
      { label: "地支六合", items: f?.liuHe ?? [] },
      { label: "地支六冲", items: f?.liuChong ?? [] },
      { label: "地支六害", items: f?.liuHai ?? [] },
      { label: "地支相刑", items: [...(f?.sanXing ?? []), ...(f?.ziXing ?? [])] },
      { label: "地支相破", items: f?.xiangPo ?? [] },
    ].filter((r) => r.items.length > 0);

    // 起盘校验：专业用户第一眼看这里，把算法口径摊开
    const ts = chart.taiYangShi as any;
    const ds = chart.daylightSaving as any;
    const provenance: { label: string; value: string }[] = [];
    if (ts?.corrected || ts?.offsetMinutes != null) {
      const mins = Number(ts.offsetMinutes ?? 0);
      provenance.push({ label: "真太阳时", value: mins ? `已校正 ${mins > 0 ? "+" : ""}${mins} 分钟` : "已校正，偏差不足 1 分钟" });
    } else {
      provenance.push({ label: "真太阳时", value: "未校正（按钟表时间起盘）" });
    }
    if (ds?.applied) provenance.push({ label: "夏令时", value: "该出生年份处于夏令时，已回退 1 小时" });
    provenance.push({ label: "子时口径", value: chart.input?.ziShiMode === "traditional" ? "传统早晚子（23 时换日）" : "现代子时（00 时换日）" });
    // 农历：引擎原先把公历原样标为农历（已于 2026-09-17 修复为真实农历换算）；
    // 历史盘的 resultData 里可能还存着旧的错误值，形如「1990年5月18日」，这种一律不展示。
    if (chart.lunarDate && !/\d+年\d+月\d+日/.test(chart.lunarDate)) {
      provenance.push({ label: "农历", value: chart.lunarDate });
    }
    if (chart.qiYun?.desc) provenance.push({ label: "起运", value: chart.qiYun.desc });
    if (chart.kongWang) provenance.push({ label: "空亡", value: chart.kongWang });
    if (chart.shengXiao) provenance.push({ label: "生肖", value: chart.shengXiao });
    if (chart.wangXiang) provenance.push({ label: "日主旺衰", value: chart.wangXiang });
    if (chart.mingGong) provenance.push({ label: "命宫", value: `${chart.mingGong.gan}${chart.mingGong.zhi}` });
    if (chart.taiYuan) provenance.push({ label: "胎元", value: `${chart.taiYuan.gan}${chart.taiYuan.zhi}` });

    return {
      pillars: [mk("年", sz.nian), mk("月", sz.yue), mk("日", sz.ri, true), mk("时", sz.shi)],
      wuXingEnergy,
      wuXingCount,
      geJu: chart.geJu
        ? {
            name: chart.geJu.name,
            type: chart.geJu.type === "zheng" ? "正格" : chart.geJu.type === "bian" ? "变格" : undefined,
            yongShen: chart.geJu.yongShen,
            xiShen: chart.geJu.xiShen,
            jiShen: chart.geJu.jiShen,
          }
        : undefined,
      daYun,
      relations,
      shenSha: (chart.shenSha || []).slice(0, 12).map((x) => ({
        name: x.name,
        pillar: PILLAR_LABEL[x.pillar] || x.pillar,
        type: x.type,
      })),
      provenance,
    };
  }

  private async retrieveEvidence(
    plan: { paipanType: string; signals: ReportSignal[] },
    school?: string,
  ): Promise<EvidenceItem[]> {
    const hits0 = await this.reportKnowledge.findEvidence({
      // 阳盘命理横跨两套体系：盘是奇门的、命理那一半是八字的，
      // 报告本来就要同时引落宫取用与格局大运，所以直接检索这两类，
      // 而不是再抄一份 yangpan 专属条目（重复且容易走样）
      paipanType: plan.paipanType === "yangpan" ? ["qimen", "bazi"] : plan.paipanType,
      school,
      signals: plan.signals,
      // 要做「各家怎么看」的对照，同一议题下就得同时取到几派的说法（共识、主流、另一说、
      // 网上讲法、我们的主线，一组就是四五条）。只取 8 条时，高分的同派条目会把对照位占满，
      // 用户看到的还是一家之言；两三个议题一起命中时 14 条也不够，因此放到 20。
      limit: 20,
    });
    // 借来的知识要挑着用：时家奇门那两个「怎么排这张盘」的议题，对阳盘命理不成立——
    // 阳盘以出生时刻起局，既不存在转盘飞盘之选，也不走三元定局。
    // 实测不过滤时，阳盘命书的主线里真的混进了「转盘与飞盘怎么选」，读者会以为自己的盘也有这个选项。
    const hits = plan.paipanType === "yangpan"
      ? hits0.filter((h) => !YANGPAN_EXCLUDE_DEBATES.has(h.debateKey ?? ""))
      : hits0;
    this.lastHits = hits;
    return hits.map((h, i) => ({
      id: `E${i + 1}`,
      kind: h.kind,
      refId: h.id,
      knowledgeVersion: h.version,
      school: h.school,
      topic: h.topic,
      bookId: h.classicBookId ?? undefined,
      chapterId: h.classicChapterId ?? undefined,
      quotable: h.quotable,
      source: h.quotable
        ? `《${(h.bookTitle || "").replace(/[《》]/g, "")}》`
        : h.kind === "knowledge_point"
          ? h.school
            ? `知识要点·${h.school}`
            : "知识要点"
          : h.school
            ? `门派理论·${h.school}`
            : "通用理论",
      title: h.quotable ? h.chapterTitle || h.title : h.title,
      excerpt: h.content.replace(/\s+/g, " ").trim().slice(0, 800),
      matchedOn: h.matchedOn,
      debateKey: h.debateKey,
      stance: h.stance,
    }));
  }

  /**
   * 「各家怎么看」小节：由引擎按议题直接拼出，**不经模型**。
   *
   * 为什么不交给模型：对照关系（谁说什么、谁跟谁分歧、我们取哪一说）是报告的骨架，
   * 一旦让模型自由组织，它很容易把几派说法揉成一段四平八稳的话，分歧就糊掉了——
   * 那正是决策人要避免的「看完觉得各说各话又说不清」。
   *
   * 写法固定为：议题 → 各家说法（标明门派与立场）→ 本报告主线（取哪一说、为什么）。
   */
  private buildDebateSection(debates: ReportDebate[], evidence: EvidenceItem[]): ReportSection | null {
    const idOf = new Map(evidence.map((e) => [e.refId, e.id]));
    const usedIds: string[] = [];

    // 硬规则：没有主线的议题一律不展示。
    // 把几种说法平行摆出来再说「你自己判断」，用户看完只会比看之前更纠结——
    // 那样的报告没有意义。我们要么给出一个明确的取舍，要么这一处就不谈。
    const usable = debates.filter((d) => !!d.platformLine);
    if (!usable.length) return null;

    const blocks = usable.slice(0, 4).map((d) => {
      const line = d.platformLine!;
      const lineId = idOf.get(line.id);
      if (lineId) usedIds.push(lineId);

      // 主线条目正文写成「结论 + 为什么」两段，这里拆开：
      // 第一句单独成行给结论，用户扫一眼就知道该按什么看；理由跟在后面供深究。
      const { verdict, reason } = this.splitLine(line.content);
      const lines: string[] = [`【${d.topic}】`, `▸ 结论：${verdict}`];
      if (reason) lines.push(`　 为什么这么定：${reason}`);

      // 共识排在结论之后：这一层各派都认，可信度最高，也是理解分歧的前提
      const agreed = d.views.find((v) => v.stance === "consensus");
      if (agreed) {
        const eid = idOf.get(agreed.id);
        if (eid) usedIds.push(eid);
        lines.push(`· 各家都认的部分：${agreed.content.replace(/\s+/g, " ").trim().slice(0, 140)}`);
      }

      // 其他说法降为「延伸了解」，并明确写清不影响上面的结论——
      // 它的作用是让用户知其所以然（这门学问为什么会有不同讲法），不是让他重新选一遍。
      const others = d.views.filter((v) => v.stance !== "consensus");
      if (others.length) {
        lines.push("· 延伸了解（知道有这些讲法即可，不影响上面的结论）：");
        for (const v of others.slice(0, 4)) {
          const eid = idOf.get(v.id);
          if (eid) usedIds.push(eid);
          // 折叠在「延伸了解」里，展开后要读得完整——截半句反而像话没说清
          lines.push(`　- ${this.viewLabel(v)}：${v.content.replace(/\s+/g, " ").trim().slice(0, 220)}`);
        }
      }
      return lines.join("\n");
    });

    return {
      id: "sDebate",
      title: "这一盘我们怎么看",
      type: "fact",
      deterministic: true,
      content: [
        "下面每一条都先给出本报告的结论，你照着看就行；后面附的其他讲法是帮你了解这门学问的脉络，不用重新纠结一遍。",
        "",
        ...blocks,
      ].join("\n"),
      evidenceIds: [...new Set(usedIds)],
      keyPoints: usable.slice(0, 4).map((d) => `${d.topic}：${this.lineGist(d.platformLine!.title)}`),
      questions: usable.slice(0, 2).map((d) => `${d.topic}这一条为什么这么定？`),
    };
  }

  /** 说话的是谁：门派 / 典籍 / 当代通行讲法 / 通用理论，并标出它在这个议题里的位置 */
  private viewLabel(v: { school: string | null; quotable: boolean; bookTitle: string | null; sourceKind: string; stance: KnowledgeStance }) {
    const who = v.school
      ? `${SCHOOL_LABEL[v.school] ?? v.school}`
      : v.quotable
        ? `《${(v.bookTitle || "").replace(/[《》]/g, "")}》`
        : v.sourceKind === "web"
          ? "当代通行讲法"
          : "通用理论";
    return `${who}·${STANCE_LABEL[v.stance]}`;
  }

  /**
   * 主线正文拆成「结论」与「为什么」。
   *
   * 主线条目一律写成「本报告按 X 立论：……。理由……」的形式，
   * 第一句就是要给用户的那个确定答案——单独拎出来，他扫一眼就知道该按什么看，
   * 不必读完整段再自己提炼（提炼不出来，就又回到「各说各话」的感觉）。
   */
  private splitLine(content: string): { verdict: string; reason: string } {
    const text = content.replace(/\s+/g, " ").trim();
    // 首句以句号收尾；首句里若含冒号，冒号后才是真正的结论
    const m = text.match(/^(.+?[。！])/);
    const first = (m ? m[1] : text).trim();
    const rest = text.slice(first.length).trim();
    const i = first.indexOf("：");
    const verdict = i >= 0 && i < first.length - 4 ? first.slice(i + 1).trim() : first;
    return { verdict: verdict.slice(0, 120), reason: rest.slice(0, 260) };
  }

  /** 主线条目标题形如「本报告主线：以子平扶抑为主线，盲派做功作为参照」，取冒号后的那句作要点 */
  private lineGist(title: string) {
    const i = title.indexOf("：");
    return (i >= 0 ? title.slice(i + 1) : title).trim().slice(0, 30);
  }

  private async callModel(
    facts: Record<string, unknown>,
    evidence: EvidenceItem[],
    reportType: string,
    school: string | undefined,
    template: ReportTemplate,
    plan: { titlePrefix: string; factLines: string[] },
  ) {
    const system = `你是热卜“小卜 AI”的${plan.titlePrefix}文字报告撰写助手，面向传统文化学习者。
规则：
1. 盘面事实以【盘面事实】为准，不重新排盘、不修改任何干支/十神/格局。
1a. **【盘面事实】里没有的项目，一律不得自行补算或推断**（例如事实中注明「未计算星曜庙旺利陷」，就不许断庙陷）；确需用到时，只说明本报告没有这一项数据。
2. 只能引用【依据】中给出的条目（来自人工审核的报告知识库：门派理论要点与指定古籍原文），用 evidenceIds 标注编号；不得提及依据之外的书名、篇名或原句。
2e. **依据不足时的兜底方向**（知识库还在扩充，这种情况一定会遇到）：可以按这门术数公认的通行说法把话讲完整，但必须守住三条——(a) 只讲通行说法，不引冷门异说、不搬耸人听闻的断语；(b) **不得编造书名、篇名、门派名或把通行说法说成某本书的原话**；(c) 在 limitations 里写明哪一部分没有库内依据、属通行说法。宁可讲得朴素，也不要为了显得有出处而编来源。
2a. 每个解读小节先说盘面事实，再说所依据的门派理论，再给古籍出处；schools 填本节采用的门派 id（通用理论留空数组）。
2d. 依据分两种，用法不同：标注【古籍原文】的条目可以引述原句并说明出自哪本书哪一篇；标注【门派理论】【知识要点】的条目**只能转述其意思，不得写成书中原话、不得为其编造书名篇名**（这类条目是平台整理的知识，不是某本书的原文）。
2b. 每节给 2—4 条 keyPoints（每条不超过 30 字的口语化要点），供语音讲解时分点展开、答疑时定位。
2c. 每节给 2—3 条 questions：普通用户读完本节最可能追问的问题（术语含义、和自己生活的关系、门派为何不同），每条不超过 20 字，不得诱导付费或制造焦虑。
3. 这是传统命理的解释框架，不是经过科学验证的预测：不作疾病、投资、婚姻的确定性结论，不渲染灾祸，不推销任何化解或付费服务。
4. **主线已经定好，各节跟着主线走**：平台在【本报告的主线】里给出了这一盘关键分歧上的取舍，各节一律按主线的取法来讲，不得另起炉灶提出相反的取用，也不要把几派说法再并列摆一遍——那一节已经摆过了，你再摆一次只会让读者更纠结。主线没有覆盖到的分歧，最多用一句话点出「另有一路这么看」，不展开、不让读者自己选。
4a. 落到每一节，要给**基本确定的说法**：该扶该抑、宜进宜守、什么时候顺什么时候费力，都要说清楚；确实拿不准的，说明「这一处要结合实际情况才能定」，而不是罗列可能性让读者自己拼。
5. **报告结构由平台固定，你只负责填内容**：只能填写【本报告的小节】里列出的小节，用 sectionId 对应；不得新增小节、不得改小节名、不得调整顺序。某一节确实无话可说时，content 留空字符串，不要硬凑。
6. 只输出 JSON，不要 markdown 代码块：
{"summary":"两三句概述","sections":[{"sectionId":"s3","schools":["ziping"],"keyPoints":["要点"],"questions":["追问"],"content":"正文","evidenceIds":["E1"]}],"limitations":["局限说明"]}

【本报告的小节】（按此顺序填写，sectionId 必须原样使用）
${templateBrief(template)}`;
    // 主线要在写作前就交给模型：各节必须跟着它讲，否则解读与「这一盘我们怎么看」对不上，
    // 读者读到两套口径，比不给主线还糟。
    const debates = this.reportKnowledge.groupDebates(this.lastHits).filter((d) => d.platformLine);
    const lineBlock = debates.length
      ? debates
          .slice(0, 4)
          .map((d) => `· ${d.topic}：${d.platformLine!.content.replace(/\s+/g, " ").trim().slice(0, 220)}`)
          .join("\n")
      : "（本盘没有需要取舍的关键分歧，按通行说法讲即可）";

    const user = `报告类型：${REPORT_TITLES[reportType]}${school ? `；流派视角：${school}` : ""}
【盘面事实】
${JSON.stringify(facts, null, 2)}
【本报告的主线】（各节按这个口径讲，不要另起炉灶，也不要把各派说法再并列一遍）
${lineBlock}
【依据】
${evidence.length ? evidence.map((e) => `${e.id} [${e.quotable ? "古籍原文" : e.kind === "knowledge_point" ? "知识要点" : "门派理论"}${e.school ? `·${e.school}` : "·通用"}·${e.topic}] ${e.source}${e.title ? `·${e.title}` : ""}（命中：${e.matchedOn.join("、") || "—"}）：${e.excerpt}`).join("\n") : "（报告知识库中没有与本盘匹配的已审核条目，不得引用任何书籍或门派原话）"}`;

    let res;
    try {
      res = await this.gateway.chat({
        scene: "paipan_report",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        options: { temperature: 0.4, maxTokens: 2400 },
        skipCache: true,
        skipAuditLog: true,
      });
    } catch (error: any) {
      this.logger.warn(`排盘报告模型调用失败：${error?.message || error}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "报告生成失败，请稍后重试；盘面仍可正常查看");
    }

    const parsed = this.safeParse(this.stripFence(res.content || ""));
    // 只接受模板里存在的小节；模型自造的小节一律丢弃（平台定结构）
    const allowed = new Set(modelSections(template).map((t) => t.id));
    const sections = Array.isArray(parsed?.sections)
      ? parsed.sections.filter(
          (x: any) => typeof x?.content === "string" && x.content.trim() && allowed.has(String(x?.sectionId)),
        )
      : [];
    if (!parsed || typeof parsed.summary !== "string" || sections.length === 0) {
      this.logger.warn(`排盘报告模型输出不合格，未保存（model=${res.model}）`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "报告生成结果不完整，未保存，请稍后重试");
    }
    return {
      content: { summary: parsed.summary as string, sections, limitations: parsed.limitations },
      model: res.model,
      usage: res.usage,
    };
  }

  private assembleReport(
    content: { summary: string; sections: any[]; limitations?: unknown },
    facts: Record<string, unknown>,
    evidence: EvidenceItem[],
    meta: {
      type: string;
      school?: string;
      version: string;
      model: string;
      usage?: unknown;
      template: ReportTemplate;
      plan: { paipanType: string; titlePrefix: string; factLines: string[] };
    },
  ): StructuredReport {
    const byId = new Map(evidence.map((e) => [e.id, e]));
    const dropped = new Set<string>();
    const toRef = (e: EvidenceItem): Reference => ({
      evidenceId: e.id,
      kind: e.kind,
      refId: e.refId,
      school: e.school,
      bookId: e.bookId,
      chapterId: e.chapterId,
      source: e.source,
      chapter: e.title,
      content: e.excerpt,
      matchedOn: e.matchedOn,
    });

    // 平台定结构：按模板顺序组装，标题与编号来自模板而非模型；模型只提供正文与要点。
    // 模板里没有的小节（模型自造）在解析阶段已被丢弃，这里只按模板取。
    const filled = new Map<string, any>();
    for (const x of content.sections) {
      const id = String(x?.sectionId || "");
      if (id && !filled.has(id)) filled.set(id, x);
    }

    const modelSections: ReportSection[] = [];
    for (const tpl of meta.template.sections) {
      if (tpl.deterministic) continue; // 盘面速览 / 起盘校验 / 典籍依据由引擎数据生成，见页面渲染
      const x = filled.get(tpl.id);
      const body = x && typeof x.content === "string" ? x.content.trim() : "";
      if (!body) {
        if (tpl.hideWhenEmpty) continue; // 无内容就隐藏，不留空壳
        modelSections.push({
          id: tpl.id,
          title: tpl.title,
          type: tpl.kind === "limits" ? "limitation" : "analysis",
          content: "这一节在本盘上依据不足，未作解读。",
          keyPoints: [],
          questions: [],
          evidenceIds: [],
          references: [],
        });
        continue;
      }
      const ids = (Array.isArray(x.evidenceIds) ? x.evidenceIds : []).map(String);
      const valid = ids.filter((id: string) => byId.has(id));
      ids.filter((id: string) => !byId.has(id)).forEach((id: string) => dropped.add(id));
      // 门派标注以实际引用依据为准，模型自报的门派只在有对应依据时保留
      const evidenceSchools = new Set(valid.map((id: string) => byId.get(id)!.school).filter(Boolean) as string[]);
      const schools = (Array.isArray(x.schools) ? x.schools.map(String) : []).filter((v: string) => evidenceSchools.has(v));
      modelSections.push({
        id: tpl.id,
        title: tpl.title, // 标题固定来自模板
        type: tpl.kind === "limits" ? "limitation" : tpl.kind === "dimension" ? "interpretation" : "analysis",
        schools: schools.length ? schools : [...evidenceSchools],
        keyPoints: (Array.isArray(x.keyPoints) ? x.keyPoints : []).map((k: unknown) => String(k).slice(0, 60)).filter(Boolean).slice(0, 4),
        questions: (Array.isArray(x.questions) ? x.questions : []).map((q: unknown) => String(q).slice(0, 30)).filter(Boolean).slice(0, 3),
        content: body,
        evidenceIds: valid,
        references: valid.map((id: string) => toRef(byId.get(id)!)),
      });
    }

    // 正文中出现、但不在依据集合里的书名：标记为未核实
    const knownBooks = new Set(evidence.flatMap((e) => e.source.match(/《[^》]+》/g) || []));
    const mentioned = new Set(
      [content.summary, ...modelSections.map((s) => s.content)].flatMap((t) => t.match(/《[^》]+》/g) || []),
    );
    const unverified = [...mentioned].filter((b) => !knownBooks.has(b));

    // 只在末尾补一句「未经核实」是不够的：用户读的是正文，
    // 正文里白纸黑字写着「《某书》云」，末尾小字救不回来——尤其紫微、六爻、
    // 梅花、奇门、六壬眼下一条公版原文都没有，模型编书名的概率最高。
    // 所以把正文里的这类书名摘掉，换成不指名的说法；原书名留在 metadata 供运营追查。
    const maskBooks = (t: string) => unverified.reduce((acc, b) => acc.split(b).join("传统说法"), t);
    if (unverified.length) {
      content.summary = maskBooks(content.summary);
      for (const sec of modelSections) sec.content = maskBooks(sec.content);
    }

    const limitations = (Array.isArray(content.limitations) ? content.limitations : [])
      .map(String)
      .filter(Boolean);
    if (evidence.length === 0) limitations.unshift("报告知识库中暂无与本盘匹配的已审核门派理论或古籍出处，以下解读没有原文依据。");
    if (unverified.length) {
      limitations.push(
        `正文原本提及 ${unverified.join("、")}，但不在本次检索依据中、未经核实，正文中已隐去书名，相关说法仅供参考。`,
      );
    }

    const factLines = meta.plan.factLines;
    const debateSection = this.buildDebateSection(this.reportKnowledge.groupDebates(this.lastHits), evidence);

    const cited = new Set([
      ...modelSections.flatMap((s) => s.evidenceIds || []),
      // 对照小节引用的依据也要进参考文献，否则用户点不开出处
      ...(debateSection?.evidenceIds ?? []),
    ]);
    return {
      title: `${meta.plan.titlePrefix}${REPORT_TITLES[meta.type]}`,
      summary: content.summary,
      // 模板定结构：s1 盘面事实 + 模板各节；局限说明并入模板的「局限与建议」节，不再另起一段
      sections: [
        {
          id: "s1",
          title: "盘面事实（排盘引擎计算）",
          type: "fact",
          content: factLines.join("\n"),
          deterministic: true,
        },
        // 「各家怎么看」排在盘面之后、解读之前：先让用户知道这一盘各派分别怎么说、
        // 我们取哪一说，后面的解读才有一条可循的线，而不是读完一堆互相打架的说法
        ...(debateSection ? [debateSection] : []),
        ...modelSections.map((sec) =>
          sec.type === "limitation" && limitations.length
            ? {
                ...sec,
                content: [sec.content, ...limitations].filter((t) => t && t !== "这一节在本盘上依据不足，未作解读。").join("\n"),
              }
            : sec,
        ),
      ],
      facts,
      references: evidence.filter((e) => cited.has(e.id)).map(toRef),
      dialogueOutline: modelSections.map((sec) => ({
        sectionId: sec.id,
        title: sec.title,
        keyPoints: sec.keyPoints?.length ? sec.keyPoints : [sec.content.slice(0, 40)],
        evidenceIds: sec.evidenceIds || [],
      })),
      disclaimer: RISK_DISCLAIMER.trim(),
      metadata: {
        paipanType: meta.plan.paipanType,
        reportType: meta.type,
        school: meta.school,
        generatedAt: new Date().toISOString(),
        version: meta.version,
        promptVersion: PROMPT_VERSION,
        model: meta.model,
        tokenUsage: meta.usage,
        evidenceCount: evidence.length,
        droppedEvidenceIds: [...dropped],
        unverifiedBookMentions: unverified,
      },
    };
  }

  calculateReportVersion(facts: unknown, evidence: EvidenceItem[], reportType: string, school?: string): string {
    const versionData = JSON.stringify({
      facts,
      evidence: evidence.map((e) => [e.kind, e.refId, e.knowledgeVersion, createHash("sha256").update(e.excerpt).digest("hex").slice(0, 12)]),
      reportType,
      school: school || null,
      promptVersion: PROMPT_VERSION,
    });
    return createHash("sha256").update(versionData).digest("hex").slice(0, 16);
  }

  private stripFence(text: string) {
    return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  private safeParse(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /** 仅返回本人报告的目录信息；摘要也属于付费解读，不能在权益门禁外下发。 */
  async listReports(userId: string, rawPage?: string) {
    const parsed = Number(rawPage);
    const page = Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 10000) : 1;
    const pageSize = 20;
    const where = { userId, scene: "paipan_report", analyzeType: { startsWith: "REPORT_" } };
    const [rows, total] = await Promise.all([
      this.prisma.aiAnalysisRecord.findMany({
        where,
        select: {
          id: true,
          paipanRecordId: true,
          analyzeType: true,
          createdAt: true,
          paipanRecord: { select: { clientName: true, paipanType: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.aiAnalysisRecord.count({ where }),
    ]);
    return {
      items: rows.map(({ paipanRecord, analyzeType, ...row }) => ({
        ...row,
        reportType: analyzeType.slice(7).toLowerCase(),
        clientName: paipanRecord?.clientName ?? null,
        paipanType: paipanRecord?.paipanType ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 获取报告详情（校验用户归属） */
  async getReport(userId: string, reportId: string) {
    const report = await this.prisma.aiAnalysisRecord.findUnique({ where: { id: reportId } });
    if (!report || report.scene !== "paipan_report") {
      throw new BusinessException(ErrorCode.NOT_FOUND, "报告不存在");
    }
    if (report.userId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该报告");
    }
    const content = this.safeParse(report.analysisContent);
    if (!content) {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "报告内容解析失败");
    }
    const accessType = content.metadata?.reportType ||
      (report.analyzeType?.startsWith("REPORT_") ? report.analyzeType.slice(7).toLowerCase() : "");
    if (report.paipanRecordId && accessType) {
      await this.commerce?.assertReportAccess(userId, report.paipanRecordId, accessType);
    }
    // 旧报告没有图形数据：按原盘现场补算（确定性计算，不调模型、不改存档）
    if (!content.chartView && report.paipanRecordId) {
      const rec = await this.prisma.paipanRecord.findUnique({
        where: { id: report.paipanRecordId },
        select: { resultData: true, paipanType: true },
      });
      if (rec && String(rec.paipanType || "").toLowerCase() === "bazi") {
        try {
          content.chartView = this.buildChartView(rec.resultData as unknown as BaziResult);
        } catch (error: any) {
          this.logger.warn(`报告图形数据补算失败（不影响正文）：${error?.message || error}`);
        }
      }
    }
    if (!content.glossary && Array.isArray(content.sections)) {
      content.glossary = this.glossaryOf(String(content?.metadata?.paipanType || "bazi"), [
        String(content.summary || ""),
        ...content.sections.map((x: any) => String(x?.content || "")),
      ]);
    }
    return { id: report.id, content, createdAt: report.createdAt };
  }
}
