import { Module } from "@nestjs/common";
import { ImController } from "./im.controller";
import { ImCallbackController } from "./im-callback.controller";
import { ImService } from "./im.service";
import { TlsSigService } from "./tlssig.service";
import { ImPolicyService } from "./im-policy.service";
import { AuditModule } from "../audit/audit.module";
import { ImFallbackService } from "./im-fallback.service";

@Module({
  imports: [AuditModule],
  controllers: [ImController, ImCallbackController],
  providers: [ImService, TlsSigService, ImPolicyService, ImFallbackService],
  exports: [ImService, ImPolicyService, ImFallbackService],
})
export class ImModule {}
