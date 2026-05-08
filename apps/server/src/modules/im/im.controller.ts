import { Controller, Post, Get, Delete, Body, Query, Param, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { ImService } from "./im.service";
import {
  GenUserSigDto,
  ImportAccountDto,
  CreateGroupDto,
  AddGroupMembersDto,
} from "./im.dto";

@ApiTags("IM 即时通讯")
@Controller("im")
export class ImController {
  constructor(private im: ImService) {}

  @Post("user-sig")
  @ApiOperation({ summary: "生成 UserSig", description: "为当前登录用户生成腾讯云 IM 的 UserSig" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  genUserSig(@Req() req: any, @Body() _dto: GenUserSigDto) {
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
    @Param("userId") userId: string,
    @Body() dto: { nickname?: string; avatar?: string },
  ) {
    return this.im.updateProfile(userId, dto);
  }

  // ───────── 群组管理 ─────────

  @Post("groups")
  @ApiOperation({ summary: "创建群组", description: "为圈子/直播间等创建 IM 群组" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createGroup(@Body() dto: CreateGroupDto) {
    return this.im.createGroup(dto.groupId, dto.name, dto.type, dto.ownerId);
  }

  @Delete("groups/:groupId")
  @ApiOperation({ summary: "解散群组" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  destroyGroup(@Param("groupId") groupId: string) {
    return this.im.destroyGroup(groupId);
  }

  @Post("groups/:groupId/members")
  @ApiOperation({ summary: "添加群成员" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addGroupMembers(
    @Param("groupId") groupId: string,
    @Body() dto: AddGroupMembersDto,
  ) {
    return this.im.addGroupMembers(groupId, dto.memberIds);
  }

  @Delete("groups/:groupId/members")
  @ApiOperation({ summary: "删除群成员" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
    @Req() req: any,
    @Param("groupId") groupId: string,
    @Body() dto: { text: string },
  ) {
    return this.im.sendGroupMsg(groupId, dto.text, req.user.id);
  }
}
