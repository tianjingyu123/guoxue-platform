import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

/**
 * 从请求中提取分站ID (stationId)
 * 优先级: 服务端注入 request.stationId > Header x-station-id > Query stationId
 *
 * 配合 StationIsolationGuard 使用时，普通用户自动从 JWT 绑定获取 stationId，
 * 不再信任客户端 Header，防止跨站数据越权。
 */
export const StationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { stationId?: string }>();
    // 优先使用服务端注入的可信值
    if (request.stationId) return request.stationId;
    // 兼容旧版：Header/Query 作为 fallback（管理员或未启用隔离的端点）
    const headerId = request.headers["x-station-id"] as string | undefined;
    if (headerId) return headerId;
    return request.query?.stationId as string | undefined;
  },
);
