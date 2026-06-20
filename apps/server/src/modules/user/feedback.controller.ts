import { Controller, Get, Post, Body, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { FeedbackService } from "./feedback.service";
import { SubmitFeedbackDto } from "./feedback.dto";

@ApiTags("反馈")
@ApiBearerAuth()
@Controller("users")
export class FeedbackController {
  constructor(private readonly svc: FeedbackService) {}

  @Get("feedback/types")
  @ApiOperation({ summary: "获取反馈类型列表" })
  @ApiResponse({ status: 200, description: "成功" })
  getFeedbackTypes() {
    return this.svc.getFeedbackTypes();
  }

  @Get("feedback/history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取历史反馈列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getHistoryFeedbacks(@Req() req: Request) {
    return this.svc.getHistoryFeedbacks(req.user.id);
  }

  @Post("feedback")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "提交意见反馈" })
  @ApiResponse({ status: 201, description: "提交成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  submitFeedback(@Req() req: Request, @Body() dto: SubmitFeedbackDto) {
    return this.svc.submitFeedback(req.user.id, dto);
  }
}
