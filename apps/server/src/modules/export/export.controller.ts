import { Controller, Get, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request, Response } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { ExportService } from "./export.service";
import { SkipFormat } from "../../common/skip-format.decorator";

@ApiTags("数据导出")
@ApiBearerAuth()
@Controller("export")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
export class ExportController {
  constructor(private exportSvc: ExportService) {}

  @Get("users/csv")
  @SkipFormat()
  @ApiOperation({ summary: "导出用户列表 CSV" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "keyword", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  async exportUsers(
    @Query("status") status?: string,
    @Query("keyword") keyword?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ) {
    const csv = await this.exportSvc.exportUsers({ status, keyword, startDate, endDate }, req?.user?.id);
    res!.setHeader("Content-Type", "text/csv; charset=utf-8");
    res!.setHeader("Content-Disposition", `attachment; filename="users_${Date.now()}.csv"`);
    res!.send(csv);
  }

  @Get("orders/csv")
  @SkipFormat()
  @ApiOperation({ summary: "导出订单列表 CSV" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  async exportOrders(
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ) {
    const csv = await this.exportSvc.exportOrders({ status, type, startDate, endDate }, req?.user?.id);
    res!.setHeader("Content-Type", "text/csv; charset=utf-8");
    res!.setHeader("Content-Disposition", `attachment; filename="orders_${Date.now()}.csv"`);
    res!.send(csv);
  }

  @Get("courses/csv")
  @SkipFormat()
  @ApiOperation({ summary: "导出课程列表 CSV" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "auditStatus", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  async exportCourses(
    @Query("auditStatus") auditStatus?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ) {
    const csv = await this.exportSvc.exportCourses({ auditStatus, startDate, endDate }, req?.user?.id);
    res!.setHeader("Content-Type", "text/csv; charset=utf-8");
    res!.setHeader("Content-Disposition", `attachment; filename="courses_${Date.now()}.csv"`);
    res!.send(csv);
  }

  @Get("articles/csv")
  @SkipFormat()
  @ApiOperation({ summary: "导出文章列表 CSV" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "auditStatus", required: false })
  @ApiQuery({ name: "circleId", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  async exportArticles(
    @Query("auditStatus") auditStatus?: string,
    @Query("circleId") circleId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ) {
    const csv = await this.exportSvc.exportArticles({ auditStatus, circleId, startDate, endDate }, req?.user?.id);
    res!.setHeader("Content-Type", "text/csv; charset=utf-8");
    res!.setHeader("Content-Disposition", `attachment; filename="articles_${Date.now()}.csv"`);
    res!.send(csv);
  }

  @Get("withdrawals/csv")
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @SkipFormat()
  @ApiOperation({ summary: "导出提现记录 CSV" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  async exportWithdrawals(
    @Query("status") status?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ) {
    const csv = await this.exportSvc.exportWithdrawals({ status, startDate, endDate }, req?.user?.id);
    res!.setHeader("Content-Type", "text/csv; charset=utf-8");
    res!.setHeader("Content-Disposition", `attachment; filename="withdrawals_${Date.now()}.csv"`);
    res!.send(csv);
  }
}
