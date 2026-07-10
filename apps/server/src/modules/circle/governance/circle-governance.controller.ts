import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { RolesGuard } from "../../../common/roles.guard";
import { Roles } from "../../../common/roles.decorator";
import { CircleGovernanceService } from "./circle-governance.service";
import {
  CreateAppealDto,
  CreateRuleDto,
  ReorderRulesDto,
  ResolveAppealDto,
  ReviewPostDto,
  SanctionDto,
  UpdateGovernanceConfigDto,
  UpdatePermissionMatrixDto,
  UpdateRuleDto,
} from "./circle-governance.dto";

/**
 * 圈子治理（待办 #8-#14）。
 * 圈主侧：圈规 CRUD/模板套用/治理配置/权限矩阵/违规处理/记录留痕；
 * 成员侧：圈规查看与加入确认/我的处理通知/发起申诉；
 * 平台侧：申诉仲裁队列与裁决（不经圈主）。
 */
@ApiTags("圈子治理")
@Controller("circle-governance")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CircleGovernanceController {
  constructor(private readonly svc: CircleGovernanceService) {}

  // ───────── 平台仲裁（先注册字面量路由·避免被 :circleId 吞掉） ─────────

  @Get("admin/appeals")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "平台申诉仲裁队列" })
  @ApiQuery({ name: "status", required: false, description: "PENDING/UPHELD/REJECTED·默认 PENDING" })
  listAppeals(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("status") status = "PENDING") {
    return this.svc.listAppeals(+page, +pageSize, status);
  }

  @Post("admin/appeals/:appealId/resolve")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "平台裁决申诉（成立=撤销处理并清记录）" })
  resolveAppeal(@Req() req: Request, @Param("appealId") appealId: string, @Body() dto: ResolveAppealDto) {
    return this.svc.resolveAppeal(appealId, req.user.id, dto);
  }

  // ───────── 成员侧（跨圈） ─────────

  @Get("my-sanctions")
  @ApiOperation({ summary: "我的处理通知（完整明细+累计进度+申诉状态）" })
  @ApiQuery({ name: "circleId", required: false })
  getMySanctions(@Req() req: Request, @Query("circleId") circleId?: string) {
    return this.svc.getMySanctions(req.user.id, circleId);
  }

  @Post("violations/:violationId/appeal")
  @ApiOperation({ summary: "对处理发起申诉（72h 内·每次处理一次·平台仲裁 48h 答复）" })
  createAppeal(@Req() req: Request, @Param("violationId") violationId: string, @Body() dto: CreateAppealDto) {
    return this.svc.createAppeal(violationId, req.user.id, dto);
  }

  // ───────── 圈规条文（#9/#14） ─────────

  @Get(":circleId/rules")
  @ApiOperation({ summary: "圈规条文列表（成员/加入预览可见）" })
  getRules(@Param("circleId") circleId: string) {
    return this.svc.getRules(circleId);
  }

  @Post(":circleId/rules")
  @ApiOperation({ summary: "新增圈规条文（圈主）" })
  createRule(@Req() req: Request, @Param("circleId") circleId: string, @Body() dto: CreateRuleDto) {
    return this.svc.createRule(circleId, req.user.id, dto);
  }

  @Put(":circleId/rules/reorder")
  @ApiOperation({ summary: "条文拖动排序（圈主）" })
  reorderRules(@Req() req: Request, @Param("circleId") circleId: string, @Body() dto: ReorderRulesDto) {
    return this.svc.reorderRules(circleId, req.user.id, dto);
  }

  @Put(":circleId/rules/:ruleId")
  @ApiOperation({ summary: "修改条文（圈主·标记手改后模板不覆盖）" })
  updateRule(@Req() req: Request, @Param("circleId") circleId: string, @Param("ruleId") ruleId: string, @Body() dto: UpdateRuleDto) {
    return this.svc.updateRule(circleId, req.user.id, ruleId, dto);
  }

  @Delete(":circleId/rules/:ruleId")
  @ApiOperation({ summary: "删除条文（圈主）" })
  deleteRule(@Req() req: Request, @Param("circleId") circleId: string, @Param("ruleId") ruleId: string) {
    return this.svc.deleteRule(circleId, req.user.id, ruleId);
  }

  @Post(":circleId/rules/apply-template")
  @ApiOperation({ summary: "官方模板一键套用（不覆盖手改项·圈主）" })
  applyTemplate(@Req() req: Request, @Param("circleId") circleId: string) {
    return this.svc.applyTemplate(circleId, req.user.id);
  }

  @Post(":circleId/rules/ack")
  @ApiOperation({ summary: "成员确认圈规（加入流程调用·快照留痕）" })
  ackRules(@Req() req: Request, @Param("circleId") circleId: string) {
    return this.svc.ackRules(circleId, req.user.id);
  }

  @Get(":circleId/rules/my-ack")
  @ApiOperation({ summary: "我的圈规确认状态" })
  getMyAck(@Req() req: Request, @Param("circleId") circleId: string) {
    return this.svc.getMyAck(circleId, req.user.id);
  }

  // ───────── 治理配置与权限矩阵（#8/#11·圈主） ─────────

  @Get(":circleId/config")
  @ApiOperation({ summary: "治理配置（自动治理开关·圈主）" })
  getConfig(@Req() req: Request, @Param("circleId") circleId: string) {
    return this.svc.getConfig(circleId, req.user.id);
  }

  @Put(":circleId/config")
  @ApiOperation({ summary: "保存治理配置（圈主）" })
  updateConfig(@Req() req: Request, @Param("circleId") circleId: string, @Body() dto: UpdateGovernanceConfigDto) {
    return this.svc.updateConfig(circleId, req.user.id, dto);
  }

  @Get(":circleId/permission-matrix")
  @ApiOperation({ summary: "角色权限矩阵（含锁定项·圈主）" })
  getPermissionMatrix(@Req() req: Request, @Param("circleId") circleId: string) {
    return this.svc.getPermissionMatrix(circleId, req.user.id);
  }

  @Put(":circleId/permission-matrix")
  @ApiOperation({ summary: "保存权限矩阵（锁定项忽略·资金/移出永远仅圈主）" })
  updatePermissionMatrix(@Req() req: Request, @Param("circleId") circleId: string, @Body() dto: UpdatePermissionMatrixDto) {
    return this.svc.updatePermissionMatrix(circleId, req.user.id, dto);
  }

  // ───────── 待审帖子队列（TODO#2·新成员先审/敏感词转审·content.review 矩阵位） ─────────

  @Get(":circleId/posts/pending")
  @ApiOperation({ summary: "待审帖子列表（新成员先审/敏感词转审·按矩阵 content.review 鉴权）" })
  listPendingPosts(
    @Req() req: Request,
    @Param("circleId") circleId: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listPendingPosts(circleId, req.user.id, +page, +pageSize);
  }

  @Post(":circleId/posts/:postId/review")
  @ApiOperation({ summary: "审核待审帖子（通过=发布并计数·驳回=隐藏并通知作者）" })
  reviewPost(
    @Req() req: Request,
    @Param("circleId") circleId: string,
    @Param("postId") postId: string,
    @Body() dto: ReviewPostDto,
  ) {
    return this.svc.reviewPost(circleId, req.user.id, postId, dto);
  }

  // ───────── 违规处理与留痕（#10/#13） ─────────

  @Post(":circleId/violations")
  @ApiOperation({ summary: "执行违规处理（警告/禁言/移出·按矩阵鉴权·移出仅圈主）" })
  sanction(@Req() req: Request, @Param("circleId") circleId: string, @Body() dto: SanctionDto) {
    return this.svc.sanction(circleId, req.user.id, dto);
  }

  @Get(":circleId/violations")
  @ApiOperation({ summary: "违规处理记录（管理侧完整明细）" })
  @ApiQuery({ name: "status", required: false })
  listViolations(
    @Req() req: Request,
    @Param("circleId") circleId: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("status") status?: string,
  ) {
    return this.svc.listViolations(circleId, req.user.id, +page, +pageSize, status);
  }

  @Post(":circleId/violations/:violationId/lift")
  @ApiOperation({ summary: "提前解除（禁言解禁/移出解除禁入·仅圈主）" })
  liftViolation(@Req() req: Request, @Param("circleId") circleId: string, @Param("violationId") violationId: string) {
    return this.svc.liftViolation(circleId, req.user.id, violationId);
  }

  @Get(":circleId/log")
  @ApiOperation({ summary: "圈内治理记录（成员可查·匿去细节）" })
  getGovernanceLog(
    @Req() req: Request,
    @Param("circleId") circleId: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getGovernanceLog(circleId, req.user.id, +page, +pageSize);
  }
}
