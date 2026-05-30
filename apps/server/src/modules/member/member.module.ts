import { Module } from "@nestjs/common";
import { MemberController } from "./member.controller";
import { MemberService } from "./member.service";
import { PrismaService } from "../../prisma/prisma.service";
import { FeatureFlagModule } from "../feature-flag/feature-flag.module";

@Module({
  imports: [FeatureFlagModule],
  controllers: [MemberController],
  providers: [MemberService, PrismaService],
  exports: [MemberService],
})
export class MemberModule {}
