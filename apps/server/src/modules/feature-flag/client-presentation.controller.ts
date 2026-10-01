import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { IsObject, IsString, MaxLength, MinLength } from "class-validator";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { RedLine, RedLineGate } from "../../common/red-lines";
import { ClientPresentationService } from "./client-presentation.service";
import { FeatureFlagService } from "./feature-flag.service";
import { FeaturePreviewContextDto } from "./feature-flag.dto";
class ReasonDto {
  @IsString() @MinLength(2) @MaxLength(500) reason: string;
}
class DraftDto extends ReasonDto {
  @IsObject() payload: Record<string, unknown>;
}
@Controller("admin/client-presentation")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class ClientPresentationController {
  constructor(
    private readonly service: ClientPresentationService,
    private readonly features: FeatureFlagService,
  ) {}
  @Get() history() {
    return this.service.history();
  }
  @Get("capabilities") capabilities() {
    return this.service.capabilityHistory();
  }
  @Post("capabilities")
  @Roles("SUPER_ADMIN")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "登记完整包客户端能力清单", targetType: "CLIENT_CAPABILITY" })
  registerCapabilities(@Body() dto: DraftDto, @Req() req: Request) {
    return this.service.registerCapabilities(dto.payload, req.user!.id, dto.reason);
  }
  @Post("draft")
  @Auditable({ action: "保存包内声明式运营草稿", targetType: "CLIENT_PRESENTATION" })
  draft(@Body() dto: DraftDto, @Req() req: Request) {
    return this.service.saveDraft(dto.payload, dto.reason, req.user!.id);
  }
  @Get("draft/:id/preview")
  async preview(@Param("id") id: string, @Query() context: FeaturePreviewContextDto) {
    return this.service.preview(
      id,
      await this.features.requestScope({ headers: { "x-app-client": context.clientKey } }),
      context.nativeBuild || "",
      context.resourceVersion || "0",
      context.userId,
    );
  }
  @Post("draft/:id/publish")
  @Roles("SUPER_ADMIN")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "发布包内声明式运营配置", targetType: "CLIENT_PRESENTATION" })
  publish(@Param("id") id: string, @Body() dto: ReasonDto, @Req() req: Request) {
    return this.service.publish(id, req.user!.id, dto.reason);
  }
  @Post("rollback/:version")
  @Roles("SUPER_ADMIN")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "回退包内声明式运营配置", targetType: "CLIENT_PRESENTATION" })
  rollback(
    @Param("version", ParseIntPipe) version: number,
    @Body() dto: ReasonDto,
    @Req() req: Request,
  ) {
    return this.service.rollback(version, req.user!.id, dto.reason);
  }
}
