export interface LiuNianShenShaInput { yearPillar?: string; dayPillar?: string; year?: number; }
export interface ShenShaDetail { name: string; position: string; jiXiong: string; description: string; }
export interface LiuNianShenShaResult { shenShaList: ShenShaDetail[]; summary: string; }
