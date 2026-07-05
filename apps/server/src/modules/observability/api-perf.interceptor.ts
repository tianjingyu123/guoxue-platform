import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { ApiPerfService } from "./api-perf.service";

/**
 * API 性能采集拦截器（T3 可观测）。与 common/metrics.interceptor（prom·每实例）并存：
 * 本拦截器喂 ApiPerfService 的跨实例 Redis 分钟桶，供 admin 看板查询。
 * route 取 Express 路由模板（/shop/orders/:id），避免原始 URL 的基数爆炸。
 */
@Injectable()
export class ApiPerfInterceptor implements NestInterceptor {
  constructor(private readonly perf: ApiPerfService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();
    const req = context.switchToHttp().getRequest();
    if (!req) return next.handle();
    const method: string = req.method ?? "GET";
    const route: string = req.route?.path ?? (req.url ? String(req.url).split("?")[0] : "unknown");
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          this.perf.record(method, route, Date.now() - start, (res?.statusCode ?? 200) >= 500);
        },
        error: (err: { status?: number }) => {
          this.perf.record(method, route, Date.now() - start, (err?.status ?? 500) >= 500);
        },
      }),
    );
  }
}
