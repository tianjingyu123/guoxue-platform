import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { MarketingService } from "../marketing/marketing.service";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { CreatePageComponentDto, UpdatePageComponentDto, SortComponentsDto, UpdateMarketingPageDto } from "../marketing/marketing.dto";
import { StationCreatePageDto } from "./station.dto";

/**
 * 分站微页面 — 站长自服务（P2 微页面下放）
 * 鉴权：仅 JwtAuthGuard；所有操作强制校验微页面 stationId === 当前用户的分站，
 * 站长只能装修自己分站的微页面，碰不到平台级（stationId=null）或他人分站的页面。
 * 底层复用 admin 同款 MarketingService，admin 端 /marketing/pages 不受影响。
 */
@ApiTags("分站微页面（站长自服务）")
@Controller("station/micro-page")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StationMicroPageController {
  constructor(
    private readonly marketing: MarketingService,
    private readonly prisma: PrismaService,
  ) {}

  /** 取当前登录用户的分站ID，无分站则拒绝 */
  private async getMyStationId(req: Request): Promise<string> {
    const station = await this.prisma.station.findFirst({ where: { userId: req.user.id }, select: { id: true } });
    if (!station) throw new ForbiddenException("你还没有开通分站");
    return station.id;
  }

  /** 校验微页面归属当前站长，返回该页（含组件） */
  private async assertOwn(pageId: string, stationId: string) {
    const page = await this.marketing.getPage(pageId);
    if (page.stationId !== stationId) throw new ForbiddenException("无权操作该微页面");
    return page;
  }

  @Get("my")
  @ApiOperation({ summary: "我的分站微页面列表" })
  @ApiResponse({ status: 200, description: "成功" })
  async listMy(@Req() req: Request) {
    const stationId = await this.getMyStationId(req);
    return this.marketing.listPages(stationId);
  }

  @Post()
  @ApiOperation({ summary: "创建分站微页面（route 后端生成，强制归属本分站）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  async create(@Req() req: Request, @Body() dto: StationCreatePageDto) {
    const stationId = await this.getMyStationId(req);
    const route = `st-${stationId.slice(0, 8)}-${Date.now().toString(36)}`;
    return this.marketing.createPage({ name: dto.name, description: dto.description, route, stationId });
  }

  @Get(":id")
  @ApiOperation({ summary: "微页面详情（含楼层组件）" })
  @ApiResponse({ status: 200, description: "成功" })
  async detail(@Req() req: Request, @Param("id") id: string) {
    const stationId = await this.getMyStationId(req);
    return this.assertOwn(id, stationId);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新微页面基本信息（站长不可改 route）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  async update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateMarketingPageDto) {
    const stationId = await this.getMyStationId(req);
    await this.assertOwn(id, stationId);
    const { route: _ignored, ...safe } = dto; // route 是唯一约束+归属标识，禁止站长改
    return this.marketing.updatePage(id, safe);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除微页面" })
  @ApiResponse({ status: 200, description: "删除成功" })
  async remove(@Req() req: Request, @Param("id") id: string) {
    const stationId = await this.getMyStationId(req);
    await this.assertOwn(id, stationId);
    return this.marketing.deletePage(id);
  }

  @Post(":id/components")
  @ApiOperation({ summary: "添加楼层组件" })
  @ApiResponse({ status: 201, description: "创建成功" })
  async addComponent(@Req() req: Request, @Param("id") id: string, @Body() dto: CreatePageComponentDto) {
    const stationId = await this.getMyStationId(req);
    await this.assertOwn(id, stationId);
    return this.marketing.addPageComponent(id, dto);
  }

  // ⚠️ sort 路由必须声明在 :compId 之前，否则 "sort" 会被当作 compId 捕获
  @Put(":id/components/sort")
  @ApiOperation({ summary: "楼层排序" })
  @ApiResponse({ status: 200, description: "更新成功" })
  async sortComponents(@Req() req: Request, @Param("id") id: string, @Body() dto: SortComponentsDto) {
    const stationId = await this.getMyStationId(req);
    await this.assertOwn(id, stationId);
    return this.marketing.sortPageComponents(id, dto);
  }

  @Put(":id/components/:compId")
  @ApiOperation({ summary: "更新楼层组件" })
  @ApiResponse({ status: 200, description: "更新成功" })
  async updateComponent(@Req() req: Request, @Param("id") id: string, @Param("compId") compId: string, @Body() dto: UpdatePageComponentDto) {
    const stationId = await this.getMyStationId(req);
    await this.assertOwn(id, stationId);
    return this.marketing.updatePageComponent(id, compId, dto);
  }

  @Delete(":id/components/:compId")
  @ApiOperation({ summary: "删除楼层组件" })
  @ApiResponse({ status: 200, description: "删除成功" })
  async deleteComponent(@Req() req: Request, @Param("id") id: string, @Param("compId") compId: string) {
    const stationId = await this.getMyStationId(req);
    await this.assertOwn(id, stationId);
    return this.marketing.deletePageComponent(id, compId);
  }

  @Post(":id/publish")
  @ApiOperation({ summary: "发布微页面（用户可见）" })
  @ApiResponse({ status: 200, description: "发布成功" })
  async publish(@Req() req: Request, @Param("id") id: string) {
    const stationId = await this.getMyStationId(req);
    await this.assertOwn(id, stationId);
    return this.marketing.publishPage(id);
  }
}
