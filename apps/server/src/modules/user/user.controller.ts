import { Controller, Get, Post, Put, Delete, Param, Query, Body, Req, UseGuards, Logger } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { SystemService } from "../system/system.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RoleType } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { AssignRoleDto, RemoveRoleDto, UserListQueryDto, UpdateProfileDto, UpdateUserStatusDto } from "./user.dto";

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
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.user.updateProfile(req.user.id, dto);
  }

  // ───────── 用户查询 ─────────

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取用户详情" })
  getUser(@Param("id") id: string) {
    return this.user.getUserById(id);
  }

  @Get(":id/stats")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取用户统计（文章/课程/粉丝数等）" })
  getUserStats(@Param("id") id: string) {
    return this.user.getUserStats(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取用户列表（管理员）" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "keyword", required: false })
  @ApiQuery({ name: "roleType", required: false })
  listUsers(@Query() q: UserListQueryDto) {
    return this.user.listUsers({ page: +(q.page || 1), pageSize: +(q.pageSize || 20), keyword: q.keyword, roleType: q.roleType });
  }

  // ───────── 角色管理 ─────────

  @Post(":id/roles")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "分配用户角色" })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "移除用户角色" })
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

  @Put(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新用户状态（封禁/激活）" })
  updateUserStatus(@Param("id") id: string, @Body() dto: UpdateUserStatusDto) {
    return this.user.updateUserStatus(id, dto.status);
  }

  // ───────── 会员 ─────────

  @Get(":id/purchases")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取用户会员购买记录" })
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
  follow(@Req() req: Request, @Param("id") id: string) {
    return this.user.follow(req.user.id, id);
  }

  @Delete(":id/follow")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消关注" })
  unfollow(@Req() req: Request, @Param("id") id: string) {
    return this.user.unfollow(req.user.id, id);
  }

  @Get(":id/followers")
  @ApiOperation({ summary: "粉丝列表" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getFollowers(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.user.getFollowers(id, +page, +pageSize);
  }

  @Get(":id/following")
  @ApiOperation({ summary: "关注列表" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getFollowing(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.user.getFollowing(id, +page, +pageSize);
  }

  @Get(":id/is-following")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "当前用户是否关注了目标用户" })
  isFollowing(@Req() req: Request, @Param("id") id: string) {
    return this.user.isFollowing(req.user.id, id);
  }

  // ───────── 用户分群推送 ─────────

  @Post("push/by-tag")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "按标签分群推送消息" })
  pushByTag(@Body() body: Record<string, unknown>) {
    return this.user.pushByTag(
      body.tag as string,
      body.memberLevel as string,
      +(body.activeDays as string || 0),
      body.title as string,
      body.content as string,
    );
  }

  // ───────── 白名单管理 ─────────

  @Get("whitelist")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "白名单用户列表" })
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
  addWhitelist(@Body() body: Record<string, unknown>) {
    return this.user.addWhitelist(body.userId as string);
  }

  @Delete("whitelist/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "从白名单移除用户" })
  removeWhitelist(@Param("userId") userId: string) {
    return this.user.removeWhitelist(userId);
  }

  // ───────── 用户画像 ─────────

  @Get(":id/profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取用户全量画像（订单/币/圈子/行为/设备等）" })
  getUserProfile(@Param("id") id: string) {
    return this.user.getUserProfile(id);
  }

  // ───────── 兴趣品类分析 ─────────

  @Get("stats/interests")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "用户兴趣品类统计分析（管理员）" })
  async getInterestStats() {
    return this.user.getInterestStats();
  }
}
