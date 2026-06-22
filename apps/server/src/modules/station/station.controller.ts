import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { StationService } from "./station.service";
import { CreateStationDto, UpdateStationDto, CreateOperatorDto, SetStationTemplateDto, UpdateOperatorBrandDto, ApplyStationDto } from "./station.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

@ApiTags("分站系统")
@ApiBearerAuth()
@Controller("station")
export class StationController {
  constructor(private svc: StationService) {}

  // ───────── 自服务（站长管理自己的分站） ─────────

  @Post("apply")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "用户自助申请开通分站" })
  @ApiResponse({ status: 201, description: "申请成功，等待审核" })
  @ApiResponse({ status: 400, description: "参数校验失败或已开通分站" })
  @ApiResponse({ status: 401, description: "未登录" })
  applyStation(@Req() req: Request, @Body() dto: ApplyStationDto) {
    return this.svc.applyStation(req.user.id, dto);
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取当前用户的分站信息（含月度统计）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  async getMyStation(@Req() req: Request) {
    const station = await this.svc.getStationByUserId(req.user.id);
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "你还没有开通分站");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [lockedUsers, monthOrders, monthEarning] = await Promise.all([
      this.svc.countLockedUsers(station.id),
      this.svc.countMonthOrders(station.id, monthStart),
      this.svc.sumMonthEarnings(station.id, monthStart),
    ]);

    return { ...station, lockedUsers, monthOrders, monthEarning };
  }

  @Put("my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新自己的分站信息（自服务）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  async updateMyStation(@Req() req: Request, @Body() dto: UpdateStationDto) {
    const station = await this.svc.getStationByUserId(req.user.id);
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "你还没有开通分站");
    return this.svc.updateStation(station.id, dto);
  }

  @Get("my/earnings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的分站收益明细（自服务）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  async getMyEarnings(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    const station = await this.svc.getStationByUserId(req.user.id);
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "你还没有开通分站");
    return this.svc.getStationEarnings(station.id, +page, +pageSize);
  }

  // ───────── 品牌配置（公开 + 管理员） ─────────

  /** 通过推广码获取分站品牌配置（公开，千人千面渲染入口） */
  @Get("brand/:code")
  @ApiOperation({ summary: "通过推广码获取分站品牌配置" })
  @ApiResponse({ status: 200, description: "成功" })
  getBrandByCode(@Param("code") code: string) {
    return this.svc.getBrandByCode(code);
  }

  /** 通过ID获取分站品牌配置 */
  @Get(":id/brand")
  @ApiOperation({ summary: "通过ID获取分站品牌配置" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getBrand(@Param("id") id: string) {
    return this.svc.getBrand(id);
  }

  // ───────── 分站 CRUD ─────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建分站" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  createStation(@Req() req: Request, @Body() dto: CreateStationDto) {
    return this.svc.createStation(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "分站列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listStations(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listStations(+page, +pageSize);
  }

  // ───────── 分站发现 ─────────

  @Get("discover")
  @ApiOperation({ summary: "分站发现（用户端公开搜索）" })
  @ApiResponse({ status: 200, description: "成功" })
  discoverStations(
    @Query("keyword") keyword?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.discoverStations({ keyword, page: +page, pageSize: +pageSize });
  }

  @Get(":id")
  @ApiOperation({ summary: "分站详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getStation(@Param("id") id: string) {
    return this.svc.getStation(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新分站（含品牌配置）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  updateStation(@Param("id") id: string, @Body() dto: UpdateStationDto) {
    return this.svc.updateStation(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除分站" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  deleteStation(@Param("id") id: string) {
    return this.svc.deleteStation(id);
  }

  @Get(":id/earnings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "分站收益明细" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  async getEarnings(@Req() req: Request, @Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    await this.checkStationOwnership(id, req);
    return this.svc.getStationEarnings(id, +page, +pageSize);
  }

  // ───────── 运营商 ─────────

  @Post("operator")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建运营商" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  createOperator(@Req() req: Request, @Body() dto: CreateOperatorDto) {
    return this.svc.createOperator(req.user.id, dto);
  }

  @Get("operator/list")
  @ApiOperation({ summary: "运营商列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listOperators(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listOperators(+page, +pageSize);
  }

  // ───────── 收益看板 ─────────

  @Get(":id/revenue-dashboard")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "分站收益看板" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  async getRevenueDashboard(@Req() req: Request, @Param("id") id: string) {
    await this.checkStationOwnership(id, req);
    return this.svc.getRevenueDashboard(id);
  }

  // ───────── 多小程序 ─────────

  /** 获取分站小程序配置 */
  @Get(":id/mini-config")
  @ApiOperation({ summary: "获取分站小程序配置（含跨跳转信息）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getMiniConfig(@Param("id") id: string) {
    return this.svc.getMiniConfig(id);
  }

  /** 解析跨小程序跳转目标 */
  @Get(":id/jump-to/:targetPath")
  @ApiOperation({ summary: "解析跨小程序跳转目标" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  resolveJumpTarget(@Param("id") id: string, @Param("targetPath") targetPath: string) {
    return this.svc.resolveJumpTarget(id, targetPath);
  }

  // ───────── 模版系统 ─────────

  @Get("templates/list")
  @ApiOperation({ summary: "获取可用模版列表" })
  @ApiResponse({ status: 200, description: "成功" })
  getTemplateOptions() {
    return this.svc.getTemplateOptions();
  }

  @Get("templates/:templateId")
  @ApiOperation({ summary: "获取模版完整配置" })
  @ApiResponse({ status: 200, description: "成功" })
  getTemplateConfig(@Param("templateId") templateId: string) {
    return this.svc.getTemplateConfig(templateId);
  }

  @Put(":id/template")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "设置分站模版" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  setStationTemplate(@Param("id") id: string, @Body() dto: SetStationTemplateDto) {
    return this.svc.setStationTemplate(id, dto);
  }

  @Get("brand/:code/template")
  @ApiOperation({ summary: "通过推广码获取分站品牌+模版配置" })
  @ApiResponse({ status: 200, description: "成功" })
  getBrandWithTemplate(@Param("code") code: string) {
    return this.svc.getBrandWithTemplate(code);
  }

  // ───────── 运营商品牌与小程序 ─────────

  @Put("operator/:id/brand")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新运营商品牌配置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  updateOperatorBrand(@Param("id") id: string, @Body() dto: UpdateOperatorBrandDto) {
    return this.svc.updateOperatorBrand(id, dto);
  }

  @Get("operator/:id/mini-config")
  @ApiOperation({ summary: "获取运营商小程序配置" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getOperatorMiniConfig(@Param("id") id: string) {
    return this.svc.getOperatorMiniConfig(id);
  }

  @Get("operator/brand/:code")
  @ApiOperation({ summary: "通过推广码获取运营商品牌配置" })
  @ApiResponse({ status: 200, description: "成功" })
  getOperatorBrandByCode(@Param("code") code: string) {
    return this.svc.getOperatorBrandByCode(code);
  }

  // ───────── 团队管理 ─────────

  @Get("team/members")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "下线站长列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  getTeamMembers(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getTeamMembers(req.user.id, +page, +pageSize);
  }

  @Get("team/leaderboard")
  @ApiOperation({ summary: "团队排行榜" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  @ApiQuery({ name: "sortBy", required: false, description: "排序字段：revenue/memberCount/orderCount" })
  getTeamLeaderboard(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("sortBy") sortBy?: string) {
    return this.svc.getTeamLeaderboard(+page, +pageSize, sortBy);
  }

  @Get("team/activity")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "团队活跃监控" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getTeamActivity(@Req() req: Request) {
    return this.svc.getTeamActivity(req.user.id);
  }

  @Get("team/success-cases")
  @ApiOperation({ summary: "成功案例库" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  getSuccessCases(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getSuccessCases(+page, +pageSize);
  }

  /** 校验当前用户是否为分站所有者或管理员 */
  private async checkStationOwnership(stationId: string, req: Request) {
    const roles: string[] = req.user?.roles ?? [];
    if (roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN")) return;
    const station = await this.svc.getStation(stationId);
    if (station.userId !== req.user?.id) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该分站数据");
    }
  }
}
