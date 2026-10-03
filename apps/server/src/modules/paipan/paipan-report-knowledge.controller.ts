import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { PaipanReportKnowledgeService } from "./paipan-report-knowledge.service";

export class KnowledgeSourceRefDto {
  @ApiProperty({ description: "来源名称，如书名、网站、栏目" })
  @IsString() @MinLength(1) @MaxLength(200)
  label: string;

  @ApiPropertyOptional({ description: "来源链接（可选）" })
  @IsOptional() @IsString() @MaxLength(500)
  url?: string;

  @ApiPropertyOptional({ description: "备注，如版本、查阅日期、交叉验证说明" })
  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

export class ReportKnowledgeDto {
  @ApiProperty({
    enum: ["school_theory", "classic_excerpt", "knowledge_point"],
    description: "门派理论 / 公版古籍原文 / 知识要点（自行重述，来源可追溯）",
  })
  @IsIn(["school_theory", "classic_excerpt", "knowledge_point"])
  kind: "school_theory" | "classic_excerpt" | "knowledge_point";

  @ApiPropertyOptional({
    enum: ["classic_public", "modern_work", "web", "oral", "platform_expert"],
    description: "来源类别；只有 classic_public（公版古籍白文）可作为原文展示，其余须重述为知识要点",
  })
  @IsOptional() @IsIn(["classic_public", "modern_work", "web", "oral", "platform_expert"])
  sourceKind?: "classic_public" | "modern_work" | "web" | "oral" | "platform_expert";

  @ApiPropertyOptional({ description: "是否为自行重述（非逐字摘录）；非古籍原文条目必须为 true" })
  @IsOptional() @IsBoolean()
  restated?: boolean;

  @ApiPropertyOptional({ description: "来源线索，供审核追溯与交叉验证", type: [KnowledgeSourceRefDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => KnowledgeSourceRefDto)
  sourceRefs?: KnowledgeSourceRefDto[];

  @ApiPropertyOptional({ description: "门派 id；为空表示各派通用" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  school?: string | null;

  @ApiProperty({ description: "主题，如 格局/用神/十神/日主/月令/神煞/大运流年" })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  topic: string;

  @ApiProperty({ description: "匹配标签，如 偏财格、庚、寅月、用神土、天乙贵人", type: [String] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  tags: string[];

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @ApiProperty({ description: "知识要点（自行重述）或与底本一致的公版古籍原文" })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  bookTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  chapterTitle?: string | null;

  @ApiPropertyOptional({ description: "关联古籍库书籍 id（读原书）" })
  @IsOptional()
  @IsString()
  classicBookId?: string | null;

  @ApiPropertyOptional({ description: "关联古籍库章节 id（读原书）" })
  @IsOptional()
  @IsString()
  classicChapterId?: string | null;
}

export class ReportKnowledgeQueryDto {
  @IsOptional() @IsIn(["DRAFT", "APPROVED", "RETIRED"]) status?: string;
  @IsOptional() @IsString() school?: string;
  @IsOptional() @IsString() topic?: string;
  @IsOptional() @IsIn(["school_theory", "classic_excerpt", "knowledge_point"]) kind?: string;
  @IsOptional() @IsString() @MaxLength(50) keyword?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

export class ReviewNoteDto {
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class PreviewMatchDto {
  @IsOptional() @IsString() school?: string;
  @IsOptional() @IsString() geJu?: string;
  @IsOptional() @IsString() yongShen?: string;
  @IsOptional() @IsString() dayGan?: string;
  @IsOptional() @IsString() monthZhi?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) shenShaNames?: string[];
}

/** 排盘报告知识库后台（小卜 AI）：录入 → 审核通过 → 停用；修改已审核条目会退回草稿并升版本 */
@ApiTags("小卜·排盘报告知识库（后台）")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@Controller("admin/paipan-report-knowledge")
export class PaipanReportKnowledgeController {
  constructor(private readonly svc: PaipanReportKnowledgeService) {}

  @Get()
  @ApiOperation({ summary: "知识条目列表" })
  list(@Query() query: ReportKnowledgeQueryDto) {
    return this.svc.list(query);
  }

  @Post("preview-match")
  @ApiOperation({ summary: "试匹配：输入盘面信号查看会命中的已审核条目" })
  previewMatch(@Body() dto: PreviewMatchDto) {
    return this.svc.previewMatch(dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "知识条目详情" })
  get(@Param("id") id: string) {
    return this.svc.get(id);
  }

  @Post()
  @ApiOperation({ summary: "新建知识条目（草稿）" })
  @ApiResponse({ status: 201, description: "已创建草稿" })
  create(@Body() dto: ReportKnowledgeDto, @Req() req: Request) {
    return this.svc.create(dto, req.user.id);
  }

  @Put(":id")
  @ApiOperation({ summary: "修改知识条目（已审核条目修改后退回草稿并升版本）" })
  update(@Param("id") id: string, @Body() dto: ReportKnowledgeDto, @Req() req: Request) {
    return this.svc.update(id, dto, req.user.id);
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "审核通过，可被报告引用" })
  approve(@Param("id") id: string, @Body() dto: ReviewNoteDto, @Req() req: Request) {
    return this.svc.approve(id, req.user.id, dto.note);
  }

  @Post(":id/retire")
  @ApiOperation({ summary: "停用，不再被新报告引用" })
  retire(@Param("id") id: string, @Body() dto: ReviewNoteDto, @Req() req: Request) {
    return this.svc.retire(id, req.user.id, dto.note);
  }
}
