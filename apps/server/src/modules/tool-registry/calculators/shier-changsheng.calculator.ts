// ── 十二长生运程引擎 ──
// 日干对四柱地支的十二长生状态
// 算法参考：《三命通会·十二长生》《渊海子平·论生旺》《滴天髓·衰旺篇》《五行大义》

import type { ShiErChangShengInput, ShiErChangShengResult } from "@guoxue/shared";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

const GAN_WX: Record<string, string> = {
  "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
  "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
};

const GAN_YIN_YANG: Record<string, "阳" | "阴"> = {
  "甲": "阳", "丙": "阳", "戊": "阳", "庚": "阳", "壬": "阳",
  "乙": "阴", "丁": "阴", "己": "阴", "辛": "阴", "癸": "阴",
};

const YANG_CHANG_SHENG: Record<string, number> = {
  "甲": 11, // 亥
  "丙": 2,  // 寅
  "戊": 2,  // 寅
  "庚": 5,  // 巳
  "壬": 8,  // 申
};

const YIN_CHANG_SHENG: Record<string, number> = {
  "乙": 6,  // 午
  "丁": 9,  // 酉
  "己": 9,  // 酉
  "辛": 0,  // 子
  "癸": 3,  // 卯
};

const ZHI_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const STAGE_NAMES = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"];

// ── 各阶段详细解读（《三命通会》《滴天髓》）──
const STAGE_DETAIL: Record<string, {
  overview: string;
  career: string;
  wealth: string;
  health: string;
  relation: string;
  strategy: string;
  qiLevel: string;
}> = {
  "长生": {
    overview: "如人初生，气机萌发，万物欣欣向荣。长生为十二宫之首，代表新生、开端、希望。命带长生者天性乐观，富创造力，易得贵人提携。",
    career: "事业初创期，宜开拓新领域、学习新技能。适合创业起步或转行入新行业，忌守旧不前。",
    wealth: "财运初起，虽不致大富但来源正派。宜小额投资试水，不宜大举借贷扩张。",
    health: "体质初建，抵抗力尚弱。宜注重养生打基础，婴幼儿及少年期需特别注意养护。",
    relation: "人际关系处于建立期，易结识志同道合之友。婚姻方面，感情纯真如初恋。",
    strategy: "宜积极进取，抓住机遇，不可犹豫观望。忌急于求成，需循序渐进打好根基。",
    qiLevel: "气机初生",
  },
  "沐浴": {
    overview: "如婴儿沐浴，柔弱而敏感。此阶段人情感丰富、审美力强，但心性未定易受诱惑。命带沐浴者多貌美有才艺，惟情绪起伏较大。",
    career: "变动较多，不宜做重大决策。适合创意设计、艺术文化等需要灵感的行业，忌高压竞争性工作。",
    wealth: "花销较大，易为情面或享乐破财。需节制消费欲望，不宜担保借贷。",
    health: "体质偏弱，需防小病缠绵。特别注意皮肤、泌尿系统问题，保持清洁卫生。",
    relation: "桃花旺盛，异性缘佳但感情多波折。已婚者需防烂桃花干扰婚姻，宜修身养性。",
    strategy: "宜内省修身，提高自我认知。忌纵情声色，避免冲动决定终身大事。",
    qiLevel: "气嫩易损",
  },
  "冠带": {
    overview: "如人加冠成年，渐入佳境。此阶段人开始成熟，责任感增强，社会地位逐步提升。命带冠带者仪表堂堂，行事有度。",
    career: "事业上升期，宜争取晋升或扩大业务规模。适合承担更多责任，展现领导才能。",
    wealth: "财运稳步增长，正财为主。适合长期储蓄和稳健投资，不宜投机性操作。",
    health: "体质增强，精力充沛。宜保持运动习惯，注意作息规律防止透支。",
    relation: "社交圈扩大，人脉关系日益重要。婚姻进入稳定期，家庭责任感增强。",
    strategy: "宜乘势而上，巩固已有成果。忌骄傲自满，需持续学习精进。",
    qiLevel: "气渐充盛",
  },
  "临官": {
    overview: "如人入仕为官，事业有成。临官即禄地，是人生黄金时期。命带临官者能力出众，执行力强，做事有魄力。",
    career: "事业高峰期，宜大刀阔斧推进重大项目。适合创业、升职、拓展市场，是建功立业最佳时机。",
    wealth: "财运亨通，正偏财皆旺。宜多元化投资，但需做好风险管控。禄地聚财，储蓄增长迅速。",
    health: "精力旺盛，身体处于最佳状态。但需防过劳透支，注意心脑血管保养。",
    relation: "人际关系达到顶峰，得贵人相助。婚姻美满，家庭和睦，社会地位提升。",
    strategy: "宜大展宏图，把握黄金时期。忌刚愎自用，需兼听则明保持谦逊。",
    qiLevel: "气盛力强",
  },
  "帝旺": {
    overview: "如帝王在位，权力顶峰。帝旺为十二宫最旺之极，万物极盛。命带帝旺者气势如虹，但需防盛极而衰之患。",
    career: "事业达到巅峰，功成名就。宜巩固已有成果，培养接班人，忌盲目扩张或另起炉灶。",
    wealth: "财富达到高点，资产丰厚。宜资产保值配置，适当套现落袋为安，忌加杠杆冒险。",
    health: "精力虽旺但暗藏透支风险。需定期体检，特别注意血压、心脏等顶峰的隐患。",
    relation: "人际网络最广大，但易有小人暗算。婚姻需防强势伤及对方自尊，宜温柔以待。",
    strategy: "宜居安思危，未雨绸缪。物极必反，盛极必衰，需为下行做好准备。忌得意忘形，保持敬畏之心。",
    qiLevel: "气极将衰",
  },
  "衰": {
    overview: "盛极而衰，如日中则昃。此阶段体力精力开始走下坡，但经验智慧正值巅峰。命带衰者需调整心态，以退为进。",
    career: "事业进入平台期或缓慢下行。宜转向管理、咨询、教育等凭经验吃饭的领域，忌继续高消耗竞争。",
    wealth: "财运增长放缓，宜由进攻转防守。适合配置稳健理财产品，逐步减少风险敞口。",
    health: "身体机能开始下降，小毛病增多。需加强锻炼养生，定期体检，防微杜渐。",
    relation: "人际关系趋于稳定，减少无效社交。婚姻进入平淡期，需用心经营保鲜。",
    strategy: "宜养精蓄锐，调整战略方向。忌逆势强为，顺势而为方为上策。",
    qiLevel: "气退力减",
  },
  "病": {
    overview: "如人患病，运势低迷。诸事不顺，阻碍重重。命带病地者多思虑，但此阶段亦是反思沉淀之时。",
    career: "工作压力大，易出错或被问责。宜收敛锋芒低调行事，忌跳槽或承担新项目。",
    wealth: "财运低迷，易有破耗。宜节约开支守住底线，忌任何形式的投资或借贷。",
    health: "体质明显下降，易生病痛。需及时就医不拖延，保持充足睡眠和规律作息。",
    relation: "人际关系紧张，易生误会争执。宜忍让退步，避免正面冲突，待时运好转再议。",
    strategy: "宜静不宜动，守住基本盘。忌强行出击，此时退一步海阔天空。反思沉淀，为复苏做准备。",
    qiLevel: "气衰多滞",
  },
  "死": {
    overview: "气运枯竭，旧物终结。死地并非真死，而是旧阶段的彻底结束，为新阶段蓄力。命带死者有决断力，敢于舍弃。",
    career: "可能面临失业、项目终止等重大变动。宜顺势放手，不恋战不留恋。此非坏事，乃为新生清空场地。",
    wealth: "财务状况可能触底，损失已至极限。宜清算止损，保留实力等待转机。",
    health: "身体处于低谷，旧病可能复发。需静养为主，必要时住院调理，彻底解决老问题。",
    relation: "某些关系可能走到尽头，该放手的就放手。告别错的人，才能遇到对的人。",
    strategy: "宜断舍离，清理包袱轻装上阵。死地之后即是墓库，新生已在孕育。忌悲观绝望，此乃轮回必经阶段。",
    qiLevel: "气尽待生",
  },
  "墓": {
    overview: "入库收藏，如人入墓。墓为收藏之所，能量内敛不显。命带墓者善于积累，有收藏天赋，但有时过于保守内敛。",
    career: "事业处于沉淀积累期，表面平淡但内功增长。宜学习进修、整理资源、培养团队，忌急于表现。",
    wealth: "财富以内蓄为主，适合定期储蓄、购置保值资产。表面不显富但家底厚实。宜长期投资布局。",
    health: "身体恢复缓慢但稳定，需长期调理。适合中医调理、养生保健，不可急功近利。",
    relation: "社交活动减少，更珍惜核心关系。婚姻趋于深沉稳定，感情内敛但持久。",
    strategy: "宜韬光养晦，厚积薄发。忌急躁冒进，此时是充电蓄能的最佳时期。",
    qiLevel: "气藏待发",
  },
  "绝": {
    overview: "气数殆尽，衰极之象。绝地是十二宫最低谷，但也是否极泰来的转折前夕。命带绝者有置之死地而后生的勇气。",
    career: "事业面临最大挑战，可能一无所有。此乃涅槃前夜，宜彻底放弃旧模式，为全新开始做准备。",
    wealth: "财运跌至谷底，可能债台高筑。宜申请破产保护或债务重组，轻装再出发。切忌借新债还旧债。",
    health: "身体极度虚弱，大病初愈或久病未愈。需彻底治疗不拖延，该手术就手术，彻底根除。",
    relation: "孤立无援之感最强烈，但恰是看清真朋友之时。绝地见真情，留下来的都是真心的。",
    strategy: "宜破釜沉舟，置之死地而后生。最大的危机也是最大的转机。忌灰心丧志，绝处逢生只在坚持。",
    qiLevel: "气绝将转",
  },
  "胎": {
    overview: "如母体中胎儿，新机暗中孕育。表面虽无动静，内在正在积蓄力量。命带胎者想象力丰富，善于谋划布局。",
    career: "暗中有新机会孕育，但尚不成熟不宜公开。宜低调筹划、暗中布局，为下一步行动做充分准备。",
    wealth: "财运虽未明显回升但已止跌。可开始做财务规划，不宜大笔投资但可为未来储备。",
    health: "身体开始复苏，虽不明显但趋势向好。宜适当增加营养和温和运动，为全面康复打基础。",
    relation: "新的关系正在萌芽，可能已有缘分在酝酿。保持开放心态，好的缘分即将降临。",
    strategy: "宜运筹帷幄，暗中布局。表面不动声色，暗地积极准备。忌过早暴露意图，胎气未固需保护。",
    qiLevel: "气机暗孕",
  },
  "养": {
    overview: "如婴儿需精心养育，新机渐成但仍脆弱。此阶段形势向好但根基未稳，需持续呵护。命带养者耐性佳，善于培育培养。",
    career: "新局面初步打开，初具规模。宜稳扎稳打巩固成果，不可操之过急。持续投入，耐心等待收获。",
    wealth: "财运开始好转，扭亏为盈。宜制定长期理财计划，逐步恢复投资信心。小步试水，稳健为主。",
    health: "身体基本康复，但免疫力尚弱。坚持锻炼养生，防反复。此为康复关键期不可松懈。",
    relation: "人际关系缓和，友谊正在修复。已婚者感情回暖，未婚者有望遇到良缘。宜用心经营培育。",
    strategy: "宜精耕细作，稳步推进。果实初结仍需呵护，不可急于收割。坚持就是胜利。",
    qiLevel: "气复将盛",
  },
};

// ── 四柱各宫位在不同长生阶段的解读 ──
// 来源：《三命通会·论十二宫分柱》
const PILLAR_INTERPRET: Record<string, Record<string, string>> = {
  "长生": {
    "年柱": "祖上有德，出身良好。幼年得长辈宠爱，成长环境优越。少年时期即显天赋，学业顺利。",
    "月柱": "父母得力，家运昌盛。青少年时期得良好教育培养，奠定一生根基。兄弟姐妹有助力。",
    "日柱": "自身命旺，一生有良好开局。婚姻配偶为良缘佳偶，夫妻恩爱。中年运势持续走高。",
    "时柱": "晚年安逸，子女贤孝有成。老运亨通，可享天伦之乐。儿孙满堂，后嗣兴旺。",
  },
  "沐浴": {
    "年柱": "幼年体质较弱，需精心养护。早年可能经历环境变化或家庭迁徙，适应力是关键。",
    "月柱": "青春期情感丰富，异性缘早现。学业可能因情绪波动受影响，需引导专注。",
    "日柱": "自身多才艺魅力，但感情婚姻易有波折。需防桃花劫影响事业和家庭稳定。",
    "时柱": "晚年情感丰富，但需防因情破财。子女多才但心性不定，需耐心引导。",
  },
  "冠带": {
    "年柱": "少年老成，早熟懂事。学业成绩稳步提升，青少年时期即显领导才能。",
    "月柱": "青年得志，事业起步顺利。得贵人赏识提拔，晋升通道通畅。社交能力日益增强。",
    "日柱": "自身仪表堂堂，社会地位稳固。婚姻体面，配偶有助事业发展。中年运势持续上升。",
    "时柱": "晚年声望达到高峰，受人尊敬。子女成才，事业有成。退休生活充实有尊严。",
  },
  "临官": {
    "年柱": "出身世家或家境殷实。年少得志，早慧过人。少年时期即显过人之处。",
    "月柱": "青年时期事业即达高峰，能力出众。得老板或长辈大力提携，是同龄人中的佼佼者。",
    "日柱": "自身能力极强，事业有成。配偶能干，夫妻比翼双飞。中年是人生最辉煌时期。",
    "时柱": "晚年事业仍旺，退而不休。子女事业有成，光耀门楣。老年威望不减。",
  },
  "帝旺": {
    "年柱": "出身显赫，祖业丰厚。少年得志但需防早熟早衰。青少年时期不可过度消耗。",
    "月柱": "青年时期功成名就，在同辈中一骑绝尘。但高处不胜寒，需防树大招风。",
    "日柱": "自身能力达到顶峰，事业家庭双丰收。但需防盛极而衰，婚姻中不可过于强势。",
    "时柱": "晚年福禄双全，但需注意身体健康。子女极有出息，但亲子关系可能因强势而疏离。",
  },
  "衰": {
    "年柱": "幼年体质偏弱，需细心照料。祖业渐衰，需自身努力打拼。早年环境变化较大。",
    "月柱": "青年时期先盛后衰，事业有上升后遇瓶颈。需及时转型，凭借经验找新方向。",
    "日柱": "中年运势开始下行，体力和精力不如从前。婚姻需重新定位角色，从主导转为配合。",
    "时柱": "晚年宜清静养性，不宜过多操劳。子女各自独立，需适应空巢生活节奏。",
  },
  "病": {
    "年柱": "幼年多病，体质偏弱。早年运势坎坷，需加倍努力方能出头。家庭环境可能较困难。",
    "月柱": "青年时期诸事不顺，事业屡受挫折。需保持耐心，这是磨练心性的必经阶段。",
    "日柱": "中年多事之秋，事业和健康同时出问题。婚姻易因经济或健康问题产生摩擦。",
    "时柱": "晚年需特别注意健康管理，定期体检不可少。子女可能远行或疏于照顾，需提前规划。",
  },
  "死": {
    "年柱": "幼年命运多舛，可能经历重大变故。早年即需独立面对困境，磨练出坚韧性格。",
    "月柱": "青年时期可能经历事业或感情的重大转折，旧格局彻底打破。这是蜕变的阵痛。",
    "日柱": "中年面临人生重大转折点，可能需要换行业、换城市甚至换生活方式。婚姻可能走到尽头或彻底重生。",
    "时柱": "晚年需面对孤独，身边人逐渐减少。但看透世事后反而活得洒脱自在，不再执着。",
  },
  "墓": {
    "年柱": "出身低调，不显山不露水。早年家境可能普通但暗藏底蕴。家学渊源深厚。",
    "月柱": "青年时期默默耕耘，表面无闻但内功日深。名利来得较晚但根基扎实。",
    "日柱": "中年以内敛积蓄为主，低调但家底厚实。婚姻稳定深沉，夫妻共同积累财富。",
    "时柱": "晚年积蓄丰厚，老有所依。子女务实不张扬但有真才实学。老年喜安静独处，自得其乐。",
  },
  "绝": {
    "年柱": "幼年可能经历家庭巨变或颠沛流离。但大难不死必有后福，早年磨砺成就非凡人生。",
    "月柱": "青年时期可能遭遇毁灭性打击，事业感情归零。但涅槃重生后势不可挡。",
    "日柱": "中年面临人生最大危机，事业可能清零。婚姻面临最严峻考验。但挺过去就是全新人生。",
    "时柱": "晚年需面对彻底的告别，但反而获得心灵自由。放下一切执着，活出真正的自我。",
  },
  "胎": {
    "年柱": "母亲怀胎时运势已暗中转变。祖上积德，命中福报暗中酝酿。少年看似平凡但潜力无限。",
    "月柱": "青年时期看似平淡，实则在为将来积蓄能量。学业或事业暗中转型，新方向正在孕育。",
    "日柱": "中年暗藏转机，新的事业或感情机会正在酝酿。不要焦虑表面平静，暴风雨前的宁静最珍贵。",
    "时柱": "晚年孕育新兴趣新事业，开启第二人生。可能老年创业或培养新爱好，活到老学到老。",
  },
  "养": {
    "年柱": "幼年得精心养育，虽非大富大贵但健康快乐成长。童年温馨，为一生心理健康打下基础。",
    "月柱": "青年时期稳步成长，虽不快但有后劲。学业事业逐步积累，每一步都走得扎实。",
    "日柱": "中年婚姻事业都在稳步培育中走向成熟。不急不躁，慢慢来反而走得更远。家庭温暖幸福。",
    "时柱": "晚年儿孙绕膝，享受天伦之乐。培育下一代的成果显现，子女孝顺有成。安享晚年。",
  },
};

// ── 阶段分类 ──
type Phase = "生" | "旺" | "衰" | "养";
function getPhase(stage: number): Phase {
  if (stage <= 1) return "生";      // 长生-沐浴
  if (stage <= 4) return "旺";      // 冠带-帝旺
  if (stage <= 9) return "衰";      // 衰-绝
  return "养";                       // 胎-养
}

function getChangSheng(dayGan: string, zhiIdx: number): { name: string; stage: number } {
  if (YANG_CHANG_SHENG[dayGan] !== undefined) {
    const start = YANG_CHANG_SHENG[dayGan];
    const stage = (zhiIdx - start + 12) % 12;
    return { name: STAGE_NAMES[stage], stage };
  }
  if (YIN_CHANG_SHENG[dayGan] !== undefined) {
    const start = YIN_CHANG_SHENG[dayGan];
    const stage = (start - zhiIdx + 12) % 12;
    return { name: STAGE_NAMES[stage], stage };
  }
  return { name: "未知", stage: -1 };
}

export function calculateShiErChangSheng(input: Record<string, unknown>): ShiErChangShengResult {
  const { dayGan, yearZhi, monthZhi, dayZhi, hourZhi } = input as unknown as ShiErChangShengInput;

  if (!GAN_WX[dayGan]) throw new BusinessException(ErrorCode.VALIDATION_ERROR, `无效日干: ${dayGan}`);

  const yinYang = GAN_YIN_YANG[dayGan];
  const wx = GAN_WX[dayGan];
  const direction = yinYang === "阳" ? "顺行" : "逆行";
  const changShengZhi = yinYang === "阳"
    ? ZHI_LIST[YANG_CHANG_SHENG[dayGan]]
    : ZHI_LIST[YIN_CHANG_SHENG[dayGan]];

  const zhis = [
    { label: "年柱", zhi: yearZhi },
    { label: "月柱", zhi: monthZhi },
    { label: "日柱", zhi: dayZhi },
    { label: "时柱", zhi: hourZhi },
  ];

  const pillars = zhis.map(({ label, zhi }) => {
    const idx = ZHI_LIST.indexOf(zhi);
    if (idx < 0) return { label, zhi, changSheng: "无效", stage: -1, meaning: "" };
    const cs = getChangSheng(dayGan, idx);
    const detail = STAGE_DETAIL[cs.name];
    const pillarNote = PILLAR_INTERPRET[cs.name]?.[label] || "";
    return {
      label,
      zhi,
      changSheng: cs.name,
      stage: cs.stage,
      meaning: `【${cs.name}】${detail.overview} ${pillarNote} 事业：${detail.career} 财运：${detail.wealth} 健康：${detail.health} 人际：${detail.relation} 策略：${detail.strategy}`,
    };
  });

  // 找最佳和最弱宫位
  const sorted = [...pillars].sort((a, b) => a.stage - b.stage);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // 阶段分布统计
  const phaseCount: Record<Phase, number> = { "生": 0, "旺": 0, "衰": 0, "养": 0 };
  const phasePillars: Record<Phase, string[]> = { "生": [], "旺": [], "衰": [], "养": [] };
  for (const p of pillars) {
    if (p.stage >= 0) {
      const ph = getPhase(p.stage);
      phaseCount[ph]++;
      phasePillars[ph].push(p.label);
    }
  }

  // 十二宫完整解读
  const changShengMap = STAGE_NAMES.map((name, stage) => {
    const d = STAGE_DETAIL[name];
    return {
      name,
      stage,
      meaning: `${d.overview}\n事业运：${d.career}\n财运：${d.wealth}\n健康运：${d.health}\n人际关系：${d.relation}\n行动策略：${d.strategy}\n气运状态：${d.qiLevel}`,
    };
  });

  // ── 综合解读 ──
  const bestDetail = STAGE_DETAIL[best.changSheng];
  const worstDetail = STAGE_DETAIL[worst.changSheng];

  let phaseAnalysis = "";
  if (phaseCount["旺"] >= 3) {
    phaseAnalysis = "命局中旺相之宫占多数，日主根基深厚，气势强盛。一生运势总体向上，中年达到巅峰。但需注意盛极必衰之理，旺时防骄，高处防跌。做事宜果断，但需留有回旋余地。";
  } else if (phaseCount["衰"] >= 3) {
    phaseAnalysis = "命局中衰病之宫偏多，日主根基偏弱。一生起伏较大，需经历较多磨砺。但正是这些历练造就非凡韧性。运势虽不平坦但每次低谷后都有反弹。需善用墓库收藏之力，在逆境中积蓄，在顺境中爆发。宜借助五行生扶和贵人力量弥补先天不足。";
  } else if (phaseCount["养"] >= 2) {
    phaseAnalysis = "命局中胎养之宫占两席以上，有生生不息之象。虽表面平淡无大起大落，但暗藏生机。人生运势先抑后扬，越往后越顺。适合长期耕耘型事业，慢工出细活。";
  } else if (phaseCount["生"] >= 2) {
    phaseAnalysis = "命局中长生沐浴之宫较旺，富有开创精神和创造力。适合从事需要灵感和创新的领域。年轻时期即有机会脱颖而出，但需注意根基稳固，不可冒进。";
  } else {
    phaseAnalysis = "命局中各阶段分布较为均衡，人生运势有起有落但整体可控。具备在不同阶段调整策略的智慧，是稳健型命格。";
  }

  // 四柱联动分析
  const stageVals = pillars.map(p => p.stage);
  const trendNote = stageVals[0] <= stageVals[3]
    ? "从年到时长生阶段逐步提升，为先苦后甜之命，晚年运势优于早年。"
    : "从年到时长生阶段逐步衰减，早年运势较旺，晚年需多注意身体保养和财务规划。";

  const analysis = [
    `【日主概况】日干${dayGan}属${yinYang}性${wx}，长生在${changShengZhi}，十二长生${direction}。`,
    `《三命通会》云："${yinYang === "阳" ? "阳干顺行" : "阴干逆行"}，${dayGan}${yinYang === "阳" ? "生于" + changShengZhi + "顺推至各宫" : "子为沐浴逆行至" + changShengZhi + "为长生"}"。`,
    ``,
    `【四柱分析】`,
    `年柱（祖上/幼年）：${best.changSheng === pillars[0].changSheng ? "★最吉宫位★ " : ""}${pillars[0].zhi}在【${pillars[0].changSheng}】— ${bestDetail.overview.substring(0, 40)}...`,
    `月柱（父母/青年）：${best.changSheng === pillars[1].changSheng ? "★最吉宫位★ " : ""}${pillars[1].zhi}在【${pillars[1].changSheng}】— 青年阶段${STAGE_DETAIL[pillars[1].changSheng].career}`,
    `日柱（自身/婚姻）：${best.changSheng === pillars[2].changSheng ? "★最吉宫位★ " : ""}${pillars[2].zhi}在【${pillars[2].changSheng}】— 中年阶段${STAGE_DETAIL[pillars[2].changSheng].career}`,
    `时柱（子女/晚年）：${best.changSheng === pillars[3].changSheng ? "★最吉宫位★ " : ""}${pillars[3].zhi}在【${pillars[3].changSheng}】— 晚年阶段${STAGE_DETAIL[pillars[3].changSheng].career}`,
    ``,
    `【强弱对比】`,
    `最吉宫位：${best.label}（${best.zhi}）在【${best.changSheng}】— ${bestDetail.overview.substring(0, 60)}`,
    `最弱宫位：${worst.label}（${worst.zhi}）在【${worst.changSheng}】— ${worstDetail.overview.substring(0, 60)}`,
    ``,
    `【阶段分布】`,
    `生气阶段（长生/沐浴）：${phaseCount["生"]}柱（${phasePillars["生"].join("、") || "无"}）`,
    `旺气阶段（冠带/临官/帝旺）：${phaseCount["旺"]}柱（${phasePillars["旺"].join("、") || "无"}）`,
    `衰气阶段（衰/病/死/墓/绝）：${phaseCount["衰"]}柱（${phasePillars["衰"].join("、") || "无"}）`,
    `养气阶段（胎/养）：${phaseCount["养"]}柱（${phasePillars["养"].join("、") || "无"}）`,
    ``,
    `【综合判断】`,
    phaseAnalysis,
    trendNote,
    ``,
    `【参考建议】`,
    best.stage <= 3
      ? `日主最吉在${best.label}，${bestDetail.strategy} 旺处宜发挥优势，积极主动。`
      : `日主根基在${best.label}偏弱，${worstDetail.strategy} 弱处宜守不宜攻。`,
    `流年大运流转至${best.zhi}（${best.changSheng}）时运势最佳，宜把握良机；至${worst.zhi}（${worst.changSheng}）时运势低迷，宜保守行事。`,
    ``,
    `—— 参考来源：《三命通会·十二长生》《渊海子平·论生旺》《滴天髓·衰旺篇》`,
  ].join("\n");

  // 构建 box-drawing 摘要
  const phaseLabel: Record<Phase, string> = { "生": "生气", "旺": "旺气", "衰": "衰气", "养": "养气" };
  const summary = [
    `┌─ 十二长生运程 ─────────────────`,
    `│ 日干：${dayGan}（${wx}·${yinYang}） 长生在${changShengZhi} ${direction}`,
    `│`,
    `├─ 四柱长生 ──────────────────`,
    ...pillars.map(p => {
      const marker = p.stage === best.stage ? " ★最吉" : p.stage === worst.stage ? " △最弱" : "";
      const bar = "●".repeat(Math.min(p.stage + 1, 12));
      return `│ ${p.label} ${p.zhi}【${p.changSheng.padEnd(4, " ")}】${bar}${marker}`;
    }),
    `│`,
    `├─ 阶段分布 ──────────────────`,
    ...(Object.keys(phaseCount) as Phase[]).map(ph =>
      `│ ${phaseLabel[ph].padEnd(4, " ")} ${phaseCount[ph]}柱 — ${phasePillars[ph].join("、") || "无"}`
    ),
    `│`,
    `├─ 最吉宫位 ──────────────────`,
    `│ ${best.label}（${best.zhi}）在【${best.changSheng}】`,
    `│ 事业：${bestDetail.career}`,
    `│ 财运：${bestDetail.wealth}`,
    `│ 策略：${bestDetail.strategy}`,
    `│`,
    `├─ 最弱宫位 ──────────────────`,
    `│ ${worst.label}（${worst.zhi}）在【${worst.changSheng}】`,
    `│ ${worstDetail.strategy}`,
    `│`,
    `├─ 综合判断 ──────────────────`,
    `│ ${phaseAnalysis}`,
    `│ ${trendNote}`,
    `│`,
    `├─ 古籍出处 ──────────────────`,
    `│ 《三命通会》—— 明·万民英，论十二长生与宫位配合`,
    `│ 《渊海子平·论生旺》—— 宋·徐大升，十干生旺死绝`,
    `│ 《滴天髓·衰旺篇》—— 清·任铁樵，「能知衰旺之真机，其于三命之奥，思过半矣」`,
    `│ 《五行大义》—— 隋·萧吉，五行寄生十二宫最早系统论述`,
    `│ 十二长生乃五行之气在十二地支中的生命周期——`,
    `│ 长生→沐浴→冠带→临官→帝旺→衰→病→死→墓→绝→胎→养`,
    `│ 阳干顺行阴干逆行，此天地阴阳消长之大道。`,
    `│`,
    `├─ 参考建议 ──────────────────`,
    `│ 流年至${best.zhi}（${best.changSheng}）时运势最佳，宜把握良机。`,
    `│ 流年至${worst.zhi}（${worst.changSheng}）时运势低迷，宜保守行事。`,
    `│`,
    `└─ 命理提示 ──────────────────`,
    `   长生十二宫非孤立论断，须结合五行旺衰、`,
    `   格局喜忌、大运流年综合运用方得全功。`,
    `   「帝旺」虽为极盛，亦是衰之始也——`,
    `   知进退存亡而不失其正者，其唯圣人乎。`,
  ].join("\n");

  return {
    dayGan,
    dayWx: wx,
    yinYang,
    direction,
    pillars,
    changShengMap,
    analysis,
    summary,
  } as ShiErChangShengResult & { summary: string };
}
