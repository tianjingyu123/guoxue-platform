import { Controller, Post, Body, Logger, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TencentCallbackGuard } from "../../common/tencent-callback.guard";
import { AppGateway } from "../websocket/websocket.gateway";

/**
 * 腾讯云 IM 回调接收控制器
 *
 * 腾讯云 IM 支持通过 Webhook 将事件推送到业务服务器，
 * 包括：新消息回调、群组事件回调、状态变更回调等。
 * 配置路径：腾讯云 IM 控制台 → 回调配置 → 设置回调URL
 *
 * 回调URL: https://api.guoxue.com/api/v1/im/callback
 */
@ApiTags("IM 回调")
@Controller("im")
export class ImCallbackController {
  private readonly logger = new Logger(ImCallbackController.name);

  constructor(private readonly ws: AppGateway) {}

  /** 接收所有IM回调事件 */
  @Post("callback")
  @UseGuards(TencentCallbackGuard)
  @ApiOperation({ summary: "接收腾讯云IM回调事件，推送到WebSocket客户端" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async handleCallback(@Body() body: {
    CallbackCommand: string;
    [key: string]: unknown;
  }) {
    const cmd = body.CallbackCommand;
    this.logger.debug(`IM回调: ${cmd}`);

    try {
      switch (cmd) {
        case "C2C.CallbackAfterSendMsg":
          return this.handleC2CMsg(body);
        case "Group.CallbackAfterSendMsg":
          return this.handleGroupMsg(body);
        case "State.StateChange":
          return this.handleStateChange(body);
        case "Bot.OnC2CMessage":
          return this.handleBotMessage(body);
        case "Sns.CallbackFriendAdd":
          return this.handleFriendRequest(body);
        case "Sns.CallbackFriendDelete":
          return this.handleFriendDelete(body);
        case "Sns.CallbackBlackListAdd":
          return this.handleBlacklistChange(body, "add");
        case "Sns.CallbackBlackListDelete":
          return this.handleBlacklistChange(body, "remove");
        default:
          this.logger.debug(`未处理的IM回调类型: ${cmd}`);
          return { ActionStatus: "OK", ErrorCode: 0, ErrorInfo: "ignored" };
      }
    } catch (err: unknown) {
      this.logger.error(`IM回调处理失败 [${cmd}]: ${err instanceof Error ? err.message : String(err)}`);
      return { ActionStatus: "FAIL", ErrorCode: 1, ErrorInfo: "internal error" };
    }
  }

  /** 单聊消息回调 — 推送给接收方 */
  private handleC2CMsg(body: Record<string, unknown>) {
    const from = body.From_Account as string;
    const to = body.To_Account as string;
    const msgBody = (body.MsgBody as Array<Record<string, unknown>>)?.[0];
    const text = (msgBody?.MsgContent as Record<string, unknown>)?.Text as string || "";
    const msgTime = body.MsgTime as number || Math.floor(Date.now() / 1000);
    const msgKey = body.MsgKey as string;

    this.logger.log(`IM单聊: ${from} → ${to}: ${text.slice(0, 50)}`);

    // 推送给接收方（如果在线）
    this.ws.notifyImMessage(to, {
      fromUserId: from,
      toUserId: to,
      text,
      msgTime,
      msgKey,
    });

    return { ActionStatus: "OK", ErrorCode: 0 };
  }

  /** 群消息回调 — 推送给群内所有在线成员 */
  private handleGroupMsg(body: Record<string, unknown>) {
    const groupId = body.GroupId as string;
    const from = body.From_Account as string;
    const msgBody = (body.MsgBody as Array<Record<string, unknown>>)?.[0];
    const text = (msgBody?.MsgContent as Record<string, unknown>)?.Text as string || "";
    const msgTime = body.MsgTime as number || Math.floor(Date.now() / 1000);

    this.logger.log(`IM群聊: ${from} → ${groupId}: ${text.slice(0, 50)}`);

    this.ws.notifyImGroupMessage(groupId, {
      fromUserId: from,
      text,
      msgTime,
    });

    return { ActionStatus: "OK", ErrorCode: 0 };
  }

  /** 用户在线状态变更 */
  private handleStateChange(body: Record<string, unknown>) {
    const info = body.Info as Record<string, unknown> | undefined;
    const action = info?.Action as string; // "Login" | "Logout" | "Disconnect"
    const toAccount = info?.To_Account as string;

    this.logger.log(`IM状态变更: ${toAccount} ${action}`);

    // 可在此同步IM侧状态到WebSocket侧
    return { ActionStatus: "OK", ErrorCode: 0 };
  }

  /** 机器人消息回调 */
  private handleBotMessage(body: Record<string, unknown>) {
    const from = body.From_Account as string;
    const msgBody = (body.MsgBody as Array<Record<string, unknown>>)?.[0];
    const text = (msgBody?.MsgContent as Record<string, unknown>)?.Text as string || "";

    this.logger.log(`IM机器人消息: ${from}: ${text.slice(0, 50)}`);
    return { ActionStatus: "OK", ErrorCode: 0 };
  }

  /** 好友申请回调 */
  private handleFriendRequest(body: Record<string, unknown>) {
    const from = body.From_Account as string;
    const to = body.To_Account as string;

    this.logger.log(`IM好友申请: ${from} → ${to}`);

    this.ws.notifyImMessage(to, {
      fromUserId: from,
      toUserId: to,
      text: "请求添加您为好友",
      msgTime: Math.floor(Date.now() / 1000),
      msgKey: `friend_request_${from}_${Date.now()}`,
    });

    return { ActionStatus: "OK", ErrorCode: 0 };
  }

  /** 好友删除回调 */
  private handleFriendDelete(body: Record<string, unknown>) {
    const from = body.From_Account as string;
    const to = body.To_Account as string;

    this.logger.log(`IM好友删除: ${from} ← ${to}`);
    return { ActionStatus: "OK", ErrorCode: 0 };
  }

  /** 黑名单变更回调 */
  private handleBlacklistChange(body: Record<string, unknown>, action: string) {
    const from = body.From_Account as string;
    const to = (body.To_Account as string[])?.[0];

    this.logger.log(`IM黑名单${action === "add" ? "新增" : "移除"}: ${from} → ${to}`);
    return { ActionStatus: "OK", ErrorCode: 0 };
  }
}
