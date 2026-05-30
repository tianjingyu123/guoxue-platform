import { Controller, Post, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { CheckinService } from "./checkin.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { CheckInCalendarQueryDto } from "./checkin.dto";

@ApiTags("签到")
@Controller("users/me")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CheckinController {
  constructor(private readonly svc: CheckinService) {}

  @Post("checkin")
  @ApiOperation({ summary: "每日签到" })
  checkIn(@Req() req: Request) {
    return this.svc.checkIn(req.user.id);
  }

  @Get("checkin/status")
  @ApiOperation({ summary: "查询今日签到状态" })
  getStatus(@Req() req: Request) {
    return this.svc.getStatus(req.user.id);
  }

  @Get("checkin/calendar")
  @ApiOperation({ summary: "获取月度签到日历" })
  getCalendar(@Req() req: Request, @Query() query: CheckInCalendarQueryDto) {
    return this.svc.getCalendar(req.user.id, query);
  }

  @Get("tasks/daily")
  @ApiOperation({ summary: "获取每日任务列表" })
  getDailyTasks(@Req() req: Request) {
    return this.svc.getDailyTasks(req.user.id);
  }

  @Post("tasks/:id/complete")
  @ApiOperation({ summary: "完成任务领积分" })
  completeTask(@Req() req: Request, @Param("id") taskId: string) {
    return this.svc.completeTask(req.user.id, taskId);
  }
}
