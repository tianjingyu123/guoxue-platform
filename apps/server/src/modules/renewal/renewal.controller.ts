import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { RenewalService } from "./renewal.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("续费管理")
@Controller("renewal")
export class RenewalController {
  constructor(private readonly svc: RenewalService) {}

  @Get("my/entitlements")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的权益与有效期（所有角色统一视图）" })
  getMyEntitlements(@Req() req: Request) {
    return this.svc.getMyEntitlements((req.user as any).id);
  }

  @Get("my/history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "续费历史记录" })
  getMyRenewalHistory(
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getMyRenewalHistory((req.user as any).id, +page, +pageSize);
  }

  /** 管理员：即将到期用户 */
  @Get("admin/expiring-users")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取即将到期用户列表（30天内）" })
  getExpiringUsers() {
    return this.svc.getExpiringUsers();
  }

  /** 管理员：所有续费记录 */
  @Get("admin/history")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "管理员查看所有续费记录" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "type", required: false })
  getAdminHistory(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("type") type?: string,
  ) {
    return this.svc.getAdminHistory(+page, +pageSize, type);
  }
}
