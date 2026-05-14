import { Injectable, Logger } from "@nestjs/common";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { PrismaService } from "../../prisma/prisma.service";
import { Cron, CronExpression } from "@nestjs/schedule";

/** 品类标签树（一级→二级） */
const CATEGORY_TREE: Record<string, string[]> = {
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

const CONTENT_TEMPLATES = {
  knowledge_base: {
    label: "基础知识库",
    countPerCat: 3,
    prompt: (level1: string, level2: string) =>
      `请为"${level1}—${level2}"撰写一篇入门科普文章（约800字）。要求：1. 面向零基础读者 2. 语言通俗易懂 3. 包含核心概念解释 4. 避免封建迷信表述 5. 标题格式：XXX入门指南`,
  },
  classics: {
    label: "经典精华库",
    countPerCat: 5,
    prompt: (level1: string, level2: string) =>
      `请列出"${level1}—${level2}"领域最经典的5条名句/核心观点，每条附100字左右的白话解读。格式：每条为：【原文】xxx 【解读】xxx`,
  },
  tutorial: {
    label: "玩法教程库",
    countPerCat: 2,
    prompt: (level1: string, level2: string) =>
      `请为"${level1}—${level2}"撰写一篇平台使用教程（约500字），告诉用户如何在国学平台上学习/体验该领域内容。标题格式：如何在热卜国学平台学XX`,
  },
};

@Injectable()
export class ContentGenerationService {
  private readonly logger = new Logger(ContentGenerationService.name);
  private isRunning = false;

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly prisma: PrismaService,
  ) {}

  /** 手动触发：为新品类生成种子内容 */
  async generateForCategory(
    categoryLevel1: string,
    categoryLevel2?: string,
    types: ("knowledge" | "classics" | "tutorial")[] = ["knowledge", "classics", "tutorial"],
  ) {
    const level2List = categoryLevel2
      ? [categoryLevel2]
      : CATEGORY_TREE[categoryLevel1] || [];

    if (level2List.length === 0) {
      this.logger.warn(`未知品类: ${categoryLevel1}`);
      return { categoryLevel1, error: "未知一级品类" };
    }

    const results: Array<{ level2: string; type: string; title: string }> = [];

    for (const level2 of level2List) {
      for (const type of types) {
        const template = CONTENT_TEMPLATES[type === "knowledge" ? "knowledge_base" : type === "classics" ? "classics" : "tutorial"];
        const prompt = template.prompt(categoryLevel1, level2);
        const count = template.countPerCat;

        for (let i = 0; i < count; i++) {
          try {
            const resp = await this.gateway.chat({
              scene: "content_generation",
              messages: [{ role: "user", content: prompt }],
              options: { temperature: 0.7, maxTokens: 2048 },
            });

            const content = resp.content;
            // 提取标题（取第一行或"xxx入门指南"等关键词）
            const titleMatch = content.match(/(?:###?\s*)?(.{5,50}(?:指南|入门|赏析|要点|解读|教程|秘诀|精华))/);
            const title = titleMatch ? titleMatch[1] : `${categoryLevel1}-${level2}${template.label} #${i + 1}`;

            // 存入草稿箱
            await this.prisma.content.create({
              data: {
                title,
                body: content,
                type: "ARTICLE",
                tags: [categoryLevel1, level2, template.label],
                categoryLevel1,
                categoryLevel2: level2,
                status: "DRAFT",
              },
            });

            results.push({ level2, type, title });
            this.logger.log(`生成完成: [${categoryLevel1}/${level2}] ${title}`);

            // 避免API频率限制
            await new Promise((r) => setTimeout(r, 2000));
          } catch (err: any) {
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

    try {
      for (const [level1, level2List] of Object.entries(CATEGORY_TREE)) {
        for (const level2 of level2List) {
          const count = await this.prisma.content.count({
            where: { categoryLevel1: level1, categoryLevel2: level2, status: { not: "DRAFT" } },
          });

          if (count < 3) {
            this.logger.log(`品类 [${level1}/${level2}] 内容不足（${count}篇），自动补充`);
            await this.generateForCategory(level1, level2, ["knowledge"]);
          }
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  /** 获取品类内容统计 */
  async getCategoryStats() {
    const stats: Array<{
      level1: string;
      level2: string;
      published: number;
      draft: number;
      total: number;
    }> = [];

    for (const [level1, level2List] of Object.entries(CATEGORY_TREE)) {
      for (const level2 of level2List) {
        const [published, draft] = await Promise.all([
          this.prisma.content.count({
            where: { categoryLevel1: level1, categoryLevel2: level2, status: { not: "DRAFT" } },
          }),
          this.prisma.content.count({
            where: { categoryLevel1: level1, categoryLevel2: level2, status: "DRAFT" },
          }),
        ]);
        stats.push({ level1, level2, published, draft, total: published + draft });
      }
    }

    return {
      totalCategories: stats.length,
      emptyCategories: stats.filter((s) => s.total === 0).length,
      lowContentCategories: stats.filter((s) => s.total > 0 && s.total < 5).length,
      stats,
    };
  }

  /** 获取品类标签树 */
  getCategoryTree() {
    return CATEGORY_TREE;
  }
}
