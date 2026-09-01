import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { EntitlementService } from "./entitlement.service";
import { GrantEntitlementDto, RevokeEntitlementSourceDto } from "./entitlement.dto";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("统一权益")
@ApiBearerAuth()
@Controller("entitlements")
@UseGuards(JwtAuthGuard)
export class EntitlementController {
  constructor(private readonly entitlement: EntitlementService) {}

  @Get("me")
  @ApiOperation({ summary: "查询当前用户在热卜体系内的全部权益" })
  getMine(@Req() req: Request) {
    return this.entitlement.getMyEntitlements(req.user.id);
  }

  @Get("me/ledger")
  @ApiOperation({ summary: "查询当前用户权益变动记录" })
  getMyLedger(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 50) {
    return this.entitlement.getLedger(req.user.id, Number(page), Number(pageSize));
  }

  @Post("admin/grant")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "管理员幂等发放权益" })
  grant(@Body() dto: GrantEntitlementDto, @Req() req: Request) {
    return this.entitlement.grant({
      ...dto,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      sourceType: "ADMIN",
      sourceId: req.user.id,
      metadata: { operatorId: req.user.id },
    });
  }

  @Post("admin/revoke-source")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "管理员按来源冲正权益" })
  revokeSource(@Body() dto: RevokeEntitlementSourceDto) {
    return this.entitlement.revokeSource(dto.userId, dto.sourceType, dto.sourceId, dto.reason);
  }
}
