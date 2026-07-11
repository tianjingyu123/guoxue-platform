/**
 * 中医九种体质 · 节气个性化养生引擎
 * 依据：《中医体质分类与判定》（中华中医药学会 ZYYXH/T157-2009）九分法，
 * 结合节气气候特征（寒/热/温/凉/燥/湿/风）做规则化"一人一方"组合。
 * 纯函数、无副作用，便于迁移与测试。
 */
import { jieqiInfoOf, type JieqiInfo } from "./jieqi-data"

/** 气候因子标签 */
export type ClimateTag = "寒" | "热" | "温" | "凉" | "燥" | "湿" | "风"

export type ConstitutionKey =
  | "pinghe"
  | "qixu"
  | "yangxu"
  | "yinxu"
  | "tanshi"
  | "shire"
  | "xueyu"
  | "qiyu"
  | "tebing"

export interface Constitution {
  key: ConstitutionKey
  /** 体质名 */
  name: string
  /** 一句话总述 */
  summary: string
  /** 典型表现 */
  traits: string[]
  /** 调养总则 */
  principle: string
  /** 宜食（食材/食性倾向） */
  favorFoods: string[]
  /** 忌食 */
  avoidFoods: string[]
  /** 起居调养基调 */
  lifestyle: string
  /** 运动基调 */
  exercise: string
  /** 情志基调 */
  emotion: string
  /** 对哪些气候因子更敏感（该因子当令时需加强防护） */
  sensitive: ClimateTag[]
}

/** 二十四节气气候因子（用于个性化组合） */
export const JIEQI_CLIMATE: Record<string, ClimateTag[]> = {
  立春: ["温", "风"],
  雨水: ["湿", "寒"],
  惊蛰: ["温", "风", "燥"],
  春分: ["温", "风"],
  清明: ["湿", "温"],
  谷雨: ["湿", "温"],
  立夏: ["热", "温"],
  小满: ["湿", "热"],
  芒种: ["湿", "热"],
  夏至: ["热", "湿"],
  小暑: ["热", "湿"],
  大暑: ["热", "湿"],
  立秋: ["热", "燥"],
  处暑: ["燥", "温"],
  白露: ["燥", "凉"],
  秋分: ["燥", "凉"],
  寒露: ["燥", "寒"],
  霜降: ["燥", "寒"],
  立冬: ["寒", "燥"],
  小雪: ["寒", "燥"],
  大雪: ["寒"],
  冬至: ["寒"],
  小寒: ["寒"],
  大寒: ["寒", "风"],
}

export const CONSTITUTIONS: Constitution[] = [
  {
    key: "pinghe",
    name: "平和质",
    summary: "阴阳气血调和，体态适中、精力充沛",
    traits: ["面色红润", "睡眠良好", "二便正常", "适应力强"],
    principle: "顺应四时，饮食有节，不妄作劳，守中致和",
    favorFoods: ["五谷杂粮", "时令蔬果", "鱼禽蛋奶"],
    avoidFoods: ["过食肥甘", "暴饮暴食"],
    lifestyle: "作息规律，起居顺应节气昼夜变化即可",
    exercise: "动静结合，散步、慢跑、太极皆宜，微汗为度",
    emotion: "心态平和、知足常乐，保持现有节奏",
    sensitive: [],
  },
  {
    key: "qixu",
    name: "气虚质",
    summary: "元气不足，易疲乏、气短、易感冒",
    traits: ["容易累", "说话声低", "动则汗出", "易外感"],
    principle: "健脾益气，培补元气，忌耗气过度",
    favorFoods: ["山药", "小米", "大枣", "黄芪", "鸡肉", "南瓜"],
    avoidFoods: ["生冷", "耗气的萝卜（过量）", "空心菜"],
    lifestyle: "不熬夜、避免过劳，注意保暖防外感，可午间小憩养气",
    exercise: "宜柔缓：八段锦、散步，忌大汗剧烈运动耗气",
    emotion: "避免思虑过度伤脾，宜舒缓心境",
    sensitive: ["寒", "风"],
  },
  {
    key: "yangxu",
    name: "阳虚质",
    summary: "阳气不足，畏寒怕冷、手足不温",
    traits: ["怕冷", "手脚凉", "喜热饮", "精神不振"],
    principle: "温补阳气，忌寒凉，护住命门与关节",
    favorFoods: ["羊肉", "生姜", "桂圆", "核桃", "韭菜", "牛肉"],
    avoidFoods: ["冷饮", "西瓜", "苦瓜", "螃蟹等寒凉之物"],
    lifestyle: "早卧晚起以避寒，重点保暖背腹足；睡前热水泡脚",
    exercise: "宜阳光下运动升阳，如快走、慢跑，忌大汗当风",
    emotion: "多晒太阳、多与人交往，防阳气不振致情绪低落",
    sensitive: ["寒", "湿"],
  },
  {
    key: "yinxu",
    name: "阴虚质",
    summary: "阴液亏少，手足心热、口燥咽干",
    traits: ["怕热", "手足心热", "口干", "易上火", "皮肤偏干"],
    principle: "滋阴润燥，忌辛辣温燥，静养护阴",
    favorFoods: ["银耳", "百合", "梨", "鸭肉", "芝麻", "蜂蜜"],
    avoidFoods: ["辛辣", "羊肉", "烧烤煎炸", "烈酒"],
    lifestyle: "避免熬夜耗阴，居室勿过燥，午休养阴",
    exercise: "宜中小强度：太极、瑜伽，忌盛夏烈日下大汗",
    emotion: "性情多急躁，宜安神定志、戒躁怒",
    sensitive: ["热", "燥"],
  },
  {
    key: "tanshi",
    name: "痰湿质",
    summary: "痰湿凝聚，形体肥胖、腹部松软",
    traits: ["体胖", "多汗黏腻", "痰多", "容易困倦"],
    principle: "健脾祛湿，清淡饮食，多动化湿",
    favorFoods: ["薏米", "冬瓜", "赤小豆", "白萝卜", "海带"],
    avoidFoods: ["肥肉甜腻", "油炸", "糯米黏食", "过量生冷"],
    lifestyle: "居室宜干燥通风，避潮湿；衣物透气不宜过暖生汗",
    exercise: "宜较大运动量以化痰湿：快走、球类、慢跑，坚持出汗",
    emotion: "宜开阔心胸，避免久坐懒动加重痰湿",
    sensitive: ["湿"],
  },
  {
    key: "shire",
    name: "湿热质",
    summary: "湿热内蕴，面垢油光、易生痤疮",
    traits: ["面油", "易长痘", "口苦口臭", "大便黏滞"],
    principle: "清热利湿，饮食清淡，忌辛辣滋腻",
    favorFoods: ["绿豆", "苦瓜", "冬瓜", "芹菜", "薏米", "莲子"],
    avoidFoods: ["辛辣", "油腻", "烧烤", "酒", "羊肉狗肉温热之物"],
    lifestyle: "避暑湿环境，居室通风；不宜熬夜以免助热",
    exercise: "宜大强度有氧：长跑、游泳、爬山，畅泄湿热",
    emotion: "性情多急躁易怒，宜静心制怒",
    sensitive: ["湿", "热"],
  },
  {
    key: "xueyu",
    name: "血瘀质",
    summary: "血行不畅，肤色晦暗、易现瘀斑",
    traits: ["肤色暗", "唇色偏暗", "易健忘", "痛经/刺痛"],
    principle: "活血化瘀，行气通络，忌寒凝",
    favorFoods: ["山楂", "黑木耳", "红糖", "玫瑰花茶", "醋", "桃仁"],
    avoidFoods: ["过咸", "肥腻", "寒凉凝血之物"],
    lifestyle: "注意保暖防寒凝血脉，避免久坐久卧，起居有常",
    exercise: "宜促进气血运行：健步走、舞蹈、太极，持之以恒",
    emotion: "保持心情舒畅，气行则血行，忌郁怒",
    sensitive: ["寒"],
  },
  {
    key: "qiyu",
    name: "气郁质",
    summary: "气机郁滞，情绪敏感、多愁善感",
    traits: ["情绪低落", "易叹气", "胸胁胀闷", "睡眠欠佳"],
    principle: "疏肝理气，畅达情志，多与外界互动",
    favorFoods: ["玫瑰花", "陈皮", "柑橘", "小麦", "金针菜", "萝卜"],
    avoidFoods: ["收敛酸涩过度", "睡前浓茶咖啡"],
    lifestyle: "多参加户外与集体活动，居室明亮通风，规律作息",
    exercise: "宜户外舒展运动：登山、快走、球类，借运动疏解郁气",
    emotion: "主动倾诉、听乐赏景，防悲秋与阴雨天情绪低落",
    sensitive: ["湿"],
  },
  {
    key: "tebing",
    name: "特禀质",
    summary: "先天禀赋特异，多见过敏体质",
    traits: ["易过敏", "打喷嚏", "皮肤易起疹", "对花粉/气候敏感"],
    principle: "益气固表，避开过敏原，饮食清淡温和",
    favorFoods: ["糙米", "蜂蜜", "山药", "红枣", "益气固表之品"],
    avoidFoods: ["虾蟹发物", "辛辣", "含致敏成分食物", "生冷"],
    lifestyle: "花粉与换季高峰减少外出，居室勤清洁防尘螨，注意保暖",
    exercise: "宜温和规律运动增强卫气：散步、慢跑，避开花粉时段",
    emotion: "避免紧张焦虑诱发或加重过敏，保持情绪稳定",
    sensitive: ["风", "燥"],
  },
]

export function constitutionOf(key: ConstitutionKey): Constitution {
  return CONSTITUTIONS.find((c) => c.key === key) ?? CONSTITUTIONS[0]
}

export interface PersonalizedAdvice {
  /** 命中的敏感气候提示（可能为空） */
  caution: string | null
  diet: string
  daily: string
  exercise: string
  emotion: string
  /** 从本节气应季食材中筛出、契合体质的推荐 */
  pickedFoods: string[]
}

/** 交集辅助：应季食材里契合体质宜食倾向的 */
function pickSeasonalFoods(info: JieqiInfo, cons: Constitution): string[] {
  const favor = cons.favorFoods
  const hit = info.foods.filter((f) =>
    favor.some((v) => f.includes(v) || v.includes(f)),
  )
  // 平和质对所有应季食材皆宜
  if (cons.key === "pinghe") return info.foods.slice(0, 3)
  return hit.length > 0 ? hit : info.foods.slice(0, 2)
}

/**
 * 组合"一人一方"：节气 × 体质
 * 逻辑：以体质调养总则为纲，叠加本节气气候因子与应季饮食做个性化收敛。
 */
export function personalizedAdvice(
  jieqiName: string,
  key: ConstitutionKey,
): PersonalizedAdvice | null {
  const info = jieqiInfoOf(jieqiName)
  if (!info) return null
  const cons = constitutionOf(key)
  const climate = JIEQI_CLIMATE[jieqiName] ?? []

  // 命中的敏感气候
  const hitTags = climate.filter((t) => cons.sensitive.includes(t))
  const caution =
    hitTags.length > 0
      ? `${jieqiName}多${hitTags.join("、")}，正是${cons.name}的敏感时节，需格外注意防护。`
      : null

  const picked = pickSeasonalFoods(info, cons)

  const diet =
    cons.key === "pinghe"
      ? `顺应${jieqiName}时令即可：${picked.join("、")}等应季而食，${cons.favorFoods.slice(0, 3).join("、")}亦宜；忌${cons.avoidFoods.join("、")}。`
      : `${cons.name}宜${cons.favorFoods.slice(0, 4).join("、")}；本节气可优先选用应季的${picked.join("、")}。忌${cons.avoidFoods.slice(0, 3).join("、")}${hitTags.length ? `，尤其${jieqiName}${hitTags.join("、")}盛，更须避之。` : "。"}`

  const daily = `${cons.lifestyle}。结合${jieqiName}"${info.healthDaily.split("；")[0]||info.meaning}"，起居随节气而调。`

  const exercise = `${cons.exercise}。${jieqiName}${info.season}季${hitTags.includes("热") ? "，避正午暑热" : hitTags.includes("寒") ? "，待日出后再动、避风寒" : ""}。`

  const emotion = `${cons.emotion}。${info.season === "秋" ? "秋气肃杀，尤防悲秋。" : info.season === "冬" ? "冬宜藏神，忌大喜大怒。" : info.season === "春" ? "春应肝，忌恼怒。" : "夏应心，宜静心。"}`

  return { caution, diet, daily, exercise, emotion, pickedFoods: picked }
}
