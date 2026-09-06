import { Module } from "@nestjs/common";
import { CircleCapabilityQuotaRepository } from "../circle/circle-capability-quota.repository";
import { ConsultMediaEvidenceService } from "./consult-media-evidence.service";

/** 回调证据独立模块，避免直播与咨询资金模块相互依赖。 */
@Module({ providers: [ConsultMediaEvidenceService, CircleCapabilityQuotaRepository], exports: [ConsultMediaEvidenceService] })
export class ConsultMediaEvidenceModule {}
