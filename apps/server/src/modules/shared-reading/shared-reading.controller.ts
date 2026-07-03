import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { CurrentUserId } from "../../common/current-user.decorator";
import { SharedReadingService } from "./shared-reading.service";
import { CreateGroupDto, JoinGroupDto } from "./shared-reading.dto";

@ApiTags("共读拼团")
@Controller("shared-reading")
export class SharedReadingController {
  constructor(private readonly svc: SharedReadingService) {}

  @Post("groups")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "发起共读组" })
  @ApiResponse({ status: 201, description: "创建成功" })
  createGroup(@CurrentUserId() userId: string, @Body() dto: CreateGroupDto) {
    return this.svc.createGroup(userId, dto);
  }

  @Get("groups/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "共读组详情（实时进度+惰性结算）" })
  @ApiResponse({ status: 200, description: "成功" })
  getDetail(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.svc.getDetail(id, userId);
  }

  @Get("invite/:token")
  @ApiOperation({ summary: "邀请招募卡（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  inviteInfo(@Param("token") token: string) {
    return this.svc.inviteInfo(token);
  }

  @Post("join")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "加入共读组" })
  @ApiResponse({ status: 201, description: "加入成功" })
  join(@CurrentUserId() userId: string, @Body() dto: JoinGroupDto) {
    return this.svc.join(userId, dto.token);
  }

  @Post("groups/:id/start")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "发起人手动开读" })
  @ApiResponse({ status: 201, description: "开读成功" })
  start(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.svc.start(userId, id);
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我参与的共读组" })
  @ApiResponse({ status: 200, description: "成功" })
  mine(@CurrentUserId() userId: string) {
    return this.svc.mine(userId);
  }

  @Delete("groups/:id/leave")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "退出共读组（发起人退=解散）" })
  @ApiResponse({ status: 200, description: "成功" })
  leave(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.svc.leave(userId, id);
  }
}
