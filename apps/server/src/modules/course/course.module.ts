import { Module } from "@nestjs/common";
import { CourseService } from "./course.service";
import { CourseController } from "./course.controller";
import { SystemModule } from "../system/system.module";
import { LiveModule } from "../live/live.module";

@Module({
  imports: [SystemModule, LiveModule],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
