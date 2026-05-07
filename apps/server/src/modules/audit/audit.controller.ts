import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("审计日志")
@ApiBearerAuth()
@Controller("audit")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private svc: AuditService) {}

  @Get()
  @ApiOperation({ summary: "查询操作审计日志" })
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  list(@Query() q: any) {
    return this.svc.list(q);
  }
}
