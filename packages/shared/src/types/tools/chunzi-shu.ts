export interface ChunZiShuInput { random?: boolean; number?: number; }
export interface ChunZiItem { id: number; text: string; jiXiong: string; category: string; }
export interface ChunZiShuResult { items: ChunZiItem[]; selected: ChunZiItem | null; summary: string; }
