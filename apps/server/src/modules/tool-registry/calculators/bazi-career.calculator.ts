// ── 八字事业方向/择业计算引擎 ──
// 基于日主五行、用神喜忌、十神组合的事业方向分析
// 算法参考：《渊海子平·论五行》《三命通会·论职业》《滴天髓·配合篇》

import { GAN as GAN_RAW, ZHI as ZHI_RAW } from "@guoxue/bazi-engine";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GAN: string[] = GAN_RAW as unknown as string[];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ZHI: string[] = ZHI_RAW as unknown as string[];

const GAN_WUXING: Record<string, string> = {
  "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
  "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
};

const ZHI_WUXING: Record<string, string> = {
  "寅": "木", "卯": "木", "巳": "火", "午": "火",
  "辰": "土", "戌": "土", "丑": "土", "未": "土",
  "申": "金", "酉": "金", "亥": "水", "子": "水",
};

// ── 日主性格与事业风格 ──
const RIZHU_TRAITS: Record<string, { personality: string; careerStyle: string; leadershipStyle: string; weakness: string }> = {
  "甲": { personality: "如参天大树，刚正不阿、正直向上、有领袖气质。甲木为阳木，气势磅礴，不拘小节，敢于担当。", careerStyle: "管理型、开创型，适合做决策者和领头人。需要独立发挥空间，不宜被过多约束。", leadershipStyle: "大树型领导——为团队遮风挡雨，让下属在庇护下成长。", weakness: "有时过于强势，需注意倾听他人意见。" },
  "乙": { personality: "如藤萝花草，柔韧灵活、适应力强、心思细腻。乙木为阴木，以柔克刚，善于在夹缝中求生存。", careerStyle: "协调型、辅助型，适合做副手和幕后策划。宜借势发挥，依附大树更易成功。", leadershipStyle: "藤蔓型管理——善于连接资源与人脉，编织协作网络。", weakness: "有时缺乏主见，需增强独立决策能力。" },
  "丙": { personality: "如太阳当空，热情奔放、光明磊落、感染力强。丙火为阳火，能量外放，走到哪里都是焦点。", careerStyle: "表现型、传播型，适合做演讲者和公众人物。需要舞台展示才华，不宜埋没于暗处。", leadershipStyle: "太阳型领导——照亮团队方向，以热情感染带动大家。", weakness: "三分钟热度，需培养持久力。" },
  "丁": { personality: "如烛光灯火，温和细腻、洞察力强、内敛持久。丁火为阴火，星星之火可以燎原，后劲十足。", careerStyle: "研究型、技术型，适合做分析师和策划师。宜深耕细作，不宜追求表面风光。", leadershipStyle: "烛光型引导——以智慧点亮他人，润物细无声。", weakness: "过于内敛不善自我推销，需学会适当展示。" },
  "戊": { personality: "如巍峨山岳，厚重稳健、诚信可靠、脚踏实地。戊土为阳土，稳重如山，是最可靠的后盾。", careerStyle: "执行型、管理型，适合做项目管理和实业家。宜做实体的长期事业，不宜投机取巧。", leadershipStyle: "山岳型领导——稳重可靠，团队最坚实的依靠。", weakness: "过于保守缺乏变通，需增强灵活应变。" },
  "己": { personality: "如田园沃土，谦和包容、善解人意、耐心细致。己土为阴土，滋养万物，默默奉献不求回报。", careerStyle: "服务型、教育型，适合做教育和咨询工作。宜在服务他人中实现自我价值。", leadershipStyle: "田园型培养——耐心培育每个团队成员的成长。", weakness: "过于谦让容易吃亏，需学会保护自己。" },
  "庚": { personality: "如刀剑锋刃，刚毅果断、有魄力、重义气。庚金为阳金，宁折不弯，敢作敢为不惧挑战。", careerStyle: "竞争型、执行型，适合军警法律和创业。宜在竞争中展现实力，不宜安逸度日。", leadershipStyle: "刀剑型领导——果断决绝，在关键时刻敢于亮剑。", weakness: "锋芒太露易伤人伤己，需学会适当收敛。" },
  "辛": { personality: "如珠玉精金，精致优雅、追求完美、细腻敏感。辛金为阴金，温润而有光泽，注重品质和细节。", careerStyle: "艺术型、技术型，适合设计和精密技术。宜追求极致品质，不宜粗放式工作。", leadershipStyle: "珠宝型管理——以品质和标准服人，追求卓越。", weakness: "完美主义容易苛责自己和他人，需适度放松标准。" },
  "壬": { personality: "如江河大海，聪慧通达、包容豁达、势不可挡。壬水为阳水，大气磅礴，胸襟开阔不拘小节。", careerStyle: "智慧型、流通型，适合贸易和传媒工作。宜做大格局事业，不宜囿于小天地。", leadershipStyle: "大海型领导——海纳百川，汇聚各路人才为我所用。", weakness: "有时候过于随性缺乏规划，需增强条理性。" },
  "癸": { personality: "如雨露甘泉，深沉内敛、洞察敏锐、韧劲十足。癸水为阴水，水滴石穿，以柔克刚后发制人。", careerStyle: "研究型、策略型，适合科研和战略规划。宜做幕后智囊，不宜冲在第一线。", leadershipStyle: "雨露型影响——潜移默化，以智慧和谋略引导方向。", weakness: "过于内敛深藏容易被忽视，需适时展现能力。" },
};

// ── 五行行业库（60+ 行业）──
// 来源：《三命通会·论五行所主》《滴天髓·配合篇》
const WUXING_CAREERS: Record<string, { industry: string; category: string; fitLevel: "极佳" | "良好" | "可尝试"; reason: string }[]> = {
  "木": [
    { industry: "教育培训", category: "文教", fitLevel: "极佳", reason: "木主文昌教育，培训讲学正合木性，桃李满天下" },
    { industry: "医疗健康（中医）", category: "健康", fitLevel: "极佳", reason: "木主生发之气，中医草药行业助人健康如木生发" },
    { industry: "出版传媒", category: "文化", fitLevel: "良好", reason: "木主文印传播，出版传媒利于才华发挥流芳百世" },
    { industry: "环保绿化", category: "环保", fitLevel: "极佳", reason: "木主自然生态，环保绿化乃本行正业，名利双收" },
    { industry: "服装设计", category: "时尚", fitLevel: "良好", reason: "木主衣饰，设计行业可发挥审美与创意" },
    { industry: "文化创意", category: "文创", fitLevel: "良好", reason: "木主文化艺术，文创产业一片蓝海大有可为" },
    { industry: "心理咨询", category: "服务", fitLevel: "可尝试", reason: "木主仁爱，心理咨询助人解忧符合木德" },
    { industry: "植物花卉", category: "农业", fitLevel: "极佳", reason: "木主花木，花卉园艺是天然的事业归宿" },
    { industry: "人力资源管理", category: "管理", fitLevel: "良好", reason: "木主生长培育，HR选人育人正如栽培树木" },
    { industry: "音乐艺术", category: "艺术", fitLevel: "可尝试", reason: "木主琴瑟，音乐艺术领域可发抒才情但需火助" },
    { industry: "儿童教育", category: "教育", fitLevel: "极佳", reason: "幼苗培育最合木性，儿童教育让天赋成长" },
    { industry: "家装设计", category: "设计", fitLevel: "良好", reason: "木主居室装饰，家装设计营造温暖的家的氛围" },
  ],
  "火": [
    { industry: "能源电力", category: "能源", fitLevel: "极佳", reason: "火主能源，电力行业如烈火燎原势不可挡" },
    { industry: "互联网科技", category: "科技", fitLevel: "极佳", reason: "火主光明传播，互联网正合火性光照四方" },
    { industry: "影视娱乐", category: "娱乐", fitLevel: "良好", reason: "火主光彩夺目，演艺娱乐行业尽显才华" },
    { industry: "餐饮美食", category: "餐饮", fitLevel: "良好", reason: "火主烹饪，餐饮业以火为魂烹制美味" },
    { industry: "美容化妆", category: "美容", fitLevel: "良好", reason: "火主容貌光彩，美容美妆行业大放异彩" },
    { industry: "电子电器", category: "制造", fitLevel: "极佳", reason: "火主电器电子，电子科技行业如鱼得水" },
    { industry: "市场营销", category: "商业", fitLevel: "良好", reason: "火主热情传播，市场营销需要火的感染力" },
    { industry: "心理咨询", category: "服务", fitLevel: "可尝试", reason: "火主温暖热情，助人解忧传递正能量" },
    { industry: "化学化工", category: "工业", fitLevel: "极佳", reason: "火主化学反应，化工行业变化多端正合火性" },
    { industry: "航空航太", category: "交通", fitLevel: "良好", reason: "火主上升飞天，航空航天事业青云直上" },
    { industry: "摄影摄像", category: "传媒", fitLevel: "良好", reason: "火主光影，摄影行业捕捉光影艺术创作为本行" },
    { industry: "体育竞技", category: "体育", fitLevel: "可尝试", reason: "火主竞争拼搏，体育竞技释放火的能量" },
  ],
  "土": [
    { industry: "房地产开发", category: "地产", fitLevel: "极佳", reason: "土主房地产，建筑开发行业是天然的用武之地" },
    { industry: "金融保险", category: "金融", fitLevel: "良好", reason: "土主信用稳定，金融行业厚重稳健可托付信任" },
    { industry: "农业种植", category: "农业", fitLevel: "极佳", reason: "土主土地耕种，农业种植得天独厚国之大本" },
    { industry: "陶瓷石材", category: "矿产", fitLevel: "良好", reason: "土主矿石陶瓷，建材行业百年基业厚重持久" },
    { industry: "仓储物流", category: "物流", fitLevel: "良好", reason: "土主储藏，仓储物流聚散有序守成有道" },
    { industry: "城市规划", category: "城建", fitLevel: "极佳", reason: "土主城郭，城市规划建设千秋功业利国利民" },
    { industry: "土木工程", category: "工程", fitLevel: "极佳", reason: "土主工程建造，土木建筑百年大计质量第一" },
    { industry: "古董收藏", category: "文玩", fitLevel: "良好", reason: "土主古旧器物，古董文物收藏有厚重的文化价值" },
    { industry: "物业管理", category: "服务", fitLevel: "可尝试", reason: "土主管辖范围，物业管理守护一方水土" },
    { industry: "丧葬行业", category: "服务", fitLevel: "可尝试", reason: "土主入土为安，殡葬行业承载最后的尊严" },
    { industry: "畜牧养殖", category: "农业", fitLevel: "良好", reason: "土主土地滋养万物，畜牧业扎根大地生生不息" },
    { industry: "桥梁隧道", category: "工程", fitLevel: "良好", reason: "土主贯通，桥梁隧道连接四方天堑变通途" },
  ],
  "金": [
    { industry: "金融投资", category: "金融", fitLevel: "极佳", reason: "金主钱财货币，金融投资深合金气一本万利" },
    { industry: "法律司法", category: "法律", fitLevel: "极佳", reason: "金主义刑断是非，法律行业明辨曲直伸张正义" },
    { industry: "机械制造", category: "制造", fitLevel: "良好", reason: "金主金属机械，制造业铸造精密强国之基" },
    { industry: "珠宝首饰", category: "奢侈品", fitLevel: "极佳", reason: "金主珠宝，奢侈品行业衬托金气贵不可言" },
    { industry: "精密仪器", category: "科技", fitLevel: "良好", reason: "金主精工细作，精密技术毫厘之间见真功夫" },
    { industry: "外科医疗", category: "医疗", fitLevel: "良好", reason: "金主刀械切割，外科手术手到病除妙手回春" },
    { industry: "汽车制造", category: "制造", fitLevel: "良好", reason: "金主车辆金属，汽车工业国之重器大有可为" },
    { industry: "军警安保", category: "安全", fitLevel: "极佳", reason: "金主兵戈武力，军警行业守卫平安义不容辞" },
    { industry: "矿业开采", category: "资源", fitLevel: "良好", reason: "金主矿藏，矿业开采掘地得金资源为王" },
    { industry: "电子竞技", category: "体育", fitLevel: "可尝试", reason: "金主争锋，竞技对抗快意恩仇但需节制" },
    { industry: "鉴定检测", category: "技术", fitLevel: "良好", reason: "金主辨别真伪，鉴定检测行业火眼金睛" },
    { industry: "刀具厨具", category: "制造", fitLevel: "可尝试", reason: "金主利器，厨刀工具行业持续刚需市场稳定" },
  ],
  "水": [
    { industry: "航运物流", category: "交通", fitLevel: "极佳", reason: "水主流动运输，航运物流通达四海财源滚滚" },
    { industry: "广告传媒", category: "传媒", fitLevel: "极佳", reason: "水主智慧传播，广告传媒广而告之润物无声" },
    { industry: "水产渔业", category: "渔业", fitLevel: "良好", reason: "水主水产鱼虾，渔业水产得水滋养生生不息" },
    { industry: "旅游酒店", category: "旅游", fitLevel: "良好", reason: "水主流动旅行，旅游酒店走遍四方见多识广" },
    { industry: "外交贸易", category: "贸易", fitLevel: "良好", reason: "水主沟通往来，外交贸易互通有无利国利民" },
    { industry: "饮料行业", category: "食品", fitLevel: "极佳", reason: "水主饮品，饮料酒水行业液体的黄金流淌的财富" },
    { industry: "信息技术", category: "科技", fitLevel: "良好", reason: "水主信息流动，IT行业信息如水流布无远弗届" },
    { industry: "清洁环保", category: "服务", fitLevel: "良好", reason: "水主洗涤净化，清洁环保行业净化世界洗涤心灵" },
    { industry: "医药行业（西医）", category: "医疗", fitLevel: "良好", reason: "水主液体药剂，西药输液与水之道不谋而合" },
    { industry: "咨询顾问", category: "服务", fitLevel: "极佳", reason: "水主智谋策划，咨询服务以智慧变现善利万物" },
    { industry: "水利工程", category: "工程", fitLevel: "极佳", reason: "水主江河水利，治水工程利在千秋国之大业" },
    { industry: "影视编剧", category: "文创", fitLevel: "可尝试", reason: "水主情节曲折，编剧创作跌宕起伏但需火辅" },
  ],
};

// ── 十神职业映射 ──
// 来源：《三命通会·论十神所主》
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SHISHEN_CAREER: Record<string, { suitable: string[]; desc: string }> = {
  "比": { suitable: ["运动员", "手艺人", "个体户", "自由职业", "培训教练"], desc: "比肩旺者宜自主创业或技艺型工作，独立操作性强" },
  "劫": { suitable: ["合伙人", "投资人", "团队管理", "经纪人", "众筹组织"], desc: "劫财旺者擅整合资源与人合伙，但需防利益分配纠纷" },
  "食": { suitable: ["艺术家", "设计师", "厨师", "作家", "音乐人", "教师"], desc: "食神旺者有创意才情，宜艺术文化教育等创造性工作" },
  "伤": { suitable: ["演艺明星", "律师", "记者", "发明家", "广告策划", "脱口秀"], desc: "伤官旺者才华横溢口才出众，宜需要表达和创意的行业" },
  "才": { suitable: ["销售", "贸易商", "基金经理", "创业家", "市场营销"], desc: "偏财旺者商业嗅觉灵敏，宜经商创业投资风险偏好型" },
  "财": { suitable: ["财务总监", "银行家", "审计师", "薪资管理", "会计师"], desc: "正财旺者善于理财管理，宜稳稳当当的财务管理岗位" },
  "杀": { suitable: ["军人", "警察", "外科医生", "检察官", "企业CEO"], desc: "七杀旺者有魄力敢作敢为，宜高压高风险高回报行业" },
  "官": { suitable: ["公务员", "法官", "教师", "人力资源", "行政管理"], desc: "正官旺者有规矩守纪律，宜体制内按部就班的稳定工作" },
  "枭": { suitable: ["研究员", "程序员", "玄学家", "分析师", "图书管理员"], desc: "枭神旺者思维独特与众不同，宜需要深度钻研的技术岗位" },
  "印": { suitable: ["教授", "学者", "作家", "编辑", "咨询师", "命理师"], desc: "正印旺者学识渊博善于传授，宜教育学术文化传播领域" },
};

// ── 本地类型 ──
interface RiZhuCareerInfo { riZhu: string; wuXing: string; personality: string; careerStyle: string; leadershipStyle: string; weakness: string; }
interface YongShenCareerInfo { yongShen: string; xiShen: string; jiShen: string; careerDirection: string; geJuHint: string; }
interface CareerItem { industry: string; category: string; fitLevel: "极佳" | "良好" | "可尝试"; reason: string; }
interface CareerStageInfo { early: string; middle: string; late: string; }
interface CaiYunInfo { mainSource: string; peakPeriod: string; advice: string; wealthType: string; }
interface BaziCareerResult {
  summary: string; riZhuAnalysis: RiZhuCareerInfo; yongShenCareer: YongShenCareerInfo;
  suitableCareers: CareerItem[]; unsuitableCareers: CareerItem[]; careerStages: CareerStageInfo; caiYunAnalysis: CaiYunInfo;
}

export function calculateBaziCareer(input: Record<string, unknown>): BaziCareerResult {
  const dayPillar = (input.dayPillar as string) || "戊辰";
  const monthPillar = (input.monthPillar as string) || "丙寅";
  const yearPillar = (input.yearPillar as string) || "甲子";

  const riGan = dayPillar[0] || "戊";
  const riWuXing = GAN_WUXING[riGan] || "土";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const riZhi = dayPillar[1] || "辰";

  // 日主分析
  const riZhuTraits = RIZHU_TRAITS[riGan] || RIZHU_TRAITS["戊"];
  const riZhuAnalysis: RiZhuCareerInfo = {
    riZhu: dayPillar, wuXing: riWuXing,
    personality: riZhuTraits.personality,
    careerStyle: riZhuTraits.careerStyle,
    leadershipStyle: riZhuTraits.leadershipStyle,
    weakness: riZhuTraits.weakness,
  };

  // ── 用神喜忌分析 ──
  const yueZhi = monthPillar[1] || "寅";
  const yueWuXing = ZHI_WUXING[yueZhi] || "木";
  const nianZhi = yearPillar[1] || "子";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nianWuXing = ZHI_WUXING[nianZhi] || "水";
  const xiangSheng: Record<string, string> = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
  const xiangKe: Record<string, string> = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };
  const beiSheng: Record<string, string> = { "火": "木", "土": "火", "金": "土", "水": "金", "木": "水" };

  // 简单的用神判断：取月令对日主的关系
  const yueLingRel = yueWuXing === riWuXing ? "旺" :
    yueWuXing === xiangSheng[riWuXing] ? "相" :
    yueWuXing === beiSheng[riWuXing] ? "休" :
    yueWuXing === xiangKe[riWuXing] ? "囚" : "死";

  // 根据月令旺衰决定用神
  let yongShen: string;
  let xiShen: string;
  let jiShen: string;
  let geJuHint: string;

  if (yueLingRel === "旺" || yueLingRel === "相") {
    // 日主旺相，取克泄耗为用
    yongShen = xiangKe[riWuXing];  // 官杀克身为用
    xiShen = xiangSheng[riWuXing];  // 食伤泄秀为喜
    jiShen = beiSheng[riWuXing];    // 印星生身为忌
    geJuHint = `日主${riWuXing}生于${yueWuXing}月为${yueLingRel}，身旺。${xiangSheng[riWuXing]}为食伤泄秀，才华可展；${xiangKe[riWuXing]}为官杀，事业有压力但可化为动力。身旺者能干大事业，但需防刚愎自用。《滴天髓》云："旺者宜克宜泄。"`;
  } else {
    // 日主衰弱，取生扶为用
    yongShen = beiSheng[riWuXing];  // 印星生身为用
    xiShen = riWuXing;               // 比劫帮身为喜
    jiShen = xiangKe[riWuXing];      // 官杀克身为忌
    geJuHint = `日主${riWuXing}生于${yueWuXing}月为${yueLingRel}，身偏弱。宜借印星${beiSheng[riWuXing]}之力充实根基，靠比劫${riWuXing}同行互助。适合团队协作型工作，不宜单打独斗。《滴天髓》云："弱者宜生宜扶。"`;
  }

  const yongShenCareer: YongShenCareerInfo = {
    yongShen, xiShen, jiShen,
    careerDirection: `宜从事${yongShen}、${xiShen}五行相关的行业，避开${jiShen}性过重的领域。用神为事业之根本，顺之则事半功倍。`,
    geJuHint,
  };

  // ── 推荐职业 ──
  const careers = [...(WUXING_CAREERS[riWuXing] || []), ...WUXING_CAREERS[yongShen].filter(c => c.fitLevel === "极佳").map(c => ({ ...c, fitLevel: "极佳" as const }))];
  const suitableCareers = careers.filter((c, i, arr) => arr.findIndex(x => x.industry === c.industry) === i).slice(0, 10);

  const unsuitableCareers = (WUXING_CAREERS[jiShen] || []).slice(0, 3).map(c => ({
    industry: c.industry, category: c.category,
    fitLevel: "可尝试" as const, reason: `${jiShen}性重，与日主相克，若非必要宜避开此类行业`,
  }));

  // ── 事业阶段分析 ──
  const careerStages: CareerStageInfo = {
    early: yueLingRel === "旺" || yueLingRel === "相"
      ? `25-35岁青年期：日主旺相，早年即可崭露头角。宜把握${xiShen}性行业机会，大胆展示才华。忌骄傲自满错失良师益友。`
      : `25-35岁青年期：日主偏弱，前期宜潜心学习积累。选择${beiSheng[riWuXing]}性导师和环境，借外力充实自身。切忌急于求成。`,
    middle: riWuXing === "火" || riWuXing === "木"
      ? `35-50岁中年期：日主能量充足，正值事业黄金期。宜在${yongShen}性行业深耕，建立自己的事业版图。此阶段可大胆决策、积极扩张。`
      : `35-50岁中年期：厚积薄发阶段。前期的积累开始产生复利效应。宜在${xiShen}性领域发力，稳扎稳打逐步上升。`,
    late: riWuXing === "水" || riWuXing === "土"
      ? `50岁以后稳定期：日主${riWuXing}属厚实之质，越老越有经验优势。宜转向顾问、培训、传承等角色。可考虑著述立说，为行业留下智慧结晶。`
      : `50岁以后转型期：事业巅峰已过，宜转向指导型角色。${riWuXing === "金" ? "金主决断，可做投资人、顾问、董事等决策型角色。" : "可将实战经验转化为培训课程，做创业导师。"}`,
  };

  // ── 财运分析 ──
  let wealthType: string;
  let mainSource: string;
  if (xiangKe[riWuXing] === yongShen) {
    wealthType = "压力致富型";
    mainSource = "在压力和竞争中创造财富。宜做有挑战性的工作，压力越大财运越好。投资风格偏稳健，不宜投机。";
  } else if (xiangSheng[riWuXing] === yongShen) {
    wealthType = "才华变现型";
    mainSource = "凭才华和创意赚钱。宜发展专业技能和个人品牌，知识付费、创意产出是最佳财富来源。偏财运好，可适当投资。";
  } else {
    wealthType = "积累致富型";
    mainSource = "日积月累厚积薄发。适合通过长期稳定的职业发展积累财富，辅以理财投资实现财务自由。不宜赌博式投资。";
  }

  const caiYunAnalysis: CaiYunInfo = {
    mainSource,
    peakPeriod: "35-50岁为财运高峰期。此阶段五行能量最为均衡，事业发展与财富积累同步推进。",
    advice: `用神${yongShen}为财运提升的关键。多用${WUXING_CAREERS[yongShen]?.[0]?.category || yongShen}性思维做财务决策，有助于提升财富格局。`,
    wealthType,
  };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const suitableNames = suitableCareers.slice(0, 5).map(c => c.industry);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scoreBar = "█".repeat(Math.max(1, Math.round((suitableCareers.length) / 10 * 10))) + "░".repeat(10 - Math.max(1, Math.round((suitableCareers.length) / 10 * 10)));
  const summary = [
    "┌─ 八字事业方向 ─────────────────────┐",
    `│ 日主：${riGan}属${riWuXing} 用神：${yongShen} 喜神：${xiShen} 忌神：${jiShen}`.padEnd(36) + "│",
    `│ 财富类型：${wealthType}`.padEnd(36) + "│",
    "├─ 推荐行业 ─────────────────────────┤",
    ...suitableCareers.slice(0, 5).map(c => `│ ${c.fitLevel === "极佳" ? "★" : "·"} ${c.industry}（${c.category}）`.padEnd(36) + "│"),
    "├─ 事业阶段 ─────────────────────────┤",
    `│ 青年：${careerStages.early.slice(0, 26)}`.padEnd(36) + "│",
    `│ 中年：${careerStages.middle.slice(0, 26)}`.padEnd(36) + "│",
    `│ 晚年：${careerStages.late.slice(0, 26)}`.padEnd(36) + "│",
    "├─ 出处 ─────────────────────────────┤",
    "│ 《渊海子平》《三命通会》《滴天髓》  │",
    "└────────────────────────────────────┘",
  ].join("\n");

  return { summary, riZhuAnalysis, yongShenCareer, suitableCareers, unsuitableCareers, careerStages, caiYunAnalysis };
}
