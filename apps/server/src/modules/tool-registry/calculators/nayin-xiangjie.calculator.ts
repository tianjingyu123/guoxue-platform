// ── 六十甲子纳音详解计算引擎 ──
// 《协纪辨方书》《三命通会》《渊海子平》纳音篇
// 六十甲子配三十纳音，每纳音含意象/生克/应用/古籍参考

import type { NayinXiangJieInput, NayinXiangJieResult, NayinItem } from "@guoxue/shared";

// 天干地支基础数据
const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 六十甲子纳音速查表
const NA_YIN_MAP: Record<string, string> = {
  "甲子":"海中金","乙丑":"海中金","丙寅":"炉中火","丁卯":"炉中火",
  "戊辰":"大林木","己巳":"大林木","庚午":"路旁土","辛未":"路旁土",
  "壬申":"剑锋金","癸酉":"剑锋金","甲戌":"山头火","乙亥":"山头火",
  "丙子":"涧下水","丁丑":"涧下水","戊寅":"城头土","己卯":"城头土",
  "庚辰":"白蜡金","辛巳":"白蜡金","壬午":"杨柳木","癸未":"杨柳木",
  "甲申":"泉中水","乙酉":"泉中水","丙戌":"屋上土","丁亥":"屋上土",
  "戊子":"霹雳火","己丑":"霹雳火","庚寅":"松柏木","辛卯":"松柏木",
  "壬辰":"长流水","癸巳":"长流水","甲午":"沙中金","乙未":"沙中金",
  "丙申":"山下火","丁酉":"山下火","戊戌":"平地木","己亥":"平地木",
  "庚子":"壁上土","辛丑":"壁上土","壬寅":"金箔金","癸卯":"金箔金",
  "甲辰":"覆灯火","乙巳":"覆灯火","丙午":"天河水","丁未":"天河水",
  "戊申":"大驿土","己酉":"大驿土","庚戌":"钗钏金","辛亥":"钗钏金",
  "壬子":"桑柘木","癸丑":"桑柘木","甲寅":"大溪水","乙卯":"大溪水",
  "丙辰":"沙中土","丁巳":"沙中土","戊午":"天上火","己未":"天上火",
  "庚申":"石榴木","辛酉":"石榴木","壬戌":"大海水","癸亥":"大海水",
};

// 纳音五行映射
const NA_YIN_WU_XING: Record<string, string> = {
  "海中金":"金","剑锋金":"金","白蜡金":"金","沙中金":"金","金箔金":"金","钗钏金":"金",
  "炉中火":"火","山头火":"火","霹雳火":"火","山下火":"火","覆灯火":"火","天上火":"火",
  "大林木":"木","杨柳木":"木","松柏木":"木","平地木":"木","桑柘木":"木","石榴木":"木",
  "涧下水":"水","泉中水":"水","长流水":"水","天河水":"水","大溪水":"水","大海水":"水",
  "路旁土":"土","城头土":"土","壁上土":"土","屋上土":"土","大驿土":"土","沙中土":"土",
};

// 纳音详细数据库（30种）
const NA_YIN_DB: Record<string, Omit<NayinItem, "pairs">> = {
  "海中金": {
    name: "海中金", shortName: "海中",
    wuXing: "金",
    imagery: "深藏海底之金，需经淘炼方显光华",
    jiXiong: "吉",
    detail: "甲子乙丑海中金者，子属水，丑藏金库。金生于水，藏于库中，如金沉海底，需火炼方成器。命带海中金者，内涵深厚、城府深沉，不宜锋芒毕露，待时而动方能大展宏图。",
    shengKe: "喜火炼（炉中火/天上火），忌水多沉埋",
    applications: ["命理分析", "择日参考", "取名用字", "五行补益"],
  },
  "炉中火": {
    name: "炉中火", shortName: "炉中",
    wuXing: "火",
    imagery: "炉中冶炼之火，热烈专注而不外溢",
    jiXiong: "吉",
    detail: "丙寅丁卯炉中火者，寅为三阳，卯为四阳。火得木生，炉火通红。命带炉中火者，热情专注、执行力强，适合工技、制造、烹饪等行业。唯须防火炎太过，须有水济方成既济之功。",
    shengKe: "喜木生（大林木/松柏木），忌水多熄灭",
    applications: ["命理分析", "事业方向", "五行补益"],
  },
  "大林木": {
    name: "大林木", shortName: "大林",
    wuXing: "木",
    imagery: "茂密森林之木，根深叶茂，生机盎然",
    jiXiong: "吉",
    detail: "戊辰己巳大林木者，辰为水库土，巳为火地。木得水土滋养，枝繁叶茂。命带大林木者，根基深厚、包容力强，适合教育、林业、生态、文化等需要深厚积累的行业。",
    shengKe: "喜水滋养（涧下水/长流水），忌金多砍伐",
    applications: ["命理分析", "取名用字", "事业方向"],
  },
  "路旁土": {
    name: "路旁土", shortName: "路旁",
    wuXing: "土",
    imagery: "大路旁侧之土，承载往来、默默无闻",
    jiXiong: "平",
    detail: "庚午辛未路旁土者，午为火旺之地，未为木库。土得火生而坚实，如道路之土承载万钧。命带路旁土者，踏实稳重、任劳任怨，适合基建、交通、物流等基础行业。须防格局平庸，宜借木疏土。",
    shengKe: "喜火生（炉中火/天上火），忌木多克伐",
    applications: ["命理分析", "五行补益"],
  },
  "剑锋金": {
    name: "剑锋金", shortName: "剑锋",
    wuXing: "金",
    imagery: "宝剑之锋，锐利无匹，寒气逼人",
    jiXiong: "吉",
    detail: "壬申癸酉剑锋金者，申酉为金之正位。金得水淬，锋锐无比。命带剑锋金者，刚毅果断、锐气十足，适合军警、法务、外科、纪律检查等需要决断力的行业。须防水多沉溺。",
    shengKe: "喜火炼（炉中火），忌水多金沉",
    applications: ["命理分析", "事业方向", "五行补益"],
  },
  "山头火": {
    name: "山头火", shortName: "山头",
    wuXing: "火",
    imagery: "山顶野火，燎原之势，不可阻挡",
    jiXiong: "平",
    detail: "甲戌乙亥山头火者，戌为火库，亥为木地。火得木生而冲天，如山头烈焰。命带山头火者，热情奔放、感染力强，适合演艺、销售、推广等需要表现力的行业。须防水多浇灭、土多掩火。",
    shengKe: "喜木生（松柏木/平地木），忌水土过多",
    applications: ["命理分析", "事业方向"],
  },
  "涧下水": {
    name: "涧下水", shortName: "涧下",
    wuXing: "水",
    imagery: "山涧清泉，细水长流，清澈纯净",
    jiXiong: "吉",
    detail: "丙子丁丑涧下水者，子为正北水旺之地，丑为金库。金生水而清冽，如山涧溪泉。命带涧下水者，心思清明、善于沟通，适合写作、翻译、心理咨询、水利等行业。",
    shengKe: "喜金生（剑锋金/钗钏金），忌土多淤堵",
    applications: ["命理分析", "取名用字", "五行补益"],
  },
  "城头土": {
    name: "城头土", shortName: "城头",
    wuXing: "土",
    imagery: "城墙之土，坚固巍峨，守护一方",
    jiXiong: "吉",
    detail: "戊寅己卯城头土者，寅为木旺，卯为木盛。木克土而土愈固，如城墙经历风雨而不倒。命带城头土者，稳重可靠、忠诚守信，适合管理、安保、政府等需要责任感的行业。",
    shengKe: "喜火生（霹雳火/覆灯火），忌木多克伐",
    applications: ["命理分析", "事业方向"],
  },
  "白蜡金": {
    name: "白蜡金", shortName: "白蜡",
    wuXing: "金",
    imagery: "白蜡包裹之金，温润有光，细腻柔和",
    jiXiong: "吉",
    detail: "庚辰辛巳白蜡金者，辰为水库，巳为火地。金得水土，外柔内刚。命带白蜡金者，外表温和、内心坚定，适合珠宝、金融、咨询、教师等需要耐心和精准的行业。",
    shengKe: "喜火炼（炉中火/山下火），忌水多金沉",
    applications: ["命理分析", "取名用字", "五行补益"],
  },
  "杨柳木": {
    name: "杨柳木", shortName: "杨柳",
    wuXing: "木",
    imagery: "杨柳依依，柔韧多姿，随风而舞",
    jiXiong: "平",
    detail: "壬午癸未杨柳木者，午为火旺，未为木库。木得火生而柔美，如杨柳随风。命带杨柳木者，柔韧善变、适应力强，适合外交、演艺、设计等需要灵活性的行业。须防无根飘摇。",
    shengKe: "喜水滋养（涧下水/天河水），忌金多砍伐",
    applications: ["命理分析", "事业方向"],
  },
  "泉中水": {
    name: "泉中水", shortName: "泉中",
    wuXing: "水",
    imagery: "地下泉眼之水，源头活水，生生不息",
    jiXiong: "吉",
    detail: "甲申乙酉泉中水者，申为金旺，酉为金盛。金生水而源源不绝，如泉眼涌流。命带泉中水者，智慧深藏、灵感不断，适合科研、发明、教育、文化等需要灵感的行业。",
    shengKe: "喜金生（剑锋金/钗钏金），忌土多淤塞",
    applications: ["命理分析", "取名用字", "五行补益"],
  },
  "屋上土": {
    name: "屋上土", shortName: "屋上",
    wuXing: "土",
    imagery: "屋瓦之土，遮风挡雨，庇护安居",
    jiXiong: "平",
    detail: "丙戌丁亥屋上土者，戌为火库，亥为水地。土得火生而坚固，如屋瓦遮风挡雨。命带屋上土者，顾家爱家、责任心强，适合建筑、房产、家居等行业。须防水土流失。",
    shengKe: "喜火生（天上火/覆灯火），忌木多松动",
    applications: ["命理分析", "五行补益"],
  },
  "霹雳火": {
    name: "霹雳火", shortName: "霹雳",
    wuXing: "火",
    imagery: "雷电霹雳之火，瞬间爆发，惊天动地",
    jiXiong: "平",
    detail: "戊子己丑霹雳火者，子为正北，丑为东北。阴阳相激而雷电生，如霹雳惊雷。命带霹雳火者，爆发力强、敢作敢为，适合创业、投资、竞技等需要胆识的行业。须防来快去快、后继乏力。",
    shengKe: "喜木生（松柏木/平地木），忌水多熄灭",
    applications: ["命理分析", "事业方向"],
  },
  "松柏木": {
    name: "松柏木", shortName: "松柏",
    wuXing: "木",
    imagery: "松柏常青，傲雪凌霜，坚贞不屈",
    jiXiong: "吉",
    detail: "庚寅辛卯松柏木者，寅卯为木之正位，金克木而木愈坚。如松柏经霜雪而不凋。命带松柏木者，坚韧不拔、品格高尚，适合学术、文化艺术、园林植物等需要持之以恒的行业。",
    shengKe: "喜水滋养（涧下水/大溪水），忌金多砍伐过度",
    applications: ["命理分析", "取名用字", "事业方向", "五行补益"],
  },
  "长流水": {
    name: "长流水", shortName: "长流",
    wuXing: "水",
    imagery: "长流不息之水，浩浩荡荡，永不枯竭",
    jiXiong: "吉",
    detail: "壬辰癸巳长流水者，辰为水库，巳为火地。水得库藏而源源不断，如长江大河。命带长流水者，持之不懈、永不放弃，适合科研、长线投资、水利、航运等需要持久力的行业。",
    shengKe: "喜金生（剑锋金/白蜡金），忌土多壅塞",
    applications: ["命理分析", "取名用字", "五行补益"],
  },
  "沙中金": {
    name: "沙中金", shortName: "沙中",
    wuXing: "金",
    imagery: "沙中淘金，千淘万漉，方得真金",
    jiXiong: "吉",
    detail: "甲午乙未沙中金者，午为火旺，未为木库。金经火炼木磨而成器，如沙中淘金。命带沙中金者，大器晚成、经验丰富，宜深耕细分领域，终有所成。",
    shengKe: "喜火炼（炉中火/山头火），忌水多沉埋",
    applications: ["命理分析", "事业方向", "五行补益"],
  },
  "山下火": {
    name: "山下火", shortName: "山下",
    wuXing: "火",
    imagery: "山下照明之火，温暖一隅，不事张扬",
    jiXiong: "平",
    detail: "丙申丁酉山下火者，申酉为金旺。金能生水，火被水制而温驯，如山脚灯火。命带山下火者，温和守分、知足常乐，适合服务、护理、教育等助人行业。",
    shengKe: "喜木生（大林木/桑柘木），忌水多熄灭",
    applications: ["命理分析", "五行补益"],
  },
  "平地木": {
    name: "平地木", shortName: "平地",
    wuXing: "木",
    imagery: "平原之木，一望无际，郁葱成林",
    jiXiong: "吉",
    detail: "戊戌己亥平地木者，戌为火库，亥为水地。木得水土而繁茂，如平原森林。命带平地木者，包容广大、心胸开阔，适合管理、教育、生态等需要格局的行业。",
    shengKe: "喜水滋养（涧下水/大溪水），忌金多砍伐",
    applications: ["命理分析", "取名用字", "事业方向"],
  },
  "壁上土": {
    name: "壁上土", shortName: "壁上",
    wuXing: "土",
    imagery: "墙壁之土，分隔内外，自成一体",
    jiXiong: "平",
    detail: "庚子辛丑壁上土者，子水丑土。水土相混而为壁，如墙壁分隔空间。命带壁上土者，界限分明、原则性强，适合法律、审计、质检等需要规则意识的行业。",
    shengKe: "喜火生（霹雳火/覆灯火），忌木多松动",
    applications: ["命理分析", "事业方向"],
  },
  "金箔金": {
    name: "金箔金", shortName: "金箔",
    wuXing: "金",
    imagery: "金箔装饰之金，华贵亮丽，锦上添花",
    jiXiong: "吉",
    detail: "壬寅癸卯金箔金者，寅卯为木旺。金被木包裹而华美，如金箔贴饰。命带金箔金者，审美高雅、品位独特，适合设计、艺术、奢侈品、品牌管理等彰显品位的行业。",
    shengKe: "喜火炼点（炉中火/覆灯火），忌水多损华",
    applications: ["命理分析", "取名用字", "事业方向", "五行补益"],
  },
  "覆灯火": {
    name: "覆灯火", shortName: "覆灯",
    wuXing: "火",
    imagery: "灯罩覆盖之火，光亮内敛，照夜不熄",
    jiXiong: "吉",
    detail: "甲辰乙巳覆灯火者，辰为水库，巳为火地。水制火而有光，如灯罩覆火。命带覆灯火者，内秀聪慧、暗夜明灯，适合研发、写作、策划、导演等幕后创作类工作。",
    shengKe: "喜木生（大林木/松柏木），忌水多熄灭",
    applications: ["命理分析", "事业方向", "五行补益"],
  },
  "天河水": {
    name: "天河水", shortName: "天河",
    wuXing: "水",
    imagery: "银河之水，浩瀚无垠，星光灿烂",
    jiXiong: "吉",
    detail: "丙午丁未天河水者，午未为火旺之地。火旺水腾而为天河，如银河落九天。命带天河水者，志向远大、格局高远，适合理工、科技、航天、哲学等仰望星空的行业。",
    shengKe: "喜金生（剑锋金/钗钏金），忌土多壅塞",
    applications: ["命理分析", "取名用字", "五行补益"],
  },
  "大驿土": {
    name: "大驿土", shortName: "大驿",
    wuXing: "土",
    imagery: "驿道大路之土，通衢大道，四通八达",
    jiXiong: "吉",
    detail: "戊申己酉大驿土者，申酉为金旺。土生金而疏松，如驿道通达。命带大驿土者，广结善缘、人脉广阔，适合贸易、物流、外交、旅游等需要广泛联系的行业。",
    shengKe: "喜火生（天上火/炉中火），忌木多松动",
    applications: ["命理分析", "事业方向"],
  },
  "钗钏金": {
    name: "钗钏金", shortName: "钗钏",
    wuXing: "金",
    imagery: "首饰钗钏之金，华美精致，璀璨夺目",
    jiXiong: "吉",
    detail: "庚戌辛亥钗钏金者，戌为火库，亥为水地。金经火炼水淬而精美，如钗钏首饰。命带钗钏金者，追求完美、精益求精，适合珠宝、钟表、奢侈品、精密制造等需要极致工艺的行业。",
    shengKe: "喜火炼（炉中火/覆灯火），忌水多损光",
    applications: ["命理分析", "取名用字", "事业方向", "五行补益"],
  },
  "桑柘木": {
    name: "桑柘木", shortName: "桑柘",
    wuXing: "木",
    imagery: "桑树柘树之木，养蚕喂蚕，利泽万民",
    jiXiong: "吉",
    detail: "壬子癸丑桑柘木者，子为水旺，丑为金库。水得金生而滋养桑柘，如桑田养蚕。命带桑柘木者，乐于奉献、利他心强，适合农业、教育、公益、医疗等服务型行业。",
    shengKe: "喜水滋养（涧下水/大溪水），忌金多砍伐",
    applications: ["命理分析", "取名用字", "事业方向"],
  },
  "大溪水": {
    name: "大溪水", shortName: "大溪",
    wuXing: "水",
    imagery: "大溪之水，奔腾向前，势不可挡",
    jiXiong: "平",
    detail: "甲寅乙卯大溪水者，寅卯为木旺之地。木泄水气而水势奔涌，如大溪奔流。命带大溪水者，行动力强、一往无前，适合创业、投资、竞技等需要冲劲的行业。须防水流太急、难以沉淀。",
    shengKe: "喜金生（剑锋金/沙中金），忌土多壅塞",
    applications: ["命理分析", "事业方向", "五行补益"],
  },
  "沙中土": {
    name: "沙中土", shortName: "沙中",
    wuXing: "土",
    imagery: "沙中藏土，看似松散，实有根基",
    jiXiong: "平",
    detail: "丙辰丁巳沙中土者，辰为水库，巳为火地。水土相杂而为沙土，如沙漠之中藏有绿洲。命带沙中土者，外表平常内有乾坤，宜深入发掘自身潜力，不可被表面所迷惑。",
    shengKe: "喜火生（天上火/覆灯火），忌木多松动",
    applications: ["命理分析", "五行补益"],
  },
  "天上火": {
    name: "天上火", shortName: "天上",
    wuXing: "火",
    imagery: "烈日当空，光芒万丈，普照大地",
    jiXiong: "吉",
    detail: "戊午己未天上火者，午为火旺极处，未为火之余气。火炎于天，如烈日当空。命带天上火者，志向高远、光芒四射，适合领导、演艺、公众人物等需要影响力的行业。须防光芒太盛、灼伤自身。",
    shengKe: "喜木生（平地木/石榴木），忌水多熄灭（天河水不相忌）",
    applications: ["命理分析", "事业方向", "五行补益"],
  },
  "石榴木": {
    name: "石榴木", shortName: "石榴",
    wuXing: "木",
    imagery: "石榴之木，多子多福，硕果累累",
    jiXiong: "吉",
    detail: "庚申辛酉石榴木者，申酉为金旺之地。金克木而木结实，如石榴多子。命带石榴木者，后代昌盛、成果丰硕，适合农业、教育、科研等需要长期培育的行业，晚年福泽深厚。",
    shengKe: "喜水滋养（泉中水/长流水），忌金多砍伐过度",
    applications: ["命理分析", "取名用字", "事业方向", "五行补益"],
  },
  "大海水": {
    name: "大海水", shortName: "大海",
    wuXing: "水",
    imagery: "汪洋大海，浩瀚无边，包容万象",
    jiXiong: "吉",
    detail: "壬戌癸亥大海水者，戌亥为天门水归之地。万水归海而不溢，如大海纳百川。命带大海水者，胸怀宽广、包容万物，适合外交、贸易、管理、海洋等需要大格局的行业。",
    shengKe: "喜金生（钗钏金/剑锋金），忌土多填海",
    applications: ["命理分析", "取名用字", "五大补益"],
  },
};

// 纳音生克关系
function getShengKeRelation(targetWx: string): Record<string, string> {
  const wx = ["金","木","水","火","土"];
  const sheng: Record<string, string> = { "金":"水","水":"木","木":"火","火":"土","土":"金" };
  const ke: Record<string, string> = { "金":"木","木":"土","土":"水","水":"火","火":"金" };
  const beiSheng: Record<string, string> = { "水":"金","木":"水","火":"木","土":"火","金":"土" };
  const beiKe: Record<string, string> = { "木":"金","土":"木","水":"土","火":"水","金":"火" };

  const relations: Record<string, string> = {};
  for (const w of wx) {
    if (w === targetWx) { relations[w] = "同类"; continue; }
    const items: string[] = [];
    if (sheng[targetWx] === w) items.push(`我生${w}`);
    if (ke[targetWx] === w) items.push(`我克${w}`);
    if (beiSheng[targetWx] === w) items.push(`${w}生我`);
    if (beiKe[targetWx] === w) items.push(`${w}克我`);
    relations[w] = items.join("，") || "无关";
  }
  return relations;
}

export function calculateNayinXiangJie(input: NayinXiangJieInput): NayinXiangJieResult {
  const mode = input.mode || (input.ganZhi || input.gan ? "single" : "all");

  // 确定目标干支
  const target = input.ganZhi || (input.gan && input.zhi ? input.gan + input.zhi : undefined);

  if (mode === "single" && target) {
    const nayinName = NA_YIN_MAP[target];
    if (!nayinName) {
      return {
        mode: "single",
        target,
        analysis: `未找到干支 "${target}" 的纳音信息。请输入有效的六十甲子干支，如"甲子"、"丙寅"等。`,
      };
    }
    const db = NA_YIN_DB[nayinName];
    const wx = NA_YIN_WU_XING[nayinName];
    const shengKe = getShengKeRelation(wx);

    const matched: NayinItem = {
      pairs: target,
      name: nayinName,
      shortName: db.shortName,
      wuXing: wx,
      imagery: db.imagery,
      jiXiong: db.jiXiong,
      detail: db.detail,
      shengKe: Object.entries(shengKe).map(([w, r]) => `${w}:${r}`).join("；"),
      applications: db.applications,
    };

    const otherPairs = Object.entries(NA_YIN_MAP)
      .filter(([k, v]) => v === nayinName && k !== target)
      .map(([k]) => k);

    const analysis = [
      `【纳音详解】${target} → ${nayinName}（${wx}）`,
      ``,
      `意象：${db.imagery}`,
      `吉凶：${db.jiXiong}`,
      ``,
      `├─ 详细解读 ─────────────────`,
      `│ ${db.detail}`,
      ``,
      `├─ 五行关系 ─────────────────`,
      ...Object.entries(shengKe).map(([w, r]) => `│ · ${w} → ${r}`),
      ``,
      `├─ 配对干支 ─────────────────`,
      `│ ${[target, ...otherPairs].join("、")}`,
      ``,
      `├─ 应用场景 ─────────────────`,
      ...db.applications.map((a: string, i: number) => `│ ${i + 1}. ${a}`),
      ``,
      `├─ 古籍参考 ─────────────────`,
      `│ 《三命通会·纳音篇》：「甲子乙丑，金沉海底；丙寅丁卯，火在炉中。」`,
      `│ 《渊海子平》：「纳音取象，乃圣人观物取义之法。」`,
      `│ 《协纪辨方书》：「六十甲子纳音，五行之精微也。」`,
      ``,
      `└─ 总结 ─────────────────`,
      `   命带${nayinName}之人，${db.detail.substring(0, 60)}`,
      ``,
      `纳音之法，乃古人以物象配干支，推五行之精微。明纳音之义，则命局之底蕴自现。`,
    ].join("\n");

    return { mode: "single", target, matched, analysis };
  }

  // all 模式：返回完整速查表（按五行分组）
  const byWx: Record<string, NayinItem[]> = { "金":[],"木":[],"水":[],"火":[],"土":[] };

  // 按纳音名去重（每纳音取第一对干支为代表）
  const seenNayin = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const gz = GAN[i % 10] + ZHI[i % 12];
    const nayinName = NA_YIN_MAP[gz];
    if (!nayinName) continue;
    const wx = NA_YIN_WU_XING[nayinName];
    if (input.filterWx && wx !== input.filterWx) continue;
    if (!seenNayin.has(nayinName)) {
      seenNayin.add(nayinName);
      const db = NA_YIN_DB[nayinName];
      if (!db) continue;
      const shengKe = getShengKeRelation(wx);
      const pairs = Object.entries(NA_YIN_MAP)
        .filter(([, v]) => v === nayinName)
        .map(([k]) => k)
        .join(" ");
      byWx[wx]?.push({
        pairs,
        name: nayinName,
        shortName: db.shortName,
        wuXing: wx,
        imagery: db.imagery,
        jiXiong: db.jiXiong,
        detail: db.detail,
        shengKe: Object.entries(shengKe).map(([w, r]) => `${w}:${r}`).join("；"),
        applications: db.applications,
      });
    }
  }

  const analysis = [
    `【六十甲子纳音速查表】`,
    ``,
    `纳音五行共30组，分属金、木、水、火、土五行，每组纳音配两个干支。`,
    `纳音取象法为命理学之基础，六十甲子纳音为五行之精微。`,
    ``,
    ...Object.entries(byWx).map(([wx, items]) =>
      [
        `┌─ ${wx}行纳音（${items.length}组） ─────────────────`,
        ...items.map(item =>
          `│ · ${item.name}（${item.shortName}）[${item.jiXiong}]：${item.pairs}`
        ),
        ``,
      ].join("\n")
    ),
    `└─ 古籍参考 ─────────────────`,
    `    《三命通会·纳音篇》`,
    `    《渊海子平·纳音章》`,
    `    《协纪辨方书·五行纳音》`,
    ``,
    `纳音之法，圣人观物取义而立。三十纳音配六十甲子，五行各六，阴阳各半。`,
    `知纳音五行则知物象之精微，明命局之底蕴也。`,
  ].join("\n");

  return { mode: "all", lookupTable: byWx, analysis };
}
