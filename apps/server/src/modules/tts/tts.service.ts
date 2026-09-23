import { Injectable, Logger } from "@nestjs/common"
import { RedisService } from "../../redis/redis.service"
import { AudioAssetService, type SynthesisOutput, type TtsProviderId } from "./audio-asset.service"
import { VolcengineTtsAdapter } from "./volcengine-tts.adapter"
import { createHash, randomUUID } from "node:crypto"
import { normalizeSpeechText } from "./speech-text"
import { BusinessException } from "../../common/business.exception"
import { ErrorCode } from "../../common/error-codes"
import { tc3Sign, TencentCloudResponse } from "../../common/tc3.util"
import {
  hasTencentCloudCredentialConfiguration,
  resolveTencentCloudCredentials,
  type TencentResolvedCredentials,
} from "../../common/tencent-instance-role-credentials"

/**
 * TTS 文字转语音服务
 *
 * ## 供应商策略（2026-09-14 更新）
 * - **火山引擎 TTS**：有声读书语音智能体专用，支持高质量音色朗读
 * - **腾讯云 TTS（TextToVoice）**：通用场景，已开通·生产稳定
 * - **Microsoft Edge TTS**：未配置密钥或调用失败时降级，保证零成本可用
 * - **为什么前端要走后端：** 浏览器 speechSynthesis 在移动端/微信 WebView 普遍不支持
 * - **缓存 7 天：** 国学内容重复请求率高，Redis 缓存大幅降低外部调用与费用
 */

/** 音色：edge=Edge 语音名，tencent=腾讯云 VoiceType，volcengine=火山引擎音色，label=展示名 */
const VOICES: Record<string, { edge: string; tencent: number; volcengine?: string; label: string }> = {
  xiaoxiao: { edge: "zh-CN-XiaoxiaoNeural", tencent: 101001, volcengine: "zh_female_qingxin", label: "晓晓(女)" },
  yunxi: { edge: "zh-CN-YunxiNeural", tencent: 101004, volcengine: "zh_male_wennuanzhonghou", label: "云希(男)" },
  xiaoyi: { edge: "zh-CN-XiaoyiNeural", tencent: 101002, volcengine: "zh_female_tianmei", label: "晓依(女)" },
  yunjian: { edge: "zh-CN-YunjianNeural", tencent: 101003, volcengine: "zh_male_chunhouziran", label: "云健(男)" },
  gushi_female: { edge: "zh-CN-XiaoxiaoNeural", tencent: 101001, volcengine: "zh_female_gushi", label: "故事(女)" },
  gushi_male: { edge: "zh-CN-YunxiNeural", tencent: 101004, volcengine: "zh_male_gushi", label: "故事(男)" },
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

  constructor(
    private redis: RedisService,
    private audioAssetService: AudioAssetService,
    private volcengine: VolcengineTtsAdapter,
  ) {}

  /**
   * 将文本转换为语音，返回 Buffer。
   *
   * 流程：
   * 1. Redis 缓存快速路径（7天TTL，仅缓存与期望供应商一致的音频）
   * 2. 音频资产服务：命中持久化资产时从存储读回，**不调用任何合成**
   * 3. 未命中时在资产锁内合成一次，按实际供应商/音色入库
   */
  async synthesize(req: TtsRequest): Promise<{ audio: Buffer; contentType: string }> {
    const voiceKey = req.voice && VOICES[req.voice] ? req.voice : "xiaoxiao"
    const rate = req.rate || "0%"
    const style = this.normalizeStyle(req)
    const text = normalizeSpeechText(req.text || "").slice(0, 3000)
    if (!text) throw new BusinessException(ErrorCode.BAD_REQUEST, "合成文本不能为空")

    const provider = this.determineTtsProvider()
    const cacheKey = this.buildCacheKey(text, voiceKey, rate, style, provider)

    // 1. Redis 缓存快速路径
    const cached = await this.redis.getBuffer(cacheKey)
    if (cached) {
      return { audio: cached, contentType: "audio/mpeg" }
    }

    // 2. 音频资产服务（原子锁、持久化、按实际供应商入库）
    const assetReq = {
      sourceType: "tts_request",
      sourceId: createHash("sha256").update(text).digest("hex").slice(0, 32),
      text,
      textType: "original" as const,
      ttsProvider: provider,
      voiceId: this.providerVoiceId(provider, voiceKey),
      audioFormat: "mp3",
      synthesisParams: {
        rate,
        emotion: style.emotion,
        emotionIntensity: style.emotionIntensity,
        segmentRate: style.segmentRate,
      },
    }
    const synthesizeFn = () => this.doSynthesize(text, voiceKey, rate, style)

    let asset = await this.audioAssetService.getOrCreateAudioAsset(assetReq, synthesizeFn)
    let audio = asset.audio ?? null
    if (!audio) {
      audio = await this.audioAssetService.readAssetAudio(asset)
      if (!audio) {
        // 存储对象确认丢失（资产已标记不可播放）：重新走一次受锁保护的生成
        asset = await this.audioAssetService.getOrCreateAudioAsset(assetReq, synthesizeFn)
        audio = asset.audio ?? (await this.audioAssetService.readAssetAudio(asset))
        if (!audio) {
          throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "音频资产暂不可用，请稍后重试")
        }
      }
    }

    // 3. 只把与期望供应商一致的音频写入该缓存键，降级音频不冒充期望音色
    if (!asset.fallbackFrom) {
      await this.redis.setBuffer(cacheKey, audio, CACHE_TTL)
    }

    return { audio, contentType: "audio/mpeg" }
  }

  /** 各供应商下的真实音色标识（资产身份使用，避免不同供应商同名音色混用） */
  private providerVoiceId(provider: TtsProviderId, voiceKey: string): string {
    const v = VOICES[voiceKey] || VOICES.xiaoxiao
    if (provider === "volcengine") return v.volcengine || "zh_female_qingxin"
    if (provider === "tencent") return String(v.tencent)
    return v.edge
  }

  /** 实际合成：火山引擎优先，腾讯云次选，失败降级 Edge。返回实际使用的供应商与音色。 */
  private async doSynthesize(text: string, voiceKey: string, rate: string, style: TtsStyle): Promise<SynthesisOutput> {
    // 优先火山引擎（有声读书专用）
    if (process.env.VOLCENGINE_ACCESS_KEY && process.env.VOLCENGINE_TTS_APP_ID) {
      try {
        const audio = await this.volcengineSynthesize(text, voiceKey, rate, style)
        return { audio, ttsProvider: "volcengine", voiceId: this.providerVoiceId("volcengine", voiceKey) }
      } catch (e: any) {
        this.logger.warn(`火山引擎 TTS 失败，尝试腾讯云：${e?.message || e}`)
      }
    }

    // 腾讯云
    const secretId = process.env.TENCENT_SECRET_ID || process.env.COS_SECRET_ID || ""
    const secretKey = process.env.TENCENT_SECRET_KEY || process.env.COS_SECRET_KEY || ""
    if (hasTencentCloudCredentialConfiguration(secretId, secretKey)) {
      try {
        const credentials = await resolveTencentCloudCredentials(secretId, secretKey)
        const audio = await this.tencentSynthesize(text, voiceKey, rate, style, credentials)
        return { audio, ttsProvider: "tencent", voiceId: this.providerVoiceId("tencent", voiceKey) }
      } catch (e: any) {
        this.logger.warn(`腾讯云 TTS 失败，降级 Edge：${e?.message || e}`)
      }
    }

    // 最终降级 Edge TTS
    const audio = await this.edgeSynthesize(text, voiceKey, rate)
    return { audio, ttsProvider: "edge", voiceId: this.providerVoiceId("edge", voiceKey) }
  }

  /** 判断当前使用的 TTS 供应商 */
  private determineTtsProvider(): "volcengine" | "tencent" | "edge" {
    // 优先级：火山引擎 > 腾讯云 > Edge TTS
    if (process.env.VOLCENGINE_ACCESS_KEY && process.env.VOLCENGINE_TTS_APP_ID) {
      return "volcengine"
    }
    const secretId = process.env.TENCENT_SECRET_ID || process.env.COS_SECRET_ID || ""
    const secretKey = process.env.TENCENT_SECRET_KEY || process.env.COS_SECRET_KEY || ""
    return hasTencentCloudCredentialConfiguration(secretId, secretKey) ? "tencent" : "edge"
  }

  /** 火山引擎 TTS 合成 */
  private async volcengineSynthesize(text: string, voiceKey: string, rate: string, style: TtsStyle): Promise<Buffer> {
    const voice = VOICES[voiceKey]?.volcengine || "zh_female_qingxin"
    // 将 rate 字符串（如 "+10%", "-20%"）转为数字（1.1, 0.8）
    const rateNum = rate.replace('%', '')
    const speed = rateNum.startsWith('+') || rateNum.startsWith('-')
      ? 1 + parseFloat(rateNum) / 100
      : 1.0

    const result = await this.volcengine.synthesize({
      text,
      voice,
      speed,
      format: "mp3",
    })

    return result.audio
  }

  /** 腾讯云 TextToVoice（一句话合成，≤150 汉字/段）。 */
  private async tencentSynthesize(
    text: string,
    voiceKey: string,
    rate: string,
    style: TtsStyle,
    credentials: TencentResolvedCredentials,
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
        secretId: credentials.secretId,
        secretKey: credentials.secretKey,
        securityToken: credentials.securityToken,
        service: "tts", action: "TextToVoice",
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

  /** 构建缓存键（包含供应商信息，修复交接书指出的"不同供应商同名音色混成同一缓存"问题） */
  private buildCacheKey(text: string, voice: string, rate: string, style: TtsStyle, provider: string): string {
    const hash = createHash("md5")
      .update(`${provider}|${text}|${voice}|${rate}|${style.emotion || ""}|${style.emotionIntensity || ""}|${style.segmentRate}`)
      .digest("hex")
    return `tts:${provider}:${hash}`
  }

  private escapeXml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
