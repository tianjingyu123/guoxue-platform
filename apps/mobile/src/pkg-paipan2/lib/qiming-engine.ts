// ─── 周易起名引擎 ───
// 流程：computeBazi 得喜用神 → 字库按喜用五行/风格/性别筛选 →
//       组合成名 → computeWuge 三才五格评分 + 音律评分 → 取 Top N
// 复用：lib/bazi-engine.ts（四柱/喜用）、lib/yijing/xingming-engine.ts（康熙笔画/五格）

import { pinyinNum, pinyinSymbol } from "./pinyin-lite"
import { computeBazi, type BaziData } from "./bazi-engine"
import { kangxiStroke, charWuxingOf, computeWuge, shuliLuckOf, sancaiLuckOf, shuliWuxing } from "./xingming-engine"
import { assessCharForZodiac, zodiacNamingNote } from "./shengxiao-naming"
import type { NameCandidate, NameChar } from "./qiming-data"

type WX = "金" | "木" | "水" | "火" | "土"
type Style = "classic" | "steady" | "fresh" | "auspicious"
type GenderFit = "m" | "f" | "u" // 男/女/通用

/* ============ 精选起名字库 ============ */
// 每字：字义、风格标签、性别倾向、可选诗词出处。五行与笔画由字典实时查询。
interface PoolChar {
  char: string
  meaning: string
  styles: Style[]
  fit: GenderFit
  poem?: { source: string; quote: string }
}

const CHAR_POOL: PoolChar[] = [
  // ── 木 ──
  { char: "林", meaning: "树木成林，生机繁盛", styles: ["classic", "steady"], fit: "u", poem: { source: "诗经 · 邶风", quote: "瞻彼中林，甡甡其鹿" } },
  { char: "森", meaning: "林木茂密，气象宏大", styles: ["steady"], fit: "m" },
  { char: "楷", meaning: "楷模典范，端方正直", styles: ["steady"], fit: "m" },
  { char: "桐", meaning: "梧桐引凤，高洁之木", styles: ["fresh", "classic"], fit: "u", poem: { source: "诗经 · 大雅", quote: "凤凰鸣矣，于彼高冈。梧桐生矣，于彼朝阳" } },
  { char: "松", meaning: "苍松傲雪，坚贞长青", styles: ["steady", "classic"], fit: "m", poem: { source: "论语 · 子罕", quote: "岁寒，然后知松柏之后凋也" } },
  { char: "柏", meaning: "翠柏常青，志节不移", styles: ["steady"], fit: "m" },
  { char: "杉", meaning: "杉木挺秀，清直向上", styles: ["fresh"], fit: "u" },
  { char: "梓", meaning: "桑梓故土，良木成器", styles: ["fresh", "auspicious"], fit: "u", poem: { source: "诗经 · 小雅", quote: "维桑与梓，必恭敬止" } },
  { char: "楠", meaning: "楠木珍贵，栋梁之材", styles: ["steady", "auspicious"], fit: "u" },
  { char: "荣", meaning: "草木欣荣，家道兴旺", styles: ["auspicious", "steady"], fit: "m" },
  { char: "茂", meaning: "枝叶繁茂，德业日盛", styles: ["steady", "auspicious"], fit: "m" },
  { char: "萱", meaning: "萱草忘忧，母慈子孝", styles: ["fresh"], fit: "f" },
  { char: "芷", meaning: "白芷幽香，品行高洁", styles: ["classic", "fresh"], fit: "f", poem: { source: "楚辞 · 离骚", quote: "扈江离与辟芷兮，纫秋兰以为佩" } },
  { char: "若", meaning: "杜若香草，温婉如玉", styles: ["classic", "fresh"], fit: "f", poem: { source: "楚辞 · 九歌", quote: "采芳洲兮杜若，将以遗兮下女" } },
  { char: "蕙", meaning: "蕙质兰心，纯善温雅", styles: ["classic"], fit: "f", poem: { source: "楚辞 · 离骚", quote: "余既滋兰之九畹兮，又树蕙之百亩" } },
  { char: "筠", meaning: "竹皮坚韧，虚心有节", styles: ["classic", "fresh"], fit: "f" },
  { char: "竹", meaning: "翠竹有节，虚怀若谷", styles: ["fresh", "classic"], fit: "u" },
  { char: "君", meaning: "谦谦君子，温润如玉", styles: ["classic", "steady"], fit: "u", poem: { source: "诗经 · 卫风", quote: "有匪君子，如切如磋，如琢如磨" } },
  { char: "东", meaning: "紫气东来，旭日方升", styles: ["auspicious", "steady"], fit: "m" },
  { char: "彦", meaning: "才德出众之士", styles: ["classic", "steady"], fit: "m", poem: { source: "诗经 · 郑风", quote: "彼其之子，邦之彦兮" } },
  { char: "嘉", meaning: "嘉言善行，美好吉庆", styles: ["auspicious", "classic"], fit: "u", poem: { source: "楚辞 · 离骚", quote: "肇锡余以嘉名" } },
  { char: "启", meaning: "启明开智，前程始发", styles: ["steady", "auspicious"], fit: "m" },
  { char: "谦", meaning: "谦谦君子，卑以自牧", styles: ["classic", "steady"], fit: "m", poem: { source: "周易 · 谦卦", quote: "谦谦君子，卑以自牧也" } },
  { char: "健", meaning: "自强不息，刚健有为", styles: ["steady"], fit: "m", poem: { source: "周易 · 乾卦", quote: "天行健，君子以自强不息" } },
  { char: "杰", meaning: "人中豪杰，才智超群", styles: ["steady"], fit: "m" },
  { char: "毅", meaning: "弘毅坚忍，任重道远", styles: ["steady", "classic"], fit: "m", poem: { source: "论语 · 泰伯", quote: "士不可以不弘毅，任重而道远" } },
  { char: "桦", meaning: "白桦挺拔，清朗俊逸", styles: ["fresh"], fit: "m" },
  { char: "槿", meaning: "木槿朝开，温柔坚韧", styles: ["fresh"], fit: "f" },
  { char: "菁", meaning: "华采菁英，才华出众", styles: ["classic", "fresh"], fit: "f", poem: { source: "诗经 · 唐风", quote: "有杕之杜，其叶菁菁" } },
  { char: "茉", meaning: "茉莉芬芳，清雅怡人", styles: ["fresh"], fit: "f" },
  { char: "芊", meaning: "草木芊芊，生机盎然", styles: ["fresh"], fit: "f" },
  { char: "秋", meaning: "秋高气爽，硕果盈枝", styles: ["classic", "fresh"], fit: "u" },
  { char: "和", meaning: "和顺致祥，中正平和", styles: ["classic", "auspicious"], fit: "u", poem: { source: "周易 · 乾卦", quote: "保合太和，乃利贞" } },
  { char: "康", meaning: "安康顺遂，五福临门", styles: ["auspicious"], fit: "u" },
  { char: "家", meaning: "家国情怀，安身立业", styles: ["steady", "auspicious"], fit: "u" },
  { char: "国", meaning: "胸怀家国，器宇轩昂", styles: ["steady"], fit: "m" },
  { char: "本", meaning: "君子务本，本立道生", styles: ["classic", "steady"], fit: "m", poem: { source: "论语 · 学而", quote: "君子务本，本立而道生" } },
  { char: "冠", meaning: "冠冕堂皇，出类拔萃", styles: ["steady"], fit: "m" },
  { char: "景", meaning: "高山景行，光明远大", styles: ["classic", "steady"], fit: "u", poem: { source: "诗经 · 小雅", quote: "高山仰止，景行行止" } },
  { char: "颀", meaning: "身姿颀长，风度翩翩", styles: ["classic", "fresh"], fit: "m", poem: { source: "诗经 · 卫风", quote: "硕人其颀，衣锦褧衣" } },
  { char: "棠", meaning: "甘棠遗爱，惠泽后人", styles: ["classic", "fresh"], fit: "u", poem: { source: "诗经 · 召南", quote: "蔽芾甘棠，勿翦勿伐" } },
  { char: "藝", meaning: "多才多藝，游于六藝", styles: ["classic"], fit: "u" },
  { char: "旭", meaning: "旭日初升，朝气蓬勃", styles: ["auspicious", "fresh"], fit: "m", poem: { source: "诗经 · 邶风", quote: "雄雉于飞，下上其音。旭日始旦" } },
  { char: "苓", meaning: "茯苓延年，采采其芳", styles: ["classic", "fresh"], fit: "f", poem: { source: "诗经 · 邶风", quote: "山有榛，隰有苓" } },
  { char: "萌", meaning: "草木初萌，生意盎然", styles: ["fresh"], fit: "f" },
  // ── 火 ──
  { char: "志", meaning: "志向抱负，笃行致远", styles: ["steady", "classic"], fit: "m", poem: { source: "论语 · 泰伯", quote: "士不可以不弘毅，任重而道远" } },
  { char: "晨", meaning: "晨曦初露，希望之始", styles: ["fresh", "auspicious"], fit: "u" },
  { char: "曦", meaning: "晨曦朝阳，光明温暖", styles: ["fresh"], fit: "f" },
  { char: "昭", meaning: "昭明有融，光彩照人", styles: ["classic"], fit: "u", poem: { source: "诗经 · 大雅", quote: "昭明有融，高朗令终" } },
  { char: "明", meaning: "光明磊落，聪明睿智", styles: ["steady", "classic"], fit: "u", poem: { source: "周易 · 晋卦", quote: "君子以自昭明德" } },
  { char: "晗", meaning: "天将明，朝气初升", styles: ["fresh"], fit: "f" },
  { char: "煦", meaning: "和煦温暖，仁厚待人", styles: ["fresh", "classic"], fit: "u" },
  { char: "炜", meaning: "光辉炜煌，才华彰显", styles: ["steady"], fit: "m", poem: { source: "诗经 · 邶风", quote: "彤管有炜，说怿女美" } },
  { char: "烨", meaning: "火盛明亮，光彩夺目", styles: ["steady"], fit: "m" },
  { char: "焕", meaning: "焕然一新，神采奕奕", styles: ["steady"], fit: "m" },
  { char: "晴", meaning: "晴空万里，开朗明媚", styles: ["fresh"], fit: "f" },
  { char: "昕", meaning: "黎明破晓，光明在望", styles: ["fresh"], fit: "u" },
  { char: "旻", meaning: "秋日旻天，胸怀高远", styles: ["classic"], fit: "m" },
  { char: "晏", meaning: "海晏河清，安然自若", styles: ["classic"], fit: "u", poem: { source: "楚辞 · 九歌", quote: "青云衣兮白霓裳，举长矢兮射天狼……日晏晏兮" } },
  { char: "南", meaning: "南山之寿，安定长久", styles: ["classic", "auspicious"], fit: "u", poem: { source: "诗经 · 小雅", quote: "如南山之寿，不骞不崩" } },
  { char: "丹", meaning: "丹心赤诚，志虑忠纯", styles: ["classic"], fit: "u" },
  { char: "宁", meaning: "安宁致远，静水流深", styles: ["steady", "auspicious"], fit: "u" },
  { char: "定", meaning: "安定沉稳，处变不惊", styles: ["steady"], fit: "m" },
  { char: "念", meaning: "心怀善念，不忘初心", styles: ["classic", "fresh"], fit: "f" },
  { char: "惠", meaning: "惠风和畅，仁爱宽厚", styles: ["classic", "auspicious"], fit: "f" },
  { char: "悦", meaning: "心悦神怡，和颜悦色", styles: ["fresh", "auspicious"], fit: "f" },
  { char: "恒", meaning: "持之以恒，日月得天", styles: ["steady", "classic"], fit: "m", poem: { source: "周易 · 恒卦", quote: "日月得天而能久照，四时变化而能久成" } },
  { char: "晓", meaning: "拂晓破暗，通达明理", styles: ["fresh"], fit: "u" },
  { char: "扬", meaning: "意气昂扬，名声远播", styles: ["steady"], fit: "m" },
  { char: "德", meaning: "厚德载物，德行天下", styles: ["steady", "classic"], fit: "m", poem: { source: "周易 · 坤卦", quote: "地势坤，君子以厚德载物" } },
  { char: "亭", meaning: "亭亭玉立，风姿绰约", styles: ["fresh"], fit: "f" },
  { char: "夏", meaning: "夏木葱茏，热忱明朗", styles: ["fresh", "classic"], fit: "u" },
  { char: "岱", meaning: "岱宗泰山，稳重如山", styles: ["steady", "classic"], fit: "m" },
  { char: "临", meaning: "君子临事，敬慎有为", styles: ["classic", "steady"], fit: "u", poem: { source: "周易 · 临卦", quote: "君子以教思无穷，容保民无疆" } },
  { char: "哲", meaning: "哲思明辨，既明且哲", styles: ["classic", "steady"], fit: "m", poem: { source: "诗经 · 大雅", quote: "既明且哲，以保其身" } },
  { char: "达", meaning: "通达四方，豁达大度", styles: ["steady"], fit: "m" },
  { char: "展", meaning: "大展宏图，舒展自如", styles: ["steady"], fit: "m" },
  { char: "麗", meaning: "日月麗天，光彩焕发", styles: ["classic"], fit: "f", poem: { source: "周易 · 离卦", quote: "日月麗乎天，百谷草木麗乎土" } },
  { char: "朗", meaning: "朗月清风，襟怀坦荡", styles: ["fresh", "steady"], fit: "m" },
  { char: "知", meaning: "知书达理，睿智明达", styles: ["classic", "fresh"], fit: "u", poem: { source: "论语 · 雍也", quote: "知者乐水，仁者乐山" } },
  // ── 土 ──
  { char: "安", meaning: "平安顺遂，泰然安稳", styles: ["auspicious", "steady"], fit: "u" },
  { char: "宇", meaning: "气宇轩昂，胸怀天地", styles: ["steady"], fit: "m" },
  { char: "坤", meaning: "厚德载物，包容宽厚", styles: ["steady", "classic"], fit: "u", poem: { source: "周易 · 坤卦", quote: "至哉坤元，万物资生" } },
  { char: "培", meaning: "栽培化育，根基深厚", styles: ["steady"], fit: "m" },
  { char: "垚", meaning: "山高土厚，稳重可靠", styles: ["steady"], fit: "m" },
  { char: "音", meaning: "德音孔昭，声名美好", styles: ["classic", "fresh"], fit: "f", poem: { source: "诗经 · 小雅", quote: "我有嘉宾，德音孔昭" } },
  { char: "均", meaning: "公允平和，处事持中", styles: ["steady"], fit: "m" },
  { char: "岚", meaning: "山间雾岚，空灵清逸", styles: ["fresh"], fit: "f" },
  { char: "峻", meaning: "高山峻岭，德业崇高", styles: ["steady"], fit: "m" },
  { char: "越", meaning: "超越进取，卓尔不群", styles: ["steady"], fit: "m" },
  { char: "远", meaning: "宁静致远，志在千里", styles: ["classic", "steady"], fit: "m" },
  { char: "维", meaning: "维新有为，纲维有序", styles: ["classic", "steady"], fit: "m", poem: { source: "诗经 · 大雅", quote: "周虽旧邦，其命维新" } },
  { char: "轩", meaning: "气宇轩昂，格局开阔", styles: ["steady"], fit: "m" },
  { char: "容", meaning: "有容乃大，雍容大度", styles: ["classic", "steady"], fit: "f" },
  { char: "婉", meaning: "婉约温柔，清扬婉兮", styles: ["classic", "fresh"], fit: "f", poem: { source: "诗经 · 郑风", quote: "有美一人，清扬婉兮" } },
  { char: "怡", meaning: "心旷神怡，怡然自得", styles: ["fresh", "auspicious"], fit: "f" },
  { char: "依", meaning: "杨柳依依，温婉可人", styles: ["fresh", "classic"], fit: "f", poem: { source: "诗经 · 小雅", quote: "昔我往矣，杨柳依依" } },
  { char: "燕", meaning: "燕燕于飞，轻盈灵动", styles: ["classic"], fit: "f", poem: { source: "诗经 · 邶风", quote: "燕燕于飞，差池其羽" } },
  { char: "韵", meaning: "气韵天成，风雅有致", styles: ["fresh", "classic"], fit: "f" },
  { char: "余", meaning: "丰饶有余，从容不迫", styles: ["classic"], fit: "u" },
  { char: "屹", meaning: "屹立不摇，坚定不移", styles: ["steady"], fit: "m" },
  { char: "磊", meaning: "光明磊落，坦荡如砥", styles: ["steady"], fit: "m" },
  { char: "跃", meaning: "鱼跃龙门，奋发向上", styles: ["auspicious", "steady"], fit: "m", poem: { source: "诗经 · 大雅", quote: "鸢飞戾天，鱼跃于渊" } },
  // ── 金 ──
  { char: "瑞", meaning: "祥瑞临门，吉庆有余", styles: ["auspicious"], fit: "u" },
  { char: "锦", meaning: "锦绣前程，繁华似锦", styles: ["auspicious"], fit: "u" },
  { char: "铭", meaning: "铭记于心，自省自励", styles: ["steady"], fit: "m" },
  { char: "钧", meaning: "雷霆万钧，器量宏大", styles: ["steady"], fit: "m" },
  { char: "锐", meaning: "锐意进取，锋芒内敛", styles: ["steady"], fit: "m" },
  { char: "钦", meaning: "钦明文思，恭敬有加", styles: ["classic", "steady"], fit: "m" },
  { char: "西", meaning: "西山爽气，疏朗开阔", styles: ["fresh"], fit: "u" },
  { char: "珊", meaning: "珊瑚映月，珍美温润", styles: ["fresh"], fit: "f" },
  { char: "瑜", meaning: "怀瑾握瑜，美玉之德", styles: ["classic"], fit: "u", poem: { source: "楚辞 · 九章", quote: "怀瑾握瑜兮，穷不知所示" } },
  { char: "琛", meaning: "天球琛宝，贵重难得", styles: ["auspicious", "steady"], fit: "m" },
  { char: "诚", meaning: "至诚如神，言而有信", styles: ["steady", "classic"], fit: "m", poem: { source: "中庸", quote: "诚者，天之道也；诚之者，人之道也" } },
  { char: "谨", meaning: "谨言慎行，敬事而信", styles: ["classic", "steady"], fit: "u" },
  { char: "静", meaning: "静女其姝，宁静致远", styles: ["classic", "fresh"], fit: "f", poem: { source: "诗经 · 邶风", quote: "静女其姝，俟我于城隅" } },
  { char: "睿", meaning: "睿智通达，思虑深远", styles: ["steady"], fit: "u" },
  { char: "新", meaning: "日新其德，气象常新", styles: ["fresh", "classic"], fit: "u", poem: { source: "大学", quote: "苟日新，日日新，又日新" } },
  { char: "世", meaning: "经世致用，泽被后世", styles: ["steady"], fit: "m" },
  { char: "初", meaning: "不忘初心，方得始终", styles: ["fresh", "classic"], fit: "u" },
  { char: "青", meaning: "青出于蓝，朝气清新", styles: ["fresh", "classic"], fit: "u", poem: { source: "荀子 · 劝学", quote: "青，取之于蓝，而青于蓝" } },
  { char: "成", meaning: "玉汝于成，功成名就", styles: ["steady", "auspicious"], fit: "m" },
  { char: "宣", meaning: "宣朗豁达，明快通透", styles: ["classic"], fit: "u" },
  { char: "师", meaning: "师法先贤，为人师表", styles: ["classic"], fit: "u" },
  { char: "仁", meaning: "仁者爱人，宅心仁厚", styles: ["classic", "steady"], fit: "m", poem: { source: "论语 · 雍也", quote: "仁者乐山，知者乐水" } },
  { char: "才", meaning: "才思敏捷，栋梁之才", styles: ["steady"], fit: "m" },
  // ── 水 ──
  { char: "泽", meaning: "润泽万物，恩泽绵长", styles: ["steady", "auspicious"], fit: "m", poem: { source: "周易 · 兑卦", quote: "丽泽兑，君子以朋友讲习" } },
  { char: "涵", meaning: "涵养深厚，海纳百川", styles: ["steady", "fresh"], fit: "u" },
  { char: "沐", meaning: "如沐春风，清爽洁净", styles: ["fresh"], fit: "u" },
  { char: "清", meaning: "清风朗月，两袖清风", styles: ["classic", "fresh"], fit: "u", poem: { source: "诗经 · 郑风", quote: "有美一人，清扬婉兮" } },
  { char: "澜", meaning: "波澜壮阔，气度不凡", styles: ["steady"], fit: "u" },
  { char: "洋", meaning: "海洋辽阔，心胸宽广", styles: ["fresh"], fit: "u" },
  { char: "泓", meaning: "一泓清泉，澄澈深邃", styles: ["fresh", "classic"], fit: "u" },
  { char: "润", meaning: "温润如玉，泽及四方", styles: ["steady", "auspicious"], fit: "m" },
  { char: "溪", meaning: "清溪潺潺，灵动悠然", styles: ["fresh"], fit: "f" },
  { char: "汐", meaning: "潮汐守信，静美如诗", styles: ["fresh"], fit: "f" },
  { char: "淳", meaning: "淳厚质朴，返璞归真", styles: ["classic", "steady"], fit: "u" },
  { char: "洁", meaning: "冰清玉洁，品行高尚", styles: ["fresh"], fit: "f" },
  { char: "凌", meaning: "壮志凌云，超逸不群", styles: ["steady"], fit: "u" },
  { char: "雨", meaning: "润物无声，惠泽绵绵", styles: ["fresh", "classic"], fit: "u", poem: { source: "诗经 · 小雅", quote: "昔我往矣，杨柳依依。今我来思，雨雪霏霏" } },
  { char: "雯", meaning: "云彩成纹，文采斐然", styles: ["fresh"], fit: "f" },
  { char: "霖", meaning: "甘霖普降，福泽深厚", styles: ["auspicious", "steady"], fit: "u" },
  { char: "沛", meaning: "充沛丰盈，行止有力", styles: ["steady"], fit: "m" },
  { char: "浩", meaning: "浩然之气，至大至刚", styles: ["steady", "classic"], fit: "m", poem: { source: "孟子 · 公孙丑", quote: "我善养吾浩然之气" } },
  { char: "海", meaning: "海纳百川，有容乃大", styles: ["steady"], fit: "m" },
  { char: "波", meaning: "微波澄澈，从容不迫", styles: ["fresh"], fit: "m" },
  { char: "凡", meaning: "不同凡响，平中见奇", styles: ["fresh"], fit: "u" },
  { char: "文", meaning: "文质彬彬，博学多才", styles: ["classic", "steady"], fit: "u", poem: { source: "论语 · 雍也", quote: "质胜文则野，文胜质则史。文质彬彬，然后君子" } },
  { char: "敏", meaning: "敏而好学，思维敏捷", styles: ["classic"], fit: "f", poem: { source: "论语 · 公冶长", quote: "敏而好学，不耻下问" } },
  { char: "慕", meaning: "心慕贤德，见贤思齐", styles: ["classic", "fresh"], fit: "f" },
  { char: "妍", meaning: "百花争妍，秀美聪慧", styles: ["fresh"], fit: "f" },
  { char: "洛", meaning: "洛水之畔，古雅从容", styles: ["classic", "fresh"], fit: "u" },
  { char: "湘", meaning: "湘水悠悠，钟灵毓秀", styles: ["classic", "fresh"], fit: "f", poem: { source: "楚辞 · 九歌", quote: "帝子降兮北渚，目眇眇兮愁予" } },
  { char: "淑", meaning: "窈窕淑女，温良贤淑", styles: ["classic"], fit: "f", poem: { source: "诗经 · 周南", quote: "窈窕淑女，君子好逑" } },
  { char: "泳", meaning: "汉之广矣，泳之游之", styles: ["classic", "fresh"], fit: "u", poem: { source: "诗经 · 周南", quote: "汉之广矣，不可泳思" } },
  { char: "冰", meaning: "冰壶秋月，晶莹高洁", styles: ["fresh", "classic"], fit: "f" },
  { char: "平", meaning: "平步青云，四平八稳", styles: ["steady", "auspicious"], fit: "u" },
  { char: "航", meaning: "扬帆远航，志在四海", styles: ["steady", "fresh"], fit: "m" },
  { char: "泊", meaning: "淡泊明志，宁静致远", styles: ["classic"], fit: "u", poem: { source: "诫子书", quote: "非淡泊无以明志，非宁静无以致远" } },
]

/* ============ 声调音律评分 ============ */

function toneOf(ch: string): number {
  const t = pinyinNum(ch)
  const n = Number(t)
  return Number.isFinite(n) && n >= 1 && n <= 4 ? n : 1
}

function pinyinOf(ch: string): string {
  return pinyinSymbol(ch)
}

/** 音律评分：平仄相间加分、全同调减分、姓名末字仄声收尾略加分 */
function yinScore(tones: number[]): number {
  let s = 82
  const pingze = tones.map((t) => (t <= 2 ? 0 : 1)) // 平0 仄1
  const allSame = pingze.every((p) => p === pingze[0])
  if (allSame) s -= 10
  // 相邻声调不同加分
  for (let i = 1; i < tones.length; i++) {
    if (tones[i] !== tones[i - 1]) s += 4
    if (tones[i] === tones[i - 1]) s -= 2
  }
  // 末字仄声（3/4声）收尾有力
  if (pingze[pingze.length - 1] === 1) s += 3
  return Math.max(60, Math.min(99, s))
}

/** 字形评分：笔画均衡（各字繁简差距小）为佳 */
function xingScore(strokes: number[]): number {
  const max = Math.max(...strokes), min = Math.min(...strokes)
  let s = 92 - (max - min) * 1.5
  if (max > 20) s -= 5
  return Math.max(62, Math.min(98, Math.round(s)))
}

/** 精选起名字库（选字广场等复用）：字义/风格/性别倾向/诗词出处 */
export function namingCharPool(): { char: string; meaning: string; fit: string; poem?: { source: string; quote: string } }[] {
  return CHAR_POOL.map((p) => ({ char: p.char, meaning: p.meaning, fit: p.fit, poem: p.poem }))
}

/* ============ 喜用神提取 ============ */

export interface QimingProfile {
  surname: string
  gender: "男" | "女"
  shengxiao: string
  xingzuo: string
  birthText: string
  trueSolarText: string
  pillars: { label: string; shishen: string; gan: string; zhi: string; ganWuxing: string; zhiWuxing: string; canggan: string; nayin: string }[]
  wuxingRatio: { name: string; pct: number }[]
  xiyong: WX[]
  xiyongNote: string
  xiyongSource: { source: string; quote: string }
}

const XIYONG_QUOTES: Record<WX, { source: string; quote: string }> = {
  木: { source: "穷通宝鉴", quote: "得木而秀，木盛则贵。取木为用，宜生扶之。" },
  火: { source: "穷通宝鉴", quote: "调候为急，先取丙火，火暖局舒，富贵可期。" },
  土: { source: "滴天髓", quote: "土润则生，土燥则脆。喜土之命，得培则安。" },
  金: { source: "滴天髓", quote: "金坚则利，得土而生，遇火而锐，取金为用者贵。" },
  水: { source: "穷通宝鉴", quote: "水者智也，源远流长。取水为用，宜金生之。" },
}

const XZ_TABLE: [number, number, string][] = [
  [1, 20, "摩羯座"], [2, 19, "水瓶座"], [3, 21, "双鱼座"], [4, 20, "白羊座"],
  [5, 21, "金牛座"], [6, 22, "双子座"], [7, 23, "巨蟹座"], [8, 23, "狮子座"],
  [9, 23, "处女座"], [10, 24, "天秤座"], [11, 23, "天蝎座"], [12, 22, "射手座"],
]
function xingzuoOf(month: number, day: number): string {
  const idx = day < XZ_TABLE[month - 1][1] ? month - 1 : month % 12
  return XZ_TABLE[idx][2]
}

function buildProfile(surname: string, gender: "男" | "女", bazi: BaziData, birth: { year: number; month: number; day: number; hour: number; minute: number }): QimingProfile {
  const wxOrder = ["金", "木", "水", "火", "土"] as const
  const total = wxOrder.reduce((s, w) => s + (bazi.wuxingPower[w] ?? 0), 0) || 1
  // 喜用：yongShen/xiShen 里抽取五行字
  const pickWX = (s: string): WX[] => (["金", "木", "水", "火", "土"] as WX[]).filter((w) => s.includes(w))
  let xiyong = [...new Set([...pickWX(bazi.yongJi.yongShen), ...pickWX(bazi.yongJi.xiShen)])]
  if (xiyong.length === 0) xiyong = ["木", "火"]
  const pv = [bazi.siZhu.year, bazi.siZhu.month, bazi.siZhu.day, bazi.siZhu.hour]
  const labels = ["年柱", "月柱", "日柱", "时柱"]
  return {
    surname,
    gender,
    shengxiao: bazi.zodiac,
    xingzuo: xingzuoOf(birth.month, birth.day),
    birthText: `${birth.year}年${birth.month}月${birth.day}日 ${birth.hour}时${birth.minute}分（${bazi.lunarDate.replace(/^.*?年/, "")}）`,
    trueSolarText: bazi.realSolarTime,
    pillars: pv.map((p, i) => ({
      label: labels[i],
      shishen: i === 2 ? "日元" : p.shiShen,
      gan: p.gan,
      zhi: p.zhi,
      ganWuxing: ganWX(p.gan),
      zhiWuxing: zhiWX(p.zhi),
      canggan: p.cangGan.map((c) => c.gan).join(""),
      nayin: p.naYin,
    })),
    wuxingRatio: wxOrder.map((w) => ({ name: w, pct: Math.round(((bazi.wuxingPower[w] ?? 0) / total) * 1000) / 10 })),
    xiyong,
    xiyongNote: `五行并非缺什么补什么，应以八字中阴阳五行平衡为原则选取喜用。${bazi.yongJi.note}${zodiacNamingNote(bazi.zodiac) ? ` ${zodiacNamingNote(bazi.zodiac)}` : ""}`,
    xiyongSource: XIYONG_QUOTES[xiyong[0]],
  }
}

const GAN_WX_MAP: Record<string, WX> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" }
const ZHI_WX_MAP: Record<string, WX> = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" }
const ganWX = (g: string) => GAN_WX_MAP[g] ?? "土"
const zhiWX = (z: string) => ZHI_WX_MAP[z] ?? "土"

/* ============ 候选名生成 ============ */

export interface QimingInput {
  surname: string
  gender: "男" | "女"
  nameType: "double" | "single"
  style: Style
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city?: string
  fixChar?: string
  fixPosition?: "middle" | "last"
  blockChars?: string
}

export interface QimingOutput {
  profile: QimingProfile
  candidates: NameCandidate[]
  /** 理论可组合总数（展示用） */
  totalCount: number
}

/** 五行相生 */
const SHENG_NEXT: Record<WX, WX> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }

function makeNameChar(ch: string, meaning: string): NameChar {
  return {
    char: ch,
    pinyin: pinyinOf(ch),
    tone: toneOf(ch),
    wuxing: charWuxingOf(ch),
    strokes: kangxiStroke(ch),
    meaning,
  }
}

/** 高频常见名组合（重名热度启发式） */
const COMMON_PAIRS = new Set(["志强", "志明", "秀英", "秀兰", "建华", "文静", "浩然", "子涵", "雨涵", "欣怡", "梓涵", "浩宇", "静怡"])

export function generateNames(input: QimingInput): QimingOutput {
  const bazi = computeBazi({
    name: "",
    gender: input.gender,
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    city: input.city,
    useTrueSolar: true,
  })
  const profile = buildProfile(input.surname, input.gender, bazi, input)
  const xiyongSet = new Set<WX>(profile.xiyong)
  const genderKey = input.gender === "男" ? "m" : "f"
  const blocked = new Set((input.blockChars ?? "").split(""))
  const zodiac = bazi.zodiac

  // 1. 字库筛选：喜用五行 + 性别 + 屏蔽字（字库中的字义与风格保留全部供组合评分）
  const pool = CHAR_POOL.filter((p) => {
    if (p.char.length !== 1 || !/[\u4e00-\u9fff]/.test(p.char)) return false
    if (blocked.has(p.char)) return false
    if (p.fit !== "u" && p.fit !== genderKey) return false
    return xiyongSet.has(charWuxingOf(p.char))
  })

  // 2. 组合与评分
  interface Scored { cand: NameCandidate; total: number }
  const scored: Scored[] = []
  const seen = new Set<string>()

  const evaluate = (chars: PoolChar[]) => {
    const given = chars.map((c) => c.char).join("")
    if (seen.has(given)) return
    seen.add(given)
    const wuge = computeWuge(input.surname, given)
    // 数理分：五格吉凶（人/地/外/总，天格由姓氏决定不计分）
    let liScore = 60
    for (const v of [wuge.ren, wuge.di, wuge.wai, wuge.zong]) {
      const luck = shuliLuckOf(v)
      liScore += luck === "吉" ? 9 : luck === "半吉" ? 4 : -6
    }
    // 三才加权（天/人/地数理五行生克）
    const sancaiLuck = sancaiLuckOf(shuliWuxing(wuge.tian), shuliWuxing(wuge.ren), shuliWuxing(wuge.di))
    liScore += sancaiLuck === "吉" ? 8 : sancaiLuck === "半吉" ? 2 : -12
    liScore = Math.max(55, Math.min(99, liScore))
    // 三才五格不佳直接淘汰；单字名格数少、外格恒为2，阈值适当放宽
    const liThreshold = chars.length === 1 ? 60 : 70
    if (liScore < liThreshold) return

    const allChars = [input.surname[input.surname.length - 1], ...chars.map((c) => c.char)]
    const tones = [toneOf(input.surname[input.surname.length - 1]), ...chars.map((c) => toneOf(c.char))]
    const yin = yinScore(tones)
    const xing = xingScore(allChars.map((c) => kangxiStroke(c)))
    // 义分：风格匹配 + 有诗词出处加分
    let yi = 84
    for (const c of chars) {
      if (c.styles.includes(input.style)) yi += 4
      if (c.poem) yi += 3
    }
    // 双字五行相生加分
    if (chars.length === 2) {
      const w1 = charWuxingOf(chars[0].char), w2 = charWuxingOf(chars[1].char)
      if (SHENG_NEXT[w1] === w2 || SHENG_NEXT[w2] === w1) yi += 3
    }
    // 生肖姓名学：字根喜忌加减分；命中两个以上忌根的字直接淘汰
    const sxNotes: string[] = []
    for (const c of chars) {
      const sx = assessCharForZodiac(c.char, zodiac)
      if (sx.badHits.length >= 2) return
      yi += sx.score * 2
      if (sx.favHits.length > 0) sxNotes.push(`「${c.char}」${sx.favHits[0].reason}`)
      else if (sx.badHits.length > 0) sxNotes.push(`「${c.char}」${sx.badHits[0].reason}（宜避）`)
    }
    yi = Math.max(60, Math.min(99, yi))
    const total = Math.round(yin * 0.2 + xing * 0.15 + yi * 0.3 + liScore * 0.35)

    const poemChar = chars.find((c) => c.poem)
    const dup: "low" | "mid" | "high" = COMMON_PAIRS.has(given) ? "high" : chars.every((c) => c.poem) ? "low" : "mid"
    const sxBrief = sxNotes.length > 0 ? `；生肖${zodiac}：${sxNotes.join("，")}` : ""
    scored.push({
      total,
      cand: {
        id: `q-${given}`,
        chars: [
          makeNameChar(input.surname[input.surname.length - 1], "姓氏"),
          ...chars.map((c) => makeNameChar(c.char, c.meaning)),
        ],
        score: Math.min(99, total),
        subScores: { yin, xing, yi, li: liScore },
        brief: chars.map((c) => c.meaning).join("；") + sxBrief,
        poem: poemChar?.poem,
        duplicate: dup,
      },
    })
  }

  let totalCount = 0
  if (input.nameType === "single") {
    totalCount = pool.length
    for (const c of pool) evaluate([c])
  } else {
    // 定字模式
    const fix = input.fixChar && /[\u4e00-\u9fff]/.test(input.fixChar) ? input.fixChar : null
    if (fix) {
      const fixPool: PoolChar = CHAR_POOL.find((p) => p.char === fix) ?? { char: fix, meaning: "定字", styles: [input.style], fit: "u" }
      totalCount = pool.length
      for (const c of pool) {
        if (c.char === fix) continue
        if (input.fixPosition === "last") evaluate([c, fixPool])
        else evaluate([fixPool, c])
      }
    } else {
      totalCount = pool.length * (pool.length - 1)
      // 全组合（池上限 ~80 字，组合 ~6k，五格计算轻量可承受）
      for (const a of pool) {
        for (const b of pool) {
          if (a.char === b.char) continue
          evaluate([a, b])
        }
      }
    }
  }

  scored.sort((x, y) => y.total - x.total)
  // 风格优先：匹配风格的名字提到前面（同分时）
  const top = scored.slice(0, 60)
  const styleFirst = top.sort((x, y) => {
    const xm = x.cand.chars.slice(1).some((c) => CHAR_POOL.find((p) => p.char === c.char)?.styles.includes(input.style)) ? 1 : 0
    const ym = y.cand.chars.slice(1).some((c) => CHAR_POOL.find((p) => p.char === c.char)?.styles.includes(input.style)) ? 1 : 0
    return y.total - x.total || ym - xm
  })

  return { profile, candidates: styleFirst.slice(0, 24).map((s) => s.cand), totalCount }
}
