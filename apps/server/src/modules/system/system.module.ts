import { Module } from "@nestjs/common";
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
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [SystemController, ImportController, LegalController, VersionController, BackupController],
  providers: [SystemService, ExportService, ImportService, SystemTask, BackupService],
  exports: [SystemService, ExportService, ImportService],
})
export class SystemModule {}
