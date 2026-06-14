// ── 面相分析计算引擎 ──
// 算法参考：《麻衣神相》《柳庄相法》《神相全编》
// 麻衣神相·柳庄相法：五行面型 + 五官 + 三停 + 十二宫 + 痣相 + 气色

import type { MianXiangResult, MianXiangInput, MianXiangDimension, FeatureDetail, FaceShape, ForeheadType, ForeheadLineCount, EyeShape, EyebrowShape, NoseShape, MouthShape, EarShape, EarPosition, BoneType, ChinShape, MoleLocation, SanTingType, Complexion } from "@guoxue/shared";

// ═══════════════ 五行面型数据库 ═══════════════

const FACE_SHAPE_DB: Record<FaceShape, { element: string; desc: string; traits: string[] }> = {
  "金形面": { element: "金", desc: "面形方正，棱角分明，骨感突出，肤色白净。金形面者刚正不阿，重义轻财。", traits: ["刚正不阿", "讲义气", "执行力强", "重原则"] },
  "木形面": { element: "木", desc: "面形修长偏瘦，眉清目秀，鼻直口方。木形面者仁慈善良，好学上进。", traits: ["仁慈善良", "好学上进", "有创造力", "清高孤傲"] },
  "水形面": { element: "水", desc: "面形圆润丰满，额头宽阔，下巴圆润。水形面者聪明圆融，善于处世。", traits: ["聪明圆融", "善于社交", "适应力强", "多情善变"] },
  "火形面": { element: "火", desc: "面形上尖下宽，颧骨突出，眉浓眼大。火形面者热情奔放，行动力强。", traits: ["热情奔放", "行动力强", "急躁易怒", "竞争心强"] },
  "土形面": { element: "土", desc: "面形厚重敦实，鼻大唇厚，下颌宽厚。土形面者稳重诚信，厚道可靠。", traits: ["稳重诚信", "厚道可靠", "耐心持久", "不善变通"] },
};

// ═══════════════ 五官解读数据库 ═══════════════

const EYEBROW_MEANING: Record<EyebrowShape, { meaning: string; fortune: string }> = {
  "剑眉": { meaning: "剑眉倒竖，英气逼人，主刚毅果断，有领导才能。", fortune: "事业有成，适合军警政法管理岗。" },
  "弯眉": { meaning: "弯眉如新月，性格温和，心地善良，人缘好。", fortune: "贵人运佳，人际关系是最大财富。" },
  "一字眉": { meaning: "一字横眉，性格直率刚硬，不善妥协。", fortune: "靠实力说话，但宜学会变通。" },
  "八字眉": { meaning: "八字眉下垂，性格懦弱犹豫，易受人影响。", fortune: "宜找到强势伴侣互补，不宜独立决策。" },
  "柳叶眉": { meaning: "柳叶细眉，温柔多情，审美眼光好。", fortune: "桃花运旺，适合文艺相关行业。" },
  "浓眉": { meaning: "浓眉大眼，精力充沛，行动力强。", fortune: "事业运佳，吃苦耐劳有回报。" },
  "淡眉": { meaning: "眉淡稀疏，性格淡漠低调，不喜出风头。", fortune: "宜深耕技术，靠专业立足。" },
};

const EYE_MEANING: Record<EyeShape, { meaning: string; fortune: string }> = {
  "丹凤眼": { meaning: "丹凤眼细长上扬，主智慧超群，眼光独到，贵人之相。", fortune: "仕途顺利，富贵双全之眼相。" },
  "桃花眼": { meaning: "桃花眼含情脉脉，异性缘极佳，但易招惹桃花劫。", fortune: "感情经历丰富，宜晚婚以定心性。" },
  "圆眼": { meaning: "圆眼明亮，心地纯真善良，好奇心强。", fortune: "人缘好但防小人，不宜轻易信人。" },
  "细长眼": { meaning: "细长眼睛，心思缜密，善于观察分析。", fortune: "适合研究分析类工作，洞察力强。" },
  "三角眼": { meaning: "三角眼棱角分明，主精明但多疑，善权谋。", fortune: "商业头脑好，但宜注意人际关系。" },
  "大小眼": { meaning: "两眼大小不一，主心思不定，时而自信时而自卑。", fortune: "需坚定内心，找到自信来源。" },
};

const NOSE_MEANING: Record<NoseShape, { meaning: string; fortune: string }> = {
  "悬胆鼻": { meaning: "悬胆鼻圆润饱满如山，鼻头有肉，主财运亨通，中年发达。", fortune: "财运极佳，中年后财富积累迅速。" },
  "鹰钩鼻": { meaning: "鹰钩鼻鼻梁高挺带钩，主精明善算计，商业头脑一流。", fortune: "善于理财，但宜注意人缘。" },
  "蒜头鼻": { meaning: "蒜头鼻鼻头肥大，主厚道实在，不善心计。", fortune: "靠诚实守信积累财富，虽慢但稳。" },
  "狮子鼻": { meaning: "狮子鼻鼻翼宽阔，主气魄宏大，有领导力。", fortune: "适合做大事业，格局宏大。" },
  "露孔鼻": { meaning: "鼻孔外露（朝天鼻），主漏财之相，钱财难聚。", fortune: "宜学会储蓄理财，避免铺张浪费。" },
  "直鼻": { meaning: "直鼻端正挺拔，主为人正直，做事有底线。", fortune: "靠口碑和信誉立足，长期有利。" },
};

const MOUTH_MEANING: Record<MouthShape, { meaning: string; fortune: string }> = {
  "四字口": { meaning: "四字口唇形方正，口角分明，主一生衣食无忧。", fortune: "福禄双全，晚年生活富足安康。" },
  "仰月口": { meaning: "仰月口嘴角上扬如弯月，主乐观开朗，人见人爱。", fortune: "人际关系好，处处遇贵人。" },
  "覆船口": { meaning: "覆船口嘴角下垂如覆舟，主性格悲观，易生抱怨。", fortune: "宜调整心态，学会感恩知足。" },
  "樱桃口": { meaning: "樱桃小口唇红齿白，主秀气文雅，口才不错。", fortune: "人际关系好，适合与人打交道的工作。" },
  "吹火口": { meaning: "吹火口唇形前突如吹火，主好说是非，言多必失。", fortune: "宜谨言慎行，少说多做。" },
};

const EAR_MEANING: Record<EarShape, { meaning: string; fortune: string }> = {
  "贴脑耳": { meaning: "贴脑耳紧贴头颅，主聪慧过人，善解人意。", fortune: "少年得志，学业事业皆有成。" },
  "兜风耳": { meaning: "兜风耳（招风耳）外展，主个性独立，不喜束缚。", fortune: "适合自由职业或创业，不宜打工。" },
  "垂珠耳": { meaning: "垂珠耳耳垂厚大如珠，主福泽深厚，长寿富贵。", fortune: "晚年福气好，子女孝顺有出息。" },
  "反骨耳": { meaning: "反骨耳廓外翻，主个性叛逆，不循常规。", fortune: "走不寻常路反而有成就，但过程曲折。" },
  "无轮耳": { meaning: "无轮耳耳廓不明显，主出身平凡，需靠自己。", fortune: "白手起家之相，后天努力改命。" },
};

// ═══════════════ 三停解读 ═══════════════

const SANTING_MEANING: Record<SanTingType, { meaning: string; fortune: string }> = {
  "均衡": { meaning: "三停均等，天地人三才和谐，一生运势平稳。", fortune: "少年得志，中年发达，晚年幸福。" },
  "上停长": { meaning: "上停（发际至眉）偏长，主少年得志，早慧聪明。", fortune: "早年运势好，学业顺利，青年有成就。" },
  "中停长": { meaning: "中停（眉至鼻尖）偏长，主中年运势旺盛。", fortune: "中年事业有成，是人生巅峰期。" },
  "下停长": { meaning: "下停（鼻尖至下巴）偏长，主大器晚成，晚运佳。", fortune: "晚年运势好，越老越有福气。" },
};

// ═══════════════ 十二宫简表 ═══════════════

const TWELVE_PALACES: { name: string; location: string; governs: string }[] = [
  { name: "命宫", location: "眉心印堂", governs: "总体运势根基" },
  { name: "财帛宫", location: "鼻子", governs: "财运财富" },
  { name: "兄弟宫", location: "眉毛", governs: "兄弟姐妹关系" },
  { name: "田宅宫", location: "上眼皮", governs: "房产家宅" },
  { name: "男女宫", location: "下眼皮卧蚕", governs: "子女后代" },
  { name: "奴仆宫", location: "下巴两侧", governs: "下属佣人" },
  { name: "妻妾宫", location: "眼尾鱼尾", governs: "夫妻姻缘" },
  { name: "疾厄宫", location: "鼻梁山根", governs: "健康疾病" },
  { name: "迁移宫", location: "额头两侧", governs: "出行变动" },
  { name: "官禄宫", location: "额头正中", governs: "事业官运" },
  { name: "福德宫", location: "眉尾上方", governs: "福报享受" },
  { name: "相貌宫", location: "整体面形", governs: "容貌气质" },
];

// ═══════════════ 痣相数据库 ═══════════════

const MOLE_MEANING: Record<MoleLocation, { meaning: string; fortune: string }> = {
  "none": { meaning: "面无痣，主一生平顺，少波折。", fortune: "运势平稳，无大起大落。" },
  "额头": { meaning: "额头有痣（天庭痣），主早年离家发展，或外地发达。", fortune: "适合外出发展，外地有贵人。" },
  "眉心": { meaning: "眉心（印堂）有痣，主心思细腻，但多愁善感。", fortune: "艺术天赋高，但宜注意情绪管理。" },
  "眼角": { meaning: "眼角有痣（泪痣），主多情善感，桃花运旺。", fortune: "感情丰富，但需防情伤。" },
  "鼻头": { meaning: "鼻头有痣（财帛宫痣），主财运有波动。", fortune: "宜保守理财，不宜高风险投资。" },
  "脸颊": { meaning: "脸颊有痣（颧骨痣），主社交能力强，人缘好。", fortune: "朋友多助力大，但宜分辨真心。" },
  "嘴角": { meaning: "嘴角有痣（食痣），主口福不错，一生不愁吃喝。", fortune: "衣食无忧，宜注意饮食健康。" },
  "下巴": { meaning: "下巴有痣（地阁痣），主晚年有福，不动产运好。", fortune: "晚年运势不错，适合投资房产。" },
};

// ═══════════════ 辅助解读数据库 ═══════════════

const FOREHEAD_MEANING: Record<ForeheadType, string> = {
  "宽阔": "额头宽阔饱满（天庭饱满），主少年聪慧，学业有成，早年运势佳。",
  "狭窄": "额头偏窄，主早年运势平平，需靠后天努力，中年后方可发力。",
  "适中": "额头大小适中，主早年运势稳定，不疾不徐。",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FOREHEAD_LINE_MEANING: Record<ForeheadLineCount, string> = {
  "无": "额头光滑无纹，主心思单纯，少烦恼。",
  "一条": "额头一条纹（天纹），主有恒心毅力，做事专一。",
  "两条": "额头两条纹（天地纹），主思虑周全，做事有计划。",
  "三条以上": "额头多条纹，主思虑过多，宜学会放松。",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CHEEKBONE_MEANING: Record<BoneType, string> = {
  "高耸": "颧骨高耸，主权柄在握，有领导力，但需防过于强势。",
  "适中": "颧骨大小适中，主性格平和，人际关系良好。",
  "低平": "颧骨低平，主性格温和低调，不喜争权夺利。",
};

const CHIN_MEANING: Record<ChinShape, string> = {
  "圆润": "下巴圆润饱满（地阁方圆），主晚年运势好，福泽深厚。",
  "尖": "下巴尖削，主晚年运势偏弱，宜提前规划养老。",
  "方": "下巴方正，主意志坚定，做事有始有终。",
  "短": "下巴偏短，主性格急躁，需耐心培养。",
  "长": "下巴偏长，主有恒心耐力，但有时固执。",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EAR_POSITION_MEANING: Record<EarPosition, string> = {
  "高": "耳位高（耳高于眉），主聪明早慧，少年得志。",
  "中": "耳位适中（耳与眉齐），主资质中等，稳扎稳打。",
  "低": "耳位低（耳低于眉），主大器晚成，晚年运势好。",
};

const COMPLEXION_MEANING: Record<Complexion, { meaning: string; fortune: string }> = {
  "红润": { meaning: "面色红润光泽，气血旺盛，运势正佳。", fortune: "诸事顺利，利求财求职。" },
  "白净": { meaning: "面色白净，金形之色，主头脑清晰。", fortune: "适合脑力工作，决策力强。" },
  "黄": { meaning: "面色偏黄，土形之色，主脾胃需注意。", fortune: "运势平稳，宜关注健康。" },
  "青": { meaning: "面色偏青，木形之色，主肝气郁结。", fortune: "近期压力大，宜放松调整。" },
  "黑": { meaning: "面色偏暗，水形之色，主肾气不足。", fortune: "宜注意休息，减少熬夜。" },
};

// ═══════════════ 评分辅助 ═══════════════

function scoreLevel(value: string, goodValues: string[]): number {
  const vHash = value.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  if (goodValues.includes(value)) return 85 + (vHash % 10);
  return 55 + (vHash % 15);
}

function dimLevel(score: number): string {
  if (score >= 85) return "上等";
  if (score >= 70) return "中上";
  if (score >= 55) return "中等";
  if (score >= 40) return "中下";
  return "下等";
}

// ═══════════════ 主计算函数 ═══════════════

export function calculateMianXiang(input: Record<string, unknown>): MianXiangResult {
  const data = input as unknown as MianXiangInput;
  const faceDb = FACE_SHAPE_DB[data.faceShape ?? "土形面"];
  const genderPrefix = data.gender === "女" ? "女性" : "男性";

  // ── 五官特征汇总 ──
  const features: FeatureDetail[] = [
    { name: "眉", category: "兄弟宫", value: data.eyebrowShape ?? "弯眉", ...EYEBROW_MEANING[data.eyebrowShape ?? "弯眉"] },
    { name: "眼", category: "命宫/妻妾宫", value: data.eyeShape ?? "丹凤眼", ...EYE_MEANING[data.eyeShape ?? "丹凤眼"] },
    { name: "鼻", category: "财帛宫", value: data.noseShape ?? "直鼻", ...NOSE_MEANING[data.noseShape ?? "直鼻"] },
    { name: "口", category: "出纳宫", value: data.mouthShape ?? "四字口", ...MOUTH_MEANING[data.mouthShape ?? "四字口"] },
    { name: "耳", category: "采听宫", value: data.earShape ?? "贴脑耳", ...EAR_MEANING[data.earShape ?? "贴脑耳"] },
  ];

  // ── 十二宫分析 ──
  const twelvePalaces = TWELVE_PALACES.map(p => {
    let status = "平";
    let desc = "";
    switch (p.name) {
      case "命宫": status = data.foreheadType === "宽阔" ? "吉" : "平"; desc = `${FOREHEAD_MEANING[data.foreheadType ?? "适中"]} 命宫主一生根基。`; break;
      case "财帛宫": status = data.noseShape === "悬胆鼻" || data.noseShape === "狮子鼻" ? "吉" : data.noseShape === "露孔鼻" ? "弱" : "平"; desc = `${NOSE_MEANING[data.noseShape ?? "直鼻"].fortune}`; break;
      case "兄弟宫": status = data.eyebrowShape === "剑眉" || data.eyebrowShape === "弯眉" ? "吉" : "平"; desc = EYEBROW_MEANING[data.eyebrowShape ?? "弯眉"].fortune; break;
      case "妻妾宫": status = data.eyeShape === "丹凤眼" ? "吉" : "平"; desc = `${genderPrefix}鱼尾纹宜浅不宜深，${data.eyeShape}相配。`; break;
      case "官禄宫": status = data.foreheadType === "宽阔" ? "吉" : "平"; desc = "额头（天庭）主官禄，饱满为佳。"; break;
      case "疾厄宫": status = data.noseShape === "悬胆鼻" ? "吉" : "平"; desc = "山根（鼻梁）高挺者抗病力强。"; break;
      case "相貌宫": status = "吉"; desc = `${faceDb.desc.slice(0, 40)}`; break;
      default: desc = "需结合整体面相对照。";
    }
    return { name: p.name, status, desc };
  });

  // ── 维度评分 ──
  const noseScore = scoreLevel(data.noseShape ?? "直鼻", ["悬胆鼻", "狮子鼻", "直鼻"]);
  const eyeScore = scoreLevel(data.eyeShape ?? "丹凤眼", ["丹凤眼", "桃花眼", "圆眼"]);
  const mouthScore = scoreLevel(data.mouthShape ?? "四字口", ["四字口", "仰月口", "樱桃口"]);
  const browScore = scoreLevel(data.eyebrowShape ?? "弯眉", ["剑眉", "弯眉", "柳叶眉"]);
  const earScore = scoreLevel(data.earShape ?? "贴脑耳", ["贴脑耳", "垂珠耳"]);

  const overallScore = Math.round(noseScore * 0.25 + eyeScore * 0.2 + mouthScore * 0.15 + browScore * 0.1 + earScore * 0.1 + 60 * 0.2);

  const sanTingInfo = SANTING_MEANING[data.sanTing ?? "均衡"];
  const complexionInfo = COMPLEXION_MEANING[data.complexion ?? "红润"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const moleInfo = MOLE_MEANING[data.notableMoles ?? "none"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const chinInfo = CHIN_MEANING[data.chinShape ?? "圆润"];

  const overview = `${faceDb.desc} ${sanTingInfo.meaning} ${complexionInfo.meaning} 综合${overallScore >= 80 ? "面格不错，五官端正，一生运势整体向好。" : overallScore >= 60 ? "面相中等，有可取之处，亦有待修之处。" : "面相有不足之处，但相由心生，后天修养可改。"}`;

  const personality = buildPersonality(data, faceDb);
  const career = buildCareer(data, sanTingInfo);
  const wealth = buildWealth(data, noseScore);
  const love = buildLove(data);
  const health = buildHealth(data, complexionInfo);

  return {
    input: data,
    meta: {
      faceShapeName: data.faceShape ?? "土形面",
      faceShapeElement: faceDb.element,
      faceShapeDesc: faceDb.desc,
      sanTingDesc: sanTingInfo.meaning,
      ageGroup: data.age ? (data.age < 30 ? "青年" : data.age < 50 ? "中年" : "中老年") : "未知",
    },
    overallScore,
    overallLevel: dimLevel(overallScore),
    overview,
    personality,
    career,
    wealth,
    love,
    health,
    features,
    twelvePalaces,
    advice: generateAdvice(data, overallScore),
  };
}

function buildPersonality(data: MianXiangInput, faceDb: { traits: string[]; element: string }): MianXiangDimension {
  const traits = [...faceDb.traits];
  if (data.eyeShape === "丹凤眼") traits.push("智慧超群");
  if (data.eyeShape === "桃花眼") traits.push("魅力四射");
  if (data.mouthShape === "仰月口") traits.push("乐观开朗");
  if (data.foreheadType === "宽阔") traits.push("聪明过人");
  if (data.cheekboneType === "高耸") traits.push("权力欲望");
  const faceHash = data.faceShape.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const score = 70 + (faceHash % 20);
  return { score, level: dimLevel(score), traits: traits.slice(0, 6), desc: `面型为${data.faceShape}，属${faceDb.element}。${traits.slice(0, 4).join("、")}。${data.sanTing === "均衡" ? "三停均等，性格均衡发展。" : ""}` };
}

function buildCareer(data: MianXiangInput, sanTingInfo: { meaning: string; fortune: string }): MianXiangDimension {
  const traits: string[] = [];
  if (data.foreheadType === "宽阔") traits.push("事业起点高，易获得好机会");
  if (data.noseShape === "悬胆鼻" || data.noseShape === "狮子鼻") traits.push("中年事业有成，财运亨通");
  if (data.cheekboneType === "高耸") traits.push("权力在握，适合管理岗");
  if (data.chinShape === "圆润" || data.chinShape === "方") traits.push("晚运佳，老有所依");
  const score = data.foreheadType === "宽阔" ? 82 : data.foreheadType === "适中" ? 68 : 52;
  return { score, level: dimLevel(score), traits, desc: `${sanTingInfo.fortune} ${traits.join("；")}` };
}

function buildWealth(data: MianXiangInput, noseScore: number): MianXiangDimension {
  const traits: string[] = [];
  const nose = NOSE_MEANING[data.noseShape ?? "直鼻"];
  traits.push(nose.fortune);
  if (data.mouthShape === "四字口") traits.push("口福好，一生衣食无忧");
  if (data.chinShape === "圆润") traits.push("不动产运佳，晚年有依靠");
  return { score: noseScore, level: dimLevel(noseScore), traits, desc: `${nose.meaning} ${traits.join("；")}` };
}

function buildLove(data: MianXiangInput): MianXiangDimension {
  const traits: string[] = [];
  if (data.eyeShape === "桃花眼") { traits.push("异性缘极佳，桃花运旺"); }
  else if (data.eyeShape === "丹凤眼") { traits.push("眼光高，对伴侣要求严格"); }
  else { traits.push("感情运势平稳"); }
  if (data.mouthShape === "仰月口") traits.push("夫妻关系和睦");
  if (data.mouthShape === "覆船口") traits.push("感情中容易抱怨，需注意沟通");
  const score = data.eyeShape === "丹凤眼" ? 78 : data.eyeShape === "桃花眼" ? 65 : 70;
  return { score, level: dimLevel(score), traits, desc: `${data.gender === "女" ? "女性" : "男性"}${data.eyeShape}，${traits.join("。")}` };
}

function buildHealth(data: MianXiangInput, complexionInfo: { meaning: string; fortune: string }): MianXiangDimension {
  const traits: string[] = [complexionInfo.meaning];
  if (data.noseShape === "悬胆鼻") traits.push("身体素质好，抵抗力强");
  if (data.earShape === "垂珠耳") traits.push("长寿之相");
  if (data.sanTing === "下停长") traits.push("晚运健康需关注");
  const score = data.complexion === "红润" ? 85 : data.complexion === "白净" ? 75 : 58;
  return { score, level: dimLevel(score), traits, desc: complexionInfo.fortune + " " + traits.slice(1).join("；") };
}

function generateAdvice(data: MianXiangInput, _score: number): string[] {
  const advice: string[] = [];
  if (data.mouthShape === "吹火口" || data.mouthShape === "覆船口") advice.push("谨言慎行，少说是非，多积口德。");
  if (data.noseShape === "露孔鼻") advice.push("学会理财，控制支出，养成储蓄习惯。");
  if (data.complexion === "青" || data.complexion === "黑") advice.push("注意休息，调理身体，气色为运势之窗。");
  if (data.foreheadType === "狭窄") advice.push("早年运势虽平，但后天努力可以弥补。");
  if (data.notableMoles !== "none") advice.push(`${MOLE_MEANING[data.notableMoles ?? "none"].fortune}`);
  if (advice.length === 0) advice.push("相由心生，保持善念善行，运势自然向好。");
  return advice;
}
