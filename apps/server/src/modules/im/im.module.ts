import { Module } from "@nestjs/common";
import { ImController } from "./im.controller";
import { ImService } from "./im.service";
import { TlsSigService } from "./tlssig.service";

@Module({
  controllers: [ImController],
  providers: [ImService, TlsSigService],
  exports: [ImService],
})
export class ImModule {}
