/**
 * 消息推送 Provider 接口（国际化预留）
 *
 * 现有实现：PushService（微信订阅消息 + 公众号模板消息）
 * 未来扩展：FirebasePushProvider / ApnsProvider
 */

export interface IPushProvider {
  /** 推送给单个用户 */
  sendToUser(userId: string, payload: PushPayload): Promise<{ success: boolean; raw?: unknown }>;

  /** 推送给多个用户 */
  sendToUsers(userIds: string[], payload: PushPayload): Promise<{ success: boolean; raw?: unknown }>;

  /** 按主题推送 */
  sendToTopic?(topic: string, payload: PushPayload): Promise<{ success: boolean; raw?: unknown }>;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  clickAction?: string;
}
