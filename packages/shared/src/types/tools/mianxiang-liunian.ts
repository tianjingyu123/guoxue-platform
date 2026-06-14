// ── 面相流年运气 ──

export interface MianXiangLiuNianInput {
  gender?: "男" | "女";
  age?: number;
  buWei?: string;
}

export interface LiuNianBuWeiItem {
  age: number;
  buWei: string;
  position: string;
  jieDuan: string;
  yunQiLevel: string;
  describe: string;
  advice: string;
}

export interface MianXiangBuWeiOverview {
  category: string;
  ageRange: string;
  buWeiList: string[];
  description: string;
}

export interface MianXiangLiuNianResult {
  currentAge: number;
  currentBuWei: LiuNianBuWeiItem | null;
  liuNianList: LiuNianBuWeiItem[];
  buWeiOverview: MianXiangBuWeiOverview[];
  summary: string;
}
