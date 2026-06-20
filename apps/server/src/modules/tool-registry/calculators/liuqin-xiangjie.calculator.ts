// ── 六亲详解计算引擎 ──
// 算法参考：《渊海子平》《三命通会·六亲》《滴天髓·六亲论》《子平真诠》
// 八字六亲（祖上/父母/兄弟/夫妻/子女）以十神定位，旺衰定吉凶
// 出处：《三命通会》云：「六亲者，父母兄弟妻财子禄是也。」

import type { LiuQinXiangJieInput, LiuQinXiangJieResult, LiuQinRelation } from "@guoxue/shared";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const GAN_WX: Record<string, string> = { "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水" };
const ZHI_WX: Record<string, string> = { "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水" };

const SHI_SHEN_TABLE: Record<string, Record<string, string>> = {
  "甲": { "甲":"比肩","乙":"劫财","丙":"食神","丁":"伤官","戊":"偏财","己":"正财","庚":"七杀","辛":"正官","壬":"偏印","癸":"正印" },
  "乙": { "甲":"劫财","乙":"比肩","丙":"伤官","丁":"食神","戊":"正财","己":"偏财","庚":"正官","辛":"七杀","壬":"正印","癸":"偏印" },
  "丙": { "甲":"偏印","乙":"正印","丙":"比肩","丁":"劫财","戊":"食神","己":"伤官","庚":"偏财","辛":"正财","壬":"七杀","癸":"正官" },
  "丁": { "甲":"正印","乙":"偏印","丙":"劫财","丁":"比肩","戊":"伤官","己":"食神","庚":"正财","辛":"偏财","壬":"正官","癸":"七杀" },
  "戊": { "甲":"七杀","乙":"正官","丙":"偏印","丁":"正印","戊":"比肩","己":"劫财","庚":"食神","辛":"伤官","壬":"偏财","癸":"正财" },
  "己": { "甲":"正官","乙":"七杀","丙":"正印","丁":"偏印","戊":"劫财","己":"比肩","庚":"伤官","辛":"食神","壬":"正财","癸":"偏财" },
  "庚": { "甲":"偏财","乙":"正财","丙":"七杀","丁":"正官","戊":"偏印","己":"正印","庚":"比肩","辛":"劫财","壬":"食神","癸":"伤官" },
  "辛": { "甲":"正财","乙":"偏财","丙":"正官","丁":"七杀","戊":"正印","己":"偏印","庚":"劫财","辛":"比肩","壬":"伤官","癸":"食神" },
  "壬": { "甲":"食神","乙":"伤官","丙":"偏财","丁":"正财","戊":"七杀","己":"正官","庚":"偏印","辛":"正印","壬":"比肩","癸":"劫财" },
  "癸": { "甲":"伤官","乙":"食神","丙":"正财","丁":"偏财","戊":"正官","己":"七杀","庚":"正印","辛":"偏印","壬":"劫财","癸":"比肩" },
};

const LIU_QIN_MAP: Record<string, Record<string, { qin: string; pillar: string; gongWei: string; shenType: string; classicalRef: string }[]>> = {
  "男": {
    "年柱": [
      { qin:"祖上", pillar:"年柱", gongWei:"祖辈宫", shenType:"正印", classicalRef:"《渊海子平》：「年柱为根，主祖上。」" },
      { qin:"母亲", pillar:"年柱", gongWei:"祖辈宫", shenType:"正印", classicalRef:"《三命通会》：「正印为母，偏财为父。」男命以正印为母。" },
    ],
    "月柱": [
      { qin:"父亲", pillar:"月柱", gongWei:"父母宫", shenType:"偏财", classicalRef:"《渊海子平》：「偏财为父，男命以偏财为父星。」" },
    ],
    "日柱": [
      { qin:"自己", pillar:"日柱", gongWei:"自身宫", shenType:"比肩", classicalRef:"《滴天髓》：「日主者，命之我也。」" },
      { qin:"妻室", pillar:"日支", gongWei:"夫妻宫", shenType:"正财", classicalRef:"《三命通会》：「男命以正财为妻，日支为妻宫。」" },
    ],
    "时柱": [
      { qin:"子女", pillar:"时柱", gongWei:"子女宫", shenType:"七杀", classicalRef:"《渊海子平》：「男命以七杀为子，时柱为子女宫。」" },
    ],
  },
  "女": {
    "年柱": [
      { qin:"祖上", pillar:"年柱", gongWei:"祖辈宫", shenType:"偏印", classicalRef:"《渊海子平》：「年柱为根，主祖上。」" },
      { qin:"母亲", pillar:"年柱", gongWei:"祖辈宫", shenType:"偏印", classicalRef:"《三命通会》：「女命以偏印为母。」" },
    ],
    "月柱": [
      { qin:"父亲", pillar:"月柱", gongWei:"父母宫", shenType:"正财", classicalRef:"《三命通会》：「女命以正财为父。」" },
    ],
    "日柱": [
      { qin:"自己", pillar:"日柱", gongWei:"自身宫", shenType:"比肩", classicalRef:"《滴天髓》：「日主者，命之我也。」" },
      { qin:"夫君", pillar:"日支", gongWei:"夫妻宫", shenType:"正官", classicalRef:"《渊海子平》：「女命以正官为夫，日支为夫宫。」" },
    ],
    "时柱": [
      { qin:"子女", pillar:"时柱", gongWei:"子女宫", shenType:"食神", classicalRef:"《三命通会》：「女命以食神为子。」" },
    ],
  },
};

function getShiShen(dayGan: string, targetGan: string): string {
  return SHI_SHEN_TABLE[dayGan]?.[targetGan] || "未知";
}

function getWangShuai(ganZhi: string, monthZhi: string): "旺" | "平" | "衰" | "缺" {
  if (!ganZhi || ganZhi.length < 2) return "缺";
  const gan = ganZhi[0];
  const gw = GAN_WX[gan] || "";
  const mw = ZHI_WX[monthZhi] || "";

  const shengFu = (gw === mw || (gw === "木" && mw === "水") || (gw === "火" && mw === "木") ||
    (gw === "土" && mw === "火") || (gw === "金" && mw === "土") || (gw === "水" && mw === "金"));
  const keXie = ((gw === "木" && mw === "金") || (gw === "火" && mw === "水") ||
    (gw === "土" && mw === "木") || (gw === "金" && mw === "火") || (gw === "水" && mw === "土"));

  if (shengFu) return "旺";
  if (keXie) return "衰";
  return "平";
}

const QIN_ANALYSIS: Record<string, Record<string, string>> = {
  "祖上": { "旺":"祖业丰厚，得祖荫庇佑，家世良好。宜守成发扬祖业。", "平":"祖业一般，需靠自己打拼。白手起家亦能成功。", "衰":"祖业凋零，白手起家。虽辛苦但有开创之才。", "缺":"幼年失怙，祖上无缘。自立自强反而成才。" },
  "母亲": { "旺":"母亲健康长寿，得母爱护持。母子情深，幼年得良好教养。", "平":"母子关系一般，平淡相处。虽不亲密但也无大碍。", "衰":"母亲体弱或缘分薄。宜尽孝道弥补先天不足。", "缺":"早年与母亲分离。宜认义母或尊长女性贵人以补。" },
  "父亲": { "旺":"父亲有成就，得父辈提携。事业有靠山，做事有底气。", "平":"父亲普通，但尚能依靠。自己努力亦能出人头地。", "衰":"父亲运势不佳或早逝。宜自强不息，化压力为动力。", "缺":"与父亲缘分淡薄。宜拜干爹或尊长辈男性为精神支撑。" },
  "自己": { "旺":"自身旺强，意志坚定能成事。宜主动出击积极作为。", "平":"自身中庸，安稳度日。宜循序渐进不可急进。", "衰":"自身衰弱，需贵人相助。宜依附强者共同发展。", "缺":"身弱多病，需注意养生。宜以守为攻静待时机。" },
  "妻室": { "旺":"妻子贤能，旺夫兴家。得贤内助事业家庭双丰收。", "平":"夫妻平淡，相敬如宾。虽不轰轰烈烈但也安稳。", "衰":"妻缘薄弱或妻子体弱。宜多关爱体谅维护婚姻。", "缺":"克妻或无妻缘。宜晚婚或找年龄差距较大者。" },
  "夫君": { "旺":"夫君有才有德，夫荣妻贵。婚姻美满得丈夫爱护。", "平":"夫妻平淡，安稳度日。生活虽不富贵却也知足。", "衰":"夫缘不美或丈夫运势差。宜独立自强不依赖丈夫。", "缺":"克夫或无夫缘。宜晚婚或找外地/外国人为夫。" },
  "子女": { "旺":"子女有出息，晚景幸福。子孝孙贤，享天伦之乐。", "平":"子女普通，但尚孝顺。平淡是真，知足常乐。", "衰":"子女缘分薄或子女有疾。宜多积德以荫子孙。", "缺":"无子或子女远行。宜认义子养子，晚年亦有所依。" },
};

export function calculateLiuQinXiangJie(input: Record<string, unknown>): LiuQinXiangJieResult {
  const { gender, yearPillar, monthPillar, dayPillar, hourPillar } = input as unknown as LiuQinXiangJieInput;
  if (!dayPillar) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "日柱不能为空");

  const dayGan = dayPillar[0];
  const g = gender || "男";

  const relations: LiuQinRelation[] = [];
  const pillars: Record<string, string> = { "年柱": yearPillar, "月柱": monthPillar, "日柱": dayPillar, "时柱": hourPillar, "日支": dayPillar[1] };

  const qinMap = LIU_QIN_MAP[g] || LIU_QIN_MAP["男"];
  for (const [, items] of Object.entries(qinMap)) {
    for (const item of items) {
      const gz = pillars[item.pillar] || "";
      const ws = getWangShuai(gz, (monthPillar || "子")[1]);
      const gan = gz[0] || "";
      const actualShen = getShiShen(dayGan, gan);

      const analysisKey = item.qin;
      const analysisText = QIN_ANALYSIS[analysisKey]?.[ws] || "平安普通。";

      relations.push({
        name: item.qin,
        shiShen: actualShen || item.shenType,
        gongWei: item.gongWei,
        pillar: item.pillar,
        ganZhi: gz || "-",
        wangShuai: ws,
        wuXingRel: gan ? `${gan}(${GAN_WX[gan]||"?"}) → 日主${dayGan}(${GAN_WX[dayGan]||"?"})` : "-",
        jiXiong: ws === "旺" ? "吉" : ws === "衰" || ws === "缺" ? "凶" : "平",
        analysis: `${analysisText}（出处：${item.classicalRef}）`,
      });
    }
  }

  const shiShenMap: Record<string, string> = {};
  for (const gan of GAN) {
    shiShenMap[gan] = getShiShen(dayGan, gan);
  }

  const gongWeiMap: Record<string, { qin: string; pillar: string; ganZhi: string }> = {
    "年柱": { qin:"祖辈", pillar:"年柱", ganZhi: yearPillar },
    "月柱": { qin:"父母", pillar:"月柱", ganZhi: monthPillar },
    "日柱": { qin:"自身", pillar:"日柱", ganZhi: dayPillar },
    "时柱": { qin:"子女", pillar:"时柱", ganZhi: hourPillar },
  };

  const goodCount = relations.filter(r => r.jiXiong === "吉").length;
  const badCount = relations.filter(r => r.jiXiong === "凶").length;

  const analysis = [
    `日主${dayGan}(${GAN_WX[dayGan]})，${g === "男" ? "男命" : "女命"}。`,
    `六亲中${goodCount}吉${badCount}凶，`,
    goodCount >= 5 ? "六亲缘厚，得亲友之助。" :
    badCount >= 3 ? "六亲缘薄，宜自立自强。" : "六亲有喜有忧，各有因缘。",
    `日柱为夫妻宫(${dayPillar[1]})，时柱为子女宫(${hourPillar ? hourPillar[0] : "?"})。`,
  ].join("");

  // 结构化 box-drawing 摘要
  const lines: string[] = [
    `┌─ 六亲详解 ─────────────────`,
    `│ 日主：${dayGan}（${GAN_WX[dayGan]}） 性别：${g === "男" ? "男命" : "女命"}`,
    `│ 四柱：${yearPillar||"?"}年 ${monthPillar||"?"}月 ${dayPillar||"?"}日 ${hourPillar||"?"}时`,
    ``,
    `├─ 六亲逐个分析 ─────────────────`,
  ];
  const pillarOrder = ["年柱","月柱","日柱","日支","时柱"];
  const seenQin = new Set<string>();
  for (const p of pillarOrder) {
    for (const r of relations) {
      if (r.pillar === p && !seenQin.has(r.name)) {
        seenQin.add(r.name);
        const flag = r.jiXiong === "吉" ? "★" : r.jiXiong === "凶" ? "☠" : "·";
        lines.push(`│ ${flag} ${r.name.padEnd(4, " ")} ${r.ganZhi.padEnd(4, " ")} 十神${r.shiShen.padEnd(4, " ")} ${r.wangShuai} ${r.gongWei}`);
        if (r.analysis.length > 0) {
          lines.push(`│   ${r.analysis.slice(0, 70)}`);
        }
      }
    }
  }
  lines.push(`│`);
  lines.push(`├─ 十神速查 ─────────────────`);
  const ssOrder = ["比肩","劫财","食神","伤官","正财","偏财","正官","七杀","正印","偏印"];
  lines.push(`│ ${ssOrder.map(ss => `${ss}:${Object.entries(shiShenMap).filter(([,v]) => v === ss).map(([k]) => k).join("")}`).join("  ")}`);
  lines.push(`│`);
  lines.push(`├─ 宫位 ─────────────────`);
  lines.push(`│ 年柱祖辈宫(${gongWeiMap["年柱"]?.ganZhi||"-"}) 月柱父母宫(${gongWeiMap["月柱"]?.ganZhi||"-"})`);
  lines.push(`│ 日柱自身宫(${gongWeiMap["日柱"]?.ganZhi||"-"}) 时柱子女宫(${gongWeiMap["时柱"]?.ganZhi||"-"})`);
  lines.push(`│`);
  lines.push(`├─ 评判 ─────────────────`);
  if (goodCount >= 5) {
    lines.push(`│ 六亲${goodCount}吉${badCount}凶 — 六亲缘厚，家世良好，得亲友之力可成大事。`);
  } else if (badCount >= 3) {
    lines.push(`│ 六亲${goodCount}吉${badCount}凶 — 六亲缘薄，宜白手起家，自立自强反而成才。`);
  } else {
    lines.push(`│ 六亲${goodCount}吉${badCount}凶 — 有喜有忧各有因缘，知命而修可以改善。`);
  }
  lines.push(`│`);
  lines.push(`├─ 古籍出处 ─────────────────`);
  lines.push(`│ 《渊海子平》—— 六亲十神体系奠基之作`);
  lines.push(`│ 《三命通会·六亲》—— 万民英著，六亲论述最全`);
  lines.push(`│ 《滴天髓·六亲论》—— 清·任铁樵注，六亲旺衰精要`);
  lines.push(`│ 《子平真诠》—— 清·沈孝瞻，十神格局与六亲关系`);
  lines.push(`│`);
  lines.push(`└─ 命理提示 ─────────────────`);
  lines.push(`   六亲不可孤立论断，须结合大运流年看旺衰变化。`);
  lines.push(`   旺者逢生更旺，衰者逢克更衰，大运十年来去之间六亲有变。`);
  lines.push(`   缺亲不等于无情，只是先天缘分薄，后天努力可弥补。`);
  const summary = lines.join("\n");

  return { dayMaster: dayGan, gender: g, relations, shiShenMap, gongWeiMap, analysis, summary } as LiuQinXiangJieResult & { summary: string };
}
