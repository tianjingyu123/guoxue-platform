import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { createSign, createVerify, randomUUID } from "crypto";
import { readFileSync } from "fs";
import { MemoryCache } from "../../common/cache.util";
import { MetricsService } from "../../common/metrics.service";

/**
 * 支付宝支付 API 服务（RSA2+SHA256签名，无SDK）
 * 文档: https://opendocs.alipay.com/open/
 */
@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);
  private readonly appId: string;
  private readonly privateKey: string;
  private readonly alipayPublicKey: string;
  private readonly gateway: string;
  private readonly notifyUrl: string;
  private readonly notifyDedup = new MemoryCache<boolean>(10000); // 通知去重，1h TTL

  constructor(
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    this.appId = process.env.ALIPAY_APP_ID || "";
    this.notifyUrl = process.env.ALIPAY_NOTIFY_URL || "";
    const sandbox = process.env.ALIPAY_SANDBOX === "true";
    this.gateway = sandbox
      ? "https://openapi.alipaydev.com/gateway.do"
      : "https://openapi.alipay.com/gateway.do";

    const keyPath = process.env.ALIPAY_PRIVATE_KEY_PATH || "";
    const keyContent = process.env.ALIPAY_PRIVATE_KEY || "";
    this.privateKey = keyPath ? readFileSync(keyPath, "utf-8") : keyContent.replace(/\\n/g, "\n");

    const pubKeyPath = process.env.ALIPAY_PUBLIC_KEY_PATH || "";
    const pubKeyContent = process.env.ALIPAY_PUBLIC_KEY || "";
    this.alipayPublicKey = pubKeyPath ? readFileSync(pubKeyPath, "utf-8") : pubKeyContent.replace(/\\n/g, "\n");

    if (!this.appId || !this.privateKey) {
      this.logger.warn("支付宝未配置，请设置 ALIPAY_* 环境变量");
    }
  }

  // ───────── 签名与请求 ─────────

  /** 构建参数字符串（按key字母排序） */
  private buildParamStr(params: Record<string, any>): string {
    const keys = Object.keys(params).filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "").sort();
    return keys.map((k) => `${k}=${params[k]}`).join("&");
  }

  /** RSA2 签名 */
  private sign(content: string): string {
    const signer = createSign("sha256WithRSAEncryption");
    signer.update(content);
    return signer.sign(this.privateKey, "base64");
  }

  /** RSA2 验签 */
  verifySign(params: Record<string, any>, sign: string): boolean {
    const content = this.buildParamStr(params);
    const verifier = createVerify("sha256WithRSAEncryption");
    verifier.update(content);
    return verifier.verify(this.alipayPublicKey, sign, "base64");
  }

  /** 调用支付宝 API（生成请求URL） */
  private async callApi(method: string, bizContent: Record<string, any>, returnUrl?: string): Promise<string> {
    const params: Record<string, any> = {
      app_id: this.appId,
      method,
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      version: "1.0",
      biz_content: JSON.stringify(bizContent),
      notify_url: bizContent.notify_url || this.notifyUrl,
    };
    if (returnUrl) params.return_url = returnUrl;

    // 移除 notify_url（它是外层参数，不在biz_content中）
    // biz_content 中的 notify_url 需要单独处理

    // 构造签名字符串
    const signContent = this.buildParamStr(params);
    params.sign = this.sign(signContent);

    // 构造完整URL
    const queryStr = this.buildParamStr(params) + `&sign=${encodeURIComponent(params.sign)}`;
    return `${this.gateway}?${queryStr}`;
  }

  // ───────── 支付接口 ─────────

  /** APP支付（返回orderString，客户端SDK调用） */
  async appPay(params: {
    outTradeNo: string;
    totalAmount: number;
    subject: string;
    body?: string;
  }): Promise<string> {
    const bizContent: Record<string, unknown> = {
      out_trade_no: params.outTradeNo,
      total_amount: params.totalAmount.toFixed(2),
      subject: params.subject,
      product_code: "QUICK_MSECURITY_PAY",
    };
    if (params.body) bizContent.body = params.body;

    // APP支付返回签名字符串（不做URL拼接）
    const apiParams: Record<string, any> = {
      app_id: this.appId,
      method: "alipay.trade.app.pay",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      version: "1.0",
      biz_content: JSON.stringify(bizContent),
      notify_url: this.notifyUrl,
    };
    const signContent = this.buildParamStr(apiParams);
    apiParams.sign = this.sign(signContent);

    return this.buildParamStr(apiParams) + `&sign=${encodeURIComponent(apiParams.sign)}`;
  }

  /** 手机网页支付（H5） */
  async wapPay(params: {
    outTradeNo: string;
    totalAmount: number;
    subject: string;
    body?: string;
    returnUrl?: string;
  }): Promise<string> {
    return this.callApi("alipay.trade.wap.pay", {
      out_trade_no: params.outTradeNo,
      total_amount: params.totalAmount.toFixed(2),
      subject: params.subject,
      body: params.body,
      product_code: "QUICK_WAP_WAY",
    }, params.returnUrl);
  }

  /** PC网页支付 */
  async pagePay(params: {
    outTradeNo: string;
    totalAmount: number;
    subject: string;
    body?: string;
    returnUrl?: string;
  }): Promise<string> {
    return this.callApi("alipay.trade.page.pay", {
      out_trade_no: params.outTradeNo,
      total_amount: params.totalAmount.toFixed(2),
      subject: params.subject,
      body: params.body,
      product_code: "FAST_INSTANT_TRADE_PAY",
    }, params.returnUrl);
  }

  // ───────── 订单查询与退款 ─────────

  /** 查询订单状态 */
  async query(outTradeNo: string): Promise<Record<string, unknown>> {
    const params: Record<string, any> = {
      app_id: this.appId,
      method: "alipay.trade.query",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      version: "1.0",
      biz_content: JSON.stringify({ out_trade_no: outTradeNo }),
    };

    const signContent = this.buildParamStr(params);
    params.sign = this.sign(signContent);

    const start = Date.now();
    try {
      const resp = await fetch(this.gateway, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: this.buildParamStr(params) + `&sign=${encodeURIComponent(params.sign)}`,
      });
      const duration = Date.now() - start;
      const result = await resp.json() as Record<string, unknown>;

      const ok = (result.alipay_trade_query_response as any)?.code === "10000";
      if (!ok) {
        const reason = ((result.alipay_trade_query_response as any)?.sub_code ?? "unknown") as string;
        this.metrics?.recordExternalApi("alipay", "alipay.trade.query", false, duration, reason);
      } else {
        this.metrics?.recordExternalApi("alipay", "alipay.trade.query", true, duration);
      }
      return result;
    } catch (err) {
      const duration = Date.now() - start;
      const reason = (err as Error).message?.substring(0, 50) ?? "network_error";
      this.metrics?.recordExternalApi("alipay", "alipay.trade.query", false, duration, reason);
      throw err;
    }
  }

  /** 退款 */
  async refund(params: {
    outTradeNo: string;
    refundAmount: number;
    outRefundNo: string;
    reason?: string;
  }): Promise<string> {
    return this.callApi("alipay.trade.refund", {
      out_trade_no: params.outTradeNo,
      refund_amount: params.refundAmount.toFixed(2),
      out_request_no: params.outRefundNo,
      refund_reason: params.reason,
    });
  }

  /** 关闭订单 */
  async close(outTradeNo: string): Promise<string> {
    return this.callApi("alipay.trade.close", { out_trade_no: outTradeNo });
  }

  // ───────── 工具方法 ─────────

  /** 生成商户订单号 */
  static genOutTradeNo(prefix = "GXALI"): string {
    return `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  /** 验签回调（含重放攻击防护：验签 + 5分钟时间窗口 + notify_id 去重） */
  async verifyNotify(params: Record<string, any>): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }> {
    const sign = params.sign;
    if (!sign) {
      this.metrics?.recordPaymentCallback("alipay", false, "missing_sign");
      return { valid: false, error: "缺少签名字段" };
    }

    // 1. RSA2 验签
    const { sign: _, sign_type, ...rest } = params;
    const valid = this.verifySign(rest, sign);
    if (!valid) {
      this.metrics?.recordPaymentCallback("alipay", false, "verify_failed");
      return { valid: false, error: "RSA2验签失败" };
    }

    // 2. 重放攻击防护：检查通知时间（5分钟窗口）
    const notifyTime = params.notify_time;
    if (notifyTime) {
      const nt = new Date(notifyTime).getTime();
      const diff = Math.abs(Date.now() - nt);
      if (diff > 5 * 60 * 1000) {
        this.metrics?.recordPaymentCallback("alipay", false, "timeout");
        this.logger.warn(`支付宝通知超时，时间差${Math.round(diff / 1000)}秒`);
        return { valid: false, error: "通知时间窗口超时（5分钟）" };
      }
    }

    // 3. 通知去重：同一 notify_id 只处理一次
    const notifyId = params.notify_id;
    if (notifyId) {
      if (this.notifyDedup.has(notifyId)) {
        // 重复通知，返回成功避免支付宝重发
        return { valid: true, data: { tradeStatus: params.trade_status, dedup: true } };
      }
      this.notifyDedup.set(notifyId, true, 3600_000); // 1h TTL
    }

    // 4. 检查交易状态
    const tradeStatus = params.trade_status;
    if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
      this.metrics?.recordPaymentCallback("alipay", true);
      return {
        valid: true,
        data: {
          outTradeNo: params.out_trade_no,
          tradeNo: params.trade_no,
          totalAmount: parseFloat(params.total_amount || "0"),
          buyerId: params.buyer_id,
          buyerLogonId: params.buyer_logon_id,
          gmtPayment: params.gmt_payment,
          tradeStatus,
        },
      };
    }
    this.metrics?.recordPaymentCallback("alipay", true);
    return { valid: true, data: { tradeStatus } };
  }
}
