// ── 手相分析计算引擎 ──
// 算法参考：《麻衣神相》《柳庄相法》《神相全编》
// 传统手相学：五行手型 + 五大主线 + 八丘 + 掌色掌质

import type { ShouXiangResult, ShouXiangInput, ShouXiangDimension, LineDetail, HillDetail, HandType, HillStatus, PalmColor, PalmTexture } from "@guoxue/shared";

// ═══════════════ 五行手型数据库 ═══════════════

const HAND_TYPE_DB: Record<HandType, { element: string; desc: string; traits: string[] }> = {
  "金形手": { element: "金", desc: "手掌方正，指节分明，肤色白净，掌肉坚实如金石。此为金形手，主刚毅果断。", traits: ["刚毅果断", "讲义气", "执行力强", "不喜妥协"] },
  "木形手": { element: "木", desc: "手掌修长，指如竹节，掌纹多直而长，肤色偏青。此为木形手，主仁慈博爱。", traits: ["仁慈博爱", "好学上进", "有创造力", "情绪敏感"] },
  "水形手": { element: "水", desc: "手掌圆润饱满，手指短而圆，掌肉柔软有弹性，肤色偏黑。此为水形手，主智慧圆融。", traits: ["聪明灵活", "善于社交", "适应力强", "多情善变"] },
  "火形手": { element: "火", desc: "手掌尖长，指头尖细，掌色红润，掌纹多而深。此为火形手，主热情奔放。", traits: ["热情奔放", "行动力强", "急躁冲动", "领袖气质"] },
  "土形手": { element: "土", desc: "手掌厚实宽大，手指粗短结实，掌肉敦厚，肤色偏黄。此为土形手，主稳重诚信。", traits: ["稳重诚信", "务实可靠", "耐心持久", "不善变通"] },
};

// ═══════════════ 主线解读数据库 ═══════════════

const LINE_MEANING: Record<string, Record<string, { meaning: string; fortune: string }>> = {
  lifeLine: {
    "深长": { meaning: "生命线深长清晰，元气充沛，生命力旺盛，体质强健。", fortune: "健康运势良好，少病少灾，晚年体健。" },
    "浅短": { meaning: "生命线浅短，先天元气稍弱，需注意养生调理。", fortune: "体质偏弱，宜注重饮食起居规律。" },
    "断续": { meaning: "生命线有断续，提示人生可能有重大转折或健康波动。", fortune: "中年时期需特别注意身体健康，定期体检。" },
    "岛纹": { meaning: "生命线上有岛纹，主某阶段精力不济或有隐疾困扰。", fortune: "注意消化系统和慢性疲劳问题。" },
    "锁链": { meaning: "生命线呈锁链状，主一生操劳，精力分散，体质时好时坏。", fortune: "需学会减压，劳逸结合方能长久。" },
    "双线": { meaning: "有副生命线（姐妹线），主生命力超强，遇险有贵人扶持。", fortune: "大难不死之相，生命力远胜常人。" },
  },
  wisdomLine: {
    "深长": { meaning: "智慧线深长清晰，思路清晰，判断力强，善谋略。", fortune: "学业有成，事业靠头脑吃饭，中年后成就显著。" },
    "浅短": { meaning: "智慧线浅短，思维较为简单直接，不善复杂谋划。", fortune: "适合务实工作，不宜冒险投机。" },
    "分叉": { meaning: "智慧线末端分叉（作家叉），主多才多艺，头脑灵活。", fortune: "适合创意型工作，多方向发展反而有利。" },
    "岛纹": { meaning: "智慧线上有岛纹，主某阶段思虑过度，精神压力大。", fortune: "注意神经系统健康，避免过度用脑。" },
    "下垂": { meaning: "智慧线向下弯垂，主想象力丰富，偏感性思维。", fortune: "艺术天赋高，适合文学艺术类工作。" },
    "平直": { meaning: "智慧线平直横穿掌心（悉尼线），主实用主义，理性至上。", fortune: "擅长数理逻辑，不宜感情用事。" },
  },
  emotionLine: {
    "深长": { meaning: "感情线深长清晰，重情重义，情感细腻丰富。", fortune: "婚姻感情稳定，家庭生活和谐美满。" },
    "浅短": { meaning: "感情线浅短，情感表达偏理性，不喜过度亲密。", fortune: "晚婚之相，宜找互补型伴侣。" },
    "波浪": { meaning: "感情线呈波浪起伏，情感世界跌宕多变。", fortune: "感情经历丰富，需学会珍惜眼前人。" },
    "岛纹": { meaning: "感情线上有岛纹，主情感中有困扰或纠结。", fortune: "中年感情运有波动，需用心经营。" },
    "分叉": { meaning: "感情线末端分叉，主情感分散，易三心二意。", fortune: "需明确心意，避免感情纠葛。" },
    "锁链": { meaning: "感情线呈锁链状，主感情之路曲折多磨。", fortune: "早婚不利，宜先立业后成家。" },
  },
  fateLine: {
    "深长": { meaning: "事业线深长清晰，职业生涯路径明确，步步高升。", fortune: "事业运势良好，中年后可达高峰。" },
    "浅短": { meaning: "事业线浅短，事业运平平，需靠努力积累。", fortune: "不宜频繁跳槽，深耕一个领域更有利。" },
    "断续": { meaning: "事业线有断续，主职业道路有中断或转型。", fortune: "中年转型机遇大，宜把握时机。" },
    "双线": { meaning: "有双事业线，主身兼多职或多条收入来源。", fortune: "适合斜杠发展，副业收入可观。" },
    "无": { meaning: "事业线不明显或缺失，主事业方向需自己探索。", fortune: "大器晚成之相，不宜与他人比较。" },
    "弯曲": { meaning: "事业线弯曲，主事业方向多变，不走寻常路。", fortune: "创业之相，不适合一成不变的工作。" },
  },
  marriageLine: {
    "单条清晰": { meaning: "婚姻线单条清晰，主婚姻顺利，一生一次。", fortune: "婚姻幸福美满，夫妻恩爱到老。" },
    "多条": { meaning: "婚姻线多条，主感情经历丰富或再婚可能。", fortune: "宜晚婚，选择成熟稳重的伴侣。" },
    "分叉": { meaning: "婚姻线末端分叉，主婚姻后期可能有分歧。", fortune: "中年婚姻需加强沟通，避免冷战。" },
    "岛纹": { meaning: "婚姻线上有岛纹，主婚姻中有困扰期。", fortune: "需互相信任，渡过难关后感情更深。" },
    "上翘": { meaning: "婚姻线末端上扬，主婚姻运势上升，越老越恩爱。", fortune: "晚年婚姻幸福，子女孝顺。" },
    "下垂": { meaning: "婚姻线下垂，主婚姻压力大或伴侣健康需关注。", fortune: "宜多关心伴侣身心健康。" },
    "无": { meaning: "婚姻线不明显，主婚姻观念淡泊或独身主义。", fortune: "随缘即可，不必强求婚姻形式。" },
  },
};

// ═══════════════ 八丘解读数据库 ═══════════════

const HILL_MEANING: Record<string, Record<string, { meaning: string; fortune: string }>> = {
  jupiterHill: {
    "饱满": { meaning: "木星丘（食指根部）饱满，主志向远大，领导力强，自尊心旺盛。", fortune: "官运亨通，适合从政或管理岗位。" },
    "适中": { meaning: "木星丘大小适中，主心态平和，知足常乐。", fortune: "事业稳步发展，不急不躁。" },
    "平坦": { meaning: "木星丘平坦，主缺乏野心，安于现状。", fortune: "宜做辅助型工作，不宜独立创业。" },
  },
  saturnHill: {
    "饱满": { meaning: "土星丘（中指根部）饱满，主沉静稳重，耐得住寂寞，钻研力强。", fortune: "适合科研学术或技术类工作。" },
    "适中": { meaning: "土星丘大小适中，主踏实可靠，责任心强。", fortune: "靠诚信立足，人缘不错。" },
    "平坦": { meaning: "土星丘平坦，主缺乏耐心，不善处理繁琐事务。", fortune: "宜做短平快项目，不宜长期规划。" },
  },
  apolloHill: {
    "饱满": { meaning: "太阳丘（无名指根部）饱满，主才华横溢，名利可得，艺术天赋高。", fortune: "适合文艺创作、演艺或设计行业。" },
    "适中": { meaning: "太阳丘大小适中，主小有才艺，懂得享受生活。", fortune: "事业顺利，生活品质不错。" },
    "平坦": { meaning: "太阳丘平坦，主才艺平平，宜低调务实。", fortune: "不宜追求名利场，踏实生活更好。" },
  },
  mercuryHill: {
    "饱满": { meaning: "水星丘（小指根部）饱满，主口才好，善交际，经商头脑灵活。", fortune: "适合销售、贸易、金融行业。" },
    "适中": { meaning: "水星丘大小适中，主处事灵活，人缘尚可。", fortune: "做事圆融，人脉资源不错。" },
    "平坦": { meaning: "水星丘平坦，主不善言辞，偏内向。", fortune: "宜做技术或后台类工作，少与人打交道。" },
  },
  venusHill: {
    "饱满": { meaning: "金星丘（拇指根部）饱满，主精力旺盛，爱情丰富，生命力强。", fortune: "感情生活丰富，异性缘佳，体质好。" },
    "适中": { meaning: "金星丘大小适中，主感情稳定，生活有节制。", fortune: "婚姻平顺，身体健康。" },
    "平坦": { meaning: "金星丘平坦，主体质偏弱，情感淡漠。", fortune: "宜加强锻炼，感情方面多主动。" },
  },
  marsHill: {
    "饱满": { meaning: "火星丘（掌中区域）饱满，主勇气十足，行动力强，不畏困难。", fortune: "军人、运动员、创业者之相。" },
    "适中": { meaning: "火星丘大小适中，主遇事冷静，进退有度。", fortune: "处理危机能力强，关键时刻不掉链子。" },
    "平坦": { meaning: "火星丘平坦，主胆子较小，宜避开高风险工作。", fortune: "适合稳定工作，不宜冒险投资。" },
  },
  moonHill: {
    "饱满": { meaning: "太阴丘（掌根小指侧）饱满，主想象力丰富，直觉敏锐，有艺术才华。", fortune: "适合创意、文学、艺术类工作。" },
    "适中": { meaning: "太阴丘大小适中，主感觉尚可，想象力适中。", fortune: "工作生活平衡，无大起伏。" },
    "平坦": { meaning: "太阴丘平坦，主缺乏想象力，注重实际。", fortune: "适合务实工作，不宜白日做梦。" },
  },
};

// ═══════════════ 掌色掌质数据库 ═══════════════

const COLOR_MEANING: Record<PalmColor, { health: string; fortune: string }> = {
  "红润": { health: "掌色红润，气血旺盛，身体健康。", fortune: "运势正旺，事事顺遂。" },
  "白": { health: "掌色偏白，气血略虚，宜补气养血。", fortune: "运势平稳，不宜大动作。" },
  "黄": { health: "掌色偏黄，脾胃需注意调理。", fortune: "财运平平，宜节俭度日。" },
  "青": { health: "掌色偏青，肝气郁结，宜疏肝理气。", fortune: "近期压力较大，宜调整心态。" },
};

const TEXTURE_MEANING: Record<PalmTexture, string> = {
  "柔嫩": "掌质柔嫩细腻，主出身家境较好，少历艰辛，宜注意独立性培养。",
  "粗糙": "掌质粗糙偏硬，主白手起家，历经磨练，自力更生能力强。",
  "适中": "掌质软硬适中，主生活平稳，劳逸结合得当。",
};

// ═══════════════ 综合评分规则 ═══════════════

function scoreLine(feature: string): number {
  const fHash = feature.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  if (feature === "深长" || feature === "双线" || feature === "单条清晰" || feature === "上翘") return 90 + (fHash % 10);
  if (feature === "平直" || feature === "分叉") return 75 + (fHash % 10);
  if (feature === "浅短" || feature === "弯曲" || feature === "波浪" || feature === "多条") return 60 + (fHash % 10);
  if (feature === "断续" || feature === "锁链") return 50 + (fHash % 10);
  if (feature === "岛纹" || feature === "下垂") return 45 + (fHash % 10);
  if (feature === "无") return 40 + (fHash % 15);
  return 65;
}

function scoreHill(status: HillStatus): number {
  const sHash = status.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  if (status === "饱满") return 80 + (sHash % 10);
  if (status === "适中") return 65 + (sHash % 10);
  return 50 + (sHash % 10);
}

function dimensionLevel(score: number): string {
  if (score >= 85) return "上等";
  if (score >= 70) return "中上";
  if (score >= 55) return "中等";
  if (score >= 40) return "中下";
  return "下等";
}

// ═══════════════ 主计算函数 ═══════════════

export function calculateShouXiang(input: Record<string, unknown>): ShouXiangResult {
  const data = input as unknown as ShouXiangInput;

  const handType = data.handType ?? "土形手";
  const handDb = HAND_TYPE_DB[handType];

  // ── 主线分析 ──
  const lineKeys = ["lifeLine", "wisdomLine", "emotionLine", "fateLine", "marriageLine"] as const;
  const lineNames: Record<string, string> = {
    lifeLine: "生命线", wisdomLine: "智慧线", emotionLine: "感情线", fateLine: "事业线", marriageLine: "婚姻线",
  };

  const lines: LineDetail[] = lineKeys.map(k => {
    const feat = (data[k] ?? "深长") as string;
    const db = LINE_MEANING[k]?.[feat] ?? { meaning: `${lineNames[k]}特征${feat}，因人而异。`, fortune: "运势因人而异，需结合整体分析。" };
    return { name: lineNames[k], feature: feat, meaning: db.meaning, fortune: db.fortune };
  });

  // ── 八丘分析 ──
  const hillKeys = ["jupiterHill","saturnHill","apolloHill","mercuryHill","venusHill","marsHill","moonHill"] as const;
  const hillNames: Record<string, string> = {
    jupiterHill: "木星丘", saturnHill: "土星丘", apolloHill: "太阳丘", mercuryHill: "水星丘",
    venusHill: "金星丘", marsHill: "火星丘", moonHill: "太阴丘",
  };

  const hills: HillDetail[] = hillKeys.map(k => {
    const status = (data[k] ?? "适中") as string;
    const db = HILL_MEANING[k]?.[status] ?? { meaning: "因人而异。", fortune: "随整体运势而定。" };
    return { name: hillNames[k], status, meaning: db.meaning, fortune: db.fortune };
  });

  // ── 维度评分 ──
  const avgLine = lineKeys.reduce((s,k) => s + scoreLine(data[k] as string), 0) / lineKeys.length;
  const avgHill = hillKeys.reduce((s,k) => s + scoreHill(data[k] as HillStatus), 0) / hillKeys.length;
  const overallScore = Math.round(avgLine * 0.6 + avgHill * 0.3 + 50 * 0.1);

  const personality = buildPersonality(data, handDb);
  const health = buildHealth(data, lines);
  const career = buildCareer(lines, hills);
  const love = buildLove(lines, hills);
  const wealth = buildWealth(lines, hills);

  const colorInfo = COLOR_MEANING[data.palmColor ?? "红润"];
  const textureInfo = TEXTURE_MEANING[data.palmTexture ?? "适中"];
  const leftRight = data.gender === "男" ? "男左女右，左手看先天，右手看后天。" : "男左女右，右手看先天，左手看后天。";

  const overview = `${handDb.desc} ${colorInfo.health} ${textureInfo} 综合来看，${overallScore >= 80 ? "手相格局不错，人生运势整体向好。" : overallScore >= 60 ? "手相中等，有起有落，需努力经营。" : "手相有挑战，但后天的努力可以改变许多。"}`;

  const scoreBar = "█".repeat(Math.round(overallScore / 100 * 10)) + "░".repeat(10 - Math.round(overallScore / 100 * 10));

  const summary = [
    "┌─ 手相分析 ────────────────────────┐",
    `│ 手型：${handType}（${handDb.element}性）`.padEnd(36) + "│",
    `│ 评分：${overallScore}/100 [${scoreBar}] ${dimensionLevel(overallScore)}`.padEnd(36) + "│",
    "├─ 五维运势 ─────────────────────────┤",
    `│ 性格：${personality.score} ${personality.level}  ${personality.traits.slice(0, 2).join("、")}`.padEnd(36) + "│",
    `│ 健康：${health.score} ${health.level}  ${health.traits[0] || ""}`.padEnd(36) + "│",
    `│ 事业：${career.score} ${career.level}  ${career.traits[0] || ""}`.padEnd(36) + "│",
    `│ 感情：${love.score} ${love.level}  ${love.traits[0] || ""}`.padEnd(36) + "│",
    `│ 财运：${wealth.score} ${wealth.level}  ${wealth.traits[0] || ""}`.padEnd(36) + "│",
    "├─ 主线 ─────────────────────────────┤",
    ...lines.map(l => `│ ${l.name}：${l.feature}`.padEnd(36) + "│"),
    "├─ 建议 ─────────────────────────────┤",
    ...generateAdvice(overallScore, data).slice(0, 3).map(a => `│ · ${a.slice(0, 28)}`.padEnd(36) + "│"),
    "├─ 出处 ─────────────────────────────┤",
    "│ 《麻衣神相》《柳庄相法》《神相全编》│",
    "└────────────────────────────────────┘",
  ].join("\n");

  return {
    input: data,
    meta: { handTypeName: handType, handTypeElement: handDb.element, handTypeDesc: handDb.desc, leftRight },
    overallScore,
    overallLevel: dimensionLevel(overallScore),
    overview,
    summary,
    personality,
    health,
    career,
    love,
    wealth,
    lines,
    hills,
    advice: generateAdvice(overallScore, data),
  } as ShouXiangResult & { summary: string };
}

function buildPersonality(data: ShouXiangInput, handDb: { traits: string[]; element: string; desc: string }): ShouXiangDimension {
  const traits = [...handDb.traits];
  const wisdomFeat = data.wisdomLine as string;
  if (wisdomFeat === "分叉") traits.push("多才多艺");
  if (wisdomFeat === "深长") traits.push("头脑清晰");
  if (wisdomFeat === "下垂") traits.push("感性思维");
  if (data.emotionLine === "深长") traits.push("重情重义");
  const score = Math.round((scoreLine(data.wisdomLine as string) + scoreLine(data.emotionLine as string)) / 2);
  return { score, level: dimensionLevel(score), traits: traits.slice(0, 6), desc: `手型为${data.handType}，属${handDb.element}性，${handDb.desc.slice(0, 30)}。${traits.join("、")}。` };
}

function buildHealth(data: ShouXiangInput, lines: LineDetail[]): ShouXiangDimension {
  const lifeFeat = data.lifeLine as string;
  const traits: string[] = [];
  if (lifeFeat === "深长" || lifeFeat === "双线") traits.push("体质强健，元气充沛");
  else if (lifeFeat === "浅短" || lifeFeat === "断续") traits.push("需注重养生，定期体检");
  else traits.push("体质中等，注意劳逸结合");
  const colorInfo = COLOR_MEANING[data.palmColor ?? "红润"];
  traits.push(colorInfo.health);
  const score = scoreLine(lifeFeat);
  return { score, level: dimensionLevel(score), traits, desc: `生命线${lifeFeat}，${lines[0]?.meaning ?? ""} ${colorInfo.health}` };
}

function buildCareer(lines: LineDetail[], hills: HillDetail[]): ShouXiangDimension {
  const fateFeat = lines[3]?.feature ?? "浅短";
  const jupiter = hills[0]?.status ?? "适中";
  const traits: string[] = [];
  if (fateFeat === "深长" || fateFeat === "双线") traits.push("事业运势强劲，易有成就");
  else if (fateFeat === "弯曲") traits.push("适合创业或自由职业");
  else if (fateFeat === "无") traits.push("大器晚成，需耐心积累");
  else traits.push("事业稳扎稳打，不宜冒进");
  if (jupiter === "饱满") traits.push("领导力突出，适合管理岗");
  const score = Math.round(scoreLine(fateFeat) * 0.6 + scoreHill(jupiter as HillStatus) * 0.4);
  return { score, level: dimensionLevel(score), traits, desc: `事业线${fateFeat}，${lines[3]?.meaning ?? ""} 木星丘${jupiter}，${hills[0]?.meaning ?? ""}` };
}

function buildLove(lines: LineDetail[], hills: HillDetail[]): ShouXiangDimension {
  const emotionFeat = lines[2]?.feature ?? "深长";
  const marriageFeat = lines[4]?.feature ?? "单条清晰";
  const venus = hills[4]?.status ?? "适中";
  const traits: string[] = [];
  if (emotionFeat === "深长" && marriageFeat === "单条清晰") traits.push("感情专一稳定，婚姻幸福");
  else if (marriageFeat === "上翘") traits.push("晚婚更佳，婚后运势上升");
  else if (marriageFeat === "多条") traits.push("感情经历丰富，宜慎重选择");
  else traits.push("感情需用心经营，不可随波逐流");
  const score = Math.round(scoreLine(emotionFeat) * 0.4 + scoreLine(marriageFeat) * 0.3 + scoreHill(venus as HillStatus) * 0.3);
  return { score, level: dimensionLevel(score), traits, desc: `感情线${emotionFeat}，婚姻线${marriageFeat}，${lines[4]?.meaning ?? ""}` };
}

function buildWealth(_lines: LineDetail[], hills: HillDetail[]): ShouXiangDimension {
  const mercury = hills[3]?.status ?? "适中";
  const apollo = hills[2]?.status ?? "适中";
  const traits: string[] = [];
  if (mercury === "饱满") traits.push("偏财运佳，经商头脑好");
  if (apollo === "饱满") traits.push("名利可得，才艺可换财富");
  if (mercury === "平坦" && apollo === "平坦") traits.push("宜靠工资积蓄，不宜投机");
  const score = Math.round(scoreHill(mercury as HillStatus) * 0.5 + scoreHill(apollo as HillStatus) * 0.5);
  return { score, level: dimensionLevel(score), traits, desc: `水星丘${mercury}，太阳丘${apollo}，二者主财源。${traits.join("；")}` };
}

function generateAdvice(score: number, data: ShouXiangInput): string[] {
  const advice: string[] = [];
  if (data.lifeLine === "浅短" || data.lifeLine === "断续") advice.push("加强锻炼，规律作息，定期体检保健康。");
  if (data.emotionLine === "岛纹" || data.marriageLine === "岛纹") advice.push("感情中多沟通少猜疑，坦诚是最好桥梁。");
  if (data.fateLine === "无" || data.fateLine === "浅短") advice.push("不必执着于一时得失，厚积薄发，大器晚成。");
  if (score < 55) advice.push("手相非定数，后天努力可以改变命运走向。");
  if (advice.length === 0) advice.push("保持当前状态，劳逸结合，珍惜身边人。");
  return advice;
}
