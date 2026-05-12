import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FeatureFlagService } from "./feature-flag.service";
import { UpsertFeatureFlagDto } from "./feature-flag.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("功能开关")
@Controller("admin/feature-flags")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class FeatureFlagController {
  constructor(private readonly service: FeatureFlagService) {}

  @Get()
  @ApiOperation({ summary: "列出所有功能开关" })
  async list() {
    return this.service.list();
  }

  @Get(":key")
  @ApiOperation({ summary: "获取单个功能开关" })
  async get(@Param("key") key: string) {
    return this.service.getByKey(key);
  }

  @Post()
  @ApiOperation({ summary: "创建功能开关" })
  async create(@Body() dto: UpsertFeatureFlagDto & { key: string }) {
    return this.service.upsert(dto.key, dto);
  }

  @Put(":key")
  @ApiOperation({ summary: "创建或更新功能开关" })
  async upsert(@Param("key") key: string, @Body() dto: UpsertFeatureFlagDto) {
    return this.service.upsert(key, dto);
  }

  @Delete(":key")
  @ApiOperation({ summary: "删除功能开关" })
  async delete(@Param("key") key: string) {
    await this.service.delete(key);
    return { success: true };
  }
}
