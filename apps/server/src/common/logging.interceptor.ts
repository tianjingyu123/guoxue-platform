import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { trace } from "@opentelemetry/api";
import { RequestContext } from "./request-context";
import { PinoLoggerService } from "./pino-logger.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

    const activeSpan = trace.getActiveSpan();
    const traceId =
      req.headers["x-trace-id"] as string ||
      (req as any).traceId ||
      activeSpan?.spanContext().traceId ||
      "00000000000000000000000000000000";
    (req as any).traceId = traceId;

    const ctx = {
      traceId,
      userId: (req as any).user?.id,
      stationId: (req as any).stationId as string | undefined,
      path: url,
      method,
    };
    const pino = PinoLoggerService.getInstance().raw();

    return new Observable((subscriber) => {
      RequestContext.run(ctx, () => {
        next
          .handle()
          .pipe(
            tap({
              next: () => {
                const res = context.switchToHttp().getResponse();
                const ms = Date.now() - start;
                if (!res.headersSent) {
                  res.setHeader("X-Trace-Id", traceId);
                }

                // 慢请求告警
                const SLOW_THRESHOLD_MS = parseInt(process.env.SLOW_REQUEST_MS || "3000", 10);
                const CRITICAL_THRESHOLD_MS = 10000;

                if (ms > CRITICAL_THRESHOLD_MS) {
                  pino.error({ method, url, status: res.statusCode, ms, traceId }, `CRITICAL SLOW ${method} ${url} → ${ms}ms`);
                } else if (ms > SLOW_THRESHOLD_MS) {
                  pino.warn({ method, url, status: res.statusCode, ms, traceId }, `SLOW ${method} ${url} → ${ms}ms`);
                }

                pino.info({ method, url, status: res.statusCode, ms }, `${method} ${url} → ${res.statusCode} ${ms}ms`);
              },
              error: (err) => {
                const ms = Date.now() - start;
                pino.warn({ method, url, status: err.status || 500, ms, err: err.message }, `${method} ${url} → ${err.status || 500} ${ms}ms`);
              },
            }),
          )
          .subscribe({
            next: (v) => subscriber.next(v),
            error: (e) => subscriber.error(e),
            complete: () => subscriber.complete(),
          });
      });
    });
  }
}
