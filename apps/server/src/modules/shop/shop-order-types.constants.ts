/**
 * 无实物库存的订单类型（单一真源·后端审计P1-6）。
 *
 * 这些类型是 B 端资格费 / 会员开通，非实物商品：下单不校验/扣减 SKU 库存，
 * 关单/退款也无需恢复库存。原先 shop-order.service 与 shop-order-lifecycle.service
 * 各自维护一份且互相都缺项（前者缺 PRACTITIONER_PRO 致其下单误入扣库存分支报「库存不足」；
 * 后者缺 STATION_MASTER/OPERATOR），统一到此常量防再次漂移。新增虚拟类型只改这里。
 *
 * 对应 shop-order.service.createOrder 的分支：MEMBER / STATION_MASTER / PRACTITIONER_PRO / OPERATOR
 * 走各自定价，唯有 else 分支才是实物 PRODUCT（有 SKU/库存）。
 */
export const STOCKLESS_ORDER_TYPES = ["MEMBER", "STATION_MASTER", "PRACTITIONER_PRO", "OPERATOR"] as const;

export function isStocklessOrderType(type: string): boolean {
  return (STOCKLESS_ORDER_TYPES as readonly string[]).includes(type);
}
