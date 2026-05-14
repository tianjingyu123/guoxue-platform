import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { BountyService } from "./bounty.service";
import { CreateBountyDto, AnswerBountyDto } from "./bounty.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("悬赏咨询")
@Controller("bounty")
export class BountyController {
  constructor(private svc: BountyService) {}

  @Post("questions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "发布悬赏" })
  create(@Req() req: Request, @Body() dto: CreateBountyDto) {
    return this.svc.createQuestion(req.user.id, dto);
  }

  @Get("questions")
  @ApiOperation({ summary: "悬赏列表" })
  list(@Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("category") category?: string, @Query("status") status?: string) {
    return this.svc.list(page ? +page : 1, pageSize ? +pageSize : 20, category, status);
  }

  @Get("questions/:id")
  @ApiOperation({ summary: "悬赏详情" })
  getById(@Param("id") id: string) { return this.svc.getById(id); }

  @Post("questions/:id/claim")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "抢答" })
  claim(@Req() req: Request, @Param("id") id: string) {
    return this.svc.claim(req.user.id, id);
  }

  @Post("questions/:id/answer")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "提交回答" })
  answer(@Req() req: Request, @Param("id") id: string, @Body() dto: AnswerBountyDto) {
    return this.svc.answer(req.user.id, id, dto);
  }

  @Post("questions/:id/settle")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "确认满意，解付赏金" })
  settle(@Req() req: Request, @Param("id") id: string) {
    return this.svc.settle(req.user.id, id);
  }

  @Post("questions/:id/refund")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "退款" })
  refund(@Param("id") id: string) {
    return this.svc.refund(id);
  }
}
