export interface ZeRiZaJiInput { year?: number; month?: number; }
export interface ZaJiItem { name: string; date: string; description: string; jiXiong: string; }
export interface ZeRiZaJiResult { items: ZaJiItem[]; summary: string; }
