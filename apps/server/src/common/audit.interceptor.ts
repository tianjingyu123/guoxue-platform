import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditService } from "../modules/audit/audit.service";
import { AUDITABLE_KEY } from "./audit.decorator";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const auditable = Reflect.getMetadata(AUDITABLE_KEY, handler);

    // 没有 @Auditable 装饰器且不是写操作 → 跳过
    if (!auditable && !MUTATION_METHODS.has(req.method)) {
      return next.handle();
    }

    const action = auditable?.action || req.method;
    const targetType = auditable?.targetType || req.route?.path?.split("/")[3] || "unknown";
    const userId = req.user?.id;
    const ip = req.ip || req.connection?.remoteAddress;

    return next.handle().pipe(
      tap((result) => {
        const targetId = (result as { id?: string } | null | undefined)?.id || req.params?.id;
        this.audit.log({
          userId,
          action,
          targetType,
          targetId,
          detail: `${req.method} ${req.url}`,
          ip,
        }).catch((err) => this.logger.warn("审计日志写入失败", err));
      }),
    );
  }
}
