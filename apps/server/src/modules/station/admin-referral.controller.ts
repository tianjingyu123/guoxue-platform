import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { AdminReferralService } from "./admin-referral.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CreateTempReferralDto, UpdateTempReferralDto } from "./dto/admin-referral.dto";

@ApiTags("临时推荐管理")
@Controller("admin/referral")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminReferralController {
  constructor(private readonly svc: AdminReferralService) {}

  @Post("temp-configs")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建临时推荐配置" })
  create(@Body() dto: CreateTempReferralDto, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string };
    return this.svc.create(dto, u?.nickname || u?.id);
  }

  @Get("temp-configs")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "临时推荐配置列表" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  list(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.list(+page, +pageSize);
  }

  @Get("temp-configs/active")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "当前生效的临时配置" })
  getActive() {
    return this.svc.getActive();
  }

  @Get("temp-configs/history")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "历史配置记录" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getHistory(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getHistory(+page, +pageSize);
  }

  @Get("temp-configs/:id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "配置详情" })
  get(@Param("id") id: string) {
    return this.svc.get(id);
  }

  @Put("temp-configs/:id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新临时推荐配置" })
  update(@Param("id") id: string, @Body() dto: UpdateTempReferralDto) {
    return this.svc.update(id, dto);
  }

  @Delete("temp-configs/:id")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除临时推荐配置" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }
}
