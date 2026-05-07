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
  posts: (circleId: string, params?: any) => api.get(`/circles/${circleId}/posts`, params),
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
  search: (q: string, type?: string) => api.get("/search", { q, type }),
  hot: () => api.get("/search/hot"),
  history: () => api.get("/search/history"),
  saveHistory: (keyword: string) => api.get("/search/history/save", { keyword }),
};

// 排盘
export const paipanApi = {
  preview: (data: any) => api.post("/paipan/bazi/preview", data),
  save: (data: any) => api.post("/paipan/bazi", data),
  history: () => api.get("/paipan/bazi"),
};

// 通知
export const notifyApi = {
  list: () => api.get("/notifications"),
  unreadCount: () => api.get("/notifications/unread-count"),
  readAll: () => api.put("/notifications/read-all"),
};

export default api;
