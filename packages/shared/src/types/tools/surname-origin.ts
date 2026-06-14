export interface SurnameOriginInput {
  surname?: string;
  ranking?: number;
}

export interface SurnameInfo {
  surname: string;
  pinyin: string;
  ranking: number;
  population: string;
  origin: string;
  ancestor: string;
  junWang: string;
  tangHao: string[];
  migration: string;
  celebrities: string[];
  distribution: string;
}

export interface SurnameOriginResult {
  surname: SurnameInfo;
  summary: string;
}
