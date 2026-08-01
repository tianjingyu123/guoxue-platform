import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { AiGatewayService } from "./ai-gateway.service";
import { tc3Sign } from "../../common/tc3.util";

const POLISH_PROMPT = `你是一个专业的国学内容编辑。请对以下文本进行润色：
1. 保持原意不变
2. 修正语法和错别字
3. 使表达更流畅自然
4. 保持国学风格和韵味
5. 直接输出润色后的文本，不要解释`;

const TITLE_PROMPT = `你是一个专业的标题优化师。请为以下文章内容生成3个吸引人的标题：
1. 标题应简洁有力（15字以内）
2. 包含关键词
3. 适合国学平台的读者
4. 输出格式：每行一个标题，以数字序号开头`;

const TAG_PROMPT = `你是一个内容分类专家。请为以下文章内容推荐5个标签：
1. 标签应简短（2-4个字）
2. 覆盖文章的核心主题
3. 适合国学分类体系
4. 输出格式：以逗号分隔的标签列表`;

const TYPESET_PROMPT = `你是专业的文章排版工具。用户会给你一段纯文字，你唯一的任务是给它添加 Markdown 排版格式，让它结构清晰、易读。
严格规则（必须遵守）：
1. 【绝对不改文字】逐字保留原文每一个字，禁止增加、删除、修改、润色任何文字内容——你只能添加格式标记。
2. 允许添加的格式：## 标题层级、段落之间空行、- 或 1. 列表、> 引用、**关键词加粗**。
3. 原文若含图片标记（如 [图1]）保留在合理位置；没有则不添加。
4. 只输出排版后的 Markdown，不要任何解释、开场白或总结。
记住：你是排版工具不是编辑，一个字都不能改，只能加格式。`;

/** 去 Markdown 格式标记与空白，只留纯文字——用于"排版不改内容"的一致性校验 */
function stripToPlain(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接保留可见文字
    .replace(/[#>*`~_\-|]/g, "") // 常见格式标记
    .replace(/\s+/g, "") // 所有空白
    .trim();
}

@Injectable()
export class PublishAssistService {
  private readonly logger = new Logger(PublishAssistService.name);

  constructor(private readonly gateway: AiGatewayService) {}

  /**
   * 统一调用 AI 网关：上游（DeepSeek 等）失败时收敛为友好业务提示，
   * 原始报错只记日志，绝不把供应商原始响应体透传给 C 端用户。
   */
  private async safeChat(req: Parameters<AiGatewayService["chat"]>[0]) {
    try {
      return await this.gateway.chat(req);
    } catch (err) {
      this.logger.error(`AI网关调用失败(scene=${req.scene}): ${(err as Error)?.message}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 服务暂时不可用，请稍后再试");
    }
  }

  /** AI文字润色 */
  async polishText(text: string, userId?: string) {
    const result = await this.safeChat({
      scene: "publish_assist",
      userId,
      messages: [
        { role: "system", content: POLISH_PROMPT },
        { role: "user", content: text },
      ],
      options: { temperature: 0.3, maxTokens: 2048 },
    });
    return { polished: result.content };
  }

  /**
   * AI 一键排版——只加 Markdown 格式、绝不改文字。
   * 🔑硬保障"不改内容"：排版结果去掉格式后的纯文字，与输入逐字比对；不一致=AI 动了内容 → 拒绝该结果、回退原文。
   */
  async typesetText(text: string, userId?: string) {
    const result = await this.safeChat({
      scene: "publish_assist",
      userId,
      messages: [
        { role: "system", content: TYPESET_PROMPT },
        { role: "user", content: text },
      ],
      options: { temperature: 0.2, maxTokens: 4096 },
    });
    const formatted = (result.content || "").trim();
    if (!formatted || stripToPlain(formatted) !== stripToPlain(text)) {
      this.logger.warn("AI排版内容一致性校验未通过·回退原文（AI 可能改动了文字）");
      return { formatted: text, changed: false, warning: "AI 排版时可能改动了文字，已为你保留原文，可再试一次" };
    }
    return { formatted, changed: true };
  }

  /** AI标题优化 */
  async optimizeTitle(content: string, userId?: string) {
    const result = await this.safeChat({
      scene: "publish_assist",
      userId,
      messages: [
        { role: "system", content: TITLE_PROMPT },
        { role: "user", content: content },
      ],
      options: { temperature: 0.7, maxTokens: 512 },
    });
    const titles = result.content.split("\n").filter((l) => l.trim());
    return { titles };
  }

  /** AI标签推荐 */
  async suggestTags(content: string, userId?: string) {
    const result = await this.safeChat({
      scene: "publish_assist",
      userId,
      messages: [
        { role: "system", content: TAG_PROMPT },
        { role: "user", content: content },
      ],
      options: { temperature: 0.5, maxTokens: 256 },
    });
    const tags = result.content.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    return { tags };
  }

  /** AI封面图生成 — 调用腾讯云AI绘画，失败时回退到文本提示 */
  async generateCover(prompt: string, userId?: string, style?: string) {
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;

    if (secretId && secretKey) {
      try {
        const enhancedPrompt = `国学风格插画，${prompt}，传统中国风，水墨画风格，留白构图`;
        const { host, headers, payloadStr } = tc3Sign({
          secretId,
          secretKey,
          service: "aiart",
          action: "TextToImage",
          version: "2022-12-29",
          // 腾讯云要求 Region，漏传则恒报 missing required parameter `Region`（同 2026-07-14 短信事故）
          region: process.env.TENCENT_AIART_REGION || process.env.COS_REGION || "ap-guangzhou",
          payload: {
            Prompt: enhancedPrompt,
            NegativePrompt: "lowres, bad anatomy, extra fingers, blurry, ugly, text, watermark",
            Styles: [style || "201"], // 201=国风
            ResultConfig: { Resolution: "1024:1024" },
            LogoAdd: 0,
          },
        });

        const resp = await fetch(`https://${host}`, {
          method: "POST",
          headers,
          body: payloadStr,
        });

        const data: any = await resp.json();
        if (data.Response?.Error) {
          throw new BusinessException(ErrorCode.THIRD_AI_FAILED, data.Response.Error.Message);
        }

        if (data.Response?.ResultImage) {
          return {
            imageUrl: `data:image/png;base64,${data.Response.ResultImage}`,
            imageBase64: data.Response.ResultImage,
            designPrompt: enhancedPrompt,
            source: "tencent_aiart",
          };
        }
      } catch (err: any) {
        this.logger.warn(`封面图API生成失败，回退文本: ${err.message}`);
      }
    }

    // Fallback: 返回 AI 生成的文本设计提示词
    const result = await this.safeChat({
      scene: "cover_generation",
      userId,
      messages: [
        { role: "system", content: "你是一个AI图像生成助手。请根据用户的描述，生成适合国学风格封面图的设计提示词。" },
        { role: "user", content: `请为以下内容生成封面图设计提示词：${prompt}` },
      ],
      options: { temperature: 0.7, maxTokens: 512 },
    });
    return { designPrompt: result.content, imageUrl: null, source: "fallback", message: "封面图生成提示词已生成，前端请使用图片生成服务" };
  }
}
