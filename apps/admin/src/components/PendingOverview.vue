<template>
  <el-card
    v-if="items.length > 0"
    class="pending-overview"
    shadow="never"
  >
    <template #header>
      <div class="po-header">
        <span class="po-title">📋 待办概览</span>
        <span class="po-sub">各审核队列实时待处理数 · 点击直达</span>
        <el-button
          text
          size="small"
          :loading="loading"
          class="po-refresh"
          @click="load"
        >
          刷新
        </el-button>
      </div>
    </template>
    <div class="po-grid">
      <button
        v-for="it in items"
        :key="it.link"
        type="button"
        class="po-item"
        :class="{ hot: it.count > 0 }"
        @click="go(it.link)"
      >
        <span class="po-count">{{ it.count }}</span>
        <span class="po-label">{{ it.title }}</span>
      </button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
// 目录重构批（2026-07-11）：员工进后台第一眼知道该干啥——
// 真连各审核队列既有列表端点取 PENDING 计数；某项请求失败/无权限则该项不显示（诚实降级）
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { api, type AdminRequestConfig } from "@/api";

interface QueueItem {
  title: string;
  link: string;
  count: number;
}

interface QueueDef {
  title: string;
  /** 审核页路由（可见性按其 meta.roles 判定） */
  link: string;
  /** 计数用列表端点 */
  url: string;
  params?: Record<string, string | number>;
}

const P1 = { page: 1, pageSize: 1 };
const QUEUES: QueueDef[] = [
  { title: "内容审核", link: "/contents/audit", url: "/contents", params: { ...P1, status: "PENDING" } },
  { title: "商品审核", link: "/shop/product-audit", url: "/shop/products", params: { ...P1, status: "PENDING" } },
  { title: "退款审核", link: "/orders/refund", url: "/shop/admin/after-sales", params: { ...P1, status: "PENDING" } },
  { title: "圈子退款", link: "/circle-refunds", url: "/circle-refund/admin-pending" },
  { title: "圈子申诉", link: "/circle-appeals", url: "/circle-governance/admin/appeals", params: { ...P1, status: "PENDING" } },
  { title: "通话账单申诉", link: "/call-disputes", url: "/consult-calls/admin/disputes", params: { ...P1, status: "PENDING" } },
  // 补齐三缺口（2026-07-18）：举报/用户申诉走列表端点 status=PENDING 取 total；
  // 悬赏审核（/admin/bounty/reviews）后端不支持 status 过滤、total 是全量非待审数，接了会虚报，暂不接（待后端补）
  { title: "举报处理", link: "/reports", url: "/interaction/report", params: { ...P1, status: "PENDING" } },
  { title: "用户申诉", link: "/risk/appeals", url: "/risk-control/appeals", params: { ...P1, status: "PENDING" } },
  { title: "实名审核", link: "/users/identity", url: "/identity/admin/audit-list", params: { ...P1, status: "PENDING" } },
  { title: "讲师认证", link: "/teacher/certifications", url: "/teacher/certifications", params: { ...P1, status: "PENDING" } },
  { title: "商家入驻审核", link: "/merchants", url: "/admin/merchants", params: { ...P1, status: "PENDING_REVIEW" } },
];

const router = useRouter();
const items = ref<QueueItem[]>([]);
const loading = ref(false);

/** 与路由守卫同源的角色可见性判断（超管全见） */
function allowed(link: string): boolean {
  try {
    const cached = localStorage.getItem("user_roles");
    const userRoles: string[] = cached ? JSON.parse(cached) : [];
    if (userRoles.includes("SUPER_ADMIN")) return true;
    const meta = router.resolve(link).meta as { roles?: string[] };
    const required = meta?.roles || [];
    if (required.length === 0) return true;
    return required.some((r) => userRoles.includes(r));
  } catch {
    return false;
  }
}

/** 兼容各队列端点的返回形态：{total} / {data:{total}} / 纯数组 / {items:[]} */
function extractTotal(data: unknown): number | null {
  const d = data as { total?: unknown; data?: { total?: unknown }; items?: unknown };
  if (typeof d?.total === "number") return d.total;
  if (typeof d?.data?.total === "number") return d.data.total;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(d?.items)) return (d.items as unknown[]).length;
  return null;
}

async function load() {
  loading.value = true;
  try {
    const results = await Promise.all(
      QUEUES.filter((q) => allowed(q.link)).map(async (q) => {
        try {
          const config: AdminRequestConfig = {
            ...(q.params ? { params: q.params } : {}),
            silentError: true,
          };
          const { data } = await api.get(q.url, config);
          const total = extractTotal(data);
          if (total === null) return null;
          return { title: q.title, link: q.link, count: total };
        } catch {
          return null; // 失败该项不显示
        }
      }),
    );
    items.value = results.filter((x): x is QueueItem => x !== null);
  } finally {
    loading.value = false;
  }
}

function go(link: string) {
  router.push(link);
}

onMounted(load);
</script>

<style scoped>
.pending-overview {
  margin-bottom: 16px;
}
.po-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.po-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-title);
}
.po-sub {
  font-size: 12px;
  color: var(--color-text-secondary);
  flex: 1;
}
.po-refresh {
  flex-shrink: 0;
}
.po-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 10px;
}
.po-item {
  width: 100%;
  font: inherit;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 8px;
  border: 1px solid var(--color-divider);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg-card);
}
.po-item:hover {
  border-color: var(--color-gold, #c9a96e);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}
.po-count {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-secondary);
  line-height: 1.2;
}
.po-item.hot .po-count {
  color: #c0392b;
}
.po-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
</style>
