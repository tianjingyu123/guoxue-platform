import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { WechatService } from "../auth/wechat.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { MetricsService } from "../../common/metrics.service";

/**
 * 消息推送服务（纯原生API）
 * 支持：微信小程序订阅消息、公众号模板消息
 * TPNS 推送（预留接口）
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly miniAppId: string;
  private readonly mpAppId: string;

  constructor(
    private wechat: WechatService,
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    this.miniAppId = process.env.WECHAT_MINI_APP_ID || process.env.WECHAT_APP_ID || "";
    this.mpAppId = process.env.WECHAT_MP_APP_ID || process.env.WECHAT_APP_ID || "";
  }

  // ───────── 小程序订阅消息 ─────────

  /** 发送小程序订阅消息 */
  async sendMiniSubscribeMsg(params: {
    touser: string;       // 接收者 openid
    templateId: string;   // 模板ID
    page?: string;        // 点击跳转页面
    data: Record<string, { value: string }>; // 模板数据
  }) {
    const accessToken = await this.wechat.getAccessToken();
    const path = "cgi-bin/message/subscribe/send";
    const start = Date.now();

    try {
      const resp = await fetch(
        `https://api.weixin.qq.com/${path}?access_token=${accessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            touser: params.touser,
            template_id: params.templateId,
            page: params.page || "",
            data: params.data,
            miniprogram_state: "formal",
            lang: "zh_CN",
          }),
        },
      );

      const duration = Date.now() - start;
      const result = await resp.json() as { errcode: number; errmsg: string };

      if (result.errcode !== 0) {
        this.metrics?.recordExternalApi("wechat", path, false, duration, String(result.errcode));
        this.logger.error("小程序订阅消息发送失败", result);
        throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `订阅消息发送失败: ${result.errmsg}`);
      }

      this.metrics?.recordExternalApi("wechat", path, true, duration);
      return result;
    } catch (err) {
      if (err instanceof BusinessException) throw err;
      const duration = Date.now() - start;
      const reason = (err as Error).message?.substring(0, 50) ?? "network_error";
      this.metrics?.recordExternalApi("wechat", path, false, duration, reason);
      throw err;
    }
  }

  // ───────── 公众号模板消息 ─────────

  /** 发送公众号模板消息 */
  async sendMpTemplateMsg(params: {
    touser: string;       // 接收者 openid
    templateId: string;   // 模板ID
    url?: string;         // 点击跳转URL
    miniprogram?: { appid: string; pagepath: string }; // 跳转小程序
    data: Record<string, { value: string; color?: string }>;
  }) {
    const accessToken = await this.wechat.getAccessToken();
    const path = "cgi-bin/message/template/send";
    const start = Date.now();

    try {
      const body: Record<string, unknown> = {
        touser: params.touser,
        template_id: params.templateId,
        data: params.data,
      };
      if (params.url) body.url = params.url;
      if (params.miniprogram) body.miniprogram = params.miniprogram;

      const resp = await fetch(
        `https://api.weixin.qq.com/${path}?access_token=${accessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const duration = Date.now() - start;
      const result = await resp.json() as { errcode: number; errmsg: string };

      if (result.errcode !== 0) {
        this.metrics?.recordExternalApi("wechat", path, false, duration, String(result.errcode));
        this.logger.error("公众号模板消息发送失败", result);
        throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `模板消息发送失败: ${result.errmsg}`);
      }

      this.metrics?.recordExternalApi("wechat", path, true, duration);
      return result;
    } catch (err) {
      if (err instanceof BusinessException) throw err;
      const duration = Date.now() - start;
      const reason = (err as Error).message?.substring(0, 50) ?? "network_error";
      this.metrics?.recordExternalApi("wechat", path, false, duration, reason);
      throw err;
    }
  }

  // ───────── 快捷发送 ─────────

  /** 统一发送通知（根据用户信息选择推送渠道） */
  async send(params: {
    miniOpenId?: string;
    mpOpenId?: string;
    deviceToken?: string;  // APP设备token（TPNS预留）
    templateType: "MINI" | "MP" | "APP";
    templateId: string;
    page?: string;
    url?: string;
    data: Record<string, { value: string; color?: string }>;
  }) {
    try {
      if (params.templateType === "MINI" && params.miniOpenId) {
        return await this.sendMiniSubscribeMsg({
          touser: params.miniOpenId,
          templateId: params.templateId,
          page: params.page,
          data: params.data as Record<string, { value: string }>,
        });
      }

      if (params.templateType === "MP" && params.mpOpenId) {
        return await this.sendMpTemplateMsg({
          touser: params.mpOpenId,
          templateId: params.templateId,
          url: params.url,
          data: params.data,
        });
      }

      if (params.templateType === "APP" && params.deviceToken) {
        // TPNS 推送预留
        this.logger.log("TPNS推送暂未接入");
      }

      this.logger.warn("无可用的推送渠道");
      return null;
    } catch (err: unknown) {
      this.logger.error("推送通知失败", (err as Error).message);
      return null;
    }
  }
}
