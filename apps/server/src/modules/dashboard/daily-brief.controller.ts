import { Controller, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { DailyBriefService } from "./daily-brief.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

/**
 * 每日运营简报（看-P2）：手动触发发送（幂等·当日已发跳过）
 * 常规发送走 cron 每日 08:00，此端点用于补发/演练
 */
@ApiTags("运营看板")
@ApiBearerAuth()
@Controller("dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DailyBriefController {
  constructor(private readonly svc: DailyBriefService) {}

  @Post("brief/send")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "手动触发每日运营简报（默认昨日·同日已发则幂等跳过）" })
  @ApiQuery({ name: "date", required: false, description: "YYYY-MM-DD，缺省为昨日" })
  @ApiResponse({ status: 201, description: "发送成功或幂等跳过" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  send(@Query("date") date?: string) {
    return this.svc.sendBrief(date);
  }
}
