import { Module } from "@nestjs/common";
import { CheckinService } from "./checkin.service";
import { CheckinController } from "./checkin.controller";
import { UserModule } from "../user/user.module";

@Module({
  imports: [UserModule],
  controllers: [CheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class CheckinModule {}
