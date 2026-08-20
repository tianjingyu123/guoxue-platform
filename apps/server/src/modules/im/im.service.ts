import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { TlsSigService } from "./tlssig.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { MetricsService } from "../../common/metrics.service";
import { ImPolicyService, ImMediaPerms } from "./im-policy.service";
import { AuditService } from "../audit/audit.service";

export interface TimApiResponse {
  ErrorCode: number;
  ErrorInfo?: string;
  [key: string]: unknown;
}

/** 归一化好友项（前端通讯录直接消费；nick/avatar 来自资料，remark 来自 SNS 备注） */
export interface ImFriend {
  userId: string;
  nick: string;
  avatar: string;
  remark: string;
}

@Injectable()
export class ImService {
  private readonly logger = new Logger(ImService.name);
  private readonly appId: number;
  private readonly adminId: string;
  private readonly baseUrl = "https://console.tim.qq.com";

  /** 私信深审采样率（0~1·默认全量·本地快拦不受此影响始终全量） */
  private readonly C2C_AUDIT_SAMPLE = Math.min(1, Math.max(0, Number(process.env.IM_AUDIT_SAMPLE ?? 1)));

  constructor(
    private tlsSig: TlsSigService,
    private policy: ImPolicyService,
    private audit: AuditService,
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    this.appId = this.tlsSig.getAppId();
    this.adminId = process.env.IM_ADMIN_ID || "administrator";
  }

  /**
   * 单聊发送前置闸门：依据私信社交策略判定是否放行。
   * 不通过则抛 FORBIDDEN（带 hint 文案）；media 指定时同时校验富媒体权限。
   */
  private async assertC2CAllowed(
    fromUserId: string,
    toUserId: string,
    media?: keyof ImMediaPerms,
  ) {
    const result = await this.policy.evaluateC2C(fromUserId, toUserId);
    if (!result.canSend) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        result.hint || "当前关系无法向对方发送消息",
      );
    }
    if (media && !result.mediaPerms[media]) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        "当前关系暂不支持发送该类型消息，互相关注后可发送",
      );
    }
    return result;
  }

  /** 检查 IM 是否已配置 */
  private ensureConfigured() {
    if (!this.appId || !process.env.IM_ADMIN_KEY) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "IM 未配置，请联系管理员");
    }
  }

  /** 为用户生成 UserSig */
  genUserSig(userId: string) {
    this.ensureConfigured();
    const userSig = this.tlsSig.genUserSig(userId);
    return { appId: this.appId, userId, userSig };
  }

  /** 调用腾讯云 IM REST API */
  private async callImApi(path: string, body: Record<string, unknown>) {
    this.ensureConfigured();
    const adminSig = this.tlsSig.genAdminSig();
    const url = `${this.baseUrl}/v4/${path}?sdkappid=${this.appId}&identifier=${encodeURIComponent(this.adminId)}&usersig=${encodeURIComponent(adminSig)}&random=${Date.now()}&contenttype=json`;

    const start = Date.now();
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000), // 防腾讯 IM 无响应挂死请求线程
      });

      const duration = Date.now() - start;
      const data = (await resp.json()) as TimApiResponse;

      if (data.ErrorCode !== 0) {
        this.metrics?.recordExternalApi("im", path, false, duration, String(data.ErrorCode));
        this.logger.error(`IM API 调用失败: ${path}`, data);
        throw new BusinessException(ErrorCode.THIRD_IM_FAILED, `IM 操作失败: ${data.ErrorInfo || "未知错误"}`);
      }

      this.metrics?.recordExternalApi("im", path, true, duration);
      return data;
    } catch (err) {
      const duration = Date.now() - start;
      if (err instanceof BusinessException) throw err;
      const reason = (err as Error).message?.substring(0, 50) ?? "network_error";
      this.metrics?.recordExternalApi("im", path, false, duration, reason);
      throw err;
    }
  }

  // ───────── 账号管理 ─────────

  /** 导入单个账号到 IM */
  async importAccount(userId: string, nickname?: string, avatar?: string) {
    return this.callImApi("im_open_login_svc/account_import", {
      Identifier: userId,
      Nick: nickname || userId,
      FaceUrl: avatar || "",
    });
  }

  /** 查询账号在线状态 */
  async queryAccountState(userIds: string[]) {
    return this.callImApi("openim/querystate", {
      To_Account: userIds,
    });
  }

  /** 更新账号资料 */
  async updateProfile(userId: string, profile: { nickname?: string; avatar?: string }) {
    const items: Array<{ Tag: string; Value: string }> = [];
    if (profile.nickname) {
      items.push({ Tag: "Tag_Profile_IM_Nick", Value: profile.nickname });
    }
    if (profile.avatar) {
      items.push({ Tag: "Tag_Profile_IM_Image", Value: profile.avatar });
    }
    if (items.length === 0) return { message: "无更新内容" };

    return this.callImApi("profile/portrait_set", {
      From_Account: userId,
      ProfileItem: items,
    });
  }

  // ───────── 群组管理 ─────────

  /** 创建 IM 群组（AVChatRoom 直播大群不支持 ApplyJoinOption·加群本就自由进出） */
  async createGroup(
    groupId: string,
    name: string,
    type: string = "Public",
    ownerId?: string,
  ) {
    return this.callImApi("group_open_http_svc/create_group", {
      GroupId: groupId,
      Type: type,
      Name: name,
      Owner_Account: ownerId || this.adminId,
      ...(type === "AVChatRoom" ? {} : { ApplyJoinOption: type === "Public" ? "FreeAccess" : "NeedPermission" }),
    });
  }

  /** 解散群组 */
  async destroyGroup(groupId: string) {
    return this.callImApi("group_open_http_svc/destroy_group", {
      GroupId: groupId,
    });
  }

  /** 添加群成员 */
  async addGroupMembers(groupId: string, memberIds: string[]) {
    return this.callImApi("group_open_http_svc/add_group_member", {
      GroupId: groupId,
      MemberList: memberIds.map((id) => ({ Member_Account: id })),
    });
  }

  /** 删除群成员 */
  async deleteGroupMembers(groupId: string, memberIds: string[]) {
    return this.callImApi("group_open_http_svc/delete_group_member", {
      GroupId: groupId,
      MemberToDel_Account: memberIds,
    });
  }

  /** 在群内发送消息 */
  async sendGroupMsg(groupId: string, text: string, fromUserId?: string) {
    if (fromUserId && groupId.startsWith("live_")) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "直播消息必须通过直播互动接口发送");
    }
    // 越权防护：真实用户发言前校验其为该群成员（fromUserId 缺省时为系统/管理员消息，放行）
    if (fromUserId) {
      const isMember = await this.isGroupMember(groupId, fromUserId);
      if (!isMember) throw new BusinessException(ErrorCode.FORBIDDEN, "非群成员，无法发送群消息");
    }
    return this.callImApi("group_open_http_svc/send_group_msg", {
      GroupId: groupId,
      From_Account: fromUserId || this.adminId,
      Random: Math.floor(Math.random() * 0xffffffff),
      MsgBody: [
        {
          MsgType: "TIMTextElem",
          MsgContent: { Text: text },
        },
      ],
    });
  }

  /**
   * 仅供评论审核或礼物扣款成功后的服务端内部中继。
   * 保留真实发言人身份用于客户端展示，但腾讯云请求仍由管理员账号签名执行。
   */
  async relayLiveGroupMsg(groupId: string, text: string, fromUserId: string) {
    if (!groupId.startsWith("live_")) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "直播中继只允许发送到直播群");
    }
    return this.callImApi("group_open_http_svc/send_group_msg", {
      GroupId: groupId,
      From_Account: fromUserId,
      ForbidCallbackControl: ["ForbidBeforeSendMsgCallback"],
      Random: Math.floor(Math.random() * 0xffffffff),
      MsgBody: [
        {
          MsgType: "TIMTextElem",
          MsgContent: { Text: text },
        },
      ],
    });
  }

  /** 扣款成功后的结构化礼物事件；普通文本不能伪装成礼物。 */
  async relayLiveGift(
    groupId: string,
    event: { recordId: string; giftId: string; giftName: string; quantity: number },
    fromUserId: string,
  ) {
    if (!groupId.startsWith("live_")) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "直播礼物中继只允许发送到直播群");
    }
    return this.callImApi("group_open_http_svc/send_group_msg", {
      GroupId: groupId,
      From_Account: fromUserId,
      ForbidCallbackControl: ["ForbidBeforeSendMsgCallback"],
      Random: Math.floor(Math.random() * 0xffffffff),
      MsgBody: [
        {
          MsgType: "TIMCustomElem",
          MsgContent: {
            Data: JSON.stringify({ type: "LIVE_GIFT", ...event }),
            Desc: "LIVE_GIFT",
            Ext: "v1",
          },
        },
      ],
    });
  }

  /** 获取群组历史消息 */
  async getGroupHistory(groupId: string, _page = 1, pageSize = 20) {
    return this.callImApi("group_open_http_svc/group_msg_get_simple", {
      GroupId: groupId,
      ReqMsgNumber: pageSize,
      ReqMsgSeq: 0,
    });
  }

  // ───────── 单聊消息 ─────────

  /**
   * 发送单聊消息。
   *
   * 内容审核（私信是导流/诈骗高发渠道·高频·实时性权衡）：
   * 1. **本地词库同步快拦**（<1ms·零网络）：命中"加微信/加QQ/私聊"等导流话术、诈骗话术即拦，不发送；
   * 2. 发送成功后 **异步深审**（腾讯云 TMS + DeepSeek·可采样）：判 severe 则调 admin_msgwithdraw 撤回已发消息。
   * fail-open：密钥未配时本地快拦仍生效，TMS/DeepSeek 降级放行不阻断私信。
   */
  async sendC2CMsg(fromUserId: string, toUserId: string, text: string) {
    await this.assertC2CAllowed(fromUserId, toUserId);

    // ① 本地词库同步快拦（导流/诈骗话术零网络硬拦·敏感内容不落日志正文）
    const localHits = this.audit.hasLocalViolation(text);
    if (localHits.length > 0) {
      throw new BusinessException(ErrorCode.CONTENT_MODERATION_BLOCKED, "消息包含违规信息，无法发送");
    }

    const res = await this.callImApi("openim/sendmsg", {
      SyncOtherMachine: 1,
      From_Account: fromUserId,
      To_Account: toUserId,
      MsgLifeTime: 604800, // 7天
      MsgRandom: Math.floor(Math.random() * 0xffffffff),
      MsgTimeStamp: Math.floor(Date.now() / 1000),
      MsgBody: [
        {
          MsgType: "TIMTextElem",
          MsgContent: { Text: text },
        },
      ],
    });
    // 发送成功：累加我→对方的待回计数；并清零对方→我的待回计数（本次相当于我回复了对方）
    await this.policy.incrementSent(fromUserId, toUserId);
    await this.policy.resetOnReply(fromUserId, toUserId);

    // ② 异步深审（采样·不阻塞发送响应）：severe → 撤回已发消息
    if (this.C2C_AUDIT_SAMPLE >= 1 || Math.random() < this.C2C_AUDIT_SAMPLE) {
      const msgKey = (res as TimApiResponse).MsgKey;
      void this.auditC2CMsgAsync(fromUserId, toUserId, text, typeof msgKey === "string" ? msgKey : undefined);
    }
    return res;
  }

  /** 私信事后深审：命中 severe 即撤回已发消息（需 MsgKey）。全程 catch·不抛出·不影响已发送结果。 */
  private async auditC2CMsgAsync(fromUserId: string, toUserId: string, text: string, msgKey?: string): Promise<void> {
    try {
      const risk = await this.audit.classifyTextRisk(text, { scene: "IM_C2C", userId: fromUserId, dataId: toUserId });
      if (risk.verdict !== "severe") return; // mild/uncertain 私信不自动撤回，仅 severe 硬撤回（已由审计日志留痕）
      if (!msgKey) return; // 无 MsgKey 无法定位撤回（腾讯 IM 未回传）
      await this.withdrawMsg(fromUserId, toUserId, msgKey);
    } catch (err) {
      this.logger.warn(`私信深审/撤回异常（fail-open·不影响已发送）`, err instanceof Error ? err.message : err);
    }
  }

  /** 获取单聊历史消息 */
  async getC2CHistory(fromUserId: string, toUserId: string, maxCount = 20) {
    return this.callImApi("openim/admin_getroammsg", {
      From_Account: fromUserId,
      To_Account: toUserId,
      MaxCnt: maxCount,
      MinTime: 0,
      MaxTime: Math.floor(Date.now() / 1000),
    });
  }

  /** 撤回消息 */
  async withdrawMsg(fromUserId: string, toUserId: string, msgKey: string) {
    return this.callImApi("openim/admin_msgwithdraw", {
      From_Account: fromUserId,
      To_Account: toUserId,
      MsgKey: msgKey,
    });
  }

  // ───────── 好友管理 ─────────

  /** 添加好友 */
  async addFriend(fromUserId: string, toUserId: string, remark?: string) {
    return this.callImApi("sns/friend_add", {
      From_Account: fromUserId,
      AddFriendItem: [
        {
          To_Account: toUserId,
          AddSource: "AddSource_Type_RestAPI",
          Remark: remark || "",
        },
      ],
    });
  }

  /** 删除好友 */
  async deleteFriend(fromUserId: string, toUserId: string) {
    return this.callImApi("sns/friend_delete", {
      From_Account: fromUserId,
      To_Account: [toUserId],
    });
  }

  /** 批量拉取用户昵称/头像（profile/portrait_get），返回 { [userId]: { nick, avatar } } */
  private async getProfiles(
    accounts: string[],
  ): Promise<Record<string, { nick: string; avatar: string }>> {
    const map: Record<string, { nick: string; avatar: string }> = {};
    if (accounts.length === 0) return map;
    const resp = (await this.callImApi("profile/portrait_get", {
      To_Account: accounts,
      TagList: ["Tag_Profile_IM_Nick", "Tag_Profile_IM_Image"],
    })) as TimApiResponse;
    const profileItems =
      (resp.UserProfileItem as Array<{
        To_Account?: string;
        ProfileItem?: Array<{ Tag?: string; Value?: unknown }>;
      }>) || [];
    for (const p of profileItems) {
      if (!p.To_Account) continue;
      const nick = (p.ProfileItem || []).find((t) => t.Tag === "Tag_Profile_IM_Nick")?.Value;
      const avatar = (p.ProfileItem || []).find((t) => t.Tag === "Tag_Profile_IM_Image")?.Value;
      map[p.To_Account] = {
        nick: typeof nick === "string" ? nick : "",
        avatar: typeof avatar === "string" ? avatar : "",
      };
    }
    return map;
  }

  /** 获取好友列表（拉取好友账号 + 批量补全昵称/头像/备注，归一化返回给前端通讯录） */
  async getFriendList(userId: string): Promise<{ friends: ImFriend[] }> {
    const listResp = (await this.callImApi("sns/friend_get", {
      From_Account: userId,
      StartIndex: 0,
    })) as TimApiResponse;
    const items =
      (listResp.UserDataItem as Array<{
        To_Account?: string;
        ValueItem?: Array<{ Tag?: string; Value?: unknown }>;
      }>) || [];
    const accounts: string[] = [];
    const remarkMap: Record<string, string> = {};
    for (const it of items) {
      const acc = it.To_Account;
      if (!acc) continue;
      accounts.push(acc);
      const remark = (it.ValueItem || []).find((v) => v.Tag === "Tag_SNS_IM_Remark")?.Value;
      if (typeof remark === "string" && remark) remarkMap[acc] = remark;
    }
    const profiles = await this.getProfiles(accounts);
    const friends: ImFriend[] = accounts.map((acc) => ({
      userId: acc,
      nick: profiles[acc]?.nick || "",
      avatar: profiles[acc]?.avatar || "",
      remark: remarkMap[acc] || "",
    }));
    return { friends };
  }

  /** 拉黑用户 */
  async addBlacklist(fromUserId: string, toUserId: string) {
    return this.callImApi("sns/black_list_add", {
      From_Account: fromUserId,
      To_Account: [toUserId],
    });
  }

  /** 取消拉黑 */
  async removeBlacklist(fromUserId: string, toUserId: string) {
    return this.callImApi("sns/black_list_delete", {
      From_Account: fromUserId,
      To_Account: [toUserId],
    });
  }

  /** 获取黑名单列表 */
  async getBlacklist(userId: string) {
    return this.callImApi("sns/black_list_get", {
      From_Account: userId,
    });
  }

  // ───────── 群组详情 ─────────

  /** 获取群组详细信息 */
  async getGroupInfo(groupIds: string[]) {
    return this.callImApi("group_open_http_svc/get_group_info", {
      GroupIdList: groupIds.map((id) => ({ GroupId: id })),
      ResponseFilter: {
        GroupBaseInfoFilter: [
          "Type", "Name", "Introduction", "Notification", "FaceUrl",
          "Owner_Account", "CreateTime", "MemberNum", "MaxMemberNum",
          "ApplyJoinOption",
        ],
      },
    });
  }

  /** 获取群成员列表 */
  async getGroupMembers(groupId: string) {
    return this.callImApi("group_open_http_svc/get_group_member_info", {
      GroupId: groupId,
      Offset: 0,
      Limit: 500,
    });
  }

  /** 判断 targetUserId 是否为 userId 的好友（用于授权校验） */
  async isFriend(userId: string, targetUserId: string): Promise<boolean> {
    const { friends } = await this.getFriendList(userId);
    return friends.some((f) => f.userId === targetUserId);
  }

  /** 判断 userId 是否为该群成员（用于授权校验） */
  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const resp = (await this.getGroupMembers(groupId)) as TimApiResponse;
    const members = (resp.MemberList as Array<{ Member_Account?: string }>) || [];
    return members.some((m) => m.Member_Account === userId);
  }

  /** 发送图片消息（单聊） */
  async sendC2CImage(fromUserId: string, toUserId: string, imageUrl: string, width?: number, height?: number) {
    await this.assertC2CAllowed(fromUserId, toUserId, "image");
    return this.callImApi("openim/sendmsg", {
      SyncOtherMachine: 1,
      From_Account: fromUserId,
      To_Account: toUserId,
      MsgLifeTime: 604800,
      MsgRandom: Math.floor(Math.random() * 0xffffffff),
      MsgTimeStamp: Math.floor(Date.now() / 1000),
      MsgBody: [
        {
          MsgType: "TIMImageElem",
          MsgContent: {
            UUID: imageUrl,
            ImageFormat: 1,
            ImageInfoArray: [
              { Type: 1, Size: 0, Width: width || 0, Height: height || 0, URL: imageUrl },
            ],
          },
        },
      ],
    });
  }

  /** 发送自定义消息 */
  async sendCustomMsg(fromUserId: string, toUserId: string, data: Record<string, unknown>, desc?: string) {
    await this.assertC2CAllowed(fromUserId, toUserId);
    return this.callImApi("openim/sendmsg", {
      SyncOtherMachine: 1,
      From_Account: fromUserId,
      To_Account: toUserId,
      MsgLifeTime: 604800,
      MsgRandom: Math.floor(Math.random() * 0xffffffff),
      MsgTimeStamp: Math.floor(Date.now() / 1000),
      MsgBody: [
        {
          MsgType: "TIMCustomElem",
          MsgContent: {
            Data: JSON.stringify(data),
            Desc: desc || "",
          },
        },
      ],
    });
  }
}
