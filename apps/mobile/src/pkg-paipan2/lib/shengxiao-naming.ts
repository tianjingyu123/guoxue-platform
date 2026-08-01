// ─── 生肖姓名学（字根喜忌）───
// 依据传统生肖姓名学：以生肖的三合/六合/三会、食性（得食）、栖息（得所）、
// 升格（称王/披彩）与相冲/相害/降格字根，对用字加减分。
// 字根匹配：部首（含简繁体）优先，辅以常见字的构件补充表。
// 注：各流派细节略有出入，本表取主流通行归类；肉月旁记作 ⺼ 与朝月「月」区分。

import { radicalOf } from "./xingming-engine"

/* ============ 字根组定义 ============ */
// 每组：组名 → 命中的部首集合（简繁并收）
const ROOT_RADICALS: Record<string, string[]> = {
  宀: ["宀"],
  口: ["口"],
  艹: ["艹", "艸"],
  木: ["木"],
  禾谷: ["禾", "米", "豆", "麦", "麥", "谷"],
  氵: ["氵", "水", "冫", "雨"],
  忄心: ["心", "忄"],
  肉月: ["⺼"],
  亻: ["亻", "人"],
  王大: ["王", "玉", "大", "君"],
  金: ["金", "釒", "钅"],
  山: ["山"],
  田: ["田"],
  日: ["日"],
  月: ["月"],
  火: ["火", "灬"],
  衣彩: ["衣", "衤", "纟", "糸", "糹", "巾", "彡"],
  刀: ["刀", "刂"],
  马: ["马", "馬"],
  羊: ["羊"],
  鸟: ["鸟", "鳥", "隹", "羽"],
  虫: ["虫"],
  犬: ["犬", "犭"],
  辶: ["辶", "廴", "弓"],
  石: ["石"],
  车: ["车", "車"],
}

// 构件补充表：部首无法覆盖的常见含字根字（如「明」含日、「宸」含辰）
const ROOT_EXTRA: Record<string, string> = {
  口: "和知启哲名合吉周咏善嘉唯君品尚若右司召可",
  宀: "宇安宁家宏宸宜宗守富察寓宽容实定审",
  日: "明晨曦昭晗煦晴昕旻晏晓景春智暄旭阳时曜昱暖易星晖",
  月: "明朗期望朋鹏腾胧",
  王大: "瑞瑜琛珊玲琳琪璇玮珏球理天奇美奕",
  忄心: "念惠悦怡恒慕思志忠恩慧憬愉",
  氵: "泰滕",
  田: "甲男畅届雷富",
  山: "岚峻岱屹岳峰崇岩幽仑仙",
  衣彩: "依表裴维绍绮红纯绿彩形彰影袁",
  禾谷: "秋程秀科稼穗登精粒粟",
  马: "骏驰骁腾冯许",
  辶: "达远运通道逸迅这造巡",
  火: "炎炜烨焕然烈煦熙",
  亻: "依健仁伟俊佩信儒任何仪伦优",
  子鼠: "子孜孟学存字季孝敦淳郭厚",
  丑牛: "丑牛牧特生隆浩皓造星妞",
  寅虎: "寅虎彪演处虚献",
  卯兔: "卯柳卿迎逸月兔",
  辰龙: "辰龙宸晨振农浓龚庞珑聋",
  巳蛇: "巳蛇迪建延廷远运通造逸巷选达道己",
  午马: "午马骏驰许冯骑腾竹南火杵",
  未羊: "未羊善義美群羚翔洋祥味妹茉",
  申猴: "申猴袁侯绅伸神畅寰环",
  酉鸡: "酉鸡兆鸣茜羽翎翊翌非凰凤醒尊",
  戌狗: "戌狗成城诚盛国献然狄猛",
  亥猪: "亥猪家豪毅象缘核该刻孩",
}

/** 判断字是否命中某字根组 */
function hitRoot(ch: string, group: string): boolean {
  const rads = ROOT_RADICALS[group]
  if (rads) {
    const r = radicalOf(ch)
    if (r && rads.includes(r)) return true
  }
  return (ROOT_EXTRA[group] ?? "").includes(ch)
}

/* ============ 十二生肖喜忌规则 ============ */

interface RootRule {
  group: string
  reason: string
}
interface ZodiacRule {
  fav: RootRule[]
  bad: RootRule[]
  note: string
}

export const SHENGXIAO_RULES: Record<string, ZodiacRule> = {
  鼠: {
    fav: [
      { group: "宀", reason: "鼠喜洞穴，宀部得安身之所" },
      { group: "禾谷", reason: "鼠喜五谷，得食无忧" },
      { group: "口", reason: "口部藏身，狡鼠有穴" },
      { group: "王大", reason: "子鼠居生肖之首，宜称王" },
      { group: "申猴", reason: "申子辰三合，得贵相助" },
      { group: "辰龙", reason: "申子辰三合，得贵相助" },
      { group: "丑牛", reason: "子丑六合，最得助力" },
    ],
    bad: [
      { group: "火", reason: "子属水，火根水火相克" },
      { group: "日", reason: "鼠行夜路，见日不安" },
      { group: "马", reason: "子午相冲" },
      { group: "羊", reason: "子未相害" },
    ],
    note: "宜宀口藏身、禾米得食、申辰丑三合六合之根；忌火日与马羊字根。",
  },
  牛: {
    fav: [
      { group: "艹", reason: "牛以草为食，得食为福" },
      { group: "禾谷", reason: "五谷丰足，安享清福" },
      { group: "宀", reason: "牛得栖身，安然自得" },
      { group: "田", reason: "牛耕于田，适得其所" },
      { group: "氵", reason: "牛需水草，得水而润" },
      { group: "子鼠", reason: "子丑六合" },
      { group: "巳蛇", reason: "巳酉丑三合" },
      { group: "酉鸡", reason: "巳酉丑三合" },
    ],
    bad: [
      { group: "马", reason: "丑午相害" },
      { group: "羊", reason: "丑未相冲" },
      { group: "忄心", reason: "心属肉，牛不食荤，得而不食" },
      { group: "肉月", reason: "肉月之根，牛不食荤" },
      { group: "王大", reason: "牛大则为牺牲，称王反劳" },
      { group: "衣彩", reason: "披彩之牛为祭品" },
    ],
    note: "宜艹禾得食、宀田得所、子巳酉合会之根；忌马羊、肉心、王大彩衣。",
  },
  虎: {
    fav: [
      { group: "山", reason: "虎踞山林，得势得所" },
      { group: "木", reason: "林间之虎，威而有靠" },
      { group: "王大", reason: "虎为山君，宜称王掌权" },
      { group: "忄心", reason: "虎为肉食，心属肉得食" },
      { group: "肉月", reason: "肉食得享" },
      { group: "衣彩", reason: "披彩添纹，虎更增威" },
      { group: "马", reason: "寅午戌三合" },
      { group: "戌狗", reason: "寅午戌三合" },
      { group: "氵", reason: "水生寅木，亦解虎渴" },
    ],
    bad: [
      { group: "申猴", reason: "寅申相冲" },
      { group: "巳蛇", reason: "寅巳相害" },
      { group: "亻", reason: "人虎相伤，忌人字旁" },
      { group: "口", reason: "虎入洞口受困，且开口伤人" },
      { group: "艹", reason: "虎落平阳，草原失势" },
      { group: "田", reason: "虎落平田，威风扫地" },
      { group: "日", reason: "猛虎藏于密林，忌曝于烈日" },
    ],
    note: "宜山木得所、王大掌权、肉心得食、午戌三合之根；忌申巳、人口、艹田平阳。",
  },
  兔: {
    fav: [
      { group: "艹", reason: "兔以草为食，得食为乐" },
      { group: "口", reason: "狡兔三窟，得穴安身" },
      { group: "宀", reason: "得洞穴栖身之所" },
      { group: "禾谷", reason: "五谷得食" },
      { group: "木", reason: "卯属木，林间得所" },
      { group: "亥猪", reason: "亥卯未三合" },
      { group: "未羊", reason: "亥卯未三合" },
      { group: "衣彩", reason: "兔重毛色，披彩增辉" },
    ],
    bad: [
      { group: "酉鸡", reason: "卯酉相冲" },
      { group: "辰龙", reason: "卯辰相害" },
      { group: "金", reason: "酉金克卯木之根" },
      { group: "忄心", reason: "兔为素食，肉心得而不食" },
      { group: "肉月", reason: "素食忌肉根" },
      { group: "日", reason: "月宫玉兔，见日失辉" },
    ],
    note: "宜艹木得食、口宀得穴、亥未三合、彩衣之根；忌酉辰、金、肉心与日。",
  },
  龙: {
    fav: [
      { group: "氵", reason: "龙得水而腾，遇水则发" },
      { group: "日", reason: "飞龙在天，与日月同辉" },
      { group: "月", reason: "日月增辉，龙威更盛" },
      { group: "王大", reason: "龙为尊贵之首，宜称王" },
      { group: "子鼠", reason: "申子辰三合" },
      { group: "申猴", reason: "申子辰三合" },
      { group: "酉鸡", reason: "辰酉六合" },
      { group: "马", reason: "龙马精神，相得益彰" },
    ],
    bad: [
      { group: "戌狗", reason: "辰戌相冲" },
      { group: "卯兔", reason: "卯辰相害" },
      { group: "宀", reason: "龙困屋檐，难以腾飞" },
      { group: "口", reason: "困龙于洞，气象受抑" },
      { group: "艹", reason: "龙落草丛，降格为蛇" },
      { group: "虫", reason: "虫根降格，大材小用" },
      { group: "田", reason: "龙困浅田，无从施展" },
    ],
    note: "宜氵得水、日月增辉、王大称尊、子申酉合之根；忌戌卯、宀口受困、艹虫田降格。",
  },
  蛇: {
    fav: [
      { group: "口", reason: "蛇喜洞穴，口部得藏身" },
      { group: "宀", reason: "得穴安居，遇险可避" },
      { group: "忄心", reason: "蛇为肉食，心属肉得食" },
      { group: "肉月", reason: "肉食得享" },
      { group: "木", reason: "蛇上树称龙，升格之根" },
      { group: "衣彩", reason: "蛇披彩衣，升格为龙" },
      { group: "酉鸡", reason: "巳酉丑三合" },
      { group: "丑牛", reason: "巳酉丑三合" },
      { group: "午马", reason: "巳午未三会" },
      { group: "辶", reason: "形似蛇行，自在游走" },
    ],
    bad: [
      { group: "亥猪", reason: "巳亥相冲" },
      { group: "寅虎", reason: "寅巳相害" },
      { group: "氵", reason: "巳属火，水根相克" },
      { group: "日", reason: "蛇喜阴凉，烈日曝晒不安" },
      { group: "禾谷", reason: "蛇不食五谷，得而无用" },
      { group: "亻", reason: "人见蛇惊，人蛇相扰" },
    ],
    note: "宜口宀得穴、肉心得食、木彩升格、酉丑午合会之根；忌亥寅、氵日、禾谷与人旁。",
  },
  马: {
    fav: [
      { group: "艹", reason: "马食草料，得食无忧" },
      { group: "木", reason: "林间驰骋，得所自在" },
      { group: "寅虎", reason: "寅午戌三合" },
      { group: "戌狗", reason: "寅午戌三合" },
      { group: "未羊", reason: "午未六合" },
      { group: "衣彩", reason: "良驹披彩，鞍辔增辉" },
      { group: "巳蛇", reason: "巳午未三会" },
    ],
    bad: [
      { group: "子鼠", reason: "子午相冲" },
      { group: "氵", reason: "午属火，水根相克" },
      { group: "丑牛", reason: "丑午相害" },
      { group: "田", reason: "马入田间成耕马，劳苦一生" },
      { group: "忄心", reason: "马为素食，肉心得而不食" },
      { group: "肉月", reason: "素食忌肉根" },
      { group: "山", reason: "山路崎岖，骏马难驰" },
    ],
    note: "宜艹木得食得所、寅戌未合会、彩衣之根；忌子氵丑、田间劳苦、肉心与山。",
  },
  羊: {
    fav: [
      { group: "艹", reason: "羊喜食草，得食为福" },
      { group: "口", reason: "得栏得穴，安身有靠" },
      { group: "宀", reason: "得舍安居" },
      { group: "木", reason: "林间得息" },
      { group: "禾谷", reason: "五谷杂粮，得食丰足" },
      { group: "卯兔", reason: "亥卯未三合" },
      { group: "亥猪", reason: "亥卯未三合" },
      { group: "午马", reason: "午未六合" },
    ],
    bad: [
      { group: "丑牛", reason: "丑未相冲" },
      { group: "子鼠", reason: "子未相害" },
      { group: "忄心", reason: "羊为素食，肉心得而不食" },
      { group: "肉月", reason: "素食忌肉根" },
      { group: "王大", reason: "羊大为美亦为祭，称王为牺牲" },
      { group: "衣彩", reason: "披彩之羊多为供品" },
      { group: "氵", reason: "羊怕涉水，水根不宜" },
    ],
    note: "宜艹禾得食、口宀得舍、卯亥午合会之根；忌丑子、肉心、王大彩衣与水。",
  },
  猴: {
    fav: [
      { group: "木", reason: "猴栖林间，得树得所" },
      { group: "口", reason: "得穴护身" },
      { group: "宀", reason: "得屋安居" },
      { group: "王大", reason: "猴王气象，称王得势" },
      { group: "子鼠", reason: "申子辰三合" },
      { group: "辰龙", reason: "申子辰三合" },
      { group: "亻", reason: "猴通人性，近人升格" },
      { group: "衣彩", reason: "沐冠而衣，升格像人" },
      { group: "氵", reason: "申金生水，遇水而智" },
    ],
    bad: [
      { group: "寅虎", reason: "寅申相冲" },
      { group: "亥猪", reason: "申亥相害" },
      { group: "禾谷", reason: "猴入田园损五谷，遭人驱赶" },
      { group: "田", reason: "践踏庄稼，招怨之根" },
      { group: "火", reason: "火克申金" },
      { group: "日", reason: "烈日当空，燥而不安" },
    ],
    note: "宜木口宀得所、王大称尊、子辰三合、人彩升格之根；忌寅亥、禾田损谷、火日。",
  },
  鸡: {
    fav: [
      { group: "禾谷", reason: "鸡食五谷，得食无忧" },
      { group: "山", reason: "山头之鸡，升格为凤" },
      { group: "宀", reason: "得栖得舍" },
      { group: "口", reason: "得穴护身" },
      { group: "衣彩", reason: "羽彩华丽，凤冠霞帔" },
      { group: "虫", reason: "得虫得食" },
      { group: "巳蛇", reason: "巳酉丑三合" },
      { group: "丑牛", reason: "巳酉丑三合" },
      { group: "辰龙", reason: "辰酉六合" },
    ],
    bad: [
      { group: "卯兔", reason: "卯酉相冲" },
      { group: "戌狗", reason: "酉戌相害，金鸡遇犬泪双流" },
      { group: "忄心", reason: "鸡食五谷不食肉，得而不食" },
      { group: "肉月", reason: "肉根无用" },
      { group: "氵", reason: "落汤之鸡，狼狈不堪" },
      { group: "王大", reason: "鸡大为牺牲，供桌之虞" },
      { group: "刀", reason: "金鸡遇刀，性命之忧" },
    ],
    note: "宜禾米得食、山头升格、彩衣增辉、巳丑辰合会之根；忌卯戌、肉心、氵王大与刀。",
  },
  狗: {
    fav: [
      { group: "亻", reason: "犬忠于人，得主而贵" },
      { group: "宀", reason: "家犬有主，安享清福" },
      { group: "口", reason: "得穴得舍（单口为佳）" },
      { group: "忄心", reason: "犬为肉食，心属肉得食" },
      { group: "肉月", reason: "肉食得享" },
      { group: "寅虎", reason: "寅午戌三合" },
      { group: "午马", reason: "寅午戌三合" },
      { group: "卯兔", reason: "卯戌六合" },
      { group: "衣彩", reason: "披彩添威，虎装增势" },
    ],
    bad: [
      { group: "辰龙", reason: "辰戌相冲" },
      { group: "酉鸡", reason: "酉戌相害" },
      { group: "日", reason: "犬吠日，多劳多忧" },
      { group: "禾谷", reason: "犬为肉食，五谷得而不食" },
      { group: "木", reason: "戌土忌木克" },
      { group: "氵", reason: "戌属燥土，水根相伤" },
    ],
    note: "宜人宀得主、肉心得食、寅午卯合会、彩衣之根；忌辰酉、日、禾谷与水木。",
  },
  猪: {
    fav: [
      { group: "禾谷", reason: "猪食五谷杂粮，得食为福" },
      { group: "口", reason: "得栏得舍，安享口福" },
      { group: "宀", reason: "家中之豕为「家」，得舍最贵" },
      { group: "氵", reason: "亥属水，比旺得助" },
      { group: "金", reason: "金生亥水，得长辈之助" },
      { group: "卯兔", reason: "亥卯未三合" },
      { group: "未羊", reason: "亥卯未三合" },
      { group: "子鼠", reason: "亥子丑三会" },
      { group: "木", reason: "亥水生木，泄秀有情" },
    ],
    bad: [
      { group: "巳蛇", reason: "巳亥相冲" },
      { group: "申猴", reason: "申亥相害" },
      { group: "王大", reason: "猪大肥美，先被宰杀" },
      { group: "衣彩", reason: "披彩之猪为祭品" },
      { group: "刀", reason: "刀俎之根，性命之忧" },
      { group: "日", reason: "烈日曝晒，燥热不安" },
    ],
    note: "宜禾米得食、口宀得舍、氵金相生、卯未子合会之根；忌巳申、王大彩衣与刀日。",
  },
}

/* ============ 评估函数 ============ */

export interface ShengxiaoAssess {
  /** 每命中一喜根 +1（上限3），每命中一忌根 -1（上限-3），无命中为0 */
  score: number
  favHits: { group: string; reason: string }[]
  badHits: { group: string; reason: string }[]
}

/** 单字生肖喜忌评估 */
export function assessCharForZodiac(ch: string, zodiac: string): ShengxiaoAssess {
  const rule = SHENGXIAO_RULES[zodiac]
  if (!rule) return { score: 0, favHits: [], badHits: [] }
  const favHits = rule.fav.filter((r) => hitRoot(ch, r.group)).map((r) => ({ group: r.group, reason: r.reason }))
  const badHits = rule.bad.filter((r) => hitRoot(ch, r.group)).map((r) => ({ group: r.group, reason: r.reason }))
  const score = Math.max(-3, Math.min(3, favHits.length - badHits.length * 1.5))
  return { score, favHits, badHits }
}

/** 生肖喜忌总说（供档案展示） */
export function zodiacNamingNote(zodiac: string): string {
  const rule = SHENGXIAO_RULES[zodiac]
  return rule ? `生肖${zodiac}：${rule.note}` : ""
}
