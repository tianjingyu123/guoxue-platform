// ── 称骨算命（袁天罡）共享类型 ──

export interface ChengGuInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender?: "男" | "女";
}

export interface ChengGuBoneDetail {
  label: string;
  ganZhi: string;
  weight: number;
  weightStr: string;
}

export interface ChengGuResult {
  input: ChengGuInput;
  lunarInfo: {
    year: string;
    month: number;
    day: number;
    shiChen: string;
  };
  bones: {
    year: ChengGuBoneDetail;
    month: ChengGuBoneDetail;
    day: ChengGuBoneDetail;
    hour: ChengGuBoneDetail;
  };
  totalWeight: number;
  totalWeightStr: string;
  poem: string;
  interpretation: string;
  level: string;
}
