import { Controller, Post, Get, Body, Query, Res } from "@nestjs/common"
import { Response } from "express"
import { TtsService, TtsRequest } from "./tts.service"

@Controller("tts")
export class TtsController {
  constructor(private tts: TtsService) {}

  /** 文本转语音 (POST) */
  @Post("synthesize")
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
  getVoices() {
    return this.tts.getVoices()
  }
}
