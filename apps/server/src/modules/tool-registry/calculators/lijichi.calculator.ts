// ── 立极尺计算引擎 ──
// 算法参考：《协纪辨方书》《鳌头通书》《鲁班经》《阳宅十书》
// 鲁班尺/丁兰尺/门公尺/压白尺
// 《协纪辨方书》云：「营造之工，尺寸有度。合吉则兴，犯凶则败。」
// 《鲁班经》云：「尺者，度也，量也。以尺量物，以度定吉。」

import type { LiJiChiInput, LiJiChiResult, ChiMeasurement, LuBanBaZi, DingLanShiZi } from "@guoxue/shared";

// 鲁班尺八字：每字占1寸6分(5.12cm)，共8字循环
// 出处：《鲁班经》载鲁班尺分八格，每格一寸六分，以财病离义官劫害本为序
const LUBAN_BAZI = ["财", "病", "离", "义", "官", "劫", "害", "本"];
const LUBAN_CYCLE = 5.12 * 8;
const LUBAN_UNIT = 5.12;

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

// 丁兰尺十字：每字占1寸5分(4.8cm)，共10字循环
// 出处：《鳌头通书》载丁兰尺分十格，用于阴宅神位牌位
const DINGLAN_SHIZI = ["丁", "害", "旺", "苦", "义", "官", "死", "兴", "失", "财"];
const DINGLAN_CYCLE = 4.8 * 10;
const DINGLAN_UNIT = 4.8;

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

const CUN_BAI_MEANING: Record<string, { jiXiong: string; desc: string }> = {
  "白": { jiXiong:"吉", desc:"一白水星，贪狼。主财星、桃花、文贵。" },
  "黑": { jiXiong:"凶", desc:"二黑土星，巨门。主病符、灾厄、晦气。" },
  "碧": { jiXiong:"凶", desc:"三碧木星，禄存。主口舌、官非、争斗。" },
  "绿": { jiXiong:"凶", desc:"四绿木星，文曲。主文昌但易招桃花劫。" },
  "黄": { jiXiong:"大凶", desc:"五黄土星，廉贞。主灾祸、疾病、破败。" },
  "赤": { jiXiong:"凶", desc:"七赤金星，破军。主盗贼、血光、破财。" },
  "紫": { jiXiong:"大吉", desc:"九紫火星，右弼。主喜事、婚嫁、添丁。" },
};

function calcLuBan(lengthCm: number): { zi: LuBanBaZi; detail: string; jiXiong: "吉" | "凶" | "平"; classicalRef: string } {
  const offset = lengthCm % LUBAN_CYCLE;
  const idx = Math.floor(offset / LUBAN_UNIT);
  const remainder = offset - idx * LUBAN_UNIT;
  const zi = LUBAN_BAZI[idx] || "本";
  const info = LUBAN_MEANING[zi];
  return {
    zi: zi as LuBanBaZi,
    detail: `落${zi}字（${remainder.toFixed(1)}cm / ${LUBAN_UNIT.toFixed(1)}cm），${info?.meaning?.slice(0, 40) || ""}`,
    jiXiong: info?.jiXiong || "平",
    classicalRef: info?.classicalRef || "",
  };
}

function calcDingLan(lengthCm: number): { zi: DingLanShiZi; detail: string; jiXiong: "吉" | "凶" | "平"; classicalRef: string } {
  const offset = lengthCm % DINGLAN_CYCLE;
  const idx = Math.floor(offset / DINGLAN_UNIT);
  const zi = (DINGLAN_SHIZI[idx] || "财") as DingLanShiZi;
  const info = DINGLAN_MEANING[zi];
  return {
    zi,
    detail: `落${zi}字（${(offset % DINGLAN_UNIT).toFixed(1)}cm），${info?.meaning?.slice(0, 40) || ""}`,
    jiXiong: info?.jiXiong || "平",
    classicalRef: info?.classicalRef || "",
  };
}

function calcCunBai(lengthCm: number): { star: string; desc: string; jiXiong: string } {
  const taiCun = lengthCm / CUN_UNIT;
  const cunIdx = Math.floor(taiCun) % 9;
  const star = CUN_BAI_STARS[cunIdx];
  const info = CUN_BAI_MEANING[star];
  return {
    star: `${star}星`,
    desc: `第${cunIdx + 1}寸落${star}星。${info?.desc || ""}`,
    jiXiong: info?.jiXiong || "平",
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

function makeMeasurement(lengthCm: number, usage?: string): ChiMeasurement {
  const luBan = calcLuBan(lengthCm);
  const dingLan = calcDingLan(lengthCm);
  const cunBai = calcCunBai(lengthCm);
  const taiCun = lengthCm / CUN_UNIT;

  return {
    lengthCm,
    taiCun: Math.round(taiCun * 100) / 100,
    luBanZi: luBan.zi,
    luBanDetail: luBan.detail,
    dingLanZi: dingLan.zi,
    dingLanDetail: dingLan.detail,
    cunBai: cunBai.desc,
    jiXiong: luBan.jiXiong,
    desc: `鲁班尺落${luBan.zi}字，丁兰尺落${dingLan.zi}字，压白落${cunBai.star}`,
    suitableFor: getSuitableFor(luBan.zi, usage),
  };
}

function getRecommended(range: [number, number]): { lengthCm: number; luBanZi: LuBanBaZi; desc: string }[] {
  const result: { lengthCm: number; luBanZi: LuBanBaZi; desc: string }[] = [];
  const step = 0.5;
  for (let cm = range[0]; cm <= range[1]; cm += step) {
    const luBan = calcLuBan(cm);
    if (luBan.jiXiong === "吉") {
      result.push({ lengthCm: Math.round(cm * 10) / 10, luBanZi: luBan.zi, desc: luBan.detail });
      if (result.length >= 10) break;
    }
  }
  return result;
}

export function calculateLiJiChi(input: Record<string, unknown>): LiJiChiResult {
  const { chiType, lengthCm, usage, batch, batchLengths } = input as unknown as LiJiChiInput;
  if (!lengthCm || lengthCm <= 0) throw new Error("请提供有效的尺寸(cm)");

  const measurement = makeMeasurement(lengthCm, usage);

  const batchResults = batch && batchLengths?.length
    ? batchLengths.map(l => makeMeasurement(l, usage))
    : undefined;

  const recommended = getRecommended([lengthCm - 10, lengthCm + 10]);

  const reference = LUBAN_BAZI.map(zi => {
    const info = LUBAN_MEANING[zi];
    return {
      baZi: zi as LuBanBaZi,
      range: `${LUBAN_BAZI.indexOf(zi) * LUBAN_UNIT}~${(LUBAN_BAZI.indexOf(zi) + 1) * LUBAN_UNIT}cm`,
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
