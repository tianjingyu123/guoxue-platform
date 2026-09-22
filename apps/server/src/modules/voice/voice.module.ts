import { Module } from "@nestjs/common";
import { VoiceQuotaService } from "./voice-quota.service";
import { VoiceAgentProfileService } from "./voice-agent-profile.service";
import { AdminVoiceAgentController, CircleVoiceAgentController } from "./voice-agent-profile.controller";
import { VoiceAdminController } from "./voice-admin.controller";
import { VoiceUserController } from "./voice-user.controller";
import { VoiceTrialService } from "./voice-trial.service";
import { XiaobuMcpServer } from "./xiaobu-mcp-server";
import { XiaobuCommerceService } from "./xiaobu-commerce.service";
import { XiaozhiMcpBridgeService } from "./xiaozhi-mcp-bridge.service";
import { SearchModule } from "../search/search.module";
import { VoiceContextBuilder } from "./voice-context.builder";
import { VoiceSessionService } from "./voice-session.service";
import { VoiceProviderCallbackController, VoiceSessionController } from "./voice-session.controller";
import { VoiceSessionSweeperTask } from "./voice-session.sweeper.task";
import { VoiceDeviceService } from "./voice-device.service";
import { VoiceDeviceAdminController, VoiceDeviceController } from "./voice-device.controller";
import { VOICE_PROVIDER } from "./provider/voice-provider.types";
import { createVoiceProvider } from "./provider/voice-provider.registry";
import { XiaozhiLinkService } from "./xiaozhi/xiaozhi-link.service";
import { VoiceDeviceHandoffService } from "./voice-device-handoff.service";
import { XiaozhiGatewayService } from "./xiaozhi/xiaozhi-gateway.service";
import { XiaozhiActivateController, XiaozhiOtaController, XiaozhiTerminalAdminController } from "./xiaozhi/xiaozhi-ota.controller";

/**
 * 小卜语音（S01/S02/S06/S07/S09/S10）：语音角色申请审核、额度与用量账本、运营统计、小智 MCP 公开知识工具、
 * 实时语音会话编排（供应商适配边界）与硬件设备台账。
 *
 * 实时语音供应商默认是 UnavailableXiaozhiProvider（暂未开放）；小智商业适配器待商业 API 文档到位后实现，
 * 替换 VOICE_PROVIDER 即可，页面与业务逻辑不改。
 *
 * 小智协议终端（xiaozhi/）：「热卜主业务、小智协议终端」——开源固件设备经 OTA/激活/WebSocket 接入热卜，
 * 会话、权限、额度、计费仍走本模块的会话编排；语音能力经 VOICE_PROVIDER 的设备中继提供。
 */
@Module({
  imports: [SearchModule],
  controllers: [
    CircleVoiceAgentController,
    AdminVoiceAgentController,
    VoiceAdminController,
    VoiceUserController,
    VoiceSessionController,
    VoiceProviderCallbackController,
    VoiceDeviceController,
    VoiceDeviceAdminController,
    XiaozhiOtaController,
    XiaozhiActivateController,
    XiaozhiTerminalAdminController,
  ],
  providers: [
    VoiceQuotaService,
    VoiceTrialService,
    VoiceAgentProfileService,
    XiaobuMcpServer,
    XiaobuCommerceService,
    XiaozhiMcpBridgeService,
    VoiceContextBuilder,
    VoiceDeviceService,
    VoiceSessionService,
    VoiceSessionSweeperTask,
    XiaozhiLinkService,
    VoiceDeviceHandoffService,
    XiaozhiGatewayService,
    { provide: VOICE_PROVIDER, useFactory: () => createVoiceProvider() },
  ],
  exports: [VoiceQuotaService, VoiceTrialService, VoiceAgentProfileService, XiaobuMcpServer, XiaobuCommerceService, VoiceSessionService, VoiceDeviceService],
})
export class VoiceModule {}
