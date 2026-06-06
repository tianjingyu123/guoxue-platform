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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取所有系统配置，支持 keyPrefix 过滤" })
  @ApiBearerAuth()
  @ApiQuery({ name: "keyPrefix", required: false, type: String, description: "按 key 前缀过滤" })
  async listConfigs(@Query("keyPrefix") keyPrefix?: string) {
    const configs = await this.systemService.getAllConfigs();
    if (keyPrefix) {
      return { configs: configs.filter((c: any) => c.configKey?.startsWith(keyPrefix)) };
    }
    return { configs };
  }

  @Post("configs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建系统配置" })
  @ApiBearerAuth()
  async createConfig(@Body() body: { key: string; value: string; description?: string }, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    const updatedBy = u?.nickname || u?.id;
    return this.systemService.setConfig(body.key, body.value, body.description, updatedBy);
  }

  @Get("configs/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
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

  // ── 自动化开关 ──

  @Get("automation/status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查询自动化开关状态" })
  @ApiBearerAuth()
  async getAutomationStatus() {
    const enabled = await this.systemService.isAutomationEnabled();
    return { automationEnabled: enabled };
  }

  @Post("automation/toggle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "一键接管 — 开/关自动化（关闭后 Claude 权限降为只读）" })
  @ApiBearerAuth()
  async toggleAutomation(@Body() body: { enabled: boolean }, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    const operator = u?.nickname || u?.id || "ADMIN";
    return this.systemService.toggleAutomation(body.enabled, operator);
  }

  /** 公开接口：获取首页 Banner */
  @Get("public/banners")
  @ApiOperation({ summary: "获取首页Banner（公开）" })
  async getPublicBanners() {
    return this.systemService.getPublicBanners();
  }

  /** 公开接口：获取首页布局配置 */
  @Get("public/home-config")
  @ApiOperation({ summary: "获取首页布局配置（公开）" })
  async getHomeConfig() {
    return this.systemService.getHomeConfig();
  }

  /**
   * 公开接口：小程序合规配置
   *
   * 小程序启动时调用此接口，获取当前可用的功能列表。
   * 审核期间通过后台关闭排盘/算命等敏感功能，审核通过后开启。
   * H5/APP 不受此限制，永远返回全部功能。
   */
  @Get("public/miniapp-config")
  @ApiOperation({ summary: "获取小程序合规配置（公开）" })
  async getMiniappConfig() {
    return {
      /** 小程序模式下可用的排盘工具 ID 列表（为空则全部隐藏） */
      paipanTools: [] as string[],
      /** 排盘入口是否显示 */
      paipanEntry: false,
      /** 算命/运势是否显示 */
      fortuneEnabled: false,
      /** 风水是否显示 */
      fengshuiEnabled: false,
      /** 解梦是否显示 */
      jiemengEnabled: false,
      /** 合婚/起名是否显示 */
      namingEnabled: false,
      /** 当前模式: 'review'(审核中) | 'normal'(正常) */
      mode: 'review' as 'review' | 'normal',
      /** 审核期间展示的公告文案 */
      notice: '更多精彩功能，请在浏览器中打开热卜国学 H5 版本体验',
      /** 跳转到 H5 完整版的链接 */
      h5Url: 'https://m.guoxue.ac.cn',
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

  // ── 操作回滚 ──

  @Get("rollbackable-logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取可回滚的审计日志列表" })
  @ApiBearerAuth()
  async getRollbackableLogs(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
    @Query("targetType") targetType?: string,
    @Query("targetId") targetId?: string,
  ) {
    return this.systemService.getRollbackableLogs({ page: Number(page), pageSize: Number(pageSize), targetType, targetId });
  }

  @Get("audit-logs/:id/rollback-preview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "预览回滚数据（回滚前查看将恢复的状态）" })
  @ApiBearerAuth()
  async previewRollback(@Param("id") id: string) {
    return this.systemService.previewRollback(id);
  }

  @Post("audit-logs/:id/rollback")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "回滚操作 — 根据审计日志快照恢复状态" })
  @ApiBearerAuth()
  async rollbackAuditLog(@Param("id") id: string, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    return this.systemService.executeRollback(id, u?.nickname || u?.id || "ADMIN");
  }

  // ── Cron Webhook ──

  @Post("cron/:jobName")
  @ApiOperation({ summary: "定时任务触发入口（由 Vercel Cron / 阿里云函数计算调用）" })
  @ApiQuery({ name: "secret", required: false, description: "Webhook 密钥（可选，生产环境建议配置）" })
  async triggerCron(
    @Param("jobName") jobName: string,
    @Query("secret") secret?: string,
  ) {
    this.systemService.validateCronSecret(secret);
    return this.systemService.executeCronJob(jobName);
  }

  @Get("cron-status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查询最近定时任务执行状态" })
  @ApiBearerAuth()
  @ApiQuery({ name: "limit", required: false, description: "返回最近 N 条记录", example: "10" })
  async getCronStatus(@Query("limit") limit = "10") {
    return { jobs: await this.systemService.getRecentCronJobs(Number(limit)) };
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
  @ApiQuery({ name: "configKey", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  async getConfigVersions(
    @Query("configKey") configKey?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.systemService.getConfigVersions(configKey, Number(page), Number(pageSize));
  }

  @Get("config-versions/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "获取单个配置版本详情" })
  @ApiBearerAuth()
  async getConfigVersion(@Param("id") id: string) {
    return this.systemService.getConfigVersion(id);
  }

  @Post("config-versions/rollback")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "回滚配置到指定版本" })
  @ApiBearerAuth()
  async rollbackConfig(@Body() dto: RollbackConfigDto, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    return this.systemService.rollbackConfig(dto.configKey, dto.version, u?.nickname || u?.id || "ADMIN");
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

  // ───────── 品类标签树管理 ─────────

  @Get("category-tree")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取品类标签树" })
  @ApiBearerAuth()
  async getCategoryTree() {
    const config = await this.systemService.getConfig("category_tree");
    if (config?.configValue) {
      try { return JSON.parse(config.configValue); } catch (_err) { /* fall through */ }
    }
    // 返回默认品类树
    return {
      "国学经典": ["儒家经典", "道家典籍", "佛学经典", "诸子百家"],
      "中医养生": ["中医基础", "食疗药膳", "经络穴位", "四季养生"],
      "诗词歌赋": ["唐诗", "宋词", "元曲", "现代诗词创作"],
      "民俗节庆": ["传统节日", "民俗活动", "民间故事", "礼仪习俗"],
      "非遗传承": ["传统技艺", "传统美术", "传统音乐", "民俗活动"],
      "茶道香道": ["茶道文化", "香道文化", "茶具鉴赏", "品茶技法"],
      "书法绘画": ["书法入门", "国画技法", "名家鉴赏", "篆刻艺术"],
      "传统音乐": ["古琴", "古筝", "琵琶", "二胡"],
      "武术太极": ["太极拳", "八段锦", "武术基础", "养生气功"],
      "易经智慧": ["八字命理", "紫微斗数", "风水堪舆", "姓名学"],
    };
  }

  @Put("category-tree")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "更新品类标签树" })
  @ApiBearerAuth()
  async updateCategoryTree(@Body() tree: Record<string, string[]>, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    await this.systemService.setConfig("category_tree", JSON.stringify(tree), "品类标签树", u?.nickname || u?.id);
    return { ok: true, categories: Object.keys(tree).length, totalSub: Object.values(tree).reduce((s, arr) => s + arr.length, 0) };
  }

  // ───────── 课程品类树管理 ─────────

  @Get("course-category-tree")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取课程品类树" })
  @ApiBearerAuth()
  async getCourseCategoryTree() {
    const config = await this.systemService.getConfig("course_category_tree");
    if (config?.configValue) {
      try { return JSON.parse(config.configValue); } catch { /* fall through */ }
    }
    // 默认值由 course.service 返回
    return {};
  }

  @Put("course-category-tree")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "更新课程品类树" })
  @ApiBearerAuth()
  async updateCourseCategoryTree(@Body() tree: Record<string, string[]>, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    await this.systemService.setConfig("course_category_tree", JSON.stringify(tree), "课程品类树", u?.nickname || u?.id);
    return { ok: true, categories: Object.keys(tree).length, totalSub: Object.values(tree).reduce((s, arr) => s + arr.length, 0) };
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

  @Put("member-configs/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新会员等级配置" })
  @ApiBearerAuth()
  async updateMemberConfig(@Param("id") id: string, @Body() dto: UpsertMemberConfigDto) {
    return this.systemService.updateMemberConfig(id, dto);
  }

  @Delete("member-configs/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除会员等级配置" })
  @ApiBearerAuth()
  async deleteMemberConfig(@Param("id") id: string) {
    await this.systemService.deleteMemberConfig(id);
    return { ok: true };
  }

  /** 发送文件到客户端 */
  private sendFile(res: Response, filePath: string, filename: string) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on("error", (_err) => {
      if (!res.headersSent) res.status(500).json({ message: "文件读取失败" });
    });
    stream.on("end", () => {
      fs.unlink(filePath, () => { /* cleanup best-effort */ });
    });
    return res;
  }
}
