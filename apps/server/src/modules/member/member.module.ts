import { Module } from "@nestjs/common";
import { MemberController } from "./member.controller";
import { MemberService } from "./member.service";
import { MemberBenefitService } from "./member-benefit.service";
import { MemberGrantService } from "./member-grant.service";
import { FeatureFlagModule } from "../feature-flag/feature-flag.module";

@Module({
  imports: [FeatureFlagModule],
  controllers: [MemberController],
  providers: [MemberService, MemberBenefitService, MemberGrantService],
  exports: [MemberService, MemberBenefitService],
})
export class MemberModule {}
