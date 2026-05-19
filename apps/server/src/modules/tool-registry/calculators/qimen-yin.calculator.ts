// ── 阴盘奇门遁甲计算引擎 ──
// 阴盘奇门：以月柱推局 + 隐干 + 命理奇门
// 参考：《阴盘奇门遁甲》《王凤麟道家奇门》

import type { QimenResult, QimenGong } from "@guoxue/shared";
import { calcRiZhu, getNianZhuYear } from "@guoxue/bazi-engine";

const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const GONG_INDEXES = [1,2,3,4,5,6,7,8,9];
const GONG_NAMES = ["坎","坤","震","巽","中","乾","兑","艮","离"];

// 九星（地盘固定：坎1→离9）
const JIU_XING = ["天蓬","天芮","天冲","天辅","天禽","天心","天柱","天任","天英"];
// 八门（地盘固定）
const BA_MEN = ["休","死","伤","杜","死","开","惊","生","景"];
// 八神（阴盘用此序，不分顺逆，始终此序转）
const BA_SHEN = ["值符","螣蛇","太阴","六合","白虎","玄武","九地","九天"];

// 地盘干基序
const DI_PAN_GAN = ["戊","己","庚","辛","壬","癸","丁","丙","乙"];

// 月支定局表（阴盘简化算法）
const ZHI_TO_JU: Record<string, number> = {
  "子":1, "丑":5, "寅":7, "卯":9, "辰":3, "巳":5,
  "午":9, "未":3, "申":1, "酉":7, "戌":5, "亥":3,
};

/** 年上起月法获取月干支（考虑立春分界） */
function monthGanZhi(year: number, month: number, day = 15): string {
  const nianYear = getNianZhuYear(year, month, day);
  const baseYear = 1984;
  const diff = nianYear - baseYear;
  let yIdx = diff % 60;
  if (yIdx < 0) yIdx += 60;
  const yGan = TIAN_GAN[yIdx % 10];
  // 五虎遁：甲己→丙寅, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅
  const baseGan = [2, 4, 6, 8, 0][Math.floor(TIAN_GAN.indexOf(yGan) / 2)];
  const mGan = TIAN_GAN[(baseGan + month - 1) % 10];
  const mZhi = DI_ZHI[(2 + month - 1) % 12]; // 寅=正月
  return mGan + mZhi;
}

/** 获取旬首 */
function getXunShouZhi(shiChenGanZhi: string): string {
  const zhi = shiChenGanZhi[1];
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const jiaZhiIdx = Math.floor(zhiIdx / 2) * 2;
  return DI_ZHI[jiaZhiIdx];
}

function getXunShouYi(shiChenGanZhi: string): string {
  const zhi = shiChenGanZhi[1];
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const jiaZhiIdx = Math.floor(zhiIdx / 2) * 2;
  const yiMap = ["戊","己","庚","辛","壬","癸"];
  return yiMap[jiaZhiIdx / 2];
}

/** 时柱天干（五鼠遁） */
function getShiGan(riGan: string, shiZhi: string): string {
  const ganIdx = TIAN_GAN.indexOf(riGan);
  const zhiIdx = DI_ZHI.indexOf(shiZhi);
  const baseGan = [0, 2, 4, 6, 8][Math.floor(ganIdx / 2)];
  return TIAN_GAN[(baseGan + zhiIdx) % 10];
}

/** 阴盘奇门排盘 */
export function calculateQimenYin(input: Record<string, unknown>): QimenResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const customJu = input.customJu as number | undefined;

  const d = new Date(datetime);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();

  // 月干支（立春分界）
  const yGanZhi = monthGanZhi(year, month, day);
  const yZhi = yGanZhi[1];
  const yGan = yGanZhi[0];

  // 阴盘用局：月支定局
  const juNumber = customJu ?? (ZHI_TO_JU[yZhi] ?? 1);

  // 日柱（bazi-engine 纯数学算法）
  const riZhu = calcRiZhu(year, month, day);
  const riGan = riZhu.gan;
  const riZhi = riZhu.zhi;

  // 时柱
  const shiZhi = DI_ZHI[Math.floor(hour / 2) % 12];
  const shiGan = getShiGan(riGan, shiZhi);
  const shiChenGanZhi = shiGan + shiZhi;

  // 旬首
  const xunShouYi = getXunShouYi(shiChenGanZhi);
  const xunShouZhi = getXunShouZhi(shiChenGanZhi);
  const xunShouYiIdx = DI_PAN_GAN.indexOf(xunShouYi);

  // ── 第1步：排地盘干 ──
  // 坎1宫起旬首，顺排
  const diPan: string[] = [];
  for (let i = 0; i < 9; i++) {
    diPan.push(DI_PAN_GAN[(xunShouYiIdx + i) % 9]);
  }

  // ── 第2步：值符星 = 时干落宫的地盘星 ──
  let zhiFuGongIdx = diPan.indexOf(shiGan);
  if (zhiFuGongIdx === -1) zhiFuGongIdx = 0;
  const zhiFuXing = JIU_XING[zhiFuGongIdx];

  // ── 第3步：值使门 ──
  const shiZhiIdx = DI_ZHI.indexOf(shiZhi);
  const xunShouZhiIdx = DI_ZHI.indexOf(xunShouZhi);
  const zhiBuShu = (shiZhiIdx - xunShouZhiIdx + 12) % 12;
  // 阴盘默认阴遁方向
  const zhiShiMenGongIdx = (9 - zhiBuShu % 9) % 9;
  const zhiShiMen = BA_MEN[zhiShiMenGongIdx];

  // ── 第4步：排天盘干（值符星落时干宫驱动） ──
  const tianPan: string[] = [];
  for (let i = 0; i < 9; i++) {
    const srcIdx = (zhiFuGongIdx - i + 9) % 9; // 阴遁逆排
    tianPan.push(diPan[srcIdx]);
  }

  // ── 第5步：排九星（阴遁逆排） ──
  const starArr: string[] = [];
  for (let i = 0; i < 9; i++) {
    const srcIdx = (zhiFuGongIdx - i + 9) % 9;
    starArr.push(JIU_XING[srcIdx]);
  }

  // ── 第6步：排八门（阴遁逆排） ──
  const menArr: string[] = [];
  for (let i = 0; i < 9; i++) {
    const srcIdx = (zhiShiMenGongIdx - i + 9) % 9;
    menArr.push(BA_MEN[srcIdx]);
  }

  // ── 第7步：排隐干（阴盘特有） ──
  // 隐干排列规则：时干起，按宫位顺序飞布
  const shiGanIdx = TIAN_GAN.indexOf(shiGan);
  const yinGanArr: string[] = [];
  for (let i = 0; i < 9; i++) {
    yinGanArr.push(TIAN_GAN[(shiGanIdx + i) % 10]);
  }

  // ── 第8步：排八神 ──
  const shenArr = BA_SHEN;

  // ── 第9步：构建九宫 ──
  const gongs: QimenGong[] = [];
  // 非中宫索引映射
  const nonZhongIdx = [0, 1, 2, 3, 5, 6, 7, 8];

  for (let gi = 0; gi < 9; gi++) {
    const gongName = GONG_NAMES[gi];
    const isZhong = gongName === "中";

    if (isZhong) {
      gongs.push({
        index: 5, name: "中", bagua: "中",
        diPan: diPan[4], tianPan: tianPan[4],
        star: starArr[4], men: menArr[4],
        shen: shenArr[0], yinGan: yinGanArr[4],
        isRuMu: false, isJiXing: false, isMenPo: false,
        kongWang: false, maXing: false, shenSha: [],
      });
      continue;
    }

    const shenIdx = nonZhongIdx.indexOf(gi);

    // 空亡：旬首地支的绝地
    const isKongWang = (DI_ZHI.indexOf(xunShouZhi) + 1) % 12 === gi % 12;

    // 马星：日支三合局马星
    const maXingZhiMap: Record<string, string> = {
      "子":"寅","丑":"亥","寅":"申","卯":"巳",
      "辰":"寅","巳":"亥","午":"申","未":"巳",
      "申":"寅","酉":"亥","戌":"申","亥":"巳",
    };
    const maZhi = maXingZhiMap[riZhi] ?? "寅";
    const isMaXing = DI_ZHI.indexOf(maZhi) % 4 === gi % 4; // 简化

    // 入墓：天干入墓
    const ganRuMu: Record<string, number> = {
      "甲":1,"乙":1,"丙":8,"丁":8,"戊":8,"己":8,
      "庚":2,"辛":2,"壬":6,"癸":6,
    };
    const tianPanGan = tianPan[gi];
    const tianPanGanWuXing = ganRuMu[tianPanGan];
    const isRuMu = tianPanGanWuXing !== undefined && tianPanGanWuXing === GONG_INDEXES[gi];

    gongs.push({
      index: GONG_INDEXES[gi],
      name: gongName,
      bagua: gongName,
      diPan: diPan[gi],
      tianPan: tianPan[gi],
      star: starArr[gi],
      men: menArr[gi],
      shen: shenArr[shenIdx % 8],
      yinGan: yinGanArr[gi],
      isRuMu,
      isJiXing: false,
      isMenPo: false,
      kongWang: isKongWang,
      maXing: isMaXing,
      shenSha: gi === zhiFuGongIdx ? ["天乙"] : [],
    });
  }

  // 中宫寄坤2
  gongs[4] = { ...gongs[4], index: 2, name: "坤", bagua: "坤" };

  return {
    juNumber,
    dunType: "yin",
    jieQi: "",
    yongShi: shiChenGanZhi,
    zhiFu: zhiFuXing,
    zhiShiMen,
    gongs,
    dipanBashen: shenArr,
  };
}
