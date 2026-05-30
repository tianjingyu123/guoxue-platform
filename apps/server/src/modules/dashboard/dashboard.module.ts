import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { EntityDashboardService } from "./entity-dashboard.service";
import { RoleDashboardService } from "./role-dashboard.service";
import { CockpitController } from "./cockpit.controller";
import { CockpitService } from "./cockpit.service";
import { BigScreenController, BigScreenTokenController } from "./bigscreen.controller";
import { BigScreenService } from "./bigscreen.service";
import { BigScreenAuthService } from "./bigscreen-auth.service";
import { BigScreenAuthGuard } from "./bigscreen-auth.guard";
import { serverConfig } from "../../config/server-config";

@Module({
  imports: [JwtModule.register({ secret: serverConfig.jwtSecret })],
  controllers: [DashboardController, CockpitController, BigScreenController, BigScreenTokenController],
  providers: [DashboardService, EntityDashboardService, RoleDashboardService, CockpitService, BigScreenService, BigScreenAuthService, BigScreenAuthGuard],
})
export class DashboardModule {}
