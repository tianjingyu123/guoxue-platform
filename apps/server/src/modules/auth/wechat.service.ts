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

export type WechatLoginType = "h5" | "miniprogram" | "app";

/**
 * 一套微信登录客户端配置。clientKey 是前端公开选择器，不是密钥；appSecret 永远只在服务端使用。
 * unionNamespace 必须让同一微信开放平台帐号下的所有客户端保持一致。
 */
export interface WechatLoginClient {
  clientKey: string;
  type: WechatLoginType;
  appId: string;
  appSecret: string;
  identityNamespace: string;
  unionNamespace: string;
  isDefault: boolean;
}

interface WechatShortLinkResponse extends WechatBaseResponse {
  link: string;
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
  private readonly miniAccessTokenByApp = new Map<string, { token: string; expireAt: number }>();

  constructor(
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    // 公众号与小程序配置卡已拆分后，不能再要求旧 WECHAT_APP_* 变量必须存在。
    this.appId = process.env.WECHAT_APP_ID || process.env.WECHAT_OFFICIAL_APPID || "";
    this.appSecret = process.env.WECHAT_APP_SECRET || process.env.WECHAT_OFFICIAL_APP_SECRET || "";
    // 小程序独立凭证，未配置时回退到公众号/开放平台凭证
    // miniAppSecret 优先读「微信小程序」卡片配的 MINIPROGRAM_APP_SECRET（后台第三方配置），
    // 修复原先误读开放平台 WECHAT_APP_SECRET 导致小程序卡片配的密钥不生效的问题。
    this.miniAppId =
      process.env.WECHAT_MINI_APP_ID ||
      process.env.MINIPROGRAM_APP_ID ||
      process.env.WECHAT_MP_APP_ID ||
      this.appId;
    this.miniAppSecret = process.env.MINIPROGRAM_APP_SECRET || process.env.WECHAT_APP_SECRET || this.appSecret;

    if (!this.appId || !this.appSecret) {
      this.logger.warn("微信 AppId/AppSecret 未配置，微信登录暂不可用。");
    }
    if (process.env.WECHAT_MINI_APP_ID || process.env.MINIPROGRAM_APP_ID || process.env.WECHAT_MP_APP_ID) {
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
  async getMiniAccessToken(clientKey?: string): Promise<string> {
    const client = this.resolveLoginClient("miniprogram", clientKey);
    const cached = this.miniAccessTokenByApp.get(client.appId);
    if (cached && Date.now() < cached.expireAt) return cached.token;
    const token = await this.fetchAccessToken(client.appId, client.appSecret);
    this.miniAccessTokenByApp.set(client.appId, { token, expireAt: Date.now() + 7100 * 1000 });
    // 保留旧字段，兼容运行时监控/调试读取。
    this.miniAccessToken = token;
    this.miniAccessTokenExpireAt = Date.now() + 7100 * 1000;
    return token;
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

  /**
   * 公众号凭据（网页授权/JSAPI支付用）。
   * 现读 env 而非构造器缓存：后台「微信公众号」卡片保存后 syncToEnv 写回 process.env 即热生效，无需重启。
   * 回退 WECHAT_APP_ID/WECHAT_APP_SECRET 兼容历史配置。
   */
  private get officialAppId(): string {
    return process.env.WECHAT_OFFICIAL_APPID || process.env.WECHAT_APP_ID || this.appId;
  }
  private get officialAppSecret(): string {
    return process.env.WECHAT_OFFICIAL_APP_SECRET || process.env.WECHAT_APP_SECRET || this.appSecret;
  }
  private get currentMiniAppId(): string {
    return process.env.WECHAT_MINI_APP_ID || process.env.MINIPROGRAM_APP_ID || process.env.WECHAT_MP_APP_ID || process.env.WECHAT_APP_ID || this.miniAppId;
  }
  private get currentMiniAppSecret(): string {
    return process.env.MINIPROGRAM_APP_SECRET || process.env.WECHAT_APP_SECRET || this.miniAppSecret;
  }

  /**
   * 读取多端微信登录注册表。格式见 .env.example 的 WECHAT_LOGIN_CLIENTS_JSON。
   * 注册表按请求实时解析，以延续后台第三方配置热更新的既有行为。
   */
  private loadLoginClients(): WechatLoginClient[] {
    const openPlatform = process.env.WECHAT_OPEN_PLATFORM_ID?.trim() || "";
    const raw = process.env.WECHAT_LOGIN_CLIENTS_JSON?.trim();
    const configured: WechatLoginClient[] = [];

    if (raw) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        this.logger.error("WECHAT_LOGIN_CLIENTS_JSON 不是合法 JSON", (error as Error).message);
        throw new BusinessException(ErrorCode.BAD_REQUEST, "微信多端登录配置无效");
      }

      const entries: Array<[string, Record<string, unknown>]> = Array.isArray(parsed)
        ? (parsed as Record<string, unknown>[]).map((item, index) => [String(item.clientKey || `client-${index + 1}`), item])
        : Object.entries((parsed || {}) as Record<string, Record<string, unknown>>);

      for (const [key, value] of entries) {
        const type = String(value.type || "").toLowerCase() as WechatLoginType;
        const appId = String(value.appId || "").trim();
        const appSecret = String(value.appSecret || "").trim();
        const clientKey = String(value.clientKey || key).trim();
        if (!clientKey || !["h5", "miniprogram", "app"].includes(type) || !appId || !appSecret) {
          throw new BusinessException(ErrorCode.BAD_REQUEST, `微信登录客户端 ${key} 配置不完整`);
        }
        // 未明确绑定同一微信开放平台时按 AppID 隔离，避免把不同应用的同值 UnionID 误合并为同一账号。
        const unionScope = String(value.openPlatformId || value.unionNamespace || openPlatform || `isolated:${appId}`).trim();
        configured.push({
          clientKey,
          type,
          appId,
          appSecret,
          identityNamespace: `wechat:${type}:${appId}`,
          unionNamespace: unionScope.startsWith("wechat-open:") ? unionScope : `wechat-open:${unionScope}`,
          isDefault: value.isDefault === true,
        });
      }
    }

    // 某类型只要出现在注册表中，就以注册表为真源；未出现的类型继续兼容旧单应用环境变量。
    const addLegacyFallback = (type: WechatLoginType, appId: string, appSecret: string, clientKey: string) => {
      if (!appId || !appSecret || configured.some((item) => item.type === type)) return;
      configured.push({
        clientKey,
        type,
        appId,
        appSecret,
        identityNamespace: `wechat:${type}:${appId}`,
        unionNamespace: `wechat-open:${openPlatform || `isolated:${appId}`}`,
        isDefault: true,
      });
    };
    addLegacyFallback("h5", this.officialAppId, this.officialAppSecret, "legacy-h5");
    addLegacyFallback("miniprogram", this.currentMiniAppId, this.currentMiniAppSecret, "legacy-mini");
    addLegacyFallback(
      "app",
      process.env.WECHAT_OPEN_APP_ID || "",
      process.env.WECHAT_OPEN_APP_SECRET || "",
      "legacy-app",
    );
    return configured;
  }

  /** 按类型和公开 clientKey/appId 选择凭据；多应用配置不明确时拒绝猜测。 */
  resolveLoginClient(loginType: string = "h5", clientKey?: string): WechatLoginClient {
    const type = loginType.toLowerCase() as WechatLoginType;
    if (!["h5", "miniprogram", "app"].includes(type)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的微信登录类型");
    }
    const candidates = this.loadLoginClients().filter((item) => item.type === type);
    if (clientKey) {
      const selected = candidates.find((item) => item.clientKey === clientKey || item.appId === clientKey);
      if (!selected) throw new BusinessException(ErrorCode.BAD_REQUEST, "微信登录客户端不存在或类型不匹配");
      return selected;
    }
    if (candidates.length === 1) return candidates[0];
    const defaults = candidates.filter((item) => item.isDefault);
    if (defaults.length === 1) return defaults[0];
    if (candidates.length === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "微信登录未配置，请联系管理员");
    throw new BusinessException(ErrorCode.BAD_REQUEST, "已配置多个微信应用，请提供 clientKey");
  }


  /**
   * 校验公众号 OAuth 回调地址。
   * 只允许回到本系统公开 H5/API 域名，避免公开 oauth-url 接口被滥用为开放重定向器。
   */
  private validateOAuthRedirectUri(redirectUri: string): string {
    let parsed: URL;
    try {
      parsed = new URL(redirectUri);
    } catch {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "微信授权回调地址无效");
    }

    const isLocalDev = ["localhost", "127.0.0.1"].includes(parsed.hostname) && process.env.NODE_ENV !== "production";
    if (parsed.protocol !== "https:" && !(isLocalDev && parsed.protocol === "http:")) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "微信授权回调地址必须使用 HTTPS");
    }
    if (parsed.username || parsed.password || parsed.hash) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "微信授权回调地址格式无效");
    }

    const configured = [
      process.env.PUBLIC_H5_URL,
      process.env.PUBLIC_API_URL,
      ...(process.env.WECHAT_OAUTH_ALLOWED_ORIGINS || "").split(","),
    ].filter((value): value is string => Boolean(value?.trim()));
    const allowedOrigins = new Set<string>();
    for (const value of configured) {
      try {
        allowedOrigins.add(new URL(value.trim()).origin);
      } catch {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "微信授权允许域名配置无效");
      }
    }
    if (allowedOrigins.size === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "微信授权回调域名未配置");
    }
    if (!allowedOrigins.has(parsed.origin) && !isLocalDev) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "微信授权回调地址不在允许范围内");
    }
    return parsed.toString();
  }

  /** 生成 H5 微信 OAuth 授权 URL（公众号网页授权，appid 必须为公众号的） */
  buildOAuthUrl(
    redirectUri: string,
    scope: "snsapi_base" | "snsapi_userinfo" = "snsapi_userinfo",
    clientKey?: string,
    state = "wechat",
  ): string {
    if (!["snsapi_base", "snsapi_userinfo"].includes(scope)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的微信授权范围");
    }
    const normalizedState = state.trim();
    if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(normalizedState)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "微信授权 state 无效");
    }
    const client = this.resolveLoginClient("h5", clientKey);
    const encoded = encodeURIComponent(this.validateOAuthRedirectUri(redirectUri));
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${client.appId}&redirect_uri=${encoded}&response_type=code&scope=${scope}&state=${encodeURIComponent(normalizedState)}#wechat_redirect`;
  }

  /** H5 OAuth: 用 code 换取 access_token 和 openId（公众号网页授权） */
  async exchangeOAuthCode(code: string, clientKey?: string, loginType: "h5" | "app" = "h5"): Promise<{ openId: string; unionId?: string }> {
    const client = this.resolveLoginClient(loginType, clientKey);
    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${client.appId}&secret=${client.appSecret}&code=${code}&grant_type=authorization_code`;
    const data = await this.callWechatApi<WechatTokenResponse>("sns/oauth2/access_token", url);

    if (data.errcode || !data.openid) {
      this.logger.error(`微信 OAuth code 换取失败: ${data.errcode} ${data.errmsg}`);
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `微信授权失败: ${data.errmsg || "未知错误"}`);
    }

    return { openId: data.openid!, unionId: data.unionid };
  }

  /** 小程序登录: 用 code 换取 session_key 和 openId（使用小程序独立AppId） */
  async exchangeMiniCode(code: string, clientKey?: string): Promise<{ openId: string; sessionKey: string; unionId?: string }> {
    const client = this.resolveLoginClient("miniprogram", clientKey);
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${client.appId}&secret=${client.appSecret}&js_code=${code}&grant_type=authorization_code`;
    const data = await this.callWechatApi<WechatSessionResponse>("sns/jscode2session", url);

    if (data.errcode || !data.openid) {
      this.logger.error(`小程序 code2session 失败: ${data.errcode} ${data.errmsg}`);
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `微信小程序登录失败: ${data.errmsg || "未知错误"}`);
    }

    return { openId: data.openid!, sessionKey: data.session_key!, unionId: data.unionid };
  }

  /** 小程序手机号快速验证（新API：code 换取手机号，无需 session_key 解密） */
  async exchangePhoneNumber(code: string, clientKey?: string): Promise<{
    phone: string;
    countryCode: string;
    purePhoneNumber: string;
  }> {
    const token = await this.getMiniAccessToken(clientKey);
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
