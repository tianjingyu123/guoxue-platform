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

export default api;
