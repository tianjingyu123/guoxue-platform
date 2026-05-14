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

  private static NOT_FOUND_CODES = new Set<number>([
    ErrorCode.NOT_FOUND,
    ErrorCode.USER_NOT_FOUND,
    ErrorCode.CONTENT_NOT_FOUND,
    ErrorCode.ARTICLE_NOT_FOUND,
    ErrorCode.COURSE_NOT_FOUND,
    ErrorCode.ORDER_NOT_FOUND,
    ErrorCode.PRODUCT_NOT_FOUND,
    ErrorCode.CIRCLE_NOT_FOUND,
    ErrorCode.CIRCLE_POST_NOT_FOUND,
    ErrorCode.COMMENT_NOT_FOUND,
    ErrorCode.PAIPAN_RECORD_NOT_FOUND,
    ErrorCode.STATION_NOT_FOUND,
    ErrorCode.MERCHANT_NOT_FOUND,
    ErrorCode.TASK_NOT_FOUND,
    ErrorCode.STATION_PICK_NOT_FOUND,
    ErrorCode.STATION_PICK_CONTENT_GONE,
  ]);

  private static FORBIDDEN_CODES = new Set<number>([
    ErrorCode.FORBIDDEN,
    ErrorCode.AUTH_USER_BANNED,
    ErrorCode.COURSE_CHAPTER_LOCKED,
    ErrorCode.CIRCLE_JOIN_DENIED,
    ErrorCode.COMMENT_FORBIDDEN,
    ErrorCode.ORDER_STATUS_INVALID,
  ]);

  private static CONFLICT_CODES = new Set<number>([
    ErrorCode.AUTH_PHONE_EXISTS,
    ErrorCode.AUTH_EMAIL_EXISTS,
    ErrorCode.CIRCLE_MEMBER_EXISTS,
    ErrorCode.INTERACTION_DUPLICATE,
    ErrorCode.MERCHANT_ALREADY_EXISTS,
    ErrorCode.IDENTITY_ALREADY_VERIFIED,
    ErrorCode.STATION_CODE_EXISTS,
    ErrorCode.STATION_PICK_ALREADY_EXISTS,
  ]);

  /** 根据错误码自动推断 HTTP 状态码 */
  private static mapHttpStatus(code: ErrorCode): HttpStatus {
    if (this.NOT_FOUND_CODES.has(code)) return HttpStatus.NOT_FOUND;
    if (this.FORBIDDEN_CODES.has(code)) return HttpStatus.FORBIDDEN;
    if (this.CONFLICT_CODES.has(code)) return HttpStatus.CONFLICT;

    const mod = Math.floor(code / 1000);

    switch (mod) {
      case 200:
        return HttpStatus.UNAUTHORIZED;
      default:
        return HttpStatus.BAD_REQUEST;
    }
  }
}
