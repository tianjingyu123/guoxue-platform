import { Module, forwardRef } from "@nestjs/common";
import { BountyService } from "./bounty.service";
import { BountyController } from "./bounty.controller";
import { BountyAdminController } from "./bounty-admin.controller";
import { CoinModule } from "../coin/coin.module";

@Module({
  imports: [forwardRef(() => CoinModule)],
  controllers: [BountyController, BountyAdminController],
  providers: [BountyService],
  exports: [BountyService],
})
export class BountyModule {}
