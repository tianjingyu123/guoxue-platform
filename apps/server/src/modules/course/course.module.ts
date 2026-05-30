import { Module } from "@nestjs/common";
import { CourseService } from "./course.service";
import { CourseController } from "./course.controller";
import { CourseAdminController } from "./course-admin.controller";
import { CourseSchedulerService } from "./course-scheduler.service";
import { MemberGuard } from "../../common/member.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { SystemModule } from "../system/system.module";
import { LiveModule } from "../live/live.module";
import { NotificationModule } from "../notification/notification.module";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";

@Module({
  imports: [SystemModule, LiveModule, NotificationModule, AiGatewayModule],
  controllers: [CourseController, CourseAdminController],
  providers: [CourseService, CourseSchedulerService, MemberGuard, StationIsolationGuard],
  exports: [CourseService],
})
export class CourseModule {}
