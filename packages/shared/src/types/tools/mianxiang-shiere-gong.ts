// ── 面相十二宫共享类型 ──

export interface MianXiangShiErGongInput {
  gongName?: string;
  gender?: "男" | "女";
}

export interface MianXiangShiErGongResult {
  gongList: MianXiangGongItem[];
  summary: string;
}

export interface MianXiangGongItem {
  name: string;
  position: string;
  wuXing: string;
  color: string;
  standard: string;
  goodSign: string;
  badSign: string;
  ageRange: string;
  lifeArea: string;
}
