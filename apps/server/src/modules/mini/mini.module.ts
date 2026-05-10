import { Module } from "@nestjs/common";
import { MiniController } from "./mini.controller";
import { MiniService } from "./mini.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../redis/redis.module";
import { SystemModule } from "../system/system.module";
import { RecommendModule } from "../recommend/recommend.module";

@Module({
  imports: [PrismaModule, RedisModule, SystemModule, RecommendModule],
  controllers: [MiniController],
  providers: [MiniService],
})
export class MiniModule {}
