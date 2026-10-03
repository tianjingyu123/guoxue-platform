import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { UpdateTeenModeDto } from "./dto/teen-mode.dto";
import { TeenModeService } from "./teen-mode.service";

@ApiTags("未成年人模式")
@Controller("users/me")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeenModeController {
  constructor(private readonly svc: TeenModeService) {}

  @Get("teen-mode")
  @ApiOperation({ summary: "获取未成年人模式可用状态" })
  @ApiResponse({ status: 200, description: "成功" })
  getSettings(@Req() req: Request) {
    return this.svc.getSettings(req.user.id);
  }

  @Put("teen-mode")
  @ApiOperation({ summary: "更新未成年人模式状态（当前仅允许关闭旧状态）" })
  @ApiResponse({ status: 200, description: "关闭成功" })
  @ApiResponse({ status: 400, description: "完整保护能力上线前不可开启" })
  updateSettings(@Req() req: Request, @Body() dto: UpdateTeenModeDto) {
    return this.svc.updateSettings(req.user.id, dto);
  }
}
