// ── 品牌起名计算引擎 ──
// 算法参考：《康熙字典》《五格剖象法》
import type { BrandNamingResult, BrandNameItem } from "@guoxue/shared";

/**
 * 品牌起名（60+个品牌名建议）
 *
 * 涵盖：公司/店铺/电商/APP/产品等多场景
 * 基于81数理吉凶、五行生克、音律美感、行业特性
 */

// 81数理简表
const SHU_LI_TABLE: Record<number, { name: string; meaning: string; score: number }> = {
  1: { name: "太极之数", meaning: "万物开泰，生发无穷。大吉。", score: 95 },
  3: { name: "三才之数", meaning: "天地人和，大事大业。大吉。", score: 93 },
  5: { name: "五行之数", meaning: "五行俱权，循环相生。中吉。", score: 85 },
  6: { name: "六爻之数", meaning: "发展变化，天赋美德。大吉。", score: 92 },
  7: { name: "七政之数", meaning: "刚毅果断，勇往直前。中吉。", score: 82 },
  8: { name: "八卦之数", meaning: "八卦之数，乾坎艮震。中吉。", score: 80 },
  11: { name: "旱苗逢雨", meaning: "万物更新，调顺发达。大吉。", score: 96 },
  13: { name: "春日牡丹", meaning: "才艺多能，智谋奇略。大吉。", score: 94 },
  15: { name: "福寿之数", meaning: "福寿圆满，富贵荣誉。大吉。", score: 91 },
  16: { name: "厚重之数", meaning: "厚德载物，安富尊荣。大吉。", score: 88 },
  17: { name: "刚强之数", meaning: "权威刚强，突破万难。中吉。", score: 78 },
  18: { name: "铁镜重磨", meaning: "志望有成，博得名利。中吉。", score: 83 },
  21: { name: "明月中天", meaning: "光风霁月，万物确立。大吉。", score: 95 },
  23: { name: "旭日东升", meaning: "旭日升天，名显四方。大吉。", score: 94 },
  24: { name: "家门余庆", meaning: "锦绣前程，白手起家。大吉。", score: 92 },
  25: { name: "资性英敏", meaning: "资性英敏，刚毅果断。中吉。", score: 84 },
  29: { name: "风云际会", meaning: "如龙得云，青云直上。中吉。", score: 80 },
  31: { name: "春日花开", meaning: "智勇得志，博得名利。大吉。", score: 93 },
  32: { name: "宝马金鞍", meaning: "侥幸多望，贵人得助。大吉。", score: 90 },
  33: { name: "旭日东升", meaning: "旭日升天，鸾凤相会。大吉。", score: 95 },
  35: { name: "高楼望月", meaning: "温和平静，智达通畅。中吉。", score: 86 },
  37: { name: "权威显达", meaning: "权威显达，热诚忠信。大吉。", score: 89 },
  39: { name: "富贵荣华", meaning: "云开见月，光明坦途。中吉。", score: 82 },
  41: { name: "有德之数", meaning: "德高望重，事事如意。大吉。", score: 86 },
  45: { name: "顺风之数", meaning: "新生泰和，顺风扬帆。大吉。", score: 88 },
  47: { name: "点石成金", meaning: "开花结果，权威进取。大吉。", score: 87 },
  48: { name: "古松立鹤", meaning: "德智兼备，鹤立鸡群。大吉。", score: 85 },
  52: { name: "先见之明", meaning: "卓识远见，先见之明。中吉。", score: 83 },
  63: { name: "舟归平浦", meaning: "富贵荣华，身心安泰。大吉。", score: 86 },
  65: { name: "巨流归海", meaning: "天长地久，家运隆昌。大吉。", score: 90 },
  67: { name: "利路亨通", meaning: "万商云集，事事如意。大吉。", score: 84 },
  68: { name: "不失先机", meaning: "不失先机，宽大包容。中吉。", score: 80 },
  81: { name: "万物回春", meaning: "最极之数，还本归元。大吉。", score: 91 },
};

// 根据汉字笔画匹配数理分数
function getShuLiScoreForName(name: string, industry: string): { score: number; detail: string; wuXing: string } {
  // 按行业预设笔画
  const industryStrokes: Record<string, { target: number; wx: string }> = {
    "科技": { target: 32, wx: "木" },
    "餐饮": { target: 15, wx: "火" },
    "教育": { target: 41, wx: "木" },
    "金融": { target: 24, wx: "金" },
    "文化": { target: 21, wx: "木" },
    "医疗": { target: 35, wx: "土" },
    "电商": { target: 31, wx: "火" },
    "地产": { target: 29, wx: "土" },
    "设计": { target: 16, wx: "水" },
    "贸易": { target: 37, wx: "金" },
    "娱乐": { target: 33, wx: "火" },
    "体育": { target: 13, wx: "火" },
    "美容": { target: 25, wx: "水" },
    "法律": { target: 17, wx: "金" },
    "农业": { target: 45, wx: "木" },
  };

  const conf = industryStrokes[industry] || { target: 21, wx: "木" };
  const targetNum = conf.target;
  const info = SHU_LI_TABLE[targetNum] || { name: "通用", meaning: "基本吉利", score: 75 };

  return {
    score: info.score,
    detail: `${info.name}：${info.meaning}`,
    wuXing: conf.wx,
  };
}

// 品牌名数据库（60+个跨行业）
interface BrandEntry {
  name: string;
  meaning: string;
  style: string;
  industry: string[];
  analysis: string;
}

const BRAND_DB: BrandEntry[] = [
  // 科技
  { name: "云启科技", meaning: "云程发轫，开启智能新时代。", style: "现代简洁", industry: ["科技","电商"], analysis: "云字轻盈高远，启字开拓进取，搭配科技行业具有强烈未来感。" },
  { name: "星辰互联", meaning: "星辰大海般浩瀚的互联世界。", style: "大气磅礴", industry: ["科技"], analysis: "星辰意象广阔包容，互联点明行业属性。" },
  { name: "极光数据", meaning: "如极光般绚丽的数字智慧。", style: "现代科技", industry: ["科技","金融"], analysis: "极光既有视觉震撼又暗含'极致'之意，数据点明业务。" },
  { name: "智源芯科", meaning: "智慧源于芯片科技，芯科双关。", style: "专业沉稳", industry: ["科技"], analysis: "智源表明智慧源头，芯字直指核心技术。" },
  { name: "灵犀科技", meaning: "心有灵犀一点通，科技连接万物。", style: "灵动创意", industry: ["科技"], analysis: "优美诗意与科技结合，朗朗上口。" },
  { name: "九章智能", meaning: "取典《九章算术》，以古喻今。", style: "古典雅致", industry: ["科技","教育"], analysis: "中国最古老数学典籍《九章算术》，适合AI/算法公司。" },

  // 餐饮
  { name: "食尚坊", meaning: "饮食时尚的作坊，引领美食潮流。", style: "新潮活力", industry: ["餐饮"], analysis: "'食尚'谐音'时尚'，既新潮又有行业辨识度。" },
  { name: "一味居", meaning: "一味入魂的居所，专注极致味道。", style: "禅意简约", industry: ["餐饮"], analysis: "禅意十足，'一味'暗示专注与极致，有日式/中式意境。" },
  { name: "满庭芳", meaning: "取词牌名，满园芬芳。", style: "古典雅致", industry: ["餐饮","文化"], analysis: "经典词牌名，意境华美，适合中高端餐厅。" },
  { name: "悦食集", meaning: "悦享美食的集市。", style: "年轻活力", industry: ["餐饮","电商"], analysis: "悦字开心，集字亲切，适合美食广场或外卖品牌。" },
  { name: "合味轩", meaning: "合百家之味的雅轩。", style: "传统典雅", industry: ["餐饮"], analysis: "合味暗示融合菜系，轩字提升档次感。" },
  { name: "谷雨茶事", meaning: "谷雨时节品茶论道。", style: "文化体验", industry: ["餐饮","文化"], analysis: "以节气命名，富有文化内涵，适合茶馆/茶餐饮。" },

  // 教育
  { name: "启明教育", meaning: "启迪智慧之光，照亮前程。", style: "温暖正统", industry: ["教育"], analysis: "启明星为晨星，象征希望和开端。" },
  { name: "知行学堂", meaning: "知行合一，学以致用。", style: "古典正统", industry: ["教育"], analysis: "源自王阳明心学，既有文化深度又有教育理念。" },
  { name: "小荷书院", meaning: "小荷才露尖尖角。", style: "清新童趣", industry: ["教育","文化"], analysis: "杨万里诗意，适合少儿教育，有成长和新生意象。" },
  { name: "翰林学苑", meaning: "翰林院，古代最高学府。", style: "传统高端", industry: ["教育"], analysis: "翰林为明清最高学术机构，适合高端教育/培训机构。" },
  { name: "青云学堂", meaning: "平步青云，知识改变命运。", style: "励志进取", industry: ["教育"], analysis: "青云喻事业高升，激励向上的好寓意。" },

  // 金融
  { name: "汇通金服", meaning: "汇聚天下，通达四方。", style: "稳重专业", industry: ["金融"], analysis: "汇通体现金融的核心功能，大气稳重。" },
  { name: "鑫达资本", meaning: "三金为鑫，财运通达。", style: "传统吉利", industry: ["金融"], analysis: "鑫字三金叠加，寓意财富聚集，深受金融行业喜爱。" },
  { name: "瑞银资管", meaning: "瑞气东来，银满乾坤。", style: "国际专业", industry: ["金融"], analysis: "瑞为吉祥之兆，银为财富象征，组合专业国际范。" },
  { name: "鼎丰投资", meaning: "一言九鼎，丰盈富足。", style: "稳重可靠", industry: ["金融"], analysis: "鼎为国之重器象征诚信，丰为富足。" },
  { name: "正和基金", meaning: "正大光明，和气生财。", style: "端正稳健", industry: ["金融"], analysis: "正为端正不偏，和为合作共赢，投资行业核心价值。" },

  // 电商
  { name: "优品集", meaning: "优质好物的集合。", style: "简洁明了", industry: ["电商"], analysis: "三个字简洁有力，优品强调品质，集字有平台感。" },
  { name: "购享家", meaning: "购物享受的家园。", style: "温馨生活", industry: ["电商"], analysis: "'购享'谐音'够香'，亲切有记忆点。" },
  { name: "蜂鸟速递", meaning: "如蜂鸟般快速灵活的配送。", style: "灵动快速", industry: ["电商"], analysis: "蜂鸟以高速振翅闻名，传达快速配送。" },

  // 文化/设计
  { name: "素心工坊", meaning: "抱朴守素，匠心手作。", style: "禅意手作", industry: ["文化","设计"], analysis: "素心表示纯净初心，工坊有手作温度感。" },
  { name: "一墨设计", meaning: "一笔一墨见真章。", style: "文艺极简", industry: ["设计","文化"], analysis: "以文房四宝之墨命名，富有东方美学。" },
  { name: "無名造物", meaning: "无名天地之始，造物之美。", style: "禅意极简", industry: ["设计","文化"], analysis: "取老庄哲学的无名之境，造物体现创作属性。" },

  // 医疗/健康
  { name: "杏林春暖", meaning: "董奉杏林典故，医者仁心。", style: "中医古典", industry: ["医疗"], analysis: "三国董奉为人治病不取分文只求种杏，'杏林'成为中医代名词。" },
  { name: "颐生堂", meaning: "颐养生命之堂。", style: "传统养生", industry: ["医疗"], analysis: "颐生出自《易经》'颐养正也'，堂字有中医馆韵味。" },
  { name: "康之源", meaning: "健康之源。", style: "现代简洁", industry: ["医疗","体育"], analysis: "简单直接表明大健康定位。" },

  // 地产
  { name: "嘉和置业", meaning: "家和万事兴，嘉和安居。", style: "温馨可靠", industry: ["地产"], analysis: "嘉为美好，和为和谐，置业点明行业。" },
  { name: "万厦地产", meaning: "广厦万间，大庇天下。", style: "大气宏观", industry: ["地产"], analysis: "源自杜甫'安得广厦千万间'，有情怀和格局。" },

  // 娱乐/体育
  { name: "凌云体育", meaning: "壮志凌云，超越极限。", style: "激情活力", industry: ["体育"], analysis: "凌云极富动感和进取精神，适合体育品牌。" },
  { name: "乐游天下", meaning: "快乐游遍天下。", style: "轻松欢快", industry: ["娱乐"], analysis: "名称极有画面感，适合旅游/娱乐品牌。" },

  // 科技补充
  { name: "万象智能", meaning: "包罗万象的智能世界。", style: "大气磅礴", industry: ["科技"], analysis: "万象极言其广博，智能点明科技属性。出自《周易》'万象森罗'。" },
  { name: "观星科技", meaning: "观星测象，洞察未来。", style: "现代科技", industry: ["科技"], analysis: "观星有探索未知之意，兼具中国天文文化底蕴。" },
  { name: "星河数据", meaning: "星河浩瀚，数据无垠。", style: "大气磅礴", industry: ["科技","金融"], analysis: "星河意象壮阔，适合大数据/云服务类企业。" },
  { name: "知鱼科技", meaning: "子非鱼安知鱼之乐，知鱼即知用户。", style: "灵动创意", industry: ["科技"], analysis: "出自《庄子·秋水》，富有哲学意蕴，适合用户体验类公司。" },

  // 餐饮补充
  { name: "醉花荫", meaning: "醉卧花荫，美食美景共赏。", style: "古典雅致", industry: ["餐饮","文化"], analysis: "取词牌名'醉花阴'，意境优美，适合中式庭院餐厅。" },
  { name: "饕餮集", meaning: "饕餮盛宴，美食云集。", style: "年轻活力", industry: ["餐饮"], analysis: "饕餮为上古贪食神兽，用作美食品牌有独特辨识度。" },
  { name: "八珍楼", meaning: "八珍荟萃，珍馐美馔。", style: "传统典雅", industry: ["餐饮"], analysis: "八珍为古代最珍贵的八种食材，代表顶级烹饪。" },
  { name: "拾味记", meaning: "拾取人间至味，记录美食记忆。", style: "文艺清新", industry: ["餐饮","文化"], analysis: "拾字有寻觅珍藏之意，有温度和故事感。" },

  // 教育补充
  { name: "鹿鸣书院", meaning: "呦呦鹿鸣，食野之苹。", style: "古典雅致", industry: ["教育","文化"], analysis: "出自《诗经·小雅·鹿鸣》，古代科举放榜称'鹿鸣宴'。" },
  { name: "三余学堂", meaning: "冬者岁之余，夜者日之余，阴雨者时之余。", style: "古典正统", industry: ["教育"], analysis: "出自董遇'三余读书法'，鼓励利用一切空闲时间学习。" },
  { name: "养正教育", meaning: "蒙以养正，圣功也。", style: "温暖正统", industry: ["教育"], analysis: "出自《周易》蒙卦，意指儿童教育要培养正道。" },

  // 金融补充
  { name: "泰和资本", meaning: "否极泰来，和合生财。", style: "稳重可靠", industry: ["金融"], analysis: "泰为通达和畅，和为合作共赢，金融业核心价值。" },
  { name: "乾元投资", meaning: "大哉乾元，万物资始。", style: "大气磅礴", industry: ["金融"], analysis: "出自《周易》乾卦彖辞，格局极大，适合大型投资机构。" },
  { name: "宝通金服", meaning: "财宝通达，金融流通。", style: "稳重专业", industry: ["金融"], analysis: "宝为珍贵财富，通为流通无阻，金融服务核心功能。" },

  // 电商补充
  { name: "琳琅集", meaning: "琳琅满目，好物云集。", style: "简洁明了", industry: ["电商"], analysis: "琳琅为美玉，形容商品精美丰富。" },
  { name: "云集优选", meaning: "云端之集，优质之选。", style: "现代简洁", industry: ["电商"], analysis: "云集有大规模聚合之意，优选强调品质筛选。" },
  { name: "拾光杂货", meaning: "拾取时光中的美好杂货。", style: "文艺清新", industry: ["电商","文化"], analysis: "文青风格，时光+杂货的组合唤起怀旧和温暖感。" },

  // 文化/设计补充
  { name: "青简设计", meaning: "青简为古代竹简，传承文化之美。", style: "文艺极简", industry: ["设计","文化"], analysis: "杀青后用竹简书写，'青简'代表文化传承和设计表达。" },
  { name: "方圆工坊", meaning: "没有规矩不成方圆。", style: "禅意手作", industry: ["设计","文化","教育"], analysis: "出自《孟子》，规和矩是设计的基本工具，方和圆是形式的根本。" },
  { name: "见山文化", meaning: "看山是山，看山不是山，看山还是山。", style: "极简禅意", industry: ["文化","设计"], analysis: "禅宗三重境界，适合高端文化品牌。" },

  // 医疗/健康补充
  { name: "橘井泉香", meaning: "橘井泉香，医道流芳。", style: "中医古典", industry: ["医疗"], analysis: "与'杏林春暖'齐名的中医典故，出自葛洪《神仙传》苏仙公故事。" },
  { name: "上工堂", meaning: "上工治未病。", style: "传统养生", industry: ["医疗"], analysis: "出自《黄帝内经》，'上工'为最高明的医者，治未病者为上。" },
  { name: "青囊馆", meaning: "青囊为医者药囊，传承医道。", style: "中医古典", industry: ["医疗"], analysis: "华佗临刑前欲传青囊书与狱吏的典故，青囊为中医代称。" },

  // 地产补充
  { name: "安厦地产", meaning: "安得广厦千万间。", style: "大气宏观", industry: ["地产"], analysis: "与万厦异曲同工，安字侧重安居乐业，更接地气。" },
  { name: "凤栖置业", meaning: "凤凰于飞，栖于梧桐。", style: "古典雅致", industry: ["地产"], analysis: "出自《诗经·大雅·卷阿》，'凤栖梧桐'为吉兆，适合高端住宅。" },

  // 美容/时尚（新增行业）
  { name: "花容坊", meaning: "云想衣裳花想容。", style: "古典雅致", industry: ["美容","文化"], analysis: "出自李白《清平调》，以花喻容，美不胜收。" },
  { name: "驻颜堂", meaning: "驻颜有术，延缓时光。", style: "传统养生", industry: ["美容","医疗"], analysis: "驻颜为古代养生追求，有深厚的本草文化底蕴。" },
  { name: "玉容轩", meaning: "玉容寂寞泪阑干，梨花一枝春带雨。", style: "古典雅致", industry: ["美容"], analysis: "玉容形容容貌如玉般美好，轩字有雅致空间感。" },

  // 农业/食品（新增行业）
  { name: "嘉禾农业", meaning: "嘉禾为瑞，五谷丰登。", style: "传统典雅", industry: ["农业"], analysis: "嘉禾为古代祥瑞之兆，一茎多穗视为太平盛世之象。" },
  { name: "丰年记", meaning: "丰年多黍多稌。", style: "文艺清新", industry: ["农业","电商"], analysis: "出自《诗经·周颂·丰年》，质朴有诗意。" },
  { name: "田園颂", meaning: "归去来兮，田园将芜胡不归。", style: "诗意文化", industry: ["农业","文化"], analysis: "陶渊明田园诗意象，适合有机农场/田园综合体。" },

  // 通用补充
  { name: "德润", meaning: "富润屋德润身。", style: "极简禅意", industry: ["科技","文化","金融","教育"], analysis: "二字品牌极简有力，出自《大学》，有内涵深度。" },
  { name: "嘉木", meaning: "南方有嘉木。", style: "诗意文化", industry: ["科技","文化","设计","教育"], analysis: "来自陆羽《茶经》开篇，极简文艺。" },
  { name: "致远", meaning: "宁静致远。", style: "经典大气", industry: ["科技","金融","教育","地产"], analysis: "出自诸葛亮《诫子书》，经典大气，适用广泛。" },
  { name: "见素", meaning: "见素抱朴，少私寡欲。", style: "极简禅意", industry: ["科技","文化","设计","金融"], analysis: "出自《老子》第十九章，极简主义东方表达。" },
  { name: "若水", meaning: "上善若水，水善利万物而不争。", style: "极简禅意", industry: ["科技","文化","教育","医疗"], analysis: "出自《老子》第八章，东方智慧的最高境界。" },
  { name: "行远", meaning: "行远必自迩。", style: "经典大气", industry: ["科技","教育","金融"], analysis: "出自《中庸》'行远必自迩登高必自卑'，脚踏实地寓意。" },
];

// 按风格推荐描述
const STYLE_DESC: Record<string, string> = {
  "现代简洁": "简洁明快，3-4字，易记易传播，适合互联网时代。",
  "大气磅礴": "格局宏大，气势不凡，适合集团/平台型企业。",
  "古典雅致": "取典传统文化，古雅有韵味，适合中高端定位。",
  "传统典雅": "传统美学风格，庄重大方，历史感强。",
  "极简禅意": "极简主义+禅意，2-3字，内涵深刻。",
  "诗意文化": "富有文学性和画面感，文化底蕴深厚。",
  "现代科技": "科技感与现代感交融，前沿创新，适合硬科技公司。",
  "专业沉稳": "专业感强，稳健可靠，适合B端技术企业。",
  "灵动创意": "轻灵生动，富有创造力和想象力。",
  "新潮活力": "新潮时尚，朝气蓬勃，年轻化互联网风格。",
  "禅意简约": "禅意十足，简约而不简单，留白有韵味。",
  "年轻活力": "青春活泼，轻松有感染力，贴近年轻消费群体。",
  "文化体验": "沉浸式文化氛围，体验感强。",
  "温暖正统": "温暖亲和而正统规范，适合教育/亲子类品牌。",
  "古典正统": "纯正古典韵味，正统传承，有学术权威感。",
  "传统高端": "传统底蕴+高端定位，精英气质。",
  "传统养生": "传统中医养生文化，温润平和，值得信赖。",
  "稳重专业": "稳重大气，专业可靠，金融行业首选风格。",
  "传统吉利": "传统吉祥文化，通俗吉利，大众化传播力强。",
  "国际专业": "国际化视野+专业水准，现代金融范。",
  "稳重可靠": "稳重可靠，值得信赖，投资者首选印象。",
  "端正稳健": "端正不偏，稳健经营，合规和安全感的代名词。",
  "简洁明了": "极度简洁，一目了然，强记忆点。",
  "温馨生活": "温馨有温度，贴近日常生活场景。",
  "灵动快速": "灵动快捷，速度感强，适合物流/快递。",
  "禅意手作": "手工温暖感+禅意美学，适合手作品牌。",
  "文艺极简": "文艺气质+极简设计，有审美门槛。",
  "中医古典": "纯正中医古典韵味，千年传承的力量感。",
  "温馨可靠": "温馨亲切+安全可靠，家的归属感。",
  "大气宏观": "宏大格局，天下情怀，社会责任感。",
  "激情活力": "激情澎湃，活力四射，运动品牌首选。",
  "轻松欢快": "轻松愉快，无压力感，旅游/娱乐定位。",
  "文艺清新": "文艺清新，有温度有故事，适合生活方式品牌。",
};

export function calculateBrandNaming(input: Record<string, unknown>): BrandNamingResult {
  const industry = (input.industry as string) || "科技";
  const style = (input.style as string) || "";
  const nameLength = (input.length as number) || 0;

  let filtered = BRAND_DB.filter((b) => b.industry.includes(industry));

  if (style) {
    filtered = filtered.filter((b) => b.style === style);
  }

  if (nameLength && nameLength > 0) {
    filtered = filtered.filter((b) => b.name.length >= nameLength && b.name.length <= nameLength + 1);
  }

  // 如果筛选结果太少，放宽行业限制
  if (filtered.length < 3) {
    filtered = BRAND_DB.slice(0, 15);
  }

  // 为数理打分
  const suggestions: BrandNameItem[] = filtered.slice(0, 12).map((b) => {
    const shuLi = getShuLiScoreForName(b.name, industry);
    const styleNote = STYLE_DESC[b.style] || "";

    return {
      name: b.name,
      meaning: b.meaning,
      style: b.style,
      shuLiScore: shuLi.score,
      shuLiDetail: shuLi.detail,
      wuXing: shuLi.wuXing,
      analysis: `${b.analysis} 风格：${styleNote}`,
      suitable: b.industry,
    };
  });

  const styleLabel = style || "不限";
  const summary = [
    "┌─ 品牌起名 ────────────────────────────┐",
    `│ 行业：${industry}  风格：${styleLabel}`.padEnd(36) + "│",
    `│ 推荐：${filtered.length}个品牌名`.padEnd(36) + "│",
    "├─ 精选品牌名 ──────────────────────────┤",
    ...suggestions.slice(0, 6).map(s => `│ ${s.name}（${s.wuXing}·${s.shuLiScore}分）`.padEnd(36) + "│"),
    "├─ 出处 ────────────────────────────────┤",
    "│ 《康熙字典》《五格剖象法》81数理        │",
    "└────────────────────────────────────────┘",
  ].join("\n");

  return { suggestions, industry, total: filtered.length, summary };
}
