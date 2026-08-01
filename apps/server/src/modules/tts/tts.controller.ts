import { Controller, Post, Get, Body, Query, Res, UseGuards, Req } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Response, Request } from "express"
import { TtsService } from "./tts.service"
import { TtsRequestDto } from "./tts.dto"
import { JwtAuthGuard } from "../../common/jwt-auth.guard"
import { SkipFormat } from "../../common/skip-format.decorator"

@ApiTags("语音合成")
@ApiBearerAuth()
@Controller("tts")
export class TtsController {
  constructor(private tts: TtsService) {}

  /** 文本转语音 (POST) */
  @Post("synthesize")
  @SkipFormat()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "文本转语音（POST）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBody({ type: Object, description: "TTS 请求参数，包含 text、voice、rate、emotion、emotionIntensity、segmentRate" })
  async synthesize(@Req() req: Request, @Body() dto: TtsRequestDto, @Res() res: Response) {
    const { audio, contentType } = await this.tts.synthesize(dto)
    res.set({
      "Content-Type": contentType,
      "Content-Length": audio.length.toString(),
      "Cache-Control": "public, max-age=604800",
    })
    res.send(audio)
  }

  /** 文本转语音 (GET, 方便作为 audio src 直接使用) */
  // 公开只读：听书/朗读内容为库内公开经典，供 <audio>/InnerAudioContext 直接作为 src 拉取
  // （端上无法给音频请求带 Authorization 头）。防滥用靠 Redis 缓存 + 文本长度上限。
  @Get("synthesize")
  @SkipFormat()
  @ApiOperation({ summary: "文本转语音（GET·公开·供音频 src 直连）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiQuery({ name: "text", required: true, type: String, description: "要合成的文本" })
  @ApiQuery({ name: "voice", required: false, type: String, description: "语音类型" })
  @ApiQuery({ name: "rate", required: false, type: String, description: "语速" })
  @ApiQuery({ name: "emotion", required: false, type: String, description: "情感风格，如 poetry、story、peaceful" })
  @ApiQuery({ name: "emotionIntensity", required: false, type: Number, description: "情感强度，50-200" })
  @ApiQuery({ name: "segmentRate", required: false, type: Number, description: "断句敏感阈值，0-2" })
  async synthesizeGet(
    @Req() req: Request,
    @Query("text") text: string,
    @Query("voice") voice: string | undefined,
    @Query("rate") rate: string | undefined,
    @Query("emotion") emotion: string | undefined,
    @Query("emotionIntensity") emotionIntensity: string | undefined,
    @Query("segmentRate") segmentRate: string | undefined,
    @Res() res: Response,
  ) {
    const { audio, contentType } = await this.tts.synthesize({
      text,
      voice,
      rate,
      emotion,
      emotionIntensity: emotionIntensity ? Number(emotionIntensity) : undefined,
      segmentRate: segmentRate ? Number(segmentRate) : undefined,
    })
    this.sendAudio(req, res, audio, contentType)
  }

  /**
   * 媒体标签/InnerAudioContext 会通过 Range 请求探测和续取音频。
   * 返回标准 206，避免 iOS、微信 WebView 等环境把完整 200 响应判为不可播放。
   */
  private sendAudio(req: Request, res: Response, audio: Buffer, contentType: string) {
    const total = audio.length
    const commonHeaders = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=604800",
    }
    const range = req.headers.range
    if (!range) {
      res.set({ ...commonHeaders, "Content-Length": total.toString() })
      res.send(audio)
      return
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match) {
      res.status(416)
      res.set({ ...commonHeaders, "Content-Range": `bytes */${total}` })
      res.end()
      return
    }

    const start = match[1] ? Number(match[1]) : 0
    const requestedEnd = match[2] ? Number(match[2]) : total - 1
    const end = Math.min(requestedEnd, total - 1)
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= total || end < start) {
      res.status(416)
      res.set({ ...commonHeaders, "Content-Range": `bytes */${total}` })
      res.end()
      return
    }

    const chunk = audio.subarray(start, end + 1)
    res.status(206)
    res.set({
      ...commonHeaders,
      "Content-Length": chunk.length.toString(),
      "Content-Range": `bytes ${start}-${end}/${total}`,
    })
    res.send(chunk)
  }

  /** 获取可用语音列表 */
  @Get("voices")
  @ApiOperation({ summary: "获取可用语音列表" })
  @ApiResponse({ status: 200, description: "成功" })
  getVoices() {
    return this.tts.getVoices()
  }
}
