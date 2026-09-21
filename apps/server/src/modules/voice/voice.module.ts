import { Module } from "@nestjs/common";
import { VoiceQuotaService } from "./voice-quota.service";
import { VoiceAgentProfileService } from "./voice-agent-profile.service";
import { AdminVoiceAgentController, CircleVoiceAgentController } from "./voice-agent-profile.controller";
import { VoiceAdminController } from "./voice-admin.controller";
import { VoiceUserController } from "./voice-user.controller";
import { VoiceTrialService } from "./voice-trial.service";
import { XiaobuMcpServer } from "./xiaobu-mcp-server";
import { XiaozhiMcpBridgeService } from "./xiaozhi-mcp-bridge.service";
import { SearchModule } from "../search/search.module";

/**
 * 小卜语音（S01/S02/S10）：语音角色申请审核、额度与用量账本、运营统计、小智 MCP 公开知识工具。
 * 语音会话接口待小智商业接口文档到位后再暴露；当前不提供开始/结束通话的对外接口。
 */
@Module({
  imports: [SearchModule],
  controllers: [CircleVoiceAgentController, AdminVoiceAgentController, VoiceAdminController, VoiceUserController],
  providers: [VoiceQuotaService, VoiceTrialService, VoiceAgentProfileService, XiaobuMcpServer, XiaozhiMcpBridgeService],
  exports: [VoiceQuotaService, VoiceTrialService, VoiceAgentProfileService, XiaobuMcpServer],
})
export class VoiceModule {}
