import { Module } from "@nestjs/common";
import { CommissionController } from "./commission.controller";
import { CommissionService } from "./commission.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { WebhookModule } from "../webhook/webhook.module";

@Module({
  imports: [PrismaModule, WebhookModule],
  controllers: [CommissionController],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
