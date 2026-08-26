// 八宅风水核心数据与算法

// 八卦（后天）与方位
export const GUAS = ["坎", "艮", "震", "巽", "离", "坤", "兑", "乾"] as const
export type Gua = (typeof GUAS)[number]

export const GUA_INFO: Record<Gua, { dir: string; dirShort: string; wuxing: string; group: "east" | "west" }> = {
  坎: { dir: "北方", dirShort: "北", wuxing: "水", group: "east" },
  艮: { dir: "东北", dirShort: "东北", wuxing: "土", group: "west" },
  震: { dir: "东方", dirShort: "东", wuxing: "木", group: "east" },
  巽: { dir: "东南", dirShort: "东南", wuxing: "木", group: "east" },
  离: { dir: "南方", dirShort: "南", wuxing: "火", group: "east" },
  坤: { dir: "西南", dirShort: "西南", wuxing: "土", group: "west" },
  兑: { dir: "西方", dirShort: "西", wuxing: "金", group: "west" },
  乾: { dir: "西北", dirShort: "西北", wuxing: "金", group: "west" },
}

// 大游年歌诀顺序：乾坎艮震巽离坤兑（起卦后按此序排其余七宫）
const YOUNIAN_ORDER: Gua[] = ["乾", "坎", "艮", "震", "巽", "离", "坤", "兑"]

// 歌诀：每卦对其后七卦（按上序循环）的游年星
const YOUNIAN_SONG: Record<Gua, string[]> = {
  乾: ["六煞", "天医", "五鬼", "祸害", "绝命", "延年", "生气"],
  坎: ["五鬼", "天医", "生气", "延年", "绝命", "祸害", "六煞"],
  艮: ["六煞", "绝命", "祸害", "生气", "延年", "天医", "五鬼"],
  震: ["延年", "生气", "祸害", "绝命", "五鬼", "天医", "六煞"],
  巽: ["天医", "五鬼", "六煞", "祸害", "生气", "绝命", "延年"],
  离: ["六煞", "五鬼", "绝命", "延年", "祸害", "生气", "天医"],
  坤: ["天医", "延年", "绝命", "生气", "祸害", "五鬼", "六煞"],
  兑: ["生气", "祸害", "延年", "绝命", "六煞", "五鬼", "天医"],
}

export type StarName = "生气" | "天医" | "延年" | "伏位" | "绝命" | "五鬼" | "六煞" | "祸害"

/** 计算某卦（宅卦或命卦）的八方游年星分布 */
export function younianStars(base: Gua): Record<Gua, StarName> {
  const result = { [base]: "伏位" } as Record<Gua, StarName>
  const startIdx = YOUNIAN_ORDER.indexOf(base)
  const song = YOUNIAN_SONG[base]
  for (let i = 0; i < 7; i++) {
    const gua = YOUNIAN_ORDER[(startIdx + 1 + i) % 8]
    result[gua] = song[i] as StarName
  }
  return result
}

// 八星详解
export const STAR_INFO: Record<
  StarName,
  {
    xing: string // 星曜
    wuxing: string
    luck: "上吉" | "中吉" | "小吉" | "大凶" | "次凶"
    isJi: boolean
    desc: string
    effect: string
    yi: string // 宜
    ji: string // 忌
  }
> = {
  生气: {
    xing: "贪狼星",
    wuxing: "木",
    luck: "上吉",
    isJi: true,
    desc: "生气勃勃、积极向上之星，主人丁兴旺、事业发展。",
    effect: "利健康活力、催官贵、旺人丁。宅中第一吉方。",
    yi: "宜开大门、设主卧、书房、办公位。床头朝此方精力充沛。",
    ji: "忌设厕所、储物间压制吉气，忌污秽杂乱。",
  },
  天医: {
    xing: "巨门星",
    wuxing: "土",
    luck: "中吉",
    isJi: true,
    desc: "健康疗愈、贵人扶助之星，主祛病消灾、生活安稳。",
    effect: "利健康疗病、得贵人相助、财运平稳积累。",
    yi: "宜设主卧（尤其体弱者）、餐厨、老人房。久病者卧此方有助康复。",
    ji: "忌设厕所、忌堆放杂物，防贵人不显。",
  },
  延年: {
    xing: "武曲星",
    wuxing: "金",
    luck: "上吉",
    isJi: true,
    desc: "和谐长寿、感情婚姻之星，主家庭和睦、益寿延年。",
    effect: "利婚姻感情、人际和谐、健康长寿。求姻缘者首选。",
    yi: "宜开门、设主卧、夫妻房。单身者床位安此方利姻缘。",
    ji: "忌设灶压制（除非需泄凶），忌空置冷落。",
  },
  伏位: {
    xing: "左辅星",
    wuxing: "木",
    luck: "小吉",
    isJi: true,
    desc: "平稳守成、安定心神之星，主思绪清明、家宅安宁。",
    effect: "利守财、家运平顺、心境安定。慢性积累之吉。",
    yi: "宜设神位、书房、静室。适合冥想读书之所。",
    ji: "忌大动土、剧烈改造，宜静不宜动。",
  },
  绝命: {
    xing: "破军星",
    wuxing: "金",
    luck: "大凶",
    isJi: false,
    desc: "冲击破坏、意外损伤之星，为宅中第一凶方。",
    effect: "主健康损伤、意外灾祸、忧郁绝望。须重点化解。",
    yi: "宜设厕所、储物间镇压凶气，或安灶以火克金泄凶。",
    ji: "忌开门、设主卧、儿童房。久居此方健康堪忧。",
  },
  五鬼: {
    xing: "廉贞星",
    wuxing: "火",
    luck: "大凶",
    isJi: false,
    desc: "口舌是非、无名之火之星，主破财、火灾、小人。",
    effect: "主口舌官非、破财盗失、心绪暴躁、易招小人。",
    yi: "宜设厕所、杂物间压制。或以土泄火（陶瓷重物）。",
    ji: "忌开门、设灶（火上加火）、设卧室。忌红色装饰。",
  },
  六煞: {
    xing: "文曲星",
    wuxing: "水",
    luck: "次凶",
    isJi: false,
    desc: "桃花纠纷、失眠困扰之星，主感情纠葛、精神不宁。",
    effect: "主烂桃花、失眠多梦、官非口角、财来财去。",
    yi: "宜设厕所、浴室（水归水位）。可植绿植泄水气。",
    ji: "忌设主卧（防感情生变）、忌设水景鱼缸助凶。",
  },
  祸害: {
    xing: "禄存星",
    wuxing: "土",
    luck: "次凶",
    isJi: false,
    desc: "琐事缠身、疲劳争执之星，主是非琐碎、精力耗损。",
    effect: "主琐事纠纷、疲于奔命、慢性耗损、易生闷气。",
    yi: "宜设厕所、储藏室。或以金泄土（金属摆件）。",
    ji: "忌开门、设书房办公位，防诸事不顺。",
  },
}

// 二十四山 -> 宅卦（坐山定宅）：与玄空 MOUNTAINS 顺序一致（壬起，北方起）
// 壬子癸=坎宅 丑艮寅=艮宅 甲卯乙=震宅 辰巽巳=巽宅 丙午丁=离宅 未坤申=坤宅 庚酉辛=兑宅 戌乾亥=乾宅
export function sittingGua(mountainIdx: number): Gua {
  return GUAS[Math.floor(mountainIdx / 3) % 8]
}

// 命卦：出生年数字和化单数 s；男 11-s，女 s+4（结果化 1-9，5 男归坤女归艮）
// 注意以立春为岁首，立春前出生按上一年计
const MING_MAP: Record<number, Gua> = { 1: "坎", 2: "坤", 3: "震", 4: "巽", 6: "乾", 7: "兑", 8: "艮", 9: "离" }

function digitSum(n: number): number {
  let s = n
  while (s > 9) s = String(s).split("").reduce((a, c) => a + Number(c), 0)
  return s
}

export function mingGua(birthYear: number, gender: "male" | "female"): Gua {
  const s = digitSum(birthYear)
  let n: number
  if (gender === "male") {
    n = 11 - s
    if (n > 9) n -= 9
  } else {
    n = s + 4
    if (n > 9) n -= 9
  }
  if (n === 5) return gender === "male" ? "坤" : "艮"
  return MING_MAP[n]
}

/** 宅命是否相配（同为东四或同为西四） */
export function isMatch(zhai: Gua, ming: Gua): boolean {
  return GUA_INFO[zhai].group === GUA_INFO[ming].group
}

export function groupName(gua: Gua): string {
  return GUA_INFO[gua].group === "east" ? "东四" : "西四"
}

// 九宫格布局（南上北下，与竞品飞星盘一致）：
// 巽(东南) 离(南) 坤(西南) / 震(东) 中 兑(西) / 艮(东北) 坎(北) 乾(西北)
export const GRID_LAYOUT: (Gua | null)[] = ["巽", "离", "坤", "震", null, "兑", "艮", "坎", "乾"]
