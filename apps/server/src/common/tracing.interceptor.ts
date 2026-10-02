import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { traceLogUrl } from "./privacy-span-exporter";

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const activeSpan = trace.getActiveSpan();

    if (activeSpan) {
      const { method, url, route } = req;
      activeSpan.setAttribute("http.method", method);
      activeSpan.setAttribute("http.url", traceLogUrl(typeof url === "string" ? url : "/"));
      if (route?.path) activeSpan.setAttribute("http.route", route.path);
    }

    return next.handle().pipe(
      tap({
        error: () => {
          if (activeSpan) {
            activeSpan.setStatus({ code: SpanStatusCode.ERROR });
            activeSpan.setAttribute("error.type", "request_failed");
          }
        },
      }),
    );
  }
}
