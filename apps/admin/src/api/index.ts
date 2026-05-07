import axios from "axios";
import { ElMessage } from "element-plus";

const api = axios.create({
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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message ?? "请求失败";
    ElMessage.error(msg);
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// 认证
export const authApi = {
  login: (data: { account: string; password: string }) =>
    api.post("/auth/login", data),
  getProfile: () => api.get("/auth/me"),
};

// 内容
export const contentApi = {
  list: (params?: any) => api.get("/contents", { params }),
  detail: (id: string) => api.get(`/contents/${id}`),
  create: (data: any) => api.post("/contents", data),
  update: (id: string, data: any) => api.put(`/contents/${id}`, data),
  remove: (id: string) => api.delete(`/contents/${id}`),
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
};

// 圈子
export const circleApi = {
  list: (params?: any) => api.get("/circles", { params }),
  detail: (id: string) => api.get(`/circles/${id}`),
  update: (id: string, data: any) => api.put(`/circles/${id}`, data),
  remove: (id: string) => api.delete(`/circles/${id}`),
};

// 视频
export const videoApi = {
  list: (params?: any) => api.get("/videos", { params }),
  detail: (id: string) => api.get(`/videos/${id}`),
  remove: (id: string) => api.delete(`/videos/${id}`),
};

// 直播
export const liveApi = {
  rooms: (params?: any) => api.get("/live/rooms", { params }),
  detail: (id: string) => api.get(`/live/rooms/${id}`),
  endRoom: (id: string) => api.put(`/live/rooms/${id}/end`),
  remove: (id: string) => api.delete(`/live/rooms/${id}`),
};

// 用户管理
export const userApi = {
  list: (params?: any) => api.get("/users", { params }),
  detail: (id: string) => api.get(`/users/${id}`),
  assignRole: (id: string, data: any) => api.post(`/users/${id}/roles`, data),
  removeRole: (id: string, roleType: string, bindId?: string) => api.delete(`/users/${id}/roles/${roleType}`, { data: { bindId } }),
};

// 古籍
export const classicApi = {
  list: (params?: any) => api.get("/classic/books", { params }),
  detail: (id: string) => api.get(`/classic/books/${id}`),
  create: (data: any) => api.post("/classic/books", data),
  update: (id: string, data: any) => api.put(`/classic/books/${id}`, data),
  remove: (id: string) => api.delete(`/classic/books/${id}`),
  getChapters: (bookId: string) => api.get(`/classic/books/${bookId}`),
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
  // 物流
  getLogistics: (orderId: string) => api.get(`/shop/orders/${orderId}/logistics`),
  updateLogistics: (orderId: string, data: any) => api.put(`/shop/orders/${orderId}/logistics`, data),
  // 评价
  listReviews: (productId: string, params?: any) => api.get(`/shop/products/${productId}/reviews`, { params }),
};

export default api;
