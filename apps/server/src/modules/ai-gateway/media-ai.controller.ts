import { Controller, Post, Get, Body, Req, UseGuards, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { MediaAiService } from "./media-ai.service";
import { AiLoggerService } from "./ai-logger.service";
import { ImageAuditDto, TtsDto, TranscribeDto } from "./dto/media-ai.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

@ApiTags("AI媒体处理")
@Controller("ai/media")
export class MediaAiController {
  constructor(
    private readonly mediaAi: MediaAiService,
    private readonly aiLogger: AiLoggerService,
  ) {}

  /** AI 图像内容审核 */
  @Post("image-audit")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "AI图像内容审核 — 检测违规内容" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async auditImage(@Body() dto: ImageAuditDto, @Req() req: Request) {
    const userId = req.user?.id;
    if (!dto.imageUrl) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "imageUrl 不能为空");
    }
    return this.mediaAi.auditImage({ imageUrl: dto.imageUrl, context: dto.context, userId });
  }

  /** 文字转语音 */
  @Post("tts")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "AI文字转语音 — 生成SSML标注" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async textToSpeech(@Body() dto: TtsDto, @Req() req: Request) {
    const userId = req.user?.id;
    return this.mediaAi.textToSpeech({ text: dto.text, voice: dto.voice, speed: dto.speed, userId });
  }

  /** 语音转文字 */
  @Post("transcribe")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "AI语音转文字 — 音频转写" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async transcribeAudio(@Body() dto: TranscribeDto, @Req() req: Request) {
    const userId = req.user?.id;
    return this.mediaAi.transcribeAudio({ audioUrl: dto.audioUrl, language: dto.language, userId });
  }

  /** 媒体处理任务列表（管理员） */
  @Get("tasks")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取媒体处理任务列表（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  @ApiQuery({ name: "type", required: false, description: "image_audit | tts | transcribe" })
  async getTasks(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("type") type?: string,
  ) {
    const p = parseInt(page || "1", 10);
    const ps = parseInt(pageSize || "20", 10);
    const scenes = type === "image_audit" ? ["media_audit"] :
                   type === "tts" ? ["media_tts"] :
                   type === "transcribe" ? ["media_transcribe"] :
                   ["media_audit", "media_tts", "media_transcribe"];

    return this.aiLogger.query({ page: p, pageSize: ps, scenes });
  }
}
