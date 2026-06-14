export interface LiuShiSiTuPuInput { guaNumber?: number; guaName?: string; }
export interface GuaTuPu { number: number; name: string; shangGua: string; xiaGua: string; tuanCi: string; daXiang: string; }
export interface LiuShiSiTuPuResult { guaList: GuaTuPu[]; selected: GuaTuPu | null; summary: string; }
