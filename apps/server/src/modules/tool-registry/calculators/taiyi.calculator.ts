// ── 太乙神数计算引擎 ──
// 积年计算/五元六纪/十六神盘/三算
// 参考：《太乙金镜式经》《太乙神数》

import type { TaiYiResult, TaiYiShenName, TaiYiBaJiang, SuanType } from "@guoxue/shared";
import { calcRiZhu, calcAllJieQi } from "@guoxue/bazi-engine";

const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const SHI_LIU_SHEN: TaiYiShenName[] = [
  "太乙","文昌","始击","地主","吕申","四神","天目","太簇",
  "大炅","大威","天马","大武","大簇","阴主","阴德","大义",
];
const BA_JIANG: TaiYiBaJiang[] = [
  "天蓬","天芮","天冲","天辅","天禽","天心","天柱","天任",
];
const WU_XING_MAP: Record<number, string> = {
  1:"水",2:"火",3:"木",4:"金",5:"土",6:"水",7:"火",8:"木",9:"金",10:"土",
};

/** 太乙积年（上元甲子至当前年） */
function calcJiNian(year: number): { jiNian: number; wuYuanLiuJi: string; jiName: string; taiYiShu: number; process: string } {
  const shangYuanStart = 10153917; // 上元甲子积年基数
  const jiNian = shangYuanStart + year - 1;
  const wuYuan = Math.floor(jiNian / 4560) % 5;
  const wuYuanNames = ["甲子元","丙子元","戊子元","庚子元","壬子元"];
  const jiIdx = Math.floor((jiNian % 4560) / 760);
  const jiNames = ["甲子纪","丙子纪","戊子纪","庚子纪","壬子纪"];
  const taiYiShu = jiNian % 360;
  const process = `上元积年${jiNian}，五元六纪：${wuYuanNames[wuYuan]}第${jiIdx + 1}纪（${jiNames[jiIdx]}），太乙数${taiYiShu}`;
  return {
    jiNian, wuYuanLiuJi: `${wuYuanNames[wuYuan]}·${jiNames[jiIdx]}`,
    jiName: jiNames[jiIdx], taiYiShu, process,
  };
}

/** 十六神盘布局 */
function buildShiLiuShenPan(taiYiShu: number, dunType: "阳遁" | "阴遁"): any {
  const taiYiGong = (taiYiShu % 24) || 24;
  const gongXianIdx = dunType === "阳遁" ? taiYiGong : (25 - taiYiGong);
  const tianPan = SHI_LIU_SHEN.map((shen, i) => ({
    shen,
    gong: ((gongXianIdx + i * 1.5 - 1) % 16 + 16) % 16 + 1,
  }));
  return {
    tianPan: tianPan.slice(0, 8),
    diPan: SHI_LIU_SHEN.slice(8, 16).map((shen, i) => ({ shen, gong: i + 1 })),
    taiYiGong: (gongXianIdx - 1) % 16 + 1,
    wenChangGong: ((gongXianIdx + 2) % 16) || 16,
    shiJiGong: ((gongXianIdx + 5) % 16) || 16,
    jiShen: SHI_LIU_SHEN[(gongXianIdx + 7) % 16],
    dingMu: SHI_LIU_SHEN[(gongXianIdx + 10) % 16],
  };
}

/** 三算 */
function calcSanSuan(taiYiShu: number, wenChangGong: number, shiJiGong: number): any {
  const zhuVal = (wenChangGong * 3 + taiYiShu % 10) % 100;
  const keVal = (shiJiGong * 4 + taiYiShu % 10) % 100;
  const dingVal = ((wenChangGong + shiJiGong) * 2 + taiYiShu % 10) % 100;
  const zhuWuXing = WU_XING_MAP[zhuVal % 10] ?? "土";
  const keWuXing = WU_XING_MAP[keVal % 10] ?? "土";
  const dingWuXing = WU_XING_MAP[dingVal % 10] ?? "土";
  const shengFu = zhuVal > keVal ? "主胜" : keVal > zhuVal ? "客胜" : "和";
  return {
    zhuSuan: { value: zhuVal, wuXing: zhuWuXing, desc: `主算${zhuVal}，五行属${zhuWuXing}` },
    keSuan: { value: keVal, wuXing: keWuXing, desc: `客算${keVal}，五行属${keWuXing}` },
    dingSuan: { value: dingVal, wuXing: dingWuXing, desc: `定算${dingVal}，五行属${dingWuXing}` },
    zhuKeRelation: zhuVal > keVal ? "主算大于客算，主方有利" : "客算大于主算，客方有利",
    shengFu,
  };
}

/** 节气判定（Meeus天文算法） */
function getJieQi(year: number, month: number, day: number): string {
  const allJieQi = calcAllJieQi(year);
  const jieOrder = ["立春","惊蛰","清明","立夏","芒种","小暑","立秋","白露","寒露","立冬","大雪","小寒"];
  const dateValue = month * 100 + day;

  for (let i = 0; i < 12; i++) {
    const jieName = jieOrder[i];
    const jie = allJieQi.get(jieName)!;
    const prevIdx = (i + 11) % 12;
    const prevJieName = jieOrder[prevIdx];
    const prevJie = allJieQi.get(prevJieName)!;

    const jieValue = jie.month * 100 + jie.day;
    let prevValue = prevJie.month * 100 + prevJie.day;
    if (prevJie.month > jie.month) prevValue -= 1200;

    if (dateValue >= prevValue && dateValue < jieValue) return prevJieName;
  }
  return "冬至";
}

/** 阴阳遁判断（冬至后~夏至前=阳遁，夏至后~冬至前=阴遁） */
function getDunType(year: number, month: number, day: number): "阳遁" | "阴遁" {
  const allJieQi = calcAllJieQi(year);
  const dongZhi = allJieQi.get("冬至")!;
  const xiaZhi = allJieQi.get("夏至")!;

  // 构造带年份的日期值用于跨年比较
  const dateVal = month * 100 + day;
  const dongZhiVal = dongZhi.month * 100 + dongZhi.day;
  const xiaZhiVal = xiaZhi.month * 100 + xiaZhi.day;

  // 冬至(12月) → 次年夏至(6月) = 阳遁
  if (dongZhiVal <= xiaZhiVal) {
    // 正常情况：冬至在12月，夏至在次年6月
    if (dateVal >= dongZhiVal || dateVal < xiaZhiVal) return "阳遁";
    return "阴遁";
  } else {
    // 异常（不应出现）
    if (dateVal >= dongZhiVal && dateVal < xiaZhiVal) return "阳遁";
    return "阴遁";
  }
}

export function calculateTaiYi(input: Record<string, unknown>): TaiYiResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const shiType = (input.shiType as any) ?? "时计";
  const yangDun = input.yangDun as boolean | undefined;

  const d = new Date(datetime);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();

  const jieQi = getJieQi(year, month, day);
  const defaultDun = getDunType(year, month, day);
  const dunType: "阳遁" | "阴遁" = yangDun !== undefined
    ? (yangDun ? "阳遁" : "阴遁")
    : defaultDun;

  const jiNianCalc = calcJiNian(year);
  const shiLiuShenPan = buildShiLiuShenPan(jiNianCalc.taiYiShu, dunType);
  const sanSuan = calcSanSuan(jiNianCalc.taiYiShu, shiLiuShenPan.wenChangGong, shiLiuShenPan.shiJiGong);

  // 日干支（bazi-engine纯数学算法）
  const riZhu = calcRiZhu(year, month, day);
  const riGanZhi = riZhu.gan + riZhu.zhi;

  // 八将
  const baJiang = BA_JIANG.map((name, i) => ({
    name,
    gong: ((shiLiuShenPan.taiYiGong + i * 2 - 1) % 16) + 1,
    desc: `${name}临${["子午卯酉乾坤艮巽"][i % 8] ?? "中"}宫`,
  }));

  // 格局
  const geJu = [
    { name:"太乙天门", active: shiLiuShenPan.taiYiGong === 1, desc:"太乙入天门，主君道昌明。", jiXiong:"吉" as const },
    { name:"文昌会合", active: shiLiuShenPan.wenChangGong === shiLiuShenPan.taiYiGong, desc:"文昌会太乙，主文运亨通。", jiXiong:"吉" as const },
    { name:"始击临中", active: shiLiuShenPan.shiJiGong === 8, desc:"始击临中宫，主客不利。", jiXiong:"凶" as const },
  ];

  const duanYu = `太乙${shiType}，${dunType}第${jiNianCalc.taiYiShu}局。太乙在${shiLiuShenPan.taiYiGong}宫，${sanSuan.shengFu}。`;

  return {
    input: { datetime, shiType, yangDun },
    basicInfo: { shiType, ganZhi: riGanZhi, dunType, jieQi, nianHao: `${year}年` },
    jiNianCalc,
    shiLiuShenPan,
    baJiang,
    sanSuan,
    shuLi: { juShu: jiNianCalc.taiYiShu % 72, zhuanPanShu: jiNianCalc.taiYiShu % 360, guaXiang: `${BA_JIANG[jiNianCalc.taiYiShu % 8]}主` },
    geJu,
    duanYu,
  };
}
