import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RevenueService } from "./revenue.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("收益分账")
@ApiBearerAuth()
@Controller("revenue")
@UseGuards(JwtAuthGuard)
export class RevenueController {
  constructor(private svc: RevenueService) {}

  @Get("summary")
  @ApiOperation({ summary: "我的收益汇总" })
  summary(@Req() req: any) {
    return this.svc.getUserSummary(req.user.id);
  }

  @Get("earnings")
  @ApiOperation({ summary: "我的收益明细" })
  earnings(@Req() req: any, @Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return this.svc.getUserEarnings(req.user.id, +page, +pageSize);
  }
}
