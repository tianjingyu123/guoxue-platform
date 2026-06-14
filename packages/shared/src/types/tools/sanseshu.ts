// ── 三世书类型 ──
// 三世书：根据出生年月日时推算前生/今生/来世因果

export interface SanSeShuInput {
  /** 出生年 */
  year: number;
  /** 出生月 */
  month: number;
  /** 出生日 */
  day: number;
  /** 出生时辰地支 */
  hourZhi: string;
  /** 性别 */
  gender: "男" | "女";
}

export interface SanSeShuPast {
  /** 前生属相 */
  shengXiao: string;
  /** 前生来自 */
  from: string;
  /** 前生修行 */
  xiuXing: string;
  /** 前生业力 */
  yeLi: string;
  /** 对今生影响 */
  influence: string;
}

export interface SanSeShuPresent {
  /** 本命星宿 */
  xingXiu: string;
  /** 一生总评 */
  zongPing: string;
  /** 早年运(1-20) */
  zaoNian: string;
  /** 中年运(21-40) */
  zhongNian: string;
  /** 晚年运(41+) */
  wanNian: string;
  /** 财帛运 */
  caiYun: string;
  /** 婚姻运 */
  hunYin: string;
  /** 子女运 */
  ziNv: string;
  /** 寿元 */
  shouYuan: string;
}

export interface SanSeShuFuture {
  /** 来世去向 */
  quXiang: string;
  /** 来世属相 */
  shengXiao: string;
  /** 今生应修 */
  yingXiu: string;
  /** 积德建议 */
  jiDe: string;
}

export interface SanSeShuResult {
  past: SanSeShuPast;
  present: SanSeShuPresent;
  future: SanSeShuFuture;
  /** 综合建议 */
  advice: string;
  /** 全文断语 */
  analysis: string;
}
