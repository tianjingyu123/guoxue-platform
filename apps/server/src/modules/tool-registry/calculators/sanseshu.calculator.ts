// ── 三世书计算引擎 ──
// 以出生年月日时推算前生、今生、来世因果
// 理论来源：
//   《三世因果经》— 佛教三世因果观
//   《六十甲子纳音》— 年柱纳音定前世根基
import type { SanSeShuInput, SanSeShuResult } from "@guoxue/shared";
import { Solar } from "lunar-javascript";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

const SHENG_XIAO = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

// 六十甲子纳音表
const NA_YIN_60: Record<string, string> = {
  "甲子": "海中金", "乙丑": "海中金", "丙寅": "炉中火", "丁卯": "炉中火",
  "戊辰": "大林木", "己巳": "大林木", "庚午": "路旁土", "辛未": "路旁土",
  "壬申": "剑锋金", "癸酉": "剑锋金", "甲戌": "山头火", "乙亥": "山头火",
  "丙子": "涧下水", "丁丑": "涧下水", "戊寅": "城头土", "己卯": "城头土",
  "庚辰": "白蜡金", "辛巳": "白蜡金", "壬午": "杨柳木", "癸未": "杨柳木",
  "甲申": "泉中水", "乙酉": "泉中水", "丙戌": "屋上土", "丁亥": "屋上土",
  "戊子": "霹雳火", "己丑": "霹雳火", "庚寅": "松柏木", "辛卯": "松柏木",
  "壬辰": "长流水", "癸巳": "长流水", "甲午": "沙中金", "乙未": "沙中金",
  "丙申": "山下火", "丁酉": "山下火", "戊戌": "平地木", "己亥": "平地木",
  "庚子": "壁上土", "辛丑": "壁上土", "壬寅": "金箔金", "癸卯": "金箔金",
  "甲辰": "覆灯火", "乙巳": "覆灯火", "丙午": "天河水", "丁未": "天河水",
  "戊申": "大驿土", "己酉": "大驿土", "庚戌": "钗钏金", "辛亥": "钗钏金",
  "壬子": "桑柘木", "癸丑": "桑柘木", "甲寅": "大溪水", "乙卯": "大溪水",
  "丙辰": "沙中土", "丁巳": "沙中土", "戊午": "天上火", "己未": "天上火",
  "庚申": "石榴木", "辛酉": "石榴木", "壬戌": "大海水", "癸亥": "大海水",
};

// 纳音五行提取
function getNaYinWuxing(naYin: string): string {
  return naYin.slice(-1);
}

// 二十八宿（本命星宿查询用）
const XING_XIU_LIST = [
  "角木蛟", "亢金龙", "氐土貉", "房日兔", "心月狐", "尾火虎", "箕水豹",
  "斗木獬", "牛金牛", "女土蝠", "虚日鼠", "危月燕", "室火猪", "壁水貐",
  "奎木狼", "娄金狗", "胃土雉", "昴日鸡", "毕月乌", "觜火猴", "参水猿",
  "井木犴", "鬼金羊", "柳土獐", "星日马", "张月鹿", "翼火蛇", "轸水蚓",
];

// ══ 前生系统 ══
// 以年柱纳音五行定前世来处的质量，时柱定具体业力类型
const QIAN_SHI_LAI_CHU: Record<string, { from: string; desc: string }> = {
  "金": { from: "天道/修罗道", desc: "前世从天道或修罗道转生而来，福报深厚但尚有争强好胜之习气" },
  "水": { from: "天道/人道", desc: "前世从天界或人间善道转生，禀赋聪慧、心地清净" },
  "木": { from: "人道/天道", desc: "前世从人道善终转生，心地仁慈、乐善好施" },
  "火": { from: "人道/修罗道", desc: "前世从人间或修罗道转生，性急刚烈但心地光明" },
  "土": { from: "人道/畜生道", desc: "前世从人间或畜道转生，朴实敦厚，修行福德而来" },
};

// 前生业力类型（按时辰地支）
const YE_LI_TYPES: Record<string, { yeLi: string; influence: string; xiuXing: string }> = {
  "子": { yeLi: "口业（妄语/两舌）", influence: "今世须特别注意口德，慎言慎行", xiuXing: "修口业清净，常诵真言" },
  "丑": { yeLi: "意业（贪嗔痴）", influence: "今世宜修心养性，断除贪嗔痴慢疑", xiuXing: "修禅定力，观照内心念头" },
  "寅": { yeLi: "身业（杀生/伤害）", influence: "今世宜戒杀护生，多行放生积德", xiuXing: "持不杀生戒，修慈悲心" },
  "卯": { yeLi: "盗业（偷盗/侵占）", influence: "今世应正直无私，多行布施消业", xiuXing: "修布施波罗蜜，广行财法二施" },
  "辰": { yeLi: "淫业（邪淫/妄情）", influence: "今世宜守戒律，维护婚姻家庭和谐", xiuXing: "修清净梵行，远离邪淫" },
  "巳": { yeLi: "嗔业（愤怒/嫉妒）", influence: "今世宜修忍辱，化解恩怨情仇", xiuXing: "修忍辱波罗蜜，以慈悲化嗔怒" },
  "午": { yeLi: "慢业（傲慢/歧视）", influence: "今世宜谦虚恭敬，平等对待一切众生", xiuXing: "修谦卑心，礼敬诸佛众生" },
  "未": { yeLi: "疑业（猜疑/不信因果）", influence: "今世应深信因果，不谤正法", xiuXing: "深入经藏，坚固道心信念" },
  "申": { yeLi: "杀业（间接/教他杀）", influence: "今世宜护生放生，素食为佳", xiuXing: "修慈悲喜舍四无量心" },
  "酉": { yeLi: "酒业（酗酒/迷乱）", influence: "今世宜节制饮酒，保持清醒理智", xiuXing: "持不饮酒戒，守护正念" },
  "戌": { yeLi: "诳业（欺诈/背信）", influence: "今世当诚信待人，言而有信", xiuXing: "修诚实语，不欺不诳" },
  "亥": { yeLi: "痴业（愚痴/无明）", influence: "今世应勤学多闻，开启智慧之门", xiuXing: "修般若智慧，破除无明" },
};

// 前生属相（按纳音五行+年支组合）
function getPastShengXiao(naYinWx: string, yearZhi: string): string {
  const wxAnimals: Record<string, string[]> = {
    "金": ["猴", "鸡"], "水": ["鼠", "猪"], "木": ["虎", "兔"],
    "火": ["蛇", "马"], "土": ["牛", "龙", "羊", "狗"],
  };
  const pool = wxAnimals[naYinWx] || SHENG_XIAO;
  const zhiIdx = DI_ZHI.indexOf(yearZhi);
  return pool[zhiIdx % pool.length];
}

// ══ 今生系统 ══
// 十二长生运程：长生→沐浴→冠带→临官→帝旺→衰→病→死→墓→绝→胎→养
// 以日柱天干在日支的状态判断

// 十二长生在各地支的状态（天干→长生位）
const CHANG_SHENG_START: Record<string, string> = {
  "甲": "亥", "乙": "午", "丙": "寅", "丁": "酉", "戊": "寅",
  "己": "酉", "庚": "巳", "辛": "子", "壬": "申", "癸": "卯",
};

const SHENG_CYCLE = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"];

function getGrowthStage(dayGan: string, dayZhi: string): { stage: string; stageIdx: number } {
  const startZhi = CHANG_SHENG_START[dayGan] || "寅";
  const startIdx = DI_ZHI.indexOf(startZhi);
  const dayIdx = DI_ZHI.indexOf(dayZhi);
  const offset = (dayIdx - startIdx + 12) % 12;
  return { stage: SHENG_CYCLE[offset], stageIdx: offset };
}

// 早年运（1-20岁·胎/养/长生/沐浴阶段影响）— 基于年柱纳音
const ZAO_NIAN_MAP: Record<string, string[]> = {
  "海中金": ["早年得祖荫庇护，家境殷实，受良好启蒙教育", "少年聪颖，长辈宠爱有加", "幼年生活环境优越，才艺培养得当"],
  "炉中火": ["少年热情洋溢，精力充沛，学业出众", "早年即显露才华，师长赞许有加", "幼年活泼好动，创造力丰富"],
  "大林木": ["少年稳重踏实，勤学不辍，根基扎实", "早年如春木初生，茁壮成长", "幼年生活环境自然，身体素质佳"],
  "路旁土": ["早年平实无华，一步一个脚印打好基础", "少年勤恳耐劳，受长辈信任", "幼年踏实稳重，不急不躁"],
  "剑锋金": ["少年锐气十足，锋芒初露，学业拔尖", "早年即展现领导才能，同学拥护", "幼年好胜心强，凡事力争上游"],
  "山头火": ["早年热情奔放，但需引导收敛锋芒", "少年时期多彩多姿，社交能力出众", "幼年精力旺盛，宜引导至正途"],
  "涧下水": ["早年聪慧灵动，学什么都快", "少年如水般适应力强，环境变化中游刃有余", "幼年心思细腻，善解人意"],
  "城头土": ["早年环境稳固，家庭给予坚实后盾", "少年稳重可靠，责任心强", "幼年较为保守，但基础扎实"],
  "白蜡金": ["早年细致精进，做事追求完美", "少年时期安静内敛，专注力强", "幼年好学善思，启蒙较同龄人早"],
  "杨柳木": ["早年如杨柳依依，性情温柔和顺", "少年时期人缘极佳，朋友众多", "幼年环境舒适，成长自然顺利"],
  "泉中水": ["早年如泉水初涌，才艺渐渐显露", "少年聪颖但不张扬，厚积薄发", "幼年早慧，但需防聪明反被聪明误"],
  "屋上土": ["早年安稳如山，家庭后盾坚实", "少年踏实稳重，深得信赖", "幼年性格内敛，不喜出风头"],
};

// 中年运（21-40岁·临官/帝旺阶段）— 基于日柱纳音力量
const ZHONG_NIAN_MAP: Record<string, string[]> = {
  "金": ["中年得志，事业蒸蒸日上，财运亨通", "中年如金之锐利，事业开拓有成，名利双收", "中年稳重坚定，以诚信立业，广结商缘"],
  "水": ["中年灵活应变，事业多元化发展，财源广进", "中年如江河奔流，运势通达，贵人相助", "中年智慧圆融，以柔克刚，化解危机"],
  "木": ["中年如大树参天，事业根基稳固，稳步向上", "中年厚积薄发，事业获得重大突破", "中年以仁德服人，事业与人脉共同成长"],
  "火": ["中年事业如火如荼，蒸蒸日上，声名远播", "中年精力充沛，开创全新局面，成就斐然", "中年以热情感染他人，带领团队创造佳绩"],
  "土": ["中年稳扎稳打，事业如日中天，根基稳固", "中年诚信经营，赢得市场信任，财富积累", "中年乐于分享，团队稳固，事业后继有人"],
};

// 晚年运（41岁+·衰/病/死/墓阶段）— 基于年柱纳音+时柱
const WAN_NIAN_MAP: Record<string, string[]> = {
  "金": ["晚景荣华，子孙满堂，福寿双全", "晚年德高望重，受人敬仰，尽享天伦", "晚年归隐清净，安享福报"],
  "水": ["晚年心境如水，豁达通透，颐养天年", "晚年安享清福，与世无争，得享高寿", "晚年智慧通达，阅历丰富，指导后辈"],
  "木": ["晚年如古木参天，德泽后世，儿孙成才", "晚景如秋林之静美，回想一生无憾", "晚年归隐田园，淡泊名利，自得其乐"],
  "火": ["晚年如夕阳红霞，光彩依旧，精神矍铄", "晚年热心公益，以余热温暖他人", "晚年儿孙绕膝，热闹温馨"],
  "土": ["晚年根基深厚，家业兴旺，四世同堂", "晚年心境平和，以宽容待人，广结善缘", "晚年身体健康，老当益壮，精神饱满"],
};

// 财运 — 基于日柱纳音五行
const CAI_YUN_MAP: Record<string, string[]> = {
  "金": ["财帛丰足，正财运旺，宜置产业固财", "财星高照，偏财运亦佳，但须防小人", "中晚年财运方旺，早年宜守不宜攻"],
  "水": ["财运如流水，善理财方能汇聚成江河", "财源通达四方，收入多元，善于变现", "财运起伏较大，宜分散投资降低风险"],
  "木": ["财运稳步增长，如树木般逐年累积", "正财运佳，宜长期投资，不贪快钱", "财富根深叶茂，能守能传，福及子孙"],
  "火": ["财运来得快去得也快，须善加管理", "偏财运佳，适合创新型投资理财", "财运旺但须防冲动消费，量入为出"],
  "土": ["财运稳固，不动产投资运佳", "诚信经营带来稳定财富，不贪横财", "财库丰厚，老来不愁吃穿"],
};

// 婚姻 — 基于日支与年支关系
const HUN_YIN_MAP: Record<string, string[]> = {
  "六合": ["婚姻美满，夫妻志同道合，白头偕老", "天作之合，夫妻相互成就，家庭兴旺", "缘定三生，婚姻和谐，互相扶持"],
  "三合": ["婚姻和睦，彼此尊重包容，感情稳定", "夫妻同心，事业家庭双丰收", "性格互补，各取所长，婚姻美满"],
  "冲": ["早年婚姻或有波折，中年后感情稳定", "晚婚为佳，婚姻宜迟不宜早", "夫妻间需多沟通理解，避开意气之争"],
  "害": ["婚姻中宜多包容，避开口舌之争", "夫妻相处需用心经营，多表达爱意", "宜配年长者，可得照拂，婚姻顺遂"],
  "刑": ["桃花较多，宜慎重择偶，避免感情纠葛", "婚姻需要双方共同努力，坦诚相待", "中年后感情才趋稳定，宜耐心经营"],
  "平和": ["婚姻平淡是真，虽不热烈但长久稳固", "夫妻相敬如宾，细水长流的幸福", "婚姻顺其自然，不强求反而和美"],
};

// 子女运 — 基于时柱地支
const ZI_NV_MAP: Record<string, { ziNv: string; desc: string }> = {
  "子": { ziNv: "子女缘佳，儿女双全之象，皆有出息", desc: "子时生人，子女聪慧灵动" },
  "丑": { ziNv: "先开花后结果，子女虽少但个个出众", desc: "丑时生人，子女踏实稳重" },
  "寅": { ziNv: "子女志气高昂，各有所成，光耀门楣", desc: "寅时生人，子女志向远大" },
  "卯": { ziNv: "子女缘深厚，儿孙满堂天伦之乐", desc: "卯时生人，子女仁慈善良" },
  "辰": { ziNv: "晚年得子女福，儿女皆成栋梁之才", desc: "辰时生人，子女成龙成凤" },
  "巳": { ziNv: "子女独立自主，虽不常伴但成就斐然", desc: "巳时生人，子女热情有才" },
  "午": { ziNv: "子女光明磊落，正直为人，受人尊重", desc: "午时生人，子女气度不凡" },
  "未": { ziNv: "子女温厚孝顺，晚年承欢膝下", desc: "未时生人，子女敦厚有福" },
  "申": { ziNv: "子女天资聪颖，学业事业皆出众", desc: "申时生人，子女机敏过人" },
  "酉": { ziNv: "子女精干务实，各有专长，事业有成", desc: "酉时生人，子女精致能干" },
  "戌": { ziNv: "子女忠厚可靠，家风纯正，代代兴旺", desc: "戌时生人，子女忠诚可靠" },
  "亥": { ziNv: "子女福气深厚，一生顺遂少波折", desc: "亥时生人，子女福泽绵长" },
};

// 寿元 — 基于日柱十二长生阶段
const SHOU_YUAN_MAP: Record<string, string> = {
  "长生": "根基深厚，享寿八旬以上，身心康泰",
  "沐浴": "体质易受环境影响，注意养生可享七旬",
  "冠带": "保养得宜，享寿八旬，晚年安康",
  "临官": "精力充沛，寿元七旬有余，晚景清健",
  "帝旺": "生命力旺盛，体质上佳，可享九旬高寿",
  "衰": "中年后注意保养，寿元六旬以上",
  "病": "先天体质偏弱，注意调养可享六旬以上",
  "死": "寿元中等，惜福积德可延年益寿",
  "墓": "晚年宜静养，顺其自然可享天年",
  "绝": "积德行善可延寿元，宜多行放生之善",
  "胎": "如婴儿般需要呵护，养生得当可享高寿",
  "养": "后天保养至关重要，调养适宜延年益寿",
};

// ══ 来世系统 ══
// 以来世归属：基于今生善恶业力综合判断
// 善因子：日柱天干为阳干 + 时柱为吉神
// 恶因子：日柱被冲克 + 纳音五行受制

const LAI_SHI_QU_XIANG: { quXiang: string; level: number; desc: string }[] = [
  { quXiang: "净土极乐", level: 5, desc: "今生若能一心念佛，积功累德，来世必生净土" },
  { quXiang: "天道长寿", level: 4, desc: "乐善好施，来世当生天道，享长寿福报" },
  { quXiang: "人道官贵", level: 3, desc: "修五戒十善，来世生人道中富贵之家" },
  { quXiang: "人间富贵", level: 2, desc: "积德行善，来世享人间富贵荣华" },
  { quXiang: "人道清贵", level: 1, desc: "安分守己，来世生人道清贵之家" },
  { quXiang: "人道平民", level: 0, desc: "善恶参半，来世仍返人道平凡之家" },
];

const LAI_SHI_SHENG_XIAO: Record<string, string> = {
  "净土极乐": "龙", "天道长寿": "鹤", "人道官贵": "马",
  "人间富贵": "猪", "人道清贵": "兔", "人道平民": "牛",
};

const JI_DE_ADVICE: Record<string, string> = {
  "净土极乐": "信愿持名，一心念佛，求生净土",
  "天道长寿": "修十善业，济人利物，护生放生",
  "人道官贵": "勤学修德，忠孝节义，积功累德",
  "人间富贵": "财施法施，利益众生，知恩图报",
  "人道清贵": "读书明理，著书立说，教化世人",
  "人道平民": "安分守己，修善积德，广结善缘",
};

// 辅助函数：判断地支关系
function getDZRelation(dz1: string, dz2: string): string {
  const LIU_HE: Record<string, string> = { "子": "丑", "丑": "子", "寅": "亥", "亥": "寅", "卯": "戌", "戌": "卯", "辰": "酉", "酉": "辰", "巳": "申", "申": "巳", "午": "未", "未": "午" };
  const CHONG: Record<string, string> = { "子": "午", "午": "子", "丑": "未", "未": "丑", "寅": "申", "申": "寅", "卯": "酉", "酉": "卯", "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳" };
  const HAI: Record<string, string> = { "子": "未", "未": "子", "丑": "午", "午": "丑", "寅": "巳", "巳": "寅", "卯": "辰", "辰": "卯", "申": "亥", "亥": "申", "酉": "戌", "戌": "酉" };
  const XING: Record<string, string[]> = { "子": ["卯"], "卯": ["子"], "寅": ["巳","申"], "巳": ["寅","申"], "申": ["寅","巳"], "丑": ["戌"], "戌": ["未"], "未": ["丑"], "辰": ["辰"], "午": ["午"], "酉": ["酉"], "亥": ["亥"] };

  if (LIU_HE[dz1] === dz2) return "六合";
  if (CHONG[dz1] === dz2) return "冲";
  if (HAI[dz1] === dz2) return "害";
  if (XING[dz1]?.includes(dz2)) return "刑";
  // 三合检查
  const SAN_HE: Record<string, string[]> = { "申": ["子","辰"], "子": ["申","辰"], "辰": ["申","子"], "巳": ["酉","丑"], "酉": ["巳","丑"], "丑": ["巳","酉"], "寅": ["午","戌"], "午": ["寅","戌"], "戌": ["寅","午"], "亥": ["卯","未"], "卯": ["亥","未"], "未": ["亥","卯"] };
  if (SAN_HE[dz1]?.includes(dz2)) return "三合";
  return "平和";
}

// 随机种子函数替换为纳音确定性索引
function getNayinIndex(naYin: string, offset: number): number {
  let hash = 0;
  for (let i = 0; i < naYin.length; i++) hash = (hash * 31 + naYin.charCodeAt(i)) & 0x7fffffff;
  return (hash + offset) % 3; // 每组3条，纳音决定取哪条
}

export function calculateSanSeShu(input: Record<string, unknown>): SanSeShuResult {
  const { year, month, day, hourZhi, gender } = input as unknown as SanSeShuInput;
  if (!year || !month || !day) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "请提供完整的出生年月日");

  const h = hourZhi || "子";
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();

  // 获取真实的六十甲子柱
  const yearGanZhi = lunar.getYearInGanZhi(); // 年柱干支
  const dayGan = lunar.getDayGan();             // 日干
  const dayZhi = lunar.getDayZhi();             // 日支

  // 纳音
  const yearNaYin = NA_YIN_60[yearGanZhi] || "大林木";
  const naYinWx = getNaYinWuxing(yearNaYin);

  // ══ 前生 ══
  const qianShi = QIAN_SHI_LAI_CHU[naYinWx] || QIAN_SHI_LAI_CHU["土"];
  const yeLiInfo = YE_LI_TYPES[h] || YE_LI_TYPES["子"];
  const pastSx = getPastShengXiao(naYinWx, lunar.getYearZhi());

  const past = {
    shengXiao: pastSx,
    from: qianShi.from,
    xiuXing: yeLiInfo.xiuXing,
    yeLi: yeLiInfo.yeLi,
    influence: yeLiInfo.influence,
  };

  // ══ 今生 ══
  // 本命星宿：按日柱推二十八宿值日
  const xiuIdx = ((day - 1) % 28);
  const xingXiu = XING_XIU_LIST[xiuIdx];

  // 日柱十二长生
  const growth = getGrowthStage(dayGan, dayZhi);

  // 一生总评
  const zongPingArr: Record<string, string> = {
    "长生": "命格清奇，根基深厚，一生福禄随行，吉人天相",
    "沐浴": "性情风流，一生多变化起伏，晚年渐趋平稳",
    "冠带": "少年得志，一路顺畅，中年后事业腾达",
    "临官": "官运亨通，事业顺遂，德才兼备之命",
    "帝旺": "一生荣华，富贵双全，但防骄奢致败",
    "衰": "中年后方能发迹，先苦后甜之命",
    "病": "一生多波折，然天无绝人之路，终可安泰",
    "死": "性格刚强，命运多舛，然脊梁正直不弯",
    "墓": "命格沉稳，积蓄丰厚，晚年享福之命",
    "绝": "一生大起大落，绝处总能逢生，坚韧不拔",
    "胎": "如婴儿待哺，需贵人扶持方能成就事业",
    "养": "早年平稳积累，中年后渐入佳境，稳中求进",
  };

  // 各运：基于纳音+十二长生 确定性选择
  const zaoIdx = getNayinIndex(yearNaYin, 0);
  const zhongIdx = getNayinIndex(yearNaYin, 1);
  const wanIdx = getNayinIndex(yearNaYin, 2);

  const zaoNianPool = ZAO_NIAN_MAP[yearNaYin] || ZAO_NIAN_MAP["大林木"];
  const zhongNianPool = ZHONG_NIAN_MAP[naYinWx] || ZHONG_NIAN_MAP["木"];
  const wanNianPool = WAN_NIAN_MAP[naYinWx] || WAN_NIAN_MAP["木"];
  const caiYunPool = CAI_YUN_MAP[naYinWx] || CAI_YUN_MAP["土"];

  // 婚姻：基于年支与日支关系
  const hunYinRelation = getDZRelation(lunar.getYearZhi(), dayZhi);
  const hunYinPool = HUN_YIN_MAP[hunYinRelation] || HUN_YIN_MAP["平和"];
  // 婚姻索引：基于年支+日支的纳音五行关系确定性选择
  const zhiOrder = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  const hunYinIdx = (zhiOrder.indexOf(lunar.getYearZhi()) + zhiOrder.indexOf(dayZhi) * 2) % hunYinPool.length;

  // 子女
  const ziNvInfo = ZI_NV_MAP[h] || ZI_NV_MAP["子"];

  // 寿元
  const shouYuan = SHOU_YUAN_MAP[growth.stage] || "享寿七旬有余，积善可以延年";

  const present = {
    xingXiu,
    zongPing: zongPingArr[growth.stage] || "平生安泰，性情温和，人缘极佳",
    zaoNian: zaoNianPool[zaoIdx],
    zhongNian: zhongNianPool[zhongIdx],
    wanNian: wanNianPool[wanIdx],
    caiYun: caiYunPool[zhongIdx],
    hunYin: hunYinPool[hunYinIdx],
    ziNv: ziNvInfo.ziNv,
    shouYuan,
  };

  // ══ 来世 ══
  // 来世等级：基于日柱天干+地支善恶因素
  const yangGan = ["甲", "丙", "戊", "庚", "壬"].includes(dayGan);
  const liuHe = getDZRelation(dayZhi, lunar.getMonthZhi()) === "六合" || getDZRelation(dayZhi, lunar.getYearZhi()) === "六合";
  const isChong = getDZRelation(dayZhi, lunar.getYearZhi()) === "冲";

  let karmaLevel = 2; // 基准
  if (yangGan) karmaLevel += 1;
  if (liuHe) karmaLevel += 1;
  if (isChong) karmaLevel -= 1;
  karmaLevel = Math.max(0, Math.min(5, karmaLevel));

  const laiShi = LAI_SHI_QU_XIANG[karmaLevel];
  const future = {
    quXiang: laiShi.quXiang,
    shengXiao: LAI_SHI_SHENG_XIAO[laiShi.quXiang] || "牛",
    yingXiu: laiShi.desc,
    jiDe: JI_DE_ADVICE[laiShi.quXiang] || "诸恶莫作，众善奉行",
  };

  // ══ 断语与分析 ══
  const advice = [
    `前生来自${past.from}（属${past.shengXiao}），修${past.xiuXing}，有${past.yeLi}未消。${past.influence}。`,
    `今生本命星宿「${xingXiu}」，日柱${dayGan}${dayZhi}处于「${growth.stage}」阶段。${present.zongPing}`,
    `来世将往「${future.quXiang}」，今生应${future.yingXiu}。`,
    `${gender === "男" ? "乾造" : "坤造"}宜守本心、行正道、积善德、广结缘。`,
  ].join("");

  const genderLabel = gender === "男" ? "乾造" : "坤造";
  const summary = [
    "┌─ 三世书 · 因果查询 ──────────────────┐",
    `│ ${genderLabel}：${year}年${month}月${day}日${h}时生`.padEnd(36) + "│",
    `│ 年柱：${yearGanZhi}  纳音：${yearNaYin}（${naYinWx}）`.padEnd(36) + "│",
    "├─ 前生 ────────────────────────────────┤",
    `│ 来处：${past.from}（属${past.shengXiao}）`.padEnd(36) + "│",
    `│ 业力：${past.yeLi}`.padEnd(36) + "│",
    "├─ 今生 ────────────────────────────────┤",
    `│ 星宿：${xingXiu}  运程：${growth.stage}`.padEnd(36) + "│",
    `│ 总评：${present.zongPing.slice(0, 22)}`.padEnd(36) + "│",
    `│ 财运：${present.caiYun.slice(0, 22)}`.padEnd(36) + "│",
    `│ 婚姻：${present.hunYin.slice(0, 22)}`.padEnd(36) + "│",
    "├─ 来世 ────────────────────────────────┤",
    `│ 去向：${future.quXiang}（${future.shengXiao}）`.padEnd(36) + "│",
    `│ 积德：${future.jiDe.slice(0, 24)}`.padEnd(36) + "│",
    "├─ 出处 ────────────────────────────────┤",
    "│ 《三世因果经》《三命通会》《协纪辨方书》│",
    "└────────────────────────────────────────┘",
  ].join("\n");

  const analysis = [
    `三世因果：${gender === "男" ? "乾造" : "坤造"}生于${year}年${month}月${day}日${h}时。`,
    `年柱「${yearGanZhi}」纳音「${yearNaYin}」，五行属${naYinWx}。`,
    ``,
    `【前生】来自${past.from}（属${past.shengXiao}），曾修${past.xiuXing}，`,
    `留有${past.yeLi}之业。${past.influence}。`,
    ``,
    `【今生】本命星宿「${xingXiu}」，日柱${dayGan}${dayZhi}（${growth.stage}）。`,
    `${present.zongPing}`,
    `早年（1-20岁）：${present.zaoNian}。`,
    `中年（21-40岁）：${present.zhongNian}。`,
    `晚年（41岁+）：${present.wanNian}。`,
    `财运：${present.caiYun}。`,
    `婚姻（年日${hunYinRelation}）：${present.hunYin}。`,
    `子女（${h}时）：${present.ziNv}。`,
    `寿元：${present.shouYuan}。`,
    ``,
    `【来世】将往「${future.quXiang}」。`,
    `今生应修：${future.yingXiu}。`,
    `积德建议：${future.jiDe}。`,
    ``,
    `━━ 来源依据 ━━`,
    `年柱纳音参考《六十甲子纳音表》`,
    `日柱十二长生参考《三命通会》`,
    `三世因果框架参考《三世因果经》`,
    `二十八宿参考《协纪辨方书》`,
  ].join("\n");

  return { past, present, future, advice, analysis, summary } as SanSeShuResult & { summary: string };
}
