import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import * as crypto from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { MetricsService } from "../../common/metrics.service";

interface WechatBaseResponse {
  errcode?: number;
  errmsg?: string;
}

interface WechatTokenResponse extends WechatBaseResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  openid?: string;
  unionid?: string;
  scope?: string;
}

interface WechatSessionResponse extends WechatBaseResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
}

interface WechatUserInfo {
  openid: string;
  unionid?: string;
  nickname?: string;
  headimgurl?: string;
  sex?: number;
}

interface WechatUserInfoResponse extends WechatBaseResponse {
  openid: string;
  unionid?: string;
  nickname?: string;
  headimgurl?: string;
  sex?: number;
}

interface WechatPhoneResponse extends WechatBaseResponse {
  phone_info: {
    phoneNumber: string;
    countryCode: string;
    purePhoneNumber: string;
  };
}

interface WechatSecCheckResponse extends WechatBaseResponse {
  result?: {
    suggest: string;
    label?: string;
  };
}

interface WechatMediaCheckResponse extends WechatBaseResponse {
  trace_id: string;
}

interface WechatShortLinkResponse extends WechatBaseResponse {
  link: string;
}

interface WechatUrlLinkResponse extends WechatBaseResponse {
  url_link?: string;
}

interface WechatDatacubeResponse extends WechatBaseResponse {
  list?: Record<string, unknown>[];
  data?: Record<string, unknown>[];
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly miniAppId: string;
  private readonly miniAppSecret: string;
  private accessToken: string = "";
  private accessTokenExpireAt: number = 0;
  private miniAccessToken: string = "";
  private miniAccessTokenExpireAt: number = 0;

  constructor(
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    this.appId = process.env.WECHAT_APP_ID || "";
    this.appSecret = process.env.WECHAT_APP_SECRET || "";
    // 小程序独立凭证，未配置时回退到公众号/开放平台凭证
    // miniAppSecret 优先读「微信小程序」卡片配的 MINIPROGRAM_APP_SECRET（后台第三方配置），
    // 修复原先误读开放平台 WECHAT_APP_SECRET 导致小程序卡片配的密钥不生效的问题。
    this.miniAppId = process.env.WECHAT_MINI_APP_ID || this.appId;
    this.miniAppSecret = process.env.MINIPROGRAM_APP_SECRET || process.env.WECHAT_APP_SECRET || "";

    if (!this.appId || !this.appSecret) {
      this.logger.warn("微信 AppId/AppSecret 未配置，微信登录暂不可用。");
    }
    if (process.env.WECHAT_MINI_APP_ID) {
      this.logger.log(`小程序独立AppId已配置: ${this.miniAppId.slice(0, 6)}***`);
    }
  }

  /** 获取公众号 Access Token（自动缓存刷新） */
  async getAccessToken(): Promise<string> {
    if (this.accessToken !== "" && Date.now() < this.accessTokenExpireAt) {
      return this.accessToken;
    }
    this.accessToken = await this.fetchAccessToken(this.appId, this.appSecret);
    this.accessTokenExpireAt = Date.now() + 7100 * 1000; // 提前5分钟刷新
    return this.accessToken;
  }

  /** 获取小程序 Access Token（自动缓存刷新） */
  async getMiniAccessToken(): Promise<string> {
    if (this.miniAccessToken !== "" && Date.now() < this.miniAccessTokenExpireAt) {
      return this.miniAccessToken;
    }
    this.miniAccessToken = await this.fetchAccessToken(this.miniAppId, this.miniAppSecret);
    this.miniAccessTokenExpireAt = Date.now() + 7100 * 1000;
    return this.miniAccessToken;
  }

  /** 通用微信 API 调用（含指标上报） */
  private async callWechatApi<T extends WechatBaseResponse>(
    path: string,
    url: string,
    options?: RequestInit,
  ): Promise<T> {
    const start = Date.now();
    try {
      const resp = await fetch(url, options);
      const duration = Date.now() - start;
      const data = await resp.json() as T;

      if (data.errcode && data.errcode !== 0) {
        this.metrics?.recordExternalApi("wechat", path, false, duration, String(data.errcode));
      } else {
        this.metrics?.recordExternalApi("wechat", path, true, duration);
      }
      return data;
    } catch (err) {
      const duration = Date.now() - start;
      if (err instanceof BusinessException) throw err;
      const reason = (err as Error).message?.substring(0, 50) ?? "network_error";
      this.metrics?.recordExternalApi("wechat", path, false, duration, reason);
      throw err;
    }
  }

  /** 通用获取 Access Token */
  private async fetchAccessToken(appId: string, appSecret: string): Promise<string> {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    const data = await this.callWechatApi<WechatTokenResponse>("cgi-bin/token", url);

    if (data.errcode || !data.access_token) {
      this.logger.error(`获取微信 Access Token 失败: ${data.errcode} ${data.errmsg}`);
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `获取 Access Token 失败: ${data.errmsg}`);
    }
    return data.access_token;
  }

  /** 生成 H5 微信 OAuth 授权 URL */
  buildOAuthUrl(redirectUri: string, scope: "snsapi_base" | "snsapi_userinfo" = "snsapi_userinfo"): string {
    const encoded = encodeURIComponent(redirectUri);
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${this.appId}&redirect_uri=${encoded}&response_type=code&scope=${scope}&state=wechat#wechat_redirect`;
  }

  /** H5 OAuth: 用 code 换取 access_token 和 openId */
  async exchangeOAuthCode(code: string): Promise<{ openId: string; unionId?: string }> {
    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.appId}&secret=${this.appSecret}&code=${code}&grant_type=authorization_code`;
    const data = await this.callWechatApi<WechatTokenResponse>("sns/oauth2/access_token", url);

    if (data.errcode || !data.openid) {
      this.logger.error(`微信 OAuth code 换取失败: ${data.errcode} ${data.errmsg}`);
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `微信授权失败: ${data.errmsg || "未知错误"}`);
    }

    return { openId: data.openid!, unionId: data.unionid };
  }

  /** 小程序登录: 用 code 换取 session_key 和 openId（使用小程序独立AppId） */
  async exchangeMiniCode(code: string): Promise<{ openId: string; sessionKey: string; unionId?: string }> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.miniAppId}&secret=${this.miniAppSecret}&js_code=${code}&grant_type=authorization_code`;
    const data = await this.callWechatApi<WechatSessionResponse>("sns/jscode2session", url);

    if (data.errcode || !data.openid) {
      this.logger.error(`小程序 code2session 失败: ${data.errcode} ${data.errmsg}`);
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `微信小程序登录失败: ${data.errmsg || "未知错误"}`);
    }

    return { openId: data.openid!, sessionKey: data.session_key!, unionId: data.unionid };
  }

  /** 小程序手机号快速验证（新API：code 换取手机号，无需 session_key 解密） */
  async exchangePhoneNumber(code: string): Promise<{
    phone: string;
    countryCode: string;
    purePhoneNumber: string;
  }> {
    const token = await this.getMiniAccessToken();
    const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`;
    const data = await this.callWechatApi<WechatPhoneResponse>("wxa/business/getuserphonenumber", url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (data.errcode !== 0) {
      this.logger.error("获取手机号失败", data);
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `获取手机号失败: ${data.errmsg || "未知错误"}`);
    }

    const phoneInfo = data.phone_info;
    return {
      phone: phoneInfo.phoneNumber,
      countryCode: String(phoneInfo.countryCode),
      purePhoneNumber: phoneInfo.purePhoneNumber,
    };
  }

  /** 解密微信加密数据（旧版 getPhoneNumber 返回的 encryptedData） */
  decryptPhoneNumber(encryptedData: string, iv: string, sessionKey: string): string {
    try {
      const decipher = crypto.createDecipheriv(
        "aes-128-cbc",
        Buffer.from(sessionKey, "base64"),
        Buffer.from(iv, "base64"),
      );
      let decrypted = decipher.update(encryptedData, "base64", "utf8");
      decrypted += decipher.final("utf8");
      const data = JSON.parse(decrypted);
      return data.purePhoneNumber || data.phoneNumber;
    } catch (err: unknown) {
      this.logger.error("解密手机号失败", err instanceof Error ? err.message : String(err));
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, "解密手机号失败");
    }
  }

  /** H5 OAuth: 获取微信用户信息（snsapi_userinfo scope 时可用） */
  async getUserInfo(accessToken: string, openId: string): Promise<WechatUserInfo> {
    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openId}&lang=zh_CN`;

    const resp = await fetch(url);
    const data = (await resp.json()) as WechatUserInfoResponse;

    if (data.errcode) {
      this.logger.error("获取微信用户信息失败", data);
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `获取微信用户信息失败: ${data.errmsg}`);
    }

    return {
      openid: data.openid,
      unionid: data.unionid,
      nickname: data.nickname,
      headimgurl: data.headimgurl,
      sex: data.sex,
    };
  }

  // ───────── 内容安全审核 ─────────

  /** 文本内容安全检测（msgSecCheck） */
  async msgSecCheck(content: string, openid: string, scene = 1): Promise<{ passed: boolean; label?: string; suggestion?: string }> {
    const token = await this.getMiniAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          version: 2,
          scene,  // 1=资料, 2=评论, 3=论坛, 4=社交日志
          openid,
        }),
      },
    );
    const result = await resp.json() as WechatSecCheckResponse;

    if (result.errcode === 0) {
      // result_type: 0=正常, 1=有风险, 2=确定有害
      const resultType = result.result?.suggest || "pass";
      return { passed: resultType === "pass", suggestion: resultType, label: result.result?.label };
    }

    this.logger.error("文本安全检测失败", result);
    return { passed: true, suggestion: "api_error" }; // API失败时放行，避免阻塞正常操作
  }

  /** 图片异步安全检测（mediaCheckAsync） */
  async mediaCheckAsync(imageUrl: string, openid: string, scene = 1): Promise<{ traceId: string }> {
    const token = await this.getMiniAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/wxa/media_check_async?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_url: imageUrl, media_type: 2, version: 2, scene, openid }),
      },
    );
    const result = await resp.json() as WechatMediaCheckResponse;

    if (result.errcode !== 0) {
      this.logger.error("图片异步检测提交失败", result);
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `图片检测提交失败: ${result.errmsg}`);
    }
    return { traceId: result.trace_id };
  }

  // ───────── 小程序码生成 ─────────

  /** 生成无限量小程序码（返回Buffer） */
  async generateWxaCode(params: {
    scene: string;         // 场景参数（如 id=xxx&type=article）
    page?: string;         // 跳转页面（如 pages/index/index）
    width?: number;        // 宽度 280-1280
    autoColor?: boolean;
    lineColor?: { r: number; g: number; b: number };
    isHyaline?: boolean;   // 透明底色
  }): Promise<Buffer> {
    const token = await this.getMiniAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene: params.scene,
          page: params.page || "",
          width: params.width || 430,
          auto_color: params.autoColor ?? false,
          line_color: params.lineColor,
          is_hyaline: params.isHyaline ?? false,
          check_path: false,
        }),
      },
    );

    const contentType = resp.headers.get("content-type") || "";

    // 如果返回的是JSON说明出错了
    if (contentType.includes("application/json")) {
      const err = await resp.json() as WechatBaseResponse;
      this.logger.error("小程序码生成失败", err);
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `小程序码生成失败: ${err.errmsg || "未知错误"}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /** 生成普通小程序码（有限量，返回Buffer） */
  async generateWxaQrCode(params: {
    path: string;
    width?: number;
  }): Promise<Buffer> {
    const token = await this.getMiniAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/cgi-bin/wxaapp/createwxaqrcode?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: params.path,
          width: params.width || 430,
        }),
      },
    );

    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const err = await resp.json() as WechatBaseResponse;
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `小程序码生成失败: ${err.errmsg || "未知错误"}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ───────── 短链接生成 ─────────

  /** 生成小程序短链接（有效期30天） */
  async generateShortLink(params: {
    pageUrl: string;  // 页面路径，可带参数（如 pages/index/index?id=1）
    pageTitle: string;
    isPermanent?: boolean;
  }): Promise<string> {
    const token = await this.getMiniAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/wxa/genwxashortlink?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_url: params.pageUrl,
          page_title: params.pageTitle,
          is_permanent: params.isPermanent ?? false,
        }),
      },
    );
    const result = await resp.json() as WechatShortLinkResponse;
    if (result.errcode !== 0) {
      this.logger.error("短链接生成失败", result);
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `短链接生成失败: ${result.errmsg}`);
    }
    return result.link;
  }

  /**
   * 生成小程序 URL Link（用于「外部浏览器 → 唤起小程序」，直连微信 H5 支付被拒后的自建替代方案）。
   * 微信外浏览器点击本链接 → 唤起微信 → 打开小程序指定页面（如支付中转页）→ 页面内走 JSAPI 支付。
   * 复用 getMiniAccessToken()。要求 path 对应的页面必须在「已发布」的小程序里真实存在
   * （envVersion=release 时需正式版已上线；envVersion=trial 可先用体验版联调）。
   * 文档: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/url-link/generateUrlLink.html
   */
  async generateUrlLink(params: {
    path: string;            // 小程序页面路径，如 pkg-shop/pay-relay/index
    query?: string;          // 页面参数，如 t=xxx（不含 ?，需自行 URL 编码特殊字符）
    envVersion?: "release" | "trial" | "develop";
    expireInterval?: number; // 到期天数 1-30（expire_type=1 生效）
  }): Promise<string> {
    const token = await this.getMiniAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/wxa/generate_urllink?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: params.path,
          query: params.query || "",
          env_version: params.envVersion || "release",
          expire_type: 1,
          expire_interval: params.expireInterval ?? 1, // 支付链接短寿命，默认 1 天
        }),
      },
    );
    const result = await resp.json() as WechatUrlLinkResponse;
    if (result.errcode || !result.url_link) {
      this.logger.error("URL Link 生成失败", result);
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `URL Link 生成失败: ${result.errmsg || "未知错误"}`);
    }
    return result.url_link;
  }

  // ───────── 客服消息 ─────────

  /** 发送小程序客服消息 */
  async sendCustomerMessage(params: {
    touser: string;
    msgtype: "text" | "image" | "link" | "miniprogrampage";
    text?: { content: string };
    image?: { media_id: string };
    link?: { title: string; description: string; url: string; thumb_url?: string };
    miniprogrampage?: { title: string; pagepath: string; thumb_media_id: string };
  }) {
    const token = await this.getMiniAccessToken();
    const body: Record<string, unknown> = { touser: params.touser, msgtype: params.msgtype };
    if (params.text) body.text = params.text;
    if (params.image) body.image = params.image;
    if (params.link) body.link = params.link;
    if (params.miniprogrampage) body.miniprogrampage = params.miniprogrampage;

    const resp = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const result = await resp.json() as WechatBaseResponse;
    if (result.errcode !== 0) {
      this.logger.error("客服消息发送失败", result);
      return { success: false, error: result.errmsg };
    }
    return { success: true };
  }

  /** 快捷发送文本客服消息 */
  async sendTextCustomerMessage(openid: string, content: string) {
    return this.sendCustomerMessage({
      touser: openid,
      msgtype: "text",
      text: { content },
    });
  }

  /** 快捷发送小程序页面客服消息 */
  async sendMiniProgramCardMessage(
    openid: string,
    title: string,
    pagepath: string,
    thumbMediaId: string,
  ) {
    return this.sendCustomerMessage({
      touser: openid,
      msgtype: "miniprogrampage",
      miniprogrampage: { title, pagepath, thumb_media_id: thumbMediaId },
    });
  }

  // ───────── 小程序数据分析（Datacube API） ─────────

  /** 调用 datacube API 通用方法 */
  private async callDatacube(path: string, beginDate: string, endDate: string): Promise<Record<string, unknown>[]> {
    const token = await this.getMiniAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/datacube/${path}?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ begin_date: beginDate, end_date: endDate }),
      },
    );
    const result = await resp.json() as WechatDatacubeResponse;
    if (result.errcode && result.errcode !== 0) {
      this.logger.error(`数据分析API失败 [${path}]`, result);
      return [];
    }
    return result.list || result.data || [];
  }

  /** 每日数据概览（访问用户数、新用户数、打开次数等） */
  async getDailySummaryTrend(beginDate: string, endDate: string) {
    return this.callDatacube("getweanalysisappiddailysummarytrend", beginDate, endDate);
  }

  /** 日访问趋势（session_cnt、visit_pv、visit_uv等） */
  async getDailyVisitTrend(beginDate: string, endDate: string) {
    return this.callDatacube("getweanalysisappiddailyvisittrend", beginDate, endDate);
  }

  /** 周访问趋势 */
  async getWeeklyVisitTrend(beginDate: string, endDate: string) {
    return this.callDatacube("getweanalysisappidweeklyvisittrend", beginDate, endDate);
  }

  /** 月访问趋势 */
  async getMonthlyVisitTrend(beginDate: string, endDate: string) {
    return this.callDatacube("getweanalysisappidmonthlyvisittrend", beginDate, endDate);
  }

  /** 访问分布（按时间/地区/设备/性别/年龄等维度） */
  async getVisitDistribution(beginDate: string, endDate: string) {
    return this.callDatacube("getweanalysisappidvisitdistribution", beginDate, endDate);
  }

  /** 页面访问数据（各页面访问次数、时长、深度） */
  async getVisitPage(beginDate: string, endDate: string) {
    return this.callDatacube("getweanalysisappidvisitpage", beginDate, endDate);
  }

  /** 用户画像数据（性别、年龄、地域分布） */
  async getUserPortrait(beginDate: string, endDate: string) {
    return this.callDatacube("getweanalysisappiduserportrait", beginDate, endDate);
  }

  /** 月度留存数据 */
  async getMonthlyRetain(beginDate: string, endDate: string) {
    return this.callDatacube("getweanalysisappidmonthlyretaininfo", beginDate, endDate);
  }

  // ───────── 微信公众号 API ─────────

  /** 获取用户基本信息（UnionID机制） */
  async getMpUserInfo(openid: string): Promise<Record<string, unknown>> {
    const token = await this.getAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${token}&openid=${openid}&lang=zh_CN`,
    );
    return resp.json() as Promise<Record<string, unknown>>;
  }

  /** 批量获取用户信息（最多100个） */
  async batchGetMpUserInfo(openids: string[]): Promise<Record<string, unknown>> {
    const token = await this.getAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/cgi-bin/user/info/batchget?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_list: openids.map((o) => ({ openid: o, lang: "zh_CN" })),
        }),
      },
    );
    return resp.json() as Promise<Record<string, unknown>>;
  }

  /** 获取关注用户列表（分页） */
  async getMpUserList(nextOpenid?: string) {
    const token = await this.getAccessToken();
    let url = `https://api.weixin.qq.com/cgi-bin/user/get?access_token=${token}`;
    if (nextOpenid) url += `&next_openid=${nextOpenid}`;
    return (await fetch(url)).json();
  }

  // ───────── 自定义菜单 ─────────

  /** 创建自定义菜单 */
  async createMenu(buttons: Array<{
    type?: "click" | "view" | "miniprogram" | "media_id" | "view_limited" | "article_id" | "article_view_limited";
    name: string;
    key?: string;
    url?: string;
    appid?: string;
    pagepath?: string;
    sub_button?: Array<any>;
  }>) {
    const token = await this.getAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ button: buttons }),
      },
    );
    return resp.json();
  }

  /** 查询当前菜单 */
  async getMenu() {
    const token = await this.getAccessToken();
    return (await fetch(`https://api.weixin.qq.com/cgi-bin/menu/get?access_token=${token}`)).json();
  }

  /** 删除所有菜单 */
  async deleteMenu() {
    const token = await this.getAccessToken();
    return (await fetch(`https://api.weixin.qq.com/cgi-bin/menu/delete?access_token=${token}`)).json();
  }

  // ───────── 用户标签管理 ─────────

  /** 创建用户标签 */
  async createTag(name: string) {
    const token = await this.getAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/cgi-bin/tags/create?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: { name } }),
      },
    );
    return resp.json();
  }

  /** 获取所有标签 */
  async getTags() {
    const token = await this.getAccessToken();
    return (await fetch(`https://api.weixin.qq.com/cgi-bin/tags/get?access_token=${token}`)).json();
  }

  /** 给用户打标签 */
  async batchTagUsers(tagId: number, openids: string[]) {
    const token = await this.getAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/cgi-bin/tags/members/batchtagging?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagid: tagId, openid_list: openids }),
      },
    );
    return resp.json();
  }

  // ───────── 素材管理 ─────────

  /** 获取素材列表 */
  async getMaterialList(type: "image" | "video" | "voice" | "news", offset = 0, count = 20) {
    const token = await this.getAccessToken();
    const resp = await fetch(
      `https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, offset, count }),
      },
    );
    return resp.json();
  }

  /** 获取素材总数 */
  async getMaterialCount() {
    const token = await this.getAccessToken();
    return (await fetch(`https://api.weixin.qq.com/cgi-bin/material/get_materialcount?access_token=${token}`)).json();
  }

  // ───────── 小程序流量主广告数据 ─────────

  /** 调用广告数据 API */
  private async getAdStat(action: string, params: Record<string, string>) {
    const token = await this.getMiniAccessToken();
    const query = new URLSearchParams({ action, access_token: token, ...params });
    const resp = await fetch(`https://api.weixin.qq.com/publisher/stat?${query}`);
    return resp.json();
  }

  /** 广告数据总览 */
  async getAdGeneral(date: string, page = 1, pageSize = 20) {
    return this.getAdStat("publisher_adunit_general", {
      page: String(page),
      page_size: String(pageSize),
      start_date: date,
      end_date: date,
    });
  }

  /** 按月广告数据 */
  async getAdGeneralMonth(month: string, page = 1, pageSize = 20) {
    return this.getAdStat("publisher_adunit_general_month", {
      page: String(page),
      page_size: String(pageSize),
      month,
    });
  }

  /** 广告收益趋势（按天） */
  async getAdRevenueTrend(startDate: string, endDate: string) {
    const dates: string[] = [];
    const d = new Date(startDate);
    const end = new Date(endDate);
    while (d <= end) {
      dates.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }

    const results: Record<string, unknown>[] = [];
    for (const date of dates) {
      try {
        const data = await this.getAdGeneral(date);
        results.push({ date, ...(data as Record<string, unknown>) });
      } catch (err) {
        this.logger.warn(`微信广告数据获取失败: ${date}`, err);
        results.push({ date, error: "获取失败" });
      }
    }
    return results;
  }

  /** 结算数据 */
  async getAdSettlement(month: string, page = 1, pageSize = 20) {
    return this.getAdStat("publisher_settlement", {
      page: String(page),
      page_size: String(pageSize),
      month,
    });
  }

  /** 广告位数据详情 */
  async getAdUnitDetail(date: string, adUnitId: string) {
    return this.getAdStat("publisher_adunit_detail", {
      start_date: date,
      end_date: date,
      ad_unit: adUnitId,
    });
  }
}
