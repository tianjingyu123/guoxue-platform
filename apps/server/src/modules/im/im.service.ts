import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { TlsSigService } from "./tlssig.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { MetricsService } from "../../common/metrics.service";

export interface TimApiResponse {
  ErrorCode: number;
  ErrorInfo?: string;
  [key: string]: unknown;
}

@Injectable()
export class ImService {
  private readonly logger = new Logger(ImService.name);
  private readonly appId: number;
  private readonly adminId: string;
  private readonly baseUrl = "https://console.tim.qq.com";

  constructor(
    private tlsSig: TlsSigService,
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    this.appId = this.tlsSig.getAppId();
    this.adminId = process.env.IM_ADMIN_ID || "administrator";
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

  /** 创建 IM 群组 */
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
      ApplyJoinOption: type === "Public" ? "FreeAccess" : "NeedPermission",
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

  /** 获取群组历史消息 */
  async getGroupHistory(groupId: string, _page = 1, pageSize = 20) {
    return this.callImApi("group_open_http_svc/group_msg_get_simple", {
      GroupId: groupId,
      ReqMsgNumber: pageSize,
      ReqMsgSeq: 0,
    });
  }

  // ───────── 单聊消息 ─────────

  /** 发送单聊消息 */
  async sendC2CMsg(fromUserId: string, toUserId: string, text: string) {
    return this.callImApi("openim/sendmsg", {
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

  /** 获取好友列表 */
  async getFriendList(userId: string) {
    return this.callImApi("sns/friend_get_list", {
      From_Account: userId,
    });
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

  // ───────── 好友申请 ─────────

  /** 审批好友申请 */
  async approveFriendRequest(userId: string, fromUserId: string) {
    return this.callImApi("sns/friend_add_response", {
      From_Account: userId,
      ResponseItem: [
        {
          To_Account: fromUserId,
          ResponseAction: "Response_Action_Agree",
        },
      ],
    });
  }

  /** 拒绝好友申请 */
  async rejectFriendRequest(userId: string, fromUserId: string) {
    return this.callImApi("sns/friend_add_response", {
      From_Account: userId,
      ResponseItem: [
        {
          To_Account: fromUserId,
          ResponseAction: "Response_Action_Reject",
        },
      ],
    });
  }

  /** 获取待处理好友申请 */
  async listPendingFriendRequests(userId: string) {
    return this.callImApi("sns/friend_get_pendency", {
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
    const resp = (await this.getFriendList(userId)) as TimApiResponse;
    const items = (resp.UserDataItem as Array<{ To_Account?: string }>) || [];
    return items.some((it) => it.To_Account === targetUserId);
  }

  /** 判断 userId 是否为该群成员（用于授权校验） */
  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const resp = (await this.getGroupMembers(groupId)) as TimApiResponse;
    const members = (resp.MemberList as Array<{ Member_Account?: string }>) || [];
    return members.some((m) => m.Member_Account === userId);
  }

  /** 发送图片消息（单聊） */
  async sendC2CImage(fromUserId: string, toUserId: string, imageUrl: string, width?: number, height?: number) {
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
