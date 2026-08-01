import { Injectable, Logger, Optional } from "@nestjs/common";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SystemService } from "../system/system.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { SEED_TOPICS, SEED_FORM_LABEL, SeedForm, SeedTopic, findSeedTopic } from "./operational-seed.registry";

/**
 * 运营种子内容生成器（内容生成自动化·上线前种子内容填充试点）
 *
 * 护栏集成：
 *  - 生成即**草稿**（Content.status=DRAFT，tag 含"待审核"）——初期人工质量闸；
 *  - 对外发布走 EXTERNAL_PUBLISH 红线（内容/文章 publish 端点已挂 @RedLineGate），AI 不得自动发布；
 *  - 生成动作本身在 controller 标 @Autonomy(L2)（人点一下、AI 生成、可删可改）。
 *
 * 质量保障：prompt 注入选题的**真实平台知识点**（非通用填充），并按合规注意加声明。
 */
@Injectable()
export class OperationalSeedService {
  private readonly logger = new Logger(OperationalSeedService.name);

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly prisma: PrismaService,
    @Optional() private readonly systemService?: SystemService,
  ) {}

  private async brandName(): Promise<string> {
    try {
      const cfg = await this.systemService?.getBrandConfig();
      return (cfg as { siteName?: string } | undefined)?.siteName || "热卜国学";
    } catch {
      return "热卜国学";
    }
  }

  /** 列出运营种子选题（供后台面板选择） */
  listTopics() {
    return {
      total: SEED_TOPICS.length,
      topics: SEED_TOPICS.map((t) => ({
        key: t.key,
        title: t.title,
        audience: t.audience,
        purpose: t.purpose,
        recommendedForms: t.recommendedForms.map((f) => ({ form: f, label: SEED_FORM_LABEL[f] })),
        knowledgePointCount: t.knowledgePoints.length,
        note: t.note,
      })),
    };
  }

  /** 构造 prompt：注入真实平台知识点 + 形式要求 + 合规声明 */
  private buildPrompt(topic: SeedTopic, form: SeedForm, brand: string): string {
    const knowledge = topic.knowledgePoints.map((k, i) => `${i + 1}. ${k}`).join("\n");
    const formSpec: Record<SeedForm, string> = {
      article: "一篇 600~900 字的科普/介绍文章，结构清晰、有小标题",
      post: "一条 200~350 字的社区帖子，口语化、有代入感、结尾带一句互动引导",
      video_script: "一份短视频脚本（30~60秒），含【口播文案】逐句 + 【画面/字幕建议】，适合数字人口播或图文卡点",
    };
    const compliance = topic.note ? `\n【合规与口径】${topic.note}` : "";
    return (
      `你在为「${brand}」平台创作**运营种子内容**，目标是让用户了解平台玩法并产生认同。\n` +
      `【选题】${topic.title}\n【受众】${topic.audience}\n【目的】${topic.purpose}\n` +
      `【必须基于以下真实平台事实创作，不得编造平台不存在的功能或承诺具体收益/价格数字】：\n${knowledge}\n` +
      `【形式】请产出${formSpec[form]}。\n` +
      `【要求】真实、具体、不浮夸、不喊口号；语言亲切可信；不得虚构数据。${compliance}`
    );
  }

  /**
   * 生成一条运营种子内容草稿（L2：人点一下、AI 生成，落 DRAFT，可删可改，发布另走人工红线闸）。
   * @param topicKey 选题
   * @param form     形式（默认取选题第一个建议形式）
   * @param operator 执行者（审计/署名）
   */
  async generateDraft(topicKey: string, form: SeedForm | undefined, operator: string) {
    const topic = findSeedTopic(topicKey);
    if (!topic) {
      throw new BusinessException(ErrorCode.NOT_FOUND, `未知运营种子选题：${topicKey}`);
    }
    const useForm: SeedForm = form && SEED_FORM_LABEL[form] ? form : topic.recommendedForms[0];
    const brand = await this.brandName();
    const prompt = this.buildPrompt(topic, useForm, brand);

    let content: string;
    try {
      const resp = await this.gateway.chat({
        scene: "content_generation",
        messages: [{ role: "user", content: prompt }],
        options: { temperature: 0.7, maxTokens: 2048 },
      });
      content = (resp.content || "").trim();
    } catch (err) {
      this.logger.error(`运营种子生成失败 [${topicKey}/${useForm}]: ${(err as Error).message}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 生成服务暂时不可用，请稍后重试");
    }
    if (!content) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 返回为空，请重试");
    }

    const draft = await this.prisma.content.create({
      data: {
        title: topic.title,
        body: content,
        type: "ARTICLE",
        tags: ["运营种子", topic.key, SEED_FORM_LABEL[useForm], "AI生成", "待审核"],
        categoryLevel1: "平台运营",
        categoryLevel2: SEED_FORM_LABEL[useForm],
        status: "DRAFT", // 绝不自动发布：对外发布是 EXTERNAL_PUBLISH 红线，须人工审核后发布
      },
    });

    this.logger.log(`运营种子草稿已生成：[${topic.key}/${useForm}] contentId=${draft.id}（执行者 ${operator}）`);
    return {
      id: draft.id,
      topic: topic.key,
      title: topic.title,
      form: useForm,
      formLabel: SEED_FORM_LABEL[useForm],
      status: "DRAFT",
      needsHumanReview: true, // 质量闸：人工审核 + 发布（红线人工闸）
      length: content.length,
    };
  }
}
