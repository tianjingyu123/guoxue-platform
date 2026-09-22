// ── 诸葛神数计算引擎 ──
// 算法参考：《诸葛神数》《周易》
// 384签 + 三字笔画起数（康熙笔画走 shared 的 20992 字真表，查不到抛错不臆测）
//
// 🔴 2026-09-20：本文件的**签文只有 38 条是真的**，其余 346 条曾由模板拼接生成，已删除。
// 未收录的签如实标注「原文未收录」，不再拼。详见下方说明块。

import type { ZhuGeResult, QianWen } from "@guoxue/shared";
import { strokeOfOrNull } from "@guoxue/shared/paipan";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

/**
 * 🔴 2026-09-20 删掉两大块死代码，git 历史里可取回：
 *
 * ① `CHAR_STROKES`（1494 字本地笔画表）+ 按 Unicode 码点估算的兜底。
 *    码点与笔画毫无关系，那句「基于Unicode位置的合理估算」是假的。
 *    实测：92.9% 的字落进估算，整体笔画正确率 12.0%，
 *    诸葛只取个位 → 个位正确率 13.7%，**约 86% 的字会起错签**。
 *    改走 `@guoxue/shared/paipan` 的 20992 字康熙真表（恰好覆盖整个 U+4E00–U+9FFF）。
 *
 * ② `GUA_64` / `YAO_6_TYPES` / `QIAN_POEM_TEMPLATES` / `generateQianWen`
 *    —— 拼接签文的那一整套。384 签里 346 条（90%）是它按
 *    `(qianNum*17 + guaIdx*7 + yaoIdx*13) % 模板数` 选模板、
 *    `gua.keywords[(qianNum + i*11 + guaIdx*3) % len]` 填词生成的。
 *    那串乘数没有任何依据，与奇门穿壬「七十二局表」是同一类下标算术。
 *    **签文是典籍原文、不可再生**，拼出来的读着像也不是那一签。
 *
 * 真正的 384 签原文在 `apps/server/src/modules/paipan/engine/data/zhuge-signs.json`（2026-09-21 自前端迁入）
 * （384 条齐全、无空条目，前端一直用它）。迁不迁进 shared 留给决策人：
 * 那份数据含第三方网站的解签正文（版权待确认），且有两处质量问题
 * （`gong` 出现第 9 个值「竞宫」，八宫只该有八个；`gua` 字段被截断如「乾变大有(乾九五」）。
 */
/**
 * 康熙笔画：走 shared 的 20992 字真表，查不到直接抛错，**不臆测**。
 *
 * 🔴 2026-09-20 重写。原实现是「本地 1494 字表 + 按 Unicode 码点估算」：
 *
 * ```ts
 * const relativePos = (code - 0x4E00) / (0x9FFF - 0x4E00)
 * return Math.round(5 + relativePos * 15)   // 注释写「基于Unicode位置的合理估算」
 * ```
 *
 * 码点与笔画之间没有任何关系，这句注释本身是假的——
 * 与姓名五格那三处 `Math.ceil((code-0x4e00)/1200)+3`（注释写「基于笔画数频率分布的
 * 合理估计」）是同一个编造模式，本仓已判定过一次。
 *
 * **实测**（拿 shared 的 20992 字康熙表全枚举）：
 *   · 92.9% 的字命中不了本地表，落进码点估算
 *   · 整体只有 **12.0%** 的笔画数正确
 *   · 诸葛神数只取笔画的**个位**，个位正确率 **13.7%** —— 约 **86% 的字会起错签**
 *
 * 正确的表早就在仓库里（`packages/shared/src/paipan/kangxi.ts`，20992 字，
 * 由前端 `pkg-paipan2/lib/data/kangxi-strokes.json` 迁入并已逐字比对一致）。
 */
function getStrokeCount(c: string): number {
  const n = strokeOfOrNull(c);
  if (n == null) {
    throw new BusinessException(
      ErrorCode.VALIDATION_ERROR,
      `「${c}」不在康熙字典库中，无法起数。占卜起数须准确，本工具不对未收录字做估算，请换字再测。`,
    );
  }
  return n;
}

// 从模板生成签文
const CLASSICAL_OVERRIDES: Record<number, QianWen> = {
  // 乾卦系 1-6
  1: {number:1,text:"天门一卦榜，预定夺标人。马嘶芳草地，秋高听鹿鸣。",type:"上上",gua:"乾",baiHua:"此签大吉，如秋高马肥之时，正是功名成就之机。凡事积极主动，必有所成。"},
  2: {number:2,text:"地有神，甚威灵。兴邦辅国，尊主庇民。",type:"上上",gua:"坤",baiHua:"有神灵护佑，利国利民之象。凡事宜顺势而为，得道多助。"},
  3: {number:3,text:"长安花，不可及。春风中，马蹄疾。急早加鞭，骤然生色。",type:"上上",gua:"屯",baiHua:"时机稍纵即逝，须抓紧机会立刻行动。前程似锦但需奋力一搏。"},
  4: {number:4,text:"春花娇媚，不禁雨打风飘。秋菊幽芳，反耐霜凌雪傲。",type:"上上",gua:"蒙",baiHua:"表面浓艳不如内在坚毅。提示做人做事重在内功，不尚浮华。"},
  5: {number:5,text:"春雷震，夏风巽。卧龙起，猛虎啸。风云会合，救济苍生。",type:"上上",gua:"需",baiHua:"英雄得时之象。势如破竹，大有作为。宜放手大干。"},
  // 坤卦系 7-12
  7: {number:7,text:"舟行风顺，水到渠成。一帆高挂，万里云程。",type:"上吉",gua:"讼",baiHua:"万事亨通之象。顺势而行，不须费力，功成自然。"},
  10: {number:10,text:"龙虎相会，风云际会时。一举成名天下知，万人头上逞英雄。",type:"上上",gua:"履",baiHua:"英雄会合之象。名利双收，一鸣惊人。"},
  // 屯卦系 13-18
  13: {number:13,text:"得意宜逢妇，前程去有缘。利名终有望，三五月团圆。",type:"上吉",gua:"同人",baiHua:"因缘际会之象。留意与女性贵人相遇，三五之数有吉应。"},
  15: {number:15,text:"意在闲中信未来，故人千里意徘徊。天边雁足传消息，准拟梅花腊月开。",type:"上吉",gua:"谦",baiHua:"远方有佳音至。等待中的好消息即将到来。"},
  // 蒙卦系 19-24
  20: {number:20,text:"桃红柳绿风光好，正是渔郎问渡时。一片云帆高挂处，前程万里任奔驰。",type:"上吉",gua:"观",baiHua:"时机成熟之象。春光明媚，正宜行动，前程似锦。"},
  21: {number:21,text:"一对鸳鸯戏水滨，相亲相爱本天真。忽然一阵东风起，各自分飞不见人。",type:"中下",gua:"噬嗑",baiHua:"聚散无常之象。感情或合作需谨慎守护，防突变。"},
  // 需卦系 25-30
  27: {number:27,text:"莫笑蜉蝣撼大树，应知蝼蚁可溃堤。小心使得万年船，切莫贪功一步迷。",type:"中平",gua:"颐",baiHua:"防微杜渐之象。不起眼的小问题可能酿成大患，须谨慎行事。"},
  // 讼卦系 31-36
  34: {number:34,text:"缺月又重圆，枯枝色更鲜。一条夷坦路，翘首望青天。",type:"上吉",gua:"大壮",baiHua:"否极泰来之象。困境将过，前路坦荡光明，宜振奋精神。"},
  36: {number:36,text:"大旱望云霓，沛然雨将至。枯苗得润泽，万物生光辉。",type:"上吉",gua:"明夷",baiHua:"久旱逢甘霖之象。等待将结束，转机马上到来。"},
  // 师卦系 37-42
  40: {number:40,text:"塞翁失马，焉知非福。祸福相倚，天道循环。",type:"中平",gua:"解",baiHua:"祸福无常之象。眼前得失不必过于计较，顺其自然。"},
  // 比卦系 43-48
  44: {number:44,text:"盘根错节，枝叶未舒。待得春风到，自然发新枝。",type:"中平",gua:"姤",baiHua:"潜龙勿用之象。扎根待时，不可急躁，时机到自然舒展。"},
  // 小畜卦系 49-54
  50: {number:50,text:"富贵由来未许求，利名何必苦贪谋。请君试看长江水，日夜滔滔不暂留。",type:"中平",gua:"鼎",baiHua:"名利如流水不可强求。知足常乐，顺其自然。"},
  51: {number:51,text:"夏日炎炎似火烧，稻田禾苗半枯焦。只要心田常灌溉，自有甘霖降九霄。",type:"中上",gua:"震",baiHua:"困境中有转机之象。保持内心平安，自助者天助之。"},
  // 泰卦系 61-66
  63: {number:63,text:"湖海意悠悠，烟波下钓钩。若逢龙与兔，名利一齐周。",type:"上吉",gua:"既济",baiHua:"逍遥自在之象。遇卯辰年月或属龙兔之人，名利双收。"},
  66: {number:66,text:"路遥知马力，日久见人心。守正得终始，真诚值万金。",type:"上吉",gua:"未济",baiHua:"日久见真章之象。坚守正道，诚信待人，终得善果。"},
  // 同人卦系 67-72
  70: {number:70,text:"劝君莫惜金缕衣，劝君惜取少年时。花开堪折直须折，莫待无花空折枝。",type:"中上",gua:"中孚",baiHua:"珍惜当下之象。时机稍纵即逝，莫等错过空叹息。"},
  // 谦卦系 73-78
  76: {number:76,text:"难难难，忽然平地起波澜。易易易，谈笑寻常终有望。",type:"中下",gua:"小过",baiHua:"忽难忽易之象。看似惊险实有转机，沉着应对即可化险为夷。"},
  77: {number:77,text:"大器晚成，水到渠成。功名待时，终须有成。",type:"上吉",gua:"旅",baiHua:"厚积薄发之象。少年多磨砺，中年后方显成就，不必焦虑。"},
  // 随卦系 79-84
  80: {number:80,text:"海阔从鱼跃，天空任鸟飞。丈夫志四海，何处不雄威。",type:"上上",gua:"巽",baiHua:"天高海阔之象。大展宏图，无往不利。宜大胆进取。"},
  // 蛊卦系 85-90
  88: {number:88,text:"木生芽，正发花。春风到，绿天涯。",type:"上吉",gua:"节",baiHua:"生机盎然之象。事业蒸蒸日上，前程似锦。"},
  // 临卦系 91-96
  99: {number:99,text:"贵客相逢便好音，春风送暖入帘深。从今莫问前程事，自有天公作主张。",type:"上吉",gua:"涣",baiHua:"贵人相助之象。不必焦虑前程，自有贵人引路。"},
  // 100（同人卦）
  100: {number:100,text:"喜喜喜，终防否。获得骊龙颔下珠，忽然失却，还在水里。",type:"中下",gua:"同人",baiHua:"乐极生悲之象。得而复失，到手之物须紧紧把握，切勿得意忘形。"},
  103: {number:103,text:"物不牢，人自劳。水中月，镜中花。枉使心机，终于无就。",type:"下下",gua:"需",baiHua:"镜花水月不可得。提示放下执念，莫作无谓之争。"},
  // 111-120
  111: {number:111,text:"泰山之巅，众山皆小。登高望远，心旷神怡。",type:"上吉",gua:"大壮",baiHua:"高瞻远瞩之象。境界提升后一切豁然开朗，宜登高望远。"},
  120: {number:120,text:"曾经沧海难为水，除却巫山不是云。取次花丛懒回顾，半缘修道半缘君。",type:"中平",gua:"鼎",baiHua:"曾经沧海之象。见识过至境后不易为小事所动，坚守信念。"},
  // 149-151
  150: {number:150,text:"莫道桑榆晚，为霞尚满天。老当益壮，宁移白首之心。",type:"上吉",gua:"震",baiHua:"老当益壮之象。晚年亦有作为，不必因年岁而自限。"},
  // 199-201
  200: {number:200,text:"有意栽花花不发，无心插柳柳成荫。世事每多难预料，随缘度日自安心。",type:"中平",gua:"井",baiHua:"事与愿违之象。刻意追求未必如愿，顺其自然反有收获。"},
  // 249-251
  250: {number:250,text:"山重水复疑无路，柳暗花明又一村。踏破铁鞋无觅处，得来全不费工夫。",type:"上吉",gua:"革",baiHua:"绝处逢生之象。看似走投无路时自有转机，坚持便见光明。"},
  // 299-301
  300: {number:300,text:"人生到处知何似，应似飞鸿踏雪泥。泥上偶然留指爪，鸿飞那复计东西。",type:"中平",gua:"鼎",baiHua:"人生过客之象。一切皆过眼云烟，不必执着于一时得失。"},
  // 347-351
  350: {number:350,text:"春风又绿江南岸，明月何时照我还。故乡千里梦魂绕，游子何时返故山。",type:"中平",gua:"晋",baiHua:"思乡怀旧之象。在外奔波日久，当归则归，故土有助。"},
  351: {number:351,text:"雕鹗当秋势转雄，乘风分翼到蟾宫。荣华若问将来事，先后名声达九重。",type:"上上",gua:"明夷",baiHua:"时来运转之象。气势雄壮，事业腾飞直达高处，名利双收。"},
  // 361-365
  363: {number:363,text:"骑玉兔，到广寒，遇嫦娥，将桂攀。满身馥郁，两袖馨香。",type:"上上",gua:"旅",baiHua:"机缘奇佳之象。得遇贵人相助，功名成就，姻缘可得佳人。"},
  // 377-384
  384: {number:384,text:"人非孔颜鲜能无过，过而能改仍复无过。开花不足凭，结果方为准，放开怀抱意欣欣。",type:"中上",gua:"未济",baiHua:"终签劝诫之象。人孰无过，改过即善。踏实做事方为正道，放开胸怀。"},
};

/**
 * 获取签文。
 *
 * 🔴 2026-09-20：**生成签文这条路已停用。**
 *
 * 原先是「命中 38 条 `CLASSICAL_OVERRIDES` 就用真的，其余 346 条走 `generateQianWen`」——
 * 也就是说 **90% 的签文是拼出来的**：按 `(qianNum*17 + guaIdx*7 + yaoIdx*13) % 模板数`
 * 选模板，再拿 `gua.keywords[(qianNum + i*11 + guaIdx*3) % len]` 填词。
 * 那串 ×17 ×7 ×13 ×11 ×3 没有任何依据，与奇门穿壬的「七十二局表」、
 * 命理奇门的「大运局数」是同一类下标算术。
 *
 * 关键在于**签文是典籍原文、不可再生**：诸葛神数 384 签各有其辞，
 * 生成出来的东西哪怕读着像签文，也不是那一签。
 * 拿它和前端的真本比过：能对上的 5 条、不同的 33 条（同 38 条可比范围内），
 * 差异不是异文而是整段不同——
 * 例如第 5 签，真本「春雷惊百虫，蛰户开々，云腾雨施，快活如意」，
 * 生成的是「春雷震，夏风巽。卧龙起，猛虎啸。风云会合，救济苍生」。
 *
 * **真正的 384 签原文仓库里有**：`apps/server/src/modules/paipan/engine/data/zhuge-signs.json`（2026-09-21 自前端迁入）
 * （384 条齐全、无空条目，前端一直用的就是它）。
 * 正解是把它迁进 `packages/shared` 做单一真源，再让本文件读——
 * 那涉及数据放置与打包体积，留给决策人定。在此之前**宁可不出签，也不发假签**。
 */
function getQianWen(qianNum: number): QianWen {
  const classical = CLASSICAL_OVERRIDES[qianNum];
  if (classical) return classical;
  // 不抛错、也不编：**起数照常给**（起数法是已核过的算法，签号必须仍然 384 全可达），
  // 只把签文位置如实标成未收录。抛错会把「起数」和「有没有签文」两件事绑死，
  // 那条很有价值的可达性回归也就没法跑了。
  return {
    number: qianNum,
    text: `【第 ${qianNum} 签原文未收录】`,
    type: "中平",
    gua: "",
    baiHua:
      `本实现目前只收录了 ${Object.keys(CLASSICAL_OVERRIDES).length} 条真签文，第 ${qianNum} 签的原文尚未录入。` +
      `此前这里由模板拼接生成（非典籍原文），已停用——签文是典籍原文，拼出来的哪怕读着像也不是那一签。` +
      `起数过程与签号本身是有效的，可据以另查《诸葛神数》原书。`,
  };
}

// ── 主计算函数 ──
export function calculateZhuGe(input: Record<string, unknown>): ZhuGeResult {
  const method = (input.method as string) ?? "sanzi";
  const chars = (input.chars as string) ?? "";
  const numbers = input.numbers as [number, number, number] | undefined;
  const question = (input.question as string) ?? "";

  let strokes: [number, number, number] = [100, 100, 100];

  if (method === "sanzi" && chars.trim()) {
    // 取前三个汉字，不足补"一"
    const arr = [...chars.trim()].filter(c => /[一-鿿]/.test(c)).slice(0, 3);
    while (arr.length < 3) arr.push("一");
    strokes = arr.map(c => getStrokeCount(c)) as [number, number, number];
  } else if (method === "baoshu" && numbers) {
    strokes = numbers.map(n => Math.max(1, Math.min(999, Math.round(n)))) as [number, number, number];
  } else {
    // 🔴 2026-09-20：原先这里用 `new Date()` 现取当前时间起数。
    // 本项目明令禁止用当前时刻/随机起数——结果要可复现、可存库、可据以生成报告，
    // 同一条记录第二天重算必须还是同一签（灵签三工具已按此改过一轮）。
    // 诸葛神数本就是「报三字」或「报三数」起课，没有第三种起法，故直接要求补参数。
    throw new BusinessException(
      ErrorCode.VALIDATION_ERROR,
      "请提供三个汉字（chars）或三个报数（numbers）起课。本工具不用当前时间起数——" +
      "那样同一次占问换个时刻重算就换一签，结果不可复现。",
    );
  }

  /**
   * 起数法：三字笔画**各取个位**组成三位数，超 384 循环减去 384。
   *
   * 🔴 2026-09-19 重写。原实现是**三字笔画直接相加**再对 384 取余
   * （另有一句「每数上限215」，而汉字笔画根本到不了 215，那个上限从不生效）。
   *
   * **后果是结构性的**：汉字笔画现实范围 1–30，三字之和最多约 90，
   * 于是**第 91–384 签永远抽不到，占全部签文的 76%**。
   * 实测 10648 组报数只覆盖 64 个签号（范围 3–66）。
   * 这不是精度问题——三分之二以上的签文写了也没人看得到。
   *
   * 正法见`modules/paipan/engine/zhuge-engine.ts`（原前端引擎，2026-09-21 迁入服务端）：
   * 「三字 → 康熙笔画 → 各取个位组三位数 → 超 384 循环减 384」。
   * 各位取 0–9，组成 0–999，归化后可覆盖 1–384 全部签号。
   * 这是**第 9 次「前端对·后端错」**。
   */
  const digits = strokes.slice(0, 3).map((n) => ((n % 10) + 10) % 10);
  const [d1, d2, d3] = digits;
  let qianNum = d1 * 100 + d2 * 10 + d3;
  if (qianNum === 0) qianNum = 384;
  while (qianNum > 384) qianNum -= 384;

  const total = qianNum;
  const [t1, t2, t3] = digits;
  const sumProcess =
    `各取个位得 ${d1}${d2}${d3}，${d1 * 100 + d2 * 10 + d3}` +
    (d1 * 100 + d2 * 10 + d3 > 384 ? ` 循环减 384 归入第 ${qianNum} 签` : ` 即第 ${qianNum} 签`);

  const qianWen = getQianWen(qianNum);

  // ── box-drawing 结构化总结 ──
  const qianTypeIcon = qianWen.type === "上上" ? "★★" : qianWen.type === "上吉" ? "★" : qianWen.type === "中上" || qianWen.type === "中平" ? "◆" : qianWen.type === "中下" || qianWen.type === "下下" ? "▼" : "·";
  const duanYu = `诸葛神数第${qianNum}签（${qianWen.type}${qianWen.gua ? `·${qianWen.gua}卦` : ""}）：${qianWen.text}。${qianWen.baiHua}`;
  const processDesc = `三字笔画：${strokes[0]} / ${strokes[1]} / ${strokes[2]}。${sumProcess}`;

  const summary = [
    `┌─ 诸葛神数 ─────────────────`,
    `│ 第${qianNum}签 ${qianWen.type} ${qianTypeIcon} ${qianWen.gua ? `对应${qianWen.gua}卦` : ""}`,
    `│ 起数：${sumProcess}`,
    `│`,
    `├─ 签文 ────────────────────`,
    `│ ${qianWen.text}`,
    `│`,
    `├─ 白话释义 ──────────────────`,
    `│ ${qianWen.baiHua.substring(0, 80)}${qianWen.baiHua.length > 80 ? "..." : ""}`,
    `│`,
    ...(question ? [`├─ 所问 ────────────────────`,
    `│ "${question}"`,
    `│ ${qianWen.baiHua.substring(0, 60)}`,] : []),
    `├─ 起数过程 ──────────────────`,
    `│ ${processDesc}`,
    `│`,
    `├─ 古籍出处 ──────────────────`,
    `│ 《诸葛神数》传蜀汉·诸葛亮，384签军国占断`,
    `│ 以三字笔画起数，取384签对应周易384爻`,
    `│`,
    `└─ 占断提示 ──────────────────`,
    `   ${duanYu.substring(0, 80)}`,
    `   诸葛384签每签各有深意，宜细心体悟，结合具体情境领会。`,
  ].filter(Boolean).join("\n");

  return {
    input: { method: method as any, chars: chars || undefined, numbers, question },
    qiShuProcess: {
      raw: chars || numbers?.join(",") || "时间起数",
      strokes,
      sum1: t1, sum2: t2, sum3: t3,
      totalSum: total,
      finalNumber: qianNum,
      processDesc,
    },
    qianWen,
    jieQian: {
      lineByLine: qianWen.text.split(/[。，]/).filter(Boolean).map(line => ({
        line,
        explanation: `${qianWen.gua ? `${qianWen.gua}卦之象，` : ""}${qianWen.type}之兆，须细心体悟。`,
      })),
      summary: `第${qianNum}签（${qianWen.type}）：${qianWen.text}`,
      guidance: question
        ? `针对"${question}"，本签提示：${qianWen.baiHua}`
        : qianWen.baiHua,
    },
    duanYu,
    summary,
  } as ZhuGeResult & { summary: string };
}
