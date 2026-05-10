import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

/**
 * 从请求中提取分站ID (stationId)
 * 优先级: Header x-station-id > Query stationId
 */
export const StationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const headerId = request.headers["x-station-id"] as string | undefined;
    if (headerId) return headerId;
    return (request.query as any)?.stationId || undefined;
  },
);
