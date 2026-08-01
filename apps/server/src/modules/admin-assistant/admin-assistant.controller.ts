import { Controller, Post, Get, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { AdminAssistantService, AssistantChatDto, CreateFeedbackDto } from "./admin-assistant.service";

@ApiTags("后台运营助手")
@ApiBearerAuth()
@Controller("admin-assistant")
// 安全修复(后端审计P1)：原类级仅 JwtAuthGuard，员工侧 chat/feedback/my-feedback 无角色门槛 →
// 任何 C 端登录用户都能调 /chat 读取内置《后台操作手册》并烧 DeepSeek 额度。
// 补类级 RolesGuard + 6 类后台员工角色默认门槛；管理侧端点的方法级 @Roles 会 override 此默认值。
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE", "CONTENT_AUDITOR", "GOODS_AUDITOR")
export class AdminAssistantController {
  constructor(private readonly svc: AdminAssistantService) {}

  // ── 员工侧：答疑 + 记录反馈（任意后台登录用户可用） ──

  @Post("chat")
  @ApiOperation({ summary: "向运营助手提问（页面感知答疑·只指导不代改）" })
  chat(@Req() req: Request, @Body() dto: AssistantChatDto) {
    return this.svc.chat(req.user.id, dto);
  }

  @Post("feedback")
  @ApiOperation({ summary: "提交运营反馈（员工遇到的问题→汇总给管理层）" })
  createFeedback(@Req() req: Request, @Body() dto: CreateFeedbackDto) {
    return this.svc.createFeedback(req.user.id, dto);
  }

  @Get("my-feedback")
  @ApiOperation({ summary: "我的反馈（员工看自己提交的问题及处理结果·状态/批复可见）" })
  myFeedback(@Req() req: Request) {
    return this.svc.myFeedback(req.user.id);
  }

  // ── 管理层侧：审阅、批复、汇总（仅超管/运营管理员） ──

  @Get("feedback")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "运营反馈列表（管理层审阅）" })
  listFeedback(@Query() q: { page?: number; pageSize?: number; status?: string; category?: string }) {
    return this.svc.listFeedback(q);
  }

  @Get("feedback/summary")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "运营反馈汇总（各状态/分类计数 + 待处理清单）" })
  summary() {
    return this.svc.summary();
  }

  @Put("feedback/:id")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新反馈状态/批复（董事长拍板）" })
  updateFeedback(@Param("id") id: string, @Body() dto: { status?: string; reply?: string }) {
    return this.svc.updateFeedback(id, dto);
  }

  // ── M1-1 反馈中枢：高频 TOP10 + 趋势周报 + 一键导出 ──

  @Get("feedback/hotspots")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "高频卡点 TOP10（按页面聚类·自动化该先啃哪块的数据指南针）" })
  hotspots(@Query() q: { days?: number; limit?: number }) {
    return this.svc.hotspots(Number(q.days) || 30, Number(q.limit) || 10);
  }

  @Get("feedback/weekly-report")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "反馈趋势周报（本周vs上周+处理率+TOP卡点+已优化/待拍板+大白话摘要）" })
  weeklyReport() {
    return this.svc.weeklyReport();
  }

  @Get("feedback/weekly-digest")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "一键导出周报清单（本周高频问题+已优化+待拍板·markdown 文本）" })
  weeklyDigest() {
    return this.svc.exportWeeklyDigest();
  }
}
