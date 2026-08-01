import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StationPaipanSyncService } from "./station-paipan-sync.service";

@ApiTags("旧排盘兼容")
@ApiBearerAuth()
@Controller("legacy-paipan")
export class LegacyPaipanController {
  constructor(private readonly service: StationPaipanSyncService) {}

  @Get("entry")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取首发期旧排盘 H5 签名入口" })
  @ApiResponse({ status: 200, description: "返回 legacy/native 模式与入口地址" })
  @ApiResponse({ status: 400, description: "用户尚未绑定手机号" })
  @ApiResponse({ status: 401, description: "未登录" })
  getEntry(@Req() req: Request) {
    return this.service.getUserEntry(req.user.id);
  }
}
