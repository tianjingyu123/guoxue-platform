import { Module } from "@nestjs/common";
import { ManagedTenancyController, ManagedApplicationController } from "./managed-tenancy.controller";
import { ManagedTenancyService } from "./managed-tenancy.service";
import { ManagedLeaseMaintenanceService } from "./managed-lease-maintenance.service";
import { ManagedSessionController } from "./managed-tenancy.controller";
@Module({ controllers: [ManagedTenancyController, ManagedApplicationController, ManagedSessionController], providers: [ManagedTenancyService, ManagedLeaseMaintenanceService], exports: [ManagedTenancyService] })
export class ManagedTenancyModule {}
