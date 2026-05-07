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

// 认证
export const authApi = {
  login: (data: { account: string; password: string }) => api.post("/auth/login/phone", data),
  register: (data: any) => api.post("/auth/register/phone", data),
  getProfile: () => api.get("/auth/me"),
};

// 内容
export const contentApi = {
  list: (params?: any) => api.get("/articles", params),
  feed: (params?: any) => api.get("/articles/feed", params),
  detail: (id: string) => api.get(`/articles/${id}`),
  related: (id: string) => api.get(`/articles/${id}/related`),
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
  myOrders: (params?: any) => api.get("/shop/orders/my", params),
  orderDetail: (id: string) => api.get(`/shop/orders/${id}`),
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

export default api;
