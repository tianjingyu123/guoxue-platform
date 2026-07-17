import { Injectable, Logger, Optional } from "@nestjs/common";
import { createSign, createVerify, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { HuifuPayDto, HuifuSplitDto, HuifuRefundDto } from "./huifu.dto";
import { FundApprovalService } from "../fund-approval/fund-approval.service";

/**
 * 汇付斗拱（BsPay）支付分账服务 — v2 真实协议
 *
 * 传输层规格（依官方 bspay-go-sdk 核实）：
 * - 网关 https://api.huifu.com，一律 POST JSON
 * - 请求体 { sys_id, product_id, sign, data }
 * - 签名：data 去空字段 → 按 key 字母序递归排序的紧凑 JSON → SHA256withRSA(PKCS1v15) → base64
 * - 响应 { data, sign }：用汇付公钥对响应体中 data 字段的「原始 JSON 子串」验签（验签失败仅告警不阻断）
 * - 业务码：data.resp_code === "00000000" 为成功
 * 文档: https://paas.huifu.com
 */
@Injectable()
export class HuifuService {
  private readonly logger = new Logger(HuifuService.name);
  private readonly baseUrl: string;
  private configCache: Map<string, string> = new Map();
  private certCacheTime = 0;

  /** 斗拱业务成功码 */
  private static readonly RESP_SUCCESS = "00000000";

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

  /**
   * 发起「分账」审批（不立即执行）——真金动作全部过审批中心（四眼）。
   * 此前 /huifu/split 单人直接触发渠道真实分账出款；现改为：发起人提交 → 财务审批
   * 通过后由 FundApprovalExecutor 调用 createSplit 真正向汇付发起分账。
   * 发起前先做与 createSplit 同款的存在性/状态/总额校验，把明显非法的请求挡在审批单之外。
   */
  async requestSplit(dto: HuifuSplitDto, requestedBy: string) {
    let receivers = dto.receivers || [];
    if (receivers.length === 0 && dto.receiverId) {
      receivers = [{ acctId: dto.receiverId, amount: dto.amount, name: dto.receiverName || dto.receiverId }];
    }
    if (receivers.length === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供分账接收方信息");
    }

    const splitRecord = await this.prisma.huifuSplitRecord.findUnique({ where: { orderId: dto.orderId } });
    if (!splitRecord) throw new BusinessException(ErrorCode.NOT_FOUND, "找不到对应的支付记录");
    if (["PROCESSING", "SUCCESS"].includes(splitRecord.splitStatus)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该订单已分账或分账处理中");
    }

    const splitTotal = receivers.reduce((sum, r) => sum + Number(r.amount), 0);
    if (splitTotal > Number(splitRecord.totalAmount) + 1e-6) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `分账总额 ¥${splitTotal.toFixed(2)} 超过订单已付 ¥${Number(splitRecord.totalAmount).toFixed(2)}`,
      );
    }

    if (!this.fundApproval) throw new BusinessException(ErrorCode.BAD_REQUEST, "审批服务不可用");
    return this.fundApproval.create({
      type: "HUIFU_SPLIT",
      payload: { ...dto, receivers } as unknown as Record<string, unknown>,
      amount: splitTotal,
      summary: `汇付分账 ¥${splitTotal.toFixed(2)}（订单 ${dto.orderId}·${receivers.length} 个接收方）`,
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
      productId: process.env.HUIFU_PRODUCT_ID,
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

  // ───────── 协议工具 ─────────

  /** 请求日期 yyyyMMdd */
  private reqDate(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }

  /** 唯一请求流水号（uuid 去横线） */
  private reqSeqId(): string {
    return randomUUID().replace(/-/g, "");
  }

  /** 删除 data 中值为空(空串/null/undefined)的字段（斗拱签名前置步骤①） */
  private removeEmpty(data: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === "" || v === null || v === undefined) continue;
      out[k] = v;
    }
    return out;
  }

  /** 按 key 字母序递归排序（数组保序）后的紧凑 JSON（斗拱签名前置步骤②） */
  private sortedCompactJson(value: unknown): string {
    return JSON.stringify(this.deepSortKeys(value));
  }

  private deepSortKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((v) => this.deepSortKeys(v));
    if (value !== null && typeof value === "object") {
      const src = value as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(src).sort()) sorted[k] = this.deepSortKeys(src[k]);
      return sorted;
    }
    return value;
  }

  /**
   * 从响应原文中截取某字段的「原始 JSON 对象子串」（花括号配平·跳过字符串内花括号）。
   * 斗拱响应验签必须用原文子串（非重排序后的 JSON）。
   */
  private extractRawJsonField(rawText: string, field: string): string | null {
    const keyToken = `"${field}"`;
    let idx = rawText.indexOf(keyToken);
    while (idx !== -1) {
      let i = idx + keyToken.length;
      while (i < rawText.length && /\s/.test(rawText[i])) i++;
      if (rawText[i] === ":") {
        i++;
        while (i < rawText.length && /\s/.test(rawText[i])) i++;
        if (rawText[i] === "{") {
          let depth = 0;
          let inStr = false;
          let esc = false;
          for (let j = i; j < rawText.length; j++) {
            const ch = rawText[j];
            if (inStr) {
              if (esc) esc = false;
              else if (ch === "\\") esc = true;
              else if (ch === '"') inStr = false;
            } else if (ch === '"') {
              inStr = true;
            } else if (ch === "{") {
              depth++;
            } else if (ch === "}") {
              depth--;
              if (depth === 0) return rawText.slice(i, j + 1);
            }
          }
          return null; // 花括号未配平
        }
      }
      idx = rawText.indexOf(keyToken, idx + 1);
    }
    return null;
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

  /** 商户私钥 SHA256withRSA(PKCS1v15) 签名，输出 base64 */
  private async signData(signStr: string): Promise<string> {
    const rawKey = await this.getConfig("rsaPrivateKey");
    if (!rawKey) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "汇付RSA私钥未配置，请先在后台第三方配置中设置rsaPrivateKey");
    }
    const privateKey = this.normalizePrivateKey(rawKey);
    try {
      const signer = createSign("RSA-SHA256");
      signer.update(signStr, "utf-8");
      return signer.sign(privateKey, "base64");
    } catch (err) {
      this.logger.error("RSA签名失败，请检查私钥格式是否正确", (err as Error).message);
      throw new BusinessException(ErrorCode.BAD_REQUEST, "RSA签名失败，请检查汇付私钥格式");
    }
  }

  /** 汇付公钥验签（响应/回调）——异常一律返回 false，不抛出 */
  private async verifyData(signStr: string, signature: string): Promise<boolean> {
    const rawKey = await this.getConfig("rsaPublicKey");
    if (!rawKey) return false;
    try {
      const verifier = createVerify("RSA-SHA256");
      verifier.update(signStr, "utf-8");
      return verifier.verify(this.normalizePublicKey(rawKey), signature, "base64");
    } catch (err) {
      this.logger.warn(`汇付验签异常: ${(err as Error).message}`);
      return false;
    }
  }

  // ───────── HTTP 调用（斗拱 v2 协议） ─────────

  /**
   * 调用斗拱 v2 接口。
   * 组包 { sys_id, product_id, sign, data } → POST JSON → 验签响应 → 返回响应 data 对象。
   * 业务码非 00000000 时记录错误但不抛出（调用方可读 resp_code/resp_desc）。
   */
  private async callApi(
    path: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const merchantId = await this.getConfig("merchantId");
    const sysId = (await this.getConfig("appId")) || merchantId;
    const productId = await this.getConfig("productId");
    if (!productId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "汇付产品号 product_id 未配置，请到后台「第三方配置→汇付天下」填写");
    }

    // ① 删除空字段 ② key 字母序紧凑 JSON ③ RSA-SHA256 签名
    const cleaned = this.removeEmpty(data);
    const signSrc = this.sortedCompactJson(cleaned);
    const sign = await this.signData(signSrc);

    const bodyStr = JSON.stringify({
      sys_id: sysId,
      product_id: productId,
      sign,
      data: cleaned,
    });

    const start = Date.now();

    try {
      const resp = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: bodyStr,
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

      const respData = (result?.data && typeof result.data === "object"
        ? result.data
        : {}) as Record<string, unknown>;

      // 验签：用汇付公钥对响应体中 data 字段的「原始 JSON 子串」验签；失败仅告警不阻断
      const respSign = typeof result?.sign === "string" ? result.sign : "";
      if (respSign) {
        const rawData = this.extractRawJsonField(raw, "data");
        if (!rawData || !(await this.verifyData(rawData, respSign))) {
          this.logger.warn(`汇付API响应验签失败: ${path}`);
        }
      }

      // 业务码判定：00000000 为成功
      const respCode = respData.resp_code as string | undefined;
      if (respCode && respCode !== HuifuService.RESP_SUCCESS) {
        this.logger.error(`汇付API业务失败: ${path} resp_code=${respCode} resp_desc=${respData.resp_desc}`);
      }

      return respData;
    } catch (err: unknown) {
      const duration = Date.now() - start;
      this.logger.error(`汇付API调用异常: ${path} (${duration}ms)`, (err as Error).message);
      throw err;
    }
  }

  /**
   * 取原交易请求日期 org_req_date：
   * 优先从 rawRequest 里取当初的 req_date（req_seq_id 匹配时才可信，分账确认会覆写 rawRequest），
   * 否则用记录 createdAt 格式化。
   */
  private orgReqDateOf(
    record: { createdAt: Date; rawRequest?: unknown },
    expectSeqId?: string,
  ): string {
    const raw = record.rawRequest as Record<string, unknown> | null | undefined;
    if (
      raw && typeof raw === "object" &&
      typeof raw.req_date === "string" &&
      (!expectSeqId || raw.req_seq_id === expectSeqId)
    ) {
      return raw.req_date;
    }
    return this.reqDate(new Date(record.createdAt));
  }

  /** 斗拱交易状态 → 平台分账/退款状态 */
  private mapTransStat(stat: unknown): string {
    if (stat === "S") return "SUCCESS";
    if (stat === "F") return "FAILED";
    return "PROCESSING";
  }

  // ───────── 连通性探针 ─────────

  /**
   * 连通性探针：调「商户基本信息查询 /v2/merchant/basicdata/query」。
   * 任何网络/签名/配置异常均捕获，返回 { ok:false, respDesc }，探针不抛异常。
   */
  async ping(): Promise<{ ok: boolean; respCode?: string; respDesc?: string; merchantName?: string }> {
    try {
      const merchantId = await this.getConfig("merchantId");
      if (!merchantId) return { ok: false, respDesc: "汇付商户号未配置，请到后台「第三方配置→汇付天下」填写" };

      const data = {
        huifu_id: merchantId,
        req_date: this.reqDate(),
        req_seq_id: this.reqSeqId(),
      };
      const result = await this.callApi("/v2/merchant/basicdata/query", data);
      const respCode = result.resp_code as string | undefined;
      return {
        ok: respCode === HuifuService.RESP_SUCCESS,
        respCode,
        respDesc: result.resp_desc as string | undefined,
        merchantName: (result.reg_name || result.short_name) as string | undefined,
      };
    } catch (err: unknown) {
      return { ok: false, respDesc: (err as Error).message || "汇付连通性探测失败" };
    }
  }

  // ───────── 支付 ─────────

  /** 创建汇付支付（JSAPI 聚合下单 /v2/trade/payment/jspay） */
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
    // 商户订单号即斗拱 req_seq_id（查询/退款用 org_req_seq_id 回溯，保持自洽）
    const outTradeNo = `HF${Date.now()}${dto.orderId.slice(0, 8)}`;

    // 渠道 → 斗拱 jspay trade_type（T_MINIAPP 微信小程序预留）
    const tradeTypeMap: Record<string, string> = {
      WECHAT_H5: "T_JSAPI",
      WECHAT_JSAPI: "T_JSAPI",
      WECHAT_MINIAPP: "T_MINIAPP", // 预留
      ALIPAY: "A_JSAPI",
      UNIONPAY: "U_JSAPI",
    };
    const tradeType = tradeTypeMap[dto.payType || "WECHAT_JSAPI"] || "T_JSAPI";

    const data: Record<string, unknown> = {
      huifu_id: merchantId,
      req_date: this.reqDate(),
      req_seq_id: outTradeNo,
      trade_type: tradeType,
      trans_amt: Number(order.amount).toFixed(2), // 元·两位小数字符串
      goods_desc: `国学平台-${order.type}`,
      notify_url: notifyUrl || `${process.env.API_BASE_URL || ""}/api/v1/huifu/notify`,
    };
    // 微信 JSAPI/小程序需要 openid
    if (dto.openid && tradeType.startsWith("T_")) {
      data.wx_data = { sub_openid: dto.openid };
    }

    const result = await this.callApi("/v2/trade/payment/jspay", data);

    // 保存分账记录（hf_seq_id 为汇付全局流水号）
    await this.prisma.huifuSplitRecord.create({
      data: {
        orderId: dto.orderId,
        huifuOrderId: (result.hf_seq_id as string) || null,
        outTradeNo,
        totalAmount: Number(order.amount),
        rawRequest: data as any,
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
      payInfo: (result.pay_info as string) || null, // JSAPI 调起参数（JSON 字符串）
      payUrl: (result.pay_url as string) || null, // 兼容保留
      h5Url: (result.h5_url as string) || null, // 兼容保留
      qrCode: (result.qr_code as string) || null, // 兼容保留
      raw: result,
    };
  }

  /** 查询支付状态（/v2/trade/payment/scanpay/query） */
  async queryPayment(outTradeNo: string, userId: string) {
    // 校验该支付单归属当前用户，防止越权查询/探测他人订单（userId 必传，fail-closed）
    const order = await this.prisma.order.findFirst({
      where: { payTransactionId: outTradeNo },
      select: { userId: true },
    });
    if (!order || order.userId !== userId) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    }
    const record = await this.prisma.huifuSplitRecord.findUnique({
      where: { outTradeNo },
    });
    if (!record) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "找不到支付记录");
    }
    const merchantId = await this.getConfig("merchantId");
    const data = {
      huifu_id: merchantId,
      org_req_date: this.orgReqDateOf(record, outTradeNo),
      org_req_seq_id: outTradeNo,
    };
    return this.callApi("/v2/trade/payment/scanpay/query", data);
  }

  // ───────── 回调处理 ─────────

  /**
   * 验证汇付异步通知签名。
   * 斗拱通知含 resp_data（JSON 字符串）与 sign：用汇付公钥对 resp_data 原串验签。
   */
  async verifyNotify(body: Record<string, unknown>, signature?: string): Promise<boolean> {
    const sign = signature || (typeof body.sign === "string" ? body.sign : "");
    if (!sign) return false;
    const respData = body.resp_data ?? body.data;
    const signStr = typeof respData === "string" ? respData : JSON.stringify(respData ?? {});
    return this.verifyData(signStr, sign);
  }

  /** 处理支付回调（resp_data 内 trans_stat==="S" 为成功） */
  async handleNotify(body: Record<string, unknown>): Promise<void> {
    // 解析 resp_data（JSON 字符串或对象），兼容平铺字段
    let payload: Record<string, unknown>;
    const respData = body.resp_data ?? body.data;
    if (typeof respData === "string") {
      try {
        payload = JSON.parse(respData);
      } catch (_err) {
        this.logger.warn("汇付回调 resp_data 非合法JSON");
        return;
      }
    } else if (respData && typeof respData === "object") {
      payload = respData as Record<string, unknown>;
    } else {
      payload = body;
    }

    const outTradeNo = (payload.req_seq_id || payload.out_trade_no) as string;
    if (!outTradeNo) {
      this.logger.warn("汇付回调缺少 req_seq_id");
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
      const transStat = payload.trans_stat;
      if (transStat !== "S") {
        this.logger.log(`汇付支付未成功: ${outTradeNo}, trans_stat: ${transStat}`);
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

      // M2 金额比对：斗拱回调 trans_amt 单位为元；不符拒绝入账，落错误台账人工对账
      const transAmt = parseFloat(String(payload.trans_amt ?? ""));
      if (Number.isFinite(transAmt) && Math.abs(transAmt - Number(order.amount)) >= 0.01) {
        this.logger.error(
          `【资金对账·金额不符】汇付回调金额与订单金额不一致，拒绝入账: order=${order.id}, outTradeNo=${outTradeNo}, 回调金额=${transAmt}, 订单金额=${Number(order.amount)}`,
        );
        return;
      }

      const transactionId = (payload.hf_seq_id || payload.huifu_order_id) as string;

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
          rawResponse: payload as any,
        },
      });

      this.logger.log(`汇付支付回调成功: 订单=${order.id}, 汇付单号=${transactionId}`);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  // ───────── 分账 ─────────

  /** 发起分账（延时分账确认 /v2/trade/payment/delaytrans/confirm） */
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

    // 加固(后端审计P2)：分账总额不得超过订单已付总额，防超额分账（资金守恒）。
    // 注：四眼审批流程(单 OPERATION_ADMIN 直发→纳入 fundApproval)属流程决策，未在此改动。
    const splitTotal = receivers.reduce((sum, r) => sum + Number(r.amount), 0);
    if (splitTotal > Number(splitRecord.totalAmount) + 1e-6) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `分账总额 ¥${splitTotal.toFixed(2)} 超过订单已付 ¥${Number(splitRecord.totalAmount).toFixed(2)}`,
      );
    }

    const merchantId = await this.getConfig("merchantId");

    const data: Record<string, unknown> = {
      huifu_id: merchantId,
      req_date: this.reqDate(),
      req_seq_id: this.reqSeqId(),
      org_req_date: this.orgReqDateOf(splitRecord, splitRecord.outTradeNo),
      org_req_seq_id: splitRecord.outTradeNo,
      acct_split_bunch: {
        acct_infos: receivers.map((r) => ({
          huifu_id: r.acctId,
          div_amt: r.amount.toFixed(2), // 元·两位小数字符串
        })),
      },
    };

    const result = await this.callApi("/v2/trade/payment/delaytrans/confirm", data);

    const splitStatus =
      result.resp_code === HuifuService.RESP_SUCCESS && result.trans_stat === "S"
        ? "SUCCESS"
        : "PROCESSING";

    // 更新分账记录
    await this.prisma.huifuSplitRecord.update({
      where: { orderId: dto.orderId },
      data: {
        splitStatus,
        receivers: receivers.map((r) => ({
          acctId: r.acctId,
          amount: r.amount,
          name: r.name,
          status: splitStatus === "SUCCESS" ? "SUCCESS" : "PROCESSING",
        })),
        rawRequest: data as any,
        rawResponse: result as any,
        splitAt: new Date(),
      },
    });

    return {
      orderId: dto.orderId,
      splitStatus,
      raw: result,
    };
  }

  /** 查询分账结果（/v2/trade/trans/split/query） */
  async querySplit(orderId: string) {
    const splitRecord = await this.prisma.huifuSplitRecord.findUnique({
      where: { orderId },
    });
    if (!splitRecord) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "找不到分账记录");
    }

    const merchantId = await this.getConfig("merchantId");
    const data = {
      huifu_id: merchantId,
      org_req_date: this.orgReqDateOf(splitRecord, splitRecord.outTradeNo),
      org_req_seq_id: splitRecord.outTradeNo,
    };
    const result = await this.callApi("/v2/trade/trans/split/query", data);

    // 更新状态
    let splitStatus = splitRecord.splitStatus;
    if (result.trans_stat !== undefined) {
      splitStatus = this.mapTransStat(result.trans_stat);
      await this.prisma.huifuSplitRecord.update({
        where: { orderId },
        data: { splitStatus, rawResponse: result as any },
      });
    }

    return { orderId, splitStatus, raw: result };
  }

  // ───────── 退款 ─────────

  /** 申请退款（/v2/trade/payment/scanpay/refund） */
  async createRefund(dto: HuifuRefundDto) {
    const orderId = dto.orderId || dto.outTradeNo;
    if (!orderId) throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供订单ID或交易号");

    const splitRecord = await this.prisma.huifuSplitRecord.findUnique({
      where: { orderId },
    });
    if (!splitRecord) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "找不到支付记录");
    }

    // 加固(后端审计P1-1)①退款额上限校验：退款金额不得超过订单已付总额，杜绝超额真金退款。
    const paid = Number(splitRecord.totalAmount);
    if (dto.amount > paid + 1e-6) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `退款金额 ¥${dto.amount} 超过订单已付 ¥${paid.toFixed(2)}`);
    }

    const merchantId = await this.getConfig("merchantId");
    // 加固(后端审计P1-1)②幂等：req_seq_id 由 orderId 确定性派生（非 Date.now），汇付按 req_seq_id 幂等去重。
    // 原每次新流水号 → 二次审批/重试会以全新 req_seq_id 再次发起真金退款、重复出款。改稳定键后重复请求
    // 命中汇付原结果不重复退。（汇付 req_seq_id ≤32 位·uuid 去横线为 32 位基准）
    const outRefundNo = `RF${orderId.replace(/-/g, "")}`.slice(0, 32);

    const data: Record<string, unknown> = {
      huifu_id: merchantId,
      req_date: this.reqDate(),
      req_seq_id: outRefundNo,
      org_req_date: this.orgReqDateOf(splitRecord, splitRecord.outTradeNo),
      org_req_seq_id: splitRecord.outTradeNo,
      ord_amt: dto.amount.toFixed(2), // 元·两位小数字符串
      remark: dto.reason || "用户申请退款",
    };

    const result = await this.callApi("/v2/trade/payment/scanpay/refund", data);
    const refundStatus = this.mapTransStat(result.trans_stat);

    // 加固(后端审计P1-1)③落库供对账：退款无专用记录表（完整台账需建 HuifuRefundRecord 迁移·待拍板），
    // 先写 AuditLog 留痕——谁在何时按什么流水号退了多少，供财务对账与排查。写审计失败不影响退款结果。
    await this.prisma.auditLog
      .create({
        data: {
          action: "HUIFU_REFUND",
          targetType: "HUIFU_SPLIT",
          targetId: orderId,
          detail: JSON.stringify({ orderId, outRefundNo, amount: dto.amount, refundStatus, transStat: result.trans_stat }),
        },
      })
      .catch((err) => this.logger.warn(`汇付退款审计写入失败 [${orderId}]`, err instanceof Error ? err.message : err));

    return {
      orderId: dto.orderId,
      outRefundNo,
      refundStatus,
      raw: result,
    };
  }

  // ───────── 账单查询 ─────────

  /** 查询商户余额（/v2/trade/acctpayment/balance/query） */
  async queryBalance() {
    const merchantId = await this.getConfig("merchantId");
    const data = {
      huifu_id: merchantId,
      req_date: this.reqDate(),
      req_seq_id: this.reqSeqId(),
    };
    return this.callApi("/v2/trade/acctpayment/balance/query", data);
  }

  /** 下载账单 — 斗拱对账单接口尚未接入，诚实降级（原 /v1/bill/download 为虚构路径） */
  async downloadBill(_billDate: string): Promise<never> {
    throw new BusinessException(ErrorCode.BAD_REQUEST, "汇付对账单下载暂未接入斗拱协议，请在斗拱控制台查看对账文件");
  }

  // ───────── 商户进件（服务商开户）─────────
  //
  // 我们在汇付是「服务商」身份，可以给下级客户开户 —— 这是整个分账架构的地基：
  // 分账的本质是「把钱分给某个持牌机构认识的账户」，进件就是让驿站/商家/圈主
  // 在汇付眼里「存在」（拿到 huifu_id）。没有它，任何分账都无从谈起。
  //
  // ⚠️ 字段结构按斗拱 V2 企业进件规范编写，但【未经沙箱实测】。
  //    上线前必须用汇付给的接口文档 + 沙箱环境校准字段名与必填项，
  //    尤其是：地区码(prov_id/area_id/district_id)、银行编码(bank_code)、
  //    影像资料(file_list)的上传方式、以及费率配置(fee_conf)的结构。
  //    校准点集中在本方法的 data 组包处，改动不外溢。

  /**
   * 企业商户进件（/v2/merchant/basicdata/ent）。
   * 适用：线下驿站、商家、有营业执照的圈主、研究院 —— 凡是要「自己收款」的主体。
   * 返回渠道申请单号与（若同步返回的）huifu_id；多数情况下审核异步，需轮询 queryMerchantApply。
   */
  async applyEntMerchant(payload: HuifuEntApplyPayload) {
    const upperHuifuId = await this.getConfig("merchantId"); // 服务商自身 huifu_id = 进件的上级
    if (!upperHuifuId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "汇付服务商商户号未配置，请到后台「第三方配置→汇付天下」填写");
    }

    const reqSeqId = this.reqSeqId();
    const data: Record<string, unknown> = {
      req_date: this.reqDate(),
      req_seq_id: reqSeqId,
      upper_huifu_id: upperHuifuId,

      // 主体信息
      reg_name: payload.subjectName,
      short_name: payload.shortName || payload.subjectName,
      ent_type: payload.entType || "1", // 1 企业 / 2 个体工商户
      license_code: payload.licenseNo,
      license_validity_type: payload.licenseLongTerm ? "1" : "0",
      license_begin_date: payload.licenseBeginDate,
      license_end_date: payload.licenseLongTerm ? undefined : payload.licenseEndDate,

      // 法人（身份证号为明文传渠道 —— 调用方负责解密后传入，本方法不落库）
      legal_name: payload.legalName,
      legal_cert_type: "00", // 00 = 身份证
      legal_cert_no: payload.legalIdCard,

      // 联系人
      contact_name: payload.contactName,
      contact_mobile_no: payload.contactPhone,
      contact_email: payload.contactEmail,

      // 结算卡（对公/对私）
      card_info: {
        card_type: payload.bankCardType || "0", // 0 对公 / 1 对私
        card_name: payload.bankHolder,
        card_no: payload.bankAccount,
        bank_code: payload.bankCode,
        prov_id: payload.bankProvId,
        area_id: payload.bankAreaId,
      },

      // 经营地址
      prov_id: payload.provId,
      area_id: payload.areaId,
      district_id: payload.districtId,
      detail_addr: payload.address,

      // 影像资料（营业执照/身份证正反面等）
      file_list: payload.files,
    };

    const result = await this.callApi("/v2/merchant/basicdata/ent", data);
    const ok = result.resp_code === HuifuService.RESP_SUCCESS;

    return {
      ok,
      reqSeqId,
      /** 渠道申请单号（查进度用）；部分场景汇付直接回 huifu_id */
      applyId: (result.apply_no as string) || (result.req_seq_id as string) || reqSeqId,
      /** 进件成功时的下级商户号 —— 分账接收方身份就是它 */
      huifuId: (result.huifu_id as string) || null,
      respCode: result.resp_code as string,
      respDesc: result.resp_desc as string,
      raw: result,
    };
  }

  /**
   * 查询进件进度（/v2/merchant/basicdata/query）。
   * 汇付审核异步，进件后需轮询直到拿到 huifu_id 或被拒。
   */
  async queryMerchantApply(applyId: string, originalReqDate: string) {
    const upperHuifuId = await this.getConfig("merchantId");
    const result = await this.callApi("/v2/merchant/basicdata/query", {
      req_date: this.reqDate(),
      req_seq_id: this.reqSeqId(),
      upper_huifu_id: upperHuifuId,
      org_req_seq_id: applyId,
      org_req_date: originalReqDate,
    });

    const huifuId = (result.huifu_id as string) || null;
    // 汇付审核态：多数返回 apply_stat / audit_stat，取值以文档为准（待沙箱校准）
    const stat = (result.apply_stat as string) || (result.audit_stat as string) || "";
    return {
      huifuId,
      /** 归一化后的状态：APPROVING 审核中 / ACTIVE 已通过 / REJECTED 被拒 */
      status: huifuId ? "ACTIVE" : stat === "R" || stat === "F" ? "REJECTED" : "APPROVING",
      rejectReason: (result.resp_desc as string) || null,
      raw: result,
    };
  }
}

/**
 * 企业进件入参。身份证号/银行账号是【明文】——
 * 调用方（PayeeAccountService）从库里读出加密值、解密后传入；本服务不接触密文、也不落库。
 */
export interface HuifuEntApplyPayload {
  subjectName: string;
  shortName?: string;
  entType?: string; // 1 企业 / 2 个体工商户
  licenseNo: string;
  licenseLongTerm?: boolean;
  licenseBeginDate?: string; // yyyyMMdd
  licenseEndDate?: string;
  legalName: string;
  legalIdCard: string; // 明文
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  bankHolder: string;
  bankAccount: string; // 明文
  bankCode?: string;
  bankCardType?: string; // 0 对公 / 1 对私
  bankProvId?: string;
  bankAreaId?: string;
  provId?: string;
  areaId?: string;
  districtId?: string;
  address?: string;
  files?: Array<{ file_type: string; file_id: string }>;
}
