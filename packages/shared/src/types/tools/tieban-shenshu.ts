// ── 铁板神数（简化版）共享类型 ──

export interface TieBanInput {
  name: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  gender: "男" | "女";
  question?: string;
}

export interface TiaoWen {
  number: number;
  category: string;
  text: string;
  jiXiong: string;
}

export interface TieBanResult {
  input: TieBanInput;
  baseNumber: number;
  tiaoWen: TiaoWen[];
  overview: string;
  fortune: { early: string; middle: string; late: string };
  advice: string[];
}
