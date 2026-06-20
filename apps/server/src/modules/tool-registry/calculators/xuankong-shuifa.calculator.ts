// ── 玄空水法计算引擎 ──
// 算法参考：《青囊奥语》《天玉经》《玄空秘旨》《都天宝照经》
// 玄空城门诀 + 零正催照水法
// 《青囊奥语》云：「山管山兮水管水，此是阴阳不待言。」
// 《天玉经》云：「零正阴阳诀，得水即为零，得山即为正。」

import type { XuanKongShuiFaInput, XuanKongShuiFaResult } from "@guoxue/shared";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

const ZHI_GONG: Record<string, { direction: string; gongWei: string; luoshu: number }> = {
  "子": { direction:"正北", gongWei:"坎宫", luoshu:1 },
  "丑": { direction:"东北偏北", gongWei:"艮宫", luoshu:8 },
  "寅": { direction:"东北偏东", gongWei:"艮宫", luoshu:8 },
  "卯": { direction:"正东", gongWei:"震宫", luoshu:3 },
  "辰": { direction:"东南偏东", gongWei:"巽宫", luoshu:4 },
  "巳": { direction:"东南偏南", gongWei:"巽宫", luoshu:4 },
  "午": { direction:"正南", gongWei:"离宫", luoshu:9 },
  "未": { direction:"西南偏南", gongWei:"坤宫", luoshu:2 },
  "申": { direction:"西南偏西", gongWei:"坤宫", luoshu:2 },
  "酉": { direction:"正西", gongWei:"兑宫", luoshu:7 },
  "戌": { direction:"西北偏西", gongWei:"乾宫", luoshu:6 },
  "亥": { direction:"西北偏北", gongWei:"乾宫", luoshu:6 },
};

// 24山→对应地支（用于查ZHI_GONG）
const SHAN_TO_ZHI: Record<string, string> = {
  "壬":"子","子":"子","癸":"子", "丑":"丑","艮":"丑","寅":"寅",
  "甲":"卯","卯":"卯","乙":"卯", "辰":"辰","巽":"辰","巳":"巳",
  "丙":"午","午":"午","丁":"午", "未":"未","坤":"未","申":"申",
  "庚":"酉","酉":"酉","辛":"酉", "戌":"戌","乾":"戌","亥":"亥",
};
const SHAN_24 = ["子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥","壬"];

function getShanInfo(shan: string): { direction: string; gongWei: string; luoshu: number } {
  const zhi = SHAN_TO_ZHI[shan] || shan;
  return ZHI_GONG[zhi] || { direction: shan, gongWei: "-", luoshu: 0 };
}

const GONG_SHAN: Record<string, string[]> = {
  "坎": ["壬","子","癸"], "艮": ["丑","艮","寅"], "震": ["甲","卯","乙"],
  "巽": ["辰","巽","巳"], "离": ["丙","午","丁"], "坤": ["未","坤","申"],
  "兑": ["庚","酉","辛"], "乾": ["戌","乾","亥"],
};

// 二十四山五行属性
const SHAN_WUXING: Record<string, string> = {
  "壬":"水","子":"水","癸":"水",
  "丑":"土","艮":"土","寅":"木",
  "甲":"木","卯":"木","乙":"木",
  "辰":"土","巽":"木","巳":"火",
  "丙":"火","午":"火","丁":"火",
  "未":"土","坤":"土","申":"金",
  "庚":"金","酉":"金","辛":"金",
  "戌":"土","乾":"金","亥":"水",
};

// 二十四山阴阳
const SHAN_YINYANG: Record<string, string> = {
  "壬":"阳","子":"阴","癸":"阴","丑":"阴","艮":"阳","寅":"阳",
  "甲":"阳","卯":"阴","乙":"阴","辰":"阳","巽":"阴","巳":"阴",
  "丙":"阳","午":"阳","丁":"阴","未":"阴","坤":"阳","申":"阳",
  "庚":"阳","酉":"阴","辛":"阴","戌":"阳","乾":"阳","亥":"阴",
};

function getGong(shan: string): string {
  for (const [gong, shans] of Object.entries(GONG_SHAN)) {
    if (shans.includes(shan)) return gong;
  }
  return "坎";
}

const CHENG_MEN_MAP: Record<string, { zheng: string | null; fu: string | null; classicalRef: string }> = {
  "壬": { zheng:"未", fu:"戌", classicalRef:"《天玉经》：「壬山城门在未，副在戌。」" },
  "子": { zheng:"乾", fu:"坤", classicalRef:"《天玉经》：「子山城门在乾，副在坤。」" },
  "癸": { zheng:"申", fu:"亥", classicalRef:"《天玉经》：「癸山城门在申，副在亥。」" },
  "丑": { zheng:"甲", fu:"壬", classicalRef:"《天玉经》：「丑山城门在甲，副在壬。」" },
  "艮": { zheng:"卯", fu:"子", classicalRef:"《天玉经》：「艮山城门在卯，副在子。」" },
  "寅": { zheng:"乙", fu:"癸", classicalRef:"《天玉经》：「寅山城门在乙，副在癸。」" },
  "甲": { zheng:"丑", fu:"丙", classicalRef:"《天玉经》：「甲山城门在丑，副在丙。」" },
  "卯": { zheng:"艮", fu:"午", classicalRef:"《天玉经》：「卯山城门在艮，副在午。」" },
  "乙": { zheng:"寅", fu:"丁", classicalRef:"《天玉经》：「乙山城门在寅，副在丁。」" },
  "辰": { zheng:"丙", fu:"庚", classicalRef:"《天玉经》：「辰山城门在丙，副在庚。」" },
  "巽": { zheng:"午", fu:"酉", classicalRef:"《天玉经》：「巽山城门在午，副在酉。」" },
  "巳": { zheng:"丁", fu:"辛", classicalRef:"《天玉经》：「巳山城门在丁，副在辛。」" },
  "丙": { zheng:"辰", fu:"丑", classicalRef:"《天玉经》：「丙山城门在辰，副在丑。」" },
  "午": { zheng:"巽", fu:"艮", classicalRef:"《天玉经》：「午山城门在巽，副在艮。」" },
  "丁": { zheng:"巳", fu:"寅", classicalRef:"《天玉经》：「丁山城门在巳，副在寅。」" },
  "未": { zheng:"壬", fu:"申", classicalRef:"《天玉经》：「未山城门在壬，副在申。」" },
  "坤": { zheng:"子", fu:"卯", classicalRef:"《天玉经》：「坤山城门在子，副在卯。」" },
  "申": { zheng:"癸", fu:"乙", classicalRef:"《天玉经》：「申山城门在癸，副在乙。」" },
  "庚": { zheng:"戌", fu:"辰", classicalRef:"《天玉经》：「庚山城门在戌，副在辰。」" },
  "酉": { zheng:"乾", fu:"巽", classicalRef:"《天玉经》：「酉山城门在乾，副在巽。」" },
  "辛": { zheng:"亥", fu:"巳", classicalRef:"《天玉经》：「辛山城门在亥，副在巳。」" },
  "戌": { zheng:"庚", fu:"壬", classicalRef:"《天玉经》：「戌山城门在庚，副在壬。」" },
  "乾": { zheng:"酉", fu:"子", classicalRef:"《天玉经》：「乾山城门在酉，副在子。」" },
  "亥": { zheng:"辛", fu:"癸", classicalRef:"《天玉经》：「亥山城门在辛，副在癸。」" },
};

// 地运八卦所属零正催照说明
const LING_ZHENG_THEORY: Record<number, string> = {
  1: "一运坎水，零神离宫宜见水，正神坎宫宜见山。",
  2: "二运坤土，零神坤宫宜见水，正神艮宫宜见山。",
  3: "三运震木，零神兑宫宜见水，正神震宫宜见山。",
  4: "四运巽木，零神乾宫宜见水，正神巽宫宜见山。",
  5: "五运寄中，前十年同四运，后十年同六运。",
  6: "六运乾金，零神巽宫宜见水，正神乾宫宜见山。",
  7: "七运兑金，零神震宫宜见水，正神兑宫宜见山。",
  8: "八运艮土，零神坤宫宜见水，正神艮宫宜见山。",
  9: "九运离火，零神坎宫宜见水，正神离宫宜见山。",
};

function getDiYun(year: number): number {
  if (year >= 2024 && year < 2044) return 9;
  if (year >= 2004 && year < 2024) return 8;
  const since = year - 2004;
  const yun = (8 + Math.floor(since / 20)) % 9;
  return yun === 0 ? 9 : yun;
}

function getLingZheng(diYun: number): { ling: string[]; zheng: string[]; zhao: string[]; cui: string[] } {
  const lingMap: Record<number, string[]> = {
    1: ["离"], 2: ["坤"], 3: ["兑"], 4: ["乾"], 5: ["中"], 6: ["巽"], 7: ["震"], 8: ["坤"], 9: ["坎"],
  };
  const zhengMap: Record<number, string[]> = {
    1: ["坎"], 2: ["艮"], 3: ["震"], 4: ["巽"], 5: ["中"], 6: ["乾"], 7: ["兑"], 8: ["艮"], 9: ["离"],
  };

  return {
    ling: GONG_SHAN[lingMap[diYun]?.[0] || "离"] || [],
    zheng: GONG_SHAN[zhengMap[diYun]?.[0] || "离"] || [],
    zhao: diYun === 9 ? ["震","巽"] : ["艮","坤"],
    cui: diYun === 9 ? ["乾","兑","坎"] : ["震","巽","离"],
  };
}

// 五行生克判断
function getWxRelation(wx1: string, wx2: string): string {
  const sheng: Record<string, string> = { "木":"火","火":"土","土":"金","金":"水","水":"木" };
  const ke: Record<string, string> = { "木":"土","土":"水","水":"火","火":"金","金":"木" };
  if (wx1 === wx2) return "比和";
  if (sheng[wx1] === wx2) return `${wx1}生${wx2}（泄）`;
  if (sheng[wx2] === wx1) return `${wx2}生${wx1}（得生）`;
  if (ke[wx1] === wx2) return `${wx1}克${wx2}（得克）`;
  if (ke[wx2] === wx1) return `${wx2}克${wx1}（被克）`;
  return "未知";
}

export function calculateXuanKongShuiFa(input: Record<string, unknown>): XuanKongShuiFaResult {
  const { zuoShan, chaoXiang, year } = input as unknown as XuanKongShuiFaInput;
  if (!zuoShan || !SHAN_24.includes(zuoShan)) throw new BusinessException(ErrorCode.VALIDATION_ERROR, `坐山"${zuoShan}"无效，须为24山之一`);
  if (!chaoXiang || !SHAN_24.includes(chaoXiang)) throw new BusinessException(ErrorCode.VALIDATION_ERROR, `朝向"${chaoXiang}"无效，须为24山之一`);

  const y = typeof year === "number" ? year : new Date().getFullYear();
  const diYun = getDiYun(y);
  const { ling, zheng, zhao, cui } = getLingZheng(diYun);

  const lingZhi = ling[0] || "午";
  const zhengZhi = zheng[0] || "子";
  const zhaoZhi = zhao[0] === "震" ? "卯" : zhao[0] === "巽" ? "巳" : zhao[0] === "艮" ? "丑" : "未";
  const cuiZhi = cui[0] === "乾" ? "戌" : cui[0] === "兑" ? "酉" : cui[0] === "坎" ? "子" : "卯";

  const lingShenInfo = ZHI_GONG[lingZhi] || ZHI_GONG["午"];
  const zhengShenInfo = ZHI_GONG[zhengZhi] || ZHI_GONG["子"];
  const zhaoShenInfo = ZHI_GONG[zhaoZhi] || ZHI_GONG["卯"];
  const cuiShenInfo = ZHI_GONG[cuiZhi] || ZHI_GONG["酉"];

  // 城门诀
  const cm = CHENG_MEN_MAP[zuoShan] || { zheng:null, fu:null, classicalRef:"《天玉经》" };
  const zhengCM = cm.zheng ? getShanInfo(cm.zheng) : { direction:"-", gongWei:"-" };
  const fuCM = cm.fu ? getShanInfo(cm.fu) : { direction:"-", gongWei:"-" };

  const zhengOK = cm.zheng ? ling.includes(cm.zheng) || zheng.includes(cm.zheng) : false;
  const fuOK = cm.fu ? ling.includes(cm.fu) || zheng.includes(cm.fu) : false;

  // 坐山与朝向五行关系
  const zuoWx = SHAN_WUXING[zuoShan] || "";
  const chaoWx = SHAN_WUXING[chaoXiang] || "";
  const zuoChaoWxRel = getWxRelation(zuoWx, chaoWx);

  // 三阳五会
  const sanYangDirs = ling.slice(0, 3).map(s => {
    const z = GONG_SHAN[s]?.[0] || "";
    return { direction: getShanInfo(z).direction, zhi: z, description: `零神方${s}宫` };
  });
  const wuHuiShans = [...zhao.slice(0, 2), ...cui.slice(0, 3)];
  const wuHui = wuHuiShans.map(s => {
    const z = GONG_SHAN[s]?.[0] || "";
    return { direction: getShanInfo(z).direction, zhi: z, description: `催照方${s}宫` };
  });

  // 水法吉凶（24山前半）
  const shuiFaJiXiong = SHAN_24.slice(0, 12).map(s => {
    const isLing = ling.includes(s);
    const isZheng = zheng.includes(s);
    let jiXiong: "吉" | "凶" | "平" = "平";
    let desc = "";
    if (isLing) { jiXiong = "吉"; desc = `${s}方为零神方，宜见水，聚财旺丁`; }
    else if (isZheng) { jiXiong = "平"; desc = `${s}方为正神方，宜见山，不宜见水`; }
    else { jiXiong = "凶"; desc = `${s}方非零非正，见水须谨慎，宜实地勘察`; }
    return { direction: getShanInfo(s).direction, zhi: s, jiXiong, description: desc };
  });

  const zuoGong = getGong(zuoShan);
  const chaoGong = getGong(chaoXiang);

  const lingShenDesc = `${lingShenInfo.direction}方(${lingShenInfo.gongWei})——零神方，气从上头来，宜见水聚财。`;
  const zhengShenDesc = `${zhengShenInfo.direction}方(${zhengShenInfo.gongWei})——正神方，气从底下起，宜见山旺丁。`;
  const theoryDesc = LING_ZHENG_THEORY[diYun] || "";

  const suggestions = [
    `坐${zuoShan}(${zuoGong}宫·${zuoWx}·${SHAN_YINYANG[zuoShan] || ""})向${chaoXiang}(${chaoGong}宫·${chaoWx})，当前${diYun}运。坐向五行：${zuoChaoWxRel}。`,
    `零神宜见水：${ling.join("、")}方，正神宜见山：${zheng.join("、")}方`,
    zhengOK ? `正城门${cm.zheng}方可用，见水大吉` : `正城门${cm.zheng || "无"}方当前不可用，须待运。`,
    fuOK ? `副城门${cm.fu}方可用` : `副城门${cm.fu || "无"}方当前不可用，须待运。`,
    "城门诀法要在旺山旺向时运用，须与山水配合方能见效。具体以现场山水形势为准。",
    zuoChaoWxRel.includes("被克") ? `坐山被朝向所克，建议调整朝向或加强坐方山势。` : "",
  ].filter(Boolean);

  const analysis = [
    `┌─ 玄空水法分析 ─────────────────`,
    `│ 坐山：${zuoShan}（${zuoGong}宫·${zuoWx}·${SHAN_YINYANG[zuoShan] || ""}阴阳）`,
    `│ 朝向：${chaoXiang}（${chaoGong}宫·${chaoWx}·${SHAN_YINYANG[chaoXiang] || ""}阴阳）`,
    `│ 地运：${diYun}运 坐向五行：${zuoChaoWxRel}`,
    ``,
    `├─ 零正催照 ─────────────────`,
    `│ ${theoryDesc}`,
    `│ 零神（宜水）：${ling.join("、")}方 → ${lingShenDesc}`,
    `│ 正神（宜山）：${zheng.join("、")}方 → ${zhengShenDesc}`,
    `│ 照神（佐零）：${zhao.join("、")}方 — 佐零神催财之力`,
    `│ 催神（助正）：${cui.join("、")}方 — 助正神旺丁之功`,
    ``,
    `├─ 城门诀 ─────────────────`,
    `│ 正城门：${cm.zheng || "无"}方（${zhengOK ? "✓ 当前可用" : "✗ 待时方用"}）`,
    `│ 副城门：${cm.fu || "无"}方（${fuOK ? "✓ 当前可用" : "✗ 待时方用"}）`,
    `│ 出处：${cm.classicalRef}`,
    ``,
    `├─ 三阳五会 ─────────────────`,
    ...sanYangDirs.map(s => `│ 三阳：${s.direction}(${s.zhi}) — ${s.description}`),
    ...wuHui.map(w => `│ 五会：${w.direction}(${w.zhi}) — ${w.description}`),
    ``,
    `├─ 水法吉凶（12方位） ──────`,
    ...shuiFaJiXiong.map(s => `│ ${s.jiXiong === "吉" ? "★" : s.jiXiong === "平" ? "·" : "⚠"} ${s.direction}(${s.zhi})：${s.description}`),
    ``,
    `├─ 古籍出处 ─────────────────`,
    `│ 《青囊奥语》：「山管山兮水管水。」`,
    `│ 《天玉经》：「零正阴阳诀，得水即为零。」`,
    `│ 《玄空秘旨》：「不知来路，焉知入路。」`,
    `│ 《都天宝照经》：「城门一诀最为良。」`,
    ``,
    `└─ 综合判断 ─────────────────`,
    `   坐${zuoShan}向${chaoXiang}，${diYun}运。`,
    `   ${zhengOK || fuOK ? "有城门可用，水法合局，宜在城门方见水收吉气。" : "当前城门不可用，需待时运流转。建议暂以零神方见水为主。"}`,
    `   零正水法以实地山水形势为依据，格局为体、时运为用，`,
    `   理气与峦头并重方得全功。`,
  ].join("\n");

  return {
    zuoShan, chaoXiang, diYun,
    lingShen: { direction: lingShenInfo.direction, zhi: lingZhi, gongWei: lingShenInfo.gongWei, description: lingShenDesc },
    zhengShen: { direction: zhengShenInfo.direction, zhi: zhengZhi, gongWei: zhengShenInfo.gongWei, description: zhengShenDesc },
    zhaoShen: { direction: zhaoShenInfo.direction, zhi: zhaoZhi, gongWei: zhaoShenInfo.gongWei, description: "照神位，佐零神催财" },
    cuiShen: { direction: cuiShenInfo.direction, zhi: cuiZhi, gongWei: cuiShenInfo.gongWei, description: "催神位，助正神催丁" },
    chengMenJue: {
      zhengChengMen: { direction: zhengCM.direction, zhi: cm.zheng || "-", gongWei: zhengCM.gongWei, condition: zhengOK ? "当前可用" : "待时方用" },
      fuChengMen: { direction: fuCM.direction, zhi: cm.fu || "-", gongWei: fuCM.gongWei, condition: fuOK ? "当前可用" : "待时方用" },
      description: `坐${zuoShan}，正城门在${cm.zheng || "无"}方，副城门在${cm.fu || "无"}方。${zhengOK ? "正城门可用" : "正城门不可用"}。出处：${cm.classicalRef}`,
    },
    sanYangWuHui: { sanYang: sanYangDirs, wuHui },
    shuiFaJiXiong,
    suggestions,
    analysis,
  };
}
