import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { StationService } from "./station.service";
import { CreateStationDto, UpdateStationDto, CreateOperatorDto, SetStationTemplateDto } from "./station.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("分站系统")
@ApiBearerAuth()
@Controller("station")
export class StationController {
  constructor(private svc: StationService) {}

  // ───────── 品牌配置（公开 + 管理员） ─────────

  /** 通过推广码获取分站品牌配置（公开，千人千面渲染入口） */
  @Get("brand/:code")
  @ApiOperation({ summary: "通过推广码获取分站品牌配置" })
  getBrandByCode(@Param("code") code: string) {
    return this.svc.getBrandByCode(code);
  }

  /** 通过ID获取分站品牌配置 */
  @Get(":id/brand")
  @ApiOperation({ summary: "通过ID获取分站品牌配置" })
  getBrand(@Param("id") id: string) {
    return this.svc.getBrand(id);
  }

  // ───────── 分站 CRUD ─────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建分站" })
  createStation(@Req() req: Request, @Body() dto: CreateStationDto) {
    return this.svc.createStation(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "分站列表" })
  listStations(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listStations(+page, +pageSize);
  }

  @Get(":id")
  @ApiOperation({ summary: "分站详情" })
  getStation(@Param("id") id: string) {
    return this.svc.getStation(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新分站（含品牌配置）" })
  updateStation(@Param("id") id: string, @Body() dto: UpdateStationDto) {
    return this.svc.updateStation(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除分站" })
  deleteStation(@Param("id") id: string) {
    return this.svc.deleteStation(id);
  }

  @Get(":id/earnings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "分站收益明细" })
  getEarnings(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getStationEarnings(id, +page, +pageSize);
  }

  // ───────── 运营商 ─────────

  @Post("operator")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建运营商" })
  createOperator(@Req() req: Request, @Body() dto: CreateOperatorDto) {
    return this.svc.createOperator(req.user.id, dto);
  }

  @Get("operator/list")
  @ApiOperation({ summary: "运营商列表" })
  listOperators(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listOperators(+page, +pageSize);
  }

  // ───────── 分站发现 ─────────

  @Get("discover")
  @ApiOperation({ summary: "分站发现（用户端公开搜索）" })
  discoverStations(
    @Query("keyword") keyword?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.discoverStations({ keyword, page: +page, pageSize: +pageSize });
  }

  // ───────── 收益看板 ─────────

  @Get(":id/revenue-dashboard")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "分站收益看板" })
  getRevenueDashboard(@Param("id") id: string) {
    return this.svc.getRevenueDashboard(id);
  }

  // ───────── 多小程序 ─────────

  /** 获取分站小程序配置 */
  @Get(":id/mini-config")
  @ApiOperation({ summary: "获取分站小程序配置（含跨跳转信息）" })
  getMiniConfig(@Param("id") id: string) {
    return this.svc.getMiniConfig(id);
  }

  /** 解析跨小程序跳转目标 */
  @Get(":id/jump-to/:targetPath")
  @ApiOperation({ summary: "解析跨小程序跳转目标" })
  resolveJumpTarget(@Param("id") id: string, @Param("targetPath") targetPath: string) {
    return this.svc.resolveJumpTarget(id, targetPath);
  }

  // ───────── 模版系统 ─────────

  @Get("templates/list")
  @ApiOperation({ summary: "获取可用模版列表" })
  getTemplateOptions() {
    return this.svc.getTemplateOptions();
  }

  @Get("templates/:templateId")
  @ApiOperation({ summary: "获取模版完整配置" })
  getTemplateConfig(@Param("templateId") templateId: string) {
    return this.svc.getTemplateConfig(templateId);
  }

  @Put(":id/template")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "设置分站模版" })
  setStationTemplate(@Param("id") id: string, @Body() dto: SetStationTemplateDto) {
    return this.svc.setStationTemplate(id, dto);
  }

  @Get("brand/:code/template")
  @ApiOperation({ summary: "通过推广码获取分站品牌+模版配置" })
  getBrandWithTemplate(@Param("code") code: string) {
    return this.svc.getBrandWithTemplate(code);
  }

  // ───────── 运营商品牌与小程序 ─────────

  @Put("operator/:id/brand")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新运营商品牌配置" })
  updateOperatorBrand(@Param("id") id: string, @Body() dto: Record<string, unknown>) {
    return this.svc.updateOperatorBrand(id, dto);
  }

  @Get("operator/:id/mini-config")
  @ApiOperation({ summary: "获取运营商小程序配置" })
  getOperatorMiniConfig(@Param("id") id: string) {
    return this.svc.getOperatorMiniConfig(id);
  }

  @Get("operator/brand/:code")
  @ApiOperation({ summary: "通过推广码获取运营商品牌配置" })
  getOperatorBrandByCode(@Param("code") code: string) {
    return this.svc.getOperatorBrandByCode(code);
  }
}
