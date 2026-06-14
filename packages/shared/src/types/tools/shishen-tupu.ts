export interface ShiShenTuPuInput { dayPillar?: string; yearPillar?: string; monthPillar?: string; hourPillar?: string; }
export interface ShiShenRelation { name: string; shen: string; from: string; to: string; relation: string; description: string; }
export interface ShiShenTuPuResult { riGan: string; shiShenMap: ShiShenRelation[]; summary: string; }
