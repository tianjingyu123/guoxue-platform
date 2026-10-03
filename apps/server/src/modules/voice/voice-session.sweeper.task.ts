import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { VoiceSessionService } from "./voice-session.service";

/**
 * 语音会话超时清理：签发卡住、超过时长上限、等回调超时的会话按规则收尾。
 * 关闭页面不等于停费——这里负责兜住「用户没点挂断」的情况。
 */
@Injectable()
export class VoiceSessionSweeperTask {
  private readonly logger = new Logger(VoiceSessionSweeperTask.name);
  private running = false;

  constructor(private readonly sessions: VoiceSessionService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    if (this.running) return;
    this.running = true;
    try {
      const r = await this.sessions.sweep();
      if (r.released || r.ended || r.finalized) {
        this.logger.log(`语音会话清理：释放 ${r.released}，超时结束 ${r.ended}，等回调超时收尾 ${r.finalized}`);
      }
    } catch (error: any) {
      this.logger.warn(`语音会话清理失败：${error?.message || error}`);
    } finally {
      this.running = false;
    }
  }
}
