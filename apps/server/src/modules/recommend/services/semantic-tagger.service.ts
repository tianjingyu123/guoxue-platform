import { Injectable, Logger } from "@nestjs/common";
import { AiGatewayService } from "../../ai-gateway/ai-gateway.service";
import { RedisService } from "../../../redis/redis.service";

/**
 * 语义标签自动打标服务
 *
 * 使用 LLM 对内容自动标注品类标签和语义标签，
 * 替代规则匹配，提升标签覆盖率和准确度。
 */
@Injectable()
export class SemanticTaggerService {
  private readonly logger = new Logger(SemanticTaggerService.name);

  /** 10 大一级品类 */
  static readonly CATEGORIES = [
    "儒学经典", "道家文化", "佛学禅修", "中医养生",
    "诗词文学", "书法绘画", "易学风水和命理", "传统技艺",
    "传统节日与民俗", "少儿国学",
  ];

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 对文本内容自动打标签
   * @returns { categoryLevel1, categoryLevel2, tags[] }
   */
  async tagContent(text: string): Promise<{
    categoryLevel1: string;
    categoryLevel2: string;
    tags: string[];
  }> {
    const prompt = `你是一个国学内容分类专家。请对以下内容进行分类。

一级品类（10选1）：${SemanticTaggerService.CATEGORIES.join("、")}

请以JSON格式返回：
{
  "categoryLevel1": "儒学经典",
  "categoryLevel2": "论语",
  "tags": ["孔子", "仁政", "君子"]
}

二级品类不限，tags是3-5个关键词标签。只返回JSON。

内容：${text.slice(0, 800)}`;

    try {
      const resp = await this.gateway.chat({
        scene: "semantic_tagging",
        messages: [{ role: "user", content: prompt }],
        options: { temperature: 0.3, maxTokens: 200 },
      });

      const jsonMatch = resp.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          categoryLevel1: parsed.categoryLevel1 || "国学综合",
          categoryLevel2: parsed.categoryLevel2 || "",
          tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
        };
      }
    } catch (err: any) {
      this.logger.warn(`语义打标失败: ${err.message}`);
    }

    return { categoryLevel1: "国学综合", categoryLevel2: "", tags: [] };
  }

  /**
   * 批量打标（并发控制）
   */
  async tagBatch(items: Array<{ id: string; text: string }>): Promise<Map<string, { categoryLevel1: string; categoryLevel2: string; tags: string[] }>> {
    const result = new Map<string, { categoryLevel1: string; categoryLevel2: string; tags: string[] }>();

    for (let i = 0; i < items.length; i += 3) {
      const batch = items.slice(i, i + 3);
      const batchResults = await Promise.allSettled(
        batch.map((item) => this.tagContent(item.text)),
      );
      for (let j = 0; j < batch.length; j++) {
        const r = batchResults[j];
        result.set(
          batch[j].id,
          r.status === "fulfilled" ? r.value : { categoryLevel1: "国学综合", categoryLevel2: "", tags: [] },
        );
      }
    }

    return result;
  }

  /** 生成冷启动推荐理由 */
  async generateRecommendReason(itemTitle: string, category: string): Promise<string> {
    try {
      const resp = await this.gateway.chat({
        scene: "semantic_tagging",
        messages: [{
          role: "user",
          content: `请为以下${category}内容写一句15字以内的推荐语：${itemTitle}。只输出推荐语。`,
        }],
        options: { temperature: 0.8, maxTokens: 50 },
      });
      return resp.content.trim();
    } catch (err) {
      this.logger.warn(`语义标签生成失败: ${(err as Error).message}`);
      return `热门${category}内容推荐`;
    }
  }
}
