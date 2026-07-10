// 后台目录重构批（2026-07-11·董事长拍板）：菜单按员工工作流前端分组生成
// - 背景：旧菜单 ~35 个顶级项平铺、机器人/人工职责混杂、命名与 C 端两套（教学管理vs课程/社区管理vs圈子）
// - 本文件是侧边栏菜单的唯一前端声源；后端 /auth/menus 仅作兜底（见 store/auth.fetchMenus）
// - 权限：叶子项的可见性以 router meta.roles 为准（与路由守卫同源，不另维护一套角色表）
// - 护栏：router 中存在但未被本配置认领的可见路由，自动兜底进「📦 其他」组，保证所有既有路由可达
import router from "@/router";

export interface MenuNode {
  title: string;
  icon?: string;
  path?: string;
  children?: MenuNode[];
}

interface LeafDef {
  path: string;
  /** 菜单显示名覆盖（命名统一：与 C 端叫法对齐）；缺省取 router meta.title */
  title?: string;
}
interface GroupDef {
  title: string;
  icon?: string;
  children: Array<LeafDef | GroupDef>;
}

const M = (path: string, title?: string): LeafDef => ({ path, title });

function isGroup(d: LeafDef | GroupDef): d is GroupDef {
  return Array.isArray((d as GroupDef).children);
}

/**
 * 新菜单结构（按员工工作流分组·顺序即高频优先）
 * 命名统一原则：与 C 端命名对齐——课程（原"教学管理"）、圈子（原"社区管理"）、
 * 短视频（原"视频管理"）、悬赏（原"赏金"）、商品审核（原"商品品控"）
 */
const MENU_GROUPS: Array<LeafDef | GroupDef> = [
  M("/dashboard", "工作台"),
  {
    title: "📋 审核中心",
    icon: "Checked",
    children: [
      M("/contents/audit"), // 内容审核
      M("/shop/product-audit", "商品审核"),
      M("/orders/refund"), // 退款审核（商城）
      M("/circle-refunds"), // 圈子退款审核
      M("/circle-appeals"), // 圈子申诉仲裁
      M("/call-disputes"), // 通话账单申诉
      M("/social/notes-audit"), // 公开笔记审核
      M("/bounty/reviews", "悬赏审核"),
      M("/users/identity"), // 实名审核
      M("/users/capabilities"), // 功能权限审批
      M("/teacher/certifications"), // 讲师认证审核
      M("/risk/appeals", "用户申诉处理"),
      M("/reports"), // 举报管理
    ],
  },
  {
    title: "🏛 内容运营",
    icon: "Document",
    children: [
      {
        title: "圈子",
        children: [
          M("/circles"),
          M("/circle-backend"),
          M("/articles"), // 文章归圈子（发文由圈主授权·与 C 端一致）
          M("/questions", "付费问答（达人咨询）"),
          M("/bounty/questions", "悬赏问题"),
          M("/bounty/experts", "悬赏专家"),
        ],
      },
      {
        title: "课程",
        children: [M("/courses"), M("/courses/categories"), M("/bundles")],
      },
      {
        title: "短视频与直播",
        children: [M("/videos", "短视频管理"), M("/lives")],
      },
      {
        // 机器人/人工分离：古籍库由 AI 数字员工采集维护，人工只做运营视图
        title: "古籍（🤖AI维护）",
        children: [M("/classics"), M("/classics/commentaries")],
      },
      {
        title: "互动社区",
        children: [
          M("/comments"),
          M("/social/comment-center"),
          M("/social/emojis"),
          M("/social/achievements"),
          M("/social/certifications"),
          M("/content/ritual"),
        ],
      },
      {
        title: "推荐与搜索",
        children: [
          M("/contents/recommend"),
          M("/recommend/rules"),
          M("/recommend/ab-tests"),
          M("/search-analytics"),
          M("/content-categories"),
        ],
      },
      M("/competitions"),
      // 双入口收敛（方案块 E 前置）：Content 旧 CMS 仍被 C 端发现页聚合消费，暂不停写，标注降权置末
      M("/contents", "内容库（旧CMS）"),
    ],
  },
  {
    title: "🛍 电商",
    icon: "ShoppingCart",
    children: [
      {
        title: "商品",
        children: [
          M("/products"),
          M("/categories"),
          M("/freight-templates"),
          M("/reviews"),
          M("/pricing/rules"),
          M("/pricing/demand"),
        ],
      },
      {
        title: "订单与售后",
        children: [
          M("/orders"),
          M("/orders/center"),
          M("/after-sales"),
          M("/orders/gift-card-print"),
        ],
      },
      {
        title: "商家",
        children: [M("/merchants"), M("/merchants/agreements")],
      },
      {
        title: "营销",
        children: [
          M("/marketing/activities"),
          M("/marketing/flash-sales"),
          M("/marketing/group-buys"),
          M("/marketing/discounts"),
          M("/marketing/full-reductions"),
          M("/coupons"),
          M("/marketing/coupons"),
          M("/marketing/pages"),
          M("/marketing/landing-pages"),
          M("/marketing/poster-templates"),
          M("/marketing/share-data"),
          M("/marketing/invite-rewards"),
          M("/marketing/spread-power"),
        ],
      },
    ],
  },
  {
    title: "👥 用户与会员",
    icon: "User",
    children: [
      M("/users"),
      M("/users/push"),
      M("/users/interests"),
      M("/user-tags"),
      {
        title: "会员",
        children: [
          M("/member/manage"),
          M("/member/purchases"),
          M("/member/stats"),
          M("/renewal"),
        ],
      },
      {
        title: "创作者",
        children: [M("/creator/list"), M("/creator/withdrawals")],
      },
      {
        title: "消息触达",
        children: [M("/notifications"), M("/sms"), M("/im")],
      },
      {
        title: "风控",
        children: [
          M("/risk/alerts"),
          M("/sentinel/alerts"),
          M("/risk/rules"),
          M("/risk/fraud"),
          M("/risk/timeline"),
          M("/risk/device-fingerprints"),
        ],
      },
      {
        title: "流失挽回",
        children: [M("/churn"), M("/churn/rules"), M("/churn/actions")],
      },
    ],
  },
  {
    title: "💰 财务",
    icon: "Money",
    children: [
      M("/revenue"),
      M("/orders/payments"),
      M("/recharges"),
      M("/coin-transactions"),
      M("/gifts"),
      M("/finance/reconciliation"),
      M("/finance/invoices"),
      M("/finance/settlements"),
      M("/finance/reports"),
      M("/finance/freeze"),
      M("/finance/fund-approval"),
      M("/finance/withdrawals"),
      M("/withdrawals", "提现审核（分佣）"),
      M("/commission-config"),
      M("/finance/settlement-rules"),
      M("/platform-fee"),
      M("/huifu"),
    ],
  },
  {
    title: "🏪 线下与生态",
    icon: "OfficeBuilding",
    children: [
      M("/stations"),
      M("/operators"),
      M("/operators/picks"),
      M("/operators/earnings"),
      M("/operators/miniapps"),
      M("/offline-venues"),
      M("/offline/courses"),
      M("/offline/teachers"),
      M("/teacher-requests"),
      M("/offline/checkins"),
      M("/offline/products"),
      M("/offline/bookings"),
      M("/institutes"),
      M("/institutes/finance"),
      M("/institutes/task-templates"),
      M("/station-backend"),
      M("/operator-backend"),
    ],
  },
  {
    title: "🤖 AI与数字员工",
    icon: "Cpu",
    children: [
      M("/ai/agent-marketplace"),
      M("/ai/circle-assistants"),
      M("/ai/customer-service"),
      M("/knowledge"),
      M("/content-generation"),
      M("/ai/media-processing"),
      M("/ai/content-quality"),
      M("/ai/rag-templates"),
      M("/ai/prompt-scenes"),
      M("/ai/data-explorer"),
      M("/ai/anomaly-detector"),
      M("/ai/collaborations"),
      M("/ai/usage"),
      M("/ai/chat-logs"),
      M("/ai/call-monitor"),
      M("/bots"),
      M("/advisor/rules"),
      M("/operation/tasks", "运营任务池"),
      M("/system/ai-gateway"),
    ],
  },
  {
    title: "🔮 排盘工具",
    icon: "Timer",
    children: [
      M("/bazi"),
      M("/ziwei"),
      M("/qimen"),
      M("/liuyao"),
      M("/daliuren"),
      M("/paipan-records"),
    ],
  },
  {
    title: "📊 数据与大屏",
    icon: "DataAnalysis",
    children: [
      M("/admin/cockpit"),
      {
        title: "运营看板",
        children: [
          M("/dashboard/overview"),
          M("/dashboard/growth"),
          M("/dashboard/revenue"),
          M("/dashboard/health"),
        ],
      },
      {
        title: "业务数据",
        children: [
          M("/data/platform"),
          M("/data/circle"),
          M("/data/course"),
          M("/data/live"),
          M("/data/station"),
          M("/interactions"),
          M("/dashboard/funnels"),
          M("/dashboard/perf"),
          M("/dashboard/creation-rankings"),
        ],
      },
      {
        title: "对外大屏",
        children: [
          M("/bigscreen/platform"),
          M("/bigscreen/transactions"),
          M("/bigscreen/content-eco"),
          M("/bigscreen/ai-capability"),
          M("/bigscreen/offline-map"),
          M("/admin/bigscreen-tokens"),
        ],
      },
    ],
  },
  {
    title: "⚙️ 系统",
    icon: "Setting",
    children: [
      M("/system-settings"),
      M("/system/role-permission"),
      M("/system/feature-flags"),
      M("/system/third-party"),
      M("/system/brand"),
      M("/banners"),
      M("/system/homepage-config"),
      M("/system/site-notices"),
      M("/system/legal-documents"),
      M("/system/app-versions"),
      M("/system/sensitive-words"),
      M("/system/compliance-scan"),
      M("/system/referrals"),
      M("/system/coin-config"),
      M("/system/member-config"),
      M("/system/operator-level"),
      M("/system/webhooks"),
      M("/system/cron"),
      M("/system/email"),
      M("/system/import"),
      M("/system/export"),
      M("/system/backup"),
      M("/system/ops-tasks", "系统任务池"),
      M("/system/feedback"),
      M("/system/error-monitor"),
      M("/system/operation-logs"),
      M("/system/config-versions"),
      M("/audit-logs"),
      M("/system/search-weights"),
      M("/users/whitelist"),
      M("/tenants"),
    ],
  },
];

/** 有意不进菜单（仍可路由直达）：角色工作台由 /dashboard 按角色自动加载 */
const NOT_IN_MENU = new Set<string>([
  "/dashboard/super-admin",
  "/dashboard/operation",
  "/dashboard/finance",
  "/dashboard/customer-service",
  "/dashboard/content-audit",
  "/dashboard/goods-audit",
]);

/**
 * 按当前用户角色构建分组菜单树。
 * - 叶子可见性以 router meta.roles 为准（超管全见）；死路径（router 无此路由）自动剔除
 * - 空组自动折叠不显示
 * - 覆盖护栏：未被认领的可见路由兜底进「📦 其他」组
 */
export function buildMenus(userRoles: string[]): MenuNode[] {
  const isSuper = userRoles.includes("SUPER_ADMIN");
  const claimed = new Set<string>();

  const roleAllows = (roles: string[] | undefined): boolean => {
    if (!roles || roles.length === 0) return true;
    if (isSuper) return true;
    return roles.some((r) => userRoles.includes(r));
  };

  const resolveLeaf = (leaf: LeafDef): MenuNode | null => {
    const r = router.resolve(leaf.path);
    // 死路径防呆（如后端菜单里遗留的 /poetry 类已删板块）
    if (r.name === "NotFound" || r.matched.length === 0) return null;
    claimed.add(leaf.path);
    const meta = r.meta as { title?: string; roles?: string[] };
    if (!roleAllows(meta?.roles)) return null;
    return { title: leaf.title || meta?.title || leaf.path, path: leaf.path };
  };

  const buildList = (defs: Array<LeafDef | GroupDef>): MenuNode[] => {
    const out: MenuNode[] = [];
    for (const d of defs) {
      if (isGroup(d)) {
        const children = buildList(d.children);
        if (children.length === 0) continue;
        out.push({ title: d.title, icon: d.icon, children });
      } else {
        const leaf = resolveLeaf(d);
        if (leaf) out.push(leaf);
      }
    }
    return out;
  };

  const menus = buildList(MENU_GROUPS);

  // 覆盖护栏：router 中可见但未认领的路由兜底展示，保证"只调结构不丢页面"
  const leftovers: MenuNode[] = [];
  for (const rt of router.getRoutes()) {
    const meta = rt.meta as {
      title?: string;
      hidden?: boolean;
      guest?: boolean;
      roles?: string[];
    };
    if (!meta?.title || meta.hidden || meta.guest) continue;
    const p = rt.path;
    if (!p || p === "/" || p.includes(":")) continue;
    // 商家后台菜单由 store/auth 按 isMerchant 注入（路由无 roles·后端 MerchantGuard 校验）
    if (p.startsWith("/merchant-backend")) continue;
    if (claimed.has(p) || NOT_IN_MENU.has(p)) continue;
    if (!roleAllows(meta.roles)) continue;
    leftovers.push({ title: meta.title, path: p });
  }
  if (leftovers.length > 0) {
    menus.push({ title: "📦 其他", children: leftovers });
  }

  return menus;
}
