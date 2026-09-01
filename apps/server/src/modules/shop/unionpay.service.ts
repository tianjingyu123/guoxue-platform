import { Injectable, Logger } from "@nestjs/common";
import { createSign, createVerify, randomInt } from "crypto";
import { readFileSync } from "fs";

import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 银联支付（含云闪付）API 服务
 * 使用 RSA-SHA256 签名 + PKCS12证书，无SDK
 * 文档: https://open.unionpay.com/
 */
@Injectable()
export class UnionpayService {
  private readonly logger = new Logger(UnionpayService.name);
  private privateKeyCache?: { source: string; value: string };

  constructor() {
    if (!this.merId || !this.privateKey) {
      this.logger.warn("银联支付未配置");
    }
  }

  // 后台密钥保存会跨节点刷新 process.env；运行时读取并仅按配置指纹缓存 PFX 解析结果。
  private get merId(): string { return process.env.UNIONPAY_MER_ID || ""; }
  private get notifyUrl(): string { return process.env.UNIONPAY_NOTIFY_URL || ""; }
  private get gateway(): string {
    return process.env.UNIONPAY_SANDBOX === "true"
      ? "https://gateway.test.95516.com/gateway/api"
      : "https://gateway.95516.com/gateway/api";
  }
  private get privateKey(): string {
    const pfxPath = process.env.UNIONPAY_PFX_PATH || "";
    const pfxPass = process.env.UNIONPAY_PFX_PASSWORD || "";
    const inline = process.env.UNIONPAY_PRIVATE_KEY || "";
    const source = `${pfxPath}\u0000${pfxPass}\u0000${inline}`;
    if (this.privateKeyCache?.source === source) return this.privateKeyCache.value;
    const value = pfxPath
      ? this.loadPfx(readFileSync(pfxPath), pfxPass).privateKey
      : inline.replace(/\\n/g, "\n");
    this.privateKeyCache = { source, value };
    return value;
  }
  private get publicKey(): string {
    const path = process.env.UNIONPAY_PUBLIC_KEY_PATH || "";
    return path ? readFileSync(path, "utf-8") : (process.env.UNIONPAY_PUBLIC_KEY || "").replace(/\\n/g, "\n");
  }

  /** 支付渠道是否已配置（缺密钥则无法签名/退款，调用方据此降级为线下处理） */
  get isConfigured(): boolean {
    return !!(this.merId && this.privateKey && this.publicKey);
  }

  /** 银联网关时间固定使用中国标准时间；退款可传入持久化时间以保持三要素幂等。 */
  private formatTxnTime(date = new Date()): string {
    return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace(/[-:T]/g, "");
  }

  /** 从PFX/P12文件提取私钥（简化实现：OpenSSL提取） */
  private loadPfx(pfxBuf: Buffer, password: string): { privateKey: string; cert: string } {
    const { spawnSync } = require("child_process");
    const { randomUUID } = require("crypto");
    const tmp = require("os").tmpdir();
    const pfxPath = `${tmp}/unionpay-${randomUUID()}.pfx`;
    try {
      require("fs").writeFileSync(pfxPath, pfxBuf);
      // 密码通过 stdin 传递，避免出现在进程列表的命令行参数中
      const key = spawnSync("openssl", ["pkcs12", "-in", pfxPath, "-nocerts", "-nodes", "-passin", "stdin"], {
        encoding: "utf-8",
        input: password,
      }).stdout;
      const cert = spawnSync("openssl", ["pkcs12", "-in", pfxPath, "-clcerts", "-nokeys", "-passin", "stdin"], {
        encoding: "utf-8",
        input: password,
      }).stdout;
      return { privateKey: key || "", cert: cert || "" };
    } finally {
      // 确保临时文件在任何情况下都被清理
      try { require("fs").unlinkSync(pfxPath); } catch (_err) { /* 忽略删除失败 */ }
    }
  }

  // ───────── 签名与请求 ─────────

  /** RSA-SHA256 签名 */
  private sign(data: string): string {
    const signer = createSign("sha256WithRSAEncryption");
    signer.update(data);
    return signer.sign(this.privateKey, "base64");
  }

  /** RSA-SHA256 验签 */
  verifySign(signedStr: string, signature: string): boolean {
    const verifier = createVerify("sha256WithRSAEncryption");
    verifier.update(signedStr);
    return verifier.verify(this.publicKey, signature, "base64");
  }

  /** 构建待签名字符串（按 key=value& 格式） */
  private buildSignStr(params: Record<string, string>): string {
    const keys = Object.keys(params).filter((k) => k !== "signature" && k !== "sign").sort();
    return keys.map((k) => `${k}=${params[k]}`).join("&");
  }

  /** 构建表单HTML（网页支付跳转用） */
  private buildForm(action: string, params: Record<string, string>): string {
    const fields = Object.entries(params)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${this.escapeHtml(v)}" />`)
      .join("\n");
    return `<!DOCTYPE html><html><body onload="document.forms[0].submit()"><form action="${action}" method="POST">${fields}</form></body></html>`;
  }

  /** 发送后台请求 */
  private async backRequest(params: Record<string, string>): Promise<Record<string, string>> {
    const resp = await fetch(this.gateway + "/backTransReq.do", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (resp.ok === false) {
      throw new BusinessException(ErrorCode.PAY_FAILED, `银联网关 HTTP ${resp.status}`);
    }
    const text = await resp.text();
    // 解析返回的键值对
    const result: Record<string, string> = {};
    for (const pair of text.split("&")) {
      const separator = pair.indexOf("=");
      const k = separator >= 0 ? pair.slice(0, separator) : pair;
      const v = separator >= 0 ? pair.slice(separator + 1) : "";
      if (k) result[k] = decodeURIComponent(v.replace(/\+/g, " "));
    }
    return result;
  }

  // ───────── 支付接口 ─────────

  /** 构建通用支付参数 */
  private buildBaseParams(txnType: string, txnSubType: string, outTradeNo: string, amount: number, frontUrl?: string): Record<string, string> {
    const params: Record<string, string> = {
      version: "5.1.0",
      encoding: "utf-8",
      signMethod: "11", // SHA256-RSA
      txnType,
      txnSubType,
      bizType: "000201",
      merId: this.merId,
      orderId: outTradeNo,
      txnAmt: String(amount), // 分
      txnTime: this.formatTxnTime(),
      backUrl: this.notifyUrl,
      accessType: "0",
      channelType: "07", // PC
      currencyCode: "156",
    };
    if (frontUrl) params.frontUrl = frontUrl;
    return params;
  }

  /** APP支付（云闪付APP内） */
  async appPay(params: {
    outTradeNo: string;
    amount: number; // 分
    subject: string;
    frontUrl?: string;
  }): Promise<string> {
    const reqParams: Record<string, string> = {
      ...this.buildBaseParams("01", "01", params.outTradeNo, params.amount),
      accessType: "0",
      channelType: "08", // APP
    };

    const signStr = this.buildSignStr(reqParams);
    reqParams.signature = this.sign(signStr);

    // 返回给APP的TN（Token Number）
    const result = await this.backRequest(reqParams);
    return result.tn || "";
  }

  /** 网页支付（PC/WAP网关跳转） */
  async webPay(params: {
    outTradeNo: string;
    amount: number;
    subject: string;
    frontUrl?: string; // 支付成功后跳转
  }): Promise<string> {
    const reqParams = this.buildBaseParams("01", "01", params.outTradeNo, params.amount, params.frontUrl);
    const signStr = this.buildSignStr(reqParams);
    reqParams.signature = this.sign(signStr);

    return this.buildForm(this.gateway + "/frontTransReq.do", reqParams);
  }

  /** 云闪付H5支付 */
  async quickPassPay(params: {
    outTradeNo: string;
    amount: number;
    subject: string;
    frontUrl?: string;
  }): Promise<string> {
    return this.webPay(params);
  }

  // ───────── 查询与退款 ─────────

  /** 订单查询 */
  async query(outTradeNo: string) {
    const params: Record<string, string> = {
      version: "5.1.0",
      encoding: "utf-8",
      signMethod: "11",
      txnType: "00",
      txnSubType: "00",
      bizType: "000000",
      merId: this.merId,
      orderId: outTradeNo,
      txnTime: this.formatTxnTime(),
    };

    const signStr = this.buildSignStr(params);
    params.signature = this.sign(signStr);

    return this.backRequest(params);
  }

  /** 退款：同步 respCode=00 仅代表银联受理，真实资金结果等待验签后台通知。 */
  async refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    amount: number;
    origQryId?: string; // 原消费交易 queryId
    merchantOrderId?: string; // 平台订单ID，经 reqReserved 原样回传供回调关联
    requestedAt?: Date; // 首次退款处理时间，跨重试保持 orderId+txnTime 幂等键稳定
  }): Promise<{ status: "PROCESSING"; channelRefundNo: string; raw: Record<string, string> }> {
    if (!this.isConfigured) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "银联支付配置不完整，无法执行退款");
    }
    if (!params.origQryId) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "银联原交易流水号缺失，无法执行退款");
    }
    const channelRefundNo = params.outRefundNo.replace(/[^A-Za-z0-9]/g, "").slice(0, 40);
    if (channelRefundNo.length < 8) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "银联退款单号不合法");
    }
    const reqParams: Record<string, string> = {
      version: "5.1.0",
      encoding: "utf-8",
      signMethod: "11",
      txnType: "04",
      txnSubType: "00",
      bizType: "000201",
      channelType: "07",
      accessType: "0",
      currencyCode: "156",
      merId: this.merId,
      orderId: channelRefundNo,
      origQryId: params.origQryId,
      txnAmt: String(params.amount),
      txnTime: this.formatTxnTime(params.requestedAt),
      backUrl: this.notifyUrl,
      ...(params.merchantOrderId ? { reqReserved: params.merchantOrderId } : {}),
    };

    reqParams.signature = this.sign(this.buildSignStr(reqParams));
    const result = await this.backRequest(reqParams);
    const signature = result.signature || result.sign || "";
    if (!signature || !this.verifySign(this.buildSignStr(result), signature)) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "银联退款响应验签失败");
    }
    if (result.merId !== this.merId || result.orderId !== channelRefundNo) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "银联退款响应商户或退款单号不匹配");
    }
    if (result.origQryId && result.origQryId !== params.origQryId) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "银联退款响应原交易流水不匹配");
    }
    if (result.respCode !== "00") {
      throw new BusinessException(ErrorCode.PAY_FAILED, result.respMsg || `银联退款未受理(${result.respCode || "UNKNOWN"})`);
    }
    return { status: "PROCESSING", channelRefundNo, raw: result };
  }

  // ───────── 回调处理 ─────────

  /** 验证回调签名（签名 + 商户号；延迟重投由订单状态/CAS 幂等接收） */
  async verifyNotify(params: Record<string, string>): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }> {
    const signature = params.signature || params.sign || "";
    if (!signature) return { valid: false, error: "缺少签名字段" };

    // 1. RSA-SHA256 验签
    const rest = { ...params };
    delete rest.signature;
    const signStr = this.buildSignStr(rest);
    const valid = this.verifySign(signStr, signature);
    if (!valid) return { valid: false, error: "RSA-SHA256验签失败" };
    const callbackMerId = params.merId || params.mer_id;
    if (!callbackMerId || callbackMerId !== this.merId) {
      return { valid: false, error: "银联回调商户号不匹配" };
    }

    // 2. txnTime 是原交易时间而非通知发送时间，渠道重投可能远超 5 分钟。
    // 只记录延迟，不拒绝已验签通知；订单号、金额、商户号与数据库 CAS 才是最终安全边界。
    const txnTime = params.txnTime || params.txn_time;
    if (txnTime) {
      // 银联时间格式: YYYYMMDDHHmmss
      const y = txnTime.substring(0, 4), m = txnTime.substring(4, 6), d = txnTime.substring(6, 8);
      const h = txnTime.substring(8, 10), min = txnTime.substring(10, 12), s = txnTime.substring(12, 14);
      const nt = new Date(`${y}-${m}-${d}T${h}:${min}:${s}+08:00`).getTime();
      if (Number.isFinite(nt)) {
        const diff = Math.abs(Date.now() - nt);
        if (diff > 5 * 60 * 1000) {
          this.logger.warn(`银联通知对应交易已过去${Math.round(diff / 1000)}秒，仍按订单幂等处理`);
        }
      }
    }

    // 3. 只验签与解析，不在这里提前去重。订单状态/CAS 才是最终幂等真源；
    // 否则首次本地入账失败后，银联重试会被误判为已处理并永久丢单。
    const orderId = params.orderId || params.order_id;
    const respCode = params.respCode || params.resp_code;

    if (respCode === "00") {
      return {
        valid: true,
        data: {
          respCode: "00", // handleUnionpayNotify 以此判定成功，缺失会导致成功回调被拒不入账
          txnType: params.txnType || params.txn_type,
          outTradeNo: orderId,
          origQryId: params.origQryId || params.orig_qry_id,
          merchantOrderId: params.reqReserved || params.req_reserved,
          tradeNo: params.queryId || params.query_id,
          amount: parseInt(params.txnAmt || params.txn_amt || "0"),
          settleDate: params.settleDate || params.settle_date,
          respMsg: params.respMsg || params.resp_msg,
        },
      };
    }
    return {
      valid: true,
      data: {
        respCode,
        txnType: params.txnType || params.txn_type,
        outTradeNo: orderId,
        origQryId: params.origQryId || params.orig_qry_id,
        merchantOrderId: params.reqReserved || params.req_reserved,
        amount: parseInt(params.txnAmt || params.txn_amt || "0"),
        respMsg: params.respMsg || params.resp_msg,
      },
    };
  }

  /** 生成回调响应（必须返回给银联） */
  static buildNotifyResponse(): string {
    return "success";
  }

  // ───────── 工具 ─────────

  static genOutTradeNo(prefix = "GXUN"): string {
    return `${prefix}${Date.now()}${randomInt(0, 36 ** 6).toString(36).padStart(6, "0").toUpperCase()}`;
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}
