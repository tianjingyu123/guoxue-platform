// ── 七政四余计算引擎 ──
// 十一曜位置/十二宫/二十八宿/星曜相位/大限
// 基于 sweph (Swiss Ephemeris) 真实天文星历

import type { QiZhengResult, AllStar, ShiErGong, StarState, StarPosition, GongInfo, DaXian } from "@guoxue/shared";
import * as sweph from "sweph";

const STARS_11: AllStar[] = [
  "太阳","太阴","金星","木星","水星","火星","土星","紫气","月孛","罗睺","计都",
];
const GONG_12: ShiErGong[] = [
  "命宫","财帛","兄弟","田宅","男女","奴仆","夫妻","疾厄","迁移","官禄","福德","相貌",
];
const XIU_28: string[] = [
  "角","亢","氐","房","心","尾","箕","斗","牛","女","虚","危","室","壁",
  "奎","娄","胃","昴","毕","觜","参","井","鬼","柳","星","张","翼","轸",
];
const XIU_WIDTHS = [12, 9, 15, 5, 5, 18, 11, 26, 8, 12, 9, 16, 17, 8, 16, 11, 15, 12, 16, 2, 9, 30, 4, 14, 7, 17, 20, 10];

// sweph planet IDs: 0=Sun, 1=Moon, 2=Mercury, 3=Venus, 4=Mars, 5=Jupiter, 6=Saturn
// 10=mean node, 11=true node, 12=mean apog
const SWEPH_ID: Record<string, number> = {
  "太阳": 0, "太阴": 1, "水星": 2, "金星": 3, "火星": 4, "木星": 5, "土星": 6,
};

// 十二地支对应黄经区间
const ZHI_ECLIPTIC = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 庙旺平陷规则：每个行星在各地支区间的状态
const MIAO_WANG: Record<string, Record<string, StarState>> = {
  "太阳": { "午":"庙", "巳":"旺", "子":"陷", "丑":"陷" },
  "太阴": { "未":"庙", "酉":"旺", "戌":"旺", "亥":"旺", "卯":"陷" },
  "木星": { "寅":"庙", "亥":"庙", "卯":"旺", "申":"陷", "巳":"陷" },
  "火星": { "卯":"庙", "戌":"庙", "巳":"旺", "丑":"陷" },
  "土星": { "子":"庙", "丑":"庙", "辰":"旺", "寅":"陷" },
  "金星": { "辰":"庙", "申":"旺", "卯":"陷", "戌":"陷" },
  "水星": { "巳":"庙", "申":"庙", "亥":"旺", "寅":"陷" },
};

/** 黄经→地支索引 (0-11) */
function eclipticToZhi(deg: number): number {
  return Math.floor(((deg % 360 + 360) % 360) / 30);
}

/** 黄经→地支名 */
function eclipticToZhiName(deg: number): string {
  return ZHI_ECLIPTIC[eclipticToZhi(deg)];
}

/** 黄经→二十八宿 */
function eclipticToXiu(deg: number): { xiu: string; xiuDu: number } {
  let d = ((deg % 360) + 360) % 360;
  let accum = 0;
  for (let i = 0; i < 28; i++) {
    accum += XIU_WIDTHS[i];
    if (d < accum) {
      const xiuDeg = Math.round(d - (accum - XIU_WIDTHS[i]) + 1);
      return { xiu: XIU_28[i], xiuDu: xiuDeg > 0 ? xiuDeg : 1 };
    }
  }
  return { xiu: XIU_28[0], xiuDu: 1 };
}

/** 获取星曜的庙旺平陷状态 */
function getStarState(starName: string, eclipticDeg: number): StarState {
  const zhi = eclipticToZhiName(eclipticDeg);
  const rules = MIAO_WANG[starName];
  if (rules && rules[zhi]) return rules[zhi];
  // 检查是否为利（与庙五行相生的地支）
  return "平";
}

/** 判断星曜顺逆行（基于速度符号） */
function getDirection(speedLong: number): "顺" | "逆" | "留" | "伏" {
  if (Math.abs(speedLong) < 0.001) return "留";
  return speedLong > 0 ? "顺" : "逆";
}

/** 计算十一曜真实位置 */
function calcRealPositions(jd: number, sunDeg: number): StarPosition[] {
  const results: StarPosition[] = [];

  // 七曜：通过 sweph 获取
  for (const star of STARS_11.slice(0, 7)) {
    const pid = SWEPH_ID[star];
    if (pid === undefined) {
      results.push({ star, gong: "命宫", xiu: "角" as any, xiuDu: 1, eclipticDeg: 0, state: "平", direction: "顺" });
      continue;
    }
    const calc = sweph.calc(jd, pid, 258);
    const [longitude, , , speedLong] = calc.data;
    const deg = ((longitude % 360) + 360) % 360;
    const { xiu, xiuDu } = eclipticToXiu(deg);
    const gongIdx = Math.floor(deg / 30);
    const sunDist = star === "太阳" ? undefined : Math.round(Math.abs(deg - sunDeg) * 10) / 10;

    results.push({
      star,
      gong: GONG_12[gongIdx],
      xiu: xiu as any,
      xiuDu,
      eclipticDeg: Math.round(deg * 10) / 10,
      state: getStarState(star, deg),
      direction: getDirection(speedLong),
      sunDistance: sunDist,
    });
  }

  // 四余：从月轨参数推导
  // 罗睺 = 真升交点 (true node, planet 11)
  const nodeCalc = sweph.calc(jd, 11, 258);
  const nodeDeg = ((nodeCalc.data[0] % 360) + 360) % 360;

  // 月孛 = 平均远地点 (mean apogee, planet 12)
  const apogCalc = sweph.calc(jd, 12, 258);
  const apogDeg = ((apogCalc.data[0] % 360) + 360) % 360;

  // 计都 = 罗睺对宫 (南交点)
  const ketuDeg = (nodeDeg + 180) % 360;

  // 紫气 = 月孛对宫 (近地点，即紫气)
  const ziqiDeg = (apogDeg + 180) % 360;

  const siYuData: [string, number][] = [
    ["罗睺", nodeDeg], ["计都", ketuDeg], ["月孛", apogDeg], ["紫气", ziqiDeg],
  ];

  for (const [name, deg] of siYuData) {
    const sunDist = Math.round(Math.abs(deg - sunDeg) * 10) / 10;
    const { xiu, xiuDu } = eclipticToXiu(deg);
    const gongIdx = Math.floor(deg / 30);
    results.push({
      star: name as AllStar,
      gong: GONG_12[gongIdx],
      xiu: xiu as any,
      xiuDu,
      eclipticDeg: Math.round(deg * 10) / 10,
      state: getStarState(name, deg),
      direction: "顺",
      sunDistance: sunDist,
    });
  }

  return results;
}

/** 计算十二宫信息 */
function calcGongs(starPositions: StarPosition[]): GongInfo[] {
  return GONG_12.map((name, i) => {
    const ruler = STARS_11[i % 11];
    const starsInGong = starPositions.filter(sp => sp.gong === name).map(sp => sp.star);
    const degStart = i * 30;
    const { xiu: startXiu } = eclipticToXiu(degStart);
    let renShi: string;
    if (starsInGong.length >= 3) renShi = "此宫多星汇聚，格局复杂，人事起伏较大。";
    else if (starsInGong.length === 2) renShi = "此宫双星交辉，相关领域需细辩吉凶。";
    else if (starsInGong.length === 1) renShi = "此宫有星，吉凶随星而变。";
    else renShi = "此宫空乏，相关领域平淡自然。";
    return { name, ruler, stars: starsInGong.length ? starsInGong : [], startXiu, renShi };
  });
}

/** 计算星曜相位（真实角距离） */
function calcAspects(starPositions: StarPosition[]): QiZhengResult["aspects"] {
  const aspects: QiZhengResult["aspects"] = [];
  const aspectTypes: { name: "合" | "刑" | "冲" | "拱"; range: [number, number] }[] = [
    { name: "合", range: [0, 10] },
    { name: "拱", range: [115, 125] },
    { name: "刑", range: [85, 95] },
    { name: "冲", range: [175, 185] },
  ];

  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 11; j++) {
      const degDiff = Math.abs(starPositions[i].eclipticDeg - starPositions[j].eclipticDeg);
      const normalizedDiff = Math.min(degDiff, 360 - degDiff);
      for (const at of aspectTypes) {
        if (normalizedDiff >= at.range[0] && normalizedDiff <= at.range[1]) {
          aspects.push({
            star1: STARS_11[i], star2: STARS_11[j],
            type: at.name,
            degree: Math.round(normalizedDiff),
            desc: `${STARS_11[i]}${at.name}${STARS_11[j]}（距${Math.round(normalizedDiff)}°）`,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

/** 计算大限（果老星宗） */
function calcDaXian(mingGongIdx: number, gender: string, system: string): DaXian[] {
  const isMale = gender === "male" || gender === "男";
  const direction = isMale ? 1 : -1; // 男顺女逆
  const daXian: DaXian[] = [];
  const ages = system === "guolao"
    ? [1, 11, 21, 31, 41, 51, 61, 71, 81, 91, 101, 111]
    : [1, 10, 19, 28, 37, 46, 55, 64, 73, 82, 91, 100];

  for (let i = 0; i < 12; i++) {
    const gongIdx = ((mingGongIdx + i * direction) % 12 + 12) % 12;
    const startAge = ages[i];
    const endAge = i < 11 ? ages[i + 1] - 1 : 120;
    daXian.push({
      startAge, endAge,
      gong: GONG_12[gongIdx],
      stars: [STARS_11[gongIdx % 11]],
      desc: `${GONG_12[gongIdx]}大限（${startAge}-${endAge}岁），运主${STARS_11[gongIdx % 11]}。`,
    });
  }
  return daXian;
}

/** 主计算函数 */
export function calculateQiZheng(input: Record<string, unknown>): QiZhengResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const longitude = input.longitude as number | undefined;
  const latitude = input.latitude as number | undefined;
  const gender = (input.gender as string) ?? "male";
  const trueSolar = input.trueSolar as boolean ?? false;
  const system = (input.system as string) ?? "guolao";

  const d = new Date(datetime);
  // 使用 sweph julday 计算精确儒略日
  const jd = sweph.julday(
    d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(),
    d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600,
    1, // Gregorian calendar
  );

  // 计算真实星曜位置
  const sunCalc = sweph.calc(jd, 0, 258);
  const sunDeg = ((sunCalc.data[0] % 360) + 360) % 360;

  const starPositions = calcRealPositions(jd, sunDeg);

  // 命宫 = 太阳所在宫位（果老星宗基本法则）
  const mingGongIdx = Math.floor(sunDeg / 30);
  const shenGongIdx = (mingGongIdx + 6) % 12; // 身宫 = 命宫对宫

  const gongs = calcGongs(starPositions);
  const aspects = calcAspects(starPositions);
  const daXian = calcDaXian(mingGongIdx, gender, system);

  // 格局判断
  const geJu: QiZhengResult["geJu"] = [];
  const gongWithStars = gongs.filter(g => g.stars.length >= 2);
  if (gongWithStars.length >= 4) {
    geJu.push({ name: "群星荟萃", stars: gongWithStars.flatMap(g => g.stars), desc: "多宫星曜汇聚，格局复杂多变，人生经历丰富。", jiXiong: "吉" });
  }
  // 日月合璧检测
  const sunGong = starPositions[0].gong;
  const moonGong = starPositions[1].gong;
  if (sunGong === moonGong || Math.abs(GONG_12.indexOf(sunGong) - GONG_12.indexOf(moonGong)) <= 1) {
    geJu.push({ name: "日月合璧", stars: ["太阳","太阴"], desc: "日月相近，光明照临，主贵气。", jiXiong: "吉" });
  }

  const duanYu = `七政四余果老星宗（基于Swiss Ephemeris天文星历）。命宫${GONG_12[mingGongIdx]}，身宫${GONG_12[shenGongIdx]}，命主星${STARS_11[mingGongIdx % 11]}。十一曜分布于十二宫，${gongs.filter(g => g.stars.length >= 2).length}宫有双星以上汇聚。`;

  return {
    input: { datetime, longitude, latitude, gender: gender as any, trueSolar, system: system as any },
    basicInfo: {
      mingGong: GONG_12[mingGongIdx],
      shenGong: GONG_12[shenGongIdx],
      mingZhu: STARS_11[mingGongIdx % 11],
      shenZhu: STARS_11[shenGongIdx % 11],
      riZhuXiu: starPositions[0].xiu,
      system,
    },
    starPositions,
    gongs,
    aspects,
    daXian,
    liuNian: { year: d.getFullYear(), transits: starPositions.slice(0, 5).map(sp => ({ star: sp.star, gong: sp.gong, desc: `${sp.star}入${sp.gong}宫（${sp.state}）` })) },
    geJu,
    duanYu,
  };
}
