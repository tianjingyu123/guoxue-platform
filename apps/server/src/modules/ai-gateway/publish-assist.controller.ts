import { Controller, Post, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
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
  polish(@Req() req: Request, @Body() dto: PolishTextDto) {
    return this.svc.polishText(dto.text, req.user.id);
  }

  @Post("optimize-title")
  @ApiOperation({ summary: "AI标题优化" })
  optimizeTitle(@Req() req: Request, @Body() dto: OptimizeTitleDto) {
    return this.svc.optimizeTitle(dto.content, req.user.id);
  }

  @Post("suggest-tags")
  @ApiOperation({ summary: "AI标签推荐" })
  suggestTags(@Req() req: Request, @Body() dto: SuggestTagsDto) {
    return this.svc.suggestTags(dto.content, req.user.id);
  }

  @Post("generate-cover")
  @ApiOperation({ summary: "AI封面图生成" })
  generateCover(@Req() req: Request, @Body() dto: GenerateCoverDto) {
    return this.svc.generateCover(dto.prompt, req.user.id);
  }
}
