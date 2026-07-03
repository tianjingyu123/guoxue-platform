import { Module } from "@nestjs/common";
import { SolarTermService } from "./solar-term.service";
import { SolarTermController } from "./solar-term.controller";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [NotificationModule],
  controllers: [SolarTermController],
  providers: [SolarTermService],
  exports: [SolarTermService],
})
export class SolarTermModule {}
