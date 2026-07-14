import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { ZidianService } from "./zidian.service";

/** AI 解读结构（与 V0 app/api/zidian/ai/route.ts 的 zod schema 一一对应） */
export interface ZidianAiResult {
  nameExamples: { name: string; gender: string; meaning: string }[];
  poetic: string;
  shuowen: string;
  classicUse: string;
  relatedChars: { char: string; reason: string }[];
  baziAdvice?: string;
}

/**
 * 汉字 AI 解读（V0 用 Vercel AI Gateway + Gemini；本项目统一走 DeepSeek）
 *
 * 关键约束（沿用 V0 prompt 的三条硬要求）：
 *   ① 客观数据（繁体/拼音/部首/笔画/五行/数理/释义）由本地引擎给定，AI 不得与之矛盾；
 *   ② 《说文》原文与典籍用例「宁缺毋滥，严禁编造」，不确定则明说暂无收录；
 *   ③ 出生信息仅作五行补益参考，语气克制（合规）。
 * 缓存：不带出生信息时结果与用户无关，按字做进程内缓存，省钱且秒回。
 */
@Injectable()
export class ZidianAiService {
  private apiKey = process.env.DEEPSEEK_API_KEY || "";
  private cache = new Map<string, ZidianAiResult>();

  constructor(private readonly zidian: ZidianService) {}

  async interpret(char: string, birth?: string): Promise<ZidianAiResult> {
    const ch = Array.from((char || "").trim())[0];
    if (!ch || !/\p{Script=Han}/u.test(ch)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供要解读的汉字");
    }
    const b = birth?.trim();
    if (!b && this.cache.has(ch)) return this.cache.get(ch)!;
    if (!this.apiKey) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 解读暂未开通，请联系管理员配置密钥");
    }

    const entry = await this.zidian.lookup(ch).then((r) => r.results[0]);
    const prompt = [
      `你是资深的汉字文化与姓名学研究者。请针对汉字「${ch}」输出结构化解读。`,
      entry ? `已知客观数据（必须与之一致，不得矛盾）：` : "",
      entry ? `- 繁体：${entry.traditional}；拼音：${entry.pinyin}` : "",
      entry ? `- 新华字典释义节选：${entry.explanation.slice(0, 200)}` : "",
      b ? `- 用户出生时间：${b}（请据此做五行补益分析，语气克制，仅供文化研习参考）` : "",
      `要求：起名用例要音韵和谐、避免生僻搭配；诗句必须原创且意境贴合；说文与典籍部分宁缺毋滥，严禁编造原文。`,
      ``,
      `严格输出如下 JSON（不要任何多余文字）：`,
      `{`,
      `  "nameExamples": [{"name":"含此字的双字名(不带姓)","gender":"男|女|通用","meaning":"30字以内寓意"}]  // 恰好 4 条,`,
      `  "poetic": "围绕该字意境原创的一句诗或对联，20字以内",`,
      `  "shuowen": "《说文解字》原文+白话翻译；不确定则从字形结构做白话解字，不得编造原文",`,
      `  "classicUse": "该字在《诗经》《周易》《论语》等经典中的真实原句及出处；不确定则写「暂无典籍用例收录」",`,
      `  "relatedChars": [{"char":"单字","reason":"10字以内理由"}]  // 恰好 5 条`,
      b ? `  ,"baziAdvice": "此字五行对其八字的补益或冲克，是否推荐，80字以内"` : "",
      `}`,
    ]
      .filter(Boolean)
      .join("\n");

    const raw = await this.callDeepSeek(prompt);
    const parsed = this.parse(raw);
    if (!b) this.cache.set(ch, parsed);
    return parsed;
  }

  private parse(raw: string): ZidianAiResult {
    // DeepSeek 开了 json_object 也偶有 ```json 包裹，稳妥剥一层
    const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "");
    let obj: any;
    try {
      obj = JSON.parse(text);
    } catch {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 返回格式异常，请重试");
    }
    return {
      nameExamples: Array.isArray(obj.nameExamples)
        ? obj.nameExamples.slice(0, 4).map((n: any) => ({
            name: String(n?.name ?? ""),
            gender: String(n?.gender ?? "通用"),
            meaning: String(n?.meaning ?? ""),
          }))
        : [],
      poetic: String(obj.poetic ?? ""),
      shuowen: String(obj.shuowen ?? ""),
      classicUse: String(obj.classicUse ?? ""),
      relatedChars: Array.isArray(obj.relatedChars)
        ? obj.relatedChars
            .slice(0, 5)
            .map((c: any) => ({ char: Array.from(String(c?.char ?? ""))[0] ?? "", reason: String(c?.reason ?? "") }))
            .filter((c: { char: string }) => !!c.char)
        : [],
      baziAdvice: obj.baziAdvice ? String(obj.baziAdvice) : undefined,
    };
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
              "你是精通汉字源流、训诂与姓名学的研究者。只输出 JSON，不加任何解释。典籍原文宁缺毋滥，严禁编造。",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `AI 解读暂时不可用 (${res.status}): ${t.slice(0, 120)}`);
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  }
}
