import { Module } from "@nestjs/common";
import { RenewalController } from "./renewal.controller";
import { RenewalService } from "./renewal.service";

@Module({
  controllers: [RenewalController],
  providers: [RenewalService],
  exports: [RenewalService],
})
export class RenewalModule {}
