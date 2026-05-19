// ── 大六壬计算引擎 ──
// 天地盘/四课/三传(九宗门)/课经/神煞
// 节气计算使用 Meeus 天文算法，日柱使用纯数学计算

import type { DaLiuRenInput, DaLiuRenResult, LiuRenGong, SiKeColumn } from "@guoxue/shared";
import { calcRiZhu, calcAllJieQi } from "@guoxue/bazi-engine";

const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 地支五行
const ZHI_WUXING: Record<string, string> = {
  "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火",
  "午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水",
};
// 天干五行
const GAN_WUXING: Record<string, string> = {
  "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土",
  "庚":"金","辛":"金","壬":"水","癸":"水",
};
// 寄宫
const JI_GONG: Record<string, string> = {
  "甲":"寅","乙":"辰","丙":"巳","丁":"未","戊":"巳","己":"未",
  "庚":"申","辛":"戌","壬":"亥","癸":"丑",
};

// 月将表（中气换将）
const YUE_JIANG: { name: string; zhi: string; jieQi: string }[] = [
  { name:"神后", zhi:"子", jieQi:"大寒" }, { name:"大吉", zhi:"丑", jieQi:"雨水" },
  { name:"功曹", zhi:"寅", jieQi:"春分" }, { name:"太冲", zhi:"卯", jieQi:"谷雨" },
  { name:"天罡", zhi:"辰", jieQi:"小满" }, { name:"太乙", zhi:"巳", jieQi:"夏至" },
  { name:"胜光", zhi:"午", jieQi:"大暑" }, { name:"小吉", zhi:"未", jieQi:"处暑" },
  { name:"传送", zhi:"申", jieQi:"秋分" }, { name:"从魁", zhi:"酉", jieQi:"霜降" },
  { name:"河魁", zhi:"戌", jieQi:"小雪" }, { name:"登明", zhi:"亥", jieQi:"冬至" },
];

// 贵人诀（甲戊庚牛羊）
const GUI_REN: Record<string, { day: string; night: string }> = {
  "甲":{day:"丑",night:"未"}, "乙":{day:"子",night:"申"},
  "丙":{day:"亥",night:"酉"}, "丁":{day:"酉",night:"亥"},
  "戊":{day:"丑",night:"未"}, "己":{day:"子",night:"申"},
  "庚":{day:"丑",night:"未"}, "辛":{day:"午",night:"寅"},
  "壬":{day:"卯",night:"巳"}, "癸":{day:"巳",night:"卯"},
};

// 天将名
const TIAN_JIANG = ["贵人","螣蛇","朱雀","六合","勾陈","青龙","天空","白虎","太常","玄武","太阴","天后"];

// 地支六冲
const LIU_CHONG: Record<string, string> = {
  "子":"午","午":"子","丑":"未","未":"丑","寅":"申","申":"寅",
  "卯":"酉","酉":"卯","辰":"戌","戌":"辰","巳":"亥","亥":"巳",
};
// 地支三合前位
const SAN_HE_QIAN: Record<string, string> = {
  "申":"酉","子":"丑","辰":"巳",
  "亥":"子","卯":"辰","未":"申",
  "寅":"卯","午":"未","戌":"亥",
  "巳":"午","酉":"戌","丑":"寅",
};
// 地支相刑
const XING: Record<string, string> = {
  "寅":"巳","巳":"申","申":"寅",
  "丑":"戌","戌":"未","未":"丑",
  "子":"卯","卯":"子",
  "辰":"辰","午":"午","酉":"酉","亥":"亥",
};

// ── 五行生克 ──
function wuXingKe(ke: string, beiKe: string): boolean {
  const order = ["木","土","水","火","金"];
  const ki = order.indexOf(ke);
  const bi = order.indexOf(beiKe);
  return ki >= 0 && bi >= 0 && (ki + 1) % 5 === bi;
}

/** 使用 Meeus 天文算法获取当前中气和对应月将 */
function getJieQiInfo(dateStr: string): { name: string; yueJiangIdx: number } {
  const d = new Date(dateStr + "T12:00:00+08:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  const allJieQi = calcAllJieQi(year);
  const birthValue = month * 100 + day;

  const zhongQiOrder = ["大寒","雨水","春分","谷雨","小满","夏至","大暑","处暑","秋分","霜降","小雪","冬至"];

  for (let i = 0; i < 12; i++) {
    const zqName = zhongQiOrder[i];
    const zq = allJieQi.get(zqName)!;
    const prevIdx = (i + 11) % 12;
    const prevZqName = zhongQiOrder[prevIdx];
    const prevZq = allJieQi.get(prevZqName)!;

    const zqValue = zq.month * 100 + zq.day;
    let prevValue: number;
    if (prevZq.month > zq.month) {
      prevValue = prevZq.month * 100 - 1200 + prevZq.day;
    } else {
      prevValue = prevZq.month * 100 + prevZq.day;
    }

    if (birthValue >= prevValue && birthValue < zqValue) {
      const yjIdx = (YUE_JIANG.findIndex(yj => yj.jieQi === prevZqName) + 1) % 12;
      return { name: prevZqName, yueJiangIdx: yjIdx >= 0 ? yjIdx : 0 };
    }
  }

  return { name: "冬至", yueJiangIdx: 11 };
}

/** 日干支（bazi-engine 纯数学算法） */
function dayGanZhi(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+08:00");
  const rz = calcRiZhu(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return rz.gan + rz.zhi;
}

/** 月将加时：占时地支配月将，顺排十二宫 */
function tianPanLayout(yueJiangZhi: string, zhanShiZhi: string): string[] {
  const yjIdx = DI_ZHI.indexOf(yueJiangZhi);
  const zsIdx = DI_ZHI.indexOf(zhanShiZhi);
  const result: string[] = [];
  for (let i = 0; i < 12; i++) {
    result.push(DI_ZHI[(yjIdx + i - zsIdx + 12) % 12]);
  }
  return result;
}

/** 天盘神在地盘上的位置 */
function diPanOfTianPan(tianPanZhi: string, tianPan: string[]): string {
  return DI_ZHI[tianPan.indexOf(tianPanZhi)];
}

/** 地盘上方的天盘神 */
function tianPanOfDiPan(diPanZhi: string, tianPan: string[]): string {
  return tianPan[DI_ZHI.indexOf(diPanZhi)];
}

/** 天将排布 */
function tianJiangLayout(guiRenZhi: string, shunNi: "顺" | "逆"): { zhi: string; jiang: string }[] {
  const result: { zhi: string; jiang: string }[] = [];
  const startIdx = DI_ZHI.indexOf(guiRenZhi);
  for (let i = 0; i < 12; i++) {
    const idx = shunNi === "顺" ? (startIdx + i) % 12 : (startIdx - i + 12) % 12;
    result.push({ zhi: DI_ZHI[idx], jiang: TIAN_JIANG[i] });
  }
  return result;
}

/** 四课 */
function buildSiKe(riGan: string, riZhi: string, tianPan: string[]): SiKeColumn[] {
  const ganGong = JI_GONG[riGan] ?? "寅";
  const ganGongIdx = DI_ZHI.indexOf(ganGong);
  const ganYang = tianPan[ganGongIdx];
  const ganYangIdx = DI_ZHI.indexOf(ganYang);
  const ganYin = tianPan[ganYangIdx];

  const zhiIdx = DI_ZHI.indexOf(riZhi);
  const zhiYang = tianPan[zhiIdx];
  const zhiYangIdx = DI_ZHI.indexOf(zhiYang);
  const zhiYin = tianPan[zhiYangIdx];

  return [
    { index:1, xiaZhi:ganGong as any, xiaGan:riGan as any, shangZhi:ganYang as any, description:`干阳：日干${riGan}寄${ganGong}，天盘为${ganYang}` },
    { index:2, xiaZhi:ganYang as any, xiaGan:riGan as any, shangZhi:ganYin as any, description:`干阴：取干阳神${ganYang}之上天盘${ganYin}` },
    { index:3, xiaZhi:riZhi as any, xiaGan:riGan as any, shangZhi:zhiYang as any, description:`支阳：日支${riZhi}之上天盘${zhiYang}` },
    { index:4, xiaZhi:zhiYang as any, xiaGan:riGan as any, shangZhi:zhiYin as any, description:`支阴：取支阳神${zhiYang}之上天盘${zhiYin}` },
  ];
}

// ═══════════════════════════════════════════
// 九宗门 — 三传推导
// ═══════════════════════════════════════════

interface KeInfo {
  keIndex: number;   // 1-4，对应四课
  isZei: boolean;     // 下克上=贼，上克下=克
  shangZhi: string;
  xiaZhi: string;
  shangWx: string;
  xiaWx: string;
}

interface SanChuanResult {
  chu: { zhi: string; description: string };
  zhong: { zhi: string; description: string };
  mo: { zhi: string; description: string };
  zongMen: string;
  zongMenDesc: string;
}

/** 遍历四课找出所有贼（下克上）和克（上克下） */
function findKeInSiKe(siKe: SiKeColumn[]): KeInfo[] {
  const result: KeInfo[] = [];
  for (const ke of siKe) {
    const xiaWx = ZHI_WUXING[ke.xiaZhi];
    const shangWx = ZHI_WUXING[ke.shangZhi];
    if (!xiaWx || !shangWx) continue;

    // 下克上 = 贼
    if (wuXingKe(xiaWx, shangWx)) {
      result.push({ keIndex: ke.index, isZei: true, shangZhi: ke.shangZhi, xiaZhi: ke.xiaZhi, shangWx, xiaWx });
    }
    // 上克下 = 克
    else if (wuXingKe(shangWx, xiaWx)) {
      result.push({ keIndex: ke.index, isZei: false, shangZhi: ke.shangZhi, xiaZhi: ke.xiaZhi, shangWx, xiaWx });
    }
  }
  return result;
}

/** 判断上神五行是否与日干比和（相同五行） */
function isBiHe(shangZhi: string, riGan: string): boolean {
  const ganWx = GAN_WUXING[riGan];
  const zhiWx = ZHI_WUXING[shangZhi];
  return ganWx === zhiWx;
}

/** 涉害深度：从下神地盘位置起，顺时针统计地盘五行克上神的次数，直到回归本家 */
function sheHaiDepth(xiaZhi: string, shangZhi: string): number {
  const shangWx = ZHI_WUXING[shangZhi];
  if (!shangWx) return 0;
  let depth = 0;
  // 从上神在地盘的位置（即下神在地盘上的天盘所在），顺行十二宫
  // 涉害的标准算法：从地盘下神开始，顺数到天盘上神在地盘的位置
  const xiaIdx = DI_ZHI.indexOf(xiaZhi);
  // 遍历十二宫，统计地盘克上神的次数
  for (let i = 0; i < 12; i++) {
    const diPanZhi = DI_ZHI[(xiaIdx + i) % 12];
    const diPanWx = ZHI_WUXING[diPanZhi];
    if (diPanWx && wuXingKe(diPanWx, shangWx)) {
      depth++;
    }
  }
  return depth;
}

/** 从四课中取初传（按贼克→比用→涉害优先级） */
function pickChuChuanByZeKe(keList: KeInfo[], riGan: string): { chu: KeInfo; method: string } {
  // 优先取贼（下克上）
  let candidates = keList.filter(k => k.isZei);
  let method = "贼克";

  if (candidates.length === 0) {
    candidates = keList.filter(k => !k.isZei);
    method = "贼克";
  }

  if (candidates.length === 0) {
    return { chu: null as any, method: "none" };
  }

  // 只有一个 → 直接取
  if (candidates.length === 1) {
    return { chu: candidates[0], method };
  }

  // 多个 → 比用：取与日干五行比和者
  const biHeCandidates = candidates.filter(k => isBiHe(k.shangZhi, riGan));
  if (biHeCandidates.length === 1) {
    return { chu: biHeCandidates[0], method: "比用" };
  }

  // 俱比或俱不比 → 涉害
  const targetPool = biHeCandidates.length > 0 ? biHeCandidates : candidates;
  if (targetPool.length > 1) {
    // 计算涉害深度，取最深者
    let maxDepth = -1;
    let deepestIdx = 0;
    for (let i = 0; i < targetPool.length; i++) {
      const depth = sheHaiDepth(targetPool[i].xiaZhi, targetPool[i].shangZhi);
      if (depth > maxDepth) {
        maxDepth = depth;
        deepestIdx = i;
      }
    }
    return { chu: targetPool[deepestIdx], method: "涉害" };
  }

  return { chu: targetPool[0], method: "涉害" };
}

/** 遥克法：四课无克时，取遥克 */
function pickChuChuanByYaoKe(siKe: SiKeColumn[], riGan: string, riZhi: string, tianPan: string[]): { chu: KeInfo | null; method: string } {
  const ganWx = GAN_WUXING[riGan];
  if (!ganWx) return { chu: null, method: "none" };

  // ① 日干遥克四课上神（日干克上神）
  const ganKeShang: KeInfo[] = [];
  // ② 四课上神遥克日干（上神克日干）
  const shangKeGan: KeInfo[] = [];

  for (const ke of siKe) {
    const shangWx = ZHI_WUXING[ke.shangZhi];
    if (!shangWx) continue;
    if (wuXingKe(ganWx, shangWx)) {
      ganKeShang.push({ keIndex: ke.index, isZei: false, shangZhi: ke.shangZhi, xiaZhi: ke.xiaZhi, shangWx, xiaWx: ZHI_WUXING[ke.xiaZhi] });
    }
    if (wuXingKe(shangWx, ganWx)) {
      shangKeGan.push({ keIndex: ke.index, isZei: false, shangZhi: ke.shangZhi, xiaZhi: ke.xiaZhi, shangWx, xiaWx: ZHI_WUXING[ke.xiaZhi] });
    }
  }

  // 优先日干遥克上神（弹射），次取上神遥克日干（遥克）
  if (ganKeShang.length > 0) {
    // 多个取比用
    const biHe = ganKeShang.filter(k => isBiHe(k.shangZhi, riGan));
    return { chu: biHe.length > 0 ? biHe[0] : ganKeShang[0], method: "弹射" };
  }
  if (shangKeGan.length > 0) {
    const biHe = shangKeGan.filter(k => isBiHe(k.shangZhi, riGan));
    return { chu: biHe.length > 0 ? biHe[0] : shangKeGan[0], method: "遥克" };
  }

  return { chu: null, method: "none" };
}

/** 判断四课是否有重复（用于别责/八专判断） */
function countDistinctKe(siKe: SiKeColumn[]): { distinctCount: number; duplicatePairs: [number, number][] } {
  const shangZhis = siKe.map(k => k.shangZhi);
  const pairs: [number, number][] = [];
  for (let i = 0; i < shangZhis.length; i++) {
    for (let j = i + 1; j < shangZhis.length; j++) {
      if (shangZhis[i] === shangZhis[j]) pairs.push([i + 1, j + 1]);
    }
  }
  const distinct = new Set(shangZhis).size;
  return { distinctCount: distinct, duplicatePairs: pairs };
}

/** 天干五合 */
const GAN_WU_HE: Record<string, string> = {
  "甲":"己","己":"甲","乙":"庚","庚":"乙","丙":"辛","辛":"丙",
  "丁":"壬","壬":"丁","戊":"癸","癸":"戊",
};

/** 构建三传（九宗门完整算法） */
function buildSanChuan(
  siKe: SiKeColumn[],
  riGan: string,
  riZhi: string,
  tianPan: string[],
  dunGanTable: { zhi: string; gan: string }[],
  dayNight: string,
): SanChuanResult {
  const riGanIdx = TIAN_GAN.indexOf(riGan);
  const isYangRi = riGanIdx % 2 === 0;
  const ganGong = JI_GONG[riGan] ?? "寅";

  // ═══════════════════════════════════════════
  // 第1步：伏吟？ → 天地盘完全相同
  // ═══════════════════════════════════════════
  const isFuYin = DI_ZHI.every((z, i) => tianPan[i] === z);
  if (isFuYin) {
    // 初传：阳日取干上神，阴日取支上神
    const chuZhi = isYangRi ? siKe[0].shangZhi : siKe[2].shangZhi;
    // 中传：初传之刑
    const chuXing = XING[chuZhi] ?? chuZhi;
    // 如果初传自刑(辰午酉亥)，则用特殊规则
    const isZiXing = ["辰","午","酉","亥"].includes(chuZhi);
    let zhongZhi: string, moZhi: string;

    if (isZiXing) {
      // 自刑：阳日中传取支上神，末传取中传之刑
      if (isYangRi) {
        zhongZhi = siKe[2].shangZhi;
        moZhi = XING[zhongZhi] ?? zhongZhi;
      } else {
        zhongZhi = siKe[0].shangZhi;
        moZhi = XING[zhongZhi] ?? zhongZhi;
      }
    } else {
      zhongZhi = chuXing;
      moZhi = XING[zhongZhi] ?? zhongZhi;
    }

    return {
      chu: { zhi: chuZhi, description: `初传：${chuZhi}（伏吟法，${isYangRi ? "阳日" : "阴日"}干上神）` },
      zhong: { zhi: zhongZhi, description: `中传：${zhongZhi}（${isZiXing ? "支上神" : "初传之刑"}）` },
      mo: { zhi: moZhi, description: `末传：${moZhi}（中传之刑）` },
      zongMen: "伏吟",
      zongMenDesc: "天地盘同位，伏吟之象。主静不宜动，事多反复。",
    };
  }

  // ═══════════════════════════════════════════
  // 第2步：返吟？ → 天地盘完全对冲
  // ═══════════════════════════════════════════
  const isFanYin = DI_ZHI.every((z, i) => tianPan[i] === DI_ZHI[(i + 6) % 12]);
  if (isFanYin) {
    // 初传取驿马（日支之冲），中传取日支，末传取日干寄宫
    const chuZhi = LIU_CHONG[riZhi] ?? riZhi;
    const zhongZhi = riZhi;
    const moZhi = ganGong;

    return {
      chu: { zhi: chuZhi, description: `初传：${chuZhi}（返吟法，日支冲神为驿马）` },
      zhong: { zhi: zhongZhi, description: `中传：${zhongZhi}（日支）` },
      mo: { zhi: moZhi, description: `末传：${moZhi}（日干寄宫）` },
      zongMen: "返吟",
      zongMenDesc: "天地盘对冲，返吟之象。主动不主静，事多变迁。",
    };
  }

  // ═══════════════════════════════════════════
  // 第3步：八专？ → 干支同位，四课仅两课独立
  // ═══════════════════════════════════════════
  const ke1_3_same = siKe[0].shangZhi === siKe[2].shangZhi;
  const ke2_4_same = siKe[1].shangZhi === siKe[3].shangZhi;
  if (ke1_3_same && ke2_4_same) {
    // 阳日：初传从干阳顺数三位，中末并用干阴
    // 阴日：初传从支阴逆数三位，中末并用支阳
    if (isYangRi) {
      const ganYangZhi = siKe[0].shangZhi;
      const ganYangIdx = DI_ZHI.indexOf(ganYangZhi);
      const chuZhi = tianPan[(ganYangIdx + 3) % 12];
      const ganYinZhi = siKe[1].shangZhi;
      return {
        chu: { zhi: chuZhi, description: `初传：${chuZhi}（八专法，阳日顺三）` },
        zhong: { zhi: ganYinZhi, description: `中传：${ganYinZhi}（干阴神）` },
        mo: { zhi: ganYinZhi, description: `末传：${ganYinZhi}（干阴神）` },
        zongMen: "八专",
        zongMenDesc: "干支同位，八专之课。阳日从干顺三，中末用干阴。",
      };
    } else {
      const zhiYinZhi = siKe[3].shangZhi;
      const zhiYinIdx = DI_ZHI.indexOf(zhiYinZhi);
      const chuZhi = tianPan[(zhiYinIdx - 3 + 12) % 12];
      const zhiYangZhi = siKe[2].shangZhi;
      return {
        chu: { zhi: chuZhi, description: `初传：${chuZhi}（八专法，阴日逆三）` },
        zhong: { zhi: zhiYangZhi, description: `中传：${zhiYangZhi}（支阳神）` },
        mo: { zhi: zhiYangZhi, description: `末传：${zhiYangZhi}（支阳神）` },
        zongMen: "八专",
        zongMenDesc: "干支同位，八专之课。阴日从支逆三，中末用支阳。",
      };
    }
  }

  // ═══════════════════════════════════════════
  // 第4步：别责？ → 四课有三课独立（一对重复）
  // ═══════════════════════════════════════════
  const keDistinct = countDistinctKe(siKe);
  if (keDistinct.distinctCount === 3) {
    const ganYangZhi = siKe[0].shangZhi;
    if (isYangRi) {
      // 阳日：初传=日干合神之上神，中末传=干阳（第一课上神）
      const heGan = GAN_WU_HE[riGan];
      const heGong = JI_GONG[heGan] ?? "寅";
      const chuZhi = tianPanOfDiPan(heGong, tianPan);
      return {
        chu: { zhi: chuZhi, description: `初传：${chuZhi}（别责法，阳日取干合神上神）` },
        zhong: { zhi: ganYangZhi, description: `中传：${ganYangZhi}（干阳神）` },
        mo: { zhi: ganYangZhi, description: `末传：${ganYangZhi}（干阳神）` },
        zongMen: "别责",
        zongMenDesc: `三课备，为别责法。阳日取干合（${riGan}合${heGan}）寄宫上神为初传。`,
      };
    } else {
      // 阴日：初传=日支三合前位之上神，中末传=干阳
      const sanHeQian = SAN_HE_QIAN[riZhi] ?? riZhi;
      const chuZhi = tianPanOfDiPan(sanHeQian, tianPan);
      return {
        chu: { zhi: chuZhi, description: `初传：${chuZhi}（别责法，阴日取三合前位${sanHeQian}上神）` },
        zhong: { zhi: ganYangZhi, description: `中传：${ganYangZhi}（干阳神）` },
        mo: { zhi: ganYangZhi, description: `末传：${ganYangZhi}（干阳神）` },
        zongMen: "别责",
        zongMenDesc: `三课备，为别责法。阴日取日支${riZhi}三合前位${sanHeQian}之上神为初传。`,
      };
    }
  }

  // ═══════════════════════════════════════════
  // 以下：贼克 → 比用 → 涉害 → 遥克 → 昴星
  // ═══════════════════════════════════════════

  // ── 四课有无克？ ──
  const allKe = findKeInSiKe(siKe);

  // ── 有克 → 贼克法（含比用/涉害）──
  if (allKe.length > 0) {
    const { chu, method } = pickChuChuanByZeKe(allKe, riGan);
    if (chu) {
      const chuZhi = chu.shangZhi;
      const zhongZhi = tianPanOfDiPan(chuZhi, tianPan);
      const moZhi = tianPanOfDiPan(zhongZhi, tianPan);

      const methodDesc: Record<string, string> = {
        "贼克": `四课有克，取${chu.isZei ? "下克上（贼）" : "上克下（克）"}为用，为贼克法。`,
        "比用": `四课多克，取与日干比和者为用，为比用法。`,
        "涉害": `四课多克且比和不分，取涉害深者为用，为涉害法。`,
      };

      return {
        chu: { zhi: chuZhi, description: `初传：${chuZhi}（${method}，第${chu.keIndex}课上神）` },
        zhong: { zhi: zhongZhi, description: `中传：${zhongZhi}（初传之阴）` },
        mo: { zhi: moZhi, description: `末传：${moZhi}（中传之阴）` },
        zongMen: method,
        zongMenDesc: methodDesc[method] ?? `四课有克，取克为用，为${method}法。`,
      };
    }
  }

  // ── 无克 → 遥克法 ──
  const yaoKeResult = pickChuChuanByYaoKe(siKe, riGan, riZhi, tianPan);
  if (yaoKeResult.chu) {
    const chuZhi = yaoKeResult.chu.shangZhi;
    const zhongZhi = tianPanOfDiPan(chuZhi, tianPan);
    const moZhi = tianPanOfDiPan(zhongZhi, tianPan);
    return {
      chu: { zhi: chuZhi, description: `初传：${chuZhi}（${yaoKeResult.method}，第${yaoKeResult.chu.keIndex}课上神）` },
      zhong: { zhi: zhongZhi, description: `中传：${zhongZhi}（初传之阴）` },
      mo: { zhi: moZhi, description: `末传：${moZhi}（中传之阴）` },
      zongMen: yaoKeResult.method,
      zongMenDesc: yaoKeResult.method === "弹射"
        ? "四课无克，日干遥克上神为用，名弹射。主事远而轻。"
        : "四课无克，上神遥克日干为用，名遥克。主事远而轻。",
    };
  }

  // ── 昴星法：四课无克无遥克 ──
  const chuZhi = tianPan[DI_ZHI.indexOf("酉")];
  const chuByYang = isYangRi ? chuZhi : tianPanOfDiPan("酉", tianPan);
  const zhongByYang = tianPanOfDiPan(ganGong, tianPan);
  const moByYang = tianPanOfDiPan(riZhi, tianPan);
  const zhongByYin = tianPanOfDiPan(riZhi, tianPan);
  const moByYin = tianPanOfDiPan(ganGong, tianPan);

  return {
    chu: { zhi: chuByYang, description: `初传：${chuByYang}（昴星法，${isYangRi ? "阳日取酉上" : "阴日取酉下"}）` },
    zhong: { zhi: isYangRi ? zhongByYang : zhongByYin, description: `中传：${isYangRi ? zhongByYang : zhongByYin}（昴星法，${isYangRi ? "日干上神" : "日支上神"}）` },
    mo: { zhi: isYangRi ? moByYang : moByYin, description: `末传：${isYangRi ? moByYang : moByYin}（昴星法，${isYangRi ? "日支上神" : "日干上神"}）` },
    zongMen: "昴星",
    zongMenDesc: "四课无克无遥克，为昴星法。虎视眈眈，主惊疑不定。",
  };
}

/** 遁干 */
function dunGanTable(riGan: string): { zhi: string; gan: string }[] {
  const ganIdx = TIAN_GAN.indexOf(riGan);
  const start = [0,2,4,6,8][Math.floor(ganIdx / 2)];
  return DI_ZHI.map((z, i) => ({ zhi: z, gan: TIAN_GAN[(start + i) % 10] }));
}

/** 空亡 */
function calcKongWang(riGanZhi: string): string[] {
  const zhi = riGanZhi[1];
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const xunShouIdx = Math.floor(zhiIdx / 2) * 2;
  return [DI_ZHI[(xunShouIdx - 2 + 12) % 12], DI_ZHI[(xunShouIdx - 1 + 12) % 12]];
}

/** 主计算函数 */
export function calculateDaLiuRen(input: Record<string, unknown>): DaLiuRenResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const birthYear = (input.birthYear as number) ?? 1980;
  const gender = (input.gender as string) ?? "男";

  const d = new Date(datetime);
  const dateStr = d.toISOString().slice(0, 10);
  const hour = d.getHours();
  const zhanShiZhi = DI_ZHI[Math.floor(hour / 2) % 12];

  const riGanZhi = dayGanZhi(dateStr);
  const riGan = riGanZhi[0];
  const riZhi = riGanZhi[1];

  const jieQiInfo = getJieQiInfo(dateStr);
  const yueJiang = YUE_JIANG[jieQiInfo.yueJiangIdx];

  const dayNight = hour >= 6 && hour < 18 ? "昼" : "夜";

  const guiRenInfo = GUI_REN[riGan];
  const guiRenZhi = dayNight === "昼" ? guiRenInfo.day : guiRenInfo.night;
  const guiShunNi = ["亥","子","丑","寅","卯","辰"].includes(guiRenZhi) ? "顺" : "逆";

  const tianPan = tianPanLayout(yueJiang.zhi, zhanShiZhi);
  const gongs: LiuRenGong[] = DI_ZHI.map((z, i) => ({
    zhi: z as any,
    diPan: z,
    tianPan: tianPan[i],
    shenSha: [] as any[],
  }));

  const siKe = buildSiKe(riGan, riZhi, tianPan);
  const dunGan = dunGanTable(riGan);

  // 三传（九宗门算法）
  const sanChuan = buildSanChuan(siKe, riGan, riZhi, tianPan, dunGan, dayNight);

  const tianJiangList = tianJiangLayout(guiRenZhi, guiShunNi);
  const tianJiangLayoutResult = DI_ZHI.map((z) => {
    const tj = tianJiangList.find((t) => t.zhi === z);
    return { zhi: z as any, tianJiang: (tj?.jiang ?? "贵人") as any, dayNight: dayNight as "昼" | "夜" };
  });

  const kongWang = calcKongWang(riGanZhi);

  // 年命行年
  const nianGanZhiBaseYear = 1984;
  const nianDiff = birthYear - nianGanZhiBaseYear;
  let nianIdx = nianDiff % 60;
  if (nianIdx < 0) nianIdx += 60;

  const riGanWuXingMap: Record<string, string> = {
    "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水",
  };
  const riGanWuXing = riGanWuXingMap[riGan];
  const ganWuXing: Record<string, string> = {
    "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水",
  };
  const liuQinTable = dunGan.map((dg) => {
    const ganWx = ganWuXing[dg.gan];
    let liuQin = "比";
    if (riGanWuXing === "木" && ganWx === "火") liuQin = "子";
    else if (riGanWuXing === "木" && ganWx === "土") liuQin = "财";
    else if (riGanWuXing === "木" && ganWx === "金") liuQin = "官";
    else if (riGanWuXing === "木" && ganWx === "水") liuQin = "父";
    return { zhi: dg.zhi, liuQin };
  });

  const duanYu = `日柱${riGanZhi}，月将${yueJiang.name}（${yueJiang.zhi}），占时${zhanShiZhi}。贵人${guiRenZhi}${guiShunNi}排。宗门${sanChuan.zongMen}，初传${sanChuan.chu.zhi}。空亡在${kongWang.join("、")}。`;

  return {
    input: { datetime, birthYear, gender: gender as any, liveTime: "", random: false, jiangMethod: "zhongqi", guiRenJue: "jiawugeng-niuyang", guiRenDayNight: "maoyou", sheHaiType: "mengzhongji", trueSolar: false },
    zhanShi: zhanShiZhi as any,
    yueJiang: yueJiang.name as any,
    yueJiangZhi: yueJiang.zhi as any,
    dayNight: dayNight as any,
    jieQi: jieQiInfo.name,
    riGanZhi,
    gongs,
    siKe: siKe as any,
    sanChuan: sanChuan as any,
    zongMen: sanChuan.zongMen as any,
    zongMenDesc: sanChuan.zongMenDesc,
    tianJiangLayout: tianJiangLayoutResult,
    keJing: [
      { name: sanChuan.zongMen === "贼克" ? "元首课" : `${sanChuan.zongMen}课`, number: 1, summary: sanChuan.zongMenDesc, biFaFu: ["初传见克须谨慎"] },
    ],
    shenSha: [
      { name:"日德", zhi: riZhi as any, type:"ji", description:"日德所在，主有贵人相助。" },
      { name:"驿马", zhi: DI_ZHI[(DI_ZHI.indexOf(riZhi) + 6) % 12] as any, type:"ji", description:"驿马动，主出行变动。" },
    ],
    kongWang: kongWang as any,
    nianMing: { ganZhi: TIAN_GAN[nianIdx % 10] + DI_ZHI[nianIdx % 12], gongWei: DI_ZHI[nianIdx % 12] as any },
    xingNian: { ganZhi: TIAN_GAN[(nianIdx + 1) % 10] + DI_ZHI[(nianIdx + 1) % 12], gongWei: DI_ZHI[(nianIdx + 1) % 12] as any },
    dunGanTable: dunGan as any,
    liuQinTable: liuQinTable as any,
    duanYu,
  };
}
