import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { InteractionService } from "./interaction.service";
import {
  LikeDto, CreateCommentDto, CollectDto,
  FollowDto, ReportDto, CommentListQueryDto, ReportListQueryDto,
} from "./interaction.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { Request } from "express";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("互动")
@Controller("interaction")
export class InteractionController {
  constructor(
    private svc: InteractionService,
    // PrismaModule 为 @Global：注入用于驳回举报时补记处理结论(Report.result)，
    // InteractionService.dismissReport 不收理由参数且该 service 不在本次改动范围
    private prisma: PrismaService,
  ) {}

  // ───────── 点赞 ─────────

  @Post("like")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "点赞/取消点赞" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  toggleLike(@Req() req: Request, @Body() dto: LikeDto) {
    return this.svc.toggleLike(req.user.id, dto);
  }

  @Get("like/check")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "检查是否已点赞" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "targetType", required: true, type: String, description: "目标类型" })
  @ApiQuery({ name: "targetIds", required: true, type: String, description: "目标ID列表（逗号分隔）" })
  checkLiked(@Req() req: Request, @Query("targetType") targetType: string, @Query("targetIds") targetIds: string) {
    return this.svc.isLiked(req.user.id, targetType, targetIds.split(","));
  }

  @Get("like/count")
  @ApiOperation({ summary: "获取点赞数量" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "targetType", required: true, type: String, description: "目标类型" })
  @ApiQuery({ name: "targetId", required: true, type: String, description: "目标ID" })
  likeCount(@Query("targetType") targetType: string, @Query("targetId") targetId: string) {
    return this.svc.getLikeCount(targetType, targetId);
  }

  @Get("likes/my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我点赞过的内容列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  myLikes(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getMyLikes(req.user.id, +page, +pageSize);
  }

  // ───────── 评论 ─────────

  @Post("comment")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建评论" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createComment(@Req() req: Request, @Body() dto: CreateCommentDto) {
    return this.svc.createComment(req.user.id, dto);
  }

  @Get("comment")
  @ApiOperation({ summary: "获取评论列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listComments(@Query() q: CommentListQueryDto) {
    return this.svc.listComments(q);
  }

  @Delete("comment/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除评论" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  deleteComment(@Param("id") id: string, @Req() req: Request) {
    const roles: string[] = req.user?.roles ?? [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN");
    return this.svc.deleteComment(id, req.user.id, isAdmin);
  }

  @Put("comment/:id/hide")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "隐藏评论（管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  hideComment(@Param("id") id: string) {
    return this.svc.hideComment(id);
  }

  // ───────── 收藏 ─────────

  @Post("collect")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "收藏/取消收藏" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  toggleCollect(@Req() req: Request, @Body() dto: CollectDto) {
    return this.svc.toggleCollect(req.user.id, dto);
  }

  @Get("collect")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的收藏" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  myCollects(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getUserCollects(req.user.id, +page, +pageSize);
  }

  // ───────── 关注 ─────────

  @Post("follow")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "关注/取消关注" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  toggleFollow(@Req() req: Request, @Body() dto: FollowDto) {
    return this.svc.toggleFollow(req.user.id, dto);
  }

  @Get("followers/:userId")
  @ApiOperation({ summary: "获取粉丝列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  getFollowers(@Param("userId") userId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getFollowers(userId, +page, +pageSize);
  }

  @Get("following/:userId")
  @ApiOperation({ summary: "获取关注列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  getFollowing(@Param("userId") userId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getFollowing(userId, +page, +pageSize);
  }

  // ───────── 附近的人 ─────────

  @Get("nearby")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发现附近的人" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "lat", required: false, type: Number, description: "纬度" })
  @ApiQuery({ name: "lng", required: false, type: Number, description: "经度" })
  @ApiQuery({ name: "radius", required: false, type: Number, description: "搜索半径（km）" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  getNearbyUsers(
    @Req() req: Request,
    @Query("lat") lat?: number,
    @Query("lng") lng?: number,
    @Query("radius") radius?: number,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getNearbyUsers(req.user.id, { lat, lng, radius: radius ?? 10, page: +page, pageSize: +pageSize });
  }

  // ───────── 举报 ─────────

  @Post("report")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "提交举报" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  report(@Req() req: Request, @Body() dto: ReportDto) {
    return this.svc.report(req.user.id, dto);
  }

  @Get("report")
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 权限修复(角色断裂)：客服工作台负责举报处理，放行 CUSTOMER_SERVICE。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "获取举报列表（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  listReports(@Query() q: ReportListQueryDto) {
    return this.svc.listReports(q);
  }

  @Put("report/:id/process")
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 权限修复(角色断裂)：客服工作台负责举报处理，放行 CUSTOMER_SERVICE。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "处理举报（管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  processReport(
    @Param("id") id: string,
    @Body("result") result?: string,
    @Body("reason") reason?: string,
  ) {
    // 兼容前端两种字段名：处理结论存入 Report.result
    return this.svc.processReport(id, result ?? reason);
  }

  @Put("report/:id/dismiss")
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 权限修复(角色断裂)：客服工作台负责举报处理，放行 CUSTOMER_SERVICE。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "驳回举报（管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async dismissReport(
    @Param("id") id: string,
    @Body("reason") reason?: string,
    @Body("result") result?: string,
  ) {
    const dismissed = await this.svc.dismissReport(id);
    // 驳回理由持久化到 Report.result（service.dismissReport 不收理由参数，此处补记）
    const conclusion = reason ?? result;
    if (conclusion) {
      return this.prisma.report.update({ where: { id }, data: { result: conclusion } });
    }
    return dismissed;
  }

  @Get("report/admin/:id/target")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "查看被举报内容详情（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "举报不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getReportTarget(@Param("id") id: string) {
    return this.svc.getReportTarget(id);
  }

  // ───────── 管理统计 ─────────

  @Get("admin/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "互动统计总览（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getAdminStats() {
    return this.svc.getAdminStats();
  }

  @Get("admin/trends")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "互动趋势（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getAdminTrends(@Query("days") days?: number) {
    return this.svc.getAdminTrends(days || 7);
  }

  @Get("admin/top-content")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "热门内容排行（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getAdminTopContent(@Query("limit") limit?: number) {
    return this.svc.getAdminTopContent(limit || 10);
  }
}
