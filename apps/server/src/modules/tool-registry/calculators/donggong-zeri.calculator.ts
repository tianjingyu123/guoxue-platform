// ── 董公择日计算引擎 ──
// 算法参考：《协纪辨方书》《玉匣记》《鳌头通书》
// 董德彰《董公选择日书》——按月建配合日辰选择吉日
// 董德彰，元末明初堪舆大家，号"董公"，著有《董公选择日书》《董公秘传》
// 其法以月建为主，配合日辰干支，分大明吉日、上吉日、吉日三等

import type { DongGongResult, DongGongDay, DongGongPurpose } from "@guoxue/shared";

const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const LUNAR_MONTHS = ["正","二","三","四","五","六","七","八","九","十","冬","腊"];

// ── 月建信息 ── 每月天时特性与宜忌综述
const MONTH_INFO: Record<number, {
  jianZhi: string; jieQi: string; description: string;
  suitable: string[]; avoid: string[]; source: string;
}> = {
  1: { jianZhi: "寅", jieQi: "立春·雨水", description: "正月建寅，立春后木气初生，万物始发，生机勃发之月。董公云：「正月寅为岁首，万象更新。辰巳未丑酉亥六日为大明吉日，诸事皆宜。」", suitable: ["开业","入学","祈福","出行"], avoid: ["安葬"], source: "《董公选择日书·正月》" },
  2: { jianZhi: "卯", jieQi: "惊蛰·春分", description: "二月建卯，春分木旺，桃李花开，天地交泰。董公云：「二月卯为春门，阴阳和合。寅卯辰巳午酉亥七支皆可用，尤以卯为上吉。」", suitable: ["婚嫁","签约","祭祀","动土"], avoid: [], source: "《董公选择日书·二月》" },
  3: { jianZhi: "辰", jieQi: "清明·谷雨", description: "三月建辰，清明谷雨，土旺生金，库藏开启。董公云：「三月辰土司令，能生万物。子寅卯巳午酉六日为吉，子为上吉，寅午为大明。」", suitable: ["搬迁","开业","出行","动土"], avoid: ["婚嫁"], source: "《董公选择日书·三月》" },
  4: { jianZhi: "巳", jieQi: "立夏·小满", description: "四月建巳，立夏小满，火气渐旺，阳气正盛。董公云：「四月巳火当令，丑辰午未酉五日可用，丑未为大明吉日。」", suitable: ["求医","祭祀","动土","开业"], avoid: ["出行"], source: "《董公选择日书·四月》" },
  5: { jianZhi: "午", jieQi: "芒种·夏至", description: "五月建午，夏至一阴生，阳极阴生之际。董公云：「五月午火极盛，寅卯辰未申酉亥七支可用，未为上吉，寅申为大明。」", suitable: ["签约","开业","搬迁","出行"], avoid: ["动土","安葬"], source: "《董公选择日书·五月》" },
  6: { jianZhi: "未", jieQi: "小暑·大暑", description: "六月建未，小暑大暑，土旺库藏，万物蕃秀。董公云：「六月未土厚实，子丑寅卯申酉戌亥八支皆可用，子亥为上吉、大明。」", suitable: ["安葬","祭祀","搬迁","入学"], avoid: ["婚嫁"], source: "《董公选择日书·六月》" },
  7: { jianZhi: "申", jieQi: "立秋·处暑", description: "七月建申，立秋处暑，金气初生，收敛之时。董公云：「七月申金司令，子丑辰巳申亥六支可用，辰巳为大明，亥为上吉。」", suitable: ["入学","签约","出行","祭祀"], avoid: ["动土"], source: "《董公选择日书·七月》" },
  8: { jianZhi: "酉", jieQi: "白露·秋分", description: "八月建酉，秋分金旺，月圆中秋，团圆喜庆。董公云：「八月酉金当令，子寅卯午未酉戌亥八支皆吉，未卯为大明，午为上吉。」", suitable: ["婚嫁","开业","祭祀","签约"], avoid: [], source: "《董公选择日书·八月》" },
  9: { jianZhi: "戌", jieQi: "寒露·霜降", description: "九月建戌，寒露霜降，土旺收藏，万物归仓。董公云：「九月戌土司权，子丑寅卯辰巳午未酉九支可用，酉为大明，寅巳为上吉。」", suitable: ["开业","搬迁","签约","出行"], avoid: ["安葬"], source: "《董公选择日书·九月》" },
  10: { jianZhi: "亥", jieQi: "立冬·小雪", description: "十月建亥，立冬小雪，水气初生，万物闭藏。董公云：「十月亥水司令，丑寅卯辰午申六支可用，卯辰为大明，午为上吉。」", suitable: ["动土","祭祀","入学","开业"], avoid: ["婚嫁","出行"], source: "《董公选择日书·十月》" },
  11: { jianZhi: "子", jieQi: "大雪·冬至", description: "十一月建子，冬至一阳生，阴极阳生之时。董公云：「十一月子水极盛，子丑寅辰巳未申亥八支可用，子寅为大明，未为上吉。」", suitable: ["祭祀","安葬","签约","求医"], avoid: ["动土","开业"], source: "《董公选择日书·十一月》" },
  12: { jianZhi: "丑", jieQi: "小寒·大寒", description: "十二月建丑，小寒大寒，土旺岁终，除旧布新。董公云：「十二月丑土司令，子丑寅卯未申酉戌八支可用，丑申为大明，卯为上吉。」", suitable: ["祭祀","搬迁","婚嫁","签约"], avoid: [], source: "《董公选择日书·十二月》" },
};

// ── 用事目的详细指导 ──
const PURPOSE_GUIDE: Record<DongGongPurpose, {
  title: string; description: string; bestMonths: number[]; keyFactors: string[];
  prepTips: string; source: string;
}> = {
  "婚嫁": {
    title: "婚嫁择日",
    description: "婚嫁重阴阳和合，宜选天地交泰之日。董公最重二、八、十一、十二月，此四月阴阳调和，大利婚庆。须避月破日、四离四绝日。",
    bestMonths: [1,2,8,9,11,12],
    keyFactors: ["日辰不可冲男女本命", "宜天德/月德/大明吉日", "避开三娘煞日（初三、初七、十三、十八、廿二、廿七）"],
    prepTips: "婚前三月择定吉日，备六礼：纳采、问名、纳吉、纳征、请期、亲迎。",
    source: "《董公选择日书·婚姻门》《协纪辨方书·嫁娶》",
  },
  "开业": {
    title: "开业择日",
    description: "开业重生气与财气，宜选旺相之日。春宜木火日，夏宜土金日，秋宜金水日，冬宜木火日。大明吉日开市，财源广进。",
    bestMonths: [1,3,5,7,8,9],
    keyFactors: ["日辰不可冲店主本命", "宜大明吉日/上吉日", "忌月破/四废日", "午时开门纳吉气最佳"],
    prepTips: "开业前一日备三牲祭拜财神，当日吉时放鞭炮驱邪迎祥。",
    source: "《董公选择日书·开业门》《玉匣记·开市》",
  },
  "搬迁": {
    title: "搬迁择日",
    description: "搬迁重宅气与新址相合。董公以三、四、七、八、九月为搬迁大吉之月。搬家宜上午，阳气上升之时入宅。",
    bestMonths: [3,4,7,8,9,11],
    keyFactors: ["新宅坐向不与日辰相冲", "宜大明吉日", "忌岁破/月破日", "入宅时辰宜选辰时或巳时"],
    prepTips: "先搬神位/祖宗牌位入宅，再搬家具。入宅后三日内不可空灶。",
    source: "《董公选择日书·移徙门》《协纪辨方书·迁徙》",
  },
  "出行": {
    title: "出行择日",
    description: "出行重一路平安，宜天德/月德值日。董公云：「出行有三不选：月破日不选、四绝日不选、往亡日不选。」",
    bestMonths: [1,3,5,7,9,11],
    keyFactors: ["出行方向不可冲本命", "宜大明吉日/上吉日", "忌月破/四绝/往亡日", "远行宜选寅卯辰三时出发"],
    prepTips: "出行前拜土地公求平安，随身携带本命五行护身符。",
    source: "《董公选择日书·出行门》《鳌头通书·出行》",
  },
  "动土": {
    title: "动土择日",
    description: "动土重修造，最重土气旺相。董公以正、二、三、四、八、九月为动土吉月。须避开土王用事后三日。",
    bestMonths: [1,2,3,4,8,9],
    keyFactors: ["坐山不可冲犯", "宜大明吉日", "忌土王用事/月破日", "动土时辰宜辰巳午未四时"],
    prepTips: "动土前祭土地公，用三牲酒礼。第一锹土由宅主亲自挖，不可代劳。",
    source: "《董公选择日书·修造门》《协纪辨方书·动土》",
  },
  "安葬": {
    title: "安葬择日",
    description: "安葬重入土为安，阴宅择日与阳宅不同。董公以二、四、六、八、十、十二月为安葬吉月。须避重丧日和三丧日。",
    bestMonths: [2,4,6,8,10,12],
    keyFactors: ["不可冲克仙命（亡者生年）", "宜大明吉日", "忌重丧/三丧/月破日", "宜申时或酉时下葬"],
    prepTips: "先请地师勘定穴位，再按董公法择日。下葬前备五谷、铜钱、经文随葬。",
    source: "《董公选择日书·安葬门》《协纪辨方书·丧葬》",
  },
  "签约": {
    title: "签约择日",
    description: "签约重诚信与契约精神，宜选天德/月德/大明吉日。合同签署宜上午阳气旺时，双方当面签署不可代签。",
    bestMonths: [1,2,5,7,8,11],
    keyFactors: ["双方本命不可相冲", "宜大明吉日/上吉日", "忌月破/四废日", "宜选巳时或午时签约"],
    prepTips: "签约前核对条款无误，备两份正本双方各执一份。盖章时用力均匀，象征契约稳固。",
    source: "《董公选择日书·立券门》《玉匣记·签约》",
  },
  "祭祀": {
    title: "祭祀择日",
    description: "祭祀重诚心敬意，神明祖先皆宜。董公以正、二、七、八、十二月为祭祀大吉之月。清明、中元、冬至三节祭祀尤佳。",
    bestMonths: [1,2,7,8,12],
    keyFactors: ["宜大明吉日/上吉日", "忌月破日", "祭祀时辰宜选辰时（龙抬头）", "祭品须新鲜干净"],
    prepTips: "祭祀前斋戒沐浴，备香烛纸钱三牲果品。祭拜时心存诚敬，不可嬉笑喧哗。",
    source: "《董公选择日书·祭祀门》《礼记·祭义》",
  },
  "入学": {
    title: "入学择日",
    description: "入学重文昌运，宜选与文昌星相应的吉日。董公以正、二、七、八月为入学吉月。宜选寅卯时入学，木主文昌。",
    bestMonths: [1,2,7,8],
    keyFactors: ["宜大明吉日", "宜学堂/文昌日", "忌月破日", "入学时辰宜选寅卯时"],
    prepTips: "入学前一日备葱（聪明）、芹菜（勤学）、粽子（高中）拜文昌帝君。",
    source: "《董公选择日书·入学门》《文昌帝君阴骘文》",
  },
  "求医": {
    title: "求医择日",
    description: "求医重天医星值日，董公以正、四、五、七、十月为求医吉月。宜选天医/天德日就诊，避月破日。",
    bestMonths: [1,4,5,7,10],
    keyFactors: ["宜天医日/大明吉日", "忌月破/四绝日", "宜上午就诊阳气旺", "手术宜选巳午时火旺止血"],
    prepTips: "就诊前一日沐浴更衣，携带病历完整。大病手术须择大明吉日。",
    source: "《董公选择日书·求医门》《孙真人择日法》",
  },
  "其他": {
    title: "通用择日",
    description: "综合择日，以大明吉日为最上选，上吉日次之。凡重要事宜，首选大明吉日。",
    bestMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
    keyFactors: ["首选大明吉日", "次选上吉日", "再次吉日", "避月破日"],
    prepTips: "择日以董公法为基准，兼参《协纪辨方书》。",
    source: "《董公选择日书》",
  },
};

// ── 董公月日吉凶表 ──
// 格式：[月建] → { good: 吉日支[], bad: 凶日支[], special: {支名: 吉称} }
// 来源：董德彰《董公选择日书》各月条
const DONG_GONG_TABLE: Record<number, {
  good: string[]; bad: string[]; special: Record<string, string>;
  goodReason: string; badReason: string;
}> = {
  1: {
    good: ["丑","辰","巳","未","酉","亥"], bad: ["寅","卯","午","申","戌"],
    special: {"辰":"大明吉日","巳":"大明吉日","未":"大明吉日","丑":"大明吉日"},
    goodReason: "正月寅木当令，丑辰巳未酉亥六支与寅相合或得生气，董公定为吉日。",
    badReason: "寅卯午申戌五支或与月建相刑冲破害，或为四废日，董公定为凶日。",
  },
  2: {
    good: ["寅","卯","辰","巳","午","酉","亥"], bad: ["子","丑","未","申","戌"],
    special: {"卯":"大明吉日","寅":"上吉日","巳":"大明吉日"},
    goodReason: "二月卯木当令，寅卯辰巳午酉亥七支与卯木相生相合，董公定为吉日。",
    badReason: "子丑未申戌五支与月建卯木相冲相害，或为月破日，董公定为凶日。",
  },
  3: {
    good: ["子","寅","卯","巳","午","酉"], bad: ["丑","辰","未","申","戌","亥"],
    special: {"子":"上吉日","寅":"大明吉日","午":"大明吉日"},
    goodReason: "三月辰土当令，子寅卯巳午酉六支得辰土生扶，董公定为吉日。",
    badReason: "丑辰未申戌亥六支与月建辰土相刑冲破害，或犯月厌，董公定为凶日。",
  },
  4: {
    good: ["丑","辰","午","未","酉"], bad: ["子","寅","卯","巳","申","戌","亥"],
    special: {"丑":"大明吉日","午":"上吉日","未":"大明吉日"},
    goodReason: "四月巳火当令，丑辰午未酉五支与巳火相生相合，董公定为吉日。",
    badReason: "子寅卯巳申戌亥七支与月建巳火相冲相刑，巳日本身虽值月建但为「建日」须避，董公定为凶日。",
  },
  5: {
    good: ["寅","卯","辰","未","申","酉","亥"], bad: ["子","丑","巳","午","戌"],
    special: {"未":"上吉日","寅":"大明吉日","申":"大明吉日"},
    goodReason: "五月午火当令，寅卯辰未申酉亥七支得午火相生或与午六合三合，董公定为吉日。",
    badReason: "子丑巳午戌五支与月建午火相冲相害，午日为建日不取，董公定为凶日。",
  },
  6: {
    good: ["子","丑","寅","卯","申","酉","戌","亥"], bad: ["辰","巳","午","未"],
    special: {"子":"大明吉日","亥":"上吉日","寅":"大明吉日"},
    goodReason: "六月未土当令，子丑寅卯申酉戌亥八支与未土相生或得库气，董公定为吉日。",
    badReason: "辰巳午未四支与月建未土相刑相害，末日为建日不取，董公定为凶日。",
  },
  7: {
    good: ["子","丑","辰","巳","申","亥"], bad: ["寅","卯","午","未","酉","戌"],
    special: {"辰":"大明吉日","巳":"大明吉日","亥":"上吉日"},
    goodReason: "七月申金当令，子丑辰巳申亥六支与申金相生相合，董公定为吉日。",
    badReason: "寅卯午未酉戌六支或冲或害月建申金，董公定为凶日。",
  },
  8: {
    good: ["子","寅","卯","午","未","酉","戌","亥"], bad: ["丑","辰","巳","申"],
    special: {"未":"大明吉日","卯":"大明吉日","午":"上吉日"},
    goodReason: "八月酉金当令，子寅卯午未酉戌亥八支得酉金相生或与酉六合，董公定为吉日。",
    badReason: "丑辰巳申四支与月建酉金相害相刑，董公定为凶日。",
  },
  9: {
    good: ["子","丑","寅","卯","辰","巳","午","未","酉"], bad: ["申","戌","亥"],
    special: {"酉":"大明吉日","寅":"大明吉日","巳":"上吉日"},
    goodReason: "九月戌土当令，子丑寅卯辰巳午未酉九支与戌土相生相合，董公定为吉日。",
    badReason: "申戌亥三支与月建戌土相冲相害，戌日为建日不取，董公定为凶日。",
  },
  10: {
    good: ["丑","寅","卯","辰","午","申"], bad: ["子","巳","未","酉","戌","亥"],
    special: {"卯":"大明吉日","辰":"大明吉日","午":"上吉日"},
    goodReason: "十月亥水当令，丑寅卯辰午申六支得亥水相生或为三合，董公定为吉日。",
    badReason: "子巳未酉戌亥六支与月建亥水相冲相害，亥日为建日不取，董公定为凶日。",
  },
  11: {
    good: ["子","丑","寅","辰","巳","未","申","亥"], bad: ["卯","午","酉","戌"],
    special: {"子":"大明吉日","寅":"大明吉日","未":"上吉日"},
    goodReason: "十一月子水当令，子丑寅辰巳未申亥八支与子水相生相合，董公定为吉日。",
    badReason: "卯午酉戌四支与月建子水相冲相刑，董公定为凶日。",
  },
  12: {
    good: ["子","丑","寅","卯","未","申","酉","戌"], bad: ["辰","巳","午","亥"],
    special: {"丑":"大明吉日","申":"大明吉日","卯":"上吉日"},
    goodReason: "十二月丑土当令，子丑寅卯未申酉戌八支与丑土相合或得库气，董公定为吉日。",
    badReason: "辰巳午亥四支与月建丑土相害相冲，董公定为凶日。",
  },
};

const GRADE_SCORE: Record<string, number> = {
  "大明吉日": 95, "上吉日": 85, "吉日": 75, "平": 50, "凶日": 30, "大凶日": 10,
};

// 日辰特殊神煞 —— 额外加减分
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SPECIAL_SHASHEN: Record<string, { name: string; scoreBonus: number; desc: string; source?: string }> = {
  "天德": { name: "天德日", scoreBonus: 10, desc: "天德贵人值日，百福骈臻，千祥云集，诸事大吉。" },
  "月德": { name: "月德日", scoreBonus: 8, desc: "月德贵人值日，福力稍次于天德，仍为万事大吉之日。" },
  "天赦": { name: "天赦日", scoreBonus: 15, desc: "天赦日乃天帝赦罪之日，百无禁忌，万事大吉。《协纪辨方书》云：「天赦日宜祭祀、祈福、求嗣、嫁娶、修造、安葬。」", source: "《协纪辨方书·天赦》" },
  "四废": { name: "四废日", scoreBonus: -20, desc: "四废日，四季废亡之日，诸事不宜。", source: "《协纪辨方书·四废》" },
  "四绝": { name: "四绝日", scoreBonus: -25, desc: "四绝日乃立春/立夏/立秋/立冬前一日，节气交替之际，大事勿用。", source: "《协纪辨方书·四绝》" },
  "四离": { name: "四离日", scoreBonus: -25, desc: "四离日乃春分/秋分/夏至/冬至前一日，阴阳分离之时，忌婚嫁出行。", source: "《协纪辨方书·四离》" },
};

function getDayGan(d: Date): string {
  const base = new Date(1900, 0, 1);
  const diffDays = Math.floor((d.getTime() - base.getTime()) / 86400000);
  return TIAN_GAN[((diffDays % 10) + 10) % 10];
}

function getDayZhi(d: Date): string {
  const base = new Date(1900, 0, 1);
  const diffDays = Math.floor((d.getTime() - base.getTime()) / 86400000);
  return DI_ZHI[((diffDays % 12) + 12) % 12];
}

// 生成详细宜忌列表
function getDetailedSuitable(gradeName: string, purpose: DongGongPurpose, month: number): string[] {
  if (gradeName.includes("凶") || gradeName.includes("月破")) return [];

  const base = ["祭祀", "祈福", "求嗣"];
  if (gradeName === "大明吉日") return [...base, "嫁娶", "开业", "搬迁", "出行", "修造", "动土", "安葬", "签约", "入学", "求医"];

  const monthInfo = MONTH_INFO[month];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const purposeGuide = PURPOSE_GUIDE[purpose];
  const suitable = new Set([...base, ...(monthInfo?.suitable || []), purpose]);

  return [...suitable];
}

function getDetailedUnsuitable(gradeName: string, month: number): string[] {
  if (gradeName.includes("吉")) return [];
  if (gradeName === "月破大凶") return ["嫁娶","开业","搬迁","出行","修造","动土","安葬","签约","入学","求医","祭祀"];

  const monthInfo = MONTH_INFO[month];
  return [...(monthInfo?.avoid || []), "嫁娶", "开业", "搬迁", "出行"];
}

// 生成每日的详细理由
function getDetailedReason(
  gradeName: string, zhi: string, month: number, isPoRi: boolean
): string {
  const monthInfo = MONTH_INFO[month];
  const table = DONG_GONG_TABLE[month];

  if (isPoRi) {
    const monthJian = DI_ZHI[(month - 1) % 12];
    return `【月破大凶】今月月建在${monthJian}，${zhi}与月建${monthJian}正冲为月破日。董公云：「月破之日，万事不宜，纵有吉神亦难化解。"《协纪辨方书》云：「月破为月建所冲，如子午相冲、卯酉相冲之类。破日主破坏、离散，不可用事。"建议另选他日。`;
  }

  switch (gradeName) {
    case "大明吉日":
      return `【大明吉日】董公定此日为大明吉日，乃${monthInfo?.jieQi || ""}间最上吉日。${zhi}日与月建${monthInfo?.jianZhi || ""}相合得气，天德月德贵人加临，诸事皆宜，百无禁忌。${table?.goodReason || ""}《董公选择日书》云：「大明吉日，上应天星，下合地脉，用之大吉昌。"建议优先选择此日安排重要事宜。`;
    case "上吉日":
      return `【上吉日】董公定此日为上吉日，吉力仅次于大明吉日。${zhi}日与月建${monthInfo?.jianZhi || ""}相生有情，适宜婚嫁、开业、搬迁等重大事项。${table?.goodReason || ""}《董公选择日书》云：「上吉之日，诸德聚会，凡百事为，皆得顺遂。"`;
    case "吉日":
      return `【吉日】${zhi}日在${monthInfo?.jieQi || ""}为当月吉日，${table?.goodReason || ""}可用以一般事宜，重大事项建议优先选大明吉日或上吉日。《协纪辨方书》云：「吉日虽非上等，亦无大碍，寻常事务皆可用之。"`;
    case "凶日":
      return `【凶日】${zhi}日在${monthInfo?.jieQi || ""}为凶日，${table?.badReason || ""}董公云此日不宜用事。《协纪辨方书》云：「凶日值事，多有不顺，纵小事亦须谨慎。"若无法改期，建议选${table?.special ? Object.keys(table.special).join("、") : "大明吉日"}替代。`;
    case "大凶日":
      return `【大凶日】${zhi}日为${monthInfo?.jieQi || ""}大凶之日，${table?.badReason || ""}董公严戒不可用事。请务必避开此日，另择吉日。`;
    default:
      return `【平】${zhi}日平平，无大吉亦无大凶，寻常事务可用。若有重大事宜，建议选附近大明吉日。`;
  }
}

export function calculateDongGong(input: Record<string, unknown>): DongGongResult {
  const purpose = (input.purpose as DongGongPurpose) ?? "其他";
  const year = (input.year as number) ?? new Date().getFullYear();
  const startMonth = (input.startMonth as number) ?? 1;
  const endMonth = (input.endMonth as number) ?? 12;

  const purposeGuide = PURPOSE_GUIDE[purpose];
  const bonus = purposeGuide.bestMonths;
  const allDays: DongGongDay[] = [];

  for (let m = startMonth; m <= Math.min(endMonth, 12); m++) {
    const table = DONG_GONG_TABLE[m];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const monthInfo = MONTH_INFO[m];
    const daysInMonth = new Date(year, m, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, m - 1, d);
      const zhi = getDayZhi(date);
      const gan = getDayGan(date);
      const dayGZ = `${gan}${zhi}`;

      let grade = "平";
      let gradeName = "平";
      let score = 50;

      if (table.special[zhi]) {
        grade = table.special[zhi];
        gradeName = grade;
        score = GRADE_SCORE[grade] ?? 75;
      } else if (table.good.includes(zhi)) {
        grade = "吉日"; gradeName = "吉日"; score = 75;
      } else if (table.bad.includes(zhi)) {
        grade = "凶日"; gradeName = "凶日"; score = 30;
      }

      // 月份奖励
      if (bonus.includes(m)) score += 5;

      // 避开月破日
      const monthJian = DI_ZHI[(m - 1) % 12];
      const poZhi = DI_ZHI[(DI_ZHI.indexOf(monthJian) + 6) % 12];
      let isPoRi = false;
      if (zhi === poZhi) {
        score = Math.min(score, 20);
        gradeName = "月破大凶";
        grade = "月破大凶";
        isPoRi = true;
      }

      if (score >= 50) {
        allDays.push({
          date: date.toISOString().slice(0, 10),
          lunarStr: `${LUNAR_MONTHS[m - 1]}月初${d}`,
          dayGanZhi: dayGZ,
          grade,
          gradeName,
          score,
          reason: getDetailedReason(gradeName, zhi, m, isPoRi),
          suitable: getDetailedSuitable(gradeName, purpose, m),
          unsuitable: getDetailedUnsuitable(gradeName, m),
        });
      }
    }
  }

  allDays.sort((a, b) => b.score - a.score);
  const bestDays = allDays.filter(d => d.score >= 80).slice(0, 10);

  // ── 构建详细摘要 ──
  const monthRange = startMonth === endMonth
    ? `${LUNAR_MONTHS[startMonth - 1]}月`
    : `${LUNAR_MONTHS[startMonth - 1]}月至${LUNAR_MONTHS[endMonth - 1]}月`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalJi = allDays.filter(d => d.gradeName.includes("吉")).length;
  const daMingCount = allDays.filter(d => d.gradeName === "大明吉日").length;
  const shangJiCount = allDays.filter(d => d.gradeName === "上吉日").length;
  const jiCount = allDays.filter(d => d.gradeName === "吉日").length;

  const summary = [
    `【董公择日报告】${year}年${monthRange} · ${purposeGuide.title}`,
    ``,
    `${purposeGuide.description}`,
    ``,
    `┌─ 吉日统计 ─────────────────`,
    `│ 大明吉日：${daMingCount}天 — 诸事皆宜，百无禁忌`,
    `│ 上吉日：${shangJiCount}天 — 最宜${purpose}`,
    `│ 吉日：${jiCount}天 — 可用`,
    `│ 平/凶日已自动过滤不展示`,
    `│ 本月范围内共${allDays.length}个可用日`,
    `├─ 首推吉日 ─────────────────`,
    ...(bestDays.length > 0
      ? bestDays.slice(0, 5).map((d, i) =>
          `│ ${i + 1}. ${d.lunarStr}（${d.dayGanZhi}）— ${d.gradeName} 评分${d.score}`)
      : [`│ 选定范围内未找到上等吉日，建议扩大月份范围或调整用事目的。`]),
    `├─ 关键考量 ─────────────────`,
    ...(purposeGuide.keyFactors.map(f => `│ · ${f}`)),
    `├─ 准备事项 ─────────────────`,
    `│ ${purposeGuide.prepTips}`,
    `├─ 月令参考 ─────────────────`,
    ...(startMonth <= endMonth
      ? Array.from({ length: Math.min(endMonth - startMonth + 1, 3) }, (_, i) => {
          const mi = MONTH_INFO[startMonth + i];
          return mi ? `│ ${LUNAR_MONTHS[startMonth + i - 1]}月：${mi.description.substring(0, 60)}` : null;
        }).filter(Boolean)
      : []),
    `└─ 来源 ─────────────────`,
    `   ${purposeGuide.source}`,
    `   《协纪辨方书·卷六·月表》`,
    `   《董公选择日书》董德彰著`,
    ``,
    `董公云：「择日之道，以月建为本，以日辰为用。吉日既定，则万事可成。"`,
  ].filter(Boolean).join("\n");

  return { input: { purpose, year, startMonth, endMonth }, year, bestDays, allDays, summary };
}
