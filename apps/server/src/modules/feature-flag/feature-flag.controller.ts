import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { FeatureFlagService } from "./feature-flag.service";
import { UpsertFeatureFlagDto } from "./feature-flag.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

// ═══════════════════ 管理后台接口 ═══════════════════

@ApiTags("功能开关")
@Controller("admin/feature-flags")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class FeatureFlagController {
  constructor(private readonly service: FeatureFlagService) {}

  @Get()
  @ApiOperation({ summary: "列出所有功能开关" })
  @ApiResponse({ status: 200, description: "成功" })
  async list() {
    return this.service.list();
  }

  @Get(":key")
  @ApiOperation({ summary: "获取单个功能开关" })
  @ApiResponse({ status: 200, description: "成功" })
  async get(@Param("key") key: string) {
    return this.service.getByKey(key);
  }

  @Post()
  @ApiOperation({ summary: "创建功能开关" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async create(@Body() dto: UpsertFeatureFlagDto & { key: string }) {
    return this.service.upsert(dto.key, dto);
  }

  @Put(":key")
  @ApiOperation({ summary: "创建或更新功能开关" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async upsert(@Param("key") key: string, @Body() dto: UpsertFeatureFlagDto) {
    return this.service.upsert(key, dto);
  }

  @Delete(":key")
  @ApiOperation({ summary: "删除功能开关" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async delete(@Param("key") key: string) {
    await this.service.delete(key);
    return { success: true };
  }
}

// ═══════════════════ 公开接口（前端检测功能开关） ═══════════════════

@ApiTags("公开配置")
@Controller("config")
export class FeatureFlagPublicController {
  constructor(private readonly service: FeatureFlagService) {}

  @Get("features")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取当前启用的功能列表（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getEnabledFeatures(@Req() req: any) {
    const userId = req.user?.id;
    const allFlags = await this.service.list();

    // 返回 { key: boolean } 映射供前端使用
    const features: Record<string, boolean> = {};
    for (const flag of allFlags) {
      features[flag.key] = await this.service.isEnabled(flag.key, userId);
    }

    return { features };
  }
}
