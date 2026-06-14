// ── 子午流注/经络养生计算引擎 ──
// 算法参考：《针灸大成》《子午流注针经》《黄帝内经·灵枢》《类经图翼》《标幽赋》
// 子午流注纳子法：十二经络按时辰循行，气血流注各有盛衰

// ── 十二时辰经络对照 ──
interface ShiChenInfo {
  name: string; timeRange: string; zhi: string; jingLuo: string;
  zangFu: string; wuXing: string; active: boolean;
  function: string; advice: string; acupoints: string[];
  classicalRef: string; indication: string; yuanXue: string;
}
interface YangShengAdvice {
  season: string; mainFocus: string; diet: string[];
  avoid: string[]; exercise: string; sleep: string;
  classicalRef: string; wuXingSeason: string; emotion: string;
  organ: string; taste: string; color: string;
}
interface ZiWuLiuZhuResult {
  currentShiChen: ShiChenInfo; allShiChen: ShiChenInfo[];
  seasonAdvice: YangShengAdvice; summary: string;
}

const ALL_SHICHEN: ShiChenInfo[] = [
  {
    name: "子时", timeRange: "23:00-01:00", zhi: "子", jingLuo: "足少阳胆经", zangFu: "胆", wuXing: "木", active: false,
    function: "胆汁分泌，排毒代谢，骨髓造血启动。阳气初生如婴儿，宜静养固护。",
    advice: "必须深度睡眠，养胆护阳。忌熬夜，熬夜则胆气受损，次日精神萎靡。",
    acupoints: ["风池", "阳陵泉", "悬钟"],
    classicalRef: "《灵枢·经脉》：「胆足少阳之脉……是主骨所生病者。」《子午流注针经》：「子时胆经旺，凡十一脏取决于胆。」",
    indication: "偏头痛/目眩/口苦/胁痛/失眠/胆结石",
    yuanXue: "丘墟",
  },
  {
    name: "丑时", timeRange: "01:00-03:00", zhi: "丑", jingLuo: "足厥阴肝经", zangFu: "肝", wuXing: "木", active: false,
    function: "肝血回流贮藏，解毒排毒，血液净化。肝藏血，血归于肝。",
    advice: "熟睡养肝，此时醒着极伤肝血。避免情绪波动和饮酒过量。",
    acupoints: ["太冲", "期门", "行间"],
    classicalRef: "《灵枢·经脉》：「肝足厥阴之脉……是主肝所生病者。」《针灸大成》：「丑时肝经旺，卧则血归于肝。」",
    indication: "肝病/目疾/月经不调/抑郁/高血压/疝气",
    yuanXue: "太冲",
  },
  {
    name: "寅时", timeRange: "03:00-05:00", zhi: "寅", jingLuo: "手太阴肺经", zangFu: "肺", wuXing: "金", active: false,
    function: "肺朝百脉，气血重新分布全身。肺气宣发肃降，呼吸最深。",
    advice: "深度睡眠，注意保暖防寒。老人此时易发病，重病人此时最危。",
    acupoints: ["太渊", "列缺", "尺泽"],
    classicalRef: "《灵枢·经脉》：「肺手太阴之脉……是主肺所生病者。」《标幽赋》：「寅时人气在肺。」",
    indication: "咳喘/感冒/咽喉痛/支气管炎/肩背痛",
    yuanXue: "太渊",
  },
  {
    name: "卯时", timeRange: "05:00-07:00", zhi: "卯", jingLuo: "手阳明大肠经", zangFu: "大肠", wuXing: "金", active: false,
    function: "排泄废物，清理肠道。大肠传导之官，变化出焉。一天最佳排便时间。",
    advice: "早起喝一杯温水(200-300ml)，培养定时排便习惯。空腹一杯蜂蜜水更佳。",
    acupoints: ["合谷", "曲池", "手三里"],
    classicalRef: "《灵枢·经脉》：「大肠手阳明之脉……是主津所生病者。」《针灸大成》：「卯时大肠经旺，传导排泄。」",
    indication: "便秘/腹泻/牙痛/鼻衄/面瘫/咽喉肿痛",
    yuanXue: "合谷",
  },
  {
    name: "辰时", timeRange: "07:00-09:00", zhi: "辰", jingLuo: "足阳明胃经", zangFu: "胃", wuXing: "土", active: false,
    function: "胃酸分泌旺盛，消化吸收最佳时段。胃为水谷之海，气血生化之源。",
    advice: "早餐一定要吃好，营养均衡(蛋白+碳水+蔬果)。此时不进食则胃酸伤胃壁。",
    acupoints: ["足三里", "天枢", "内庭"],
    classicalRef: "《灵枢·经脉》：「胃足阳明之脉……是主血所生病者。」《针灸大成》：「辰时胃经旺，受纳水谷。」",
    indication: "胃痛/消化不良/腹胀/面瘫/口腔溃疡/膝关节痛",
    yuanXue: "冲阳",
  },
  {
    name: "巳时", timeRange: "09:00-11:00", zhi: "巳", jingLuo: "足太阴脾经", zangFu: "脾", wuXing: "土", active: false,
    function: "脾运化水谷精微，气血生化之源。为一天中脑力和体力最旺盛的时段。",
    advice: "黄金工作时间，处理最复杂的事务。久坐者每隔一小时起身活动。",
    acupoints: ["三阴交", "阴陵泉", "血海"],
    classicalRef: "《灵枢·经脉》：「脾足太阴之脉……是主脾所生病者。」《针灸大成》：「巳时脾经旺，运化精微。」",
    indication: "消化不良/水肿/月经不调/糖尿病/贫血/腹胀",
    yuanXue: "太白",
  },
  {
    name: "午时", timeRange: "11:00-13:00", zhi: "午", jingLuo: "手少阴心经", zangFu: "心", wuXing: "火", active: false,
    function: "心主血脉，血脉运行旺盛。阳极一阴生，心气最旺但也最易耗。",
    advice: "午餐适量(七分饱)，午休15-30分钟养心神。忌餐后立即剧烈运动。",
    acupoints: ["神门", "少海", "通里"],
    classicalRef: "《灵枢·经脉》：「心手少阴之脉……是主心所生病者。」《针灸大成》：「午时心经旺，宜小憩养神。」",
    indication: "心悸/失眠/健忘/胸痛/舌疮/掌心热",
    yuanXue: "神门",
  },
  {
    name: "未时", timeRange: "13:00-15:00", zhi: "未", jingLuo: "手太阳小肠经", zangFu: "小肠", wuXing: "火", active: false,
    function: "分清泌浊，吸收营养，水液代谢。小肠为受盛之官，化物出焉。",
    advice: "多喝水，帮助代谢排毒。午餐的营养在小肠被充分吸收。",
    acupoints: ["后溪", "腕骨", "天宗"],
    classicalRef: "《灵枢·经脉》：「小肠手太阳之脉……是主液所生病者。」《针灸大成》：「未时小肠经旺，分清泌浊。」",
    indication: "肩臂痛/耳聋/目黄/落枕/乳汁少/小便异常",
    yuanXue: "腕骨",
  },
  {
    name: "申时", timeRange: "15:00-17:00", zhi: "申", jingLuo: "足太阳膀胱经", zangFu: "膀胱", wuXing: "水", active: false,
    function: "膀胱排毒，代谢废物排出。膀胱为州都之官，津液藏焉。记忆力第二高峰。",
    advice: "多喝水勤排尿，适合学习记忆和运动锻炼。午后工作效率次高峰。",
    acupoints: ["委中", "昆仑", "申脉"],
    classicalRef: "《灵枢·经脉》：「膀胱足太阳之脉……是主筋所生病者。」《针灸大成》：「申时膀胱经旺，宜多饮水。」",
    indication: "腰背痛/坐骨神经痛/头痛/目疾/小便不利/痔疮",
    yuanXue: "京骨",
  },
  {
    name: "酉时", timeRange: "17:00-19:00", zhi: "酉", jingLuo: "足少阴肾经", zangFu: "肾", wuXing: "水", active: false,
    function: "肾藏精，主生长发育和生殖。肾为先天之本，此时宜养不宜耗。",
    advice: "休息养肾，避免过度劳累和剧烈运动。吃晚饭不宜过咸。",
    acupoints: ["太溪", "涌泉", "照海"],
    classicalRef: "《灵枢·经脉》：「肾足少阴之脉……是主肾所生病者。」《针灸大成》：「酉时肾经旺，宜静养固精。」",
    indication: "腰膝酸软/耳鸣耳聋/水肿/遗精/月经不调/失眠",
    yuanXue: "太溪",
  },
  {
    name: "戌时", timeRange: "19:00-21:00", zhi: "戌", jingLuo: "手厥阴心包经", zangFu: "心包", wuXing: "火", active: false,
    function: "保护心脏，调节情绪，缓解压力。心包为心之宫城，代君受邪。",
    advice: "散步放松，保持心情舒畅。适合家人交流、阅读、冥想。忌情绪激动。",
    acupoints: ["内关", "大陵", "劳宫"],
    classicalRef: "《灵枢·经脉》：「心包手厥阴之脉……是主脉所生病者。」《针灸大成》：「戌时心包经旺，宜舒缓情志。」",
    indication: "心悸/胸闷/失眠/胃痛(内关特效)/掌心热/肘臂痛",
    yuanXue: "大陵",
  },
  {
    name: "亥时", timeRange: "21:00-23:00", zhi: "亥", jingLuo: "手少阳三焦经", zangFu: "三焦", wuXing: "水", active: false,
    function: "三焦通调水道，免疫系统修复。三焦为元气之别使，主持诸气。",
    advice: "准备入睡，热水泡脚(40°C，15-20分钟)，停止进食和剧烈思维活动。",
    acupoints: ["外关", "支沟", "翳风"],
    classicalRef: "《灵枢·经脉》：「三焦手少阳之脉……是主气所生病者。」《类经图翼》：「亥时三焦旺，百脉通调。」",
    indication: "偏头痛/耳鸣/咽喉痛/便秘(支沟特效)/上肢痹痛/发热",
    yuanXue: "阳池",
  },
];

// 纳子法补泻原则：迎而夺之为泻，随而济之为补
function getNaZiMethod(shiChenZhi: string, _jingLuoName: string): string {
  const map: Record<string, string> = {
    "寅": "肺经气血最旺（寅时），实证泻尺泽(合水)，虚证补太渊(俞土)。",
    "卯": "大肠经气血最旺（卯时），实证泻二间(荥水)，虚证补曲池(合土)。",
    "辰": "胃经气血最旺（辰时），实证泻历兑(井金)，虚证补解溪(经火)。",
    "巳": "脾经气血最旺（巳时），实证泻商丘(经金)，虚证补大都(荥火)。",
    "午": "心经气血最旺（午时），实证泻神门(俞土)，虚证补少冲(井木)。",
    "未": "小肠经气血最旺（未时），实证泻小海(合土)，虚证补后溪(俞木)。",
    "申": "膀胱经气血最旺（申时），实证泻束骨(俞木)，虚证补至阴(井金)。",
    "酉": "肾经气血最旺（酉时），实证泻涌泉(井木)，虚证补复溜(经金)。",
    "戌": "心包经气血最旺（戌时），实证泻大陵(俞土)，虚证补中冲(井木)。",
    "亥": "三焦经气血最旺（亥时），实证泻天井(合土)，虚证补中渚(俞木)。",
    "子": "胆经气血最旺（子时），实证泻阳辅(经火)，虚证补侠溪(荥水)。",
    "丑": "肝经气血最旺（丑时），实证泻行间(荥火)，虚证补曲泉(合水)。",
  };
  return map[shiChenZhi] || "";
}

function getCurrentShiChen(hour?: number): ShiChenInfo {
  const h = hour ?? new Date().getHours();
  const shiChenIdx = h >= 23 ? 0 : h < 1 ? 0 : Math.floor((h + 1) / 2);
  return { ...ALL_SHICHEN[shiChenIdx < 12 ? shiChenIdx : 0], active: true };
}

function getSeason(): string {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "春";
  if (m >= 6 && m <= 8) return "夏";
  if (m >= 9 && m <= 11) return "秋";
  return "冬";
}

const SEASON_ADVICE: Record<string, YangShengAdvice> = {
  "春": {
    season: "春季养肝", mainFocus: "养肝护胆，舒畅情志",
    diet: ["芹菜", "枸杞", "菠菜", "荠菜", "豆芽", "韭菜"],
    avoid: ["辛辣", "油腻", "酒精", "过酸"],
    exercise: "晨起散步，太极拳，伸展运动，放风筝",
    sleep: "早睡早起（22:00-06:00）",
    classicalRef: "《素问·四气调神大论》：「春三月，此谓发陈。天地俱生，万物以荣。夜卧早起，广步于庭。」",
    wuXingSeason: "木旺", emotion: "怒伤肝，宜戒怒养肝", organ: "肝", taste: "酸（适量）", color: "青",
  },
  "夏": {
    season: "夏季养心", mainFocus: "清心降火，养心安神",
    diet: ["莲子", "百合", "苦瓜", "西瓜", "绿豆", "红豆"],
    avoid: ["过辣", "煎炸", "热补", "过咸"],
    exercise: "游泳，傍晚慢跑，瑜伽，太极",
    sleep: "晚睡早起（22:30-06:00），午休30分钟",
    classicalRef: "《素问·四气调神大论》：「夏三月，此谓蕃秀。天地气交，万物华实。夜卧早起，无厌于日。」",
    wuXingSeason: "火旺", emotion: "喜伤心，宜平和养心", organ: "心", taste: "苦", color: "赤",
  },
  "秋": {
    season: "秋季养肺", mainFocus: "润肺生津，收敛肺气",
    diet: ["银耳", "雪梨", "蜂蜜", "百合", "白萝卜", "杏仁"],
    avoid: ["辛辣", "烧烤", "干燥食物", "过苦"],
    exercise: "深呼吸吐纳，登山，骑行，慢跑",
    sleep: "早睡早起（21:30-06:00）",
    classicalRef: "《素问·四气调神大论》：「秋三月，此谓容平。天气以急，地气以明。早卧早起，与鸡俱兴。」",
    wuXingSeason: "金旺", emotion: "忧伤肺，宜乐观开怀", organ: "肺", taste: "辛（适量）", color: "白",
  },
  "冬": {
    season: "冬季养肾", mainFocus: "温补肾阳，固精藏气",
    diet: ["羊肉", "黑豆", "核桃", "韭菜", "山药", "栗子"],
    avoid: ["生冷", "寒凉", "过度咸食"],
    exercise: "室内运动，太极拳，八段锦，站桩",
    sleep: "早睡晚起（21:00-07:00），待日出后活动",
    classicalRef: "《素问·四气调神大论》：「冬三月，此谓闭藏。水冰地坼，无扰乎阳。早卧晚起，必待日光。」",
    wuXingSeason: "水旺", emotion: "恐伤肾，宜安心宁神", organ: "肾", taste: "咸（适量）", color: "黑",
  },
};

export function calculateZiWuLiuZhu(input: Record<string, unknown>): ZiWuLiuZhuResult {
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const shiChenParam = (input.shiChen as string) || "";
  const seasonParam = (input.season as string) || "";

  const currentHour = new Date().getHours();
  const currentShiChen = getCurrentShiChen(currentHour);
  const season = seasonParam || getSeason();
  const seasonAdvice = SEASON_ADVICE[season] || SEASON_ADVICE["春"];

  const allShiChen = ALL_SHICHEN.map(s => ({
    ...s,
    active: s.zhi === currentShiChen.zhi,
  }));

  const naZiMethod = getNaZiMethod(currentShiChen.zhi, currentShiChen.jingLuo);

  const summary = [
    "【子午流注经络养生】",
    "",
    `┌─ 当前时辰 ─────────────────`,
    `│ 时辰：${currentShiChen.name}（${currentShiChen.timeRange}）`,
    `│ 经络：${currentShiChen.jingLuo} 脏腑：${currentShiChen.zangFu}`,
    `│ 功能：${currentShiChen.function}`,
    `│ 建议：${currentShiChen.advice}`,
    `│ 纳子法：${naZiMethod}`,
    `│ 原穴：${currentShiChen.yuanXue} 常用穴：${currentShiChen.acupoints.join("、")}`,
    `│ 主治：${currentShiChen.indication}`,
    ``,
    `├─ 十二时辰流注 ─────────────────`,
    ...ALL_SHICHEN.map(s => {
      const m = s.zhi === currentShiChen.zhi ? "★" : "·";
      return `│ ${m} ${s.name}${s.timeRange} → ${s.jingLuo}(${s.zangFu})：${s.advice.substring(0, 30)}`;
    }),
    ``,
    `├─ 纳子法补泻 ─────────────────`,
    `│ · 纳子法：实则泻其子，虚则补其母`,
    `│ · 迎而夺之为泻，随而济之为补`,
    `│ · 时辰过后半个时辰（1小时），为经气最旺之时`,
    `│ · 实证在时辰内取子穴泻之，虚证在时辰内取母穴补之`,
    ``,
    `├─ 四季养生 ─────────────────`,
    `│ ${seasonAdvice.season}（${seasonAdvice.wuXingSeason}）`,
    `│ 调养：${seasonAdvice.mainFocus}`,
    `│ 情志：${seasonAdvice.emotion}`,
    `│ 饮食：${seasonAdvice.diet.join("、")}`,
    `│ 忌口：${seasonAdvice.avoid.join("、")}`,
    `│ 运动：${seasonAdvice.exercise}`,
    `│ 作息：${seasonAdvice.sleep}`,
    `│ 古籍：${seasonAdvice.classicalRef}`,
    ``,
    `├─ 养生要诀 ─────────────────`,
    `│ 1. 顺时作息：遵循子午流注规律睡眠/进食/工作`,
    `│ 2. 子午觉：子时(23-1)和午时(11-13)务必休息`,
    `│ 3. 辰时必食：早7-9点必须进食以养胃气`,
    `│ 4. 亥时入静：晚9点后停止剧烈活动准备入睡`,
    `│ 5. 经络拍打：可在经络当令前后拍打对应经络`,
    `│ 6. 辨证补泻：实证用泻法，虚证用补法`,
    ``,
    `└─ 古籍参考 ─────────────────`,
    `   《灵枢·经脉》：「经脉者，所以能决死生，处百病，调虚实，不可不通。」`,
    `   《子午流注针经》：「夫流注者，为刺法之深源，作针术之大要。」`,
    `   《针灸大成·子午流注》：「十二经络，各至其时，而为荣卫。」`,
    `   《标幽赋》：「一日取六十六穴之法，方见幽微；一时取一十二经之原，始知要妙。」`,
    ``,
    `子午流注者，天人合一之道也。顺时而养，事半功倍；逆时而耗，病从中生。`,
  ].filter(Boolean).join("\n");

  return { currentShiChen, allShiChen, seasonAdvice, summary };
}
