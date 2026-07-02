import { Module } from "@nestjs/common";
import { CheckinService } from "./checkin.service";
import { CheckinController } from "./checkin.controller";
import { UserModule } from "../user/user.module";
import { UserGrowthModule } from "../user-growth/user-growth.module";

@Module({
  imports: [UserModule, UserGrowthModule],
  controllers: [CheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class CheckinModule {}
