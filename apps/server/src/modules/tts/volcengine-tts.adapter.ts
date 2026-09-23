import { Injectable, Logger } from "@nestjs/common";
import { createHash, createHmac } from "node:crypto";

/**
 * 火山引擎 TTS 适配器
 *
 * 用于有声读书语音智能体场景，支持火山引擎的高质量音色朗读功能。
 * 文档：https://www.volcengine.com/docs/6561/79820
 */

export interface VolcengineTtsRequest {
  text: string;
  voice?: string; // 音色类型，如 zh_female_qingxin
  speed?: number; // 语速 0.5-2.0，默认 1.0
  volume?: number; // 音量 0-10，默认 5
  pitch?: number; // 音调 -12到12，默认 0
  format?: "mp3" | "wav" | "pcm"; // 音频格式，默认 mp3
  sampleRate?: 16000 | 24000; // 采样率，默认 24000
}

export interface VolcengineTtsResponse {
  audio: Buffer;
  contentType: string;
  requestId?: string;
}

@Injectable()
export class VolcengineTtsAdapter {
  private readonly logger = new Logger(VolcengineTtsAdapter.name);
  private readonly endpoint = "https://openspeech.bytedance.com/api/v1/tts";

  /**
   * 生成火山引擎 API 签名（v4）
   */
  private generateSignature(
    accessKey: string,
    secretKey: string,
    timestamp: string,
    body: string,
  ): string {
    const algorithm = "HMAC-SHA256";
    const service = "tts";
    const region = "cn-north-1";
    const date = timestamp.split("T")[0];

    // 1. 构造规范请求
    const canonicalRequest = [
      "POST",
      "/api/v1/tts",
      "",
      `content-type:application/json\nhost:openspeech.bytedance.com\nx-date:${timestamp}\n`,
      "content-type;host;x-date",
      createHash("sha256").update(body, "utf8").digest("hex"),
    ].join("\n");

    // 2. 构造待签名字符串
    const credentialScope = `${date}/${region}/${service}/request`;
    const stringToSign = [
      algorithm,
      timestamp,
      credentialScope,
      createHash("sha256").update(canonicalRequest, "utf8").digest("hex"),
    ].join("\n");

    // 3. 计算签名
    const kDate = createHmac("sha256", secretKey).update(date).digest();
    const kRegion = createHmac("sha256", kDate).update(region).digest();
    const kService = createHmac("sha256", kRegion).update(service).digest();
    const kSigning = createHmac("sha256", kService).update("request").digest();
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    return `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=content-type;host;x-date, Signature=${signature}`;
  }

  /**
   * 合成语音
   */
  async synthesize(req: VolcengineTtsRequest): Promise<VolcengineTtsResponse> {
    const accessKey = process.env.VOLCENGINE_ACCESS_KEY;
    const secretKey = process.env.VOLCENGINE_SECRET_KEY;
    const appId = process.env.VOLCENGINE_TTS_APP_ID;

    if (!accessKey || !secretKey || !appId) {
      throw new Error("火山引擎 TTS 未配置（需要 VOLCENGINE_ACCESS_KEY/SECRET_KEY/TTS_APP_ID）");
    }

    const body = JSON.stringify({
      app: {
        appid: appId,
        token: "access_token",
        cluster: process.env.VOLCENGINE_TTS_CLUSTER || "volcano_tts",
      },
      user: {
        uid: "default_user",
      },
      audio: {
        voice_type: req.voice || "zh_female_qingxin",
        encoding: req.format === "wav" ? "wav" : req.format === "pcm" ? "pcm" : "mp3",
        speed_ratio: req.speed || 1.0,
        volume_ratio: (req.volume || 5) / 5.0,
        pitch_ratio: req.pitch || 0,
        rate: req.sampleRate || 24000,
      },
      request: {
        reqid: `gx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        text: req.text,
        text_type: "plain",
        operation: "submit",
      },
    });

    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const authorization = this.generateSignature(accessKey, secretKey, timestamp, body);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Host: "openspeech.bytedance.com",
          "X-Date": timestamp,
          Authorization: authorization,
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`火山引擎 TTS 调用失败: ${response.status} ${errorText}`);
        throw new Error(`火山引擎 TTS 调用失败: ${response.status}`);
      }

      const result: any = await response.json();

      if (result.code !== 3000) {
        this.logger.error(`火山引擎 TTS 业务错误: ${result.code} ${result.message}`);
        throw new Error(`火山引擎 TTS 业务错误: ${result.message}`);
      }

      // 火山引擎返回 base64 编码的音频
      const audioData = result.data;
      const audioBuffer = Buffer.from(audioData, "base64");

      const contentType =
        req.format === "wav"
          ? "audio/wav"
          : req.format === "pcm"
            ? "audio/pcm"
            : "audio/mpeg";

      return {
        audio: audioBuffer,
        contentType,
        requestId: result.reqid,
      };
    } catch (error: any) {
      this.logger.error(`火山引擎 TTS 请求异常: ${error?.message || error}`);
      throw error;
    }
  }

  /**
   * 获取可用音色列表
   */
  getAvailableVoices(): Array<{ id: string; name: string; language: string; gender: string }> {
    return [
      { id: "zh_female_qingxin", name: "青心（女）", language: "zh-CN", gender: "female" },
      { id: "zh_male_wennuanzhonghou", name: "温暖中厚（男）", language: "zh-CN", gender: "male" },
      { id: "zh_female_tianmei", name: "甜美（女）", language: "zh-CN", gender: "female" },
      { id: "zh_male_chunhouziran", name: "醇厚自然（男）", language: "zh-CN", gender: "male" },
      { id: "zh_female_zhixingguanchang", name: "知性馆长（女）", language: "zh-CN", gender: "female" },
      { id: "zh_male_chenwen", name: "沉稳（男）", language: "zh-CN", gender: "male" },
      { id: "zh_female_gushi", name: "故事（女）", language: "zh-CN", gender: "female" },
      { id: "zh_male_gushi", name: "故事（男）", language: "zh-CN", gender: "male" },
    ];
  }
}
