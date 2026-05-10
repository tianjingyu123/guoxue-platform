/**
 * 热卜国学平台 — 前端核心组件 Props 规范
 *
 * 本文件定义了 6 个跨页面复用的核心组件 TypeScript 接口。
 * 每个 Props 接口标注了后端字段来源，便于前后端联调时对齐数据结构。
 *
 * 生成时间: 2026-05-10
 */

// ═══════════════════════════════════════════
// 1. ContentCard — 通用信息流卡片
// ═══════════════════════════════════════════

/** 内容类型枚举 */
type ContentType =
  | "ARTICLE"   // 文章
  | "VIDEO"     // 短视频
  | "COURSE"    // 课程
  | "CLASSIC"   // 古籍
  | "EBOOK"     // 电子书
  | "PRODUCT"   // 商品
  | "CIRCLE"    // 圈子
  | "LIVE"      // 直播
  | "PAIPAN";   // 排盘结果

/** 后端数据来源
 *  - /api/v1/mini/home         → HomeAggregationDto.items[]
 *  - /api/v1/mini/contents     → PaginatedResult<ContentItem>
 *  - /api/v1/recommend/*        → RecommendResponse.items[]
 *  - /api/v1/search             → SearchResult.items[]
 */
export interface ContentCardProps {
  /** 内容ID，用于跳转详情 /api/v1/{type}/{id} */
  id: string;
  /** 内容类型，决定卡片 UI 变体 */
  type: ContentType;
  /** 标题 */
  title: string;
  /** 封面图 URL */
  cover?: string;
  /** 摘要/简介（最多 2 行） */
  excerpt?: string;
  /** 标签列表 */
  tags?: string[];
  /** 作者信息 */
  author?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  /** 互动统计 */
  stats?: {
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
  };
  /** 附加数据（价格/评分/直播间状态 等，按 type 不同） */
  extra?: {
    price?: number;           // COURSE / PRODUCT / EBOOK 价格
    originalPrice?: number;  // 原价（划线价）
    rating?: number;          // 评分 (0-5)
    studentCount?: number;    // COURSE 学员数
    memberCount?: number;     // CIRCLE 成员数
    liveStatus?: "LIVE" | "ENDED" | "UPCOMING";
    isFree?: boolean;         // 是否免费
    label?: string;           // 角标文案（"热门"/"新品"/"限时"）
  };
  /** 推荐来源文案（"猜你喜欢"/"与你八字相关"） */
  recommendReason?: string;
  /** 点击回调（由父组件注入） */
  onTap?: (id: string, type: ContentType) => void;
}

// ═══════════════════════════════════════════
// 2. EmptyState — 全局空状态
// ═══════════════════════════════════════════

/** 后端数据来源
 *  - 前端组件，不直接对应后端接口
 *  - 搜索无结果 / 列表为空 / 网络错误时展示
 */
export interface EmptyStateProps {
  /** 预设场景或自定义图标名 */
  type?: "search" | "content" | "network" | "notification" | "order" | "custom";
  /** 自定义图标 URL（type=custom 时使用） */
  iconUrl?: string;
  /** 主标题 */
  title?: string;
  /** 副标题/描述 */
  description?: string;
  /** 操作按钮 */
  action?: {
    text: string;
    onPress: () => void;
  };
  /** 是否全屏居中 */
  fullscreen?: boolean;
}

// ═══════════════════════════════════════════
// 3. RecommendCard — 文章内嵌推荐
// ═══════════════════════════════════════════

/** 后端数据来源
 *  - /api/v1/recommend/article_detail?contentId=xxx
 *  - RecommendResponse.items[]
 */
export interface RecommendCardProps {
  /** 推荐项列表 */
  items: ContentCardProps[];
  /** 推荐场景标识 */
  scene: "article_detail" | "course_detail" | "paipan_result" | "payment_success" | "search_empty" | "guess_like";
  /** 推荐标题（"相关推荐"/"猜你喜欢"/"学了的人还看了"） */
  title?: string;
  /** 展示模式 */
  layout?: "horizontal-scroll" | "vertical-list" | "grid";
  /** 最多展示条数 */
  maxItems?: number;
  /** 查看更多回调 */
  onMore?: () => void;
}

// ═══════════════════════════════════════════
// 4. SkeletonLoader — 骨架屏
// ═══════════════════════════════════════════

/** 后端数据来源
 *  - 前端组件，在数据加载期间展示占位
 *  - 各列表页、详情页使用
 */
export interface SkeletonLoaderProps {
  /** 骨架屏类型 */
  type: "card-list" | "detail" | "profile" | "banner" | "grid" | "text-block";
  /** 重复行数（type=card-list 时生效） */
  count?: number;
  /** 列数（type=grid 时生效） */
  columns?: number;
  /** 是否显示头像占位 */
  showAvatar?: boolean;
  /** 自定义宽高比 */
  aspectRatio?: number;
}

// ═══════════════════════════════════════════
// 5. VirtualCoinDisplay — 虚拟币展示
// ═══════════════════════════════════════════

/** 后端数据来源
 *  - /api/v1/coin/balance          → { balance: number }
 *  - /api/v1/coin/tiers            → CoinTier[]
 *  - /api/v1/coin/transactions     → PaginatedResult<CoinTransaction>
 *
 * 平台虚拟币体系（国学币/功德点/积分统一命名）
 */
export interface VirtualCoinDisplayProps {
  /** 当前余额（来自 /api/v1/coin/balance） */
  balance: number;
  /** 虚拟币名称（默认"国学币"） */
  coinName?: string;
  /** 虚拟币图标 URL */
  iconUrl?: string;
  /** 展示模式 */
  mode: "compact" | "full";
  /** 是否显示充值入口 */
  showRecharge?: boolean;
  /** 充值档位列表（来自 /api/v1/coin/tiers） */
  tiers?: Array<{
    id: string;
    amount: number;       // 充值金额（元）
    coins: number;        // 获得国学币数
    bonus?: number;       // 赠送国学币数
    label?: string;       // 档位标签（"最受欢迎"）
  }>;
  /** 充值回调 */
  onRecharge?: (tierId: string) => void;
  /** 查看明细回调 */
  onViewTransactions?: () => void;
}

// ═══════════════════════════════════════════
// 6. RoleSwitcher — 多身份切换
// ═══════════════════════════════════════════

/** 后端数据来源
 *  - /api/v1/auth/profile         → UserProfile.roles[]
 *  - /api/v1/auth/switch-role     → POST { role: RoleType }
 *
 * 分站多小程序架构的关键组件，支持用户在多个身份间切换。
 */
export type RoleType =
  | "STUDENT"         // 普通学员
  | "TEACHER"         // 讲师
  | "INSTITUTE_ADMIN"  // 机构管理员
  | "OPERATION_ADMIN"  // 运营管理员
  | "SUPER_ADMIN";     // 超级管理员

export interface RoleSwitcherProps {
  /** 当前身份 */
  currentRole: RoleType;
  /** 可选身份列表 */
  availableRoles: Array<{
    role: RoleType;
    label: string;           // 身份中文名
    icon?: string;           // 身份图标
    stationId?: string;      // 所属分站（多小程序架构）
    stationName?: string;    // 分站名称
    unreadCount?: number;    // 该身份的未读消息数
  }>;
  /** 是否显示分站切换 */
  showStationSwitch?: boolean;
  /** 切换回调（触发 /api/v1/auth/switch-role） */
  onSwitch: (role: RoleType, stationId?: string) => void;
}
