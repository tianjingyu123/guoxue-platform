import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, NotFoundException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { ThrottleGuard } from "../../common/throttle.guard";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { MiniService } from "./mini.service";
import { MiniHomeQueryDto, MiniContentQueryDto, MiniShareQueryDto, CreateMiniAppDto } from "./mini.dto";

@ApiTags("小程序")
@Controller("mini")
@UseGuards(ThrottleGuard)
export class MiniController {
  constructor(private mini: MiniService) {}

  @Get("home")
  @ApiOperation({ summary: "小程序首页聚合", description: "返回轮播图、热门内容、最新文章、活跃圈子等首页数据" })
  @ApiResponse({ status: 200, description: "成功" })
  getHome(@Query() query: MiniHomeQueryDto) {
    return this.mini.getHome(query);
  }

  @Get("contents")
  @ApiOperation({ summary: "小程序内容流", description: "精简版内容列表，支持分页和类型筛选" })
  @ApiResponse({ status: 200, description: "成功" })
  getContents(@Query() query: MiniContentQueryDto) {
    return this.mini.getContents(query);
  }

  @Get("content/:id")
  @ApiOperation({ summary: "小程序内容详情", description: "精简版内容详情，含缓存" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  async getContentDetail(@Param("id") id: string) {
    const result = await this.mini.getContentDetail(id);
    if (!result) throw new NotFoundException("内容不存在");
    return result;
  }

  @Get("share-config")
  @ApiOperation({ summary: "小程序分享配置", description: "获取微信分享卡片所需的标题、图片、路径" })
  @ApiResponse({ status: 200, description: "成功" })
  getShareConfig(@Query() query: MiniShareQueryDto) {
    return this.mini.getShareConfig(query);
  }

  // ───────── 多域名/多小程序配置 ─────────

  @Get("config/domain")
  @ApiOperation({ summary: "获取可用域名列表（含备用域名）" })
  @ApiResponse({ status: 200, description: "成功" })
  getDomainConfigs() {
    return this.mini.getDomainConfigs();
  }

  @Get("config/appid")
  @ApiOperation({ summary: "获取可用小程序AppId列表" })
  @ApiResponse({ status: 200, description: "成功" })
  getAppIdConfigs() {
    return this.mini.getAppIdConfigs();
  }

  // ───────── 管理接口（需认证） ─────────

  @Get("admin/apps")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "小程序配置列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  listMiniApps() {
    return this.mini.listMiniAppConfigs();
  }

  @Post("admin/apps")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建小程序配置" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  createMiniApp(@Body() body: CreateMiniAppDto) {
    return this.mini.createMiniAppConfig(body);
  }

  @Put("admin/apps/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新小程序配置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  updateMiniApp(@Param("id") id: string, @Body() body: CreateMiniAppDto) {
    return this.mini.updateMiniAppConfig(id, body);
  }

  @Delete("admin/apps/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除小程序配置" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  deleteMiniApp(@Param("id") id: string) {
    return this.mini.deleteMiniAppConfig(id);
  }
}
