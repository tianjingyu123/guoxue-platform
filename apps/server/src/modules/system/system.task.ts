import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ExportService } from "./export.service";

/** 系统级定时任务 */
@Injectable()
export class SystemTask {
  private readonly logger = new Logger(SystemTask.name);

  constructor(private readonly exportService: ExportService) {}

  /** 每小时清理过期临时文件 */
  @Cron("0 * * * *")
  handleTmpCleanup() {
    this.logger.debug("执行临时文件清理...");
    this.exportService.cleanTmpFiles();
  }
}
