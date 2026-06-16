// ── 辅星水法计算引擎 ──
// 算法参考：《青囊经》(杨筠松)、《入地眼》(托名辜托长老)、《阳宅三要》(赵九峰)
// 《地理辨正》(蒋大鸿)、《水法秘诀》
// 核心：向上翻卦法 → 九星布局 → 吉凶水法判断

import type { FuxingShuifaInput, FuxingShuifaResult, FuxingStarPosition } from "@guoxue/shared";

// 二十四山
const SHAN_24 = ["子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥","壬"];

// 八卦编码 (3-bit, 从上爻到下爻: 天人地)
const GUA_CODE: Record<string, number> = {
  "乾": 7, // ☰ 111
  "兑": 6, // ☱ 110
  "离": 5, // ☲ 101
  "震": 4, // ☳ 100
  "巽": 3, // ☴ 011
  "坎": 2, // ☵ 010
  "艮": 1, // ☶ 001
  "坤": 0, // ☷ 000
};

const CODE_GUA: Record<number, string> = { 7:"乾", 6:"兑", 5:"离", 4:"震", 3:"巽", 2:"坎", 1:"艮", 0:"坤" };

// 八卦纳甲（二十四山 → 八卦）
// 以震卦纳庚亥卯未、离卦纳壬寅午戌等为基准
const SHAN_NA_GUA: Record<string, string> = {
  // 乾卦
  "乾":"乾", "甲":"乾",
  // 兑卦
  "丁":"兑", "巳":"兑", "酉":"兑", "丑":"兑",
  // 离卦
  "壬":"离", "寅":"离", "午":"离", "戌":"离",
  // 震卦
  "庚":"震", "亥":"震", "卯":"震", "未":"震",
  // 巽卦
  "辛":"巽", "巽":"巽",
  // 坎卦
  "癸":"坎", "申":"坎", "子":"坎", "辰":"坎",
  // 艮卦
  "丙":"艮", "艮":"艮",
  // 坤卦
  "乙":"坤", "坤":"坤",
};

// 八卦纳甲反向：卦 → 所纳之山
const GUA_NA_SHAN: Record<string, string[]> = {};
for (const [shan, gua] of Object.entries(SHAN_NA_GUA)) {
  if (!GUA_NA_SHAN[gua]) GUA_NA_SHAN[gua] = [];
  GUA_NA_SHAN[gua].push(shan);
}

// 九星顺序（辅星翻卦）
const STAR_ORDER = ["辅弼","武曲","破军","廉贞","贪狼","巨门","禄存","文曲"];

// 变爻顺序（辅星水法：上→中→下→中→上→中→下→中）
const BIAN_YAO = [4, 2, 1, 2, 4, 2, 1, 2];

// 九星数据库
const STAR_DB: Record<string, { jiXiong: string; waterDirection: string; wuXing: string; detail: string }> = {
  "辅弼": {
    jiXiong: "大吉", waterDirection: "宜来水", wuXing: "木",
    detail: "辅弼星为伏位，与本宫同气。辅星主贵，弼星主富。辅弼水来主丁财两旺、家运绵长、出贤良子孙。水去则家运渐退。",
  },
  "武曲": {
    jiXiong: "大吉", waterDirection: "宜来水", wuXing: "金",
    detail: "武曲为延年吉星，主官贵、长寿、忠义。武曲水来主科甲连绵、仕途通达，居官清正。来水主长寿，去水减寿。",
  },
  "破军": {
    jiXiong: "大凶", waterDirection: "宜去水", wuXing: "金",
    detail: "破军为绝命凶星，主杀戮、破败、横祸。破军水来大凶，主家破人亡、官非盗贼。只宜去水，为凶煞外泄之象。但去水亦不宜直冲。",
  },
  "廉贞": {
    jiXiong: "大凶", waterDirection: "宜去水", wuXing: "火",
    detail: "廉贞为五鬼凶星，主火灾、口舌、瘟疫、邪祟。廉贞水来主怪病缠身、家宅不宁、出逆子悍妇。来水犯五鬼，祸患无穷。去水则凶气消散。",
  },
  "贪狼": {
    jiXiong: "大吉", waterDirection: "宜来水", wuXing: "木",
    detail: "贪狼为生气吉星，主文贵、人丁、利禄，为第一吉星。贪狼水来主文章魁首、功名显达、子孙昌盛、家业兴旺。来水主催丁催贵最速。",
  },
  "巨门": {
    jiXiong: "吉", waterDirection: "宜来水", wuXing: "土",
    detail: "巨门为天医吉星，主健康、财富、慈善。巨门水来主家资丰盈、药铺医馆发迹、主人仁厚。来水利健康长寿、财源稳定。",
  },
  "禄存": {
    jiXiong: "次凶", waterDirection: "宜去水", wuXing: "土",
    detail: "禄存为祸害凶星，主破耗、疾病、口舌是非。禄存水来主慢性病痛、财来财去难积、夫妻不和。来水虽不致命但磨人，去水则安。",
  },
  "文曲": {
    jiXiong: "次凶", waterDirection: "宜去水", wuXing: "水",
    detail: "文曲为六煞凶星，主淫邪、桃花劫、赌博败家。文曲水来主桃色纠纷、因色致祸、酗酒好赌。来水最不利女眷，易犯桃花劫。但文曲亦含文艺之才，若得制化可出才艺之人。去水则无虞。",
  },
};

// 翻卦：从本卦出发，按变爻序列生成全部8个卦位及对应九星
function fanGua(benGua: string): { gua: string; star: string; step: string }[] {
  const startCode = GUA_CODE[benGua];
  if (startCode === undefined) return [];

  const result: { gua: string; star: string; step: string }[] = [];
  result.push({ gua: benGua, star: "辅弼", step: `${benGua}（本卦）` });

  let code = startCode;
  for (let i = 0; i < 7; i++) {
    const yaoVal = BIAN_YAO[i];
    code ^= yaoVal;
    const guaName = CODE_GUA[code];
    const yaoName = yaoVal === 4 ? "上爻" : yaoVal === 2 ? "中爻" : "下爻";
    result.push({
      gua: guaName,
      star: STAR_ORDER[i + 1],
      step: `${result[i].gua}→变${yaoName}→${guaName}（${STAR_ORDER[i + 1]}）`,
    });
  }

  return result;
}

// 解析山向字符串
function parseShanXiang(input: FuxingShuifaInput): { sitting: string; facing: string } | null {
  if (input.sitting && input.facing) {
    return { sitting: input.sitting, facing: input.facing };
  }
  if (input.shanXiang) {
    const m = input.shanXiang.match(/(\S{1,2})山\s*(\S{1,2})向/);
    if (m) return { sitting: m[1], facing: m[2] };
  }
  return null;
}

export function calculateFuxingShuifa(input: FuxingShuifaInput): FuxingShuifaResult {
  const mode = input.mode || "single";

  if (mode === "all") {
    const analysis = `【辅星水法八卦全览】

            翻卦法以向山纳甲卦为本卦，按辅→武→破→廉→贪→巨→禄→文顺序翻卦。
            变爻次序：上→中→下→中→上→中→下→中（一上一下交替）。

            吉星（宜来水）：辅弼、武曲、贪狼（大吉）、巨门（吉）
            凶星（宜去水）：破军、廉贞（大凶）、禄存、文曲（次凶）

            各卦所纳之山：
            乾纳：乾、甲 · 兑纳：丁、巳、酉、丑
            离纳：壬、寅、午、戌 · 震纳：庚、亥、卯、未
            巽纳：辛、巽 · 坎纳：癸、申、子、辰
            艮纳：丙、艮 · 坤纳：乙、坤

            凡立向，先定向属何卦，向上起辅弼，翻得各方卦位及九星。
            吉星方宜水来朝堂，凶星方宜水去流走。水来吉方则发福，来凶方则招祸。`;

    return { mode: "all", analysis };
  }

  const sx = parseShanXiang(input);
  const shanXiangKey = sx ? `${sx.sitting}山${sx.facing}向` : "未指定";
  const facing = sx?.facing;

  if (!facing || !SHAN_24.includes(facing)) {
    return {
      mode: "single",
      shanXiang: shanXiangKey,
      analysis: "请提供坐山朝向（如\"子山午向\"）进行辅星水法分析。也可设置 mode: \"all\" 查看八卦全览。",
    };
  }

  // 向的纳甲卦为本卦
  const benGua = SHAN_NA_GUA[facing];
  if (!benGua) {
    return { mode: "single", shanXiang: shanXiangKey, analysis: `无法确定朝向"${facing}"的纳甲卦。` };
  }

  // 翻卦
  const fanGuaSteps = fanGua(benGua);

  // 构建九星分布
  const starMap: FuxingStarPosition[] = fanGuaSteps.map((s) => {
    const db = STAR_DB[s.star];
    const mountains = GUA_NA_SHAN[s.gua] || [];
    return {
      gua: s.gua,
      mountains,
      star: s.star,
      jiXiong: db.jiXiong,
      waterDirection: db.waterDirection,
      wuXing: db.wuXing,
      eval: db.detail,
    };
  });

  // 统计吉方/凶方来水/去水
  const laiShuiDirections: string[] = [];
  const quShuiDirections: string[] = [];
  for (const sp of starMap) {
    for (const m of sp.mountains) {
      if (sp.waterDirection.includes("来")) {
        laiShuiDirections.push(`${m}(${sp.star}·${sp.jiXiong})`);
      } else {
        quShuiDirections.push(`${m}(${sp.star}·${sp.jiXiong})`);
      }
    }
  }

  // 翻卦步骤
  const fanGuaDetail = fanGuaSteps.map((s) => s.step);

  // 综合解读
  const facingStar = fanGuaSteps[0]?.star || "辅弼";
  const jiStars = starMap.filter((s) => s.jiXiong.includes("吉")).length;
  const xiongStars = starMap.filter((s) => s.jiXiong.includes("凶")).length;

  const benGuaMountains = GUA_NA_SHAN[benGua]?.join("、") || "";

  const analysis = `【辅星水法分析】

            坐向：${shanXiangKey}
            向山纳甲：${facing} → ${benGua}卦（纳：${benGuaMountains}）
            本卦：${benGua}（${facingStar}起）

            翻卦路径：
            ${fanGuaDetail.join("\n" + " ".repeat(13))}

            九星分布（以向为本）：
            ${starMap.map((s) => `  ${s.gua}卦(${s.mountains.join("、")}) → ${s.star}(${s.jiXiong}) [${s.waterDirection}]`).join("\n" + " ".repeat(8))}

            吉星（宜来水）：${jiStars}位
            凶星（宜去水）：${xiongStars}位

            宜来水方：${laiShuiDirections.join(" · ")}
            宜去水方：${quShuiDirections.join(" · ")}

            【水法建议】
            1. 来水宜从${starMap.filter(s => s.jiXiong.includes("大吉")).map(s => s.gua + "卦方(" + s.mountains.join("、") + ")").join("或")}而来，谓之纳吉水。
            2. 去水宜从破军、廉贞、禄存、文曲等凶方而出，谓之泄凶煞。
            3. 若水从吉方出或从凶方来，则为阴阳反背，祸福颠倒，务必实地勘察后做调整。
            4. 辅星水法以向为主，以水之来去为判断依据。'山上龙神不下水，水里龙神不上山'——山管人丁水管财。

            参考古籍：
            • 《青囊经》黄石公：「辅星翻卦，水法之宗」
            • 《入地眼》：「以向起辅，水来吉方主富贵，水来凶方主灾祸」
            • 《地理辨正》蒋大鸿：「辅星水法，乃杨公心法，非坊间俗术可比」

            ⚠ 注意：辅星水法为杨公风水核心秘法之一，实践应用需结合龙、穴、砂、水四科综合判断，不可仅凭水法单项立向。建议请专业风水师实地勘察。`;

  return {
    mode: "single",
    shanXiang: shanXiangKey,
    benGua,
    starMap,
    laiShuiDirections,
    quShuiDirections,
    fanGuaSteps: fanGuaDetail,
    analysis,
  };
}
