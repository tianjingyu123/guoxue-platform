import { Module } from "@nestjs/common";
import { OrderCenterController } from "./order-center.controller";

@Module({
  controllers: [OrderCenterController],
})
export class OrderCenterModule {}
