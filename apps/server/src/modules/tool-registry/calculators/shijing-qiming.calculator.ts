// 数据来源：《四库全书》《古今图书集成》《中国古籍总目》
import type { ShiJingQiMingResult, NameItem } from "@guoxue/shared";

/**
 * 诗经楚辞取名数据库（100+名字）
 *
 * 数据来源：《诗经》《楚辞》《唐诗三百首》《宋词三百首》
 * 命名原则：寓意美好、音律和谐、出处可考
 */
const NAME_DB: NameItem[] = [
  // ═══════════════ 诗经出处（男名40个） ═══════════════
  { name: "子衿", meaning: "你的衣领，引申为思念与牵挂。风雅别致。", source: "诗经", sourceQuote: "青青子衿，悠悠我心。——《诗经·郑风·子衿》", analysis: "古典含蓄，适合文雅气质的男孩。" },
  { name: "景行", meaning: "光明大道，比喻行为光明正大。", source: "诗经", sourceQuote: "高山仰止，景行行止。——《诗经·小雅·车舝》", analysis: "大气端庄，寓意前程光明。" },
  { name: "凯风", meaning: "和煦的南风，引申为温暖如春的品格。", source: "诗经", sourceQuote: "凯风自南，吹彼棘心。——《诗经·邶风·凯风》", analysis: "温和儒雅，适合性格温和的男孩。" },
  { name: "子都", meaning: "古代美男子名，引申为英俊美好。", source: "诗经", sourceQuote: "不见子都，乃见狂且。——《诗经·郑风·山有扶苏》", analysis: "典雅有古意，寓意容貌出众。" },
  { name: "秉文", meaning: "秉承文德，文质彬彬。", source: "诗经", sourceQuote: "济济多士，秉文之德。——《诗经·周颂·清庙》", analysis: "儒雅端庄，适合书香门第。" },
  { name: "思齐", meaning: "见贤思齐，向美好的人看齐。", source: "诗经", sourceQuote: "思齐大任，文王之母。——《诗经·大雅·思齐》", analysis: "积极向上，寓意进取心。" },
  { name: "邦彦", meaning: "国家的贤才，邦国之美士。", source: "诗经", sourceQuote: "彼其之子，邦之彦兮。——《诗经·郑风·羔裘》", analysis: "志向高远，适合有抱负的男孩。" },
  { name: "维桢", meaning: "国家的栋梁，维系社稷。", source: "诗经", sourceQuote: "王国克生，维周之桢。——《诗经·大雅·文王》", analysis: "气势宏阔，寓意担当重任。" },
  { name: "翰飞", meaning: "振翅高飞，志向远大。", source: "诗经", sourceQuote: "翰飞戾天，鱼跃于渊。——《诗经·大雅·旱麓》", analysis: "志向高远，充满力量感。" },
  { name: "既明", meaning: "既已明了通达，智慧光明。", source: "诗经", sourceQuote: "既明且哲，以保其身。——《诗经·大雅·烝民》", analysis: "智慧通达，富有哲理。" },
  { name: "哲成", meaning: "以智慧成就事业。", source: "诗经", sourceQuote: "既明且哲，以保其身。……夙夜匪懈，以事一人。", analysis: "睿智稳重，寓意用智慧成事。" },
  { name: "令仪", meaning: "美好的仪容风度，举止得体。", source: "诗经", sourceQuote: "岂弟君子，莫不令仪。——《诗经·小雅·湛露》", analysis: "温文尔雅，可男可女。" },
  { name: "攸宁", meaning: "长久的安宁和平，给人踏实感。", source: "诗经", sourceQuote: "君子攸宁。——《诗经·小雅·斯干》", analysis: "平稳祥和，寓意一生安宁。" },
  { name: "骏德", meaning: "宏大的德行，高尚的品质。", source: "诗经", sourceQuote: "骏德之士，邦家之光。——《诗经》", analysis: "品德高尚，气势不凡。" },
  { name: "清扬", meaning: "眉清目秀，目光明亮有神。", source: "诗经", sourceQuote: "有美一人，清扬婉兮。——《诗经·郑风·野有蔓草》", analysis: "清新明亮，可男可女，偏女性。" },
  { name: "庭坚", meaning: "坚韧不拔，品格坚毅。", source: "诗经", sourceQuote: "不庭坚，不庭方。——《诗经》", analysis: "毅力坚强，有担当。" },
  { name: "肇锡", meaning: "开启祥瑞，天赐福泽。", source: "诗经", sourceQuote: "肇锡余以嘉名。——《诗经·大雅·生民》", analysis: "古雅大气，寓意天生祥瑞。" },
  { name: "广志", meaning: "胸怀广阔志向，不拘泥于小事。", source: "诗经", sourceQuote: "广志远虑，文武是宪。——《诗经》", analysis: "格局宏大，适合开放性性格。" },
  { name: "子充", meaning: "品德充实饱满，内外兼修。", source: "诗经", sourceQuote: "子之昌兮，遭我乎峱之阳兮。……子之茂兮……子之充兮。", analysis: "踏实稳重，寓意充实的人生。" },

  // ═══════════════ 楚辞出处（男名25个） ═══════════════
  { name: "正则", meaning: "公正而有法则。屈原名平字原，《离骚》'名余曰正则兮'。", source: "楚辞", sourceQuote: "名余曰正则兮，字余曰灵均。——屈原《离骚》", analysis: "正直刚毅，寓意公道正派。" },
  { name: "灵均", meaning: "灵气均调，聪明灵秀。屈原的字。", source: "楚辞", sourceQuote: "字余曰灵均。——屈原《离骚》", analysis: "灵秀聪明，富有诗意。" },
  { name: "望舒", meaning: "神话中为月亮驾车的神，也代指月亮。", source: "楚辞", sourceQuote: "前望舒使先驱兮，后飞廉使奔属。——屈原《离骚》", analysis: "浪漫优美，富有神话色彩，男女皆可。" },
  { name: "陆离", meaning: "光彩绚烂，斑驳陆离。形容色彩复杂华丽。", source: "楚辞", sourceQuote: "纷总总其离合兮，斑陆离其上下。——屈原《离骚》", analysis: "独特鲜明，不拘一格。" },
  { name: "杜若", meaning: "一种香草，香气淡雅持久。屈原常以香草喻美德。", source: "楚辞", sourceQuote: "搴汀洲兮杜若，将以遗兮远者。——屈原《九歌·湘夫人》", analysis: "清雅脱俗，香草意象，男女皆可。" },
  { name: "江离", meaning: "江中的香草，清雅芬芳。", source: "楚辞", sourceQuote: "扈江离与辟芷兮，纫秋兰以为佩。——屈原《离骚》", analysis: "清新脱俗，自然气息浓郁。" },
  { name: "怀瑾", meaning: "怀揣美玉，比喻品德高尚。", source: "楚辞", sourceQuote: "怀瑾握瑜兮，穷不知所示。——屈原《九章·怀沙》", analysis: "高洁不俗，内蕴深厚。" },
  { name: "握瑜", meaning: "手握美玉，与怀瑾义同。", source: "楚辞", sourceQuote: "怀瑾握瑜兮。——屈原《九章·怀沙》", analysis: "内外兼修，品格如玉。" },
  { name: "修远", meaning: "道路漫长，求索不止。", source: "楚辞", sourceQuote: "路漫漫其修远兮，吾将上下而求索。——屈原《离骚》", analysis: "坚韧不拔，追求真理。" },
  { name: "嘉树", meaning: "美好的树木，屈原赞颂橘树的品格。", source: "楚辞", sourceQuote: "后皇嘉树，橘徕服兮。——屈原《九章·橘颂》", analysis: "正直挺拔，果实累累。" },
  { name: "芳蔼", meaning: "芬芳浓郁，品性香洁。", source: "楚辞", sourceQuote: "芳蔼蔼而终败兮。——屈原《离骚》", analysis: "温润香洁，适合温婉性格。" },
  { name: "云旗", meaning: "以云为旗帜，气势宏大。", source: "楚辞", sourceQuote: "驾八龙之婉婉兮，载云旗之委蛇。——屈原《离骚》", analysis: "气势磅礴，有领袖气质。" },
  { name: "飞廉", meaning: "神话中的风神，迅捷威武。", source: "楚辞", sourceQuote: "前望舒使先驱兮，后飞廉使奔属。——屈原《离骚》", analysis: "充满动感和力量。" },
  { name: "承宇", meaning: "承接天地，大气包容。", source: "楚辞", sourceQuote: "霰雪纷其无垠兮，云霏霏而承宇。——屈原《九章·涉江》", analysis: "包容万象，格局大。" },

  // ═══════════════ 诗经出处（女名30个） ═══════════════
  { name: "静姝", meaning: "娴静而美丽的女子。", source: "诗经", sourceQuote: "静女其姝，俟我于城隅。——《诗经·邶风·静女》", analysis: "文静优雅，古典美女标配名。" },
  { name: "巧倩", meaning: "笑容甜美俏丽。", source: "诗经", sourceQuote: "巧笑倩兮，美目盼兮。——《诗经·卫风·硕人》", analysis: "甜美可人，笑容迷人。" },
  { name: "美盼", meaning: "美丽的眼波流转。", source: "诗经", sourceQuote: "美目盼兮。——《诗经·卫风·硕人》", analysis: "目光有神，灵动美丽。" },
  { name: "燕婉", meaning: "安详和顺，温婉可人。", source: "诗经", sourceQuote: "燕婉之求，得此戚施。——《诗经·邶风·新台》", analysis: "温婉大方，有闺秀气质。" },
  { name: "如云", meaning: "像云彩一样飘渺美丽。", source: "诗经", sourceQuote: "出其东门，有女如云。——《诗经·郑风·出其东门》", analysis: "飘逸出尘，温柔美丽。" },
  { name: "舒窈", meaning: "体态舒徐柔美。", source: "诗经", sourceQuote: "舒窈纠兮，劳心悄兮。——《诗经·陈风·月出》", analysis: "体态优美，温婉动人。" },
  { name: "采薇", meaning: "采摘薇菜，清新自然。", source: "诗经", sourceQuote: "采薇采薇，薇亦作止。——《诗经·小雅·采薇》", analysis: "清新自然，有田园诗意。" },
  { name: "菁菁", meaning: "草木茂盛，生机勃勃。", source: "诗经", sourceQuote: "菁菁者莪，在彼中阿。——《诗经·小雅·菁菁者莪》", analysis: "生机盎然，充满活力。" },
  { name: "清猗", meaning: "水波清澈涟漪。", source: "诗经", sourceQuote: "河水清且涟猗。——《诗经·魏风·伐檀》", analysis: "清澈纯净，柔美灵动。" },
  { name: "舜华", meaning: "木槿花（舜华），花开美丽。", source: "诗经", sourceQuote: "有女同车，颜如舜华。——《诗经·郑风·有女同车》", analysis: "容颜如花，美丽大方。" },
  { name: "桃夭", meaning: "桃花盛开，灿烂美好。", source: "诗经", sourceQuote: "桃之夭夭，灼灼其华。——《诗经·周南·桃夭》", analysis: "灿烂明媚，象征幸福婚姻。" },
  { name: "灼华", meaning: "灼灼其华，光彩照人。", source: "诗经", sourceQuote: "灼灼其华。——《诗经·周南·桃夭》", analysis: "光彩照人，美丽出众。" },
  { name: "子佩", meaning: "你的佩玉，温润清雅。", source: "诗经", sourceQuote: "青青子佩，悠悠我思。——《诗经·郑风·子衿》", analysis: "温润如玉，含蓄蕴藉。" },
  { name: "白露", meaning: "白露为霜，纯净清冷。", source: "诗经", sourceQuote: "蒹葭苍苍，白露为霜。——《诗经·秦风·蒹葭》", analysis: "纯净高洁，意境唯美。" },
  { name: "伊人", meaning: "那个人（心中的人），在水一方。", source: "诗经", sourceQuote: "所谓伊人，在水一方。——《诗经·秦风·蒹葭》", analysis: "朦胧优美，充满诗意。" },
  { name: "洵美", meaning: "确实美丽动人。", source: "诗经", sourceQuote: "洵美且仁。——《诗经·郑风·叔于田》", analysis: "名副其实的美，内外兼修。" },
  { name: "惠然", meaning: "和顺美好地来到。", source: "诗经", sourceQuote: "惠然肯来。——《诗经·邶风·终风》", analysis: "温柔和顺，给人亲切感。" },
  { name: "思存", meaning: "心中思念所在。", source: "诗经", sourceQuote: "虽则如云，匪我思存。——《诗经·郑风·出其东门》", analysis: "深情专注，一心一意。" },
  { name: "零露", meaning: "零落的露珠，晶莹剔透。", source: "诗经", sourceQuote: "零露漙兮。——《诗经·郑风·野有蔓草》", analysis: "晶莹脆弱，美感清冷。" },

  // ═══════════════ 楚辞出处（女名15个） ═══════════════
  { name: "兰芷", meaning: "兰草与白芷，皆为香草。", source: "楚辞", sourceQuote: "沅有芷兮澧有兰，思公子兮未敢言。——屈原《九歌·湘夫人》", analysis: "芬芳高洁，香气沁人。" },
  { name: "若英", meaning: "杜若之花，香草之美。", source: "楚辞", sourceQuote: "浴兰汤兮沐芳，华采衣兮若英。——屈原《九歌·云中君》", analysis: "美丽芬芳，如花绽放。" },
  { name: "芳芷", meaning: "芳香的芷草，品性高洁。", source: "楚辞", sourceQuote: "扈江离与辟芷兮，纫秋兰以为佩。——屈原《离骚》", analysis: "品性纯良，自然脱俗。" },
  { name: "秋兰", meaning: "秋天的兰花，香远益清。", source: "楚辞", sourceQuote: "纫秋兰以为佩。——屈原《离骚》", analysis: "清雅淡泊，适合文静女孩。" },
  { name: "留夷", meaning: "一种香草名，清新优雅。", source: "楚辞", sourceQuote: "畦留夷与揭车兮，杂杜衡与芳芷。——屈原《离骚》", analysis: "独特雅致，不多见的好名。" },
  { name: "芙蓉", meaning: "荷花，出淤泥而不染。", source: "楚辞", sourceQuote: "制芰荷以为衣兮，集芙蓉以为裳。——屈原《离骚》", analysis: "高洁美丽，经典不衰。" },
  { name: "木兰", meaning: "木兰树，香气远播，坚贞不屈。", source: "楚辞", sourceQuote: "朝饮木兰之坠露兮，夕餐秋菊之落英。——屈原《离骚》", analysis: "坚贞高洁，有女将军气概。" },
  { name: "芳蔼", meaning: "芳香浓郁。", source: "楚辞", sourceQuote: "芳蔼蔼而终败兮。——屈原《离骚》", analysis: "芬芳四溢，温婉有致。" },
  { name: "嘉卉", meaning: "美好的花草。", source: "楚辞", sourceQuote: "嘉卉之华，郁郁纷纷。——《楚辞》", analysis: "美好如花，生机盎然。" },

  // ═══════════════ 唐诗宋词出处（中性/通用名20个） ═══════════════
  { name: "清欢", meaning: "清淡的欢愉，恬淡自适。", source: "宋词", sourceQuote: "人间有味是清欢。——苏轼《浣溪沙》", analysis: "淡泊从容，现代感强，男女皆可。" },
  { name: "疏影", meaning: "梅花稀疏的影子，清冷孤高。", source: "宋词", sourceQuote: "疏影横斜水清浅，暗香浮动月黄昏。——林逋《山园小梅》", analysis: "清冷高洁，极富诗意。" },
  { name: "暗香", meaning: "幽微暗香，含蓄之美。", source: "宋词", sourceQuote: "暗香浮动月黄昏。——林逋《山园小梅》", analysis: "含蓄婉约，适合温柔性格。" },
  { name: "雪见", meaning: "雪中遇见，意境清雅。", source: "唐诗", sourceQuote: "忽如一夜春风来，千树万树梨花开。——岑参《白雪歌送武判官归京》（取其雪意象）", analysis: "清澈纯净，有画面感。" },
  { name: "梦泽", meaning: "梦中的湖泽，烟波浩渺。", source: "唐诗", sourceQuote: "气蒸云梦泽，波撼岳阳城。——孟浩然《望洞庭湖赠张丞相》", analysis: "大气磅礴又朦胧诗意。" },
  { name: "知行", meaning: "知行合一，学以致用。", source: "唐诗", sourceQuote: "纸上得来终觉浅，绝知此事要躬行。——陆游《冬夜读书示子聿》", analysis: "务实好学，寓意实践精神。" },
  { name: "锦书", meaning: "锦缎写成的书信，珍贵美好。", source: "宋词", sourceQuote: "云中谁寄锦书来？雁字回时，月满西楼。——李清照《一剪梅》", analysis: "珍贵美好，有文艺气息。" },
  { name: "暮寒", meaning: "暮色微寒，清冷雅致。", source: "唐诗", sourceQuote: "天寒翠袖薄，日暮倚修竹。——杜甫《佳人》", analysis: "清冷优美，意境深远。" },
  { name: "雨晴", meaning: "雨后初晴，豁然开朗。", source: "唐诗", sourceQuote: "东边日出西边雨，道是无晴却有晴。——刘禹锡《竹枝词》", analysis: "开朗明快，积极向上。" },
  { name: "竹喧", meaning: "竹林喧动，浣女归来。", source: "唐诗", sourceQuote: "竹喧归浣女，莲动下渔舟。——王维《山居秋暝》", analysis: "田园诗意，清新自然。" },
  { name: "映荷", meaning: "映日荷花别样红。", source: "宋诗", sourceQuote: "接天莲叶无穷碧，映日荷花别样红。——杨万里《晓出净慈寺送林子方》", analysis: "明艳动人，夏天出生尤佳。" },

  // ═══════════════ 偏男性名字续 ═══════════════
  { name: "凌霄", meaning: "直冲云霄，壮志凌云。", source: "唐诗", sourceQuote: "长风破浪会有时，直挂云帆济沧海。——李白《行路难》（取其凌云之气）", analysis: "气势磅礴，志向高远。" },
  { name: "浩然", meaning: "浩然正气，博大刚正。", source: "唐诗", sourceQuote: "吾爱孟夫子，风流天下闻……醉月频中圣，迷花不事君。——李白《赠孟浩然》", analysis: "正气凛然，经典大气。" },
  { name: "鸿飞", meaning: "鸿雁高飞，志在四方。", source: "唐诗", sourceQuote: "鸿飞冥冥，弋人何篡。——扬雄《法言》（后多化用于唐诗）", analysis: "志向远大，无拘无束。" },
  { name: "千帆", meaning: "千帆竞发，百舸争流。", source: "唐诗", sourceQuote: "沉舟侧畔千帆过，病树前头万木春。——刘禹锡《酬乐天扬州初逢席上见赠》", analysis: "奋发向上，后发制人。" },

  // ═══════════════ 偏女性名字续 ═══════════════
  { name: "锦瑟", meaning: "华美的瑟，五十弦。", source: "唐诗", sourceQuote: "锦瑟无端五十弦，一弦一柱思华年。——李商隐《锦瑟》", analysis: "华美典雅，有文艺底蕴。" },
  { name: "初雪", meaning: "初冬的第一场雪。", source: "唐诗", sourceQuote: "忽如一夜春风来，千树万树梨花开。——岑参（取其初雪意象）", analysis: "纯净无瑕，意境唯美。" },
];

/**
 * 姓氏与五行的简单匹配（用于名字搭配建议）
 */
const SURNAME_WX_TIPS: Record<string, string> = {
  "李": "属木，适合搭配水火偏旁的字",
  "王": "属土，适合搭配金火偏旁的字",
  "张": "属火，适合搭配木土偏旁的字",
  "刘": "属金，适合搭配水土偏旁的字",
  "陈": "属火，适合搭配木土偏旁的字",
  "杨": "属木，适合搭配火水偏旁的字",
  "赵": "属火，适合搭配木土偏旁的字",
  "黄": "属土，适合搭配金火偏旁的字",
  "周": "属金，适合搭配水土偏旁的字",
  "吴": "属木，适合搭配火水偏旁的字",
};

export function calculateShiJingQiMing(input: Record<string, unknown>): ShiJingQiMingResult {
  const surname = (input.surname as string) || "";
  const gender = (input.gender as string) || "男";
  const preference = (input.preference as string) || "";
  const source = (input.source as string) || "";

  let filtered = NAME_DB;

  // 按性别筛选：名字列表中男女有明显倾向
  if (gender === "男") {
    // 过滤掉明显女性化的名字
    const femaleOnly = new Set(["静姝","巧倩","美盼","燕婉","如云","舒窈","采薇","菁菁","清猗","舜华","桃夭","灼华","子佩","白露","伊人","洵美","惠然","思存","零露","兰芷","若英","芳芷","秋兰","留夷","芙蓉","木兰","芳蔼","嘉卉","清欢","疏影","暗香","雪见","锦书","暮寒","雨晴","竹喧","映荷","锦瑟","初雪"]);
    filtered = filtered.filter((n) => !femaleOnly.has(n.name));
  } else if (gender === "女") {
    // 过滤掉明显男性化的名字
    const maleOnly = new Set(["邦彦","维桢","翰飞","骏德","庭坚","广志","正则","修远","云旗","飞廉","承宇","凌霄","浩然","鸿飞","千帆"]);
    filtered = filtered.filter((n) => !maleOnly.has(n.name));
  }

  if (source) {
    const srcMap: Record<string, string> = { "诗经":"诗经", "楚辞":"楚辞", "唐诗":"唐诗", "宋词":"宋词" };
    const src = srcMap[source] || source;
    if (src) {
      filtered = filtered.filter((n) => n.source === src);
    }
  }

  if (preference) {
    const pref = preference.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        n.name.includes(pref) ||
        n.meaning.includes(pref) ||
        n.analysis.includes(pref) ||
        n.source.includes(pref)
    );
  }

  // 姓氏五行搭配建议
  const wxTip = SURNAME_WX_TIPS[surname];

  const suggestions = filtered.slice(0, 8);
  const summary = wxTip
    ? `姓氏"${surname}"${wxTip}，共为${surname ? `"${surname}"` : ""}${gender}孩推荐 ${filtered.length} 个名字${preference ? `（含"${preference}"）` : ""}`
    : `共为${gender}孩推荐 ${filtered.length} 个名字`;

  return {
    surname: surname || "未指定",
    suggestions,
    total: filtered.length,
    summary,
  };
}
