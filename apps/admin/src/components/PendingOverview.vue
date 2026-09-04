<template>
  <el-card
    v-if="availableQueueCount > 0"
    class="pending-overview"
    :class="{ 'is-compact': overview.visibleItems.length === 0 }"
    shadow="never"
  >
    <template #header>
      <div class="po-header">
        <span class="po-title">待办概览</span>
        <span
          class="po-sub"
          role="status"
        >
          <template v-if="loading">正在获取审核队列…</template>
          <template v-else-if="overview.total > 0">{{ overview.activeCount }} 个队列有 {{ overview.total }} 项待处理</template>
          <template v-else-if="items.length > 0">已获取的 {{ items.length }} 个队列暂无待办</template>
          <template v-else>待办数据暂不可用，请刷新重试</template>
          <span
            v-if="!loading && unavailableQueueCount > 0"
            class="po-warning"
          > · {{ unavailableQueueCount }} 个队列暂未获取</span>
        </span>
        <el-button
          v-if="overview.idleCount > 0"
          text
          size="small"
          :aria-expanded="expanded"
          aria-controls="pending-queues"
          @click="expanded = !expanded"
        >
          {{ expanded ? "收起空队列" : "展开全部队列" }}
        </el-button>
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
    <div
      id="pending-queues"
      class="po-grid"
    >
      <button
        v-for="it in overview.visibleItems"
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
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { api, type AdminRequestConfig } from "@/api";
import { readPendingTotal, summarizePendingQueues, type PendingQueue } from "@/utils/pending-queues";

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
const items = ref<PendingQueue[]>([]);
const loading = ref(false);
const expanded = ref(false);
const availableQueueCount = ref(0);
const unavailableQueueCount = ref(0);
const overview = computed(() => summarizePendingQueues(items.value, expanded.value));

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

async function load() {
  if (loading.value) return;
  loading.value = true;
  const queues = QUEUES.filter((q) => allowed(q.link));
  availableQueueCount.value = queues.length;
  try {
    const results = await Promise.all(
      queues.map(async (q) => {
        try {
          const config: AdminRequestConfig = {
            ...(q.params ? { params: q.params } : {}),
            silentError: true,
          };
          const { data } = await api.get(q.url, config);
          const total = readPendingTotal(data);
          if (total === null) return null;
          return { title: q.title, link: q.link, count: total };
        } catch {
          return null; // 失败该项不显示
        }
      }),
    );
    items.value = results.filter((x): x is PendingQueue => x !== null);
    unavailableQueueCount.value = queues.length - items.value.length;
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
  margin-bottom: 18px;
  border-radius: 18px !important;
}
.po-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.po-title {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--color-text-title);
}
.po-sub {
  font-size: 12px;
  color: var(--color-text-secondary);
  flex: 1;
  min-width: 180px;
  line-height: 1.6;
}
.po-warning { color: var(--color-warning); }
.pending-overview.is-compact :deep(.el-card__body) { display: none; }
.pending-overview.is-compact :deep(.el-card__header) { border-bottom: 0; }
.po-item:focus-visible { outline: 2px solid var(--color-tech); outline-offset: 3px; }
@media (max-width: 600px) {
  .po-sub { flex-basis: calc(100% - 80px); min-width: 0; }
  .po-header :deep(.el-button) { min-height: 44px; padding-block: 8px; }
}
.po-refresh {
  flex-shrink: 0;
}
.po-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 8px;
}
.po-item {
  width: 100%;
  font: inherit;
  min-height: 76px;
  text-align: left;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-start;
  justify-content: center;
  gap: 5px;
  padding: 12px 14px;
  border: 1px solid var(--color-border-light);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color var(--transition-base), background var(--transition-base), box-shadow var(--transition-base);
  background: #f8f9fb;
}
.po-item:hover {
  border-color: #bdc8d4;
  background: #fff;
  box-shadow: 0 8px 18px rgba(24,45,68,.07);
}
.po-count {
  font-family: var(--font-family-number);
  font-size: 23px;
  font-weight: 650;
  color: #657284;
  letter-spacing: -.03em;
  line-height: 1.2;
}
.po-item.hot { border-color: rgba(180,35,62,.14); background: rgba(180,35,62,.035); }
.po-item.hot .po-count {
  color: var(--color-primary);
}
.po-label {
  font-size: 12px;
  color: #707c8b;
  white-space: nowrap;
}
</style>
