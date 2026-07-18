// 后台目录重构批（2026-07-11·董事长拍板）：菜单按员工工作流前端分组生成
// - 背景：旧菜单 ~35 个顶级项平铺、机器人/人工职责混杂、命名与 C 端两套（教学管理vs课程/社区管理vs圈子）
// - 本文件是侧边栏菜单的唯一前端声源；后端 /auth/menus 仅作兜底（见 store/auth.fetchMenus）
// - 权限：叶子项的可见性以 router meta.roles 为准（与路由守卫同源，不另维护一套角色表）
// - 护栏：router 中存在但未被本配置认领的可见路由，自动兜底进「📦 其他」组，保证所有既有路由可达
import router from "@/router";

/**
 * 工作区归属（体验标准 V1.0 第三节·董事长拍板 2026-07-18）：
 * - human = 人工工作区（默认·人看/人点/人拍板）
 * - ai    = AI 自动化工作区（数字员工车间·AI 自动执行 + 人监督兜底）
 * 归属自上而下继承：组标了 ai，子项不标即视为 ai；全树缺省 human。
 */
export type Workspace = "human" | "ai";

export interface MenuNode {
  title: string;
  icon?: string;
  path?: string;
  workspace?: Workspace;
  children?: MenuNode[];
}

interface LeafDef {
  path: string;
  /** 菜单显示名覆盖（命名统一：与 C 端叫法对齐）；缺省取 router meta.title */
  title?: string;
  /** 工作区归属（缺省继承所属分组·顶层缺省 human） */
  workspace?: Workspace;
}
interface GroupDef {
  title: string;
  icon?: string;
  /** 工作区归属（缺省继承上层·顶层缺省 human） */
  workspace?: Workspace;
  children: Array<LeafDef | GroupDef>;
}

const M = (path: string, title?: string, workspace?: Workspace): LeafDef => ({ path, title, workspace });

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
      M("/bounty/reviews", "悬赏审核"),
      M("/users/identity"), // 实名审核
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
          // M("/circle-backend"), // 2026-07-18 Z2审计下架：只读死列表半僵尸页·拍板确认后删路由（同时在 NOT_IN_MENU 拦兜底组）
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
        ],
      },
      {
        title: "推荐与搜索",
        children: [
          // 平台页面布局：可视化搭建器体验不佳（无拖拽），平台布局改由研发代码调整（董事长拍板 2026-07-12）→ 菜单隐藏，路由保留可直达
          // M("/platform-layout", "平台页面布局"),
          // M("/contents/recommend"), // 2026-07-18 Z2审计下架：字段全错必400·与推荐规则同端点双入口·拍板确认后删路由（同时在 NOT_IN_MENU 拦兜底组）
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
          // 站长促销微页面管理：将被「站长主推位前端自服务」取代（董事长拍板 2026-07-12）→ 菜单隐藏，路由保留可直达
          // M("/marketing/pages"),
          M("/marketing/landing-pages"),
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
        // 哨兵告警/刷单识别为 AI 自动巡检 → 已划入 AI 工作区"风控与巡检"（标准第三节 3.1）
        // 流失挽回子组（流失预测/规则/挽回动作）整组划入 AI 工作区"流失预测与挽回"
        title: "风控",
        children: [
          M("/risk/alerts"),
          M("/risk/rules"),
          M("/risk/timeline"),
          M("/risk/device-fingerprints"),
        ],
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
  // ═══════ AI 自动化工作区（数字员工车间·体验标准第三节 3.1）═══════
  // 原"🤖AI与数字员工"18 项全部划入 + 收编散落各区的 AI 自动化项
  //（哨兵告警/刷单识别原在"用户与会员·风控"·流失挽回三项原为"用户与会员"子组·
  //  合规扫描/系统任务池原在"⚙️ 系统"——已从人工区各组摘除，物理归位于此）
  // 两个同名"任务池"（/system/ops-tasks·/operation/tasks）均划入并重命名区分，合并事宜待拍板
  // 古籍管理组（/classics）保留人工区：按 3.2 判据页面主角是"人点按钮"的运营对象，
  // AI 采集维护过程无独立页面（组名"🤖AI维护"横幅已表达），如需运行视图后续在 AI 区补页
  M("/ai/overview", "AI工作总览", "ai"),
  {
    title: "🤖 智能体与客服",
    icon: "Cpu",
    workspace: "ai",
    children: [
      M("/ai/agent-marketplace"),
      M("/ai/circle-assistants"),
      M("/ai/customer-service"),
      M("/bots"),
    ],
  },
  {
    title: "✍️ 内容生产",
    icon: "EditPen",
    workspace: "ai",
    children: [
      M("/content-generation"),
      M("/knowledge"),
      M("/ai/media-processing"),
      M("/ai/content-quality"),
    ],
  },
  {
    title: "🛡 风控与巡检",
    icon: "Aim",
    workspace: "ai",
    children: [
      M("/ai/anomaly-detector"),
      M("/sentinel/alerts"),
      M("/risk/fraud"),
      M("/system/compliance-scan"),
    ],
  },
  {
    title: "📉 流失预测与挽回",
    icon: "TrendCharts",
    workspace: "ai",
    children: [M("/churn"), M("/churn/rules"), M("/churn/actions")],
  },
  {
    title: "🤝 协作与兜底",
    icon: "Checked",
    workspace: "ai",
    children: [M("/ai/collaborations"), M("/advisor/rules")],
  },
  {
    title: "📋 任务池",
    icon: "List",
    workspace: "ai",
    children: [
      M("/system/ops-tasks", "系统任务池"),
      M("/operation/tasks", "运营任务池"),
    ],
  },
  {
    title: "⚙️ 模型与运行",
    icon: "Setting",
    workspace: "ai",
    children: [
      M("/system/ai-gateway"),
      M("/ai/rag-templates"),
      M("/ai/data-explorer"),
      M("/ai/usage", "AI调用中心"),
      // 对话日志(/ai/chat-logs)与调用监控(/ai/call-monitor)已并入"AI调用中心"（三页原先全调错端点
      // /ai/media/tasks·真数据在 /ai/usage-stats 与 /ai/call-logs·2026-07-18 合并）。
      // 菜单先下架，路由保留为引导页；拍板确认后删路由。
    ],
  },
  {
    title: "🔮 排盘数据",
    icon: "Timer",
    children: [
      // 董事长拍板(2026-07-18)：后台排盘=前台用户排盘数据管理，后台不排盘。
      // 五个排盘工具页(/bazi /ziwei /qimen /liuyao /daliuren)菜单下架，路由保留；拍板确认后删路由。
      M("/paipan-records", "排盘记录管理"),
    ],
  },
  {
    title: "📊 数据与大屏",
    icon: "DataAnalysis",
    children: [
      M("/cockpit"), // 2026-07-18 双前缀修复：原 /admin/cockpit 会生成 /admin/admin/cockpit
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
          M("/bigscreen-tokens"), // 2026-07-18 双前缀修复：原 /admin/bigscreen-tokens
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
      // 合规扫描（AI 自动巡检）→ 已划入 AI 工作区"风控与巡检"（标准第三节 3.1）
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
      // 系统任务池（AI 执行队列）→ 已划入 AI 工作区"任务池"（与运营任务池同区重命名区分·合并待拍板）
      M("/system/feedback"),
      M("/system/error-monitor"),
      // 2026-07-18 Z7审计下架：与审计日志(/audit-logs)同端点 auditApi.list 重复入口·页面已收敛为引导卡·拍板确认后删路由
      // M("/system/operation-logs"),
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
  // ↓ 2026-07-18 Z2审计下架（菜单隐藏·路由保留·拍板确认后删路由）
  //   不加进本集合会被下方"覆盖护栏"兜底进「📦 其他」组，等于白隐藏
  "/contents/recommend", // 推荐管理：字段全错必400·与推荐规则(/recommend/rules)同端点双入口
  "/circle-backend", // 圈子后台管理：只读死列表半僵尸页·与 /circles 重复
  // ↓ 董事长拍板(2026-07-18)：后台不排盘·排盘=前台用户数据管理——五个工具页下架
  "/bazi",
  "/ziwei",
  "/qimen",
  "/liuyao",
  "/daliuren",
  "/system/operation-logs", // Z7审计下架：与审计日志同端点重复入口·已收敛引导卡
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

  const resolveLeaf = (leaf: LeafDef, ws: Workspace): MenuNode | null => {
    const r = router.resolve(leaf.path);
    // 死路径防呆（如后端菜单里遗留的 /poetry 类已删板块）
    if (r.name === "NotFound" || r.matched.length === 0) return null;
    claimed.add(leaf.path);
    const meta = r.meta as { title?: string; roles?: string[] };
    if (!roleAllows(meta?.roles)) return null;
    return { title: leaf.title || meta?.title || leaf.path, path: leaf.path, workspace: ws };
  };

  const buildList = (defs: Array<LeafDef | GroupDef>, inheritedWs: Workspace = "human"): MenuNode[] => {
    const out: MenuNode[] = [];
    for (const d of defs) {
      const ws = d.workspace ?? inheritedWs;
      if (isGroup(d)) {
        const children = buildList(d.children, ws);
        if (children.length === 0) continue;
        out.push({ title: d.title, icon: d.icon, workspace: ws, children });
      } else {
        const leaf = resolveLeaf(d, ws);
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

/**
 * 按工作区过滤已构建的菜单树（Layout 层调用·不动 store/auth 的 menus 构建链）。
 * 未标 workspace 的节点（后端兜底菜单/商家后台/「📦 其他」兜底组）按继承缺省 human，
 * 保证任何来源的菜单在人工区都可达——只调展示不丢页面。
 */
export function filterMenusByWorkspace(
  menus: MenuNode[],
  ws: Workspace,
  inherited: Workspace = "human",
): MenuNode[] {
  const out: MenuNode[] = [];
  for (const n of menus) {
    const eff = n.workspace ?? inherited;
    if (n.children && n.children.length > 0) {
      const children = filterMenusByWorkspace(n.children, ws, eff);
      if (children.length > 0) out.push({ ...n, children });
    } else if (eff === ws) {
      out.push(n);
    }
  }
  return out;
}

/**
 * 查询某路由路径的工作区归属（用于直达 URL 时自动切区·菜单高亮正确）。
 * 只认菜单声明里的叶子路径；菜单外页面（详情页/隐藏页）返回 null——不强行切区。
 */
export function pathWorkspace(path: string): Workspace | null {
  const walk = (defs: Array<LeafDef | GroupDef>, inherited: Workspace): Workspace | null => {
    for (const d of defs) {
      const ws = d.workspace ?? inherited;
      if (isGroup(d)) {
        const hit = walk(d.children, ws);
        if (hit) return hit;
      } else if (d.path === path) {
        return ws;
      }
    }
    return null;
  };
  return walk(MENU_GROUPS, "human");
}
