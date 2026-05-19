import { Module } from "@nestjs/common";
import { CourseService } from "./course.service";
import { CourseController } from "./course.controller";
import { CourseSchedulerService } from "./course-scheduler.service";
import { SystemModule } from "../system/system.module";
import { LiveModule } from "../live/live.module";
import { NotificationModule } from "../notification/notification.module";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";

@Module({
  imports: [SystemModule, LiveModule, NotificationModule, AiGatewayModule],
  controllers: [CourseController],
  providers: [CourseService, CourseSchedulerService],
  exports: [CourseService],
})
export class CourseModule {}
