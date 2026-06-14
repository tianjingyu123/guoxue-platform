// ── 六爻高级断卦类型 ──
// 六爻用神/应期/动变/生克技法

export interface LiuYaoDuanGuaInput {
  /** 用神类型 */
  yongShenType?: "父母" | "官鬼" | "兄弟" | "妻财" | "子孙";
  /** 占事类别 */
  zhanShi?: "求财" | "官运" | "婚姻" | "疾病" | "出行" | "失物" | "考试" | "词讼" | "胎产" | "行人";
  /** 动爻数 */
  dongYaoCount?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export interface YongShenRule {
  /** 用神 */
  yongShen: string;
  /** 用神取法 */
  quFa: string;
  /** 旺相条件 */
  wangXiang: string;
  /** 休囚条件 */
  xiuQiu: string;
  /** 伏藏断法 */
  fuCang: string;
  /** 空亡断法 */
  kongWang: string;
  /** 月破断法 */
  yuePo: string;
  /** 用神两现断法 */
  liangXian: string;
}

export interface YingQiRule {
  /** 应期类型 */
  type: string;
  /** 判断方法 */
  fangFa: string;
  /** 速应条件 */
  suYing: string;
  /** 迟应条件 */
  chiYing: string;
  /** 实例 */
  shiLi: string;
}

export interface DongYaoRule {
  /** 动爻数 */
  count: number;
  /** 断卦方法 */
  duanFa: string;
  /** 变爻看法 */
  bianYao: string;
  /** 生克关系 */
  shengKe: string;
  /** 体用关系 */
  tiYong: string;
}

export interface LiuYaoDuanGuaResult {
  yongShenRule: YongShenRule | null;
  yingQiRule: YingQiRule[];
  dongYaoRule: DongYaoRule | null;
  zhanShiAdvice: { type: string; yongShen: string; jiShen: string; xiongShen: string; duanYu: string } | null;
  allYongShenRules: YongShenRule[];
  allDongYaoRules: DongYaoRule[];
  analysis: string;
}
