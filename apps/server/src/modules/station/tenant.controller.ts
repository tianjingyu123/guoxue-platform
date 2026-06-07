import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * 多租户管理控制器
 *
 * 架构说明：
 * - INTERNAL 租户（分站/运营商）：共享主 DB，通过 stationId 隔离
 * - SAAS 租户（外部客户）：通过 PostgreSQL Schema 隔离（预留，当前未启用）
 * - HOLDING 租户（战略合作方）：独立 Schema + 平台监督权（预留）
 *
 * 扩展点：
 * - 租户入驻流程 → POST /tenants/onboarding
 * - 自动开通 → 支付回调 → 激活 tenant
 * - 独立 Schema 创建 → tenatType=SAAS 时自动执行 CREATE SCHEMA
 * - API 配额管理 → 中间件统计调用次数
 */
@ApiTags("多租户管理")
@Controller("tenants")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN")
@ApiBearerAuth()
export class TenantController {
  constructor(private prisma: PrismaService) {}

  /** 创建租户（预留：当前等同于创建分站） */
  @Post()
  @ApiOperation({ summary: "创建租户" })
  async create(@Body() body: {
    userId: string;
    name: string;
    code: string;
    tenantType?: "INTERNAL" | "SAAS" | "HOLDING";
    featureFlags?: Record<string, boolean>;
    apiDailyQuota?: number;
    paymentConfig?: Record<string, unknown>;
  }) {
    const tenant = await this.prisma.station.create({
      data: {
        userId: body.userId,
        name: body.name,
        code: body.code,
        tenantType: body.tenantType || "INTERNAL",
        featureFlags: body.featureFlags as any,
        apiDailyQuota: body.apiDailyQuota ?? 0,
        paymentConfig: body.paymentConfig as any,
        status: "ACTIVE",
      },
    });

    // 预留：SAAS/HOLDING 类型自动创建独立 Schema
    if (body.tenantType === "SAAS" || body.tenantType === "HOLDING") {
      // TODO: 未来实现 — CREATE SCHEMA tenant_${tenant.code}
      // TODO: 运行该 schema 的 Prisma 迁移
      // TODO: 配置独立数据库连接（如果 dbConnString 非空）
    }

    return { code: 200, data: tenant, message: "租户创建成功" };
  }

  /** 租户列表 */
  @Get()
  @ApiOperation({ summary: "租户列表" })
  async list() {
    return this.prisma.station.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, nickname: true, phone: true } } },
    });
  }

  /** 租户开通（POST /tenants/:id/activate） */
  @Post(":id/activate")
  @ApiOperation({ summary: "开通租户" })
  async activate(@Param("id") id: string) {
    await this.prisma.station.update({ where: { id }, data: { status: "ACTIVE" } });
    return { code: 200, message: "租户已开通" };
  }

  /** 租户停用（到期自动或手动） */
  @Post(":id/suspend")
  @ApiOperation({ summary: "停用租户（数据保留）" })
  async suspend(@Param("id") id: string) {
    await this.prisma.station.update({ where: { id }, data: { status: "SUSPENDED" } });
    return { code: 200, message: "租户已停用，数据保留中" };
  }

  /** 配置租户功能开关 */
  @Put(":id/features")
  @ApiOperation({ summary: "配置租户功能开关" })
  async updateFeatures(
    @Param("id") id: string,
    @Body() body: { featureFlags: Record<string, boolean> },
  ) {
    await this.prisma.station.update({
      where: { id },
      data: { featureFlags: body.featureFlags as any },
    });
    return { code: 200, message: "功能开关已更新" };
  }

  /** 配置租户 API 配额 */
  @Put(":id/quota")
  @ApiOperation({ summary: "配置租户 API 配额" })
  async updateQuota(@Param("id") id: string, @Body() body: { apiDailyQuota: number }) {
    await this.prisma.station.update({
      where: { id },
      data: { apiDailyQuota: body.apiDailyQuota },
    });
    return { code: 200, message: "API 配额已更新" };
  }

  /**
   * 租户入驻流程（预留扩展点）
   *
   * 完整流程：
   *   1. 用户选择套餐 → 创建租户草稿
   *   2. 支付 → 自动回调 → 开通租户
   *   3. 配置小程序 → 生成独立 AppId 关联
   *   4. 配置支付商户号 → 独立收款
   *   5. 上线 → 状态变更为 ACTIVE
   */
  @Post("onboarding")
  @ApiOperation({ summary: "租户入驻（预留扩展点）" })
  async onboarding(@Body() body: {
    userId: string;
    planId: string;
    tenantName: string;
    tenantCode: string;
  }) {
    // 预留扩展点：选择套餐 → 创建订单 → 支付 → 自动开通
    return {
      code: 200,
      data: { tenantId: null, orderId: null },
      message: "入驻流程预留扩展点 — 等待套餐系统就绪",
    };
  }
}
