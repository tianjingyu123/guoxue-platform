import {
  Controller, Get, Put, Delete, Post,
  Param, Body, Query, UseGuards, Req, Res,
  UploadedFile, UseInterceptors, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { SystemService } from "./system.service";
import { ExportService } from "./export.service";
import { Response, Request } from "express";
import * as fs from "fs";
import { SetConfigDto, ExportUsersDto, ExportOrdersDto, ExportContentsDto, ExportAuditLogsDto, ExportEarningsDto, UpsertPageContentDto, CreateSiteNoticeDto, UpdateSiteNoticeDto, RollbackConfigDto, UpsertMemberConfigDto, ExportExcelDto } from "./system.dto";

@ApiTags("系统配置")
@Controller("system")
export class SystemController {
  constructor(
    private readonly systemService: SystemService,
    private readonly exportService: ExportService,
  ) {}

  @Get("configs")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取所有系统配置" })
  @ApiBearerAuth()
  async listConfigs() {
    const configs = await this.systemService.getAllConfigs();
    return { configs };
  }

  @Get("configs/:key")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取单个系统配置" })
  @ApiBearerAuth()
  async getConfig(@Param("key") key: string) {
    return this.systemService.getConfig(key);
  }

  @Put("configs/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新系统配置" })
  @ApiBearerAuth()
  async setConfig(
    @Param("key") key: string,
    @Body() body: SetConfigDto,
    @Req() req: Request,
  ) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    const updatedBy = u?.nickname || u?.id;
    return this.systemService.setConfig(key, body.value, body.description, updatedBy);
  }

  @Delete("configs/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除系统配置" })
  @ApiBearerAuth()
  async deleteConfig(@Param("key") key: string) {
    await this.systemService.deleteConfig(key);
    return { ok: true };
  }

  // ── 健康检查 ──

  @Get("health")
  @ApiOperation({ summary: "系统健康检查" })
  async healthCheck() {
    return this.systemService.healthCheck();
  }

  // ── 维护模式 ──

  @Get("maintenance")
  @ApiOperation({ summary: "查询维护模式状态" })
  async getMaintenanceMode() {
    const enabled = await this.systemService.isMaintenanceMode();
    return { maintenanceMode: enabled };
  }

  @Put("maintenance")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "切换维护模式" })
  @ApiBearerAuth()
  async toggleMaintenance(@Body() body: { enabled: boolean }) {
    return this.systemService.toggleMaintenance(body.enabled);
  }

  /** 公开接口：获取首页 Banner */
  @Get("public/banners")
  @ApiOperation({ summary: "获取首页Banner（公开）" })
  async getPublicBanners() {
    const config = await this.systemService.getConfig("home_banners");
    if (!config) return { banners: [] };
    try {
      return { banners: JSON.parse(config.configValue) };
    } catch {
      return { banners: [] };
    }
  }

  /** 公开接口：获取首页布局配置 */
  @Get("public/home-config")
  @ApiOperation({ summary: "获取首页布局配置（公开）" })
  async getHomeConfig() {
    const keys = ["home:layout", "home:paipan_slot", "home:featured_tags"];
    const results = await Promise.all(keys.map((k) => this.systemService.getConfig(k)));

    const getValue = (config: { configValue: string } | null, defaultValue: string) => {
      if (!config) return defaultValue;
      try { return JSON.parse(config.configValue); } catch { return config.configValue; }
    };

    return {
      layout: getValue(results[0], "default"),
      paipanSlot: Number(getValue(results[1], "6")), // 默认第6位
      featuredTags: getValue(results[2], "[]"),
    };
  }

  // ── 审计日志 ──

  @Get("audit-logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查询审计日志" })
  @ApiBearerAuth()
  async getAuditLogs(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
    @Query("action") action?: string,
    @Query("userId") userId?: string,
    @Query("targetType") targetType?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.systemService.getAuditLogs({
      page: Number(page),
      pageSize: Number(pageSize),
      action,
      userId,
      targetType,
      startDate,
      endDate,
    });
  }

  @Get("audit-actions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取审计日志动作类型列表" })
  @ApiBearerAuth()
  async getAuditActions() {
    return { actions: await this.systemService.getAuditActions() };
  }

  // ───────── 数据导出 ─────────

  @Post("export/users")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出用户数据CSV" })
  @ApiBearerAuth()
  async exportUsers(@Body() filters?: ExportUsersDto, @Res() res?: Response) {
    const filePath = await this.exportService.exportUsers(filters);
    return this.sendFile(res!, filePath, "users-export.csv");
  }

  @Post("export/orders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出订单数据CSV" })
  @ApiBearerAuth()
  async exportOrders(@Body() filters?: ExportOrdersDto, @Res() res?: Response) {
    const filePath = await this.exportService.exportOrders(filters);
    return this.sendFile(res!, filePath, "orders-export.csv");
  }

  @Post("export/contents")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出内容数据CSV" })
  @ApiBearerAuth()
  async exportContents(@Body() filters?: ExportContentsDto, @Res() res?: Response) {
    const filePath = await this.exportService.exportContents(filters);
    return this.sendFile(res!, filePath, "contents-export.csv");
  }

  @Post("export/audit-logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出审计日志CSV" })
  @ApiBearerAuth()
  async exportAuditLogs(@Body() filters?: ExportAuditLogsDto, @Res() res?: Response) {
    const filePath = await this.exportService.exportAuditLogs(filters);
    return this.sendFile(res!, filePath, "audit-logs-export.csv");
  }

  @Post("export/earnings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出佣金收益CSV" })
  @ApiBearerAuth()
  async exportEarnings(@Body() filters?: ExportEarningsDto, @Res() res?: Response) {
    const filePath = await this.exportService.exportEarnings(filters);
    return this.sendFile(res!, filePath, "earnings-export.csv");
  }

  @Post("export/excel")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出Excel文件（支持 users/orders 类型）" })
  @ApiBearerAuth()
  async exportExcel(@Body() dto: ExportExcelDto, @Res() res: Response) {
    const buffer = await this.exportService.exportToExcel(dto.type, dto.filters);
    const filename = `${dto.type}-${Date.now()}.xls`;
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  }

  @Post("import/products")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量导入商品（CSV/TSV 格式）" })
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === "text/csv" || file.originalname?.endsWith(".csv") || file.originalname?.endsWith(".tsv") || file.originalname?.endsWith(".xls") || file.originalname?.endsWith(".xlsx")) {
        cb(null, true);
      } else {
        cb(new BadRequestException("仅支持 CSV/TSV/Excel 文件"), false);
      }
    },
  }))
  async importProducts(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("请上传文件");
    return this.exportService.importProducts(file.buffer);
  }

  // ───────── 页面文案配置 ─────────

  @Get("page-content")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取页面文案配置" })
  @ApiBearerAuth()
  @ApiQuery({ name: "pageRoute", required: true })
  async getPageContent(@Query("pageRoute") pageRoute: string) {
    return this.systemService.getPageContent(pageRoute);
  }

  @Post("page-content")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建或更新页面文案" })
  @ApiBearerAuth()
  async upsertPageContent(@Body() dto: UpsertPageContentDto) {
    return this.systemService.upsertPageContent(dto.pageRoute, dto.fieldKey, dto.content);
  }

  // ───────── 全站弹窗公告 ─────────

  @Post("site-notices")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建全站公告" })
  @ApiBearerAuth()
  async createSiteNotice(@Body() dto: CreateSiteNoticeDto) {
    return this.systemService.createSiteNotice(dto);
  }

  @Get("site-notices")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取全站公告列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  async getSiteNotices(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.systemService.getSiteNotices(Number(page), Number(pageSize));
  }

  @Put("site-notices/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新全站公告" })
  @ApiBearerAuth()
  async updateSiteNotice(
    @Param("id") id: string,
    @Body() dto: UpdateSiteNoticeDto,
  ) {
    return this.systemService.updateSiteNotice(id, dto);
  }

  @Delete("site-notices/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除全站公告" })
  @ApiBearerAuth()
  async deleteSiteNotice(@Param("id") id: string) {
    return this.systemService.deleteSiteNotice(id);
  }

  // ───────── 配置版本管理 ─────────

  @Get("config-versions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "查询配置历史版本" })
  @ApiBearerAuth()
  @ApiQuery({ name: "configKey", required: true })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  async getConfigVersions(
    @Query("configKey") configKey: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.systemService.getConfigVersions(configKey, Number(page), Number(pageSize));
  }

  @Post("config-versions/rollback")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "回滚配置到指定版本" })
  @ApiBearerAuth()
  async rollbackConfig(@Body() dto: RollbackConfigDto) {
    return this.systemService.rollbackConfig(dto.configKey, dto.version);
  }

  @Get("config-diff")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "获取两个配置版本的差异" })
  @ApiBearerAuth()
  @ApiQuery({ name: "configKey", required: true })
  @ApiQuery({ name: "v1", required: true })
  @ApiQuery({ name: "v2", required: true })
  async getConfigDiff(
    @Query("configKey") configKey: string,
    @Query("v1") v1: string,
    @Query("v2") v2: string,
  ) {
    return this.systemService.getConfigDiff(configKey, Number(v1), Number(v2));
  }

  // ───────── 会员配置 ─────────

  @Get("member-configs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取所有会员等级配置" })
  @ApiBearerAuth()
  async getMemberConfigs() {
    return this.systemService.getMemberConfigs();
  }

  @Post("member-configs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "创建或更新会员等级配置" })
  @ApiBearerAuth()
  async upsertMemberConfig(@Body() dto: UpsertMemberConfigDto) {
    return this.systemService.upsertMemberConfig(dto);
  }

  /** 发送文件到客户端 */
  private sendFile(res: Response, filePath: string, filename: string) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    // 发送完成后清理
    stream.on("end", () => {
      try { fs.unlinkSync(filePath); } catch {}
    });
    return res;
  }
}
