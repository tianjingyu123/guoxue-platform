// ── 六十甲子详解计算引擎 ──
// 算法参考：《三命通会·六十甲子》《渊海子平》《五行大义》
// 纳音五行、甲子旬空、天地冲合配卦全解

import type { LiuShiJiaZiResult } from "@guoxue/shared";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

// ── 天干信息表 ──
const GAN_INFO: Record<string, { element: string; yinYang: string; meaning: string }> = {
  "甲": { element: "木", yinYang: "阳", meaning: "栋梁之木，正直仁德" },
  "乙": { element: "木", yinYang: "阴", meaning: "花草之木，柔韧婉转" },
  "丙": { element: "火", yinYang: "阳", meaning: "太阳之火，光明磊落" },
  "丁": { element: "火", yinYang: "阴", meaning: "灯烛之火，温和细腻" },
  "戊": { element: "土", yinYang: "阳", meaning: "高岗之土，敦厚诚信" },
  "己": { element: "土", yinYang: "阴", meaning: "田园之土，包容滋养" },
  "庚": { element: "金", yinYang: "阳", meaning: "斧钺之金，刚毅果断" },
  "辛": { element: "金", yinYang: "阴", meaning: "珠玉之金，精致敏锐" },
  "壬": { element: "水", yinYang: "阳", meaning: "江河之水，浩瀚智慧" },
  "癸": { element: "水", yinYang: "阴", meaning: "雨露之水，灵秀聪慧" },
};

// ── 地支信息表 ──
const ZHI_INFO: Record<string, { element: string; animal: string; meaning: string }> = {
  "子": { element: "水", animal: "鼠", meaning: "灵动智慧，潜藏待机" },
  "丑": { element: "土", animal: "牛", meaning: "勤勉坚韧，稳重踏实" },
  "寅": { element: "木", animal: "虎", meaning: "威猛勇敢，开拓进取" },
  "卯": { element: "木", animal: "兔", meaning: "温柔敏捷，机警灵活" },
  "辰": { element: "土", animal: "龙", meaning: "龙腾九天，变化莫测" },
  "巳": { element: "火", animal: "蛇", meaning: "智慧应变，善于谋略" },
  "午": { element: "火", animal: "马", meaning: "热情奔放，光明正大" },
  "未": { element: "土", animal: "羊", meaning: "温和包容，厚德载物" },
  "申": { element: "金", animal: "猴", meaning: "机智灵活，善于变通" },
  "酉": { element: "金", animal: "鸡", meaning: "精致优雅，果断刚毅" },
  "戌": { element: "土", animal: "狗", meaning: "忠诚守信，稳重踏实" },
  "亥": { element: "水", animal: "猪", meaning: "智慧深远，清静无为" },
};

// ── 纳音五行映射 ──
const NAYIN_ELEMENT: Record<string, string> = {
  "海中金": "金", "炉中火": "火", "大林木": "木", "路旁土": "土",
  "剑锋金": "金", "山头火": "火", "涧下水": "水", "城头土": "土",
  "白蜡金": "金", "杨柳木": "木", "井泉水": "水", "屋上土": "土",
  "霹雳火": "火", "松柏木": "木", "长流水": "水", "沙中金": "金",
  "山下火": "火", "平地木": "木", "壁上土": "土", "金箔金": "金",
  "覆灯火": "火", "天河水": "水", "大驿土": "土", "钗钏金": "金",
  "桑柘木": "木", "大溪水": "水", "沙中土": "土", "天上火": "火",
  "石榴木": "木", "大海水": "水",
};

// ── 纳音详解 ──
const NAYIN_DETAIL: Record<string, string> = {
  "海中金": "金埋海底，暗藏锋芒",
  "炉中火": "炉火炽烈，煅炼成器",
  "大林木": "林木参天，枝繁叶茂",
  "路旁土": "道旁之土，厚德载物",
  "剑锋金": "宝剑淬火，锋锐难当",
  "山头火": "烽火燎原，气势恢宏",
  "涧下水": "清泉流淌，润物无声",
  "城头土": "城垣高筑，固若金汤",
  "白蜡金": "金玉其质，温润光泽",
  "杨柳木": "拂水杨柳，柔中带刚",
  "井泉水": "井泉清冽，源源不绝",
  "屋上土": "屋瓦覆盖，遮风挡雨",
  "霹雳火": "雷霆万钧，电光石火",
  "松柏木": "松柏傲雪，四季常青",
  "长流水": "江河不息，奔流到海",
  "沙中金": "金沙混泥，淘尽见真",
  "山下火": "野火燎原，星火可燎",
  "平地木": "平原之木，根深叶茂",
  "壁上土": "壁上丹青，华而不浮",
  "金箔金": "薄金贴饰，华光璀璨",
  "覆灯火": "明灯高悬，照破黑暗",
  "天河水": "银河倒挂，天降甘霖",
  "大驿土": "驿道厚土，通达四方",
  "钗钏金": "金钗宝钏，华贵雍容",
  "桑柘木": "桑柘繁茂，蚕丝绵绵",
  "大溪水": "溪流奔涌，一往无前",
  "沙中土": "沙土混金，厚积薄发",
  "天上火": "烈日中天，光耀万物",
  "石榴木": "榴花似火，绚烂夺目",
  "大海水": "海纳百川，包容万物",
};

// ── 五行喜忌映射 ──
const WUXING_PREFERENCES: Record<string, { suitable: string[]; avoid: string[] }> = {
  "金": { suitable: ["金融", "法律", "管理"], avoid: ["餐饮", "能源"] },
  "木": { suitable: ["教育", "文化", "设计"], avoid: ["金融", "法律"] },
  "水": { suitable: ["物流", "贸易", "传媒"], avoid: ["建筑", "地产"] },
  "火": { suitable: ["创意", "演艺", "科技"], avoid: ["物流", "航运"] },
  "土": { suitable: ["建筑", "地产", "农业"], avoid: ["教育", "文化"] },
};

// ── 获取天干信息 ──
function getGan(gan: string): { name: string; element: string; yinYang: string; meaning: string } {
  const info = GAN_INFO[gan];
  return { name: gan, element: info.element, yinYang: info.yinYang, meaning: info.meaning };
}

// ── 获取地支信息 ──
function getZhi(zhi: string): { name: string; element: string; animal: string; meaning: string } {
  const info = ZHI_INFO[zhi];
  return { name: zhi, element: info.element, animal: info.animal, meaning: info.meaning };
}

// ── 获取喜忌 ──
function getPreferences(naYin: string): { suitable: string[]; avoid: string[] } {
  const element = NAYIN_ELEMENT[naYin] || "土";
  return WUXING_PREFERENCES[element];
}

// ── 60甲子数据库 ──
interface JiaZiEntry {
  index: number;
  naYin: string;
  personality: string[];
  careerFit: string[];
  marriageRef: string;
  poem: string;
  judgment: string;
}

const JIAZI_DB: Record<string, JiaZiEntry> = {
  "甲子": {
    index: 1, naYin: "海中金",
    personality: ["深沉内敛", "智谋过人"],
    careerFit: ["金融分析师", "战略顾问", "古董鉴定"],
    marriageRef: "配乙丑，刚柔相济",
    poem: "明珠入海藏锋锐，一朝出世耀乾坤",
    judgment: "内藏锋芒，外示柔和，静待时机可成大业",
  },
  "乙丑": {
    index: 2, naYin: "海中金",
    personality: ["含蓄稳重", "坚忍不拔"],
    careerFit: ["财务审计", "珠宝设计", "学术研究"],
    marriageRef: "配甲子，琴瑟和鸣",
    poem: "宝玉藏匣光华敛，云开月现照九州",
    judgment: "厚积薄发之命，中年后运势渐开，晚景丰隆",
  },
  "丙寅": {
    index: 3, naYin: "炉中火",
    personality: ["热情进取", "魄力非凡"],
    careerFit: ["企业高管", "创业者", "演艺明星"],
    marriageRef: "配辛卯，火木相生",
    poem: "炉火炼金成大器，虎啸生风震山林",
    judgment: "精力旺盛，敢作敢为，唯戒急躁方能长久",
  },
  "丁卯": {
    index: 4, naYin: "炉中火",
    personality: ["细腻温和", "聪慧敏锐"],
    careerFit: ["工艺美术", "教育培训", "心理咨询"],
    marriageRef: "配壬寅，火水既济",
    poem: "灯烛映辉照暗夜，玉兔升空引清辉",
    judgment: "外柔内刚，善于协调，文思敏捷可成文化事业",
  },
  "戊辰": {
    index: 5, naYin: "大林木",
    personality: ["敦厚稳重", "宽宏大量"],
    careerFit: ["农业管理", "房地产开发", "公益事业"],
    marriageRef: "配癸酉，土木相成",
    poem: "林木参天凌云志，龙腾四海布祥云",
    judgment: "根基深厚，胸襟广阔，中年后财禄丰盈",
  },
  "己巳": {
    index: 6, naYin: "大林木",
    personality: ["灵动机变", "仁心宽厚"],
    careerFit: ["园林设计", "文化传播", "中医养生"],
    marriageRef: "配甲戌，木火通明",
    poem: "绿野成荫遮烈日，灵蛇化龙上九霄",
    judgment: "适应力强，贵人运佳，一生多得他人相助",
  },
  "庚午": {
    index: 7, naYin: "路旁土",
    personality: ["刚毅果断", "志向远大"],
    careerFit: ["军警武职", "工程管理", "体育运动"],
    marriageRef: "配乙未，土金相生",
    poem: "驿路扬尘驰骏马，金戈铁马定乾坤",
    judgment: "性刚气盛，宜走武职，中年注意情绪管理",
  },
  "辛未": {
    index: 8, naYin: "路旁土",
    personality: ["温和包容", "踏实稳健"],
    careerFit: ["土木工程", "仓储物流", "农业种植"],
    marriageRef: "配甲午，土火相生",
    poem: "沃土育禾春华茂，秋收万籽仓廪实",
    judgment: "勤恳务实，一生平顺，宜守成不宜冒进",
  },
  "壬申": {
    index: 9, naYin: "剑锋金",
    personality: ["锐气逼人", "果敢决断"],
    careerFit: ["外科医生", "军事指挥", "科技创新"],
    marriageRef: "配丁亥，金水相涵",
    poem: "宝剑出鞘寒光现，金猴腾云闹天宫",
    judgment: "锋芒太露易招是非，需学会藏锋守拙",
  },
  "癸酉": {
    index: 10, naYin: "剑锋金",
    personality: ["精明干练", "追求完美"],
    careerFit: ["精密仪器", "投资银行", "司法系统"],
    marriageRef: "配丙辰，金土相生",
    poem: "锋芒初露惊寰宇，金鸡报晓天下白",
    judgment: "才具不凡，精益求精，但过刚易折需柔济",
  },
  "甲戌": {
    index: 11, naYin: "山头火",
    personality: ["激情澎湃", "领袖气质"],
    careerFit: ["政治领袖", "品牌营销", "导演编剧"],
    marriageRef: "配己卯，火土木和",
    poem: "烽火燎原燃八荒，天狗吞月幻无常",
    judgment: "气势如虹，可成大事，防盛极而衰知进退",
  },
  "乙亥": {
    index: 12, naYin: "山头火",
    personality: ["温柔坚定", "良善慈悲"],
    careerFit: ["慈善事业", "文化教育", "医疗护理"],
    marriageRef: "配庚寅，火金相制",
    poem: "烛照暗夜明灯引，福猪拱门送祥瑞",
    judgment: "以柔克刚之命，善用智慧化险为夷",
  },
  "丙子": {
    index: 13, naYin: "涧下水",
    personality: ["聪慧灵动", "善于创造"],
    careerFit: ["水利工程", "艺术创作", "教育培训"],
    marriageRef: "配辛丑，水金相生",
    poem: "清泉润物细无声，灵鼠穿堂巧盗光",
    judgment: "智谋出众，一生财运佳，注意情感专一",
  },
  "丁丑": {
    index: 14, naYin: "涧下水",
    personality: ["内敛含蓄", "意志坚定"],
    careerFit: ["地质勘探", "环境保护", "学术研究"],
    marriageRef: "配庚子，水土相制",
    poem: "溪流汇川奔沧海，勤牛耕耘积厚福",
    judgment: "厚德载物，踏实进取，中年后运势通达",
  },
  "戊寅": {
    index: 15, naYin: "城头土",
    personality: ["威严肃穆", "原则性强"],
    careerFit: ["建筑工程", "城市管理", "法律仲裁"],
    marriageRef: "配癸卯，土木相安",
    poem: "城池固守镇八方，虎踞龙盘定乾坤",
    judgment: "守护型人才，宜从事安全防卫类职业",
  },
  "己卯": {
    index: 16, naYin: "城头土",
    personality: ["稳重务实", "细心周到"],
    careerFit: ["城市规划", "测绘工程", "会计审计"],
    marriageRef: "配甲戌，土火相生",
    poem: "筑土为基起高楼，玉兔东升照华堂",
    judgment: "基础扎实，稳步上升，适合技术型岗位",
  },
  "庚辰": {
    index: 17, naYin: "白蜡金",
    personality: ["温润如玉", "才思敏捷"],
    careerFit: ["珠宝鉴定", "文化产业", "艺术品投资"],
    marriageRef: "配乙酉，金金比和",
    poem: "金玉其质光华润，龙行云海显神通",
    judgment: "才华横溢，贵人相助，一生艺术缘深厚",
  },
  "辛巳": {
    index: 18, naYin: "白蜡金",
    personality: ["精致敏锐", "洞察力强"],
    careerFit: ["金融分析", "古董鉴定", "美容造型"],
    marriageRef: "配甲申，金水相生",
    poem: "金光照耀破迷雾，灵蛇吐信探玄机",
    judgment: "眼光独到，善抓机会，注意小人心防",
  },
  "壬午": {
    index: 19, naYin: "杨柳木",
    personality: ["柔中带刚", "艺术气质"],
    careerFit: ["文学创作", "音乐表演", "花艺设计"],
    marriageRef: "配丁未，木土相安",
    poem: "杨柳拂风春意暖，天马行空任逍遥",
    judgment: "浪漫多情，才华出众，一生桃花运较旺",
  },
  "癸未": {
    index: 20, naYin: "杨柳木",
    personality: ["温和婉约", "善解人意"],
    careerFit: ["服装设计", "插花艺术", "幼儿教育"],
    marriageRef: "配丙午，木火相生",
    poem: "弱柳扶风姿婉转，吉羊献瑞福绵长",
    judgment: "性情温柔，人缘极佳，宜从事美感相关工作",
  },
  "甲申": {
    index: 21, naYin: "井泉水",
    personality: ["清高淡泊", "智慧深邃"],
    careerFit: ["哲学研究", "水利专家", "软件工程"],
    marriageRef: "配己丑，水土相制",
    poem: "清泉涌流润枯槁，金猴献果报佳音",
    judgment: "智识超群，宜静不宜动，学术研究佳",
  },
  "乙酉": {
    index: 22, naYin: "井泉水",
    personality: ["灵动聪慧", "交际能手"],
    careerFit: ["公共关系", "媒体传播", "教育培训"],
    marriageRef: "配戊辰，水土相调",
    poem: "玉露凝珠映朝霞，金鸡独立傲群雄",
    judgment: "口才出众，善于表达，宜从事沟通类职业",
  },
  "丙戌": {
    index: 23, naYin: "屋上土",
    personality: ["稳重保守", "责任心强"],
    careerFit: ["建筑监理", "仓储管理", "安保服务"],
    marriageRef: "配辛卯，土木相战",
    poem: "高屋建瓴立千秋，忠犬守户护平安",
    judgment: "家庭观念重，安定第一，宜守成不宜迁移",
  },
  "丁亥": {
    index: 24, naYin: "屋上土",
    personality: ["内秀外拙", "深思熟虑"],
    careerFit: ["室内设计", "物业管理", "物流规划"],
    marriageRef: "配壬申，土金相生",
    poem: "居安思危常绸缪，福猪聚财满仓廪",
    judgment: "善于谋划，稳中求进，中年后家业昌隆",
  },
  "戊子": {
    index: 25, naYin: "霹雳火",
    personality: ["刚烈豪爽", "不拘小节"],
    careerFit: ["创业家", "改革先锋", "体育竞技"],
    marriageRef: "配癸丑，火土木和",
    poem: "雷霆震天驱魍魉，灵鼠穿云引天光",
    judgment: "爆发力强，善开创新局，需修身养性持恒",
  },
  "己丑": {
    index: 26, naYin: "霹雳火",
    personality: ["外柔内刚", "卧虎藏龙"],
    careerFit: ["能源开发", "应急救援", "军事技术"],
    marriageRef: "配甲子，火金相克",
    poem: "电光石火一瞬间，勤牛奋力闯雄关",
    judgment: "不动则已，动则惊人，一生有大起大落之象",
  },
  "庚寅": {
    index: 27, naYin: "松柏木",
    personality: ["坚毅正直", "气节高尚"],
    careerFit: ["法官律师", "教育管理", "林业环保"],
    marriageRef: "配乙亥，木水相生",
    poem: "松柏傲霜凌绝顶，虎啸生风镇山林",
    judgment: "品性高洁，不畏艰难，晚年福德深厚",
  },
  "辛卯": {
    index: 28, naYin: "松柏木",
    personality: ["高风亮节", "自律严谨"],
    careerFit: ["高等教育", "宗教哲学", "生物科技"],
    marriageRef: "配甲戌，木火通明",
    poem: "翠柏长青经风雨，玉兔捣药济苍生",
    judgment: "意志坚定，从一而终，宜深耕专业领域",
  },
  "壬辰": {
    index: 29, naYin: "长流水",
    personality: ["胸怀宽广", "志向高远"],
    careerFit: ["国际贸易", "海洋科学", "外交官"],
    marriageRef: "配丁酉，水金相生",
    poem: "江河奔流归大海，龙腾九霄布甘霖",
    judgment: "格局宏大，志向不凡，一生漂泊但终有所成",
  },
  "癸巳": {
    index: 30, naYin: "长流水",
    personality: ["机敏变通", "智计百出"],
    careerFit: ["市场营销", "金融投资", "战略咨询"],
    marriageRef: "配丙申，水金相涵",
    poem: "川流不息汇百川，灵蛇盘踞守灵珠",
    judgment: "智力超群，应变能力强，注意诚信为本",
  },
  "甲午": {
    index: 31, naYin: "沙中金",
    personality: ["朴实无华", "内藏锦绣"],
    careerFit: ["矿产开发", "珠宝加工", "投资理财"],
    marriageRef: "配己未，金土相生",
    poem: "金沙淘炼见真金，天马行云展宏图",
    judgment: "大器晚成之命，早年磨砺中年后发迹",
  },
  "乙未": {
    index: 32, naYin: "沙中金",
    personality: ["谦逊低调", "厚积薄发"],
    careerFit: ["地质研究", "文物保护", "收藏投资"],
    marriageRef: "配庚午，金火相制",
    poem: "金藏沙底待潮涌，吉羊衔珠报佳音",
    judgment: "不鸣则已，一鸣惊人，贵在持之以恒",
  },
  "丙申": {
    index: 33, naYin: "山下火",
    personality: ["热情大方", "乐于助人"],
    careerFit: ["餐饮管理", "旅游服务", "社区工作"],
    marriageRef: "配辛巳，火金相克",
    poem: "星火燎原起微末，金猴攀峰摘星辰",
    judgment: "出身平凡而志气高，得众人相助可成事",
  },
  "丁酉": {
    index: 34, naYin: "山下火",
    personality: ["开朗外向", "善解人意"],
    careerFit: ["演艺事业", "酒店管理", "公益组织"],
    marriageRef: "配壬辰，火水未济",
    poem: "炉火映霞染天际，金鸡唱晓唤黎明",
    judgment: "人缘极佳，贵人运旺，宜从事与人打交道工作",
  },
  "戊戌": {
    index: 35, naYin: "平地木",
    personality: ["平实稳重", "宽厚仁爱"],
    careerFit: ["林业管理", "生态保护", "社区治理"],
    marriageRef: "配癸卯，木木比和",
    poem: "平林漠漠烟如织，忠犬守田护禾苗",
    judgment: "一生平顺安稳，宜守家业，不宜远行求财",
  },
  "己亥": {
    index: 36, naYin: "平地木",
    personality: ["随和宽容", "乐天知命"],
    careerFit: ["休闲农业", "养生保健", "社会工作"],
    marriageRef: "配甲寅，木水相生",
    poem: "绿野苍翠接天碧，福猪拱门聚百祥",
    judgment: "知足常乐，福寿双全，适合稳定型职业",
  },
  "庚子": {
    index: 37, naYin: "壁上土",
    personality: ["聪慧灵秀", "志存高远"],
    careerFit: ["建筑设计", "文化创意", "学术教育"],
    marriageRef: "配乙丑，土金相生",
    poem: "画壁生辉成妙景，灵鼠运财入华堂",
    judgment: "才华出众但根基未稳，宜先夯实基础后谋发展",
  },
  "辛丑": {
    index: 38, naYin: "壁上土",
    personality: ["勤恳踏实", "坚韧不拔"],
    careerFit: ["土木工程", "考古研究", "农业技术"],
    marriageRef: "配甲子，土金相涵",
    poem: "墙基稳固擎广厦，勤牛奋力耕福田",
    judgment: "勤能补拙，稳步发展，中年后家业渐丰",
  },
  "壬寅": {
    index: 39, naYin: "金箔金",
    personality: ["华贵雍容", "品味高雅"],
    careerFit: ["奢侈品管理", "艺术策展", "高端服务"],
    marriageRef: "配丁卯，金火相制",
    poem: "金玉满堂华光耀，虎踞高岗纳祥云",
    judgment: "一生追求精致生活，财运佳但需防虚荣",
  },
  "癸卯": {
    index: 40, naYin: "金箔金",
    personality: ["温文尔雅", "才华横溢"],
    careerFit: ["珠宝设计", "艺术品投资", "时尚产业"],
    marriageRef: "配丙寅，金火相煅",
    poem: "薄金焕彩耀人目，玉兔呈祥送福来",
    judgment: "才貌双全，善包装自我，注意表里如一",
  },
  "甲辰": {
    index: 41, naYin: "覆灯火",
    personality: ["仁爱明理", "胸怀天下"],
    careerFit: ["教育事业", "公益慈善", "文化传播"],
    marriageRef: "配己酉，火土相生",
    poem: "灯火辉煌照暗夜，龙翔九天布祥云",
    judgment: "大爱之心，普济众生，宜从事社会服务事业",
  },
  "乙巳": {
    index: 42, naYin: "覆灯火",
    personality: ["温和聪慧", "善解人意"],
    careerFit: ["心理咨询", "教育培训", "艺术创作"],
    marriageRef: "配庚辰，火金相制",
    poem: "烛影摇红映西窗，灵蛇吐信探玄机",
    judgment: "心思细腻，感知力强，适合文化和教育领域",
  },
  "丙午": {
    index: 43, naYin: "天河水",
    personality: ["气象万千", "胸怀博大"],
    careerFit: ["航天科技", "气象研究", "影视导演"],
    marriageRef: "配辛未，水火既济",
    poem: "银河倒泻落九天，天马行空任翱翔",
    judgment: "格局宏大，志在四方，注意脚踏实地防虚浮",
  },
  "丁未": {
    index: 44, naYin: "天河水",
    personality: ["柔和智慧", "宽厚慈悲"],
    careerFit: ["水利环保", "医疗卫生", "慈善基金"],
    marriageRef: "配壬午，水木相生",
    poem: "天河映月清辉洒，吉羊跪乳报亲恩",
    judgment: "心地善良，福泽深厚，一生多得贵人提携",
  },
  "戊申": {
    index: 45, naYin: "大驿土",
    personality: ["沉稳踏实", "勤劳苦干"],
    careerFit: ["交通运输", "仓储物流", "基础设施建设"],
    marriageRef: "配癸巳，土水相制",
    poem: "驿路通达连四海，金猴腾云送佳音",
    judgment: "脚踏实地，步步为营，中年后财运亨通",
  },
  "己酉": {
    index: 46, naYin: "大驿土",
    personality: ["稳重干练", "守信重诺"],
    careerFit: ["物流管理", "城市规划", "工程监理"],
    marriageRef: "配甲辰，土火相生",
    poem: "大道通衢八方达，金鸡报晓万象新",
    judgment: "诚信可靠，得众人信任，宜从事管理类工作",
  },
  "庚戌": {
    index: 47, naYin: "钗钏金",
    personality: ["精致华丽", "追求完美"],
    careerFit: ["珠宝设计", "时尚买手", "影视造型"],
    marriageRef: "配乙卯，金木相克",
    poem: "金钗耀目衬红颜，忠犬护主守华堂",
    judgment: "爱美之心甚重，一生追求华丽，注意量入为出",
  },
  "辛亥": {
    index: 48, naYin: "钗钏金",
    personality: ["温婉优雅", "才华内蕴"],
    careerFit: ["首饰工艺", "服装设计", "礼仪培训"],
    marriageRef: "配丙寅，金火相辉",
    poem: "环佩玲珑声清脆，福猪拱门送财来",
    judgment: "气质高雅，品味独到，宜走艺术路线",
  },
  "壬子": {
    index: 49, naYin: "桑柘木",
    personality: ["勤劳朴实", "有奉献精神"],
    careerFit: ["纺织工业", "农业科技", "生态环保"],
    marriageRef: "配丁丑，木土相安",
    poem: "桑柘成荫蚕丝吐，灵鼠衔穗庆丰年",
    judgment: "默默耕耘，无私奉献，终得善果福报",
  },
  "癸丑": {
    index: 50, naYin: "桑柘木",
    personality: ["坚韧不拔", "吃苦耐劳"],
    careerFit: ["林业管理", "中医草药", "手工艺人"],
    marriageRef: "配丙午，木火相生",
    poem: "柘木参天枝叶茂，勤牛奋进拓荒原",
    judgment: "意志顽强，不畏艰辛，晚年得享清福",
  },
  "甲寅": {
    index: 51, naYin: "大溪水",
    personality: ["奔放自由", "勇敢无畏"],
    careerFit: ["探险家", "体育健将", "旅游策划"],
    marriageRef: "配己卯，水木相生",
    poem: "溪水奔流不复回，虎啸生风振山林",
    judgment: "一生追求自由，不宜受约束，宜灵活职业",
  },
  "乙卯": {
    index: 52, naYin: "大溪水",
    personality: ["灵动多变", "适应力强"],
    careerFit: ["媒体记者", "市场营销", "物流管理"],
    marriageRef: "配戊寅，水木相涵",
    poem: "春水东流万物生，玉兔欢跃庆升平",
    judgment: "适应环境能力强，一生变动较多但终有成就",
  },
  "丙辰": {
    index: 53, naYin: "沙中土",
    personality: ["敦厚善良", "守信重义"],
    careerFit: ["建筑管理", "陶瓷工艺", "桥梁工程"],
    marriageRef: "配辛酉，土金相生",
    poem: "沙聚成丘擎大厦，龙腾九天布祥云",
    judgment: "一诺千金，得人信任，适合工程类工作",
  },
  "丁巳": {
    index: 54, naYin: "沙中土",
    personality: ["智慧内敛", "稳重有谋"],
    careerFit: ["地质研究", "矿产开发", "投资顾问"],
    marriageRef: "配壬寅，土木相制",
    poem: "泥沙藏金待淘洗，灵蛇盘踞守玄机",
    judgment: "深藏不露，智谋过人，宜做幕后策划工作",
  },
  "戊午": {
    index: 55, naYin: "天上火",
    personality: ["光明正大", "领袖风范"],
    careerFit: ["政治人物", "企业总裁", "宗教领袖"],
    marriageRef: "配癸未，火土相生",
    poem: "烈日当空照四海，天马行空任驰骋",
    judgment: "气度不凡，光芒四射，注意亲民勿高傲",
  },
  "己未": {
    index: 56, naYin: "天上火",
    personality: ["温和慈祥", "宽厚待人"],
    careerFit: ["教育管理", "医疗服务", "社会福利"],
    marriageRef: "配甲午，火土相涵",
    poem: "晚霞映天红似火，吉羊献瑞福绵长",
    judgment: "仁者爱人，晚年福厚，一生行善积德",
  },
  "庚申": {
    index: 57, naYin: "石榴木",
    personality: ["热情奔放", "才华外露"],
    careerFit: ["演艺明星", "舞台设计", "广告创意"],
    marriageRef: "配乙巳，木火相生",
    poem: "榴花似火燃盛夏，金猴献瑞庆丰年",
    judgment: "才华横溢，表现力强，适合舞台演艺事业",
  },
  "辛酉": {
    index: 58, naYin: "石榴木",
    personality: ["精致锐利", "追求卓越"],
    careerFit: ["珠宝设计", "精密制造", "外科医学"],
    marriageRef: "配丙辰，木土相安",
    poem: "金秋硕果枝头挂，金鸡独立展雄姿",
    judgment: "追求极致完美，工匠精神，但过于挑剔易孤独",
  },
  "壬戌": {
    index: 59, naYin: "大海水",
    personality: ["胸怀宽广", "包容万物"],
    careerFit: ["海洋研究", "国际贸易", "外交使节"],
    marriageRef: "配丁未，水土相调",
    poem: "海纳百川容乃大，忠犬护主守家园",
    judgment: "格局宏大，包容心强，一生得众人拥戴",
  },
  "癸亥": {
    index: 60, naYin: "大海水",
    personality: ["智慧深沉", "涵养深厚"],
    careerFit: ["哲学研究", "海洋工程", "国际法务"],
    marriageRef: "配丙寅，水木相生",
    poem: "沧海横流显本色，福猪纳福满乾坤",
    judgment: "历经沧桑有大智慧，晚年福泽绵长",
  },
};

/**
 * 六十甲子详解计算器
 * 输入一个干支对（如"甲子"），返回该甲子的完整分析
 */
export function calculateLiuShiJiaZi(input: Record<string, unknown>): LiuShiJiaZiResult {
  const ganZhi = input.ganZhi as string;

  if (!ganZhi || typeof ganZhi !== "string" || ganZhi.length !== 2) {
    throw new BusinessException(ErrorCode.VALIDATION_ERROR, `无效的干支: ${ganZhi}，请输入两位干支如"甲子"`);
  }

  const entry = JIAZI_DB[ganZhi];
  if (!entry) {
    throw new BusinessException(ErrorCode.VALIDATION_ERROR, `未知干支: ${ganZhi}，请使用有效的六十甲子`);
  }

  const gan = ganZhi[0];
  const zhi = ganZhi[1];

  const ganInfo = getGan(gan);
  const zhiInfo = getZhi(zhi);
  const pref = getPreferences(entry.naYin);
  const nayinWx = NAYIN_ELEMENT[entry.naYin] || "?";

  // 构建 box-drawing 摘要
  const summary = [
    `┌─ 六十甲子详解 ─────────────────`,
    `│ 干支：${ganZhi}（第${entry.index}位） 纳音：${entry.naYin}（${nayinWx}）`,
    `│`,
    `├─ 天干 ────────────────────`,
    `│ ${gan} — ${ganInfo.element} · ${ganInfo.yinYang} — ${ganInfo.meaning}`,
    `├─ 地支 ────────────────────`,
    `│ ${zhi} — ${zhiInfo.element} · 生肖${zhiInfo.animal} — ${zhiInfo.meaning}`,
    `├─ 纳音 ────────────────────`,
    `│ ${entry.naYin} — ${NAYIN_DETAIL[entry.naYin]}`,
    `│`,
    `├─ 性格特征 ──────────────────`,
    `│ ${entry.personality.join(" · ")}`,
    `├─ 事业方向 ──────────────────`,
    `│ ${entry.careerFit.join(" / ")}`,
    `│ 喜用行业：${pref.suitable.join("、")}`,
    `│ 忌入行业：${pref.avoid.join("、")}`,
    `├─ 婚姻参考 ──────────────────`,
    `│ ${entry.marriageRef}`,
    `│`,
    `├─ 诗诀 ────────────────────`,
    `│ ${entry.poem}`,
    `├─ 命理断语 ──────────────────`,
    `│ ${entry.judgment}`,
    `│`,
    `├─ 古籍出处 ──────────────────`,
    `│ 《三命通会·卷三》—— 明·万民英，六十甲子纳音取象最详备`,
    `│ 《五行大义》—— 隋·萧吉，论六十甲子配五行`,
    `│ 《渊海子平》—— 宋·徐大升，论甲子纳音`,
    `│ 《协纪辨方书》—— 清·允禄等，六十甲子择日核心参考`,
    `│ 六十甲子为干支纪年/纪月/纪日/纪时之基础，`,
    `│ 纳音五行取象于律吕相生，乃五运六气之根本。`,
    `│`,
    `└─ 命理提示 ──────────────────`,
    `   甲子配卦各有不同，宜结合四柱全局论断。`,
    `   纳音为先天之象，正五行为后天之质，二者并用方得全貌。`,
  ].join("\n");

  return {
    ganZhi,
    index: entry.index,
    naYin: entry.naYin,
    naYinDetail: NAYIN_DETAIL[entry.naYin],
    gan: ganInfo,
    zhi: zhiInfo,
    personality: entry.personality,
    preferences: pref,
    careerFit: entry.careerFit,
    marriageRef: entry.marriageRef,
    poem: entry.poem,
    judgment: entry.judgment,
    summary,
  } as LiuShiJiaZiResult & { summary: string };
}
