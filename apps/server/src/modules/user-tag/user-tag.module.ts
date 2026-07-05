import { Module } from "@nestjs/common";
import { UserTagService } from "./user-tag.service";
import { UserTagController } from "./user-tag.controller";

/** 用户标签模块（D-T2）：每日批量计算三层标签+admin 查询。R2 红线：禁用于定价。 */
@Module({
  controllers: [UserTagController],
  providers: [UserTagService],
  exports: [UserTagService],
})
export class UserTagModule {}
