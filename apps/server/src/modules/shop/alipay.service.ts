import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { createSign, createVerify, randomInt } from "crypto";
import { readFileSync } from "fs";

import { MetricsService } from "../../common/metrics.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 支付宝支付 API 服务（RSA2+SHA256签名，无SDK）
 * 文档: https://opendocs.alipay.com/open/
 */
@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);

  constructor(
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    if (!this.appId || !this.privateKey) {
      this.logger.warn("支付宝未配置，请设置 ALIPAY_* 环境变量");
    }
  }

  // 后台密钥保存会跨节点刷新 process.env；运行时动态读取，避免服务实例继续使用旧密钥。
  private get appId(): string { return process.env.ALIPAY_APP_ID || ""; }
  private get notifyUrl(): string { return process.env.ALIPAY_NOTIFY_URL || ""; }
  private get gateway(): string {
    return process.env.ALIPAY_SANDBOX === "true"
      ? "https://openapi.alipaydev.com/gateway.do"
      : "https://openapi.alipay.com/gateway.do";
  }
  private get privateKey(): string {
    const path = process.env.ALIPAY_PRIVATE_KEY_PATH || "";
    return path ? readFileSync(path, "utf-8") : (process.env.ALIPAY_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  }
  private get alipayPublicKey(): string {
    const path = process.env.ALIPAY_PUBLIC_KEY_PATH || "";
    return path ? readFileSync(path, "utf-8") : (process.env.ALIPAY_PUBLIC_KEY || "").replace(/\\n/g, "\n");
  }

  /** 支付渠道是否已配置（缺密钥则无法签名/退款，调用方据此降级为线下处理） */
  get isConfigured(): boolean {
    return !!(this.appId && this.privateKey && this.alipayPublicKey);
  }

  /** 支付宝网关时间固定使用中国标准时间，避免 UTC 服务器生成相差 8 小时的无效 timestamp。 */
  private formatGatewayTimestamp(date = new Date()): string {
    return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
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
      timestamp: this.formatGatewayTimestamp(),
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
    const queryStr = this.encodeParams(params);
    return `${this.gateway}?${queryStr}`;
  }

  /** 按 application/x-www-form-urlencoded 正确编码，避免中文/JSON 中的 & 破坏参数。 */
  private encodeParams(params: Record<string, any>): string {
    const encoded = new URLSearchParams();
    for (const key of Object.keys(params).sort()) {
      const value = params[key];
      if (value !== undefined && value !== null && value !== "") encoded.append(key, String(value));
    }
    return encoded.toString();
  }

  /** 取支付宝同步响应中待验签的原始 response JSON 对象。 */
  private extractResponsePayload(raw: string, responseKey: string): string | null {
    const marker = `"${responseKey}"`;
    const markerIndex = raw.indexOf(marker);
    if (markerIndex < 0) return null;
    const start = raw.indexOf("{", markerIndex + marker.length);
    if (start < 0) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) return raw.slice(start, i + 1);
    }
    return null;
  }

  private verifyRawResponse(content: string, signature: string): boolean {
    const verifier = createVerify("sha256WithRSAEncryption");
    verifier.update(content, "utf8");
    return verifier.verify(this.alipayPublicKey, signature, "base64");
  }

  /** 服务端资金 API：真实 POST、HTTP/JSON/业务码/响应签名任一不明确均失败关闭。 */
  private async callServerApi(
    method: string,
    bizContent: Record<string, unknown>,
    responseKey: string,
  ): Promise<Record<string, any>> {
    if (!this.isConfigured) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "支付宝支付配置不完整，无法执行退款");
    }
    const params: Record<string, string> = {
      app_id: this.appId,
      method,
      format: "json",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: this.formatGatewayTimestamp(),
      version: "1.0",
      biz_content: JSON.stringify(bizContent),
    };
    params.sign = this.sign(this.buildParamStr(params));

    const start = Date.now();
    try {
      const resp = await fetch(this.gateway, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
        body: this.encodeParams(params),
        signal: AbortSignal.timeout(15000),
      });
      if (resp.ok === false) {
        throw new BusinessException(ErrorCode.PAY_FAILED, `支付宝网关 HTTP ${resp.status}`);
      }
      const raw = await resp.text();
      let envelope: Record<string, any>;
      try {
        envelope = JSON.parse(raw) as Record<string, any>;
      } catch {
        throw new BusinessException(ErrorCode.PAY_FAILED, "支付宝网关返回非 JSON 响应");
      }
      const payload = envelope[responseKey] as Record<string, any> | undefined;
      const signature = envelope.sign as string | undefined;
      const rawPayload = this.extractResponsePayload(raw, responseKey);
      if (!payload || !signature || !rawPayload || !this.verifyRawResponse(rawPayload, signature)) {
        throw new BusinessException(ErrorCode.PAY_FAILED, "支付宝响应验签失败");
      }
      if (payload.code !== "10000") {
        const message = String(payload.sub_msg || payload.msg || payload.sub_code || payload.code || "支付宝退款失败");
        throw new BusinessException(ErrorCode.PAY_FAILED, message);
      }
      this.metrics?.recordExternalApi("alipay", method, true, Date.now() - start);
      return payload;
    } catch (err) {
      this.metrics?.recordExternalApi("alipay", method, false, Date.now() - start, (err as Error).message?.slice(0, 50) || "network_error");
      throw err;
    }
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
      timestamp: this.formatGatewayTimestamp(),
      version: "1.0",
      biz_content: JSON.stringify(bizContent),
      notify_url: this.notifyUrl,
    };
    const signContent = this.buildParamStr(apiParams);
    apiParams.sign = this.sign(signContent);

    return this.encodeParams(apiParams);
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
      timestamp: this.formatGatewayTimestamp(),
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
        body: this.encodeParams(params),
        signal: AbortSignal.timeout(15000),
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

  /** 退款：fund_change=Y 才直接成功；N/缺失必须再查退款结果。 */
  async refund(params: {
    outTradeNo: string;
    tradeNo?: string;
    refundAmount: number;
    outRefundNo: string;
    reason?: string;
  }): Promise<{ status: "SUCCESS" | "PROCESSING"; outRefundNo: string; raw: Record<string, any> }> {
    const tradeRef = params.tradeNo
      ? { trade_no: params.tradeNo }
      : { out_trade_no: params.outTradeNo };
    const result = await this.callServerApi("alipay.trade.refund", {
      ...tradeRef,
      refund_amount: params.refundAmount.toFixed(2),
      out_request_no: params.outRefundNo,
      refund_reason: params.reason,
    }, "alipay_trade_refund_response");
    this.assertRefundIdentity(result, params.outTradeNo, params.tradeNo);
    if (result.fund_change === "Y") {
      return { status: "SUCCESS", outRefundNo: params.outRefundNo, raw: result };
    }
    try {
      const queried = await this.queryRefund({
        outTradeNo: params.outTradeNo,
        tradeNo: params.tradeNo,
        outRefundNo: params.outRefundNo,
      });
      return { ...queried, outRefundNo: params.outRefundNo };
    } catch (err) {
      // 请求号稳定，结果暂不明确时保持 PROCESSING，由售后对账任务继续查询，绝不提前本地记账。
      this.logger.warn(`支付宝退款结果待确认: ${params.outRefundNo}`, (err as Error).message);
      return { status: "PROCESSING", outRefundNo: params.outRefundNo, raw: result };
    }
  }

  /** 查询同一退款请求号，refund_status=REFUND_SUCCESS 才确认成功。 */
  async queryRefund(params: {
    outTradeNo: string;
    tradeNo?: string;
    outRefundNo: string;
  }): Promise<{ status: "SUCCESS" | "PROCESSING"; raw: Record<string, any> }> {
    const tradeRef = params.tradeNo
      ? { trade_no: params.tradeNo }
      : { out_trade_no: params.outTradeNo };
    const result = await this.callServerApi("alipay.trade.fastpay.refund.query", {
      ...tradeRef,
      out_request_no: params.outRefundNo,
    }, "alipay_trade_fastpay_refund_query_response");
    this.assertRefundIdentity(result, params.outTradeNo, params.tradeNo, params.outRefundNo);
    return {
      status: result.refund_status === "REFUND_SUCCESS" ? "SUCCESS" : "PROCESSING",
      raw: result,
    };
  }

  /** 验证退款响应与本次请求确属同一交易/退款单，防有效签名的错单响应被误记账。 */
  private assertRefundIdentity(
    result: Record<string, any>,
    outTradeNo: string,
    tradeNo?: string,
    outRefundNo?: string,
  ): void {
    const tradeMatches = tradeNo
      ? String(result.trade_no || "") === tradeNo
      : String(result.out_trade_no || "") === outTradeNo;
    const requestMatches = !outRefundNo || String(result.out_request_no || "") === outRefundNo;
    if (!tradeMatches || !requestMatches) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "支付宝退款响应交易标识不匹配");
    }
  }

  /** 关闭订单 */
  async close(outTradeNo: string): Promise<string> {
    return this.callApi("alipay.trade.close", { out_trade_no: outTradeNo });
  }

  // ───────── 工具方法 ─────────

  /** 生成商户订单号 */
  static genOutTradeNo(prefix = "GXALI"): string {
    return `${prefix}${Date.now()}${randomInt(0, 36 ** 6).toString(36).padStart(6, "0").toUpperCase()}`;
  }

  /** 验签回调（签名 + appId；延迟重投由订单状态/CAS 幂等接收） */
  async verifyNotify(params: Record<string, any>): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }> {
    const sign = params.sign;
    if (!sign) {
      this.metrics?.recordPaymentCallback("alipay", false, "missing_sign");
      return { valid: false, error: "缺少签名字段" };
    }

    // 1. RSA2 验签
    const rest = { ...params };
    delete rest.sign;
    const valid = this.verifySign(rest, sign);
    if (!valid) {
      this.metrics?.recordPaymentCallback("alipay", false, "verify_failed");
      return { valid: false, error: "RSA2验签失败" };
    }
    if (!params.app_id || params.app_id !== this.appId) {
      this.metrics?.recordPaymentCallback("alipay", false, "app_id_mismatch");
      return { valid: false, error: "支付宝回调应用标识不匹配" };
    }

    // 2. notify_time 是渠道通知时间，重试可能延迟；只记录异常延迟，不拒绝签名有效的补偿通知。
    // 安全边界由签名、appId、订单号、金额及数据库 CAS 共同保证，避免首轮本地故障后永久丢单。
    const notifyTime = String(params.notify_time || "");
    if (notifyTime) {
      const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(notifyTime)
        ? `${notifyTime.replace(" ", "T")}+08:00`
        : notifyTime;
      const nt = new Date(normalized).getTime();
      if (Number.isFinite(nt)) {
        const diff = Math.abs(Date.now() - nt);
        if (diff > 5 * 60 * 1000) {
          this.logger.warn(`支付宝通知延迟${Math.round(diff / 1000)}秒，仍按订单幂等处理`);
        }
      }
    }

    // 3. 只验签与解析，不在这里提前去重。是否已完成必须由订单状态判断；
    // 否则首次本地入账失败后，渠道重试会被误判为已处理并永久丢单。
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
