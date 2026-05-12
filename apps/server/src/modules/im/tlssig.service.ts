import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

// tls-sig-api-v2 是 JS 模块，不支持 ESM import
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TLSSigAPIv2 = require("tls-sig-api-v2");

@Injectable()
export class TlsSigService {
  private readonly logger = new Logger(TlsSigService.name);
  private readonly sdkAppId: number;
  private readonly key: string;

  constructor() {
    this.sdkAppId = parseInt(process.env.IM_APP_ID || "0", 10);
    this.key = process.env.IM_ADMIN_KEY || "";

    if (!this.sdkAppId || !this.key) {
      this.logger.warn("IM AppId/Key 未配置，UserSig 生成将不可用。");
    }
  }

  /**
   * 为用户生成 UserSig
   * @param userId 用户ID（IM 中的 identifier）
   * @param expire 过期时间（秒），默认 7 天
   */
  genUserSig(userId: string, expire: number = 7 * 24 * 3600): string {
    if (!this.sdkAppId || !this.key) {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "IM 未配置，请联系管理员");
    }
    const api = new TLSSigAPIv2.Api(this.sdkAppId, this.key);
    return api.genSig(userId, expire);
  }

  /**
   * 为管理员生成 UserSig
   * @param expire 过期时间（秒）
   */
  genAdminSig(expire: number = 180 * 24 * 3600): string {
    return this.genUserSig(process.env.IM_ADMIN_ID || "administrator", expire);
  }

  getAppId(): number {
    return this.sdkAppId;
  }
}
