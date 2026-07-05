import { Module } from "@nestjs/common";
import { CourseService } from "./course.service";
import { CourseRecommendService } from "./course-recommend.service";
import { CourseAdminService } from "./course-admin.service";
import { CourseCreatorService } from "./course-creator.service";
import { CourseController } from "./course.controller";
import { CourseAdminController } from "./course-admin.controller";
import { CourseSchedulerService } from "./course-scheduler.service";
import { MemberGuard } from "../../common/member.guard";
import { CourseCreatorGuard } from "../../common/course-creator.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { SystemModule } from "../system/system.module";
import { LiveModule } from "../live/live.module";
import { NotificationModule } from "../notification/notification.module";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { PricingModule } from "../pricing/pricing.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [SystemModule, LiveModule, NotificationModule, AiGatewayModule, PricingModule, AuditModule],
  controllers: [CourseController, CourseAdminController],
  providers: [CourseService, CourseRecommendService, CourseAdminService, CourseCreatorService, CourseSchedulerService, MemberGuard, CourseCreatorGuard, StationIsolationGuard],
  exports: [CourseService],
})
export class CourseModule {}
