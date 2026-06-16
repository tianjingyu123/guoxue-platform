// ── 三合四大水法计算引擎 ──
// 算法参考：《地理五诀》(赵九峰)、《青囊序》(杨筠松)、《天玉经》(杨筠松)
// 《玉尺经》(陈抟)、《水法秘诀》(慕讲禅师)
// 四大局以水口定局，长生十二宫论水之来去吉凶

import type { SanheShuifaInput, SanheShuifaResult, BureauInfo, DirectionEval } from "@guoxue/shared";

// 二十四山
const SHAN_24 = ["子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥","壬"];

// 水口→局映射（含双山水口别名）
const SHUI_KOU_2_BUREAU: Record<string, string> = {
  "辛戌":"火局","乾亥":"火局","壬子":"火局",
  "乙辰":"水局","巽巳":"水局","丙午":"水局",
  "癸丑":"金局","艮寅":"金局","甲卯":"金局",
  "丁未":"木局","坤申":"木局","庚酉":"木局",
};

// 四大局详细数据
const BUREAUS: Record<string, Omit<BureauInfo, "stages"> & { stages: Array<{ shan: string; stage: string }> }> = {
  "火局": {
    name: "火局", wuXing: "火", ku: "戌", changeSheng: "艮寅",
    kouJue: "乙丙交而趋戌——水出辛戌/乾亥/壬子为正库",
    stages: [
      { shan: "艮寅", stage: "长生" }, { shan: "甲卯", stage: "沐浴" }, { shan: "乙辰", stage: "冠带" },
      { shan: "巽巳", stage: "临官" }, { shan: "丙午", stage: "帝旺" }, { shan: "丁未", stage: "衰" },
      { shan: "坤申", stage: "病" }, { shan: "庚酉", stage: "死" }, { shan: "辛戌", stage: "墓" },
      { shan: "乾亥", stage: "绝" }, { shan: "壬子", stage: "胎" }, { shan: "癸丑", stage: "养" },
    ],
  },
  "水局": {
    name: "水局", wuXing: "水", ku: "辰", changeSheng: "坤申",
    kouJue: "辛壬会而聚辰——水出乙辰/巽巳/丙午为正库",
    stages: [
      { shan: "坤申", stage: "长生" }, { shan: "庚酉", stage: "沐浴" }, { shan: "辛戌", stage: "冠带" },
      { shan: "乾亥", stage: "临官" }, { shan: "壬子", stage: "帝旺" }, { shan: "癸丑", stage: "衰" },
      { shan: "艮寅", stage: "病" }, { shan: "甲卯", stage: "死" }, { shan: "乙辰", stage: "墓" },
      { shan: "巽巳", stage: "绝" }, { shan: "丙午", stage: "胎" }, { shan: "丁未", stage: "养" },
    ],
  },
  "金局": {
    name: "金局", wuXing: "金", ku: "丑", changeSheng: "巽巳",
    kouJue: "斗牛纳丁庚之气——水出癸丑/艮寅/甲卯为正库",
    stages: [
      { shan: "巽巳", stage: "长生" }, { shan: "丙午", stage: "沐浴" }, { shan: "丁未", stage: "冠带" },
      { shan: "坤申", stage: "临官" }, { shan: "庚酉", stage: "帝旺" }, { shan: "辛戌", stage: "衰" },
      { shan: "乾亥", stage: "病" }, { shan: "壬子", stage: "死" }, { shan: "癸丑", stage: "墓" },
      { shan: "艮寅", stage: "绝" }, { shan: "甲卯", stage: "胎" }, { shan: "乙辰", stage: "养" },
    ],
  },
  "木局": {
    name: "木局", wuXing: "木", ku: "未", changeSheng: "乾亥",
    kouJue: "金羊收癸甲之灵——水出丁未/坤申/庚酉为正库",
    stages: [
      { shan: "乾亥", stage: "长生" }, { shan: "壬子", stage: "沐浴" }, { shan: "癸丑", stage: "冠带" },
      { shan: "艮寅", stage: "临官" }, { shan: "甲卯", stage: "帝旺" }, { shan: "乙辰", stage: "衰" },
      { shan: "巽巳", stage: "病" }, { shan: "丙午", stage: "死" }, { shan: "丁未", stage: "墓" },
      { shan: "坤申", stage: "绝" }, { shan: "庚酉", stage: "胎" }, { shan: "辛戌", stage: "养" },
    ],
  },
};

// 十二向法评语数据库（每个局 × 向的类型）
const XIANG_EVAL: Record<string, DirectionEval> = {
  // ── 火局各向 ──
  "火局_长生": {
    type: "生向（长生向）", stage: "长生", jiXiong: "大吉",
    laiShui: "宜右水倒左，水从帝旺方来", quShui: "水出墓库（辛戌）为正库消水",
    eval: "火局立艮寅长生向，合'生来会旺'之格。艮寅为火局长生之位，收右水倒左、旺方（丙午）来水，水出辛戌墓库。主丁财两旺，富贵双全，人丁繁衍，发福悠久。此格为四大局第一吉格，凡得此向者三代入仕。",
  },
  "火局_帝旺": {
    type: "旺向（帝旺向）", stage: "帝旺", jiXiong: "大吉",
    laiShui: "宜左水倒右，水从长生方来", quShui: "水出墓库（辛戌）为正库消水",
    eval: "火局立丙午帝旺向，合'旺去迎生'之格。丙午为火局旺位，收左水倒右、生方（艮寅）来水，水出辛戌墓库。主官贵显达，事业亨通。旺向主财禄丰盈，发福迅猛，当代即发，但需防过旺后速衰。",
  },
  "火局_墓": {
    type: "墓向（墓库向）", stage: "墓", jiXiong: "吉",
    laiShui: "宜左右水来朝，水从对面而去", quShui: "水出绝位（乾亥）方合局",
    eval: "火局立辛戌墓向，为'自库'之格。需水从生方（艮寅）或旺方（丙午）来，水出乾亥绝位。墓向收水归库，如仓库藏宝，主富甲一方、晚景荣华。但墓向藏而不露，初年不发，中年以后始兴。若来水不真，反成败局。",
  },
  "火局_养": {
    type: "养向", stage: "养", jiXiong: "吉",
    laiShui: "宜水从临官方来", quShui: "水出墓库（辛戌）",
    eval: "火局立癸丑养向，收养方之气。癸丑为火局养位，水宜从巽巳临官方来，水出辛戌墓库。养向主聚财蓄气，如婴儿待哺，富而不贵或富大于贵。适合商贾之家求财。但若来水有冲，则养而不成。",
  },
  "火局_沐浴": {
    type: "沐浴向（败向）", stage: "沐浴", jiXiong: "凶",
    laiShui: "不宜有任何来水", quShui: "不可正出，宜暗出",
    eval: "火局甲卯为沐浴败位，大忌立向。沐浴为桃花败地，若立此向必主酒色败家、淫乱失德、损丁破财。纵有秀砂秀水亦不可立。若误立此向，须改向或设屏墙破解。",
  },
  "火局_冠带": {
    type: "冠带向", stage: "冠带", jiXiong: "平",
    laiShui: "宜从长生方来", quShui: "水出墓库方",
    eval: "火局乙辰为冠带之位，立此向得冠带之气。冠带为小成之象，主文名远播，少年得志。但气未大成，财禄有限。适合书香门第，求名不求利之家。",
  },
  "火局_临官": {
    type: "临官向", stage: "临官", jiXiong: "大吉",
    laiShui: "宜从旺方来朝", quShui: "水出墓库（辛戌）",
    eval: "火局立巽巳临官向，得临官旺气。临官即'禄'位，立此向主官禄优厚、仕途顺利、贵人扶持。收旺方水来，出墓库而去，合'禄存归库'之格。发官最快，当代即贵。",
  },
  "火局_衰": {
    type: "衰向", stage: "衰", jiXiong: "平",
    laiShui: "不拘来去", quShui: "随意而出",
    eval: "火局丁未衰位立向，气已退而温和。衰向不以水法论吉凶，更多依赖砂法（山形）配合。衰气得砂助可守成，若砂水俱不得力，则平平无奇。",
  },
  "火局_病": { type: "病向", stage: "病", jiXiong: "凶", laiShui: "忌来水", quShui: "宜速去", eval: "火局坤申为病位，立此向多疾病缠身、药不离口。必须避之。" },
  "火局_死": { type: "死向", stage: "死", jiXiong: "大凶", laiShui: "大忌来水", quShui: "不可出水", eval: "火局庚酉死位立向，必主损丁绝嗣、家破人亡。犯'死不回头'之煞，不可立。" },
  "火局_绝": { type: "绝向", stage: "绝", jiXiong: "大凶", laiShui: "大忌来水", quShui: "不可出水", eval: "火局乾亥绝位立向，犯'绝后无人'之煞，主断子绝孙，万不可用。" },
  "火局_胎": { type: "胎向", stage: "胎", jiXiong: "平", laiShui: "宜暗水来", quShui: "宜缓出", eval: "火局壬子胎位立向，气尚在孕育。胎向宜静不宜动，主隐而未发，或孕而不生。需配合旺砂方能化胎为生。" },

  // ── 水局各向 ──
  "水局_长生": {
    type: "生向（长生向）", stage: "长生", jiXiong: "大吉",
    laiShui: "宜右水倒左，水从帝旺方（壬子）来", quShui: "水出墓库（乙辰）为正库消水",
    eval: "水局立坤申长生向，合'生来会旺'之格。坤申为水局长生之位，收旺方壬子来水，出乙辰墓库。主丁财两旺，家业兴隆，文贵双全，后代绵延。水局生生不息，发福最为长远。",
  },
  "水局_帝旺": {
    type: "旺向（帝旺向）", stage: "帝旺", jiXiong: "大吉",
    laiShui: "宜左水倒右，水从长生方（坤申）来", quShui: "水出墓库（乙辰）为正库消水",
    eval: "水局立壬子帝旺向，合'旺去迎生'之格。壬子为水局旺位，收生方坤申来水，出乙辰墓库。主富可敌国，贵至公卿。但水局过旺恐有泛滥之虞，须砂法配合得当。",
  },
  "水局_墓": {
    type: "墓向（墓库向）", stage: "墓", jiXiong: "吉",
    laiShui: "宜左右水来朝", quShui: "水出绝位（巽巳）",
    eval: "水局立乙辰墓向，水从生方或旺方来朝，出巽巳绝位，为自库消水。墓向聚财，如渊深藏，主富多贵少，晚运尤佳。辰为水库，得天独厚。",
  },
  "水局_养": {
    type: "养向", stage: "养", jiXiong: "吉",
    laiShui: "宜水从临官方（乾亥）来", quShui: "水出墓库（乙辰）",
    eval: "水局立丁未养向，收养方之气。主资产积累，稳中求进。较之生旺二向显达较慢，但根基扎实，不易败落。",
  },
  "水局_沐浴": { type: "沐浴向（败向）", stage: "沐浴", jiXiong: "凶", laiShui: "大忌来水", quShui: "不可正出", eval: "水局庚酉为沐浴败位，立此向必主淫乱败家。庚酉虽为旺方（金局之旺），但在水局为败，局向不配。不可立。" },
  "水局_冠带": { type: "冠带向", stage: "冠带", jiXiong: "平", laiShui: "宜从生方来", quShui: "水出墓库", eval: "水局辛戌冠带向，得小成之气。主少年有成，文艺出众。但水局冠带为辛戌（火库），水土相克，气机不畅，难成大器。" },
  "水局_临官": {
    type: "临官向", stage: "临官", jiXiong: "大吉",
    laiShui: "宜从旺方来", quShui: "水出墓库（乙辰）",
    eval: "水局立乾亥临官向，得临官禄位。乾为天门，亥为水局长生之门户，立此向官禄亨通，文武兼备。'乾亥向得水'为诸书中著名吉格。",
  },
  "水局_衰": { type: "衰向", stage: "衰", jiXiong: "平", laiShui: "不拘来去", quShui: "随意而出", eval: "水局癸丑衰向，气退而温。不以为主论吉凶，需配砂法。若得旺砂扶助，亦能守成。" },
  "水局_病": { type: "病向", stage: "病", jiXiong: "凶", laiShui: "忌来水", quShui: "宜速去", eval: "水局艮寅病位，立向多病痛缠身。艮为鬼门，寅为病符，双凶叠加。" },
  "水局_死": { type: "死向", stage: "死", jiXiong: "大凶", laiShui: "大忌来水", quShui: "-", eval: "水局甲卯死位，不可立向。犯死绝之煞。" },
  "水局_绝": { type: "绝向", stage: "绝", jiXiong: "大凶", laiShui: "大忌来水", quShui: "-", eval: "水局巽巳绝位，万不可用。绝后之煞。" },
  "水局_胎": { type: "胎向", stage: "胎", jiXiong: "平", laiShui: "宜暗水来", quShui: "宜缓出", eval: "水局丙午胎位。胎养之气未成，需砂助。" },

  // ── 金局各向 ──
  "金局_长生": {
    type: "生向（长生向）", stage: "长生", jiXiong: "大吉",
    laiShui: "宜右水倒左，水从帝旺方（庚酉）来", quShui: "水出墓库（癸丑）为正库消水",
    eval: "金局立巽巳长生向，合'生来会旺'之格。巽巳为金局长生之位，收旺方庚酉来水，出癸丑墓库。金局长生为'金生于巳'，得火炼金，主富贵双全而带威权，多为武将、法官、执法者。金局之贵，非他局可比。",
  },
  "金局_帝旺": {
    type: "旺向（帝旺向）", stage: "帝旺", jiXiong: "大吉",
    laiShui: "宜左水倒右，水从长生方（巽巳）来", quShui: "水出墓库（癸丑）为正库消水",
    eval: "金局立庚酉帝旺向，合'旺去迎生'之格。庚酉为金局旺位，得生方水来朝，出癸丑墓库。金旺主杀伐决断之权，多为权贵。但金过旺则刚极易折，须水方有情调和。",
  },
  "金局_墓": {
    type: "墓向（墓库向）", stage: "墓", jiXiong: "吉",
    laiShui: "宜左右水来朝", quShui: "水出绝位（艮寅）",
    eval: "金局立癸丑墓向，水从生或旺方来朝，出艮寅绝位。丑为金库，收万物而藏。'金库满盈，天下富足'。主富厚，晚运佳。",
  },
  "金局_养": {
    type: "养向", stage: "养", jiXiong: "吉",
    laiShui: "宜水从临官方（坤申）来", quShui: "水出墓库（癸丑）",
    eval: "金局立乙辰养向。收养位之气，主聚财蓄德，绵延后世。养向平稳，不求暴发但求久远。",
  },
  "金局_沐浴": { type: "沐浴向（败向）", stage: "沐浴", jiXiong: "凶", laiShui: "大忌来水", quShui: "-", eval: "金局丙午沐浴败位，丙午火克金，局气被伐，败上加败。立此向必破财损丁。" },
  "金局_冠带": { type: "冠带向", stage: "冠带", jiXiong: "平", laiShui: "宜从生方来", quShui: "水出墓库", eval: "金局丁未冠带向。丁未火土生金，冠带得生，主文采出众。但未为木库，与金局之气稍异。" },
  "金局_临官": {
    type: "临官向", stage: "临官", jiXiong: "大吉",
    laiShui: "宜从旺方来", quShui: "水出墓库（癸丑）",
    eval: "金局立坤申临官向。坤申土生金，临官得禄，主官禄丰盈、财源广进。'坤申向水朝堂，金玉满箱'。",
  },
  "金局_衰": { type: "衰向", stage: "衰", jiXiong: "平", laiShui: "不拘来去", quShui: "随意而出", eval: "金局辛戌衰向。金气入戌而衰，但戌为火库可炼金。平局，以砂法定。" },
  "金局_病": { type: "病向", stage: "病", jiXiong: "凶", laiShui: "忌来水", quShui: "宜速去", eval: "金局乾亥病位。乾金助金局，但亥为病地，金寒水冷。" },
  "金局_死": { type: "死向", stage: "死", jiXiong: "大凶", laiShui: "大忌来水", quShui: "-", eval: "金局壬子死位。水泄金气又逢死地，大凶不可用。" },
  "金局_绝": { type: "绝向", stage: "绝", jiXiong: "大凶", laiShui: "大忌来水", quShui: "-", eval: "金局艮寅绝位。金绝于寅，断不可立。" },
  "金局_胎": { type: "胎向", stage: "胎", jiXiong: "平", laiShui: "宜暗水来", quShui: "宜缓出", eval: "金局甲卯胎位。金胎于卯，木旺之地，气不相融。平平之局。" },

  // ── 木局各向 ──
  "木局_长生": {
    type: "生向（长生向）", stage: "长生", jiXiong: "大吉",
    laiShui: "宜右水倒左，水从帝旺方（甲卯）来", quShui: "水出墓库（丁未）为正库消水",
    eval: "木局立乾亥长生向，合'生来会旺'之格。乾亥为木局长生之位，收旺方甲卯来水，出丁未墓库。木局长生于亥，得水滋养，主生机勃发、人文昌盛、教育世家、学术名流。木局生生之德，发福最为绵长。",
  },
  "木局_帝旺": {
    type: "旺向（帝旺向）", stage: "帝旺", jiXiong: "大吉",
    laiShui: "宜左水倒右，水从长生方（乾亥）来", quShui: "水出墓库（丁未）为正库消水",
    eval: "木局立甲卯帝旺向，合'旺去迎生'之格。甲卯为木局旺位，收生方乾亥来水，出丁未墓库。旺木参天，主文章盖世、仕途显赫、名垂青史。但木旺宜有金制（砂法），否则旺而无制反为滥。",
  },
  "木局_墓": {
    type: "墓向（墓库向）", stage: "墓", jiXiong: "吉",
    laiShui: "宜左右水来朝", quShui: "水出绝位（坤申）",
    eval: "木局立丁未墓向。未为木库，收水归库如材木入仓。主富厚，尤其适合木材、纸业、文化等木相关行业。晚运兴隆。",
  },
  "木局_养": {
    type: "养向", stage: "养", jiXiong: "吉",
    laiShui: "宜水从临官方（艮寅）来", quShui: "水出墓库（丁未）",
    eval: "木局立辛戌养向。养气渐成，木虽未参天而根已深。主稳中有升，事业持续向好。适合常年经营之商贾。",
  },
  "木局_沐浴": { type: "沐浴向（败向）", stage: "沐浴", jiXiong: "凶", laiShui: "大忌来水", quShui: "-", eval: "木局壬子沐浴败位。子水虽生木，但沐浴为桃花败地。立此向桃花泛滥，因色破财。" },
  "木局_冠带": { type: "冠带向", stage: "冠带", jiXiong: "平", laiShui: "宜从生方来", quShui: "水出墓库", eval: "木局癸丑冠带向。丑土培木，冠带得地，主早发。但丑为金库克木，发中藏败。" },
  "木局_临官": {
    type: "临官向", stage: "临官", jiXiong: "大吉",
    laiShui: "宜从旺方来", quShui: "水出墓库（丁未）",
    eval: "木局立艮寅临官向。艮寅为木局临官禄位，'寅为功曹'，主文贵武略。立此向得禄，官运亨通，仕途顺遂。",
  },
  "木局_衰": { type: "衰向", stage: "衰", jiXiong: "平", laiShui: "不拘来去", quShui: "随意而出", eval: "木局乙辰衰向。辰为水库，水生木而气衰。平平，需砂助。" },
  "木局_病": { type: "病向", stage: "病", jiXiong: "凶", laiShui: "忌来水", quShui: "宜速去", eval: "木局巽巳病位。巳火泄木气又犯病符，忌立向。" },
  "木局_死": { type: "死向", stage: "死", jiXiong: "大凶", laiShui: "大忌来水", quShui: "-", eval: "木局丙午死位。午火焚木，死在旺火之中，大凶不可立。" },
  "木局_绝": { type: "绝向", stage: "绝", jiXiong: "大凶", laiShui: "大忌来水", quShui: "-", eval: "木局坤申绝位。申金克木，绝上加克，万不可用。" },
  "木局_胎": { type: "胎向", stage: "胎", jiXiong: "平", laiShui: "宜暗水来", quShui: "宜缓出", eval: "木局庚酉胎位。金为木之胎（胎于酉），金木相制。平局。" },
};

// 将 BureauInfo stages 数组转为 Record
function stagesToRecord(stages: Array<{ shan: string; stage: string }>): Record<string, string> {
  const rec: Record<string, string> = {};
  for (const s of stages) { rec[s.shan] = s.stage; }
  return rec;
}

// 解析山向字符串
function parseShanXiang(input: SanheShuifaInput): { sitting: string; facing: string } | null {
  if (input.sitting && input.facing) {
    return { sitting: input.sitting, facing: input.facing };
  }
  if (input.shanXiang) {
    const m = input.shanXiang.match(/^(\S{1,2})山(\S{1,2})向$/);
    if (m) return { sitting: m[1], facing: m[2] };
    // 尝试其他格式如 "子山午向 兼癸丁"
    const m2 = input.shanXiang.match(/(\S{1,2})山\s*(\S{1,2})向/);
    if (m2) return { sitting: m2[1], facing: m2[2] };
  }
  return null;
}

// 根据朝向在四大局中查找对应的长生宫位
function findBureauAndStage(facing: string): { bureau: string; stage: string } | null {
  for (const [bureauName, bureauData] of Object.entries(BUREAUS)) {
    for (const s of bureauData.stages) {
      if (s.shan === facing) {
        return { bureau: bureauName, stage: s.stage };
      }
    }
  }
  return null;
}

// 根据水口定局
function getBureauByShuiKou(shuiKou: string): string | null {
  return SHUI_KOU_2_BUREAU[shuiKou] ?? null;
}

export function calculateSanheShuifa(input: SanheShuifaInput): SanheShuifaResult {
  const mode = input.mode || "single";

  if (mode === "all") {
    const allBureaus: BureauInfo[] = Object.values(BUREAUS).map((b) => ({
      name: b.name,
      wuXing: b.wuXing,
      ku: b.ku,
      changeSheng: b.changeSheng,
      kouJue: b.kouJue,
      stages: stagesToRecord(b.stages),
    }));

    const analysis = `【四大局全览】共4局：火局（库戌）、水局（库辰）、金局（库丑）、木局（库未）。

火局口诀：乙丙交而趋戌
水局口诀：辛壬会而聚辰
金局口诀：斗牛纳丁庚之气
木局口诀：金羊收癸甲之灵

每局以长生十二宫布于二十四山，水法以"生来会旺"、"旺去迎生"为正格，水出墓库为正库消水。沐浴/病/死/绝四宫不可立向。`;

    return { mode: "all", allBureaus, analysis };
  }

  const sx = parseShanXiang(input);
  const shanXiangKey = sx ? `${sx.sitting}山${sx.facing}向` : "未指定";
  const facing = sx?.facing;

  if (!facing) {
    return {
      mode: "single",
      shanXiang: shanXiangKey,
      analysis: "请提供坐山朝向（如\"子山午向\"）或坐山+朝向分别指定，以便分析。也可设置 mode: \"all\" 查看四大局全览。",
    };
  }

  if (!SHAN_24.includes(facing)) {
    return {
      mode: "single",
      shanXiang: shanXiangKey,
      analysis: `朝向"${facing}"不在二十四山范围内。二十四山为：${SHAN_24.join("、")}。请检查输入。`,
    };
  }

  // 确定水口所属局
  let bureauName: string | null = null;
  if (input.shuiKou) {
    bureauName = getBureauByShuiKou(input.shuiKou);
  }

  // 若未指定水口，则从朝向在四大局中的位置反查
  if (!bureauName) {
    const found = findBureauAndStage(facing);
    bureauName = found?.bureau ?? null;
  }

  if (!bureauName) {
    return {
      mode: "single",
      shanXiang: shanXiangKey,
      analysis: `无法确定朝向"${facing}"所属的四大局。请提供水口位置（如"乙辰"、"辛戌"等）以定局。`,
    };
  }

  const bureauData = BUREAUS[bureauName];
  if (!bureauData) {
    return { mode: "single", shanXiang: shanXiangKey, analysis: "内部错误：局数据缺失。" };
  }

  // 查找朝向在该局中对应的长生宫位
  const stageEntry = bureauData.stages.find((s) => s.shan === facing);
  const stage = stageEntry?.stage ?? "未知";

  // 获取该局该向的评语
  const evalKey = `${bureauName}_${stage}`;
  let evaluation = XIANG_EVAL[evalKey];

  if (!evaluation) {
    // 若没有详细评语，生成基础评语
    const jiXiongMap: Record<string, string> = {
      "长生": "大吉", "帝旺": "大吉", "临官": "大吉", "冠带": "平",
      "墓": "吉", "养": "吉", "衰": "平", "胎": "平",
      "沐浴": "凶", "病": "凶", "死": "大凶", "绝": "大凶",
    };
    evaluation = {
      type: `${stage}向`, stage, jiXiong: jiXiongMap[stage] || "平",
      laiShui: "见分析", quShui: "见分析",
      eval: `${bureauName}中${facing}处于${stage}之位。具体水法吉凶需结合水口、来水、去水综合判断。`,
    };
  }

  // 构建 BureauInfo
  const bureauInfo: BureauInfo = {
    name: bureauData.name,
    wuXing: bureauData.wuXing,
    ku: bureauData.ku,
    changeSheng: bureauData.changeSheng,
    kouJue: bureauData.kouJue,
    stages: stagesToRecord(bureauData.stages),
  };

  // 综合解读
  const jiXiongLabel = evaluation.jiXiong;
  const jiXiongAdvice = jiXiongLabel.includes("大吉") ? "此向为上等吉向，如得真水朝堂、正库消水，必能发福。建议实地勘察水口，确认与理论相符。"
    : jiXiongLabel.includes("吉") ? "此向为吉向，但不如生/旺/临官向之显赫。需配合砂法（山形）方能发挥全效。"
    : jiXiongLabel.includes("凶") ? "此向为凶向，原则上应避免立此向。若已建宅，建议请专业风水师实地勘察化解。"
    : "此向为平向，吉凶参半。建议配合砂法综合判断。";

  const analysis = `【三合四大水法分析】

坐向：${shanXiangKey}
所属：${bureauName}（${bureauData.wuXing}）
库位：${bureauData.ku}（${SHUI_KOU_2_BUREAU[Object.keys(SHUI_KOU_2_BUREAU).find(k => SHUI_KOU_2_BUREAU[k] === bureauName) ?? ""] || bureauData.ku}）
长生起：${bureauData.changeSheng}
口诀：${bureauData.kouJue}

朝向「${facing}」在${bureauName}中居【${stage}】之位
向法类型：${evaluation.type}
吉凶评定：${evaluation.jiXiong}
来水法则：${evaluation.laiShui}
去水法则：${evaluation.quShui}

评语：${evaluation.eval}

${jiXiongAdvice}

参考古籍：
• 《地理五诀》卷三·水法：「${bureauData.kouJue}」
• 《青囊序》：「水流出墓库，富贵无休歇」
• 《玉尺经》：「生来会旺，聪明子息；旺去迎生，富贵之期」
${input.shuiKou ? `• 您指定的水口「${input.shuiKou}」${getBureauByShuiKou(input.shuiKou) === bureauName ? "与本局相符 ✓" : "与本局不符，请核实"}` : "• 未指定水口，以上分析基于朝向反推。建议提供水口以精确判断。"}`;

  return {
    mode: "single",
    shanXiang: shanXiangKey,
    bureau: bureauInfo,
    evaluation,
    analysis,
  };
}
