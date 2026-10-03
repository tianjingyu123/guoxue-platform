import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { ENGINES } from "./engine-registry";
import { withEngineTz } from "./engine-tz";

/** 排盘引擎服务：算法只在服务端运行，前端只拿结果（防止引擎源码随前端包外泄） */
@Injectable()
export class PaipanEngineService {
  run(tool: string, body: unknown): unknown {
    const def = Object.prototype.hasOwnProperty.call(ENGINES, tool) ? ENGINES[tool] : undefined;
    if (!def) throw new BusinessException(ErrorCode.NOT_FOUND, "不支持的排盘工具");
    const args = def.parse((body && typeof body === "object" ? body : {}) as Record<string, unknown>);
    try {
      return withEngineTz(() => def.run(args));
    } catch (e) {
      // 引擎用普通 Error 做输入校验（如「某字不在康熙字典库中，请换字再测」）→ 400 并带原文给用户；
      // TypeError / RangeError 等是真缺陷，原样抛出按 500 处理，不把内部信息漏给前端
      if (e instanceof Error && e.constructor === Error) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, e.message);
      }
      throw e;
    }
  }
}
