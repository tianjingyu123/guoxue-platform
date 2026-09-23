import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { VoiceAgentProfileService } from "./voice-agent-profile.service";

export class VoiceAgentDraftDto {
  @ApiProperty({ description: "角色名，1—20 字" })
  @IsString() @MinLength(1) @MaxLength(20)
  name: string;

  @ApiProperty({ description: "性格与说话风格" })
  @IsString() @MinLength(1) @MaxLength(500)
  persona: string;

  @ApiProperty({ description: "角色提示词（不要粘贴知识库内容）" })
  @IsString() @MinLength(1) @MaxLength(3000)
  prompt: string;

  @ApiProperty({ description: "平台开放的标准音色标识" })
  @IsString() @MinLength(1) @MaxLength(80)
  voiceId: string;

  @ApiPropertyOptional({
    description: "本圈自己提供的服务名（如“张老师八字详批”）。成员问到相关需求时，助理优先引导到这里，不外推给平台其他老师",
    type: [String],
  })
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) @MaxLength(40, { each: true })
  ownerServices?: string[];
}

export class ReviewDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional({ enum: ["lite", "standard"] }) @IsOptional() @IsIn(["lite", "standard"]) tier?: "lite" | "standard";
}

/** 圈主：申请与维护本圈小卜语音角色 */
@ApiTags("小卜·语音角色（圈主）")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("circles/:circleId/voice-agent")
export class CircleVoiceAgentController {
  constructor(private readonly svc: VoiceAgentProfileService) {}

  @Get()
  @ApiOperation({ summary: "查看本圈语音角色（草稿、审核状态、已发布版本）" })
  get(@Param("circleId") circleId: string, @Req() req: Request) {
    return this.svc.getForCircle(circleId, req.user.id);
  }

  @Put()
  @ApiOperation({ summary: "保存语音角色草稿" })
  save(@Param("circleId") circleId: string, @Body() dto: VoiceAgentDraftDto, @Req() req: Request) {
    return this.svc.saveCircleDraft(circleId, req.user.id, dto);
  }

  @Get("quota")
  @ApiOperation({ summary: "本圈语音额度：余额、近 7 天消耗、还能撑几天" })
  quota(@Param("circleId") circleId: string, @Req() req: Request) {
    return this.svc.quotaForCircle(circleId, req.user.id);
  }

  @Post("suggestions")
  @ApiOperation({ summary: "人设建议：怎么写才有辨识度（只提示，不拦截）" })
  suggestions(
    @Param("circleId") circleId: string,
    @Body() dto: VoiceAgentDraftDto | undefined,
    @Req() req: Request,
  ) {
    // 传草稿就按草稿评，不传就评已保存的那版——圈主边写边看，不必等提交后才知道哪里不行
    return this.svc.personaSuggestions(circleId, req.user.id, dto?.name ? dto : undefined);
  }

  @Post("submit")
  @ApiOperation({ summary: "提交平台审核" })
  submit(@Param("circleId") circleId: string, @Req() req: Request) {
    return this.svc.submitCircleDraft(circleId, req.user.id);
  }
}

/** 平台：审核、停用、回滚语音角色 */
@ApiTags("小卜·语音角色（平台审核）")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@Controller("admin/voice-agents")
export class AdminVoiceAgentController {
  constructor(private readonly svc: VoiceAgentProfileService) {}

  @Get()
  @ApiOperation({ summary: "按状态列出语音角色（默认待审核）" })
  list(@Query("status") status?: string) {
    return this.svc.listForReview(status || "PENDING_REVIEW");
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "审核通过并发布（生成版本快照）" })
  approve(@Param("id") id: string, @Body() dto: ReviewDto, @Req() req: Request) {
    return this.svc.approve(id, req.user.id, { tier: dto.tier, note: dto.note });
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "驳回（需填写原因）" })
  reject(@Param("id") id: string, @Body() dto: ReviewDto, @Req() req: Request) {
    return this.svc.reject(id, req.user.id, dto.note || "");
  }

  @Post(":id/disable")
  @ApiOperation({ summary: "停用" })
  disable(@Param("id") id: string, @Body() dto: ReviewDto, @Req() req: Request) {
    return this.svc.disable(id, req.user.id, dto.note);
  }

  @Post(":id/versions/:version/publish")
  @ApiOperation({ summary: "恢复或回滚到指定已审核版本" })
  publish(@Param("id") id: string, @Param("version", ParseIntPipe) version: number, @Req() req: Request) {
    return this.svc.publishVersion(id, version, req.user.id);
  }
}
