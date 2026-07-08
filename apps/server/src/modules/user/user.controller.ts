import { Controller, Get, Post, Put, Delete, Param, Query, Body, Req, UseGuards, Logger } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { SystemService } from "../system/system.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RoleType } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { AssignRoleDto, RemoveRoleDto, UserListQueryDto, UpdateProfileDto, UpdateUserStatusDto, BatchUpdateUserStatusDto, UpdateNotifySettingsDto, PushByTagDto, AddWhitelistDto } from "./user.dto";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("用户")
@ApiBearerAuth()
@Controller("users")
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(
    private user: UserService,
    private systemService: SystemService,
  ) {}

  // ───────── 个人资料 ─────────

  @Put("profile")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新个人资料" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.user.updateProfile(req.user.id, dto);
  }

  // ───────── 通知设置 ─────────

  @Get("notify-settings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取通知设置" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getNotifySettings(@Req() req: Request) {
    return this.user.getNotifySettings(req.user.id);
  }

  @Put("notify-settings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新通知设置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  updateNotifySettings(@Req() req: Request, @Body() dto: UpdateNotifySettingsDto) {
    return this.user.updateNotifySettings(req.user.id, dto);
  }

  // ───────── 第三方账号绑定 ─────────

  @Get("bound-accounts")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取已绑定的第三方账号" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getBoundAccounts(@Req() req: Request) {
    return this.user.getBoundAccounts(req.user.id);
  }

  @Delete("bound-accounts/:provider")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "解绑第三方账号" })
  @ApiResponse({ status: 200, description: "解绑成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "未绑定该账号" })
  @ApiResponse({ status: 401, description: "未登录" })
  unbindAccount(@Req() req: Request, @Param("provider") provider: string) {
    return this.user.unbindAccount(req.user.id, provider);
  }

  // ── 浏览历史 ──

  @Get("history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取浏览历史" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getBrowseHistory(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.user.getBrowseHistory(req.user.id, +page, +pageSize);
  }

  // ───────── 用户查询 ─────────

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取用户详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  getUser(@Param("id") id: string) {
    return this.user.getUserById(id);
  }

  @Get(":id/stats")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取用户统计（文章/课程/粉丝数等）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  getUserStats(@Param("id") id: string) {
    return this.user.getUserStats(id);
  }

  @Get(":id/public-profile")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取用户公开主页（脱敏·仅公开安全字段+认证徽章+关注关系）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  getPublicProfile(@Req() req: Request, @Param("id") id: string) {
    return this.user.getPublicProfile(id, req.user?.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "获取用户列表（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "keyword", required: false })
  @ApiQuery({ name: "roleType", required: false })
  @ApiQuery({ name: "memberLevel", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  listUsers(@Query() q: UserListQueryDto) {
    return this.user.listUsers({
      page: +(q.page || 1),
      pageSize: +(q.pageSize || 20),
      keyword: q.keyword,
      roleType: q.roleType,
      memberLevel: q.memberLevel,
      status: q.status,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
    });
  }

  // ───────── 角色管理 ─────────

  @Post(":id/roles")
  @RedLineGate(RedLine.USER_DATA)
  @Auditable({ action: "授予用户角色", targetType: "USER" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "分配用户角色" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async assignRole(
    @Param("id") userId: string,
    @Body() body: AssignRoleDto,
    @Req() req: Request,
  ) {
    const result = await this.user.assignRole(userId, body.roleType, body.bindId);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "UPDATE",
      targetType: "USER",
      targetId: userId,
      detail: `分配角色: ${body.roleType}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  @Delete(":id/roles/:roleType")
  @RedLineGate(RedLine.USER_DATA)
  @Auditable({ action: "移除用户角色", targetType: "USER" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "移除用户角色" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async removeRole(
    @Param("id") userId: string,
    @Param("roleType") roleType: RoleType,
    @Body() body: RemoveRoleDto,
    @Req() req: Request,
  ) {
    const result = await this.user.removeRole(userId, roleType, body.bindId);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "DELETE",
      targetType: "USER",
      targetId: userId,
      detail: `移除角色: ${roleType}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  // ───────── 状态管理 ─────────

  @Put("batch/status")
  @RedLineGate(RedLine.USER_DATA)
  @Auditable({ action: "批量用户状态变更", targetType: "USER" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量更新用户状态" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  batchUpdateStatus(@Body() dto: BatchUpdateUserStatusDto) {
    return this.user.batchUpdateStatus(dto.ids, dto.status);
  }

  @Put(":id/status")
  @RedLineGate(RedLine.USER_DATA)
  @Auditable({ action: "用户封禁/解封", targetType: "USER" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新用户状态（封禁/激活）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  updateUserStatus(@Param("id") id: string, @Body() dto: UpdateUserStatusDto) {
    return this.user.updateUserStatus(id, dto.status);
  }

  // ───────── 会员 ─────────

  @Get(":id/purchases")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取用户会员购买记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getMemberPurchases(@Param("id") userId: string, @Req() req: Request) {
    const roles: string[] = req.user?.roles ?? [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN");
    if (req.user.id !== userId && !isAdmin) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权查看他人购买记录");
    }
    return this.user.getMemberPurchases(userId);
  }

  // ───────── 关注系统 ─────────

  @Post(":id/follow")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "关注用户" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  follow(@Req() req: Request, @Param("id") id: string) {
    return this.user.follow(req.user.id, id);
  }

  @Delete(":id/follow")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消关注" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  unfollow(@Req() req: Request, @Param("id") id: string) {
    return this.user.unfollow(req.user.id, id);
  }

  @Get(":id/followers")
  @ApiOperation({ summary: "粉丝列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getFollowers(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.user.getFollowers(id, +page, +pageSize);
  }

  @Get(":id/following")
  @ApiOperation({ summary: "关注列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getFollowing(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.user.getFollowing(id, +page, +pageSize);
  }

  @Get(":id/is-following")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "当前用户是否关注了目标用户" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  isFollowing(@Req() req: Request, @Param("id") id: string) {
    return this.user.isFollowing(req.user.id, id);
  }

  // ── 黑名单 ──

  @Get("blacklist/list")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的黑名单" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getBlacklist(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.user.getBlacklist(req.user.id, +page, +pageSize);
  }

  @Post(":id/block")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "拉黑用户" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  blockUser(@Req() req: Request, @Param("id") blockedUserId: string) {
    return this.user.blockUser(req.user.id, blockedUserId);
  }

  @Delete(":id/block")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消拉黑" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  unblockUser(@Req() req: Request, @Param("id") blockedUserId: string) {
    return this.user.unblockUser(req.user.id, blockedUserId);
  }

  // ───────── 用户分群推送 ─────────

  @Get("push/estimate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "分群推送预估人数（dry-run，不发送）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "memberLevel", required: false, type: String, description: "会员等级" })
  @ApiQuery({ name: "activeDays", required: false, type: Number, description: "最少活跃天数" })
  estimatePush(
    @Query("memberLevel") memberLevel?: string,
    @Query("activeDays") activeDays?: number,
  ) {
    return this.user.estimateByTag(memberLevel || "", Number(activeDays) || 0);
  }

  @Post("push/by-tag")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "按标签分群推送消息" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  pushByTag(@Body() body: PushByTagDto) {
    return this.user.pushByTag(
      body.tag,
      body.memberLevel || "",
      body.activeDays || 0,
      body.title,
      body.content,
    );
  }

  // ───────── 白名单管理 ─────────

  @Get("whitelist")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "白名单用户列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getWhitelist(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.user.getWhitelist(+page, +pageSize);
  }

  @Post("whitelist")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "添加用户到白名单" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  addWhitelist(@Body() body: AddWhitelistDto) {
    return this.user.addWhitelist(body.userId);
  }

  @Delete("whitelist/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "从白名单移除用户" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  removeWhitelist(@Param("userId") userId: string) {
    return this.user.removeWhitelist(userId);
  }

  // ───────── 用户画像 ─────────

  @Get(":id/profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取用户全量画像（订单/币/圈子/行为/设备等）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getUserProfile(@Param("id") id: string) {
    return this.user.getUserProfile(id);
  }

  // ───────── 兴趣品类分析 ─────────

  @Get("stats/interests")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "用户兴趣品类统计分析（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async getInterestStats() {
    return this.user.getInterestStats();
  }

  // ───────── 账号注销（GDPR合规） ─────────

  @Get("delete-account/info")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取注销账号相关信息（原因/影响数据/资产）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  async getDeleteAccountInfo(@Req() req: Request) {
    return this.user.getDeleteAccountInfo(req.user.id);
  }

  @Post("delete-request")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "申请注销账号（进入7天冷静期）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  requestAccountDeletion(@Req() req: Request) {
    return this.user.requestAccountDeletion(req.user.id);
  }

  @Post("delete-cancel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消注销申请（冷静期内）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  cancelAccountDeletion(@Req() req: Request) {
    return this.user.cancelAccountDeletion(req.user.id);
  }

  @Post(":id/delete-execute")
  @RedLineGate(RedLine.USER_DATA, RedLine.IRREVERSIBLE)
  @Auditable({ action: "执行账号注销", targetType: "USER" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "管理员执行账号注销" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  executeAccountDeletion(@Param("id") id: string) {
    return this.user.executeAccountDeletion(id);
  }
}
