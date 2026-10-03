/**
 * 二十四节气 · 推荐与海报语料
 * - 应季好物 / 相关课程 / B 端营销素材（讲师版）
 * - 运动导引 / 情志调节（按季静态兜底，配合 constitution.ts 做个性化）
 * - 海报文案（专属版 / 讲师版）
 * 说明：好物与课程为内容示例，不含真实交易；面向 B 端提供可复制的营销素材。
 */
import { jieqiInfoOf } from "./jieqi-data"

export type Season = "春" | "夏" | "秋" | "冬"

/** 运动导引（按季） */
export const SEASON_EXERCISE: Record<Season, { title: string; items: string[]; note: string }> = {
  春: {
    title: "春季 · 舒展升发",
    items: ["八段锦「双手托天理三焦」舒展全身", "晨起散步、慢跑，助阳气升发", "五禽戏之「鹿戏」，舒筋活络", "踏青远眺，广步于庭，披发缓形"],
    note: "春应肝，宜舒缓伸展、微汗即可，忌大汗淋漓耗阳。",
  },
  夏: {
    title: "夏季 · 畅泄清心",
    items: ["清晨或傍晚游泳、快走，避正午烈日", "八段锦「摇头摆尾去心火」清心降火", "太极拳缓和行气，静中生凉", "傍晚河边散步，纳凉而不贪凉"],
    note: "夏应心，宜清晨傍晚运动，适度出汗以泄暑热，忌暴晒中暑。",
  },
  秋: {
    title: "秋季 · 收敛平和",
    items: ["登高远足，宣发肺气", "八段锦「左右开弓似射雕」宣肺理气", "慢跑、太极，动作宜收不宜散", "深呼吸吐纳，练「呬」字诀养肺"],
    note: "秋应肺，运动量渐收，微汗为度，注意保暖防燥。",
  },
  冬: {
    title: "冬季 · 藏养固本",
    items: ["日出后再运动，快走、慢跑升阳", "八段锦「两手攀足固肾腰」温肾强腰", "室内太极、瑜伽，避大汗当风", "睡前八段锦收式，宁神助眠"],
    note: "冬应肾，宜藏不宜泄，待日光充足再动，忌大汗伤阳。",
  },
}

/** 情志调节（按季） */
export const SEASON_EMOTION: Record<Season, { title: string; items: string[] }> = {
  春: { title: "春 · 舒肝畅志", items: ["顺应生发之气，戒抑郁恼怒", "多与亲友游春谈心，广开心境", "怒伤肝，遇事宽和、不较劲"] },
  夏: { title: "夏 · 静心怡神", items: ["心静自然凉，戒烦躁焦虑", "午后小憩养心神", "喜伤心，乐而有节、勿过激"] },
  秋: { title: "秋 · 平和防悲", items: ["秋气肃杀，尤防悲秋伤感", "多晒太阳、赏秋登高，收敛神气", "忧伤肺，宜从容宁静、乐观开怀"] },
  冬: { title: "冬 · 藏神守静", items: ["冬宜藏神，情绪内敛平和", "早卧晚起，避严寒扰神", "恐伤肾，遇事从容、勿大惊大恐"] },
}

/** 应季好物（内容示例，非交易） */
export interface SeasonalGood {
  name: string
  category: "食养" | "茶饮" | "起居" | "香熏"
  reason: string
}

export const SEASON_GOODS: Record<Season, SeasonalGood[]> = {
  春: [
    { name: "陈皮玫瑰茶", category: "茶饮", reason: "疏肝理气，助春季情志舒展" },
    { name: "枸杞菊花饮", category: "茶饮", reason: "清肝明目，应春季肝气升发" },
    { name: "养肝食养套装（山药·大枣·芽菜）", category: "食养", reason: "健脾养肝，顺应生发之气" },
    { name: "透气防风外搭", category: "起居", reason: "春捂防风，护住颈背" },
  ],
  夏: [
    { name: "荷叶绿豆茶", category: "茶饮", reason: "清热消暑，解夏日湿热" },
    { name: "酸梅汤料包", category: "茶饮", reason: "生津止渴，开胃解暑" },
    { name: "祛湿食养套装（薏米·赤小豆·冬瓜）", category: "食养", reason: "健脾祛湿，应长夏湿盛" },
    { name: "竹纤维凉席", category: "起居", reason: "透气排汗，安睡度夏" },
  ],
  秋: [
    { name: "百合银耳羹料", category: "食养", reason: "滋阴润燥，防秋燥伤肺" },
    { name: "桂花乌龙茶", category: "茶饮", reason: "温润润喉，应秋收之气" },
    { name: "润燥食养套装（梨·芝麻·蜂蜜）", category: "食养", reason: "润肺生津，缓解干燥" },
    { name: "艾草足浴包", category: "起居", reason: "温经暖足，助秋冬收藏" },
  ],
  冬: [
    { name: "桂圆红枣姜茶", category: "茶饮", reason: "温中暖阳，御寒补气" },
    { name: "温补食养套装（羊肉·核桃·黑芝麻）", category: "食养", reason: "温肾助阳，冬令进补" },
    { name: "艾绒暖身护腰", category: "起居", reason: "温护命门腰肾，防寒" },
    { name: "沉香安神香熏", category: "香熏", reason: "宁神助眠，冬宜藏神" },
  ],
}

/** 相关课程（内容示例） */
export interface CourseItem {
  title: string
  level: "入门" | "进阶"
  desc: string
}

export const SEASON_COURSES: Record<Season, CourseItem[]> = {
  春: [
    { title: "四时养生·春季舒肝篇", level: "入门", desc: "从饮食、导引到情志，系统讲解春季养肝之道" },
    { title: "八段锦精讲·舒展升发", level: "入门", desc: "逐式拆解春季适练招式，跟练即会" },
  ],
  夏: [
    { title: "四时养生·夏季养心篇", level: "入门", desc: "清心消暑、长夏祛湿的完整方案" },
    { title: "药膳茶饮·消暑专题", level: "进阶", desc: "十款消暑茶饮与药膳的配伍与禁忌" },
  ],
  秋: [
    { title: "四时养生·秋季润肺篇", level: "入门", desc: "防秋燥、养肺阴的起居饮食全指南" },
    { title: "节气食养·润燥食单", level: "进阶", desc: "按节气编排的润燥食养菜谱与体质加减" },
  ],
  冬: [
    { title: "四时养生·冬季补肾篇", level: "入门", desc: "冬令进补、藏养固本的系统课程" },
    { title: "膏方与温补·冬藏专题", level: "进阶", desc: "冬季温补的辨证思路与常见误区" },
  ],
}

/**
 * B 端营销素材（讲师/机构可直接取用的文案）
 * 返回一组围绕当前节气的短文案，便于社群、朋友圈、海报使用。
 */
export function marketingCopy(jieqiName: string): { hooks: string[]; longCopy: string; tags: string[] } {
  const info = jieqiInfoOf(jieqiName)
  const season = (info?.season ?? "春") as Season
  const meaning = info?.meaning ?? ""
  const firstFoods = (info?.foods ?? []).slice(0, 3).join("、")

  const hooks = [
    `${jieqiName}已至：${meaning}顺时而养，正当其时。`,
    `一年养生看节气，${jieqiName}这样吃、这样动，全家受用。`,
    `${jieqiName}养生要点 3 条，转给需要的人。`,
    `跟着节气过日子——${jieqiName}${season}季养生清单来了。`,
  ]

  const longCopy =
    `【${jieqiName}·${season}季养生】${meaning}\n` +
    `饮食：应季宜食${firstFoods}等，顺时而补。\n` +
    `起居：${info?.healthDaily?.split("；")[0] ?? "顺应节气昼夜，起居有常"}。\n` +
    `运动：${SEASON_EXERCISE[season].items[0]}。\n` +
    `情志：${SEASON_EMOTION[season].items[0]}。\n` +
    `顺四时而养，与天地同频。`

  const tags = [`#${jieqiName}`, "#二十四节气", "#节气养生", `#${season}季养生`, "#顺时而养"]

  return { hooks, longCopy, tags }
}

/** 海报副本（专属版 / 讲师版） */
export interface PosterCopy {
  /** 一句主题诗意标题 */
  headline: string
  /** 3 条要点 */
  points: string[]
  /** 落款语 */
  footer: string
}

export function posterCopy(jieqiName: string, variant: "personal" | "lecturer"): PosterCopy {
  const info = jieqiInfoOf(jieqiName)
  const season = (info?.season ?? "春") as Season
  const poem = (info?.poem?.lines?.[0] ?? info?.meaning ?? "").split(/[。，]/)[0]

  if (variant === "lecturer") {
    return {
      headline: `${jieqiName} · ${info?.meaning ?? ""}`,
      points: [
        `饮食：宜${(info?.foods ?? []).slice(0, 3).join("、")}`,
        `导引：${SEASON_EXERCISE[season].items[0]}`,
        `情志：${SEASON_EMOTION[season].items[0]}`,
      ],
      footer: "顺时养生 · 讲师专属分享",
    }
  }
  return {
    headline: `${jieqiName}`,
    points: [poem || info?.meaning || "", `${season}季 · 顺时而养`, (info?.foods ?? []).slice(0, 3).join(" · ")],
    footer: "愿你顺时而安",
  }
}
