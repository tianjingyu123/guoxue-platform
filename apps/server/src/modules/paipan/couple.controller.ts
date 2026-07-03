import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { CoupleService } from "./couple.service";
import { CoupleInviteDto, CoupleAcceptDto } from "./couple.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";

/**
 * V4 双人合盘（合婚裂变）——独立于现有 hehun 端点
 * R3 最小授权：任何端点都不返回对方 recordId/生辰/四柱，双方唯一共享内容=合婚报告文本
 */
@ApiTags("双人合盘")
@Controller("paipan/couple")
export class CoupleController {
  constructor(private couple: CoupleService) {}

  /** 发起邀请 */
  @Post("invite")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发起双人合盘邀请（生成邀请链接）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "邀请已创建" })
  @ApiResponse({ status: 400, description: "排盘记录不存在或不属于当前用户" })
  @ApiResponse({ status: 401, description: "未认证" })
  invite(@Req() req: Request, @Body() dto: CoupleInviteDto) {
    return this.couple.invite(req.user.id, dto.myRecordId);
  }

  /** 公开查看邀请详情（不透露发起方生辰/盘信息） */
  @Get("invite/:token")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "查看邀请详情（公开，仅含发起人昵称与状态）" })
  @ApiResponse({ status: 200, description: "成功返回邀请详情" })
  @ApiResponse({ status: 404, description: "邀请不存在" })
  getInvite(@Param("token") token: string) {
    return this.couple.getInvite(token);
  }

  /** 接受邀请（被邀请方提供自己的盘，服务端生成合婚报告） */
  @Post(":token/accept")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "接受双人合盘邀请（授权并生成合婚报告）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "授权成功，合婚报告已生成" })
  @ApiResponse({ status: 400, description: "邀请失效/过期/记录非本人/不能接受自己的邀请" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "邀请不存在" })
  accept(@Req() req: Request, @Param("token") token: string, @Body() dto: CoupleAcceptDto) {
    return this.couple.accept(req.user.id, token, dto.myRecordId);
  }

  /** 拒绝邀请 */
  @Post(":token/reject")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "拒绝双人合盘邀请" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "已拒绝" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "邀请不存在" })
  reject(@Req() req: Request, @Param("token") token: string) {
    return this.couple.reject(req.user.id, token);
  }

  /** 我的合盘列表 */
  @Get("mine")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的合盘列表（我发起的+我参与的）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回合盘列表" })
  @ApiResponse({ status: 401, description: "未认证" })
  getMine(@Req() req: Request) {
    return this.couple.getMine(req.user.id);
  }

  /** 合盘详情（仅双方可见，仅返回报告文本+双方昵称） */
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "合盘详情（仅双方可见，含合婚报告）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回合盘详情" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（非双方）" })
  @ApiResponse({ status: 404, description: "合盘不存在或己方已删除" })
  getById(@Req() req: Request, @Param("id") id: string) {
    return this.couple.getById(req.user.id, id);
  }

  /** 删除（软删己方可见性） */
  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除合盘（软删己方可见性）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "已删除" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（非双方）" })
  @ApiResponse({ status: 404, description: "合盘不存在" })
  remove(@Req() req: Request, @Param("id") id: string) {
    return this.couple.remove(req.user.id, id);
  }
}
