import { Controller, Post, Get, Put, Delete, Body, Query, Param, UseGuards, Req, ForbiddenException } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { ImService } from "./im.service";
import { ImPolicyService } from "./im-policy.service";
import {
  GenUserSigDto,
  ImportAccountDto,
  CreateGroupDto,
  AddGroupMembersDto,
  SendC2CMsgDto,
  WithdrawMsgDto,
  FriendDto,
  UpdateImProfileDto,
  SendImGroupMsgDto,
  SendImageDto,
  SendCustomDto,
  UpdatePolicyConfigDto,
} from "./im.dto";

@ApiTags("IM 即时通讯")
@Controller("im")
export class ImController {
  constructor(
    private im: ImService,
    private policy: ImPolicyService,
  ) {}

  // ───────── 私信社交策略 ─────────

  @Get("relation/:targetId")
  @ApiOperation({ summary: "查询与目标用户的私信关系与权限", description: "返回关系层级/能否发送/剩余条数/富媒体权限，用于聊天页输入框状态" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getRelationPolicy(@Req() req: Request, @Param("targetId") targetId: string) {
    return this.policy.evaluateC2C(req.user.id, targetId);
  }

  @Get("policy/config")
  @ApiOperation({ summary: "获取私信社交策略配置（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  getPolicyConfig() {
    return this.policy.getConfig();
  }

  @Put("policy/config")
  @ApiOperation({ summary: "更新私信社交策略配置（管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  updatePolicyConfig(@Body() dto: UpdatePolicyConfigDto) {
    return this.policy.updateConfig(dto);
  }

  @Post("user-sig")
  @ApiOperation({ summary: "生成 UserSig", description: "为当前登录用户生成腾讯云 IM 的 UserSig" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  genUserSig(@Req() req: Request, @Body() _dto: GenUserSigDto) {
    return this.im.genUserSig(req.user.id);
  }

  @Post("account/import")
  @ApiOperation({ summary: "导入 IM 账号", description: "将用户导入腾讯云 IM（注册后自动调用）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  importAccount(@Req() req: Request, @Body() dto: ImportAccountDto) {
    return this.im.importAccount(req.user.id, dto.nickname, dto.avatar);
  }

  @Get("account/state")
  @ApiOperation({ summary: "查询账号在线状态" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限（仅可查询自己或好友）" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async queryAccountState(@Req() req: Request, @Query("userIds") userIds: string) {
    const ids = (userIds || "").split(",").filter(Boolean);
    if (ids.length === 0) return this.im.queryAccountState([]);
    // 鉴权：仅允许查询自己或好友的在线状态，防止枚举任意用户在线状态
    const selfId = req.user.id;
    for (const id of ids) {
      if (id === selfId) continue;
      const ok = await this.im.isFriend(selfId, id);
      if (!ok) throw new ForbiddenException("只能查询自己或好友的在线状态");
    }
    return this.im.queryAccountState(ids);
  }

  @Post("account/:userId/profile")
  @ApiOperation({ summary: "更新 IM 账号资料" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() req: Request,
    @Param("userId") userId: string,
    @Body() dto: UpdateImProfileDto,
  ) {
    if (req.user.id !== userId) throw new ForbiddenException("只能修改自己的IM资料");
    return this.im.updateProfile(userId, dto);
  }

  // ───────── 群组管理 ─────────

  @Post("groups")
  @ApiOperation({ summary: "创建群组", description: "为圈子/直播间等创建 IM 群组" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  createGroup(@Body() dto: CreateGroupDto) {
    return this.im.createGroup(dto.groupId, dto.name, dto.type, dto.ownerId);
  }

  @Delete("groups/:groupId")
  @ApiOperation({ summary: "解散群组" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  destroyGroup(@Param("groupId") groupId: string) {
    return this.im.destroyGroup(groupId);
  }

  @Post("groups/:groupId/members")
  @ApiOperation({ summary: "添加群成员" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  addGroupMembers(
    @Param("groupId") groupId: string,
    @Body() dto: AddGroupMembersDto,
  ) {
    return this.im.addGroupMembers(groupId, dto.memberIds);
  }

  @Delete("groups/:groupId/members")
  @ApiOperation({ summary: "删除群成员" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  deleteGroupMembers(
    @Param("groupId") groupId: string,
    @Body() dto: AddGroupMembersDto,
  ) {
    return this.im.deleteGroupMembers(groupId, dto.memberIds);
  }

  @Post("groups/:groupId/msg")
  @ApiOperation({ summary: "发送群消息" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  sendGroupMsg(
    @Req() req: Request,
    @Param("groupId") groupId: string,
    @Body() dto: SendImGroupMsgDto,
  ) {
    return this.im.sendGroupMsg(groupId, dto.text, req.user.id);
  }

  @Get("groups/:groupId/history")
  @ApiOperation({ summary: "获取群组历史消息（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  getGroupHistory(
    @Param("groupId") groupId: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.im.getGroupHistory(groupId, Number(page) || 1, Number(pageSize) || 20);
  }

  // ───────── 单聊消息 ─────────

  @Post("c2c/send")
  @ApiOperation({ summary: "发送单聊消息" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  sendC2CMsg(@Req() req: Request, @Body() dto: SendC2CMsgDto) {
    return this.im.sendC2CMsg(req.user.id, dto.toUserId, dto.text);
  }

  @Get("c2c/history")
  @ApiOperation({ summary: "获取单聊历史消息" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getC2CHistory(
    @Req() req: Request,
    @Query("toUserId") toUserId: string,
    @Query("count") count?: string,
  ) {
    return this.im.getC2CHistory(req.user.id, toUserId, Number(count) || 20);
  }

  @Post("msg/withdraw")
  @ApiOperation({ summary: "撤回消息" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  withdrawMsg(@Req() req: Request, @Body() dto: WithdrawMsgDto) {
    return this.im.withdrawMsg(req.user.id, dto.toUserId, dto.msgKey);
  }

  // ───────── 好友管理 ─────────

  @Post("friends")
  @ApiOperation({ summary: "添加好友" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addFriend(@Req() req: Request, @Body() dto: FriendDto) {
    return this.im.addFriend(req.user.id, dto.toUserId, dto.remark);
  }

  @Delete("friends/:toUserId")
  @ApiOperation({ summary: "删除好友" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deleteFriend(@Req() req: Request, @Param("toUserId") toUserId: string) {
    return this.im.deleteFriend(req.user.id, toUserId);
  }

  @Get("friends")
  @ApiOperation({ summary: "获取好友列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getFriendList(@Req() req: Request) {
    return this.im.getFriendList(req.user.id);
  }

  @Post("blacklist")
  @ApiOperation({ summary: "拉黑用户" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addBlacklist(@Req() req: Request, @Body() dto: FriendDto) {
    return this.im.addBlacklist(req.user.id, dto.toUserId);
  }

  @Post("blacklist/remove")
  @ApiOperation({ summary: "取消拉黑" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  removeBlacklist(@Req() req: Request, @Body() dto: FriendDto) {
    return this.im.removeBlacklist(req.user.id, dto.toUserId);
  }

  @Get("blacklist")
  @ApiOperation({ summary: "获取黑名单列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getBlacklist(@Req() req: Request) {
    return this.im.getBlacklist(req.user.id);
  }

  // ───────── 好友申请处理 ─────────

  @Post("friends/approve")
  @ApiOperation({ summary: "通过好友申请" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  approveFriendRequest(@Req() req: Request, @Body() dto: FriendDto) {
    return this.im.approveFriendRequest(req.user.id, dto.toUserId);
  }

  @Post("friends/reject")
  @ApiOperation({ summary: "拒绝好友申请" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  rejectFriendRequest(@Req() req: Request, @Body() dto: FriendDto) {
    return this.im.rejectFriendRequest(req.user.id, dto.toUserId);
  }

  @Get("friends/pending")
  @ApiOperation({ summary: "获取待处理好友申请" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listPendingFriendRequests(@Req() req: Request) {
    return this.im.listPendingFriendRequests(req.user.id);
  }

  // ───────── 群组详情 ─────────

  @Get("groups/:groupId/detail")
  @ApiOperation({ summary: "获取群组详细信息" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限（非群成员）" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getGroupInfo(@Req() req: Request, @Param("groupId") groupId: string) {
    // 鉴权：仅群成员可查看群信息
    const ok = await this.im.isGroupMember(groupId, req.user.id);
    if (!ok) throw new ForbiddenException("只有群成员可查看群信息");
    return this.im.getGroupInfo([groupId]);
  }

  @Get("groups/:groupId/members")
  @ApiOperation({ summary: "获取群成员列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限（非群成员）" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getGroupMembers(@Req() req: Request, @Param("groupId") groupId: string) {
    // 鉴权：仅群成员可查看群成员列表
    const ok = await this.im.isGroupMember(groupId, req.user.id);
    if (!ok) throw new ForbiddenException("只有群成员可查看群成员列表");
    return this.im.getGroupMembers(groupId);
  }

  // ───────── 富媒体消息 ─────────

  @Post("c2c/image")
  @ApiOperation({ summary: "发送图片消息（单聊）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  sendC2CImage(
    @Req() req: Request,
    @Body() dto: SendImageDto,
  ) {
    return this.im.sendC2CImage(req.user.id, dto.toUserId, dto.imageUrl, dto.width, dto.height);
  }

  @Post("c2c/custom")
  @ApiOperation({ summary: "发送自定义消息" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  sendCustomMsg(
    @Req() req: Request,
    @Body() dto: SendCustomDto,
  ) {
    return this.im.sendCustomMsg(req.user.id, dto.toUserId, dto.data, dto.desc);
  }
}
