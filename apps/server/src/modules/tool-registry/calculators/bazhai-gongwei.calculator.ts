// ── 八宅宫位吉凶计算引擎 ──
// 算法参考：《阳宅十书》《八宅明镜》《阳宅三要》《阳宅爱众》
// 八宅派以命卦配宅卦，游年九星断各宫吉凶

interface GongWeiJiXiong {
  gongWei: string; direction: string; youNian: string;
  jiXiong: string; level: string; suitable: string; taboo: string;
  detail?: string; huaJie?: string; wuXing?: string;
}
interface BaZhaiGongWeiResult {
  mingGua: string; mingGuaInfo?: string; gongWeiList: GongWeiJiXiong[];
  summary: string; zhaiMingPeiHe?: string;
}

const BA_GUA = ["坎","离","震","巽","乾","坤","艮","兑"];
const DIR_NAME: Record<string, string> = {
  "坎":"正北", "离":"正南", "震":"正东", "巽":"东南",
  "乾":"西北", "坤":"西南", "艮":"东北", "兑":"正西",
};
const GUA_WX: Record<string, string> = {
  "坎":"水", "离":"火", "震":"木", "巽":"木",
  "乾":"金", "坤":"土", "艮":"土", "兑":"金",
};

// 八宅游年九星详解（按伏位→生气→延年→天医→六煞→绝命→祸害→五鬼顺序）
const YOU_NIAN_ORDER = ["伏位","生气","延年","天医","六煞","绝命","祸害","五鬼"];

const YOU_NIAN_DETAIL: Record<string, {
  level: string; suitable: string; taboo: string;
  detail: string; huaJie: string; wuXing: string;
  source: string;
}> = {
  "伏位": {
    level: "小吉",
    suitable: "安床、书房、安神位、老人房",
    taboo: "不宜做大门和厨房",
    detail: "伏位为宅之根基，与本命卦同气。气场稳定平和，宜静不宜动。安床于伏位可修身养性，安神位可感应神明。但伏位缺乏生气，不宜做大门（缺乏进取之气）。",
    huaJie: "无需化解，辅弼星吉气自然。",
    wuXing: "随本宫",
    source: "《八宅明镜·伏位》",
  },
  "生气": {
    level: "大吉",
    suitable: "大门、客厅、主卧、书房、催子",
    taboo: "不宜做厕所、储物间",
    detail: "生气贪狼星，为八宅第一吉星。主生发之气，旺丁旺财，催官显贵。生气方宜开门纳气、安床养身。在此方活动得旺气加身，事业上升家庭和乐。",
    huaJie: "吉方宜扩大利用，多在此方活动。",
    wuXing: "木",
    source: "《八宅明镜·贪狼生气》",
  },
  "延年": {
    level: "大吉",
    suitable: "主卧、老人房、安床、催寿",
    taboo: "不宜见厨房火气直冲",
    detail: "延年武曲星，主长寿、婚姻、贵人。延年方最宜主卧安床，夫妻和睦长命百岁。老人居此方延年益寿，适合作婚房增进夫妻感情。",
    huaJie: "吉方宜净宜静，安放铜葫芦增强延年之力。",
    wuXing: "金",
    source: "《八宅明镜·武曲延年》",
  },
  "天医": {
    level: "吉",
    suitable: "厨房、餐厅、养病房、药房",
    taboo: "不宜堆杂物、不宜阴暗",
    detail: "天医巨门星，主健康、财运、治病康复。天医方宜做厨房餐厅，饮食养身。病人居此方可助康复，药店诊所此方最宜。天医又为财星之一，安灶于此利财。",
    huaJie: "吉方宜保持明亮通风，可摆放白玉或水晶。",
    wuXing: "土",
    source: "《八宅明镜·巨门天医》",
  },
  "六煞": {
    level: "次凶",
    suitable: "厕所、浴室、杂物间",
    taboo: "不宜做卧房、书房、不宜长期坐卧",
    detail: "六煞文曲星，主淫邪、口舌、是非。此方气场不正，长期坐卧易招惹烂桃花和口舌是非。宜布置为厕所浴室，以污水浊气冲和其不正之气。",
    huaJie: "若已是卧房，宜多开窗保持通风，安放金属物品以金泄其水气（六煞属水，金生水但金亦为正气）。忌粉色红色布置。",
    wuXing: "水",
    source: "《八宅明镜·文曲六煞》",
  },
  "绝命": {
    level: "大凶",
    suitable: "厕所、储物间",
    taboo: "绝不可做卧房、大门、客厅",
    detail: "绝命破军星，为八宅第一凶星。主绝嗣、横祸、恶疾。此方气场极凶，万不可安床开门。只宜布置为厕所或堆放杂物的储藏间，以污浊之气对冲。",
    huaJie: "不可在绝命方长期坐卧。若无法改造格局，须安放八卦凸镜、铜葫芦、或泰山石敢当于该方镇压。忌用红色物品。",
    wuXing: "金",
    source: "《八宅明镜·破军绝命》",
  },
  "祸害": {
    level: "次凶",
    suitable: "厕所、储藏室",
    taboo: "不宜安床、不宜做客厅、不宜长期坐卧",
    detail: "祸害禄存星，主破财、口舌、灾祸。虽不如绝命五鬼之凶，但长期在此方活动会招致小人和破耗。最宜做厕所或储藏室。",
    huaJie: "若已是卧房，宜安放红色物品（火生土泄其煞），或悬挂五帝钱化解。此处不宜养植物（木克土反激煞气）。",
    wuXing: "土",
    source: "《八宅明镜·禄存祸害》",
  },
  "五鬼": {
    level: "大凶",
    suitable: "厕所、储藏室",
    taboo: "最忌做卧房、办公、书房",
    detail: "五鬼廉贞星，主火灾、口舌、是非、邪祟。五鬼为第二凶星，气场极不稳定。此方做卧房易生噩梦、精神不安。做办公室则口舌不断、同事反目。最宜布置为厕所。",
    huaJie: "五鬼方最需要化解。宜安放铜铃或金属风铃（金生水泄五鬼火气），或摆放白色水晶簇。切忌红色、尖角、发热电器靠近。若必须在此方工作，面朝吉方背对凶方。",
    wuXing: "火",
    source: "《八宅明镜·廉贞五鬼》",
  },
};

// 命卦计算（按出生年份和性别）
// 《八宅明镜》命卦法：以生年计算，1900年为基准
function calcMingGua(birthYear: number, gender: "男" | "女"): string {
  let sum = 0;
  const yearStr = birthYear.toString();
  for (const digit of yearStr) {
    sum += parseInt(digit);
  }
  // 简化：按洛书数计算
  if (sum >= 10) {
    sum = Math.floor(sum / 10) + (sum % 10);
  }

  let guaNum: number;
  if (gender === "男") {
    guaNum = 11 - sum;
  } else {
    guaNum = 4 + sum;
  }

  // 化为1-9
  while (guaNum > 9) guaNum -= 9;
  if (guaNum === 5) guaNum = gender === "男" ? 2 : 8; // 中宫寄坤(男)/艮(女)

  const numToGua: Record<number, string> = {
    1: "坎", 2: "坤", 3: "震", 4: "巽", 6: "乾", 7: "兑", 8: "艮", 9: "离",
  };
  return numToGua[guaNum] || "坎";
}

// 东西四命
const DONG_XI_MING: Record<string, string> = {
  "坎":"东四命", "离":"东四命", "震":"东四命", "巽":"东四命",
  "乾":"西四命", "坤":"西四命", "艮":"西四命", "兑":"西四命",
};

// 东西四宅
const DONG_XI_ZHAI: Record<string, string> = {
  "坎":"东四宅", "离":"东四宅", "震":"东四宅", "巽":"东四宅",
  "乾":"西四宅", "坤":"西四宅", "艮":"西四宅", "兑":"西四宅",
};

// 命卦对应游年（简化大游年法）
function getYouNian(mingGua: string, gongWei: string): string {
  const idx = BA_GUA.indexOf(mingGua);
  const targetIdx = BA_GUA.indexOf(gongWei);
  if (idx < 0 || targetIdx < 0) return "伏位";
  return YOU_NIAN_ORDER[(targetIdx - idx + 8) % 8];
}

// 命卦详细信息
const MING_GUA_INFO: Record<string, string> = {
  "坎": "坎为水，中男。坎命人聪明智慧，善于谋略，但性格内向多忧。宜东四宅（坎离震巽），忌西四宅。",
  "离": "离为火，中女。离命人热情开朗，注重外表，但性情急躁冲动。宜东四宅，忌西四宅。",
  "震": "震为雷，长男。震命人行动力强，积极进取，但易暴躁鲁莽。宜东四宅，忌西四宅。",
  "巽": "巽为风，长女。巽命人温文尔雅，善于变通，但易优柔寡断。宜东四宅，忌西四宅。",
  "乾": "乾为天，老父。乾命人刚毅果断，有领导力，但易刚愎自用。宜西四宅（乾坤艮兑），忌东四宅。",
  "坤": "坤为地，老母。坤命人稳重包容，忍耐力强，但易固执保守。宜西四宅，忌东四宅。",
  "艮": "艮为山，少男。艮命人踏实稳重，诚信可靠，但易安于现状。宜西四宅，忌东四宅。",
  "兑": "兑为泽，少女。兑命人善于言辞，活泼好动，但易轻浮善变。宜西四宅，忌东四宅。",
};

export function calculateBaZhaiGongWei(input: Record<string, unknown>): BaZhaiGongWeiResult {
  const mingGuaIn = (input.mingGua as string) || "";
  const zuoXiang = (input.zuoXiang as string) || "";
  const birthYear = (input.birthYear as number) || 0;
  const gender = (input.gender as "男" | "女") || "男";

  // 如果提供了出生年，自动计算命卦
  let mingGua = mingGuaIn;
  let mingGuaInfo = "";
  if (!mingGua && birthYear >= 1900) {
    mingGua = calcMingGua(birthYear, gender);
    mingGuaInfo = `根据${birthYear}年出生（${gender}）自动推算命卦为${mingGua}。`;
  } else if (mingGua && MING_GUA_INFO[mingGua]) {
    mingGuaInfo = MING_GUA_INFO[mingGua];
  } else {
    mingGua = mingGua || "坎";
    mingGuaInfo = MING_GUA_INFO[mingGua] || "";
  }

  const gongWeiList: GongWeiJiXiong[] = [];
  for (const gua of BA_GUA) {
    const yn = getYouNian(mingGua, gua);
    const ynInfo = YOU_NIAN_DETAIL[yn];
    gongWeiList.push({
      gongWei: gua + "宫",
      direction: DIR_NAME[gua] || gua,
      youNian: yn,
      jiXiong: ynInfo.level.includes("凶") ? "凶" : "吉",
      level: ynInfo.level,
      suitable: ynInfo.suitable,
      taboo: ynInfo.taboo,
      detail: ynInfo.detail,
      huaJie: ynInfo.huaJie,
      wuXing: ynInfo.wuXing,
    });
  }

  // 方位名→卦名映射
  const DIR_TO_GUA: Record<string, string> = {
    "北":"坎","南":"离","东":"震","西":"兑",
    "东南":"巽","东北":"艮","西南":"坤","西北":"乾",
  };
  // 宅命配合分析
  let zhaiMingPeiHe = "";
  if (zuoXiang) {
    const rawDir = zuoXiang.includes("坐") ? zuoXiang.split("坐")[1] : zuoXiang;
    const dirLong = rawDir?.slice(0, 2) || "";
    const dir = DIR_TO_GUA[dirLong] ? dirLong : rawDir?.slice(0, 1) || "";
    const zhaiGua = DIR_TO_GUA[dir] || dir.slice(0, 1);
    const mingXi = DONG_XI_MING[mingGua];
    const zhaiXi = DONG_XI_ZHAI[zhaiGua] || "";
    if (mingXi && zhaiXi && mingXi === zhaiXi) {
      zhaiMingPeiHe = `宅命相配：${mingGua}命属${mingXi}，坐向${zuoXiang}属${zhaiXi}，东/西四宅与命卦一致，为宅命相配之吉宅。`;
    } else if (mingXi && zhaiXi) {
      zhaiMingPeiHe = `宅命不配：${mingGua}命属${mingXi}，但坐向${zuoXiang}属${zhaiXi}，宅命相克。宜通过内部布局调整：将大门、主卧、厨房安在命卦吉方化解。`;
    }
  }

  const jiCount = gongWeiList.filter(g => g.jiXiong === "吉").length;
  const jiGong = gongWeiList.filter(g => g.jiXiong === "吉");
  const xiongGong = gongWeiList.filter(g => g.jiXiong === "凶");

  const summary = [
    `【八宅宫位吉凶报告】${mingGua}命${gender === "女" ? "（女）" : ""}`,
    ``,
    mingGuaInfo ? `${mingGuaInfo}` : "",
    ``,
    `┌─ 命卦信息 ─────────────────`,
    `│ 命卦：${mingGua}（${DIR_NAME[mingGua]}方）${DONG_XI_MING[mingGua] || ""}`,
    `│ 五行：${GUA_WX[mingGua] || ""} 八卦：${BA_GUA.indexOf(mingGua) >= 0 ? (["坎","离","震","巽","乾","坤","艮","兑"][BA_GUA.indexOf(mingGua)] === mingGua ? ["坎中男","离中女","震长男","巽长女","乾老父","坤老母","艮少男","兑少女"][BA_GUA.indexOf(mingGua)] : "") : ""}`,
    zhaiMingPeiHe ? `│ ${zhaiMingPeiHe}` : "",
    ``,
    `├─ 八宫游年分布 ─────────────────`,
    `│ 吉方（${jiCount}个）：`,
    ...jiGong.map(g => `│  · ${g.gongWei}（${g.direction}）— ${g.youNian} ${g.level} — ${g.suitable.substring(0, 30)}`),
    `│`,
    `│ 凶方（${8 - jiCount}个）：`,
    ...xiongGong.map(g => `│  · ${g.gongWei}（${g.direction}）— ${g.youNian} ${g.level} — ${g.taboo.substring(0, 30)}`),
    ``,
    `├─ 布局要点 ─────────────────`,
    `│ 1. 大门宜开在生气方或延年方，纳天地吉气`,
    `│ 2. 主卧宜安在延年方或生气方，旺丁旺财`,
    `│ 3. 厨房宜在天医方，饮食养身`,
    `│ 4. 厕所宜在绝命方或五鬼方，以污治凶`,
    `│ 5. 书房宜在伏位或生气方，文昌最利`,
    `│ 6. 客厅宜在生气方或延年方，家人同享吉气`,
    ``,
    `├─ 宅命配合 ─────────────────`,
    `│ ${mingGua}命宜住${DONG_XI_MING[mingGua] === "东四命" ? "东四宅（坎离震巽）" : "西四宅（乾坤艮兑）"}`,
    `│ ${mingGua}命忌住${DONG_XI_MING[mingGua] === "东四命" ? "西四宅（乾坤艮兑）" : "东四宅（坎离震巽）"}`,
    `│ ${zhaiMingPeiHe || "未提供宅坐向，无法判断宅命配合。建议提供坐向以获得完整分析。"}`,
    ``,
    `└─ 古籍参考 ─────────────────`,
    `   《八宅明镜》：「宅以形势为体，以命卦为用。」`,
    `   《阳宅三要》：「门主灶三者，各得其所，则家道昌隆。」`,
    `   《阳宅十书》：「东四命住东四宅，西四命住西四宅，吉莫大焉。」`,
    ``,
    `八宅之法，以命卦配宅卦，以游年定吉凶。吉方宜高大、宜开门、宜安床；凶方宜低小、宜厕所、宜储藏。`,
  ].filter(Boolean).join("\n");

  return { mingGua: `${mingGua}命`, mingGuaInfo, gongWeiList, summary, zhaiMingPeiHe };
}
