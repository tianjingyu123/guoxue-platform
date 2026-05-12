import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { createHash, createSign, createVerify, randomUUID, createDecipheriv } from "crypto";
import { readFileSync } from "fs";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { MetricsService } from "../../common/metrics.service";

/**
 * 微信支付 V3 API 服务（纯原生HTTP+加密，不依赖SDK）
 * 文档: https://pay.weixin.qq.com/doc/v3
 */
@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);
  private readonly mchId: string;
  private readonly serialNo: string;
  private readonly privateKey: string;
  private readonly apiV3Key: string;
  private readonly appId: string;
  private readonly baseUrl = "https://api.mch.weixin.qq.com";
  // 平台证书序列号 → { pem, expireAt }
  private platformCerts: Map<string, { pem: string; expireAt: number }> = new Map();

  constructor(
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    this.mchId = process.env.WECHAT_PAY_MCH_ID || "";
    this.serialNo = process.env.WECHAT_PAY_SERIAL_NO || "";
    this.apiV3Key = process.env.WECHAT_PAY_API_V3_KEY || "";
    this.appId = process.env.WECHAT_APP_ID || "";

    // 私钥可以从文件路径读取或直接环境变量
    const keyPath = process.env.WECHAT_PAY_PRIVATE_KEY_PATH || "";
    const keyContent = process.env.WECHAT_PAY_PRIVATE_KEY || "";
    if (keyPath) {
      this.privateKey = readFileSync(keyPath, "utf-8");
    } else {
      this.privateKey = keyContent.replace(/\\n/g, "\n");
    }

    if (!this.mchId || !this.privateKey) {
      this.logger.warn("微信支付未配置，请在 .env 中设置 WECHAT_PAY_* 相关变量");
    }
  }

  // ───────── V3 签名与请求 ─────────

  /** 生成 V3 Authorization 头 */
  private sign(method: string, path: string, body: string = ""): { authorization: string; timestamp: number; nonce: string } {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomUUID().replace(/-/g, "");
    const signMessage = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;

    const signer = createSign("sha256WithRSAEncryption");
    signer.update(signMessage);
    const signature = signer.sign(this.privateKey, "base64");

    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${this.serialNo}",signature="${signature}"`;
    return { authorization, timestamp, nonce };
  }

  /** 调用微信支付 V3 API */
  private async callApi(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const bodyStr = body ? JSON.stringify(body) : "";
    const { authorization } = this.sign(method, path, bodyStr);
    const start = Date.now();

    try {
      const resp = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Authorization": authorization,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "guoxue-platform/1.0",
        },
        body: bodyStr || undefined,
      });

      const duration = Date.now() - start;
      const respBody = await resp.json() as any;

      if (resp.status >= 400) {
        const reason = (respBody.code || respBody.message || "unknown") as string;
        this.metrics?.recordExternalApi("wechatpay", path, false, duration, reason);
        this.logger.error(`微信支付API错误 [${method} ${path}]`, respBody);
        throw new BusinessException(ErrorCode.PAY_FAILED, `微信支付失败: ${respBody.message || respBody.code || "未知错误"}`);
      }

      this.metrics?.recordExternalApi("wechatpay", path, true, duration);
      return respBody;
    } catch (err) {
      const duration = Date.now() - start;
      if (err instanceof BusinessException) throw err;
      const reason = (err as Error).message?.substring(0, 50) ?? "network_error";
      this.metrics?.recordExternalApi("wechatpay", path, false, duration, reason);
      throw err;
    }
  }

  // ───────── 平台证书管理 ─────────

  /** 获取所有平台证书（自动缓存，按序列号索引） */
  private async getPlatformCerts(): Promise<Map<string, string>> {
    const now = Date.now();
    const valid: Map<string, string> = new Map();

    // 检查缓存中是否有未过期的证书
    for (const [serial, entry] of this.platformCerts) {
      if (now < entry.expireAt) {
        valid.set(serial, entry.pem);
      } else {
        this.platformCerts.delete(serial);
      }
    }

    if (valid.size > 0) return valid;

    // 从微信获取最新证书列表
    const resp = await this.callApi("GET", "/v3/certificates") as Record<string, unknown>;
    const certList = (resp.data || []) as Array<Record<string, unknown>>;
    if (certList.length === 0) throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, "获取平台证书失败");

    for (const certData of certList) {
      const serial = certData.serial_no as string;
      const cert = certData.encrypt_certificate as Record<string, any>;
      const pem = this.aesGcmDecrypt(
        (cert as Record<string, any>).associated_data,
        (cert as Record<string, any>).nonce,
        (cert as Record<string, any>).ciphertext,
      );
      // 证书12小时后过期（实际有效期约24小时）
      this.platformCerts.set(serial as string, {
        pem,
        expireAt: now + 12 * 3600 * 1000,
      });
      valid.set(serial as string, pem);
    }

    return valid;
  }

  /** 根据序列号获取指定平台证书 */
  async getPlatformCertBySerial(serialNo: string): Promise<string> {
    const certs = await this.getPlatformCerts();
    const pem = certs.get(serialNo);
    if (!pem) throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `平台证书不存在: ${serialNo}`);
    return pem;
  }

  /** AES-256-GCM 解密（用于证书和回调数据解密） */
  aesGcmDecrypt(associatedData: string, nonce: string, ciphertext: string): string {
    const key = Buffer.from(this.apiV3Key, "utf-8");
    const authTag = Buffer.from(ciphertext.slice(-32), "hex");
    const data = Buffer.from(ciphertext.slice(0, -32), "hex");

    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(nonce, "utf-8"));
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(associatedData, "utf-8"));

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf-8");
  }

  // ───────── 支付下单 ─────────

  /** JSAPI 支付（小程序/公众号内支付） */
  async createJsapiOrder(params: {
    outTradeNo: string;
    description: string;
    amount: { total: number; currency?: string };
    payer: { openid: string };
    attach?: string;
    notifyUrl?: string;
  }) {
    const body: Record<string, unknown> = {
      appid: this.appId,
      mchid: this.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl || process.env.WECHAT_PAY_NOTIFY_URL || "",
      amount: {
        total: params.amount.total, // 分
        currency: params.amount.currency || "CNY",
      },
      payer: { openid: params.payer.openid },
    };
    if (params.attach) body.attach = params.attach;

    const result = await this.callApi("POST", "/v3/pay/transactions/jsapi", body) as Record<string, unknown>;

    // 二次签名用于小程序调起支付
    const prepayId = result.prepay_id as string;
    const paySign = this.signJsapiConfig(prepayId);

    return { prepayId, paySign, raw: result };
  }

  /** APP 支付 */
  async createAppOrder(params: {
    outTradeNo: string;
    description: string;
    amount: { total: number; currency?: string };
    attach?: string;
    notifyUrl?: string;
  }) {
    const body: Record<string, unknown> = {
      appid: this.appId,
      mchid: this.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl || process.env.WECHAT_PAY_NOTIFY_URL || "",
      amount: {
        total: params.amount.total,
        currency: params.amount.currency || "CNY",
      },
    };
    if (params.attach) body.attach = params.attach;

    const result = await this.callApi("POST", "/v3/pay/transactions/app", body) as Record<string, unknown>;
    return { prepayId: result.prepay_id as string, raw: result };
  }

  /** Native 支付（PC扫码支付） */
  async createNativeOrder(params: {
    outTradeNo: string;
    description: string;
    amount: { total: number; currency?: string };
    attach?: string;
    notifyUrl?: string;
  }) {
    const body: Record<string, unknown> = {
      appid: this.appId,
      mchid: this.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl || process.env.WECHAT_PAY_NOTIFY_URL || "",
      amount: {
        total: params.amount.total,
        currency: params.amount.currency || "CNY",
      },
    };
    if (params.attach) body.attach = params.attach;

    const result = await this.callApi("POST", "/v3/pay/transactions/native", body) as Record<string, unknown>;
    return { codeUrl: result.code_url as string, raw: result };
  }

  /** H5 支付（微信外浏览器） */
  async createH5Order(params: {
    outTradeNo: string;
    description: string;
    amount: { total: number; currency?: string };
    sceneInfo: { payerClientIp: string; h5Info?: { type: string; appName?: string; appUrl?: string } };
    attach?: string;
    notifyUrl?: string;
  }) {
    const body: Record<string, unknown> = {
      appid: this.appId,
      mchid: this.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl || process.env.WECHAT_PAY_NOTIFY_URL || "",
      amount: {
        total: params.amount.total,
        currency: params.amount.currency || "CNY",
      },
      scene_info: params.sceneInfo,
    };
    if (params.attach) body.attach = params.attach;

    const result = await this.callApi("POST", "/v3/pay/transactions/h5", body) as Record<string, unknown>;
    return { h5Url: result.h5_url as string, raw: result };
  }

  // ───────── 订单查询与退款 ─────────

  /** 按商户订单号查询 */
  async queryOrder(outTradeNo: string) {
    return this.callApi("GET", `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${this.mchId}`);
  }

  /** 申请退款 */
  async refund(params: {
    outTradeNo?: string;
    transactionId?: string;
    outRefundNo: string;
    amount: { refund: number; total: number; currency?: string };
    reason?: string;
    notifyUrl?: string;
  }) {
    const body: Record<string, unknown> = {
      ...(params.outTradeNo ? { out_trade_no: params.outTradeNo } : {}),
      ...(params.transactionId ? { transaction_id: params.transactionId } : {}),
      out_refund_no: params.outRefundNo,
      amount: {
        refund: params.amount.refund,
        total: params.amount.total,
        currency: params.amount.currency || "CNY",
      },
      notify_url: params.notifyUrl || process.env.WECHAT_PAY_REFUND_NOTIFY_URL || "",
    };
    if (params.reason) body.reason = params.reason;

    return this.callApi("POST", "/v3/refund/domestic/refunds", body);
  }

  // ───────── JSAPI 调起支付签名 ─────────

  /** 生成小程序调起支付的 paySign */
  signJsapiConfig(prepayId: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomUUID().replace(/-/g, "");
    const pkg = `prepay_id=${prepayId}`;
    const signMessage = `${this.appId}\n${timestamp}\n${nonce}\n${pkg}\n`;

    const signer = createSign("sha256WithRSAEncryption");
    signer.update(signMessage);
    const paySign = signer.sign(this.privateKey, "base64");

    return {
      appId: this.appId,
      timeStamp: String(timestamp),
      nonceStr: nonce,
      package: pkg,
      signType: "RSA",
      paySign,
    };
  }

  // ───────── 回调处理 ─────────

  /** 解析回调请求头中的签名信息 */
  parseNotifySign(header: string): { timestamp: string; nonce: string; signature: string; serialNo: string } | null {
    const params: Record<string, string> = {};
    // Wechatpay-Signature: timestamp="xxx",nonce_str="xxx",signature="xxx",serial_no="xxx"
    const regex = /(\w+)="([^"]*)"/g;
    let match;
    while ((match = regex.exec(header)) !== null) {
      params[match[1]] = match[2];
    }
    if (!params.timestamp || !params.nonce_str || !params.signature || !params.serial_no) {
      this.logger.error("回调签名头解析失败", params);
      return null;
    }
    return {
      timestamp: params.timestamp,
      nonce: params.nonce_str,
      signature: params.signature,
      serialNo: params.serial_no,
    };
  }

  /** 验证回调签名（使用平台证书 RSA公钥 验签） */
  async verifyNotifySign(signHeader: string, body: string): Promise<boolean> {
    const parsed = this.parseNotifySign(signHeader);
    if (!parsed) return false;

    const { timestamp, nonce, signature, serialNo } = parsed;

    try {
      const pem = await this.getPlatformCertBySerial(serialNo);
      const signMessage = `${timestamp}\n${nonce}\n${body}\n`;

      const verifier = createVerify("sha256WithRSAEncryption");
      verifier.update(signMessage);
      const valid = verifier.verify(pem, signature, "base64");

      if (!valid) {
        this.logger.error("回调签名验证失败", { serialNo, timestamp, nonce });
      }
      return valid;
    } catch (err: unknown) {
      this.logger.error("回调签名验证异常", (err as Error).message);
      return false;
    }
  }

  /** 解密支付回调数据 */
  async decryptNotify(ciphertext: string, associatedData: string, nonce: string): Promise<Record<string, unknown>> {
    const decrypted = this.aesGcmDecrypt(associatedData, nonce, ciphertext);
    return JSON.parse(decrypted);
  }

  /** 一站式验签+解密回调（推荐使用） */
  async verifyAndDecryptNotify(
    signHeader: string,
    body: string,
  ): Promise<{ valid: boolean; data?: unknown; error?: string }> {
    // 1. 验签
    const valid = await this.verifyNotifySign(signHeader, body);
    if (!valid) {
      this.metrics?.recordPaymentCallback("wechatpay", false, "verify_failed");
      return { valid: false, error: "签名验证失败" };
    }

    // 2. 解析body
    try {
      const notify = JSON.parse(body) as any;
      if (!notify.resource) {
        this.metrics?.recordPaymentCallback("wechatpay", true);
        return { valid: true, data: notify }; // 无加密资源的通知
      }

      const { ciphertext, associated_data, nonce } = notify.resource;
      const decrypted = this.aesGcmDecrypt(associated_data, nonce, ciphertext);
      this.metrics?.recordPaymentCallback("wechatpay", true);
      return { valid: true, data: JSON.parse(decrypted) };
    } catch (err: unknown) {
      this.metrics?.recordPaymentCallback("wechatpay", false, "decrypt_failed");
      return { valid: true, error: `解密失败: ${(err as Error).message}` };
    }
  }

  /** 防重放攻击：检查时间戳（±5分钟有效） */
  static isTimestampValid(timestamp: string): boolean {
    const ts = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    return Math.abs(now - ts) <= 300; // 5分钟
  }

  // ───────── 微信分账 ─────────

  /** 添加分账接收方 */
  async addProfitSharingReceiver(params: {
    type: "MERCHANT_ID" | "PERSONAL_OPENID" | "PERSONAL_SUB_OPENID";
    account: string;
    name?: string;
    relationType: "SERVICE_PROVIDER" | "STORE" | "STAFF" | "STORE_OWNER" | "PARTNER" | "HEADQUARTER" | "BRAND" | "DISTRIBUTOR" | "USER" | "SUPPLIER" | "CUSTOM";
  }) {
    const body: Record<string, unknown> = {
      appid: this.appId,
      type: params.type,
      account: params.account,
      relation_type: params.relationType,
    };
    if (params.name) body.name = params.name;
    return this.callApi("POST", "/v3/profitsharing/receivers/add", body);
  }

  /** 删除分账接收方 */
  async deleteProfitSharingReceiver(params: {
    type: "MERCHANT_ID" | "PERSONAL_OPENID" | "PERSONAL_SUB_OPENID";
    account: string;
  }) {
    const body = {
      appid: this.appId,
      type: params.type,
      account: params.account,
    };
    return this.callApi("POST", "/v3/profitsharing/receivers/delete", body);
  }

  /** 查询分账接收方列表 */
  async listProfitSharingReceivers(page: number = 1, pageSize: number = 20) {
    return this.callApi("GET", `/v3/profitsharing/receivers?appid=${this.appId}&page=${page}&page_size=${pageSize}`);
  }

  /** 请求分账 */
  async createProfitSharing(params: {
    outTradeNo: string;
    outOrderNo: string;
    receivers: Array<{
      type: "MERCHANT_ID" | "PERSONAL_OPENID";
      account: string;
      amount: number;
      description: string;
    }>;
    unfreezeUnsplit?: boolean;
  }) {
    const body: Record<string, unknown> = {
      appid: this.appId,
      transaction_id: "", // 二选一，优先用 out_trade_no
      out_order_no: params.outOrderNo,
      receivers: params.receivers.map((r) => ({
        type: r.type,
        account: r.account,
        amount: r.amount,
        description: r.description,
      })),
      unfreeze_unsplit: params.unfreezeUnsplit ?? true,
    };
    return this.callApi("POST", "/v3/profitsharing/orders", body);
  }

  /** 查询分账结果 */
  async queryProfitSharing(outOrderNo: string) {
    return this.callApi("GET", `/v3/profitsharing/orders/${outOrderNo}?mchid=${this.mchId}`);
  }

  /** 完结分账 */
  async finishProfitSharing(params: {
    outOrderNo: string;
    description: string;
  }) {
    const body = {
      appid: this.appId,
      sub_mchid: this.mchId,
      description: params.description,
    };
    return this.callApi("POST", `/v3/profitsharing/orders/${params.outOrderNo}/finish`, body);
  }

  /** 分账回退 */
  async createProfitSharingReturn(params: {
    outReturnNo: string;
    outOrderNo: string;
    returnMchid?: string;
    amount: number;
    description: string;
  }) {
    const body: Record<string, unknown> = {
      appid: this.appId,
      out_return_no: params.outReturnNo,
      out_order_no: params.outOrderNo,
      amount: params.amount,
      description: params.description,
    };
    if (params.returnMchid) body.return_mchid = params.returnMchid;
    return this.callApi("POST", "/v3/profitsharing/return-orders", body);
  }

  /** 查询分账回退结果 */
  async queryProfitSharingReturn(outReturnNo: string, outOrderNo: string) {
    return this.callApi("GET", `/v3/profitsharing/return-orders/${outReturnNo}?out_order_no=${outOrderNo}&mchid=${this.mchId}`);
  }

  /** 查询剩余待分金额 */
  async queryUnsplitAmount(transactionId: string) {
    return this.callApi("GET", `/v3/profitsharing/transactions/${transactionId}/amounts`);
  }

  // ───────── 账单下载 ─────────

  /** 申请交易账单 */
  async getTradeBill(params: {
    billDate: string; // YYYY-MM-DD
    billType?: "ALL" | "SUCCESS" | "REFUND";
    tarType?: "GZIP";
  }) {
    const query = new URLSearchParams({
      bill_date: params.billDate,
      bill_type: params.billType || "ALL",
    });
    if (params.tarType) query.set("tar_type", params.tarType);
    return this.callApi("GET", `/v3/bill/tradebill?${query}`);
  }

  /** 申请资金账单 */
  async getFundFlowBill(params: {
    billDate: string;
    accountType?: "BASIC" | "OPERATION" | "FEES";
    tarType?: "GZIP";
  }) {
    const query = new URLSearchParams({
      bill_date: params.billDate,
      account_type: params.accountType || "BASIC",
    });
    if (params.tarType) query.set("tar_type", params.tarType);
    return this.callApi("GET", `/v3/bill/fundflowbill?${query}`);
  }

  /** 下载账单文件（返回原始文本/CSV） */
  async downloadBillFile(url: string): Promise<string> {
    const { authorization } = this.sign("GET", url.replace(this.baseUrl, ""));
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": authorization,
        "Accept": "application/json",
      },
    });
    return resp.text();
  }

  /** 一站式下载交易账单（申请+下载，返回CSV） */
  async downloadTradeBill(params: {
    billDate: string;
    billType?: "ALL" | "SUCCESS" | "REFUND";
  }): Promise<string | null> {
    try {
      const result = await this.getTradeBill(params);
      if (result?.download_url) {
        return this.downloadBillFile(result.download_url as string);
      }
      return null;
    } catch (err: unknown) {
      this.logger.error(`下载交易账单失败 [${params.billDate}]`, (err as Error).message);
      return null;
    }
  }

  /** 一站式下载资金账单（申请+下载，返回CSV） */
  async downloadFundFlowBill(params: {
    billDate: string;
    accountType?: "BASIC" | "OPERATION" | "FEES";
  }): Promise<string | null> {
    try {
      const result = await this.getFundFlowBill(params);
      if (result?.download_url) {
        return this.downloadBillFile(result.download_url as string);
      }
      return null;
    } catch (err: unknown) {
      this.logger.error(`下载资金账单失败 [${params.billDate}]`, (err as Error).message);
      return null;
    }
  }
}
