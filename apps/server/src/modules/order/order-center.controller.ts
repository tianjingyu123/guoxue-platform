import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("统一订单中心")
@Controller("orders")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderCenterController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("my")
  @ApiOperation({ summary: "我的所有订单（统一视图，支持筛选）" })
  @ApiQuery({ name: "type", required: false, description: "SHOP/COURSE/MEMBER" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  async getMyOrders(
    @Req() req: Request,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    const userId = (req.user as any).id;
    const results: any[] = [];

    // 商城订单
    if (!type || type === "SHOP") {
      const where: any = { userId };
      if (status) where.status = status;
      const orders = await this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      results.push(...orders.map(o => ({
        id: o.id, orderType: "SHOP", type: o.type, targetId: o.targetId,
        status: o.status, amount: o.amount, payAmount: o.payAmount,
        createdAt: o.createdAt,
      })));
    }

    // 会员购买（MemberPurchase 用 paidAt）
    if (!type || type === "MEMBER") {
      const purchases = await this.prisma.memberPurchase.findMany({
        where: { userId },
        orderBy: { paidAt: "desc" },
        take: 1000,
      });
      results.push(...purchases.map(p => ({
        id: p.id, orderType: "MEMBER", status: "PAID",
        amount: p.amount, memberType: p.memberType, createdAt: p.paidAt,
      })));
    }

    // Bundle领取记录
    if (!type || type === "BUNDLE") {
      const station = await this.prisma.station.findFirst({ where: { userId }, select: { id: true } });
      const operator = await this.prisma.operator.findFirst({ where: { userId }, select: { id: true } });
      const bundleWhere: any = { OR: [] as any[] };
      if (station) bundleWhere.OR.push({ stationId: station.id });
      if (operator) bundleWhere.OR.push({ operatorId: operator.id });
      if (bundleWhere.OR.length > 0) {
        const accesses = await this.prisma.stationBundleAccess.findMany({
          where: bundleWhere,
          include: { bundle: { select: { id: true, name: true, type: true } } },
          orderBy: { createdAt: "desc" },
          take: 1000,
        });
        results.push(...accesses.map(a => ({
          id: a.id, orderType: "BUNDLE", status: "CLAIMED",
          amount: 0, bundle: a.bundle, createdAt: a.createdAt,
        })));
      }
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const pn = +page;
    const ps = +pageSize;
    return {
      orders: results.slice((pn - 1) * ps, pn * ps),
      total: results.length,
      page: pn,
      pageSize: ps,
    };
  }

  /** 管理员查看所有订单 */
  @Get("admin/all")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "管理员查看所有订单" })
  @ApiQuery({ name: "type", required: false, description: "SHOP/COURSE/MEMBER" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "keyword", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  async adminAllOrders(
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("keyword") keyword?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    const results: any[] = [];

    if (!type || type === "SHOP") {
      const where: any = {};
      if (status) where.status = status;
      if (keyword) where.OR = [
        { id: { contains: keyword } },
        { user: { nickname: { contains: keyword } } },
      ];
      const orders = await this.prisma.order.findMany({
        where,
        include: { user: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      results.push(...orders.map(o => ({
        id: o.id, orderType: "SHOP", type: o.type,
        status: o.status, amount: o.amount, payAmount: o.payAmount,
        user: o.user, createdAt: o.createdAt,
      })));
    }

    if (!type || type === "MEMBER") {
      const where: any = {};
      if (keyword) where.user = { nickname: { contains: keyword } };
      const purchases = await this.prisma.memberPurchase.findMany({
        where,
        include: { user: { select: { id: true, nickname: true } } },
        orderBy: { paidAt: "desc" },
        take: 500,
      });
      results.push(...purchases.map(p => ({
        id: p.id, orderType: "MEMBER", status: "PAID",
        amount: p.amount, memberType: p.memberType,
        user: (p as any).user, createdAt: p.paidAt,
      })));
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const pn = +page;
    const ps = +pageSize;
    return {
      orders: results.slice((pn - 1) * ps, pn * ps),
      total: results.length,
      page: pn,
      pageSize: ps,
    };
  }
}
