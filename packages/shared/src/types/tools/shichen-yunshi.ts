export interface ShiChenYunShiInput { dayPillar?: string; }
export interface ShiChenYun { shiChen: string; jiXiong: string; yunShi: string; suitable: string[]; taboo: string[]; }
export interface ShiChenYunShiResult { shiChenList: ShiChenYun[]; summary: string; }
