import { Controller, Get, Header, Param, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { NativePaipanQaGuard } from "../../common/paipan-runtime.service";
import { StationPaipanSyncService } from "./station-paipan-sync.service";

@ApiTags("旧排盘兼容")
@Controller("legacy-paipan")
export class LegacyPaipanController {
  constructor(private readonly service: StationPaipanSyncService) {}

  @Get("runtime")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "获取排盘运行模式（不返回 QA 配置）" })
  getRuntime() {
    return this.service.getRuntime();
  }

  @Get("entry")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取普通排盘服务端签名入口" })
  @ApiResponse({ status: 400, description: "用户尚未绑定手机号" })
  getEntry(@Req() req: Request) {
    return this.service.getUserEntry(req.user.id);
  }

  @Get("account")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取旧排盘个人中心服务端签名入口" })
  getAccount(@Req() req: Request) {
    return this.service.getUserAccountEntry(req.user.id);
  }

  @Get("station/:stationId/entry")
  @ApiOperation({ summary: "获取分站站长旧 userid 对应的推荐入口" })
  getStationEntry(@Param("stationId") stationId: string) {
    return this.service.getStationEntry(stationId);
  }

  @Get("station-sync/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getOwnStationSync(@Req() req: Request) {
    return this.service.getOwnSyncState(req.user.id);
  }

  @Post("station-sync/me/retry")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async retryOwnStationSync(@Req() req: Request) {
    await this.service.syncByUserId(req.user.id);
    return this.service.getOwnSyncState(req.user.id);
  }

  @Get("native-qa/access")
  @ApiExcludeEndpoint()
  @UseGuards(NativePaipanQaGuard)
  @Header("Cache-Control", "no-store")
  @Header("X-Robots-Tag", "noindex, nofollow, noarchive")
  @ApiOperation({ summary: "预发布自研排盘 QA 门禁探针" })
  getNativeQaAccess() {
    return { allowed: true as const };
  }
}
