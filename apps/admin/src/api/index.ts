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
};

// 仪表盘
export const dashboardApi = {
  stats: () => api.get("/dashboard/stats"),
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

// 线下驿站
export const stationOfflineApi = {
  list: (params?: any) => api.get("/offline/stations", { params }),
  detail: (id: string) => api.get(`/offline/stations/${id}`),
  create: (data: any) => api.post("/offline/stations", data),
  audit: (id: string, status: string) => api.put(`/offline/stations/${id}/audit`, { status }),
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

export default api;
