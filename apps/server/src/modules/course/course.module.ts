import { Module } from "@nestjs/common";
import { CourseService } from "./course.service";
import { CourseRecommendService } from "./course-recommend.service";
import { CourseAdminService } from "./course-admin.service";
import { CourseCreatorService } from "./course-creator.service";
import { CoursePurchaseService } from "./course-purchase.service";
import { CourseLearningService } from "./course-learning.service";
import { CourseWorkService } from "./course-work.service";
import { CourseReviewQaService } from "./course-review-qa.service";
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
import { ShopModule } from "../shop/shop.module";

@Module({
  imports: [SystemModule, LiveModule, NotificationModule, AiGatewayModule, PricingModule, AuditModule, ShopModule],
  controllers: [CourseController, CourseAdminController],
  providers: [CourseService, CourseRecommendService, CourseAdminService, CourseCreatorService, CoursePurchaseService, CourseLearningService, CourseWorkService, CourseReviewQaService, CourseSchedulerService, MemberGuard, CourseCreatorGuard, StationIsolationGuard],
  exports: [CourseService],
})
export class CourseModule {}
