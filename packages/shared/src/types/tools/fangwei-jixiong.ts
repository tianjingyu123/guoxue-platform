export interface FangWeiJiXiongInput { year?: number; month?: number; }
export interface FangWeiInfo { fangWei: string; nianSha: string; yueSha: string; jiXiong: string; description: string; }
export interface FangWeiJiXiongResult { fangWeiList: FangWeiInfo[]; summary: string; }
