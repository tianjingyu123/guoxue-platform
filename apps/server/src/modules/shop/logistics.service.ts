import { Injectable, Logger } from "@nestjs/common";

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

/**
 * 快递物流查询服务（快递100 API）
 * 用于为 OrderLogistics 提供真实物流轨迹
 */
@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);
  private readonly apiKey: string;
  private readonly customer: string;

  constructor() {
    this.apiKey = process.env.KUAIDI100_API_KEY || "";
    this.customer = process.env.KUAIDI100_CUSTOMER || "";

    if (!this.apiKey) {
      this.logger.warn("快递100未配置，物流查询将不可用");
    }
  }

  /** 查询物流轨迹 */
  async queryTrack(logisticsNo: string, company?: string) {
    if (!this.apiKey) {
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

  /** 使用指定快递公司查询 */
  private async queryWithCompany(com: string, num: string) {
    const resp = await fetch(
      `https://poll.kuaidi100.com/poll/query.do?customer=${this.customer}&sign=${this.sign(num)}&param=${JSON.stringify({ com, num })}`,
      { method: "GET" },
    );
    const data = await resp.json() as KuaidiResponse;
    if (data.returnCode === "200" || data.status === "200") {
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
    return null;
  }

  /** 自动识别快递公司 */
  private async autoDetect(num: string) {
    const resp = await fetch(
      `https://poll.kuaidi100.com/poll/query.do?customer=${this.customer}&sign=${this.sign(num)}&param=${JSON.stringify({ num })}`,
      { method: "GET" },
    );
    const data = await resp.json() as KuaidiResponse;
    if (data.returnCode !== "200" && data.status !== "200") {
      return { state: "unknown", message: data.message || "查询失败" };
    }
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

  /** 快递100签名: MD5(param + key + customer) */
  private sign(param: string): string {
    const { createHash } = require("crypto");
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
