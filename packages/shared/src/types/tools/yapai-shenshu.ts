export interface YaPaiShenShuInput { random?: boolean; cards?: number[]; }
export interface YaPaiItem { id: number; name: string; type: string; meaning: string; }
export interface YaPaiShenShuResult { drawnCards: YaPaiItem[]; interpretation: string; summary: string; }
