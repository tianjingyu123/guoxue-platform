/**
 * 类型统一导出入口
 * 所有类型从各子模块重新导出
 */

// API 通用类型
export type {
  ApiResponse,
  PaginatedData,
  ApiPaginatedResponse,
  CalculateApiResponse,
  PaginationParams,
  SortParams,
} from './api'

// 通用业务模型
export type {
  UserInfo,
  UserRole,
  UserRoleInfo,
  UserStats,
  UserProfile,
  LoginRequest,
  SmsLoginRequest,
  WechatLoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenResponse,
  SendCodeRequest,
  UploadResponse,
  ImageInfo,
  VideoInfo,
  AudioInfo,
  VodUploadSignature,
  VodPlaySignature,
  GeoLocation,
  NotificationItem,
  UnreadCount,
  SearchParams,
  SearchSuggestion,
  HotSearchItem,
  BannerItem,
  MemberPlan,
  MemberStatus,
  SiteNotice,
  RefUser,
  RefCircle,
} from './models'

// 排盘工具类型
export type {
  // 基础
  Pillar,
  // 八字
  BaziInput,
  BaziResult,
  SiZhu,
  QiYun,
  DaYunStep,
  LiuNian,
  ShenShaItem,
  GeJu,
  WuXingEnergy,
  FenXiTiShi,
  LiuYue,
  // 紫微
  ZiweiInput,
  ZiweiResult,
  ZiweiGong,
  ZiweiStar,
  // 奇门通用
  QimenGong,
  // 阳盘奇门
  QimenYangInput,
  QimenYangResult,
  // 阳盘命理奇门
  QimenYangMingliInput,
  QimenYangMingliResult,
  MingliBasicInfo,
  MingliGeJu,
  MingliDaYun,
  MingGongInfo,
  MingliBaziBrief,
  // 阴盘奇门
  QimenYinInput,
  QimenYinResult,
  // 阴盘命理奇门
  QimenYinMingliInput,
  QimenYinMingliResult,
  // 山向奇门
  ShanXiangQiMenInput,
  ShanXiangQiMenResult,
  // 奇门穿壬
  QimenChuanRenInput,
  QimenChuanRenResult,
  ChuanRenMapping,
  ZhiAnalysis,
  ChuanRenDuanYu,
  // 大六壬
  DaLiuRenInput,
  DaLiuRenResult,
  // 小六壬
  XiaoLiuRenInput,
  XiaoLiuRenResult,
  // 金口诀
  JinKouJueInput,
  JinKouJueResult,
  // 六爻
  LiuYaoInput,
  LiuYaoResult,
  // 梅花易数
  MeiHuaInput,
  MeiHuaResult,
  // 小成图
  XiaoChengTuInput,
  XiaoChengTuResult,
  // 金钱课
  JinQianKeInput,
  JinQianKeResult,
  // 诸葛神数
  ZhuGeShenShuInput,
  ZhuGeShenShuResult,
  // 孔明神卦
  KongMingShenGuaInput,
  KongMingShenGuaResult,
  // 玄空飞星
  XuanKongFeiXingInput,
  XuanKongFeiXingResult,
  // 八宅
  BaZhaiInput,
  BaZhaiResult,
  // 电子罗盘
  DianZiLuoPanInput,
  DianZiLuoPanResult,
  // 立极尺
  LiJiChiInput,
  LiJiChiResult,
  // 山向地图
  ShanXiangDiTuInput,
  ShanXiangDiTuResult,
  // 太乙神数
  TaiYiInput,
  TaiYiResult,
  // 七政四余
  QiZhengSiYuInput,
  QiZhengSiYuResult,
  // 五运六气
  WuYunLiuQiInput,
  WuYunLiuQiResult,
  // 起名
  QiMingInput,
  QiMingResult,
  // 姓名解析
  XingMingJieXiInput,
  XingMingJieXiResult,
  // 飞宫小奇门
  FeiGongXiaoQiMenInput,
  FeiGongXiaoQiMenResult,
  // 手机号分析
  ShouJiHaoFenXiInput,
  ShouJiHaoFenXiResult,
  // 万年历
  WanNianLiInput,
  WanNianLiResult,
  // 康熙字典
  KangXiZiDianInput,
  KangXiZiDianResult,
  // 汉字筛选
  HanZiShaiXuanInput,
  HanZiShaiXuanResult,
  // 工具目录
  ToolCategory,
  ToolItem,
  CalculateResponse,
  ToolsDirectoryResponse,
  InputField,
  InputSchema,
  // 排盘记录
  BaziRecord,
  ZiweiRecord,
  // 联合类型
  ToolInput,
  ToolResultMap,
} from './tools'

// 商城类型
export type {
  ProductCategory,
  ProductSku,
  ProductItem,
  UnifiedPriceResult,
  CartItem,
  AddressItem,
  OrderStatus,
  OrderItem,
  Order,
  Coupon,
  ProductReview,
  LogisticsInfo,
  AfterSale,
  FlashSale,
  GroupBuy,
} from './shop'

// 课程类型
export type {
  CourseCategory,
  CourseItem,
  ChapterItem,
  CourseProgress,
  CourseQuestion,
  CourseReview,
  CourseRating,
  CourseDashboard,
  CourseWork,
  CourseCertificate,
  CourseDraft,
} from './course'

// 直播类型
export type {
  LiveStatus,
  LiveType,
  LiveHost,
  LiveRoom,
  StreamUrls,
  MicInfo,
  LiveGift,
  GiftRankingItem,
  LiveComment,
  LiveBooking,
  LiveFlashSale,
  LiveSlide,
  ScheduledLive,
} from './live'

// 圈子类型
export type {
  CircleItem,
  CirclePost,
  CircleMember,
  CircleAnnouncement,
  CircleExpert,
  JoinPrepareResult,
  JoinStatus,
  InviteCode,
  InvitationStats,
  CircleRanking,
  CircleDashboardOverview,
  CircleDashboardTrend,
  CircleRevenueBreakdown,
  CircleHotContent,
  ChurnWarningMember,
  CirclePostDraft,
} from './circle'

// 社交互动类型
export type {
  LikeTargetType,
  LikeToggleResponse,
  LikeItem,
  CommentTargetType,
  CommentItem,
  CreateCommentRequest,
  MyCommentItem,
  ReceivedCommentItem,
  CollectTargetType,
  CollectToggleResponse,
  CollectItem,
  CollectStats,
  FollowUser,
  FollowUserWithStats,
  ReportRequest,
  ReportStats,
  BrowseHistoryItem,
} from './social'

// 钱包/支付类型
export type {
  CoinBalance,
  CoinTransactionType,
  CoinTransaction,
  CoinTier,
  SpendCoinRequest,
  PointsInfo,
  PointsRecord,
  ExchangePointsRequest,
  GrowthInfo,
  GrowthRecord,
  WithdrawMethod,
  WithdrawAccount,
  WithdrawBalanceInfo,
  WithdrawRequest,
  WithdrawResponse,
  WithdrawRecord,
  SetPaymentPasswordRequest,
  UpdatePaymentPasswordRequest,
  ResetPaymentPasswordRequest,
  RevenueSummary,
  EarningRecord,
} from './wallet'
