import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Request } from "express";
import { ResourceManifest } from "@guoxue/shared";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";
import { ResourceReleaseService } from "./resource-release.service";

export class ResourceCheckDto {
  @IsString() @MaxLength(80) clientKey: string;
  @Type(() => Number) @IsInt() @Min(1) nativeBuild: number;
  @Type(() => Number) @IsInt() @Min(0) resourceVersion: number;
}
export class ResourceDraftDto {
  @IsObject() manifest: ResourceManifest;
  @IsString() @MaxLength(100) signature: string;
  @IsInt() @Min(0) @Max(100) rolloutPercentage: number;
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) targetUserIds?: string[];
}
@Controller("system/resources")
export class ResourceReleaseController {
  constructor(private readonly service: ResourceReleaseService) {}
  @Get("check")
  @Header("Cache-Control", "private, no-store")
  @UseGuards(OptionalAuthGuard)
  async check(@Query() q: ResourceCheckDto, @Req() req: Request) {
    return {
      update: await this.service.check(q.clientKey, q.nativeBuild, q.resourceVersion, req.user?.id),
    };
  }
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  list() {
    return this.service.list();
  }
  @Post("draft")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @Auditable({ action: "创建签名资源草稿", targetType: "RESOURCE_RELEASE" })
  draft(@Body() dto: ResourceDraftDto) {
    return this.service.draft(dto);
  }
  @Post(":id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "发布签名资源", targetType: "RESOURCE_RELEASE" })
  publish(@Param("id") id: string, @Req() req: Request) {
    return this.service.activate(id, req.user.id);
  }
  @Post(":id/rollback")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "回退资源分发", targetType: "RESOURCE_RELEASE" })
  rollback(@Param("id") id: string, @Req() req: Request) {
    return this.service.activate(id, req.user.id, true);
  }
  @Post(":id/retire")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "停发资源版本", targetType: "RESOURCE_RELEASE" })
  retire(@Param("id") id: string) {
    return this.service.retire(id);
  }
}
