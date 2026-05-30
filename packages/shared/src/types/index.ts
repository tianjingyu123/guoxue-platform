// 用户角色
export type UserRole = "USER" | "ADMIN";

// 用户状态
export type UserStatus = "ACTIVE" | "DISABLED";

// 认证方式
export type AuthProvider = "WECHAT" | "PASSWORD";

// 内容类型
export type ContentType = "ARTICLE" | "POEM" | "CLASSIC";

// 内容状态
export type ContentStatus = "DRAFT" | "PUBLISHED";

// 用户信息
export interface UserInfo {
  id: string;
  nickname: string;
  avatar?: string;
  role: UserRole;
  phone?: string;
  email?: string;
  createdAt: string;
}

// 登录响应
export interface LoginResult {
  accessToken: string;
  user: UserInfo;
}

// 内容摘要
export interface ContentSummary {
  id: string;
  title: string;
  type: ContentType;
  excerpt?: string;
  author?: string;
  dynasty?: string;
  tags: string[];
  coverUrl?: string;
  viewCount: number;
  createdAt: string;
}

// 内容详情
export interface ContentDetail extends ContentSummary {
  body: string;
  status: ContentStatus;
  updatedAt: string;
}

// 分页响应
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// API 统一响应
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// ── 古籍阅读器 ──

export interface Book {
  id: string;
  title: string;
  author?: string;
  dynasty?: string;
  category: string;
  cover?: string;
  intro?: string;
  chapterCount: number;
  viewCount: number;
  createdAt: string;
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  content: string;
  translation?: string;
  annotation?: string;
  sortOrder: number;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  bookId: string;
  chapterId: string;
  position: number;
  note?: string;
  createdAt: string;
  book?: { title: string; cover?: string };
  chapter?: { title: string; sortOrder?: number };
}

export interface ReadingProgress {
  id: string;
  userId: string;
  bookId: string;
  chapterId: string;
  progress: number;
  updatedAt: string;
  createdAt: string;
}

export interface ClassicSearchResult {
  id: string;
  title: string;
  author?: string;
  cover?: string;
  category: string;
  dynasty?: string;
  rank?: number;
}

export interface DictionaryEntry {
  word: string;
  pinyin: string;
  radicals: string;
  meanings: string[];
  classicalUsages: string[];
  commonPhrases: string[];
  explanation: string;
}

export interface TranslationResult {
  original: string;
  translation: string;
  notes: string[];
  source?: string;
}

// ── 赛事类型 ──

export type CompetitionTypeEnum =
  | "BAZI_PREDICT" | "LIUYAO" | "QIMEN_DUNJIA" | "MEIHUA_YISHU"
  | "ZIWEI_DOUSHU" | "FENGSHUI" | "NAME_ANALYSIS"
  | "POETRY" | "COUPLET" | "CALLIGRAPHY" | "PAINTING" | "MUSIC"
  | "GO_CHESS" | "TEA_CEREMONY" | "INCENSE" | "MARTIAL_ARTS"
  | "TCM_DIAGNOSIS" | "CLASSIC_RECITE" | "GEWU_PERCEIVE" | "UNKNOWN_PREDICT";

export type CompetitionStatusEnum = "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
export type CompetitionLevelEnum = "S" | "A" | "B";
export type PrizeTypeEnum = "CASH" | "PHYSICAL" | "VIRTUAL" | "MIXED";
export type QuestionTypeEnum = "SINGLE_CHOICE" | "MULTI_CHOICE" | "FILL_IN" | "SCALE" | "CASE_ANALYSIS" | "ESSAY";
export type ScoringModelEnum = "A" | "B" | "C" | "D";

export interface PrizeConfigItem {
  rank: string;
  title: string;
  prize?: number;
  prizeItem?: string;
  prizeType?: string;
  description?: string;
}

export interface CompetitionSummary {
  id: string;
  title: string;
  type: CompetitionTypeEnum;
  level: CompetitionLevelEnum;
  status: CompetitionStatusEnum;
  coverImage?: string;
  entryFee: number;
  totalPrize: number;
  prizeType: PrizeTypeEnum;
  prizeConfig?: PrizeConfigItem[];
  registrationCount: number;
  createdAt: string;
}

export interface CompetitionDetail extends CompetitionSummary {
  description?: string;
  rules?: string;
  scoringModel: ScoringModelEnum;
  maxParticipants: number;
  isInviteOnly: boolean;
  requireIdentity: boolean;
  invitationShare: number;
  prizeType: PrizeTypeEnum;
  organizerId?: string;
  organizerType?: string;
  tags: string[];
  rounds: CompetitionRoundInfo[];
}

export interface CompetitionRoundInfo {
  id: string;
  title: string;
  type: string;
  status: string;
  startAt: string;
  endAt: string;
  duration: number;
  passCount: number;
}

export interface CompetitionQuestionInfo {
  id: string;
  type: QuestionTypeEnum;
  score: number;
  difficulty: number;
  stem: string;
  options?: Record<string, any>[];
}

export interface CompetitionRankingInfo {
  rank: number;
  score: number;
  status: string;
  prize: number;
  user: { id: string; nickname: string; avatar?: string };
}

export interface FeaturesConfig {
  competition: boolean;
  live_streaming: boolean;
  ai_teacher: boolean;
  [key: string]: boolean;
}

// ── 工具类型 ──
export * from "./tools";
