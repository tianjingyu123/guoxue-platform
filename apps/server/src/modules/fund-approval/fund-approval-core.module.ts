import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { FundApprovalService } from "./fund-approval.service";

/**
 * 资金审批「核心」模块：只提供 FundApprovalService（仅依赖 Prisma）。
 * 被 4 个资金业务模块（institute / huifu / coin / commission）导入以发起审批；
 * 自身不依赖任何业务模块，避免循环依赖。
 */
@Module({
  imports: [PrismaModule],
  providers: [FundApprovalService],
  exports: [FundApprovalService],
})
export class FundApprovalCoreModule {}
