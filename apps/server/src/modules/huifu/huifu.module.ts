import { Module } from "@nestjs/common";
import { HuifuService } from "./huifu.service";
import { HuifuController } from "./huifu.controller";

@Module({
  controllers: [HuifuController],
  providers: [HuifuService],
  exports: [HuifuService],
})
export class HuifuModule {}
