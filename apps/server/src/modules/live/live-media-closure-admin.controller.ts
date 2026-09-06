import { Controller, Get, Header, Param, ParseUUIDPipe, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { LiveMediaClosureAdminService } from "./live-media-closure-admin.service";

@Controller("live/admin/media-closure")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class LiveMediaClosureAdminController {
  constructor(private readonly service: LiveMediaClosureAdminService) {}
  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  get(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Req() req: Request) {
    return this.service.get(id, req.user.id);
  }
}
