/**
 * 五格剖象（2026-09-19 新建，三份实现合一）
 *
 * ══ 为什么要抽出来 ══
 *
 * 同一套五格，后端原有**三份各自独立的实现**，而且**三份各错各的**：
 *
 * | 文件 | 天格 | 人格 | 地格 | 外格 |
 * |---|---|---|---|---|
 * | `xingming-jiexi` | 复姓也 +1 | **≡ 总格** | 双名时错 | **≡ 1** |
 * | `wuge` | 复姓也 +1 | **≡ 总格** | 对 | **≡ 1** |
 * | `sancai-wuge` | 复姓也 +1 | 取姓**首**字 | 单名时漏 +1 | 复姓时取错字 |
 *
 * 前两份的 `人格 = 姓总 + 名总`、`外格 = 总格 − 人格 + 1` 代入即得
 * **`人格 ≡ 总格`、`外格 ≡ 1` 恒成立**——而人格（姓末字＋名首字）与总格（全名之和）
 * 按定义就是两个不同的量，只在单姓单名时偶然相等。这是不需要外部基准的硬矛盾。
 * 后果是**只有单姓单名算对，其余全错**，而单姓双名是绝大多数中国人的姓名。
 *
 * 第三份还带「外格：天格+地格-人格（简化）」这样的注释，而代码写的是
 * `surname2 + given2 + 1`，**注释与代码根本不是一回事**——「简化」这个气味第六次命中。
 *
 * 三份都能自洽地跑出一副五格，不逐个代入根本看不出来。故合为一处。
 *
 * ══ 通行算法 ══
 *
 * | 情形 | 天格 | 人格 | 地格 | 外格 |
 * |---|---|---|---|---|
 * | 单姓单名 | 姓+1 | 姓+名 | 名+1 | 1 |
 * | 单姓多名 | 姓+1 | 姓+名首 | 名总 | 总格−人格+1 |
 * | 复姓单名 | 姓总 | 姓末+名 | 名+1 | 总格−人格+1 |
 * | 复姓多名 | 姓总 | 姓末+名首 | 名总 | 总格−人格+1 |
 *
 * 两处最容易错的：
 * · **天格的 +1 只在单姓时加**。那个 1 是「假添一数」，复姓已有两字不需假添。
 * · **人格取姓的末字**，不是首字。单姓时二者相同，复姓时才分得出来。
 *
 * `外格 = 总格 − 人格 + 1` 对四种情形皆成立（单姓单名代入恰得 1），故统一用它。
 */

export interface WuGeNumbers {
  tianGe: number;
  renGe: number;
  diGe: number;
  waiGe: number;
  zongGe: number;
}

export interface WuGeInput {
  /** 姓的逐字笔画（康熙笔画）。复姓则传两个及以上 */
  surnameStrokes: number[];
  /** 名的逐字笔画（康熙笔画） */
  givenStrokes: number[];
}

/**
 * 由逐字笔画求五格。
 *
 * 只吃笔画数组、不碰汉字——笔画查表（康熙/简体之别）由调用方负责，
 * 这样本函数的正确性可以脱离笔画表单独验证。
 *
 * @throws 姓或名为空时抛错。原实现遇到空名会静默算出一副看似正常的五格。
 */
export function calcWuGe({ surnameStrokes, givenStrokes }: WuGeInput): WuGeNumbers {
  if (!surnameStrokes.length) throw new Error("五格：姓不可为空");
  if (!givenStrokes.length) throw new Error("五格：名不可为空");

  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const surTotal = sum(surnameStrokes);
  const givTotal = sum(givenStrokes);

  // 天格：单姓假添一数，复姓不假添
  const tianGe = surnameStrokes.length === 1 ? surTotal + 1 : surTotal;
  // 人格：姓的**末**字 + 名的首字
  const renGe = surnameStrokes[surnameStrokes.length - 1] + givenStrokes[0];
  // 地格：单名假添一数，多名取名总
  const diGe = givenStrokes.length === 1 ? givTotal + 1 : givTotal;
  const zongGe = surTotal + givTotal;

  /**
   * 外格：姓的**首**字（单姓取假添的 1）+ 名的**末**字（单名取假添的 1）。
   *
   * 🔴 2026-09-20 改。原式是 `外格 = 总格 − 人格 + 1`，
   * 它与本函数自己算的天格、地格**自相矛盾**。
   *
   * 判据是一条结构恒等式，**由上面已经采用的「假添一」直接推出**，不靠任何流派说法：
   *
   *     天格 + 地格 = 人格 + 外格
   *
   * 天格覆盖「姓 + 单姓假添的 1」，地格覆盖「名 + 单名假添的 1」，
   * 两者合起来恰是全部四个位置；而人格取「姓末 + 名首」、外格取「姓首 + 名末」，
   * 也恰是同样四个位置的另一种配对。所以这个等式必然成立。
   *
   * 实测 16 个姓名（四种形态各 4 个）：新式 16/16 成立，原式 **8/16 不成立**，
   * 不成立的正好是**单姓单名**与**复姓双名**——也正是它与前端引擎分歧的那两种形态。
   *
   * 分歧有多大：单姓单名下原式恒给外格 1（数理**大吉**），本式给 2（数理**凶**）。
   * 400 个常见单姓单名实测，**100% 吉凶相反**。而 C 端用户看到的是前端那份（给 2）。
   *
   * ⚠️ 原来的不变量表里第一条写着「外格 = 总格 − 人格 + 1 —— **定义式**」，
   * 于是 `wuGeInvariantsHold` 是**拿实现自己当规格**，永远查不出这件事。
   * 已换成上面那条结构恒等式。
   *
   * 关于流派：「单姓单名外格为 1 还是 2」坊间两说都有。这里不按谁的说法多来选，
   * 按**内部自洽**来选——既然天格、地格已经各假添了一个 1，外格就该是那两个 1 之和。
   * 若决策人要改回 1，必须连天格/地格的假添一起改，否则上面那条恒等式还是会破。
   */
  const waiGe =
    (surnameStrokes.length === 1 ? 1 : surnameStrokes[0]) +
    (givenStrokes.length === 1 ? 1 : givenStrokes[givenStrokes.length - 1]);

  return { tianGe, renGe, diGe, waiGe, zongGe };
}

/**
 * 三才：天、人、地三格的五行。
 *
 * 五行由笔画**尾数**定：1、2 木，3、4 火，5、6 土，7、8 金，9、0 水。
 */
const STROKE_WU_XING = ["水", "木", "木", "火", "火", "土", "土", "金", "金", "水"] as const;
export type WuXing = "金" | "木" | "水" | "火" | "土";

export function wuXingOfStroke(stroke: number): WuXing {
  return STROKE_WU_XING[((stroke % 10) + 10) % 10] as WuXing;
}

export function calcSanCai(ge: WuGeNumbers): { tian: WuXing; ren: WuXing; di: WuXing; combo: string } {
  const tian = wuXingOfStroke(ge.tianGe);
  const ren = wuXingOfStroke(ge.renGe);
  const di = wuXingOfStroke(ge.diGe);
  return { tian, ren, di, combo: `${tian}${ren}${di}` };
}

/**
 * ══ 不变量（供测试与调用方自检）══
 *
 * 1. **`天格 + 地格 = 人格 + 外格`** —— 结构恒等式，四种情形皆成立。
 *    🔴 2026-09-20 换掉了原来的第 1 条「外格 = 总格 − 人格 + 1（定义式）」：
 *    那条是**拿实现自己当规格**，实现怎么写它就怎么成立，查不出任何东西。
 *    本条不同——它由天格/地格的「假添一」推出，与外格的算法**相互独立**，
 *    所以能证伪。原实现在单姓单名与复姓双名两种形态下违反它（实测 8/16）。
 * 2. `总格 = 姓总 + 名总` —— 与分格无关。
 * 3. **单姓单名时外格恒为 2**（姓、名各假添的那个 1 之和），其余情形一般不为 2。
 * 4. **人格 ≠ 总格**，除非单姓单名。
 *    原实现两份让它恒等，是最直接的证伪点。
 * 5. 复姓时天格 = 姓两字之和，**不加 1**。
 */
export function wuGeInvariantsHold(input: WuGeInput): { ok: boolean; broken: string[] } {
  const g = calcWuGe(input);
  const surTotal = input.surnameStrokes.reduce((a, b) => a + b, 0);
  const givTotal = input.givenStrokes.reduce((a, b) => a + b, 0);
  const isSimple = input.surnameStrokes.length === 1 && input.givenStrokes.length === 1;
  const broken: string[] = [];

  if (g.tianGe + g.diGe !== g.renGe + g.waiGe) broken.push("天格+地格≠人格+外格");
  if (g.zongGe !== surTotal + givTotal) broken.push("总格≠姓总+名总");
  if (isSimple && g.waiGe !== 2) broken.push("单姓单名外格应为2（姓名各假添的 1 之和）");
  if (!isSimple && g.renGe === g.zongGe) broken.push("非单姓单名时人格不应等于总格");
  if (input.surnameStrokes.length > 1 && g.tianGe !== surTotal) broken.push("复姓天格不应加1");
  return { ok: broken.length === 0, broken };
}
