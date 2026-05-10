import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "./error-codes";

/**
 * 业务异常基类
 * 携带 errorCode，前端可据此做精确的 UI 处理
 */
export class BusinessException extends HttpException {
  readonly errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, message: string, httpStatus?: HttpStatus) {
    const status = httpStatus ?? BusinessException.mapHttpStatus(errorCode);
    super(
      { errorCode, message, statusCode: status },
      status,
    );
    this.errorCode = errorCode;
  }

  /** 根据错误码自动推断 HTTP 状态码 */
  private static mapHttpStatus(code: ErrorCode): HttpStatus {
    const mod = Math.floor(code / 1000);

    switch (mod) {
      // 认证类 → 401
      case 200:
        return HttpStatus.UNAUTHORIZED;
      // 权限类
      case 100:
        if (code === ErrorCode.FORBIDDEN) return HttpStatus.FORBIDDEN;
        return HttpStatus.BAD_REQUEST;
      // 资源不存在类
      default:
        // 大部分映射到 400 Bad Request（业务错误是客户端错误）
        return HttpStatus.BAD_REQUEST;
    }
  }
}
