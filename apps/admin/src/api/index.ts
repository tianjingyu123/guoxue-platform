import axios from "axios";
import { ElMessage, ElNotification } from "element-plus";

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
let refreshQueue: Array<(token: string) => void> = [];

/** 展示错误消息：多条用通知框，单条用顶部提示 */
function showError(msg: string | string[]) {
  if (Array.isArray(msg)) {
    ElNotification({
      title: "提交失败，请检查以下问题",
      message: msg.map((m) => `<div style="margin:4px 0">${m}</div>`).join(""),
      type: "error",
      duration: 6000,
      dangerouslyUseHTMLString: true,
    });
  } else {
    ElMessage.error(msg);
  }
}

api.interceptors.response.use(
  (res) => {
    // 后端 ResponseInterceptor 包装为 {code, data, message}，自动解包
    if (res.data && typeof res.data === "object" && "code" in res.data && res.data.code === 200 && "data" in res.data) {
      const envelope = res.data;
      if (envelope.pagination) {
        res.data = { items: envelope.data, ...envelope.pagination };
      } else {
        res.data = envelope.data;
      }
    }
    return res;
  },
  async (err) => {
    const status = err.response?.status;
    const original = err.config;

    if (status === 401 && original && !original._retry
        && !original.url?.includes("/auth/login") && !original.url?.includes("/auth/refresh")) {
      original._retry = true;

      // 已有刷新在进行：排队等新 token 后重试（避免并发把一次性 refreshToken 用废）
      if (refreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((newToken: string) => {
            if (newToken) {
              original.headers.Authorization = `Bearer ${newToken}`;
              resolve(api(original));
            } else {
              reject(err);
            }
          });
        });
      }

      refreshing = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          // 用独立 axios 调续期，避免拦截器递归
          const resp = await axios.post("/api/v1/auth/refresh", { refreshToken });
          const body = resp.data?.data ?? resp.data;
          const newToken = body.accessToken ?? body.access_token;
          if (newToken) {
            localStorage.setItem("token", newToken);
            const newRt = body.refreshToken ?? body.refresh_token;
            if (newRt) localStorage.setItem("refresh_token", newRt);
            refreshing = false;
            refreshQueue.forEach((cb) => cb(newToken));
            refreshQueue = [];
            original.headers.Authorization = `Bearer ${newToken}`;
            return api(original); // 无感重试原请求
          }
        } catch {
          // 续期失败（refreshToken 也过期），走下面登出
        }
      }
      // 无续期令牌或续期失败 → 登出
      refreshing = false;
      refreshQueue.forEach((cb) => cb(""));
      refreshQueue = [];
      ElMessage.warning("登录已过期，请重新登录");
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_roles");
      const currentPath = window.location.pathname;
      const loginPath = import.meta.env.BASE_URL + "login";
      if (currentPath !== loginPath) {
        localStorage.setItem("redirect_after_login", currentPath);
      }
      window.location.href = loginPath;
      return Promise.reject(err);
    }

    // 网络错误：服务器不可达、超时、DNS 解析失败等
    if (!err.response) {
      const networkMsg = err.code === "ECONNABORTED"
        ? "请求超时，请检查网络后重试"
        : "无法连接到服务器，请确认后端服务是否正常运行";
      ElMessage.error(networkMsg);
      return Promise.reject(err);
    }

    const msg = err.response?.data?.message ?? "请求失败";
    showError(msg);
    return Promise.reject(err);
  },
);

// 认证
export const authApi = {
  login: (data: { phone: string; password: string }) =>
    api.post("/auth/login/phone", data),
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
  updateProfile: (userId: string, data: { nickname?: string; avatar?: string }) =>
    api.post(`/im/account/${userId}/profile`, data),
  createGroup: (data: { groupId: string; name: string; type?: string; ownerId?: string }) =>
    api.post("/im/groups", data),
  destroyGroup: (groupId: string) => api.delete(`/im/groups/${groupId}`),
  getGroupInfo: (groupId: string) =>
    api.get(`/im/groups/${groupId}/detail`),
  getGroupMembers: (groupId: string) =>
    api.get(`/im/groups/${groupId}/members`),
  addGroupMembers: (groupId: string, memberIds: string[]) =>
    api.post(`/im/groups/${groupId}/members`, { memberIds }),
  deleteGroupMembers: (groupId: string, memberIds: string[]) =>
    api.delete(`/im/groups/${groupId}/members`, { data: { memberIds } }),
  sendGroupMsg: (groupId: string, text: string) =>
    api.post(`/im/groups/${groupId}/msg`, { text }),
  getGroupHistory: (groupId: string, page?: number, pageSize?: number) =>
    api.get(`/im/groups/${groupId}/history`, { params: { page: page || 1, pageSize: pageSize || 20 } }),
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
};

// 内容
export const contentApi = {
  list: (params?: Record<string, unknown>) => api.get("/contents", { params }),
  detail: (id: string) => api.get(`/contents/${id}`),
  create: (data: Record<string, unknown>) => api.post("/contents", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/contents/${id}`, data),
  remove: (id: string) => api.delete(`/contents/${id}`),
  batchStatus: (ids: string[], status: string) => api.put("/contents/batch/status", { ids, status }),
  stats: () => api.get("/contents/stats/overview"),
};

// 课程
export const courseApi = {
  list: (params?: Record<string, unknown>) => api.get("/courses", { params }),
  detail: (id: string) => api.get(`/courses/${id}`),
  create: (data: Record<string, unknown>) => api.post("/courses", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/courses/${id}`, data),
  remove: (id: string) => api.delete(`/courses/${id}`),
  audit: (id: string, status: string) => api.put(`/courses/${id}/audit`, { status }),
  batchAudit: (ids: string[], status: string) => api.put("/courses/batch/audit", { ids, status }),
  forceDelete: (id: string) => api.delete(`/courses/${id}/force`),
  forceStatus: (id: string, status: string) => api.put(`/courses/${id}/status`, { status }),
  // 会员精品课标记（平台运营专属·2026-07-03 会员权益拍板）
  setMemberFree: (id: string, memberFree: boolean) => api.put(`/courses/${id}/member-free`, { memberFree }),
  // 章节
  getChapters: (id: string) => api.get(`/courses/${id}/chapters`),
  addChapter: (id: string, data: Record<string, unknown>) => api.post(`/courses/${id}/chapters`, data),
  updateChapter: (id: string, chapterId: string, data: Record<string, unknown>) => api.put(`/courses/${id}/chapters/${chapterId}`, data),
  deleteChapter: (id: string, chapterId: string) => api.delete(`/courses/${id}/chapters/${chapterId}`),
  // 学员
  getStudents: (id: string, params?: Record<string, unknown>) => api.get(`/courses/${id}/students`, { params }),
  getStudentProgress: (id: string, userId: string) => api.get(`/courses/${id}/students/${userId}`),
  // 作业
  getWorks: (id: string, params?: Record<string, unknown>) => api.get(`/courses/${id}/works`, { params }),
  scoreWork: (workId: string, score: number, feedback?: string) => api.put(`/courses/works/${workId}/score`, { score, feedback }),
  aiScoreWork: (workId: string) => api.post(`/courses/works/${workId}/ai-score`),
  aiBatchScoreWorks: (courseId: string, chapterId?: string) => api.post(`/courses/${courseId}/works/ai-batch`, { chapterId }),
  // 评价
  getReviews: (id: string, params?: Record<string, unknown>) => api.get(`/courses/${id}/reviews`, { params }),
  getAllReviews: (id: string, params?: Record<string, unknown>) => api.get(`/courses/${id}/reviews/all`, { params }),
  replyReview: (reviewId: string, reply: string) => api.put(`/courses/reviews/${reviewId}/reply`, { reply }),
  toggleReview: (reviewId: string, status: string) => api.put(`/courses/reviews/${reviewId}/toggle`, { status }),
  // 问答
  getQuestions: (id: string, params?: Record<string, unknown>) => api.get(`/courses/${id}/questions`, { params }),
  getQuestionTags: (id: string) => api.get(`/courses/${id}/questions/tags`),
  answerQuestion: (qaId: string, answer: string) => api.put(`/courses/questions/${qaId}/answer`, { answer }),
  closeQuestion: (qaId: string) => api.put(`/courses/questions/${qaId}/close`),
  aiSuggestAnswer: (qaId: string) => api.post(`/courses/questions/${qaId}/ai-suggest`),
  // 统计
  getStats: (id: string) => api.get(`/courses/${id}/stats`),
  // 相关课程
  getRelated: (id: string, limit?: number, useAi?: boolean) => api.get(`/courses/${id}/related`, { params: { limit, useAi: useAi ? 'true' : 'false' } }),
  // 分类
  getCategories: () => api.get("/courses/categories"),
  listDrafts: (params?: Record<string, unknown>) => api.get("/courses/drafts", { params }),
  createDraft: (data: Record<string, unknown>) => api.post("/courses/drafts", data),
  updateDraft: (id: string, data: Record<string, unknown>) => api.put(`/courses/drafts/${id}`, data),
  deleteDraft: (id: string) => api.delete(`/courses/drafts/${id}`),
  publishDraft: (id: string) => api.post(`/courses/drafts/${id}/publish`),
  getLiveRooms: (id: string) => api.get(`/courses/${id}/live-rooms`),
};

// 排盘
export const paipanApi = {
  preview: (data: Record<string, unknown>) => api.post("/paipan/bazi/preview", data),
  save: (data: Record<string, unknown>) => api.post("/paipan/bazi", data),
  history: (params?: Record<string, unknown>) => api.get("/paipan/bazi", { params }),
  detail: (id: string) => api.get(`/paipan/bazi/${id}`),
  // 紫微斗数
  ziweiPreview: (data: Record<string, unknown>) => api.post("/paipan/ziwei/preview", data),
  ziweiSave: (data: Record<string, unknown>) => api.post("/paipan/ziwei", data),
  ziweiHistory: (params?: Record<string, unknown>) => api.get("/paipan/ziwei", { params }),
  ziweiDetail: (id: string) => api.get(`/paipan/ziwei/${id}`),
  // 奇门遁甲
  qimenPreview: (data: Record<string, unknown>) => api.post("/paipan/qimen", data),
  qimenSave: (data: Record<string, unknown>) => api.post("/paipan/qimen/save", data),
  qimenHistory: (params?: Record<string, unknown>) => api.get("/paipan/qimen/history", { params }),
  qimenDetail: (id: string) => api.get(`/paipan/qimen/${id}`),
  // 阳盘命理
  yangpanPreview: (data: Record<string, unknown>) => api.post("/paipan/yangpan", data),
  yangpanSave: (data: Record<string, unknown>) => api.post("/paipan/yangpan/save", data),
  yangpanHistory: (params?: Record<string, unknown>) => api.get("/paipan/yangpan/history", { params }),
  yangpanDetail: (id: string) => api.get(`/paipan/yangpan/${id}`),
  // 六爻
  liuyaoPreview: (data: Record<string, unknown>) => api.post("/paipan/liuyao", data),
  liuyaoSave: (data: Record<string, unknown>) => api.post("/paipan/liuyao/save", data),
  liuyaoHistory: (params?: Record<string, unknown>) => api.get("/paipan/liuyao/history", { params }),
  liuyaoDetail: (id: string) => api.get(`/paipan/liuyao/${id}`),
  // 大六壬
  daliurenPreview: (data: Record<string, unknown>) => api.post("/paipan/daliuren", data),
  daliurenSave: (data: Record<string, unknown>) => api.post("/paipan/daliuren/save", data),
  daliurenHistory: (params?: Record<string, unknown>) => api.get("/paipan/daliuren/history", { params }),
  daliurenDetail: (id: string) => api.get(`/paipan/daliuren/${id}`),
  // 管理员
  adminRecords: (params?: Record<string, unknown>) => api.get("/paipan/admin/records", { params }),
};

// 仪表盘
export const dashboardApi = {
  stats: () => api.get("/dashboard/stats"),
  trends: () => api.get("/dashboard/trends"),
  charts: () => api.get("/dashboard/charts"),
  revenue: () => api.get("/dashboard/revenue"),
  course: (id: string) => api.get(`/dashboard/courses/${id}`),
  live: (id: string) => api.get(`/dashboard/live/${id}`),
  roleDashboard: (roleType: string) => api.get(`/dashboard/role/${roleType}`),
  platform: () => api.get("/dashboard/platform"),
  systemHealth: () => api.get("/dashboard/system-health"),
  realtime: () => api.get("/dashboard/realtime"),
  bigscreen: () => api.get("/dashboard/bigscreen"),
  contentHealth: () => api.get("/dashboard/content-health"),
  funnel: () => api.get("/dashboard/funnel"),
  todayOverview: () => api.get("/dashboard/today-overview"),
  alerts: () => api.get("/dashboard/alerts"),
  circle: (id: string) => api.get(`/dashboard/circles/${id}`),
  station: (id: string) => api.get(`/dashboard/station/${id}`),
  offline: (id: string) => api.get(`/dashboard/offline/${id}`),
  generateDailyReport: () => api.post("/dashboard/report/daily"),
  // 运营看板（看-P1·DashboardDaily 天级聚合）
  daily: (days = 30) => api.get("/dashboard/daily", { params: { days } }),
  today: () => api.get("/dashboard/today"),
  rebuild: (date?: string) => api.post("/dashboard/rebuild", null, { params: date ? { date } : {} }),
};

// 圈子
export const circleApi = {
  list: (params?: Record<string, unknown>) => api.get("/circles", { params }),
  detail: (id: string) => api.get(`/circles/${id}`),
  create: (data: Record<string, unknown>) => api.post("/circles", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/circles/${id}`, data),
  remove: (id: string) => api.delete(`/circles/${id}`),
  // 成员管理
  getMembers: (circleId: string, params?: { page?: number; pageSize?: number }) =>
    api.get(`/circles/${circleId}/members`, { params }),
  updateMember: (circleId: string, userId: string, data: { role: string }) =>
    api.put(`/circles/${circleId}/members/${userId}/role`, data),
  removeMember: (circleId: string, userId: string) =>
    api.delete(`/circles/${circleId}/members/${userId}`),
  // 帖子管理
  createPost: (circleId: string, data: Record<string, unknown>) => api.post(`/circles/${circleId}/posts`, data),
  getPosts: (circleId: string, params?: Record<string, unknown>) =>
    api.get(`/circles/${circleId}/posts`, { params }),
  getPostDetail: (circleId: string, postId: string) =>
    api.get(`/circles/${circleId}/posts/${postId}`),
  updatePost: (circleId: string, postId: string, data: Record<string, unknown>) =>
    api.put(`/circles/${circleId}/posts/${postId}`, data),
  toggleEssence: (circleId: string, postId: string) =>
    api.post(`/circles/${circleId}/posts/${postId}/essence`),
  toggleTop: (circleId: string, postId: string) =>
    api.post(`/circles/${circleId}/posts/${postId}/top`),
  deletePost: (circleId: string, postId: string) =>
    api.delete(`/circles/${circleId}/posts/${postId}`),
  publishPost: (circleId: string, postId: string) =>
    api.post(`/circles/${circleId}/posts/${postId}/publish`),
  // 排行
  getCircleRanking: (params?: { page?: number; pageSize?: number; sortBy?: string }) =>
    api.get("/circles/ranking", { params }),
  getLeaderboard: (circleId: string, params?: Record<string, unknown>) =>
    api.get(`/circles/${circleId}/leaderboard`, { params }),
  getHotContent: (circleId: string, limit?: number) =>
    api.get(`/circles/${circleId}/hot-content`, { params: { limit: limit || 10 } }),
  // 达人管理
  listExperts: (circleId: string) => api.get(`/circles/${circleId}/experts`),
  getExpertConfig: (circleId: string, userId: string) =>
    api.get(`/circles/${circleId}/expert/${userId}`),
  setExpertConfig: (circleId: string, data: { userId?: string; questionPriceCoin?: number; callPricePerMinuteCoin?: number }) =>
    api.post(`/circles/${circleId}/expert/config`, data),
  // 付费入圈
  prepareJoin: (circleId: string, data?: Record<string, unknown>) => api.post(`/circles/${circleId}/join/prepare`, data),
  confirmJoin: (circleId: string, data?: Record<string, unknown>) => api.post(`/circles/${circleId}/join/confirm`, data),
  getJoinStatus: (circleId: string) => api.get(`/circles/${circleId}/join/status`),
  renew: (circleId: string, data?: Record<string, unknown>) => api.post(`/circles/${circleId}/renew`, data),
  // 公告
  getAnnouncement: (circleId: string) => api.get(`/circles/${circleId}/announcement`),
  setAnnouncement: (circleId: string, content: string, isTop?: boolean) => api.put(`/circles/${circleId}/announcement`, { content, isTop }),
  listAnnouncements: (circleId: string, page?: number, pageSize?: number) =>
    api.get(`/circles/${circleId}/announcements`, { params: { page, pageSize } }),
  deleteAnnouncement: (circleId: string, announcementId: string) =>
    api.delete(`/circles/${circleId}/announcement/${announcementId}`),
  // 邀请
  getInvitationStats: (circleId: string) => api.get(`/circles/${circleId}/invitation-stats`),
  // 分组
  listGroups: (circleId: string) => api.get(`/circles/${circleId}/member-groups`),
  createGroup: (circleId: string, data: Record<string, unknown>) => api.post(`/circles/${circleId}/member-groups`, data),
  updateGroup: (circleId: string, groupId: string, data: Record<string, unknown>) => api.put(`/circles/${circleId}/member-groups/${groupId}`, data),
  deleteGroup: (circleId: string, groupId: string) => api.delete(`/circles/${circleId}/member-groups/${groupId}`),
  addMembersToGroup: (circleId: string, groupId: string, userIds: string[]) =>
    api.post(`/circles/${circleId}/member-groups/${groupId}/members`, { userIds }),
  removeMemberFromGroup: (circleId: string, groupId: string, userId: string) =>
    api.delete(`/circles/${circleId}/member-groups/${groupId}/members/${userId}`),
  getGroupMembers: (circleId: string, groupId: string, params?: { page?: number; pageSize?: number }) =>
    api.get(`/circles/${circleId}/member-groups/${groupId}/members`, { params }),
  // 收益
  getRevenue: (circleId: string, params?: Record<string, unknown>) => api.get(`/circles/${circleId}/dashboard/revenue-breakdown`, { params }),
};

// 视频
export const videoApi = {
  list: (params?: Record<string, unknown>) => api.get("/videos", { params }),
  detail: (id: string) => api.get(`/videos/${id}`),
  create: (data: Record<string, unknown>) => api.post("/videos", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/videos/${id}`, data),
  remove: (id: string) => api.delete(`/videos/${id}`),
  // VOD 上传签名
  getUploadSignature: (data?: Record<string, unknown>) => api.post("/videos/vod/upload-signature", data),
  // VOD 播放鉴权签名
  getPlaySignature: (fileId: string, expire?: number) => api.get(`/videos/vod/play-signature/${fileId}`, { params: { expire } }),
  // VOD URL拉取上传
  pullUpload: (data: Record<string, unknown>) => api.post("/videos/vod/pull-upload", data),
  // VOD 媒资处理（转码+截图+水印）
  processMedia: (fileId: string, data?: Record<string, unknown>) => api.post(`/videos/vod/process/${fileId}`, data),
  // VOD 视频剪辑
  clipVideo: (data: Record<string, unknown>) => api.post("/videos/vod/clip", data),
  // VOD 媒资信息
  getMediaInfo: (fileId: string) => api.get(`/videos/vod/media/${fileId}`),
  // VOD 删除媒资
  deleteMedia: (fileId: string) => api.delete(`/videos/vod/media/${fileId}`),
  // VOD 媒资搜索
  searchVodMedia: (params?: Record<string, unknown>) => api.get("/videos/vod/search", { params }),
  // VOD 播放统计
  getPlaybackStats: (fileId: string, params: { startDate: string; endDate: string }) => api.get(`/videos/vod/playback-stats/${fileId}`, { params }),
  // VOD 播放统计概览
  getPlaybackSummary: (params: { startDate: string; endDate: string }) => api.get("/videos/vod/playback-summary", { params }),
  // 收藏管理
  getCollectedList: (params?: Record<string, unknown>) => api.get("/videos/collected/mine", { params }),
  // 分享记录
  recordShare: (id: string) => api.post(`/videos/${id}/share`),
  // 商品关联
  addProduct: (videoId: string, productId: string) => api.post(`/videos/${videoId}/products/${productId}`),
  removeProduct: (videoId: string, productId: string) => api.delete(`/videos/${videoId}/products/${productId}`),
};

// 直播
export const liveApi = {
  rooms: (params?: Record<string, unknown>) => api.get("/live/rooms", { params }),
  detail: (id: string) => api.get(`/live/rooms/${id}`),
  create: (data: Record<string, unknown>) => api.post("/live/rooms", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/live/rooms/${id}`, data),
  endRoom: (id: string) => api.put(`/live/rooms/${id}/end`),
  remove: (id: string) => api.delete(`/live/rooms/${id}`),
  // 礼物管理
  gifts: () => api.get("/live/gifts"),
  createGift: (data: Record<string, unknown>) => api.post("/live/gifts", data),
  updateGift: (id: string, data: Record<string, unknown>) => api.put(`/live/gifts/${id}`, data),
  removeGift: (id: string) => api.delete(`/live/gifts/${id}`),
  // 秒杀管理
  flashSales: (roomId: string) => api.get(`/live/rooms/${roomId}/flash-sales`),
  // 审核日志
  auditLogs: (roomId: string, params?: Record<string, unknown>) => api.get(`/live/rooms/${roomId}/audit-logs`, { params }),
  // 预约统计
  bookings: (roomId: string) => api.get(`/live/rooms/${roomId}/bookings`),
};

// 用户管理
export const userApi = {
  list: (params?: Record<string, unknown>) => api.get("/users", { params }),
  detail: (id: string) => api.get(`/users/${id}`),
  assignRole: (id: string, data: Record<string, unknown>) => api.post(`/users/${id}/roles`, data),
  removeRole: (id: string, roleType: string, bindId?: string) => api.delete(`/users/${id}/roles/${roleType}`, { data: { bindId } }),
  updateStatus: (id: string, status: string) => api.put(`/users/${id}/status`, { status }),
  ban: (id: string, reason?: string) => api.put(`/users/${id}/status`, { status: 'DISABLED', reason }),
  unban: (id: string) => api.put(`/users/${id}/status`, { status: 'ACTIVE' }),
  getUserStats: (id: string) => api.get(`/users/${id}/stats`),
  getUserPurchases: (id: string, params?: Record<string, unknown>) => api.get(`/users/${id}/purchases`, { params }),
  getAdminProfile: (id: string) => api.get(`/users/${id}/profile`),
  getInterestStats: () => api.get("/users/stats/interests"),
  pushByTag: (data: { tag: string; title: string; content: string }) => api.post("/users/push/by-tag", data),
  listWhitelist: () => api.get("/users/whitelist"),
  addWhitelist: (data: { userId: string; reason?: string }) => api.post("/users/whitelist", data),
  removeWhitelist: (userId: string) => api.delete(`/users/whitelist/${userId}`),
};

// 实名认证
export const identityApi = {
  list: (params?: Record<string, unknown>) => api.get("/identity/admin/audit-list", { params }),
  approve: (id: string) => api.post(`/identity/admin/approve/${id}`),
  reject: (id: string, reason: string) => api.post(`/identity/admin/reject/${id}`, { reason }),
};

// 古籍
export const classicApi = {
  list: (params?: Record<string, unknown>) => api.get("/classic/books", { params }),
  detail: (id: string) => api.get(`/classic/books/${id}`),
  create: (data: Record<string, unknown>) => api.post("/classic/books", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/classic/books/${id}`, data),
  remove: (id: string) => api.delete(`/classic/books/${id}`),
  getChapters: (bookId: string) => api.get(`/classic/books/${bookId}/chapters`),
  addChapter: (bookId: string, data: Record<string, unknown>) => api.post(`/classic/books/${bookId}/chapters`, data),
  updateChapter: (id: string, data: Record<string, unknown>) => api.put(`/classic/chapters/${id}`, data),
  deleteChapter: (id: string) => api.delete(`/classic/chapters/${id}`),
  // 注疏管理
  listAnnotations: (bookId: string, params?: { chapterId?: string; page?: number; pageSize?: number }) =>
    api.get(`/classic/books/${bookId}/annotations`, { params }),
  createAnnotation: (data: { bookId: string; chapterId?: string; text: string; note: string; startPos?: number; endPos?: number }) =>
    api.post("/classic/annotations", data),
  deleteAnnotation: (id: string) => api.delete(`/classic/annotations/${id}`),
  // 版本与引用
  getBookVersions: (bookId: string) => api.get(`/classic/books/${bookId}/versions`),
  getCitation: (bookId: string, params?: { style?: string; chapterId?: string }) =>
    api.get(`/classic/books/${bookId}/cite`, { params }),
  // 管理工具
  getStats: () => api.get("/classic/admin/stats"),
  seed: () => api.post("/classic/admin/seed"),
  syncKnowledge: () => api.post("/classic/admin/sync-knowledge"),
  vectorize: () => api.post("/classic/admin/vectorize"),
  clearCache: () => api.post("/classic/admin/clear-cache"),
  setStatus: (id: string, status: string) => api.patch(`/classic/books/${id}/status`, null, { params: { status } }),
  // 笔记管理
  getAllNotes: (params?: { bookId?: string; page?: number; pageSize?: number }) =>
    api.get("/classic/admin/notes", { params }),
  deleteNote: (id: string) => api.delete(`/classic/admin/notes/${id}`),
  // 书签管理
  getAllBookmarks: (params?: { bookId?: string; page?: number; pageSize?: number }) =>
    api.get("/classic/admin/bookmarks", { params }),
  // 阅读统计
  getPlatformReadingStats: () => api.get("/classic/admin/reading-stats"),
  // 殆知阁导入
  daizhigeStats: () => api.get("/classic/admin/daizhige-stats"),
  daizhigeImport: (params?: { max?: number; category?: string }) =>
    api.post("/classic/admin/daizhige-import", null, { params }),
};

// 诗词雅集（管理端）
export const poetryAdminApi = {
  listPoems: (params?: { page?: number; pageSize?: number; status?: string; categoryId?: string; dynasty?: string; keyword?: string }) =>
    api.get("/poetry/admin/poems", { params }),
  createPoem: (data: Record<string, unknown>) => api.post("/poetry/admin/poems", data),
  updatePoem: (id: string, data: Record<string, unknown>) => api.put(`/poetry/admin/poems/${id}`, data),
  deletePoem: (id: string) => api.delete(`/poetry/admin/poems/${id}`),
  listCategories: () => api.get("/poetry/admin/categories"),
  createCategory: (data: Record<string, unknown>) => api.post("/poetry/admin/categories", data),
  updateCategory: (id: string, data: Record<string, unknown>) => api.put(`/poetry/admin/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/poetry/admin/categories/${id}`),
  listCollections: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get("/poetry/admin/collections", { params }),
  createCollection: (data: Record<string, unknown>) => api.post("/poetry/admin/collections", data),
  updateCollection: (id: string, data: Record<string, unknown>) => api.put(`/poetry/admin/collections/${id}`, data),
  deleteCollection: (id: string) => api.delete(`/poetry/admin/collections/${id}`),
};

// 智能体
export const botApi = {
  list: (params?: Record<string, unknown>) => api.get("/bots", { params }),
  detail: (id: string) => api.get(`/bots/${id}`),
  create: (data: Record<string, unknown>) => api.post("/bots", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/bots/${id}`, data),
  remove: (id: string) => api.delete(`/bots/${id}`),
  bindCircle: (id: string, data: { circleId: string; knowledgeBaseId?: string }) =>
    api.post(`/bots/${id}/bind-circle`, data),
  unbindCircle: (id: string, circleId: string) =>
    api.delete(`/bots/${id}/unbind-circle/${circleId}`),
  getCircleBot: (circleId: string) => api.get(`/bots/circle/${circleId}`),
  addKnowledge: (id: string, data: { title: string; content: string; sourceType?: string; sourceId?: string }) =>
    api.post(`/bots/${id}/knowledge`, data),
  deleteKnowledge: (knowledgeId: string) => api.delete(`/bots/knowledge/${knowledgeId}`),
  getRanking: (limit?: number) => api.get("/bots/ranking", { params: { limit: limit || 20 } }),
  syncFromCoze: () => api.post("/bots/sync/coze"),
  getCozeBotInfo: (id: string) => api.get(`/bots/${id}/coze-info`),
  runWorkflow: (data: { workflowId: string; parameters?: Record<string, any> }) =>
    api.post("/bots/workflow/run", data),
  getBotApprovals: (params?: { page?: number; pageSize?: number }) =>
    api.get("/bots/manage/approvals", { params }),
  approveBot: (circleId: string) => api.post(`/bots/manage/approvals/${circleId}/approve`),
  getBotKnowledgeList: (circleId: string, params?: { page?: number; pageSize?: number }) =>
    api.get(`/bots/manage/knowledge/${circleId}`, { params }),
  addBotKnowledge: (circleId: string, data: { title: string; content: string; sourceType?: string }) =>
    api.post(`/bots/manage/knowledge/${circleId}`, data),
  updateBotKnowledge: (knowledgeId: string, data: { title?: string; content?: string }) =>
    api.put(`/bots/manage/knowledge/${knowledgeId}`, data),
  deleteBotKnowledge: (knowledgeId: string) => api.delete(`/bots/manage/knowledge/${knowledgeId}`),
  getBotUsageData: (circleId: string) => api.get(`/bots/manage/usage/${circleId}`),
  marketplaceList: (params?: { keyword?: string; category?: string; page?: number; pageSize?: number }) =>
    api.get("/ai/marketplace/agents", { params }),
  marketplaceDetail: (id: string) => api.get(`/ai/marketplace/agents/${id}`),
};

// 研究院
export const instituteApi = {
  listMembers: (params?: Record<string, unknown>) => api.get("/institute/members", { params }),
  getMember: (id: string) => api.get(`/institute/members/${id}`),
  updateMember: (id: string, data: Record<string, unknown>) => api.put(`/institute/members/${id}`, data),
  // 特邀席位：名师破格引入（跳过准入门槛·可设永久免会费·T9-P1 §3.2 V6）
  inviteMember: (data: Record<string, unknown>) => api.post("/institute/admin/members/invite", data),
  setLecturerLevel: (id: string, level: string) => api.put(`/institute/members/${id}/lecturer-level`, { level }),
  verifyTask: (taskId: string) => api.post(`/institute/tasks/${taskId}/verify`),
  createEvent: (data: Record<string, unknown>) => api.post("/institute/events", data),
  updateEvent: (id: string, data: Record<string, unknown>) => api.put(`/institute/events/${id}`, data),
  // 管理层
  getOverview: () => api.get("/institute/manage/overview"),
  getPendingMembers: () => api.get("/institute/manage/pending-members"),
  approveMember: (id: string, data: Record<string, unknown>) => api.put(`/institute/manage/members/${id}/approve`, data),
  assignRole: (id: string, data: Record<string, unknown>) => api.put(`/institute/manage/members/${id}/role`, data),
  getFinance: (period?: string) => api.get("/institute/manage/finance", { params: { period } }),
  createDividend: (data: Record<string, unknown>) => api.post("/institute/manage/dividends", data),
  recommendToTalent: (id: string, lecturerLevel: string) => api.put(`/institute/manage/members/${id}/recommend`, { lecturerLevel }),
  // 任务模板
  listTaskTemplates: () => api.get("/institute/task-templates"),
  createTaskTemplate: (data: Record<string, unknown>) => api.post("/institute/task-templates", data),
  updateTaskTemplate: (id: string, data: Record<string, unknown>) => api.put(`/institute/task-templates/${id}`, data),
  deleteTaskTemplate: (id: string) => api.delete(`/institute/task-templates/${id}`),
  // 人才库
  getCandidates: () => api.get("/institute/candidates"),
  // 内容
  listContents: (params?: Record<string, unknown>) => api.get("/admin/institute/contents", { params }),
  createContent: (data: Record<string, unknown>) => api.post("/admin/institute/contents", data),
  getContent: (id: string) => api.get(`/admin/institute/contents/${id}`),
  updateContent: (id: string, data: Record<string, unknown>) => api.put(`/admin/institute/contents/${id}`, data),
  deleteContent: (id: string) => api.delete(`/admin/institute/contents/${id}`),
  getContentStats: () => api.get("/admin/institute/contents/stats"),
  getContentPurchases: (id: string, params?: Record<string, unknown>) => api.get(`/admin/institute/contents/${id}/purchases`, { params }),
  // 分红
  getDividends: (params?: Record<string, unknown>) => api.get("/institute/my/dividends", { params }),
};

// 分站管理（推广分站）
export const stationApi = {
  list: (params?: Record<string, unknown>) => api.get("/station", { params }),
  detail: (id: string) => api.get(`/station/${id}`),
  create: (data: Record<string, unknown>) => api.post("/station", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/station/${id}`, data),
  remove: (id: string) => api.delete(`/station/${id}`),
  earnings: (id: string, params?: Record<string, unknown>) => api.get(`/station/${id}/earnings`, { params }),
  operatorList: (params?: Record<string, unknown>) => api.get("/station/operator/list", { params }),
  createOperator: (data: Record<string, unknown>) => api.post("/station/operator", data),
  // 模版
  getTemplates: () => api.get("/station/templates/list"),
  getTemplateConfig: (id: string) => api.get(`/station/templates/${id}`),
  setTemplate: (stationId: string, data: { templateId: string; templateConfig?: Record<string, unknown> }) =>
    api.put(`/station/${stationId}/template`, data),
  getBrand: (id: string) => api.get(`/station/${id}/brand`),
  getMiniConfig: (id: string) => api.get(`/station/${id}/mini-config`),
  getRevenueDashboard: (id: string) => api.get(`/station/${id}/revenue-dashboard`),
  getOperatorMiniConfig: (id: string) => api.get(`/station/operator/${id}/mini-config`),
  updateOperatorBrand: (id: string, data: Record<string, unknown>) => api.put(`/station/operator/${id}/brand`, data),
  getTeamMembers: (params?: Record<string, unknown>) => api.get("/station/team/members", { params }),
  getTeamLeaderboard: (params?: Record<string, unknown>) => api.get("/station/team/leaderboard", { params }),
  getTeamActivity: (params?: Record<string, unknown>) => api.get("/station/team/activity", { params }),
  getTeamSuccessCases: (params?: Record<string, unknown>) => api.get("/station/team/success-cases", { params }),
  listPromotionMaterials: (params?: Record<string, unknown>) => api.get("/station/promotion/materials", { params }),
  getPromotionMaterial: (id: string) => api.get(`/station/promotion/materials/${id}`),
  createPromotionMaterial: (data: Record<string, unknown>) => api.post("/station/promotion/materials", data),
  deletePromotionMaterial: (id: string) => api.delete(`/station/promotion/materials/${id}`),
  listReferralConfigs: () => api.get("/admin/referral/temp-configs"),
  getActiveReferralConfig: () => api.get("/admin/referral/temp-configs/active"),
  getReferralConfigHistory: () => api.get("/admin/referral/temp-configs/history"),
  getReferralConfig: (id: string) => api.get(`/admin/referral/temp-configs/${id}`),
  createReferralConfig: (data: Record<string, unknown>) => api.post("/admin/referral/temp-configs", data),
  updateReferralConfig: (id: string, data: Record<string, unknown>) => api.put(`/admin/referral/temp-configs/${id}`, data),
  deleteReferralConfig: (id: string) => api.delete(`/admin/referral/temp-configs/${id}`),
};

// 线下驿站管理（完整 API）
export const offlineApi = {
  list: (params?: Record<string, unknown>) => api.get("/offline/stations", { params }),
  detail: (id: string) => api.get(`/offline/stations/${id}`),
  create: (data: Record<string, unknown>) => api.post("/offline/stations", data),
  audit: (id: string, status: string) => api.put(`/offline/stations/${id}/audit`, { status }),
  courses: (params?: Record<string, unknown>) => api.get("/offline/courses", { params }),
  createCourse: (data: Record<string, unknown>) => api.post("/offline/courses", data),
  members: (params?: Record<string, unknown>) => api.get("/offline/institute/members", { params }),
  updateMember: (id: string, data: Record<string, unknown>) => api.put(`/offline/institute/members/${id}`, data),
  getRevenueDashboard: (id: string) => api.get(`/offline/stations/${id}/revenue-dashboard`),
  getPendingCourses: (params?: Record<string, unknown>) => api.get("/offline/admin/courses/pending", { params }),
  auditCourse: (id: string, status: string) => api.put(`/offline/admin/courses/${id}/audit`, { status }),
  recommendCourse: (id: string, data?: Record<string, unknown>) => api.put(`/offline/admin/courses/${id}/recommend`, data),
  getRecommendedCourses: () => api.get("/offline/admin/courses/recommended"),
  getCourseRegistrations: (id: string, params?: Record<string, unknown>) => api.get(`/offline/courses/${id}/registrations`, { params }),
  addProduct: (stationId: string, data: Record<string, unknown>) => api.post(`/offline/stations/${stationId}/products`, data),
  updateProduct: (productId: string, data: Record<string, unknown>) => api.put(`/offline/products/${productId}`, data),
  getProducts: (stationId: string) => api.get(`/offline/stations/${stationId}/products`),
  deleteProduct: (productId: string) => api.delete(`/offline/products/${productId}`),
  getStationOrders: (stationId: string, params?: Record<string, unknown>) => api.get(`/offline/stations/${stationId}/orders`, { params }),
  updateOrder: (orderId: string, data: Record<string, unknown>) => api.put(`/offline/orders/${orderId}`, data),
  getSettlements: (stationId: string) => api.get(`/offline/stations/${stationId}/settlements`),
  createSettlement: (stationId: string, data: Record<string, unknown>) => api.post(`/offline/stations/${stationId}/settlements`, data),
  settleSettlement: (settlementId: string) => api.put(`/offline/settlements/${settlementId}/settle`),
  createTeacher: (data: Record<string, unknown>) => api.post("/offline/admin/teachers", data),
  listTeachers: (params?: Record<string, unknown>) => api.get("/offline/admin/teachers", { params }),
  getTeacher: (id: string) => api.get(`/offline/admin/teachers/${id}`),
  updateTeacher: (id: string, data: Record<string, unknown>) => api.put(`/offline/admin/teachers/${id}`, data),
  deleteTeacher: (id: string) => api.delete(`/offline/admin/teachers/${id}`),
  getTeacherSchedule: (id: string) => api.get(`/offline/admin/teachers/${id}/schedule`),
  setTeacherAvailability: (id: string, data: Record<string, unknown>) => api.post(`/offline/admin/teachers/${id}/availability`, data),
  getScheduleConflicts: () => api.get("/offline/admin/schedule/conflicts"),
  getTeacherBookings: (stationId: string, params?: Record<string, unknown>) => api.get(`/offline/stations/${stationId}/teacher-bookings`, { params }),
  confirmBooking: (bookingId: string) => api.put(`/offline/teacher-bookings/${bookingId}/confirm`),
  cancelBooking: (bookingId: string) => api.put(`/offline/teacher-bookings/${bookingId}/cancel`),
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
  // 获取 VOD 上传签名(视频直传腾讯云点播·前端用 vod-js-sdk-v6 拿此签名上传)
  getVodSignature: () => api.post("/videos/vod/upload-signature", {}),
};

// 分佣管理
export const commissionApi = {
  getConfigs: () => api.get("/commission/configs"),
  updateConfig: (key: string, data: Record<string, unknown>) => api.put(`/commission/configs/${key}`, data),
  stationEarnings: (stationId: string, params?: Record<string, unknown>) => api.get(`/commission/station-earnings/${stationId}`, { params }),
  stationBalance: (stationId: string) => api.get(`/commission/station-balance/${stationId}`),
  listWithdrawals: (params?: Record<string, unknown>) => api.get("/commission/admin/withdrawals", { params }),
  auditWithdrawal: (id: string, data: { status: string; remark?: string }) => api.put(`/commission/admin/withdrawals/${id}`, data),
  getQuickConfig: () => api.get("/commission/config"),
  updateQuickConfig: (data: Record<string, unknown>) => api.put("/commission/config", data),
  getPlatformFeeSummary: () => api.get("/commission/platform-fee/summary"),
};

// 审计日志
export const auditApi = {
  list: (params?: Record<string, unknown>) => api.get("/system/audit-logs", { params }),
  getActions: () => api.get("/system/audit-actions"),
  moderateImage: (imageUrl: string, context?: string) =>
    api.post("/audit/moderate/image", { imageUrl, context }),
  moderateText: (text: string, context?: string) =>
    api.post("/audit/moderate/text", { text, context }),
  getOperationLogs: (params?: { page?: number; pageSize?: number; action?: string; userId?: string }) =>
    api.get("/audit/operation-logs", { params }),
  getOperationLog: (id: string) => api.get(`/audit/operation-logs/${id}`),
};

// 业务哨兵（O-T1·告警查看/处置）
export const sentinelApi = {
  listAlerts: (params?: { page?: number; pageSize?: number; status?: string; level?: string; rule?: string }) =>
    api.get("/sentinel/alerts", { params }),
  resolveAlert: (id: string) => api.post(`/sentinel/alerts/${id}/resolve`),
  patrol: () => api.post("/sentinel/patrol"),
};

// 创作排行榜（创-P1·质量加权内容学分 Top20·公开端点）
export const creationRankingApi = {
  list: (period: "week" | "month") => api.get("/users/creation-rankings", { params: { period } }),
};

// 转化漏斗（D-T1·FunnelDaily 日聚合）
export const funnelApi = {
  daily: (funnel: string, days = 14) => api.get("/dashboard/funnels/daily", { params: { funnel, days } }),
  rebuild: (date?: string) => api.post("/dashboard/funnels/daily/rebuild", null, { params: date ? { date } : {} }),
};

// 用户标签（D-T2·分布/圈人。R2红线：标签禁用于差异化定价）
export const userTagApi = {
  distribution: () => api.get("/user-tags/distribution"),
  byTag: (tag: string, page = 1, pageSize = 20) => api.get("/user-tags/by-tag", { params: { tag, page, pageSize } }),
  ofUser: (userId: string) => api.get(`/user-tags/user/${userId}`),
  recompute: () => api.post("/user-tags/recompute"),
};

// 可观测性（T3·性能观测页）
export const observabilityApi = {
  apiPerf: (minutes = 60) => api.get("/observability/api-perf", { params: { minutes } }),
  webVitals: (days = 7) => api.get("/observability/web-vitals", { params: { days } }),
  nginx: () => api.get("/observability/nginx"),
};

// 审核举报管理
export const auditReportApi = {
  list: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get("/audit/reports", { params }),
  handle: (id: string, data: { result: string; note?: string }) =>
    api.put(`/audit/reports/${id}`, data),
};

// 特性开关管理
export const featureFlagApi = {
  list: () => api.get("/admin/feature-flags"),
  detail: (key: string) => api.get(`/admin/feature-flags/${key}`),
  create: (data: { key: string; name: string; description?: string; enabled: boolean; percentage?: number; whitelist?: string[] }) =>
    api.post("/admin/feature-flags", data),
  update: (key: string, data: Record<string, unknown>) => api.put(`/admin/feature-flags/${key}`, data),
  delete: (key: string) => api.delete(`/admin/feature-flags/${key}`),
};

// 任务池管理
export const taskApi = {
  list: (params?: { status?: string; type?: string; assignee?: string; page?: number; pageSize?: number }) =>
    api.get("/tasks", { params }),
  detail: (id: string) => api.get(`/tasks/${id}`),
  create: (data: Record<string, unknown>) => api.post("/tasks", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/tasks/${id}`, data),
  claim: (id: string) => api.post(`/tasks/${id}/claim`),
  transfer: (id: string, data: { assignee: string }) => api.post(`/tasks/${id}/transfer`, data),
  forceReclaim: (id: string) => api.post(`/tasks/${id}/force-reclaim`),
  approve: (id: string, data: { status: string; note?: string }) => api.post(`/tasks/${id}/approve`, data),
  rollback: (id: string) => api.post(`/tasks/${id}/rollback`),
  pendingCount: () => api.get("/tasks/stats/pending"),
};

// 系统配置
export const systemApi = {
  // 配置管理
  listConfigs: () => api.get("/system/configs"),
  getThirdPartySchema: () => api.get("/system/third-party-schema"),
  // 品牌配置（租-T0 品牌抽象）
  getBrandConfig: () => api.get("/system/public/brand-config"),
  updateBrandConfig: (data: Record<string, string>) => api.put("/system/brand-config", data),
  setConfig: (key: string, data: { value: string; description?: string }) =>
    api.put(`/system/configs/${key}`, data),
  deleteConfig: (key: string) => api.delete(`/system/configs/${key}`),
  // 配置版本管理
  getConfigVersions: (params?: { page?: number; pageSize?: number }) =>
    api.get("/system/config-versions", { params }),
  getConfigVersion: (id: string) => api.get(`/system/config-versions/${id}`),
  rollbackConfig: (data: { configKey: string; version: number }) => api.post("/system/config-versions/rollback", data),
  getConfigDiff: (params: { versionId1: string; versionId2: string }) =>
    api.get("/system/config-diff", { params }),
  // 系统运维
  getHealth: () => api.get("/system/health"),
  getMaintenanceStatus: () => api.get("/system/maintenance"),
  toggleMaintenance: (data: { enabled: boolean; message?: string }) =>
    api.put("/system/maintenance", data),
  getAutomationStatus: () => api.get("/system/automation/status"),
  toggleAutomation: (data: { enabled: boolean }) => api.post("/system/automation/toggle", data),
  // 品类树
  getCategoryTree: () => api.get("/system/category-tree"),
  updateCategoryTree: (tree: Record<string, string[]>) =>
    api.put("/system/category-tree", tree),
  getCourseCategoryTree: () => api.get("/system/course-category-tree"),
  updateCourseCategoryTree: (tree: Record<string, string[]>) => api.put("/system/course-category-tree", tree),
  // 全站公告
  listSiteNotices: (params?: { page?: number; pageSize?: number }) =>
    api.get("/system/site-notices", { params }),
  createSiteNotice: (data: { title: string; content: string; level?: string }) =>
    api.post("/system/site-notices", data),
  updateSiteNotice: (id: string, data: Record<string, unknown>) => api.put(`/system/site-notices/${id}`, data),
  deleteSiteNotice: (id: string) => api.delete(`/system/site-notices/${id}`),
  // 会员配置
  getMemberConfigs: () => api.get("/system/member-configs"),
  createMemberConfig: (data: Record<string, unknown>) => api.post("/system/member-configs", data),
  updateMemberConfig: (id: string, data: Record<string, unknown>) => api.put(`/system/member-configs/${id}`, data),
  deleteMemberConfig: (id: string) => api.delete(`/system/member-configs/${id}`),
  // Cron调度
  getCronStatus: () => api.get("/system/cron-status"),
  triggerCron: (jobName: string) => api.post(`/system/cron/${jobName}`),
};

// 法律文件管理
export const legalApi = {
  get: (type: string) => api.get(`/system/legal/${type}`),
  getVersions: (type: string) => api.get(`/system/legal/${type}/versions`),
  create: (data: { type: string; title: string; content: string }) =>
    api.post("/system/legal", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/system/legal/${id}`, data),
  delete: (id: string) => api.delete(`/system/legal/${id}`),
};

// 版本管理
export const versionApi = {
  list: () => api.get("/system/version"),
  check: (current: string) => api.get("/system/version/check", { params: { current } }),
  create: (data: Record<string, unknown>) => api.post("/system/version", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/system/version/${id}`, data),
  delete: (id: string) => api.delete(`/system/version/${id}`),
};

// 评论管理
export const commentApi = {
  list: (params?: Record<string, unknown>) => api.get("/comment", { params }),
  count: (params?: Record<string, unknown>) => api.get("/comment/count", { params }),
  hide: (id: string) => api.put(`/comment/${id}/hide`),
  remove: (id: string) => api.delete(`/comment/${id}`),
  getReplies: (id: string, params?: Record<string, unknown>) => api.get(`/comment/${id}/replies`, { params }),
  getModerationList: (params?: Record<string, unknown>) => api.get("/comment/moderation/list", { params }),
  batchHide: (ids: string[]) => api.put("/comment/moderation/batch-hide", { ids }),
};

// 商城管理
export const shopApi = {
  // 优惠券
  listCoupons: (params?: Record<string, unknown>) => api.get("/shop/coupons", { params }),
  createCoupon: (data: Record<string, unknown>) => api.post("/shop/coupons", data),
  updateCoupon: (id: string, data: Record<string, unknown>) => api.put(`/shop/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/shop/coupons/${id}`),
  updateCouponStatus: (id: string, status: string) => api.put(`/shop/coupons/${id}/status`, { status }),
  batchGrantCoupon: (id: string, userIds: string[]) => api.post(`/shop/coupons/${id}/batch-grant`, { userIds }),
  // 物流
  getLogistics: (orderId: string) => api.get(`/shop/orders/${orderId}/logistics`),
  updateLogistics: (orderId: string, data: Record<string, unknown>) => api.put(`/shop/orders/${orderId}/logistics`, data),
  // 评价
  listReviews: (productId: string, params?: Record<string, unknown>) => api.get(`/shop/products/${productId}/reviews`, { params }),
};

// 虚拟币管理
export const coinApi = {
  /** 充值记录列表 */
  getRecharges: (page: number, pageSize: number, userId?: string) =>
    api.get("/coin/admin/recharges", { params: { page, pageSize, userId } }),
  /** 管理员查看所有交易流水 */
  getAdminTransactions: (params?: { page?: number; pageSize?: number; userId?: string; type?: string; scene?: string }) =>
    api.get("/coin/admin/transactions", { params }),
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
  list: (params?: Record<string, unknown>) => api.get("/question", { params }),
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
  list: (params?: { page?: number; pageSize?: number; status?: string; categoryId?: string; keyword?: string }) =>
    api.get("/shop/products", { params }),
  detail: (id: string) => api.get(`/shop/products/${id}`),
  create: (data: Record<string, unknown>) => api.post("/shop/products", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/shop/products/${id}`, data),
  updateStatus: (id: string, status: string) => api.put(`/shop/products/${id}/status`, { status }),
  // 逐品站长推广佣金率（佣-V2·仅平台运营·rate 传 null=清除逐品配置回落类目默认）
  setCommissionRate: (id: string, rate: number | null) =>
    api.put(`/shop/products/${id}/commission-rate`, rate == null ? {} : { commissionRate: rate }),
  delete: (id: string) => api.delete(`/shop/products/${id}`),
  // SKU
  addSku: (productId: string, data: { name: string; price: number; stock: number; image?: string; attrs?: Record<string, string> }) =>
    api.post(`/shop/products/${productId}/skus`, data),
  deleteSku: (skuId: string) => api.delete(`/shop/skus/${skuId}`),
  // 分类树
  getCategoryTree: () => api.get("/shop/categories/tree"),
};

// 订单管理（管理后台）
export const orderApi = {
  list: (params?: { page?: number; pageSize?: number; status?: string; type?: string; orderNo?: string; userId?: string; startDate?: string; endDate?: string }) =>
    api.get("/shop/orders", { params }),
  detail: (id: string) => api.get(`/shop/orders/${id}`),
  pay: (id: string) => api.put(`/shop/orders/${id}/pay`),
  ship: (id: string) => api.put(`/shop/orders/${id}/ship`),
  refund: (id: string) => api.put(`/shop/orders/${id}/refund`),
  complete: (id: string) => api.put(`/shop/orders/${id}/complete`),
  cancel: (id: string) => api.put(`/shop/orders/${id}/cancel`),
  getLogistics: (id: string) => api.get(`/shop/orders/${id}/logistics`),
  updateLogistics: (id: string, data: Record<string, unknown>) => api.put(`/shop/orders/${id}/logistics`, data),
};

// 搜索统计
export const searchApi = {
  getStats: () => api.get("/search/stats"),
  getWeights: (entityType?: string) => api.get("/search/weights", { params: entityType ? { entityType } : {} }),
  upsertWeight: (data: { entityType: string; fieldName: string; weight: number; enabled?: boolean }) => api.post("/search/weights", data),
  deleteWeight: (id: string) => api.delete(`/search/weights/${id}`),
  seedWeights: () => api.post("/search/weights/seed"),
  hot: (limit?: number) => api.get("/search/hot", { params: { limit } }),
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
  getSettlements: (id: string, params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get(`/admin/merchants/${id}/settlements`, { params }),
  generateSettlement: (id: string, data: { periodStart: string; periodEnd: string }) =>
    api.post(`/admin/merchants/${id}/settlements/generate`, data),
  getSettlementDetail: (id: string, settlementId: string) =>
    api.get(`/admin/merchants/${id}/settlements/${settlementId}`),
  paySettlement: (id: string, settlementId: string, data: { amount: number; remark?: string }) =>
    api.post(`/admin/merchants/${id}/settlements/${settlementId}/pay`, data),
  cancelSettlement: (id: string, settlementId: string) =>
    api.post(`/admin/merchants/${id}/settlements/${settlementId}/cancel`),
  // 处罚（履-P3）
  listPunishments: (params?: { merchantId?: string; status?: string; type?: string; page?: number; pageSize?: number }) =>
    api.get("/admin/merchants/punishments", { params }),
  createPunishment: (data: { merchantId: string; type: string; reason: string; evidence?: Record<string, unknown>; expiresAt?: string }) =>
    api.post("/admin/merchants/punishments", data),
  revokePunishment: (punishmentId: string, data?: { reason?: string }) =>
    api.put(`/admin/merchants/punishments/${punishmentId}/revoke`, data || {}),
};

// 商家后台（已入驻商家自己的管理端，路由 /merchant-backend/*）
export const merchantBackendApi = {
  getDashboard: () => api.get("/merchant-backend/dashboard"),
  getProfile: () => api.get("/merchant-backend/profile"),
  updateProfile: (data: { shopName?: string; shopLogo?: string; shopIntro?: string }) =>
    api.put("/merchant-backend/profile", data),
  // 商品
  listProducts: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get("/merchant-backend/products", { params }),
  createProduct: (data: Record<string, unknown>) => api.post("/merchant-backend/products", data),
  updateProduct: (id: string, data: Record<string, unknown>) => api.put(`/merchant-backend/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/merchant-backend/products/${id}`),
  listProduct: (id: string) => api.post(`/merchant-backend/products/${id}/list`),
  unlistProduct: (id: string) => api.post(`/merchant-backend/products/${id}/unlist`),
  // 订单
  listOrders: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get("/merchant-backend/orders", { params }),
  getOrder: (id: string) => api.get(`/merchant-backend/orders/${id}`),
  shipOrder: (id: string, data: { company: string; trackingNo: string }) =>
    api.put(`/merchant-backend/orders/${id}/ship`, data),
  approveRefund: (id: string) => api.post(`/merchant-backend/orders/${id}/refund/approve`),
  rejectRefund: (id: string, data: { reason: string }) =>
    api.post(`/merchant-backend/orders/${id}/refund/reject`, data),
  // 评价
  listReviews: (params?: { page?: number; pageSize?: number; rating?: number }) =>
    api.get("/merchant-backend/reviews", { params }),
  replyReview: (id: string, data: { reply: string }) =>
    api.post(`/merchant-backend/reviews/${id}/reply`, data),
  // 收入结算
  getRevenue: () => api.get("/merchant-backend/revenue"),
  listSettlements: (params?: { page?: number; pageSize?: number }) =>
    api.get("/merchant-backend/settlements", { params }),
  // 违规
  listViolations: (params?: { page?: number; pageSize?: number }) =>
    api.get("/merchant-backend/violations", { params }),
  appealViolation: (id: string, data: { appeal: string }) =>
    api.post(`/merchant-backend/violations/${id}/appeal`, data),
  // 售后
  listAfterSales: (params?: { page?: number; pageSize?: number; type?: string; status?: string }) =>
    api.get("/merchant-backend/after-sales", { params }),
  getAfterSale: (id: string) => api.get(`/merchant-backend/after-sales/${id}`),
  processAfterSale: (id: string, data: { action: string; remark?: string }) =>
    api.put(`/merchant-backend/after-sales/${id}/process`, data),
  // 客户
  listCustomers: (params?: { page?: number; pageSize?: number }) =>
    api.get("/merchant-backend/customers", { params }),
};

// 电子书管理
export const ebookApi = {
  listCategories: () => api.get("/ebook/categories"),
  createCategory: (data: { name: string; sortOrder?: number }) => api.post("/ebook/categories", data),
  listBooks: (params?: { page?: number; pageSize?: number; categoryId?: string; status?: string; keyword?: string }) =>
    api.get("/ebook/books", { params }),
  detail: (id: string) => api.get(`/ebook/books/${id}`),
  create: (data: Record<string, unknown>) => api.post("/ebook/books", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/ebook/books/${id}`, data),
  delete: (id: string) => api.delete(`/ebook/books/${id}`),
  createChapter: (ebookId: string, data: Record<string, unknown>) => api.post(`/ebook/books/${ebookId}/chapters`, data),
  updateChapter: (id: string, data: Record<string, unknown>) => api.put(`/ebook/chapters/${id}`, data),
  deleteChapter: (id: string) => api.delete(`/ebook/chapters/${id}`),
  // 评价管理
  listReviews: (ebookId: string, params?: { page?: number; pageSize?: number }) =>
    api.get(`/ebook/books/${ebookId}/reviews`, { params }),
  getRating: (ebookId: string) => api.get(`/ebook/books/${ebookId}/rating`),
  deleteReview: (id: string) => api.delete(`/ebook/admin/reviews/${id}`),
  // 购买记录
  getAllPurchases: (params?: { page?: number; pageSize?: number; ebookId?: string; userId?: string }) =>
    api.get("/ebook/admin/purchases", { params }),
  // 阅读排行与统计
  getReadingRanking: (limit?: number) => api.get("/ebook/reading-ranking", { params: { limit } }),
  getPlatformReadingStats: (days?: number) => api.get("/ebook/admin/reading-stats", { params: { days } }),
  // 笔记管理
  getAllNotes: (params?: { page?: number; pageSize?: number; ebookId?: string }) =>
    api.get("/ebook/admin/notes", { params }),
  deleteNote: (id: string) => api.delete(`/ebook/notes/${id}`),
};

// 敏感词管理
export const sensitiveWordApi = {
  list: () => api.get("/audit/sensitive-words"),
  add: (data: { word: string; scopes?: string[]; level?: string }) => api.post("/audit/sensitive-words", data),
  batchAdd: (data: { words: string[]; scopes?: string[]; level?: string }) => api.post("/audit/sensitive-words/batch", data),
  delete: (word: string) => api.delete(`/audit/sensitive-words/${encodeURIComponent(word)}`),
  check: (text: string) => api.post("/audit/sensitive-words/check", { text }),
};

// 合规违禁词扫描（合-P1）
export const complianceScanApi = {
  trigger: () => api.post("/audit/compliance-scan"),
  records: (params?: { level?: string; status?: string; targetType?: string; word?: string; page?: number; pageSize?: number }) =>
    api.get("/audit/compliance-scan/records", { params }),
  stats: () => api.get("/audit/compliance-scan/stats"),
  updateStatus: (id: string, status: "RESOLVED" | "IGNORED" | "OPEN") =>
    api.put(`/audit/compliance-scan/records/${id}/status`, { status }),
};

// 数字员工运营 OS — 任务池（OS-P1）
export const opsTaskApi = {
  list: (params?: { status?: string; type?: string; priority?: string; page?: number; pageSize?: number }) =>
    api.get("/ops/tasks", { params }),
  create: (data: { type: string; title: string; priority?: string; payload?: Record<string, unknown>; needsApproval?: boolean }) =>
    api.post("/ops/tasks", data),
  claim: (id: string, executor?: string) => api.put(`/ops/tasks/${id}/claim`, executor ? { executor } : {}),
  complete: (id: string, result?: Record<string, unknown>) => api.put(`/ops/tasks/${id}/complete`, { result }),
  review: (id: string, reason: string) => api.put(`/ops/tasks/${id}/review`, { reason }),
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
  create: (data: Record<string, unknown>) => api.post("/recommend/ab-tests", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/recommend/ab-tests/${id}`, data),
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
  create: (data: Record<string, unknown>) => api.post("/admin/recommend/rules", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/admin/recommend/rules/${id}`, data),
  delete: (id: string) => api.delete(`/admin/recommend/rules/${id}`),
};

// ───────── 推荐强插管理 ─────────
export const recommendInsertApi = {
  set: (data: { position: number; contentId: string; contentType: string }) =>
    api.put("/recommend/insert", data),
  remove: (position: number) => api.delete(`/recommend/insert/${position}`),
};

// ───────── 推荐效果统计 ─────────
export const recommendStatsApi = {
  getStats: (params?: { startDate?: string; endDate?: string; scene?: string }) =>
    api.get("/recommend/admin/stats", { params }),
};

// ───────── 发现页管理 ─────────
export const discoverApi = {
  getDiscover: (params?: { page?: number; pageSize?: number; type?: string; categoryLevel1?: string }) =>
    api.get("/discover", { params }),
  getCategories: () => api.get("/discover/categories"),
  getHot: (params?: { page?: number; pageSize?: number }) =>
    api.get("/discover/hot", { params }),
  getRecommendations: (params?: { page?: number; pageSize?: number }) =>
    api.get("/discover/recommendations", { params }),
};

// ───────── 流失预警 ─────────
export const churnApi = {
  getPredictions: (params?: { riskLevel?: string; page?: number; pageSize?: number }) =>
    api.get("/admin/churn/predictions", { params }),
  getStats: () => api.get("/admin/churn/stats"),
  score: () => api.post("/admin/churn/score"),
  calculate: () => api.post("/admin/churn/calculate"),
  listRules: (params?: { page?: number; pageSize?: number }) =>
    api.get("/admin/churn/rules", { params }),
  createRule: (data: Record<string, unknown>) => api.post("/admin/churn/rules", data),
  updateRule: (id: string, data: Record<string, unknown>) => api.put(`/admin/churn/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/admin/churn/rules/${id}`),
  getActions: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get("/admin/churn/actions", { params }),
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
  getStats: () => api.get("/ai/media/tasks"), // AiLoggerService.query
  getCallLogs: (params?: { page?: number; pageSize?: number }) => api.get("/ai/media/tasks", { params }),
  getAbnormalAlerts: () => api.get("/ai/media/tasks", { params: { scene: "abnormal" } }),
};

// ───────── 营销管理 ─────────
export const marketingApi = {
  // 秒杀
  listFlashSales: (params?: Record<string, unknown>) => api.get("/marketing/flash-sales", { params }),
  createFlashSale: (data: Record<string, unknown>) => api.post("/marketing/flash-sales", data),
  updateFlashSale: (id: string, data: Record<string, unknown>) => api.put(`/marketing/flash-sales/${id}`, data),
  deleteFlashSale: (id: string) => api.delete(`/marketing/flash-sales/${id}`),
  addFlashSaleItem: (id: string, data: Record<string, unknown>) => api.post(`/marketing/flash-sales/${id}/items`, data),
  updateFlashSaleItem: (id: string, itemId: string, data: Record<string, unknown>) => api.put(`/marketing/flash-sales/${id}/items/${itemId}`, data),
  deleteFlashSaleItem: (id: string, itemId: string) => api.delete(`/marketing/flash-sales/${id}/items/${itemId}`),
  startFlashSale: (id: string) => api.post(`/marketing/flash-sales/${id}/start`),
  endFlashSale: (id: string) => api.post(`/marketing/flash-sales/${id}/end`),
  // 拼团
  listGroupBuys: (params?: Record<string, unknown>) => api.get("/marketing/group-buys", { params }),
  createGroupBuy: (data: Record<string, unknown>) => api.post("/marketing/group-buys", data),
  updateGroupBuy: (id: string, data: Record<string, unknown>) => api.put(`/marketing/group-buys/${id}`, data),
  deleteGroupBuy: (id: string) => api.delete(`/marketing/group-buys/${id}`),
  getGroupBuyParticipants: (id: string) => api.get(`/marketing/group-buys/${id}/participants`),
  // 优惠券
  listCoupons: (params?: Record<string, unknown>) => api.get("/marketing/coupons", { params }),
  createCoupon: (data: Record<string, unknown>) => api.post("/marketing/coupons", data),
  updateCoupon: (id: string, data: Record<string, unknown>) => api.put(`/marketing/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/marketing/coupons/${id}`),
  grantCoupon: (id: string, data: Record<string, unknown>) => api.post(`/marketing/coupons/${id}/grant`, data),
  batchGrantCoupon: (id: string, data: Record<string, unknown>) => api.post(`/marketing/coupons/${id}/batch-grant`, data),
  getCouponRecords: (id: string, params?: Record<string, unknown>) => api.get(`/marketing/coupons/${id}/records`, { params }),
  // 限时折扣
  listDiscounts: (params?: Record<string, unknown>) => api.get("/marketing/discounts", { params }),
  createDiscount: (data: Record<string, unknown>) => api.post("/marketing/discounts", data),
  updateDiscount: (id: string, data: Record<string, unknown>) => api.put(`/marketing/discounts/${id}`, data),
  deleteDiscount: (id: string) => api.delete(`/marketing/discounts/${id}`),
  // 微页面
  listPages: () => api.get("/marketing/pages"),
  getPage: (id: string) => api.get(`/marketing/pages/${id}`),
  createPage: (data: Record<string, unknown>) => api.post("/marketing/pages", data),
  updatePage: (id: string, data: Record<string, unknown>) => api.put(`/marketing/pages/${id}`, data),
  deletePage: (id: string) => api.delete(`/marketing/pages/${id}`),
  publishPage: (id: string) => api.post(`/marketing/pages/${id}/publish`),
  getPageVersions: (id: string) => api.get(`/marketing/pages/${id}/versions`),
  rollbackPage: (id: string, versionId: string) => api.post(`/marketing/pages/${id}/rollback/${versionId}`),
  addPageComponent: (pageId: string, data: Record<string, unknown>) => api.post(`/marketing/pages/${pageId}/components`, data),
  updatePageComponent: (pageId: string, compId: string, data: Record<string, unknown>) => api.put(`/marketing/pages/${pageId}/components/${compId}`, data),
  deletePageComponent: (pageId: string, compId: string) => api.delete(`/marketing/pages/${pageId}/components/${compId}`),
  sortPageComponents: (pageId: string, data: { componentIds: string[] }) => api.put(`/marketing/pages/${pageId}/components/sort`, data),
  // 活动
  listActivities: (params?: Record<string, unknown>) => api.get("/marketing/activities", { params }),
  createActivity: (data: Record<string, unknown>) => api.post("/marketing/activities", data),
  updateActivity: (id: string, data: Record<string, unknown>) => api.put(`/marketing/activities/${id}`, data),
  deleteActivity: (id: string) => api.delete(`/marketing/activities/${id}`),
  getActivityMetrics: (id: string) => api.get(`/marketing/activities/${id}/metrics`),
  // 满减送
  listFullReductions: (params?: Record<string, unknown>) => api.get("/marketing/full-reductions", { params }),
  createFullReduction: (data: Record<string, unknown>) => api.post("/marketing/full-reductions", data),
  updateFullReduction: (id: string, data: Record<string, unknown>) => api.put(`/marketing/full-reductions/${id}`, data),
  deleteFullReduction: (id: string) => api.delete(`/marketing/full-reductions/${id}`),
  getFullReduction: (id: string) => api.get(`/marketing/full-reductions/${id}`),
};

// ───────── 财务管理 ─────────
export const financeApi = {
  // 对账中心
  listReconciliations: (params?: Record<string, unknown>) => api.get("/finance/reconciliation", { params }),
  createReconciliation: (data: Record<string, unknown>) => api.post("/finance/reconciliation", data),
  getReconciliationDetail: (id: string) => api.get(`/finance/reconciliation/${id}`),
  // 发票管理
  listInvoices: (params?: Record<string, unknown>) => api.get("/finance/invoices", { params }),
  createInvoice: (data: Record<string, unknown>) => api.post("/finance/invoices", data),
  issueInvoice: (id: string, invoiceUrl: string) => api.put(`/finance/invoices/${id}/issue`, { invoiceUrl }),
  mailInvoice: (id: string, expressNo: string) => api.put(`/finance/invoices/${id}/mail`, { expressNo }),
  // 结算单
  listSettlements: (params?: Record<string, unknown>) => api.get("/finance/settlements", { params }),
  generateSettlement: (data: Record<string, unknown>) => api.post("/finance/settlements/generate", data),
  approveSettlement: (id: string) => api.put(`/finance/settlements/${id}/approve`),
  paySettlement: (id: string) => api.put(`/finance/settlements/${id}/pay`),
  // 提现审批
  listWithdrawals: (params?: Record<string, unknown>) => api.get("/finance/withdrawals", { params }),
  approveWithdrawal: (id: string, reviewNote?: string) => api.put(`/finance/withdrawals/${id}/approve`, { reviewNote }),
  rejectWithdrawal: (id: string, reviewNote: string) => api.put(`/finance/withdrawals/${id}/reject`, { reviewNote }),
  payWithdrawal: (id: string) => api.post(`/finance/withdrawals/${id}/pay`),
  // 资金冻结
  freezeFund: (data: Record<string, unknown>) => api.post("/finance/freeze", data),
  unfreezeFund: (data: Record<string, unknown>) => api.post("/finance/unfreeze", data),
  listFreezes: (params?: Record<string, unknown>) => api.get("/finance/freeze-records", { params }),
  // 财务报表
  getMonthlyReport: (period: string) => api.get("/finance/reports/monthly", { params: { period } }),
  generateMonthlyReport: (period: string) => api.post(`/finance/reports/monthly/generate`, null, { params: { period } }),
};

// ───────── 风控管理 ─────────
export const riskApi = {
  // 预警规则
  listRules: (params?: Record<string, unknown>) => api.get("/risk-control/rules", { params }),
  createRule: (data: Record<string, unknown>) => api.post("/risk-control/rules", data),
  updateRule: (id: string, data: Record<string, unknown>) => api.put(`/risk-control/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/risk-control/rules/${id}`),
  toggleRule: (id: string, enabled: boolean) => api.put(`/risk-control/rules/${id}`, { enabled }),
  // 预警列表
  listAlerts: (params?: Record<string, unknown>) => api.get("/risk-control/alerts", { params }),
  handleAlert: (id: string, note?: string) => api.put(`/risk-control/alerts/${id}/handle`, { note }),
  dismissAlert: (id: string) => api.put(`/risk-control/alerts/${id}/dismiss`),
  // 刷单检测
  listFraudDetections: (params?: Record<string, unknown>) => api.get("/risk-control/fraud-detections", { params }),
  confirmFraud: (id: string) => api.put(`/risk-control/fraud-detections/${id}/confirm`),
  dismissFraud: (id: string) => api.put(`/risk-control/fraud-detections/${id}/dismiss`),
  // 行为轨迹
  getUserTimeline: (userId: string, params?: Record<string, unknown>) => api.get(`/risk-control/user-timeline/${userId}`, { params }),
  // 申诉处理
  listAppeals: (params?: Record<string, unknown>) => api.get("/risk-control/appeals", { params }),
  approveAppeal: (id: string) => api.put(`/risk-control/appeals/${id}/approve`),
  rejectAppeal: (id: string, reviewNote: string) => api.put(`/risk-control/appeals/${id}/reject`, { reviewNote }),
};

// ───────── AI 管理 ─────────
export const aiAdminApi = {
  // 对话日志（后端 AiLoggerService，路由 /ai/media/tasks）
  listChatLogs: (params?: Record<string, unknown>) => api.get("/ai/media/tasks", { params }),
  getChatLogDetail: (id: string) => api.get(`/ai/media/tasks/${id}`),
  deleteChatLog: (id: string) => api.delete(`/ai/media/tasks/${id}`),
  // 调用统计
  getCallStats: (period?: string) => api.get("/ai/media/tasks", { params: { period: period || "day" } }),
  getCallLogs: (params?: Record<string, unknown>) => api.get("/ai/media/tasks", { params }),
  getAbnormalCalls: () => api.get("/ai/media/tasks", { params: { scene: "abnormal" } }),
  // 圈主助理审批（后端 /bots/manage/approvals）
  listCircleAssistants: (params?: Record<string, unknown>) => api.get("/bots/manage/approvals", { params }),
  updateCircleAssistant: (id: string, data: Record<string, unknown>) => api.put(`/bots/${id}`, data),
  approveCircleAssistant: (circleId: string) => api.post(`/bots/manage/approvals/${circleId}/approve`),
  rejectCircleAssistant: (circleId: string, reason?: string) => api.post(`/bots/manage/approvals/${circleId}/reject`, { reason }),
  // 知识库管理（后端 /bots/manage/knowledge）
  getKnowledgeBase: (circleId: string) => api.get(`/bots/manage/knowledge/${circleId}`),
  createKnowledgeEntry: (circleId: string, data: Record<string, unknown>) => api.post(`/bots/manage/knowledge/${circleId}`, data),
  updateKnowledgeEntry: (id: string, data: Record<string, unknown>) => api.put(`/bots/manage/knowledge/${id}`, data),
  deleteKnowledgeEntry: (id: string) => api.delete(`/bots/manage/knowledge/${id}`),
  getUsageData: (circleId: string) => api.get(`/bots/manage/usage/${circleId}`),
};

// ───────── 文章管理 ─────────
export const articleApi = {
  list: (params?: { page?: number; pageSize?: number; circleId?: string; tag?: string; isPushHome?: string; status?: string; keyword?: string }) =>
    api.get("/articles", { params }),
  stats: () => api.get("/articles/stats"),
  detail: (id: string) => api.get(`/articles/${id}`),
  create: (circleId: string, data: Record<string, unknown>) => api.post(`/articles/circles/${circleId}`, data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/articles/${id}`, data),
  remove: (id: string) => api.delete(`/articles/${id}`),
  audit: (id: string, status: string) => api.put(`/articles/${id}/audit`, { status }),
  addRecommend: (articleId: string, data: { itemId: string; itemType: string; sort?: number }) =>
    api.post(`/articles/${articleId}/recommends`, data),
  removeRecommend: (articleId: string, recId: string) => api.delete(`/articles/${articleId}/recommends/${recId}`),
  // 草稿管理
  listDrafts: (params?: { page?: number; pageSize?: number; circleId?: string }) =>
    api.get("/articles/admin/drafts", { params }),
  deleteDraft: (id: string) => api.delete(`/articles/admin/drafts/${id}`),
  publishDraft: (id: string) => api.post(`/articles/admin/drafts/${id}/publish`),
};

// ───────── AI内容生成管理 ─────────
export const contentGenerationApi = {
  generate: (data: { categoryLevel1: string; categoryLevel2?: string; types?: string[] }) =>
    api.post("/content-generation/generate", data),
  getStats: () => api.get("/content-generation/stats"),
  getCategories: () => api.get("/content-generation/categories"),
  autoFill: () => api.post("/content-generation/auto-fill"),
  getHistory: (params?: { page?: number; pageSize?: number }) =>
    api.get("/content-generation/history", { params }),
  getStatus: () => api.get("/content-generation/status"),
  getParams: () => api.get("/content-generation/params"),
  updateParams: (data: Record<string, unknown>) => api.put("/content-generation/params", data),
};

// ───────── 汇付支付管理 ─────────
export const huifuApi = {
  getConfigs: () => api.get("/huifu/configs"),
  updateConfig: (data: { key: string; value: string; description?: string }) => api.put("/huifu/config", data),
  getStatus: () => api.get("/huifu/status"),
  queryPayment: (outTradeNo: string) => api.post("/huifu/query", { outTradeNo }),
  createSplit: (data: Record<string, unknown>) => api.post("/huifu/split", data),
  querySplit: (orderId: string) => api.get(`/huifu/split/${orderId}`),
  createRefund: (data: Record<string, unknown>) => api.post("/huifu/refund", data),
  getBalance: () => api.get("/huifu/balance"),
  downloadBill: (date: string) => api.get(`/huifu/bill/${date}`),
};

// ───────── 会员管理（管理员） ─────────
export const memberAdminApi = {
  getPurchases: (params?: { page?: number; pageSize?: number }) =>
    api.get("/member/admin/purchases", { params }),
  getStats: () => api.get("/member/admin/stats"),
  grant: (data: { userId: string; level: string; durationDays?: number }) =>
    api.post("/member/admin/grant", data),
  revoke: (userId: string) => api.post(`/member/admin/revoke/${userId}`),
};

// ───────── 智能定价管理 ─────────
export const pricingApi = {
  getRules: (params?: { page?: number; pageSize?: number }) =>
    api.get("/admin/pricing/rules", { params }),
  getRule: (id: string) => api.get(`/admin/pricing/rules/${id}`),
  createRule: (data: Record<string, unknown>) => api.post("/admin/pricing/rules", data),
  updateRule: (id: string, data: Record<string, unknown>) => api.put(`/admin/pricing/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/admin/pricing/rules/${id}`),
  getDemand: (params?: { page?: number; pageSize?: number; targetType?: string; demandLevel?: string }) =>
    api.get("/admin/pricing/demand", { params }),
};

// ───────── 短信管理 ─────────
export const smsApi = {
  getAdminLogs: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get("/sms/admin/logs", { params }),
  getAdminStats: () => api.get("/sms/admin/stats"),
};

// ───────── 互动管理 ─────────
export const interactionApi = {
  getAdminStats: () => api.get("/interaction/admin/stats"),
  getAdminTrends: (days?: number) => api.get("/interaction/admin/trends", { params: { days: days || 7 } }),
  getAdminTopContent: (limit?: number) => api.get("/interaction/admin/top-content", { params: { limit: limit || 10 } }),
  listComments: (params?: { page?: number; pageSize?: number; targetType?: string; targetId?: string }) =>
    api.get("/interaction/comment", { params }),
  hideComment: (id: string) => api.put(`/interaction/comment/${id}/hide`),
};

// ───────── 知识库管理 ─────────
export const knowledgeApi = {
  syncCircle: (circleId: string) => api.post(`/circle-knowledge/sync/${circleId}`),
  syncAll: () => api.post("/circle-knowledge/sync-all"),
  addToKnowledge: (data: { circleId: string; userId: string; targetType: string; targetId: string }) =>
    api.post("/circle-knowledge/add", data),
  removeFromKnowledge: (knowledgeId: string, circleId: string, userId: string) =>
    api.post(`/circle-knowledge/remove/${knowledgeId}`, { circleId, userId }),
  adminRemoveKnowledge: (knowledgeId: string, circleId: string) =>
    api.post(`/circle-knowledge/admin/remove/${knowledgeId}`, { circleId }),
  getCandidates: (circleId: string, status?: string) =>
    api.get(`/circle-knowledge/candidates/${circleId}`, { params: status ? { status } : {} }),
  confirmCandidate: (candidateId: string) =>
    api.post(`/circle-knowledge/candidates/${candidateId}/confirm`),
  rejectCandidate: (candidateId: string) =>
    api.post(`/circle-knowledge/candidates/${candidateId}/reject`),
};

// ───────── 管理驾驶舱（老板专属） ─────────
export const cockpitApi = {
  overview: () => api.get("/admin/cockpit/overview"),
  revenueComposition: () => api.get("/admin/cockpit/revenue-composition"),
  userGrowth: () => api.get("/admin/cockpit/user-growth"),
  businessTrends: () => api.get("/admin/cockpit/business-trends"),
  alerts: () => api.get("/admin/cockpit/alerts"),
  rankings: () => api.get("/admin/cockpit/rankings"),
};

// ───────── 对外数字大屏 ─────────
export const bigscreenApi = {
  platform: (token?: string) => api.get("/bigscreen/platform", { params: token ? { token } : {} }),
  transactions: (token?: string) => api.get("/bigscreen/transactions", { params: token ? { token } : {} }),
  contentEco: (token?: string) => api.get("/bigscreen/content-eco", { params: token ? { token } : {} }),
  aiCapability: (token?: string) => api.get("/bigscreen/ai-capability", { params: token ? { token } : {} }),
  offlineMap: (token?: string) => api.get("/bigscreen/offline-map", { params: token ? { token } : {} }),
};

// ───────── 对外大屏Token管理 ─────────
export const bigscreenTokenApi = {
  list: (params?: { page?: number; pageSize?: number }) => api.get("/admin/bigscreen-tokens", { params }),
  create: (data: { type: string; validHours: number; ipWhitelist?: string; remark?: string }) =>
    api.post("/admin/bigscreen-tokens", data),
  approve: (id: string) => api.post(`/admin/bigscreen-tokens/${id}/approve`),
  revoke: (id: string) => api.post(`/admin/bigscreen-tokens/${id}/revoke`),
  delete: (id: string) => api.delete(`/admin/bigscreen-tokens/${id}`),
  logs: (params?: { page?: number; pageSize?: number; tokenId?: string }) =>
    api.get("/admin/bigscreen-tokens/logs", { params }),
};

// ───────── RAG Prompt模板管理 ─────────
export const ragTemplateApi = {
  list: (params?: { scene?: string; status?: string }) => api.get("/admin/rag/templates", { params }),
  detail: (id: string) => api.get(`/admin/rag/templates/${id}`),
  create: (data: { scene: string; templateName: string; systemPrompt: string; userPromptTemplate?: string; variables?: any[] }) =>
    api.post("/admin/rag/templates", data),
  update: (id: string, data: { scene?: string; templateName?: string; systemPrompt?: string; userPromptTemplate?: string; variables?: any[]; status?: string }) =>
    api.put(`/admin/rag/templates/${id}`, data),
  delete: (id: string) => api.delete(`/admin/rag/templates/${id}`),
  preview: (idOrData: string | { systemPrompt: string; userPromptTemplate?: string; variables?: Record<string, string>; testQuestion?: string }, data?: Record<string, unknown>) =>
    typeof idOrData === "string"
      ? api.post(`/admin/rag/templates/preview`, { id: idOrData, ...data })
      : api.post("/admin/rag/templates/preview", idOrData),
};

// ───────── 知识库去重审核 ─────────
export const dedupApi = {
  listCandidates: (params?: { page?: number; pageSize?: number; minSimilarity?: number; status?: string }) =>
    api.get("/admin/knowledge/dedup/candidates", { params }),
  getCandidate: (id: string) => api.get(`/admin/knowledge/dedup/candidates/${id}`),
  decide: (id: string, data: { decision: string; reason?: string }) =>
    api.post(`/admin/knowledge/dedup/candidates/${id}/decide`, data),
  batchDecide: (data: { ids: string[]; decision: string; reason?: string }) =>
    api.post("/admin/knowledge/dedup/batch", data),
  getStats: () => api.get("/admin/knowledge/dedup/stats"),
};

// ───────── AI模型路由配置 ─────────
export const aiRoutingApi = {
  getConfig: () => api.get("/admin/ai/routing/config"),
  updateConfig: (data: Record<string, unknown>) => api.put("/admin/ai/routing/config", data),
  updateScene: (scene: string, data: Record<string, unknown>) => api.put(`/admin/ai/routing/scenes/${scene}`, data),
  validateConfig: (data: Record<string, unknown>) => api.post("/admin/ai/routing/config/validate", data),
  getHistory: () => api.get("/admin/ai/routing/config/history"),
  getBudgets: () => api.get("/admin/ai/routing/budgets"),
};

// ───────── AI网关管理 ─────────
export const aiGatewayAdminApi = {
  getRoutingConfig: () => api.get("/ai/routing-config"),
  getSceneBudgets: () => api.get("/ai/scene-budgets"),
};

// ───────── AI媒体处理管理 ─────────
export const mediaAiAdminApi = {
  getTasks: (params?: { page?: number; pageSize?: number; type?: string }) =>
    api.get("/ai/media/tasks", { params }),
};

// ───────── AI质量评分 ─────────
export const qualityScorerApi = {
  score: (data: { content: string; scene?: string; contentType?: string }) =>
    api.post("/ai/quality/score", data),
  scoreBatch: (items: Array<{ content: string; scene?: string; contentType?: string }>) =>
    api.post("/ai/quality/score-batch", { items }),
  getScores: (params?: { scene?: string; minOverall?: number; skip?: number; take?: number }) =>
    api.get("/ai/quality/scores", { params }),
  getStats: (scene?: string) => api.get("/ai/quality/stats", { params: scene ? { scene } : {} }),
};

// ───────── 平台知识库管理 ─────────
export const platformKnowledgeApi = {
  search: (params?: { keyword?: string; category?: string; page?: number; pageSize?: number }) =>
    api.get("/platform-knowledge", { params }),
  getStats: () => api.get("/platform-knowledge/stats"),
  getById: (id: string) => api.get(`/platform-knowledge/${id}`),
  aggregateAll: () => api.post("/platform-knowledge/aggregate"),
};

// ───────── 直播间数据大屏 ─────────
export const liveDashboardApi = {
  overview: (roomId: string) => api.get(`/live/rooms/${roomId}/dashboard/overview`),
  trends: (roomId: string) => api.get(`/live/rooms/${roomId}/dashboard/trends`),
  products: (roomId: string) => api.get(`/live/rooms/${roomId}/dashboard/products`),
  audience: (roomId: string) => api.get(`/live/rooms/${roomId}/dashboard/audience`),
  interactions: (roomId: string) => api.get(`/live/rooms/${roomId}/dashboard/interactions`),
  hostStats: (roomId: string) => api.get(`/live/rooms/${roomId}/dashboard/host-stats`),
  report: (roomId: string) => api.get(`/live/rooms/${roomId}/report`),
  exportReport: (roomId: string, format: "pdf" | "excel") =>
    api.get(`/live/rooms/${roomId}/report/export`, { params: { format }, responseType: "blob" }),
  compare: (roomId: string) => api.get(`/live/rooms/${roomId}/compare`),
};

// ───────── 站长仪表盘 ─────────
export const stationDashboardApi = {
  overview: () => api.get("/station/dashboard/overview"),
  trends: () => api.get("/station/dashboard/trends"),
  linkRanking: () => api.get("/station/dashboard/link-ranking"),
  silentUsers: () => api.get("/station/dashboard/silent-users"),
  settlementTimer: () => api.get("/station/dashboard/settlement-timer"),
};

// ───────── 运营商仪表盘 ─────────
export const operatorDashboardApi = {
  overview: () => api.get("/station/operator-dashboard/overview"),
  teamRanking: () => api.get("/station/operator-dashboard/team-ranking"),
  quotaUsage: () => api.get("/station/operator-dashboard/quota-usage"),
};

// ───────── 驿站仪表盘 ─────────
export const offlineDashboardApi = {
  overview: () => api.get("/offline/dashboard/overview"),
  trends: () => api.get("/offline/dashboard/trends"),
  courseRanking: () => api.get("/offline/dashboard/course-ranking"),
  productRanking: () => api.get("/offline/dashboard/product-ranking"),
  recentStudents: () => api.get("/offline/dashboard/recent-students"),
  stockAlerts: () => api.get("/offline/dashboard/stock-alerts"),
  pendingBookings: () => api.get("/offline/dashboard/pending-bookings"),
  upcomingCourses: () => api.get("/offline/dashboard/upcoming-courses"),
};

// ───────── 圈主仪表盘 ─────────
export const circleDashboardApi = {
  overview: (circleId: string) => api.get(`/circles/${circleId}/dashboard/overview`),
  trends: (circleId: string) => api.get(`/circles/${circleId}/dashboard/trends`),
  revenueBreakdown: (circleId: string) => api.get(`/circles/${circleId}/dashboard/revenue-breakdown`),
  topContributors: (circleId: string) => api.get(`/circles/${circleId}/dashboard/top-contributors`),
  hotContent: (circleId: string) => api.get(`/circles/${circleId}/dashboard/hot-content`),
  recentMembers: (circleId: string) => api.get(`/circles/${circleId}/dashboard/recent-members`),
  churnWarning: (circleId: string) => api.get(`/circles/${circleId}/dashboard/churn-warning`),
  pendingQuestions: (circleId: string) => api.get(`/circles/${circleId}/dashboard/pending-questions`),
  knowledgeCandidates: (circleId: string) => api.get(`/circles/${circleId}/dashboard/knowledge-candidates`),
};

// ───────── 竞赛管理 ─────────
export const competitionApi = {
  list: (params?: Record<string, unknown>) => api.get("/admin/competitions", { params }),
  detail: (id: string) => api.get(`/admin/competitions/${id}`),
  create: (data: Record<string, unknown>) => api.post("/admin/competitions", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/admin/competitions/${id}`, data),
  publish: (id: string) => api.post(`/admin/competitions/${id}/publish`),
  start: (id: string) => api.post(`/admin/competitions/${id}/start`),
  finish: (id: string) => api.post(`/admin/competitions/${id}/finish`),
  // 二期·赛事创建系统：阶段与AI组卷
  getStages: (id: string) => api.get(`/admin/competitions/${id}/stages`),
  generateStages: (id: string) => api.post(`/admin/competitions/${id}/stages/generate`),
  generatePaper: (id: string, data: { count: number; difficultyMix?: { easy?: number; medium?: number; hard?: number }; categories?: string[] }) =>
    api.post(`/admin/competitions/${id}/generate-paper`, data),
  createRound: (id: string, data: Record<string, unknown>) => api.post(`/admin/competitions/${id}/rounds`, data),
  listRounds: (id: string) => api.get(`/admin/competitions/${id}/rounds`),
  addQuestion: (id: string, data: Record<string, unknown>) => api.post(`/admin/competitions/${id}/questions`, data),
  batchQuestions: (id: string, data: Record<string, unknown>) => api.post(`/admin/competitions/${id}/questions/batch`, data),
  listQuestions: (id: string, params?: Record<string, unknown>) => api.get(`/admin/competitions/${id}/questions`, { params }),
  listRegistrations: (id: string, params?: Record<string, unknown>) => api.get(`/admin/competitions/${id}/registrations`, { params }),
  updateRegistration: (id: string, regId: string, data: Record<string, unknown>) => api.put(`/admin/competitions/${id}/registrations/${regId}`, data),
  getRankings: (id: string, params?: Record<string, unknown>) => api.get(`/admin/competitions/${id}/rankings`, { params }),
  calculateRanking: (id: string) => api.post(`/admin/competitions/${id}/calculate-ranking`),
  gradeAnswer: (answerId: string, data: { score: number; comment?: string }) =>
    api.post(`/competitions/judge/answers/${answerId}/grade`, data),
  delete: (id: string) => api.delete(`/admin/competitions/${id}`),
  deleteRound: (id: string, roundId: string) => api.delete(`/admin/competitions/${id}/rounds/${roundId}`),
  deleteQuestion: (id: string, questionId: string) => api.delete(`/admin/competitions/${id}/questions/${questionId}`),
  updateRound: (id: string, roundId: string, data: Record<string, unknown>) => api.put(`/admin/competitions/${id}/rounds/${roundId}`, data),
  updateQuestion: (id: string, questionId: string, data: Record<string, unknown>) => api.put(`/admin/competitions/${id}/questions/${questionId}`, data),
};

// ───────── 品类管理 ─────────
export const categoryApi = {
  getTree: () => api.get("/admin/categories/tree"),
  create: (data: { name: string; parentId?: string; sortOrder?: number }) =>
    api.post("/admin/categories", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/admin/categories/${id}`, data),
  delete: (id: string) => api.delete(`/admin/categories/${id}`),
  getStats: () => api.get("/admin/categories/stats"),
  syncCounts: () => api.post("/admin/categories/sync-counts"),
};

// ───────── 小程序管理 ─────────
export const miniApi = {
  listApps: () => api.get("/mini/admin/apps"),
  createApp: (data: Record<string, unknown>) => api.post("/mini/admin/apps", data),
  updateApp: (id: string, data: Record<string, unknown>) => api.put(`/mini/admin/apps/${id}`, data),
  deleteApp: (id: string) => api.delete(`/mini/admin/apps/${id}`),
};

// ───────── 数据库备份管理 ─────────
export const backupApi = {
  manual: () => api.post("/system/backup/manual"),
  list: () => api.get("/system/backup/list"),
  latest: () => api.get("/system/backup/latest"),
  uploadCos: () => api.post("/system/backup/upload-cos"),
};

// ───────── AI事件总线 ─────────
export const aiEventApi = {
  publish: (data: { type: string; source: string; severity?: string; payload?: any; context?: any }) =>
    api.post("/ai/events/publish", data),
  list: (params?: { page?: number; pageSize?: number; type?: string; source?: string; severity?: string; status?: string }) =>
    api.get("/ai/events", { params }),
  stats: () => api.get("/ai/events/stats"),
  process: (id: string) => api.post(`/ai/events/${id}/process`),
};

// ───────── AI能力注册中心 ─────────
export const aiCapabilityApi = {
  list: (params?: { scene?: string; type?: string; status?: string }) =>
    api.get("/ai/capabilities", { params }),
  byScene: (scene: string) => api.get("/ai/capabilities/by-scene", { params: { scene } }),
  health: () => api.get("/ai/capabilities/health"),
  getByName: (name: string) => api.get(`/ai/capabilities/${name}`),
  updateStatus: (name: string, status: string) => api.put(`/ai/capabilities/${name}/status`, { status }),
};

// ───────── AI决策账本 ─────────
export const aiDecisionApi = {
  list: (params?: { page?: number; pageSize?: number; agentId?: string; riskLevel?: string; humanAction?: string }) =>
    api.get("/ai/decisions", { params }),
  overview: () => api.get("/ai/decisions/overview"),
  trace: (id: string) => api.get(`/ai/decisions/trace/${id}`),
  retrospective: (id: string) => api.get(`/ai/decisions/retrospective/${id}`),
  review: (id: string, data: { humanAction: string; humanReviewer?: string; humanNote?: string }) =>
    api.post(`/ai/decisions/${id}/review`, data),
  outcome: (id: string, data: { outcomeMetric: string; outcomeActual: number }) =>
    api.post(`/ai/decisions/${id}/outcome`, data),
  compare: (params?: { agentId1?: string; agentId2?: string; days?: number }) =>
    api.get("/ai/decisions/compare", { params }),
};

// ───────── 人机协作审核 ─────────
export const aiCollaborationApi = {
  list: (params?: { limit?: number; offset?: number; status?: string; type?: string; riskLevel?: string }) =>
    api.get("/ai/collaborations", { params }),
  pending: () => api.get("/ai/collaborations/pending"),
  overview: () => api.get("/ai/collaborations/overview"),
  detail: (id: string) => api.get(`/ai/collaborations/${id}`),
  review: (id: string, data: { action: string; reviewer?: string; note?: string; modifications?: any }) =>
    api.post(`/ai/collaborations/${id}/review`, data),
  execute: (id: string) => api.post(`/ai/collaborations/${id}/execute`),
  rollback: (id: string, reason?: string) => api.post(`/ai/collaborations/${id}/rollback`, { reason }),
  feedback: (id: string, data: { rating: number; comment?: string }) =>
    api.post(`/ai/collaborations/${id}/feedback`, data),
};

// ───────── AI异常检测 ─────────
export const aiAnomalyApi = {
  checkAll: () => api.post("/ai/anomalies/check"),
  checkRule: (ruleId: string) => api.post(`/ai/anomalies/check/${ruleId}`),
  getRules: () => api.get("/ai/anomalies/rules"),
  toggleRule: (ruleId: string, enabled: boolean) =>
    api.post(`/ai/anomalies/rules/${ruleId}/toggle`, { enabled }),
  addRule: (data: {
    id: string; metric: string; dimension: string; baselineWindow: number;
    deviationThreshold: number; severity: string; enabled: boolean;
  }) => api.post("/ai/anomalies/rules", data),
};

// ───────── AI数据探索 ─────────
export const aiDataExplorerApi = {
  ask: (question: string) => api.post("/ai/data-explorer/ask", { question }),
  getSchema: () => api.get("/ai/data-explorer/schema"),
};

// ───────── 课程组合包 ─────────
export const bundleApi = {
  list: (params?: Record<string, unknown>) => api.get("/bundles", { params }),
  getById: (id: string) => api.get(`/bundles/${id}`),
  create: (data: Record<string, unknown>) => api.post("/bundles", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/bundles/${id}`, data),
  delete: (id: string) => api.delete(`/bundles/${id}`),
};

// ───────── 续费管理 ─────────
export const renewalApi = {
  getEntitlements: (params?: Record<string, unknown>) => api.get("/renewal/my/entitlements", { params }),
  getHistory: (params?: Record<string, unknown>) => api.get("/renewal/my/history", { params }),
  // 管理员
  getExpiringUsers: (days?: number) => api.get("/renewal/admin/expiring-users", { params: { days } }),
  getAdminHistory: (params?: Record<string, unknown>) => api.get("/renewal/admin/history", { params }),
};

// ───────── 统一订单中心 ─────────
export const orderCenterApi = {
  list: (params?: Record<string, unknown>) => api.get("/orders/my", { params }),
  // 管理员
  adminList: (params?: Record<string, unknown>) => api.get("/orders/admin/all", { params }),
};

// ───────── 驿站老师邀约 ─────────
export const teacherRequestApi = {
  create: (stationId: string, data: Record<string, unknown>) => api.post(`/offline/stations/${stationId}/teacher-requests`, data),
  list: (stationId: string, params?: Record<string, unknown>) => api.get(`/offline/stations/${stationId}/teacher-requests`, { params }),
  respond: (id: string, data: Record<string, unknown>) => api.put(`/offline/teacher-requests/${id}/respond`, data),
  // 管理员
  adminList: (params?: Record<string, unknown>) => api.get("/offline/admin/teacher-requests", { params }),
};

// ───────── 圈子后台管理 ─────────
export const circleBackendApi = {
  overview: () => api.get("/circle-backend/overview"),
  members: (params?: Record<string, unknown>) => api.get("/circle-backend/members", { params }),
  guests: () => api.get("/circle-backend/guests"),
  setGuestShareRate: (userId: string, shareRate: number) => api.put(`/circle-backend/guests/${userId}/share-rate`, { shareRate }),
  revenue: (period?: string) => api.get("/circle-backend/revenue", { params: { period } }),
  // 管理员
  adminCircles: (params?: Record<string, unknown>) => api.get("/circle-backend/admin/circles", { params }),
  adminOverview: (circleId: string) => api.get(`/circle-backend/admin/circles/${circleId}/overview`),
};

// ───────── 社交管理（统一评论/笔记/成就/认证） ─────────
export const socialApi = {
  // 统一评论中心
  getCommentCenter: (params?: { page?: number; pageSize?: number; bizType?: string; status?: string; keyword?: string; startDate?: string; endDate?: string; isFeatured?: string; isPinned?: string }) =>
    api.get("/admin/social/comments", { params }),
  getCommentStats: () => api.get("/admin/social/comments/stats"),
  featureComment: (id: string) => api.post(`/admin/social/comments/${id}/feature`),
  unfeatureComment: (id: string) => api.post(`/admin/social/comments/${id}/unfeature`),
  pinComment: (id: string) => api.post(`/admin/social/comments/${id}/pin`),
  unpinComment: (id: string) => api.post(`/admin/social/comments/${id}/unpin`),
  batchFeature: (ids: string[]) => api.post("/admin/social/comments/batch-feature", { ids }),
  batchHide: (ids: string[]) => api.post("/admin/social/comments/batch-hide", { ids }),
  batchDelete: (ids: string[]) => api.post("/admin/social/comments/batch-delete", { ids }),
  // 公开笔记审核
  listPublicNotes: (params?: { page?: number; pageSize?: number; status?: string; courseId?: string; userId?: string }) =>
    api.get("/admin/social/notes", { params }),
  approveNote: (id: string) => api.post(`/admin/social/notes/${id}/approve`),
  rejectNote: (id: string, reason?: string) => api.post(`/admin/social/notes/${id}/reject`, { reason }),
  featureNote: (id: string) => api.post(`/admin/social/notes/${id}/feature`),
  deleteNote: (id: string) => api.delete(`/admin/social/notes/${id}`),
};

// ───────── 认证标识管理 ─────────
export const certificationApi = {
  listTypes: () => api.get("/admin/certifications/types"),
  createType: (data: { name: string; icon: string; color: string; description?: string; autoGrantRole?: string; conditions?: any }) =>
    api.post("/admin/certifications/types", data),
  updateType: (id: string, data: Record<string, unknown>) => api.put(`/admin/certifications/types/${id}`, data),
  deleteType: (id: string) => api.delete(`/admin/certifications/types/${id}`),
  // 认证申请审批
  listApplications: (params?: { page?: number; pageSize?: number; status?: string; typeId?: string }) =>
    api.get("/admin/certifications/applications", { params }),
  approveApplication: (id: string) => api.post(`/admin/certifications/applications/${id}/approve`),
  rejectApplication: (id: string, reason?: string) => api.post(`/admin/certifications/applications/${id}/reject`, { reason }),
  // 已认证用户管理
  listCertifiedUsers: (params?: { page?: number; pageSize?: number; typeId?: string; userId?: string }) =>
    api.get("/admin/certifications/users", { params }),
  revokeCertification: (userId: string, typeId: string) => api.post(`/admin/certifications/users/${userId}/revoke`, { typeId }),
};

// ───────── 国风表情管理 ─────────
export const emojiApi = {
  list: (params?: { category?: string; page?: number; pageSize?: number }) =>
    api.get("/admin/social/emojis", { params }),
  create: (data: { name: string; icon: string; category: string; sortOrder?: number }) =>
    api.post("/admin/social/emojis", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/admin/social/emojis/${id}`, data),
  delete: (id: string) => api.delete(`/admin/social/emojis/${id}`),
  getCategories: () => api.get("/admin/social/emojis/categories"),
  getStats: () => api.get("/admin/social/emojis/stats"),
};

// ───────── AI Prompt 场景化管理 ─────────
export const aiPromptApi = {
  listScenes: () => api.get("/admin/ai/prompts/scenes"),
  getScene: (scene: string) => api.get(`/admin/ai/prompts/scenes/${scene}`),
  updateScene: (scene: string, data: { systemPrompt: string; userPromptTemplate?: string; variables?: any[]; model?: string; temperature?: number }) =>
    api.put(`/admin/ai/prompts/scenes/${scene}`, data),
  // 风格库
  listStyles: (scene: string) => api.get(`/admin/ai/prompts/scenes/${scene}/styles`),
  createStyle: (scene: string, data: { name: string; prompt: string; example?: string }) =>
    api.post(`/admin/ai/prompts/scenes/${scene}/styles`, data),
  updateStyle: (id: string, data: Record<string, unknown>) => api.put(`/admin/ai/prompts/styles/${id}`, data),
  deleteStyle: (id: string) => api.delete(`/admin/ai/prompts/styles/${id}`),
  // 功能开关
  getToggles: () => api.get("/admin/ai/prompts/toggles"),
  toggleFeature: (feature: string, enabled: boolean) => api.put(`/admin/ai/prompts/toggles/${feature}`, { enabled }),
  // 效果统计
  getSceneStats: (scene?: string, params?: { startDate?: string; endDate?: string }) =>
    api.get("/admin/ai/prompts/stats", { params: { scene, ...params } }),
};

// ───────── 分享海报模板管理 ─────────
export const posterApi = {
  listTemplates: (params?: { scene?: string; status?: string; page?: number; pageSize?: number }) =>
    api.get("/admin/marketing/posters", { params }),
  detail: (id: string) => api.get(`/admin/marketing/posters/${id}`),
  create: (data: { name: string; scene: string; backgroundImage: string; elements: any[]; brandConfig?: any }) =>
    api.post("/admin/marketing/posters", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/admin/marketing/posters/${id}`, data),
  delete: (id: string) => api.delete(`/admin/marketing/posters/${id}`),
  preview: (id: string, data?: { userId?: string; contentId?: string }) =>
    api.post(`/admin/marketing/posters/${id}/preview`, data),
  // 品牌元素
  getBrandConfig: () => api.get("/admin/marketing/posters/brand-config"),
  updateBrandConfig: (data: { primaryColor?: string; bgColor?: string; fontFamily?: string; logoUrl?: string; watermarkUrl?: string }) =>
    api.put("/admin/marketing/posters/brand-config", data),
  // 版本管理
  listVersions: (templateId: string) => api.get(`/admin/marketing/posters/${templateId}/versions`),
  rollbackVersion: (templateId: string, versionId: string) => api.post(`/admin/marketing/posters/${templateId}/rollback/${versionId}`),
  // 场景列表
  getScenes: () => api.get("/admin/marketing/posters/scenes"),
};

// ───────── 分享数据看板 ─────────
export const shareDataApi = {
  overview: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/admin/marketing/share-data/overview", { params }),
  byScene: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/admin/marketing/share-data/by-scene", { params }),
  byUser: (params?: { page?: number; pageSize?: number; sortBy?: string }) =>
    api.get("/admin/marketing/share-data/by-user", { params }),
  funnel: (params?: { startDate?: string; endDate?: string; scene?: string }) =>
    api.get("/admin/marketing/share-data/funnel", { params }),
};

// ───────── 邀请福利配置 ─────────
export const inviteRewardApi = {
  getConfig: () => api.get("/admin/marketing/invite-rewards/config"),
  updateConfig: (data: { inviterReward: any; inviteeReward: any; dailyLimit?: number; monthlyLimit?: number; totalLimit?: number }) =>
    api.put("/admin/marketing/invite-rewards/config", data),
  getStats: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/admin/marketing/invite-rewards/stats", { params }),
  getRecords: (params?: { page?: number; pageSize?: number; userId?: string }) =>
    api.get("/admin/marketing/invite-rewards/records", { params }),
};

// ───────── 传播力体系配置 ─────────
export const spreadPowerApi = {
  getLevels: () => api.get("/admin/marketing/spread-power/levels"),
  updateLevel: (level: string, data: { name: string; icon: string; minShares: number; minClicks: number; trafficBoost: number; description?: string }) =>
    api.put(`/admin/marketing/spread-power/levels/${level}`, data),
  getStats: () => api.get("/admin/marketing/spread-power/stats"),
  listUsers: (params?: { page?: number; pageSize?: number; level?: string }) =>
    api.get("/admin/marketing/spread-power/users", { params }),
};

// ───────── 成就系统管理 ─────────
export const achievementApi = {
  listTypes: (params?: { category?: string; page?: number; pageSize?: number }) =>
    api.get("/admin/social/achievements/types", { params }),
  createType: (data: { name: string; description: string; icon: string; category: string; triggerCondition: any; badgeUrl?: string }) =>
    api.post("/admin/social/achievements/types", data),
  updateType: (id: string, data: Record<string, unknown>) => api.put(`/admin/social/achievements/types/${id}`, data),
  deleteType: (id: string) => api.delete(`/admin/social/achievements/types/${id}`),
  listUserAchievements: (params?: { page?: number; pageSize?: number; userId?: string; typeId?: string }) =>
    api.get("/admin/social/achievements/users", { params }),
  grantAchievement: (data: { userId: string; typeId: string }) =>
    api.post("/admin/social/achievements/grant", data),
  revokeAchievement: (id: string) => api.post(`/admin/social/achievements/${id}/revoke`),
  getStats: () => api.get("/admin/social/achievements/stats"),
};

// ───────── 文化仪式感内容管理 ─────────
export const ritualContentApi = {
  // 节气提醒
  listSolarTerms: () => api.get("/admin/content/solar-terms"),
  updateSolarTerm: (id: string, data: { title?: string; content?: string; imageUrl?: string; pushTime?: string }) =>
    api.put(`/admin/content/solar-terms/${id}`, data),
  // 每日一首
  listDailyVerses: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get("/admin/content/daily-verses", { params }),
  createDailyVerse: (data: { title: string; author?: string; content: string; imageUrl?: string; publishDate: string }) =>
    api.post("/admin/content/daily-verses", data),
  updateDailyVerse: (id: string, data: Record<string, unknown>) => api.put(`/admin/content/daily-verses/${id}`, data),
  deleteDailyVerse: (id: string) => api.delete(`/admin/content/daily-verses/${id}`),
};

// ───────── 赏金问答管理 ─────────
export const bountyApi = {
  listQuestions: (params?: { page?: number; pageSize?: number; category?: string; status?: string }) =>
    api.get("/admin/bounty/questions", { params }),
  closeQuestion: (id: string) => api.put(`/admin/bounty/questions/${id}/close`),
  listReviews: (params?: { page?: number; pageSize?: number }) =>
    api.get("/admin/bounty/reviews", { params }),
  approveReview: (id: string) => api.put(`/admin/bounty/reviews/${id}/approve`),
  rejectReview: (id: string, reason: string) => api.put(`/admin/bounty/reviews/${id}/reject`, { reason }),
};

// ───────── 运势推送管理 ─────────
export const fortuneAdminApi = {
  // 运势推送订阅配置（后端 @Controller("fortune") + 全局前缀 /api/v1 → /fortune/admin/*）
  listConfigs: (params?: { page?: number; pageSize?: number; fortuneType?: string }) =>
    api.get("/fortune/admin/subscriptions", { params }),
  updateConfig: (id: string, data: { isActive: boolean }) =>
    api.put(`/fortune/admin/subscriptions/${id}`, data),
  pushAll: (fortuneType?: string) => api.post("/fortune/admin/push-all", { fortuneType }),
  listHistory: (params?: { page?: number; pageSize?: number; fortuneType?: string }) =>
    api.get("/fortune/admin/records", { params }),
};

// ───────── 运营商管理 ─────────
export const operatorAdminApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    api.get("/admin/operators", { params }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/admin/operators/${id}`, data),
  listMiniApps: (params?: { page?: number; pageSize?: number }) =>
    api.get("/admin/operator-miniapps", { params }),
  updateMiniApp: (id: string, data: Record<string, unknown>) => api.put(`/admin/operator-miniapps/${id}`, data),
};

// ───────── 租户管理 ─────────
export const tenantAdminApi = {
  list: (params?: { page?: number; pageSize?: number; name?: string; status?: string }) =>
    api.get("/admin/tenants", { params }),
  detail: (id: string) => api.get(`/admin/tenants/${id}`),
  create: (data: Record<string, unknown>) => api.post("/admin/tenants", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/admin/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/admin/tenants/${id}`),
  recharge: (id: string, data: { amount: number }) => api.post(`/admin/tenants/${id}/recharge`, data),
  getUsage: (id: string, params?: { page?: number; pageSize?: number; startDate?: string; endDate?: string }) =>
    api.get(`/admin/tenants/${id}/usage`, { params }),
  getLogs: (id: string, params?: { page?: number; pageSize?: number }) =>
    api.get(`/admin/tenants/${id}/logs`, { params }),
};

// ───────── 分佣结算规则（C7 规则管理） ─────────
export const settlementRuleApi = {
  // GET /settlement/rules → { items: SettlementRule[] }
  listRules: () => api.get("/settlement/rules"),
  createRule: (data: Record<string, unknown>) => api.post("/settlement/rules", data),
  // PUT body 不含 scene（后端禁改场景标识）
  updateRule: (id: string, data: Record<string, unknown>) => api.put(`/settlement/rules/${id}`, data),
};

// ───────── 智能顾问规则（C7 规则管理） ─────────
// ============ 讲师认证审核 ============
export const teacherCertApi = {
  // GET /teacher/certifications?status=&page=&pageSize= → { items, total, page, pageSize }
  list: (params?: Record<string, unknown>) => api.get("/teacher/certifications", { params }),
  // PUT /teacher/certifications/:id/review body { action: "APPROVE"|"REJECT", verifiedTitle?, rejectReason? }
  review: (id: string, data: Record<string, unknown>) => api.put(`/teacher/certifications/${id}/review`, data),
};

export const advisorRuleApi = {
  // GET /advisor/rules → { items: AdvisorRule[] }
  listRules: () => api.get("/advisor/rules"),
  createRule: (data: Record<string, unknown>) => api.post("/advisor/rules", data),
  // PUT body 不含 ruleKey（后端禁改规则键）
  updateRule: (id: string, data: Record<string, unknown>) => api.put(`/advisor/rules/${id}`, data),
};

// ============ 前端错误监控（G4·埋点 action=error 聚合） ============
export const trackErrorApi = {
  // GET /track/errors?days=&page=&pageSize= → { days, total, last24h, byDay, topMessages, items, page, pageSize }
  getErrors: (params?: { days?: number; page?: number; pageSize?: number }) =>
    api.get("/track/errors", { params }),
};

// ───────── 后台运营助手 ─────────
export const adminAssistantApi = {
  chat: (data: { message: string; page?: string; history?: { role: string; content: string }[] }) =>
    api.post("/admin-assistant/chat", data),
  createFeedback: (data: { page?: string; category?: string; title: string; detail: string; source?: string; images?: string[] }) =>
    api.post("/admin-assistant/feedback", data),
  myFeedback: () => api.get("/admin-assistant/my-feedback"),
  listFeedback: (params?: { page?: number; pageSize?: number; status?: string; category?: string }) =>
    api.get("/admin-assistant/feedback", { params }),
  summary: () => api.get("/admin-assistant/feedback/summary"),
  updateFeedback: (id: string, data: { status?: string; reply?: string }) =>
    api.put(`/admin-assistant/feedback/${id}`, data),
};

export default api;
