import { Controller, Get, Post, Body, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { TeacherService } from "./teacher.service";
import { ApplyCertificationDto } from "./teacher.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

type AuthRequest = Omit<Request, "user"> & { user: Express.User };

@ApiTags("讲师认证")
@Controller("teacher")
export class TeacherController {
  constructor(private teacher: TeacherService) {}

  @Get("certification")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的讲师认证状态（身份证脱敏，无记录返回 null）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回认证状态" })
  @ApiResponse({ status: 401, description: "未认证" })
  getMyCertification(@Req() req: AuthRequest) {
    return this.teacher.getMyCertification(req.user.id);
  }

  @Post("certification")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "提交讲师认证申请（审核通过后获得课程上传资格）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "提交成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 409, description: "已认证或审核中，不可重复提交" })
  apply(@Req() req: AuthRequest, @Body() dto: ApplyCertificationDto) {
    return this.teacher.applyCertification(req.user.id, dto);
  }
}
