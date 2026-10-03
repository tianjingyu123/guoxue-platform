import { Module } from "@nestjs/common";
import { SolarTermService } from "./solar-term.service";
import { JieqiAiService } from "./jieqi-ai.service";
import { SolarTermController } from "./solar-term.controller";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [NotificationModule],
  controllers: [SolarTermController],
  providers: [SolarTermService, JieqiAiService],
  exports: [SolarTermService],
})
export class SolarTermModule {}
