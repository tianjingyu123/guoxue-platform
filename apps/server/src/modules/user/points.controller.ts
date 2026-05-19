import { Controller, Get, Post, Body, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { PointsService } from "./points.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { SpendPointsDto } from "./dto/points.dto";

@ApiTags("积分成长")
@Controller("users/me")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PointsController {
  constructor(private readonly svc: PointsService) {}

  @Get("points")
  @ApiOperation({ summary: "积分余额+规则" })
  getPoints(@Req() req: Request) {
    return this.svc.getPoints(req.user.id);
  }

  @Get("points/records")
  @ApiOperation({ summary: "积分明细" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getPointsRecords(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getPointsRecords(req.user.id, +page, +pageSize);
  }

  @Get("growth")
  @ApiOperation({ summary: "成长值+等级" })
  getGrowth(@Req() req: Request) {
    return this.svc.getGrowth(req.user.id);
  }

  @Get("growth/records")
  @ApiOperation({ summary: "成长值明细" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getGrowthRecords(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getGrowthRecords(req.user.id, +page, +pageSize);
  }

  @Post("points/exchange")
  @ApiOperation({ summary: "积分兑换" })
  exchange(@Req() req: Request, @Body() dto: SpendPointsDto) {
    return this.svc.spendPoints(req.user.id, dto.amount, "EXCHANGE", `兑换${dto.targetType}:${dto.targetId}`);
  }
}
