import { Controller, Post, Get, Delete, Body, Query, Param, UseGuards, Req, ForbiddenException } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { ImService } from "./im.service";
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
} from "./im.dto";

@ApiTags("IM 即时通讯")
@Controller("im")
export class ImController {
  constructor(private im: ImService) {}

  @Post("user-sig")
  @ApiOperation({ summary: "生成 UserSig", description: "为当前登录用户生成腾讯云 IM 的 UserSig" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  genUserSig(@Req() req: Request, @Body() _dto: GenUserSigDto) {
    return this.im.genUserSig(req.user.id);
  }

  @Post("account/import")
  @ApiOperation({ summary: "导入 IM 账号", description: "将用户导入腾讯云 IM（注册后自动调用）" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  importAccount(@Body() dto: ImportAccountDto) {
    return this.im.importAccount(dto.userId, dto.nickname, dto.avatar);
  }

  @Get("account/state")
  @ApiOperation({ summary: "查询账号在线状态" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  queryAccountState(@Query("userIds") userIds: string) {
    const ids = userIds.split(",").filter(Boolean);
    return this.im.queryAccountState(ids);
  }

  @Post("account/:userId/profile")
  @ApiOperation({ summary: "更新 IM 账号资料" })
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  createGroup(@Body() dto: CreateGroupDto) {
    return this.im.createGroup(dto.groupId, dto.name, dto.type, dto.ownerId);
  }

  @Delete("groups/:groupId")
  @ApiOperation({ summary: "解散群组" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  destroyGroup(@Param("groupId") groupId: string) {
    return this.im.destroyGroup(groupId);
  }

  @Post("groups/:groupId/members")
  @ApiOperation({ summary: "添加群成员" })
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  sendC2CMsg(@Req() req: Request, @Body() dto: SendC2CMsgDto) {
    return this.im.sendC2CMsg(req.user.id, dto.toUserId, dto.text);
  }

  @Get("c2c/history")
  @ApiOperation({ summary: "获取单聊历史消息" })
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  withdrawMsg(@Req() req: Request, @Body() dto: WithdrawMsgDto) {
    return this.im.withdrawMsg(req.user.id, dto.toUserId, dto.msgKey);
  }

  // ───────── 好友管理 ─────────

  @Post("friends")
  @ApiOperation({ summary: "添加好友" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addFriend(@Req() req: Request, @Body() dto: FriendDto) {
    return this.im.addFriend(req.user.id, dto.toUserId, dto.remark);
  }

  @Delete("friends/:toUserId")
  @ApiOperation({ summary: "删除好友" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deleteFriend(@Req() req: Request, @Param("toUserId") toUserId: string) {
    return this.im.deleteFriend(req.user.id, toUserId);
  }

  @Get("friends")
  @ApiOperation({ summary: "获取好友列表" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getFriendList(@Req() req: Request) {
    return this.im.getFriendList(req.user.id);
  }

  @Post("blacklist")
  @ApiOperation({ summary: "拉黑用户" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addBlacklist(@Req() req: Request, @Body() dto: FriendDto) {
    return this.im.addBlacklist(req.user.id, dto.toUserId);
  }

  @Post("blacklist/remove")
  @ApiOperation({ summary: "取消拉黑" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  removeBlacklist(@Req() req: Request, @Body() dto: FriendDto) {
    return this.im.removeBlacklist(req.user.id, dto.toUserId);
  }

  @Get("blacklist")
  @ApiOperation({ summary: "获取黑名单列表" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getBlacklist(@Req() req: Request) {
    return this.im.getBlacklist(req.user.id);
  }

  // ───────── 好友申请处理 ─────────

  @Post("friends/approve")
  @ApiOperation({ summary: "通过好友申请" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  approveFriendRequest(@Req() req: Request, @Body() dto: FriendDto) {
    return this.im.approveFriendRequest(req.user.id, dto.toUserId);
  }

  @Post("friends/reject")
  @ApiOperation({ summary: "拒绝好友申请" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  rejectFriendRequest(@Req() req: Request, @Body() dto: FriendDto) {
    return this.im.rejectFriendRequest(req.user.id, dto.toUserId);
  }

  @Get("friends/pending")
  @ApiOperation({ summary: "获取待处理好友申请" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listPendingFriendRequests(@Req() req: Request) {
    return this.im.listPendingFriendRequests(req.user.id);
  }

  // ───────── 群组详情 ─────────

  @Get("groups/:groupId/detail")
  @ApiOperation({ summary: "获取群组详细信息" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getGroupInfo(@Param("groupId") groupId: string) {
    return this.im.getGroupInfo([groupId]);
  }

  @Get("groups/:groupId/members")
  @ApiOperation({ summary: "获取群成员列表" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getGroupMembers(@Param("groupId") groupId: string) {
    return this.im.getGroupMembers(groupId);
  }

  // ───────── 富媒体消息 ─────────

  @Post("c2c/image")
  @ApiOperation({ summary: "发送图片消息（单聊）" })
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  sendCustomMsg(
    @Req() req: Request,
    @Body() dto: SendCustomDto,
  ) {
    return this.im.sendCustomMsg(req.user.id, dto.toUserId, dto.data, dto.desc);
  }
}
