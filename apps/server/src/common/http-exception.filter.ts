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

  /** NestJS 默认英文异常消息 → 中文 */
  private static readonly DEFAULT_MSG_ZH: Record<string, string> = {
    "Unauthorized": "未登录或登录已过期，请重新登录",
    "Forbidden": "没有权限执行此操作",
    "Not Found": "请求的资源不存在",
    "Bad Request": "请求参数有误",
    "Conflict": "数据冲突，可能已有相同记录",
    "Too Many Requests": "请求过于频繁，请稍后再试",
    "Internal Server Error": "服务器内部错误，请稍后重试",
    "Request Timeout": "请求超时，请检查网络后重试",
    "Payload Too Large": "上传文件过大",
    "Unsupported Media Type": "不支持的文件格式",
    "Method Not Allowed": "不支持的请求方式",
    "Service Unavailable": "服务暂不可用，请稍后重试",
  };

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = "服务器内部错误";
    let errorCode: number | undefined;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const body = exception.getResponse() as { message: string | string[]; errorCode?: number };
      message = body.message;
      errorCode = body.errorCode;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exRes = exception.getResponse();
      const raw =
        typeof exRes === "string"
          ? exRes
          : (exRes as { message?: string | string[]; statusCode?: number }).message || exception.message;

      if (Array.isArray(raw)) {
        message = raw;
      } else {
        // NestJS 默认 404: "Cannot GET /api/v1/xxx"
        const cannotMatch = (raw as string).match(/^Cannot (GET|POST|PUT|DELETE|PATCH) (.+)$/);
        if (cannotMatch) {
          message = `请求的接口不存在：${cannotMatch[2]}`;
        } else {
          message = AllExceptionsFilter.DEFAULT_MSG_ZH[raw as string] || raw;
        }
      }
    } else if (exception instanceof Error) {
      // 第三方库/未知错误 — 不泄露内部错误详情
      message = "服务器内部错误，请稍后重试";
    }

    if (status >= 500) {
      // 生产环境只记错误类型，不泄露内部堆栈
      const stack = process.env.NODE_ENV === "production"
        ? (exception instanceof Error ? exception.name : undefined)
        : (exception instanceof Error ? exception.stack : undefined);
      this.logger.error(
        {
          method: request.method,
          url: request.url,
          status,
          errorCode,
          traceId: RequestContext.traceId(),
          stack,
        },
        `${request.method} ${request.url} → ${status}`,
      );
    }

    const traceId = RequestContext.traceId();
    response.status(status).json({
      code: status,
      errorCode: errorCode ?? status,
      message,
      traceId,
      timestamp: Date.now(),
      path: request.url,
    });
    response.setHeader("X-Trace-Id", traceId || "N/A");
  }
}
