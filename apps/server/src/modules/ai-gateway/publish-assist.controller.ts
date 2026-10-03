import { Controller, Post, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { PublishAssistService } from "./publish-assist.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { PolishTextDto, OptimizeTitleDto, SuggestTagsDto, GenerateCoverDto } from "./dto/publish-assist.dto";

@ApiTags("AI发布辅助")
@Controller("ai/publish")
@UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
@ApiBearerAuth()
export class PublishAssistController {
  constructor(private readonly svc: PublishAssistService) {}

  @Post("polish")
  @ApiOperation({ summary: "AI文字润色" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  polish(@Req() req: Request, @Body() dto: PolishTextDto) {
    return this.svc.polishText(dto.text, req.user.id);
  }

  @Post("typeset")
  @ApiOperation({ summary: "AI一键排版（只加Markdown格式·不改文字·内容一致性校验兜底）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  typeset(@Req() req: Request, @Body() dto: PolishTextDto) {
    return this.svc.typesetText(dto.text, req.user.id);
  }

  @Post("optimize-title")
  @ApiOperation({ summary: "AI标题优化" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  optimizeTitle(@Req() req: Request, @Body() dto: OptimizeTitleDto) {
    return this.svc.optimizeTitle(dto.content, req.user.id);
  }

  @Post("suggest-tags")
  @ApiOperation({ summary: "AI标签推荐" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  suggestTags(@Req() req: Request, @Body() dto: SuggestTagsDto) {
    return this.svc.suggestTags(dto.content, req.user.id);
  }

  @Post("generate-cover")
  @ApiOperation({ summary: "AI封面图生成" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  generateCover(@Req() req: Request, @Body() dto: GenerateCoverDto) {
    return this.svc.generateCover(dto.prompt, req.user.id);
  }
}
