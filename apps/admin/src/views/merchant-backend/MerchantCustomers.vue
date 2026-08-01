<template>
  <div class="customers-page">
    <section class="customer-hero">
      <div class="hero-copy">
        <p class="eyebrow">CUSTOMER RELATIONSHIP</p>
        <h1>客户不是一行数据，而是一段持续经营的关系</h1>
        <p>
          只统计已付款、已发货和已完成订单。手机号保持脱敏，最近交易、客单价和退款情况集中呈现。
        </p>
      </div>
      <div class="hero-actions">
        <el-button plain @click="router.push('/merchant-backend/reviews')">查看口碑</el-button>
        <el-button type="primary" :loading="loading" @click="fetchList">刷新客户</el-button>
      </div>
    </section>

    <section class="relation-metrics" aria-label="客户关系概览">
      <article class="metric-card tone-gold">
        <span>交易客户</span>
        <strong>{{ total }}</strong>
        <small>至少产生过一笔有效订单</small>
      </article>
      <article class="metric-card tone-ink">
        <span>本页有效消费</span>
        <strong>{{ fmtMoney(pageSpent) }}</strong>
        <small>不含待付款、取消和退款订单</small>
      </article>
      <article class="metric-card tone-jade">
        <span>复购客户</span>
        <strong>{{ repeatCustomers }}</strong>
        <small>本页有效订单不少于 2 笔</small>
      </article>
      <article class="metric-card tone-paper">
        <span>本页平均客单</span>
        <strong>{{ fmtMoney(pageAverageOrderValue) }}</strong>
        <small>帮助识别高价值关系</small>
      </article>
    </section>

    <section class="customer-workspace">
      <div class="workspace-head">
        <div>
          <p class="eyebrow">RELATIONSHIP QUEUE</p>
          <h2>客户档案</h2>
        </div>
        <el-input
          v-model="search"
          placeholder="搜索客户昵称 / 脱敏手机号"
          clearable
          class="customer-search"
          @input="onSearch"
        />
      </div>

      <el-result
        v-if="error"
        icon="error"
        title="加载失败"
        sub-title="客户档案加载失败，请稍后重试"
      >
        <template #extra>
          <el-button type="primary" @click="fetchList">重试</el-button>
        </template>
      </el-result>

      <el-table
        v-else
        v-loading="loading"
        :data="displayList"
        stripe
        class="customer-table"
        row-class-name="customer-table-row"
        @row-click="openDetail"
      >
        <template #empty>
          <el-empty
            :description="
              search ? '没有匹配的客户，换个关键词试试' : '暂无客户，买家完成有效支付后会出现在这里'
            "
          />
        </template>
        <el-table-column label="客户" min-width="220">
          <template #default="{ row }">
            <div class="customer-cell">
              <div class="customer-avatar">
                <img v-if="row.avatar" :src="row.avatar" alt="" />
                <span v-else>{{ initials(row.nickname) }}</span>
              </div>
              <div>
                <strong>{{ row.nickname || "未设置昵称" }}</strong>
                <span>{{ row.phone || "未绑定手机号" }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="有效消费" width="150" align="right">
          <template #default="{ row }">
            <strong class="money">{{ fmtMoney(row.totalSpent) }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="有效订单" width="110" align="center">
          <template #default="{ row }">
            <span class="order-count">{{ row.orderCount ?? 0 }} 笔</span>
          </template>
        </el-table-column>
        <el-table-column label="关系状态" width="130">
          <template #default="{ row }">
            <span class="relation-tag" :class="{ repeat: Number(row.orderCount || 0) >= 2 }">
              {{ Number(row.orderCount || 0) >= 2 ? "已有复购" : "首次成交" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最近成交" width="170">
          <template #default="{ row }">{{ fmtTime(row.lastOrderAt) }}</template>
        </el-table-column>
        <el-table-column label="客户 ID" width="130">
          <template #default="{ row }">
            <el-tooltip :content="`${row.id}（点击复制）`" placement="top">
              <button class="copy-id" type="button" @click.stop="copyId(row.id)">
                {{ shortId(row.id) }}
              </button>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click.stop="openDetail(row)"
              >查看档案</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="!error"
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        class="customer-pagination"
        @current-change="fetchList"
      />
    </section>

    <el-drawer
      v-model="detailDrawer"
      direction="rtl"
      size="min(680px, 96vw)"
      :with-header="false"
      class="customer-drawer"
    >
      <div v-if="detailLoading" class="drawer-loading">
        <el-skeleton :rows="8" animated />
      </div>
      <div v-else-if="current" class="customer-file">
        <header class="file-head">
          <div class="customer-avatar large">
            <img v-if="current.avatar" :src="current.avatar" alt="" />
            <span v-else>{{ initials(current.nickname) }}</span>
          </div>
          <div class="file-title">
            <p>客户交易档案</p>
            <h2>{{ current.nickname || "未设置昵称" }}</h2>
            <span>{{ current.phone || "未绑定手机号" }}</span>
          </div>
          <button
            type="button"
            class="drawer-close"
            aria-label="关闭客户档案"
            @click="detailDrawer = false"
          >
            ×
          </button>
        </header>

        <section class="value-hero">
          <div>
            <span>累计有效消费</span>
            <strong>{{ fmtMoney(current.totalSpent) }}</strong>
            <small>{{
              Number(current.orderCount || 0) >= 2
                ? "已有复购 · 关注下一次需求"
                : "首次成交 · 做好交付与回访"
            }}</small>
          </div>
          <span class="value-seal">{{ Number(current.orderCount || 0) >= 2 ? "复" : "新" }}</span>
        </section>

        <section class="file-kpis" aria-label="客户交易指标">
          <article>
            <strong>{{ current.orderCount || 0 }}</strong>
            <span>有效订单</span>
          </article>
          <article>
            <strong>{{ fmtMoney(current.averageOrderValue) }}</strong>
            <span>平均客单</span>
          </article>
          <article>
            <strong>{{ current.refundedOrderCount || 0 }}</strong>
            <span>退款订单</span>
          </article>
        </section>

        <section class="relationship-strip">
          <span class="pulse-dot" aria-hidden="true"></span>
          <div>
            <strong>交易关系</strong>
            <p>
              首次成交 {{ fmtDate(current.firstOrderAt) }} · 最近成交
              {{ fmtDate(current.lastOrderAt) }}
            </p>
          </div>
        </section>

        <section class="recent-orders">
          <div class="section-head">
            <div>
              <p class="eyebrow">RECENT ORDERS</p>
              <h3>最近订单</h3>
              <span>从交付、售后到复购，沿着真实订单继续处理</span>
            </div>
            <el-button text type="primary" @click="goCustomerOrders">查看全部</el-button>
          </div>

          <div v-if="current.recentOrders?.length" class="order-list">
            <button
              v-for="order in current.recentOrders"
              :key="order.id"
              type="button"
              class="recent-order"
              @click="goOrder(order.id)"
            >
              <div class="order-thumb">
                <img v-if="order.productImage" :src="order.productImage" alt="" />
                <span v-else>单</span>
              </div>
              <div class="order-copy">
                <strong>{{ order.productTitle || "订单商品" }}</strong>
                <span>{{ fmtTime(order.createdAt) }} · {{ statusLabel(order.status) }}</span>
              </div>
              <strong class="order-money">{{ fmtMoney(order.payAmount ?? order.amount) }}</strong>
              <span class="order-arrow">›</span>
            </button>
          </div>
          <el-empty v-else description="暂无可展示的最近订单" :image-size="72" />
        </section>

        <footer class="file-actions">
          <el-button @click="copyId(current.id)">复制客户 ID</el-button>
          <el-button type="primary" @click="goCustomerOrders">查看全部订单</el-button>
        </footer>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { merchantBackendApi } from "@/api";

interface OrderPreview {
  id: string;
  amount?: number | string;
  payAmount?: number | string | null;
  productTitle?: string;
  productImage?: string | null;
  status?: string;
  createdAt?: string;
}

interface CustomerRow {
  id: string;
  nickname?: string;
  avatar?: string | null;
  phone?: string;
  totalSpent?: number | string;
  orderCount?: number;
  lastOrderAt?: string;
  createdAt?: string;
}

interface CustomerDetail extends CustomerRow {
  averageOrderValue?: number | string;
  firstOrderAt?: string;
  refundedOrderCount?: number;
  recentOrders?: OrderPreview[];
}

const route = useRoute();
const router = useRouter();
const isVisualPreview = import.meta.env.DEV && route.meta?.devPreview === true;
const list = ref<CustomerRow[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const error = ref(false);
const search = ref("");
const detailDrawer = ref(false);
const detailLoading = ref(false);
const current = ref<CustomerDetail | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

const previewCustomers: CustomerRow[] = [
  {
    id: "customer-preview-1",
    nickname: "林间听雨",
    phone: "138****2096",
    totalSpent: 2868,
    orderCount: 4,
    lastOrderAt: "2026-07-27T09:20:00.000Z",
    createdAt: "2026-03-18T06:20:00.000Z",
  },
  {
    id: "customer-preview-2",
    nickname: "墨池",
    phone: "186****3721",
    totalSpent: 1298,
    orderCount: 2,
    lastOrderAt: "2026-07-22T13:45:00.000Z",
    createdAt: "2026-04-09T02:10:00.000Z",
  },
  {
    id: "customer-preview-3",
    nickname: "南山客",
    phone: "139****6628",
    totalSpent: 899.9,
    orderCount: 1,
    lastOrderAt: "2026-07-18T04:30:00.000Z",
    createdAt: "2026-07-18T04:28:00.000Z",
  },
  {
    id: "customer-preview-4",
    nickname: "半卷书",
    phone: "177****5180",
    totalSpent: 1568,
    orderCount: 3,
    lastOrderAt: "2026-07-12T11:12:00.000Z",
    createdAt: "2026-02-21T08:40:00.000Z",
  },
];

const previewOrders: OrderPreview[] = [
  {
    id: "order-preview-101",
    productTitle: "文房四宝精品套装 · 雅集礼盒",
    amount: 899,
    status: "COMPLETED",
    createdAt: "2026-07-27T09:20:00.000Z",
  },
  {
    id: "order-preview-102",
    productTitle: "国学经典诵读机 · 便携款",
    amount: 1299,
    status: "SHIPPED",
    createdAt: "2026-07-03T04:10:00.000Z",
  },
  {
    id: "order-preview-103",
    productTitle: "宣纸研习组合",
    amount: 670,
    status: "COMPLETED",
    createdAt: "2026-05-18T02:15:00.000Z",
  },
];

const displayList = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return list.value;
  return list.value.filter(
    (item) =>
      (item.nickname || "").toLowerCase().includes(keyword) || (item.phone || "").includes(keyword),
  );
});
const pageSpent = computed(() =>
  list.value.reduce((sum, item) => sum + Number(item.totalSpent || 0), 0),
);
const pageOrderCount = computed(() =>
  list.value.reduce((sum, item) => sum + Number(item.orderCount || 0), 0),
);
const pageAverageOrderValue = computed(() =>
  pageOrderCount.value > 0 ? pageSpent.value / pageOrderCount.value : 0,
);
const repeatCustomers = computed(
  () => list.value.filter((item) => Number(item.orderCount || 0) >= 2).length,
);

const STATUS: Record<string, string> = {
  PENDING: "待付款",
  PAID: "待发货",
  SHIPPED: "运输中",
  COMPLETED: "已完成",
  REFUNDED: "已退款",
  CANCELLED: "已取消",
};

onMounted(fetchList);

function initials(name?: string) {
  return (name || "客").slice(0, 1);
}

function shortId(id?: string) {
  return id ? `${id.slice(0, 8)}…` : "—";
}

function fmtMoney(value?: number | string | null) {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function statusLabel(status?: string) {
  return (status && STATUS[status]) || status || "—";
}

function unwrap<T>(response: unknown): T {
  const wrapped = response as { data?: T };
  return wrapped?.data ?? (response as T);
}

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    ElMessage.success("客户 ID 已复制");
  } catch {
    ElMessage.warning("复制失败，请手动选择复制");
  }
}

function onSearch() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    fetchList();
  }, 400);
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  if (isVisualPreview) {
    list.value = previewCustomers;
    total.value = previewCustomers.length;
    loading.value = false;
    return;
  }
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: 20 };
    if (search.value.trim()) params.keyword = search.value.trim();
    const response = await merchantBackendApi.listCustomers(params);
    const data = unwrap<{
      items?: CustomerRow[];
      list?: CustomerRow[];
      data?: CustomerRow[];
      total?: number;
    }>(response);
    list.value = data.items || data.list || data.data || [];
    total.value = data.total || 0;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function openDetail(row: CustomerRow) {
  detailDrawer.value = true;
  detailLoading.value = true;
  current.value = null;
  try {
    if (isVisualPreview) {
      current.value = {
        ...row,
        averageOrderValue: Number(row.totalSpent || 0) / Math.max(Number(row.orderCount || 0), 1),
        firstOrderAt: "2026-05-18T02:15:00.000Z",
        refundedOrderCount: 1,
        recentOrders: previewOrders,
      };
      return;
    }
    const response = await merchantBackendApi.getCustomerDetail(row.id);
    current.value = unwrap<CustomerDetail>(response);
  } catch {
    ElMessage.error("客户档案加载失败，请稍后重试");
    detailDrawer.value = false;
  } finally {
    detailLoading.value = false;
  }
}

function goCustomerOrders() {
  if (!current.value) return;
  router.push({
    path: isVisualPreview ? "/__qa/merchant-orders" : "/merchant-backend/orders",
    query: {
      customerId: current.value.id,
      customerName: current.value.nickname || "该客户",
    },
  });
}

function goOrder(orderId: string) {
  if (!current.value) return;
  router.push({
    path: isVisualPreview ? "/__qa/merchant-orders" : "/merchant-backend/orders",
    query: {
      orderId,
      customerId: current.value.id,
      customerName: current.value.nickname || "该客户",
    },
  });
}
</script>

<style scoped>
.customers-page {
  min-height: 100%;
  padding: 24px;
  color: #1f2d46;
  background:
    radial-gradient(circle at 92% 2%, rgba(37, 118, 113, 0.14), transparent 26rem),
    linear-gradient(180deg, #f6f8fa 0%, #f3f0eb 100%);
}
.customer-hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  overflow: hidden;
  padding: 30px 32px;
  border-radius: 24px;
  color: #fff;
  background:
    radial-gradient(circle at 85% 15%, rgba(79, 193, 176, 0.28), transparent 18rem),
    linear-gradient(125deg, #16263d 0%, #203c4c 50%, #126d68 100%);
  box-shadow: 0 18px 45px rgba(24, 49, 61, 0.18);
}
.customer-hero::after {
  position: absolute;
  right: -46px;
  bottom: -100px;
  width: 250px;
  height: 250px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  box-shadow:
    0 0 0 34px rgba(255, 255, 255, 0.05),
    0 0 0 68px rgba(255, 255, 255, 0.03);
  content: "";
}
.hero-copy,
.hero-actions {
  position: relative;
  z-index: 1;
}
.hero-copy {
  max-width: 780px;
}
.eyebrow {
  margin: 0 0 7px;
  color: #b69155;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
}
.customer-hero .eyebrow {
  color: #a9ddd4;
}
.hero-copy h1 {
  margin: 0;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: clamp(25px, 3vw, 38px);
  line-height: 1.3;
}
.hero-copy > p:last-child {
  max-width: 700px;
  margin: 12px 0 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.7;
}
.hero-actions {
  display: flex;
  gap: 10px;
}
.hero-actions :deep(.el-button) {
  border-color: rgba(255, 255, 255, 0.46);
}
.relation-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 18px 0;
}
.metric-card {
  position: relative;
  overflow: hidden;
  min-height: 126px;
  padding: 20px;
  border: 1px solid rgba(31, 45, 70, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 24px rgba(31, 45, 70, 0.06);
}
.metric-card::after {
  position: absolute;
  right: -12px;
  bottom: -34px;
  width: 92px;
  height: 92px;
  border: 1px solid currentColor;
  border-radius: 50%;
  opacity: 0.12;
  content: "";
}
.metric-card span {
  color: #657188;
  font-size: 13px;
}
.metric-card strong {
  display: block;
  margin: 10px 0 5px;
  color: #1c2c43;
  font-family: "Noto Serif SC", serif;
  font-size: 26px;
}
.metric-card small {
  color: #929aab;
}
.tone-gold {
  color: #b69155;
}
.tone-ink {
  color: #304a6c;
}
.tone-jade {
  color: #168b7f;
}
.tone-paper {
  color: #8a6b4c;
}
.customer-workspace {
  padding: 22px;
  border: 1px solid rgba(31, 45, 70, 0.07);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 34px rgba(31, 45, 70, 0.07);
}
.workspace-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}
.workspace-head h2 {
  margin: 0;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: 24px;
}
.customer-search {
  width: min(340px, 100%);
}
.customer-table :deep(.customer-table-row) {
  cursor: pointer;
}
.customer-table :deep(.customer-table-row:hover > td) {
  background: #f1f7f5 !important;
}
.customer-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.customer-avatar {
  display: grid;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  overflow: hidden;
  place-items: center;
  border-radius: 14px;
  color: #fff;
  background: linear-gradient(145deg, #ad315f, #1e7c75);
  box-shadow: 0 8px 16px rgba(45, 82, 90, 0.18);
}
.customer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.customer-avatar span {
  font-family: "Noto Serif SC", serif;
  font-size: 20px;
  font-weight: 800;
}
.customer-cell > div:last-child {
  min-width: 0;
}
.customer-cell strong,
.customer-cell span {
  display: block;
}
.customer-cell strong {
  color: #1e2c40;
  font-size: 15px;
}
.customer-cell span {
  margin-top: 4px;
  color: #8e96a6;
  font-size: 12px;
}
.money {
  color: #b02454;
}
.order-count {
  padding: 5px 9px;
  border-radius: 999px;
  color: #526176;
  background: #f0f3f7;
}
.relation-tag {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  color: #9d6d24;
  background: #faf1df;
}
.relation-tag.repeat {
  color: #0b786e;
  background: #def3ef;
}
.copy-id {
  border: 0;
  color: #7b879a;
  background: none;
  cursor: pointer;
  font-family: monospace;
}
.customer-pagination {
  margin-top: 18px;
  justify-content: flex-end;
}
.drawer-loading {
  padding: 34px;
}
.customer-file {
  min-height: 100%;
  padding: 26px 28px 94px;
  color: #1d2b3f;
  background: #faf8f4;
}
.file-head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.customer-avatar.large {
  flex-basis: 56px;
  width: 56px;
  height: 56px;
  border-radius: 17px;
}
.file-title {
  min-width: 0;
}
.file-title p,
.file-title h2,
.file-title span {
  margin: 0;
}
.file-title p {
  color: #b69155;
  font-size: 12px;
  letter-spacing: 0.08em;
}
.file-title h2 {
  margin: 3px 0;
  font-family: "Noto Serif SC", serif;
  font-size: 23px;
}
.file-title span {
  color: #9098a6;
  font-size: 13px;
}
.drawer-close {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  margin-left: auto;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: #6e756f;
  background: #eee8de;
  cursor: pointer;
  font-size: 20px;
}
.value-hero {
  position: relative;
  display: flex;
  justify-content: space-between;
  overflow: hidden;
  margin-top: 22px;
  padding: 28px;
  border-radius: 22px;
  color: #fff;
  background: linear-gradient(120deg, #17273f 0%, #1d3f4b 56%, #15776f 100%);
  box-shadow: 0 16px 30px rgba(24, 55, 67, 0.18);
}
.value-hero::after {
  position: absolute;
  right: -30px;
  bottom: -70px;
  width: 180px;
  height: 180px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  box-shadow:
    0 0 0 28px rgba(255, 255, 255, 0.05),
    0 0 0 56px rgba(255, 255, 255, 0.03);
  content: "";
}
.value-hero > div,
.value-seal {
  position: relative;
  z-index: 1;
}
.value-hero span,
.value-hero small {
  display: block;
  color: rgba(255, 255, 255, 0.72);
}
.value-hero strong {
  display: block;
  margin: 8px 0 10px;
  font-family: "Noto Serif SC", serif;
  font-size: 36px;
}
.value-seal {
  align-self: center;
  display: grid !important;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 1px solid rgba(218, 183, 111, 0.7);
  border-radius: 50%;
  color: #e5c47e !important;
  font-family: "Noto Serif SC", serif;
  font-size: 23px;
}
.file-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 12px;
}
.file-kpis article {
  padding: 15px 10px;
  border: 1px solid #ece5da;
  border-radius: 15px;
  text-align: center;
  background: #fff;
}
.file-kpis strong,
.file-kpis span {
  display: block;
}
.file-kpis strong {
  font-size: 18px;
}
.file-kpis span {
  margin-top: 5px;
  color: #8c94a2;
  font-size: 12px;
}
.relationship-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 15px 17px;
  border-radius: 14px;
  background: #eee8de;
}
.relationship-strip strong,
.relationship-strip p {
  margin: 0;
}
.relationship-strip p {
  margin-top: 3px;
  color: #7f817f;
  font-size: 12px;
}
.pulse-dot {
  width: 9px;
  height: 9px;
  border: 3px solid #c7ebe4;
  border-radius: 50%;
  background: #1aa89a;
  box-shadow: 0 0 0 0 rgba(26, 168, 154, 0.3);
  animation: relation-pulse 2.2s infinite;
}
@keyframes relation-pulse {
  70% {
    box-shadow: 0 0 0 9px rgba(26, 168, 154, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(26, 168, 154, 0);
  }
}
.recent-orders {
  margin-top: 24px;
}
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.section-head h3 {
  margin: 0;
  font-family: "Noto Serif SC", serif;
  font-size: 21px;
}
.section-head > div > span {
  display: block;
  margin-top: 5px;
  color: #9098a6;
  font-size: 12px;
}
.order-list {
  overflow: hidden;
  margin-top: 14px;
  border: 1px solid #e8e1d6;
  border-radius: 17px;
  background: #fff;
}
.recent-order {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto 18px;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px;
  border: 0;
  border-bottom: 1px solid #eee9e1;
  color: inherit;
  text-align: left;
  background: transparent;
  cursor: pointer;
}
.recent-order:last-child {
  border-bottom: 0;
}
.recent-order:hover {
  background: #f4f9f7;
}
.order-thumb {
  display: grid;
  width: 46px;
  height: 46px;
  overflow: hidden;
  place-items: center;
  border-radius: 12px;
  color: #a37b40;
  background: #f3ecdf;
}
.order-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.order-copy {
  min-width: 0;
}
.order-copy strong,
.order-copy span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-copy span {
  margin-top: 5px;
  color: #929aa8;
  font-size: 12px;
}
.order-money {
  color: #b02454;
}
.order-arrow {
  color: #b1b5bc;
  font-size: 20px;
}
.file-actions {
  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 10px;
  width: min(680px, 96vw);
  box-sizing: border-box;
  padding: 14px 28px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid #e9e2d7;
  background: rgba(250, 248, 244, 0.94);
  backdrop-filter: blur(14px);
}
.file-actions :deep(.el-button) {
  height: 42px;
  margin: 0;
  border-radius: 12px;
}
@media (max-width: 980px) {
  .relation-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .customer-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 640px) {
  .customers-page {
    padding: 14px;
  }
  .customer-hero {
    padding: 24px 20px;
    border-radius: 19px;
  }
  .hero-actions,
  .hero-actions :deep(.el-button) {
    width: 100%;
  }
  .relation-metrics {
    grid-template-columns: 1fr;
  }
  .workspace-head {
    align-items: stretch;
    flex-direction: column;
  }
  .customer-search {
    width: 100%;
  }
  .customer-workspace {
    padding: 16px;
  }
  .customer-file {
    padding: 20px 18px 92px;
  }
  .file-actions {
    padding-right: 18px;
    padding-left: 18px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pulse-dot {
    animation: none;
  }
}
</style>
