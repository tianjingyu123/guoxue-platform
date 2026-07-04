import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, MaxLength, MinLength } from "class-validator";
import { MarketingContentService } from "./marketing-content.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { ThrottleGuard } from "../../common/throttle.guard";
import { CurrentUserId } from "../../common/current-user.decorator";

export class GenerateMarketingContentDto {
  @ApiProperty({ description: "选题/主题（≤100字）", example: "今日小暑｜应景内容黄金日" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  topic: string;

  @ApiPropertyOptional({ description: "风格要求（可选，≤50字）", example: "轻松幽默" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  style?: string;
}

/**
 * 课-P1 AI 获客内容套件（获客环）
 * 三生成端点（JWT+限流）+ 今日选题端点（纯规则不调 AI）
 */
@ApiTags("AI获客内容套件")
@Controller("ai/marketing")
export class MarketingContentController {
  constructor(private readonly marketing: MarketingContentService) {}

  @Post("video-script")
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiOperation({ summary: "生成短视频脚本（口播稿+分镜+封面标题·过审核漏斗·尾部拼ref短链）" })
  @ApiResponse({ status: 201, description: "生成成功" })
  @ApiResponse({ status: 400, description: "参数校验失败/限额已满/内容未过审" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  generateVideoScript(@CurrentUserId() userId: string, @Body() dto: GenerateMarketingContentDto) {
    return this.marketing.generate(userId, "SHORT_VIDEO", dto.topic, dto.style);
  }

  @Post("moments")
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiOperation({ summary: "生成朋友圈文案（3条备选+配图建议·过审核漏斗·尾部拼ref短链）" })
  @ApiResponse({ status: 201, description: "生成成功" })
  @ApiResponse({ status: 400, description: "参数校验失败/限额已满/内容未过审" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  generateMoments(@CurrentUserId() userId: string, @Body() dto: GenerateMarketingContentDto) {
    return this.marketing.generate(userId, "MOMENTS", dto.topic, dto.style);
  }

  @Post("xiaohongshu")
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiOperation({ summary: "生成小红书图文（爆款标题+正文+tag组·过审核漏斗·尾部拼ref短链）" })
  @ApiResponse({ status: 201, description: "生成成功" })
  @ApiResponse({ status: 400, description: "参数校验失败/限额已满/内容未过审" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  generateXiaohongshu(@CurrentUserId() userId: string, @Body() dto: GenerateMarketingContentDto) {
    return this.marketing.generate(userId, "XIAOHONGSHU", dto.topic, dto.style);
  }

  @Get("today-topics")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "今日发什么：3-5个今日选题（节气引擎+模板轮换·纯规则不调AI）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  todayTopics() {
    return this.marketing.todayTopics();
  }
}
