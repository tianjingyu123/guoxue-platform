import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RedLine, RedLineGate, RedLineGuard, resolveExecutorType } from "../../common/red-lines";
import { CircleCapabilityService } from "./circle-capability.service";
import { ApplyCircleCapabilityDto, CircleCapabilityQueryDto, DirectCircleCapabilityContextDto, DirectCircleCapabilityDto, EnableCircleCapabilityDto, ListCircleCapabilitiesDto, ReviewCircleCapabilityDto } from "./circle-capability.dto";

@ApiTags("圈内独立能力授权")
@ApiBearerAuth()
@Controller("circle-capabilities")
@UseGuards(JwtAuthGuard, RedLineGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class CircleCapabilityController {
  constructor(private readonly capabilities: CircleCapabilityService) {}
  private actor(req: Request) { return { userId: req.user.id, executor: resolveExecutorType(req) }; }

  @Get("circles/:circleId/eligibility")
  @Header("Cache-Control", "private, no-store")
  eligibility(@Param("circleId", new ParseUUIDPipe({ version: "4" })) circleId: string, @Req() req: Request, @Query() query: CircleCapabilityQueryDto) {
    return this.capabilities.getEligibility(circleId, this.actor(req), query.capability);
  }

  @Get("circles/:circleId/use-status")
  @Header("Cache-Control", "private, no-store")
  useStatus(@Param("circleId", new ParseUUIDPipe({ version: "4" })) circleId: string, @Req() req: Request, @Query() query: CircleCapabilityQueryDto) {
    return this.capabilities.getPublishUseStatus(circleId, this.actor(req), query.capability);
  }

  @Get("circles/:circleId/application-context")
  @Header("Cache-Control", "private, no-store")
  applicationContext(@Param("circleId", new ParseUUIDPipe({ version: "4" })) circleId: string, @Req() req: Request, @Query() query: DirectCircleCapabilityContextDto) {
    return this.capabilities.applicationContext(circleId, this.actor(req), query.capability, query.subjectUserId);
  }

  @Get("circles/:circleId/current")
  @Header("Cache-Control", "private, no-store")
  current(@Param("circleId", new ParseUUIDPipe({ version: "4" })) circleId: string, @Req() req: Request, @Query() query: CircleCapabilityQueryDto) {
    return this.capabilities.currentOwn(circleId, this.actor(req), query.capability);
  }

  @Post("circles/:circleId/applications")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  apply(@Param("circleId", new ParseUUIDPipe({ version: "4" })) circleId: string, @Req() req: Request, @Body() dto: ApplyCircleCapabilityDto) {
    return this.capabilities.apply(circleId, this.actor(req), dto);
  }

  @Get("circles/:circleId/grants")
  @Header("Cache-Control", "private, no-store")
  listOwn(@Param("circleId", new ParseUUIDPipe({ version: "4" })) circleId: string, @Req() req: Request, @Query() query: ListCircleCapabilitiesDto) {
    return this.capabilities.listOwn(circleId, this.actor(req), query);
  }

  @Get("admin/grants")
  @Header("Cache-Control", "private, no-store")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  listAdmin(@Req() req: Request, @Query() query: ListCircleCapabilitiesDto) {
    return this.capabilities.listAdmin(this.actor(req), query);
  }

  @Post("admin/grants/:id/review")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  review(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Req() req: Request, @Body() dto: ReviewCircleCapabilityDto) {
    return this.capabilities.review(id, this.actor(req), dto);
  }

  @Post("admin/circles/:circleId/direct-grants")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  directGrant(@Param("circleId", new ParseUUIDPipe({ version: "4" })) circleId: string, @Req() req: Request, @Body() dto: DirectCircleCapabilityDto) {
    return this.capabilities.directGrant(circleId, this.actor(req), dto);
  }

  @Get("admin/circles/:circleId/direct-grant-context")
  @Header("Cache-Control", "private, no-store")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  directGrantContext(@Param("circleId", new ParseUUIDPipe({ version: "4" })) circleId: string, @Req() req: Request, @Query() query: DirectCircleCapabilityContextDto) {
    return this.capabilities.directGrantContext(circleId, this.actor(req), query.capability, query.subjectUserId);
  }

  @Post("grants/:id/enabled")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  setEnabled(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Req() req: Request, @Body() dto: EnableCircleCapabilityDto) {
    return this.capabilities.setEnabled(id, this.actor(req), dto);
  }
}
