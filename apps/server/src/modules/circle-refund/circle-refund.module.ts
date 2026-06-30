import { Module } from "@nestjs/common";
import { CircleRefundService } from "./circle-refund.service";
import { CircleRefundController } from "./circle-refund.controller";
import { CommissionModule } from "../commission/commission.module";

/** 圈子退款资金子系统（PrismaModule 全局；引入 CommissionModule 用于站长佣金追回 reverseCommission） */
@Module({
  imports: [CommissionModule],
  controllers: [CircleRefundController],
  providers: [CircleRefundService],
})
export class CircleRefundModule {}
