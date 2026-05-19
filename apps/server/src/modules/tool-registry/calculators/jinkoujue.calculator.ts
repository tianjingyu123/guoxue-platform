// ── 金口诀计算引擎 ──
// 四位课/用爻/五动/三动/干元关系/纳音/神煞

import type {
  JinKouJueInput,
  JinKouJueResult,
  DiFenMethod,
  WuDongType,
  SanDongType,
  SiWeiKe,
  YongYao,
  WuDong,
  SanDong,
} from "@guoxue/shared";
import { calcRiZhu } from "@guoxue/bazi-engine";

const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

const YUE_JIANG = [
  { name:"神后", zhi:"子" },{ name:"大吉", zhi:"丑" },{ name:"功曹", zhi:"寅" },
  { name:"太冲", zhi:"卯" },{ name:"天罡", zhi:"辰" },{ name:"太乙", zhi:"巳" },
  { name:"胜光", zhi:"午" },{ name:"小吉", zhi:"未" },{ name:"传送", zhi:"申" },
  { name:"从魁", zhi:"酉" },{ name:"河魁", zhi:"戌" },{ name:"登明", zhi:"亥" },
];

const GUI_SHEN = [
  { name:"贵人", ganZhi:"己丑", wuXing:"土", xu:0 },
  { name:"螣蛇", ganZhi:"丁巳", wuXing:"火", xu:1 },
  { name:"朱雀", ganZhi:"丙午", wuXing:"火", xu:2 },
  { name:"六合", ganZhi:"乙卯", wuXing:"木", xu:3 },
  { name:"勾陈", ganZhi:"戊辰", wuXing:"土", xu:4 },
  { name:"青龙", ganZhi:"甲寅", wuXing:"木", xu:5 },
  { name:"天空", ganZhi:"戊戌", wuXing:"土", xu:6 },
  { name:"白虎", ganZhi:"庚申", wuXing:"金", xu:7 },
  { name:"太常", ganZhi:"己未", wuXing:"土", xu:8 },
  { name:"玄武", ganZhi:"壬子", wuXing:"水", xu:9 },
  { name:"太阴", ganZhi:"辛酉", wuXing:"金", xu:10 },
  { name:"天后", ganZhi:"癸亥", wuXing:"水", xu:11 },
];

const ZHI_WUXING: Record<string, string> = {
  "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火",
  "午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水",
};

const ZHI_DIRECTION: Record<string, string> = {
  "子":"正北","丑":"东北","寅":"东北","卯":"正东","辰":"东南","巳":"东南",
  "午":"正南","未":"西南","申":"西南","酉":"正西","戌":"西北","亥":"西北",
};

const ZHI_SANHE: Record<string, string> = {
  "子":"申子辰水局","丑":"巳酉丑金局","寅":"寅午戌火局","卯":"亥卯未木局",
  "辰":"申子辰水局","巳":"巳酉丑金局","午":"寅午戌火局","未":"亥卯未木局",
  "申":"申子辰水局","酉":"巳酉丑金局","戌":"寅午戌火局","亥":"亥卯未木局",
};

// 60甲子纳音
const NA_YIN: Record<string, string> = {
  "甲子":"海中金","乙丑":"海中金","丙寅":"炉中火","丁卯":"炉中火","戊辰":"大林木","己巳":"大林木",
  "庚午":"路旁土","辛未":"路旁土","壬申":"剑锋金","癸酉":"剑锋金","甲戌":"山头火","乙亥":"山头火",
  "丙子":"涧下水","丁丑":"涧下水","戊寅":"城头土","己卯":"城头土","庚辰":"白蜡金","辛巳":"白蜡金",
  "壬午":"杨柳木","癸未":"杨柳木","甲申":"泉中水","乙酉":"泉中水","丙戌":"屋上土","丁亥":"屋上土",
  "戊子":"霹雳火","己丑":"霹雳火","庚寅":"松柏木","辛卯":"松柏木","壬辰":"长流水","癸巳":"长流水",
  "甲午":"沙中金","乙未":"沙中金","丙申":"山下火","丁酉":"山下火","戊戌":"平地木","己亥":"平地木",
  "庚子":"壁上土","辛丑":"壁上土","壬寅":"金箔金","癸卯":"金箔金","甲辰":"覆灯火","乙巳":"覆灯火",
  "丙午":"天河水","丁未":"天河水","戊申":"大驿土","己酉":"大驿土","庚戌":"钗钏金","辛亥":"钗钏金",
  "壬子":"桑柘木","癸丑":"桑柘木","甲寅":"大溪水","乙卯":"大溪水","丙辰":"沙中土","丁巳":"沙中土",
  "戊午":"天上火","己未":"天上火","庚申":"石榴木","辛酉":"石榴木","壬戌":"大海水","癸亥":"大海水",
};

// 天干五合: heGan[A] = B
const GAN_HE: Record<string, string> = { "甲":"己","乙":"庚","丙":"辛","丁":"壬","戊":"癸","己":"甲","庚":"乙","辛":"丙","壬":"丁","癸":"戊" };



// 贵人诀
const GUI_REN_JUE: Record<string, { yang: string; yin: string }> = {
  "甲":{yang:"丑",yin:"未"},"戊":{yang:"丑",yin:"未"},"庚":{yang:"丑",yin:"未"},
  "乙":{yang:"子",yin:"申"},"己":{yang:"子",yin:"申"},
  "丙":{yang:"亥",yin:"酉"},"丁":{yang:"亥",yin:"酉"},
  "壬":{yang:"卯",yin:"巳"},"癸":{yang:"卯",yin:"巳"},
  "辛":{yang:"午",yin:"寅"},
};

/** 日干支 */
function dayGanZhi(year: number, month: number, day: number): string {
  const rz = calcRiZhu(year, month, day);
  return rz.gan + rz.zhi;
}

/** 人元：地分上遁干（五鼠遁） */
function renYuan(diFenZhi: string, riGan: string): string {
  const ganIdx = TIAN_GAN.indexOf(riGan);
  const baseGan = [0,2,4,6,8][Math.floor(ganIdx / 2)];
  const zhiIdx = DI_ZHI.indexOf(diFenZhi);
  return TIAN_GAN[(baseGan + zhiIdx) % 10];
}

/** 五行生克关系 */
function shengKe(a: string, b: string): string {
  const order = ["木","火","土","金","水"];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai === bi) return "比和";
  if ((ai + 1) % 5 === bi) return "生";
  if ((ai + 2) % 5 === bi) return "克";
  if ((ai + 3) % 5 === bi) return "被生";
  return "被克";
}

/** 旺相休囚死 */
function wangShuai(wuXing: string, month: number): "旺" | "相" | "休" | "囚" | "死" {
  const seasonMap: Record<string, string[]> = {
    "春":["木","火","水","金","土"],
    "夏":["火","土","木","水","金"],
    "秋":["金","水","土","火","木"],
    "冬":["水","木","金","土","火"],
  };
  const season = month <= 3 ? "春" : month <= 6 ? "夏" : month <= 9 ? "秋" : "冬";
  const order = seasonMap[season]!;
  const idx = order.indexOf(wuXing);
  return (["旺","相","休","囚","死"] as const)[idx] ?? "休";
}

/** 纳音查询 */
function getNaYin(ganZhi: string): string {
  return NA_YIN[ganZhi] ?? "未知";
}

/** 贵神顺逆排序：阳贵顺排(递增)，阴贵逆排(递减) */
function getGuiShenOrder(guiRenZhi: string, isDay: boolean): { name: string; ganZhi: string; wuXing: string }[] {
  const startIdx = DI_ZHI.indexOf(guiRenZhi);
  const result: { name: string; ganZhi: string; wuXing: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const offset = isDay ? i : (12 - i) % 12;
    const zhi = DI_ZHI[(startIdx + offset) % 12];
    const shen = GUI_SHEN.find(gs => gs.ganZhi[1] === zhi);
    if (shen) result.push(shen);
    else result.push({ name: `神${zhi}`, ganZhi: `??${zhi}`, wuXing: ZHI_WUXING[zhi] ?? "土" });
  }
  return result;
}

/** 生成五动（基于生克表动态推导） */
function buildWuDong(sk: Record<string, string>, _diFenZhi: string, _jiangShenZhi: string, _guiShenName: string, _renYuanGan: string): WuDong[] {
  const result: WuDong[] = [];

  // 将克神 → 财动
  if (sk.shenJiang === "克") result.push({ type:"jiang-ke-shen" as WuDongType, name:"将克神", layers:["月将","贵神"], desc:"月将克贵神，主财帛变动，得财之象。", duanYu:"财动，求财有望，但须防反复。" });
  // 干克方 → 官动
  if (sk.ganFang === "克") result.push({ type:"gan-ke-fang" as WuDongType, name:"干克方", layers:["人元","地分"], desc:"人元克地分，主官事、权威、事业变动。", duanYu:"官动，宜争取上进，但谨防官非。" });
  // 方克干 → 鬼动
  if (sk.ganFang === "被克") result.push({ type:"fang-ke-gan" as WuDongType, name:"方克干", layers:["地分","人元"], desc:"地分克人元，主口舌是非、暗算伤害。", duanYu:"鬼动，须防小人暗算，口舌是非。" });
  // 神克将 → 贼动
  if (sk.shenJiang === "被克") result.push({ type:"shen-ke-jiang" as WuDongType, name:"神克将", layers:["贵神","月将"], desc:"贵神克月将，主盗贼、损财、意外之灾。", duanYu:"贼动，防盗贼失财，注意安全。" });
  // 干生方 → 妻动
  if (sk.ganFang === "生") result.push({ type:"gan-sheng-fang" as WuDongType, name:"干生方", layers:["人元","地分"], desc:"人元生地分，主食禄利财，妻妾之事。", duanYu:"妻动，利求财婚嫁，家事和顺。" });
  // 方生干 → 父母动
  if (sk.ganFang === "被生") result.push({ type:"fang-sheng-gan" as WuDongType, name:"方生干", layers:["地分","人元"], desc:"地分生人元，主父母、文书、庇护之事。", duanYu:"父母动，宜尽孝道，文书之事可成。" });

  if (result.length === 0) {
    result.push({ type:"tong-lei" as WuDongType, name:"平和", layers:["人元","地分"] as [string, string], desc:"四位无严重冲克，主事态平稳。", duanYu:"诸事平稳，依常理行事即可。" });
  }
  return result;
}

/** 生成三动 */
function buildSanDong(sk: Record<string, string>, _diFenZhi: string): SanDong[] {
  const result: SanDong[] = [];

  if (sk.ganFang === "生") result.push({ type:"qi-mou" as SanDongType, name:"妻动", layers:["人元","地分"], desc:"人元生地分，主妻妾之事、财物入宅。", duanYu:"妻妾之事，或有进财之喜。" });
  if (sk.ganFang === "被克") result.push({ type:"zei-dong" as SanDongType, name:"贼动", layers:["地分","人元"], desc:"地分克人元，主外贼侵入、暗中受损。", duanYu:"防盗贼，防暗中损害。" });
  if (sk.shenJiang === "克") result.push({ type:"cai-dong" as SanDongType, name:"财动", layers:["月将","贵神"], desc:"月将克贵神，主财帛流动，进财之象。", duanYu:"财帛主动，宜把握进财时机。" });
  if (sk.ganFang === "克") result.push({ type:"guan-dong" as SanDongType, name:"官动", layers:["人元","地分"], desc:"人元克地分，主官事、职权变化。", duanYu:"官事主动，注意职场动向。" });
  if (sk.shenJiang === "被克") result.push({ type:"gui-dong" as SanDongType, name:"鬼动", layers:["贵神","月将"], desc:"贵神克月将，主灾祸口舌。", duanYu:"须防口舌是非，小人暗算。" });

  if (result.length === 0) {
    result.push({ type:"qi-mou" as SanDongType, name:"安动", layers:["人元","地分"], desc:"四位平和，动静得宜。", duanYu:"安守本分，静待时机。" });
  }
  return result;
}

/** 计算干元关系 */
function buildGanYuan(renYuanGan: string, guiShenGanZhi: string, jiangShenZhi: string, diFenZhi: string) {
  const guiShenGan = guiShenGanZhi[0];
  const jiangGan = renYuan(jiangShenZhi, renYuanGan);

  const ganShenHe = GAN_HE[renYuanGan] === guiShenGan ? "合" : "无";
  const ganJiangHe = GAN_HE[renYuanGan] === jiangGan ? "合" : "无";
  const ganFangHe = GAN_HE[renYuanGan] === renYuan(diFenZhi, renYuanGan) ? "合" : "无";

  return { ganShenHe, ganJiangHe, ganFangHe };
}

/** 动态神煞 */
function buildShenSha(diFenZhi: string, guiShenZhi: string, jiangShenZhi: string, riGanZhi: string) {
  const result: { name: string; type: "ji" | "xiong"; layer: string; description: string }[] = [];
  const riZhi = riGanZhi[1];

  // 天德：正月丁、二月申...
  // 简化：日支三合局长生位为天德
  const tianDeZhi: Record<string, string> = { "申":"巳","子":"巳","辰":"巳","亥":"寅","卯":"寅","未":"寅","寅":"亥","午":"亥","戌":"亥","巳":"申","酉":"申","丑":"申" };
  const td = tianDeZhi[riZhi];
  if (td && (td === diFenZhi || td === guiShenZhi || td === jiangShenZhi)) {
    result.push({ name:"天德", type:"ji", layer: td === diFenZhi ? "地分" : td === guiShenZhi ? "贵神" : "月将", description:"天德所在，贵人扶助，逢凶化吉。" });
  }

  // 月德：以月将查
  const yueDeZhi: Record<string, string> = { "子":"巳","丑":"午","寅":"未","卯":"申","辰":"酉","巳":"戌","午":"亥","未":"子","申":"丑","酉":"寅","戌":"卯","亥":"辰" };
  const yd = yueDeZhi[jiangShenZhi];
  if (yd && (yd === diFenZhi || yd === guiShenZhi)) {
    result.push({ name:"月德", type:"ji", layer: yd === diFenZhi ? "地分" : "贵神", description:"月德照临，诸事顺遂。" });
  }

  // 驿马
  const maZhi: Record<string, string> = { "申":"寅","子":"寅","辰":"寅","亥":"巳","卯":"巳","未":"巳","寅":"申","午":"申","戌":"申","巳":"亥","酉":"亥","丑":"亥" };
  const ma = maZhi[riZhi];
  if (ma === diFenZhi) result.push({ name:"驿马", type:"ji", layer:"地分", description:"驿马发动，主奔波、远行、变动。" });

  // 劫煞
  const jieZhi: Record<string, string> = { "申":"巳","子":"巳","辰":"巳","亥":"申","卯":"申","未":"申","寅":"亥","午":"亥","戌":"亥","巳":"寅","酉":"寅","丑":"寅" };
  const js = jieZhi[riZhi];
  if (js && (js === diFenZhi || js === jiangShenZhi)) result.push({ name:"劫煞", type:"xiong", layer: js === diFenZhi ? "地分" : "月将", description:"劫煞临位，防财物损失、意外之灾。" });

  // 天喜
  const tianXi: Record<string, string> = { "子":"酉","丑":"申","寅":"未","卯":"午","辰":"巳","巳":"辰","午":"卯","未":"寅","申":"丑","酉":"子","戌":"亥","亥":"戌" };
  const tx = tianXi[riZhi];
  if (tx === diFenZhi || tx === guiShenZhi) result.push({ name:"天喜", type:"ji", layer: tx === diFenZhi ? "地分" : "贵神", description:"天喜照临，主婚嫁、添丁、喜庆之事。" });

  return result;
}

/** 主计算函数 */
export function calculateJinKouJue(input: JinKouJueInput): JinKouJueResult {
  const datetime = input.datetime ?? new Date().toISOString();
  const diFenInput = input.diFen ?? "子";
  const diFenMethod: DiFenMethod = input.diFenMethod ?? "select";

  const d = new Date(datetime);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const zhanShiZhi = DI_ZHI[Math.floor(hour / 2) % 12];
  const riGanZhi = dayGanZhi(year, month, day);
  const riGan = riGanZhi[0];
  const riZhi = riGanZhi[1];
  const isDay = hour >= 6 && hour < 18;

  // 地分
  let diFenZhi = diFenInput;
  if (diFenMethod === "random") {
    diFenZhi = DI_ZHI[Math.floor(Math.random() * 12)];
  } else if (diFenMethod === "baoshu") {
    const num = parseInt(diFenInput) || 1;
    diFenZhi = DI_ZHI[(num - 1) % 12];
  }

  // 月将（中气为界）
  const yueJiangIdx = (month - 1 + 1) % 12;
  const yueJiang = YUE_JIANG[yueJiangIdx];

  // 将神 = 月将加时到地分
  const zsIdx = DI_ZHI.indexOf(zhanShiZhi);
  const yjIdx = DI_ZHI.indexOf(yueJiang.zhi);
  const dfIdx = DI_ZHI.indexOf(diFenZhi);
  const jiangShenIdx = (yjIdx + dfIdx - zsIdx + 12) % 12;
  const jiangShenZhi = DI_ZHI[jiangShenIdx];

  // 贵神（贵人诀 + 昼夜顺逆）
  const guiRenJue = GUI_REN_JUE[riGan] ?? { yang: "丑", yin: "未" };
  const guiRenZhi = isDay ? guiRenJue.yang : guiRenJue.yin;
  const guiShenOrder = getGuiShenOrder(guiRenZhi, isDay);
  // 地分对应贵神序位
  const guiShenIdx = dfIdx % 12;
  const guiShen = guiShenOrder[guiShenIdx];

  // 人元
  const renYuanGan = renYuan(diFenZhi, riGan);
  const renYuanWx = ZHI_WUXING[diFenZhi];

  // 纳音
  const guiShenGanZhi = guiShen.ganZhi;
  const jiangShenGan = renYuan(jiangShenZhi, riGan);
  const jiangShenGanZhi = jiangShenGan + jiangShenZhi;

  // 五行
    const diFenWx = ZHI_WUXING[diFenZhi] ?? "土";
  const jiangShenWx = ZHI_WUXING[jiangShenZhi] ?? "土";
  const guiShenWx = guiShen.wuXing;

  // 生克表
  const shengKeTable = {
    ganFang: shengKe(renYuanWx, diFenWx),
    ganShen: shengKe(renYuanWx, guiShenWx),
    ganJiang: shengKe(renYuanWx, jiangShenWx),
    shenFang: shengKe(guiShenWx, diFenWx),
    shenJiang: shengKe(guiShenWx, jiangShenWx),
    jiangFang: shengKe(jiangShenWx, diFenWx),
  };

  // 四位课
  const siWeiKe: SiWeiKe = {
    renYuan: { gan: renYuanGan, relation: shengKeTable.ganFang, naYin: getNaYin(renYuanGan + diFenZhi) },
    guiShen: { name: guiShen.name, ganZhi: guiShenGanZhi, wuXing: guiShenWx, naYin: getNaYin(guiShenGanZhi) },
    yueJiang: { name: yueJiang.name, ganZhi: jiangShenGanZhi, wuXing: jiangShenWx, naYin: getNaYin(jiangShenGanZhi) },
    diFen: { zhi: diFenZhi, wuXing: diFenWx, direction: ZHI_DIRECTION[diFenZhi] ?? "", sanHe: ZHI_SANHE[diFenZhi] ?? "" },
  };

  // 用爻
  const yongYao: YongYao = {
    position: "yueJiang",
    label: `月将${yueJiang.name}（${jiangShenZhi}）`,
    wuXing: jiangShenWx,
    wangShuai: wangShuai(jiangShenWx, month),
    desc: `月将为用爻，${wangShuai(jiangShenWx, month) === "旺" ? "旺相有力，事易成就。" : "休囚无力，事多迟滞。"}`,
  };

  // 动态五动/三动
  const wuDong = buildWuDong(shengKeTable, diFenZhi, jiangShenZhi, guiShen.name, renYuanGan);
  const sanDong = buildSanDong(shengKeTable, diFenZhi);
  const ganYuan = buildGanYuan(renYuanGan, guiShenGanZhi, jiangShenZhi, diFenZhi);
  const shenSha = buildShenSha(diFenZhi, guiShenGanZhi[1], jiangShenZhi, riGanZhi);

  // 空亡
  const xunShou = (idx: number) => Math.floor(idx / 2) * 2;
  const riZhiIdx = DI_ZHI.indexOf(riZhi);
  const xunKong1 = DI_ZHI[(xunShou(riZhiIdx) + 4) % 12];
  const xunKong2 = DI_ZHI[(xunShou(riZhiIdx) + 5) % 12];

  // 断语
  const parts: string[] = [];
  parts.push(`地分${diFenZhi}（${ZHI_DIRECTION[diFenZhi]}），人元${renYuanGan}，贵神${guiShen.name}（${guiShenGanZhi}），月将${yueJiang.name}（${jiangShenGanZhi}）。`);
  if (shengKeTable.ganFang === "克") parts.push("干克方，主官事权威，外部有压力。");
  else if (shengKeTable.ganFang === "被克") parts.push("方克干，主小人暗算，口舌是非。");
  else if (shengKeTable.ganFang === "生") parts.push("干生方，主食禄利财，妻妾和顺。");
  else parts.push("干方平和，诸事尚稳。");
  if (shengKeTable.shenJiang === "克") parts.push("将克神，主财帛变动，进财有望。");
  if (shengKeTable.shenJiang === "被克") parts.push("神克将，防盗贼失财。");
  parts.push(`用爻${yongYao.wangShuai}，${yongYao.desc}`);
  if (wuDong.length > 1) parts.push(`五动有${wuDong.map(w => w.name).join("、")}，需综合研判。`);
  const duanYu = parts.join("");

  return {
    input: {
      datetime,
      diFen: diFenZhi,
      diFenMethod,
      jiangMethod: input.jiangMethod,
      guiRenJue: input.guiRenJue,
      guiRenDayNight: input.guiRenDayNight,
      trueSolar: input.trueSolar,
    },
    basicInfo: {
      zhanShi: zhanShiZhi,
      yueJiang: yueJiang.name,
      riGanZhi,
      dayNight: isDay ? "昼" : "夜",
      jieQi: "",
    },
    siWeiKe,
    yongYao,
    wuDong,
    sanDong,
    shengKeTable,
    shenSha,
    kongWang: [xunKong1, xunKong2],
    dunGan: renYuanGan,
    ganYuan,
    duanYu,
  };
}
