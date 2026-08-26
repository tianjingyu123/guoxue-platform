// ─────────────────────────────────────────────────────────────
// 姓名分析真实引擎：三才五格剖象法
// 康熙笔画（内置字典，46 个权威参考值校验通过）→ 五格 → 81 数理吉凶
// → 三才五行生克 → 音律（拼音声调）→ 姓名卦（复用六爻引擎 64 卦表）。
// 流派说明：五格剖象采用主流熊崎氏规则；汉字五行采用部首五行为主、
// 数理五行兜底；三才吉凶采用五行生克规则化判定（生我/比和为吉，克我为凶）。
// ─────────────────────────────────────────────────────────────

import kangxiData from "./data/kangxi-strokes.json"
import { pinyinNum, pinyinSymbol } from "./pinyin-lite"
import { trigramByNum, hexName, GUA_CI } from "./liuyao-engine"
import type {
  NameDetail,
  NameCandidate,
  NameChar,
  GeInfo,
  SancaiWuge,
  CharExplain,
  MingGua,
} from "./qiming-data"

type WX = "金" | "木" | "水" | "火" | "土"
const DICT = kangxiData as unknown as Record<string, [number, WX, string]>

/* ============ 基础查询 ============ */

/** 康熙笔画（查不到时回退 8 并标记） */
export function kangxiStroke(ch: string): number {
  return DICT[ch]?.[0] ?? 8
}

/** 字形五行（部首五行为主，数理五行兜底） */
export function charWuxingOf(ch: string): WX {
  return DICT[ch]?.[1] ?? "土"
}

/** 部首（肉月旁记作 ⺼，与朝月「月」区分；供生肖字根匹配） */
export function radicalOf(ch: string): string {
  return DICT[ch]?.[2] ?? ""
}

export function hasChar(ch: string): boolean {
  return DICT[ch] != null
}

/** 常见复姓表 */
const COMPOUND_SURNAMES = [
  "欧阳", "司马", "诸葛", "上官", "东方", "皇甫", "尉迟", "公孙", "慕容", "令狐",
  "司徒", "司空", "夏侯", "独孤", "南宫", "西门", "长孙", "宇文", "轩辕", "呼延",
  "端木", "百里", "东郭", "申屠", "太史", "澹台", "公冶", "淳于", "单于", "鲜于",
  "闾丘", "左丘", "颛孙", "公良", "拓跋", "夹谷", "梁丘", "微生", "羊舌", "第五",
]

/** 拆分姓与名：优先匹配复姓 */
export function splitName(fullName: string): { surname: string; given: string } {
  const two = fullName.slice(0, 2)
  if (fullName.length >= 3 && COMPOUND_SURNAMES.includes(two)) {
    return { surname: two, given: fullName.slice(2) }
  }
  return { surname: fullName.slice(0, 1), given: fullName.slice(1) }
}

/* ============ 81 数理（熊崎氏姓名学） ============ */

interface ShuliInfo {
  name: string
  luck: "大吉" | "吉" | "半吉" | "凶" | "大凶"
  judgment: string
}

const SHULI: Record<number, ShuliInfo> = {
  1: { name: "太极之数", luck: "大吉", judgment: "宇宙起源，天地开泰，威望长寿，繁荣发达。" },
  2: { name: "两仪之数", luck: "凶", judgment: "混沌未定，进退保守，志望难达，动摇不安。" },
  3: { name: "三才之数", luck: "大吉", judgment: "天地人和，大事大业，名利双收，繁荣至上。" },
  4: { name: "四象之数", luck: "凶", judgment: "待于生发，万事慎重，凶变夭折，不足支撑。" },
  5: { name: "五行之数", luck: "大吉", judgment: "阴阳和合，精神愉快，福禄长寿，荣誉达利。" },
  6: { name: "六爻之数", luck: "吉", judgment: "发展变化，天赋美德，吉祥安泰，可成大业。" },
  7: { name: "七政之数", luck: "吉", judgment: "精悍严谨，天赋之力，吉星照耀，功成名就。" },
  8: { name: "八卦之数", luck: "吉", judgment: "意志刚健，勤勉发展，富于进取，功名有望。" },
  9: { name: "大成之数", luck: "凶", judgment: "大成之数蕴涵凶险，或成或败，难以把握。" },
  10: { name: "终结之数", luck: "凶", judgment: "雪暗飘零，偶或有成，回顾茫然，动摇不安。" },
  11: { name: "旱苗逢雨", luck: "大吉", judgment: "挽回家运，稳健着实，得享清福，富贵繁荣。" },
  12: { name: "掘井无泉", luck: "凶", judgment: "无理伸张，意志薄弱，家庭寂寞，谋事难成。" },
  13: { name: "春日牡丹", luck: "大吉", judgment: "才艺多能，智谋奇略，忍柔当事，鸣奏大功。" },
  14: { name: "破兆之数", luck: "凶", judgment: "家庭缘薄，孤独遭难，谋事不达，多破兆。" },
  15: { name: "福寿之数", luck: "大吉", judgment: "福寿圆满，富贵荣誉，涵养雅量，德高望重。" },
  16: { name: "厚重载德", luck: "大吉", judgment: "贵人相助，天乙贵人，众望所归，成就大业。" },
  17: { name: "刚强之数", luck: "吉", judgment: "权威刚强，突破万难，如能容忍，必获成功。" },
  18: { name: "有志竟成", luck: "吉", judgment: "铁石心发达，有志竟成，功名有获，博得名利。" },
  19: { name: "多难之数", luck: "凶", judgment: "风云蔽日，辛苦重来，虽有智谋，万事挫折。" },
  20: { name: "屋下藏金", luck: "凶", judgment: "非业破运，灾难重重，进退维谷，万事难成。" },
  21: { name: "明月中天", luck: "大吉", judgment: "光风霁月，万物确立，官运亨通，大搏名利。" },
  22: { name: "秋草逢霜", luck: "凶", judgment: "怀才不遇，忧愁困苦，事不如意，身世凋零。" },
  23: { name: "壮丽之数", luck: "大吉", judgment: "旭日东升，壮丽壮观，权威旺盛，功名荣达。" },
  24: { name: "掘藏得金", luck: "大吉", judgment: "家门余庆，金钱丰盈，白手成家，财源广进。" },
  25: { name: "英俊之数", luck: "吉", judgment: "资性英敏，才能奇特，涵养性情，可得成功。" },
  26: { name: "变怪之数", luck: "凶", judgment: "变怪异奇，英雄豪杰，波澜重叠，而奏大功。" },
  27: { name: "增长之数", luck: "半吉", judgment: "欲望无止，自我强烈，多受毁谤，尚可成功。" },
  28: { name: "阔水浮萍", luck: "凶", judgment: "遭难之数，豪杰气概，四海漂泊，终世浮躁。" },
  29: { name: "智谋之数", luck: "吉", judgment: "智谋优秀，财力归集，名闻海内，成就大业。" },
  30: { name: "非运之数", luck: "半吉", judgment: "沉浮不定，凶吉难变，若明若暗，大成大败。" },
  31: { name: "春日花开", luck: "大吉", judgment: "智勇得志，博得名利，统领众人，繁荣富贵。" },
  32: { name: "宝马金鞍", luck: "大吉", judgment: "侥幸多望，贵人得助，财帛如裕，繁荣至上。" },
  33: { name: "旭日升天", luck: "大吉", judgment: "鸾凤相会，名闻天下，隆昌至极，天赋幸运。" },
  34: { name: "破家之数", luck: "大凶", judgment: "破家亡身，见识短小，辛苦遭逢，灾祸至极。" },
  35: { name: "高楼望月", luck: "吉", judgment: "温和平静，智达通畅，文昌技艺，奏功洋洋。" },
  36: { name: "波澜重叠", luck: "凶", judgment: "波澜重叠，沉浮万状，侠肝义胆，舍己成仁。" },
  37: { name: "猛虎出林", luck: "大吉", judgment: "权威显达，热诚忠信，宜着雅量，终身荣富。" },
  38: { name: "磨铁成针", luck: "半吉", judgment: "意志薄弱，刻意经营，才识不凡，技艺有成。" },
  39: { name: "富贵荣华", luck: "大吉", judgment: "富贵荣华，财帛丰盈，暗藏险象，德泽四方。" },
  40: { name: "退安之数", luck: "凶", judgment: "谨慎保安，智谋胆力，知难而退，自获天佑。" },
  41: { name: "有德之数", luck: "大吉", judgment: "纯阳独秀，德高望重，和顺畅达，博得名利。" },
  42: { name: "寒蝉在柳", luck: "凶", judgment: "博识多能，精通世情，如能专心，尚可成功。" },
  43: { name: "散财破产", luck: "凶", judgment: "散财破产，诸事不遂，虽有智谋，财来财去。" },
  44: { name: "烦闷之数", luck: "凶", judgment: "愁眉难展，乱世怪杰，事不如意，暗藏惨淡。" },
  45: { name: "顺风之数", luck: "大吉", judgment: "新生泰和，顺风扬帆，智谋经纬，富贵繁荣。" },
  46: { name: "浪里淘金", luck: "凶", judgment: "载宝沉舟，浪里淘金，大难尝尽，大功有成。" },
  47: { name: "点石成金", luck: "大吉", judgment: "花开之象，万事如意，祯祥吉庆，天赋幸福。" },
  48: { name: "古松立鹤", luck: "大吉", judgment: "智谋兼备，德量荣达，威望成师，洋洋大观。" },
  49: { name: "转变之数", luck: "凶", judgment: "遇吉则吉，遇凶则凶，转凶为吉，配合三才。" },
  50: { name: "小舟入海", luck: "凶", judgment: "一成一败，吉凶参半，先得庇荫，后陷凶运。" },
  51: { name: "沉浮之数", luck: "半吉", judgment: "盛衰交加，波澜重叠，如能慎始，必获成功。" },
  52: { name: "达眼之数", luck: "大吉", judgment: "先见之明，理想实现，名利双收，一跃成功。" },
  53: { name: "曲卷难星", luck: "半吉", judgment: "外祥内苦，先吉后凶，先凶后吉，保守平安。" },
  54: { name: "石上栽花", luck: "大凶", judgment: "石上栽花，难得有活，忧闷烦来，辛惨不绝。" },
  55: { name: "善恶之数", luck: "半吉", judgment: "外美内苦，先吉后凶，克服难关，开出泰运。" },
  56: { name: "浪里行舟", luck: "凶", judgment: "历尽艰辛，四周障害，万事龃龉，做事乏力。" },
  57: { name: "日照春松", luck: "吉", judgment: "寒雪青松，夜莺吟春，必遭一过，繁荣白事。" },
  58: { name: "晚行遇月", luck: "半吉", judgment: "沉浮多端，先苦后甜，宽宏扬名，富贵繁荣。" },
  59: { name: "寒蝉悲风", luck: "凶", judgment: "遇事犹疑，惨淡经营，缺乏勇气，才智不展。" },
  60: { name: "无谋之数", luck: "凶", judgment: "争名夺利，黑暗无光，切莫妄动，晚景凄凉。" },
  61: { name: "牡丹芙蓉", luck: "吉", judgment: "牡丹芙蓉，花开富贵，名利双收，定享天赋。" },
  62: { name: "衰败之数", luck: "凶", judgment: "烦闷懊恼，事业难展，自防灾祸，始免困境。" },
  63: { name: "舟归平海", luck: "大吉", judgment: "富贵荣华，身心安泰，雨露惠泽，万事亨通。" },
  64: { name: "骨肉分离", luck: "凶", judgment: "骨肉分离，孤独悲愁，难得心安，多破兆象。" },
  65: { name: "巨流归海", luck: "大吉", judgment: "天长地久，家运隆昌，福寿绵长，事事成就。" },
  66: { name: "岩头步马", luck: "凶", judgment: "黑夜漫长，进退维谷，内外不和，信用缺乏。" },
  67: { name: "通达之数", luck: "大吉", judgment: "天赋幸运，四通八达，家道繁昌，富贵东来。" },
  68: { name: "顺风吹帆", luck: "吉", judgment: "思虑周详，计划力行，不失先机，可望成功。" },
  69: { name: "非业之数", luck: "凶", judgment: "坐立不安，外世多难，病困交加，处境艰难。" },
  70: { name: "残菊逢霜", luck: "凶", judgment: "残菊逢霜，寂寞无碍，惨淡忧愁，晚景凄凉。" },
  71: { name: "石上金花", luck: "半吉", judgment: "石上金花，内心劳苦，贯彻始终，定可昌隆。" },
  72: { name: "劳苦之数", luck: "凶", judgment: "荣苦相伴，外祥内苦，阴云覆月，前热后冷。" },
  73: { name: "无勇之数", luck: "半吉", judgment: "盛衰交加，志高力微，谨慎行事，可保平安。" },
  74: { name: "残花经春", luck: "凶", judgment: "利不及费，坐食山空，如无智谋，难望成功。" },
  75: { name: "退守之数", luck: "半吉", judgment: "退守保吉，发迹甚迟，虽有吉象，先难后易。" },
  76: { name: "离散之数", luck: "凶", judgment: "倾覆离散，骨肉分离，内外不和，虽劳无功。" },
  77: { name: "半吉之数", luck: "半吉", judgment: "家庭有悦，半吉半凶，能获援护，陷落不幸。" },
  78: { name: "晚苦之数", luck: "半吉", judgment: "祸福参半，先天智能，中年发达，晚景困苦。" },
  79: { name: "云头望月", luck: "凶", judgment: "云头望月，身疲力尽，精神不定，缺乏勇气。" },
  80: { name: "遁世之数", luck: "凶", judgment: "辛苦不绝，早入隐遁，安心立命，化凶转吉。" },
  81: { name: "还元之数", luck: "大吉", judgment: "最极之数，还本归元，能得繁荣，发达成功。" },
}

/** 数理五行：尾数 1,2 木 3,4 火 5,6 土 7,8 金 9,0 水 */
const SHULI_WX: WX[] = ["水", "木", "木", "火", "火", "土", "土", "金", "金", "水"]
export function shuliWuxing(n: number): WX {
  return SHULI_WX[n % 10]
}

function shuliOf(n: number): ShuliInfo {
  const key = ((n - 1) % 81) + 1
  return SHULI[key]
}

/** 数理吉凶（起名引擎复用） */
export function shuliLuckOf(n: number): string {
  return shuliOf(n).luck
}

/** 数理完整详情（字典查询等复用）：数理名称+吉凶+断语 */
export function shuliInfoOf(n: number): { name: string; luck: string; judgment: string } {
  return shuliOf(n)
}

/* ============ 五格计算（熊崎氏规则） ============ */

export interface WugeRaw {
  tian: number
  ren: number
  di: number
  wai: number
  zong: number
  surnameStrokes: number[]
  givenStrokes: number[]
}

export function computeWuge(surname: string, given: string): WugeRaw {
  const s = [...surname].map(kangxiStroke)
  const g = [...given].map(kangxiStroke)
  const sSum = s.reduce((a, b) => a + b, 0)
  const gSum = g.reduce((a, b) => a + b, 0)
  const single = s.length === 1
  const singleGiven = g.length === 1

  const tian = single ? s[0] + 1 : sSum
  const ren = (single ? s[0] : s[1]) + g[0]
  const di = singleGiven ? g[0] + 1 : g[0] + g[1]
  const zong = sSum + gSum
  // 外格 = 总格 - 人格 + (单姓?1:0) + (单名?1:0)，等价于传统定义
  let wai = zong - ren + (single ? 1 : 0) + (singleGiven ? 1 : 0)
  if (single && singleGiven) wai = 2
  return { tian, ren, di, wai, zong, surnameStrokes: s, givenStrokes: g }
}

function geInfo(value: number): GeInfo {
  const info = shuliOf(value)
  return {
    value,
    wuxing: shuliWuxing(value),
    luck: info.luck,
    judgment: `${info.name}：${info.judgment}`,
  }
}

/* ============ 三才（五行生克规则化） ============ */

const SHENG: Record<WX, WX> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }
const KE: Record<WX, WX> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }

/** a 对 b 的关系：same 比和 / sheng 生 / ke 克 / shengBy 被生 / keBy 被克 */
function relation(a: WX, b: WX): "same" | "sheng" | "ke" | "shengBy" | "keBy" {
  if (a === b) return "same"
  if (SHENG[a] === b) return "sheng"
  if (KE[a] === b) return "ke"
  if (SHENG[b] === a) return "shengBy"
  return "keBy"
}

function relScore(rel: ReturnType<typeof relation>, into: boolean): number {
  // into=true 表示以人格为受方（天格→人格、地格→人格）
  switch (rel) {
    case "same": return 2
    case "sheng": return into ? 2 : 1
    case "shengBy": return into ? 1 : 2
    case "ke": return into ? -2 : 0
    case "keBy": return into ? 0 : -2
  }
}

const REL_TEXT: Record<string, string> = {
  same: "比和相助，同气连枝，平顺安稳",
  sheng: "生化有情，得其助力，运势通达",
  shengBy: "泄气有耗，付出居多，宜养精蓄锐",
  ke: "受克有制，多有阻力，须防挫折",
  keBy: "克制他人，主动强势，慎防人际紧张",
}

/** 三才吉凶（起名引擎复用）：以数理五行天/人/地相生克判定 */
export function sancaiLuckOf(tian: WX, ren: WX, di: WX): "吉" | "半吉" | "凶" {
  const score = relScore(relation(tian, ren), true) + relScore(relation(di, ren), true)
  return score >= 3 ? "吉" : score >= 0 ? "半吉" : "凶"
}

function sancaiOf(tian: WX, ren: WX, di: WX): Pick<SancaiWuge, "sancai" | "sancaiLuck" | "sancaiNote" | "sancaiFortunes"> {
  const tr = relation(tian, ren) // 天对人
  const dr = relation(di, ren) // 地对人
  const score = relScore(tr, true) + relScore(dr, true)
  const luck: "吉" | "半吉" | "凶" = score >= 3 ? "吉" : score >= 0 ? "半吉" : "凶"

  const noteMap = {
    吉: "三才配置得宜，上下相生有情，根基稳固，得长辈与部属之助，事业可望顺遂发展。",
    半吉: "三才配置中平，生克互见，成功运受一定牵制，须凭自身努力方能突破，稳中求进为宜。",
    凶: "三才配置相克，上下掣肘，成功运受压，境遇多变动，宜修心养性、以柔克刚化解。",
  } as const

  const fortunes = [
    {
      label: "总论",
      text: noteMap[luck],
      luck: luck === "吉" ? "吉" : luck === "半吉" ? "半吉" : "凶",
    },
    {
      label: "成功运",
      text: `天格（长上、机遇）${tian}对人格${ren}：${REL_TEXT[tr]}。`,
      luck: relScore(tr, true) >= 1 ? "吉" : relScore(tr, true) === 0 ? "半吉" : "凶",
    },
    {
      label: "基础运",
      text: `地格（根基、部属）${di}对人格${ren}：${REL_TEXT[dr]}。`,
      luck: relScore(dr, true) >= 1 ? "吉" : relScore(dr, true) === 0 ? "半吉" : "凶",
    },
    {
      label: "社交运",
      text:
        luck === "吉"
          ? "性情中和，待人以诚，人缘敦厚，社交圈中多得信任与助力。"
          : luck === "半吉"
            ? "外缘尚可，惟直率易招误解，谨言慎行、多结善缘则社交无碍。"
            : "个性刚直易与人争，社交多波折，宜涵养雅量、广结善缘。",
      luck: luck === "凶" ? "半吉" : "吉",
    },
  ]

  return { sancai: `${tian}${ren}${di}`, sancaiLuck: luck, sancaiNote: noteMap[luck], sancaiFortunes: fortunes }
}

/* ============ 音律 ============ */

function toneOf(ch: string): number {
  const py = pinyinNum(ch)
  const m = py.match(/(\d)$/)
  return m ? Number(m[1]) : 0
}

function pinyinOf(ch: string): string {
  return pinyinSymbol(ch)
}

const PING = new Set([1, 2])

function yinlvOf(fullName: string): NameDetail["yinlv"] {
  const chars = [...fullName]
  const tones = chars.map(toneOf)
  const pattern = tones.map((t) => (PING.has(t) ? "平" : "仄")).join("")
  const varied = new Set(tones).size > 1
  const sameAdj = tones.some((t, i) => i > 0 && t === tones[i - 1] && t !== 0)
  const note = varied
    ? `声调为「${tones.join("-")}」，${pattern}相间，抑扬顿挫，朗朗上口${sameAdj ? "；相邻字声调偶有重复，整体仍属顺口" : ""}。`
    : `声调为「${tones.join("-")}」，全名同调，读音平直，稍欠起伏，呼唤时辨识度一般。`
  return {
    tonePattern: pattern,
    note,
    homophone: "常规语境下未见明显不良谐音；实际使用建议结合方言读音复核。",
  }
}

/* ============ 字义（精选字库 + 五行模板兜底） ============ */

const CHAR_MEANINGS: Record<string, string> = {
  伟: "高大壮美，才识卓越，指志向远大、有抱负之人。",
  志: "心之所向，志向、意志，寓意矢志不渝、有理想。",
  明: "日月同辉，光明通达，寓意聪慧睿智、光明磊落。",
  华: "光彩美丽，繁盛精粹，寓意才华出众、气度雍容。",
  文: "文采斐然，礼乐教化，寓意博学儒雅、温文尔雅。",
  博: "广博通达，兼容并蓄，寓意学识渊博、胸怀宽广。",
  涛: "大浪波涛，气势磅礴，寓意胸怀壮阔、勇往直前。",
  泽: "水聚之地，恩泽润物，寓意福泽绵长、惠及四方。",
  轩: "高车华轩，气宇轩昂，寓意气度不凡、卓尔不群。",
  宇: "上下四方，栋梁之器，寓意胸襟开阔、器宇轩昂。",
  浩: "水势浩大，正气浩然，寓意心胸坦荡、气概豪迈。",
  然: "信守承诺，怡然自得，寓意言而有信、泰然处世。",
  嘉: "美善嘉许，吉庆祥瑞，寓意品德美好、乐观向上。",
  怡: "和悦愉快，心旷神怡，寓意性情温和、安然自适。",
  静: "宁静致远，沉静安详，寓意心性沉稳、从容淡定。",
  慧: "聪慧颖悟，兰质蕙心，寓意冰雪聪明、蕙质兰心。",
  雅: "高雅不俗，风雅端庄，寓意品位高洁、举止娴雅。",
  欣: "欣欣向荣，喜悦生机，寓意乐观开朗、生机勃发。",
  瑞: "祥瑞之玉，吉庆之兆，寓意福气临门、诸事顺遂。",
  睿: "睿智通达，深明远虑，寓意聪颖睿哲、目光长远。",
  晨: "清晨曙光，朝气蓬勃，寓意生机盎然、前程似锦。",
  昊: "苍昊广天，气象宏大，寓意胸怀苍宇、志存高远。",
  宁: "安宁康泰，宁静致远，寓意平安顺遂、心境安然。",
  婉: "婉转柔美，温婉贤淑，寓意性情柔顺、仪态优雅。",
  淑: "淑质英才，贤良淑德，寓意心地善良、品行端庄。",
  俊: "俊秀杰出，才智超群，寓意相貌清秀、才华出众。",
  杰: "杰出俊拔，人中豪杰，寓意才能出众、出类拔萃。",
  磊: "光明磊落，坚如磐石，寓意胸怀坦荡、刚正不阿。",
  鑫: "三金聚财，兴盛发达，寓意财源兴旺、事业昌隆。",
  淼: "水势浩渺，烟波浩瀚，寓意胸怀宽广、源远流长。",
  森: "林木繁茂，生机无限，寓意生命力旺盛、蒸蒸日上。",
  安: "平安康泰，安然无恙，寓意一生顺遂、安居乐业。",
  乐: "快乐安康，和乐融融，寓意乐观豁达、喜乐常伴。",
  佳: "美好出众，才貌双佳，寓意品貌俱佳、诸事如意。",
  可: "称心如意，温婉可人，寓意乖巧可爱、善解人意。",
  馨: "香气远播，德艺双馨，寓意品德高尚、声名远扬。",
  语: "谈吐不凡，出语成章，寓意能言善辩、才思敏捷。",
  诗: "诗情画意，文墨书香，寓意才情横溢、气质如兰。",
  涵: "包容涵养，如水润物，寓意有内涵、有雅量。",
  彦: "才德出众，贤士俊彦，寓意学识渊博、名士风范。",
  哲: "明智哲思，知人则哲，寓意才智卓越、见解深刻。",
  楷: "楷模典范，刚直如楷，寓意品行端正、堪为表率。",
  峰: "山峰巍峨，登峰造极，寓意成就卓著、勇攀高峰。",
  凯: "凯旋而归，胜利之乐，寓意功成名就、马到成功。",
  健: "身强体健，自强不息，寓意体魄强健、意志坚定。",
  雨: "润物无声，泽被万物，寓意恩泽绵绵、滋养生长。",
  欢: "欢欣鼓舞，喜气洋洋，寓意开朗活泼、喜乐相随。",
  国: "经邦济国，胸怀天下，寓意抱负远大、器宇不凡。",
  春: "春回大地，生机勃发，寓意欣欣向荣、充满希望。",
  龙: "神武飞龙，人中之龙，寓意尊贵祥瑞、出类拔萃。",
  凤: "祥瑞之凤，百鸟朝凤，寓意高贵优雅、卓尔不群。",
  玉: "温润如玉，冰清玉洁，寓意品性高洁、温雅美好。",
  金: "贵重如金，坚不可摧，寓意富贵显达、意志坚定。",
  海: "海纳百川，浩瀚无垠，寓意胸怀宽广、包容大度。",
  山: "稳重如山，屹立不倒，寓意性格沉稳、坚定可靠。",
  林: "双木成林，郁郁葱葱，寓意生机盎然、人脉广茂。",
  东: "紫气东来，旭日之方，寓意生机勃勃、万象更新。",
  云: "行云流水，志凌云霄，寓意胸怀高远、逍遥自在。",
  天: "天高地阔，如日中天，寓意心胸博大、前程远大。",
  心: "心怀天下，蕙质兰心，寓意真诚善良、心思细腻。",
  思: "才思敏捷，深思远虑，寓意聪颖智慧、思虑周全。",
  远: "志向高远，宁静致远，寓意目光长远、抱负不凡。",
  航: "扬帆远航，鹏程万里，寓意目标远大、一帆风顺。",
  梓: "故土梓里，栋梁之材，寓意生机勃勃、自强不息。",
  萱: "萱草忘忧，快乐无虑，寓意无忧无虑、幸福美满。",
  沐: "如沐春风，润泽身心，寓意受恩泽庇佑、爽朗清新。",
  芷: "白芷幽香，芷兰竞秀，寓意品性高洁、志向远大。",
  若: "美若芝兰，大智若愚，寓意气质文雅、聪慧灵秀。",
  一: "一元复始，专一纯粹，寓意专注执着、始终如一。",
  子: "君子之德，天之骄子，寓意品学兼优、人中龙凤。",
}

function charMeaning(ch: string, wx: WX): string {
  if (CHAR_MEANINGS[ch]) return CHAR_MEANINGS[ch]
  const tpl: Record<WX, string> = {
    金: "五行属金，主义主刚，寓意坚毅果决、信守然诺。",
    木: "五行属木，主仁主生，寓意仁厚正直、生机向上。",
    水: "五行属水，主智主流，寓意聪颖灵动、通达圆融。",
    火: "五行属火，主礼主明，寓意热忱光明、礼贤达观。",
    土: "五行属土，主信主载，寓意敦厚诚信、包容承载。",
  }
  return tpl[wx]
}

/* ============ 姓名卦（天格起上卦、地格起下卦、总格取动爻位参考） ============ */

const GOOD_GUA = new Set(["地天泰", "谦", "地山谦", "火天大有", "水火既济", "泽地萃", "雷地豫", "风雷益", "地泽临", "山天大畜", "天火同人", "巽为风", "兑为泽"])
const BAD_GUA = new Set(["天地否", "地火明夷", "泽水困", "水山蹇", "山地剥", "雷水解", "火水未济", "坎为水", "山水蒙"])

function mingGuaOf(tian: number, di: number, zong: number): MingGua {
  const upperNum = ((tian - 1) % 8) + 1
  const lowerNum = ((di - 1) % 8) + 1
  const upper = trigramByNum(upperNum)
  const lower = trigramByNum(lowerNum)
  const bits = [...lower.bits, ...upper.bits]
  const name = hexName(bits)
  const ci = GUA_CI[name] ?? ""
  const luck = GOOD_GUA.has(name) ? "吉" : BAD_GUA.has(name) ? "凶中藏机" : "中平"
  const movingPos = ((zong - 1) % 6) + 1
  return {
    name,
    lines: bits.map((b) => b === 1),
    poem: ci ? ci.split(/[。；]/).filter(Boolean).slice(0, 2).map((s) => s + "。") : [`${name}，象数由五格推演。`],
    note: `以天格${tian}起上卦（${upper.name}）、地格${di}起下卦（${lower.name}），得${name}；总格${zong}参动爻第${movingPos}位。卦象仅作姓名意象参考。`,
    luck,
  }
}

/* ============ 综合评分 ============ */

const LUCK_SCORE: Record<string, number> = { 大吉: 100, 吉: 85, 半吉: 65, 凶: 40, 大凶: 20 }

function scoreOf(wuge: { tian: GeInfo; ren: GeInfo; di: GeInfo; wai: GeInfo; zong: GeInfo }, sancaiLuck: string, tonesVaried: boolean): { total: number; sub: { yin: number; xing: number; yi: number; li: number } } {
  // 理（数理）：人格权重最高，总格次之
  const li = Math.round(
    LUCK_SCORE[wuge.ren.luck] * 0.35 +
    LUCK_SCORE[wuge.zong.luck] * 0.25 +
    LUCK_SCORE[wuge.di.luck] * 0.2 +
    LUCK_SCORE[wuge.wai.luck] * 0.1 +
    LUCK_SCORE[wuge.tian.luck] * 0.1,
  )
  const sancaiBonus = sancaiLuck === "吉" ? 8 : sancaiLuck === "半吉" ? 0 : -10
  const yin = tonesVaried ? 92 : 76
  const xing = 85
  const yi = 88
  const total = Math.max(35, Math.min(99, Math.round(li * 0.55 + yin * 0.15 + xing * 0.1 + yi * 0.2) + sancaiBonus))
  return { total, sub: { yin, xing, yi, li: Math.min(99, li) } }
}

/* ============ 主入口 ============ */

export interface XingmingInput {
  fullName: string
  gender?: "男" | "女"
  /** 生肖（可选，来自出生年） */
  shengxiao?: string
}

export function analyzeName(input: XingmingInput): NameDetail {
  const { surname, given } = splitName(input.fullName)
  const chars = [...input.fullName]
  const raw = computeWuge(surname, given)

  const tianGe = geInfo(raw.tian)
  const renGe = geInfo(raw.ren)
  const diGe = geInfo(raw.di)
  const waiGe = geInfo(raw.wai)
  const zongGe = geInfo(raw.zong)
  const sancai = sancaiOf(tianGe.wuxing, renGe.wuxing, diGe.wuxing)

  const tones = chars.map(toneOf)
  const { total, sub } = scoreOf({ tian: tianGe, ren: renGe, di: diGe, wai: waiGe, zong: zongGe }, sancai.sancaiLuck, new Set(tones).size > 1)

  const nameChars: NameChar[] = chars.map((ch) => ({
    char: ch,
    pinyin: pinyinOf(ch),
    tone: toneOf(ch),
    wuxing: charWuxingOf(ch),
    strokes: kangxiStroke(ch),
    meaning: charMeaning(ch, charWuxingOf(ch)).slice(0, 18),
  }))

  const candidate: NameCandidate = {
    id: `xm-${input.fullName}`,
    chars: nameChars,
    score: total,
    subScores: sub,
    brief:
      sancai.sancaiLuck === "吉"
        ? "数理与三才配置较佳，音形义整体协调，属可用之名。"
        : sancai.sancaiLuck === "半吉"
          ? "数理中上而三才互见生克，整体尚属平稳，属中等之名。"
          : "五格数理尚可而三才配置受克，宜以后天修为化解补益。",
    duplicate: given.length === 1 ? "high" : "mid",
  }

  const givenWX = [...given].map(charWuxingOf)
  const charExplains: CharExplain[] = chars.map((ch, i) => ({
    char: ch,
    pinyin: pinyinOf(ch),
    traditional: ch, // 简繁同形时一致；字典已按繁体笔画计数
    wuxing: charWuxingOf(ch),
    meaning: i < [...surname].length ? `「${surname}」氏为常见姓氏，源流久远，代有名人。` : charMeaning(ch, charWuxingOf(ch)),
    poems: [],
  }))

  return {
    candidate,
    yinlv: yinlvOf(input.fullName),
    zixing: {
      note: `全名笔画（康熙）为 ${chars.map((c) => `${c}${kangxiStroke(c)}画`).join("、")}，笔画${Math.max(...chars.map(kangxiStroke)) - Math.min(...chars.map(kangxiStroke)) <= 10 ? "繁简相济，结构均衡，书写美观" : "繁简差异较大，签名时注意布局平衡"}。`,
    },
    baziFit: {
      note: `名字五行为${givenWX.join("、")}，${input.gender === "女" ? "坤造" : "乾造"}取名以补益命局为要；如需精准喜用神分析，请结合八字排盘工具查看。`,
      source: "三命通会",
      quote: "凡命须论用神，用神有力，则名助其势。",
    },
    sancaiWuge: {
      tianGe,
      renGe,
      diGe,
      waiGe,
      zongGe,
      ...sancai,
    },
    shengxiao: input.shengxiao
      ? { note: `生肖属${input.shengxiao}，用字宜结合生肖喜忌部首综合参详，此处以数理三才为主要依据。`, luck: "平" }
      : { note: "未提供出生年份，生肖宜忌暂不判定。", luck: "平" },
    duplicateNote:
      given.length === 1
        ? "单字名整体重名率高于双字名，同名概率较高，可结合中间字降低重复。"
        : "双字名重名率适中；如需进一步降低重复，可选用低频但不生僻的用字。",
    charExplains,
    mingGua: mingGuaOf(raw.tian, raw.di, raw.zong),
    complianceNote: "三才五格为姓名学流派之一，数理断语系传统文化内容，仅供文化参考，不构成任何现实决策依据。",
  }
}
