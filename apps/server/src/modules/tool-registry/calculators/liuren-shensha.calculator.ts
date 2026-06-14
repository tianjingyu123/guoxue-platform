// ── 六壬神煞大全计算引擎 ──
// 算法参考：《大六壬指南》《六壬大全》《壬归》
import type { LiuRenShenShaResult, LiuRenShenShaItem } from "@guoxue/shared";

/**
 * 六壬神煞大全（56个神煞）
 *
 * 数据来源：《大六壬指南》《六壬大全》《六壬粹言》
 *          每个神煞包含：名称/别名/类型/五行/吉凶/位置/含义/详述/歌诀/宜忌
 */

const SHEN_SHA_DB: LiuRenShenShaItem[] = [
  // ═══════════════ 吉神（8个） ═══════════════
  { name: "天乙贵人", alias: ["贵人","天乙"], type: "神", wuXing: "土", jiXiong: "吉", position: "视日干而定", mainMeaning: "至尊至贵之神，统率诸神，逢凶化吉。", detailed: "天乙贵人为百神之主，所临之处百神拱卫。甲戊庚日昼贵在丑夜贵在未，乙己日昼在子夜在申，丙丁日昼在亥夜在酉，辛日昼在午夜在寅，壬癸日昼在巳夜在卯。凡占求官、诉讼、出行见贵最喜贵人加临。", formula: "甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎，此是贵人方。", suitable: ["求官求职","拜见贵人","诉讼申冤","合作签约"], avoid: [] },
  { name: "青龙", alias: ["青龙神","天乙青龙"], type: "神", wuXing: "木", jiXiong: "吉", position: "寅", mainMeaning: "第一吉神，主喜事临门/升官发财/婚姻添丁。", detailed: "青龙为东方木神，主生发之气。青龙加临命宫或本命上，多主喜事临门。得地（在旺相之月）则为龙腾九天万事顺遂；失地（在休囚之月）为青龙折足，喜中有忧。凡占婚姻、考试、出行最喜青龙见。", formula: "青龙在天寅位上，木德星君司春令。加官进禄婚姻吉，百事见之喜气生。", suitable: ["嫁娶婚姻","开业庆典","求财投资","出行旅游"], avoid: [] },
  { name: "六合", alias: ["六合神"], type: "神", wuXing: "木", jiXiong: "吉", position: "卯", mainMeaning: "和合之神，主婚姻和谐/交易成功。", detailed: "六合为东方卯木，为和合之神。六合与婚姻、交易最为密切，凡涉及二人以上合作之事，皆喜六合临之。得地则万事和合顺利，失地则虚假和合、表面和气。六合与天后同宫为龙凤和鸣大吉。", formula: "六合卯位正东方，和合婚姻交易强。万事得他皆顺利，阴阳和合喜洋洋。", suitable: ["婚姻嫁娶","合作签约","谈判协商","寻人觅物"], avoid: ["诉讼官司"] },
  { name: "太常", alias: ["太常神"], type: "神", wuXing: "土", jiXiong: "吉", position: "未", mainMeaning: "礼仪之神，主宴会/酒食/衣帛/文化。", detailed: "太常为未土司礼仪，主宴享欢乐之事。得太常临宫多主饮食衣帛之喜。太常在古代是掌管朝廷典礼的官职，引申为文化和礼仪的象征。与青龙同宫主庆宴之喜，与太阴同宫主衣帛之财。", formula: "太常未土在西南，衣帛酒食宴席间。礼仪文明由此显，得地吉庆喜相连。", suitable: ["宴会请客","衣着购物","文化活动","礼仪庆典"], avoid: [] },
  { name: "天后", alias: ["天后神","天妃"], type: "神", wuXing: "水", jiXiong: "吉", position: "亥", mainMeaning: "后妃之神，主婚姻/恩泽/妇人之事。", detailed: "天后为亥水后宫神，为至阴至柔之神。凡占婚姻妇女之事，天后最为得力。与青龙同宫为「龙凤呈祥」大吉婚姻格，与六合同宫为「和合美满」格。天后在命宫上多主女性贵人相助。", formula: "天后亥水后宫神，婚姻恩泽喜相亲。女人之事多主掌，得地阴柔助夫君。", suitable: ["婚姻嫁娶","求子求孕","女性祈福","托女方办事"], avoid: [] },
  { name: "太阴", alias: ["太阴神","月神"], type: "神", wuXing: "金", jiXiong: "吉", position: "酉", mainMeaning: "妇女阴私之神，主金银/暗中之利。", detailed: "太阴为酉金，为隐伏之神。主暗中得财、妇女之事。与青龙贵人同宫为「贵人暗助」，与玄武同宫反主「暗中有贼」。凡暗中操作之事（幕后谈判、秘密投资）太阴得地最为得力。", formula: "太阴酉金正西方，妇女金帛暗中藏。得地贤妻助夫贵，暗中得利不用忙。", suitable: ["暗中投资","金银买卖","托隐秘之事","女性事"], avoid: ["明面公开之事"] },
  { name: "传送", alias: ["白虎（吉变）"], type: "神", wuXing: "金", jiXiong: "平", position: "申", mainMeaning: "道路之神，主出行/传送/信息。", detailed: "传送为申金，掌管道路和信息传递。凡占出行是否顺利、信息是否到达，以此神为准。传送与朱雀同宫主「书到即行」，与青龙同宫主「出行大喜」。", formula: "传送在中道路神，出行信息辨伪真。临官驿马催人动，万里行程有定论。", suitable: ["出行远门","信息传递","物流运输"], avoid: [] },
  { name: "魁罡", alias: ["天魁","天罡"], type: "神", wuXing: "土", jiXiong: "平", position: "戌/辰", mainMeaning: "文章之府/斗讼之星。戌为天魁临文章，辰为天罡临斗讼。", detailed: "天魁（戌）为文章之府，主科举考试。天罡（辰）为斗讼之星，主纷争是非。天魁得天则为「文星高照」，天罡失地则为「言语是非」。", formula: "魁罡二神分戌辰，一文一武判分明。天魁文章高天下，天罡斗讼是非生。", suitable: ["考试科举（天魁）","打官司维权（天罡）"], avoid: ["口舌纷争（天罡忌）"] },

  // 吉神续（4个）
  { name: "功曹", alias: ["寅神"], type: "神", wuXing: "木", jiXiong: "吉", position: "寅", mainMeaning: "官吏之神，主升迁/官府之事。", detailed: "功曹为寅木，是官府小官吏的象征。得地主官职升迁顺利，失地主小吏为难。凡占官运/面试/入职最喜功曹加临。", formula: "功曹在寅木德星，官府升迁最有灵。面试入职逢此吉，官员相助事业兴。", suitable: ["面试入职","官运升迁","官府交涉"], avoid: [] },
  { name: "太冲", alias: ["卯神"], type: "神", wuXing: "木", jiXiong: "吉", position: "卯", mainMeaning: "舟车之神，主出行顺利/交通工具。", detailed: "太冲为卯木，为舟车交通之神。凡占出行安全/车辆购买/搬家移居最宜太冲加临。太冲与青龙同宫主「乘车得吉」。", formula: "太冲在卯正东方，舟车出行保安康。移居乔迁逢此吉，一路顺风到家乡。", suitable: ["出行旅游","买车","搬家乔迁"], avoid: [] },
  { name: "大吉", alias: ["丑神"], type: "神", wuXing: "土", jiXiong: "吉", position: "丑", mainMeaning: "田地仓库之神，主田产/仓库/积蓄。", detailed: "大吉为丑土，掌管田产仓库积蓄之事。凡占买房置地、存款积蓄、仓储物流最喜大吉加临。大吉与青龙同宫主「添产置业」大吉。", formula: "大吉在丑管田仓，买房置地最吉祥。积蓄仓储逢此旺，家业安稳有余粮。", suitable: ["买房置地","存款理财","仓储物流"], avoid: [] },
  { name: "从魁", alias: ["酉神"], type: "神", wuXing: "金", jiXiong: "平", position: "酉", mainMeaning: "金银玉器之神，主珠宝/财富。", detailed: "从魁为酉金，掌管金银珠宝等贵重物品。得地主得意外之财、珠宝首饰之喜。", formula: "从魁在酉管金银，珠宝玉器莫他寻。得地意外之财至，失地空有富贵心。", suitable: ["珠宝买卖","意外之财"], avoid: [] },

  // 吉神续二（14个）
  { name: "天德", alias: ["天德贵人","天德星"], type: "神", wuXing: "木", jiXiong: "吉", position: "随月建而变", mainMeaning: "天道福德之神，百福之首，解百厄。", detailed: "天德为天之福德，百神之中最为仁慈。天德临命多主祖上积德今生受福，遇凶煞得天德解救可化凶为吉。凡求福消灾、化解矛盾最喜天德加临。正月在丁二月在申三月在壬四月在辛五月在亥六月在甲七月在癸八月在寅九月在丙十月在乙十一月在巳十二月在庚。", formula: "正丁二申三壬四辛五亥六甲七癸八寅九丙十乙子巳丑庚此是天德方。", suitable: ["祈福消灾","化解矛盾","行善积德"], avoid: [] },
  { name: "月德", alias: ["月德贵人","月德星"], type: "神", wuXing: "火", jiXiong: "吉", position: "随月建而变", mainMeaning: "月宫福德之神，仅次于天德，主化凶为吉。", detailed: "月德为太阴之德，主消灾解难。天月二德俱全者一生少灾殃。月德利合作、合伙，能增人缘。正月在丙二月在甲三月在壬四月在庚五月在丙六月在甲七月在壬八月在庚九月在丙十月在甲十一月在壬十二月在庚。", formula: "正丙二甲三壬四庚复回五丙六甲七壬八庚继之九丙十甲子壬丑庚月德方。", suitable: ["合作合伙","增人缘","化小人为贵人"], avoid: [] },
  { name: "天赦", alias: ["天赦日","天赦星"], type: "神", wuXing: "水", jiXiong: "吉", position: "特定日", mainMeaning: "上天赦免罪过之神，逢之百无禁忌。", detailed: "天赦为天帝赦免罪过的日子。春月戊寅日、夏月甲午日、秋月戊申日、冬月甲子日。天赦日宜忏悔、祈福、开市、婚姻，百无禁忌。命中带天赦多主一生少有牢狱官非。", formula: "春寅夏午秋申冬子，天赦四时各有时。戊寅甲午戊申甲子日，诸事用之百无忌。", suitable: ["忏悔祈福","开市交易","婚姻嫁娶","出狱改过"], avoid: [] },
  { name: "天喜", alias: ["天喜星"], type: "神", wuXing: "火", jiXiong: "吉", position: "随月建而变", mainMeaning: "天降喜事之神，主婚嫁/添丁/升迁之喜。", detailed: "天喜为喜庆之神，加临命宫多主年内有喜事。婚嫁择日必看天喜在否。正月在戌二月在亥三月在子四月在丑五月在寅六月在卯七月在辰八月在巳九月在午十月在未十一月在申十二月在酉。天喜与天德同宫为双喜临门。", formula: "正戌二亥三子四丑五寅六卯七辰八巳九午十未子申丑酉天喜临。", suitable: ["婚嫁择日","开业庆典","求子添丁"], avoid: [] },
  { name: "红鸾", alias: ["红鸾星"], type: "神", wuXing: "火", jiXiong: "吉", position: "随年支而变", mainMeaning: "正缘桃花星，主婚恋/人缘/喜庆。", detailed: "红鸾为最正宗的婚恋吉星。加临命宫多主该年有恋爱或婚嫁之喜。子年在卯丑年在寅寅年在丑卯年在子辰年在亥巳年在戌午年在酉未年在申申年在未酉年在午戌年在巳亥年在辰。红鸾与天喜同宫为「龙凤呈祥」，婚嫁极品吉日。", formula: "红鸾子卯丑在寅，寅在丑上卯子轮。辰亥巳戌午在酉，未申申未酉午戌巳亥在辰。", suitable: ["相亲恋爱","婚嫁择日","拓展人缘"], avoid: [] },
  { name: "禄神", alias: ["禄星","天禄","十干禄"], type: "神", wuXing: "金", jiXiong: "吉", position: "视日干而定", mainMeaning: "官禄钱财之神，主食禄/俸禄/财富。", detailed: "禄神即十干临官之位，代表俸禄和正当收入。禄神加临财帛宫多主该年月正财稳定。甲禄在寅乙禄在卯丙戊禄在巳丁己禄在午庚禄在申辛禄在酉壬禄在亥癸禄在子。禄神忌空亡和冲破，破则减薪失禄。", formula: "甲禄寅乙禄卯丙戊在巳丁己午。庚禄申辛禄酉壬在亥癸居子。", suitable: ["求职面试","谈薪资","开业求财"], avoid: [] },
  { name: "文昌", alias: ["文昌星","文曲星"], type: "神", wuXing: "木", jiXiong: "吉", position: "视日干而定", mainMeaning: "文运科举之神，主学业/考试/文章/智慧。", detailed: "文昌为学业和考运的守护星。加临命宫多主该年学业进步或考试顺利。甲日文昌在巳乙日在午丙日在申丁日在酉戊日在申己日在酉庚日在亥辛日在子壬日在寅癸日在卯。文昌与青龙同宫为鱼跃龙门大吉格。", formula: "甲乙巳午报君知，丙戊申丁己酉施。庚亥辛子壬寅位，癸卯文昌最清奇。", suitable: ["考试备考","论文写作","文化创作"], avoid: [] },
  { name: "学堂", alias: ["学堂星","词馆"], type: "神", wuXing: "木", jiXiong: "吉", position: "视日干纳音而定", mainMeaning: "学习和教育之神，主教学/读书/研究。", detailed: "学堂为读书求学之吉星。加临命宫多主该年适宜深造进修。学堂与文昌同宫则为学霸格，考试必中。学堂不利贪玩懒学者，因为学堂需要日主主动求学。", formula: "木命人学堂在亥，火命学堂在寅，土命学堂在申，金命学堂在巳，水命学堂在申。", suitable: ["入学深造","拜师学艺","学术研究"], avoid: ["贪玩不学"] },
  { name: "将星", alias: ["将星","将军星"], type: "神", wuXing: "金", jiXiong: "吉", position: "视地支而定", mainMeaning: "权力统御之神，主领导力/组织能力/权力。", detailed: "将星为权力和统御的象征。命带将星多主有领导才能。加临官禄宫多主职场升迁。将星与青龙贵人为大贵格。子午卯酉年将星在酉，寅申巳亥年在卯，辰戌丑未年在子。有将星而无制者反为刚愎自用。", formula: "子午卯酉在酉乡，寅申巳亥卯位藏。辰戌丑未子中取，将星得地是栋梁。", suitable: ["竞聘升职","创业当老板","组建团队"], avoid: ["独断专行","不纳谏言"] },
  { name: "金舆", alias: ["金舆星"], type: "神", wuXing: "金", jiXiong: "吉", position: "视日干而定", mainMeaning: "宝马金车之贵神，主出行舒适/富贵气派。", detailed: "金舆为车载贵人之象。得地多主出行有好车代步（在古时为轿子，今为汽车）。金舆与禄神同宫主富贵双全。甲日金舆在辰乙日在巳丙戊日在未丁己日在申庚日在戌辛日在亥壬日在丑癸日在寅。", formula: "甲辰乙巳丙戊未，丁己在申庚戌金。辛亥壬丑癸寅位，金舆得地是贵人。", suitable: ["购车买车","出行旅游","提升生活品质"], avoid: [] },
  { name: "金匮", alias: ["金匮星"], type: "神", wuXing: "金", jiXiong: "吉", position: "随月建而变", mainMeaning: "金柜财库之神，主储蓄/珍藏/贵重物品。", detailed: "金匮为收纳珍藏之财神。得地主存款增加或获得贵重物品。正月在辰二月在亥三月在午四月在丑五月在申六月在卯七月在戌八月在巳九月在子十月在未十一月在寅十二月在酉。", formula: "正辰二亥三午四丑五申六卯七戌八巳九子十未子寅丑酉寻金匮。", suitable: ["存款理财","收藏投资","收纳整理"], avoid: ["铺张浪费"] },
  { name: "玉堂", alias: ["玉堂星"], type: "神", wuXing: "土", jiXiong: "吉", position: "随月建而变", mainMeaning: "玉堂富贵之神，主富贵/豪宅/文化艺术鉴赏。", detailed: "玉堂为富贵堂皇的象征。得地主居住环境提升或文化艺术修养提升。玉堂贵人同宫为玉堂金马大贵格。正月在未二月在丑三月在巳四月在寅五月在戌六月在辰七月在亥八月在未九月在丑十月在申十一月在午十二月在戌。", formula: "正未二丑三巳四寅五戌六辰七亥八未九丑十申子午丑戌玉堂真。", suitable: ["买房置业","装修装饰","艺术收藏"], avoid: [] },
  { name: "司命", alias: ["司命星"], type: "神", wuXing: "火", jiXiong: "吉", position: "随月建而变", mainMeaning: "掌管寿命和命运之神，主长寿/安康/福气。", detailed: "司命为掌管命籍之神。得地主身体健康和寿命绵长。司命与天德同宫为寿山福海大吉格。正月在申二月在亥三月在寅四月在巳五月在申六月在亥七月在寅八月在巳九月在申十月在亥十一月在寅十二月在巳。", formula: "正申二亥三寅四巳五申六亥七寅八巳九申十亥子寅丑巳司命轮。", suitable: ["祈福延寿","体检保健","养生养老"], avoid: [] },
  { name: "天厨", alias: ["天厨星"], type: "神", wuXing: "火", jiXiong: "吉", position: "视日干而定", mainMeaning: "御厨饮食之神，主美食/宴飨/饮食之福。", detailed: "天厨为天上御厨，主饮食丰美和宴飨快乐。得地多主口福不浅常有美食享用。甲日天厨在巳乙日在午丙日在巳丁日在午戊日在申己日在酉庚日在亥辛日在子壬日在寅癸日在卯。天厨与太常同宫为盛宴之喜。", formula: "甲乙巳午天厨方，丙丁巳午一样香。戊申己酉庚亥子，辛在子位壬癸寅卯昌。", suitable: ["宴会请客","餐饮开业","烹饪学习"], avoid: ["饮食无度"] },

  // ═══════════════ 凶煞（11个） ═══════════════
  { name: "螣蛇", alias: ["腾蛇","飞蛇"], type: "煞", wuXing: "火", jiXiong: "凶", position: "巳", mainMeaning: "虚惊怪异之神，主惊恐/怪梦/火灾。", detailed: "螣蛇为巳火，性毒而能缠人。加临宫位多主虚惊怪梦之事。得地可化为蛟龙（凶中有变吉之机），失地则为毒虫缠身。凡占怪梦、谣言、火灾最忌螣蛇加临。", formula: "螣蛇在巳号虚惊，怪梦怪异事相萦。遇水变化为蛟祥，逢虎惊伤罪不轻。", suitable: [], avoid: ["出行远门","大事决策","新项目启动"] },
  { name: "朱雀", alias: ["朱鸟","赤鸟"], type: "煞", wuXing: "火", jiXiong: "凶", position: "午", mainMeaning: "口舌是非之神，主文书/官司/消息。", detailed: "朱雀为午火，生旺时主文章考试高中，失时主口舌是非和文书官司。朱雀丧门同宫为「文书不利」，朱雀贵人同宫则凶中转吉（官方来文）。", formula: "朱雀在午正南火，口舌文书费琢磨。官讼考试皆由此，得地方为文曲科。", suitable: [], avoid: ["口舌争辩","文书起诉","八卦是非"] },
  { name: "勾陈", alias: ["钩陈","勾阵"], type: "煞", wuXing: "土", jiXiong: "凶", position: "辰", mainMeaning: "斗讼之神，主争斗/牢狱/田地纠纷。", detailed: "勾陈为辰土，为麒麟之变象。得地反为公正威严的法官气象，失地则主斗讼和牢狱。勾陈与白虎同宫为大凶，主牢狱血光双重之灾。凡占诉讼、邻里纠纷、土地方争最忌勾陈。", formula: "勾陈在辰管斗讼，田地争竞不安宁。得地威严如法官，失地牢狱受苦刑。", suitable: [], avoid: ["主动挑事","土地买卖","与人争执"] },
  { name: "白虎", alias: ["白虎神","金虎"], type: "煞", wuXing: "金", jiXiong: "凶", position: "申", mainMeaning: "血光丧服之神，主伤灾/丧事/疾病。", detailed: "白虎为申金，为至凶之神。得地可转化为威武将军，失地则为食人猛虎。白虎加临命宫上多主血光之灾/手术/车祸。白虎与贵人同宫为「虎头贵」凶中有救。凡婚嫁/出行/孕妇最忌白虎。", formula: "白虎在申是凶神，血光丧服病来侵。得地威猛将军样，失地伤人最狠心。", suitable: [], avoid: ["婚嫁","出行远门","孕妇生产","开工动土"] },
  { name: "玄武", alias: ["玄武神","玄冥"], type: "煞", wuXing: "水", jiXiong: "凶", position: "子", mainMeaning: "盗贼之神，主失窃/隐私/奸邪。", detailed: "玄武为子水，为盗贼暗昧之神。得地可为水利专家，失地主盗贼小偷。凡占失物、防窃、保密之事最忌玄武加临。", formula: "玄武在子号盗神，偷窃阴私暗害人。得地水利堪大用，失地暗箭最难防。", suitable: [], avoid: ["存放贵重物品","签机密协议","夜间独行"] },
  { name: "天空", alias: ["空亡神"], type: "煞", wuXing: "土", jiXiong: "凶", position: "戌", mainMeaning: "虚诈空亡之神，主谎话/落空/僧道。", detailed: "天空为戌土虚诈之神，主不实和空亡。得地为高僧道士超脱之象，失地为满口谎言一事无成。凡占签约/投资/寻人/觅物最忌天空，多主落空无结果。", formula: "天空在戌号虚诈，妄语虚言莫信他。得地清高超世俗，失地万事成空花。", suitable: [], avoid: ["正式签约","相信承诺","寻人觅物"] },
  { name: "丧门", alias: ["丧车"], type: "煞", wuXing: "金", jiXiong: "凶", position: "随太岁而变", mainMeaning: "丧事孝服之神，主白事/悲伤。", detailed: "丧门主丧服之事的凶煞。加临命宫或年命上多主家中有丧事或参加葬礼。孕妇和婚嫁择日最忌见丧门。", formula: "丧门岁前一位寻，孝服悲泣事伤心。孕妇婚嫁皆大忌，逢之诸事不称心。", suitable: [], avoid: ["婚嫁","喜庆","孕妇出行"] },
  { name: "吊客", alias: ["吊客星"], type: "煞", wuXing: "火", jiXiong: "凶", position: "随太岁而变", mainMeaning: "吊丧问疾之神，主探病/吊唁。", detailed: "吊客为吊丧之煞，加临多主去参加葬礼或探病。与丧门同宫则「双重孝服」大凶。", formula: "吊客岁后二位居，悬吊问疾莫相疏。逢之有丧非己事，探病吊唁免不虞。", suitable: [], avoid: ["婚嫁","开业","新居入宅"] },
  { name: "病符", alias: ["病符星"], type: "煞", wuXing: "水", jiXiong: "凶", position: "岁后一位", mainMeaning: "疾病之神，主小病/体弱。", detailed: "病符主一年之中的小病小痛。加临命宫则当年体弱多病。但与日德同宫反为「带病延年」（虽有病但不严重）。", formula: "病符岁后一位当，小病缠绵不安康。逢之有疾须早治，免得积久成大病。", suitable: [], avoid: ["大吃大喝","熬夜劳累"] },
  { name: "官符", alias: ["官讼星"], type: "煞", wuXing: "火", jiXiong: "凶", position: "随月建而变", mainMeaning: "官司诉讼之神，主官非/牢狱。", detailed: "官符主官司诉讼之事。加临命宫多主有官非或被调查。但官员或法律从业者逢之反为得势。", formula: "官符牢狱两相随，官非诉讼暗藏机。当官遇之反为吉，百姓逢之惹是非。", suitable: [], avoid: ["违规操作","合同纠纷","税务问题"] },
  { name: "死符", alias: ["小耗"], type: "煞", wuXing: "土", jiXiong: "凶", position: "随太岁而变", mainMeaning: "小破财之神，主消耗/破财。", detailed: "死符即小耗，主小额破财和消耗。加临财帛宫多主该年月有额外开销或计划外支出。但金额一般不大。", formula: "死符小耗主破财，零星消费不自觉。加临财帛当节俭，省得小钱聚大财。", suitable: [], avoid: ["大额消费","投资理财"] },

  // 凶煞续二（12个）
  { name: "五鬼", alias: ["五鬼星","五阴煞"], type: "煞", wuXing: "火", jiXiong: "凶", position: "视年支月建而定", mainMeaning: "阴小祸患之神，主小人/阴谋/是非/精神不安。", detailed: "五鬼为五个阴煞合成，主暗中小人和阴谋诡计。得地可在暗中运作之事中获利（如侦查/调查），失地则为小人暗害。五鬼与朱雀同宫主「暗口是非」（背地里被人说坏话）。凡重要决策、签约、合作忌五鬼加临。", formula: "五鬼阴煞五颗星，暗中祸患最难明。小人阴谋须防范，是非烦恼不安宁。", suitable: [], avoid: ["重要决策","签约合作","公开言论"] },
  { name: "大耗", alias: ["大耗星","元辰"], type: "煞", wuXing: "土", jiXiong: "凶", position: "随太岁而变", mainMeaning: "大破财之神，主巨额消费/投资亏损/财物损失。", detailed: "大耗为大的财物损耗。比死符（小耗）严重。加临财帛宫多主该年有大额支出或投资亏损。大耗与天空同宫主「空耗」（钱花出去没有结果）。凡重大投资、购物最忌大耗。", formula: "大耗岁前五位当，大破钱财须慎防。投资消费皆大忌，省得千金不打漂。", suitable: [], avoid: ["重大投资","大额消费","借贷担保"] },
  { name: "孤辰", alias: ["孤辰星"], type: "煞", wuXing: "火", jiXiong: "凶", position: "视年支而定", mainMeaning: "孤独之星，主性格孤僻/社交困难/婚姻迟缓。", detailed: "孤辰主孤独和不合群。命带孤辰者性格内有孤独倾向。加临夫妻宫多主婚姻迟缓或夫妻聚少离多。亥子丑年孤辰在寅，寅卯辰年在巳，巳午未年在申，申酉戌年在亥。孤辰与华盖同宫为孤高绝世（可为艺术家僧侣之命）。", formula: "亥子丑年寅是孤，寅卯辰年巳中居。巳午未年申为伴，申酉戌年亥位伏。", suitable: [], avoid: ["相亲恋爱","社交活动","婚礼择日"] },
  { name: "寡宿", alias: ["寡宿星"], type: "煞", wuXing: "水", jiXiong: "凶", position: "视年支而定", mainMeaning: "寡居之星，主婚姻波折/聚少离多/精神孤独。", detailed: "寡宿主夫妻分离或老来孤独。加临命宫多主性格内向不善交际。亥子丑年寡宿在戌，寅卯辰年在丑，巳午未年在辰，申酉戌年在未。孤辰寡宿同在命局则为孤寡命，需特别注意婚姻经营。", formula: "亥子丑年戌是寡，寅卯辰年丑中查。巳午未年辰上取，申酉戌年未位加。", suitable: [], avoid: ["婚嫁择日","求子祈福"] },
  { name: "灾煞", alias: ["灾煞星","白虎煞"], type: "煞", wuXing: "金", jiXiong: "凶", position: "随年支而定", mainMeaning: "突发灾祸之神，主意外/血光/猝然之事。", detailed: "灾煞主突如其来的灾祸。加临命宫多主该年须防意外之灾（交通事故/手术/突发疾病）。申子辰年在午，寅午戌年在子，亥卯未年在酉，巳酉丑年在卯。灾煞与白虎同宫为大凶，主血光之灾双重。", formula: "申子辰年午上安，寅午戌年子上看。亥卯未年酉上起，巳酉丑年卯上盘。", suitable: [], avoid: ["高危运动","长途出行","冒险活动"] },
  { name: "的煞", alias: ["财煞","的杀"], type: "煞", wuXing: "金", jiXiong: "凶", position: "随年支而定", mainMeaning: "破败损耗之神，主钱财损耗/投资失败。", detailed: "的煞为财帛损耗之煞。加临财帛宫多主因他人（朋友/合作伙伴）而导致破财。申子辰年在巳，寅午戌年在亥，亥卯未年在寅，巳酉丑年在申。", formula: "申子辰年巳上寻，寅午戌年亥上临。亥卯未年寅上起，巳酉丑年申上真。", suitable: [], avoid: ["借钱给他人","合伙投资","做担保人"] },
  { name: "月破", alias: ["月破煞"], type: "煞", wuXing: "土", jiXiong: "凶", position: "月建对冲", mainMeaning: "月令冲破之神，主破坏/中断/不和。", detailed: "月破为月令之冲，当前月份最忌讳的方位。月破之日不宜开张、婚嫁、签约、出行。月破加临命宫当月诸事不宜主动出击以静制动。但与劫煞同宫则可「不破不立」反为新机。", formula: "月建对冲月破方，当月大忌莫轻狂。开张婚嫁皆须避，静守方能免祸殃。", suitable: [], avoid: ["开业开张","婚嫁","签约","出行"] },
  { name: "四废", alias: ["四废日"], type: "煞", wuXing: "土", jiXiong: "凶", position: "特定日", mainMeaning: "四季废日之神，主诸事不成/万事荒废。", detailed: "四废为四季之废日。春季庚申辛酉日、夏季壬子癸亥日、秋季甲寅乙卯日、冬季丙午丁巳日。四废日不宜做任何重大决策和事务启动，容易半途而废或结果不理想。", formula: "春庚申辛酉，夏壬子癸亥。秋甲寅乙卯，冬丙午丁巳。此是四废日，大事皆不宜。", suitable: [], avoid: ["一切重大事务","开业","签约","婚嫁"] },
  { name: "天罗", alias: ["天罗网"], type: "煞", wuXing: "火", jiXiong: "凶", position: "戌", mainMeaning: "天罗地网之神（天罗），主困顿/束缚/进退不得。", detailed: "天罗（戌）和地网（辰）合为天罗地网。男怕天罗女怕地网。天罗临命多主被制度/规则/人情关系束缚难以脱身。但法律从业者逢之反为「执网者」（掌握法网的人）。", formula: "戌为天罗辰地网，男怕天罗运不畅。进退两难如被困，法律之士反为强。", suitable: [], avoid: ["试图挣脱原有约束","诉讼被告方"] },
  { name: "地网", alias: ["地网罗"], type: "煞", wuXing: "水", jiXiong: "凶", position: "辰", mainMeaning: "天罗地网之神（地网），主困顿/束缚/纠纷。", detailed: "地网（辰）与天罗（戌）相对应。女怕地网男怕天罗。地网临命多主被有形无形的网络束缚。但网络/IT从业者逢之反有才能得以发挥的可能。", formula: "辰为地网戌是罗，女怕地网困顿多。纠纷缠身难解脱，网技之士反能歌。", suitable: [], avoid: ["婚姻","求职","搬迁"] },
  { name: "飞廉", alias: ["飞廉煞","飞廉星"], type: "煞", wuXing: "金", jiXiong: "凶", position: "随月建而变", mainMeaning: "飞来横祸之神，主飞来横祸/被牵连。", detailed: "飞廉为飞来横祸和最无妄的灾难之星。加临命宫多主该年月有无妄之灾。正月在戌二月在巳三月在午四月在未五月在申六月在酉七月在辰八月在亥九月在子十月在丑十一月在寅十二月在卯。", formula: "正戌二巳三午四未五申六酉七辰八亥九子十丑子寅丑卯飞廉游。", suitable: [], avoid: ["惹是生非","参与他人纷争","靠近是非场合"] },
  { name: "岁破", alias: ["岁破煞","大耗（又）"], type: "煞", wuXing: "土", jiXiong: "凶", position: "太岁对冲位", mainMeaning: "太岁之冲，冲犯太岁之神，主全年不顺。", detailed: "岁破为太岁对冲之位，冲犯太岁威严。岁破方不宜动土修造、不宜长途出行。加临命宫多主该年犯太岁诸事不顺。", formula: "太岁对冲岁破方，冲犯太岁罪难当。修造动土皆大忌，全年诸事不顺畅。", suitable: [], avoid: ["动土修造","婚嫁","长途出行","重大投资"] },

  // ═══════════════ 中性神煞（5个） ═══════════════
  { name: "驿马", alias: ["驿马星"], type: "神", wuXing: "火", jiXiong: "平", position: "寅申巳亥", mainMeaning: "奔波移动之神，主外出/变动/搬迁。", detailed: "驿马主移动和变化的星曜。加临命宫或迁移宫则当年来回奔波、出差频繁。寅申巳亥为四马之地，驿马居之得力。对于需要出差、旅行、搬家者驿马为吉；对于求安稳者驿马为忌。", formula: "驿马奔驰寅申巳亥，外出变动莫等待。吉凶要看配合神，得吉出行发大财。", suitable: ["出差行程","搬家换环境","求职跳槽（变动行业）"], avoid: ["想求安稳时"] },
  { name: "桃花", alias: ["咸池"], type: "神", wuXing: "水", jiXiong: "平", position: "子午卯酉", mainMeaning: "风月社交之神，主人缘/桃花运/社交。", detailed: "桃花即咸池，主人际关系和异性缘。加临命宫多主人缘好、社交活跃。子午卯酉为四桃花之地。得地则异性缘佳婚姻美满，失地则桃花劫（惹麻烦的感情）。", formula: "桃花咸池子午卯酉，异性人缘最拿手。得地婚缘多美满，失地情债缠不休。", suitable: ["社交活动","相亲约会","拓展人脉"], avoid: ["已有婚姻者需谨慎"] },
  { name: "华盖", alias: ["华盖星"], type: "神", wuXing: "金", jiXiong: "平", position: "辰戌丑未", mainMeaning: "孤高艺术之神，主孤独/艺术/修行。", detailed: "华盖为艺术之星和孤独之神。得地为艺术家、学者、僧道的气象。失地则为孤芳自赏、情感受挫。辰戌丑未为四华盖之地，华盖居之得力。命带华盖多主有特殊艺术才华或学术天赋。", formula: "华盖辰戌丑未方，艺术孤高性清狂。得地才名天下闻，失地孤单独自伤。", suitable: ["艺术创作","学术研究","出家修道"], avoid: ["追求热闹社交","婚嫁"] },
  { name: "劫煞", alias: ["劫杀"], type: "煞", wuXing: "火", jiXiong: "平", position: "寅申巳亥", mainMeaning: "劫夺冲突之神，主争夺，但也有突破之机。", detailed: "劫煞主突然的变故和冲突。加临命宫多主该年月有突发状况需要应对。但劫煞也有「破旧立新」的意象，对一些需要突破困局的创业者来说亦为可用。", formula: "劫煞四马寅申巳亥，突发变故须忍耐。破旧立新亦可为，创业突破此时来。", suitable: ["突破创新","改变现状（激进方式）"], avoid: ["求安稳时","保守经营"] },
  { name: "破碎", alias: ["破碎星"], type: "煞", wuXing: "土", jiXiong: "平", position: "月建对冲", mainMeaning: "破碎不全之神，主残缺/不完整，但也可修旧利废。", detailed: "破碎主事物不完整或有残缺。在修复、翻新、整合类事务中反而可以为用。加临命宫多主物品损坏或计划有缺漏。", formula: "破碎主缺不完整，修旧利废反为用。仔细检查防疏漏，残缺之中求妥稳。", suitable: ["修复翻新","检查修补","整合方案"], avoid: ["新项目启动","重大决策"] },

  // 中性续二（2个）
  { name: "天马", alias: ["天马星","驿马天马"], type: "神", wuXing: "火", jiXiong: "平", position: "视月将而定", mainMeaning: "天马行空之神，主奔波/升迁/快速移动/出国。", detailed: "天马与驿马相似但更快速更远。驿马是陆上之马，天马是天上飞马。天马加临迁移宫多主该年有长途旅行或出国机会。正月午二月申三月戌四月子五月寅六月辰七月午八月申九月戌十月子十一月寅十二月辰（以午起正月顺数隔位）。", formula: "天马正月起午宫，隔位顺行十二重。远行出国逢此吉，催官赴任立奇功。", suitable: ["出国远行","异地就职","快速扩张"], avoid: ["求稳守成"] },
  { name: "岁德", alias: ["岁德星"], type: "神", wuXing: "土", jiXiong: "平", position: "视年干而定", mainMeaning: "太岁之德神，一年之中最尊贵的神煞。凡事宜向不宜背。", detailed: "岁德为太岁的德行化身。岁德方是该年最吉利的方位。凡出行、修造、迁居应朝向岁德方。甲年岁德在甲（东方），乙年在庚（西方），丙年在丙（南方），丁年在壬（北方），戊年在戊（中央偏南），己年在甲，庚年在庚，辛年在丙，壬年在壬，癸年在戊。", formula: "岁德年干阳干方，阴干取合为吉祥。一年之事皆利向，背之则凶慎莫忘。", suitable: ["选方位出行","修造动土","祭祀祈福"], avoid: ["背对岁德方位"] },
];

export function calculateLiuRenShenSha(input: Record<string, unknown>): LiuRenShenShaResult & { summary: string } {
  const keyword = (input.keyword as string) || "";
  const type = (input.type as string) || "";

  let filtered = SHEN_SHA_DB;

  if (type) {
    if (type === "神") filtered = filtered.filter((s) => s.type === "神");
    else if (type === "煞") filtered = filtered.filter((s) => s.type === "煞");
  }

  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.includes(kw) ||
        s.alias.some((a) => a.includes(kw)) ||
        s.mainMeaning.includes(kw) ||
        s.detailed.includes(kw) ||
        s.wuXing.includes(kw)
    );
  }

  const shenSha = filtered;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const briefSummary = keyword
    ? `搜索「${keyword}」共找到 ${filtered.length} 个神煞`
    : type
    ? `${type}类共 ${filtered.length} 个`
    : `共收录 ${SHEN_SHA_DB.length} 个六壬神煞（吉神${SHEN_SHA_DB.filter(s=>s.type==='神').length}个+凶煞${SHEN_SHA_DB.filter(s=>s.type==='煞').length}个）`;

  // 结构化 box-drawing 摘要
  const isFiltered = !!(keyword || type);
  const shenCount = SHEN_SHA_DB.filter(s => s.type === "神").length;
  const shaCount = SHEN_SHA_DB.filter(s => s.type === "煞").length;
  const jiCount = SHEN_SHA_DB.filter(s => s.jiXiong === "吉").length;
  const xiongCount = SHEN_SHA_DB.filter(s => s.jiXiong === "凶").length;
  const pingCount = SHEN_SHA_DB.filter(s => s.jiXiong === "平").length;

  if (isFiltered && filtered.length > 0) {
    // 筛选结果模式：逐条展示
    const lines: string[] = [
      `┌─ 六壬神煞·筛选结果 ─────────────────`,
      `│ 筛选：${keyword ? `关键词="${keyword}"` : ""} ${type ? `类型=${type}` : ""} 共${filtered.length}个`,
      ``,
    ];
    for (let i = 0; i < Math.min(filtered.length, 15); i++) {
      const s = filtered[i];
      lines.push(`├─ ${s.name}（${s.alias.slice(0,2).join("、")}）${s.type === "神" ? "神" : "煞"} ─────`);
      lines.push(`│ 五行${s.wuXing} ${s.jiXiong} 位在${s.position}`);
      lines.push(`│ ${s.mainMeaning}`);
      if (s.suitable.length > 0) lines.push(`│ 宜：${s.suitable.slice(0,3).join("、")}`);
      if (s.avoid.length > 0) lines.push(`│ 忌：${s.avoid.slice(0,3).join("、")}`);
      lines.push(`│`);
    }
    if (filtered.length > 15) {
      lines.push(`│ ... 还有${filtered.length - 15}个结果未显示（请缩小筛选范围）`);
      lines.push(`│`);
    }
    lines.push(`├─ 古籍出处 ─────────────────`);
    lines.push(`│ 《大六壬指南》—— 陈公献著，六壬实战经典`);
    lines.push(`│ 《六壬大全》—— 六壬集成之作，神煞体系最全`);
    lines.push(`│ 《壬归》—— 六壬入门必读，神煞运用规范`);
    lines.push(`│ 六壬重神煞，神煞不明则占断不灵。`);
    lines.push(`│`);
    lines.push(`└─ 提示 ─────────────────`);
    lines.push(`   六壬神煞须结合天地盘/四课三传综合运用。`);
    lines.push(`   神煞有得地失地之分，同一神煞旺衰不同吉凶迥异。`);
    const summary = lines.join("\n");
    return { shenSha, total: shenSha.length, summary } as LiuRenShenShaResult & { summary: string };
  }

  if (isFiltered && filtered.length === 0) {
    const summary = [
      `┌─ 六壬神煞·筛选结果 ─────────────────`,
      `│ 筛选：${keyword ? `关键词="${keyword}"` : ""} ${type ? `类型=${type}` : ""}`,
      `│ 未找到匹配的神煞。`,
      `│ 请尝试更换筛选条件或关键词。`,
      `└──────────────────────────────`,
    ].join("\n");
    return { shenSha, total: 0, summary } as LiuRenShenShaResult & { summary: string };
  }

  // 全览模式
  const jiShen = SHEN_SHA_DB.filter(s => s.type === "神" && s.jiXiong === "吉");
  const xiongSha = SHEN_SHA_DB.filter(s => s.type === "煞" && s.jiXiong === "凶");
  const zhongXing = SHEN_SHA_DB.filter(s => s.jiXiong === "平");

  const lines: string[] = [
    `┌─ 六壬神煞大全 ─────────────────`,
    `│ 共计${SHEN_SHA_DB.length}个神煞 来源：《大六壬指南》《六壬大全》《壬归》`,
    ``,
    `├─ 吉神（${jiShen.length}个）─────────────────`,
  ];
  for (const s of jiShen) {
    lines.push(`│ ${s.name.padEnd(6, " ")} ${s.wuXing} 位${s.position.padEnd(10, " ")} ${s.mainMeaning.slice(0, 30)}`);
  }
  lines.push(`│`);
  lines.push(`├─ 凶煞（${xiongSha.length}个）─────────────────`);
  for (const s of xiongSha) {
    lines.push(`│ ${s.name.padEnd(6, " ")} ${s.wuXing} 位${s.position.padEnd(10, " ")} ${s.mainMeaning.slice(0, 30)}`);
  }
  lines.push(`│`);
  lines.push(`├─ 中性（${zhongXing.length}个）─────────────────`);
  for (const s of zhongXing) {
    lines.push(`│ ${s.name.padEnd(6, " ")} ${s.wuXing} 位${s.position.padEnd(10, " ")} ${s.mainMeaning.slice(0, 30)}`);
  }
  lines.push(`│`);
  lines.push(`├─ 统计 ─────────────────`);
  lines.push(`│ 神${shenCount}个 煞${shaCount}个 吉${jiCount}个 凶${xiongCount}个 平${pingCount}个`);
  lines.push(`│`);
  lines.push(`├─ 六壬神煞体系 ─────────────────`);
  lines.push(`│ 六壬以天地盘为体，四课三传为用，神煞为精。`);
  lines.push(`│ 神煞之要在于「得地」「失地」：`);
  lines.push(`│ · 旺相有气为得地 — 吉神吉上加吉，凶煞凶性减弱`);
  lines.push(`│ · 休囚无气为失地 — 吉神减福，凶煞加倍逞凶`);
  lines.push(`│ · 贵神顺治为吉，逆治为凶。`);
  lines.push(`│`);
  lines.push(`├─ 古籍出处 ─────────────────`);
  lines.push(`│ 《大六壬指南》—— 明·陈公献，六壬实战第一书`);
  lines.push(`│ 《六壬大全》—— 清·纪大奎辑，六壬神煞体系最完备`);
  lines.push(`│ 《壬归》—— 六壬入门奠基之作`);
  lines.push(`│ 《六壬粹言》—— 清·刘赤江，神煞用法精要`);
  lines.push(`│ 《大六壬类集》—— 分类占断详备`);
  lines.push(`│`);
  lines.push(`└─ 使用提示 ─────────────────`);
  lines.push(`   输入keyword可搜索神煞名称/别名/含义/五行。`);
  lines.push(`   输入type="神"查看吉神，type="煞"查看凶煞。`);
  lines.push(`   六壬神煞必须结合具体课传和天地盘论断，不可孤立使用。`);
  const summary = lines.join("\n");
  return { shenSha, total: shenSha.length, summary } as LiuRenShenShaResult & { summary: string };
}
