import axios from "axios";
import { ElMessage } from "element-plus";

export const api = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing = false;

api.interceptors.response.use(
  (res) => {
    // 后端 ResponseInterceptor 包装为 {code, data, message}，自动解包
    if (res.data && typeof res.data === "object" && "code" in res.data && res.data.code === 200 && "data" in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
  async (err) => {
    const msg = err.response?.data?.message ?? "请求失败";
    const status = err.response?.status;

    if (status === 401 && !refreshing && !err.config?.url?.includes("/auth/login")) {
      refreshing = true;
      ElMessage.warning("登录已过期，请重新登录");
      localStorage.removeItem("token");
      localStorage.removeItem("user_roles");
      // 保存当前路径用于登录后跳回
      const currentPath = window.location.pathname;
      if (currentPath !== "/login") {
        localStorage.setItem("redirect_after_login", currentPath);
      }
      window.location.href = "/login";
      return Promise.reject(err);
    }

    ElMessage.error(msg);
    return Promise.reject(err);
  },
);

// 认证
export const authApi = {
  login: (data: { account: string; password: string }) =>
    api.post("/auth/login/phone", { phone: data.account, password: data.password }),
  getProfile: () => api.get("/auth/me"),
  getMenus: () => api.get("/auth/menus"),
};

// IM 即时通讯
export const imApi = {
  getUserSig: (userId?: string) => api.post("/im/user-sig", userId ? { userId } : {}),
  importAccount: (data: { userId: string; nickname?: string; avatar?: string }) =>
    api.post("/im/account/import", data),
  queryAccountState: (userIds: string) =>
    api.get("/im/account/state", { params: { userIds } }),
  createGroup: (data: { groupId: string; name: string; type?: string; ownerId?: string }) =>
    api.post("/im/groups", data),
  destroyGroup: (groupId: string) => api.delete(`/im/groups/${groupId}`),
  addGroupMembers: (groupId: string, memberIds: string[]) =>
    api.post(`/im/groups/${groupId}/members`, { memberIds }),
  sendGroupMsg: (groupId: string, text: string) =>
    api.post(`/im/groups/${groupId}/msg`, { text }),
};

// 内容
export const contentApi = {
  list: (params?: any) => api.get("/contents", { params }),
  detail: (id: string) => api.get(`/contents/${id}`),
  create: (data: any) => api.post("/contents", data),
  update: (id: string, data: any) => api.put(`/contents/${id}`, data),
  remove: (id: string) => api.delete(`/contents/${id}`),
  batchStatus: (ids: string[], status: string) => api.put("/contents/batch/status", { ids, status }),
  stats: () => api.get("/contents/stats/overview"),
};

// 课程
export const courseApi = {
  list: (params?: any) => api.get("/courses", { params }),
  detail: (id: string) => api.get(`/courses/${id}`),
  create: (data: any) => api.post("/courses", data),
  update: (id: string, data: any) => api.put(`/courses/${id}`, data),
  remove: (id: string) => api.delete(`/courses/${id}`),
  audit: (id: string, status: string) => api.put(`/courses/${id}/audit`, { status }),
  // 章节
  getChapters: (id: string) => api.get(`/courses/${id}/chapters`),
  addChapter: (id: string, data: any) => api.post(`/courses/${id}/chapters`, data),
  updateChapter: (id: string, chapterId: string, data: any) => api.put(`/courses/${id}/chapters/${chapterId}`, data),
  deleteChapter: (id: string, chapterId: string) => api.delete(`/courses/${id}/chapters/${chapterId}`),
  // 作业
  getWorks: (id: string, params?: any) => api.get(`/courses/${id}/works`, { params }),
};

// 排盘
export const paipanApi = {
  preview: (data: any) => api.post("/paipan/bazi/preview", data),
  save: (data: any) => api.post("/paipan/bazi", data),
  history: (params?: any) => api.get("/paipan/bazi", { params }),
  detail: (id: string) => api.get(`/paipan/bazi/${id}`),
  // 紫微斗数
  ziweiPreview: (data: any) => api.post("/paipan/ziwei/preview", data),
  ziweiSave: (data: any) => api.post("/paipan/ziwei", data),
  ziweiHistory: (params?: any) => api.get("/paipan/ziwei", { params }),
  ziweiDetail: (id: string) => api.get(`/paipan/ziwei/${id}`),
  // 管理员
  adminRecords: (params?: any) => api.get("/paipan/admin/records", { params }),
};

// 仪表盘
export const dashboardApi = {
  stats: () => api.get("/dashboard/stats"),
  trends: () => api.get("/dashboard/trends"),
  charts: () => api.get("/dashboard/charts"),
  revenue: () => api.get("/dashboard/revenue"),
  course: (id: string) => api.get(`/dashboard/courses/${id}`),
  live: (id: string) => api.get(`/dashboard/live/${id}`),
  /** 角色专属仪表盘 */
  roleDashboard: (roleType: string) => api.get(`/dashboard/role/${roleType}`),
  /** 平台总览 */
  platform: () => api.get("/dashboard/platform"),
  /** 系统健康 */
  systemHealth: () => api.get("/dashboard/system-health"),
};

// 圈子
export const circleApi = {
  list: (params?: any) => api.get("/circles", { params }),
  detail: (id: string) => api.get(`/circles/${id}`),
  create: (data: any) => api.post("/circles", data),
  update: (id: string, data: any) => api.put(`/circles/${id}`, data),
  remove: (id: string) => api.delete(`/circles/${id}`),
};

// 视频
export const videoApi = {
  list: (params?: any) => api.get("/videos", { params }),
  detail: (id: string) => api.get(`/videos/${id}`),
  create: (data: any) => api.post("/videos", data),
  update: (id: string, data: any) => api.put(`/videos/${id}`, data),
  remove: (id: string) => api.delete(`/videos/${id}`),
};

// 直播
export const liveApi = {
  rooms: (params?: any) => api.get("/live/rooms", { params }),
  detail: (id: string) => api.get(`/live/rooms/${id}`),
  create: (data: any) => api.post("/live/rooms", data),
  update: (id: string, data: any) => api.put(`/live/rooms/${id}`, data),
  endRoom: (id: string) => api.put(`/live/rooms/${id}/end`),
  remove: (id: string) => api.delete(`/live/rooms/${id}`),
};

// 用户管理
export const userApi = {
  list: (params?: any) => api.get("/users", { params }),
  detail: (id: string) => api.get(`/users/${id}`),
  assignRole: (id: string, data: any) => api.post(`/users/${id}/roles`, data),
  removeRole: (id: string, roleType: string, bindId?: string) => api.delete(`/users/${id}/roles/${roleType}`, { data: { bindId } }),
  updateStatus: (id: string, status: string) => api.put(`/users/${id}/status`, { status }),
  ban: (id: string, reason?: string) => api.put(`/users/${id}/status`, { status: 'DISABLED', reason }),
  unban: (id: string) => api.put(`/users/${id}/status`, { status: 'ACTIVE' }),
};

// 实名认证
export const identityApi = {
  list: (params?: any) => api.get("/identity/admin/audit-list", { params }),
  approve: (id: string) => api.post(`/identity/admin/approve/${id}`),
  reject: (id: string, reason: string) => api.post(`/identity/admin/reject/${id}`, { reason }),
};

// 古籍
export const classicApi = {
  list: (params?: any) => api.get("/classic/books", { params }),
  detail: (id: string) => api.get(`/classic/books/${id}`),
  create: (data: any) => api.post("/classic/books", data),
  update: (id: string, data: any) => api.put(`/classic/books/${id}`, data),
  remove: (id: string) => api.delete(`/classic/books/${id}`),
  getChapters: (bookId: string) => api.get(`/classic/books/${bookId}/chapters`),
  addChapter: (bookId: string, data: any) => api.post(`/classic/books/${bookId}/chapters`, data),
  updateChapter: (id: string, data: any) => api.put(`/classic/chapters/${id}`, data),
  deleteChapter: (id: string) => api.delete(`/classic/chapters/${id}`),
};

// 智能体
export const botApi = {
  list: (params?: any) => api.get("/bots", { params }),
  detail: (id: string) => api.get(`/bots/${id}`),
  create: (data: any) => api.post("/bots", data),
  update: (id: string, data: any) => api.put(`/bots/${id}`, data),
  remove: (id: string) => api.delete(`/bots/${id}`),
  bindCircle: (id: string, data: { circleId: string; knowledgeBaseId?: string }) =>
    api.post(`/bots/${id}/bind-circle`, data),
  getCircleBot: (circleId: string) => api.get(`/bots/circle/${circleId}`),
  addKnowledge: (id: string, data: { title: string; content: string; sourceType?: string; sourceId?: string }) =>
    api.post(`/bots/${id}/knowledge`, data),
  deleteKnowledge: (knowledgeId: string) => api.delete(`/bots/knowledge/${knowledgeId}`),
};

// 研究院
export const instituteApi = {
  list: (params?: any) => api.get("/offline/institute/members", { params }),
  update: (id: string, data: any) => api.put(`/offline/institute/members/${id}`, data),
};

// 分站管理（推广分站）
export const stationApi = {
  list: (params?: any) => api.get("/station", { params }),
  detail: (id: string) => api.get(`/station/${id}`),
  create: (data: any) => api.post("/station", data),
  update: (id: string, data: any) => api.put(`/station/${id}`, data),
  remove: (id: string) => api.delete(`/station/${id}`),
  earnings: (id: string, params?: any) => api.get(`/station/${id}/earnings`, { params }),
  operatorList: (params?: any) => api.get("/station/operator/list", { params }),
  createOperator: (data: any) => api.post("/station/operator", data),
};

// 线下驿站管理（完整 API）
export const offlineApi = {
  list: (params?: any) => api.get("/offline/stations", { params }),
  detail: (id: string) => api.get(`/offline/stations/${id}`),
  create: (data: any) => api.post("/offline/stations", data),
  audit: (id: string, status: string) => api.put(`/offline/stations/${id}/audit`, { status }),
  courses: (params?: any) => api.get("/offline/courses", { params }),
  createCourse: (data: any) => api.post("/offline/courses", data),
  members: (params?: any) => api.get("/offline/institute/members", { params }),
  updateMember: (id: string, data: any) => api.put(`/offline/institute/members/${id}`, data),
};

// 文件上传
export const uploadApi = {
  image: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/upload/image", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// 分佣管理
export const commissionApi = {
  getConfigs: () => api.get("/commission/configs"),
  updateConfig: (key: string, data: any) => api.put(`/commission/configs/${key}`, data),
  stationEarnings: (stationId: string, params?: any) => api.get(`/commission/station-earnings/${stationId}`, { params }),
  stationBalance: (stationId: string) => api.get(`/commission/station-balance/${stationId}`),
  listWithdrawals: (params?: any) => api.get("/commission/admin/withdrawals", { params }),
  auditWithdrawal: (id: string, data: { status: string; remark?: string }) => api.put(`/commission/admin/withdrawals/${id}`, data),
};

// 审计日志
export const auditApi = {
  list: (params?: any) => api.get("/system/audit-logs", { params }),
  getActions: () => api.get("/system/audit-actions"),
};

// 系统配置
export const systemApi = {
  listConfigs: () => api.get("/system/configs"),
  setConfig: (key: string, data: { value: string; description?: string }) =>
    api.put(`/system/configs/${key}`, data),
  deleteConfig: (key: string) => api.delete(`/system/configs/${key}`),
};

// 评论管理
export const commentApi = {
  list: (params?: any) => api.get("/comment", { params }),
  count: (params?: any) => api.get("/comment/count", { params }),
  hide: (id: string) => api.put(`/comment/${id}/hide`),
  remove: (id: string) => api.delete(`/comment/${id}`),
};

// 商城管理
export const shopApi = {
  // 优惠券
  listCoupons: (params?: any) => api.get("/shop/coupons", { params }),
  createCoupon: (data: any) => api.post("/shop/coupons", data),
  updateCoupon: (id: string, data: any) => api.put(`/shop/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/shop/coupons/${id}`),
  updateCouponStatus: (id: string, status: string) => api.put(`/shop/coupons/${id}/status`, { status }),
  // 物流
  getLogistics: (orderId: string) => api.get(`/shop/orders/${orderId}/logistics`),
  updateLogistics: (orderId: string, data: any) => api.put(`/shop/orders/${orderId}/logistics`, data),
  // 评价
  listReviews: (productId: string, params?: any) => api.get(`/shop/products/${productId}/reviews`, { params }),
};

// 虚拟币管理
export const coinApi = {
  /** 充值记录列表 */
  getRecharges: (page: number, pageSize: number, userId?: string) =>
    api.get("/coin/admin/recharges", { params: { page, pageSize, userId } }),
  /** 管理员充值 */
  adminRecharge: (data: { userId: string; coins: number; remark?: string }) =>
    api.post("/coin/admin/recharge", data),
  /** 礼物列表 */
  getGifts: () => api.get("/coin/gifts"),
  /** 创建/编辑礼物 */
  createGift: (data: {
    id?: string;
    name: string;
    icon: string;
    price: number;
    level: string;
    sort: number;
  }) => api.post("/coin/gifts", data),
  /** 删除礼物 */
  deleteGift: (id: string) => api.delete(`/coin/gifts/${id}`),
  /** 发放礼物给用户 */
  sendGift: (data: { giftId: string; userId: string; quantity: number }) =>
    api.post("/coin/gifts/send", data),
};

// 付费问答
export const questionApi = {
  list: (params?: any) => api.get("/question", { params }),
  detail: (id: string) => api.get(`/question/${id}`),
  refundExpired: () => api.post("/question/admin/refund-expired"),
};

// 通知管理
export const notificationApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    api.get("/notifications", { params }),
  send: (data: { userId?: string; type: string; title: string; content: string; targetType?: string; targetId?: string }) =>
    api.post("/notifications", data),
  batchSend: (data: { userIds: string[]; type: string; title: string; content: string; targetType?: string; targetId?: string }) =>
    api.post("/notifications/batch", data),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  getPreferences: () => api.get("/notifications/preferences"),
  updatePreferences: (prefs: Record<string, boolean>) => api.put("/notifications/preferences", prefs),
};

// 举报管理
export const reportApi = {
  list: (params?: { page?: number; pageSize?: number; targetType?: string; status?: string }) =>
    api.get("/interaction/report", { params }),
  process: (id: string) => api.put(`/interaction/report/${id}/process`),
  dismiss: (id: string) => api.put(`/interaction/report/${id}/dismiss`),
};

// 商品管理（管理后台）
export const productApi = {
  list: (params?: { page?: number; pageSize?: number; status?: string; category?: string }) =>
    api.get("/shop/products", { params }),
  detail: (id: string) => api.get(`/shop/products/${id}`),
  create: (data: any) => api.post("/shop/products", data),
  update: (id: string, data: any) => api.put(`/shop/products/${id}`, data),
  updateStatus: (id: string, status: string) => api.put(`/shop/products/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/shop/products/${id}`),
  // SKU
  addSku: (productId: string, data: { name: string; price: number; stock: number; image?: string; attrs?: Record<string, string> }) =>
    api.post(`/shop/products/${productId}/skus`, data),
  deleteSku: (skuId: string) => api.delete(`/shop/skus/${skuId}`),
};

// 订单管理（管理后台）
export const orderApi = {
  list: (params?: { page?: number; pageSize?: number; status?: string; type?: string }) =>
    api.get("/shop/orders", { params }),
  detail: (id: string) => api.get(`/shop/orders/${id}`),
  pay: (id: string) => api.put(`/shop/orders/${id}/pay`),
  ship: (id: string) => api.put(`/shop/orders/${id}/ship`),
  refund: (id: string) => api.put(`/shop/orders/${id}/refund`),
  complete: (id: string) => api.put(`/shop/orders/${id}/complete`),
  cancel: (id: string) => api.put(`/shop/orders/${id}/cancel`),
  getLogistics: (id: string) => api.get(`/shop/orders/${id}/logistics`),
  updateLogistics: (id: string, data: any) => api.put(`/shop/orders/${id}/logistics`, data),
};

// 搜索统计
export const searchApi = {
  getStats: () => api.get("/search/stats"),
  getWeights: (entityType?: string) => api.get("/search/weights", { params: entityType ? { entityType } : {} }),
  upsertWeight: (data: { entityType: string; fieldName: string; weight: number; enabled?: boolean }) => api.post("/search/weights", data),
  deleteWeight: (id: string) => api.delete(`/search/weights/${id}`),
  seedWeights: () => api.post("/search/weights/seed"),
};

// 商家管理
export const merchantApi = {
  list: (params?: { page?: number; pageSize?: number; status?: string; keyword?: string }) =>
    api.get("/admin/merchants", { params }),
  detail: (id: string) => api.get(`/admin/merchants/${id}`),
  stats: (id: string) => api.get(`/admin/merchants/${id}/stats`),
  approve: (id: string, data: { depositAmount?: number; commissionRate?: number; remark?: string }) =>
    api.post(`/admin/merchants/${id}/approve`, data),
  reject: (id: string, data: { reason: string }) =>
    api.post(`/admin/merchants/${id}/reject`, data),
  updateStatus: (id: string, data: { status: string; reason?: string }) =>
    api.put(`/admin/merchants/${id}/status`, data),
  getViolations: (id: string, params?: { page?: number; pageSize?: number }) =>
    api.get(`/admin/merchants/${id}/violations`, { params }),
  createViolation: (id: string, data: { type: string; title: string; description: string; penalty?: number; evidence?: any; remark?: string }) =>
    api.post(`/admin/merchants/${id}/violations`, data),
  handleViolation: (id: string, violationId: string, data: { status: string; note?: string }) =>
    api.put(`/admin/merchants/${id}/violations/${violationId}`, data),
  getDeposits: (id: string, params?: { page?: number; pageSize?: number }) =>
    api.get(`/admin/merchants/${id}/deposits`, { params }),
  refundDeposit: (id: string, data: { amount?: number; remark?: string }) =>
    api.post(`/admin/merchants/${id}/deposits/refund`, data),
  adjustDeposit: (id: string, data: { amount: number; reason?: string }) =>
    api.post(`/admin/merchants/${id}/deposits/adjust`, data),
  setCommission: (id: string, data: { rate: number }) =>
    api.put(`/admin/merchants/${id}/commission`, data),
  getAgreements: (params?: { page?: number; pageSize?: number }) =>
    api.get("/admin/merchants/agreements", { params }),
  createAgreement: (data: { version: string; title: string; content: string }) =>
    api.post("/admin/merchants/agreements", data),
  updateAgreement: (id: string, data: { title?: string; content?: string }) =>
    api.put(`/admin/merchants/agreements/${id}`, data),
  deleteAgreement: (id: string) => api.delete(`/admin/merchants/agreements/${id}`),
};

// 电子书管理
export const ebookApi = {
  listCategories: () => api.get("/ebook/categories"),
  createCategory: (data: { name: string; sortOrder?: number }) => api.post("/ebook/categories", data),
  listBooks: (params?: { page?: number; pageSize?: number; categoryId?: string; status?: string; keyword?: string }) =>
    api.get("/ebook/books", { params }),
  detail: (id: string) => api.get(`/ebook/books/${id}`),
  create: (data: any) => api.post("/ebook/books", data),
  update: (id: string, data: any) => api.put(`/ebook/books/${id}`, data),
  delete: (id: string) => api.delete(`/ebook/books/${id}`),
  createChapter: (ebookId: string, data: any) => api.post(`/ebook/books/${ebookId}/chapters`, data),
  updateChapter: (id: string, data: any) => api.put(`/ebook/chapters/${id}`, data),
  deleteChapter: (id: string) => api.delete(`/ebook/chapters/${id}`),
};

// 敏感词管理
export const sensitiveWordApi = {
  list: () => api.get("/audit/sensitive-words"),
  add: (word: string) => api.post("/audit/sensitive-words", { word }),
  batchAdd: (words: string[]) => api.post("/audit/sensitive-words/batch", { words }),
  delete: (word: string) => api.delete(`/audit/sensitive-words/${encodeURIComponent(word)}`),
  check: (text: string) => api.post("/audit/sensitive-words/check", { text }),
};

// Webhook管理
export const webhookApi = {
  list: (event?: string) => api.get("/webhooks", { params: event ? { event } : {} }),
  register: (data: { event: string; url: string; secret?: string; description?: string }) => api.post("/webhooks", data),
  toggle: (id: string, isActive: boolean) => api.post(`/webhooks/${id}/toggle`, { isActive }),
  unregister: (id: string) => api.delete(`/webhooks/${id}`),
};

// 数据导入
export const importApi = {
  importCsv: (type: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/system/import/${type}`, form, { headers: { "Content-Type": "multipart/form-data" } });
  },
};

// A/B实验管理
export const abTestApi = {
  list: () => api.get("/recommend/ab-tests"),
  detail: (id: string) => api.get(`/recommend/ab-tests/${id}`),
  create: (data: any) => api.post("/recommend/ab-tests", data),
  update: (id: string, data: any) => api.put(`/recommend/ab-tests/${id}`, data),
  delete: (id: string) => api.delete(`/recommend/ab-tests/${id}`),
  start: (id: string) => api.post(`/recommend/ab-tests/${id}/start`),
  pause: (id: string) => api.post(`/recommend/ab-tests/${id}/pause`),
  complete: (id: string) => api.post(`/recommend/ab-tests/${id}/complete`),
  getReport: () => api.get("/recommend/ab-tests/reports/latest"),
  generateReport: () => api.post("/recommend/ab-tests/reports/generate"),
  getMetrics: (id: string) => api.get(`/recommend/ab-tests/${id}/metrics`),
};

// 推荐规则管理
export const recommendRuleApi = {
  list: (params?: { page?: number; pageSize?: number; scene?: string }) => api.get("/admin/recommend/rules", { params }),
  detail: (id: string) => api.get(`/admin/recommend/rules/${id}`),
  create: (data: any) => api.post("/admin/recommend/rules", data),
  update: (id: string, data: any) => api.put(`/admin/recommend/rules/${id}`, data),
  delete: (id: string) => api.delete(`/admin/recommend/rules/${id}`),
};

// 平台营收
export const revenueApi = {
  summary: (userId: string) => api.get(`/revenue/summary?userId=${userId}`),
  earnings: (params?: { page?: number; pageSize?: number; userId?: string }) => api.get("/revenue/earnings", { params }),
  platformOverview: () => api.get("/revenue/platform/overview"),
  platformTrends: (params?: { days?: number }) => api.get("/revenue/platform/trends", { params }),
  stats: (params?: { startDate?: string; endDate?: string }) => api.get("/revenue/stats", { params }),
  breakdown: (params?: { startDate?: string; endDate?: string }) => api.get("/revenue/breakdown", { params }),
};

// 邮件管理
export const emailApi = {
  send: (data: { to: string; subject: string; html: string }) => api.post("/email/send", data),
  sendVerifyCode: (email: string) => api.post("/email/send-verify-code", { email }),
  test: () => api.post("/email/test"),
};

// AI用量统计
export const aiUsageApi = {
  getStats: () => api.get("/ai/usage-stats"),
  getCallLogs: (params?: { page?: number; pageSize?: number }) => api.get("/ai/call-logs", { params }),
  getAbnormalAlerts: () => api.get("/ai/abnormal-alerts"),
};

// ───────── 营销管理 ─────────
export const marketingApi = {
  // 秒杀
  listFlashSales: (params?: any) => api.get("/marketing/flash-sales", { params }),
  createFlashSale: (data: any) => api.post("/marketing/flash-sales", data),
  updateFlashSale: (id: string, data: any) => api.put(`/marketing/flash-sales/${id}`, data),
  deleteFlashSale: (id: string) => api.delete(`/marketing/flash-sales/${id}`),
  addFlashSaleItem: (id: string, data: any) => api.post(`/marketing/flash-sales/${id}/items`, data),
  updateFlashSaleItem: (id: string, itemId: string, data: any) => api.put(`/marketing/flash-sales/${id}/items/${itemId}`, data),
  deleteFlashSaleItem: (id: string, itemId: string) => api.delete(`/marketing/flash-sales/${id}/items/${itemId}`),
  startFlashSale: (id: string) => api.post(`/marketing/flash-sales/${id}/start`),
  endFlashSale: (id: string) => api.post(`/marketing/flash-sales/${id}/end`),
  // 拼团
  listGroupBuys: (params?: any) => api.get("/marketing/group-buys", { params }),
  createGroupBuy: (data: any) => api.post("/marketing/group-buys", data),
  updateGroupBuy: (id: string, data: any) => api.put(`/marketing/group-buys/${id}`, data),
  deleteGroupBuy: (id: string) => api.delete(`/marketing/group-buys/${id}`),
  getGroupBuyParticipants: (id: string) => api.get(`/marketing/group-buys/${id}/participants`),
  // 优惠券
  listCoupons: (params?: any) => api.get("/marketing/coupons", { params }),
  createCoupon: (data: any) => api.post("/marketing/coupons", data),
  updateCoupon: (id: string, data: any) => api.put(`/marketing/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/marketing/coupons/${id}`),
  grantCoupon: (id: string, data: any) => api.post(`/marketing/coupons/${id}/grant`, data),
  batchGrantCoupon: (id: string, data: any) => api.post(`/marketing/coupons/${id}/batch-grant`, data),
  getCouponRecords: (id: string, params?: any) => api.get(`/marketing/coupons/${id}/records`, { params }),
  // 限时折扣
  listDiscounts: (params?: any) => api.get("/marketing/discounts", { params }),
  createDiscount: (data: any) => api.post("/marketing/discounts", data),
  updateDiscount: (id: string, data: any) => api.put(`/marketing/discounts/${id}`, data),
  deleteDiscount: (id: string) => api.delete(`/marketing/discounts/${id}`),
  // 微页面
  listPages: () => api.get("/marketing/pages"),
  getPage: (id: string) => api.get(`/marketing/pages/${id}`),
  createPage: (data: any) => api.post("/marketing/pages", data),
  updatePage: (id: string, data: any) => api.put(`/marketing/pages/${id}`, data),
  deletePage: (id: string) => api.delete(`/marketing/pages/${id}`),
  publishPage: (id: string) => api.post(`/marketing/pages/${id}/publish`),
  getPageVersions: (id: string) => api.get(`/marketing/pages/${id}/versions`),
  // 活动
  listActivities: (params?: any) => api.get("/marketing/activities", { params }),
  createActivity: (data: any) => api.post("/marketing/activities", data),
  updateActivity: (id: string, data: any) => api.put(`/marketing/activities/${id}`, data),
  deleteActivity: (id: string) => api.delete(`/marketing/activities/${id}`),
  getActivityMetrics: (id: string) => api.get(`/marketing/activities/${id}/metrics`),
  // 满减送
  listFullReductions: (params?: any) => api.get("/marketing/full-reductions", { params }),
  createFullReduction: (data: any) => api.post("/marketing/full-reductions", data),
  updateFullReduction: (id: string, data: any) => api.put(`/marketing/full-reductions/${id}`, data),
  deleteFullReduction: (id: string) => api.delete(`/marketing/full-reductions/${id}`),
};

// ───────── 财务管理 ─────────
export const financeApi = {
  // 对账中心
  listReconciliations: (params?: any) => api.get("/finance/reconciliation", { params }),
  createReconciliation: (data: any) => api.post("/finance/reconciliation", data),
  getReconciliationDetail: (id: string) => api.get(`/finance/reconciliation/${id}`),
  // 发票管理
  listInvoices: (params?: any) => api.get("/finance/invoices", { params }),
  createInvoice: (data: any) => api.post("/finance/invoices", data),
  issueInvoice: (id: string, invoiceUrl: string) => api.put(`/finance/invoices/${id}/issue`, { invoiceUrl }),
  mailInvoice: (id: string, expressNo: string) => api.put(`/finance/invoices/${id}/mail`, { expressNo }),
  // 结算单
  listSettlements: (params?: any) => api.get("/finance/settlements", { params }),
  generateSettlement: (data: any) => api.post("/finance/settlements/generate", data),
  approveSettlement: (id: string) => api.put(`/finance/settlements/${id}/approve`),
  paySettlement: (id: string) => api.put(`/finance/settlements/${id}/pay`),
  // 提现审批
  listWithdrawals: (params?: any) => api.get("/finance/withdrawals", { params }),
  approveWithdrawal: (id: string, reviewNote?: string) => api.put(`/finance/withdrawals/${id}/approve`, { reviewNote }),
  rejectWithdrawal: (id: string, reviewNote: string) => api.put(`/finance/withdrawals/${id}/reject`, { reviewNote }),
  payWithdrawal: (id: string) => api.post(`/finance/withdrawals/${id}/pay`),
  // 资金冻结
  freezeFund: (data: any) => api.post("/finance/freeze", data),
  unfreezeFund: (data: any) => api.post("/finance/unfreeze", data),
  listFreezes: (params?: any) => api.get("/finance/freeze-records", { params }),
  // 财务报表
  getMonthlyReport: (period: string) => api.get("/finance/reports/monthly", { params: { period } }),
  generateMonthlyReport: (period: string) => api.post(`/finance/reports/monthly/generate`, null, { params: { period } }),
};

// ───────── 风控管理 ─────────
export const riskApi = {
  listRules: (params?: any) => api.get("/risk-control/rules", { params }),
  createRule: (data: any) => api.post("/risk-control/rules", data),
  updateRule: (id: string, data: any) => api.put(`/risk-control/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/risk-control/rules/${id}`),
  toggleRule: (id: string, enabled: boolean) => api.put(`/risk-control/rules/${id}/toggle`, { enabled }),
  listAlerts: (params?: any) => api.get("/risk-control/alerts", { params }),
  processAlert: (id: string, data: any) => api.put(`/risk-control/alerts/${id}`, data),
  listFraudCases: (params?: any) => api.get("/risk-control/fraud-cases", { params }),
  getUserTimeline: (userId: string, params?: any) => api.get(`/risk-control/user-timeline/${userId}`, { params }),
  listAppeals: (params?: any) => api.get("/risk-control/appeals", { params }),
  processAppeal: (id: string, data: any) => api.put(`/risk-control/appeals/${id}`, data),
};

// ───────── AI 管理 ─────────
export const aiAdminApi = {
  // 对话日志
  listChatLogs: (params?: any) => api.get("/ai/admin/chat-logs", { params }),
  getChatLogDetail: (id: string) => api.get(`/ai/admin/chat-logs/${id}`),
  deleteChatLog: (id: string) => api.delete(`/ai/admin/chat-logs/${id}`),
  // 调用统计
  getCallStats: () => api.get("/ai/admin/call-stats"),
  getCallLogs: (params?: any) => api.get("/ai/admin/call-logs", { params }),
  getAbnormalCalls: () => api.get("/ai/admin/abnormal-calls"),
  // 圈主助理
  listCircleAssistants: (params?: any) => api.get("/ai/admin/circle-assistants", { params }),
  updateCircleAssistant: (id: string, data: any) => api.put(`/ai/admin/circle-assistants/${id}`, data),
  approveCircleAssistant: (circleId: string) => api.post(`/ai/admin/circle-assistants/${circleId}/approve`),
  rejectCircleAssistant: (circleId: string, reason?: string) => api.post(`/ai/admin/circle-assistants/${circleId}/reject`, { reason }),
  getKnowledgeBase: (circleId: string) => api.get(`/ai/admin/knowledge/${circleId}`),
  createKnowledgeEntry: (circleId: string, data: any) => api.post(`/ai/admin/knowledge/${circleId}`, data),
  updateKnowledgeEntry: (id: string, data: any) => api.put(`/ai/admin/knowledge/${id}`, data),
  deleteKnowledgeEntry: (id: string) => api.delete(`/ai/admin/knowledge/${id}`),
  getUsageData: (circleId: string) => api.get(`/ai/admin/usage/${circleId}`),
};

export default api;
