import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { ClassicTranslationReviewService } from "./classic-translation-review.service";

export class TranslationEditDto {
  @ApiProperty({ description: "改后的白话译文" })
  @IsString() @MinLength(1) @MaxLength(6000)
  translation: string;

  @ApiPropertyOptional({ description: "改后的词语注释", type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(500, { each: true })
  notes?: string[];
}

export class ApproveTranslationDto {
  @ApiProperty({ description: "复核时看到的译文版本（列表返回的 resultHash）" })
  @IsString() @MinLength(1) @MaxLength(64)
  resultHash: string;

  @ApiPropertyOptional({ description: "带上即同时改译", type: TranslationEditDto })
  @IsOptional() @ValidateNested() @Type(() => TranslationEditDto)
  edit?: TranslationEditDto;
}

export class RejectTranslationDto {
  @ApiProperty({ description: "复核时看到的译文版本（列表返回的 resultHash）" })
  @IsString() @MinLength(1) @MaxLength(64)
  resultHash: string;

  @ApiProperty({ description: "驳回原因" })
  @IsString() @MinLength(1) @MaxLength(300)
  note: string;
}

@ApiTags("经典·白话译文复核（后台）")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@Controller("admin/classic-translations")
export class AdminClassicTranslationController {
  constructor(private readonly svc: ClassicTranslationReviewService) {}

  @Get()
  @ApiOperation({ summary: "按复核状态列出白话译文（默认待复核）" })
  @ApiQuery({ name: "review", required: false, enum: ["pending", "approved", "rejected"] })
  @ApiQuery({ name: "sourceType", required: false, description: "classic_segment 段落译文 / classic_translation 自由文本译文" })
  @ApiQuery({ name: "keyword", required: false, description: "在译文结果中搜索" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  list(
    @Query("review") review?: string,
    @Query("sourceType") sourceType?: string,
    @Query("keyword") keyword?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.svc.list({ review, sourceType, keyword, page, pageSize });
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "复核通过（可同时改译）" })
  approve(@Param("id") id: string, @Body() dto: ApproveTranslationDto, @Req() req: Request) {
    return this.svc.approve(id, req.user.id, dto);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "驳回：不再展示给读者，读者下次请求时重新生成" })
  reject(@Param("id") id: string, @Body() dto: RejectTranslationDto, @Req() req: Request) {
    return this.svc.reject(id, req.user.id, dto);
  }
}
