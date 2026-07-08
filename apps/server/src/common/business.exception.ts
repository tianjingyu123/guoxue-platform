import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "./error-codes";

/**
 * 业务异常基类
 * 携带 errorCode，前端可据此做精确的 UI 处理
 *
 * 推荐用法：
 *   throw new BusinessException(ErrorCode.COURSE_NOT_FOUND);           // 使用默认中文消息
 *   throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "自定义");  // 覆盖默认消息
 */
export class BusinessException extends HttpException {
  readonly errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, message?: string, httpStatus?: HttpStatus) {
    const resolvedMessage = message ?? BusinessException.defaultMessage(errorCode);
    const status = httpStatus ?? BusinessException.mapHttpStatus(errorCode);
    super(
      { errorCode, message: resolvedMessage, statusCode: status },
      status,
    );
    this.errorCode = errorCode;
  }

  /** 默认中文消息映射 —— 无需在 throw 处重复写中文 */
  static defaultMessage(code: ErrorCode): string {
    return BusinessException.MESSAGES[code] || `业务错误 (${code})`;
  }

  private static readonly MESSAGES: Record<number, string> = {
    // 通用
    [ErrorCode.BAD_REQUEST]: "请求参数有误",
    [ErrorCode.VALIDATION_ERROR]: "参数校验失败",
    [ErrorCode.NOT_FOUND]: "资源不存在",
    [ErrorCode.INTERNAL_ERROR]: "服务器内部错误",
    [ErrorCode.FORBIDDEN]: "没有权限执行此操作",
    [ErrorCode.RATE_LIMITED]: "请求过于频繁，请稍后再试",

    // 认证
    [ErrorCode.AUTH_PHONE_EXISTS]: "该手机号已注册",
    [ErrorCode.AUTH_EMAIL_EXISTS]: "该邮箱已注册",
    [ErrorCode.AUTH_PASSWORD_WRONG]: "密码错误",
    [ErrorCode.AUTH_SMS_CODE_INVALID]: "短信验证码错误",
    [ErrorCode.AUTH_SMS_CODE_EXPIRED]: "短信验证码已过期",
    [ErrorCode.AUTH_TOKEN_EXPIRED]: "登录已过期，请重新登录",
    [ErrorCode.AUTH_TOKEN_INVALID]: "无效的登录凭证",
    [ErrorCode.AUTH_WECHAT_FAILED]: "微信授权失败",
    [ErrorCode.AUTH_USER_BANNED]: "账号已被禁用",
    [ErrorCode.AUTH_NOT_LOGGED_IN]: "未登录",

    // 用户
    [ErrorCode.USER_NOT_FOUND]: "用户不存在",
    [ErrorCode.USER_PROFILE_INVALID]: "用户信息不合法",

    // 内容
    [ErrorCode.CONTENT_NOT_FOUND]: "内容不存在",
    [ErrorCode.CONTENT_STATUS_INVALID]: "内容状态异常",

    // 文章
    [ErrorCode.ARTICLE_NOT_FOUND]: "文章不存在",

    // 课程
    [ErrorCode.COURSE_NOT_FOUND]: "课程不存在",
    [ErrorCode.COURSE_ALREADY_ENROLLED]: "已报名该课程",
    [ErrorCode.COURSE_CHAPTER_LOCKED]: "该章节未解锁",

    // 直播
    [ErrorCode.LIVE_ROOM_NOT_FOUND]: "直播间不存在",
    [ErrorCode.LIVE_ROOM_ENDED]: "直播已结束",

    // 短视频
    [ErrorCode.VIDEO_NOT_FOUND]: "视频不存在",

    // 电子书
    [ErrorCode.EBOOK_NOT_FOUND]: "电子书不存在",
    [ErrorCode.EBOOK_NOT_PURCHASED]: "请先购买该电子书",

    // 经典文库
    [ErrorCode.CLASSIC_BOOK_NOT_FOUND]: "书籍不存在",

    // 竞赛
    [ErrorCode.COMPETITION_NOT_FOUND]: "竞赛不存在",
    [ErrorCode.COMPETITION_CLOSED]: "竞赛已结束",

    // 订单
    [ErrorCode.ORDER_NOT_FOUND]: "订单不存在",
    [ErrorCode.ORDER_STATUS_INVALID]: "订单状态异常",
    [ErrorCode.ORDER_REFUND_DENIED]: "该订单不支持退款",
    [ErrorCode.PRODUCT_NOT_FOUND]: "商品不存在",
    [ErrorCode.PRODUCT_OUT_OF_STOCK]: "商品已售罄",
    [ErrorCode.COUPON_INVALID]: "优惠券无效",
    [ErrorCode.COUPON_EXPIRED]: "优惠券已过期",
    [ErrorCode.COUPON_TEMPLATE_NOT_FOUND]: "优惠券模板不存在",

    // 营销
    [ErrorCode.FLASH_SALE_NOT_FOUND]: "秒杀活动不存在",
    [ErrorCode.FLASH_SALE_ENDED]: "秒杀活动已结束",
    [ErrorCode.GROUP_BUY_NOT_FOUND]: "拼团活动不存在",
    [ErrorCode.GROUP_BUY_ENDED]: "拼团活动已结束",
    [ErrorCode.DISCOUNT_NOT_FOUND]: "折扣活动不存在",
    [ErrorCode.DISCOUNT_EXPIRED]: "折扣活动已过期",
    [ErrorCode.FULL_REDUCTION_NOT_FOUND]: "满减活动不存在",
    [ErrorCode.ACTIVITY_NOT_AVAILABLE]: "活动不可用",
    [ErrorCode.MICRO_PAGE_NOT_FOUND]: "微页面不存在",

    // 支付
    [ErrorCode.PAY_FAILED]: "支付失败",
    [ErrorCode.PAY_SIGNATURE_INVALID]: "支付签名验证失败",
    [ErrorCode.PAY_AMOUNT_MISMATCH]: "支付金额不一致",

    // 虚拟币
    [ErrorCode.COIN_BALANCE_INSUFFICIENT]: "余额不足",
    [ErrorCode.COIN_RECHARGE_FAILED]: "充值失败",
    [ErrorCode.COIN_AMOUNT_INVALID]: "充值金额不合法",

    // 圈子
    [ErrorCode.CIRCLE_NOT_FOUND]: "圈子不存在",
    [ErrorCode.CIRCLE_JOIN_DENIED]: "该圈子不允许加入",
    [ErrorCode.CIRCLE_MEMBER_EXISTS]: "已是该圈子成员",
    [ErrorCode.CIRCLE_POST_NOT_FOUND]: "帖子不存在",
    [ErrorCode.CIRCLE_NOT_MEMBER]: "不是圈子成员",

    // 互动
    [ErrorCode.INTERACTION_DUPLICATE]: "请勿重复操作",
    [ErrorCode.COMMENT_NOT_FOUND]: "评论不存在",
    [ErrorCode.COMMENT_FORBIDDEN]: "该内容禁止评论",

    // 排盘
    [ErrorCode.PAIPAN_INPUT_INVALID]: "排盘输入参数有误",
    [ErrorCode.PAIPAN_RECORD_NOT_FOUND]: "排盘记录不存在",

    // 实名
    [ErrorCode.IDENTITY_VERIFY_FAILED]: "实名认证失败",
    [ErrorCode.IDENTITY_ALREADY_VERIFIED]: "已完成实名认证",

    // 文件
    [ErrorCode.UPLOAD_FILE_TOO_LARGE]: "上传文件过大",
    [ErrorCode.UPLOAD_FILE_TYPE_DENIED]: "不支持的文件格式",

    // 第三方
    [ErrorCode.THIRD_SMS_FAILED]: "短信发送失败",
    [ErrorCode.THIRD_WECHAT_FAILED]: "微信服务异常",
    [ErrorCode.THIRD_AI_FAILED]: "AI 服务异常",
    [ErrorCode.THIRD_IM_FAILED]: "IM 服务异常",

    // 分站
    [ErrorCode.STATION_NOT_FOUND]: "分站不存在",
    [ErrorCode.STATION_CODE_EXISTS]: "分站编码已存在",

    // 站长精选
    [ErrorCode.STATION_PICK_LIMIT_EXCEEDED]: "精选内容数量已达上限",
    [ErrorCode.STATION_PICK_ALREADY_EXISTS]: "该内容已是精选",
    [ErrorCode.STATION_PICK_NOT_FOUND]: "精选内容不存在",
    [ErrorCode.STATION_PICK_CONTENT_GONE]: "精选内容已下架",

    // 结算
    [ErrorCode.SETTLEMENT_NOT_FOUND]: "结算单不存在",
    [ErrorCode.SETTLEMENT_STATUS_INVALID]: "结算单状态异常",

    // 分佣
    [ErrorCode.COMMISSION_NOT_FOUND]: "分佣记录不存在",
    [ErrorCode.COMMISSION_STATUS_INVALID]: "分佣状态异常",

    // 签到
    [ErrorCode.CHECKIN_ALREADY_DONE]: "今日已签到",

    // 商家
    [ErrorCode.MERCHANT_NOT_FOUND]: "商家不存在",
    [ErrorCode.MERCHANT_STATUS_INVALID]: "商家状态异常",
    [ErrorCode.MERCHANT_DEPOSIT_NOT_PAID]: "商家保证金未缴纳",
    [ErrorCode.MERCHANT_ALREADY_EXISTS]: "该商家已入驻",
    [ErrorCode.MERCHANT_AGREEMENT_NOT_SIGNED]: "请先签署商家协议",
    [ErrorCode.MERCHANT_VIOLATION_EXISTS]: "商家存在违规记录",

    // 任务池
    [ErrorCode.TASK_NOT_FOUND]: "任务不存在",
    [ErrorCode.TASK_STATUS_INVALID]: "任务状态异常",
    [ErrorCode.TASK_NOT_NEED_APPROVAL]: "该任务无需审批",
    [ErrorCode.TASK_ALREADY_CLAIMED]: "任务已被领取",
    [ErrorCode.ROLLBACK_NOT_AVAILABLE]: "该操作不支持回滚",

    // 治理护栏
    [ErrorCode.RED_LINE_HUMAN_ONLY]: "该操作触碰红线（钱/用户数据/对外发布/不可逆/合规），须由真人执行，自动化永久禁止",
    [ErrorCode.AUTONOMY_LEVEL_INVALID]: "自主分级取值非法（只能 L1/L2/L3）",
    [ErrorCode.AUTONOMY_ILLEGAL_PROMOTION]: "自主分级只能逐级晋升（L1→L2→L3），不得跳级",
  };

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
    ErrorCode.LIVE_ROOM_NOT_FOUND,
    ErrorCode.VIDEO_NOT_FOUND,
    ErrorCode.EBOOK_NOT_FOUND,
    ErrorCode.CLASSIC_BOOK_NOT_FOUND,
    ErrorCode.COMPETITION_NOT_FOUND,
    ErrorCode.COUPON_TEMPLATE_NOT_FOUND,
    ErrorCode.FLASH_SALE_NOT_FOUND,
    ErrorCode.GROUP_BUY_NOT_FOUND,
    ErrorCode.DISCOUNT_NOT_FOUND,
    ErrorCode.FULL_REDUCTION_NOT_FOUND,
    ErrorCode.MICRO_PAGE_NOT_FOUND,
    ErrorCode.SETTLEMENT_NOT_FOUND,
    ErrorCode.COMMISSION_NOT_FOUND,
  ]);

  private static FORBIDDEN_CODES = new Set<number>([
    ErrorCode.FORBIDDEN,
    ErrorCode.AUTH_USER_BANNED,
    ErrorCode.COURSE_CHAPTER_LOCKED,
    ErrorCode.CIRCLE_JOIN_DENIED,
    ErrorCode.COMMENT_FORBIDDEN,
    ErrorCode.ORDER_STATUS_INVALID,
    ErrorCode.EBOOK_NOT_PURCHASED,
    ErrorCode.COMPETITION_CLOSED,
    ErrorCode.FLASH_SALE_ENDED,
    ErrorCode.GROUP_BUY_ENDED,
    ErrorCode.LIVE_ROOM_ENDED,
    ErrorCode.RED_LINE_HUMAN_ONLY,
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

  private static INTERNAL_ERROR_CODES = new Set<number>([
    ErrorCode.INTERNAL_ERROR,
  ]);

  private static RATE_LIMITED_CODES = new Set<number>([
    ErrorCode.RATE_LIMITED,
  ]);

  /** 根据错误码自动推断 HTTP 状态码 */
  private static mapHttpStatus(code: ErrorCode): HttpStatus {
    if (this.NOT_FOUND_CODES.has(code)) return HttpStatus.NOT_FOUND;
    if (this.FORBIDDEN_CODES.has(code)) return HttpStatus.FORBIDDEN;
    if (this.CONFLICT_CODES.has(code)) return HttpStatus.CONFLICT;
    if (this.INTERNAL_ERROR_CODES.has(code)) return HttpStatus.INTERNAL_SERVER_ERROR;
    if (this.RATE_LIMITED_CODES.has(code)) return HttpStatus.TOO_MANY_REQUESTS;

    const mod = Math.floor(code / 1000);

    switch (mod) {
      case 200:
        return HttpStatus.UNAUTHORIZED;
      case 700:
        return HttpStatus.BAD_GATEWAY;
      default:
        return HttpStatus.BAD_REQUEST;
    }
  }
}
