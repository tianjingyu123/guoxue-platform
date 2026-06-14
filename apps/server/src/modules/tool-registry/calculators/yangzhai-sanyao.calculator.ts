// ── 阳宅三要计算引擎 ──
// 算法参考：《阳宅十书》《八宅明镜》《阳宅三要》《宅经》
// 门主灶互生克 + 八宅游年 + 宅命相配
// 《阳宅三要》云：「宅有三要：门、主、灶是也。三者得位，则家道昌隆。」
// 《八宅明镜》云：「大游年者，八卦变爻之法，以定八宅之吉凶方位。」

import type { YangZhaiSanYaoInput, YangZhaiSanYaoResult, YangZhaiElement, YangZhaiRelation } from "@guoxue/shared";

const DIRECTIONS: Record<string, { trigram:string; wx:string; dongXi:"东四"|"西四"; gongWei:string; luoShu:number }> = {
  "北": { trigram:"坎", wx:"水", dongXi:"东四", gongWei:"坎宫", luoShu:1 },
  "坎": { trigram:"坎", wx:"水", dongXi:"东四", gongWei:"坎宫", luoShu:1 },
  "西南":{ trigram:"坤", wx:"土", dongXi:"西四", gongWei:"坤宫", luoShu:2 },
  "坤": { trigram:"坤", wx:"土", dongXi:"西四", gongWei:"坤宫", luoShu:2 },
  "东": { trigram:"震", wx:"木", dongXi:"东四", gongWei:"震宫", luoShu:3 },
  "震": { trigram:"震", wx:"木", dongXi:"东四", gongWei:"震宫", luoShu:3 },
  "东南":{ trigram:"巽", wx:"木", dongXi:"东四", gongWei:"巽宫", luoShu:4 },
  "巽": { trigram:"巽", wx:"木", dongXi:"东四", gongWei:"巽宫", luoShu:4 },
  "中": { trigram:"中", wx:"土", dongXi:"西四", gongWei:"中宫", luoShu:5 },
  "西北":{ trigram:"乾", wx:"金", dongXi:"西四", gongWei:"乾宫", luoShu:6 },
  "乾": { trigram:"乾", wx:"金", dongXi:"西四", gongWei:"乾宫", luoShu:6 },
  "西": { trigram:"兑", wx:"金", dongXi:"西四", gongWei:"兑宫", luoShu:7 },
  "兑": { trigram:"兑", wx:"金", dongXi:"西四", gongWei:"兑宫", luoShu:7 },
  "东北":{ trigram:"艮", wx:"土", dongXi:"西四", gongWei:"艮宫", luoShu:8 },
  "艮": { trigram:"艮", wx:"土", dongXi:"西四", gongWei:"艮宫", luoShu:8 },
  "南": { trigram:"离", wx:"火", dongXi:"东四", gongWei:"离宫", luoShu:9 },
  "离": { trigram:"离", wx:"火", dongXi:"东四", gongWei:"离宫", luoShu:9 },
};

// 八宅大游年表
const YOU_NIAN_TABLE: Record<string, Record<string, string>> = {
  "坎": { "坎":"伏位","坤":"绝命","震":"天医","巽":"生气","乾":"六煞","兑":"祸害","艮":"五鬼","离":"延年" },
  "坤": { "坎":"绝命","坤":"伏位","震":"祸害","巽":"五鬼","乾":"延年","兑":"天医","艮":"生气","离":"六煞" },
  "震": { "坎":"天医","坤":"祸害","震":"伏位","巽":"延年","乾":"五鬼","兑":"绝命","艮":"六煞","离":"生气" },
  "巽": { "坎":"生气","坤":"五鬼","震":"延年","巽":"伏位","乾":"祸害","兑":"六煞","艮":"绝命","离":"天医" },
  "乾": { "坎":"六煞","坤":"延年","震":"五鬼","巽":"祸害","乾":"伏位","兑":"生气","艮":"天医","离":"绝命" },
  "兑": { "坎":"祸害","坤":"天医","震":"绝命","巽":"六煞","乾":"生气","兑":"伏位","艮":"延年","离":"五鬼" },
  "艮": { "坎":"五鬼","坤":"生气","震":"六煞","巽":"绝命","乾":"天医","兑":"延年","艮":"伏位","离":"祸害" },
  "离": { "坎":"延年","坤":"六煞","震":"生气","巽":"天医","乾":"绝命","兑":"五鬼","艮":"祸害","离":"伏位" },
};

const YOU_NIAN_JIXIONG: Record<string, { jiXiong: "吉"|"凶"|"小吉"|"小凶"; desc: string; layoutTip: string; remedy: string; classicalRef: string }> = {
  "生气": {
    jiXiong:"吉", desc:"生气贪狼木星，主旺丁旺财、事业发达、人丁兴旺。",
    layoutTip:"宜设大门、主卧、书房，纳生气吉气。宜绿色/木质装饰，摆放富贵竹、绿萝催旺木气。",
    remedy:"生气方宜保持通畅明亮，不宜堆放杂物。若被厕所压占，可放绿色植物化解。",
    classicalRef:"《八宅明镜》：「生气为贪狼星，吉。主旺丁旺财，百事皆吉。」",
  },
  "延年": {
    jiXiong:"吉", desc:"延年武曲金星，主健康长寿、家庭和睦、财运稳定。",
    layoutTip:"宜设主卧、客厅，得延年寿气。宜白色/金色/圆形装饰，摆放金属风铃或铜器催旺金气。",
    remedy:"延年方宜安静整洁，不宜做厨房（火克金）。若被厨房占，可在灶旁放白色水晶或金属摆件。",
    classicalRef:"《八宅明镜》：「延年为武曲星，吉。主长寿健康，夫妻和睦。」",
  },
  "天医": {
    jiXiong:"吉", desc:"天医巨门土星，主健康疾病康复、得贵人相助。",
    layoutTip:"宜设主卧、厨房、客厅，纳天医吉气。宜黄色/棕色/方形装饰，摆放黄水晶、陶瓷花瓶催旺土气。",
    remedy:"天医方宜通风良好，不宜阴暗潮湿。若被厕所占压，可放白水晶球或金属摆件泄土气。",
    classicalRef:"《八宅明镜》：「天医为巨门星，吉。主疾病得愈，贵人相助。」",
  },
  "伏位": {
    jiXiong:"小吉", desc:"伏位辅弼木星，主平稳守成、宜静不宜动。",
    layoutTip:"宜设书房、老人房、储藏室。宜浅绿/淡蓝色，保持安静整洁，摆放书籍、木质家具营造安定氛围。",
    remedy:"伏位方宜清静，不宜做大门或热闹区域。若不得已设大门，可放门垫缓冲。",
    classicalRef:"《八宅明镜》：「伏位为辅弼星，小吉。主安守本位，平稳度日。」",
  },
  "绝命": {
    jiXiong:"凶", desc:"绝命破军金星，主血光之灾、意外横祸、财运大破。",
    layoutTip:"宜设厕所、杂物间、阳台，以压制凶气。避免设大门、主卧、厨房。忌白色/金属装饰。",
    remedy:"放置安忍水（盐+水+六帝铜钱）或鱼缸以水泄金气。悬挂天然葫芦吸纳病气。忌放金属物品和钟表。",
    classicalRef:"《八宅明镜》：「绝命为破军星，大凶。主血光横祸，破败损丁。」",
  },
  "五鬼": {
    jiXiong:"凶", desc:"五鬼廉贞火星，主口舌是非、官司纠纷、精神不安。",
    layoutTip:"宜设厕所、储藏室，以污秽制火煞。避免设大门、主卧、厨房。忌红色/电器/三角形装饰。",
    remedy:"放置鱼缸或水景以水克火。摆放黑曜石、泰山石敢当。忌堆放电器、红色物品。宜做卫生间以镇压。",
    classicalRef:"《八宅明镜》：「五鬼为廉贞星，大凶。主官非口舌，火灾盗贼。」",
  },
  "祸害": {
    jiXiong:"小凶", desc:"祸害禄存土星，主破财损耗、小病不断、口舌之争。",
    layoutTip:"宜设厕所、阳台。避免设大门、主卧。忌黄色/棕色/方形装饰。",
    remedy:"放置金属摆件或白色装饰以金泄土气。悬挂铜铃化解土煞。保持通风干燥，避免堆放重物。",
    classicalRef:"《八宅明镜》：「祸害为禄存星，次凶。主破财口舌，小病不断。」",
  },
  "六煞": {
    jiXiong:"小凶", desc:"六煞文曲水星，主桃花劫、感情纠纷、酒色失财。",
    layoutTip:"宜设杂物间、衣帽间，减少人长时间停留。避免设大门、主卧。忌黑色/水景/大面镜子。",
    remedy:"放置红色装饰以火泄水气，摆放绿色植物吸纳水气。悬挂五帝钱或朱砂饰品。忌放鱼缸和过多镜子。",
    classicalRef:"《八宅明镜》：「六煞为文曲星，次凶。主酒色失财，桃花纠纷。」",
  },
};

const WX_REL_MAP: Record<string, Record<string, string>> = {
  "水": { "水":"比和","木":"水生木","火":"水克火","土":"土克水","金":"金生水" },
  "木": { "水":"水生木","木":"比和","火":"木生火","土":"木克土","金":"金克木" },
  "火": { "水":"水克火","木":"木生火","火":"比和","土":"火生土","金":"火克金" },
  "土": { "水":"土克水","木":"木克土","火":"火生土","土":"比和","金":"土生金" },
  "金": { "水":"金生水","木":"金克木","火":"火克金","土":"土生金","金":"比和" },
};

const DIRECTION_NAMES: Record<string, string> = {
  "坎":"正北","坤":"西南","震":"正东","巽":"东南","乾":"西北","兑":"正西","艮":"东北","离":"正南","中":"中央",
};

// 宅命配合建议
const MING_GUA_ADVICE: Record<string, Record<string, string>> = {
  "东四": {
    "东四宅": "宅命相配，大吉。气场和谐，家运昌隆。",
    "西四宅": "宅命不配，主家运不宁。建议通过大门方位调整、屏风隔断、或选择命卦合宅者同住以化解。",
  },
  "西四": {
    "西四宅": "宅命相配，大吉。气场和谐，家运昌隆。",
    "东四宅": "宅命不配，主家运不宁。建议通过大门方位调整、屏风隔断、或选择命卦合宅者同住以化解。",
  },
};

function getElement(dir: string): YangZhaiElement {
  const d = DIRECTIONS[dir];
  if (!d) throw new Error(`方位${dir}无效，请使用东/南/西/北/东南/西南/东北/西北或八卦名`);
  return {
    name: dir,
    direction: DIRECTION_NAMES[d.trigram] || dir,
    trigram: d.trigram,
    wuXing: d.wx,
    dongXi: d.dongXi,
    gongWei: d.gongWei,
    luoShuNumber: d.luoShu,
  };
}

function getRelation(a: YangZhaiElement, b: YangZhaiElement): YangZhaiRelation {
  const youNian = YOU_NIAN_TABLE[a.trigram]?.[b.trigram] || "伏位";
  const info = YOU_NIAN_JIXIONG[youNian];
  const wxRel = WX_REL_MAP[a.wuXing]?.[b.wuXing] || "比和";

  return {
    pairs: `${a.name}(${a.wuXing}) — ${b.name}(${b.wuXing})`,
    relation: youNian,
    youNian,
    jiXiong: info.jiXiong,
    wuXingInteraction: wxRel,
    description: info.desc,
    layoutTip: info.layoutTip,
    remedy: info.remedy,
  };
}

export function calculateYangZhaiSanYao(input: Record<string, unknown>): YangZhaiSanYaoResult {
  const { door, master, kitchen, hostMingGua, year } = input as unknown as YangZhaiSanYaoInput;

  const doorEl = getElement(door);
  const masterEl = getElement(master);
  const kitchenEl = getElement(kitchen);

  const zhaiType = (doorEl.dongXi + "宅") as "东四宅" | "西四宅";
  const doorMasterRel = getRelation(doorEl, masterEl);
  const doorKitchenRel = getRelation(doorEl, kitchenEl);
  const masterKitchenRel = getRelation(masterEl, kitchenEl);

  const relScore = (j: string) => j === "吉" ? 20 : j === "小吉" ? 12 : j === "小凶" ? 5 : 0;
  const dmScore = relScore(doorMasterRel.jiXiong);
  const dkScore = relScore(doorKitchenRel.jiXiong);
  const mkScore = relScore(masterKitchenRel.jiXiong);
  let zhaiMingScore = 10;
  let score = 50 + dmScore + dkScore + mkScore + zhaiMingScore;

  const suggestions: string[] = [];
  let mingGuaResult = "";
  if (hostMingGua) {
    const hostTri = hostMingGua.split("-")[1] || "";
    const hostDongXi = DIRECTIONS[hostTri]?.dongXi;
    const advice = MING_GUA_ADVICE[hostDongXi || "东四"]?.[zhaiType] || "";
    if (hostDongXi && (hostDongXi + "宅") !== zhaiType) {
      suggestions.push(`宅主命卦属${hostDongXi}命，宅属${zhaiType}，宅命不配。${advice}`);
      zhaiMingScore = 0;
      score -= 10;
      mingGuaResult = `⚠ 宅命不配：宅主${hostDongXi}命居${zhaiType}宅，气场不合。`;
    } else {
      suggestions.push(`宅主命卦与宅型相配。${advice}`);
      mingGuaResult = `✓ 宅命相配：宅主${hostDongXi}命居${zhaiType}宅，气场和谐。`;
    }
  }

  if (doorEl.dongXi !== masterEl.dongXi) {
    suggestions.push(`大门(${doorEl.dongXi})与主卧(${masterEl.dongXi})不属同一宅型，气场不合，建议调整`);
  }
  if (doorEl.dongXi !== kitchenEl.dongXi) {
    suggestions.push(`大门(${doorEl.dongXi})与厨房(${kitchenEl.dongXi})不属同一宅型，气场不合，建议调整`);
  }

  score = Math.max(0, Math.min(100, score));
  const scoreDetail = { doorMaster: dmScore, doorKitchen: dkScore, masterKitchen: mkScore, zhaiMingMatch: zhaiMingScore, total: score };

  // 三元九运
  const y = typeof year === "number" ? year : new Date().getFullYear();
  const yunYear = y >= 2024 ? 9 : y >= 2004 ? 8 : ((((y - 2004) / 20) | 0) + 8) % 9 || 9;
  const yunNames: Record<number, string> = { 1:"坎水运",2:"坤土运",3:"震木运",4:"巽木运",5:"中土运",6:"乾金运",7:"兑金运",8:"艮土运",9:"离火运" };
  const yunName = yunNames[yunYear] || "未知运";
  const periodRef = `当前${yunYear}运${yunName}。${yunYear === 9 ? "离火运（2024-2043），南方为当旺财位，宜开门纳气见水。" : yunYear === 8 ? "艮土运（2004-2023），东北方为当旺财位。" : ""}`;

  // 评分等级
  const scoreLabel = score >= 80 ? "上等（三要配合极佳）" : score >= 60 ? "中等偏上" : score >= 40 ? "中等" : "下等（三要配合不佳，需调整）";

  const relAdvices: string[] = [];
  for (const [label, rel] of [["门主关系", doorMasterRel], ["门灶关系", doorKitchenRel], ["主灶关系", masterKitchenRel]] as const) {
    if (rel.jiXiong === "凶" || rel.jiXiong === "小凶") {
      const ref = YOU_NIAN_JIXIONG[rel.youNian]?.classicalRef || "";
      relAdvices.push(`${label}为${rel.youNian}（${rel.jiXiong}）：${rel.remedy}。出处：${ref}`);
    }
  }
  if (relAdvices.length === 0) relAdvices.push("门主灶三要素配合良好，各方位游年星吉，可安居乐业。");

  const analyzeRel = (label: string, rel: YangZhaiRelation) => {
// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const info = YOU_NIAN_JIXIONG[rel.youNian];
    const jx = rel.jiXiong === "吉" ? "★" : rel.jiXiong === "小吉" ? "☆" : rel.jiXiong === "凶" ? "☠" : "⚠";
    return `│ ${jx} ${label}：${rel.pairs} → ${rel.youNian}（${rel.jiXiong}）${rel.wuXingInteraction}`;
  };

  const analysis = [
    `┌─ 阳宅三要分析 ─────────────────`,
    `│ 宅型：${doorEl.name}门${zhaiType}（${doorEl.trigram}宅·${doorEl.wuXing}·洛书${doorEl.luoShuNumber}）`,
    `│ 宅主命卦：${mingGuaResult || "未提供"}`,
    `│ ${periodRef}`,
    ``,
    `├─ 三要关系 ─────────────────`,
    analyzeRel("门主", doorMasterRel),
    `│   布局：${YOU_NIAN_JIXIONG[doorMasterRel.youNian]?.layoutTip || ""}`,
    analyzeRel("门灶", doorKitchenRel),
    `│   布局：${YOU_NIAN_JIXIONG[doorKitchenRel.youNian]?.layoutTip || ""}`,
    analyzeRel("主灶", masterKitchenRel),
    `│   布局：${YOU_NIAN_JIXIONG[masterKitchenRel.youNian]?.layoutTip || ""}`,
    ``,
    `├─ 综合评分 ─────────────────`,
    `│ 门主：${dmScore}/20 门灶：${dkScore}/20 主灶：${mkScore}/20`,
    `│ 宅命匹配：${zhaiMingScore}/10`,
    `│ 总分：${score}/100 — ${scoreLabel}`,
    ``,
    `├─ 调整建议 ─────────────────`,
    ...relAdvices.map(a => `│ ${a}`),
    ``,
    `├─ 古籍出处 ─────────────────`,
    `│ 《阳宅三要》：「门为宅之气口，主为宅之居者，灶为宅之养命。」`,
    `│ 《八宅明镜》：「大游年者，八卦变爻之法。」`,
    `│ 《宅经》：「宅以形势为身体，以八卦为脉络。」`,
    ``,
    `└─ 综合判断 ─────────────────`,
    `   ${score >= 80 ? "阳宅三要配合上佳，门主灶皆在吉位，家宅兴旺之象。" :
        score >= 60 ? "三要配合尚可，吉多凶少。注意调整凶位即可安居乐业。" :
        score >= 40 ? "三要配合一般，有几处凶位需优先化解。建议按上述建议调整布局。" :
        "三要配合不佳，多处凶位相冲。建议重新规划门主灶方位，或请专业风水师现场勘察。"}`,
  ].join("\n");

  return {
    zhaiType,
    zhaiGua: doorEl.trigram,
    elements: { door: doorEl, master: masterEl, kitchen: kitchenEl },
    doorMaster: doorMasterRel,
    doorKitchen: doorKitchenRel,
    masterKitchen: masterKitchenRel,
    score,
    scoreDetail,
    periodRef,
    suggestions: suggestions.length > 0 ? suggestions : ["阳宅三要配合尚可，建议保持整洁通风，定期洒净"],
    analysis,
  };
}
