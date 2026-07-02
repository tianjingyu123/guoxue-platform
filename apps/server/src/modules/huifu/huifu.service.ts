import { Injectable, Logger, Optional } from "@nestjs/common";
import { createSign, createVerify, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { HuifuPayDto, HuifuSplitDto, HuifuRefundDto } from "./huifu.dto";
import { FundApprovalService } from "../fund-approval/fund-approval.service";

/**
 * 汇付天下支付分账服务
 * 使用 RSA-SHA256 签名，纯原生 HTTP 调用
 * 文档: https://paas.huifu.com
 */
@Injectable()
export class HuifuService {
  private readonly logger = new Logger(HuifuService.name);
  private readonly baseUrl: string;
  private configCache: Map<string, string> = new Map();
  private certCacheTime = 0;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Optional() private fundApproval?: FundApprovalService,
  ) {
    this.baseUrl = process.env.HUIFU_BASE_URL || "https://api.huifu.com";
  }

  /**
   * 发起「退款」审批（不立即退款）。
   * 审批通过后由 FundApprovalExecutor 调用 createRefund 真正发起汇付退款。
   */
  async requestRefund(dto: HuifuRefundDto, requestedBy: string) {
    const orderId = dto.orderId || dto.outTradeNo;
    if (!orderId) throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供订单ID或交易号");
    if (!dto.amount || dto.amount <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "退款金额必须大于0");
    if (!this.fundApproval) throw new BusinessException(ErrorCode.BAD_REQUEST, "审批服务不可用");
    return this.fundApproval.create({
      type: "REFUND",
      payload: { orderId: dto.orderId, outTradeNo: dto.outTradeNo, amount: dto.amount, reason: dto.reason },
      amount: dto.amount,
      summary: `汇付退款 ¥${dto.amount}（交易号 ${dto.outTradeNo || orderId}）`,
      requestedBy,
    });
  }

  // ───────── 配置管理 ─────────

  private async getConfig(key: string): Promise<string> {
    // 先从内存缓存读取
    if (this.configCache.has(key) && Date.now() - this.certCacheTime < 300_000) {
      return this.configCache.get(key)!;
    }
    // Redis 缓存
    const cached = await this.redis.get(`huifu:config:${key}`);
    if (cached) {
      this.configCache.set(key, cached);
      this.certCacheTime = Date.now();
      return cached;
    }
    // 数据库
    const record = await this.prisma.huifuConfig.findUnique({ where: { key } });
    if (record) {
      await this.redis.set(`huifu:config:${key}`, record.value, 600);
      this.configCache.set(key, record.value);
      this.certCacheTime = Date.now();
      return record.value;
    }
    // 回退到环境变量
    const envMap: Record<string, string | undefined> = {
      merchantId: process.env.HUIFU_MERCHANT_ID,
      appId: process.env.HUIFU_APP_ID,
      secretKey: process.env.HUIFU_SECRET_KEY,
      rsaPrivateKey: process.env.HUIFU_RSA_PRIVATE_KEY,
      rsaPublicKey: process.env.HUIFU_RSA_PUBLIC_KEY,
      notifyUrl: process.env.HUIFU_NOTIFY_URL,
    };
    return envMap[key] || "";
  }

  async setConfig(key: string, value: string, description?: string): Promise<void> {
    await this.prisma.huifuConfig.upsert({
      where: { key },
      create: { key, value, description, enabled: true },
      update: { value, description },
    });
    await this.redis.del(`huifu:config:${key}`);
    this.configCache.delete(key);
  }

  async getAllConfigs() {
    const configs = await this.prisma.huifuConfig.findMany();
    // 脱敏：密钥类只显示前4后4
    const sensitiveKeys = ["secretKey", "rsaPrivateKey", "rsaPublicKey"];
    return configs.map((c) => ({
      ...c,
      value: sensitiveKeys.includes(c.key) && c.value.length > 8
        ? `${c.value.slice(0, 4)}****${c.value.slice(-4)}`
        : c.value,
    }));
  }

  async isEnabled(): Promise<boolean> {
    const merchantId = await this.getConfig("merchantId");
    const rsaPrivateKey = await this.getConfig("rsaPrivateKey");
    return !!(merchantId && rsaPrivateKey);
  }

  // ───────── RSA 签名 ─────────

  private normalizePrivateKey(raw: string): string {
    let key = raw.replace(/\\n/g, "\n");
    if (!key.includes("-----BEGIN")) {
      key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
    }
    return key;
  }

  private normalizePublicKey(raw: string): string {
    let key = raw.replace(/\\n/g, "\n");
    if (!key.includes("-----BEGIN")) {
      key = `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
    }
    return key;
  }

  /** 生成 RSA-SHA256 签名 */
  private sign(signStr: string): string {
    const rawKey = this.configCache.get("rsaPrivateKey") || "";
    if (!rawKey) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "汇付天下RSA私钥未配置，请先在支付配置中设置rsaPrivateKey");
    }
    const privateKey = this.normalizePrivateKey(rawKey);
    try {
      const signer = createSign("sha256WithRSAEncryption");
      signer.update(signStr, "utf-8");
      return signer.sign(privateKey, "base64");
    } catch (err) {
      this.logger.error("RSA签名失败，请检查私钥格式是否正确", (err as Error).message);
      throw new BusinessException(ErrorCode.BAD_REQUEST, "RSA签名失败，请检查汇付天下私钥格式");
    }
  }

  /** 验签 */
  private verify(signStr: string, signature: string): boolean {
    const rawKey = this.configCache.get("rsaPublicKey") || "";
    const publicKey = this.normalizePublicKey(rawKey);
    const verifier = createVerify("sha256WithRSAEncryption");
    verifier.update(signStr, "utf-8");
    return verifier.verify(publicKey, signature, "base64");
  }

  // ───────── HTTP 调用 ─────────

  private async callApi(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const merchantId = await this.getConfig("merchantId");
    const bodyStr = body ? JSON.stringify(body) : "";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomUUID().replace(/-/g, "");
    const signStr = `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyStr}`;
    const signature = this.sign(signStr);

    const start = Date.now();

    try {
      const resp = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-HF-MerchantId": merchantId,
          "X-HF-Timestamp": timestamp,
          "X-HF-Nonce": nonce,
          "X-HF-Signature": signature,
        },
        body: bodyStr || undefined,
        signal: AbortSignal.timeout(15000),
      });

      const raw = await resp.text();
      let result: Record<string, unknown>;
      try {
        result = JSON.parse(raw);
      } catch (_err) {
        this.logger.error(`汇付API返回非JSON: ${path}`, raw.slice(0, 500));
        throw new BusinessException(ErrorCode.PAY_FAILED, "汇付API响应异常");
      }

      // 验签
      const respSign = (resp.headers.get("X-HF-Signature") || result?.sign || "") as string;
      if (respSign && result?.resp_code !== undefined) {
        const respData = JSON.stringify(result.resp_data || result.data || {});
        const verifyStr = `${timestamp}\n${nonce}\n${respData}`;
        if (!this.verify(verifyStr, respSign)) {
          this.logger.warn(`汇付API验签失败: ${path}`);
        }
      }

      if (result.resp_code && result.resp_code !== "10000" && result.resp_code !== "000000") {
        this.logger.error(`汇付API错误: ${path}`, result);
        return result;
      }

      return result;
    } catch (err: unknown) {
      const duration = Date.now() - start;
      this.logger.error(`汇付API调用异常: ${path} (${duration}ms)`, (err as Error).message);
      throw err;
    }
  }

  // ───────── 支付 ─────────

  /** 创建汇付支付（H5/JSAPI/Native） */
  async createPayment(userId: string, dto: HuifuPayDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: { id: true, userId: true, amount: true, status: true, type: true },
    });
    if (!order || order.userId !== userId) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    }
    if (order.status !== "PENDING") {
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态不可支付");
    }

    const merchantId = await this.getConfig("merchantId");
    const notifyUrl = await this.getConfig("notifyUrl");
    const outTradeNo = `HF${Date.now()}${dto.orderId.slice(0, 8)}`;
    const totalAmount = Math.round(Number(order.amount) * 100); // 转分

    const body: Record<string, unknown> = {
      merchant_id: merchantId,
      out_trade_no: outTradeNo,
      total_amount: totalAmount,
      subject: `国学平台-${order.type}`,
      body: `订单${dto.orderId.slice(0, 12)}`,
      notify_url: notifyUrl || `${process.env.API_BASE_URL || ""}/api/v1/huifu/notify`,
      pay_type: dto.payType || "WECHAT_H5",
      expire_time: "30m",
    };

    // 微信公众号内 JSAPI 支付：仅当走微信渠道且携带 openid 时才转 JSAPI，
    // 避免用户选支付宝/云闪付时被 openid 误覆盖成微信支付。
    if (dto.openid && String(body.pay_type).startsWith("WECHAT")) {
      body.openid = dto.openid;
      body.pay_type = "WECHAT_JSAPI";
    }

    const result = await this.callApi("POST", "/v1/trade/payment", body);

    // 保存分账记录
    await this.prisma.huifuSplitRecord.create({
      data: {
        orderId: dto.orderId,
        huifuOrderId: result.huifu_order_id as string,
        outTradeNo,
        totalAmount: Number(order.amount),
        rawRequest: body as any,
        rawResponse: result as any,
      },
    });

    // 更新订单支付单号
    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { payTransactionId: outTradeNo, payMethod: "HUIFU" },
    });

    return {
      outTradeNo,
      payUrl: result.pay_url,
      h5Url: result.h5_url,
      qrCode: result.qr_code,
      raw: result,
    };
  }

  /** 查询支付状态 */
  async queryPayment(outTradeNo: string, userId: string) {
    // 校验该支付单归属当前用户，防止越权查询/探测他人订单（userId 必传，fail-closed）
    const order = await this.prisma.order.findFirst({
      where: { payTransactionId: outTradeNo },
      select: { userId: true },
    });
    if (!order || order.userId !== userId) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    }
    const merchantId = await this.getConfig("merchantId");
    const body = { merchant_id: merchantId, out_trade_no: outTradeNo };
    return this.callApi("POST", "/v1/trade/query", body);
  }

  // ───────── 回调处理 ─────────

  /** 验证汇付回调签名 */
  async verifyNotify(body: Record<string, unknown>, signature: string): Promise<boolean> {
    const respData = JSON.stringify(body.resp_data || body.data || {});
    const timestamp = body.timestamp as string || "";
    const nonce = body.nonce as string || "";
    const verifyStr = `${timestamp}\n${nonce}\n${respData}`;
    return this.verify(verifyStr, signature);
  }

  /** 处理支付回调 */
  async handleNotify(body: Record<string, unknown>): Promise<void> {
    const outTradeNo = body.out_trade_no as string;
    if (!outTradeNo) {
      this.logger.warn("汇付回调缺少 out_trade_no");
      return;
    }

    // 分布式锁防重复
    const lockKey = `huifu:cb:${outTradeNo}`;
    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) {
      this.logger.warn(`汇付回调重复处理被拦截: ${outTradeNo}`);
      return;
    }

    try {
      const tradeStatus = body.trade_status || body.status;
      if (tradeStatus !== "SUCCESS" && tradeStatus !== "TRADE_SUCCESS") {
        this.logger.log(`汇付支付未成功: ${outTradeNo}, 状态: ${tradeStatus}`);
        return;
      }

      // 查找订单
      const order = await this.prisma.order.findFirst({
        where: { payTransactionId: outTradeNo },
      });
      if (!order || order.status !== "PENDING") {
        this.logger.warn(`汇付回调找不到对应订单或状态异常: ${outTradeNo}`);
        return;
      }

      const transactionId = (body.huifu_order_id || body.transaction_id) as string;

      // CAS 状态翻转：仅当仍为 PENDING 时置 PAID，防并发/回调重投重复处理(不依赖 redis 锁存活)
      const flipped = await this.prisma.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: {
          status: "PAID",
          paidAt: new Date(),
          payTransactionId: outTradeNo,
          payMethod: "HUIFU",
        },
      });
      if (flipped.count === 0) {
        this.logger.warn(`汇付回调订单状态已变更，跳过重复处理: ${outTradeNo}`);
        return;
      }

      // 更新分账记录
      await this.prisma.huifuSplitRecord.updateMany({
        where: { outTradeNo },
        data: {
          huifuOrderId: transactionId,
          rawResponse: body as any,
        },
      });

      this.logger.log(`汇付支付回调成功: 订单=${order.id}, 汇付单号=${transactionId}`);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  // ───────── 分账 ─────────

  /** 发起分账 */
  async createSplit(dto: HuifuSplitDto) {
    // 支持扁平字段简写：receiverId + receiverName → receivers 数组
    let receivers = dto.receivers || [];
    if (receivers.length === 0 && dto.receiverId) {
      receivers = [{ acctId: dto.receiverId, amount: dto.amount, name: dto.receiverName || dto.receiverId }];
    }
    if (receivers.length === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供分账接收方信息");
    }

    const splitRecord = await this.prisma.huifuSplitRecord.findUnique({
      where: { orderId: dto.orderId },
    });
    if (!splitRecord) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "找不到对应的支付记录");
    }
    if (["PROCESSING", "SUCCESS"].includes(splitRecord.splitStatus)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该订单已分账或分账处理中");
    }

    const merchantId = await this.getConfig("merchantId");
    const totalSplitAmount = receivers.reduce((sum, r) => sum + r.amount, 0);

    const body: Record<string, unknown> = {
      merchant_id: merchantId,
      out_trade_no: splitRecord.outTradeNo,
      out_order_no: `SPLIT${Date.now()}`,
      total_amount: Math.round(totalSplitAmount * 100),
      receivers: receivers.map((r) => ({
        acct_id: r.acctId,
        amount: Math.round(r.amount * 100),
        name: r.name,
        remark: r.remark || "国学平台分账",
      })),
      unfreeze_unsplit: dto.unfreezeUnsplit ?? true,
    };

    const result = await this.callApi("POST", "/v1/trade/split", body);

    // 更新分账记录
    await this.prisma.huifuSplitRecord.update({
      where: { orderId: dto.orderId },
      data: {
        splitStatus: (result.split_status as string) === "SUCCESS" ? "SUCCESS" : "PROCESSING",
        receivers: receivers.map((r) => ({
          acctId: r.acctId,
          amount: r.amount,
          name: r.name,
          status: "PROCESSING",
        })),
        rawRequest: body as any,
        rawResponse: result as any,
        splitAt: new Date(),
      },
    });

    return {
      orderId: dto.orderId,
      splitStatus: result.split_status || "PROCESSING",
      raw: result,
    };
  }

  /** 查询分账结果 */
  async querySplit(orderId: string) {
    const splitRecord = await this.prisma.huifuSplitRecord.findUnique({
      where: { orderId },
    });
    if (!splitRecord) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "找不到分账记录");
    }

    const merchantId = await this.getConfig("merchantId");
    const body = { merchant_id: merchantId, out_trade_no: splitRecord.outTradeNo };
    const result = await this.callApi("POST", "/v1/trade/split/query", body);

    // 更新状态
    if (result.split_status) {
      await this.prisma.huifuSplitRecord.update({
        where: { orderId },
        data: { splitStatus: result.split_status as string, rawResponse: result as any },
      });
    }

    return { orderId, splitStatus: result.split_status, raw: result };
  }

  // ───────── 退款 ─────────

  /** 申请退款 */
  async createRefund(dto: HuifuRefundDto) {
    const orderId = dto.orderId || dto.outTradeNo;
    if (!orderId) throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供订单ID或交易号");

    const splitRecord = await this.prisma.huifuSplitRecord.findUnique({
      where: { orderId },
    });
    if (!splitRecord) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "找不到支付记录");
    }

    const merchantId = await this.getConfig("merchantId");
    const outRefundNo = `RF${Date.now()}${orderId.slice(0, 8)}`;

    const body: Record<string, unknown> = {
      merchant_id: merchantId,
      out_trade_no: splitRecord.outTradeNo,
      out_refund_no: outRefundNo,
      refund_amount: Math.round(dto.amount * 100),
      refund_reason: dto.reason || "用户申请退款",
    };

    const result = await this.callApi("POST", "/v1/trade/refund", body);

    return {
      orderId: dto.orderId,
      outRefundNo,
      refundStatus: result.refund_status || "PROCESSING",
      raw: result,
    };
  }

  // ───────── 账单查询 ─────────

  /** 查询商户余额 */
  async queryBalance() {
    const merchantId = await this.getConfig("merchantId");
    const body = { merchant_id: merchantId };
    return this.callApi("POST", "/v1/account/balance", body);
  }

  /** 下载账单 */
  async downloadBill(billDate: string) {
    const merchantId = await this.getConfig("merchantId");
    const body = { merchant_id: merchantId, bill_date: billDate };
    return this.callApi("POST", "/v1/bill/download", body);
  }
}
