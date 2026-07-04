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
import { DashboardDailyController } from "./dashboard-daily.controller";
import { DashboardDailyService } from "./dashboard-daily.service";
import { DailyBriefController } from "./daily-brief.controller";
import { DailyBriefService } from "./daily-brief.service";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { serverConfig } from "../../config/server-config";

@Module({
  imports: [JwtModule.register({ secret: serverConfig.jwtSecret }), AiGatewayModule],
  controllers: [DashboardController, CockpitController, BigScreenController, BigScreenTokenController, DashboardDailyController, DailyBriefController],
  providers: [DashboardService, EntityDashboardService, RoleDashboardService, CockpitService, BigScreenService, BigScreenAuthService, BigScreenAuthGuard, DashboardDailyService, DailyBriefService],
})
export class DashboardModule {}
