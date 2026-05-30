import { Injectable, Logger } from "@nestjs/common";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { PrismaService } from "../../prisma/prisma.service";
import { Cron, CronExpression } from "@nestjs/schedule";

/** 品类标签树默认值（一级→二级），运行时优先读 system_config(category_tree) */
const DEFAULT_CATEGORY_TREE: Record<string, string[]> = {
  "国学经典": ["儒家经典", "道家典籍", "佛学经典", "诸子百家"],
  "中医养生": ["中医基础", "食疗药膳", "经络穴位", "四季养生"],
  "诗词歌赋": ["唐诗", "宋词", "元曲", "现代诗词创作"],
  "民俗节庆": ["传统节日", "民俗活动", "民间故事", "礼仪习俗"],
  "非遗传承": ["传统技艺", "传统美术", "传统音乐", "民俗活动"],
  "茶道香道": ["茶道文化", "香道文化", "茶具鉴赏", "品茶技法"],
  "书法绘画": ["书法入门", "国画技法", "名家鉴赏", "篆刻艺术"],
  "传统音乐": ["古琴", "古筝", "琵琶", "二胡"],
  "武术太极": ["太极拳", "八段锦", "武术基础", "养生气功"],
  "易经智慧": ["八字命理", "紫微斗数", "风水堪舆", "姓名学"],
};

/** 中医品类免责声明 */
const TCM_DISCLAIMER = "\n\n---\n⚠️ 健康科普，仅供参考。本文内容为中医传统文化知识分享，不构成医疗建议。如有健康问题，请及时咨询专业医师，切勿自行诊断用药。\n📖 本文仅供中华传统文化学习交流之用。文中提及的养生方法请在中医师指导下根据自身情况辨证使用。";

/** 易经品类定位声明 */
const ICHING_POSITIONING = "\n\n---\n📖 本文基于传统命理学研究视角，旨在提供人生智慧参考，不构成绝对性断言或决策依据。请理性看待，自主把握人生选择。";

/** 非遗品类原创声明 */
const ICH_ATTRIBUTION = "\n\n---\n🛡️ 本文内容涉及非物质文化遗产，平台尊重传承人知识产权。如需转载或引用，请注明来源及传承人信息。";

const CONTENT_TEMPLATES = {
  knowledge_base: {
    label: "基础知识库",
    countPerCat: 3,
    prompt: (level1: string, level2: string) => {
      let extra = "";
      if (level1 === "中医养生") extra = `\n**重要：文章结尾必须附加以下免责声明：**\n${TCM_DISCLAIMER}`;
      if (level1 === "易经智慧") extra = `\n**重要：文章结尾必须附加以下定位声明：**\n${ICHING_POSITIONING}`;
      if (level1 === "非遗传承") extra = `\n**重要：文章结尾必须附加以下原创声明：**\n${ICH_ATTRIBUTION}`;
      return `请为"${level1}—${level2}"撰写一篇入门科普文章（约800字）。要求：1. 面向零基础读者 2. 语言通俗易懂 3. 包含核心概念解释 4. 避免封建迷信表述 5. 标题格式：XXX入门指南${extra}`;
    },
  },
  classics: {
    label: "经典精华库",
    countPerCat: 5,
    prompt: (level1: string, level2: string) => {
      let extra = "";
      if (level1 === "中医养生") extra = `\n**重要：结尾必须附加免责声明：**\n${TCM_DISCLAIMER}`;
      if (level1 === "易经智慧") extra = `\n**重要：结尾必须附加定位声明：**\n${ICHING_POSITIONING}`;
      return `请列出"${level1}—${level2}"领域最经典的5条名句/核心观点，每条附100字左右的白话解读。格式：每条为：【原文】xxx 【解读】xxx${extra}`;
    },
  },
  tutorial: {
    label: "玩法教程库",
    countPerCat: 2,
    prompt: (level1: string, level2: string) =>
      `请为"${level1}—${level2}"撰写一篇平台使用教程（约500字），告诉用户如何在国学平台上学习/体验该领域内容。标题格式：如何在热卜国学平台学XX`,
  },
};

/** 类型参数到模板键的映射 */
const TEMPLATE_KEY_MAP: Record<string, keyof typeof CONTENT_TEMPLATES> = {
  knowledge: "knowledge_base",
  classics: "classics",
  tutorial: "tutorial",
};

export interface GenerationRecord {
  id: string;
  categoryLevel1: string;
  categoryLevel2: string;
  type: string;
  title: string;
  status: "success" | "error";
  error?: string;
  createdAt: string;
}

export interface GenerationParams {
  temperature: number;
  maxTokens: number;
  delayMs: number;
  knowledgeCountPerCat: number;
  classicsCountPerCat: number;
  tutorialCountPerCat: number;
}

const MAX_HISTORY = 200;

@Injectable()
export class ContentGenerationService {
  private readonly logger = new Logger(ContentGenerationService.name);
  private isRunning = false;
  private lastRunTime: string | null = null;
  private lastRunResult: { categories: number; generated: number } | null = null;
  /** 生成历史环形缓冲 */
  private history: GenerationRecord[] = [];
  private historySeq = 0;
  /** 可调参数（运行时覆盖默认值） */
  private params: GenerationParams = {
    temperature: 0.7,
    maxTokens: 2048,
    delayMs: 2000,
    knowledgeCountPerCat: 3,
    classicsCountPerCat: 5,
    tutorialCountPerCat: 2,
  };

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly prisma: PrismaService,
  ) {}

  /** 获取品类标签树（优先读 system_config，回退默认值） */
  private async loadCategoryTree(): Promise<Record<string, string[]>> {
    try {
      const cfg = await this.prisma.configSystem.findUnique({ where: { configKey: "category_tree" } });
      if (cfg?.configValue) {
        const parsed = JSON.parse(cfg.configValue);
        if (typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      }
    } catch (_err) { /* fall through */ }
    return DEFAULT_CATEGORY_TREE;
  }

  /** 手动触发：为新品类生成种子内容 */
  async generateForCategory(
    categoryLevel1: string,
    categoryLevel2?: string,
    types: ("knowledge" | "classics" | "tutorial")[] = ["knowledge", "classics", "tutorial"],
  ) {
    const tree = await this.loadCategoryTree();
    const level2List = categoryLevel2
      ? [categoryLevel2]
      : tree[categoryLevel1] || [];

    if (level2List.length === 0) {
      this.logger.warn(`未知品类: ${categoryLevel1}`);
      return { categoryLevel1, error: "未知一级品类" };
    }

    const results: Array<{ level2: string; type: string; title: string }> = [];

    for (const level2 of level2List) {
      for (const type of types) {
        const template = CONTENT_TEMPLATES[TEMPLATE_KEY_MAP[type]];
        const prompt = template.prompt(categoryLevel1, level2);
        const count = template.countPerCat;

        for (let i = 0; i < count; i++) {
          try {
            const resp = await this.gateway.chat({
              scene: "content_generation",
              messages: [{ role: "user", content: prompt }],
              options: { temperature: this.params.temperature, maxTokens: this.params.maxTokens },
            });

            const content = resp.content;
            const titleMatch = content.match(/(?:###?\s*)?(.{5,50}(?:指南|入门|赏析|要点|解读|教程|秘诀|精华))/);
            const title = titleMatch ? titleMatch[1] : `${categoryLevel1}-${level2}${template.label} #${i + 1}`;

            await this.prisma.content.create({
              data: {
                title,
                body: content,
                type: "ARTICLE",
                tags: [categoryLevel1, level2, template.label, "AI生成"],
                categoryLevel1,
                categoryLevel2: level2,
                status: "DRAFT",
              },
            });

            results.push({ level2, type, title });
            this.addHistory(categoryLevel1, level2, type, title, "success");
            this.logger.log(`生成完成: [${categoryLevel1}/${level2}] ${title}`);

            await new Promise((r) => setTimeout(r, this.params.delayMs));
          } catch (err: any) {
            this.addHistory(categoryLevel1, level2, type, "", "error", err.message);
            this.logger.error(`生成失败 [${categoryLevel1}/${level2}] ${type}: ${err.message}`);
          }
        }
      }
    }

    return { categoryLevel1, generated: results.length, results };
  }

  /** 每日定时：检查空品类并自动补全（凌晨3点） */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async autoFillEmptyCategories() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.log("开始自动填充空品类");

    let categories = 0;
    let generated = 0;
    try {
      const tree = await this.loadCategoryTree();
      for (const [level1, level2List] of Object.entries(tree)) {
        for (const level2 of level2List) {
          // 包含 DRAFT 状态，避免每天重复生成（DRAFT 也算已有内容）
          const count = await this.prisma.content.count({
            where: { categoryLevel1: level1, categoryLevel2: level2 },
          });

          if (count < 3) {
            this.logger.log(`品类 [${level1}/${level2}] 内容不足（${count}篇），自动补充`);
            categories++;
            const result = await this.generateForCategory(level1, level2, ["knowledge"]);
            generated += result.generated || 0;
          }
        }
      }
      this.lastRunTime = new Date().toISOString();
      this.lastRunResult = { categories, generated };
      this.logger.log(`自动填充完成: ${categories}个品类, 生成${generated}篇`);
    } finally {
      this.isRunning = false;
    }
  }

  // ───────── 历史与参数管理 ─────────

  private addHistory(
    categoryLevel1: string,
    categoryLevel2: string,
    type: string,
    title: string,
    status: "success" | "error",
    error?: string,
  ) {
    const record: GenerationRecord = {
      id: `${++this.historySeq}`,
      categoryLevel1,
      categoryLevel2,
      type,
      title: title.slice(0, 100),
      status,
      error,
      createdAt: new Date().toISOString(),
    };
    this.history.push(record);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }
  }

  /** 获取生成历史 */
  getGenerationHistory(filter?: { categoryLevel1?: string; type?: string; status?: string; limit?: number }) {
    let records = this.history;
    if (filter?.categoryLevel1) records = records.filter((r) => r.categoryLevel1 === filter.categoryLevel1);
    if (filter?.type) records = records.filter((r) => r.type === filter.type);
    if (filter?.status) records = records.filter((r) => r.status === filter.status);
    return records.slice(-(filter?.limit || 50)).reverse();
  }

  /** 获取任务运行状态 */
  getTaskStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      lastRunResult: this.lastRunResult,
      historyTotal: this.history.length,
    };
  }

  /** 获取当前生成参数 */
  getParams(): GenerationParams {
    return { ...this.params };
  }

  /** 更新生成参数（只修改运行时参数，不修改模块常量模板） */
  updateParams(dto: Partial<GenerationParams>) {
    if (dto.temperature !== undefined) this.params.temperature = Math.max(0.1, Math.min(1.5, dto.temperature));
    if (dto.maxTokens !== undefined) this.params.maxTokens = Math.max(256, Math.min(8192, dto.maxTokens));
    if (dto.delayMs !== undefined) this.params.delayMs = Math.max(500, Math.min(10000, dto.delayMs));
    if (dto.knowledgeCountPerCat !== undefined) {
      this.params.knowledgeCountPerCat = Math.max(1, Math.min(10, dto.knowledgeCountPerCat));
    }
    if (dto.classicsCountPerCat !== undefined) {
      this.params.classicsCountPerCat = Math.max(1, Math.min(10, dto.classicsCountPerCat));
    }
    if (dto.tutorialCountPerCat !== undefined) {
      this.params.tutorialCountPerCat = Math.max(1, Math.min(10, dto.tutorialCountPerCat));
    }
    this.logger.log(`生成参数已更新: ${JSON.stringify(this.params)}`);
    return this.params;
  }

  /** 获取品类内容统计 */
  async getCategoryStats() {
    const tree = await this.loadCategoryTree();
    const details: Array<{
      level1: string;
      level2: string;
      knowledgeCount: number;
      classicsCount: number;
      tutorialCount: number;
      totalCount: number;
      healthScore: number;
    }> = [];

    let totalContent = 0;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const [level1, level2List] of Object.entries(tree)) {
      for (const level2 of level2List) {
        const baseWhere = { categoryLevel1: level1, categoryLevel2: level2, status: { not: "DRAFT" } as any };
        const [knowledgeCount, classicsCount, tutorialCount] = await Promise.all([
          this.prisma.content.count({ where: { ...baseWhere, tags: { has: "基础知识库" } } }),
          this.prisma.content.count({ where: { ...baseWhere, tags: { has: "经典精华库" } } }),
          this.prisma.content.count({ where: { ...baseWhere, tags: { has: "玩法教程库" } } }),
        ]);
        const totalCount = knowledgeCount + classicsCount + tutorialCount;
        totalContent += totalCount;

        // 健康度：每种类型达到目标数量的比例
        const kScore = Math.min(knowledgeCount / 3, 1) * 33.3;
        const cScore = Math.min(classicsCount / 5, 1) * 33.3;
        const tScore = Math.min(tutorialCount / 2, 1) * 33.4;
        const healthScore = Math.round(kScore + cScore + tScore);

        details.push({ level1, level2, knowledgeCount, classicsCount, tutorialCount, totalCount, healthScore });
      }
    }

    const totalGeneratedToday = await this.prisma.content.count({
      where: {
        tags: { hasSome: ["基础知识库", "经典精华库", "玩法教程库"] },
        createdAt: { gte: todayStart },
      },
    });

    return {
      totalCategories: Object.keys(tree).length,
      totalContent,
      emptyCategories: details.filter((s) => s.totalCount === 0).length,
      totalGeneratedToday,
      details,
    };
  }

  /** 获取品类标签树 */
  async getCategoryTree() {
    return this.loadCategoryTree();
  }
}
