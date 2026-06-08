import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import type { JinKouJueInput } from "@guoxue/shared";
import { WannianliService } from "../wannianli/wannianli.service";
import {
  calculateBaZi,
  calculateZiWei,
  calculateQimenYang,
  calculateDaLiuRen,
  calculateXiaoLiuRen,
  calculateJinKouJue,
  calculateXuanKong,
  calculateBaZhai,
  calculateLuoPan,
  calculateWuYunLiuQi,
  calculateLiuYao,
  calculateMeiHua,
  calculateJinQianKe,
  calculateXiaoChengTu,
  calculateZhuGe,
  calculateKongMing,
  calculateFeiGongQiMen,
  calculateTaiYi,
  calculateQiZheng,
  calculatePhoneAnalysis,
  calculateXingmingJiexi,
  calculateQimenMingli,
  calculateQimenYinMingli,
  calculateQimenChuanren,
  calculateShanXiangQiMen,
  calculateQiMenFuZhou,
  calculateQiMenAcupuncture,
  calculateCompanyNaming,
  calculateChengGu,
  calculateBaziHehun,
  calculateLingQian,
  calculateShengXiaoYunshi,
  calculateXingZuoYunshi,
  calculateHuangLi,
  calculateYiZhangJing,
  calculateJieMeng,
  calculateBaziLiuRi,
  calculateZiweiLiuRi,
  calculateZeRi,
  calculateHeLuo,
  calculateYangGong,
  calculateJinSuo,
  calculateZiweiHePan,
  calculateWanNianLiFromDb,
} from "./calculators";

/** 统一排盘/计算请求 */
export interface CalculateRequest {
  toolId: string;
  input: Record<string, unknown>;
  userId?: string;
  stationId?: string;
}

/** 统一排盘/计算响应 */
export interface CalculateResponse {
  toolId: string;
  result: Record<string, unknown>;
  durationMs: number;
}

/**
 * 统一工具计算引擎
 *
 * 接收任意工具的输入参数，通过 toolId 分发到对应的计算引擎。
 * 返回结构化的排盘/计算结果，可直接展示或再送入 AI 分析。
 */
@Injectable()
export class ToolCalculationService {
  private readonly logger = new Logger(ToolCalculationService.name);

  constructor(private readonly wannianli: WannianliService) {}

  /** 执行排盘/计算 */
  async calculate(req: CalculateRequest): Promise<CalculateResponse> {
    const start = Date.now();

    const result = await this.dispatch(req.toolId, req.input) as Record<string, unknown>;

    const durationMs = Date.now() - start;
    this.logger.log(`${req.toolId} 计算完成，耗时 ${durationMs}ms`);

    return { toolId: req.toolId, result, durationMs };
  }

  /** 异步队列计算（耗时工具） */
  async calculateAsync(req: CalculateRequest): Promise<CalculateResponse> {
    return this.calculate(req);
  }

  /** 按 toolId 分发 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async dispatch(toolId: string, input: Record<string, unknown>): Promise<any> {
    switch (toolId) {
      case "bazi":              return calculateBaZi(input);
      case "ziwei":             return calculateZiWei(input);
      case "qimen-yang":        return calculateQimenYang(input);
      case "qimen-yang-mingli": return calculateQimenMingli(input);
      case "qimen-yin":
      case "qimen-yin-mingli":  return calculateQimenYinMingli(input);
      case "daliuren":          return calculateDaLiuRen(input);
      case "xiaoliuren":        return calculateXiaoLiuRen(input);
      case "jinkoujue":         return calculateJinKouJue(input as unknown as JinKouJueInput);
      case "xuankong-feixing":  return calculateXuanKong(input);
      case "bazhai":            return calculateBaZhai(input);
      case "dianzi-luopan":     return calculateLuoPan(input);
      case "wuyun-liuqi":       return calculateWuYunLiuQi(input);
      case "qiming":
      case "xingming-jiexi":    return calculateXingmingJiexi(input);
      case "wannianli":         return calculateWanNianLiFromDb(input, this.wannianli);
      case "liuyao":            return calculateLiuYao(input);
      case "meihua":            return calculateMeiHua(input);
      case "jinqianke":         return calculateJinQianKe(input);
      case "xiaochengtu":       return calculateXiaoChengTu(input);
      case "zhugeshenshu":      return calculateZhuGe(input);
      case "kongmingshengua":   return calculateKongMing(input);
      case "feigong-xiaoqimen": return calculateFeiGongQiMen(input);
      case "taiyi":             return calculateTaiYi(input);
      case "qizheng-siyu":      return calculateQiZheng(input);
      case "shoujihao-fenxi":   return calculatePhoneAnalysis(input);
      case "qimen-chuanren":    return calculateQimenChuanren(input);
      case "shanxiang-qimen":   return calculateShanXiangQiMen(input);
      case "qimen-fuzhou":      return calculateQiMenFuZhou(input);
      case "qimen-acupuncture": return calculateQiMenAcupuncture(input);
      case "company-naming":    return calculateCompanyNaming(input);
      case "chenggu":           return calculateChengGu(input);
      case "bazi-hehun":        return calculateBaziHehun(input);
      case "lingqian":          return calculateLingQian(input);
      case "shengxiao-yunshi":  return calculateShengXiaoYunshi(input);
      case "xingzuo-yunshi":   return calculateXingZuoYunshi(input);
      case "huangli":          return calculateHuangLi(input);
      case "yizhangjing":      return calculateYiZhangJing(input);
      case "jiemeng":         return calculateJieMeng(input);
      case "bazi-liuri":       return calculateBaziLiuRi(input);
      case "ziwei-liuri":      return calculateZiweiLiuRi(input);
      case "zeri":             return calculateZeRi(input);
      case "heluo":            return calculateHeLuo(input);
      case "yanggong":          return calculateYangGong(input);
      case "jinsuo":            return calculateJinSuo(input);
      case "ziwei-hepan":       return calculateZiweiHePan(input);
      default:
        throw new BusinessException(
          ErrorCode.NOT_FOUND,
          `工具 ${toolId} 的计算引擎暂未实现，请使用 AI 分析模式`,
        );
    }
  }
}
