/**
 * 热卜国学平台 — 前端核心组件 Props 规范
 *
 * 本文件为 Trae 前端开发提供精确的 TypeScript 接口定义。
 * 每个 Props 均标注了后端数据来源（接口路径 + 字段路径）。
 */

// ═══════════════════════════════════════════════════════════════
// 1. ContentCard — 首页信息流通用卡片
// ═══════════════════════════════════════════════════════════════

/** 内容卡片类型，对应首页瀑布流 9 种内容 */
export type ContentCardType =
  | "circle"        // 圈子推荐
  | "course"        // 精选课程
  | "product"       // 精选商品
  | "article"       // 精选文章
  | "live"          // 人气直播
  | "video"         // 短视频
  | "ebook"         // 电子书
  | "bot"           // 智能体
  | "paipan_guide"; // 排盘入口引导

export interface ContentCardProps {
  /** 卡片类型，决定渲染模板 */
  type: ContentCardType;
  /** 内容ID，点击跳转时使用 */
  targetId: string;
  /** 封面图 URL
   *  - article: GET /articles/:id → data.cover
   *  - course:  GET /courses/:id  → data.cover
   *  - product: GET /shop/products/:id → data.images[0]
   *  - circle:  GET /circles/:id → data.cover
   *  - live:    GET /live/rooms/:id → data.coverUrl
   *  - video:   GET /videos/:id → data.coverUrl
   *  - ebook:   GET /classic/books/:id → data.cover (后续 ebook API)
   */
  coverUrl: string;
  /** 标题文字（最多2行截断）
   *  - 所有类型: data.title
   */
  title: string;
  /** 当前价格（元），免费内容传 0
   *  - course/product/ebook: data.price
   *  - circle: data.price
   */
  price: number;
  /** 原价（元），用于划线展示；无原价时传 0 或与 price 相同 */
  originalPrice: number;
  /** 作者/发布者头像 */
  avatar: string;
  /** 作者/发布者昵称 */
  nickname: string;
  /** 点赞数
   *  - 来源: GET /interaction/like/count?targetType=X&targetId=Y → data.count
   */
  likeCount: number;
  /** 右上角标签文字，如 "人气" / "精选" / "秒杀"
   *  - article: isPushHome ? "精选" : ""
   *  - live: status === "LIVE" ? "直播中" : "预告"
   */
  tagText: string;
  /** 卡片宽高比（封面图 aspect-ratio）
   *  - 推荐值: 4:3 = 1.333, 3:4 = 0.75, 1:1 = 1.0
   *  - 瀑布流混排时每个卡片可不同
   */
  aspectRatio: number;
  /** 直播状态标签（仅 live 类型）
   *  - GET /live/rooms/:id → data.status: "WAITING" | "LIVE" | "ENDED"
   */
  liveStatus?: "WAITING" | "LIVE" | "ENDED";
  /** 观看/学习人数展示
   *  - course: data.enrollCount
   *  - live: data.viewerCount
   *  - circle: data.memberCount
   */
  countLabel?: string;
  /** 视频时长（秒），仅 video 类型 */
  duration?: number;
  /** 排序位置，用于埋点上报 */
  position?: number;
}

// ═══════════════════════════════════════════════════════════════
// 2. EmptyState — 全局空状态组件
// ═══════════════════════════════════════════════════════════════

export interface EmptyStateProps {
  /** 空状态插画 URL（CDN 或本地 assets）
   *  - 平台提供 6 张国风主题插画，由后端 GET /system/public/banners 配置
   */
  imageUrl?: string;
  /** 主提示文字 */
  title: string;
  /** 副提示文字（可选，灰色小字） */
  description?: string;
  /** 操作按钮文字（可选，不传则不显示按钮） */
  actionText?: string;
  /** 操作按钮跳转路径（uni-app 路由） */
  actionRoute?: string;
}

// ═══════════════════════════════════════════════════════════════
// 3. RecommendCard — 文章内嵌推荐卡片
// ═══════════════════════════════════════════════════════════════

/** 推荐类型，对应文章内可插入的 5 种推荐 */
export type RecommendType = "circle" | "course" | "product" | "paipan" | "bot";

export interface RecommendCardProps {
  /** 推荐类型
   *  - 来源: GET /articles/:id/related → data[].recommendType
   *  - 插入: POST /articles/:id/recommends → { recommendType, targetId, sortOrder }
   */
  recommendType: RecommendType;
  /** 目标实体 ID */
  targetId: string;
  /** 封面图 */
  coverUrl: string;
  /** 标题 */
  title: string;
  /** 描述/简介（最多2行） */
  description: string;
  /** 价格（元），0 = 免费 */
  price: number;
  /** 点击行为
   *  - circle  → uni.navigateTo /pages/circle/detail?id=xxx
   *  - course  → uni.navigateTo /pages/course/detail?id=xxx
   *  - product → uni.navigateTo /pages/shop/detail?id=xxx
   *  - paipan  → uni.navigateTo /pages/paipan/index
   *  - bot     → 打开智能体半屏对话
   */
  onClick?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// 4. SkeletonLoader — 骨架屏组件
// ═══════════════════════════════════════════════════════════════

export type SkeletonType = "card" | "list" | "detail";

export interface SkeletonLoaderProps {
  /** 骨架屏样式类型
   *  - card:   单张卡片骨架（封面 + 标题 + 作者行）
   *  - list:   列表骨架（圆形头像 + 2行文字）× N
   *  - detail: 详情页骨架（大图 + 标题 + 正文段落 × 3）
   */
  type: SkeletonType;
  /** 重复数量（card/list 时生效，detail 忽略） */
  count?: number;
}

// ═══════════════════════════════════════════════════════════════
// 5. VirtualCoinDisplay — 虚拟币展示组件
// ═══════════════════════════════════════════════════════════════

export interface VirtualCoinDisplayProps {
  /** 虚拟币数量（1币 = 0.1元）
   *  - 来源: GET /coin/balance → data.balance
   */
  amount: number;
  /** 是否显示折合人民币（默认 true）
   *  - 显示格式: "余额 100币 (≈¥10.00)"
   */
  showRmb?: boolean;
  /** 币图标（可选，默认使用内置图标） */
  iconUrl?: string;
  /** 币种名称（可选，默认 "国学币"） */
  coinName?: string;
}

// ═══════════════════════════════════════════════════════════════
// 6. RoleSwitcher — 多身份切换组件
// ═══════════════════════════════════════════════════════════════

export interface RoleInfo {
  /** 角色类型
   *  - 来源: GET /auth/me → data.roles[].roleType
   */
  roleType: string;
  /** 绑定的业务实体ID（圈子ID/分站ID等，无则为 null）
   *  - 来源: GET /auth/me → data.roles[].bindId
   */
  bindId: string | null;
  /** 绑定的业务实体名称（圈子名/分站名，普通用户为 "普通用户"）
   *  - 来源: GET /auth/me → data.roles[].bindName（前端按需拼装）
   */
  bindName: string;
  /** 是否为当前活跃身份
   *  - 前端维护 isActive 状态，切换时更新
   */
  isActive: boolean;
  /** 身份标签文字，如 "圈主" / "讲师" / "站长"
   *  - roleType 映射: CIRCLE_OWNER→"圈主", LECTURER→"讲师", STATION_MASTER→"站长", OPERATOR→"运营商"
   */
  label: string;
}

export interface RoleSwitcherProps {
  /** 用户拥有的所有身份列表（至少包含一个普通用户身份）
   *  - 来源: GET /auth/me → data.roles
   */
  roles: RoleInfo[];
  /** 切换身份回调
   *  - 前端实现: 更新 activeRole → 刷新管理面板数据 → 存储到本地缓存
   */
  onSwitch?: (role: RoleInfo) => void;
}
