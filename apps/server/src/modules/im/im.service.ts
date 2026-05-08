import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { TlsSigService } from "./tlssig.service";

@Injectable()
export class ImService {
  private readonly logger = new Logger(ImService.name);
  private readonly appId: number;
  private readonly adminId: string;
  private readonly baseUrl = "https://console.tim.qq.com";

  constructor(private tlsSig: TlsSigService) {
    this.appId = this.tlsSig.getAppId();
    this.adminId = process.env.IM_ADMIN_ID || "administrator";
  }

  /** 检查 IM 是否已配置 */
  private ensureConfigured() {
    if (!this.appId || !process.env.IM_ADMIN_KEY) {
      throw new BadRequestException("IM 未配置，请联系管理员");
    }
  }

  /** 为用户生成 UserSig */
  genUserSig(userId: string) {
    this.ensureConfigured();
    const userSig = this.tlsSig.genUserSig(userId);
    return { appId: this.appId, userId, userSig };
  }

  /** 调用腾讯云 IM REST API */
  private async callImApi(path: string, body: Record<string, any>) {
    this.ensureConfigured();
    const adminSig = this.tlsSig.genAdminSig();
    const url = `${this.baseUrl}/v4/${path}?sdkappid=${this.appId}&identifier=${encodeURIComponent(this.adminId)}&usersig=${encodeURIComponent(adminSig)}&random=${Date.now()}&contenttype=json`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await resp.json()) as any;
    if (data.ErrorCode !== 0) {
      this.logger.error(`IM API 调用失败: ${path}`, data);
      throw new Error(`IM 操作失败: ${data.ErrorInfo || "未知错误"}`);
    }
    return data;
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
    const items: any[] = [];
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
}
