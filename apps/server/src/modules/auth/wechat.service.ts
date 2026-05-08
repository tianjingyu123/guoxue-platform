import { Injectable, Logger } from "@nestjs/common";

interface WechatTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  openid?: string;
  unionid?: string;
  scope?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatSessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatUserInfo {
  openid: string;
  unionid?: string;
  nickname?: string;
  headimgurl?: string;
  sex?: number;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly appId: string;
  private readonly appSecret: string;

  constructor() {
    this.appId = process.env.WECHAT_APP_ID || "";
    this.appSecret = process.env.WECHAT_APP_SECRET || "";

    if (!this.appId || !this.appSecret) {
      this.logger.warn("微信 AppId/AppSecret 未配置，微信登录暂不可用。");
    }
  }

  /** 生成 H5 微信 OAuth 授权 URL */
  buildOAuthUrl(redirectUri: string, scope: "snsapi_base" | "snsapi_userinfo" = "snsapi_userinfo"): string {
    const encoded = encodeURIComponent(redirectUri);
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${this.appId}&redirect_uri=${encoded}&response_type=code&scope=${scope}&state=wechat#wechat_redirect`;
  }

  /** H5 OAuth: 用 code 换取 access_token 和 openId */
  async exchangeOAuthCode(code: string): Promise<{ openId: string; unionId?: string }> {
    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.appId}&secret=${this.appSecret}&code=${code}&grant_type=authorization_code`;

    const resp = await fetch(url);
    const data = (await resp.json()) as WechatTokenResponse;

    if (data.errcode || !data.openid) {
      this.logger.error("微信 OAuth code 换取失败", data);
      throw new Error(`微信授权失败: ${data.errmsg || "未知错误"}`);
    }

    return { openId: data.openid!, unionId: data.unionid };
  }

  /** 小程序登录: 用 code 换取 session_key 和 openId */
  async exchangeMiniCode(code: string): Promise<{ openId: string; sessionKey: string; unionId?: string }> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.appId}&secret=${this.appSecret}&js_code=${code}&grant_type=authorization_code`;

    const resp = await fetch(url);
    const data = (await resp.json()) as WechatSessionResponse;

    if (data.errcode || !data.openid) {
      this.logger.error("小程序 code2session 失败", data);
      throw new Error(`微信小程序登录失败: ${data.errmsg || "未知错误"}`);
    }

    return { openId: data.openid!, sessionKey: data.session_key!, unionId: data.unionid };
  }

  /** H5 OAuth: 获取微信用户信息（snsapi_userinfo scope 时可用） */
  async getUserInfo(accessToken: string, openId: string): Promise<WechatUserInfo> {
    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openId}&lang=zh_CN`;

    const resp = await fetch(url);
    const data = (await resp.json()) as any;

    if (data.errcode) {
      this.logger.error("获取微信用户信息失败", data);
      throw new Error(`获取微信用户信息失败: ${data.errmsg}`);
    }

    return {
      openid: data.openid,
      unionid: data.unionid,
      nickname: data.nickname,
      headimgurl: data.headimgurl,
      sex: data.sex,
    };
  }
}
