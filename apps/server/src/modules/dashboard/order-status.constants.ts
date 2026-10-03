import type { OrderStatus } from "@prisma/client";

/**
 * 平台营收统一口径（唯一真源）：已支付有效单 = status ∈ {PAID, SHIPPED, COMPLETED}，全 type 通用。
 *
 * - 排除 PENDING（未支付）/ CANCELLED（已取消）/ REFUNDED（已退款，作为独立扣减项单列，不计入 GMV）。
 * - 驾驶舱(cockpit)、对外大屏(bigscreen)、天级聚合(dashboard-daily) 三处 GMV 统计必须复用本常量，
 *   避免各自写死 ["PAID","COMPLETED"] / notIn[...] 造成"三处三个数"。
 * - 与 funnel-daily 漏斗支付口径保持一致。
 */
export const PAID_ORDER_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "COMPLETED"];
