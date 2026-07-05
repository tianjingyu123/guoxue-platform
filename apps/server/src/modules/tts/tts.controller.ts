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
  @ApiBody({ type: Object, description: "TTS 请求参数，包含 text、voice、rate" })
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
  async synthesizeGet(
    @Req() req: Request,
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
  @ApiResponse({ status: 200, description: "成功" })
  getVoices() {
    return this.tts.getVoices()
  }
}
