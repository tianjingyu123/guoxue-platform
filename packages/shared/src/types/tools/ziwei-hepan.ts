// ── 紫微合盘共享类型 ──

export interface ZiweiHePanInput {
  self: { year: number; month: number; day: number; hour: number; gender: "男" | "女" };
  partner: { year: number; month: number; day: number; hour: number; gender: "男" | "女" };
}

export interface ZiweiHePanResult {
  selfChart: {
    mingGongZhi: string;
    mingStars: string[];
    fuQiStars: string[];
    siHua: { huaLu: string; huaQuan: string; huaKe: string; huaJi: string };
  };
  partnerChart: {
    mingGongZhi: string;
    mingStars: string[];
    fuQiStars: string[];
    siHua: { huaLu: string; huaQuan: string; huaKe: string; huaJi: string };
  };
  scores: {
    mingGongMatch: { score: number; detail: string };
    fuQiMatch: { score: number; detail: string };
    siHuaMatch: { score: number; detail: string };
    zhiRelation: { score: number; detail: string };
    total: number;
    max: number;
  };
  level: string;
  compatibility: { overall: string; marriage: string; career: string; daily: string };
  highlights: string[];
  summary: string;
}
