import { Injectable, Logger } from "@nestjs/common";
import { createSign, createVerify, randomInt } from "crypto";
import { readFileSync } from "fs";
import { MemoryCache } from "../../common/cache.util";

/**
 * 银联支付（含云闪付）API 服务
 * 使用 RSA-SHA256 签名 + PKCS12证书，无SDK
 * 文档: https://open.unionpay.com/
 */
@Injectable()
export class UnionpayService {
  private readonly logger = new Logger(UnionpayService.name);
  private readonly merId: string;
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly gateway: string;
  private readonly notifyUrl: string;
  private readonly notifyDedup = new MemoryCache<boolean>(10000); // 通知去重，1h TTL

  constructor() {
    this.merId = process.env.UNIONPAY_MER_ID || "";
    this.notifyUrl = process.env.UNIONPAY_NOTIFY_URL || "";
    const sandbox = process.env.UNIONPAY_SANDBOX === "true";

    // 网关URL
    this.gateway = sandbox
      ? "https://gateway.test.95516.com/gateway/api"
      : "https://gateway.95516.com/gateway/api";

    // 证书加载
    const pfxPath = process.env.UNIONPAY_PFX_PATH || "";
    const pfxPass = process.env.UNIONPAY_PFX_PASSWORD || "";
    if (pfxPath) {
      const { privateKey } = this.loadPfx(readFileSync(pfxPath), pfxPass);
      this.privateKey = privateKey;
    } else {
      this.privateKey = (process.env.UNIONPAY_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    }

    const pubKeyPath = process.env.UNIONPAY_PUBLIC_KEY_PATH || "";
    this.publicKey = pubKeyPath
      ? readFileSync(pubKeyPath, "utf-8")
      : (process.env.UNIONPAY_PUBLIC_KEY || "").replace(/\\n/g, "\n");

    if (!this.merId || !this.privateKey) {
      this.logger.warn("银联支付未配置");
    }
  }

  /** 支付渠道是否已配置（缺密钥则无法签名/退款，调用方据此降级为线下处理） */
  get isConfigured(): boolean {
    return !!(this.merId && this.privateKey);
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
    const keys = Object.keys(params).filter((k) => k !== "signature").sort();
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
      body: this.buildSignStr(params) + `&signature=${encodeURIComponent(params.signature || "")}`,
      signal: AbortSignal.timeout(15000),
    });
    const text = await resp.text();
    // 解析返回的键值对
    const result: Record<string, string> = {};
    for (const pair of text.split("&")) {
      const [k, v] = pair.split("=");
      if (k) result[k] = decodeURIComponent(v || "");
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
      txnTime: new Date().toISOString().slice(0, 19).replace(/[-:T]/g, ""),
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
      txnTime: new Date().toISOString().slice(0, 19).replace(/[-:T]/g, ""),
    };

    const signStr = this.buildSignStr(params);
    params.signature = this.sign(signStr);

    return this.backRequest(params);
  }

  /** 退款 */
  async refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    amount: number;
    origQryId?: string; // 原交易查询流水号
  }) {
    const reqParams: Record<string, string> = {
      version: "5.1.0",
      encoding: "utf-8",
      signMethod: "11",
      txnType: "04",
      txnSubType: "00",
      bizType: "000201",
      merId: this.merId,
      orderId: params.outRefundNo,
      origQryId: params.origQryId || "",
      txnAmt: String(params.amount),
      backUrl: this.notifyUrl,
    };

    const signStr = this.buildSignStr(reqParams);
    reqParams.signature = this.sign(signStr);

    return this.backRequest(reqParams);
  }

  // ───────── 回调处理 ─────────

  /** 验证回调签名（含重放攻击防护：验签 + 5分钟时间窗口 + orderId去重） */
  async verifyNotify(params: Record<string, string>): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }> {
    const signature = params.signature || params.sign || "";
    if (!signature) return { valid: false, error: "缺少签名字段" };

    // 1. RSA-SHA256 验签
    const rest = { ...params };
    delete rest.signature;
    const signStr = this.buildSignStr(rest);
    const valid = this.verifySign(signStr, signature);
    if (!valid) return { valid: false, error: "RSA-SHA256验签失败" };

    // 2. 重放攻击防护：检查交易时间（5分钟窗口）
    const txnTime = params.txnTime || params.txn_time;
    if (txnTime) {
      // 银联时间格式: YYYYMMDDHHmmss
      const y = txnTime.substring(0, 4), m = txnTime.substring(4, 6), d = txnTime.substring(6, 8);
      const h = txnTime.substring(8, 10), min = txnTime.substring(10, 12), s = txnTime.substring(12, 14);
      const nt = new Date(`${y}-${m}-${d}T${h}:${min}:${s}+08:00`).getTime();
      const diff = Math.abs(Date.now() - nt);
      if (diff > 5 * 60 * 1000) {
        this.logger.warn(`银联通知超时，时间差${Math.round(diff / 1000)}秒`);
        return { valid: false, error: "通知时间窗口超时（5分钟）" };
      }
    }

    // 3. 通知去重：同一 orderId 成功回调只处理一次
    const orderId = params.orderId || params.order_id;
    const dedupKey = orderId ? `un:${orderId}` : "";
    if (dedupKey && this.notifyDedup.has(dedupKey)) {
      return { valid: true, data: { dedup: true, respCode: "00" } };
    }

    const respCode = params.respCode || params.resp_code;
    if (respCode === "00" && dedupKey) {
      this.notifyDedup.set(dedupKey, true, 3600_000); // 1h TTL
    }

    if (respCode === "00") {
      return {
        valid: true,
        data: {
          respCode: "00", // handleUnionpayNotify 以此判定成功，缺失会导致成功回调被拒不入账
          outTradeNo: orderId,
          tradeNo: params.queryId || params.query_id,
          amount: parseInt(params.txnAmt || params.txn_amt || "0"),
          settleDate: params.settleDate || params.settle_date,
          respMsg: params.respMsg || params.resp_msg,
        },
      };
    }
    return { valid: true, data: { respCode, respMsg: params.respMsg } };
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
