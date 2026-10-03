import { Injectable, Logger, Optional } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash, timingSafeEqual } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";

interface KuaidiTrackItem {
  time?: string;
  ftime?: string;
  status?: string;
  context?: string;
  location?: string;
}

interface KuaidiResponse {
  returnCode?: string;
  status?: string;
  state?: string;
  ischeck?: string;
  com?: string;
  nu?: string;
  data?: KuaidiTrackItem[];
  message?: string;
}

interface KuaidiPushPayload {
  status?: string;
  message?: string;
  lastResult?: {
    state?: string;
    ischeck?: string;
    com?: string;
    nu?: string;
    data?: KuaidiTrackItem[];
  };
}

const TERMINAL_LOGISTICS_STATUSES = ["SIGNED", "RETURNED", "REJECTED"] as const;

/**
 * 快递物流查询服务（快递100 API）
 * 用于为 OrderLogistics 提供真实物流轨迹
 */
@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);
  private readonly apiKey: string;
  private readonly customer: string;

  constructor(@Optional() private readonly prisma?: PrismaService) {
    this.apiKey = process.env.KUAIDI100_API_KEY || "";
    this.customer = process.env.KUAIDI100_CUSTOMER || "";

    if (!this.apiKey || !this.customer) {
      this.logger.warn("快递100未配置，物流查询将不可用");
    }
  }

  /** 查询物流轨迹 */
  async queryTrack(logisticsNo: string, company?: string) {
    if (!this.apiKey || !this.customer) {
      return { track: [], state: "unknown", message: "物流服务未配置" };
    }

    const body: { num: string; com?: string } = {
      num: logisticsNo,
    };
    if (company) {
      const comCode = this.normalizeCompanyCode(company);
      body.com = comCode;
      const result = await this.queryWithCompany(comCode, logisticsNo);
      if (result) return result;
    }

    // 无公司时自动识别
    return this.autoDetect(logisticsNo);
  }

  /** 订阅运单状态推送；未配置订阅参数时不阻断发货。 */
  async subscribeTrack(logisticsNo: string, company: string) {
    const callbackUrl = process.env.KUAIDI100_CALLBACK_URL || "";
    const salt = process.env.KUAIDI100_SALT || "";
    if (!this.apiKey || !callbackUrl || !salt) {
      return { subscribed: false, configured: false, message: "快递100订阅参数未配置完整" };
    }

    const param = JSON.stringify({
      company: this.normalizeCompanyCode(company),
      number: logisticsNo,
      key: this.apiKey,
      parameters: { callbackurl: callbackUrl, salt, resultv2: "4" },
    });
    const response = await fetch("https://poll.kuaidi100.com/poll", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ schema: "json", param }).toString(),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json() as { result?: boolean; returnCode?: string; message?: string };
    const subscribed = result.result === true || result.returnCode === "200" || result.returnCode === "501";
    if (!subscribed) this.logger.warn(`快递100订阅失败: ${result.returnCode || "unknown"} ${result.message || ""}`);
    return { subscribed, configured: true, returnCode: result.returnCode, message: result.message };
  }

  /** 验证并处理快递100推送；签名原文必须保持未转义。 */
  async handlePush(param: string, sign: string) {
    const salt = process.env.KUAIDI100_SALT || "";
    if (!salt || !param || !sign) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "快递100回调参数不完整");
    }
    const expected = createHash("md5").update(param + salt).digest("hex").toUpperCase();
    const actual = sign.toUpperCase();
    const expectedBuffer = Buffer.from(expected, "utf8");
    const actualBuffer = Buffer.from(actual, "utf8");
    if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "快递100回调签名验证失败");
    }

    let payload: KuaidiPushPayload;
    try {
      payload = JSON.parse(param) as KuaidiPushPayload;
    } catch {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "快递100回调报文不是有效 JSON");
    }

    const result = payload.lastResult;
    if (!result?.nu) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "快递100回调缺少运单号");
    }
    const tracks = (result.data || []).map((item) => ({
      time: item.time || item.ftime || "",
      status: item.status || item.context || "",
      desc: item.context || item.status || "",
      location: item.location || "",
    }));
    const state = this.normalizePushState(result.state, result.ischeck);

    if (!this.prisma) {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "物流数据库服务不可用");
    }
    // 快递平台可能延迟或乱序重投历史节点。已签收/已退回等终态不能被较旧的
    // “运输中”回调倒退；终态回调仍可覆盖非终态，确保最终状态可以收敛。
    const where: Prisma.OrderLogisticsWhereInput = {
      logisticsNo: result.nu,
      ...(TERMINAL_LOGISTICS_STATUSES.includes(state as (typeof TERMINAL_LOGISTICS_STATUSES)[number])
        ? {}
        : { status: { notIn: [...TERMINAL_LOGISTICS_STATUSES] } }),
    };
    const updated = await this.prisma.orderLogistics.updateMany({
      where,
      data: { status: state, trackingData: tracks as Prisma.InputJsonValue },
    });
    if (updated.count === 0) this.logger.warn(`物流推送未更新记录（未知运单或终态防倒退）: ${result.nu}`);
    return { accepted: true, updated: updated.count };
  }

  /** 使用指定快递公司查询 */
  private async queryWithCompany(com: string, num: string) {
    const data = await this.requestKuaidi100({ com, num });
    if (data.returnCode === "200" || data.status === "200") {
      return this.formatResult(data);
    }
    return null;
  }

  /** 无公司时交由快递100自动识别 */
  private async autoDetect(num: string) {
    const data = await this.requestKuaidi100({ num });
    if (data.returnCode !== "200" && data.status !== "200") {
      return { state: "unknown", message: data.message || "查询失败" };
    }
    return this.formatResult(data);
  }

  /**
   * 官方实时查询契约：POST application/x-www-form-urlencoded，
   * sign = MD5(param JSON + key + customer).toUpperCase()。
   */
  private async requestKuaidi100(payload: { com?: string; num: string }): Promise<KuaidiResponse> {
    const param = JSON.stringify(payload);
    const body = new URLSearchParams({
      customer: this.customer,
      sign: this.sign(param),
      param,
    });
    const response = await fetch("https://poll.kuaidi100.com/poll/query.do", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return response.json() as Promise<KuaidiResponse>;
  }

  private formatResult(data: KuaidiResponse) {
    return {
      state: data.state,
      isCheck: data.ischeck === "1",
      company: data.com,
      logisticsNo: data.nu,
      tracks: (data.data || []).map((item) => ({
        time: item.time || item.ftime,
        status: item.status || item.context,
        location: item.location || "",
      })),
    };
  }

  /**
   * 快递100 state 归一为平台物流状态。
   * 保留异常、派送、退回等业务语义，不能把所有非签收状态都压成运输中。
   */
  private normalizePushState(state?: string, ischeck?: string): string {
    if (ischeck === "1" || state === "3") return "SIGNED";
    const map: Record<string, string> = {
      "0": "IN_TRANSIT",
      "1": "PICKED_UP",
      "2": "EXCEPTION",
      "4": "RETURNED",
      "5": "OUT_FOR_DELIVERY",
      "6": "RETURNING",
      "7": "TRANSFERRED",
      "10": "CUSTOMS_CLEARANCE",
      "11": "CUSTOMS_RELEASED",
      "14": "REJECTED",
    };
    return map[state || ""] || "IN_TRANSIT";
  }

  /** 快递100签名: MD5(param + key + customer) */
  private sign(param: string): string {
    return createHash("md5").update(param + this.apiKey + this.customer).digest("hex").toUpperCase();
  }

  /** 常用快递公司编码映射 */
  private normalizeCompanyCode(name: string): string {
    const map: Record<string, string> = {
      "顺丰": "shunfeng", "顺丰速运": "shunfeng", "SF": "shunfeng",
      "圆通": "yuantong", "圆通速递": "yuantong", "YTO": "yuantong",
      "中通": "zhongtong", "中通快递": "zhongtong", "ZTO": "zhongtong",
      "申通": "shentong", "申通快递": "shentong", "STO": "shentong",
      "韵达": "yunda", "韵达快递": "yunda", "YUNDA": "yunda",
      "百世": "baishiwuliu", "百世快递": "baishiwuliu",
      "京东": "jd", "京东物流": "jd",
      "德邦": "debangwuliu", "德邦物流": "debangwuliu",
      "邮政": "ems", "EMS": "ems", "中国邮政": "ems",
      "极兔": "jtexpress", "极兔速递": "jtexpress", "J&T": "jtexpress",
    };
    return map[name] || name;
  }
}
