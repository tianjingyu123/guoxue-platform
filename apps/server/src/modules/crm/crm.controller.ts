import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { CrmService } from "./crm.service";
import { InsightService } from "./insight.service";
import {
  CreateClientDto, UpdateClientDto, ClientListQueryDto,
  CreateServeLogDto, UpdateServeLogDto, ReminderQueryDto, FromOrderDto,
} from "./crm.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RedLineGate, RedLine } from "../../common/red-lines";

/**
 * 课-P3 客户经营 CRM（服务环）
 * 全端点 JWT；数据严格 ownerId=req.user.id 隔离（他人 clientId 与不存在同样 404）。
 * 合规红线：不提供任何导出端点（防数据贩卖·设计 §4.3）。
 */
@ApiTags("客户经营CRM")
@Controller("crm")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrmController {
  constructor(
    private crm: CrmService,
    private insight: InsightService,
  ) {}

  // ───────── 经营洞察（课-P4·R3 只做本人客户池统计聚合，无个体名单）─────────

  @Get("insights")
  @ApiOperation({ summary: "经营洞察（服务结构/客群节律/商机雷达/AI建议·仅本人客户池聚合·R3 无个体字段）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getInsights(@Req() req: Request) {
    return this.insight.getInsights(req.user.id);
  }

  // ───────── 订单归因入库询问（静态段先于 :id 声明）─────────

  @Get("suggested-clients")
  @ApiOperation({ summary: "近30天经我ref成交且未入库的客户（脱敏昵称·入库询问用）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  suggestedClients(@Req() req: Request) {
    return this.crm.suggestedClients(req.user.id);
  }

  @Post("clients/from-order")
  @ApiOperation({ summary: "一键入库：按订单取买家昵称建档（不取手机号/生辰·后续征得同意手补）" })
  @ApiResponse({ status: 201, description: "建档成功" })
  @ApiResponse({ status: 404, description: "订单不存在或非经你推荐成交" })
  @ApiResponse({ status: 401, description: "未登录" })
  fromOrder(@Req() req: Request, @Body() dto: FromOrderDto) {
    return this.crm.createClientFromOrder(req.user.id, dto);
  }

  // ───────── 客户档案 CRUD ─────────

  @Get("clients")
  @ApiOperation({ summary: "客户列表（RFM 实时分层·可按层筛选·手机号脱敏）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiQuery({ name: "tier", required: false, type: String, description: "RFM 层筛选 HIGH_VALUE/ACTIVE/AT_RISK/DORMANT" })
  @ApiQuery({ name: "keyword", required: false, type: String, description: "客户称呼搜索" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  listClients(@Req() req: Request, @Query() query: ClientListQueryDto) {
    return this.crm.listClients(req.user.id, query);
  }

  @Post("clients")
  @ApiOperation({ summary: "创建客户档案（手机号/生辰 M4 加密落库·体验档≤20）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 403, description: "体验档客户上限" })
  @ApiResponse({ status: 401, description: "未登录" })
  createClient(@Req() req: Request, @Body() dto: CreateClientDto) {
    return this.crm.createClient(req.user.id, dto);
  }

  @Get("clients/:id")
  @ApiOperation({ summary: "客户详情（含服务记录/待办提醒）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "客户不存在（含他人客户）" })
  @ApiResponse({ status: 401, description: "未登录" })
  getClient(@Req() req: Request, @Param("id") id: string) {
    return this.crm.getClient(req.user.id, id);
  }

  @Put("clients/:id")
  @ApiOperation({ summary: "更新客户档案" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 404, description: "客户不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  updateClient(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateClientDto) {
    return this.crm.updateClient(req.user.id, id, dto);
  }

  @Delete("clients/:id")
  @RedLineGate(RedLine.USER_DATA, RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "删除客户档案（硬删+审计留痕·客户可要求删除）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 404, description: "客户不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  deleteClient(@Req() req: Request, @Param("id") id: string) {
    return this.crm.deleteClient(req.user.id, id);
  }

  // ───────── 服务记录 ─────────

  @Post("clients/:id/serve-logs")
  @ApiOperation({ summary: "添加服务记录（同事务回写 RFM 聚合）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 404, description: "客户不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  addServeLog(@Req() req: Request, @Param("id") id: string, @Body() dto: CreateServeLogDto) {
    return this.crm.addServeLog(req.user.id, id, dto);
  }

  @Get("clients/:id/serve-logs")
  @ApiOperation({ summary: "客户服务记录列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "客户不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  listServeLogs(@Req() req: Request, @Param("id") id: string) {
    return this.crm.listServeLogs(req.user.id, id);
  }

  @Put("serve-logs/:id")
  @ApiOperation({ summary: "更新服务记录" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 404, description: "服务记录不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  updateServeLog(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateServeLogDto) {
    return this.crm.updateServeLog(req.user.id, id, dto);
  }

  @Delete("serve-logs/:id")
  @RedLineGate(RedLine.USER_DATA, RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "删除服务记录" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 404, description: "服务记录不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  deleteServeLog(@Req() req: Request, @Param("id") id: string) {
    return this.crm.deleteServeLog(req.user.id, id);
  }

  // ───────── 提醒（工作台待办）─────────

  @Get("reminders")
  @ApiOperation({ summary: "客户提醒待办（生日/立春流年/复购·cron 生成）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiQuery({ name: "status", required: false, type: String, description: "PENDING(默认)/DONE" })
  listReminders(@Req() req: Request, @Query() query: ReminderQueryDto) {
    return this.crm.listReminders(req.user.id, query.status || "PENDING");
  }

  @Put("reminders/:id/done")
  @ApiOperation({ summary: "完成提醒" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "提醒不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  completeReminder(@Req() req: Request, @Param("id") id: string) {
    return this.crm.completeReminder(req.user.id, id);
  }

  @Post("reminders/:id/draft")
  @ApiOperation({ summary: "AI 草拟跟进话术（便宜档·失败降级模板话术）" })
  @ApiResponse({ status: 201, description: "成功" })
  @ApiResponse({ status: 404, description: "提醒不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  draftReminder(@Req() req: Request, @Param("id") id: string) {
    return this.crm.draftReminder(req.user.id, id);
  }
}
