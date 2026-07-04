import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { RedisService } from "../../redis/redis.service";
import { ExportService } from "./export.service";

/** 系统级定时任务 */
@Injectable()
export class SystemTask {
  private readonly logger = new Logger(SystemTask.name);

  constructor(
    private readonly exportService: ExportService,
    private readonly redis: RedisService,
  ) {}

  /** 每小时清理过期临时文件（分布式锁防多实例重复执行） */
  @Cron("0 * * * *")
  async handleTmpCleanup() {
    await this.redis.runExclusive("system_tmp_cleanup", 600, async () => {
      this.logger.debug("执行临时文件清理...");
      this.exportService.cleanTmpFiles();
    });
  }
}
