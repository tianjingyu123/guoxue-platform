import {
  Controller, Get, Put, Delete, Post,
  Param, Body, Query, UseGuards, Req, Res,
  UploadedFile, UseInterceptors, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiResponse } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { ThrottleGuard } from "../../common/throttle.guard";
import { Roles } from "../../common/roles.decorator";
import { RedLineGate, RedLine, resolveExecutorType } from "../../common/red-lines";
import { Autonomy, AutonomyLevel } from "../../common/autonomy";
import { RequireAutomation } from "../../common/require-automation.decorator";
import { SystemService } from "./system.service";
import { OpsActionService } from "./ops-action.service";
import { ExportService } from "./export.service";
import { Response, Request } from "express";
import * as fs from "fs";
import { SetConfigDto, CreateConfigDto, ToggleMaintenanceDto, ToggleAutomationDto, ExportUsersDto, ExportOrdersDto, ExportContentsDto, ExportAuditLogsDto, ExportEarningsDto, UpsertPageContentDto, CreateSiteNoticeDto, UpdateSiteNoticeDto, RollbackConfigDto, UpsertMemberConfigDto, UpdateMemberConfigDto, ExportExcelDto, UpdateBrandConfigDto } from "./system.dto";
import { SkipFormat } from "../../common/skip-format.decorator";
import { Auditable } from "../../common/audit.decorator";
import { THIRD_PARTY_SERVICES } from "../../config/third-party-services";

@ApiTags("系统配置")
@Controller("system")
export class SystemController {
  constructor(
    private readonly systemService: SystemService,
    private readonly exportService: ExportService,
    private readonly opsActionService: OpsActionService,
  ) {}

  @Get("third-party-schema")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "第三方密钥配置 schema（驱动后台动态渲染，不含值）" })
  @ApiBearerAuth()
  getThirdPartySchema() {
    return {
      services: THIRD_PARTY_SERVICES.map((s) => ({
        key: s.key,
        label: s.label,
        category: s.category,
        enabled: s.enabled !== false,
        note: s.note ?? "",
        fields: s.fields.map((f) => ({
          key: f.key,
          label: f.label,
          sensitive: !!f.sensitive,
          placeholder: f.placeholder ?? "",
          hint: f.hint ?? "",
          multiline: !!f.multiline,
        })),
      })),
    };
  }

  @Get("configs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取所有系统配置，支持 keyPrefix 过滤" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "keyPrefix", required: false, type: String, description: "按 key 前缀过滤" })
  async listConfigs(@Query("keyPrefix") keyPrefix?: string) {
    const configs = await this.systemService.getAllConfigs();
    // 配置卫生：运营机器人日志（operation_robot_logs* 等）被写入 ConfigSystem 污染了配置列表，
    // 列表端点前缀过滤掉这类日志键（数据不动，仅不在配置管理页展示）。
    const LOG_KEY_PREFIXES = ["operation_robot_logs", "robot_logs"];
    const isLogKey = (key?: string) => !!key && LOG_KEY_PREFIXES.some((p) => key.startsWith(p));
    const cleaned = configs.filter((c: any) => !isLogKey(c.configKey));
    if (keyPrefix) {
      return { configs: cleaned.filter((c: any) => c.configKey?.startsWith(keyPrefix)) };
    }
    return { configs: cleaned };
  }

  @Post("configs")
  @Auditable({ action: "系统配置创建（含第三方密钥）", targetType: "CONFIG" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建系统配置" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async createConfig(@Body() body: CreateConfigDto, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    const updatedBy = u?.nickname || u?.id;
    return this.systemService.setConfig(body.key, body.value, body.description, updatedBy);
  }

  @Get("configs/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取单个系统配置" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async getConfig(@Param("key") key: string) {
    return this.systemService.getConfig(key);
  }

  @Put("configs/:key")
  @Auditable({ action: "系统配置变更（含第三方密钥）", targetType: "CONFIG" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新系统配置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @Auditable({ action: "系统配置删除（含第三方密钥）", targetType: "CONFIG" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除系统配置" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async deleteConfig(@Param("key") key: string) {
    await this.systemService.deleteConfig(key);
    return { ok: true };
  }

  // ── 健康检查 ──

  @Get("health")
  @ApiOperation({ summary: "系统健康检查" })
  @ApiResponse({ status: 200, description: "成功" })
  async healthCheck() {
    return this.systemService.healthCheck();
  }

  // ── 前端 UI 运营配置（公开只读·P1 运营配置最小闭环）──
  @Get("ui-config")
  @ApiOperation({ summary: "前端 UI 运营配置（公开·配置驱动首页大卡频率/智能体色系等）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getUiConfig() {
    return this.systemService.getUiConfig();
  }

  // ── 维护模式 ──

  @Get("maintenance")
  @ApiOperation({ summary: "查询维护模式状态" })
  @ApiResponse({ status: 200, description: "成功" })
  async getMaintenanceMode() {
    const enabled = await this.systemService.isMaintenanceMode();
    return { maintenanceMode: enabled };
  }

  @Put("maintenance")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "切换维护模式" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async toggleMaintenance(@Body() body: ToggleMaintenanceDto) {
    return this.systemService.toggleMaintenance(body.enabled);
  }

  // ── 自动化开关 ──

  @Get("automation/status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查询自动化开关状态" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async getAutomationStatus() {
    const enabled = await this.systemService.isAutomationEnabled();
    return { automationEnabled: enabled };
  }

  @Post("automation/toggle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "一键接管 — 开/关自动化（关闭后 Claude 权限降为只读）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async toggleAutomation(@Body() body: ToggleAutomationDto, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    const operator = u?.nickname || u?.id || "ADMIN";
    return this.systemService.toggleAutomation(body.enabled, operator);
  }

  // ── 一键回滚（治理护栏 §2.3 · 验收标准三）──

  @Get("automation/rollbackable")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "可回滚操作列表（带快照的审计记录，供一键回滚面板）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async listRollbackable(@Query() q: { targetType?: string; targetId?: string; page?: number; pageSize?: number }) {
    return this.systemService.listRollbackable(q);
  }

  @Post("automation/rollback/:auditId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "一键回滚 — 按审计快照还原某次自动化配置变更（SUPER_ADMIN·真人纠错）" })
  @ApiResponse({ status: 201, description: "回滚成功" })
  @ApiResponse({ status: 400, description: "该动作不支持回滚" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "审计记录不存在或无快照" })
  @ApiBearerAuth()
  async rollbackAudit(@Param("auditId") auditId: string, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    const operator = u?.nickname || u?.id || "ADMIN";
    return this.systemService.rollbackAudit(auditId, operator);
  }

  // ── 运维动作中心（后台管理自动化·L2 一键化试点·护栏底座第一个真实客户）──

  @Get("ops-actions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "运维动作列表（白名单安全可逆动作 + 当前值 + 档位·仅收非红线运营开关）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async listOpsActions() {
    return this.opsActionService.listActions();
  }

  @Post("ops-actions/execute")
  @Autonomy(AutonomyLevel.L2_ONE_CLICK)
  @RequireAutomation() // 受一键接管开关约束：接管后此写操作 403
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "执行运维动作（L2 一键·带回滚·白名单校验·写审计快照·可经 automation/rollback 还原）" })
  @ApiResponse({ status: 201, description: "执行成功，返回 auditId 供一键回滚" })
  @ApiResponse({ status: 400, description: "取值非法/非白名单动作" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限/自动化已接管" })
  @ApiResponse({ status: 404, description: "未注册的运维动作" })
  @ApiBearerAuth()
  async executeOpsAction(@Body() body: { action: string; value: string }, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    const operator = u?.nickname || u?.id || "ADMIN";
    return this.opsActionService.execute(body.action, body.value, operator, resolveExecutorType(req));
  }

  /** 公开接口：获取首页 Banner */
  @Get("public/banners")
  @ApiOperation({ summary: "获取首页Banner（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getPublicBanners() {
    return this.systemService.getPublicBanners();
  }

  /** 公开接口：获取首页布局配置 */
  @Get("public/home-config")
  @ApiOperation({ summary: "获取首页布局配置（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getHomeConfig() {
    return this.systemService.getHomeConfig();
  }

  /** 公开接口：小程序合规配置
   *
   * 小程序启动时调用此接口，获取当前可用的功能列表。
   * 审核期间通过后台关闭排盘/算命等敏感功能，审核通过后开启。
   * H5/APP 不受此限制，永远返回全部功能。
   */
  @Get("public/miniapp-config")
  @ApiOperation({ summary: "获取小程序合规配置（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
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


  // ───────── 品牌配置（租-T0 品牌抽象） ─────────

  /** 公开接口：品牌配置（全端品牌露出统一来源·H5/小程序/admin 启动时拉取） */
  @Get("public/brand-config")
  @ApiOperation({ summary: "获取品牌配置（公开·站名/Logo/主色/客服/协议主体）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getBrandConfig() {
    return this.systemService.getBrandConfig();
  }

  @Put("brand-config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "更新品牌配置（改一处配置全端生效）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async updateBrandConfig(@Body() dto: UpdateBrandConfigDto, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    return this.systemService.updateBrandConfig({ ...dto }, u?.nickname || u?.id);
  }

  /** 公开接口：关于我们。规模指标没有可审计聚合口径前保持为空，禁止固定宣传数字。 */
  @Get("about")
  @ApiOperation({ summary: "获取关于我们信息（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getAbout() {
    return {
      stats: [],
      features: [
        { icon: "book-open", title: "古籍与工具", desc: "阅读经典原文，使用经过校验的传统文化工具" },
        { icon: "play", title: "内容与课程", desc: "从公开内容到体系课程，按真实上架状态呈现" },
        { icon: "users", title: "社区交流", desc: "围绕兴趣加入圈子，与同好持续讨论和学习" },
        { icon: "sparkles", title: "智能辅助", desc: "为伴读、搜索、客服与创作提供流式智能能力" },
      ],
    };
  }

  // ── 审计日志 ──

  @Get("audit-logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查询审计日志" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async getAuditActions() {
    return { actions: await this.systemService.getAuditActions() };
  }

  // ── 操作回滚 ──

  @Get("rollbackable-logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取可回滚的审计日志列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async previewRollback(@Param("id") id: string) {
    return this.systemService.previewRollback(id);
  }

  @Post("audit-logs/:id/rollback")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "回滚操作 — 根据审计日志快照恢复状态" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async rollbackAuditLog(@Param("id") id: string, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    return this.systemService.executeRollback(id, u?.nickname || u?.id || "ADMIN");
  }

  // ── Cron Webhook ──

  @Post("cron/:jobName")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "定时任务触发入口（由 Vercel Cron / 阿里云函数计算调用）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "limit", required: false, description: "返回最近 N 条记录", example: "10" })
  async getCronStatus(@Query("limit") limit = "10") {
    return { jobs: await this.systemService.getRecentCronJobs(Number(limit)) };
  }

  @Get("cron")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "定时任务总览（进程内真实注册的 @Cron 任务 + DB 执行记录合并）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "limit", required: false, description: "合并的最近执行记录条数", example: "20" })
  async getCronJobs(@Query("limit") limit = "20") {
    return this.systemService.getCronJobs(Number(limit));
  }

  // ───────── 数据导出 ─────────

  @Post("export/users")
  @RedLineGate(RedLine.USER_DATA)
  @SkipFormat()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出用户数据CSV" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async exportUsers(@Body() filters?: ExportUsersDto, @Res() res?: Response) {
    const filePath = await this.exportService.exportUsers(filters);
    return this.sendFile(res!, filePath, "users-export.csv");
  }

  @Post("export/orders")
  @SkipFormat()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出订单数据CSV" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async exportOrders(@Body() filters?: ExportOrdersDto, @Res() res?: Response) {
    const filePath = await this.exportService.exportOrders(filters);
    return this.sendFile(res!, filePath, "orders-export.csv");
  }

  @Post("export/contents")
  @SkipFormat()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出内容数据CSV" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async exportContents(@Body() filters?: ExportContentsDto, @Res() res?: Response) {
    const filePath = await this.exportService.exportContents(filters);
    return this.sendFile(res!, filePath, "contents-export.csv");
  }

  @Post("export/audit-logs")
  @SkipFormat()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出审计日志CSV" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async exportAuditLogs(@Body() filters?: ExportAuditLogsDto, @Res() res?: Response) {
    const filePath = await this.exportService.exportAuditLogs(filters);
    return this.sendFile(res!, filePath, "audit-logs-export.csv");
  }

  @Post("export/earnings")
  @SkipFormat()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出佣金收益CSV" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async exportEarnings(@Body() filters?: ExportEarningsDto, @Res() res?: Response) {
    const filePath = await this.exportService.exportEarnings(filters);
    return this.sendFile(res!, filePath, "earnings-export.csv");
  }

  @Post("export/excel")
  @SkipFormat()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出Excel文件（支持 users/orders 类型）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async exportExcel(@Body() dto: ExportExcelDto, @Res() res: Response) {
    const buffer = await this.exportService.exportToExcel(dto.type, dto.filters);
    const filename = `${dto.type}-${Date.now()}.xls`;
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  }

  @Post("import-products")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量导入商品（CSV/TSV 格式）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "pageRoute", required: true })
  async getPageContent(@Query("pageRoute") pageRoute: string) {
    return this.systemService.getPageContent(pageRoute);
  }

  @Post("page-content")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建或更新页面文案" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async upsertPageContent(@Body() dto: UpsertPageContentDto) {
    return this.systemService.upsertPageContent(dto.pageRoute, dto.fieldKey, dto.content);
  }

  // ───────── 全站公告 ─────────

  @Get("public/site-notices")
  @ApiOperation({ summary: "获取当前有效的公开公告" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  async getPublicSiteNotices(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.systemService.getPublicSiteNotices(Number(page), Number(pageSize));
  }

  @Get("public/site-notices/:id")
  @ApiOperation({ summary: "获取当前有效的公开公告详情" })
  getPublicSiteNotice(@Param("id") id: string) {
    return this.systemService.getPublicSiteNotice(id);
  }

  @Post("site-notices")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建全站公告" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async createSiteNotice(@Body() dto: CreateSiteNoticeDto) {
    return this.systemService.createSiteNotice(dto);
  }

  @Get("site-notices")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取全站公告列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新全站公告" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async deleteSiteNotice(@Param("id") id: string) {
    return this.systemService.deleteSiteNotice(id);
  }

  // ───────── 配置版本管理 ─────────

  @Get("config-versions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "查询配置历史版本" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async getConfigVersion(@Param("id") id: string) {
    return this.systemService.getConfigVersion(id);
  }

  @Post("config-versions/rollback")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "回滚配置到指定版本" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async rollbackConfig(@Body() dto: RollbackConfigDto, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    return this.systemService.rollbackConfig(dto.configKey, dto.version, u?.nickname || u?.id || "ADMIN");
  }

  @Get("config-diff")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "获取两个配置版本的差异" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async getMemberConfigs() {
    return this.systemService.getMemberConfigs();
  }

  @Post("member-configs")
  @Auditable({ action: "提交会员套餐新增审批", targetType: "MEMBER_CONFIG" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "创建或更新会员等级配置" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async upsertMemberConfig(@Body() dto: UpsertMemberConfigDto, @Req() req: Request) {
    return this.systemService.requestUpsertMemberConfig(dto, req.user.id);
  }

  @Put("member-configs/:id")
  @Auditable({ action: "提交会员套餐修改审批", targetType: "MEMBER_CONFIG" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新会员等级配置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async updateMemberConfig(@Param("id") id: string, @Body() dto: UpdateMemberConfigDto, @Req() req: Request) {
    return this.systemService.requestUpdateMemberConfig(id, dto, req.user.id);
  }

  @Delete("member-configs/:id")
  @Auditable({ action: "提交会员套餐删除审批", targetType: "MEMBER_CONFIG" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除会员等级配置" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async deleteMemberConfig(@Param("id") id: string, @Req() req: Request) {
    return this.systemService.requestDeleteMemberConfig(id, req.user.id);
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
