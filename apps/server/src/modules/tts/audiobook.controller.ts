import { Body, Controller, Get, Param, Post, Put, Query, Req, Res, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { Request, Response } from "express"
import { Type } from "class-transformer"
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"
import { JwtAuthGuard } from "../../common/jwt-auth.guard"
import { ThrottleGuard } from "../../common/throttle.guard"
import { SkipFormat } from "../../common/skip-format.decorator"
import { AudiobookService, ACCESS_TTL_SECONDS } from "./audiobook.service"
import { sendAudioWithRange } from "./audio-response"

export class SegmentAudioDto {
  @IsIn(["original", "vernacular"]) textType: "original" | "vernacular"
  @IsOptional() @IsString() @MaxLength(32) voice?: string
}

export class ProgressQuery {
  @IsString() @MaxLength(64) chapterId: string
  @IsIn(["original", "vernacular"]) textType: "original" | "vernacular"
}

export class SaveProgressDto {
  @IsString() @MaxLength(64) chapterId: string
  @IsIn(["original", "vernacular"]) textType: "original" | "vernacular"
  @IsOptional() @IsString() @MaxLength(64) segmentId?: string
  @Type(() => Number) @IsInt() @Min(0) @Max(100000) sortOrder: number
  @Type(() => Number) @IsInt() @Min(0) @Max(36_000_000) positionMs: number
  @Type(() => Number) @IsNumber() @Min(0.5) @Max(3) rate: number
}

/** 有声读书（S05）：段落音频、临时播放地址、断点续听 */
@ApiTags("有声读书")
@Controller("audiobook")
export class AudiobookController {
  constructor(private readonly audiobook: AudiobookService) {}

  /** 生成或复用段落音频，返回 10 分钟有效的播放地址。公开古籍无需登录；限流防刷合成 */
  @Post("segments/:id/audio")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "段落音频（原文/白话），命中已有资产不再合成" })
  segmentAudio(@Param("id") id: string, @Body() dto: SegmentAudioDto) {
    return this.audiobook.segmentAudio(id, dto.textType, dto.voice)
  }

  /** 签名地址取音频（供 <audio>/InnerAudioContext 直接作为 src；端上无法带 Authorization 头） */
  @Get("assets/:id/stream")
  @SkipFormat()
  async stream(
    @Param("id") id: string,
    @Query("exp") exp: string,
    @Query("sig") sig: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const audio = await this.audiobook.streamAsset(id, Number(exp), sig)
    sendAudioWithRange(req, res, audio, "audio/mpeg", `private, max-age=${ACCESS_TTL_SECONDS}`)
  }

  @Get("progress")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的听书断点" })
  getProgress(@Req() req: Request, @Query() q: ProgressQuery) {
    return this.audiobook.getProgress((req as any).user.id, q.chapterId, q.textType)
  }

  @Put("progress")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "保存听书断点（段落 ID + 段内位置 + 倍速偏好）" })
  saveProgress(@Req() req: Request, @Body() dto: SaveProgressDto) {
    return this.audiobook.saveProgress((req as any).user.id, dto)
  }
}
