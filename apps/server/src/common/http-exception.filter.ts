import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { BusinessException } from "./business.exception";
import { PinoLoggerService } from "./pino-logger.service";
import { RequestContext } from "./request-context";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = PinoLoggerService.getInstance().raw();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "服务器内部错误";
    let errorCode: number | undefined;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      message = body.message;
      errorCode = body.errorCode;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exRes = exception.getResponse();
      message = typeof exRes === "string" ? exRes : (exRes as any).message || exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        {
          method: request.method,
          url: request.url,
          status,
          errorCode,
          traceId: RequestContext.traceId(),
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        `${request.method} ${request.url} → ${status}`,
      );
    }

    response.status(status).json({
      code: status,
      errorCode: errorCode ?? status,
      message,
      timestamp: Date.now(),
      path: request.url,
    });
  }
}
