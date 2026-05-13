const BASE = "http://localhost:3000/api/v1";

function token() {
  return uni.getStorageSync("token") || "";
}

async function request(method: string, path: string, data?: any) {
  try {
    const res = await uni.request({
      url: BASE + path,
      method: method as any,
      data,
      header: {
        "Content-Type": "application/json",
        Authorization: token() ? `Bearer ${token()}` : "",
      },
    });
    return (res.data as any).data ?? res.data;
  } catch (e: any) {
    uni.showToast({ title: e.errMsg || "请求失败", icon: "none" });
    throw e;
  }
}

export const api = {
  get: (path: string, data?: any) => request("GET", path, data),
  post: (path: string, data?: any) => request("POST", path, data),
  put: (path: string, data?: any) => request("PUT", path, data),
  delete: (path: string, data?: any) => request("DELETE", path, data),
};

// IM 即时通讯
export const imApi = {
  /** 获取当前用户的 UserSig */
  getUserSig: () => api.post("/im/user-sig"),
  /** 获取指定用户的 UserSig（管理员用） */
  getUserSigFor: (userId: string) => api.post("/im/user-sig", { userId }),
};

// 认证
export const authApi = {
  login: (data: { account: string; password: string }) => api.post("/auth/login/phone", data),
  register: (data: any) => api.post("/auth/register/phone", data),
  getProfile: () => api.get("/auth/me"),
  /** 获取微信 OAuth 授权 URL */
  getWechatOAuthUrl: (redirectUri: string) => api.get("/auth/wechat/oauth-url", { redirectUri }),
  /** 微信登录（H5 OAuth 或小程序） */
  wechatLogin: (data: { code: string; loginType?: string; nickname?: string; avatar?: string; referrerCode?: string }) =>
    api.post("/auth/login/wechat", data),
};

// 内容（圈子文章）
export const contentApi = {
  list: (params?: any) => api.get("/articles", params),
  feed: (params?: any) => api.get("/articles/feed", params),
  detail: (id: string) => api.get(`/articles/${id}`),
  related: (id: string) => api.get(`/articles/${id}/related`),
};

// 编辑内容（管理后台创建的诗词/文章/经典）
export const contentsApi = {
  list: (params?: any) => api.get("/contents", params),
  detail: (id: string) => api.get(`/contents/${id}`),
};

// 课程
export const courseApi = {
  list: (params?: any) => api.get("/courses", params),
  detail: (id: string) => api.get(`/courses/${id}`),
  chapters: (id: string) => api.get(`/courses/${id}/chapters`),
  updateProgress: (chapterId: string, progress: number) => api.put(`/courses/chapters/${chapterId}/progress`, { progress }),
  myProgress: (courseId: string) => api.get(`/courses/${courseId}/progress`),
};

// 圈子
export const circleApi = {
  list: (params?: any) => api.get("/circles", params),
  detail: (id: string) => api.get(`/circles/${id}`),
  join: (id: string) => api.post(`/circles/${id}/join`),
  leave: (id: string) => api.post(`/circles/${id}/leave`),
  posts: (circleId: string, params?: any) => api.get(`/circles/${circleId}/posts`, params),
  createPost: (circleId: string, data: any) => api.post(`/circles/${circleId}/posts`, data),
};

// 互动
export const interactApi = {
  toggleLike: (targetType: string, targetId: string) => api.post("/interaction/like", { targetType, targetId }),
  comments: (targetType: string, targetId: string) => api.get("/interaction/comment", { targetType, targetId }),
  addComment: (data: any) => api.post("/interaction/comment", data),
  toggleCollect: (targetType: string, targetId: string) => api.post("/interaction/collect", { targetType, targetId }),
  myCollects: () => api.get("/interaction/collect"),
  toggleFollow: (followedUserId: string) => api.post("/interaction/follow", { followedUserId }),
};

// 搜索
export const searchApi = {
  search: (q: string, type?: string, extra?: Record<string, any>) =>
    api.get("/search", { q, type, ...extra }),
  hot: () => api.get("/search/hot"),
  history: () => api.get("/search/history"),
  saveHistory: (keyword: string) => api.get("/search/history/save", { keyword }),
  suggest: (keyword: string) => api.get("/search/suggest", { keyword }),
};

// 排盘
export const paipanApi = {
  preview: (data: any) => api.post("/paipan/bazi/preview", data),
  save: (data: any) => api.post("/paipan/bazi", data),
  history: () => api.get("/paipan/bazi"),
  ziweiPreview: (data: any) => api.post("/paipan/ziwei/preview", data),
  ziweiSave: (data: any) => api.post("/paipan/ziwei", data),
  ziweiHistory: () => api.get("/paipan/ziwei"),
  ziweiRecord: (id: string) => api.get(`/paipan/ziwei/${id}`),
};

// 用户（他人主页等）
export const userApi = {
  getProfile: (userId: string) => api.get(`/users/${userId}`),
  getPosts: (userId: string, params?: any) => api.get(`/users/${userId}/posts`, params),
  getArticles: (userId: string, params?: any) => api.get(`/users/${userId}/articles`, params),
};

// 通知
export const notifyApi = {
  list: (params?: { type?: string; page?: number; pageSize?: number }) =>
    api.get("/notifications", params),
  unreadCount: () => api.get("/notifications/unread-count"),
  readAll: () => api.put("/notifications/read-all"),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
};

// 古籍阅读
export const classicApi = {
  books: (params?: any) => api.get("/classic/books", params),
  bookDetail: (id: string) => api.get(`/classic/books/${id}`),
  chapterDetail: (id: string) => api.get(`/classic/chapters/${id}`),
  getProgress: (bookId: string) => api.get(`/classic/progress/${bookId}`),
  updateProgress: (bookId: string, chapterId: string, progress: number) => api.put(`/classic/progress/${bookId}`, { chapterId, progress }),
  bookmarks: (bookId?: string) => api.get("/classic/bookmarks", { bookId }),
  addBookmark: (bookId: string, data: any) => api.post(`/classic/bookmarks/${bookId}`, data),
  deleteBookmark: (id: string) => api.delete(`/classic/bookmarks/${id}`),
};

// 商城
export const shopApi = {
  products: (params?: any) => api.get("/shop/products", params),
  productDetail: (id: string) => api.get(`/shop/products/${id}`),
  createOrder: (data: any) => api.post("/shop/orders", data),
  payOrder: (id: string) => api.put(`/shop/orders/${id}/pay`),
  cancelOrder: (id: string) => api.put(`/shop/orders/${id}/cancel`),
  myOrders: (params?: any) => api.get("/shop/orders/my", params),
  orderDetail: (id: string) => api.get(`/shop/orders/${id}`),
  // 优惠券
  listCoupons: (params?: any) => api.get("/shop/coupons", params),
  claimCoupon: (id: string) => api.post(`/shop/coupons/${id}/claim`),
  myCoupons: () => api.get("/shop/coupons/my"),
  // 商品评价
  listReviews: (productId: string, params?: any) => api.get(`/shop/products/${productId}/reviews`, params),
  createReview: (productId: string, data: any) => api.post(`/shop/products/${productId}/reviews`, data),
  // 物流
  getLogistics: (orderId: string) => api.get(`/shop/orders/${orderId}/logistics`),
};

// 直播
export const liveApi = {
  rooms: (params?: any) => api.get("/live/rooms", params),
  roomDetail: (id: string) => api.get(`/live/rooms/${id}`),
};

// 短视频
export const videoApi = {
  list: (params?: any) => api.get("/videos", params),
  detail: (id: string) => api.get(`/videos/${id}`),
  like: (id: string) => api.post(`/videos/${id}/like`),
  comments: (id: string) => api.get(`/videos/${id}/comments`),
};

// Bot/智能体
export const botApi = {
  list: (params?: { type?: string }) => api.get("/bots", params),
  detail: (id: string) => api.get(`/bots/${id}`),
  chat: (id: string, data: { message: string }) => api.post(`/bots/${id}/chat`, data),
  circleBots: (circleId: string) => api.get(`/bots/circle/${circleId}`),
};

// TTS 语音合成
export const ttsApi = {
  voices: () => api.get("/tts/voices"),
  /** 返回音频 URL（GET 方式，可直接作为 audio src） */
  audioUrl: (text: string, voice?: string, rate?: string) => {
    const params = new URLSearchParams({ text: text.slice(0, 500) })
    if (voice) params.set("voice", voice)
    if (rate) params.set("rate", rate)
    return `${BASE}/tts/synthesize?${params.toString()}`
  },
};

// 分佣/分站
export const commissionApi = {
  /** 分站收益列表 */
  earnings: (stationId: string, params?: { page?: number; pageSize?: number }) =>
    api.get(`/commission/station-earnings/${stationId}`, params),
  /** 分站余额 */
  balance: (stationId: string) => api.get(`/commission/station-balance/${stationId}`),
  /** 申请提现 */
  applyWithdrawal: (data: { amount: number; alipayAccount?: string; bankName?: string; bankAccount?: string; bankHolder?: string; stationId?: string }) =>
    api.post("/commission/withdrawal", data),
  /** 提现记录 */
  withdrawals: (params?: { page?: number; pageSize?: number }) =>
    api.get("/commission/withdrawals", params),
  /** 创建推荐链接 */
  createReferralLink: (data: { targetType: string; targetId: string; channel?: string }) =>
    api.post("/commission/referral-link", data),
  /** 我的推荐链接 */
  referralLinks: () => api.get("/commission/referral-links"),
};

// 系统配置（公开）
export const systemApi = {
  getBanners: () => api.get("/system/public/banners"),
};

// ==================== 虚拟币钱包 ====================
export const coinApi = {
  /** 获取余额 */
  getBalance: () => api.get("/coin/balance"),
  /** 交易记录（分页） */
  getTransactions: (page: number, pageSize: number, type?: string, scene?: string) =>
    api.get("/coin/transactions", { page, pageSize, type, scene }),
  /** 充值档位 */
  getTiers: () => api.get("/coin/tiers"),
  /** 消费虚拟币 */
  spend: (data: { amountCoin: number; scene: string; refId?: string; description?: string }) =>
    api.post("/coin/spend", data),
};

// 分站品牌
export const stationApi = {
  /** 通过推广码获取品牌配置 */
  getBrand: (code: string) => api.get(`/station/brand/${code}`),
  /** 分站收益明细（分页） */
  getEarnings: (stationId: string, page?: number, pageSize?: number) =>
    api.get(`/station/${stationId}/earnings`, { page, pageSize }),
};

// 付费问答
export const questionApi = {
  /** 圈子问答列表 */
  list: (params?: { circleId?: string; status?: string; page?: number; pageSize?: number }) =>
    api.get("/question", params),
  /** 问答详情 */
  detail: (id: string) => api.get(`/question/${id}`),
  /** 发起提问 */
  ask: (data: { circleId: string; answererId: string; question: string; priceCoin: number; peekPriceCoin?: number }) =>
    api.post("/question/ask", data),
  /** 回答提问 */
  answer: (id: string, data: { answer: string }) => api.post(`/question/${id}/answer`, data),
  /** 围观答案 */
  peek: (id: string) => api.post(`/question/${id}/peek`),
};

// ==================== 短信验证码 ====================
export const smsApi = {
  /** 发送短信验证码 */
  send: (phone: string, scene: string) => api.post("/sms/send", { phone, scene }),
  /** 校验短信验证码 */
  verify: (phone: string, code: string, scene: string) => api.post("/sms/verify", { phone, code, scene }),
};

// ==================== 文件上传 ====================
export const uploadApi = {
  /** 上传单张图片 */
  image: (filePath: string) =>
    new Promise((resolve, reject) => {
      uni.uploadFile({
        url: BASE + "/upload/image",
        filePath,
        name: "file",
        header: { Authorization: token() ? `Bearer ${token()}` : "" },
        success: (res) => resolve(JSON.parse(res.data)),
        fail: reject,
      });
    }),
  /** 上传多张图片 */
  images: (filePaths: string[]) =>
    Promise.all(filePaths.map((p) => uploadApi.image(p))),
  /** 上传音频 */
  audio: (filePath: string) =>
    new Promise((resolve, reject) => {
      uni.uploadFile({
        url: BASE + "/upload/audio",
        filePath,
        name: "file",
        header: { Authorization: token() ? `Bearer ${token()}` : "" },
        success: (res) => resolve(JSON.parse(res.data)),
        fail: reject,
      });
    }),
};

// ==================== 电子书 ====================
export const ebookApi = {
  categories: () => api.get("/ebook/categories"),
  books: (params?: any) => api.get("/ebook/books", params),
  detail: (id: string) => api.get(`/ebook/books/${id}`),
  chapter: (id: string) => api.get(`/ebook/chapters/${id}`),
  /** 购买电子书 */
  purchase: (ebookId: string) => api.post(`/ebook/purchase/${ebookId}`),
  /** 已购列表 */
  purchases: () => api.get("/ebook/purchases"),
  /** 阅读进度 */
  getProgress: (ebookId: string) => api.get(`/ebook/progress/${ebookId}`),
  updateProgress: (ebookId: string, chapterId: string, progress: number) =>
    api.put(`/ebook/progress/${ebookId}`, { chapterId, progress }),
  /** 书签 */
  bookmarks: (ebookId?: string) => api.get("/ebook/bookmarks", { ebookId }),
  addBookmark: (ebookId: string, data: { chapterId: string; position: number; note?: string }) =>
    api.post(`/ebook/bookmarks/${ebookId}`, data),
  deleteBookmark: (id: string) => api.delete(`/ebook/bookmarks/${id}`),
  /** 笔记 */
  notes: (params?: any) => api.get("/ebook/notes", params),
  addNote: (ebookId: string, data: { chapterId: string; content: string; position?: number }) =>
    api.post(`/ebook/notes/${ebookId}`, data),
  updateNote: (id: string, data: { content: string }) => api.put(`/ebook/notes/${id}`, data),
  deleteNote: (id: string) => api.delete(`/ebook/notes/${id}`),
  /** 文言文翻译 */
  translate: (text: string) => api.post("/ebook/translate", { text }),
  /** 字词查询 */
  lookup: (char: string) => api.post("/ebook/lookup", { char }),
};

// ==================== 内容举报 ====================
export const reportApi = {
  /** 举报内容 */
  report: (data: { targetType: string; targetId: string; reason: string; description?: string }) =>
    api.post("/audit/reports", data),
  /** 查看举报统计 */
  stats: (type: string, id: string) => api.get(`/audit/reports/stats/${type}/${id}`),
};

// ==================== 首页推荐 ====================
export const recommendApi = {
  /** 场景推荐（首页/课程页/圈子页等） */
  getScene: (scene: string, params?: { page?: number; pageSize?: number }) =>
    api.get(`/recommend/${scene}`, params),
  /** 个性化推荐 */
  personalized: (params?: { page?: number; pageSize?: number }) =>
    api.get("/recommend/personalized", params),
  /** 热门趋势 */
  trending: (params?: { page?: number; pageSize?: number }) =>
    api.get("/recommend/trending", params),
  /** 相关内容推荐 */
  related: (contentId: string) => api.get(`/recommend/related/${contentId}`),
  /** 上报用户行为（点击/曝光/时长） */
  log: (data: { scene: string; action: string; contentId?: string; duration?: number }) =>
    api.post("/recommend/log", data),
  /** 默认兴趣标签 */
  defaultInterests: () => api.get("/recommend/interests/defaults"),
  /** 设置兴趣标签 */
  setInterests: (interestIds: string[]) => api.post("/recommend/interests", { interestIds }),
};

// ==================== 直播（增强） ====================
export const liveRoomApi = {
  /** 获取推流/播放地址 */
  getStreamUrls: (roomId: string) => api.get(`/live/rooms/${roomId}/stream-urls`),
  /** 获取播放地址 */
  getPlayUrl: (roomId: string) => api.get(`/live/rooms/${roomId}/play-url`),
  /** 预约直播 */
  book: (roomId: string) => api.post(`/live/rooms/${roomId}/book`),
  /** 取消预约 */
  unbook: (roomId: string) => api.delete(`/live/rooms/${roomId}/book`),
  /** 我的预约 */
  bookings: (roomId: string) => api.get(`/live/rooms/${roomId}/bookings`),
  /** 日程列表 */
  scheduled: () => api.get("/live/scheduled"),
  /** 获取连麦列表 */
  getMics: (roomId: string) => api.get(`/live/rooms/${roomId}/mics`),
  /** 申请连麦 */
  applyMic: (roomId: string) => api.post(`/live/rooms/${roomId}/mics`),
  /** 取消连麦 */
  cancelMic: (roomId: string) => api.delete(`/live/rooms/${roomId}/mics/${""}`),
  /** 直播间秒杀列表 */
  getFlashSales: (roomId: string) => api.get(`/live/rooms/${roomId}/flash-sales`),
  /** 秒杀下单 */
  flashSaleOrder: (saleId: string) => api.post(`/live/flash-sales/${saleId}/order`),
};

// ==================== 线下驿站 ====================
export const offlineApi = {
  /** 驿站列表 */
  stations: (params?: any) => api.get("/offline/stations", params),
  /** 发现附近驿站 */
  discover: (params?: { lat?: number; lng?: number; radius?: number }) =>
    api.get("/offline/stations/discover", params),
  /** 驿站详情 */
  stationDetail: (id: string) => api.get(`/offline/stations/${id}`),
  /** 线下课程列表 */
  courses: (params?: any) => api.get("/offline/courses", params),
};

// ==================== 研究院 ====================
export const instituteApi = {
  /** 申请成为讲师 */
  apply: (data: any) => api.post("/institute/members", data),
  /** 我的申请状态 */
  myStatus: () => api.get("/institute/my"),
  /** 讲师列表 */
  members: (params?: any) => api.get("/institute/members", params),
  /** 讲师详情 */
  memberDetail: (id: string) => api.get(`/institute/members/${id}`),
  /** 候选讲师 */
  candidates: () => api.get("/institute/candidates"),
  /** 领取任务 */
  acceptTask: (memberId: string, data: any) => api.post(`/institute/members/${memberId}/tasks`, data),
  /** 完成任务 */
  completeTask: (taskId: string) => api.post(`/institute/tasks/${taskId}/complete`),
  /** 活动列表 */
  events: (params?: any) => api.get("/institute/events", params),
};

// ==================== 系统配置（增强） ====================
export const homeApi = {
  /** 首页配置 */
  getConfig: () => api.get("/system/public/home-config"),
  /** 会员套餐列表 */
  memberConfigs: () => api.get("/system/member-configs"),
  /** 站点公告 */
  siteNotices: () => api.get("/system/site-notices"),
};

// ==================== 营销活动 ====================
export const marketingApi = {
  /** 秒杀列表 */
  flashSales: (params?: { page?: number; pageSize?: number }) =>
    api.get("/marketing/flash-sales", params),
  /** 秒杀详情 */
  flashSaleDetail: (id: string) => api.get(`/marketing/flash-sales/${id}`),
  /** 拼团列表 */
  groupBuys: (params?: { page?: number; pageSize?: number }) =>
    api.get("/marketing/group-buys", params),
  /** 拼团详情 */
  groupBuyDetail: (id: string) => api.get(`/marketing/group-buys/${id}`),
  /** 发起拼团 */
  joinGroupBuy: (groupBuyId: string, data?: { groupId?: string }) =>
    api.post(`/marketing/group-buys/${groupBuyId}/join`, data),
  /** 我的拼团 */
  myGroupBuys: () => api.get("/marketing/group-buys/my"),
  /** 折扣活动列表 */
  discounts: () => api.get("/marketing/discounts"),
  /** 营销页面 */
  pageByRoute: (route: string) => api.get(`/marketing/pages/${encodeURIComponent(route)}`),
};

// ==================== AI 智能体增强 ====================
export const aiApi = {
  /** 智能推荐流 */
  smartFeed: (params?: { page?: number; pageSize?: number; scene?: string }) =>
    api.get("/recommend/smart-feed", params),
  /** 经典问答 */
  classicQA: (classicId: string, question: string) =>
    api.post(`/classic/${classicId}/qa`, { question }),
  /** 经典问答历史 */
  classicQAHistory: (classicId: string) => api.get(`/classic/${classicId}/qa`),
  /** 圈子智能助手 */
  circleAssistant: (circleId: string, message: string) =>
    api.post(`/circles/${circleId}/assistant`, { message }),
  /** AI 翻译 */
  translate: (text: string, from?: string, to?: string) =>
    api.post("/ai/translate", { text, from, to }),
  /** AI 搜索 */
  aiSearch: (query: string) => api.post("/search/ai", { query }),
};

// ==================== 会员系统 ====================
export const memberApi = {
  /** 会员套餐列表 */
  plans: () => api.get("/member/plans"),
  /** 购买会员 */
  purchase: (planId: string, data?: { couponId?: string }) =>
    api.post(`/member/purchase/${planId}`, data),
  /** 我的会员状态 */
  myStatus: () => api.get("/member/status"),
  /** 续费 */
  renew: (planId: string) => api.post(`/member/renew/${planId}`),
  /** 权益列表 */
  myBenefits: () => api.get("/member/benefits"),
};

// ==================== 同城发现 ====================
export const sameCityApi = {
  /** 同城内容推荐 */
  feed: (params?: { lat?: number; lng?: number; radius?: number; page?: number }) =>
    api.get("/recommend/same_city", params),
  /** 附近的人 */
  nearbyUsers: (params?: { lat?: number; lng?: number; radius?: number }) =>
    api.get("/interaction/nearby", params),
};

export default api;
