import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards, Logger,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { ContentService } from "./content.service";
import { SystemService } from "../system/system.service";
import { CreateContentDto, UpdateContentDto, ContentListQueryDto, BatchUpdateStatusDto } from "./content.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("内容管理")
@Controller("contents")
export class ContentController {
  private readonly logger = new Logger(ContentController.name);
  constructor(
    private content: ContentService,
    private systemService: SystemService,
  ) {}

  @Post()
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "创建内容", targetType: "CONTENT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建内容" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async create(@Body() dto: CreateContentDto, @Req() req: Request) {
    const result = await this.content.create(dto);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "CREATE",
      targetType: "CONTENT",
      targetId: result.id,
      detail: `创建内容: ${dto.title}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  @Get()
  @ApiOperation({ summary: "获取内容列表" })
  @ApiResponse({ status: 200, description: "成功" })
  list(@Query() q: ContentListQueryDto) {
    return this.content.list(q);
  }

  // ───────── 诗词专属 ─────────

  @Get("poem/random")
  @ApiOperation({ summary: "随机获取一首诗词" })
  @ApiResponse({ status: 200, description: "成功" })
  getRandomPoem() {
    return this.content.getRandomPoem();
  }

  @Get("poem/daily")
  @ApiOperation({ summary: "每日推荐诗词" })
  @ApiResponse({ status: 200, description: "成功" })
  getDailyPoem() {
    return this.content.getDailyPoem();
  }

  @Get("poem/:id/appreciation")
  @ApiOperation({ summary: "获取诗词注释/赏析" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getPoemAppreciation(@Param("id") id: string) {
    return this.content.getPoemAppreciation(id);
  }

  @Get("featured")
  @ApiOperation({ summary: "精选内容（按浏览量排序）" })
  @ApiResponse({ status: 200, description: "成功" })
  getFeatured(@Query("type") type?: string) {
    return this.content.getFeatured(type);
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard, StationIsolationGuard)
  @ApiOperation({ summary: "获取内容详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  detail(@Param("id") id: string) {
    return this.content.detail(id);
  }

  @Put(":id/audit")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "内容审核", targetType: "CONTENT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 权限修复(角色断裂)：内容审核员只有审核权（改 status+理由），没有全量编辑权，故独立于 PUT /:id。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "审核内容（通过/驳回）" })
  @ApiResponse({ status: 200, description: "审核成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async audit(
    @Param("id") id: string,
    @Body("status") status: string,
    @Body("reason") reason: string | undefined,
    @Req() req: Request,
  ) {
    if (status !== "APPROVED" && status !== "REJECTED") {
      throw new BadRequestException("status 仅允许 APPROVED 或 REJECTED");
    }
    const result = await this.content.audit(id, status as "APPROVED" | "REJECTED", reason);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "AUDIT",
      targetType: "CONTENT",
      targetId: id,
      detail: `审核内容: ${status === "APPROVED" ? "通过" : "驳回"}${reason ? `，理由: ${reason}` : ""}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  @Put(":id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "内容审核/编辑", targetType: "CONTENT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新内容" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async update(@Param("id") id: string, @Body() dto: UpdateContentDto, @Req() req: Request) {
    const result = await this.content.update(id, dto);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "UPDATE",
      targetType: "CONTENT",
      targetId: id,
      detail: `更新内容: ${dto.title || id}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  @Delete(":id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE)
  @Auditable({ action: "删除内容", targetType: "CONTENT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除内容（管理员）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async remove(@Param("id") id: string, @Req() req: Request) {
    const result = await this.content.remove(id);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "DELETE",
      targetType: "CONTENT",
      targetId: id,
      detail: `删除内容: ${id}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  // ───────── 批量操作 & 统计 ─────────

  @Put("batch/status")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "内容批量审核", targetType: "CONTENT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量更新内容状态" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async batchUpdateStatus(@Body() dto: BatchUpdateStatusDto, @Req() req: Request) {
    const result = await this.content.batchUpdateStatus(dto.ids, dto.status);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "UPDATE",
      targetType: "CONTENT",
      detail: `批量更新 ${dto.ids.length} 条内容状态为 ${dto.status}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  @Get("stats/overview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 权限修复(角色断裂)：内容审核工作台/内容审核页顶部统计需读该端点，放行 CONTENT_AUDITOR。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "内容统计概览" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getStats() {
    return this.content.getStats();
  }

}
