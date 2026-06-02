import { Injectable } from "@nestjs/common"
import { RedisService } from "../../redis/redis.service"
import { createHash } from "node:crypto"
import { BusinessException } from "../../common/business.exception"
import { ErrorCode } from "../../common/error-codes"

/**
 * TTS 文字转语音服务
 *
 * ## 选型理由
 * - **为什么用 Microsoft Edge TTS：** 免费、中文语音质量好（Xiaoxiao/Yunxi 等神经网络声）、
 *   SSML 支持语调控制。适合当前验证阶段零成本跑通
 * - **为什么不是腾讯云 TTS：** 项目已用腾讯云全家桶（COS/IM/VOD），TTS 也可接；
 *   但目前调用量低，Edge TTS 免费方案足够，后续量大了切腾讯云
 * - **为什么缓存 7 天：** 国学内容（经典诵读、课程音频）重复请求率高，
 *   Redis 缓存大幅降低外部调用
 * - **⚠️ 生产风险：** Edge TTS URL 是免费 consumer endpoint，非官方 API，
 *   Microsoft 可能随时限流或封禁。触发切换条件：日调用 >1000 次或被限流 → 切腾讯云 TTS
 * - **考虑过的方案：**
 *   1. 腾讯云 TTS → 好但当前浪费钱（调用量低）
 *   2. Azure Cognitive Services 正式 API → 好但贵
 *   3. Edge TTS + Redis 缓存（当前方案）→ ✅ 零成本验证，随时可切
 *
 * 可选的中文语音：
 */
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
