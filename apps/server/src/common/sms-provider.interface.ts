/**
 * 短信服务 Provider 接口（国际化预留）
 *
 * 现有实现：SmsService（腾讯云 SMS）
 * 未来扩展：TwilioProvider / AwsSnsProvider
 */

export interface ISmsProvider {
  /** 发送短信验证码 */
  sendVerificationCode(phone: string, code: string): Promise<{ success: boolean; raw?: unknown }>;

  /** 发送自定义短信 */
  sendMessage(phone: string, message: string): Promise<{ success: boolean; raw?: unknown }>;

  /** 查询发送状态 */
  queryStatus(sendId: string): Promise<{ status: string; raw?: unknown }>;
}
