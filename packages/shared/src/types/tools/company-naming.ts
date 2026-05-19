// ── 公司起名共享类型 ──
// 算法生成替代静态数据库，工商规则模拟 + 多维度评分

/** 行业分类 */
export type IndustryType =
  | "科技" | "文化" | "贸易" | "餐饮" | "建筑" | "金融"
  | "教育" | "医疗" | "制造" | "农业" | "物流" | "传媒"
  | "咨询" | "设计" | "新能源" | "互联网";

/** 公司组织形式 */
export type CompanyForm = "有限公司" | "股份有限公司" | "合伙企业" | "个人独资企业" | "个体工商户";

/** 工商禁用词类型 */
export type RestrictedWordType = "国家" | "政党" | "宗教" | "军事" | "敏感" | "夸大" | "冒名" | "数字";

/** 核名风险等级 */
export type VerificationRisk = "低风险" | "中风险" | "高风险";

// ── 输入 ──
export interface CompanyNamingInput {
  /** 行业 */
  industry: IndustryType;
  /** 城市（行政区域） */
  city?: string;
  /** 组织形式 */
  companyForm?: CompanyForm;
  /** 法人八字生日（可选，用于五行匹配） */
  ownerBirthday?: string;
  /** 偏好风格 */
  style?: "大气" | "雅致" | "现代" | "传统" | "创新";
  /** 偏好字数（字号） */
  ziHaoLength?: 2 | 3 | 4;
  /** 自定义关键字（可多选，融入生成） */
  keywords?: string[];
}

// ── 公司名称结构 ──
export interface CompanyName {
  /** 完整名称 */
  fullName: string;
  /** 行政区域 */
  region: string;
  /** 字号（核心） */
  ziHao: string;
  /** 行业表述 */
  industryDesc: string;
  /** 组织形式 */
  form: CompanyForm;
}

// ── 核名分析 ──
export interface NameVerification {
  /** 风险等级 */
  risk: VerificationRisk;
  /** 是否包含禁用词 */
  hasRestrictedWord: boolean;
  /** 匹配置换词 */
  restrictedWords: string[];
  /** 字号长度是否合规 (2-8字) */
  lengthCompliant: boolean;
  /** 近似名风险 */
  similarityRisk: "无" | "低" | "中" | "高";
  /** 重名概率估计 */
  duplicationProbability: string;
  /** 核名建议 */
  suggestions: string[];
  /** 通过概率评分 0-100 */
  passScore: number;
}

// ── 五行数理分析 ──
export interface CompanyWuXing {
  /** 行业五行 */
  industryWuXing: string;
  /** 字号笔画总格 */
  totalStrokes: number;
  /** 总格81数理 */
  shuLi: { number: number; jiXiong: string; desc: string };
  /** 行业+字号五行匹配度 */
  matchScore: number;
  /** 五行分析 */
  analysis: string;
}

// ── 生成方案 ──
export interface CompanyNameProposal {
  /** 排名 */
  rank: number;
  /** 名称结构 */
  name: CompanyName;
  /** 核名分析 */
  verification: NameVerification;
  /** 五行数理 */
  wuXing: CompanyWuXing;
  /** 音韵评分 */
  phoneticsScore: number;
  /** 品牌力评分 */
  brandScore: number;
  /** 综合评分 0-100 */
  totalScore: number;
  /** 推荐理由 */
  reason: string;
}

// ── 输出 ──
export interface CompanyNamingResult {
  input: CompanyNamingInput;
  /** 推荐方案（3-8组） */
  proposals: CompanyNameProposal[];
  /** 行业分析 */
  industryAnalysis: {
    industry: IndustryType;
    wuXing: string;
    typicalZiHaoPattern: string;
    namingTips: string[];
  };
  /** 整体建议 */
  generalAdvice: string;
}
