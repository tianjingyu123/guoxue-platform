// ── 八宅风水计算引擎 ──
// 算法参考：《阳宅十书》《八宅明镜》《阳宅三要》
// 命卦计算/八宅游年星/宅命匹配/八方吉凶

import type { BaZhaiResult, MingGua, ZhaiGua, BaFangJiXiong } from "@guoxue/shared";
// 命卦按命理年取，命理年以立春分界——用八字引擎已核验的那份节气判定，不另写
import { getNianZhuYear } from "@guoxue/bazi-engine";

const BA_GUA: { name: string; num: number; group: string; direction: string; degreeRange: string }[] = [
  { name:"坎", num:1, group:"东四宅", direction:"正北", degreeRange:"337.5°-22.5°" },
  { name:"坤", num:2, group:"西四宅", direction:"西南", degreeRange:"202.5°-247.5°" },
  { name:"震", num:3, group:"东四宅", direction:"正东", degreeRange:"67.5°-112.5°" },
  { name:"巽", num:4, group:"东四宅", direction:"东南", degreeRange:"112.5°-157.5°" },
  { name:"乾", num:6, group:"西四宅", direction:"西北", degreeRange:"292.5°-337.5°" },
  { name:"兑", num:7, group:"西四宅", direction:"正西", degreeRange:"247.5°-292.5°" },
  { name:"艮", num:8, group:"西四宅", direction:"东北", degreeRange:"22.5°-67.5°" },
  { name:"离", num:9, group:"东四宅", direction:"正南", degreeRange:"157.5°-202.5°" },
];

/**
 * 八方游星：由翻卦变爻法推导，不再硬编码。
 *
 * 🔴 2026-09-19 重写。原先是一张手抄的 `DA_YOU_NIAN` 表，**八行里错了七行**，
 * 八方吉凶几乎全部错位——这比命卦算错更严重：命卦只决定东四/西四，
 * 这张表决定「哪个方位能开门、哪个方位要压」，错了整份宅书就是反的。
 * 最明显的痕迹是艮行与兑行一字不差，两个宅卦不可能有相同的八方排列，
 * 是抄表漏行留下的。
 *
 * 现在改用翻卦法现算。规则：以本卦为伏位，依次变爻得七星——
 *   生气=变上爻　五鬼=变中爻　延年=变下爻　六煞=变中爻
 *   祸害=变上爻　天医=变中爻　绝命=变下爻
 * 即「上·中·下·中·上·中·下」。
 *
 * 这套推导与公开的大游年歌诀（乾六天五祸绝延生 / 坎五天生延绝祸六 /
 * 艮六绝祸生延天五 / 震延生祸绝五天六 / 巽天五六祸生绝延 /
 * 离六五绝延祸生天 / 坤天延绝生祸五六 / 兑生祸延绝六五天）
 * **八卦八句逐位吻合**，两个独立来源互证。歌诀已写进 spec 作为基准锁死。
 */

/** 八卦爻象，按（下爻, 中爻, 上爻）记，true=阳 */
const GUA_YAO: Record<string, [boolean, boolean, boolean]> = {
  乾: [true, true, true],
  兑: [true, true, false],
  离: [true, false, true],
  震: [true, false, false],
  巽: [false, true, true],
  坎: [false, true, false],
  艮: [false, false, true],
  坤: [false, false, false],
};

/** 变爻位置：0=下爻 1=中爻 2=上爻。顺序对应下面的 YOU_XING */
const BIAN_YAO = [2, 1, 0, 1, 2, 1, 0];
/** 变爻依次得到的七星（伏位是本卦，不在此列） */
const YOU_XING = ["生气", "五鬼", "延年", "六煞", "祸害", "天医", "绝命"];

const yaoKey = (y: [boolean, boolean, boolean]) => y.map((b) => (b ? "1" : "0")).join("");
const GUA_BY_YAO: Record<string, string> = Object.fromEntries(
  Object.entries(GUA_YAO).map(([name, y]) => [yaoKey(y), name]),
);

/** 某宅卦（或命卦）的「方位 → 游星」映射 */
export function youXingMap(gua: string): Record<string, string> {
  const base = GUA_YAO[gua];
  if (!base) return {};
  const out: Record<string, string> = { [gua]: "伏位" };
  const cur: [boolean, boolean, boolean] = [...base];
  BIAN_YAO.forEach((pos, i) => {
    cur[pos] = !cur[pos];
    out[GUA_BY_YAO[yaoKey(cur)]] = YOU_XING[i];
  });
  return out;
}

interface StarDetail {
  wuXing: string; jiXiong: string; yiYong: string[]; jiHui: string[]; desc: string;
  layoutTips: { colors: string[]; materials: string[]; shapes: string[]; items: string[] };
  huaJie?: string[];
  cuiWang?: string[];
}

const STAR_INFO: Record<string, StarDetail> = {
  "生气": {
    wuXing:"木", jiXiong:"大吉",
    yiYong:["大门","主卧","书房"], jiHui:["厕所","厨房"],
    desc:"主富贵双全，孝义传家，人丁兴旺，生育旺宅。",
    layoutTips: { colors:["绿色","青色","浅蓝"], materials:["木质","棉麻","竹制"], shapes:["长条形","长方形","直条纹"], items:["富贵竹","绿萝","文昌塔","木质书架","水养植物"] },
    cuiWang:["放置高大绿色植物（如发财树、幸福树），以木气催旺生机","水养植物可水生木，倍增生气之力","宜用木质家具、绿色窗帘增强木气","可悬挂'紫气东来'或'旭日东升'字画"],
  },
  "天医": {
    wuXing:"土", jiXiong:"中吉",
    yiYong:["主卧","客厅","厨房"], jiHui:["厕所"],
    desc:"主健康长寿，少病少灾，财运平稳，家庭和睦。",
    layoutTips: { colors:["黄色","棕色","米色"], materials:["陶瓷","石材","砖瓦"], shapes:["方形","正方形","扁平方正"], items:["陶瓷花瓶","黄水晶","泰山石敢当","方形地毯","陶罐"] },
    cuiWang:["摆放陶瓷花瓶或黄水晶球，以土气稳固健康运","宜用方形家具、米色墙面增强土气","可放置天然水晶簇或玛瑙摆件","保持整洁明亮，忌阴暗潮湿"],
  },
  "延年": {
    wuXing:"金", jiXiong:"中吉",
    yiYong:["主卧","客厅","书房"], jiHui:["厕所","杂物间"],
    desc:"主延年益寿，夫妻和睦，事业有成，人际关系佳。",
    layoutTips: { colors:["白色","金色","银色"], materials:["金属","铜器","不锈钢"], shapes:["圆形","椭圆形","弧形"], items:["铜钱","金属钟表","圆形镜","金属风铃","白水晶球"] },
    cuiWang:["放置金属摆件或铜器，以金气增强贵人运","宜用白色墙面、圆形灯具增强金气","可悬挂铜铃或金属风铃于窗前","放置结婚照或全家福增进夫妻和谐"],
  },
  "伏位": {
    wuXing:"木", jiXiong:"小吉",
    yiYong:["主卧","书房"], jiHui:[],
    desc:"主平稳安宁，无大起大落，保守稳重，适合静养。",
    layoutTips: { colors:["绿色","浅绿","淡蓝"], materials:["木质","布艺","棉麻"], shapes:["长条形","平稳方正"], items:["平安符","木雕摆件","书籍","盆栽","字画"] },
    cuiWang:["保持空间整洁安静，不宜过多装饰","可放置木质书架或书桌营造安定氛围","宜挂'静'字或山水画平和心气","适合老人房或静修室使用"],
  },
  "绝命": {
    wuXing:"金", jiXiong:"大凶",
    yiYong:["厕所","杂物间"], jiHui:["大门","主卧","厨房"],
    desc:"主绝嗣伤丁，官非口舌，意外血光，财散人亡。",
    layoutTips: { colors:["避免白色/金色/银色"], materials:["避免金属/铜器"], shapes:["避免圆形/椭圆形"], items:["安忍水","黑曜石","鱼缸","葫芦","水晶球"] },
    huaJie:["放置鱼缸或水景（以水泄金气，金生水则凶气减弱）","使用黑色/深蓝色装饰（水色泄金）","悬挂天然葫芦或铜葫芦吸纳病气","放置安忍水（盐+水+铜钱）化解金煞","避免在此方摆放金属物品、钟表、刀剑"],
  },
  "五鬼": {
    wuXing:"火", jiXiong:"大凶",
    yiYong:["厕所","阳台"], jiHui:["大门","主卧","厨房"],
    desc:"主火灾盗贼，口舌是非，精神疾病，意外破财。",
    layoutTips: { colors:["避免红色/紫色/橙色"], materials:["避免电器/红色装饰"], shapes:["避免三角形/尖角"], items:["鱼缸","黑曜石","泰山石","八卦镜","安忍水","铜葫芦"] },
    huaJie:["放置鱼缸或水景（以水克火，压制五鬼火气）","使用黑色、深蓝色装饰（水色制火）","摆放泰山石敢当镇压煞气","悬挂开光八卦镜反射凶气","避免在此方设置厨房灶台或堆放电器","宜做卫生间或储物间以镇压"],
  },
  "六煞": {
    wuXing:"水", jiXiong:"中凶",
    yiYong:["厕所","储物间"], jiHui:["大门","主卧"],
    desc:"主桃花败财，感情纠葛，淫乱口舌，家庭不睦。",
    layoutTips: { colors:["避免黑色/深蓝"], materials:["避免水景/镜子/玻璃"], shapes:["避免波浪形/曲线"], items:["红色装饰","木质家具","绿色植物","五帝钱","朱砂"] },
    huaJie:["放置红色装饰（以火泄水气，水能生木→木生火而耗水）","绿色植物吸纳水气（水生木而泄水）","悬挂五帝钱或朱砂饰品镇宅","避免摆放鱼缸、水景、大面镜子","宜设杂物间或衣帽间，减少人长时间停留"],
  },
  "祸害": {
    wuXing:"土", jiXiong:"小凶",
    yiYong:["厕所","阳台"], jiHui:["大门","主卧","厨房"],
    desc:"主疾病残疾，口舌官非，子孙忤逆，破败耗财。",
    layoutTips: { colors:["避免黄色/棕色"], materials:["避免陶瓷/石材"], shapes:["避免方形"], items:["金属摆件","铜铃","白色装饰","圆形物品","水晶"] },
    huaJie:["放置金属摆件（以金泄土气，土生金则凶气泄出）","使用白色、金色装饰（金色泄土）","悬挂铜铃或金属风铃化解土煞","保持通风干燥，避免堆放重物","避免放置大型陶瓷花盆或石雕"],
  },
};

// 八方顺序（从坐山伏位开始顺时针）
const DIR_ORDER = ["坎","艮","震","巽","离","坤","兑","乾"];

/** 计算命卦 */
/**
 * 命卦。
 *
 * 🔴 2026-09-19 补立春边界（来源见接续文档 §2.81）。
 *
 * 命卦按**命理年**取，而命理年以**立春**分界，不是元旦。
 * 原先只收 `birthYear`，1990-01-20 出生（立春 02-04 之前）会按 1990 算：
 *   (100−90)%9 = 1 → **坎（东四命）**
 * 而命理年实为 1989：
 *   (100−89)%9 = 2 → **坤（西四命）**
 *
 * **东四/西四一旦判反，整份宅书的吉凶方位全部颠倒**——四吉方变四凶方。
 * 按立春在 2/3–2/5 之间算，**约每年 1/10 的出生日期会中招**。
 *
 * 现在接受可选的 `month`/`day`：
 * - 传了 → 按立春回退命理年，结果正确；
 * - 没传 → 退回原行为（按公历年），并在 `calcProcess` 里注明这一点，
 *   免得调用方以为已经处理过立春。这是为了不破坏既有调用方，
 *   但**新接入方应当传月日**。
 *
 * ⚠️ 2026-09-19 补一条实证（desktop-44 实机比对旧版 App）：
 * **旧版八宅同样只收年份、不收月日**，所以可选月日是**增强**，不是「向旧版看齐」。
 * 旧版的做法是用**文案**消歧——年份选择器标题明写「选择年份（农历年）」，
 * 把立春换算的责任在输入端交给用户。
 * 我们的入口文案只写「出生年」，用户自然填公历年，
 * 立春前出生者命卦错一位且毫无提示。
 *
 * 也就是说，最小对齐修法其实在**前端 label**（改为「出生年（农历年）」），
 * 不在后端加字段。两者可并存：文案先把歧义消掉，传了月日则由本函数精确回退。
 * 这条别写成「旧版如此」——旧版不是这么做的。
 */
export function calcMingGua(birthYear: number, gender: string, month?: number, day?: number): MingGua {
  // 命理年以立春分界。给了月日就回退，没给则沿用公历年（并在 calcProcess 里注明）
  const hasMonthDay = Number.isFinite(month) && Number.isFinite(day);
  const mingYear = hasMonthDay ? getNianZhuYear(birthYear, month as number, day as number, 12, 0) : birthYear;
  const lastTwo = mingYear % 100;
  // 性别兼容中英写法：原先只认「男」，调用方传 "male" 会静默走女命公式，命卦全错
  const isMale = gender === "男" || String(gender).toLowerCase() === "male" || String(gender).toLowerCase() === "m";
  const isAfter2000 = mingYear >= 2000;

  /**
   * 🔴 2026-09-18 修：原算法取「后两位的数字和」再 11 减之
   * （1990 → 9+0=9 → 11-9=2 → 坤命·西四），与通行算法不符。
   * 拿第三方 H5（市场检验版）排 1990 年男命，得**坎（东四命）**；
   * 东四/西四判反会让整份八宅报告的吉凶方位全部颠倒。
   *
   * 通行算法（上元甲子起例）：
   *   1900-1999：男 (100 - 后两位) % 9、女 (后两位 - 4) % 9
   *   2000 以后：男 (99 - 后两位) % 9、女 (后两位 + 6) % 9
   *   余 0 取 9；得 5 时男寄坤 2、女寄艮 8。
   * 验证：1990 男 → (100-90)%9 = 1 → 坎 ✅（与基准一致）
   *
   * ⚠️ 只用男命基准验过；女命公式按同一套标准推出，**尚未单独用基准核对**。
   */
  let num = isAfter2000
    ? (isMale ? (99 - lastTwo) % 9 : (lastTwo + 6) % 9)
    : (isMale ? (100 - lastTwo) % 9 : (lastTwo - 4) % 9);
  if (num <= 0) num += 9;
  if (num === 5) num = isMale ? 2 : 8; // 五中寄：男寄坤2、女寄艮8
  const bg = BA_GUA.find((g) => g.num === num)!;
  const groupText = num === 1 || num === 3 || num === 4 || num === 9 ? "东四命" : "西四命";
  return {
    guaName: bg.name as any, guaNum: num,
    group: groupText as any,
    calcProcess: `${birthYear}年${isMale ? "男" : "女"}命${
      hasMonthDay
        ? mingYear !== birthYear
          ? `（${month}月${day}日在立春前，命理年按 ${mingYear} 算）`
          : ""
        : "（未提供月日，按公历年计；若生于立春前，命卦应按上一年，东四/西四会相反）"
    } → 后两位${lastTwo} → ${
      isAfter2000
        ? (isMale ? `2000后男:(99-${lastTwo})%9` : `2000后女:(${lastTwo}+6)%9`)
        : (isMale ? `1900-1999男:(100-${lastTwo})%9` : `1900-1999女:(${lastTwo}-4)%9`)
    } → 命卦${bg.name}`,
  };
}

/** 坐山转宅卦 */
function calcZhaiGua(zuoShan: string): ZhaiGua {
  const bg = BA_GUA.find((g) => g.name === zuoShan)!;
  // 🔴 2026-09-19 修：原先拿 DIR_ORDER 的索引去查 BA_GUA 数组，两个数组卦序不同
  // （DIR_ORDER 是后天八卦圆周序，BA_GUA 是按洛书数排的），坐坎本该朝离（正南），
  // 却算出乾（西北）。对宫要在 DIR_ORDER 上取，再回 BA_GUA 查方位。
  const idx = DIR_ORDER.indexOf(zuoShan);
  const chaoGua = idx >= 0 ? DIR_ORDER[(idx + 4) % 8] : "离";
  return {
    guaName: bg.name as any,
    group: bg.group as any,
    zuoShan: bg.direction,
    chaoXiang: BA_GUA.find((g) => g.name === chaoGua)?.direction ?? "正南",
  };
}

/**
 * 大游年八方吉凶。
 *
 * `baseGua` 传坐山得**宅盘**（房子各方位的性质），传命卦得**命盘**（这个人的吉凶方位）。
 * 正规八宅两套并用，前端早就都排，后端 2026-09-19 补齐。
 */
function calcBaFang(baseGua: string, mingGua: MingGua): BaFangJiXiong[] {
  const starOf = youXingMap(baseGua);
  if (!Object.keys(starOf).length) return [];
  const startIdx = DIR_ORDER.indexOf(baseGua);
  return DIR_ORDER.map((_d, i) => {
    const dirIdx = (startIdx + i) % 8;
    const dir = DIR_ORDER[dirIdx];
    const star = starOf[dir];
    const info = STAR_INFO[star];
    const bgEl = BA_GUA.find((b) => b.name === dir)!;
    // 同上：东四命要与东四宅比，不能拿「东四命」去等于「东四宅」
    const isMatch = String(mingGua.group ?? "").slice(0, 2) === String(bgEl.group ?? "").slice(0, 2);
    const jiXiongBase = info.jiXiong;
    // 宅命相配加减
    let jiXiong = jiXiongBase;
    if (isMatch && (star === "生气" || star === "天医" || star === "延年")) jiXiong = "大吉";
    return {
      direction: dir as any, degreeRange: bgEl.degreeRange,
      star: star as any, wuXing: info.wuXing,
      jiXiong: jiXiong as any,
      yiYong: info.yiYong, jiHui: info.jiHui, desc: info.desc,
      layoutTips: info.layoutTips,
      ...(info.huaJie ? { huaJie: info.huaJie } : {}),
      ...(info.cuiWang ? { cuiWang: info.cuiWang } : {}),
    };
  });
}

/** 宅命匹配 */
function calcZhaiMingMatch(zhaiGua: ZhaiGua, mingGua: MingGua) {
  // 🔴 2026-09-18 修：命卦 group 是「东四命/西四命」、宅卦 group 是「东四宅/西四宅」，
  // 原先直接比两个字符串——永远不相等，**宅命匹配恒判「不配」**，
  // 连它自己输出的「东四命（命）不配东四宅（宅）」都自相矛盾。
  // 东四/西四才是要比的那一层，取前两字比较。
  const groupKey = (g: string) => String(g ?? "").slice(0, 2);
  const isMatch = groupKey(zhaiGua.group as string) === groupKey(mingGua.group as string);
  return {
    isMatch,
    score: isMatch ? 8 : 3,
    desc: isMatch
      ? `宅命相配：${mingGua.group}（命）配${zhaiGua.group}（宅），吉宅。`
      : `宅命不配：${mingGua.group}（命）不配${zhaiGua.group}（宅），需通过内部布局化解。`,
    suggestion: isMatch
      ? "宅命相配，可在最佳方位（生气/天医/延年）设置大门、主卧、厨房，以增强吉运。"
      : `宅命不配，建议将主卧设在命卦吉方（${mingGua.guaName}之生气方），厨房设在凶方压制，或通过门向调整改善。`,
  };
}

/** 主计算函数 */
export function calculateBaZhai(input: Record<string, unknown>): BaZhaiResult {
  const birthYear = (input.birthYear as number) ?? 1980;
  const gender = (input.gender as string) ?? "男";
  const zuoShan = (input.zuoShan as string) ?? "坎";
  // 月日可选：给了才能按立春回退命理年（不给则按公历年，生于立春前会判反东四/西四）
  const birthMonth = input.birthMonth as number | undefined;
  const birthDay = input.birthDay as number | undefined;

  const mingGua = calcMingGua(birthYear, gender, birthMonth, birthDay);
  const zhaiGua = calcZhaiGua(zuoShan);
  const baFang = calcBaFang(zuoShan, mingGua);          // 宅盘：坐山起游星
  const mingBaFang = calcBaFang(mingGua.guaName, mingGua); // 命盘：命卦起游星
  const zhaiMingMatch = calcZhaiMingMatch(zhaiGua, mingGua);

  // 命卦四吉方，按星力排序——用户最用得上的就是这个（「我该朝哪边坐」）
  const JI_RANK: Record<string, number> = { 生气: 1, 天医: 2, 延年: 3, 伏位: 4 };
  const mingJiFang = mingBaFang
    .filter((f) => JI_RANK[f.star] !== undefined)
    .sort((a, b) => JI_RANK[a.star] - JI_RANK[b.star])
    .map((f) => ({ direction: f.direction, star: f.star }));

  // 功能区位分析
  //
  // 🔴 2026-09-19 修：原先按 baFang 的数组顺序取「第一个吉方」，而 baFang 是从坐山起的
  // 圆周序——挑出来的其实是「圆周上排在前面的那个」，与吉凶强弱无关。
  // 八宅择门主灶看的是星力：吉方 生气 > 天医 > 延年 > 伏位，凶方 绝命 > 五鬼 > 六煞 > 祸害。
  const GOOD_RANK: Record<string, number> = { 生气: 1, 天医: 2, 延年: 3, 伏位: 4 };
  const BAD_RANK: Record<string, number> = { 绝命: 1, 五鬼: 2, 六煞: 3, 祸害: 4 };
  const pick = (rank: Record<string, number>, except: string[]) =>
    baFang
      .filter((f) => rank[f.star] !== undefined && !except.includes(f.direction))
      .sort((a, b) => rank[a.star] - rank[b.star])[0] ?? baFang[0];
  const findBest = (except: string[] = []) => pick(GOOD_RANK, except);
  const findWorst = (except: string[] = []) => pick(BAD_RANK, except);

  const menWeiFang = findBest();
  const zhuWoFang = findBest([menWeiFang.direction]);
  const chuFangFang = findWorst([menWeiFang.direction, zhuWoFang.direction]);

  const geJue = `坐${zuoShan}向${zhaiGua.chaoXiang}，${zhaiGua.group}，${mingGua.guaName}命（${mingGua.group}）${zhaiMingMatch.isMatch ? "相配" : "不配"}`;

  const menStar = STAR_INFO[menWeiFang.star];
  const zhuStar = STAR_INFO[zhuWoFang.star];
  const chuStar = STAR_INFO[chuFangFang.star];

  const menLayout = `宜${menStar.layoutTips.colors.slice(0,2).join("、")}色系，${menStar.layoutTips.materials.slice(0,2).join("、")}材质，摆放${menStar.layoutTips.items.slice(0,2).join("、")}。`;
  const zhuLayout = `宜${zhuStar.layoutTips.colors.slice(0,2).join("、")}色系，${zhuStar.layoutTips.materials.slice(0,2).join("、")}材质，摆放${zhuStar.layoutTips.items.slice(0,2).join("、")}。`;
  const chuLayout = chuStar.huaJie ? `凶方宜化解：${chuStar.huaJie.slice(0,2).join("；")}。` : "";

  const duanYu = `${geJue}。大门宜开${menWeiFang.direction}方（${menWeiFang.star}），${menLayout}主卧设${zhuWoFang.direction}方（${zhuWoFang.star}），${zhuLayout}厨房压${chuFangFang.direction}方（${chuFangFang.star}）。${chuLayout}${zhaiMingMatch.suggestion}` +
    `另按${mingGua.guaName}命起命盘，个人吉方依次为${mingJiFang.map((f) => `${f.direction}方（${f.star}）`).join("、")}，` +
    `坐卧、办公朝向宜取其一；宅盘管房子、命盘管人，两盘相合处最宜久留。`;

  const summary = [
    "┌─ 八宅风水 · 阳宅三要 ─────────────┐",
    `│ ${geJue}`.padEnd(36) + "│",
    `│ ${zhaiMingMatch.suggestion.slice(0, 30)}`.padEnd(36) + "│",
    "├─ 八宅九星 ─────────────────────────┤",
    ...baFang.map(f => `│ ${f.direction}方：${f.star}（${f.jiXiong}）`.padEnd(36) + "│"),
    "├─ 命卦吉方（个人坐卧朝向） ─────────┤",
    `│ ${mingGua.guaName}命：${mingJiFang.map((f) => `${f.direction}(${f.star})`).join(" ")}`.padEnd(36) + "│",
    "├─ 三要布局 ─────────────────────────┤",
    `│ 大门：${menWeiFang.direction}方（${menWeiFang.star}）`.padEnd(36) + "│",
    `│ 主卧：${zhuWoFang.direction}方（${zhuWoFang.star}）`.padEnd(36) + "│",
    `│ 厨房：${chuFangFang.direction}方（${chuFangFang.star}）`.padEnd(36) + "│",
    "├─ 出处 ─────────────────────────────┤",
    "│ 《八宅明镜》《阳宅三要》《阳宅十书》│",
    "└────────────────────────────────────┘",
  ].join("\n");

  return {
    input: { birthYear, gender: gender as any, zuoShan: zuoShan as any },
    mingGua, zhaiGua, zhaiMingMatch, baFang, mingBaFang, mingJiFang,
    menWei: { direction: menWeiFang.direction, star: menWeiFang.star, jiXiong: menWeiFang.jiXiong, suggestion: `大门最佳方位${menWeiFang.direction}方，纳${menWeiFang.star}吉气。${menLayout}` },
    zhuWo: { direction: zhuWoFang.direction, star: zhuWoFang.star, jiXiong: zhuWoFang.jiXiong, suggestion: `主卧最佳方位${zhuWoFang.direction}方，得${zhuWoFang.star}旺气。${zhuLayout}` },
    chuFang: { direction: chuFangFang.direction, star: chuFangFang.star, jiXiong: chuFangFang.jiXiong, suggestion: `厨房宜压${chuFangFang.direction}方${chuFangFang.star}凶方，以厨火压制凶气。${chuLayout}` },
    geJue, duanYu, summary,
  } as BaZhaiResult & { summary: string };
}
