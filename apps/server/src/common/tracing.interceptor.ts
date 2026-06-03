import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { trace, SpanStatusCode } from "@opentelemetry/api";

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const activeSpan = trace.getActiveSpan();

    if (activeSpan) {
      const { method, url, route } = req;
      const userId = req.user?.id;

      activeSpan.setAttribute("http.method", method);
      activeSpan.setAttribute("http.url", url);
      if (route?.path) activeSpan.setAttribute("http.route", route.path);
      if (userId) activeSpan.setAttribute("user.id", userId);
    }

    return next.handle().pipe(
      tap({
        error: (err) => {
          if (activeSpan) {
            activeSpan.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
            activeSpan.setAttribute("error.type", err.constructor?.name || "Error");
          }
        },
      }),
    );
  }
}
