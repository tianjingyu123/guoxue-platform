// ── 八宅明镜进阶计算引擎 ──
// 算法参考：《八宅明镜》《阳宅十书》《宅经》
// 基于《八宅明镜》东西四命、宅命配卦、内部布局
// 《八宅明镜》云：「宅者，人之本。宅吉则人安，宅凶则人病。」

// ── 本地类型 ──
interface DongXiMingGuaInfo { gua: string; group: "东四命" | "西四命"; wuXing: string; luckyDirections: string[]; unluckyDirections: string[]; description: string; classicalRef: string; }
interface ZhaiNanDetail { type: string; name: string; youXiang: string; suitable: string; taboos: string[]; cure: string; classicalRef: string; }
interface NeiBuJuGuide { men: string; zhu: string; zao: string; chuang: string; principles: string[]; classicalRef: string; }
interface BaZhaiMingJingResult { mingGua: DongXiMingGuaInfo; zhainanAnalysis: ZhaiNanDetail[]; neiBuJu: NeiBuJuGuide; summary: string; }

// 命卦（按出生年份算出的命卦）
const MING_GUA_DATA: Record<string, DongXiMingGuaInfo> = {
  "坎": { gua: "坎", group: "东四命", wuXing: "水", luckyDirections: ["东南", "东", "南", "北"], unluckyDirections: ["西北", "东北", "西南", "西"], description: "坎为水，东四命。宜住东四宅（坎离震巽），忌西四宅。水性智者，适合文教行业。", classicalRef: "《八宅明镜》：「坎命者，水也。宜居东四宅，不居西四宅。」" },
  "离": { gua: "离", group: "东四命", wuXing: "火", luckyDirections: ["东", "东南", "北", "南"], unluckyDirections: ["西北", "西", "西南", "东北"], description: "离为火，东四命。宜住东四宅，阳光充足为宜。火性明丽，适合文化传播。", classicalRef: "《八宅明镜》：「离命者，火也。喜明堂向阳，忌幽暗阴湿。」" },
  "震": { gua: "震", group: "东四命", wuXing: "木", luckyDirections: ["南", "北", "东南", "东"], unluckyDirections: ["西", "西北", "东北", "西南"], description: "震为雷，东四命。宜住东四宅，忌过于阴暗。木性奋起，适合开创事业。", classicalRef: "《八宅明镜》：「震命者，木也。宜高爽处，不宜低洼。」" },
  "巽": { gua: "巽", group: "东四命", wuXing: "木", luckyDirections: ["北", "南", "东", "东南"], unluckyDirections: ["东北", "西", "西北", "西南"], description: "巽为风，东四命。宜住东四宅，通风透气。风行天下，适合商贸流通。", classicalRef: "《八宅明镜》：「巽命者，风也。宜通风纳气，不宜闭塞。」" },
  "乾": { gua: "乾", group: "西四命", wuXing: "金", luckyDirections: ["西", "西南", "东北", "西北"], unluckyDirections: ["北", "南", "东", "东南"], description: "乾为天，西四命。宜住西四宅（乾坤艮兑），忌东四宅。金性刚健，适合管理岗位。", classicalRef: "《八宅明镜》：「乾命者，金也。宜居西四宅，宜高爽方正。」" },
  "坤": { gua: "坤", group: "西四命", wuXing: "土", luckyDirections: ["西南", "西北", "西", "东北"], unluckyDirections: ["东", "南", "北", "东南"], description: "坤为地，西四命。宜住西四宅，地势平坦为宜。土性厚德，适合地产农业。", classicalRef: "《八宅明镜》：「坤命者，土也。宜平实稳厚，不喜高耸。」" },
  "艮": { gua: "艮", group: "西四命", wuXing: "土", luckyDirections: ["东北", "西", "西北", "西南"], unluckyDirections: ["南", "北", "东", "东南"], description: "艮为山，西四命。宜住西四宅，背有靠山。土性稳重，适合金融储存。", classicalRef: "《八宅明镜》：「艮命者，山也。宜有靠，不宜空旷。」" },
  "兑": { gua: "兑", group: "西四命", wuXing: "金", luckyDirections: ["西北", "西南", "西", "东北"], unluckyDirections: ["东", "东南", "南", "北"], description: "兑为泽，西四命。宜住西四宅，喜近水泽。金性言辞，适合口才演说。", classicalRef: "《八宅明镜》：「兑命者，泽也。宜近水润泽，不喜干燥。」" },
};

// 八宅九星与宅难
const ZHAINAN_DETAIL: ZhaiNanDetail[] = [
  { type: "生气", name: "生气位", youXiang: "贪狼星", suitable: "大门、卧室、书房", taboos: ["不可安厕所", "不可设厨房", "不可堆放杂物"], cure: "保持明亮通风，放绿植催旺", classicalRef: "《八宅明镜》：「生气贪狼星，吉。主旺丁旺财。」" },
  { type: "天医", name: "天医位", youXiang: "巨门星", suitable: "卧室、床位、养病之所", taboos: ["不可设厕所", "不可阴暗潮湿", "不可杂乱无章"], cure: "放天然水晶或白水晶球", classicalRef: "《八宅明镜》：「天医巨门星，吉。主健康却病。」" },
  { type: "延年", name: "延年位", youXiang: "武曲星", suitable: "长辈房、财位、保险柜", taboos: ["不可安炉灶", "不可堆放垃圾", "不可破败残缺"], cure: "放黄水晶或铜器增旺", classicalRef: "《八宅明镜》：「延年武曲星，吉。主长寿和睦。」" },
  { type: "伏位", name: "伏位", youXiang: "辅弼星", suitable: "主卧、安静休憩处", taboos: ["不可太过喧闹", "不适合做店铺", "不可开门见煞"], cure: "保持整洁安静即可", classicalRef: "《八宅明镜》：「伏位辅弼星，小吉。主安守平稳。」" },
  { type: "绝命", name: "绝命位", youXiang: "破军星", suitable: "厕所、杂物间、畜栏", taboos: ["不可安大门", "不可做卧室", "不可做厨房"], cure: "安放泰山石敢当或八卦镜", classicalRef: "《八宅明镜》：「绝命破军星，大凶。主血光横祸。」" },
  { type: "五鬼", name: "五鬼位", youXiang: "廉贞星", suitable: "厕所、仓库", taboos: ["不可安主卧", "不可做书房", "不可儿童房"], cure: "挂五帝钱或铜葫芦化解", classicalRef: "《八宅明镜》：「五鬼廉贞星，大凶。主官非火灾。」" },
  { type: "六煞", name: "六煞位", youXiang: "文曲星", suitable: "厕所、杂物间", taboos: ["不可对卧室门", "不可安厨房", "不可做主位"], cure: "安放八卦镜对外，内部放海盐", classicalRef: "《八宅明镜》：「六煞文曲星，次凶。主酒色桃花。」" },
  { type: "祸害", name: "祸害位", youXiang: "禄存星", suitable: "厕所、污秽处", taboos: ["不可安大门", "不可做主卧", "不可设神位"], cure: "放一盆水养植物（水位）化泄", classicalRef: "《八宅明镜》：「祸害禄存星，次凶。主破财口舌。」" },
];

const NEIBUJU_GUIDE: NeiBuJuGuide = {
  men: "大门宜开生气、延年、天医方，忌绝命、五鬼、祸害方。门为气口，纳吉气则宅旺人安。出处：《八宅明镜》：「门为宅之气口，吉凶由此而分。」",
  zhu: "主卧宜安生气、延年方，忌绝命、五鬼方。床宜靠实墙，床头朝吉方（生气/延年）。出处：《阳宅十书》：「主为宅之居者，安则宅安。」",
  zao: "厨房炉灶宜坐凶向吉（坐绝命向生气最佳），压住凶方火煞，不可对卧室门。出处：《阳宅三要》：「灶坐凶方压煞，向吉方纳气。」",
  chuang: "书桌/办公桌宜朝生气、延年、天医方，提高效率和创造力。出处：《八宅明镜》：「坐吉朝吉为上，坐凶朝吉次之。」",
  principles: [
    "阳宅三要：门、主、灶三者各得其所，吉星高照",
    "吉方宜高大（山/主卧/神位），凶方宜低小（厕/杂物/水位）",
    "宅命相配：东四命住东四宅，西四命住西四宅",
    "开门纳气：大门开在吉方，卦气与命卦相生",
    "动静分区：动区（客厅/厨房）在凶方压制，静区（卧室）在吉方受生",
  ],
  classicalRef: "《宅经》：「宅以形势为身体，以八卦为脉络，以五行为主宰。」",
};

export function calculateBaZhaiMingJing(input: Record<string, unknown>): BaZhaiMingJingResult {
  const mingGuaKey = (input.mingGua as string) || "坎";
  const zuoXiang = (input.zuoXiang as string) || "";

  const mingGua = MING_GUA_DATA[mingGuaKey] || MING_GUA_DATA["坎"];

  // 吉凶方位分布
  const elemGroups: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(MING_GUA_DATA)) {
    const g = v.group;
    if (!elemGroups[g]) elemGroups[g] = [];
    elemGroups[g].push(k);
  }

  const sameGroup = elemGroups[mingGua.group]?.filter(g => g !== mingGua.gua).join("、") || "";
  const oppGroup = mingGua.group === "东四命" ? "西四宅" : "东四宅";

  const summary = [
    `┌─ 八宅明镜：${mingGua.gua}命分析 ─────────────────`,
    `│ 命卦：${mingGua.gua}命（${mingGua.group}·${mingGua.wuXing}）`,
    `│ ${mingGua.description}`,
    `│ 出处：${mingGua.classicalRef}`,
    ``,
    `├─ 吉凶方位 ─────────────────`,
    `│ 吉利方位：${mingGua.luckyDirections.join("、")}`,
    `│ 凶煞方位：${mingGua.unluckyDirections.join("、")}`,
    ``,
    `├─ 宅命相配 ─────────────────`,
    `│ 同组命卦：${sameGroup}（共${mingGua.group === "东四命" ? "坎离震巽" : "乾坤艮兑"}）`,
    `│ 宜住${mingGua.group === "东四命" ? "东四宅" : "西四宅"}，忌住${oppGroup}`,
    `│ 宅命不配则家运不宁，宜择合宅之居。`,
    ``,
    `├─ 宅难综述（八星宅位） ──────`,
    ...ZHAINAN_DETAIL.map(z => `│ ${z.type === "生气" || z.type === "天医" || z.type === "延年" || z.type === "伏位" ? "★" : "⚠"} ${z.type}（${z.youXiang}）：宜${z.suitable}。${z.taboos.slice(0, 2).join("；")}。化法：${z.cure}`),
    ``,
    `├─ 内部布局指南 ─────────────────`,
    `│ 门：${NEIBUJU_GUIDE.men}`,
    `│ 主：${NEIBUJU_GUIDE.zhu}`,
    `│ 灶：${NEIBUJU_GUIDE.zao}`,
    `│ 桌：${NEIBUJU_GUIDE.chuang}`,
    ``,
    `├─ 布局原则 ─────────────────`,
    ...NEIBUJU_GUIDE.principles.map(p => `│ · ${p}`),
    ``,
    `├─ 古籍出处 ─────────────────`,
    `│ ${NEIBUJU_GUIDE.classicalRef}`,
    `│ 《八宅明镜》：「命卦为体，宅卦为用。体用相得，则吉无不利。」`,
    `│ 《阳宅十书》：「人之命卦有东西，宅之卦象亦有东西。」`,
    ``,
    `└─ ${mingGua.gua}命宜居${mingGua.group === "东四命" ? "东四宅（坎离震巽）" : "西四宅（乾坤艮兑）"}。${zuoXiang ? `坐向${zuoXiang}，须配合游年星推算具体吉凶。` : "须配合具体坐向和游年星推算各方位吉凶。"}`,
  ].join("\n");

  return { mingGua, zhainanAnalysis: ZHAINAN_DETAIL, neiBuJu: NEIBUJU_GUIDE, summary };
}
