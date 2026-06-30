import { Module } from "@nestjs/common";
import { TeacherService } from "./teacher.service";
import { TeacherController } from "./teacher.controller";
import { TeacherAdminController } from "./teacher-admin.controller";
import { SystemModule } from "../system/system.module";

@Module({
  imports: [SystemModule],
  controllers: [TeacherController, TeacherAdminController],
  providers: [TeacherService],
  exports: [TeacherService],
})
export class TeacherModule {}
