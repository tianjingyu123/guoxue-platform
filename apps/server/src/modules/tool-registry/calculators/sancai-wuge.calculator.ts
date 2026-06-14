// ── 三才五格姓名学计算引擎 ──
// 算法参考：《康熙字典》《五格剖象法》
// 基于《康熙字典》笔画检索、五格剖象法、三才配置论

import { estimateStrokeByUnicode } from "./helpers";

// ── 汉字笔画库（常用姓氏+名字用字） ──
const HANZI_STROKES: Record<string, number> = {
  // 常用姓氏
  "王": 4, "李": 7, "张": 11, "刘": 15, "陈": 16, "杨": 13, "黄": 12, "赵": 14, "周": 8, "吴": 7,
  "徐": 10, "孙": 10, "马": 10, "朱": 6, "胡": 11, "郭": 15, "何": 7, "高": 10, "林": 8, "罗": 19,
  "郑": 19, "梁": 11, "谢": 17, "宋": 7, "唐": 10, "许": 11, "韩": 17, "冯": 12, "邓": 19, "曹": 11,
  "彭": 12, "曾": 12, "萧": 19, "田": 5, "董": 15, "潘": 16, "袁": 10, "蔡": 17, "蒋": 17, "余": 7,
  "于": 3, "杜": 7, "叶": 15, "程": 12, "苏": 22, "魏": 18, "吕": 7, "丁": 2, "任": 6, "沈": 8,
  "姚": 9, "卢": 16, "姜": 9, "崔": 11, "钟": 20, "谭": 19, "陆": 16, "汪": 8, "范": 15,
  "廖": 14, "贾": 13, "韦": 9, "付": 5, "邹": 17, "熊": 14, "孟": 8, "白": 5,
  // 常见名字用字
  "一": 1, "二": 2, "三": 3, "四": 5, "五": 4, "六": 4, "七": 2, "八": 2, "九": 9, "十": 2,
  "文": 4, "明": 8, "华": 14, "国": 11, "强": 12, "伟": 11, "芳": 10, "敏": 11, "静": 16, "丽": 19,
  "英": 11, "杰": 8, "军": 9, "勇": 9, "玲": 10, "平": 5, "刚": 10, "秀": 7, "婷": 12, "洁": 16,
  "飞": 9, "波": 9, "涛": 18, "辉": 15, "建": 9, "宇": 6, "子": 3, "玉": 5, "志": 7,
  "慧": 15, "雪": 11, "琳": 13, "峰": 10, "晨": 11, "旭": 6, "鹏": 19, "斌": 11, "雨": 8, "云": 12,
  "天": 4, "地": 6, "春": 9, "秋": 9, "冬": 5, "花": 10, "草": 12, "山": 3, "川": 3,
  "金": 8, "银": 14, "铜": 14, "铁": 21, "木": 4, "水": 4, "火": 4, "土": 3,
  "龙": 16, "凤": 14, "虎": 8, "鹤": 21, "燕": 16, "莺": 21, "雁": 15,
  "仁": 4, "义": 13, "礼": 18, "智": 12, "信": 9, "忠": 8, "孝": 7, "诚": 14,
  "光": 6, "亮": 9, "星": 9, "月": 4, "日": 4, "阳": 17,
  "大": 3, "小": 3, "中": 4, "正": 5, "圆": 13, "长": 8, "安": 6,
  "乐": 15, "康": 11, "宁": 14, "和": 8, "兴": 16, "隆": 17, "昌": 8,
  "思": 9, "想": 13, "念": 8, "怡": 9, "悦": 11, "欢": 22, "喜": 12, "瑞": 14,
  "博": 12, "学": 16, "才": 4, "俊": 9, "豪": 14, "雄": 12,
  "宏": 7, "宽": 15, "广": 15, "达": 16, "通": 14, "顺": 12, "利": 7, "万": 15,
  "若": 11, "如": 6, "涵": 12, "淇": 12, "溪": 14, "海": 11, "洋": 10, "江": 7,
  "紫": 11, "萱": 15, "芙": 10, "蓉": 16, "兰": 23, "芝": 10, "莲": 17,
  "雯": 12, "霖": 16, "菲": 14, "萌": 14, "薇": 19, "蕾": 19, "蕊": 18,
};

// 五格五行对应（1-81数理五行）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SHULI_WUXING: Record<string, string> = {
  "1-1": "木", "2-2": "木", "3-10": "火", "4-10": "火", "5-10": "土", "6-10": "土",
  "7-10": "金", "8-10": "金", "9-10": "水", "10-10": "水",
};

function getShuLiWuXing(strokes: number): string {
  const t = strokes % 10;
  if (t === 1 || t === 2) return "木";
  if (t === 3 || t === 4) return "火";
  if (t === 5 || t === 6) return "土";
  if (t === 7 || t === 8) return "金";
  return "水";
}

// 三才配置吉凶（天格五行-人格五行-地格五行）
const SANCAI_JIXIONG: Record<string, { level: string; desc: string; career: string; health: string; family: string }> = {
  "木木木": { level: "大吉", desc: "三才配置极佳，如春木繁荣，欣欣向荣", career: "事业顺利，贵人扶持，可成大事", health: "身体强健，精力充沛", family: "家庭和睦，祖上有德" },
  "木木火": { level: "大吉", desc: "木火通明，成功发达之象", career: "名利双收，才智得以发挥", health: "心肺功能强健", family: "家运昌隆，子孙有出息" },
  "木火火": { level: "大吉", desc: "木火相生，顺调发展", career: "才华出众，容易得到赏识", health: "注意心火过旺", family: "家庭温暖和睦" },
  "木木土": { level: "大吉", desc: "木土相安，基础稳固", career: "稳步上升，不宜冒进", health: "脾胃健康", family: "家宅安宁" },
  "木木水": { level: "大吉", desc: "水木相生，智慧通达", career: "聪明才智得以发挥", health: "肾水充足", family: "家运如水源远流长" },
  "火火火": { level: "凶", desc: "三火相叠，过于刚猛", career: "大起大落，难以持久", health: "注意心血管疾病", family: "家运起伏不定" },
  "火火木": { level: "吉", desc: "木火通明之象", career: "才华得以施展", health: "体质偏热", family: "家庭和睦" },
  "火火土": { level: "吉", desc: "火土相生，根基渐固", career: "中年后运势上升", health: "注意消化系统", family: "家庭稳定" },
  "火土木": { level: "平", desc: "配置中等，有得有失", career: "劳有所获，需加倍努力", health: "肝胆需注意", family: "家运平稳" },
  "土土土": { level: "吉", desc: "三土厚重，稳重踏实", career: "脚踏实地，晚年有成", health: "注意湿气", family: "家运厚重持久" },
  "土土金": { level: "大吉", desc: "土生金，财源广进", career: "财运亨通，事业有成", health: "身体结实", family: "家境殷实" },
  "土金金": { level: "大吉", desc: "土金相生，财库丰盈", career: "经商有利，投资有回报", health: "呼吸系统强健", family: "家财富足" },
  "金金金": { level: "凶", desc: "三金过硬，刚极易折", career: "性格固执，人际关系紧张", health: "注意呼吸道", family: "家运刚强易断" },
  "金金土": { level: "吉", desc: "金土相生，刚柔并济", career: "事业稳定，有管理才能", health: "身体强健", family: "家运稳中有升" },
  "金土土": { level: "吉", desc: "金土相生，基础扎实", career: "稳扎稳打，事业有成", health: "体质良好", family: "家庭稳固" },
  "水水水": { level: "凶", desc: "三水泛滥，动荡不安", career: "漂泊不定，难有根基", health: "肾水过旺需注意", family: "家运漂泊" },
  "水水木": { level: "大吉", desc: "水木相生，智慧仁德", career: "才华横溢，仕途顺利", health: "精力充沛", family: "家运昌盛" },
  "水木木": { level: "大吉", desc: "水木清华，大吉大利", career: "事业蒸蒸日上", health: "体质强健", family: "家庭兴旺" },
  "水木火": { level: "大吉", desc: "水木火顺生，运势亨通", career: "名利双收，事事顺遂", health: "身体安康", family: "福泽绵长" },
  "火土金": { level: "大吉", desc: "火土金顺生，好运连连", career: "步步高升，前程似锦", health: "身体协调健康", family: "家运日益昌盛" },
};

// 81数理吉凶判断
const SHULI_JIXIONG: Record<number, { lucky: boolean; meaning: string; analysis: string }> = {
  1: { lucky: true, meaning: "大吉", analysis: "天地开泰，宇宙创始之象。万物起始，生机勃发，乃大吉之数。" },
  2: { lucky: false, meaning: "凶", analysis: "混沌未分，根基不固。分离破败，孤独之象，宜防损失。" },
  3: { lucky: true, meaning: "大吉", analysis: "三才之数，天地人和。进取向上，智慧通达，名利双收。" },
  4: { lucky: false, meaning: "凶", analysis: "四象不调，破坏之数。前途坎坷，万事难通，宜谨慎行事。" },
  5: { lucky: true, meaning: "大吉", analysis: "五行俱全，循环相生。福禄长寿，阴阳和合，家门昌隆。" },
  6: { lucky: true, meaning: "大吉", analysis: "六爻数，天德地祥。安稳吉庆，福寿绵长，万事如意。" },
  7: { lucky: true, meaning: "吉", analysis: "七政之数，刚毅果断。排除万难，精力旺盛，必获成功。" },
  8: { lucky: true, meaning: "大吉", analysis: "八卦之数，坚毅发展。意志坚定，勤勉有加，富贵荣华。" },
  9: { lucky: false, meaning: "凶", analysis: "九重天之象，终尽之数。万事尽头，黑暗无光，宜守不宜进。" },
  10: { lucky: false, meaning: "凶", analysis: "零暗之象，万事终局。空虚寂寞，暗淡无光，大凶之数。" },
  11: { lucky: true, meaning: "大吉", analysis: "旭日东升，万物更新。阴阳调和，家运昌盛，富贵繁荣。" },
  12: { lucky: false, meaning: "凶", analysis: "掘井无泉之象，薄弱无力。意志不坚，难成大业，宜防挫折。" },
  13: { lucky: true, meaning: "大吉", analysis: "春阳普照，万物生辉。智略超群，才艺出众，大有成功。" },
  14: { lucky: false, meaning: "凶", analysis: "浮沉不定，破败离散。六亲缘薄，骨肉分离，孤独之数。" },
  15: { lucky: true, meaning: "大吉", analysis: "福寿双全，慈祥有德。温和平安，福泽深厚，家门兴隆。" },
  16: { lucky: true, meaning: "大吉", analysis: "贵人相助，厚重威德。得人信服，兴旺发达，名望崇高。" },
  17: { lucky: true, meaning: "吉", analysis: "刚健不屈，权威显达。突破万难，意志坚定，终成大事。" },
  18: { lucky: true, meaning: "吉", analysis: "铁镜重磨，有志者成。顺水推舟，名利自来，发展顺利。" },
  19: { lucky: false, meaning: "凶", analysis: "风云蔽日，辛苦挫折。虽有才智，时常受阻，事倍功半。" },
  20: { lucky: false, meaning: "凶", analysis: "屋下藏金，非业破败。万事难成，进退维谷，大凶之数。" },
  21: { lucky: true, meaning: "大吉", analysis: "月照中天，万物分明。独立权威，首领风范，功成名就。" },
  22: { lucky: false, meaning: "凶", analysis: "秋草逢霜，困难重重。英雄气短，忧心忡忡，事不如意。" },
  23: { lucky: true, meaning: "大吉", analysis: "旭日东升，威势冲天。名扬四方，发展迅猛，功业辉煌。" },
  24: { lucky: true, meaning: "大吉", analysis: "家门余庆，财源广进。才智出众，白手起家，富贵平安。" },
  25: { lucky: true, meaning: "吉", analysis: "资性英敏，刚毅果断。才智超群，性情奇异，成功在望。" },
  26: { lucky: false, meaning: "凶", analysis: "变怪异数，波澜起伏。英雄豪杰多有，但人生多波折，宜防灾难。" },
  27: { lucky: false, meaning: "凶", analysis: "增长无穷，半吉半凶。智谋超群但意志不坚，得中有失。" },
  28: { lucky: false, meaning: "凶", analysis: "阔水浮萍，飘摇不定。骨肉分离，家运多难，常怀忧虑。" },
  29: { lucky: true, meaning: "吉", analysis: "智谋双全，财力兼备。志向远大，功名可得，但忌傲物。" },
  30: { lucky: false, meaning: "凶", analysis: "吉凶相伴，沉浮不定。得失兼半，成败交替，需谨慎把握。" },
  31: { lucky: true, meaning: "大吉", analysis: "智勇得志，博得名利。统御众人，繁荣兴旺，大成就之数。" },
  32: { lucky: true, meaning: "大吉", analysis: "幸运降临，惠泽丰厚。温和平安，贵人相助，家运昌盛。" },
  33: { lucky: true, meaning: "大吉", analysis: "旭日升天，鸾凤相会。名闻天下，事业顶峰，家庭幸福。" },
  34: { lucky: false, meaning: "凶", analysis: "破家亡身，灾祸不绝。骨肉分离，家破人亡，大凶之数。" },
  35: { lucky: true, meaning: "吉", analysis: "温和平安，优雅发展。技艺高超，文人雅士，谦和守成。" },
  36: { lucky: false, meaning: "凶", analysis: "风浪不静，波澜重叠。波折重重，难有安宁，宜防变故。" },
  37: { lucky: true, meaning: "大吉", analysis: "权威显达，猛虎出林。热诚忠信，得人信服，成就大事。" },
  38: { lucky: false, meaning: "凶", analysis: "意志薄弱，磨铁成针。有心无力，虽勤勉但收获微薄。" },
  39: { lucky: true, meaning: "大吉", analysis: "富贵长寿，云开月朗。光明正大，福寿双全，家运永昌。" },
  40: { lucky: false, meaning: "凶", analysis: "退安谨慎，浮沉不定。胆量不足，谋事难成，宜守不宜攻。" },
  41: { lucky: true, meaning: "大吉", analysis: "德望高大，事事如意。胆识过人，名誉崇高，众望所归。" },
  42: { lucky: false, meaning: "凶", analysis: "寒蝉在柳，十艺不成。博学多能但无一精通，庸碌无为。" },
  43: { lucky: false, meaning: "凶", analysis: "散财破产，雨夜之花。外表浮华，内里空虚，防破产之灾。" },
  44: { lucky: false, meaning: "凶", analysis: "隐藏不露，荒凉难耐。家运衰落，万事不如意，大凶之数。" },
  45: { lucky: true, meaning: "大吉", analysis: "新生泰运，顺风扬帆。智谋超群，一帆风顺，事业亨通。" },
  46: { lucky: false, meaning: "凶", analysis: "载宝沉舟，浪里淘金。虽有才华，但时运不济，多有坎坷。" },
  47: { lucky: true, meaning: "大吉", analysis: "开花结果，权威进取。天赋聪颖，步步高升，名利双全。" },
  48: { lucky: true, meaning: "吉", analysis: "德智兼备，鹤立鸡群。才德兼备，功成名就，名利双收。" },
  49: { lucky: false, meaning: "凶", analysis: "吉凶难分，得而复失。富贵皆浮云，守成为上，宜多行善。" },
  50: { lucky: false, meaning: "凶", analysis: "小舟入海，吉凶相伴。成败交替，有喜有忧，宜防患未然。" },
  51: { lucky: false, meaning: "凶", analysis: "盛衰不一，浮沉不定。一荣一枯，命运变化无常。" },
  52: { lucky: true, meaning: "吉", analysis: "卓见精明，先见之明。目光远大，理想高远，成功可期。" },
  53: { lucky: false, meaning: "凶", analysis: "外美内苦，心身过劳。外表光鲜，内里痛苦，需注意身心。" },
  54: { lucky: false, meaning: "凶", analysis: "石上栽花，虚无缥缈。表面繁荣，内里空虚，大凶之数。" },
  55: { lucky: false, meaning: "凶", analysis: "善恶相伴，吉凶难测。得失频繁，人生多艰，宜修心养性。" },
  56: { lucky: false, meaning: "凶", analysis: "缺乏实利，浪里行舟。缺乏实力，难有大成，宜退守安身。" },
  57: { lucky: true, meaning: "吉", analysis: "寒雪青松，凌霜傲雪。坚强不屈，终能成就，晚运尤佳。" },
  58: { lucky: false, meaning: "凶", analysis: "暮日凄凉，浮沉多端。起落不定，晚年多难，宜早积福。" },
  59: { lucky: false, meaning: "凶", analysis: "寒蝉悲风，时运不济。志向远大但时运不济，需有耐心。" },
  60: { lucky: false, meaning: "凶", analysis: "无谋争利，黑暗无光。内心迷茫，前途暗淡，大凶之数。" },
  61: { lucky: true, meaning: "大吉", analysis: "牡丹富贵，名声远播。花开富贵，名扬四海，家运昌盛。" },
  62: { lucky: false, meaning: "凶", analysis: "衰败之象，渐渐衰颓。基础不固，家运渐衰，宜防意外。" },
  63: { lucky: true, meaning: "大吉", analysis: "舟归平海，富贵荣华。万事如意，心想事成，富贵双全。" },
  64: { lucky: false, meaning: "凶", analysis: "骨肉分离，一生孤苦。六亲缘薄，孤独无依，晚运凄凉。" },
  65: { lucky: true, meaning: "大吉", analysis: "寿比南山，福寿绵长。家运昌隆，富泽子孙，万事如意。" },
  66: { lucky: false, meaning: "凶", analysis: "黑夜漫漫，进退维谷。前途黑暗，内心苦闷，宜多修行。" },
  67: { lucky: true, meaning: "大吉", analysis: "顺风扬帆，一切顺利。天赐福泽，万事亨通，富贵荣华。" },
  68: { lucky: true, meaning: "吉", analysis: "发明创新，兴家立业。头脑灵活，创新有力，家业兴旺。" },
  69: { lucky: false, meaning: "凶", analysis: "病弱富贵，动辄得咎。外强中干，易生变故，宜注意健康。" },
  70: { lucky: false, meaning: "凶", analysis: "废物灭亡，万事破败。家庭衰败，万事不成，大凶之数。" },
  71: { lucky: false, meaning: "凶", analysis: "石上望月，空欢喜一场。期望过高，不切实际，宜脚踏实地。" },
  72: { lucky: false, meaning: "凶", analysis: "先甜后苦，烦恼苦闷。前半生荣华，后半生落寞。" },
  73: { lucky: true, meaning: "吉", analysis: "志高无谋，自寻烦恼。有理想但缺乏执行力，宜务实。" },
  74: { lucky: false, meaning: "凶", analysis: "沉沦逆境，多灾多难。命运多舛，疾病缠身，大凶之数。" },
  75: { lucky: false, meaning: "凶", analysis: "保守之象，退守为安。欲进难进，宜守不宜攻，保守为上。" },
  76: { lucky: false, meaning: "凶", analysis: "倾覆离散，破败之象。骨肉离散，家破人亡，大凶之数。" },
  77: { lucky: false, meaning: "凶", analysis: "乐极生悲，吉凶相伴。前半生享乐，后半生悲苦。" },
  78: { lucky: false, meaning: "凶", analysis: "先兴后衰，晚景凄凉。少年得志，中年之后运势日下。" },
  79: { lucky: false, meaning: "凶", analysis: "欲速不达，出力不讨好。过于急进，事与愿违，宜稳扎稳打。" },
  80: { lucky: false, meaning: "凶", analysis: "终极之数，不得善终。万事尽头，难以善了，大凶之数。" },
  81: { lucky: true, meaning: "大吉", analysis: "万物回春，终而复始。吉气重来，最极之数，还本归元大吉。" },
};

// ── 本地类型 ──

interface WuGeItem {
  name: string;
  strokes: number;
  source: string;
  lucky: boolean;
  wuXing: string;
  analysis: string;
  meaning: string;
}

interface SanCaiWuGeConfig {
  tianGe: string;
  renGe: string;
  diGe: string;
  config: string;
  level: string;
  description: string;
  careerInfluence: string;
  healthInfluence: string;
  familyInfluence: string;
}

interface SanCaiWuGeResult {
  surname: string;
  givenName: string;
  totalStrokes: number;
  wuGe: WuGeItem[];
  sanCai: SanCaiWuGeConfig;
  score: number;
  summary: string;
}

// ── 辅助函数 ──

function getStrokes(char: string): number {
  if (HANZI_STROKES[char]) return HANZI_STROKES[char];
  // Unicode区间估算笔画兜底，不再使用 charCodeAt % N
  return estimateStrokeByUnicode(char);
}

function getShuLiInfo(strokes: number): { lucky: boolean; meaning: string; analysis: string } {
  if (strokes > 81) strokes = strokes - 81;
  if (strokes < 1) strokes = 1;
  return SHULI_JIXIONG[strokes] || { lucky: false, meaning: "待查", analysis: "数理未收录，建议参考81数理吉凶" };
}

function getSanCaiLevel(config: string): { level: string; desc: string; career: string; health: string; family: string } {
  // 查找精确匹配或相近配置
  const keys = Object.keys(SANCAI_JIXIONG);
  if (SANCAI_JIXIONG[config]) return SANCAI_JIXIONG[config];

  // 兜底：两层匹配
  for (const key of keys) {
    if (key.substring(0, 2) === config.substring(0, 2)) {
      return SANCAI_JIXIONG[key];
    }
  }

  return { level: "平", desc: "一般配置，无大吉无大凶", career: "事业需靠自身努力", health: "健康需注意调养", family: "家运平平" };
}

// ── 主计算 ──

export function calculateSanCaiWuGe(input: Record<string, unknown>): SanCaiWuGeResult {
  const surname = (input.surname as string) || "张";
  const givenName = (input.givenName as string) || "三";

  const surnameChars = [...surname];
  const givenNameChars = [...givenName];

  // 1. 计算各格笔画
  const surname1 = getStrokes(surnameChars[0]);
  const surname2 = surnameChars.length > 1 ? getStrokes(surnameChars[1]) : 0;
  const given1 = getStrokes(givenNameChars[0]);
  const given2 = givenNameChars.length > 1 ? getStrokes(givenNameChars[1]) : 0;

  const tianGe = surname1 + surname2 + 1; // 天格：姓笔画+1（单姓）
  const renGe = surname1 + given1;         // 人格：姓首字+名首字
  const diGe = given1 + given2;            // 地格：名首字+名次字
  const waiGe = surname2 + given2 + 1;     // 外格：天格+地格-人格（简化）
  const zongGe = surname1 + surname2 + given1 + given2; // 总格

  // 2. 五格分析
  const wuGe: WuGeItem[] = [
    {
      name: "天格", strokes: tianGe,
      source: `姓(${surname})笔画+1`,
      lucky: getShuLiInfo(tianGe).lucky,
      wuXing: getShuLiWuXing(tianGe),
      analysis: getShuLiInfo(tianGe).analysis,
      meaning: getShuLiInfo(tianGe).meaning,
    },
    {
      name: "人格", strokes: renGe,
      source: `姓首字(${surnameChars[0]}${surname1}画)+名首字(${givenNameChars[0]}${given1}画)`,
      lucky: getShuLiInfo(renGe).lucky,
      wuXing: getShuLiWuXing(renGe),
      analysis: getShuLiInfo(renGe).analysis,
      meaning: getShuLiInfo(renGe).meaning,
    },
    {
      name: "地格", strokes: diGe,
      source: `名(${givenName})笔画之和`,
      lucky: getShuLiInfo(diGe).lucky,
      wuXing: getShuLiWuXing(diGe),
      analysis: getShuLiInfo(diGe).analysis,
      meaning: getShuLiInfo(diGe).meaning,
    },
    {
      name: "外格", strokes: waiGe,
      source: "总格-人格+1（简化计）",
      lucky: getShuLiInfo(waiGe).lucky,
      wuXing: getShuLiWuXing(waiGe),
      analysis: getShuLiInfo(waiGe).analysis,
      meaning: getShuLiInfo(waiGe).meaning,
    },
    {
      name: "总格", strokes: zongGe,
      source: `全部姓名笔画之和`,
      lucky: getShuLiInfo(zongGe).lucky,
      wuXing: getShuLiWuXing(zongGe),
      analysis: getShuLiInfo(zongGe).analysis,
      meaning: getShuLiInfo(zongGe).meaning,
    },
  ];

  // 3. 三才配置
  const tianWuXing = getShuLiWuXing(tianGe);
  const renWuXing = getShuLiWuXing(renGe);
  const diWuXing = getShuLiWuXing(diGe);
  const sanCaiConfig = tianWuXing + renWuXing + diWuXing;
  const sanCaiDetail = getSanCaiLevel(sanCaiConfig);

  const sanCai: SanCaiWuGeConfig = {
    tianGe: tianWuXing,
    renGe: renWuXing,
    diGe: diWuXing,
    config: sanCaiConfig,
    level: sanCaiDetail.level,
    description: sanCaiDetail.desc,
    careerInfluence: sanCaiDetail.career,
    healthInfluence: sanCaiDetail.health,
    familyInfluence: sanCaiDetail.family,
  };

  // 4. 评分
  let score = 60;
  const luckyCount = wuGe.filter(g => g.lucky).length;

  if (sanCai.level === "大吉") score += 20;
  else if (sanCai.level === "吉") score += 10;
  else if (sanCai.level === "凶" || sanCai.level === "大凶") score -= 15;

  score += (luckyCount - 2) * 5;
  score = Math.max(5, Math.min(98, score));

  // 5. 总结
  const totalStrokes = zongGe;
  const scoreBar = "█".repeat(Math.round(score / 100 * 10)) + "░".repeat(10 - Math.round(score / 100 * 10));

  const summary = [
    "┌─ 三才五格姓名学 ───────────────────┐",
    `│ 姓名：${surname}${givenName}（总${totalStrokes}画）`.padEnd(36) + "│",
    "├─ 五格数理 ─────────────────────────┤",
    ...wuGe.map(g => `│ ${g.name}：${g.strokes}画（${g.wuXing}/${g.meaning}）`.padEnd(36) + "│"),
    "├─ 三才配置 ─────────────────────────┤",
    `│ ${sanCaiConfig}（${sanCai.level}）`.padEnd(36) + "│",
    `│ ${sanCaiDetail.desc.slice(0, 30)}`.padEnd(36) + "│",
    `│ 事业：${sanCaiDetail.career.slice(0, 26)}`.padEnd(36) + "│",
    `│ 家庭：${sanCaiDetail.family.slice(0, 26)}`.padEnd(36) + "│",
    "├─ 综合评分 ─────────────────────────┤",
    `│ 总分：${score}/100 [${scoreBar}] 吉格${luckyCount}/5`.padEnd(36) + "│",
    "├─ 出处 ─────────────────────────────┤",
    "│ 《康熙字典》《五格剖象法》          │",
    "└────────────────────────────────────┘",
  ].join("\n");

  return { surname, givenName, totalStrokes, wuGe, sanCai, score, summary };
}
