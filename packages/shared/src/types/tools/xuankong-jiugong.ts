// ── 玄空九宫类型 ──
// 玄空风水九宫飞星/山向飞星/格局分析

export interface XuanKongJiuGongInput {
  /** 运(1-9) */
  yun?: number;
  /** 山星(1-9) */
  shanXing?: number;
  /** 向星(1-9) */
  xiangXing?: number;
  /** 坐山(二十四山) */
  zuoShan?: string;
  /** 朝向(二十四山) */
  chaoXiang?: string;
}

export interface FeiXingGong {
  /** 宫位 */
  gongWei: string;
  /** 方位 */
  fangWei: string;
  /** 八卦 */
  baGua: string;
  /** 运星(当运) */
  yunXing: number;
  /** 山星 */
  shanXing: number;
  /** 向星 */
  xiangXing: number;
  /** 山向组合 */
  zuHe: string;
  /** 格局 */
  geJu: string;
  /** 格局吉凶 */
  jiXiong: string;
  /** 五行生克 */
  shengKe: string;
  /** 应事 */
  yingShi: string;
  /** 化解 */
  huaJie: string;
}

export interface ShouShanChuSha {
  /** 方法 */
  method: string;
  /** 原理 */
  yuanLi: string;
  /** 适用格局 */
  shiYong: string;
  /** 操作步骤 */
  buZhou: string[];
  /** 注意事项 */
  zhuYi: string[];
}

export interface XuanKongJiuGongResult {
  feiXingPan: FeiXingGong[];
  yunXing: number;
  shanXing: number;
  xiangXing: number;
  yuanYun: string;
  shouShanChuSha: ShouShanChuSha[];
  wangShanWangXiang: boolean;
  shangShanXiaShui: boolean;
  chengMenJue: string;
  analysis: string;
}
