import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import type { JinKouJueInput, YongShenFenXiInput, GeJuXiangJieInput, NayinXiangJieInput, SanheShuifaInput, FuxingShuifaInput } from "@guoxue/shared";
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
  calculatePhoneAnalysis,
  calculateXingmingJiexi,
  calculateQimenMingli,
  calculateQimenYin,
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
  calculateShouXiang,
  calculateMianXiang,
  calculateShuZiNengLiang,
  calculateDaYan,
  calculateZhongLiuRen,
  calculateQiMenZeJi,
  calculateTieBan,
  calculateDongGong,
  calculateWuTuTaiYang,
  calculateWanNianLiFromDb,
  calculateShenSha,
  calculateJiaoshiYilin,
  calculateYongShenFenXi,
  calculateGeJuXiangJie,
  calculateLiuNianYunShi,
  calculateCeZi,
  calculateZiweiGeJu,
  calculateLiuShiJiaZi,
  calculateWuXingChuanYi,
  calculateLiuShiSiGua,
  calculateShiShenXiangJie,
  calculateTaiMingShen,
  calculateBaziLiuYue,
  calculateLiuYaoNaJia,
  calculateShiErChangSheng,
  calculateWuXingLiLiang,
  calculateLingQiJing,
  calculateXuanKongDaGua,
  calculateYangZhaiSanYao,
  calculateJiaQuZeRi,
  calculateCongGeZhuanLun,
  calculateLiuQinXiangJie,
  calculateXuanKongShuiFa,
  calculateErShiBaXiu,
  calculateLiJiChi,
  calculateHanZiFilter,
  calculateSanSeShu,
  calculateRiZhuLunMing,
  calculateGuanYinLingQian,
  calculateZiWeiXingYao,
  calculateErShiSiShan,
  calculateLiuYaoGuaCi,
  calculateQiMenYingXun,
  calculateMeiHuaWaiXiang,
  calculateNayinXiangJie,
  calculateSanheShuifa,
  calculateFuxingShuifa,
  calculateLiuYaoDuanGua,
  calculateXuanKongJiuGong,
  calculateBaziJianKang,
  calculateZiWeiDaXian,
  calculateSanCaiWuGe,
  calculateZeJiDaQuan,
  calculateZiWeiLiuNian,
  calculateMianXiangShiErGong,
  calculateZiWuLiuZhu,
  calculateBaziCareer,
  calculateBaziFanPai,
  calculateBaZhaiMingJing,
  calculateMeiHuaDuanGua,
  calculateZhouYi64Gua,
  calculateBaziDaYun,
  calculateLiuNianFengShui,
  calculateZiWeiLiuYue,
  calculateQiMenZhongShen,
  calculateQiMenShiKe,
  calculateMianXiangLiuNian,
  calculateQiMenChuXing,
  calculateBaZhaiGongWei,
  calculateLongMenBaju,
  calculateQianKunGuoBao,
  calculateShiShenTuPu,
  calculateYaPaiShenShu,
  calculateLingGuiBaFa,
  calculateChunZiShu,
  calculateLiuShiSiTuPu,
  calculateZeRiZaJi,
  calculateLiuNianShenSha,
  calculateShiChenYunShi,
  calculateFangWeiJiXiong,
  calculateClassicalQuoteSearch,
  calculateSurnameOrigin,
  calculateAncientPlaceNames,
  calculateCalligraphyStyles,
  calculateShiJingQiMing,
  calculateGuoLaoXingZong,
  calculateGuoXueClassics,
  calculateQiZhengSiYu,
  calculateLiuRenShenSha,
  calculateBrandNaming,
  calculateZhaixiangFengshui,
  calculateZiweiSihuaFei,
  calculateDaLiuRenKeJing,
  calculateQiMenShanGong,
  calculateQiMenChuanYin,
  calculateLiuYaoShenDong,
  calculateDiZhiHeHua,
  calculateXingXiuMingLi,
  calculateBaGuaXiangShu,
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
      // "qimen" 是 admin 奇门页（QimenPan.vue）历史上使用的 toolId，实现登记在 qimen-yang，
      // 此前 dispatch 无此 case，该页必然报「计算引擎暂未实现」——补别名修复。
      case "qimen":
      case "qimen-yang":        return calculateQimenYang(input);
      case "qimen-yang-mingli": return calculateQimenMingli(input);
      // 2026-07-14 修：qimen-yin（阴盘奇门）此前被并入命理盘分支，直接返回阴盘命理盘。
      // 两者起局法不同（阴盘=王凤麟以月柱推局；阴盘命理=以生辰数理起局），不可混用。
      case "qimen-yin":         return calculateQimenYin(input);
      case "qimen-yin-mingli":  return calculateQimenYinMingli(input);
      case "daliuren":          return calculateDaLiuRen(input);
      case "xiaoliuren":        return calculateXiaoLiuRen(input);
      case "jinkoujue":         return calculateJinKouJue(input as unknown as JinKouJueInput);
      case "xuankong-feixing":  return calculateXuanKong(input);
      case "bazhai":            return calculateBaZhai(input);
      case "dianzi-luopan":     return calculateLuoPan(input);
      case "wuyun-liuqi":       return calculateWuYunLiuQi(input);
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
      case "qizheng-siyu":      return calculateQiZhengSiYu(input);
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
      case "shouxiang":        return calculateShouXiang(input);
      case "mianxiang":        return calculateMianXiang(input);
      case "shuzi-nengliang": return calculateShuZiNengLiang(input);
      case "bagua-xiangshu":  return calculateBaGuaXiangShu(input);
      case "dayan-shifa":     return calculateDaYan(input);
      case "zhongliuren":     return calculateZhongLiuRen(input);
      case "qimen-zeji":      return calculateQiMenZeJi(input);
      case "tieban-shenshu":  return calculateTieBan(input);
      case "donggong-zeri": return calculateDongGong(input);
      case "wutu-taiyang":  return calculateWuTuTaiYang(input);
      case "shensha-daQuan":  return calculateShenSha(input);
      case "jiaoshi-yilin":   return calculateJiaoshiYilin(input);
      case "yongshen-fenxi":  return calculateYongShenFenXi(input as unknown as YongShenFenXiInput);
      case "geju-xiangjie":   return calculateGeJuXiangJie(input as unknown as GeJuXiangJieInput);
      case "liunian-yunshi":  return calculateLiuNianYunShi(input);
      case "cezi":            return calculateCeZi(input);
      case "ziwei-geju":      return calculateZiweiGeJu(input);
      case "liushi-jiazi":    return calculateLiuShiJiaZi(input);
      case "wuxing-chuanyi":  return calculateWuXingChuanYi(input);
      case "liushisi-gua":    return calculateLiuShiSiGua(input);
      case "shishen-xiangjie": return calculateShiShenXiangJie(input);
      case "tai-ming-shen":   return calculateTaiMingShen(input);
      case "liuyao-najia":    return calculateLiuYaoNaJia(input);
      case "shier-changsheng":  return calculateShiErChangSheng(input);
      case "wuxing-liliang":    return calculateWuXingLiLiang(input);
      case "lingqi-jing":      return calculateLingQiJing(input);
      case "xuankong-dagua":   return calculateXuanKongDaGua(input);
      case "yangzhai-sanyao":  return calculateYangZhaiSanYao(input);
      case "jiaqu-zeri":       return calculateJiaQuZeRi(input);
      case "congge-zhuanlun":   return calculateCongGeZhuanLun(input);
      case "liuqin-xiangjie":   return calculateLiuQinXiangJie(input);
      case "xuankong-shuifa":   return calculateXuanKongShuiFa(input);
      case "ershibaxiu":        return calculateErShiBaXiu(input);
      case "lijichi":          return calculateLiJiChi(input);
      case "hanzi-filter":     return calculateHanZiFilter(input);
      case "sanseshu":         return calculateSanSeShu(input);
      case "rizhu-lunming":       return calculateRiZhuLunMing(input);
      case "guanyin-lingqian":   return calculateGuanYinLingQian(input);
      case "ziwei-xingyao":     return calculateZiWeiXingYao(input);
      case "ershisi-shan":     return calculateErShiSiShan(input);
      case "liuyao-guaci":     return calculateLiuYaoGuaCi(input);
      case "qimen-yingxun":   return calculateQiMenYingXun(input);
      case "meihua-waixiang":    return calculateMeiHuaWaiXiang(input);
      case "nayin-xiangjie":    return calculateNayinXiangJie(input as unknown as NayinXiangJieInput);
      case "sanhe-shuifa":     return calculateSanheShuifa(input as unknown as SanheShuifaInput);
      case "fuxing-shuifa":    return calculateFuxingShuifa(input as unknown as FuxingShuifaInput);
      case "liuyao-duangua":    return calculateLiuYaoDuanGua(input);
      case "xuankong-jiugong":   return calculateXuanKongJiuGong(input);
      case "bazi-jiankang":     return calculateBaziJianKang(input);
      case "ziwei-daxian":      return calculateZiWeiDaXian(input);
      case "sancai-wuge":       return calculateSanCaiWuGe(input);
      case "zeji-daQuan":       return calculateZeJiDaQuan(input);
      case "ziwei-liunian":     return calculateZiWeiLiuNian(input);
      case "mianxiang-shiere-gong": return calculateMianXiangShiErGong(input);
      case "ziwu-liuzhu":       return calculateZiWuLiuZhu(input);
      case "bazi-career":       return calculateBaziCareer(input);
      case "bazhai-mingjing":   return calculateBaZhaiMingJing(input);
      case "meihua-duangua":    return calculateMeiHuaDuanGua(input);
      case "zhouyi-64gua":       return calculateZhouYi64Gua(input);
      case "bazi-dayun":         return calculateBaziDaYun(input);
      case "liunian-fengshui":   return calculateLiuNianFengShui(input);
      case "ziwei-liuyue":       return calculateZiWeiLiuYue(input);
      case "qimen-zhongshen":    return calculateQiMenZhongShen(input);
      case "qimen-shike":        return calculateQiMenShiKe(input);
      case "mianxiang-liunian":  return calculateMianXiangLiuNian(input);
      case "qimen-chuxing":     return calculateQiMenChuXing(input);
      case "bazhai-gongwei":    return calculateBaZhaiGongWei(input);
      case "longmen-baju":      return calculateLongMenBaju(input);
      case "qiankun-guobao":    return calculateQianKunGuoBao(input);
      case "shishen-tupu":     return calculateShiShenTuPu(input);
      case "linggui-bafa":     return calculateLingGuiBaFa(input);
      case "chunzi-shu":       return calculateChunZiShu(input);
      case "zeri-zaji":        return calculateZeRiZaJi(input);
      case "liunian-shensha":  return calculateLiuNianShenSha(input);
      case "surname-origin":         return calculateSurnameOrigin(input);
      case "ancient-place-names":    return calculateAncientPlaceNames(input);
      case "calligraphy-styles":     return calculateCalligraphyStyles(input);
      case "shijing-qiming":         return calculateShiJingQiMing(input);
      case "guolao-xingzong":        return calculateGuoLaoXingZong(input);
      case "daliuren-kejing":       return calculateDaLiuRenKeJing(input);
      case "qimen-shangong":        return calculateQiMenShanGong(input);
      case "qimen-chuanyin":       return calculateQiMenChuanYin(input);
      case "liuyao-shendong":      return calculateLiuYaoShenDong(input);
      case "dizhi-hehua":          return calculateDiZhiHeHua(input);
      case "xingxiu-mingli":       return calculateXingXiuMingLi(input);
      case "bazi-fanpai":             return calculateBaziFanPai(input);
      case "bazi-liuyue":             return calculateBaziLiuYue(input);
      case "brand-naming":            return calculateBrandNaming(input);
      case "classical-quote-search":  return calculateClassicalQuoteSearch(input);
      case "fangwei-jixiong":         return calculateFangWeiJiXiong(input);
      case "guoxue-classics":         return calculateGuoXueClassics(input);
      case "hanzi-shaixuan":          return calculateHanZiFilter(input);
      case "liji-chi":                return calculateLiJiChi(input);
      case "liuren-shensha":          return calculateLiuRenShenSha(input);
      case "liushisi-tupu":           return calculateLiuShiSiTuPu(input);
      case "shichen-yunshi":          return calculateShiChenYunShi(input);
      case "yapai-shenshu":           return calculateYaPaiShenShu(input);
      case "zhaixiang-fengshui":       return calculateZhaixiangFengshui(input);
      case "ziwei-sihua-fei":         return calculateZiweiSihuaFei(input);
      default:
        throw new BusinessException(
          ErrorCode.NOT_FOUND,
          `工具 ${toolId} 的计算引擎暂未实现，请使用 AI 分析模式`,
        );
    }
  }
}
