import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import {
  createSign,
  createVerify,
  randomUUID,
  createDecipheriv,
  publicEncrypt,
  constants,
} from "crypto";
import { readFileSync, existsSync } from "fs";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { MetricsService } from "../../common/metrics.service";

/**
 * 微信支付 API 返回的结构化异常。
 *
 * 对外响应仍沿用 BusinessException 的安全结构；wechatCode 仅供服务端判断
 * ORDER_NOT_EXIST 等可恢复状态，避免依赖上游中文文案。
 */
export class WechatPayApiError extends BusinessException {
  constructor(
    readonly wechatCode: string,
    readonly wechatMessage: string,
    readonly upstreamStatus: number,
  ) {
    super(ErrorCode.PAY_FAILED, `微信支付失败: ${wechatMessage || wechatCode || "未知错误"}`);
  }
}

/**
 * 微信支付 V3 API 服务（纯原生HTTP+加密，不依赖SDK）
 * 文档: https://pay.weixin.qq.com/doc/v3
 */
@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);
  private readonly baseUrl = "https://api.mch.weixin.qq.com";
  // 平台证书序列号 → { pem, expireAt }
  private platformCerts: Map<string, { pem: string; expireAt: number }> = new Map();

  constructor(@Optional() @Inject(MetricsService) private metrics?: MetricsService) {
    if (!this.mchId || !this.privateKey) {
      this.logger.warn("微信支付未配置，请在 .env 中设置 WECHAT_PAY_* 相关变量");
    }
  }

  // 后台第三方配置保存后会同步到当前实例的 process.env。这里不能在构造阶段缓存，
  // 否则连处理保存请求的实例也会继续使用旧商户号/密钥；其他实例仍需滚动重启同步。
  private get mchId(): string {
    return process.env.WECHAT_PAY_MCH_ID || "";
  }

  private get serialNo(): string {
    return process.env.WECHAT_PAY_SERIAL_NO || "";
  }

  private get apiV3Key(): string {
    return process.env.WECHAT_PAY_API_V3_KEY || "";
  }

  private get appId(): string {
    return (
      process.env.WECHAT_PAY_APP_ID ||
      process.env.WECHAT_MINI_APP_ID ||
      process.env.WECHAT_APP_ID ||
      ""
    );
  }

  private get privateKey(): string {
    const keyPath = process.env.WECHAT_PAY_PRIVATE_KEY_PATH || "";
    if (keyPath) return readFileSync(keyPath, "utf-8");
    return (process.env.WECHAT_PAY_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  }

  private assertRuntimeConfigSource(): void {
    if (process.env.NODE_ENV !== "production") return;

    if (process.env.WECHAT_PAY_RUNTIME_CONFIG_SOURCE !== "DB") {
      throw new BusinessException(
        ErrorCode.PAY_FAILED,
        "微信支付配置未从数据库安全加载，已拒绝资金操作",
      );
    }

    const allowedMchId = process.env.WECHAT_PAY_ALLOWED_MCH_ID?.trim();
    if (!allowedMchId || this.mchId !== allowedMchId) {
      throw new BusinessException(
        ErrorCode.PAY_FAILED,
        "微信支付商户号未通过生产白名单校验，已拒绝资金操作",
      );
    }
  }

  private callbackUrl(
    envKey:
      | "WECHAT_PAY_NOTIFY_URL"
      | "WECHAT_PAY_REFUND_NOTIFY_URL"
      | "WECHAT_PAY_TRANSFER_NOTIFY_URL",
    path: string,
  ): string {
    const configured = process.env[envKey]?.trim();
    if (configured) return configured;
    const publicApiUrl = (process.env.PUBLIC_API_URL || process.env.API_BASE_URL || "").replace(
      /\/+$/,
      "",
    );
    return publicApiUrl ? `${publicApiUrl}${path}` : "";
  }

  /** 支付渠道是否已配置（缺密钥则无法签名/退款，调用方据此降级为线下处理） */
  get isConfigured(): boolean {
    if (
      process.env.NODE_ENV === "production" &&
      (process.env.WECHAT_PAY_RUNTIME_CONFIG_SOURCE !== "DB" ||
        !process.env.WECHAT_PAY_ALLOWED_MCH_ID?.trim() ||
        this.mchId !== process.env.WECHAT_PAY_ALLOWED_MCH_ID.trim())
    ) {
      return false;
    }
    return !!(this.mchId && this.privateKey);
  }

  // ───────── V3 签名与请求 ─────────

  /** 生成 V3 Authorization 头 */
  private sign(
    method: string,
    path: string,
    body: string = "",
  ): { authorization: string; timestamp: number; nonce: string } {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomUUID().replace(/-/g, "");
    const signMessage = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;

    const signer = createSign("sha256WithRSAEncryption");
    signer.update(signMessage);
    const signature = signer.sign(this.privateKey, "base64");

    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${this.serialNo}",signature="${signature}"`;
    return { authorization, timestamp, nonce };
  }

  /**
   * 调用微信支付 V3 API。
   * extraHeaders 用于携带 Wechatpay-Serial —— 请求体里含敏感字段密文（如商家转账的收款人姓名）时，
   * 必须告诉微信用的是哪个平台证书公钥加的密，否则微信解不开、直接报错。
   */
  private async callApi(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, any>,
    extraHeaders?: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    this.assertRuntimeConfigSource();
    const bodyStr = body ? JSON.stringify(body) : "";
    const { authorization } = this.sign(method, path, bodyStr);
    const start = Date.now();

    try {
      const resp = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "guoxue-platform/1.0",
          ...(method === "POST"
            ? { "Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` }
            : {}),
          ...extraHeaders,
        },
        body: bodyStr || undefined,
        signal: AbortSignal.timeout(15000),
      });

      const duration = Date.now() - start;
      const respBody = (await resp.json()) as any;

      if (resp.status >= 400) {
        const reason = (respBody.code || respBody.message || "unknown") as string;
        this.metrics?.recordExternalApi("wechatpay", path, false, duration, reason);
        this.logger.error(`微信支付API错误 [${method} ${path}]`, respBody);
        throw new WechatPayApiError(
          String(respBody.code || "UNKNOWN"),
          String(respBody.message || respBody.code || "未知错误"),
          resp.status,
        );
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
    const resp = (await this.callApi("GET", "/v3/certificates")) as Record<string, unknown>;
    const certList = (resp.data || []) as Array<Record<string, unknown>>;
    if (certList.length === 0)
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, "获取平台证书失败");

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

  // ───────── 商家转账（提现代付）─────────
  //
  // 【为什么是这个接口】微信「企业付款到银行卡」已下线，「商家转账到零钱」是唯一出路 ——
  // 只能打零钱、必须要 openid。银行卡提现只能走汇付代付，支付宝账号走支付宝转账。
  //
  // 【一个会改变产品流程的硬约束】新版商家转账不是无感到账：
  // 发起后状态可能是 WAIT_USER_CONFIRM，用户要在微信里点「确认收款」，钱才真正到账
  // （超时未确认自动退回）。所以提现流程必须是：
  //   审核通过 → 发起转账（拿 packageInfo）→ 通知用户确认 → 用户点确认 → 回调 SUCCESS → 标记 PAID
  // 绝不能一发起就把提现标成已打款 —— 那是「钱没出去却记成出去了」。
  //
  // 【幂等】outBillNo 就是我们的 payoutRef（提现出款幂等键，DB 唯一约束）。
  // 同一个 outBillNo 重复发起，微信返回同一笔单，不会重复打款。

  /**
   * 发起商家转账到零钱。
   * @param outBillNo 商户单号 = payoutRef（幂等键）
   * @param openid    收款人 openid（必须是本商户号绑定 appid 下的 openid）
   * @param amountFen 金额（分）
   * @param userName  收款人真实姓名；转账金额 ≥ 2000 元时微信要求必填，会加密提交
   */
  async transferToBalance(params: {
    outBillNo: string;
    openid: string;
    amountFen: number;
    remark: string;
    userName?: string;
    /** 转账场景 ID，需先在商户平台申请开通。佣金报酬 = 1005 */
    sceneId?: string;
    /** 场景报备信息（微信要求随场景提交，字段随场景而异） */
    sceneReportInfos?: Array<{ info_type: string; info_content: string }>;
    notifyUrl?: string;
  }) {
    const body: Record<string, unknown> = {
      appid: this.appId,
      out_bill_no: params.outBillNo,
      transfer_scene_id: params.sceneId || process.env.WECHAT_TRANSFER_SCENE_ID || "1005",
      openid: params.openid,
      transfer_amount: params.amountFen,
      transfer_remark: params.remark.slice(0, 32),
      notify_url:
        params.notifyUrl ||
        process.env.WECHAT_PAY_TRANSFER_NOTIFY_URL ||
        process.env.WECHAT_TRANSFER_NOTIFY_URL ||
        this.callbackUrl("WECHAT_PAY_TRANSFER_NOTIFY_URL", "/api/v1/payout/wechat/transfer-notify"),
      transfer_scene_report_infos: params.sceneReportInfos || [
        { info_type: "岗位类型", info_content: "推广员" },
        { info_type: "报酬说明", info_content: "推广佣金" },
      ],
    };

    // 收款人姓名需用平台证书公钥加密，并在 Wechatpay-Serial 头声明证书序列号
    const headers: Record<string, string> = {};
    if (params.userName) {
      const { ciphertext, serialNo } = await this.encryptSensitive(params.userName);
      body.user_name = ciphertext;
      headers["Wechatpay-Serial"] = serialNo;
    }

    const result = (await this.callApi(
      "POST",
      "/v3/fund-app/mch-transfer/transfer-bills",
      body,
      headers,
    )) as Record<string, unknown>;

    return {
      /** 微信转账单号 */
      transferBillNo: result.transfer_bill_no as string,
      outBillNo: result.out_bill_no as string,
      /** ACCEPTED / PROCESSING / WAIT_USER_CONFIRM / TRANSFERING / SUCCESS / FAIL / CANCELLED */
      state: result.state as string,
      /**
       * 待用户确认收款时返回。前端需用它调起微信确认页（wx.requestMerchantTransfer）。
       * 拿不到它，用户就没法确认，钱永远到不了账。
       */
      packageInfo: (result.package_info as string) || null,
      createTime: result.create_time as string,
      raw: result,
    };
  }

  /** 按商户单号（payoutRef）查转账状态 —— 回调之外的兜底核实手段 */
  async queryTransferByOutBillNo(outBillNo: string) {
    const result = (await this.callApi(
      "GET",
      `/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/${outBillNo}`,
    )) as Record<string, unknown>;
    return {
      transferBillNo: result.transfer_bill_no as string,
      outBillNo: result.out_bill_no as string,
      state: result.state as string,
      failReason: (result.fail_reason as string) || null,
      raw: result,
    };
  }

  /** 撤销转账（仅 WAIT_USER_CONFIRM / ACCEPTED 可撤） */
  async cancelTransfer(outBillNo: string) {
    return this.callApi(
      "POST",
      `/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/${outBillNo}/cancel`,
    );
  }

  /** 根据序列号获取指定平台证书 */
  async getPlatformCertBySerial(serialNo: string): Promise<string> {
    const certs = await this.getPlatformCerts();
    const pem = certs.get(serialNo);
    if (!pem)
      throw new BusinessException(ErrorCode.THIRD_WECHAT_FAILED, `平台证书不存在: ${serialNo}`);
    return pem;
  }

  /**
   * 敏感字段加密（RSA-OAEP + 微信平台证书公钥）。
   * 商家转账的收款人姓名必须密文提交（≥2000元时必填），且要在 Wechatpay-Serial 头里
   * 声明用的是哪个平台证书 —— 否则微信解不开。
   */
  async encryptSensitive(plaintext: string): Promise<{ ciphertext: string; serialNo: string }> {
    const publicKey = this.getWechatPayPublicKey();
    const publicKeyId = process.env.WECHAT_PAY_PUBLIC_KEY_ID || "";
    if (publicKey && publicKeyId) {
      const ciphertext = publicEncrypt(
        { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha1" },
        Buffer.from(plaintext, "utf-8"),
      ).toString("base64");
      return { ciphertext, serialNo: publicKeyId };
    }
    const certs = await this.getPlatformCerts();
    const [serialNo, entry] = [...certs.entries()][0] ?? [];
    if (!serialNo || !entry) {
      throw new BusinessException(
        ErrorCode.THIRD_WECHAT_FAILED,
        "无可用的微信平台证书，无法加密敏感字段",
      );
    }
    const ciphertext = publicEncrypt(
      { key: entry, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha1" },
      Buffer.from(plaintext, "utf-8"),
    ).toString("base64");
    return { ciphertext, serialNo };
  }

  /**
   * AES-256-GCM 解密（用于证书和回调数据解密）。
   * 微信 V3 的 ciphertext 是 Base64 编码、末尾 16 字节为 authTag——
   * 曾按 hex/末尾32字符解导致回调报文永远解不开（GCM 认证失败）、订单无法入账。
   */
  aesGcmDecrypt(associatedData: string, nonce: string, ciphertext: string): string {
    const key = Buffer.from(this.apiV3Key, "utf-8");
    const buf = Buffer.from(ciphertext, "base64");
    const authTag = buf.subarray(buf.length - 16);
    const data = buf.subarray(0, buf.length - 16);

    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(nonce, "utf-8"));
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(associatedData, "utf-8"));

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf-8");
  }

  // ───────── 支付下单 ─────────

  /**
   * JSAPI 支付（小程序/公众号内支付）。
   * appId 可覆盖：公众号内 H5 支付必须用公众号 appid + 该公众号下的 openid（微信要求 openid 与下单 appid 同应用），
   * 覆盖时调起签名(signJsapiConfig)同步使用同一 appid，否则前端 getBrandWCPayRequest 验签必失败。
   */
  async createJsapiOrder(params: {
    outTradeNo: string;
    description: string;
    amount: { total: number; currency?: string };
    payer: { openid: string };
    attach?: string;
    notifyUrl?: string;
    appId?: string;
  }) {
    const appId = params.appId || this.appId;
    const body: Record<string, unknown> = {
      appid: appId,
      mchid: this.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url:
        params.notifyUrl || this.callbackUrl("WECHAT_PAY_NOTIFY_URL", "/api/v1/shop/pay/notify"),
      amount: {
        total: params.amount.total, // 分
        currency: params.amount.currency || "CNY",
      },
      payer: { openid: params.payer.openid },
    };
    if (params.attach) body.attach = params.attach;

    const result = (await this.callApi("POST", "/v3/pay/transactions/jsapi", body)) as Record<
      string,
      unknown
    >;

    // 二次签名用于小程序/公众号H5调起支付
    const prepayId = result.prepay_id as string;
    const paySign = this.signJsapiConfig(prepayId, appId);

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
      notify_url:
        params.notifyUrl || this.callbackUrl("WECHAT_PAY_NOTIFY_URL", "/api/v1/shop/pay/notify"),
      amount: {
        total: params.amount.total,
        currency: params.amount.currency || "CNY",
      },
    };
    if (params.attach) body.attach = params.attach;

    const result = (await this.callApi("POST", "/v3/pay/transactions/app", body)) as Record<
      string,
      unknown
    >;
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
      notify_url:
        params.notifyUrl || this.callbackUrl("WECHAT_PAY_NOTIFY_URL", "/api/v1/shop/pay/notify"),
      amount: {
        total: params.amount.total,
        currency: params.amount.currency || "CNY",
      },
    };
    if (params.attach) body.attach = params.attach;

    const result = (await this.callApi("POST", "/v3/pay/transactions/native", body)) as Record<
      string,
      unknown
    >;
    return { codeUrl: result.code_url as string, raw: result };
  }

  /** H5 支付（微信外浏览器） */
  async createH5Order(params: {
    outTradeNo: string;
    description: string;
    amount: { total: number; currency?: string };
    sceneInfo: {
      payerClientIp: string;
      h5Info?: { type: string; appName?: string; appUrl?: string };
    };
    attach?: string;
    notifyUrl?: string;
  }) {
    const body: Record<string, unknown> = {
      appid: this.appId,
      mchid: this.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url:
        params.notifyUrl || this.callbackUrl("WECHAT_PAY_NOTIFY_URL", "/api/v1/shop/pay/notify"),
      amount: {
        total: params.amount.total,
        currency: params.amount.currency || "CNY",
      },
      // 微信 V3 API 要求 snake_case：payer_client_ip 必填、h5_info.type 固定 "Wap"
      // （原实现把 camelCase 的 sceneInfo 原样透传会被微信拒收 PARAM_ERROR）
      scene_info: {
        payer_client_ip: params.sceneInfo.payerClientIp,
        h5_info: {
          type: params.sceneInfo.h5Info?.type || "Wap",
          ...(params.sceneInfo.h5Info?.appName
            ? { app_name: params.sceneInfo.h5Info.appName }
            : {}),
          ...(params.sceneInfo.h5Info?.appUrl ? { app_url: params.sceneInfo.h5Info.appUrl } : {}),
        },
      },
    };
    if (params.attach) body.attach = params.attach;

    const result = (await this.callApi("POST", "/v3/pay/transactions/h5", body)) as Record<
      string,
      unknown
    >;
    return { h5Url: result.h5_url as string, raw: result };
  }

  // ───────── 订单查询与退款 ─────────

  /** 按商户订单号查询 */
  async queryOrder(outTradeNo: string) {
    return this.callApi(
      "GET",
      `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${this.mchId}`,
    );
  }

  /** 关闭尚未支付的商户订单；微信确认关单成功后才允许生成新的付款码。 */
  async closeOrder(outTradeNo: string) {
    return this.callApi("POST", "/v3/pay/transactions/out-trade-no/" + outTradeNo + "/close", {
      mchid: this.mchId,
    });
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
      notify_url:
        params.notifyUrl ||
        this.callbackUrl("WECHAT_PAY_REFUND_NOTIFY_URL", "/api/v1/shop/refund/notify"),
    };
    if (params.reason) body.reason = params.reason;

    return this.callApi("POST", "/v3/refund/domestic/refunds", body);
  }

  /** 按商户退款单号查询退款结果，供异步回调丢失时定时对账收敛。 */
  async queryRefund(outRefundNo: string) {
    return this.callApi("GET", "/v3/refund/domestic/refunds/" + encodeURIComponent(outRefundNo));
  }

  // ───────── JSAPI 调起支付签名 ─────────

  /** 生成小程序/公众号H5调起支付的 paySign（appId 必须与下单 appid 一致） */
  signJsapiConfig(prepayId: string, appId?: string) {
    const signAppId = appId || this.appId;
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomUUID().replace(/-/g, "");
    const pkg = `prepay_id=${prepayId}`;
    const signMessage = `${signAppId}\n${timestamp}\n${nonce}\n${pkg}\n`;

    const signer = createSign("sha256WithRSAEncryption");
    signer.update(signMessage);
    const paySign = signer.sign(this.privateKey, "base64");

    return {
      appId: signAppId,
      timeStamp: String(timestamp),
      nonceStr: nonce,
      package: pkg,
      signType: "RSA",
      paySign,
    };
  }

  // ───────── 回调处理 ─────────

  /** 解析回调请求头中的签名信息 */
  parseNotifySign(
    header: string,
  ): { timestamp: string; nonce: string; signature: string; serialNo: string } | null {
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

  /**
   * 微信支付公钥（2024-05 后新商户默认「公钥模式」：回调 serial 为 PUB_KEY_ID_xxx，
   * /v3/certificates 拉不到平台证书，须用商户平台下载的 pub_key.pem 验签）。
   * 现读 env（后台卡片保存热生效）；支持内容或服务器文件路径两种填法。
   */
  private getWechatPayPublicKey(): string {
    let v = process.env.WECHAT_PAY_PUBLIC_KEY || "";
    if (v && !v.includes("BEGIN")) {
      try {
        if (existsSync(v)) v = readFileSync(v, "utf-8");
      } catch {
        /* 按内容处理 */
      }
    }
    return v.replace(/\\n/g, "\n");
  }

  /** 验证回调签名（平台证书 或 微信支付公钥 RSA 验签，按回调 serial 自动分流） */
  async verifyNotifySign(signHeader: string, body: string): Promise<boolean> {
    const parsed = this.parseNotifySign(signHeader);
    if (!parsed) return false;

    const { timestamp, nonce, signature, serialNo } = parsed;

    try {
      let pem: string;
      if (serialNo.startsWith("PUB_KEY_ID_")) {
        pem = this.getWechatPayPublicKey();
        const configuredPublicKeyId = process.env.WECHAT_PAY_PUBLIC_KEY_ID || "";
        if (!pem) {
          this.logger.error(
            `回调为微信支付公钥模式但未配置公钥，请在后台「微信支付」卡片粘贴 pub_key.pem 内容: serial=${serialNo}`,
          );
          return false;
        }
        // 兼容迁移前已调通但尚未保存公钥ID的配置；一旦配置ID则严格匹配。
        if (configuredPublicKeyId && serialNo !== configuredPublicKeyId) {
          this.logger.error(
            `微信回调公钥ID不匹配: expected=${configuredPublicKeyId}, actual=${serialNo}`,
          );
          return false;
        }
      } else {
        pem = await this.getPlatformCertBySerial(serialNo);
      }
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
  async decryptNotify(
    ciphertext: string,
    associatedData: string,
    nonce: string,
  ): Promise<Record<string, unknown>> {
    const decrypted = this.aesGcmDecrypt(associatedData, nonce, ciphertext);
    try {
      return JSON.parse(decrypted);
    } catch {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "回调数据解析失败");
    }
  }

  /** 一站式验签+解密回调（推荐使用） */
  async verifyAndDecryptNotify(
    signHeader: string,
    body: string,
  ): Promise<{ valid: boolean; data?: unknown; error?: string }> {
    this.assertRuntimeConfigSource();
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
      const data = JSON.parse(decrypted) as Record<string, unknown>;
      if (!data.mchid || String(data.mchid) !== this.mchId) {
        this.metrics?.recordPaymentCallback("wechatpay", false, "mchid_mismatch");
        return { valid: false, error: "微信回调商户号不匹配" };
      }
      this.metrics?.recordPaymentCallback("wechatpay", true);
      return { valid: true, data };
    } catch (err: unknown) {
      this.metrics?.recordPaymentCallback("wechatpay", false, "decrypt_failed");
      return { valid: false, error: `解密失败: ${(err as Error).message}` };
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
    relationType:
      | "SERVICE_PROVIDER"
      | "STORE"
      | "STAFF"
      | "STORE_OWNER"
      | "PARTNER"
      | "HEADQUARTER"
      | "BRAND"
      | "DISTRIBUTOR"
      | "USER"
      | "SUPPLIER"
      | "CUSTOM";
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
    return this.callApi(
      "GET",
      `/v3/profitsharing/receivers?appid=${this.appId}&page=${page}&page_size=${pageSize}`,
    );
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
  async finishProfitSharing(params: { outOrderNo: string; description: string }) {
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
    return this.callApi(
      "GET",
      `/v3/profitsharing/return-orders/${outReturnNo}?out_order_no=${outOrderNo}&mchid=${this.mchId}`,
    );
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
        Authorization: authorization,
        Accept: "application/json",
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
      // 微信对无交易日期不生成文件并返回 NO_STATEMENT_EXIST；这代表有效的空账单，
      // 不能与鉴权、网络或文件下载失败一起折叠成不可用。
      if (err instanceof WechatPayApiError && err.wechatCode === "NO_STATEMENT_EXIST") {
        this.logger.log(`微信交易账单为空 [${params.billDate}]`);
        return "";
      }
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
