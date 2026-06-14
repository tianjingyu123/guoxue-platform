// ── 紫微斗数共享类型 ──

export interface ZiWeiCalculatorInput {
  name: string;
  gender: "男" | "女";
  year: number;
  month: number;
  day: number;
  hour: number;
  lunarMonth: number;
  lunarDay: number;
  lunarHour: number;
  lunarYearGan: string;
  lunarYearZhi: string;
}
