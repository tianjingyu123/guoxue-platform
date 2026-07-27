import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { authApi } from "@/api";
import { ElMessage } from "element-plus";
import { buildMenus } from "@/lib/menu-structure";

export interface MenuItem {
  title: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "超级管理员",
  OPERATION_ADMIN: "运营管理员",
  CONTENT_AUDITOR: "内容品控",
  FINANCE_ADMIN: "财务管理员",
  CUSTOMER_SERVICE: "客服管理员",
  GOODS_AUDITOR: "商品品控",
  CIRCLE_OWNER: "圈主",
  LECTURER: "讲师",
  STATION_MASTER: "分站长",
  OPERATOR: "运营商",
  STATION_OFFLINE_OWNER: "驿站主",
  INSTITUTE_MEMBER: "研究院成员",
  MERCHANT: "商家",
};

export const useAuthStore = defineStore("auth", () => {
  const user = ref<any>(null);
  const token = ref<string | null>(localStorage.getItem("token"));
  const menus = ref<MenuItem[]>([]);
  const isLogin = computed(() => !!token.value && !!user.value);

  // 当前用户角色列表
  const roles = computed<string[]>(() => {
    return (user.value?.roles || []).map((r: any) => r.roleType);
  });

  // 角色中文标签（用于 header 展示）
  const roleLabels = computed<string[]>(() => {
    return roles.value.map((r) => ROLE_LABELS[r] || r);
  });

  // 是否超级管理员
  const isSuperAdmin = computed(() => roles.value.includes("SUPER_ADMIN"));

  // 是否已入驻商家（状态为 ACTIVE）
  const isMerchant = computed(() => user.value?.merchant?.status === "ACTIVE");

  // 商家后台菜单（前端注入，不走后端动态菜单）
  const MERCHANT_MENUS: MenuItem[] = [
    {
      title: "商家后台",
      icon: "Shop",
      children: [
        { title: "数据概览", icon: "DataAnalysis", path: "/merchant-backend/dashboard" },
        { title: "商品管理", icon: "Goods", path: "/merchant-backend/products" },
        { title: "库存与采购", icon: "Box", path: "/merchant-backend/inventory" },
        { title: "订单管理", icon: "Document", path: "/merchant-backend/orders" },
        { title: "发货管理", icon: "Van", path: "/merchant-backend/shipping" },
        { title: "售后管理", icon: "Service", path: "/merchant-backend/after-sales" },
        { title: "客户管理", icon: "User", path: "/merchant-backend/customers" },
        { title: "评价管理", icon: "ChatDotRound", path: "/merchant-backend/reviews" },
        { title: "收入结算", icon: "Money", path: "/merchant-backend/revenue" },
        { title: "违规记录", icon: "Warning", path: "/merchant-backend/violations" },
        { title: "店铺设置", icon: "Setting", path: "/merchant-backend/profile" },
      ],
    },
  ];

  // 检查是否拥有指定角色
  function hasRole(...roleTypes: string[]): boolean {
    if (isSuperAdmin.value) return true;
    return roleTypes.some((r) => roles.value.includes(r));
  }

  async function login(phone: string, password: string) {
    const { data } = await authApi.login({ phone, password });
    token.value = data.accessToken ?? data.access_token;
    localStorage.setItem("token", token.value!);
    const rt = data.refreshToken ?? data.refresh_token;
    if (rt) localStorage.setItem("refresh_token", rt);
    await fetchProfile();
    await fetchMenus();
  }

  async function fetchProfile() {
    try {
      const { data } = await authApi.getProfile();
      user.value = data;
      // 缓存角色供路由守卫使用
      const roleList = (data?.roles || []).map((r: any) => r.roleType);
      localStorage.setItem("user_roles", JSON.stringify(roleList));
    } catch {
      logout();
      throw new Error("获取用户信息失败");
    }
  }

  async function fetchMenus() {
    // 目录重构批（2026-07-11）：菜单改为前端按员工工作流分组生成（lib/menu-structure.ts·可见性以路由 meta.roles 为准），
    // 后端 /auth/menus 仅作兜底（前端构建异常/为空时回退旧菜单·后端不动可随时回滚）
    let base: MenuItem[] = [];
    try {
      base = buildMenus(roles.value);
    } catch {
      base = [];
    }
    if (base.length === 0) {
      try {
        const { data } = await authApi.getMenus();
        base = data || [];
      } catch {
        base = [];
      }
    }
    // 商家用户追加商家后台菜单
    menus.value = isMerchant.value ? [...base, ...MERCHANT_MENUS] : base;
  }

  function logout() {
    token.value = null;
    user.value = null;
    menus.value = [];
    // 会话键全量清理（与全仓 localStorage.setItem 写入点一一对应·防止凭证/会话残留被下一个登录者复用）
    localStorage.removeItem("token"); // login / api 拦截器刷新时写入
    localStorage.removeItem("refresh_token"); // login / api 拦截器刷新时写入（此前漏删·安全修复）
    localStorage.removeItem("user_roles"); // fetchProfile 写入（路由守卫用）
    localStorage.removeItem("redirect_after_login"); // api 401 时写入·防止换号登录后被带回上一账号的页面
    localStorage.removeItem("admin_assistant_chat"); // 运营助手对话记录·含上一账号的会话内容
    ElMessage.success("已退出登录");
  }

  return { user, token, menus, isLogin, roles, roleLabels, isSuperAdmin, isMerchant, hasRole, login, fetchProfile, fetchMenus, logout };
});
