import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditService } from "../modules/audit/audit.service";
import { AUDITABLE_KEY } from "./audit.decorator";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const auditable = Reflect.getMetadata(AUDITABLE_KEY, handler);

    if (!auditable) return next.handle();

    const { action, targetType } = auditable;
    const userId = req.user?.id;
    const ip = req.ip || req.connection?.remoteAddress;

    return next.handle().pipe(
      tap((result) => {
        const targetId = result?.id || req.params?.id;
        this.audit.log({
          userId,
          action: action || "UPDATE",
          targetType: targetType || req.route?.path?.split("/")[3],
          targetId,
          detail: req.method + " " + req.url,
          ip,
        }).catch((err) => this.logger.warn("审计日志写入失败", err));
      }),
    );
  }
}
