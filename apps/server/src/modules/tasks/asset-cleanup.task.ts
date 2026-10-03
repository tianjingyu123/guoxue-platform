import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AudioAssetService } from "../tts/audio-asset.service";

/**
 * 派生资产清理任务：定时清理失败的音频资产
 */
@Injectable()
export class AssetCleanupTask {
  private readonly logger = new Logger(AssetCleanupTask.name);

  constructor(private audioAssetService: AudioAssetService) {}

  /**
   * 每小时清理一次失败的音频资产（超过 1 小时仍在 synthesizing 状态）
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupFailedAudioAssets() {
    this.logger.log("开始清理失败的音频资产");
    try {
      const count = await this.audioAssetService.cleanupFailedAssets();
      if (count > 0) {
        this.logger.log(`清理失败音频资产完成: ${count} 条`);
      }
    } catch (error: any) {
      this.logger.error(
        `清理失败音频资产出错: ${error?.message || error}`,
      );
    }
  }
}
