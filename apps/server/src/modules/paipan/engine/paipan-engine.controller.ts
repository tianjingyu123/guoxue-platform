import { Body, Controller, HttpCode, Injectable, Param, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RedisThrottleGuard } from "../../../common/redis-throttle.guard";
import { RedisService } from "../../../redis/redis.service";
import { PaipanEngineService } from "./paipan-engine.service";

/**
 * 排盘引擎限流：每分钟 30 次（按可信用户/账号，否则按 IP）。
 * 比八字预览的 10 次宽松，够正常起课与翻看；批量抓取结果仍受限。
 */
@Injectable()
export class PaipanEngineThrottleGuard extends RedisThrottleGuard {
  constructor(redis: RedisService) {
    super(redis, 30, 60, "rate:paipan-engine", true);
  }
}

@ApiTags("排盘引擎")
@Controller("paipan/engine")
export class PaipanEngineController {
  constructor(private readonly engine: PaipanEngineService) {}

  /** 通用排盘计算（无需登录）。tool 见 engine-registry.ts */
  @Post(":tool")
  @HttpCode(200)
  @UseGuards(PaipanEngineThrottleGuard)
  @ApiOperation({ summary: "排盘计算（算法仅在服务端运行）" })
  compute(@Param("tool") tool: string, @Body() body: Record<string, unknown>) {
    return this.engine.run(tool, body);
  }
}
