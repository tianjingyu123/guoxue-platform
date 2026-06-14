export interface BaZhaiGongWeiInput { mingGua?: string; zuoXiang?: string; }
export interface GongWeiJiXiong { gongWei: string; direction: string; youNian: string; jiXiong: string; level: string; suitable: string; taboo: string; }
export interface BaZhaiGongWeiResult { mingGua: string; gongWeiList: GongWeiJiXiong[]; summary: string; }
