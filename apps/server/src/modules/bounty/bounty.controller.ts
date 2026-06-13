import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { BountyService } from "./bounty.service";
import { CreateBountyDto, AnswerBountyDto } from "./bounty.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("悬赏咨询")
@Controller("bounty")
export class BountyController {
  constructor(private svc: BountyService) {}

  @Post("questions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "发布悬赏" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  create(@Req() req: Request, @Body() dto: CreateBountyDto) {
    return this.svc.createQuestion(req.user.id, dto);
  }

  @Get("questions")
  @ApiOperation({ summary: "悬赏列表" })
  @ApiResponse({ status: 200, description: "成功" })
  list(@Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("category") category?: string, @Query("status") status?: string, @Query("stationId") stationId?: string) {
    return this.svc.list(page ? +page : 1, pageSize ? +pageSize : 20, category, status, stationId);
  }

  @Get("questions/:id")
  @ApiOperation({ summary: "悬赏详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getById(@Param("id") id: string) { return this.svc.getById(id); }

  @Post("questions/:id/claim")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "抢答" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  claim(@Req() req: Request, @Param("id") id: string) {
    return this.svc.claim(req.user.id, id);
  }

  @Post("questions/:id/answer")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "提交回答" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  answer(@Req() req: Request, @Param("id") id: string, @Body() dto: AnswerBountyDto) {
    return this.svc.answer(req.user.id, id, dto);
  }

  @Post("questions/:id/settle")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "确认满意，解付赏金" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  settle(@Req() req: Request, @Param("id") id: string) {
    return this.svc.settle(req.user.id, id);
  }

  @Post("questions/:id/refund")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "退款" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  refund(@Param("id") id: string) {
    return this.svc.refund(id);
  }
}
