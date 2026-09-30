import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from "@nestjs/common";
import { IsBoolean, IsObject, IsString, MaxLength } from "class-validator";
import { Request } from "express";
import { SignedWgtControl } from "@guoxue/shared";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { RedLine, RedLineGate } from "../../common/red-lines";
import { WgtControlService } from "./wgt-control.service";
import { DistributionService } from "./distribution.service";
export class WgtSignedDto implements SignedWgtControl {
  @IsObject() payload: Record<string, unknown>;
  @IsString() @MaxLength(100) signature: string;
}
export class WgtEnableDto {
  @IsBoolean() enabled: boolean;
}
@Controller("system/wgt")
export class WgtControlPublicController {
  constructor(
    private readonly control: WgtControlService,
    private readonly distributions: DistributionService,
  ) {}
  @Get("trust/:clientKey")
  @Header("Cache-Control", "no-store")
  async trust(@Param("clientKey") key: string) {
    const registration = await this.distributions.resolve(key);
    return registration ? this.control.trustBundle(registration.applicationId) : { keys: [] };
  }
}
@Controller("system/wgt/admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class WgtControlController {
  constructor(private readonly control: WgtControlService) {}
  @Get() overview() {
    return this.control.overview();
  }
  @Post("keys")
  @Roles("SUPER_ADMIN")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "登记授权资源公钥", targetType: "WGT_CONTROL" })
  register(@Body() value: WgtSignedDto, @Req() req: Request) {
    return this.control.registerKey(value, req.user.id);
  }
  @Post("keys/:id/revoke")
  @Roles("SUPER_ADMIN")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "撤销资源公钥", targetType: "WGT_CONTROL" })
  revoke(@Param("id") id: string, @Req() req: Request) {
    return this.control.revokeKey(id, req.user.id);
  }
  @Post("distributions/:id/evidence")
  @Auditable({ action: "提交资源准入证据", targetType: "WGT_CONTROL" })
  submit(@Param("id") id: string, @Body() value: WgtSignedDto, @Req() req: Request) {
    return this.control.submitEvidence(id, value, req.user.id);
  }
  @Post("evidence/:id/approve")
  @Roles("SUPER_ADMIN")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "批准资源准入证据", targetType: "WGT_CONTROL" })
  approve(@Param("id") id: string, @Req() req: Request) {
    return this.control.approveEvidence(id, req.user.id);
  }
  @Post("distributions/:id/enable")
  @Roles("SUPER_ADMIN")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "调整渠道资源准入", targetType: "WGT_CONTROL" })
  enable(@Param("id") id: string, @Body() value: WgtEnableDto, @Req() req: Request) {
    return this.control.setEnabled(id, value.enabled, req.user.id);
  }
}
