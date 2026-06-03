import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { MetricsService } from "../common/metrics.service";

/**
 * Prisma 全局模块
 *
 * 通过自定义 Provider + PrismaService.create() 静态工厂实例化，
 * 确保所有注入点拿到的是已安装扩展（分站隔离 + 慢查询监控）的客户端，
 * 消除构造函数内属性拷贝的反射绕过风险。
 */
@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: (metrics?: MetricsService) => PrismaService.create(metrics),
      inject: [{ token: MetricsService, optional: true }],
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
