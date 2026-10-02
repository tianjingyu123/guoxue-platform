import { Controller, Post, Body, Logger, UseGuards, HttpCode } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TencentImCallbackGuard } from "../../common/tencent-im-callback.guard";
import { SkipFormat } from "../../common/skip-format.decorator";
import { AppGateway } from "../websocket/websocket.gateway";

// 日志事件只能来自固定集合，未知命令不回显外部输入。
const LOGGABLE_COMMANDS = new Set([
  "Group.CallbackBeforeSendMsg", "C2C.CallbackAfterSendMsg", "Group.CallbackAfterSendMsg",
  "State.StateChange", "Bot.OnC2CMessage", "Sns.CallbackFriendAdd", "Sns.CallbackFriendDelete",
  "Sns.CallbackBlackListAdd", "Sns.CallbackBlackListDelete",
]);

/**
 * 腾讯云 IM 回调接收控制器
 *
 * 腾讯云 IM 支持通过 Webhook 将事件推送到业务服务器，
 * 包括：新消息回调、群组事件回调、状态变更回调等。
 * 配置路径：腾讯云 IM 控制台 → 回调配置 → 设置回调URL
 *
 * 回调URL: https://api.rebugx.cn/api/v1/im/callback
 */
@ApiTags("IM 回调")
@Controller("im")
export class ImCallbackController {
  private readonly logger = new Logger(ImCallbackController.name);

  constructor(private readonly ws: AppGateway) {}

  /** 接收所有IM回调事件 */
  @Post("callback")
  @HttpCode(200)
  @UseGuards(TencentImCallbackGuard)
  @SkipFormat()
  @ApiOperation({ summary: "接收腾讯云IM回调事件，推送到WebSocket客户端" })
  @ApiResponse({ status: 200, description: "回调处理成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async handleCallback(@Body() body: {
    CallbackCommand: string;
    [key: string]: unknown;
  }) {
    const cmd = body.CallbackCommand;
    const logCommand = LOGGABLE_COMMANDS.has(cmd) ? cmd : "UNKNOWN";
    this.logger.debug(`IM回调: ${logCommand}`);

    try {
      switch (cmd) {
        case "Group.CallbackBeforeSendMsg":
          return this.handleBeforeGroupMsg(body);
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
          this.logger.debug("未处理的IM回调类型: UNKNOWN");
          return { ActionStatus: "OK", ErrorCode: 0, ErrorInfo: "ignored" };
      }
    } catch {
      this.logger.error(`IM回调处理失败 [${logCommand}]`);
      return { ActionStatus: "FAIL", ErrorCode: 1, ErrorInfo: "internal error" };
    }
  }

  /**
   * 直播群消息只允许由业务服务审核/扣款成功后通过 IM REST API 转发。
   * 客户端 SDK 直发会绕过直播禁言、慢速模式、关注者限制和礼物账务真实性，必须拦截。
   */
  private handleBeforeGroupMsg(body: Record<string, unknown>) {
    const groupId = String(body.GroupId || "");
    if (!groupId.startsWith("live_")) {
      return { ActionStatus: "OK", ErrorCode: 0, ErrorInfo: "" };
    }
    const operator = String(body.Operator_Account || "");
    const adminId = process.env.IM_ADMIN_ID || "administrator";
    if (operator === adminId) {
      return { ActionStatus: "OK", ErrorCode: 0, ErrorInfo: "" };
    }
    this.logger.warn("已拦截直播群客户端直发消息");
    return { ActionStatus: "OK", ErrorCode: 1, ErrorInfo: "请通过直播互动接口发送消息" };
  }

  /** 单聊消息回调 — 推送给接收方 */
  private handleC2CMsg(body: Record<string, unknown>) {
    const from = body.From_Account as string;
    const to = body.To_Account as string;
    const msgBody = (body.MsgBody as Array<Record<string, unknown>>)?.[0];
    const text = (msgBody?.MsgContent as Record<string, unknown>)?.Text as string || "";
    const msgTime = body.MsgTime as number || Math.floor(Date.now() / 1000);
    const msgKey = body.MsgKey as string;

    this.logger.log("IM单聊回调");

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

    this.logger.log("IM群聊回调");

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
    const logAction = ["Login", "Logout", "Disconnect"].includes(action) ? action : "UNKNOWN";
    this.logger.log(`IM状态变更: ${logAction}`);

    // 可在此同步IM侧状态到WebSocket侧
    return { ActionStatus: "OK", ErrorCode: 0 };
  }

  /** 机器人消息回调 */
  private handleBotMessage(_body: Record<string, unknown>) {
    this.logger.log("IM机器人消息回调");
    return { ActionStatus: "OK", ErrorCode: 0 };
  }

  /** 好友申请回调 */
  private handleFriendRequest(body: Record<string, unknown>) {
    const from = body.From_Account as string;
    const to = body.To_Account as string;

    this.logger.log("IM好友申请回调");

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
  private handleFriendDelete(_body: Record<string, unknown>) {
    this.logger.log("IM好友删除回调");
    return { ActionStatus: "OK", ErrorCode: 0 };
  }

  /** 黑名单变更回调 */
  private handleBlacklistChange(_body: Record<string, unknown>, action: string) {
    this.logger.log(`IM黑名单${action === "add" ? "新增" : "移除"}回调`);
    return { ActionStatus: "OK", ErrorCode: 0 };
  }
}
