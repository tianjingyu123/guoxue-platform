import { Global, Module } from "@nestjs/common";
import { SystemController } from "./system.controller";
import { ImportController } from "./import.controller";
import { LegalController } from "./legal.controller";
import { VersionController } from "./version.controller";
import { SystemService } from "./system.service";
import { ExportService } from "./export.service";
import { ImportService } from "./import.service";
import { SystemTask } from "./system.task";
import { BackupController } from "./backup.controller";
import { BackupService } from "./backup.service";
import { PermissionController } from "./permission.controller";
import { PermissionService } from "./permission.service";
import { ThirdPartyConfigLoader } from "./third-party-config.loader";
import { OpsActionService } from "./ops-action.service";
import { AuditModule } from "../audit/audit.module";
import { FundApprovalCoreModule } from "../fund-approval/fund-approval-core.module";
import { DistributionService } from "./distribution.service";
import { DistributionController } from "./distribution.controller";
import { ResourceReleaseController } from "./resource-release.controller";
import { ResourceReleaseService } from "./resource-release.service";
import { WgtControlService } from "./wgt-control.service";
import { WgtControlController, WgtControlPublicController } from "./wgt-control.controller";

@Global()
@Module({
  imports: [AuditModule, FundApprovalCoreModule],
  controllers: [SystemController, ImportController, LegalController, VersionController, BackupController, PermissionController,
    DistributionController,
    ResourceReleaseController,
    WgtControlController, WgtControlPublicController,
  ],
  providers: [SystemService, ExportService, ImportService, SystemTask, BackupService, PermissionService, ThirdPartyConfigLoader, OpsActionService,
    DistributionService,
    ResourceReleaseService,
    WgtControlService,
  ],
  exports: [SystemService, ExportService, ImportService, PermissionService, ThirdPartyConfigLoader, OpsActionService,
    DistributionService,
  ],
})
export class SystemModule {}
