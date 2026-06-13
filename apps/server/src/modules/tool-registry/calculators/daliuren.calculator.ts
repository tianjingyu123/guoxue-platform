// ── 大六壬计算引擎 ──
// 天地盘/四课/三传(九宗门)/课经/神煞
// 节气计算使用 Meeus 天文算法，日柱使用纯数学计算
// 算法参考：《六壬大全》《大六壬指南》《六壬断案》《六壬粹言》
// 九宗门法源自《大六壬立成大全》《六壬经纬》

import type { DaLiuRenResult, LiuRenGong, SiKeColumn } from "@guoxue/shared";
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

// 天将类象（源自《大六壬大全·十二天将》）
const TIAN_JIANG_XIANG: Record<string, { wuXing: string; jiXiong: string; leiXiang: string; duanYu: string }> = {
  "贵人": { wuXing:"土", jiXiong:"吉", leiXiang:"君父、尊长、贵人、官禄、文书", duanYu:"天乙贵人临，主得尊长提携、官方助力，万事有贵人相助。" },
  "螣蛇": { wuXing:"火", jiXiong:"凶", leiXiang:"惊恐、怪异、虚惊、火灾、口舌", duanYu:"螣蛇临，主虚惊怪异之事，防小人暗算、口舌是非，宜谨慎。" },
  "朱雀": { wuXing:"火", jiXiong:"平", leiXiang:"文书、信息、口舌、词讼、鸟类", duanYu:"朱雀临，主文书信息往来，亦有口舌是非，考生利文书。" },
  "六合": { wuXing:"木", jiXiong:"吉", leiXiang:"婚姻、交易、和合、中介、子孙", duanYu:"六合临，主婚姻美事、交易成功、合作顺利，利签约合伙。" },
  "勾陈": { wuXing:"土", jiXiong:"凶", leiXiang:"田土、官司、争斗、迟滞、牢狱", duanYu:"勾陈临，主田土纠纷、官司牵连，事多迟滞，宜化解争端。" },
  "青龙": { wuXing:"木", jiXiong:"吉", leiXiang:"喜庆、财帛、升迁、婚姻、酒色", duanYu:"青龙临，主喜事临门、财运亨通、升迁有望，万事欣荣之象。" },
  "天空": { wuXing:"土", jiXiong:"凶", leiXiang:"欺诈、虚无、文书不实、谎言、奴婢", duanYu:"天空临，主虚诈不实、信息失真，文书契约需仔细核实。" },
  "白虎": { wuXing:"金", jiXiong:"大凶", leiXiang:"血光、丧服、疾病、官非、意外", duanYu:"白虎临，主血光之灾、疾病官非，大凶之将，宜化解不宜冲犯。" },
  "太常": { wuXing:"土", jiXiong:"吉", leiXiang:"宴乐、饮食、衣帛、礼仪、婚姻", duanYu:"太常临，主宴饮聚会、礼仪庆典，社交顺畅，利相亲嫁娶。" },
  "玄武": { wuXing:"水", jiXiong:"凶", leiXiang:"盗贼、遗失、暗昧、隐私、水厄", duanYu:"玄武临，主盗贼失窃、暗昧不明，防财物损失和隐私泄露。" },
  "太阴": { wuXing:"金", jiXiong:"平", leiXiang:"阴私、密谋、女性、珠宝、暗中", duanYu:"太阴临，主暗中谋划有利，得女性贵人相助，宜保密行事。" },
  "天后": { wuXing:"水", jiXiong:"吉", leiXiang:"皇后、贵妇、婚姻、恩泽、保护", duanYu:"天后临，主得女性贵人庇护，婚姻喜事，恩泽广被。" },
};

// 日干禄位（《六壬大全》卷四）
const GAN_LU: Record<string, string> = {
  "甲":"寅","乙":"卯","丙":"巳","丁":"午","戊":"巳","己":"午",
  "庚":"申","辛":"酉","壬":"亥","癸":"子",
};

// 日干墓位
const GAN_MU: Record<string, string> = {
  "甲":"未","乙":"戌","丙":"戌","丁":"丑","戊":"戌","己":"丑",
  "庚":"丑","辛":"辰","壬":"辰","癸":"未",
};

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
function pickChuChuanByYaoKe(siKe: SiKeColumn[], riGan: string, _riZhi: string, _tianPan: string[]): { chu: KeInfo | null; method: string } {
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
  _dunGanTable: { zhi: string; gan: string }[],
  _dayNight: string,
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

/** 日支驿马 */
function getYiMa(zhi: string): string {
  const sanHe: Record<string, string> = {
    "申":"寅","子":"寅","辰":"寅","寅":"申","午":"申","戌":"申",
    "亥":"巳","卯":"巳","未":"巳","巳":"亥","酉":"亥","丑":"亥",
  };
  return sanHe[zhi] ?? zhi;
}

/** 日支桃花 */
function getTaoHua(zhi: string): string {
  const map: Record<string, string> = {
    "申":"卯","子":"卯","辰":"卯","寅":"午","午":"午","戌":"午",
    "亥":"子","卯":"子","未":"子","巳":"酉","酉":"酉","丑":"酉",
  };
  return map[zhi] ?? zhi;
}

/** 日支劫煞 */
function getJieSha(zhi: string): string {
  const map: Record<string, string> = {
    "申":"巳","子":"巳","辰":"巳","寅":"亥","午":"亥","戌":"亥",
    "亥":"申","卯":"申","未":"申","巳":"寅","酉":"寅","丑":"寅",
  };
  return map[zhi] ?? zhi;
}

/** 日支灾煞 */
function getZaiSha(zhi: string): string {
  const map: Record<string, string> = {
    "申":"午","子":"午","辰":"午","寅":"子","午":"子","戌":"子",
    "亥":"酉","卯":"酉","未":"酉","巳":"卯","酉":"卯","丑":"卯",
  };
  return map[zhi] ?? zhi;
}

/** 十二天将临宫吉凶（源自《六壬大全》） */
function tianJiangJiXiongAtGong(tianJiangName: string, gongZhi: string): string {
  const gongWx = ZHI_WUXING[gongZhi] ?? "土";
  const jiangInfo = TIAN_JIANG_XIANG[tianJiangName];
  if (!jiangInfo) return "平";
  // 天将五行生地盘宫五行 → 吉
  const order = ["木","火","土","金","水"];
  const jIdx = order.indexOf(jiangInfo.wuXing);
  const gIdx = order.indexOf(gongWx);
  if (jIdx === (gIdx + 1) % 5) return "吉"; // 生
  if (jIdx === gIdx) return "平"; // 比和
  if (jIdx === (gIdx + 2) % 5) return "平"; // 克
  if (gIdx === (jIdx + 1) % 5) return "凶"; // 被生
  if (gIdx === (jIdx + 2) % 5) return "凶"; // 被克
  return "平";
}

/** 综合神煞计算（《大六壬大全·神煞篇》） */
function buildShenShaList(
  riGan: string, riZhi: string, yearZhi: string, monthZhi: string,
  tianPan: string[], sanChuan: SanChuanResult, kongWang: string[], dunGan: { zhi: string; gan: string }[],
  _tianJiangOnGong: Record<string, string>,
): { name: string; zhi: string; type: string; description: string; source: string }[] {
  const result: { name: string; zhi: string; type: string; description: string; source: string }[] = [];

  // ── 干煞 ──
  const riLu = GAN_LU[riGan];
  if (riLu) result.push({ name:"日禄", zhi:riLu, type:"ji", description:`日干${riGan}禄在${riLu}，主财运俸禄。`, source:"《大六壬大全》卷四" });

  const riMu = GAN_MU[riGan];
  if (riMu) result.push({ name:"日墓", zhi:riMu, type:"xiong", description:`日干${riGan}墓在${riMu}，主困顿不明，宜韬光养晦。`, source:"《大六壬大全》卷四" });

  // 日干合神
  const heGan = GAN_WU_HE[riGan];
  if (heGan) {
    const heZhi = JI_GONG[heGan];
    if (heZhi) result.push({ name:"日合", zhi:heZhi, type:"ji", description:`日干${riGan}合${heGan}（寄${heZhi}），主婚姻和合、合作顺利。`, source:"《大六壬指南》" });
  }

  // ── 支煞 ──
  const yiMa = getYiMa(riZhi);
  result.push({ name:"驿马", zhi:yiMa, type:"ji", description:`日支${riZhi}驿马在${yiMa}，主动变、出行、迁移。`, source:"《大六壬大全》卷四" });

  const taoHua = getTaoHua(riZhi);
  result.push({ name:"桃花", zhi:taoHua, type:"平", description:`日支${riZhi}桃花在${taoHua}，主感情姻缘、人缘社交，亦防酒色。`, source:"《大六壬大全》卷四" });

  const jieSha = getJieSha(riZhi);
  result.push({ name:"劫煞", zhi:jieSha, type:"xiong", description:`日支${riZhi}劫煞在${jieSha}，主破财失物、意外损失。`, source:"《大六壬大全》卷四" });

  const zaiSha = getZaiSha(riZhi);
  result.push({ name:"灾煞", zhi:zaiSha, type:"xiong", description:`日支${riZhi}灾煞在${zaiSha}，主疾病灾祸、飞来横祸。`, source:"《大六壬大全》卷四" });

  // 日德
  const riDeZhi = JI_GONG[riGan]; // 日德常在寄宫
  if (riDeZhi) result.push({ name:"日德", zhi:riDeZhi, type:"ji", description:`日干${riGan}德在${riDeZhi}，德星所在主有福报、贵人扶持。`, source:"《大六壬大全》卷四" });

  // 支刑
  const riXing = XING[riZhi];
  if (riXing && riXing !== riZhi) result.push({ name:"日刑", zhi:riXing, type:"xiong", description:`日支${riZhi}刑${riXing}，主纠纷冲突、官非口舌。`, source:"《大六壬大全》卷四" });

  // 支合（六合）
  const liuHeMap: Record<string, string> = { "子":"丑","丑":"子","寅":"亥","亥":"寅","卯":"戌","戌":"卯","辰":"酉","酉":"辰","巳":"申","申":"巳","午":"未","未":"午" };
  const riHe = liuHeMap[riZhi];
  if (riHe) result.push({ name:"支合", zhi:riHe, type:"ji", description:`日支${riZhi}合${riHe}，主和合助力、合作顺利。`, source:"《大六壬大全》" });

  // ── 三传神煞 ──
  const chuanZhis = [sanChuan.chu.zhi, sanChuan.zhong.zhi, sanChuan.mo.zhi];

  // 三传遇空亡
  for (const zhi of chuanZhis) {
    if (kongWang.includes(zhi)) {
      result.push({ name:"传空", zhi:zhi, type:"xiong", description:`三传${zhi}落空亡，事多虚而不实、有名无实。`, source:"《大六壬大全》" });
    }
  }

  // 初传为日禄
  if (sanChuan.chu.zhi === riLu) result.push({ name:"初传日禄", zhi:sanChuan.chu.zhi, type:"ji", description:"初传为日禄，求财得财，求官得禄。", source:"《六壬断案》" });
  // 初传为驿马
  if (sanChuan.chu.zhi === yiMa) result.push({ name:"初传驿马", zhi:sanChuan.chu.zhi, type:"ji", description:"初传为驿马，出行变动在即，宜顺势而动。", source:"《六壬断案》" });
  // 初传为日墓
  if (sanChuan.chu.zhi === riMu) result.push({ name:"初传日墓", zhi:sanChuan.chu.zhi, type:"xiong", description:"初传入墓，万事昏暗不明，宜守不宜攻。", source:"《六壬断案》" });

  // ── 岁煞 ──
  const suiPo = LIU_CHONG[yearZhi];
  if (suiPo) result.push({ name:"岁破", zhi:suiPo, type:"xiong", description:`太岁${yearZhi}之破在${suiPo}，岁破方忌动土修造。`, source:"《大六壬大全》卷五" });

  // ── 月煞 ──
  const yuePo = LIU_CHONG[monthZhi];
  if (yuePo) result.push({ name:"月破", zhi:yuePo, type:"xiong", description:`月建${monthZhi}之破在${yuePo}，月破方一事不宜。`, source:"《大六壬大全》卷五" });

  // ── 遁干相关 ──
  for (const dg of dunGan) {
    if (dg.zhi === sanChuan.chu.zhi) {
      const dgWx = GAN_WUXING[dg.gan];
      const riWx = GAN_WUXING[riGan];
      if (dgWx && riWx && dgWx !== riWx) {
        // 天干五合检查
        if (GAN_WU_HE[dg.gan] === riGan) {
          result.push({ name:"遁干合日", zhi:dg.zhi, type:"ji", description:`初传遁干${dg.gan}合日干${riGan}，主暗中有贵人相助。`, source:"《大六壬指南》" });
        }
      }
      break;
    }
  }

  return result;
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

  // 年命（本命地支）
  const nianGanZhiBaseYear = 1984;
  const nianDiff = birthYear - nianGanZhiBaseYear;
  let nianIdx = nianDiff % 60;
  if (nianIdx < 0) nianIdx += 60;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nianMingZhi = DI_ZHI[nianIdx % 12];

  // 太岁（流年）和月建
  const currentYear = d.getFullYear();
  const taiSuiIdx = (currentYear - 4) % 12;
  const yearZhi = DI_ZHI[taiSuiIdx >= 0 ? taiSuiIdx : taiSuiIdx + 12];
  const monthZhi = DI_ZHI[(d.getMonth() + 1 - 1 + 2) % 12]; // 农历月支近似

  // 天将临十二宫映射
  const tianJiangOnGong: Record<string, string> = {};
  for (const tj of tianJiangLayoutResult) {
    tianJiangOnGong[tj.zhi] = tj.tianJiang;
  }

  // 综合神煞
  const shenShaList = buildShenShaList(
    riGan, riZhi, yearZhi, monthZhi,
    tianPan, sanChuan, kongWang, dunGan, tianJiangOnGong,
  );

  // 年命行年（nianIdx 已在上方神煞计算前算出）
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

  // ── 增强断语 ──
  const jiShenCount = shenShaList.filter(s => s.type === "ji").length;
  const xiongShenCount = shenShaList.filter(s => s.type === "xiong").length;

  // 初传天将
  const chuTianJiang = tianJiangOnGong[sanChuan.chu.zhi] ?? "贵人";
  const chuJiangInfo = TIAN_JIANG_XIANG[chuTianJiang];

  // 干支上天将
  const ganShangTianJiang = tianJiangOnGong[siKe[0].shangZhi] ?? "贵人";
  const zhiShangTianJiang = tianJiangOnGong[siKe[2].shangZhi] ?? "贵人";

  const duanYuParts = [
    `日柱${riGanZhi}，月将${yueJiang.name}（${yueJiang.zhi}）加时${zhanShiZhi}。`,
    `贵人${guiRenZhi}${guiShunNi}排十二天将。`,
    `四课：干上${siKe[0].shangZhi}（临${ganShangTianJiang}），支上${siKe[2].shangZhi}（临${zhiShangTianJiang}）。`,
    `宗门${sanChuan.zongMen}：${sanChuan.zongMenDesc}`,
    `三传：初传${sanChuan.chu.zhi}（临${chuTianJiang}）→中传${sanChuan.zhong.zhi}→末传${sanChuan.mo.zhi}。`,
    `空亡${kongWang.join("、")}。`,
    jiShenCount > xiongShenCount ? "吉神多现，所谋有望。" : xiongShenCount > jiShenCount ? "凶神多见，宜谨慎行事。" : "吉凶互见，须详察课传。",
    chuJiangInfo ? `初传天将${chuTianJiang}：${chuJiangInfo.duanYu}` : "",
  ].filter(Boolean).join("");

  // 课经匹配（基于宗门和特征）
  const keJingList: { name: string; number: number; summary: string; biFaFu: string[] }[] = [
    { name: sanChuan.zongMen === "昴星" ? "昴星课" : `${sanChuan.zongMen}课`, number: 1, summary: sanChuan.zongMenDesc, biFaFu: [] },
  ];

  // 附加课经匹配
  const ganShenJiXiong = tianJiangJiXiongAtGong(ganShangTianJiang, siKe[0].shangZhi);
  const zhiShenJiXiong = tianJiangJiXiongAtGong(zhiShangTianJiang, siKe[2].shangZhi);

  if (ganShenJiXiong === "吉" && zhiShenJiXiong === "吉") {
    keJingList.push({ name:"亨通课", number:2, summary:"干上支上天将皆吉，万事亨通之象。", biFaFu:["宜主动进取","宜签约合作"] });
  }
  if (sanChuan.chu.zhi === kongWang[0] || sanChuan.chu.zhi === kongWang[1]) {
    keJingList.push({ name:"空亡课", number:3, summary:"初传落空亡，事多虚而不实。《六壬大全》：'空亡发用，有名无实。'", biFaFu:["宜守不宜攻","重大决策暂缓"] });
  }

  // ── box-drawing 结构化总结 ──
  const jiShaCount = shenShaList.filter(s => s.type === "ji").length;
  const xiongShaCount = shenShaList.filter(s => s.type === "xiong").length;
  const pingShaCount = shenShaList.filter(s => s.type === "平").length;
  const chuJiangName = tianJiangOnGong[sanChuan.chu.zhi] ?? "贵人";
  const zhongJiangName = tianJiangOnGong[sanChuan.zhong.zhi] ?? "贵人";
  const moJiangName = tianJiangOnGong[sanChuan.mo.zhi] ?? "贵人";
  const scoreBar = "●".repeat(Math.min(jiShaCount, 20)) + "○".repeat(Math.max(0, Math.min(xiongShaCount, 10)));

  const summary = [
    `┌─ 大六壬排盘 ─────────────────`,
    `│ ${dateStr} ${dayNight}占 月将：${yueJiang.name}（${yueJiang.zhi}） 加时：${zhanShiZhi}`,
    `│ 日柱：${riGanZhi}（${riGanWuXing}命） 节气：${jieQiInfo.name}`,
    `│ 吉神${jiShaCount} · 凶煞${xiongShaCount} · 平${pingShaCount} ${scoreBar}`,
    `│`,
    `├─ 宗门 · 三传 ──────────────`,
    `│ 宗门：${sanChuan.zongMen} — ${sanChuan.zongMenDesc}`,
    `│ 初传：${sanChuan.chu.zhi}（临${chuJiangName}）→ 中传：${sanChuan.zhong.zhi}（临${zhongJiangName}）→ 末传：${sanChuan.mo.zhi}（临${moJiangName}）`,
    `│`,
    `├─ 贵人 · 天将 ──────────────`,
    `│ 贵人诀甲戊庚牛羊 贵神：${guiRenZhi} ${guiShunNi}排`,
    `│ 昼夜：${dayNight}（${hour >= 6 && hour < 18 ? "卯酉分界，昼占顺行" : "卯酉分界，夜占逆行"}）`,
    `│`,
    `├─ 四课 ────────────────────`,
    `│ 干阳：${siKe[0].shangZhi}（临${ganShangTianJiang}） 干阴：${siKe[1].shangZhi}`,
    `│ 支阳：${siKe[2].shangZhi}（临${zhiShangTianJiang}） 支阴：${siKe[3].shangZhi}`,
    `│`,
    `├─ 神煞 ────────────────────`,
    ...shenShaList.slice(0, 8).map(s => `│ ${s.type === "ji" ? "○" : s.type === "xiong" ? "△" : "·"} ${s.name.padEnd(6, " ")} ${s.zhi.padEnd(2, " ")} ${s.description}`),
    ...(shenShaList.length > 8 ? [`│ ... 共${shenShaList.length}个神煞`] : []),
    `│`,
    `├─ 课经 ────────────────────`,
    ...keJingList.map(k => `│ ${k.name}：${k.summary}`),
    `│`,
    `├─ 空亡 · 年命 · 行年 ────────`,
    `│ 空亡：${kongWang.join("、")} 年命：${TIAN_GAN[nianIdx % 10] + DI_ZHI[nianIdx % 12]}（${DI_ZHI[nianIdx % 12]}宫）`,
    `│ 太岁：${yearZhi} 月建：${monthZhi} 行年：${TIAN_GAN[(nianIdx + 1) % 10] + DI_ZHI[(nianIdx + 1) % 12]}（${DI_ZHI[(nianIdx + 1) % 12]}宫）`,
    `│`,
    `├─ 古籍出处 ──────────────────`,
    `│ 《大六壬大全》明·郭载騋，十二卷·六壬最详备之典`,
    `│ 《大六壬指南》明·陈公献，九宗门/课经/毕法赋`,
    `│ 《六壬断案》宋·邵彦和，三百余案例实战精华`,
    `│ 《六壬粹言》清·刘赤江，初学入门必读`,
    `│ 「月将者，太阳所躔之宫也」——六壬大全卷一`,
    `│`,
    `└─ 起课提示 ──────────────────`,
    `   ${sanChuan.zongMen === "伏吟" ? "伏吟主静，宜守不宜动，事多反复。" : sanChuan.zongMen === "返吟" ? "返吟主动，事多变数，出行在即。" : sanChuan.zongMen === "昴星" ? "昴星虎视，惊疑不定，宜沉着冷静。" : jiShaCount > xiongShaCount ? "吉神有力，所谋可成，顺势而为。" : "凶多吉少，宜守不宜攻，审时度势。"}`,
    `   ${kongWang.includes(sanChuan.chu.zhi) ? "初传空亡，有名无实，重大决策宜暂缓。" : "初传不空，课传有力，当机立断。"}`,
    `   ${chuJiangInfo ? `初传临${chuJiangName}：${chuJiangInfo.duanYu.substring(0, 40)}` : ""}`,
    `   日禄${GAN_LU[riGan] || "—"} 日墓${GAN_MU[riGan] || "—"} 驿马${getYiMa(riZhi)} 桃花${getTaoHua(riZhi)}`,
  ].join("\n");

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
    keJing: keJingList as any,
    shenSha: shenShaList as any,
    kongWang: kongWang as any,
    nianMing: { ganZhi: TIAN_GAN[nianIdx % 10] + DI_ZHI[nianIdx % 12], gongWei: DI_ZHI[nianIdx % 12] as any },
    xingNian: { ganZhi: TIAN_GAN[(nianIdx + 1) % 10] + DI_ZHI[(nianIdx + 1) % 12], gongWei: DI_ZHI[(nianIdx + 1) % 12] as any },
    dunGanTable: dunGan as any,
    liuQinTable: liuQinTable as any,
    duanYu: duanYuParts,
    summary,
  } as DaLiuRenResult & { summary: string };
}
