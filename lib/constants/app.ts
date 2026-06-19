// 应用配置常量

// 应用信息
export const APP_CONFIG = {
  name: "热卜国学",
  slogan: "传承国学智慧，点亮人生方向",
  version: "1.0.0",
  copyright: "2024 热卜国学",
  icp: "京ICP备XXXXXXXX号",
}

// API配置
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 30000,
  retryCount: 3,
}

// 分页配置
export const PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
  maxPageSize: 100,
}

// 上传配置
export const UPLOAD_CONFIG = {
  maxImageSize: 5 * 1024 * 1024, // 5MB
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  maxFileSize: 20 * 1024 * 1024, // 20MB
  allowedImageTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  allowedVideoTypes: ["video/mp4", "video/quicktime", "video/webm"],
  allowedAudioTypes: ["audio/mpeg", "audio/wav", "audio/ogg"],
}

// 缓存时间配置（毫秒）
export const CACHE_TIME = {
  short: 5 * 60 * 1000, // 5分钟
  medium: 30 * 60 * 1000, // 30分钟
  long: 60 * 60 * 1000, // 1小时
  day: 24 * 60 * 60 * 1000, // 1天
}

// 动画时长配置（毫秒）
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
}

// 断点配置
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
}

// 路由配置
export const ROUTES = {
  home: "/",
  discover: "/discover",
  circles: "/circles",
  paipan: "/paipan",
  profile: "/profile",
  login: "/login",
  register: "/register",
  settings: "/settings",
  help: "/help",
  search: "/search",
  messages: "/messages",
  notifications: "/notifications",
  wallet: "/wallet",
  orders: "/orders/center",
  favorites: "/favorites",
  history: "/history",
  memberships: "/mine/memberships",
  institute: "/institute",
  rankings: "/rankings",
}

// 角色类型
export const USER_ROLES = {
  user: "普通用户",
  circle_owner: "圈主",
  teacher: "讲师",
  station_owner: "分站站长",
  operator: "运营商",
  streamer: "主播",
  creator: "创作者",
  institute_member: "研究院成员",
  institute_admin: "研究院管理层",
} as const

// 订单状态
export const ORDER_STATUS = {
  pending: { label: "待支付", color: "warning" },
  paid: { label: "已支付", color: "success" },
  shipped: { label: "已发货", color: "info" },
  completed: { label: "已完成", color: "success" },
  cancelled: { label: "已取消", color: "muted" },
  refunding: { label: "退款中", color: "warning" },
  refunded: { label: "已退款", color: "muted" },
} as const

// 内容状态
export const CONTENT_STATUS = {
  draft: { label: "草稿", color: "muted" },
  pending: { label: "待审核", color: "warning" },
  approved: { label: "已通过", color: "success" },
  rejected: { label: "已拒绝", color: "danger" },
  published: { label: "已发布", color: "success" },
  offline: { label: "已下架", color: "muted" },
} as const

// 会员等级
export const VIP_LEVELS = {
  normal: { label: "普通用户", icon: "User" },
  vip1: { label: "初学者", icon: "Star" },
  vip2: { label: "进阶者", icon: "Award" },
  vip3: { label: "大师", icon: "Crown" },
} as const
