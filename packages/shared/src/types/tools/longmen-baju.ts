export interface LongMenBajuInput { zuoShan?: string; laiShui?: string; quShui?: string; }
export interface BaJuAnalysis { juType: string; xianTianShui: string; houTianShui: string; jieSha: string; yaoSha: string; jiXiong: string; description: string; }
export interface LongMenBajuResult { analysis: BaJuAnalysis; summary: string; }
