import { Module } from "@nestjs/common";
import { InteractionService } from "./interaction.service";
import { InteractionController } from "./interaction.controller";

@Module({
  controllers: [InteractionController],
  providers: [InteractionService],
  exports: [InteractionService],
})
export class InteractionModule {}
