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

@Injectable()
export class PublishAssistService {
  private readonly logger = new Logger(PublishAssistService.name);

  constructor(private readonly gateway: AiGatewayService) {}

  /** AI文字润色 */
  async polishText(text: string, userId?: string) {
    const result = await this.gateway.chat({
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

  /** AI标题优化 */
  async optimizeTitle(content: string, userId?: string) {
    const result = await this.gateway.chat({
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
    const result = await this.gateway.chat({
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
    const result = await this.gateway.chat({
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
