// ── 立极尺计算引擎 ──
// 算法参考：《协纪辨方书》《鳌头通书》《鲁班经》《阳宅十书》
// 鲁班尺/丁兰尺/门公尺/压白尺
// 《协纪辨方书》云：「营造之工，尺寸有度。合吉则兴，犯凶则败。」
// 《鲁班经》云：「尺者，度也，量也。以尺量物，以度定吉。」

import type { LiJiChiInput, LiJiChiResult, ChiMeasurement, LuBanBaZi, DingLanShiZi } from "@guoxue/shared";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

/**
 * 鲁班尺（门公尺）——阳宅门窗家具用。
 *
 * 🔴 2026-09-19 改长度，并补齐四小字一层。
 *
 * ══ 长度：42.9 cm ══
 *
 * 原实现取 5.12 × 8 = **40.96 cm**，源码无出处；40.96 = 2¹²/100，是个拍出来的整数。
 * 现行实际存在的制式只有三种：
 *   · **42.9 cm** —— 当今使用最多，市售鲁班尺卷尺即按此印制；
 *     《鲁班经》换算亦以此为准（「一寸约 5.362 厘米」，42.9 ÷ 8 = 5.3625，自洽）；
 *   · 50.4 cm —— 另一种流行制；
 *   · 46.08 cm —— 古籍记载值，故宫博物院藏鲁班尺实测约 46 cm。
 * 40.96 与三者均不符，且差异**直接翻转吉凶**（实测六个常见门宽六个相反）。
 * 取 42.9 为默认，另两制由 `rulerLength` 显式指定。
 *
 * ══ 四小字 ══
 *
 * 每个大字下各分四小字，出《新镌京版工师雕斫正式鲁班经匠家镜》。
 * 原实现只到大字一级——而专业用户看的正是小字：
 * 同在「本」字里，「财至」与「兴旺」用途不同；同在「离」字里，「长库」并非全然不可用。
 */
const LUBAN_BAZI = ["财", "病", "离", "义", "官", "劫", "害", "本"];

/** 门公尺可选制式（cm）。默认 42.9。 */
const LUBAN_PRESETS: Record<string, number> = { "42.9": 42.9, "50.4": 50.4, "46.08": 46.08 };
const LUBAN_DEFAULT_CYCLE = 42.9;

/** 八大字 × 四小字（顺序即尺上自左至右的刻度顺序） */
const LUBAN_XIAOZI: Record<string, string[]> = {
  "财": ["财德", "宝库", "六合", "迎福"],
  "病": ["退财", "公事", "牢执", "孤寡"],
  "离": ["长库", "劫财", "官鬼", "失脱"],
  "义": ["添丁", "益利", "贵子", "大吉"],
  "官": ["顺科", "横财", "进益", "富贵"],
  "劫": ["死别", "退口", "离乡", "财失"],
  "害": ["灾至", "死绝", "病临", "口舌"],
  "本": ["财至", "登科", "进宝", "兴旺"],
};


/** 八大字的总义与宜用场景 */
const LUBAN_MEANING: Record<string, { meaning: string; yiYong: string; jiXiong: "吉" | "凶"; classicalRef: string }> = {
  "财": {
    meaning: "财字临门大吉昌，金银财宝聚满堂。招财进宝人丁旺，子孙后代福寿长。",
    yiYong: "大门/房门/店铺门/办公室门",
    jiXiong: "吉",
    classicalRef: "《鲁班经》：「财者，财帛星也。主进财纳福，旺丁旺财。」",
  },
  "病": {
    meaning: "病字临门最不祥，家人多病卧在床。官非口舌时常有，破财招灾苦难当。",
    yiYong: "-",
    jiXiong: "凶",
    classicalRef: "《鲁班经》：「病者，病符星也。主疾病缠身，医药不断。」",
  },
  "离": {
    meaning: "离字临门主分离，骨肉离散各东西。夫妻反目难和睦，事业无成心自迷。",
    yiYong: "-",
    jiXiong: "凶",
    classicalRef: "《鲁班经》：「离者，分离星也。主骨肉离散，夫妻不睦。」",
  },
  "义": {
    meaning: "义字临门大吉昌，忠义传家百世芳。人丁兴旺财源广，科甲连绵出贤良。",
    yiYong: "书房门/祠堂门/学堂门",
    jiXiong: "吉",
    classicalRef: "《鲁班经》：「义者，忠义星也。主忠孝传家，科甲连绵。」",
  },
  "官": {
    meaning: "官字临门主官贵，升官发财有权位。仕途顺遂名声好，光宗耀祖显门楣。",
    yiYong: "大门/官府门/公司大门",
    jiXiong: "吉",
    classicalRef: "《鲁班经》：「官者，官禄星也。主官运亨通，仕途顺遂。」",
  },
  "劫": {
    meaning: "劫字临门主盗贼，破财遭灾事非轻。口舌是非常不断，家人不宁心胆惊。",
    yiYong: "-",
    jiXiong: "凶",
    classicalRef: "《鲁班经》：「劫者，劫煞星也。主盗贼侵扰，破财遭灾。」",
  },
  "害": {
    meaning: "害字临门主祸害，家人多病又招灾。破财官非时常有，六亲不和苦难挨。",
    yiYong: "-",
    jiXiong: "凶",
    classicalRef: "《鲁班经》：「害者，祸害星也。主六亲不和，多病招灾。」",
  },
  "本": {
    meaning: "本字临门主平安，家道兴隆福自宽。人财两旺多吉庆，世代荣华子孙欢。",
    yiYong: "大门/房门/后门",
    jiXiong: "吉",
    classicalRef: "《鲁班经》：「本者，本命星也。主平安吉庆，家道兴隆。」",
  },
};

/**
 * 丁兰尺——阴宅神位、牌位、墓碑、棺木用。
 *
 * 🔴 2026-09-19 改长度（原 4.8 × 10 = 48.0 cm，同样无出处），并补齐四小字。
 *
 * 长度取 **38.78 cm**（一尺二寸八分），分十格，每格 3.878 cm，每小字 0.9695 cm。
 * 丁兰尺另分天、幽两界尺码：塑神像用天界尺，墓碑/神主牌/棺木用幽界尺；
 * 此处十字（丁害旺苦义官死兴失财）为**幽界尺**。
 */
const DINGLAN_SHIZI = ["丁", "害", "旺", "苦", "义", "官", "死", "兴", "失", "财"];
const DINGLAN_CYCLE = 38.78;
const DINGLAN_UNIT = 38.78 / 10;

/** 十大字 × 四小字 */
const DINGLAN_XIAOZI: Record<string, string[]> = {
  "丁": ["福星", "及第", "财旺", "登科"],
  "害": ["口舌", "病临", "死绝", "灾至"],
  "旺": ["天德", "喜事", "进宝", "纳福"],
  "苦": ["失脱", "官鬼", "劫财", "无嗣"],
  "义": ["大吉", "财旺", "益利", "天库"],
  "官": ["富贵", "进宝", "横财", "顺科"],
  "死": ["离乡", "死别", "退丁", "失财"],
  "兴": ["登科", "贵子", "添丁", "兴旺"],
  "失": ["孤寡", "牢执", "公事", "退财"],
  "财": ["迎福", "六合", "进宝", "财德"],
};

const DINGLAN_MEANING: Record<string, { meaning: string; yiYong: string; jiXiong: "吉" | "凶"; classicalRef: string }> = {
  "丁": { meaning: "丁字主添丁进口，子孙满堂人丁旺。", yiYong: "神位/牌位/墓碑", jiXiong: "吉", classicalRef: "《鳌头通书》：「丁者人丁兴旺，子孝孙贤。」" },
  "害": { meaning: "害字主遭灾害祸，口舌是非损人丁。", yiYong: "-", jiXiong: "凶", classicalRef: "《鳌头通书》：「害者，祸害损丁，口舌是非。」" },
  "旺": { meaning: "旺字主兴旺发达，子孙昌盛财运通。", yiYong: "神位/牌位/墓碑", jiXiong: "吉", classicalRef: "《鳌头通书》：「旺者，兴旺发达，百事亨通。」" },
  "苦": { meaning: "苦字主困苦艰难，家运不兴多坎坷。", yiYong: "-", jiXiong: "凶", classicalRef: "《鳌头通书》：「苦者，困苦艰难，家运不兴。」" },
  "义": { meaning: "义字主忠义传家，后代贤良有名声。", yiYong: "神位/牌位", jiXiong: "吉", classicalRef: "《鳌头通书》：「义者，忠义传家，后代贤良。」" },
  "官": { meaning: "官字主官禄加身，后代为官出俊杰。", yiYong: "神位/牌位/墓碑", jiXiong: "吉", classicalRef: "《鳌头通书》：「官者，官禄加身，后代为官。」" },
  "死": { meaning: "死字主死亡丧事，家运衰败损人丁。", yiYong: "-", jiXiong: "凶", classicalRef: "《鳌头通书》：「死者，死亡丧事，家运衰败。」" },
  "兴": { meaning: "兴字主兴旺发达，家道兴隆万事通。", yiYong: "神位/牌位/墓碑", jiXiong: "吉", classicalRef: "《鳌头通书》：「兴者，兴隆发达，家道昌盛。」" },
  "失": { meaning: "失字主失落破财，家运衰退万事空。", yiYong: "-", jiXiong: "凶", classicalRef: "《鳌头通书》：「失者，失落破财，万事成空。」" },
  "财": { meaning: "财字主财源广进，金银满库子孙荣。", yiYong: "神位/牌位/墓碑", jiXiong: "吉", classicalRef: "《鳌头通书》：「财者，财源广进，子孙荣华。」" },
};

// 压白尺九星：紫白为吉
// 出处：《协纪辨方书》紫白诀，紫白为九星中最吉，黄黑碧绿赤为凶
const CUN_BAI_STARS = ["白", "黑", "碧", "绿", "黄", "白", "赤", "白", "紫"];
const CUN_UNIT = 3.03;

/**
 * 九星逐位取义。
 *
 * 🔴 2026-09-19 修：原表以**颜色字**为键，而「白」在九星里出现三次——
 * 一白、六白、八白是**三颗不同的星**（贪狼水 / 武曲金 / 左辅土），
 * 原实现把六白与八白一律描述成「一白水星，贪狼」。
 * 实测第 1、6、8 寸返回的说明**一字不差**。
 * 现改为按星位序号取义，颜色只作显示用。
 */
const CUN_BAI_MEANING: { name: string; jiXiong: string; desc: string }[] = [
  { name:"一白", jiXiong:"吉",   desc:"一白水星，贪狼。主财星、桃花、文贵。" },
  { name:"二黑", jiXiong:"凶",   desc:"二黑土星，巨门。主病符、灾厄、晦气。" },
  { name:"三碧", jiXiong:"凶",   desc:"三碧木星，禄存。主口舌、官非、争斗。" },
  { name:"四绿", jiXiong:"凶",   desc:"四绿木星，文曲。主文昌但易招桃花劫。" },
  { name:"五黄", jiXiong:"大凶", desc:"五黄土星，廉贞。主灾祸、疾病、破败。" },
  { name:"六白", jiXiong:"吉",   desc:"六白金星，武曲。主权威、武贵、偏财。" },
  { name:"七赤", jiXiong:"凶",   desc:"七赤金星，破军。主盗贼、血光、破财。" },
  { name:"八白", jiXiong:"吉",   desc:"八白土星，左辅。主田产、置业、少男之喜。" },
  { name:"九紫", jiXiong:"大吉", desc:"九紫火星，右弼。主喜事、婚嫁、添丁。" },
];

/**
 * 🔴 2026-09-19 修：JS 的 `%` 对负数返回负值，`Math.floor(负/5.12)` 得负下标，
 * `LUBAN_BAZI[负]` 为 undefined，原实现的 `|| "本"` 兜底把它变成了**本字·吉**。
 * 后果不是显示问题——`getRecommended` 扫的是 `[lengthCm-10, lengthCm+10]`，
 * 输入 5cm 时区间左端为 −5，实测**推荐列表前十条全是负数尺寸且标记为吉**。
 * 现按非正长度直接拒绝。
 */
function calcLuBan(
  lengthCm: number,
  cycle: number = LUBAN_DEFAULT_CYCLE,
): { zi: LuBanBaZi; xiaoZi: string; detail: string; jiXiong: "吉" | "凶" | "平"; classicalRef: string } {
  if (!(lengthCm > 0)) {
    throw new BusinessException(ErrorCode.VALIDATION_ERROR, "尺寸须为正数");
  }
  const unit = cycle / 8;          // 一大字
  const sub = cycle / 32;          // 一小字
  const offset = lengthCm % cycle;
  const idx = Math.min(7, Math.floor(offset / unit));
  const zi = LUBAN_BAZI[idx] as LuBanBaZi;
  const subIdx = Math.min(3, Math.floor((offset - idx * unit) / sub));
  const xiaoZi = LUBAN_XIAOZI[zi][subIdx];
  const info = LUBAN_MEANING[zi];
  // 报出该小字在本周期内的实际区间，用户可据此上下微调尺寸
  const lo = idx * unit + subIdx * sub;
  const cycleNo = Math.floor(lengthCm / cycle);
  return {
    zi,
    xiaoZi,
    detail:
      `落「${zi}·${xiaoZi}」（本尺第 ${cycleNo + 1} 轮，` +
      `${(cycleNo * cycle + lo).toFixed(1)}–${(cycleNo * cycle + lo + sub).toFixed(1)}cm）`,
    jiXiong: info?.jiXiong || "平",
    classicalRef: info?.classicalRef || "",
  };
}

function calcDingLan(
  lengthCm: number,
): { zi: DingLanShiZi; xiaoZi: string; detail: string; jiXiong: "吉" | "凶" | "平"; classicalRef: string } {
  if (!(lengthCm > 0)) {
    throw new BusinessException(ErrorCode.VALIDATION_ERROR, "尺寸须为正数");
  }
  const sub = DINGLAN_CYCLE / 40;
  const offset = lengthCm % DINGLAN_CYCLE;
  const idx = Math.min(9, Math.floor(offset / DINGLAN_UNIT));
  const zi = DINGLAN_SHIZI[idx] as DingLanShiZi;
  const subIdx = Math.min(3, Math.floor((offset - idx * DINGLAN_UNIT) / sub));
  const xiaoZi = DINGLAN_XIAOZI[zi][subIdx];
  const info = DINGLAN_MEANING[zi];
  const lo = idx * DINGLAN_UNIT + subIdx * sub;
  const cycleNo = Math.floor(lengthCm / DINGLAN_CYCLE);
  return {
    zi,
    xiaoZi,
    detail:
      `落「${zi}·${xiaoZi}」（本尺第 ${cycleNo + 1} 轮，` +
      `${(cycleNo * DINGLAN_CYCLE + lo).toFixed(1)}–${(cycleNo * DINGLAN_CYCLE + lo + sub).toFixed(1)}cm）`,
    jiXiong: info?.jiXiong || "平",
    classicalRef: info?.classicalRef || "",
  };
}

function calcCunBai(lengthCm: number): { star: string; desc: string; jiXiong: string } {
  const taiCun = lengthCm / CUN_UNIT;
  const cunNo = Math.floor(taiCun) + 1;        // 落在第几寸（自 1 计）
  const starIdx = (cunNo - 1) % 9;             // 九星每九寸一循环
  const info = CUN_BAI_MEANING[starIdx];
  // 原实现报的是循环内序号，长度超过九寸时会把「第 10 寸」说成「第 1 寸」
  const cycleNote = cunNo > 9 ? `（第 ${starIdx + 1} 位）` : "";
  return {
    star: `${info.name}星`,
    desc: `第${cunNo}寸${cycleNote}落${info.name}星。${info.desc}`,
    jiXiong: info.jiXiong,
  };
}

function getSuitableFor(luBanZi: LuBanBaZi, usage?: string): string[] {
  const suitable: string[] = [];
  if (["财", "义", "官", "本"].includes(luBanZi)) {
    suitable.push("大门", "房门");
    if (luBanZi === "财") suitable.push("店铺门", "办公室门");
    if (luBanZi === "义") suitable.push("书房门", "学堂门");
    if (luBanZi === "官") suitable.push("官府门", "公司大门");
    if (luBanZi === "本") suitable.push("后门", "通道门");
  }
  if (usage) suitable.push(`当前用途：${usage}`);
  return suitable;
}

/**
 * 三把尺一律全算，但**主吉凶由 `chiType` 决定**。
 *
 * 🔴 2026-09-19 修：原实现 `jiXiong: luBan.jiXiong` 写死取鲁班尺。
 * 鲁班尺（门公尺）断的是**阳宅**门窗家具，丁兰尺断的是**阴宅**神位牌位墓碑——
 * 用户选了丁兰尺量墓碑，拿回来的却是阳宅那把尺的吉凶。
 * 两尺周期不同（本实现 40.96 / 48.0），同一尺寸常常一吉一凶，不是可以互相顶替的。
 */
function makeMeasurement(lengthCm: number, usage?: string, chiType?: string, cycle?: number): ChiMeasurement {
  const luBan = calcLuBan(lengthCm, cycle);
  const dingLan = calcDingLan(lengthCm);
  const cunBai = calcCunBai(lengthCm);
  const taiCun = lengthCm / CUN_UNIT;

  const primary =
    chiType === "dinglan" ? dingLan.jiXiong
    : chiType === "cunbai" ? (cunBai.jiXiong.includes("吉") ? "吉" : cunBai.jiXiong.includes("凶") ? "凶" : "平")
    : luBan.jiXiong;

  return {
    lengthCm,
    taiCun: Math.round(taiCun * 100) / 100,
    luBanZi: luBan.zi,
    luBanDetail: luBan.detail,
    dingLanZi: dingLan.zi,
    dingLanDetail: dingLan.detail,
    cunBai: cunBai.desc,
    jiXiong: primary as "吉" | "凶" | "平",
    desc: `鲁班尺「${luBan.zi}·${luBan.xiaoZi}」，丁兰尺「${dingLan.zi}·${dingLan.xiaoZi}」，压白${cunBai.star}`,
    suitableFor: getSuitableFor(luBan.zi, usage),
  };
}

/**
 * 在给定区间内找吉利尺寸。
 *
 * 🔴 2026-09-19 两处改动：
 * ① 下限夹到正数——原来输入 5cm 会从 −5cm 起扫，推出一串负尺寸且标为吉；
 * ② 步长由 0.5cm 收到 0.2cm，并**按小字去重**。
 *    一个小字只有 1.34cm 宽（42.9/32），0.5cm 步长会在同一小字里重复命中两三次，
 *    推荐列表看着有十条、其实只覆盖三四个刻度，对要挑尺寸的用户没有用。
 */
function getRecommended(range: [number, number], cycle: number): { lengthCm: number; luBanZi: LuBanBaZi; desc: string }[] {
  const result: { lengthCm: number; luBanZi: LuBanBaZi; desc: string }[] = [];
  const seen = new Set<string>();
  const step = 0.2;
  const from = Math.max(step, range[0]);
  for (let cm = from; cm <= range[1]; cm += step) {
    const at = Math.round(cm * 10) / 10;
    const luBan = calcLuBan(at, cycle);
    if (luBan.jiXiong !== "吉") continue;
    const key = `${luBan.zi}·${luBan.xiaoZi}·${Math.floor(at / cycle)}`;
    if (seen.has(key)) continue;   // 同一轮同一小字只取一条
    seen.add(key);
    result.push({ lengthCm: at, luBanZi: luBan.zi, desc: luBan.detail });
    if (result.length >= 12) break;
  }
  return result;
}

export function calculateLiJiChi(input: Record<string, unknown>): LiJiChiResult {
  const { chiType, lengthCm, usage, batch, batchLengths } = input as unknown as LiJiChiInput;
  /**
   * 门公尺制式，默认 42.9cm。50.4 与 46.08 两制同样在用，由调用方显式指定。
   * 不接受任意数值——避免又出现一个没有出处的长度。
   */
  const rulerKey = String((input as Record<string, unknown>).rulerLength ?? "42.9");
  const lubanCycle = LUBAN_PRESETS[rulerKey];
  if (!lubanCycle) {
    throw new BusinessException(
      ErrorCode.VALIDATION_ERROR,
      `门公尺制式只支持 ${Object.keys(LUBAN_PRESETS).join(" / ")} cm，收到「${rulerKey}」`,
    );
  }
  if (!lengthCm || lengthCm <= 0) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "请提供有效的尺寸(cm)");

  const measurement = makeMeasurement(lengthCm, usage, chiType, lubanCycle);

  const batchResults = batch && batchLengths?.length
    ? batchLengths.map(l => makeMeasurement(l, usage, chiType, lubanCycle))
    : undefined;

  const recommended = getRecommended([lengthCm - 10, lengthCm + 10], lubanCycle);

  const reference = LUBAN_BAZI.map(zi => {
    const info = LUBAN_MEANING[zi];
    return {
      baZi: zi as LuBanBaZi,
      range: `${(LUBAN_BAZI.indexOf(zi) * lubanCycle / 8).toFixed(2)}~${((LUBAN_BAZI.indexOf(zi) + 1) * lubanCycle / 8).toFixed(2)}cm`,
      meaning: info.meaning.slice(0, 30),
      yiYong: info.yiYong,
    };
  });

  const info = LUBAN_MEANING[measurement.luBanZi || "本"];
  const jiLabel = measurement.jiXiong === "吉" ? "★★★ 大吉" : measurement.jiXiong === "凶" ? "⚠ 不吉" : "平";

  const summary = [
    "┌─ 立极尺测量结果 ───────────────────┐",
    `│ 尺寸：${measurement.lengthCm}cm（${measurement.taiCun}台寸）`.padEnd(36) + "│",
    `│ 鲁班尺：落「${measurement.luBanZi}」字 — ${jiLabel}`.padEnd(36) + "│",
    `│ ${(info?.meaning || "").slice(0, 30)}`.padEnd(36) + "│",
    `│ 丁兰尺：落「${measurement.dingLanZi}」字`.padEnd(36) + "│",
    `│ 压白尺：${(measurement.cunBai || "").slice(0, 28)}`.padEnd(36) + "│",
    "├─ 推荐吉利尺寸（±10cm）─────────────┤",
    ...(recommended.length > 0
      ? recommended.slice(0, 3).map(r => `│ ★ ${r.lengthCm}cm — 鲁班尺「${r.luBanZi}」字`.padEnd(36) + "│")
      : ["│ 当前范围未找到吉利尺寸              │"]),
    "├─ 出处 ─────────────────────────────┤",
    "│ 《鲁班经》《协纪辨方书》《鳌头通书》│",
    "└────────────────────────────────────┘",
  ].join("\n");

  const duanYu = [
    `┌─ 立极尺测量结果 ─────────────────`,
    `│ 尺寸：${measurement.lengthCm}cm（${measurement.taiCun}台寸）`,
    `│ 鲁班尺：落「${measurement.luBanZi}」字 — ${jiLabel}`,
    `│ ${info?.meaning?.slice(0, 60) || ""}`,
    `│ 出处：${info?.classicalRef || "《鲁班经》"}`,
    `│ 丁兰尺：落「${measurement.dingLanZi}」字`,
    `│ 压白尺：${measurement.cunBai}`,
    ``,
    `├─ 适用场景 ─────────────────`,
    ...measurement.suitableFor.map(s => `│ ✓ ${s}`),
    measurement.suitableFor.length === 0 ? "│ ✗ 不推荐用于任何门/窗/家具" : "",
    ``,
    `├─ 推荐吉利尺寸（${lengthCm}±10cm范围内） ─────`,
    ...(recommended.length > 0
      ? recommended.map(r => `│ ★ ${r.lengthCm}cm — 鲁班尺「${r.luBanZi}」字`)
      : ["│ 当前范围内未找到吉利尺寸，建议扩大量程"]),
    ``,
    `├─ 算法参考 ─────────────────`,
    `│ 《鲁班经》：「营造之法，以尺量度。」`,
    `│ 《协纪辨方书》：「尺寸合吉，家宅安宁。」`,
    `│ 《鳌头通书》载鲁班尺/丁兰尺标准`,
    ``,
    `└─ 温馨提示 ─────────────────`,
    `   测量时以门框内径（净空）为准，非门扇外径。`,
    `   若刚好落在凶字上且无法调整，可用颜色/材质化解。`,
    `   例如落「病」字可用红色或圆形装饰泄病气。`,
  ].filter(Boolean).join("\n");

  return { input: { chiType, lengthCm, usage, batch }, measurement, batchResults, recommended, reference, duanYu, summary } as LiJiChiResult & { summary: string };
}
