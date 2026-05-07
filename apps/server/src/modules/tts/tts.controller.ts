import { Controller, Post, Get, Body, Query, Res } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from "@nestjs/swagger"
import { Response } from "express"
import { TtsService, TtsRequest } from "./tts.service"

@ApiTags("语音合成")
@Controller("tts")
export class TtsController {
  constructor(private tts: TtsService) {}

  /** 文本转语音 (POST) */
  @Post("synthesize")
  @ApiOperation({ summary: "文本转语音（POST）" })
  @ApiBody({ type: Object, description: "TTS 请求参数，包含 text、voice、rate" })
  async synthesize(@Body() dto: TtsRequest, @Res() res: Response) {
    const { audio, contentType } = await this.tts.synthesize(dto)
    res.set({
      "Content-Type": contentType,
      "Content-Length": audio.length.toString(),
      "Cache-Control": "public, max-age=604800",
    })
    res.send(audio)
  }

  /** 文本转语音 (GET, 方便作为 audio src 直接使用) */
  @Get("synthesize")
  @ApiOperation({ summary: "文本转语音（GET）" })
  @ApiQuery({ name: "text", required: true, type: String, description: "要合成的文本" })
  @ApiQuery({ name: "voice", required: false, type: String, description: "语音类型" })
  @ApiQuery({ name: "rate", required: false, type: String, description: "语速" })
  async synthesizeGet(
    @Query("text") text: string,
    @Query("voice") voice: string,
    @Query("rate") rate: string,
    @Res() res: Response,
  ) {
    const { audio, contentType } = await this.tts.synthesize({ text, voice, rate })
    res.set({
      "Content-Type": contentType,
      "Content-Length": audio.length.toString(),
      "Cache-Control": "public, max-age=604800",
    })
    res.send(audio)
  }

  /** 获取可用语音列表 */
  @Get("voices")
  @ApiOperation({ summary: "获取可用语音列表" })
  getVoices() {
    return this.tts.getVoices()
  }
}
