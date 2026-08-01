import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

export type JieqiAiMode = "poem" | "health";

/**
 * 节气 AI（对应 V0 app/api/jieqi/ai/route.ts）
 * - poem：节气诗词的深度赏析
 * - health：结合节气 + 中医体质的养生问答
 *
 * 合规红线（R4/医疗）：养生口径必须写明「不构成医疗建议、不适请就医」，不得开方剂、不得断病。
 * 缓存：诗词赏析与用户无关，按节气名缓存；养生问答含个人提问，不缓存。
 */
@Injectable()
export class JieqiAiService {
  private apiKey = process.env.DEEPSEEK_API_KEY || "";
  private poemCache = new Map<string, string>();

  async ask(input: {
    mode: JieqiAiMode;
    jieqi: string;
    constitution?: string;
    question?: string;
  }): Promise<{ text: string }> {
    const jieqi = (input.jieqi || "").trim();
    if (!jieqi) throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供节气名");

    if (input.mode === "poem" && this.poemCache.has(jieqi)) {
      return { text: this.poemCache.get(jieqi)! };
    }
    if (!this.apiKey) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 服务暂未开通，请联系管理员配置密钥");
    }

    const prompt =
      input.mode === "poem"
        ? [
            `请对「${jieqi}」这一节气的代表性古诗词做一段深度赏析（300-400 字）。`,
            `要求：①点出物候与诗境的呼应；②讲清炼字与意象；③落到节气的文化内涵。`,
            `只可引用你确切知道的真实诗句，不确定就不要引用原文，改从意境层面谈——严禁编造诗句或出处。`,
          ].join("\n")
        : [
            `你是中医养生科普作者。请结合「${jieqi}」节气${input.constitution ? `与「${input.constitution}」体质` : ""}回答用户的养生问题。`,
            `用户问题：${(input.question || "").slice(0, 200)}`,
            `要求：①先讲节气与体质的气机特点；②给出可操作的饮食/起居/运动/情志建议；③300 字以内。`,
            `红线：不得开具药方与剂量、不得诊断疾病、不得承诺疗效；结尾必须提示「以上为养生科普，不构成医疗建议，身体不适请及时就医」。`,
          ].join("\n");

    const text = await this.callDeepSeek(prompt);
    if (input.mode === "poem") this.poemCache.set(jieqi, text);
    return { text };
  }

  private async callDeepSeek(prompt: string): Promise<string> {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你是精通二十四节气文化与中医养生的研究者。用简体中文作答，语言雅正克制。诗词原文宁缺毋滥、严禁编造；养生内容不得开方剂、不得诊断疾病。",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `AI 服务暂不可用 (${res.status}): ${t.slice(0, 100)}`);
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  }
}
