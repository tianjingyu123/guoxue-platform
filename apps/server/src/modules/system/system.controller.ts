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
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { SystemService } from "./system.service";

@Controller("system")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get("configs")
  @UseGuards(JwtAuthGuard)
  async listConfigs() {
    const configs = await this.systemService.getAllConfigs();
    return { configs };
  }

  @Get("configs/:key")
  @UseGuards(JwtAuthGuard)
  async getConfig(@Param("key") key: string) {
    return this.systemService.getConfig(key);
  }

  @Put("configs/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
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
  async deleteConfig(@Param("key") key: string) {
    await this.systemService.deleteConfig(key);
    return { ok: true };
  }
}
