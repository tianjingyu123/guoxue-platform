// ── 六爻卦辞类型 ──
// 六爻纳甲64卦卦辞/爻辞/世应/六亲/六兽全解

export interface LiuYaoGuaCiInput {
  /** 卦名(如"乾为天"、"天地否") */
  guaName?: string;
  /** 也可按序号查(1-64) */
  guaIndex?: number;
}

export interface YaoCiDetail {
  /** 爻位(初爻~上爻) */
  position: string;
  /** 爻辞 */
  yaoCi: string;
  /** 爻象解读 */
  xiangJie: string;
  /** 吉凶 */
  jiXiong: "吉" | "平" | "凶";
}

export interface GuaCiDetail {
  /** 卦序 */
  index: number;
  /** 卦名(如"乾为天") */
  name: string;
  /** 上卦/下卦 */
  shangGua: string;
  xiaGua: string;
  /** 卦宫 */
  gong: string;
  /** 五行 */
  wuXing: string;
  /** 世应爻位 */
  shiYao: string;
  yingYao: string;
  /** 卦辞 */
  guaCi: string;
  /** 彖传 */
  tuanZhuan: string;
  /** 象传 */
  xiangZhuan: string;
  /** 六爻爻辞 */
  yaoCiList: YaoCiDetail[];
  /** 六亲定位 */
  liuQin: Record<string, string>;
  /** 六兽初爻 */
  liuShou: string[];
  /** 用神取法 */
  yongShen: string;
  /** 常见应期 */
  yingQi: string;
  /** 卦象总断 */
  zongDuan: string;
}

export interface LiuYaoGuaCiResult {
  gua: GuaCiDetail | null;
  allGua: { index: number; name: string; gong: string; jiXiong: string }[];
  analysis: string;
}
