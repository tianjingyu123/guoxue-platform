import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsArray, ArrayMaxSize, MaxLength, MinLength, Length } from "class-validator";
import { CreationAssistService } from "./creation-assist.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { ThrottleGuard } from "../../common/throttle.guard";
import { CurrentUserId } from "../../common/current-user.decorator";

export class ClassicQuotesDto {
  @ApiProperty({ description: "创作文段（≤2000字）", example: "君子当自强不息，以厚德载物立身处世" })
  @IsString()
  @MinLength(4)
  @MaxLength(2000)
  text: string;
}

export class PaipanCardDto {
  @ApiPropertyOptional({ description: "本人排盘记录ID（与四柱干支二选一·强校验归属本人）" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  paipanRecordId?: string;

  @ApiPropertyOptional({ description: "年柱干支（2字）", example: "甲子" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  nian?: string;

  @ApiPropertyOptional({ description: "月柱干支（2字）", example: "丙寅" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  yue?: string;

  @ApiPropertyOptional({ description: "日柱干支（2字）", example: "戊午" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  ri?: string;

  @ApiPropertyOptional({ description: "时柱干支（2字）", example: "壬戌" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  shi?: string;
}

export class SimilarCasesDto {
  @ApiProperty({ description: "当前帖主题/文段（≤1000字）", example: "戊土日主身弱，如何看事业方向" })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  text: string;

  @ApiPropertyOptional({ description: "盘型/主题标签（≤5个·每个≤20字）", example: ["戊土", "事业"] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  tags?: string[];
}

/**
 * 创-P2 AI 实时创作三能力（编辑器「创作助手」抽屉后端·JWT+限流）
 * 1. 古籍引用推荐（关键词检索+AI复排·embedding 密钥后无缝替换检索层）
 * 2. 命盘卡渲染（结构化盘面 JSON·记录路径归属校验 R3）
 * 3. 相似案例检索（本人历史帖+公开已发布帖·严禁触达私有数据 R3）
 */
@ApiTags("AI创作助手")
@Controller("ai/creation")
export class CreationAssistController {
  constructor(private readonly assist: CreationAssistService) {}

  @Post("classic-quotes")
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiOperation({ summary: "古籍引用推荐：文段→检索46万章古籍→AI相关性复排→引用卡（片段+书·篇出处）" })
  @ApiResponse({ status: 201, description: "成功（无相关引用时 items 为空数组）" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  classicQuotes(@CurrentUserId() userId: string, @Body() dto: ClassicQuotesDto) {
    return this.assist.classicQuotes(userId, dto.text);
  }

  @Post("paipan-card")
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiOperation({ summary: "命盘卡渲染：四柱干支或本人排盘记录→结构化盘面JSON（四柱/五行/十神·不含姓名生辰）" })
  @ApiResponse({ status: 201, description: "成功" })
  @ApiResponse({ status: 400, description: "干支不合法/盘型不支持" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "排盘记录不存在（含他人记录·R3）" })
  @ApiBearerAuth()
  paipanCard(@CurrentUserId() userId: string, @Body() dto: PaipanCardDto) {
    return this.assist.paipanCard(userId, dto);
  }

  @Post("similar-cases")
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiOperation({ summary: "相似案例检索：本人历史帖+全站公开已发布帖·质量分×关键词命中排序（R3隔离）" })
  @ApiResponse({ status: 201, description: "成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  similarCases(@CurrentUserId() userId: string, @Body() dto: SimilarCasesDto) {
    return this.assist.similarCases(userId, dto.text, dto.tags);
  }
}
