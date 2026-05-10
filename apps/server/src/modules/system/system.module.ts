import { Module } from "@nestjs/common";
import { SystemController } from "./system.controller";
import { ImportController } from "./import.controller";
import { SystemService } from "./system.service";
import { ExportService } from "./export.service";
import { ImportService } from "./import.service";
import { SystemTask } from "./system.task";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [SystemController, ImportController],
  providers: [SystemService, ExportService, ImportService, SystemTask],
  exports: [SystemService, ExportService, ImportService],
})
export class SystemModule {}
