import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
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
  @ApiResponse({ status: 200, description: "成功" })
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
    const userId = req.user.id;
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
      // 补全商品标题/封面，供统一订单中心列表渲染（原仅返回 targetId 前端无法展示）
      const productIds = [...new Set(orders.map(o => o.targetId).filter(Boolean))];
      const products = productIds.length
        ? await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, title: true, images: true },
          })
        : [];
      const productMap = new Map(products.map(p => [p.id, p]));
      results.push(...orders.map(o => {
        const p = o.targetId ? productMap.get(o.targetId) : null;
        return {
          id: o.id, orderType: "SHOP", type: o.type, targetId: o.targetId,
          status: o.status, amount: o.amount, payAmount: o.payAmount,
          title: p?.title || null, cover: p?.images?.[0] || null,
          createdAt: o.createdAt,
        };
      }));
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "type", required: false, description: "订单类型筛选：SHOP(兼容旧值=Order 表全部) 或真实 OrderType 枚举 MEMBER/COURSE/PRODUCT/CIRCLE_JOIN/CIRCLE_RENEW/STATION_MASTER/OPERATOR/BOT_SERVICE/PAIPAN/LIVESTREAM/BUNDLE/PRACTITIONER_PRO" })
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

    // Order 表的 12 种真实类型（与 schema OrderType 枚举一致），type 筛选参数支持直接传真实枚举值
    const ORDER_TYPE_VALUES = new Set([
      "MEMBER", "COURSE", "PRODUCT", "CIRCLE_JOIN", "CIRCLE_RENEW", "STATION_MASTER",
      "OPERATOR", "BOT_SERVICE", "PAIPAN", "LIVESTREAM", "BUNDLE", "PRACTITIONER_PRO",
    ]);
    // 查 Order 表的条件：不筛/兼容旧值 SHOP(=Order 表全部)/真实枚举值。
    // MEMBER 例外：会员购买支付成功时 Order(type=MEMBER) 与 MemberPurchase 双写，
    // 若两个分支都返回会重复计——MEMBER 统一走下方 MemberPurchase 分支
    // （MemberPurchase 才有 memberType 档位信息，且含无对应 Order 的发放记录，数据更全）。
    const queryOrderTable = !type || type === "SHOP" || (ORDER_TYPE_VALUES.has(type) && type !== "MEMBER");

    if (queryOrderTable) {
      const where: any = {};
      // 传真实枚举值 → 精确筛类型；不筛/SHOP → 排除 MEMBER（避免与 MemberPurchase 分支重复计）
      if (type && type !== "SHOP") where.type = type;
      else where.type = { not: "MEMBER" };
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
      // orderType 透传真实 o.type（原来硬打 "SHOP" 把 12 种订单全标成商城订单）；type 字段保留兼容旧前端
      results.push(...orders.map(o => ({
        id: o.id, orderType: o.type, type: o.type,
        status: o.status, amount: o.amount, payAmount: o.payAmount,
        user: o.user, createdAt: o.createdAt,
      })));
    }

    // MemberPurchase 无 status 列，记录全部为已支付（PAID）——status 筛选非 PAID 时该分支自然为空
    if ((!type || type === "MEMBER") && (!status || status === "PAID")) {
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
