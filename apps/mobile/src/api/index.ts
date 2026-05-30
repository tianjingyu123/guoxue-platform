const BASE = "/api/v1";

function token() {
  return uni.getStorageSync("token") || "";
}
function refreshTok() {
  return uni.getStorageSync("refreshToken") || "";
}

let refreshing = false;
let refreshPromise: Promise<any> | null = null;

async function request(method: string, path: string, data?: any, retry = true) {
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
    const status = res.statusCode;
    // 401 且非刷新/登录接口 → 尝试刷新 token
    if (status === 401 && retry && !path.includes("/auth/refresh") && !path.includes("/auth/login")) {
      const rt = refreshTok();
      if (rt) {
        // 防止并发刷新
        if (!refreshing) {
          refreshing = true;
          refreshPromise = (async () => {
            try {
              const refreshRes = (await uni.request({
                url: BASE + "/auth/refresh",
                method: "POST",
                data: { refreshToken: rt },
                header: { "Content-Type": "application/json" },
              })) as any;
              const body = refreshRes.data?.data ?? refreshRes.data;
              if (body?.accessToken) {
                uni.setStorageSync("token", body.accessToken);
                if (body.refreshToken) uni.setStorageSync("refreshToken", body.refreshToken);
                return body;
              }
              throw new Error("refresh failed");
            } finally {
              refreshing = false;
              refreshPromise = null;
            }
          })();
        }
        try {
          await refreshPromise;
          // token 刷新成功，重试原请求
          return request(method, path, data, false);
        } catch {
          // 刷新失败，清除登录态
          uni.removeStorageSync("token");
          uni.removeStorageSync("refreshToken");
        }
      }
    }
    const payload = (res.data as any).data ?? res.data;
    // 自动提取列表数据：若 payload 包含分页字段+单个数组，直接返回数组
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const hasPaging = "total" in payload || "page" in payload || "pageSize" in payload;
      const arrayKeys = Object.keys(payload).filter((k) => Array.isArray(payload[k]));
      if (hasPaging && arrayKeys.length === 1) return payload[arrayKeys[0]];
    }
    return payload;
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
  /** 更新IM个人资料 */
  updateProfile: (userId: string, data: { nickname?: string; avatar?: string }) =>
    api.post(`/im/account/${userId}/profile`, data),
  /** 查询用户在线状态 */
  queryAccountState: (userIds: string) =>
    api.get("/im/account/state", { params: { userIds } }),
  // 单聊消息
  sendC2CMsg: (toUserId: string, text: string) =>
    api.post("/im/c2c/send", { toUserId, text }),
  getC2CHistory: (toUserId: string, count?: number) =>
    api.get("/im/c2c/history", { params: { toUserId, count } }),
  withdrawMsg: (toUserId: string, msgKey: string) =>
    api.post("/im/msg/withdraw", { toUserId, msgKey }),
  // 好友管理
  addFriend: (toUserId: string, remark?: string) =>
    api.post("/im/friends", { toUserId, remark }),
  deleteFriend: (toUserId: string) =>
    api.delete(`/im/friends/${toUserId}`),
  getFriendList: () => api.get("/im/friends"),
  approveFriendRequest: (toUserId: string) =>
    api.post("/im/friends/approve", { toUserId }),
  rejectFriendRequest: (toUserId: string) =>
    api.post("/im/friends/reject", { toUserId }),
  listPendingFriendRequests: () => api.get("/im/friends/pending"),
  // 黑名单
  addBlacklist: (toUserId: string) =>
    api.post("/im/blacklist", { toUserId }),
  removeBlacklist: (toUserId: string) =>
    api.post("/im/blacklist/remove", { toUserId }),
  getBlacklist: () => api.get("/im/blacklist"),
  // 群组
  getGroupInfo: (groupId: string) => api.get(`/im/groups/${groupId}/detail`),
  getGroupMembers: (groupId: string) => api.get(`/im/groups/${groupId}/members`),
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
  /** 发送短信验证码 */
  sendCode: (phone: string, scene = "LOGIN") => api.post("/auth/sms/send", { phone, scene }),
  smsLogin: (data: { phone: string; code: string }) => api.post("/auth/login/sms", data),
  miniPhoneLogin: (data: { code: string }) => api.post("/auth/login/mini-phone", data),
  refreshToken: (refreshToken: string) => api.post("/auth/refresh", { refreshToken }),
  updateProfile: (data: any) => api.put("/auth/profile", data),
  changePassword: (data: { oldPassword: string; newPassword: string }) => api.put("/auth/password", data),
  /** 申请注销账号（7天冷静期） */
  deleteAccount: (data: { password: string; reason?: string }) => api.post("/auth/delete-account", data),
  /** 查询注销申请状态 */
  getDeleteAccountStatus: () => api.get("/auth/delete-account/status"),
  /** 撤销注销申请 */
  cancelDeleteAccount: () => api.post("/auth/delete-account/cancel"),
  /** 更换绑定手机号 */
  changePhone: (data: { oldCode: string; newPhone: string; newCode: string }) => api.put("/auth/phone", data),
};

// 内容（圈子文章）
export const contentApi = {
  list: (params?: any) => api.get("/articles", params),
  feed: (params?: any) => api.get("/articles/feed", params),
  detail: (id: string) => api.get(`/articles/${id}`),
  related: (id: string) => api.get(`/articles/${id}/related`),
  create: (circleId: string, data: any) => api.post(`/articles/circles/${circleId}`, data),
  update: (id: string, data: any) => api.put(`/articles/${id}`, data),
  delete: (id: string) => api.delete(`/articles/${id}`),
  // 推荐
  addRecommend: (articleId: string, data: any) => api.post(`/articles/${articleId}/recommends`, data),
  removeRecommend: (articleId: string, recId: string) => api.delete(`/articles/${articleId}/recommends/${recId}`),
  // 草稿
  drafts: (params?: any) => api.get("/articles/drafts", params),
  saveDraft: (data: any) => api.post("/articles/drafts", data),
  updateDraft: (id: string, data: any) => api.put(`/articles/drafts/${id}`, data),
  deleteDraft: (id: string) => api.delete(`/articles/drafts/${id}`),
  publishDraft: (id: string) => api.post(`/articles/drafts/${id}/publish`),
};

// 编辑内容（管理后台创建的诗词/文章/经典）
export const contentsApi = {
  list: (params?: any) => api.get("/contents", params),
  detail: (id: string) => api.get(`/contents/${id}`),
  randomPoem: () => api.get("/contents/poem/random"),
  dailyPoem: () => api.get("/contents/poem/daily"),
  poemAppreciation: (id: string) => api.get(`/contents/poem/${id}/appreciation`),
};

// 课程
export const courseApi = {
  list: (params?: any) => api.get("/courses", params),
  detail: (id: string) => api.get(`/courses/${id}`),
  chapters: (id: string) => api.get(`/courses/${id}/chapters`),
  chapterContent: (chapterId: string) => api.get(`/courses/chapters/${chapterId}/content`),
  updateProgress: (chapterId: string, progress: number) => api.put(`/courses/chapters/${chapterId}/progress`, { progress }),
  myProgress: (courseId: string) => api.get(`/courses/${courseId}/progress`),
  myCourses: (page?: number, pageSize?: number) => api.get("/courses/my", { page, pageSize }),
  dashboard: () => api.get("/courses/dashboard"),
  purchase: (id: string, data?: any) => api.post(`/courses/${id}/purchase`, data),
  checkAccess: (id: string) => api.get(`/courses/${id}/access`),
  checkExpiry: (id: string) => api.get(`/courses/${id}/expiry-check`),
  submitWork: (chapterId: string, content: string, images?: string[]) => api.post(`/courses/chapters/${chapterId}/works`, { content, images }),
  getWorks: (courseId: string, chapterId?: string) => api.get(`/courses/${courseId}/works`, { chapterId }),
  createReview: (courseId: string, data: { rating: number; content: string; orderId?: string }) => api.post(`/courses/${courseId}/reviews`, data),
  getReviews: (courseId: string, page?: number, pageSize?: number) => api.get(`/courses/${courseId}/reviews`, { page, pageSize }),
  getRating: (courseId: string) => api.get(`/courses/${courseId}/rating`),
  related: (courseId: string, limit?: number, useAi?: boolean) => api.get(`/courses/${courseId}/related`, { limit, useAi: useAi ? 'true' : 'false' }),
  complete: (courseId: string) => api.post(`/courses/${courseId}/complete`),
  certificate: (courseId: string) => api.get(`/courses/${courseId}/certificate`),
  // 问答
  askQuestion: (courseId: string, data: { question: string; chapterId?: string }) => api.post(`/courses/${courseId}/questions`, data),
  getQuestions: (courseId: string, params?: any) => api.get(`/courses/${courseId}/questions`, params),
  getMyQuestions: (courseId: string, page?: number) => api.get(`/courses/${courseId}/questions/my`, { page }),
  closeQuestion: (qaId: string) => api.put(`/courses/questions/${qaId}/close`),
  // 分类
  getCategories: () => api.get("/courses/categories"),
  getLiveRooms: (id: string) => api.get(`/courses/${id}/live-rooms`),
  // 有效期内课程
  getUserValidCourses: () => api.get("/courses/user/valid"),
  // 问答标签
  getQuestionTags: (courseId: string) => api.get(`/courses/${courseId}/questions/tags`),
  // 讲师统计
  getCourseStats: (courseId: string) => api.get(`/courses/${courseId}/stats`),
  // 草稿
  getDrafts: (page = 1, pageSize = 20) => api.get("/courses/drafts", { page, pageSize }),
  saveDraft: (data: any) => api.post("/courses/drafts", data),
  updateDraft: (id: string, data: any) => api.put(`/courses/drafts/${id}`, data),
  deleteDraft: (id: string) => api.delete(`/courses/drafts/${id}`),
  publishDraft: (id: string) => api.post(`/courses/drafts/${id}/publish`),
};

// 圈子
export const circleApi = {
  // 圈子 CRUD
  create: (data: any) => api.post("/circles", data),
  list: (params?: any) => api.get("/circles", params),
  my: () => api.get("/circles/my"),
  detail: (id: string) => api.get(`/circles/${id}`),
  update: (id: string, data: any) => api.put(`/circles/${id}`, data),
  join: (id: string) => api.post(`/circles/${id}/join`),
  leave: (id: string) => api.post(`/circles/${id}/leave`),
  // 成员
  listMembers: (circleId: string, page = 1, pageSize = 20) => api.get(`/circles/${circleId}/members`, { page, pageSize }),
  updateMemberRole: (circleId: string, userId: string, data: { role: string }) => api.put(`/circles/${circleId}/members/${userId}/role`, data),
  removeMember: (circleId: string, userId: string) => api.delete(`/circles/${circleId}/members/${userId}`),
  // 帖子
  posts: (circleId: string, params?: any) => api.get(`/circles/${circleId}/posts`, params),
  createPost: (circleId: string, data: any) => api.post(`/circles/${circleId}/posts`, data),
  getPostDetail: (circleId: string, postId: string) => api.get(`/circles/${circleId}/posts/${postId}`),
  updatePost: (circleId: string, postId: string, data: any) => api.put(`/circles/${circleId}/posts/${postId}`, data),
  deletePost: (circleId: string, postId: string) => api.delete(`/circles/${circleId}/posts/${postId}`),
  // 草稿
  getDrafts: (page = 1, pageSize = 20) => api.get("/circles/drafts", { page, pageSize }),
  publishPost: (circleId: string, postId: string) => api.post(`/circles/${circleId}/posts/${postId}/publish`),
  // 精华/置顶
  toggleEssence: (circleId: string, postId: string) => api.post(`/circles/${circleId}/posts/${postId}/essence`),
  toggleTop: (circleId: string, postId: string) => api.post(`/circles/${circleId}/posts/${postId}/top`),
  // 付费入圈
  prepareJoin: (circleId: string, data?: any) => api.post(`/circles/${circleId}/join/prepare`, data),
  confirmJoin: (circleId: string, data?: any) => api.post(`/circles/${circleId}/join/confirm`, data),
  getJoinStatus: (circleId: string) => api.get(`/circles/${circleId}/join/status`),
  renew: (circleId: string, data?: any) => api.post(`/circles/${circleId}/renew`, data),
  // 公告
  getAnnouncement: (circleId: string) => api.get(`/circles/${circleId}/announcement`),
  setAnnouncement: (circleId: string, content: string, isTop?: boolean) => api.put(`/circles/${circleId}/announcement`, { content, isTop }),
  listAnnouncements: (circleId: string, page = 1, pageSize = 20) => api.get(`/circles/${circleId}/announcements`, { page, pageSize }),
  deleteAnnouncement: (circleId: string, announcementId: string) => api.delete(`/circles/${circleId}/announcement/${announcementId}`),
  // 邀请
  generateInviteCode: (circleId: string, maxUses?: number) => api.post(`/circles/${circleId}/invite-code`, { maxUses }),
  joinByInviteCode: (code: string) => api.post("/circles/join-by-code", { code }),
  listMyInviteCodes: (circleId: string) => api.get(`/circles/${circleId}/invite-codes`),
  getInvitationStats: (circleId: string) => api.get(`/circles/${circleId}/invitation-stats`),
  // 达人
  getExperts: (circleId: string) => api.get(`/circles/${circleId}/experts`),
  getExpertConfig: (circleId: string, userId: string) => api.get(`/circles/${circleId}/expert/${userId}`),
  setExpertConfig: (circleId: string, data: any) => api.post(`/circles/${circleId}/expert/config`, data),
  // 排行
  getRanking: (page = 1, pageSize = 20, sortBy?: string) => api.get("/circles/ranking", { page, pageSize, sortBy }),
};

// 圈主仪表盘
export const circleDashboardApi = {
  overview: (circleId: string) => api.get(`/circles/${circleId}/dashboard/overview`),
  trends: (circleId: string) => api.get(`/circles/${circleId}/dashboard/trends`),
  revenueBreakdown: (circleId: string) => api.get(`/circles/${circleId}/dashboard/revenue-breakdown`),
  topContributors: (circleId: string) => api.get(`/circles/${circleId}/dashboard/top-contributors`),
  hotContent: (circleId: string) => api.get(`/circles/${circleId}/dashboard/hot-content`),
  recentMembers: (circleId: string) => api.get(`/circles/${circleId}/dashboard/recent-members`),
  churnWarning: (circleId: string) => api.get(`/circles/${circleId}/dashboard/churn-warning`),
  pendingQuestions: (circleId: string) => api.get(`/circles/${circleId}/dashboard/pending-questions`),
};

// 互动
export const interactApi = {
  toggleLike: (targetType: string, targetId: string) => api.post("/interaction/like", { targetType, targetId }),
  checkLiked: (targetType: string, targetIds: string[]) =>
    api.get("/interaction/like/check", { params: { targetType, targetIds: targetIds.join(",") } }),
  likeCount: (targetType: string, targetId: string) =>
    api.get("/interaction/like/count", { params: { targetType, targetId } }),
  myLikes: (page?: number, pageSize?: number) =>
    api.get("/interaction/likes/my", { params: { page, pageSize } }),
  comments: (targetType: string, targetId: string) => api.get("/interaction/comment", { targetType, targetId }),
  addComment: (data: any) => api.post("/interaction/comment", data),
  deleteComment: (id: string) => api.delete(`/interaction/comment/${id}`),
  toggleCollect: (targetType: string, targetId: string) => api.post("/interaction/collect", { targetType, targetId }),
  myCollects: () => api.get("/interaction/collect"),
  toggleFollow: (followedUserId: string) => api.post("/interaction/follow", { followedUserId }),
  getFollowers: (userId: string, page?: number, pageSize?: number) =>
    api.get(`/interaction/followers/${userId}`, { params: { page, pageSize } }),
  getFollowing: (userId: string, page?: number, pageSize?: number) =>
    api.get(`/interaction/following/${userId}`, { params: { page, pageSize } }),
};

// 搜索
export const searchApi = {
  search: (q: string, type?: string, extra?: Record<string, any>) =>
    api.get("/search", { q, type, ...extra }),
  hot: () => api.get("/search/hot"),
  history: () => api.get("/search/history"),
  saveHistory: (keyword: string) => api.get("/search/history/save", { keyword }),
  suggest: (keyword: string) => api.get("/search/suggest", { keyword }),
  clearHistory: () => api.delete("/search/history"),
  semanticSearch: (q: string, topK?: number) =>
    api.get("/search/semantic", { q, topK }),
  suggestSimilar: (q: string) => api.get("/search/semantic/suggest", { q }),
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
  updateProfile: (data: any) => api.put("/users/profile", data),
  follow: (userId: string) => api.post(`/users/${userId}/follow`),
  unfollow: (userId: string) => api.delete(`/users/${userId}/follow`),
  getStats: (userId: string) => api.get(`/users/${userId}/stats`),
  getPurchases: (userId: string, params?: any) => api.get(`/users/${userId}/purchases`, { params }),
  getFollowers: (userId: string, params?: any) => api.get(`/users/${userId}/followers`, { params }),
  getFollowing: (userId: string, params?: any) => api.get(`/users/${userId}/following`, { params }),
  isFollowing: (userId: string) => api.get(`/users/${userId}/is-following`),
  setPaymentPassword: (data: { password: string }) => api.post("/users/me/payment-password", data),
  updatePaymentPassword: (data: { oldPassword: string; newPassword: string }) => api.post("/users/me/payment-password/update", data),
  verifyPaymentPassword: (password: string) => api.post("/users/me/payment-password/verify", { password }),
  resetPaymentPassword: (data: { phone: string; code: string; newPassword: string }) => api.post("/users/me/payment-password/reset", data),
  getPoints: () => api.get("/users/me/points"),
  getPointsRecords: (params?: any) => api.get("/users/me/points/records", { params }),
  getGrowth: () => api.get("/users/me/growth"),
  getGrowthRecords: (params?: any) => api.get("/users/me/growth/records", { params }),
  exchangePoints: (data: any) => api.post("/users/me/points/exchange", data),
  /** 青少年模式 */
  getTeenMode: () => api.get("/users/me/teen-mode"),
  updateTeenMode: (data: { enabled: boolean; dailyLimitMinutes?: number; blockStartHour?: number; blockEndHour?: number; contentFilter?: string; guardianPassword?: string }) => api.put("/users/me/teen-mode", data),
};

// 浏览历史
export const browseHistoryApi = {
  list: (params?: { page?: number; pageSize?: number; targetType?: string }) => api.get("/users/me/history", params),
  remove: (id: string) => api.delete(`/users/me/history/${id}`),
  clearAll: () => api.delete("/users/me/history"),
};

// 签到
export const checkinApi = {
  checkIn: () => api.post("/users/me/checkin"),
  getStatus: () => api.get("/users/me/checkin/status"),
  getCalendar: (year: number, month: number) => api.get("/users/me/checkin/calendar", { year, month }),
  getDailyTasks: () => api.get("/users/me/tasks/daily"),
  completeTask: (taskId: string) => api.post(`/users/me/tasks/${taskId}/complete`),
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
  myProgress: () => api.get("/classic/my-progress"),
  continueReading: (limit = 10) => api.get("/classic/continue-reading", { limit }),
  getProgress: (bookId: string) => api.get(`/classic/progress/${bookId}`),
  updateProgress: (bookId: string, chapterId: string, progress: number) => api.put(`/classic/progress/${bookId}`, { chapterId, progress }),
  bookmarks: (bookId?: string) => api.get("/classic/bookmarks", { bookId }),
  addBookmark: (bookId: string, data: any) => api.post(`/classic/bookmarks/${bookId}`, data),
  deleteBookmark: (id: string) => api.delete(`/classic/bookmarks/${id}`),
  // 读书笔记
  listNotes: (params?: { bookId?: string; chapterId?: string }) => api.get("/classic/notes", params),
  createNote: (bookId: string, data: { chapterId: string; content: string }) => api.post(`/classic/notes/${bookId}`, data),
  updateNote: (id: string, content: string) => api.put(`/classic/notes/${id}`, { content }),
  deleteNote: (id: string) => api.delete(`/classic/notes/${id}`),
  // 书签
  updateBookmark: (id: string, data: any) => api.put(`/classic/bookmarks/${id}`, data),
  // AI 工具
  dictionaryLookup: (word: string) => api.post("/classic/dictionary/lookup", { word }),
  translateClassical: (text: string, context?: string) => api.post("/classic/translate", { text, context }),
  // 注疏
  getAnnotations: (bookId: string, chapterId?: string, page = 1, pageSize = 20) => api.get(`/classic/books/${bookId}/annotations`, { chapterId, page, pageSize }),
  // 版本
  getVersions: (bookId: string) => api.get(`/classic/books/${bookId}/versions`),
  // 引用
  getCitation: (bookId: string, style = "gbt7714", chapterId?: string, startPos?: number, endPos?: number) => api.get(`/classic/books/${bookId}/cite`, { style, chapterId, startPos, endPos }),
  // 分段加载
  getChapterSlice: (chapterId: string, start = 0, end = 2000) => api.get(`/classic/chapters/${chapterId}/content`, { start, end }),
  // 下载
  generateDownloadUrl: (bookId: string) => api.get(`/classic/books/${bookId}/download`),
  getDownloads: (page = 1, pageSize = 20) => api.get("/classic/downloads", { page, pageSize }),
  // 阅读统计
  getReadingStats: () => api.get("/classic/reading-stats"),
};

// 商城
export const shopApi = {
  products: (params?: any) => api.get("/shop/products", params),
  productDetail: (id: string) => api.get(`/shop/products/${id}`),
  createOrder: (data: any) => api.post("/shop/orders", data),
  /** JSAPI支付（小程序/公众号内支付，需传 openid） */
  jsapiPay: (id: string, data: { openid: string; notifyUrl?: string }) => api.post(`/shop/orders/${id}/pay/jsapi`, data),
  /** Native扫码支付（PC端二维码） */
  nativePay: (id: string, data?: { notifyUrl?: string }) => api.post(`/shop/orders/${id}/pay/native`, data),
  /** 通用支付（自动选择支付方式） */
  payOrder: (id: string) => api.post(`/shop/orders/${id}/pay/native`, {}),
  /** 查询订单支付状态 */
  queryPaymentStatus: (id: string) => api.get(`/shop/orders/${id}/payment-status`),
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
  // 收货地址
  listAddresses: () => api.get("/shop/addresses"),
  createAddress: (data: any) => api.post("/shop/addresses", data),
  updateAddress: (id: string, data: any) => api.put(`/shop/addresses/${id}`, data),
  deleteAddress: (id: string) => api.delete(`/shop/addresses/${id}`),
  setDefaultAddress: (id: string) => api.put(`/shop/addresses/${id}/default`),
  // 售后
  applyAfterSale: (orderId: string, data: { type: string; reason: string; amount?: number }) => api.post(`/shop/orders/${orderId}/after-sale`, data),
  myAfterSales: (params?: { page?: number; pageSize?: number }) => api.get("/shop/after-sales", params),
  afterSaleDetail: (id: string) => api.get(`/shop/after-sales/${id}`),
  cancelAfterSale: (id: string) => api.put(`/shop/after-sales/${id}/cancel`),
  // 购物车（Redis后端）
  getCart: () => api.get("/shop/cart"),
  addToCart: (data: { productId: string; skuId?: string; quantity?: number }) => api.post("/shop/cart", data),
  updateCartItem: (id: string, data: { quantity: number }) => api.put(`/shop/cart/${id}`, data),
  removeCartItem: (id: string) => api.delete(`/shop/cart/${id}`),
  clearCart: () => api.delete("/shop/cart"),
  // 商品分类
  categoryTree: () => api.get("/shop/categories/tree"),
  categoryProducts: (id: string, params?: { page?: number; pageSize?: number }) => api.get(`/shop/categories/${id}/products`, params),
  // 公开物流轨迹查询
  trackLogistics: (no: string, company?: string) => api.get("/shop/logistics/track", { no, company }),
};

// 直播
export const liveApi = {
  rooms: (params?: any) => api.get("/live/rooms", params),
  roomDetail: (id: string) => api.get(`/live/rooms/${id}`),
  createRoom: (data: any) => api.post("/live/rooms", data),
  updateRoom: (id: string, data: any) => api.put(`/live/rooms/${id}`, data),
  deleteRoom: (id: string) => api.delete(`/live/rooms/${id}`),
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
  /** 获取预约人数 */
  bookings: (roomId: string) => api.get(`/live/rooms/${roomId}/bookings`),
  /** 日程列表 */
  scheduled: () => api.get("/live/scheduled"),
  /** 获取连麦列表 */
  getMics: (roomId: string) => api.get(`/live/rooms/${roomId}/mics`),
  /** 申请连麦 */
  applyMic: (roomId: string, data: { position: number }) => api.post(`/live/rooms/${roomId}/mics`, data),
  /** 取消连麦 */
  cancelMic: (roomId: string, userId: string) => api.delete(`/live/rooms/${roomId}/mics/${userId}`),
  /** 直播间秒杀列表 */
  getFlashSales: (roomId: string) => api.get(`/live/rooms/${roomId}/flash-sales`),
  /** 秒杀下单 */
  flashSaleOrder: (saleId: string) => api.post(`/live/flash-sales/${saleId}/order`),
  /** 礼物列表 */
  getGifts: () => api.get("/live/gifts"),
  /** 发送礼物 */
  sendGift: (roomId: string, data: { giftId: string; quantity?: number }) => api.post(`/live/rooms/${roomId}/gifts`, data),
  /** 礼物排行榜 */
  giftRanking: (roomId: string) => api.get(`/live/rooms/${roomId}/gift-ranking`),
  /** 发送弹幕/评论 */
  sendComment: (roomId: string, data: { content: string }) => api.post(`/live/rooms/${roomId}/comment`, data),
  /** 点赞 */
  toggleLike: (roomId: string) => api.post(`/live/rooms/${roomId}/like`),
  /** 获取课件列表 */
  getSlides: (roomId: string) => api.get(`/live/rooms/${roomId}/slides`),
};

// 短视频
export const videoApi = {
  list: (params?: any) => api.get("/videos", params),
  detail: (id: string) => api.get(`/videos/${id}`),
  create: (data: any) => api.post("/videos", data),
  update: (id: string, data: any) => api.put(`/videos/${id}`, data),
  delete: (id: string) => api.delete(`/videos/${id}`),
  like: (id: string) => api.post(`/videos/${id}/like`),
  /** 收藏/取消收藏 */
  toggleCollect: (id: string) => api.post(`/videos/${id}/collect`),
  /** 我收藏的视频 */
  myCollected: (page?: number, pageSize?: number) => api.get("/videos/collected/mine", { page, pageSize }),
  /** 记录分享 */
  recordShare: (id: string) => api.post(`/videos/${id}/share`),
  /** 获取VOD上传签名 */
  getUploadSignature: (data?: any) => api.post("/videos/vod/upload-signature", data),
  /** 获取VOD播放鉴权签名 */
  getPlaySignature: (fileId: string, expire?: number) => api.get(`/videos/vod/play-signature/${fileId}`, { expire }),
  /** 添加视频商品关联 */
  addProduct: (id: string, productId: string) => api.post(`/videos/${id}/products/${productId}`),
  /** 移除视频商品关联 */
  removeProduct: (id: string, productId: string) => api.delete(`/videos/${id}/products/${productId}`),
};

// Bot/智能体
export const botApi = {
  list: (params?: { type?: string }) => api.get("/bots", params),
  detail: (id: string) => api.get(`/bots/${id}`),
  chat: (id: string, data: { query: string; conversationId?: string }) =>
    api.post(`/bots/${id}/chat`, data),
  chatStream: (id: string, data: { query: string; conversationId?: string }) =>
    api.post(`/bots/${id}/chat/stream`, data),
  getChatHistory: (id: string, conversationId: string) =>
    api.get(`/bots/${id}/chat-history/${conversationId}`),
  createVoiceRoom: (id: string) => api.post(`/bots/${id}/voice-room`),
  uploadFile: (id: string, data: { file: string; filename: string }) =>
    api.post(`/bots/${id}/upload-file`, data),
  circleBots: (circleId: string) => api.get(`/bots/circle/${circleId}`),
  ranking: (limit?: number) => api.get("/bots/ranking", { params: { limit } }),
  feedCards: (limit?: number) => api.get("/bots/feed-cards", { params: { limit } }),
  marketplaceList: (params?: { keyword?: string; category?: string; page?: number; pageSize?: number }) =>
    api.get("/ai/marketplace/agents", { params }),
  marketplaceDetail: (id: string) => api.get(`/ai/marketplace/agents/${id}`),
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
  discover: (params?: any) => api.get("/station/discover", params),
  detail: (id: string) => api.get(`/station/${id}`),
  brand: (id: string) => api.get(`/station/${id}/brand`),
  miniConfig: (id: string) => api.get(`/station/${id}/mini-config`),
  teamMembers: (params?: any) => api.get("/station/team/members", params),
  teamLeaderboard: (params?: any) => api.get("/station/team/leaderboard", params),
  teamActivity: (params?: any) => api.get("/station/team/activity", params),
  teamSuccessCases: (params?: any) => api.get("/station/team/success-cases", params),
  promotionMaterials: () => api.get("/station/promotion/materials"),
  promotionMaterialDetail: (id: string) => api.get(`/station/promotion/materials/${id}`),
  usePromotionMaterial: (id: string) => api.post(`/station/promotion/materials/${id}/use`),
  dashboardOverview: () => api.get("/station/dashboard/overview"),
  dashboardTrends: () => api.get("/station/dashboard/trends"),
  dashboardLinkRanking: () => api.get("/station/dashboard/link-ranking"),
  dashboardSilentUsers: () => api.get("/station/dashboard/silent-users"),
  dashboardSettlementTimer: () => api.get("/station/dashboard/settlement-timer"),
  operatorDashboardOverview: () => api.get("/station/operator-dashboard/overview"),
  operatorDashboardTeamRanking: () => api.get("/station/operator-dashboard/team-ranking"),
  operatorDashboardQuotaUsage: () => api.get("/station/operator-dashboard/quota-usage"),
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
  /** 拒绝提问 */
  reject: (id: string, reason?: string) => api.post(`/question/${id}/reject`, reason ? { reason } : {}),
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
  /** 上传视频 */
  video: (filePath: string) =>
    new Promise((resolve, reject) => {
      uni.uploadFile({
        url: BASE + "/upload/video",
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
  lookup: (text: string, context?: string) => api.post("/ebook/lookup", { text, context }),
  /** 发布书评 */
  createReview: (ebookId: string, data: { rating: number; content: string }) => api.post(`/ebook/books/${ebookId}/reviews`, data),
  /** 书评列表 */
  getReviews: (ebookId: string, page?: number, pageSize?: number) => api.get(`/ebook/books/${ebookId}/reviews`, { page, pageSize }),
  /** 评分统计 */
  getRating: (ebookId: string) => api.get(`/ebook/books/${ebookId}/rating`),
  /** 上报阅读时长 */
  recordReading: (ebookId: string, duration: number, pages?: number) => api.post("/ebook/reading-session", { ebookId, duration, pages }),
  /** 阅读统计 */
  readingStats: (days?: number) => api.get("/ebook/reading-stats", { days }),
  /** 阅读排行 */
  readingRanking: (limit?: number) => api.get("/ebook/reading-ranking", { limit }),
  /** 下载 */
  generateDownloadUrl: (ebookId: string) => api.get(`/ebook/books/${ebookId}/download`),
  getDownloads: (page = 1, pageSize = 20) => api.get("/ebook/downloads", { page, pageSize }),
  getDownloadStatus: (downloadId: string) => api.get(`/ebook/downloads/${downloadId}/status`),
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
  courseDetail: (id: string) => api.get(`/offline/courses/${id}`),
  registerCourse: (id: string) => api.post(`/offline/courses/${id}/register`),
  cancelCourse: (id: string) => api.post(`/offline/courses/${id}/cancel`),
  signIn: (data: { courseId: string; code?: string }) => api.post("/offline/courses/sign-in", data),
  getRegistrations: (courseId: string) => api.get(`/offline/courses/${courseId}/registrations`),
  createProduct: (stationId: string, data: any) => api.post(`/offline/stations/${stationId}/products`, data),
  updateProduct: (productId: string, data: any) => api.put(`/offline/products/${productId}`, data),
  getProducts: (stationId: string) => api.get(`/offline/stations/${stationId}/products`),
  deleteProduct: (productId: string) => api.delete(`/offline/products/${productId}`),
  bookTeacher: (stationId: string, data: any) => api.post(`/offline/stations/${stationId}/teacher-bookings`, data),
  getTeacherBookings: (stationId: string) => api.get(`/offline/stations/${stationId}/teacher-bookings`),
  createOrder: (stationId: string, data: any) => api.post(`/offline/stations/${stationId}/orders`, data),
  getOrders: (stationId: string) => api.get(`/offline/stations/${stationId}/orders`),
  updateOrder: (orderId: string, data: any) => api.put(`/offline/orders/${orderId}`, data),
  getSettlements: (stationId: string) => api.get(`/offline/stations/${stationId}/settlements`),
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
  /** 秒杀列表（用户端） */
  flashSales: (params?: { page?: number; pageSize?: number }) =>
    api.get("/marketing/flash-sales/active", params),
  /** 秒杀详情 */
  flashSaleDetail: (id: string) => api.get(`/marketing/flash-sales/${id}`),
  /** 拼团列表（用户端） */
  groupBuys: (params?: { page?: number; pageSize?: number }) =>
    api.get("/marketing/group-buys/active", params),
  /** 拼团详情 */
  groupBuyDetail: (id: string) => api.get(`/marketing/group-buys/${id}`),
  /** 参与拼团 */
  joinGroupBuy: (groupBuyId: string, data?: { groupId?: string }) =>
    api.post(`/marketing/group-buys/${groupBuyId}/join`, data),
  /** 我的拼团 */
  myGroupBuys: () => api.get("/marketing/group-buys/my"),
  /** 折扣活动列表 */
  discounts: () => api.get("/marketing/discounts"),
  /** 营销页面 */
  pageByRoute: (route: string) => api.get(`/marketing/pages/${encodeURIComponent(route)}`),
  getFullReductions: (params?: any) => api.get("/marketing/full-reductions", params),
  activityDetail: (id: string) => api.get(`/marketing/activities/${id}`),
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
  /** AI 通用对话 */
  chat: (data: { scene: string; messages: Array<{ role: string; content: string }>; temperature?: number; maxTokens?: number }) =>
    api.post("/ai/chat", data),
  chatStream: (data: { scene: string; messages: Array<{ role: string; content: string }> }) =>
    api.post("/ai/chat/stream", data),
  /** 智能客服 */
  customerService: (question: string, history?: Array<{ role: string; content: string }>) =>
    api.post("/ai/customer-service", { question, history }),
  customerServiceStream: (question: string, history?: Array<{ role: string; content: string }>) =>
    api.post("/ai/customer-service/stream", { question, history }),
  /** 媒体AI */
  imageAudit: (imageUrl: string, context?: string) =>
    api.post("/ai/media/image-audit", { imageUrl, context }),
  tts: (text: string, voice?: string, speed?: number) =>
    api.post("/ai/media/tts", { text, voice, speed }),
  transcribe: (audioUrl: string, language?: string) =>
    api.post("/ai/media/transcribe", { audioUrl, language }),
  /** AI发布辅助 */
  polish: (text: string) => api.post("/ai/publish/polish", { text }),
  optimizeTitle: (content: string) => api.post("/ai/publish/optimize-title", { content }),
  suggestTags: (content: string) => api.post("/ai/publish/suggest-tags", { content }),
  generateCover: (prompt: string) => api.post("/ai/publish/generate-cover", { prompt }),
  /** 平台知识库 */
  knowledgeSearch: (params?: { keyword?: string; category?: string; page?: number; pageSize?: number }) =>
    api.get("/platform-knowledge", params),
  knowledgeDetail: (id: string) => api.get(`/platform-knowledge/${id}`),
  /** 推荐信息流刷新 */
  refreshSmartFeed: () => api.post("/recommend/smart-feed/refresh"),
  /** AI搜索总结 */
  searchSummary: (data: { query: string; results: any[] }) =>
    api.post("/search/ai/summary", data),
};

// ==================== 发现页 ====================
export const discoverApi = {
  getDiscover: (params?: { page?: number; pageSize?: number; type?: string; categoryLevel1?: string }) =>
    api.get("/discover", params),
  getCategories: () => api.get("/discover/categories"),
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

// ==================== 收益 ====================
export const revenueApi = {
  summary: () => api.get("/revenue/summary"),
  earnings: (params?: { page?: number; pageSize?: number }) =>
    api.get("/revenue/earnings", params),
};

// ==================== 悬赏咨询 ====================
export const bountyApi = {
  create: (data: { title: string; description: string; amount: number }) =>
    api.post("/bounty/questions", data),
  list: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get("/bounty/questions", params),
  detail: (id: string) => api.get(`/bounty/questions/${id}`),
  claim: (id: string) => api.post(`/bounty/questions/${id}/claim`),
  answer: (id: string, data: { content: string }) =>
    api.post(`/bounty/questions/${id}/answer`, data),
  settle: (id: string) => api.post(`/bounty/questions/${id}/settle`),
  refund: (id: string) => api.post(`/bounty/questions/${id}/refund`),
};

// ==================== 智能定价 ====================
export const pricingApi = {
  calcPrice: (params: { productId: string; userId?: string }) =>
    api.get("/pricing/calc-price", params),
};

// ==================== 汇付支付 ====================
export const huifuPayApi = {
  pay: (data: { orderId: string; amount: number; returnUrl?: string }) =>
    api.post("/huifu/pay", data),
  query: (outTradeNo: string) => api.post("/huifu/query", { outTradeNo }),
};

// ==================== 竞赛 ====================
export const competitionApi = {
  list: (params?: any) => api.get("/competitions", params),
  detail: (id: string) => api.get(`/competitions/${id}`),
  rankings: (id: string) => api.get(`/competitions/${id}/rankings`),
  register: (id: string) => api.post(`/competitions/${id}/register`),
  myRegistration: (id: string) => api.get(`/competitions/${id}/my-registration`),
  submit: (roundId: string, data: any) => api.post(`/competitions/rounds/${roundId}/submit`, data),
  getPaper: (roundId: string) => api.get(`/competitions/rounds/${roundId}/paper`),
};

// ==================== 小程序首页 ====================
export const miniApi = {
  home: () => api.get("/mini/home"),
  contents: (params?: any) => api.get("/mini/contents", params),
  contentDetail: (id: string) => api.get(`/mini/content/${id}`),
  shareConfig: () => api.get("/mini/share-config"),
};

// ==================== 实名认证 ====================
export const identityApi = {
  /** 身份证OCR识别 */
  ocr: (data: { imageUrl: string; side: string }) => api.post("/identity/ocr", data),
  /** 二要素核验（姓名+身份证号） */
  verify: (data: { name: string; idCard: string }) => api.post("/identity/verify", data),
  /** 获取人脸核身URL */
  getFaceToken: (data: { name: string; idCard: string; returnUrl: string }) => api.post("/identity/face/token", data),
  /** 查询人脸核身结果 */
  faceResult: (token: string) => api.get(`/identity/face/result/${token}`),
  /** 获取我的认证状态 */
  myStatus: () => api.get("/identity/my"),
};

// ==================== 分享配置 ====================
export const shareApi = {
  getConfig: (params?: { type?: string; path?: string }) => api.get("/share/config", params),
};

export default api;
