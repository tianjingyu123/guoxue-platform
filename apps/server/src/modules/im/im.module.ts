import { Module } from "@nestjs/common";
import { ImController } from "./im.controller";
import { ImCallbackController } from "./im-callback.controller";
import { ImService } from "./im.service";
import { TlsSigService } from "./tlssig.service";
import { ImPolicyService } from "./im-policy.service";

@Module({
  controllers: [ImController, ImCallbackController],
  providers: [ImService, TlsSigService, ImPolicyService],
  exports: [ImService, ImPolicyService],
})
export class ImModule {}
