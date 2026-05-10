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

    const ctx = { traceId, userId: (req as any).user?.id, path: url, method };
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
                res.setHeader("X-Trace-Id", traceId);
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
