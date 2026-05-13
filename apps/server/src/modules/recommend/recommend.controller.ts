import { Request } from "express";
import { Controller, Get, Post, Put, Delete, Param, Query, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import { RecommendService } from "./recommend.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { ThrottleGuard } from "../../common/throttle.guard";
import { StationId } from "../../common/station-id.decorator";
import { RecommendQueryDto, RecommendLogDto, RecommendScene, SaveUserInterestsDto } from "./recommend.dto";
import { ColdStartService } from "./services/cold-start.service";

// ═══════════════════════════════════════════
// 分区强插 DTO
// ═══════════════════════════════════════════

export class InsertContentDto {
  @ApiProperty({ description: "强插位置（第N位，0起始）" })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position: number;

  @ApiProperty({ description: "内容ID" })
  @IsString()
  contentId: string;

  @ApiProperty({ description: "内容类型（ARTICLE/COURSE/PRODUCT/CIRCLE/VIDEO）" })
  @IsString()
  contentType: string;
}

@ApiTags("智能推荐")
@Controller("recommend")
export class RecommendController {
  constructor(private svc: RecommendService, private coldStart: ColdStartService) {}

  // ───── 固定路由（必须在 :scene 之前，避免被参数路由拦截） ─────

  @Post("log")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "上报推荐曝光/点击" })
  log(@Body() dto: RecommendLogDto) {
    return this.svc.logInteractions(dto);
  }

  @Get("trending")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "获取热门推荐（旧版兼容）" })
  trending() {
    return this.svc.trending();
  }

  @Get("related/:contentId")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "获取相关内容（旧版兼容）" })
  related(@Param("contentId") contentId: string) {
    return this.svc.related(contentId);
  }

  @Get("personalized")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取个性化推荐（旧版兼容）" })
  @ApiBearerAuth()
  personalized(@Req() req: Request) {
    return this.svc.personalized(req.user.id);
  }

  // ───── 冷启动兴趣引导 ─────

  @Get("interests/defaults")
  @ApiOperation({ summary: "获取默认兴趣标签（新用户引导页）" })
  getDefaultInterestTags() {
    return this.coldStart.getDefaultInterestTags();
  }

  @Post("interests")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "保存用户兴趣标签（新用户引导完成）" })
  @ApiBearerAuth()
  saveUserInterests(@Req() req: Request, @Body() dto: SaveUserInterestsDto) {
    return this.coldStart.saveUserInterests(req.user.id, dto.tags);
  }

  // ───── 分区强插管理 ─────

  @Put("insert")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "设置分区强插" })
  @ApiBearerAuth()
  insertContent(@Body() dto: InsertContentDto) {
    return this.svc.insertContent(dto.position, dto.contentId, dto.contentType);
  }

  @Delete("insert/:position")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "移除分区强插" })
  @ApiBearerAuth()
  removeInsertedContent(@Param("position") position: string) {
    return this.svc.removeInsertedContent(parseInt(position, 10));
  }

  // ───── 统一场景入口（参数路由放最后） ─────
  // 注意：新增静态路由的控制器必须在本控制器之前注册，否则会被 :scene 通配拦截

  @Get(":scene")
  @ApiOperation({ summary: "全页面智能推荐" })
  async recommend(
    @Param("scene") scene: RecommendScene,
    @Query() query: RecommendQueryDto,
    @Req() req: Request,
    @StationId() stationId?: string,
  ) {
    return this.svc.getRecommendations({
      scene,
      userId: req.user?.id,
      stationId,
      contentId: query.contentId,
      paipanType: query.paipanType,
      listType: query.listType,
      orderItemIds: query.orderItemIds,
      excludeIds: query.excludeIds,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
    });
  }
}
