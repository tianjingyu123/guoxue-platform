import { Controller, Get, Post, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { SentinelService } from "./sentinel.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";

/**
 * 业务哨兵告警（O-T1·admin）。
 * 告警由 SentinelService 每 5 分钟巡检自动产生/自动恢复，本控制器只做查看与人工处置。
 */
@ApiTags("业务哨兵")
@ApiBearerAuth()
@Controller("sentinel")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class SentinelController {
  constructor(private readonly svc: SentinelService) {}

  @Get("alerts")
  @ApiOperation({ summary: "告警分页列表（status=open|resolved 缺省全部·可按 level/rule 过滤·附 openCount）" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, description: "open|resolved" })
  @ApiQuery({ name: "level", required: false, description: "P1|P2|P3" })
  @ApiQuery({ name: "rule", required: false })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
    @Query("level") level?: string,
    @Query("rule") rule?: string,
  ) {
    return this.svc.listAlerts({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      status,
      level,
      rule,
    });
  }

  @Post("alerts/:id/resolve")
  @Auditable({ action: "哨兵告警手动解除", targetType: "SENTINEL_ALERT" })
  @ApiOperation({ summary: "手动解除告警（幂等·已解除的返回 already=true）" })
  @ApiResponse({ status: 201, description: "已解除" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "告警不存在" })
  resolve(@Param("id") id: string) {
    return this.svc.resolveAlert(id);
  }

  @Post("patrol")
  @Roles("SUPER_ADMIN")
  @Auditable({ action: "哨兵手动巡检", targetType: "SENTINEL" })
  @ApiOperation({ summary: "立即执行一轮巡检（验证联通/紧急核实用·与 cron 同款去重恢复语义）" })
  @ApiResponse({ status: 201, description: "巡检完成，返回本轮新告警/恢复数" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  patrol() {
    return this.svc.runPatrol();
  }
}
