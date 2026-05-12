import { Injectable } from "@nestjs/common"
import { RedisService } from "../../redis/redis.service"
import { createHash } from "node:crypto"
import { BusinessException } from "../../common/business.exception"
import { ErrorCode } from "../../common/error-codes"

/** 可选的中文语音 */
const VOICES: Record<string, string> = {
  xiaoxiao: "zh-CN-XiaoxiaoNeural",   // 女声，温和
  yunxi: "zh-CN-YunxiNeural",         // 男声，叙事
  xiaoyi: "zh-CN-XiaoyiNeural",       // 女声，活泼
  yunjian: "zh-CN-YunjianNeural",     // 男声，沉稳
}

const EDGE_TTS_URL =
  "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4"

const CACHE_TTL = 86400 * 7 // 7 天

export interface TtsRequest {
  text: string
  voice?: string
  rate?: string  // e.g. "-20%" or "+10%"
}

@Injectable()
export class TtsService {
  constructor(private redis: RedisService) {}

  /** 将文本转换为语音，返回 Buffer */
  async synthesize(req: TtsRequest): Promise<{ audio: Buffer; contentType: string }> {
    const voice = VOICES[req.voice || "xiaoxiao"] || VOICES.xiaoxiao
    const rate = req.rate || "0%"
    const text = req.text.trim().slice(0, 3000) // 限制 3000 字

    // 缓存 key
    const cacheKey = this.buildCacheKey(text, voice, rate)
    const cached = await this.redis.getBuffer(cacheKey)
    if (cached) {
      return { audio: cached, contentType: "audio/mpeg" }
    }

    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
      <voice name="${voice}"><prosody rate="${rate}">${this.escapeXml(text)}</prosody></voice>
    </speak>`

    const res = await fetch(EDGE_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/ssml+xml",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
      },
      body: ssml,
    })

    if (!res.ok) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `TTS API 请求失败: ${res.status}`)
    }

    const audio = Buffer.from(await res.arrayBuffer())

    // 缓存
    await this.redis.setBuffer(cacheKey, audio, CACHE_TTL)

    return { audio, contentType: "audio/mpeg" }
  }

  /** 获取可用语音列表 */
  getVoices() {
    return Object.keys(VOICES).map(k => ({
      id: k,
      name: ({ xiaoxiao: "晓晓(女)", yunxi: "云希(男)", xiaoyi: "晓依(女)", yunjian: "云健(男)" } as any)[k] || k,
    }))
  }

  private buildCacheKey(text: string, voice: string, rate: string): string {
    const hash = createHash("md5").update(`${text}|${voice}|${rate}`).digest("hex")
    return `tts:${hash}`
  }

  private escapeXml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
