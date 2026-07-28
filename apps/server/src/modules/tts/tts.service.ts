import { Injectable, Logger } from "@nestjs/common"
import { RedisService } from "../../redis/redis.service"
import { createHash, randomUUID } from "node:crypto"
import { BusinessException } from "../../common/business.exception"
import { ErrorCode } from "../../common/error-codes"
import { tc3Sign, TencentCloudResponse } from "../../common/tc3.util"

/**
 * TTS 文字转语音服务
 *
 * ## 供应商策略（2026-07-05 接入腾讯云）
 * - **优先腾讯云 TTS（TextToVoice）**：已开通·生产稳定·复用「腾讯云(通用)」SecretId/SecretKey
 *   （启动时 ThirdPartyConfigLoader 已把 DB 密钥解密注入 process.env.TENCENT_SECRET_ID/KEY）。
 * - **回退 Microsoft Edge TTS**：未配腾讯云密钥或腾讯云调用失败时降级，保证验证阶段零成本可用。
 * - **为什么前端要走后端而非浏览器 Web Speech：** 浏览器 speechSynthesis 在移动端/微信 WebView 普遍
 *   不支持，真机听书点不了；改由后端合成 mp3、前端 audio 播放，全端（小程序/App/H5/微信）通用。
 * - **缓存 7 天：** 国学内容（经典诵读、课程音频）重复请求率高，Redis 缓存大幅降低外部调用与费用。
 *
 * 腾讯云 TextToVoice 单次限制 ≤150 汉字，前端听书/朗读逐句调用（单句短），故后端按段合成即可。
 */

/** 音色：edge=Edge 语音名，tencent=腾讯云 VoiceType，label=展示名 */
const VOICES: Record<string, { edge: string; tencent: number; label: string }> = {
  xiaoxiao: { edge: "zh-CN-XiaoxiaoNeural", tencent: 101001, label: "晓晓(女)" }, // 腾讯 101001 智瑜·情感女声
  yunxi: { edge: "zh-CN-YunxiNeural", tencent: 101004, label: "云希(男)" },       // 腾讯 101004 智云·通用男声
  xiaoyi: { edge: "zh-CN-XiaoyiNeural", tencent: 101002, label: "晓依(女)" },     // 腾讯 101002 智聆·通用女声
  yunjian: { edge: "zh-CN-YunjianNeural", tencent: 101003, label: "云健(男)" },   // 腾讯 101003 智美·客服女声
}

const EDGE_TTS_URL =
  "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4"

const CACHE_TTL = 86400 * 7 // 7 天
const EMOTIONS = new Set([
  "neutral", "sad", "happy", "angry", "fear", "news", "story", "radio",
  "poetry", "call", "sajiao", "disgusted", "amaze", "peaceful",
  "exciting", "aojiao", "jieshuo",
])

export interface TtsRequest {
  text: string
  voice?: string
  rate?: string  // e.g. "-20%" or "+10%"
  emotion?: string
  emotionIntensity?: number
  segmentRate?: number
}

interface TtsStyle {
  emotion?: string
  emotionIntensity?: number
  segmentRate: number
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name)

  constructor(private redis: RedisService) {}

  /** 将文本转换为语音，返回 Buffer。优先腾讯云 TTS，失败回退 Edge TTS。 */
  async synthesize(req: TtsRequest): Promise<{ audio: Buffer; contentType: string }> {
    const voiceKey = req.voice && VOICES[req.voice] ? req.voice : "xiaoxiao"
    const rate = req.rate || "0%"
    const style = this.normalizeStyle(req)
    const text = req.text.trim().slice(0, 3000) // 上限 3000 字（Edge）；腾讯云单段自动截 150 字
    if (!text) throw new BusinessException(ErrorCode.BAD_REQUEST, "合成文本不能为空")

    // 缓存 key：供应商无关（同文本同音色同语速命中同缓存，切供应商不失效）
    const cacheKey = this.buildCacheKey(text, voiceKey, rate, style)
    const cached = await this.redis.getBuffer(cacheKey)
    if (cached) {
      return { audio: cached, contentType: "audio/mpeg" }
    }

    const audio = await this.doSynthesize(text, voiceKey, rate, style)

    // 缓存
    await this.redis.setBuffer(cacheKey, audio, CACHE_TTL)

    return { audio, contentType: "audio/mpeg" }
  }

  /** 实际合成：腾讯云优先，失败降级 Edge。 */
  private async doSynthesize(text: string, voiceKey: string, rate: string, style: TtsStyle): Promise<Buffer> {
    const secretId = process.env.TENCENT_SECRET_ID
    const secretKey = process.env.TENCENT_SECRET_KEY
    if (secretId && secretKey) {
      try {
        return await this.tencentSynthesize(text, voiceKey, rate, style, secretId, secretKey)
      } catch (e: any) {
        this.logger.warn(`腾讯云 TTS 失败，降级 Edge：${e?.message || e}`)
      }
    }
    return this.edgeSynthesize(text, voiceKey, rate)
  }

  /** 腾讯云 TextToVoice（一句话合成，≤150 汉字/段）。 */
  private async tencentSynthesize(
    text: string, voiceKey: string, rate: string, style: TtsStyle, secretId: string, secretKey: string,
  ): Promise<Buffer> {
    const voiceType = VOICES[voiceKey].tencent
    const region = process.env.TENCENT_TTS_REGION || "ap-guangzhou"

    // 腾讯云单次上限约 150 汉字：按段切分后逐段合成再拼接（mp3 帧可直接顺序拼接播放）
    const segments = this.splitByLength(text, 140)
    const buffers: Buffer[] = []
    for (const seg of segments) {
      const payload = {
        Text: seg,
        SessionId: randomUUID(),
        VoiceType: voiceType,
        Codec: "mp3",
        SampleRate: 16000,
        Volume: 5,
        Speed: this.rateToTencentSpeed(rate),
        SegmentRate: style.segmentRate,
        ...(style.emotion ? {
          EmotionCategory: style.emotion,
          EmotionIntensity: style.emotionIntensity,
        } : {}),
      }
      const signed = tc3Sign({
        secretId, secretKey, service: "tts", action: "TextToVoice",
        version: "2019-08-23", payload, region,
      })
      const res = await fetch(`https://${signed.host}`, {
        method: "POST",
        headers: signed.headers,
        body: signed.payloadStr,
      })
      const json = (await res.json()) as TencentCloudResponse & { Response?: { Audio?: string } }
      const err = json.Response?.Error
      if (err) throw new Error(`${err.Code}: ${err.Message}`)
      const b64 = json.Response?.Audio
      if (!b64) throw new Error("腾讯云 TTS 无 Audio 返回")
      buffers.push(Buffer.from(b64, "base64"))
    }
    return Buffer.concat(buffers)
  }

  /** Microsoft Edge TTS（免费回退）。 */
  private async edgeSynthesize(text: string, voiceKey: string, rate: string): Promise<Buffer> {
    const voice = VOICES[voiceKey].edge
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

    return Buffer.from(await res.arrayBuffer())
  }

  /** 获取可用语音列表 */
  getVoices() {
    return Object.keys(VOICES).map(k => ({ id: k, name: VOICES[k].label }))
  }

  /** rate 百分比字符串（"-20%"/"+10%"/"0%"）→ 腾讯云 Speed（-2~6，0=正常） */
  private rateToTencentSpeed(rate: string): number {
    const m = /(-?\d+)%/.exec(rate)
    if (!m) return 0
    const pct = Number(m[1])
    // 百分比映射到腾讯云 Speed 档位，钳制在合法区间
    const speed = Math.round(pct / 25)
    return Math.max(-2, Math.min(6, speed))
  }

  /** 按最大长度切分文本（尽量在标点处断句，避免腾讯云单段超限） */
  private splitByLength(text: string, maxLen: number): string[] {
    if (text.length <= maxLen) return [text]
    const out: string[] = []
    let buf = ""
    for (const ch of text) {
      buf += ch
      if (buf.length >= maxLen && /[，。！？；、,.!?;\n]/.test(ch)) {
        out.push(buf)
        buf = ""
      } else if (buf.length >= maxLen + 40) {
        // 长时间无标点，硬切避免超限
        out.push(buf)
        buf = ""
      }
    }
    if (buf) out.push(buf)
    return out
  }

  private normalizeStyle(req: TtsRequest): TtsStyle {
    const emotion = req.emotion && EMOTIONS.has(req.emotion) ? req.emotion : undefined
    const rawIntensity = Number(req.emotionIntensity)
    const emotionIntensity = emotion
      ? Math.max(50, Math.min(200, Number.isFinite(rawIntensity) ? Math.round(rawIntensity) : 100))
      : undefined
    const rawSegmentRate = Number(req.segmentRate)
    const segmentRate = Math.max(0, Math.min(2, Number.isFinite(rawSegmentRate) ? Math.round(rawSegmentRate) : 0))
    return { emotion, emotionIntensity, segmentRate }
  }

  private buildCacheKey(text: string, voice: string, rate: string, style: TtsStyle): string {
    const hash = createHash("md5")
      .update(`${text}|${voice}|${rate}|${style.emotion || ""}|${style.emotionIntensity || ""}|${style.segmentRate}`)
      .digest("hex")
    return `tts:${hash}`
  }

  private escapeXml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
