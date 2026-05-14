import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ShareService } from "./share.service";

@ApiTags("双轨分享")
@Controller("share")
export class ShareController {
  constructor(private svc: ShareService) {}

  @Get("config")
  @ApiOperation({ summary: "获取分享配置(title/desc/image/miniPath/h5Url/appId)" })
  getConfig(@Query("type") type: string, @Query("id") id: string) {
    return this.svc.getShareConfig(type, id);
  }
}
