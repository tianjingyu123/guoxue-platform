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
