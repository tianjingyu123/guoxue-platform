import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { SystemService } from "./system.service";

@ApiTags("系统配置")
@Controller("system")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get("configs")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取所有系统配置" })
  @ApiBearerAuth()
  async listConfigs() {
    const configs = await this.systemService.getAllConfigs();
    return { configs };
  }

  @Get("configs/:key")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取单个系统配置" })
  @ApiBearerAuth()
  async getConfig(@Param("key") key: string) {
    return this.systemService.getConfig(key);
  }

  @Put("configs/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新系统配置" })
  @ApiBearerAuth()
  async setConfig(
    @Param("key") key: string,
    @Body() body: { value: string; description?: string },
    @Req() req: any,
  ) {
    const updatedBy = req.user?.nickname || req.user?.id;
    return this.systemService.setConfig(key, body.value, body.description, updatedBy);
  }

  @Delete("configs/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除系统配置" })
  @ApiBearerAuth()
  async deleteConfig(@Param("key") key: string) {
    await this.systemService.deleteConfig(key);
    return { ok: true };
  }

  /** 公开接口：获取首页 Banner */
  @Get("public/banners")
  @ApiOperation({ summary: "获取首页Banner（公开）" })
  async getPublicBanners() {
    const config = await this.systemService.getConfig("home_banners");
    if (!config) return { banners: [] };
    try {
      return { banners: JSON.parse(config.configValue) };
    } catch {
      return { banners: [] };
    }
  }
}
