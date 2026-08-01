import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { LogisticsService } from "../shop/logistics.service";
import { ShopOrderService } from "../shop/shop-order.service";
import { SystemService } from "../system/system.service";
import { BatchShipOrdersDto, ShipOrderDto } from "./merchant.dto";

type OwnedOrder = { id: string; userId: string; status: string; shippedAt: Date | null };

@Injectable()
export class MerchantShippingService {
  private readonly logger = new Logger(MerchantShippingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderCache: ShopOrderService,
    private readonly logisticsService: LogisticsService,
    private readonly systemService: SystemService,
  ) {}

  private bad(message: string): never {
    throw new BusinessException(ErrorCode.BAD_REQUEST, message);
  }

  private clean(dto: ShipOrderDto) {
    const company = dto.company?.trim();
    const trackingNo = dto.trackingNo?.trim();
    if (!company || !trackingNo) this.bad("快递公司和运单号不能为空");
    return { company, trackingNo };
  }

  private view(logistics: { id: string; orderId: string; company: string | null; logisticsNo: string | null; status: string; updatedAt: Date }) {
    return {
      id: logistics.id,
      orderId: logistics.orderId,
      company: logistics.company,
      trackingNo: logistics.logisticsNo,
      status: logistics.status,
      updatedAt: logistics.updatedAt,
    };
  }

  private async invalidate(order: Pick<OwnedOrder, "id" | "userId">) {
    await this.orderCache.invalidateOrderCache(order.id, order.userId)
      .catch((error) => this.logger.warn(`发货后订单缓存清理失败 order=${order.id}: ${this.errorMessage(error)}`));
  }

  private async audit(operatorId: string, action: string, orderId: string, detail: Record<string, unknown>, rollbackData?: Record<string, unknown>) {
    await this.systemService.logAudit({
      userId: operatorId,
      action,
      targetType: "OrderLogistics",
      targetId: orderId,
      detail: JSON.stringify(detail),
      rollbackData,
    }).catch((error) => this.logger.warn(`物流操作审计写入失败 order=${orderId}: ${this.errorMessage(error)}`));
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private persistedTracks(trackingData: Prisma.JsonValue | null): Array<Record<string, unknown>> {
    if (!Array.isArray(trackingData)) return [];
    return trackingData.filter((item) =>
      typeof item === "object" && item !== null && !Array.isArray(item),
    ) as Array<Record<string, unknown>>;
  }

  async shipOrder(merchantId: string, operatorId: string, orderId: string, dto: ShipOrderDto) {
    const input = this.clean(dto);
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, merchantId },
        select: { id: true, userId: true, status: true, shippedAt: true },
      });
      if (!order) return this.bad("订单不存在或不属于当前店铺");

      const existing = await tx.orderLogistics.findUnique({ where: { orderId } });
      if (order.status === "SHIPPED" && existing?.company === input.company && existing.logisticsNo === input.trackingNo) {
        return { order, logistics: existing, replayed: true };
      }
      if (order.status !== "PAID") {
        return this.bad(order.status === "SHIPPED" ? "订单已发货，如需更正请使用修改运单" : "当前订单状态不可发货");
      }

      const changed = await tx.order.updateMany({
        where: { id: orderId, merchantId, status: "PAID" },
        data: { status: "SHIPPED", shippedAt: new Date() },
      });
      if (changed.count !== 1) return this.bad("订单状态已变化，请刷新后重试");

      const logistics = await tx.orderLogistics.upsert({
        where: { orderId },
        create: { orderId, company: input.company, logisticsNo: input.trackingNo, status: "SHIPPED" },
        update: {
          company: input.company,
          logisticsNo: input.trackingNo,
          status: "SHIPPED",
          trackingData: Prisma.DbNull,
        },
      });
      return { order: { ...order, status: "SHIPPED" }, logistics, replayed: false };
    });

    await this.invalidate(result.order);
    if (!result.replayed) {
      await this.logisticsService.subscribeTrack(input.trackingNo, input.company)
        .catch((error) => this.logger.warn(`快递100订阅失败 order=${orderId}: ${this.errorMessage(error)}`));
      await this.audit(operatorId, "MERCHANT_ORDER_SHIPPED", orderId, input);
    }
    return { success: true, replayed: result.replayed, logistics: this.view(result.logistics) };
  }

  async batchShipOrders(merchantId: string, operatorId: string, dto: BatchShipOrdersDto) {
    const seen = new Set<string>();
    const items: Array<{ orderId: string; success: boolean; replayed?: boolean; message?: string }> = [];
    for (const row of dto.items) {
      if (seen.has(row.orderId)) {
        items.push({ orderId: row.orderId, success: false, message: "同一订单不能重复提交" });
        continue;
      }
      seen.add(row.orderId);
      try {
        const result = await this.shipOrder(merchantId, operatorId, row.orderId, row);
        items.push({ orderId: row.orderId, success: true, replayed: result.replayed });
      } catch (error) {
        items.push({ orderId: row.orderId, success: false, message: this.errorMessage(error) });
      }
    }
    const successCount = items.filter((item) => item.success).length;
    return { successCount, failedCount: items.length - successCount, items };
  }

  async updateShipment(merchantId: string, operatorId: string, orderId: string, dto: ShipOrderDto) {
    const input = this.clean(dto);
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, merchantId },
        select: { id: true, userId: true, status: true, shippedAt: true },
      });
      if (!order) return this.bad("订单不存在或不属于当前店铺");
      if (order.status !== "SHIPPED") return this.bad("仅待收货订单可以修改运单");
      const previous = await tx.orderLogistics.findUnique({ where: { orderId } });
      if (previous?.company === input.company && previous.logisticsNo === input.trackingNo) {
        return { order, previous, logistics: previous, replayed: true };
      }
      const logistics = await tx.orderLogistics.upsert({
        where: { orderId },
        create: { orderId, company: input.company, logisticsNo: input.trackingNo, status: "SHIPPED" },
        update: {
          company: input.company,
          logisticsNo: input.trackingNo,
          status: "SHIPPED",
          trackingData: Prisma.DbNull,
        },
      });
      return { order, previous, logistics, replayed: false };
    });

    await this.invalidate(result.order);
    if (!result.replayed) {
      await this.logisticsService.subscribeTrack(input.trackingNo, input.company)
        .catch((error) => this.logger.warn(`快递100订阅失败 order=${orderId}: ${this.errorMessage(error)}`));
      await this.audit(operatorId, "MERCHANT_LOGISTICS_UPDATED", orderId, input, result.previous ? {
        company: result.previous.company,
        trackingNo: result.previous.logisticsNo,
      } : undefined);
    }
    return { success: true, replayed: result.replayed, logistics: this.view(result.logistics) };
  }

  async getShipment(merchantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, merchantId },
      select: { id: true, status: true },
    });
    if (!order) return this.bad("订单不存在或不属于当前店铺");
    const logistics = await this.prisma.orderLogistics.findUnique({ where: { orderId } });
    if (!logistics) return { logistics: null, track: null };

    let track: Record<string, unknown> | null = null;
    if (logistics.logisticsNo) {
      const persistedTracks = this.persistedTracks(logistics.trackingData);
      try {
        const raw = await this.logisticsService.queryTrack(logistics.logisticsNo, logistics.company || undefined) as Record<string, unknown>;
        const freshTracks = Array.isArray(raw.tracks) ? raw.tracks : Array.isArray(raw.track) ? raw.track : [];
        track = {
          ...raw,
          state: raw.state && raw.state !== "unknown" ? raw.state : logistics.status,
          tracks: freshTracks.length ? freshTracks : persistedTracks,
          ...(freshTracks.length || !persistedTracks.length
            ? {}
            : { message: raw.message || "当前展示最近一次已同步的物流轨迹" }),
        };
      } catch (error) {
        this.logger.warn(`快递100查询失败 order=${orderId}: ${this.errorMessage(error)}`);
        track = {
          state: logistics.status,
          tracks: persistedTracks,
          message: persistedTracks.length
            ? "实时物流暂时不可用，当前展示最近一次已同步的轨迹"
            : "物流轨迹暂时不可用，请稍后刷新",
        };
      }
    }
    return { logistics: this.view(logistics), track };
  }
}
