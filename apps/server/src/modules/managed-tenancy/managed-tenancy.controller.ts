import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { ManagedTenancyService } from "./managed-tenancy.service";
import { check } from "./managed-policy";
import { ManagedLeaseMaintenanceService } from "./managed-lease-maintenance.service";

@Controller("admin/managed-customers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN")
export class ManagedTenancyController {
  constructor(private readonly service: ManagedTenancyService, private readonly maintenance: ManagedLeaseMaintenanceService) {}
  @Get() list() { return this.service.list(); }
  @Get(":id") detail(@Param("id") id: string) { return this.service.detail(id); }
  @Post() create(@Body() payload: unknown, @Req() req: Request) { return this.service.create(payload, req.user!.id); }
  @Post(":id/renew") renew(@Param("id") id: string, @Body() payload: Parameters<ManagedTenancyService["renew"]>[1], @Req() req: Request) { return this.service.renew(id, payload, req.user!.id); }
  @Post(":id/membership") membership(@Param("id") id: string, @Body() payload: Parameters<ManagedTenancyService["membership"]>[1], @Req() req: Request) { return this.service.membership(id, payload, req.user!.id); }
  @Post(":id/grant") grant(@Param("id") id: string, @Body() payload: Parameters<ManagedTenancyService["updateGrant"]>[1], @Req() req: Request) { return this.service.updateGrant(id, payload, req.user!.id); }
  @Post(":id/verify-deployment") verify(@Param("id") id: string, @Body() payload: Parameters<ManagedLeaseMaintenanceService["verify"]>[1], @Req() req: Request) { return this.maintenance.verify(id, payload, req.user!.id); }
  @Post("applications/:id/enable") enable(@Param("id") id: string, @Body() payload: { reason: string }, @Req() req: Request) {
    check(payload && Object.keys(payload).every(key => key === "reason"), "启用请求包含未知字段");
    return this.service.enableApplication(id, req.user!.id, payload.reason);
  }
  @Post("applications/:id/disable") disable(@Param("id") id: string, @Body() payload: { reason: string }, @Req() req: Request) {
    check(payload && Object.keys(payload).every(key => key === "reason"), "暂停请求包含未知字段");
    return this.service.disableApplication(id, req.user!.id, payload.reason);
  }
}
@Controller("managed/application")
export class ManagedApplicationController {
  constructor(private readonly service: ManagedTenancyService) {}
  @Get(":clientKey") publicConfig(@Param("clientKey") clientKey: string) { return this.service.publicApplication(clientKey); }
}
@Controller("managed/session")
@UseGuards(JwtAuthGuard)
export class ManagedSessionController {
  constructor(private readonly maintenance: ManagedLeaseMaintenanceService) {}
  @Post(":clientKey") session(@Param("clientKey") clientKey: string, @Body() body: unknown, @Req() req: Request) {
    check(body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length === 0, "会话请求不接受指定用户、角色或数据空间");
    return this.maintenance.session(clientKey, req.user!.id);
  }
}
