// 算法参考：《渊海子平》《三命通会》
import type { DiZhiHeHuaResult, DiZhiRelation } from "@guoxue/shared"

const RELATIONS: DiZhiRelation[] = [
  // ═══════════ 六合 (6条) ═══════════
  { diZhi: ["子", "丑"], type: "六合", huaWuXing: "土", huaShen: "土", condition: "子丑相遇即合，化土需辰戌丑未月或局中土旺", effect: "子丑合土，水土相混。子水被丑土合克，水减力土增力。", jiXiong: "平", detailed: "子丑合化土，阴阳相合最为有情。子水被丑土合化，如寒冰遇暖土融化。命局中子丑合主暗中帮助或暗合关系，合作中一方牺牲较多。若子水为用神被合则不利。", baziExample: "戊子日见己丑时，子丑合土得月令土旺则化", source: "《渊海子平·六合篇》" },
  { diZhi: ["寅", "亥"], type: "六合", huaWuXing: "木", huaShen: "木", condition: "寅亥相遇即合，化木需寅卯辰月或局中木旺", effect: "寅亥合木，水木相生。亥水生寅木，木力大增。", jiXiong: "吉", detailed: "寅亥合木为生合，亥水生寅木有情的化合。主贵人相助，暗中扶持。命局有此合主事业上有长辈或上级提携。寅为甲木之禄，亥为甲木之长生，合木得长生之气最吉。", baziExample: "甲寅日见乙亥时，寅亥合木寅卯辰月可化", source: "《渊海子平·六合篇》" },
  { diZhi: ["卯", "戌"], type: "六合", huaWuXing: "火", huaShen: "火", condition: "卯戌相遇即合，化火需巳午未月或局中火旺", effect: "卯戌合火，木土相合生火。卯木克戌土，但同时合化为火。", jiXiong: "平", detailed: "卯戌合火为克合，看似有情实则有争。卯木克戌土但又能合化成火。主表面合作暗中较劲。婚姻中可能一方外遇，商业中为竞争性合作。需防外面光鲜内里矛盾。", baziExample: "丙戌日见辛卯时，卯戌合火巳午未月可化", source: "《渊海子平·六合篇》" },
  { diZhi: ["辰", "酉"], type: "六合", huaWuXing: "金", huaShen: "金", condition: "辰酉相遇即合，化金需申酉戌月或局中金旺", effect: "辰酉合金，土金相生。辰土生酉金，金力大增。", jiXiong: "吉", detailed: "辰酉合金为生合，辰为水库亦为金库，酉金得辰中之金相助。主暗中有资源支持，看似无意实则精心安排。命局有此合主有隐藏资源或后盾，适合金融/资源类行业。", baziExample: "庚辰日见乙酉时，辰酉合金申酉戌月可化", source: "《渊海子平·六合篇》" },
  { diZhi: ["巳", "申"], type: "六合", huaWuXing: "水", huaShen: "水", condition: "巳申相遇即合，化水需亥子丑月或局中水旺", effect: "巳申合水，火金相合生水。巳火克申金但合化为水。", jiXiong: "平", detailed: "巳申合水为克合带刑，是六合中最复杂的一组。巳火克申金（合中带克），又巳申为刑。主关系复杂多变，时好时坏。婚姻中感情起伏大，商业中合作兼竞争。化水局需水旺方可成。", baziExample: "壬申日见癸巳时，巳申合水亥子丑月可化", source: "《渊海子平·六合篇》" },
  { diZhi: ["午", "未"], type: "六合", huaWuXing: "土", huaShen: "土", condition: "午未相遇即合，化土需辰戌丑未月或局中土旺", effect: "午未合土，火土相融。午火生未土，土力增强。", jiXiong: "吉", detailed: "午未合土为生合，午火文明生未土库藏。主文化/教育/创意转化为实际成果。命局有此合主才华能落地，适合文创/教育/科研产业转化。", baziExample: "丙午日见己未时，午未合土辰戌丑未月必化", source: "《渊海子平·六合篇》" },
  // ═══════════ 三合 (4条) ═══════════
  { diZhi: ["申", "子", "辰"], type: "三合", huaWuXing: "水", huaShen: "水局", condition: "申子辰全或二支加辰/丑为半合水局，三支全则水局成", effect: "申子辰三合水局，水势浩瀚流动不止。若为用神则大吉。", jiXiong: "平", detailed: "申子辰三合水局为最完整的水局。申为水之长生，子为水之帝旺，辰为水之墓库。三支全则水局气势磅礴。申子辰全之人聪明灵动但易漂泊不定。大运流年凑齐三支则水局成，力量极大。", baziExample: "壬申年 庚子月 甲辰日，三合水局天干引化", source: "《三命通会·三合篇》" },
  { diZhi: ["亥", "卯", "未"], type: "三合", huaWuXing: "木", huaShen: "木局", condition: "亥卯未全或二支加未/卯为半合木局，三支全则木局成", effect: "亥卯未三合木局，木势参天生机勃勃。若为用神则大吉。", jiXiong: "平", detailed: "亥卯未三合木局为最完整的木局。亥为木之长生，卯为木之帝旺，未为木之墓库。三合木局主仁德/文教/生发。木局成格主仁慈宽厚，适合文化教育/生态环保行业。", baziExample: "癸亥年 乙卯月 丁未日，三合木局卯月引化", source: "《三命通会·三合篇》" },
  { diZhi: ["寅", "午", "戌"], type: "三合", huaWuXing: "火", huaShen: "火局", condition: "寅午戌全或二支加午/戌为半合火局，三支全则火局成", effect: "寅午戌三合火局，火势炎上光明正大。若为用神则大吉。", jiXiong: "平", detailed: "寅午戌三合火局为最完整的火局。寅为火之长生，午为火之帝旺，戌为火之墓库。三合火局主热情/文明/礼仪。火局格主外向热情，适合文化/传播/演艺/能源行业。火过旺则脾气急躁。", baziExample: "丙寅年 甲午月 戊戌日，三合火局午月引化", source: "《三命通会·三合篇》" },
  { diZhi: ["巳", "酉", "丑"], type: "三合", huaWuXing: "金", huaShen: "金局", condition: "巳酉丑全或二支加酉/丑为半合金局，三支全则金局成", effect: "巳酉丑三合金局，金气肃杀坚刚。若为用神则大吉。", jiXiong: "平", detailed: "巳酉丑三合金局为最完整的金局。巳为金之长生，酉为金之帝旺，丑为金之墓库。三合金局主义气/决断/刚强。金局格主果断利落，适合军警/法律/金融/机械行业。金过旺则刚愎。", baziExample: "辛巳年 丁酉月 己丑日，三合金局酉月引化", source: "《三命通会·三合篇》" },
  // ═══════════ 三会 (4条) ═══════════
  { diZhi: ["寅", "卯", "辰"], type: "三会", huaWuXing: "木", huaShen: "东方木", condition: "寅卯辰三支全则三会东方木局成，力量强于三合木局", effect: "三会东方木局，木气极盛，寅卯辰聚首木气冲天", jiXiong: "平", detailed: "三会方局力量大于三合局。寅卯辰三会东方木，如春回大地万物生发。命中三会木局为木之极致，主仁慈宽厚但可能优柔寡断。木为用神则大吉，为忌神则木浮无根漂泊。", baziExample: "甲寅年 丁卯月 戊辰日，三会木局卯月引化", source: "《三命通会·三会篇》" },
  { diZhi: ["巳", "午", "未"], type: "三会", huaWuXing: "火", huaShen: "南方火", condition: "巳午未三支全则三会南方火局成，力量强于三合火局", effect: "三会南方火局，火气冲天，巳午未齐聚炎上", jiXiong: "平", detailed: "三会方局中巳午未为南方火势最强形态。如烈日当空万物炽热。命中三会火局主热情奔放、创造力强。火为用神则大贵，为忌神则燥热难耐脾气暴躁。需水调候。", baziExample: "丁巳年 丙午月 乙未日，三会火局午月引化", source: "《三命通会·三会篇》" },
  { diZhi: ["申", "酉", "戌"], type: "三会", huaWuXing: "金", huaShen: "西方金", condition: "申酉戌三支全则三会西方金局成，力量强于三合金局", effect: "三会西方金局，金气萧杀，申酉戌齐聚肃杀", jiXiong: "平", detailed: "三会方局中申酉戌为西方金气最完整形态。如秋风扫落叶。命中三会金局主义气刚强、决断果敢。金为用神则大贵掌权，为忌神则冷酷无情、刚愎自用。", baziExample: "庚申年 乙酉月 丙戌日，三会金局酉月引化", source: "《三命通会·三会篇》" },
  { diZhi: ["亥", "子", "丑"], type: "三会", huaWuXing: "水", huaShen: "北方水", condition: "亥子丑三支全则三会北方水局成，力量强于三合水局", effect: "三会北方水局，水势汪洋，亥子丑齐聚润下", jiXiong: "平", detailed: "三会方局中亥子丑为北方水气最完整形态。如江海奔流。命中三会水局主智慧深远、灵活多变。水为用神则聪明绝顶，为忌神则漂流不定、心性多变。", baziExample: "癸亥年 甲子月 己丑日，三会水局子月引化", source: "《三命通会·三会篇》" },
  // ═══════════ 半合 (12条) ═══════════
  { diZhi: ["申", "子"], type: "半合", huaWuXing: "水", huaShen: "水局半", condition: "申子相遇为生地半合水局，见辰则三合全", effect: "申子半合水局，水气初聚未成汪洋，但有聚合之势", jiXiong: "吉", detailed: "生地半合指长生+帝旺的组合。申子半合为水局初聚，不如三合全的力量大但已有聚势。大运流年见辰则三合水局成，水势骤增。", baziExample: "庚申年 壬子月 不见辰，半合水局", source: "《三命通会·半合篇》" },
  { diZhi: ["子", "辰"], type: "半合", huaWuXing: "水", huaShen: "水局半", condition: "子辰相遇为墓库半合水局，见申则三合全", effect: "子辰半合水局，水气归库有收敛之象", jiXiong: "平", detailed: "墓库半合指帝旺+墓库的组合。子辰半合为水气归库，有收敛收藏之势。不如三合全的力量大。大运流年见申则三合水局全。", baziExample: "壬子年 甲辰月 不见申，半合水局", source: "《三命通会·半合篇》" },
  { diZhi: ["亥", "卯"], type: "半合", huaWuXing: "木", huaShen: "木局半", condition: "亥卯相遇为生地半合木局，见未则三合全", effect: "亥卯半合木局，木气初萌生机勃发", jiXiong: "吉", detailed: "亥卯为木局生地半合。亥水生卯木有情有力。大运流年见未则三合木局全，木势冲天。", baziExample: "癸亥年 乙卯月 不见未，半合木局", source: "《三命通会·半合篇》" },
  { diZhi: ["卯", "未"], type: "半合", huaWuXing: "木", huaShen: "木局半", condition: "卯未相遇为墓库半合木局，见亥则三合全", effect: "卯未半合木局，木气归库待用", jiXiong: "平", detailed: "卯未为木局墓库半合。卯木入未库，力量减弱但有收藏积累之意。见亥则三合全木气勃发。", baziExample: "乙卯年 癸未月 不见亥，半合木局", source: "《三命通会·半合篇》" },
  { diZhi: ["寅", "午"], type: "半合", huaWuXing: "火", huaShen: "火局半", condition: "寅午相遇为生地半合火局，见戌则三合全", effect: "寅午半合火局，火苗初燃渐有燎原之势", jiXiong: "吉", detailed: "寅午为火局生地半合。寅木生午火，火势渐起。见戌则三合全火势燎原不可挡。", baziExample: "丙寅年 甲午月 不见戌，半合火局", source: "《三命通会·半合篇》" },
  { diZhi: ["午", "戌"], type: "半合", huaWuXing: "火", huaShen: "火局半", condition: "午戌相遇为墓库半合火局，见寅则三合全", effect: "午戌半合火局，火气入库待燃", jiXiong: "平", detailed: "午戌为火局墓库半合。午火存入戌库，力量内敛。见寅则三合全火势爆发。", baziExample: "丙午年 戊戌月 不见寅，半合火局", source: "《三命通会·半合篇》" },
  { diZhi: ["巳", "酉"], type: "半合", huaWuXing: "金", huaShen: "金局半", condition: "巳酉相遇为生地半合金局，见丑则三合全", effect: "巳酉半合金局，金气初凝渐成利器", jiXiong: "吉", detailed: "巳酉为金局生地半合。巳中庚金长生遇酉金帝旺。见丑则三合全金气大盛。", baziExample: "辛巳年 丁酉月 不见丑，半合金局", source: "《三命通会·半合篇》" },
  { diZhi: ["酉", "丑"], type: "半合", huaWuXing: "金", huaShen: "金局半", condition: "酉丑相遇为墓库半合金局，见巳则三合全", effect: "酉丑半合金局，金气入库深藏", jiXiong: "平", detailed: "酉丑为金局墓库半合。酉金入丑库，金深藏不露。见巳则三合全金气外显。", baziExample: "辛酉年 己丑月 不见巳，半合金局", source: "《三命通会·半合篇》" },
  { diZhi: ["申", "辰"], type: "半合", huaWuXing: "水", huaShen: "拱子", condition: "申辰半合拱子（缺子），见子则三合水局全", effect: "申辰拱子，暗中补全水局但力不足", jiXiong: "平", detailed: "申辰为拱局（缺帝旺子水）。有聚会之意但暗缺核心。大运流年见子则水局全成，力量爆发。", baziExample: "庚申年 甲辰月 大运至子则水局全", source: "《三命通会·拱合篇》" },
  { diZhi: ["亥", "未"], type: "半合", huaWuXing: "木", huaShen: "拱卯", condition: "亥未半合拱卯（缺卯），见卯则三合木局全", effect: "亥未拱卯，暗中补全木局待核心出现", jiXiong: "平", detailed: "亥未为拱局（缺帝旺卯木）。有生发之意但缺核心。流年大运见卯则木局全成。", baziExample: "癸亥年 丁未月 大运至卯则木局全", source: "《三命通会·拱合篇》" },
  { diZhi: ["寅", "戌"], type: "半合", huaWuXing: "火", huaShen: "拱午", condition: "寅戌半合拱午（缺午），见午则三合火局全", effect: "寅戌拱午，暗中补全火局待核心出现", jiXiong: "平", detailed: "寅戌为拱局（缺帝旺午火）。有炎上之意但缺核心。流年遇午则火局全成气势磅礴。", baziExample: "丙寅年 戊戌月 流年至午则火局全", source: "《三命通会·拱合篇》" },
  { diZhi: ["巳", "丑"], type: "半合", huaWuXing: "金", huaShen: "拱酉", condition: "巳丑半合拱酉（缺酉），见酉则三合金局全", effect: "巳丑拱酉，暗中补全金局待核心出现", jiXiong: "平", detailed: "巳丑为拱局（缺帝旺酉金）。有从革之意但缺核心。流年遇酉则金局全成。", baziExample: "辛巳年 己丑月 流年至酉则金局全", source: "《三命通会·拱合篇》" },
  // ═══════════ 暗合 (10条) ═══════════
  { diZhi: ["寅", "丑"], type: "暗合", huaWuXing: "—", huaShen: "暗合", condition: "寅丑相邻暗合（寅中甲木与丑中己土合）", effect: "暗中配合，表面不合内在有勾结", jiXiong: "平", detailed: "寅丑为地支暗合，寅中甲木与丑中己土天干五合，非地支六合。主暗中关系/隐婚/地下恋情/秘密合作。命局有此暗合需防暗箱操作或隐私暴露。", baziExample: "甲寅日见辛丑时，寅丑暗合", source: "《三命通会·暗合篇》" },
  { diZhi: ["卯", "申"], type: "暗合", huaWuXing: "—", huaShen: "暗合", condition: "卯申相邻暗合（卯中乙木与申中庚金合）", effect: "暗中契约，表面竞争暗中有合作", jiXiong: "平", detailed: "卯申暗合，卯为日出之门申为人门。明为卯申相克（卯木被申金克），暗有乙庚合。主表面针锋相对暗中有利益交换。", baziExample: "乙卯日见庚申时，卯申暗合", source: "《三命通会·暗合篇》" },
  { diZhi: ["午", "亥"], type: "暗合", huaWuXing: "—", huaShen: "暗合", condition: "午亥相邻暗合（午中丁火与亥中壬水合，午中己土与亥中甲木合）", effect: "双暗合，暗中关系极为复杂", jiXiong: "平", detailed: "午亥为双暗合（丁壬合+甲己合），是所有暗合中最复杂的。主多层暗中关系交织。命局有此主感情/事业上有隐蔽的多重关系，需防秘密被揭露后的连锁反应。", baziExample: "丙午日见癸亥时，午亥双暗合", source: "《三命通会·暗合篇》" },
  { diZhi: ["未", "子"], type: "暗合", huaWuXing: "—", huaShen: "暗合", condition: "未子暗合（子水入未土暗润）", effect: "暗中滋润，表面克制暗中有情", jiXiong: "平", detailed: "未子之间子中癸水暗中滋润未土，未土表面克子暗中有润泽。主暗助/隐恩，受助者可能不知。", baziExample: "丁未日见壬子时，未子暗合", source: "《三命通会·暗合篇》" },
  { diZhi: ["辰", "酉"], type: "暗合", huaWuXing: "—", huaShen: "暗合", condition: "辰酉既有六合又有暗合（辰中戊土与酉中辛金生合）", effect: "明暗双合，关系极为密切牢不可破", jiXiong: "吉", detailed: "辰酉既是六合又是暗合，双重合力最强。六合为明面合作，暗合为私下结盟。命局有此合主可靠稳固的关系，事业上有坚实后盾。", baziExample: "戊辰日见辛酉时，辰酉明暗双合", source: "《三命通会·暗合篇》" },
  { diZhi: ["子", "巳"], type: "暗合", huaWuXing: "—", huaShen: "暗合", condition: "子巳暗合（子中癸水与巳中戊土合）", effect: "暗中调和，水火暗中有土调和", jiXiong: "平", detailed: "子巳暗合，子水巳火本不相容但暗中戊癸合起到了调和作用。主表面争执暗中和解，对立双方有私下沟通渠道。", baziExample: "壬子日见己巳时，子巳暗合", source: "《三命通会·暗合篇》" },
  { diZhi: ["丑", "亥"], type: "暗合", huaWuXing: "—", huaShen: "暗合", condition: "丑亥暗合（丑中己土与亥中甲木合）", effect: "土水暗合，暗中有生机", jiXiong: "平", detailed: "丑亥暗合，丑土中己土与亥水中甲木暗合。主暗中协作互助，虽表面不显但私下互相成就。", baziExample: "己丑日见乙亥时，丑亥暗合", source: "《三命通会·暗合篇》" },
  { diZhi: ["寅", "未"], type: "暗合", huaWuXing: "—", huaShen: "暗合", condition: "寅未暗合（寅中甲木与未中己土合）", effect: "木入墓库暗有情", jiXiong: "平", detailed: "寅未暗合，寅木入未墓本为入库，但甲己暗合有情。主看似被困实则有暗中援手。", baziExample: "甲寅日见己未时，寅未暗合", source: "《三命通会·暗合篇》" },
  { diZhi: ["卯", "戌"], type: "暗合", huaWuXing: "—", huaShen: "暗合", condition: "卯戌既是六合又是暗合（卯中乙木与戌中辛金不合成火）", effect: "明暗双合生火，关系热烈但易燃尽", jiXiong: "平", detailed: "卯戌明合化火+暗合生火，双火叠加。主热烈的关系但可能来得快去得也快。感情中需防一见钟情后迅速冷却。", baziExample: "乙卯日见庚戌时，卯戌明暗双合", source: "《三命通会·暗合篇》" },
  { diZhi: ["巳", "戌"], type: "暗合", huaWuXing: "—", huaShen: "暗合", condition: "巳戌暗合（巳中丙火与戌中辛金合为水）", effect: "火金暗合化水，暗中转化令人意外", jiXiong: "平", detailed: "巳戌暗合，火库与金库暗中发生转化。主事物暗中发生变化，结果令人意想不到。投资理财需防暗中有变数。", baziExample: "丁巳日见辛戌时，巳戌暗合", source: "《三命通会·暗合篇》" },
  // ═══════════ 六冲 (6条) ═══════════
  { diZhi: ["子", "午"], type: "六冲", huaWuXing: "—", huaShen: "水火冲", condition: "子午相遇即冲，水克火为南北对冲", effect: "水火相冲，两败俱伤。子水克午火，午火耗子水。", jiXiong: "大凶", detailed: "子午为六冲之首，力量最大。子为冬至一阳生，午为夏至一阴生，二者为阴阳两极对冲。命中子午冲主情绪起伏极大，事业大起大落。需有通关之神（木）调和水火。", baziExample: "丙子日见甲午时，子午冲", source: "《渊海子平·六冲篇》" },
  { diZhi: ["丑", "未"], type: "六冲", huaWuXing: "—", huaShen: "土土冲", condition: "丑未相遇即冲，同为土但一湿一燥互不相容", effect: "丑未冲为墓库冲，土气越冲越旺但内藏之物受损", jiXiong: "凶", detailed: "丑未皆为土之墓库，丑藏癸辛己，未藏丁乙己。丑未冲看似土冲土实则内藏之物互战。丑中癸水伤未中丁火，未中乙木伤丑中辛金。主家宅不宁/口舌是非。", baziExample: "丁丑日见辛未时，丑未冲", source: "《渊海子平·六冲篇》" },
  { diZhi: ["寅", "申"], type: "六冲", huaWuXing: "—", huaShen: "金木冲", condition: "寅申相遇即冲且相刑，金木相战最烈", effect: "金木相冲带刑，破坏力极大，主道路奔波", jiXiong: "大凶", detailed: "寅申为冲中带刑（寅巳申三刑之二支）。寅为鬼门申为人门，寅申冲主车祸/奔波/事业动荡。又为驿马对冲，主频繁迁徙变动。命中寅申冲必是劳碌命。", baziExample: "庚寅日见甲申时，寅申冲", source: "《渊海子平·六冲篇》" },
  { diZhi: ["卯", "酉"], type: "六冲", huaWuXing: "—", huaShen: "金木冲", condition: "卯酉相遇即冲，金木相搏为日月之门冲", effect: "卯酉冲为门户冲，金克木但卯为日出酉为月升均有威", jiXiong: "大凶", detailed: "卯酉为日出月升之门对冲，主门户之变。婚姻中为桃花之冲（卯酉皆为桃花），多主婚姻/感情破裂。事业则主门户/店面变动。卯酉冲见血光者须防。", baziExample: "丁卯日见辛酉时，卯酉冲", source: "《渊海子平·六冲篇》" },
  { diZhi: ["辰", "戌"], type: "六冲", huaWuXing: "—", huaShen: "土土冲", condition: "辰戌相遇即冲，同为土库但一水一火库互斗", effect: "辰戌冲为天罗地网冲，土气越冲越旺", jiXiong: "凶", detailed: "辰为天罗（水库）戌为地网（火库）。辰戌冲为库库之冲，土气越冲越旺但水火灾难现。命中辰戌冲主官司/牢狱/水火灾。日柱辰戌冲则性格极端婚姻不顺。", baziExample: "庚辰日见丙戌时，辰戌冲", source: "《渊海子平·六冲篇》" },
  { diZhi: ["巳", "亥"], type: "六冲", huaWuXing: "—", huaShen: "水火冲", condition: "巳亥相遇即冲且相害，水火激荡", effect: "巳亥冲为驿马冲兼相害，水火激荡动荡不安", jiXiong: "大凶", detailed: "巳亥既是冲又是害（双重伤害）。巳中丙火被亥中壬水冲克，亥中甲木被巳中庚金冲克。巳亥又皆为驿马，主奔波劳碌/居无定所。更兼相害有心结难解。", baziExample: "乙巳日见辛亥时，巳亥冲", source: "《渊海子平·六冲篇》" },
  // ═══════════ 六害 (6条) ═══════════
  { diZhi: ["子", "未"], type: "六害", huaWuXing: "—", huaShen: "害", condition: "子未相遇即害（子水被未土穿害且子未本六合被丑来冲而害）", effect: "子未相害，暗中伤害表面友善", jiXiong: "凶", detailed: "子未相害是六害之首。子与丑本为六合，未冲丑导致子受牵连。主被第三方挑拨而出现的裂痕。婚姻中易因长辈/外人而关系受损。", baziExample: "壬子日见丁未时，子未害", source: "《渊海子平·六害篇》" },
  { diZhi: ["丑", "午"], type: "六害", huaWuXing: "—", huaShen: "害", condition: "丑午相遇即害（丑中癸伤午中丁，午中丁伤丑中辛）", effect: "丑午相害，互相伤害内里矛盾", jiXiong: "凶", detailed: "丑午相害是内里互伤。丑中癸水克午中丁火，午中丁火克丑中辛金。命中有此害主同室操戈、内斗。事业中团队内部分裂，家庭中亲人相争。", baziExample: "己丑日见丙午时，丑午害", source: "《渊海子平·六害篇》" },
  { diZhi: ["寅", "巳"], type: "六害", huaWuXing: "—", huaShen: "害兼刑", condition: "寅巳相遇既害又刑（寅巳申三刑之二），祸不单行", effect: "寅巳相害带刑，是害中最凶的组合", jiXiong: "大凶", detailed: "寅巳既害又刑，为六害中最凶。寅中甲木被巳中庚金克（害），巳中丙火被寅中甲木生（刑）。主反复折腾、祸不单行。命中有此害刑者多灾多难。", baziExample: "甲寅日见己巳时，寅巳害刑", source: "《渊海子平·六害篇》" },
  { diZhi: ["卯", "辰"], type: "六害", huaWuXing: "—", huaShen: "害", condition: "卯辰相遇即害（卯木克辰土，卯辰本寅辰卯方向一致却相害）", effect: "卯辰相害，同事/同行间暗中倾轧", jiXiong: "凶", detailed: "卯辰相害为同方向而行却互相伤害（卯辰同属东方）。主同行/同事/同学间的暗中竞争与伤害。职场中需防同事中伤，商场中需防同行暗算。", baziExample: "乙卯日见庚辰时，卯辰害", source: "《渊海子平·六害篇》" },
  { diZhi: ["申", "亥"], type: "六害", huaWuXing: "—", huaShen: "害", condition: "申亥相遇即害（申金生亥水但申亥本巳申六合被寅来冲而害）", effect: "申亥相害，表面相生暗中有痕", jiXiong: "平", detailed: "申亥相害的特殊性在于申金生亥水（相生），却因第三方冲合而成害。主表面关系好但暗中有心结。交友中可能有表面朋友内心提防的关系。", baziExample: "庚申日见癸亥时，申亥害", source: "《渊海子平·六害篇》" },
  { diZhi: ["酉", "戌"], type: "六害", huaWuXing: "—", huaShen: "害", condition: "酉戌相遇即害（酉戌本辰酉六合被卯来冲而害）", effect: "酉戌相害，金受火库之害", jiXiong: "凶", detailed: "酉戌相害为同一方向（西方）的互相伤害。酉金入戌库（火库）为入火乡受煎熬。命中酉戌害主怀才不遇、明珠暗投，有才能但被埋没。", baziExample: "辛酉日见丙戌时，酉戌害", source: "《渊海子平·六害篇》" },
  // ═══════════ 三刑 (4条) ═══════════
  { diZhi: ["寅", "巳", "申"], type: "三刑", huaWuXing: "—", huaShen: "无恩之刑", condition: "寅巳申三刑为恃势之刑，见二支即为刑见三支刑最重", effect: "寅巳申三刑为最凶之刑，主残疾/官司/牢狱", jiXiong: "大凶", detailed: "寅巳申三刑又名无恩之刑/恃势之刑。寅刑巳、巳刑申、申刑寅为循环相刑。主忘恩负义、官非牢狱、肢体伤害。三支全现则刑最重，二支亦为刑。命中有此三刑者人生波折多难，需积德行善化解。", baziExample: "甲寅年 己巳月 庚申日，三刑全", source: "《渊海子平·三刑篇》" },
  { diZhi: ["丑", "戌", "未"], type: "三刑", huaWuXing: "—", huaShen: "恃势之刑", condition: "丑戌未三刑为恃势之刑，三土相刑越刑越旺但事业反复", effect: "丑戌未三刑土旺但内里互伤，事业大起大落", jiXiong: "凶", detailed: "丑戌未三刑皆为土，刑则土气更旺但内藏之物互伤。土主信，三刑则诚信受损。命中有此三刑主合同纠纷/房产官司/因财致祸。三支全则刑重，二支较轻。", baziExample: "己丑年 壬戌月 丁未日，三刑全", source: "《渊海子平·三刑篇》" },
  { diZhi: ["子", "卯"], type: "三刑", huaWuXing: "—", huaShen: "无礼之刑", condition: "子卯相刑为无礼之刑，水木相刑有恩反成仇", effect: "子卯刑为恩将仇报，好心没好报", jiXiong: "凶", detailed: "子卯刑为无礼之刑。子水生卯木本为相生，但子卯刑将恩德变为仇恨。主好心没好报、善意被误解、恩将仇报之事。命中有子卯刑者需注意人际关系处理方式。", baziExample: "壬子日见乙卯时，子卯刑", source: "《渊海子平·三刑篇》" },
  { diZhi: ["辰", "午", "酉", "亥"], type: "三刑", huaWuXing: "—", huaShen: "自刑", condition: "辰辰/午午/酉酉/亥亥相遇为自刑", effect: "自刑为自作自受、自我矛盾、精神内耗", jiXiong: "凶", detailed: "辰午酉亥四地支自刑为自我伤害。辰辰刑主自大招损，午午刑主自我膨胀，酉酉刑主自我封闭，亥亥刑主自我放纵。命中带自刑者多内心矛盾、自我设限。化解靠自省自律。", baziExample: "庚辰日再遇辰年，辰辰自刑", source: "《渊海子平·三刑篇》" },
  // ═══════════ 六破 (6条) ═══════════
  { diZhi: ["子", "酉"], type: "六破", huaWuXing: "—", huaShen: "破", condition: "子酉相遇即破（子水破酉金，金水相破）", effect: "子酉相破，看似金生水实则暗中相互破坏", jiXiong: "平", detailed: "子酉相破意味着表面和谐（金生水）暗中有裂痕。事业中合作伙伴表面帮忙暗中拆台。酉为桃花子为桃花，情感中有暗裂。", baziExample: "庚子日见乙酉时，子酉破", source: "《渊海子平·六破篇》" },
  { diZhi: ["寅", "亥"], type: "六破", huaWuXing: "—", huaShen: "破", condition: "寅亥既合又破（先合后破），双面关系", effect: "寅亥合中带破，先好后坏的关系", jiXiong: "平", detailed: "寅亥既是六合又是六破，关系最为复杂。合意味着合作良好，破意味着暗中破坏。主前期合作融洽后期矛盾爆发的关系。婚恋中可能先热恋后反目。", baziExample: "甲寅日见乙亥时，寅亥合中带破", source: "《渊海子平·六破篇》" },
  { diZhi: ["卯", "午"], type: "六破", huaWuXing: "—", huaShen: "破", condition: "卯午相遇即破（木火相生却破）", effect: "卯午相破，生中有破暗中不和", jiXiong: "平", detailed: "卯午相破为木火相生中暗含破坏。主表面助力实际有损，看似推进实则破坏。投资中需防表面利好消息实含陷阱。", baziExample: "丁卯日见丙午时，卯午破", source: "《渊海子平·六破篇》" },
  { diZhi: ["辰", "丑"], type: "六破", huaWuXing: "—", huaShen: "破", condition: "辰丑相遇即破（同为湿土但互不相容）", effect: "辰丑相破，同气连枝却相互排斥", jiXiong: "平", detailed: "辰丑相破为同气的互相排斥。辰为水库丑为金库，看似都属土但内藏之物互不相容。合作中表面利益一致实则各怀鬼胎。", baziExample: "庚辰日见辛丑时，辰丑破", source: "《渊海子平·六破篇》" },
  { diZhi: ["未", "戌"], type: "六破", huaWuXing: "—", huaShen: "破", condition: "未戌相遇即破（同为燥土但库藏相斗）", effect: "未戌相破为破中带刑，双土相破又相刑", jiXiong: "凶", detailed: "未戌相破兼为丑戌未三刑之组成部分（破中带刑）。主土地/房产/矿产方面的纠纷。事业中资源分配争端的重灾区。", baziExample: "丁未日见丙戌时，未戌破兼刑", source: "《渊海子平·六破篇》" },
  { diZhi: ["申", "巳"], type: "六破", huaWuXing: "—", huaShen: "破兼刑害", condition: "申巳既合又破又刑又害，四重关系叠加", effect: "申巳四重关系叠加（合/破/刑/害），关系最复杂", jiXiong: "大凶", detailed: "申巳为六合+六破+三刑+六害四重关系叠加，是十二地支中最复杂的一组关系。合为正面合作，破为暗中破坏，刑为互相伤害，害为损害。命中有此组合者关系纠葛极为复杂。", baziExample: "庚申日见乙巳时，申巳合破刑害四重", source: "《渊海子平·六破篇》" },
  // ═══════════ 进阶合化条件分析 (20条) ═══════════
  { diZhi: ["甲", "己"], type: "六合", huaWuXing: "土", huaShen: "天干五合", condition: "甲己合化土需辰戌丑未月或地支土旺引化", effect: "天干甲己合为中正之合，合化为土", jiXiong: "吉", detailed: "天干五合为命理基础。甲己为中正之合，主正直公正。甲己合化土需得月令土旺或有辰戌丑未为根。不化则为合绊，甲失其力己增其力。", baziExample: "甲日见己时，辰月则化土", source: "《三命通会·合化篇》" },
  { diZhi: ["乙", "庚"], type: "六合", huaWuXing: "金", huaShen: "天干五合", condition: "乙庚合化金需申酉戌月或地支金旺引化", effect: "天干乙庚合为仁义之合，合化为金", jiXiong: "吉", detailed: "乙庚为仁义之合，主刚柔相济。乙木从庚金而化，似女子从夫。化金需金旺方可。不化则乙木被庚金合绊而失柔韧之性。", baziExample: "乙日见庚时，酉月则化金", source: "《三命通会·合化篇》" },
  { diZhi: ["丙", "辛"], type: "六合", huaWuXing: "水", huaShen: "天干五合", condition: "丙辛合化水需亥子丑月或地支水旺引化", effect: "天干丙辛合为威制之合，合化为水", jiXiong: "平", detailed: "丙辛为威制之合，以威势制人。丙火被辛金合化水，火性转为水性。化水需水旺。不化则丙火被辛合住发挥不出热情。", baziExample: "丙日见辛时，子月则化水", source: "《三命通会·合化篇》" },
  { diZhi: ["丁", "壬"], type: "六合", huaWuXing: "木", huaShen: "天干五合", condition: "丁壬合化木需寅卯辰月或地支木旺引化", effect: "天干丁壬合为淫匿之合，合化为木", jiXiong: "平", detailed: "丁壬为淫匿之合，主情感缠绵。丁火随壬水而化木，木主仁。化木需木旺。不化则丁壬合为情欲纠缠。男命丁壬合多桃花。", baziExample: "丁日见壬时，卯月则化木", source: "《三命通会·合化篇》" },
  { diZhi: ["戊", "癸"], type: "六合", huaWuXing: "火", huaShen: "天干五合", condition: "戊癸合化火需巳午未月或地支火旺引化", effect: "天干戊癸合为无情之合，合化为火", jiXiong: "平", detailed: "戊癸为无情之合，老少配之象。戊土老阳合癸水少阴。化火需火旺。不化则戊癸合为年龄差距大的婚配或关系。", baziExample: "戊日见癸时，午月则化火", source: "《三命通会·合化篇》" },
  { diZhi: ["巳", "午"], type: "半合", huaWuXing: "—", huaShen: "方局半会", condition: "巳午为南方火局半会，见未则三会全", effect: "巳午半会火方，火势已极炽热", jiXiong: "平", detailed: "巳午为三会南方火局的半会（缺未）。方局半会力量强于三合半合。巳午半会火势已极，只差未土收纳。流年大运见未则三会火局全成，火炎冲天。", baziExample: "丁巳年 丙午月 流年见未则三会火", source: "《三命通会·三会篇》" },
  { diZhi: ["申", "酉"], type: "半合", huaWuXing: "—", huaShen: "方局半会", condition: "申酉为西方金局半会，见戌则三会全", effect: "申酉半会金方，金气已成锋刃", jiXiong: "平", detailed: "申酉为三会西方金局的半会（缺戌）。金锋已利只待入库。流年大运见戌则三会金局全成，金气肃杀。", baziExample: "庚申年 乙酉月 流年见戌则三会金", source: "《三命通会·三会篇》" },
  { diZhi: ["亥", "子"], type: "半合", huaWuXing: "—", huaShen: "方局半会", condition: "亥子为北方水局半会，见丑则三会全", effect: "亥子半会水方，水势已如江湖", jiXiong: "平", detailed: "亥子为三会北方水局的半会（缺丑）。水势已大只待丑土筑堤。流年大运见丑则三会水局全成，水势滔天。", baziExample: "癸亥年 甲子月 流年见丑则三会水", source: "《三命通会·三会篇》" },
  { diZhi: ["寅", "卯"], type: "半合", huaWuXing: "—", huaShen: "方局半会", condition: "寅卯为东方木局半会，见辰则三会全", effect: "寅卯半会木方，木已成林", jiXiong: "平", detailed: "寅卯为三会东方木局的半会（缺辰）。木已成林只待辰土培根。流年大运见辰则三会木局全成，木势参天。", baziExample: "甲寅年 丁卯月 流年见辰则三会木", source: "《三命通会·三会篇》" },
  { diZhi: ["合化条件", "得月令"], type: "六合", huaWuXing: "—", huaShen: "通论", condition: "合化首重月令，次看整体五行气势", effect: "合化成功与否取决于月令和地支是否有化神之根", jiXiong: "平", detailed: "任何合化能否成功，首要条件为月令是否支持化神。如寅亥合木，寅卯辰月则易化。其次看地支中有无化神之强根。最后看天干是否透出化神引化。三条件齐备则合化成功。", baziExample: "任何合局参考此条判断是否真化", source: "《三命通会·合化总论》" },
  { diZhi: ["争合", "妒合"], type: "六合", huaWuXing: "—", huaShen: "通论", condition: "二合一一合二为争合妒合，合而不化为绊", effect: "争合妒合主被多方牵扯，无法专一", jiXiong: "凶", detailed: "争合即一干合多干或一支合多支。如甲日见两己，为二甲争合一己。主被多方拉扯无法专注，事业上多个选择反而不成，感情中三角关系。", baziExample: "甲日见己月己时，二甲争合己", source: "《三命通会·争合篇》" },
  // 补充地支破的完整分析
  { diZhi: ["破在年柱"], type: "六破", huaWuXing: "—", huaShen: "通论", condition: "破在年柱，祖上/幼年有损", effect: "年柱逢破，根基受损，少年坎坷", jiXiong: "凶", detailed: "年柱逢破主童年不顺或祖上基业有缺损。年柱代表1-16岁及祖辈，逢破则此阶段有遗憾或波折。", baziExample: "年支子月支酉，子酉破在早年", source: "《三命通会·六破通论》" },
  { diZhi: ["破在月柱"], type: "六破", huaWuXing: "—", huaShen: "通论", condition: "破在月柱，父母/兄弟/青少年有损", effect: "月柱逢破，家庭关系有裂，事业起步不顺", jiXiong: "凶", detailed: "月柱逢破主17-32岁阶段不顺或父母关系/兄弟关系有暗裂。月柱为事业宫也是父母宫。", baziExample: "月支卯日支午，卯午破在青年", source: "《三命通会·六破通论》" },
  { diZhi: ["破在日柱"], type: "六破", huaWuXing: "—", huaShen: "通论", condition: "破在日柱，婚姻/自身中年有损", effect: "日柱逢破，婚姻不稳，上有暗裂", jiXiong: "大凶", detailed: "日柱逢破为婚姻宫受损，是六破中最不利婚姻的配置。夫妻表面和睦内里裂痕。日支为配偶宫，逢破则配偶有心结难以打开。", baziExample: "日支申时支巳，申巳破在中年婚姻", source: "《三命通会·六破通论》" },
  { diZhi: ["破在时柱"], type: "六破", huaWuXing: "—", huaShen: "通论", condition: "破在时柱，子女/晚年有损", effect: "时柱逢破，子女运欠佳或晚年烦扰", jiXiong: "凶", detailed: "时柱逢破主49岁以后不顺或与子女有隔阂。时柱为晚年宫和子女宫，逢破则晚景有缺憾。", baziExample: "时支戌日支未，未戌破在晚年", source: "《三命通会·六破通论》" },
  { diZhi: ["冲在年柱"], type: "六冲", huaWuXing: "—", huaShen: "通论", condition: "冲在年柱，离祖/幼年动荡", effect: "年柱逢冲，根基动摇，少年漂泊", jiXiong: "大凶", detailed: "年柱逢冲主幼年离家或祖业不继。年为根基，逢冲则根基动摇。16岁前生活环境变化大，多迁徙。", baziExample: "年支子月支午，子午冲在祖基", source: "《渊海子平·六冲通论》" },
  { diZhi: ["冲在月柱"], type: "六冲", huaWuXing: "—", huaShen: "通论", condition: "冲在月柱，父母不和/事业多变动", effect: "月柱逢冲，父母关系紧张，职业频繁变更", jiXiong: "大凶", detailed: "月柱逢冲主17-32岁动荡，父母可能离异或关系紧张。事业上频繁跳槽/行业变换，不易安定。", baziExample: "月支寅日支申，寅申冲在青壮年", source: "《渊海子平·六冲通论》" },
  { diZhi: ["冲在日柱"], type: "六冲", huaWuXing: "—", huaShen: "通论", condition: "冲在日柱，婚姻破裂/中年危机", effect: "日柱逢冲，婚姻不稳，配偶健康差，中年动荡", jiXiong: "大凶", detailed: "日柱逢冲为婚姻宫被冲，是六冲中最凶的婚姻配置。主离婚/丧偶/长期分居。日支为自身也主中年33-48岁人生最大动荡期。", baziExample: "日支卯时支酉，卯酉冲在婚姻", source: "《渊海子平·六冲通论》" },
  { diZhi: ["冲在时柱"], type: "六冲", huaWuXing: "—", huaShen: "通论", condition: "冲在时柱，子女远离/晚年不安", effect: "时柱逢冲，子女远行或不孝，晚年动荡", jiXiong: "凶", detailed: "时柱逢冲主49岁后不安定或子女远行不在身边。晚年居无定所或有大的变动。", baziExample: "时支巳年支亥，巳亥冲在晚年", source: "《渊海子平·六冲通论》" },
  { diZhi: ["刑在日柱"], type: "三刑", huaWuXing: "—", huaShen: "通论", condition: "刑在日柱，自身性格矛盾/婚姻有损", effect: "日柱逢刑，内心痛苦婚姻波折", jiXiong: "大凶", detailed: "日柱逢刑为自身内心痛苦之象。日柱代表自己和配偶，逢刑则自我矛盾和婚姻挫折并存。需自我调适避免自我伤害。", baziExample: "日支子月支卯，子卯刑在己身", source: "《渊海子平·三刑通论》" },
]

export function calculateDiZhiHeHua(input: {
  diZhi?: string; type?: string
}): DiZhiHeHuaResult & { summary: string } {
  let result = RELATIONS
  if (input.type && input.type !== "全部") {
    result = result.filter(r => r.type === input.type)
  }
  if (input.diZhi) {
    const kw = input.diZhi
    result = result.filter(r => r.diZhi.some(d => d.includes(kw)) || r.huaShen.includes(kw))
  }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const overviewSummary = `共收录${RELATIONS.length}条地支合化关系，涵盖六合6+三合4+三会4+半合12+暗合10+六冲6+六害6+三刑4+六破6+天干五合5+进阶分析20，源自《渊海子平》《三命通会》`;

  // 结构化 box-drawing 摘要
  const isFiltered = result.length < RELATIONS.length;
  const typeCount: Record<string, number> = {};
  const jiXiongCount: Record<string, number> = {};
  for (const r of RELATIONS) {
    typeCount[r.type] = (typeCount[r.type] || 0) + 1;
    jiXiongCount[r.jiXiong] = (jiXiongCount[r.jiXiong] || 0) + 1;
  }

  if (isFiltered && result.length > 0) {
    // 筛选结果模式：逐条展示
    const lines: string[] = [
      `┌─ 地支合化·筛选结果 ─────────────────`,
      `│ 筛选条件：${input.type ? `类型=${input.type}` : ""} ${input.diZhi ? `地支=${input.diZhi}` : ""} 共${result.length}条`,
      ``,
    ];
    for (let i = 0; i < Math.min(result.length, 20); i++) {
      const r = result[i];
      const dzStr = r.diZhi.join("·");
      lines.push(`├─ ${r.type} ${dzStr} ─────────────────`);
      lines.push(`│ 化${r.huaWuXing === "—" ? "—" : r.huaWuXing} ${r.jiXiong} ${r.effect}`);
      if (r.condition && r.condition.length > 0) {
        lines.push(`│ 条件：${r.condition}`);
      }
      lines.push(`│ 出处：${r.source}`);
      lines.push(`│`);
    }
    if (result.length > 20) {
      lines.push(`│ ... 还有${result.length - 20}条结果未显示（请缩小筛选范围）`);
      lines.push(`│`);
    }
    lines.push(`├─ 古籍出处 ─────────────────`);
    lines.push(`│ 《渊海子平》—— 地支合冲害刑破体系奠基之作`);
    lines.push(`│ 《三命通会》—— 万民英著，合化条件最详`);
    lines.push(`│ 《滴天髓》—— 合化真伪判断精要`);
    lines.push(`│ 地支关系为八字命理基础，不可不知不可不精。`);
    lines.push(`│`);
    lines.push(`└─ 提示 ─────────────────`);
    lines.push(`   合化成功与否须看月令、化神透干、地支是否有根。`);
    lines.push(`   不可见合就论化，争合妒合多主合而不化为绊。`);
    const summary = lines.join("\n");
    return { relations: result, total: result.length, summary } as DiZhiHeHuaResult & { summary: string };
  }

  if (isFiltered && result.length === 0) {
    const summary = [
      `┌─ 地支合化·筛选结果 ─────────────────`,
      `│ 筛选条件：${input.type ? `类型=${input.type}` : ""} ${input.diZhi ? `地支=${input.diZhi}` : ""}`,
      `│ 未找到匹配的地支关系。`,
      `│ 请尝试更换筛选条件。`,
      `└──────────────────────────────`,
    ].join("\n");
    return { relations: result, total: 0, summary } as DiZhiHeHuaResult & { summary: string };
  }

  // 全览模式
  const typeOrder = ["六合","三合","三会","半合","暗合","六冲","六害","三刑","六破"];
  const lines: string[] = [
    `┌─ 地支合化关系全览 ─────────────────`,
    `│ 共计${RELATIONS.length}条关系 来源：《渊海子平》《三命通会》`,
    ``,
  ];
  for (const t of typeOrder) {
    const items = RELATIONS.filter(r => r.type === t);
    if (items.length === 0) continue;
    const jiCount = items.filter(r => r.jiXiong === "吉" || r.jiXiong === "大吉").length;
    const xiongCount = items.filter(r => r.jiXiong === "凶" || r.jiXiong === "大凶").length;
    lines.push(`├─ ${t}（${items.length}条）${jiCount}吉${xiongCount}凶 ─────────────────`);
    for (const item of items.slice(0, 6)) {
      const dzStr = item.diZhi.join("·");
      const huaStr = item.huaWuXing === "—" ? "—" : `化${item.huaWuXing}`;
      lines.push(`│ ${dzStr.padEnd(12, " ")} ${huaStr}  ${item.jiXiong.padEnd(4, " ")} ${item.effect.slice(0, 30)}`);
    }
    if (items.length > 6) lines.push(`│ ... 共${items.length}条，输入type="${t}"查看全部`);
    lines.push(`│`);
  }
  // 天干五合单独列出
  const tgItems = RELATIONS.filter(r => r.diZhi.some(d => d === "甲" || d === "乙" || d === "丙" || d === "丁" || d === "戊") && r.huaShen === "天干五合");
  if (tgItems.length > 0) {
    lines.push(`├─ 天干五合（${tgItems.length}条）─────────────────`);
    for (const item of tgItems) {
      lines.push(`│ ${item.diZhi.join("·")}合化${item.huaWuXing} ${item.jiXiong} ${item.effect}`);
    }
    lines.push(`│`);
  }
  lines.push(`├─ 吉凶分布 ─────────────────`);
  lines.push(`│ 大吉${jiXiongCount["吉"]||0}条 大凶${jiXiongCount["大凶"]||0}条 凶${(jiXiongCount["凶"]||0)}条 平${(jiXiongCount["平"]||0)}条`);
  lines.push(`│`);
  lines.push(`├─ 学习路径 ─────────────────`);
  lines.push(`│ 1. 先明六合 — 子丑合土/寅亥合木等六组基础`);
  lines.push(`│ 2. 再学三合 — 申子辰水/亥卯未木/寅午戌火/巳酉丑金`);
  lines.push(`│ 3. 三会方局 — 寅卯辰东方木/巳午未南方火等`);
  lines.push(`│ 4. 六冲六害 — 了解冲害的区别（冲明害暗）`);
  lines.push(`│ 5. 三刑六破 — 最复杂的破坏关系`);
  lines.push(`│ 6. 暗合通论 — 表面不显暗中有情`);
  lines.push(`│ 7. 合化条件 — 月令/透干/通根三条件`);
  lines.push(`│`);
  lines.push(`├─ 古籍出处 ─────────────────`);
  lines.push(`│ 《渊海子平》—— 八字命理奠基之作，首列六合六冲六害三刑`);
  lines.push(`│ 《三命通会》—— 万民英著，合化真伪条件论述最详`);
  lines.push(`│ 《滴天髓》—— 合化从化之道，真假之辨`);
  lines.push(`│ 《子平真诠》—— 清·沈孝瞻，论合冲刑害条理分明`);
  lines.push(`│ 地支合化为盲派/格局派/旺衰派共同基础，不可或缺。`);
  lines.push(`│`);
  lines.push(`└─ 综合 ─────────────────`);
  lines.push(`   地支合化判断口诀：`);
  lines.push(`   「合不合先看月令，化不化再看透干。`);
  lines.push(`     争合妒合多不化，合中带冲必有变。`);
  lines.push(`     天干五合地支引，地支六合天干应。」`);
  lines.push(`   输入type可分类查看，输入diZhi可查特定地支。`);
  const summary = lines.join("\n");
  return { relations: result, total: result.length, summary } as DiZhiHeHuaResult & { summary: string };
}
