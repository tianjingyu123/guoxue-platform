// ── 六十四卦图谱 ──
// 算法参考：《周易》《焦氏易林》
import type { LiuShiSiTuPuResult, GuaTuPu } from "@guoxue/shared";

// 六十四卦基本信息（彖辞+大象辞）
const GUA_64_DATA: GuaTuPu[] = [
  { number: 1, name: "乾为天", shangGua: "乾☰", xiaGua: "乾☰", tuanCi: "大哉乾元，万物资始，乃统天。", daXiang: "天行健，君子以自强不息。" },
  { number: 2, name: "坤为地", shangGua: "坤☷", xiaGua: "坤☷", tuanCi: "至哉坤元，万物资生，乃顺承天。", daXiang: "地势坤，君子以厚德载物。" },
  { number: 3, name: "水雷屯", shangGua: "坎☵", xiaGua: "震☳", tuanCi: "屯，刚柔始交而难生。", daXiang: "云雷屯，君子以经纶。" },
  { number: 4, name: "山水蒙", shangGua: "艮☶", xiaGua: "坎☵", tuanCi: "蒙，山下有险，险而止蒙。", daXiang: "山下出泉蒙，君子以果行育德。" },
  { number: 5, name: "水天需", shangGua: "坎☵", xiaGua: "乾☰", tuanCi: "需，须也，险在前也。", daXiang: "云上于天需，君子以饮食宴乐。" },
  { number: 6, name: "天水讼", shangGua: "乾☰", xiaGua: "坎☵", tuanCi: "讼，上刚下险，险而健讼。", daXiang: "天与水违行讼，君子以作事谋始。" },
  { number: 7, name: "地水师", shangGua: "坤☷", xiaGua: "坎☵", tuanCi: "师，众也，贞正也。", daXiang: "地中有水师，君子以容民畜众。" },
  { number: 8, name: "水地比", shangGua: "坎☵", xiaGua: "坤☷", tuanCi: "比，吉也，比辅也。", daXiang: "地上有水比，先王以建万国亲诸侯。" },
  { number: 9, name: "风天小畜", shangGua: "巽☴", xiaGua: "乾☰", tuanCi: "小畜，柔得位而上下应之。", daXiang: "风行天上小畜，君子以懿文德。" },
  { number: 10, name: "天泽履", shangGua: "乾☰", xiaGua: "兑☱", tuanCi: "履，柔履刚也。", daXiang: "上天下泽履，君子以辨上下定民志。" },
  { number: 11, name: "地天泰", shangGua: "坤☷", xiaGua: "乾☰", tuanCi: "泰，小往大来，吉亨。", daXiang: "天地交泰，后以财成天地之道。" },
  { number: 12, name: "天地否", shangGua: "乾☰", xiaGua: "坤☷", tuanCi: "否之匪人，不利君子贞。", daXiang: "天地不交否，君子以俭德辟难。" },
  { number: 13, name: "天火同人", shangGua: "乾☰", xiaGua: "离☲", tuanCi: "同人，柔得位得中而应乎乾。", daXiang: "天与火同人，君子以类族辨物。" },
  { number: 14, name: "火天大有", shangGua: "离☲", xiaGua: "乾☰", tuanCi: "大有，柔得尊位大中。", daXiang: "火在天上大有，君子以遏恶扬善。" },
  { number: 15, name: "地山谦", shangGua: "坤☷", xiaGua: "艮☶", tuanCi: "谦亨，天道下济而光明。", daXiang: "地中有山谦，君子以裒多益寡。" },
  { number: 16, name: "雷地豫", shangGua: "震☳", xiaGua: "坤☷", tuanCi: "豫，刚应而志行。", daXiang: "雷出地奋豫，先王以作乐崇德。" },
  { number: 17, name: "泽雷随", shangGua: "兑☱", xiaGua: "震☳", tuanCi: "随，刚来而下柔，动而说。", daXiang: "泽中有雷随，君子以向晦入宴息。" },
  { number: 18, name: "山风蛊", shangGua: "艮☶", xiaGua: "巽☴", tuanCi: "蛊，刚上而柔下。", daXiang: "山下有风蛊，君子以振民育德。" },
  { number: 19, name: "地泽临", shangGua: "坤☷", xiaGua: "兑☱", tuanCi: "临，刚浸而长。", daXiang: "泽上有地临，君子以教思无穷。" },
  { number: 20, name: "风地观", shangGua: "巽☴", xiaGua: "坤☷", tuanCi: "观，盥而不荐，有孚颙若。", daXiang: "风行地上观，先王以省方观民设教。" },
  { number: 21, name: "火雷噬嗑", shangGua: "离☲", xiaGua: "震☳", tuanCi: "噬嗑，亨，利用狱。", daXiang: "雷电噬嗑，先王以明罚敕法。" },
  { number: 22, name: "山火贲", shangGua: "艮☶", xiaGua: "离☲", tuanCi: "贲亨，柔来而文刚。", daXiang: "山下有火贲，君子以明庶政无敢折狱。" },
  { number: 23, name: "山地剥", shangGua: "艮☶", xiaGua: "坤☷", tuanCi: "剥，剥也，柔变刚也。", daXiang: "山附于地剥，上以厚下安宅。" },
  { number: 24, name: "地雷复", shangGua: "坤☷", xiaGua: "震☳", tuanCi: "复亨，刚反动而以顺行。", daXiang: "雷在地中复，先王以至日闭关。" },
  { number: 25, name: "天雷无妄", shangGua: "乾☰", xiaGua: "震☳", tuanCi: "无妄，刚自外来而为主于内。", daXiang: "天下雷行无妄，先王以茂对时育万物。" },
  { number: 26, name: "山天大畜", shangGua: "艮☶", xiaGua: "乾☰", tuanCi: "大畜，刚健笃实辉光。", daXiang: "天在山中大畜，君子以多识前言往行。" },
  { number: 27, name: "山雷颐", shangGua: "艮☶", xiaGua: "震☳", tuanCi: "颐，贞吉，观颐自求口实。", daXiang: "山下有雷颐，君子以慎言语节饮食。" },
  { number: 28, name: "泽风大过", shangGua: "兑☱", xiaGua: "巽☴", tuanCi: "大过，大者过也。", daXiang: "泽灭木大过，君子以独立不惧。" },
  { number: 29, name: "坎为水", shangGua: "坎☵", xiaGua: "坎☵", tuanCi: "习坎，重险也。", daXiang: "水洊至习坎，君子以常德行习教事。" },
  { number: 30, name: "离为火", shangGua: "离☲", xiaGua: "离☲", tuanCi: "离，丽也，日月丽乎天。", daXiang: "明两作离，大人以继明照于四方。" },
  { number: 31, name: "泽山咸", shangGua: "兑☱", xiaGua: "艮☶", tuanCi: "咸，感也，柔上而刚下。", daXiang: "山上有泽咸，君子以虚受人。" },
  { number: 32, name: "雷风恒", shangGua: "震☳", xiaGua: "巽☴", tuanCi: "恒，久也，刚上而柔下。", daXiang: "雷风恒，君子以立不易方。" },
  { number: 33, name: "天山遁", shangGua: "乾☰", xiaGua: "艮☶", tuanCi: "遁亨，遁而亨也。", daXiang: "天下有山遁，君子以远小人不恶而严。" },
  { number: 34, name: "雷天大壮", shangGua: "震☳", xiaGua: "乾☰", tuanCi: "大壮，大者壮也。", daXiang: "雷在天上大壮，君子以非礼弗履。" },
  { number: 35, name: "火地晋", shangGua: "离☲", xiaGua: "坤☷", tuanCi: "晋，进也，明出地上。", daXiang: "明出地上晋，君子以自昭明德。" },
  { number: 36, name: "地火明夷", shangGua: "坤☷", xiaGua: "离☲", tuanCi: "明夷，明入地中。", daXiang: "明入地中明夷，君子以莅众用晦而明。" },
  { number: 37, name: "风火家人", shangGua: "巽☴", xiaGua: "离☲", tuanCi: "家人，女正位乎内男正位乎外。", daXiang: "风自火出家人，君子以言有物而行有恒。" },
  { number: 38, name: "火泽睽", shangGua: "离☲", xiaGua: "兑☱", tuanCi: "睽，火动而上泽动而下。", daXiang: "上火下泽睽，君子以同而异。" },
  { number: 39, name: "水山蹇", shangGua: "坎☵", xiaGua: "艮☶", tuanCi: "蹇，难也，险在前也。", daXiang: "山上有水蹇，君子以反身修德。" },
  { number: 40, name: "雷水解", shangGua: "震☳", xiaGua: "坎☵", tuanCi: "解，险以动，动而免乎险。", daXiang: "雷雨作解，君子以赦过宥罪。" },
  { number: 41, name: "山泽损", shangGua: "艮☶", xiaGua: "兑☱", tuanCi: "损，损下益上其道上行。", daXiang: "山下有泽损，君子以惩忿窒欲。" },
  { number: 42, name: "风雷益", shangGua: "巽☴", xiaGua: "震☳", tuanCi: "益，损上益下民说无疆。", daXiang: "风雷益，君子以见善则迁有过则改。" },
  { number: 43, name: "泽天夬", shangGua: "兑☱", xiaGua: "乾☰", tuanCi: "夬，决也，刚决柔也。", daXiang: "泽上于天夬，君子以施禄及下。" },
  { number: 44, name: "天风姤", shangGua: "乾☰", xiaGua: "巽☴", tuanCi: "姤，遇也，柔遇刚也。", daXiang: "天下有风姤，后以施命诰四方。" },
  { number: 45, name: "泽地萃", shangGua: "兑☱", xiaGua: "坤☷", tuanCi: "萃，聚也，顺以说。", daXiang: "泽上于地萃，君子以除戎器戒不虞。" },
  { number: 46, name: "地风升", shangGua: "坤☷", xiaGua: "巽☴", tuanCi: "升，柔以时升。", daXiang: "地中生木升，君子以顺德积小以高大。" },
  { number: 47, name: "泽水困", shangGua: "兑☱", xiaGua: "坎☵", tuanCi: "困，刚揜也。", daXiang: "泽无水困，君子以致命遂志。" },
  { number: 48, name: "水风井", shangGua: "坎☵", xiaGua: "巽☴", tuanCi: "井，改邑不改井。", daXiang: "木上有水井，君子以劳民劝相。" },
  { number: 49, name: "泽火革", shangGua: "兑☱", xiaGua: "离☲", tuanCi: "革，水火相息。", daXiang: "泽中有火革，君子以治历明时。" },
  { number: 50, name: "火风鼎", shangGua: "离☲", xiaGua: "巽☴", tuanCi: "鼎，象也，以木巽火亨饪也。", daXiang: "木上有火鼎，君子以正位凝命。" },
  { number: 51, name: "震为雷", shangGua: "震☳", xiaGua: "震☳", tuanCi: "震亨，震来虩虩。", daXiang: "洊雷震，君子以恐惧修省。" },
  { number: 52, name: "艮为山", shangGua: "艮☶", xiaGua: "艮☶", tuanCi: "艮，止也，时止则止时行则行。", daXiang: "兼山艮，君子以思不出其位。" },
  { number: 53, name: "风山渐", shangGua: "巽☴", xiaGua: "艮☶", tuanCi: "渐之进也，女归吉也。", daXiang: "山上有木渐，君子以居贤德善俗。" },
  { number: 54, name: "雷泽归妹", shangGua: "震☳", xiaGua: "兑☱", tuanCi: "归妹，天地之大义也。", daXiang: "泽上有雷归妹，君子以永终知敝。" },
  { number: 55, name: "雷火丰", shangGua: "震☳", xiaGua: "离☲", tuanCi: "丰，大也，明以动。", daXiang: "雷电皆至丰，君子以折狱致刑。" },
  { number: 56, name: "火山旅", shangGua: "离☲", xiaGua: "艮☶", tuanCi: "旅，柔得中乎外而顺乎刚。", daXiang: "山上有火旅，君子以明慎用刑不留狱。" },
  { number: 57, name: "巽为风", shangGua: "巽☴", xiaGua: "巽☴", tuanCi: "巽，重巽以申命。", daXiang: "随风巽，君子以申命行事。" },
  { number: 58, name: "兑为泽", shangGua: "兑☱", xiaGua: "兑☱", tuanCi: "兑，说也，刚中而柔外。", daXiang: "丽泽兑，君子以朋友讲习。" },
  { number: 59, name: "风水涣", shangGua: "巽☴", xiaGua: "坎☵", tuanCi: "涣亨，刚来而不穷。", daXiang: "风行水上涣，先王以享于帝立庙。" },
  { number: 60, name: "水泽节", shangGua: "坎☵", xiaGua: "兑☱", tuanCi: "节亨，刚柔分而刚得中。", daXiang: "泽上有水节，君子以制数度议德行。" },
  { number: 61, name: "风泽中孚", shangGua: "巽☴", xiaGua: "兑☱", tuanCi: "中孚，柔在内而刚得中。", daXiang: "泽上有风中孚，君子以议狱缓死。" },
  { number: 62, name: "雷山小过", shangGua: "震☳", xiaGua: "艮☶", tuanCi: "小过，小者过而亨也。", daXiang: "山上有雷小过，君子以行过乎恭。" },
  { number: 63, name: "水火既济", shangGua: "坎☵", xiaGua: "离☲", tuanCi: "既济亨，小者亨也。", daXiang: "水在火上既济，君子以思患而预防之。" },
  { number: 64, name: "火水未济", shangGua: "离☲", xiaGua: "坎☵", tuanCi: "未济亨，柔得中也。", daXiang: "火在水上未济，君子以慎辨物居方。" },
];

// 八卦与五行属性
const BA_GUA_WX: Record<string, string> = { "乾☰":"金","坤☷":"土","震☳":"木","巽☴":"木","坎☵":"水","离☲":"火","艮☶":"土","兑☱":"金" };

export function calculateLiuShiSiTuPu(input: Record<string, unknown>): LiuShiSiTuPuResult {
  const guaNumber = input.guaNumber as number | undefined;
  const guaName = input.guaName as string | undefined;

  let selected: GuaTuPu | null = null;
  if (guaNumber) selected = GUA_64_DATA.find(g => g.number === guaNumber) || null;
  if (!selected && guaName) selected = GUA_64_DATA.find(g => g.name === guaName) || null;

  // 上经30下经34
  const shangJing = GUA_64_DATA.filter(g => g.number <= 30).length;
  const xiaJing = GUA_64_DATA.filter(g => g.number > 30).length;

  const summary = selected
    ? [
        `┌─ ${selected.name}（第${selected.number}卦）─────────────────`,
        `│ 上卦：${selected.shangGua}（${BA_GUA_WX[selected.shangGua] || ""}） 下卦：${selected.xiaGua}（${BA_GUA_WX[selected.xiaGua] || ""}）`,
        `│ ${selected.number <= 30 ? "上经" : "下经"}第${selected.number <= 30 ? selected.number : selected.number - 30}卦`,
        ``,
        `├─ 《彖》曰 ─────────────────`,
        `│ 「${selected.tuanCi}」`,
        ``,
        `├─ 《象》曰 ─────────────────`,
        `│ 「${selected.daXiang}」`,
        ``,
        `├─ 古籍出处 ─────────────────`,
        `│ 《周易》：「《易》有六十四卦，上经三十下经三十四。」`,
        `│ 《焦氏易林》：汉·焦延寿，六十四卦变占`,
        `│ 《易传》：孔子赞易，彖象文言十翼`,
        ``,
        `└─ 提示 ─────────────────`,
        `   输入 guaNumber 或 guaName 查看其他卦爻详情。`,
        `   彖辞释卦义，大象辞示君子之道。`,
      ].join("\n")
    : [
        `┌─ 周易六十四卦图谱 ─────────────────`,
        `│ 涵盖天地万物变化之象，共${GUA_64_DATA.length}卦`,
        `│ · 上经${shangJing}卦：始于乾坤，终于坎离`,
        `│ · 下经${xiaJing}卦：始于咸恒，终于既济未济`,
        ``,
        `├─ 八卦基础 ─────────────────`,
        `│ 乾☰·坤☷·震☳·巽☴·坎☵·离☲·艮☶·兑☱`,
        ``,
        `├─ 每卦含 ─────────────────`,
        `│ 卦序·卦名·上下卦·彖辞·大象辞`,
        ``,
        `├─ 古籍出处 ─────────────────`,
        `│ 《周易》：「《易》与天地准，故能弥纶天地之道。」`,
        `│ 《易传》：「彖者，言乎象者也；爻者，言乎变者也。」`,
        ``,
        `└─ 用法提示 ─────────────────`,
        `   输入 guaNumber（1-64）或 guaName（如"乾为天"）查看详情。`,
      ].join("\n")

  return { guaList: GUA_64_DATA, selected, summary };
}
