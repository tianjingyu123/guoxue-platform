/** 请求准入只读取注册的配置快照；不依赖 HTTP 实现，避免小程序分块循环。 */
interface OperationSnapshot {
  features: Record<string, boolean>;
  operations: Record<string, string>;
}
let snapshotResolver: () => OperationSnapshot = () => ({ features: {}, operations: {} });
export function setOperationRequestSnapshotResolver(resolve: () => OperationSnapshot) {
  snapshotResolver = resolve;
}
/** 只阻止新购买/入圈/额度购买；已付款确认、续聊、阅读、订单及退款沿用业务授权。 */
export function isOperationRequestAllowed(path: string, method: string, data?: unknown): boolean {
  if (method.toUpperCase() !== "POST") return true;
  let key: string | undefined;
  if (/^\/courses\/[^/]+\/purchase$/.test(path)) key = "client_course_purchase";
  if (/^\/circles\/(join-by-code|[^/]+\/(join|join\/prepare|renew))$/.test(path))
    key = "client_circle_join";
  if (/^\/bots\/[^/]+\/purchase-uses$/.test(path)) key = "client_agent_purchase";
  if (path === "/shop/orders") {
    const type = (data as { type?: string } | undefined)?.type;
    key = (
      {
        COURSE: "client_course_purchase",
        CIRCLE: "client_circle_join",
        BOT: "client_agent_purchase",
      } as Record<string, string>
    )[type || ""];
  }
  if (!key) return true;
  const config = snapshotResolver();
  if (config.features.client_emergency_close) return false;
  return config.operations[key] === undefined || config.operations[key] === "OPEN";
}
