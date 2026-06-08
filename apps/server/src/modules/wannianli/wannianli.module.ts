import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../redis/redis.module";
import { WannianliService } from "./wannianli.service";
import { WannianliController } from "./wannianli.controller";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [WannianliController],
  providers: [WannianliService],
  exports: [WannianliService],
})
export class WannianliModule {}
