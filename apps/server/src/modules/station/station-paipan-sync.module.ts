import { Module } from "@nestjs/common";
import { NativePaipanGuard, NativePaipanQaGuard, PaipanRuntimeService } from "../../common/paipan-runtime.service";
import { StationPaipanSyncService } from "./station-paipan-sync.service";

/** 独立小模块供 Station 与 Shop 复用，避免 Station→Marketing→Shop 的循环依赖。 */
@Module({
  providers: [PaipanRuntimeService, NativePaipanGuard, NativePaipanQaGuard, StationPaipanSyncService],
  exports: [PaipanRuntimeService, NativePaipanGuard, NativePaipanQaGuard, StationPaipanSyncService],
})
export class StationPaipanSyncModule {}
