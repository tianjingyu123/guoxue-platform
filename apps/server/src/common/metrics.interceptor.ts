import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, route } = req;
    const path = route?.path ?? req.url?.split("?")[0] ?? "unknown";

    this.metrics.httpRequestsInFlight.inc();

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const status = res.statusCode.toString();
          const duration = (Date.now() - start) / 1000;
          this.metrics.httpRequestsTotal.inc({ method, path, status });
          this.metrics.httpRequestDuration.observe({ method, path }, duration);
          this.metrics.httpRequestsInFlight.dec();
        },
        error: (err) => {
          const status = (err.status || 500).toString();
          const duration = (Date.now() - start) / 1000;
          this.metrics.httpRequestsTotal.inc({ method, path, status });
          this.metrics.httpRequestDuration.observe({ method, path }, duration);
          this.metrics.httpRequestsInFlight.dec();
        },
      }),
    );
  }
}
