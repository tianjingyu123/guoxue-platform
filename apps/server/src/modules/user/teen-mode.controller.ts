import { Controller, Get, Put, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { TeenModeService } from "./teen-mode.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { UpdateTeenModeDto } from "./dto/teen-mode.dto";

@ApiTags("青少年模式")
@Controller("users/me")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeenModeController {
  constructor(private readonly svc: TeenModeService) {}

  @Get("teen-mode")
  @ApiOperation({ summary: "获取青少年模式设置" })
  getSettings(@Req() req: Request) {
    return this.svc.getSettings(req.user.id);
  }

  @Put("teen-mode")
  @ApiOperation({ summary: "更新青少年模式设置" })
  updateSettings(@Req() req: Request, @Body() dto: UpdateTeenModeDto) {
    return this.svc.updateSettings(req.user.id, dto);
  }
}
