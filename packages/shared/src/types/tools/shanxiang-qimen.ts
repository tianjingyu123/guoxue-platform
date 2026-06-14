// ── 山向奇门共享类型 ──

export interface ShanXiangQiMenInput {
  zuoShan: string;
  xiang: string;
  duShu: number;
  year: number;
  month: number;
  day: number;
}

export interface ShanXiangGong {
  pos: number;
  direction: string;
  bagua: string;
  diPan: string;
  tianPan: string;
  star: string;
  men: string;
  shen: string;
  isZuoShanGong: boolean;
  isXiangGong: boolean;
  shanXiangJiXiong?: string;
  isRuMu: boolean;
  isJiXing: boolean;
  kongWang: string;
  maXing: string;
}

export interface ShanXiangQiMenResult {
  input: ShanXiangQiMenInput;
  basicInfo: {
    zuoShan: string;
    xiang: string;
    duShu: number;
    dunType: string;
    juShu: number;
    ju72Number: number;
    ju72Name: string;
    duanName: string;
    nianGanZhi: string;
    shiGanZhi: string;
    xunShou: string;
    shuangShan: string;
  };
  gongs: ShanXiangGong[];
  zuoShanAnalysis: { shan: string; xianTian: string; luoShu: string; direction: string; gong: string; desc: string };
  xiangAnalysis: { shan: string; xianTian: string; luoShu: string; direction: string; gong: string; desc: string };
  geJu: Array<{ name: string; active: boolean; desc: string; jiXiong: string }>;
  duanYu: string;
}
