import { Controller, Get, Post, Body, Param, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * 内容供应链控制器 — 平台 ↔ 租户内容分发
 */
@ApiTags("内容供应链")
@Controller()
export class ContentSupplyController {
  constructor(private prisma: PrismaService) {}

  // ═══════════ 平台端：内容供应管理 ═══════════

  /** 标记内容为可对外供应 */
  @Post("admin/content-supply")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "标记内容为可对外供应（管理员）" })
  async markSupply(@Body() body: {
    contentId: string;
    contentType: string;
    priceMode: string;
    priceConfig?: Record<string, unknown>;
  }) {
    const supply = await this.prisma.contentSupply.upsert({
      where: { contentId_contentType: { contentId: body.contentId, contentType: body.contentType } },
      create: { contentId: body.contentId, contentType: body.contentType, priceMode: body.priceMode, priceConfig: body.priceConfig as any },
      update: { priceMode: body.priceMode, priceConfig: body.priceConfig as any, status: "ACTIVE" },
    });
    return { code: 200, data: supply, message: "内容已标记为可供应" };
  }

  /** 平台内容市场列表 */
  @Get("admin/content-supply")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "平台内容市场列表（管理员）" })
  async adminSupplyList() {
    return this.prisma.contentSupply.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  }

  // ═══════════ 租户端：内容市场浏览 + 采购 ═══════════

  /** 租户浏览可采购内容（内容市场） */
  @Get("tenant/content-market")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "租户浏览内容市场" })
  async browseMarket() {
    return this.prisma.contentSupply.findMany({
      where: { status: "ACTIVE" },
      orderBy: { contentType: "asc" },
    });
  }

  /**
   * 租户采购内容（预留扩展点）
   *
   * 完整流程：
   *   1. 租户浏览内容市场 → 选择内容
   *   2. 确认价格 → 从预储值账户扣款
   *   3. 扣款成功 → 创建采购记录 → 内容自动上架到租户小程序
   *   4. 余额不足 → 提示充值
   */
  @Post("tenant/procurements")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "租户采购内容（预留）" })
  async procureContent(
    @Body() body: { supplyId: string; stationId: string },
    @Req() req: Request,
  ) {
    const supply = await this.prisma.contentSupply.findUnique({ where: { id: body.supplyId } });
    if (!supply) return { code: 404, message: "内容不存在" };

    // 预留：检查预储值账户余额
    const account = await this.prisma.tenantAccount.findUnique({ where: { stationId: body.stationId } });
    const priceConfig = supply.priceConfig as any;
    const cost = priceConfig?.fixedPrice || 0;

    if (account && +account.balance < cost) {
      return { code: 402, message: "余额不足，请充值", data: { balance: account.balance, needed: cost } };
    }

    // 预留：扣款 + 创建采购记录
    const procurement = await this.prisma.tenantProcurement.create({
      data: {
        stationId: body.stationId,
        supplyId: body.supplyId,
        contentId: supply.contentId,
        contentType: supply.contentType,
        priceMode: supply.priceMode,
        actualPrice: cost,
        expireAt: priceConfig?.fixedPriceYearly ? new Date(Date.now() + 365 * 86400000) : null,
      },
    });

    return { code: 200, data: procurement, message: "采购成功，内容已上架" };
  }

  /** 租户查看已采购内容 */
  @Get("tenant/procurements")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "租户已采购内容列表" })
  async myProcurements(@Req() req: Request) {
    const stationId = req.headers["x-station-id"] as string;
    return this.prisma.tenantProcurement.findMany({
      where: { stationId, status: "ACTIVE" },
      orderBy: { purchasedAt: "desc" },
    });
  }

  // ═══════════ 预储值账户 ═══════════

  /** 租户查看预储值账户 */
  @Get("tenant/account")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查看预储值账户" })
  async myAccount(@Req() req: Request) {
    const stationId = req.headers["x-station-id"] as string;
    const account = await this.prisma.tenantAccount.findUnique({ where: { stationId } });
    if (!account) return { code: 404, message: "账户不存在，请联系管理员开通" };

    const [recharges, consumptions] = await Promise.all([
      this.prisma.tenantRecharge.findMany({ where: { accountId: account.id }, orderBy: { createdAt: "desc" }, take: 20 }),
      this.prisma.tenantConsumption.findMany({ where: { accountId: account.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

    return { code: 200, data: { account, recharges, consumptions } };
  }

  /**
   * 租户充值（预留扩展点）
   * 实际对接微信/支付宝支付，支付成功后回调更新余额
   */
  @Post("tenant/recharge")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "租户充值（预留）" })
  async recharge(@Body() body: { amount: number; payMethod: string }, @Req() req: Request) {
    const stationId = req.headers["x-station-id"] as string;
    const account = await this.prisma.tenantAccount.upsert({
      where: { stationId },
      create: { stationId },
      update: {},
    });

    // 预留：创建充值记录 → 调支付 API → 回调更新余额
    const recharge = await this.prisma.tenantRecharge.create({
      data: { accountId: account.id, amount: body.amount, payMethod: body.payMethod || "WECHAT" },
    });

    return { code: 200, data: recharge, message: "充值订单已创建，待支付" };
  }
}
