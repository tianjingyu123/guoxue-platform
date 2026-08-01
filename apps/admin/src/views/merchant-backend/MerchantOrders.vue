<template>
  <div class="orders-page">
    <section class="order-hero">
      <div class="hero-copy">
        <p class="eyebrow">订单中枢 · ORDER CONTROL</p>
        <h1>从下单到签收，每一步都有下一步</h1>
        <p>
          付款、备货、发货、签收与售后保持在同一条经营主线上，异常订单优先暴露，减少跨页面寻找。
        </p>
      </div>
      <div class="hero-actions">
        <el-button plain @click="goShipping">发货履约</el-button>
        <el-button plain @click="goAfterSales">售后质检</el-button>
        <el-button type="primary" :loading="loading" @click="fetchList">刷新数据</el-button>
      </div>
    </section>

    <section v-if="customerId || focusOrderId" class="customer-scope" aria-label="当前订单筛选">
      <div class="scope-avatar">{{ (customerName || "客").slice(0, 1) }}</div>
      <div>
        <p class="eyebrow">CUSTOMER ORDER TRAIL</p>
        <strong>
          {{
            focusOrderId
              ? `正在查看 ${customerName || "该客户"} 的指定订单`
              : `正在查看 ${customerName || "该客户"} 的全部订单`
          }}
        </strong>
        <span>订单处理仍沿用同一套发货、物流与售后规则，可随时返回完整队列。</span>
      </div>
      <el-button text type="primary" @click="clearCustomerScope">返回全部客户订单</el-button>
    </section>

    <section class="order-metrics" aria-label="订单状态总览">
      <button
        v-for="item in orderMetrics"
        :key="item.key"
        type="button"
        class="metric-card"
        :class="[`tone-${item.tone}`, { active: filterStatus === item.filter && item.filter }]"
        @click="applyStatusFilter(item.filter)"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.hint }}</small>
      </button>
    </section>

    <section class="order-route">
      <div class="route-intro">
        <p class="eyebrow">ORDER ROUTE</p>
        <h2>一张订单，四段旅程</h2>
        <span>让商家知道当前要做什么，也知道完成后流向哪里。</span>
      </div>
      <div v-for="(step, index) in orderRoute" :key="step.title" class="route-step">
        <span class="step-index">0{{ index + 1 }}</span>
        <strong>{{ step.title }}</strong>
        <small>{{ step.desc }}</small>
        <span v-if="index < orderRoute.length - 1" class="step-arrow">›</span>
      </div>
    </section>

    <section class="order-workspace">
      <div class="page-header">
        <div>
          <p class="eyebrow">ORDER QUEUE</p>
          <h2>{{ customerId ? `${customerName || "该客户"}的订单` : "订单处理队列" }}</h2>
        </div>
        <div class="header-right">
          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width: 140px"
            @change="onFilterChange"
          >
            <!-- 状态枚举与后端 OrderStatus 一致：PENDING/PAID/SHIPPED/COMPLETED/REFUNDED/CANCELLED -->
            <el-option label="待付款" value="PENDING" />
            <el-option label="已付款" value="PAID" />
            <el-option label="已发货" value="SHIPPED" />
            <el-option label="已完成" value="COMPLETED" />
            <el-option label="已退款" value="REFUNDED" />
            <el-option label="已取消" value="CANCELLED" />
          </el-select>
          <el-button @click="fetchList"> 刷新 </el-button>
        </div>
      </div>

      <div class="status-tabs" role="tablist" aria-label="订单状态筛选">
        <button
          v-for="tab in statusTabs"
          :key="tab.value || 'all'"
          type="button"
          :class="{ active: filterStatus === tab.value }"
          @click="applyStatusFilter(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <el-result
        v-if="error"
        icon="error"
        title="加载失败"
        sub-title="订单数据加载失败，请稍后重试"
      >
        <template #extra>
          <el-button type="primary" @click="fetchList"> 重试 </el-button>
        </template>
      </el-result>

      <el-table v-else v-loading="loading" :data="list" stripe>
        <template #empty>
          <el-empty description="暂无订单，买家下单后会出现在这里" />
        </template>
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="order-detail">
              <el-descriptions :column="3" border size="small">
                <el-descriptions-item label="订单号">
                  {{ row.orderNo || row.id }}
                </el-descriptions-item>
                <el-descriptions-item label="商品">
                  {{ row.productTitle || "—" }}
                </el-descriptions-item>
                <el-descriptions-item label="数量">
                  {{ row.quantity ?? 1 }}
                </el-descriptions-item>
                <el-descriptions-item label="订单金额">
                  {{ fmtMoney(row.payAmount ?? row.amount) }}
                </el-descriptions-item>
                <el-descriptions-item label="买家">
                  {{ row.buyerNickname || "—" }}
                </el-descriptions-item>
                <el-descriptions-item label="买家手机号">
                  {{ row.buyerPhone || "—" }}
                </el-descriptions-item>
                <el-descriptions-item label="收件人">
                  {{ row.shippingInfo?.name || "—" }}
                </el-descriptions-item>
                <el-descriptions-item label="收件电话">
                  {{ row.shippingInfo?.phone || "—" }}
                </el-descriptions-item>
                <el-descriptions-item label="收货地址">
                  {{ shippingAddress(row) }}
                </el-descriptions-item>
                <el-descriptions-item label="下单时间">
                  {{ fmtTime(row.createdAt) }}
                </el-descriptions-item>
                <el-descriptions-item label="支付时间">
                  {{ fmtTime(row.paidAt) }}
                </el-descriptions-item>
                <el-descriptions-item label="发货时间">
                  {{ fmtTime(row.shippedAt) }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="订单号" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.orderNo || row.id }}
          </template>
        </el-table-column>
        <el-table-column label="商品" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.productTitle || "—" }}
          </template>
        </el-table-column>
        <el-table-column label="金额" width="110" align="right">
          <template #default="{ row }">
            {{ fmtMoney(row.payAmount ?? row.amount) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="买家" width="130" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.buyerNickname || "—" }}
            <span v-if="row.buyerPhone" class="buyer-phone">{{ row.buyerPhone }}</span>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="150">
          <template #default="{ row }">
            {{ fmtTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'PAID'"
              size="small"
              text
              type="primary"
              @click="openShip(row)"
            >
              发货
            </el-button>
            <span v-else class="no-action">—</span>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!error" class="list-tip">
        买家发起的退款/退货申请，请到「售后管理」页处理（同意/拒绝在该页闭环）。
      </div>

      <el-pagination
        v-if="!error"
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 12px; justify-content: flex-end"
        @current-change="fetchList"
        @size-change="onFilterChange"
      />
    </section>

    <!-- 发货 -->
    <el-dialog v-model="shipDialog" title="发货" width="450px">
      <el-form label-width="80px">
        <el-form-item label="物流公司" required>
          <el-select v-model="shipForm.company" placeholder="选择物流公司" style="width: 100%">
            <el-option v-for="c in couriers" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="快递单号" required>
          <el-input v-model="shipForm.trackingNo" placeholder="请输入快递单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialog = false"> 取消 </el-button>
        <el-button type="primary" :loading="saving" @click="doShip"> 确认发货 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { merchantBackendApi } from "@/api";

/** 收货地址快照（Order.shippingInfo·下单时落库） */
interface ShippingInfo {
  name?: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
}
/**
 * 订单行——与后端 enrichOrders 真实返回对齐：
 * 原始 Order 字段（amount/payAmount/quantity/status/createdAt/paidAt/shippedAt/shippingInfo…）
 * + 补全字段 productTitle/productImage/buyerNickname/buyerPhone；
 * orderNo 为新契约透传字段（后端补齐中·缺省回退订单 id）。
 */
interface OrderRow {
  id: string;
  customerId?: string;
  orderNo?: string;
  amount?: number | string;
  payAmount?: number | string | null;
  quantity?: number;
  productTitle?: string;
  buyerNickname?: string;
  buyerPhone?: string | null;
  shippingInfo?: ShippingInfo | null;
  status?: string;
  createdAt?: string;
  paidAt?: string | null;
  shippedAt?: string | null;
}

const list = ref<OrderRow[]>([]);
const overviewList = ref<OrderRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref(false);
const saving = ref(false);
const filterStatus = ref("");
const route = useRoute();
const router = useRouter();
const customerId = ref(typeof route.query.customerId === "string" ? route.query.customerId : "");
const customerName = ref(
  typeof route.query.customerName === "string" ? route.query.customerName : "",
);
const focusOrderId = ref(typeof route.query.orderId === "string" ? route.query.orderId : "");
const isVisualPreview = import.meta.env.DEV && route.meta?.devPreview === true;

const previewOrders: OrderRow[] = [
  {
    id: "order-preview-101",
    customerId: "customer-preview-1",
    orderNo: "GX202607290101",
    productTitle: "文房四宝精品套装 · 雅集礼盒",
    buyerNickname: "林间听雨",
    buyerPhone: "138****2096",
    amount: 899,
    payAmount: 899,
    quantity: 1,
    status: "COMPLETED",
    shippingInfo: {
      name: "林女士",
      phone: "138****2096",
      province: "浙江省",
      city: "杭州市",
      district: "临安区",
      detail: "锦城街道文教路 18 号",
    },
    createdAt: "2026-07-27T09:20:00.000Z",
    paidAt: "2026-07-27T09:22:00.000Z",
    shippedAt: "2026-07-27T13:40:00.000Z",
  },
  {
    id: "order-preview-102",
    customerId: "customer-preview-1",
    orderNo: "GX202607290102",
    productTitle: "国学经典诵读机 · 便携款",
    buyerNickname: "林间听雨",
    buyerPhone: "138****2096",
    amount: 1299,
    payAmount: 1299,
    quantity: 1,
    status: "SHIPPED",
    shippingInfo: {
      name: "林女士",
      phone: "138****2096",
      province: "浙江省",
      city: "杭州市",
      district: "临安区",
      detail: "锦城街道文教路 18 号",
    },
    createdAt: "2026-07-03T04:10:00.000Z",
    paidAt: "2026-07-03T04:12:00.000Z",
    shippedAt: "2026-07-03T10:30:00.000Z",
  },
  {
    id: "order-preview-103",
    customerId: "customer-preview-1",
    orderNo: "GX202607280128",
    productTitle: "宣纸研习组合",
    buyerNickname: "林间听雨",
    buyerPhone: "138****2096",
    amount: 670,
    payAmount: 670,
    quantity: 1,
    status: "COMPLETED",
    shippingInfo: {
      name: "林女士",
      phone: "138****2096",
      province: "浙江省",
      city: "杭州市",
      district: "临安区",
      detail: "锦城街道文教路 18 号",
    },
    createdAt: "2026-05-18T02:15:00.000Z",
    paidAt: "2026-05-18T02:17:00.000Z",
    shippedAt: "2026-05-18T08:30:00.000Z",
  },
  {
    id: "order-preview-104",
    customerId: "customer-preview-2",
    orderNo: "GX202607270119",
    productTitle: "宣纸体验装 · 四尺生宣",
    buyerNickname: "砚边人",
    amount: 129,
    payAmount: 129,
    quantity: 2,
    status: "COMPLETED",
    shippingInfo: {
      name: "许先生",
      province: "北京市",
      city: "北京市",
      district: "海淀区",
      detail: "学院路 9 号",
    },
    createdAt: "2026-07-27T03:18:00.000Z",
    paidAt: "2026-07-27T03:19:00.000Z",
    shippedAt: "2026-07-27T08:40:00.000Z",
  },
  {
    id: "order-preview-105",
    customerId: "customer-preview-3",
    orderNo: "GX202607260088",
    productTitle: "国风书签礼盒",
    buyerNickname: "南山客",
    amount: 69,
    payAmount: 69,
    quantity: 1,
    status: "REFUNDED",
    createdAt: "2026-07-26T11:08:00.000Z",
    paidAt: "2026-07-26T11:10:00.000Z",
  },
];

const statusTabs = [
  { label: "全部订单", value: "" },
  { label: "待付款", value: "PENDING" },
  { label: "待发货", value: "PAID" },
  { label: "运输中", value: "SHIPPED" },
  { label: "已完成", value: "COMPLETED" },
  { label: "退款/关闭", value: "REFUNDED" },
];

const orderRoute = [
  { title: "获客下单", desc: "确认商品、优惠与收货信息" },
  { title: "支付锁单", desc: "锁定库存并进入待发货" },
  { title: "出库履约", desc: "核址、打包、交接承运商" },
  { title: "签收维护", desc: "评价、复购与售后承接" },
];

const orderCounts = computed(() => ({
  all: overviewList.value.length,
  pending: overviewList.value.filter((item) => item.status === "PENDING").length,
  paid: overviewList.value.filter((item) => item.status === "PAID").length,
  shipped: overviewList.value.filter((item) => item.status === "SHIPPED").length,
  completed: overviewList.value.filter((item) => item.status === "COMPLETED").length,
}));
const overviewAmount = computed(() =>
  overviewList.value.reduce((sum, item) => sum + Number(item.payAmount ?? item.amount ?? 0), 0),
);
const orderMetrics = computed(() => [
  {
    key: "pending",
    label: "待付款",
    value: orderCounts.value.pending,
    hint: "关注超时关闭与支付转化",
    filter: "PENDING",
    tone: "pending",
  },
  {
    key: "paid",
    label: "待发货",
    value: orderCounts.value.paid,
    hint: "进入仓库核址与打包",
    filter: "PAID",
    tone: "urgent",
  },
  {
    key: "shipped",
    label: "运输中",
    value: orderCounts.value.shipped,
    hint: "关注异常轨迹与签收",
    filter: "SHIPPED",
    tone: "moving",
  },
  {
    key: "amount",
    label: "本页订单额",
    value: fmtMoney(overviewAmount.value),
    hint: `${orderCounts.value.all} 笔订单在概览`,
    filter: "",
    tone: "amount",
  },
]);

const couriers = [
  "顺丰速运",
  "中通快递",
  "圆通速递",
  "申通快递",
  "韵达快递",
  "EMS",
  "京东物流",
  "极兔速递",
  "德邦快递",
];

const shipDialog = ref(false);
const shipOrderId = ref("");
const shipForm = reactive({ company: "", trackingNo: "" });

/** 与 prisma OrderStatus 枚举一一对应 */
const STATUS = {
  PENDING: ["待付款", "info"],
  PAID: ["已付款", "warning"],
  SHIPPED: ["已发货", "primary"],
  COMPLETED: ["已完成", "success"],
  REFUNDED: ["已退款", "danger"],
  CANCELLED: ["已取消", "info"],
} as Record<string, [string, string]>;

function statusLabel(s?: string) {
  return (s && STATUS[s]?.[0]) || s || "—";
}
function statusType(s?: string) {
  return (s && STATUS[s]?.[1]) || "info";
}

/** 金额：千分位两位小数，空值显示 — */
function fmtMoney(v?: number | string | null): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 时间：YYYY-MM-DD HH:mm，空值显示 — */
function fmtTime(d?: string | null): string {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
}

function shippingAddress(row: OrderRow): string {
  const s = row.shippingInfo;
  if (!s) return "—";
  const addr = [s.province, s.city, s.district, s.detail].filter(Boolean).join(" ");
  return addr || "—";
}

onMounted(() => {
  if (isVisualPreview) ElMessage.closeAll();
  fetchList();
});

function goShipping() {
  router.push("/merchant-backend/shipping");
}

function goAfterSales() {
  router.push("/merchant-backend/after-sales");
}

function clearCustomerScope() {
  customerId.value = "";
  customerName.value = "";
  focusOrderId.value = "";
  router.replace({ path: isVisualPreview ? "/__qa/merchant-orders" : "/merchant-backend/orders" });
  page.value = 1;
  fetchList();
}

function applyStatusFilter(value: string) {
  filterStatus.value = value;
  onFilterChange();
}

function onFilterChange() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  if (isVisualPreview) {
    const customerRows = customerId.value
      ? previewOrders.filter((item) => item.customerId === customerId.value)
      : previewOrders;
    const focusedRows = focusOrderId.value
      ? customerRows.filter((item) => item.id === focusOrderId.value)
      : customerRows;
    overviewList.value = focusedRows;
    const rows = filterStatus.value
      ? focusedRows.filter((item) => item.status === filterStatus.value)
      : focusedRows;
    list.value = rows;
    total.value = rows.length;
    loading.value = false;
    return;
  }
  try {
    if (focusOrderId.value) {
      const response = await merchantBackendApi.getOrder(focusOrderId.value);
      const row = ((response as { data?: OrderRow }).data ?? response) as OrderRow;
      list.value = row?.id ? [row] : [];
      overviewList.value = list.value;
      total.value = list.value.length;
      return;
    }
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value };
    if (filterStatus.value) params.status = filterStatus.value;
    if (customerId.value) params.customerId = customerId.value;
    const res = await merchantBackendApi.listOrders(params);
    // 兼容两种响应包装：{ data: {...} } 或直接返回 data
    const data =
      (
        res as {
          data?: { items?: OrderRow[]; list?: OrderRow[]; data?: OrderRow[]; total?: number };
        }
      ).data ??
      (res as { items?: OrderRow[]; list?: OrderRow[]; data?: OrderRow[]; total?: number });
    list.value = data.items || data.list || data.data || [];
    if (!filterStatus.value) overviewList.value = list.value;
    total.value = data.total || 0;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function openShip(row: OrderRow) {
  shipOrderId.value = row.id;
  shipForm.company = "";
  shipForm.trackingNo = "";
  shipDialog.value = true;
}

async function doShip() {
  if (!shipForm.company || !shipForm.trackingNo) {
    ElMessage.warning("请填写物流信息");
    return;
  }
  saving.value = true;
  try {
    await merchantBackendApi.shipOrder(shipOrderId.value, {
      company: shipForm.company,
      trackingNo: shipForm.trackingNo,
    });
    ElMessage.success("发货成功");
    shipDialog.value = false;
    fetchList();
  } catch {
    /* 请求错误已由拦截器提示 */
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.orders-page {
  min-height: 100%;
  padding: 24px;
  color: #1f2d46;
  background:
    radial-gradient(circle at 88% 3%, rgba(70, 107, 179, 0.13), transparent 24rem),
    linear-gradient(180deg, #f6f8fc 0%, #f2f0ec 100%);
}
.order-hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  overflow: hidden;
  padding: 30px 34px;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 24px;
  background:
    radial-gradient(circle at 90% 10%, rgba(217, 183, 112, 0.36), transparent 24%),
    linear-gradient(120deg, #172b50 0%, #294c7b 57%, #927144 120%);
  box-shadow: 0 18px 44px rgba(25, 45, 77, 0.18);
}
.order-hero::after {
  position: absolute;
  right: -54px;
  bottom: -104px;
  width: 300px;
  height: 300px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  content: "";
}
.hero-copy {
  position: relative;
  z-index: 1;
  max-width: 720px;
}
.eyebrow {
  margin: 0 0 8px;
  color: #b99454;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.order-hero .eyebrow {
  color: #ead6a9;
}
.hero-copy h1 {
  margin: 0 0 10px;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: clamp(24px, 2.4vw, 36px);
  line-height: 1.25;
}
.hero-copy > p:last-child {
  max-width: 720px;
  margin: 0;
  color: rgba(255, 255, 255, 0.76);
  line-height: 1.7;
}
.hero-actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}
.hero-actions :deep(.el-button) {
  margin: 0;
  color: #fff;
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}
.hero-actions :deep(.el-button--primary) {
  border-color: #d7b270;
  background: #c59a52;
}
.customer-scope {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding: 15px 18px;
  border: 1px solid rgba(18, 123, 113, 0.18);
  border-radius: 17px;
  background: linear-gradient(90deg, rgba(222, 243, 239, 0.94), rgba(255, 255, 255, 0.9));
  box-shadow: 0 10px 26px rgba(25, 89, 84, 0.07);
}
.scope-avatar {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 15px;
  color: #fff;
  font-family: "Noto Serif SC", serif;
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(145deg, #ad315f, #1e7c75);
}
.customer-scope p {
  margin-bottom: 3px;
  color: #17897d;
}
.customer-scope strong,
.customer-scope span {
  display: block;
}
.customer-scope strong {
  color: #1d3346;
}
.customer-scope span {
  margin-top: 3px;
  color: #73808d;
  font-size: 12px;
}
.order-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}
.metric-card {
  position: relative;
  min-height: 116px;
  overflow: hidden;
  padding: 20px;
  text-align: left;
  color: #1f2d46;
  border: 1px solid rgba(36, 69, 113, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 28px rgba(34, 54, 83, 0.07);
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}
.metric-card::after {
  position: absolute;
  top: -34px;
  right: -26px;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background: rgba(55, 94, 153, 0.1);
  content: "";
}
.metric-card:hover,
.metric-card.active {
  transform: translateY(-2px);
  border-color: rgba(68, 102, 157, 0.35);
  box-shadow: 0 14px 32px rgba(34, 54, 83, 0.12);
}
.metric-card span,
.metric-card small {
  position: relative;
  z-index: 1;
  display: block;
}
.metric-card span {
  color: #66738a;
  font-size: 13px;
}
.metric-card strong {
  position: relative;
  z-index: 1;
  display: block;
  margin: 7px 0 5px;
  color: #203a64;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: 28px;
}
.metric-card small {
  color: #9099a9;
}
.metric-card.tone-urgent::after {
  background: rgba(198, 74, 70, 0.13);
}
.metric-card.tone-moving::after {
  background: rgba(43, 132, 141, 0.12);
}
.metric-card.tone-amount {
  border-color: rgba(181, 141, 73, 0.35);
}
.metric-card.tone-amount strong {
  color: #9a6e2d;
}
.order-route {
  display: grid;
  grid-template-columns: 1.45fr repeat(4, minmax(0, 1fr));
  align-items: stretch;
  margin-top: 18px;
  padding: 20px 24px;
  border: 1px solid rgba(36, 69, 113, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 28px rgba(34, 54, 83, 0.06);
}
.route-intro {
  padding-right: 26px;
}
.route-intro h2,
.page-header h2 {
  margin: 0;
  font-family: "Noto Serif SC", "Songti SC", serif;
}
.route-intro > span {
  display: block;
  margin-top: 7px;
  color: #7e8796;
  line-height: 1.55;
}
.route-step {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 72px;
  padding: 0 20px;
  border-left: 1px solid #e7e9ee;
}
.step-index {
  color: #b99454;
  font-size: 11px;
  font-weight: 800;
}
.route-step strong {
  margin: 5px 0;
  font-size: 15px;
}
.route-step small {
  color: #8d96a6;
  line-height: 1.45;
}
.step-arrow {
  position: absolute;
  top: 50%;
  right: -4px;
  color: #c2c8d1;
  transform: translateY(-50%);
}
.order-workspace {
  margin-top: 18px;
  padding: 22px 24px 24px;
  border: 1px solid rgba(36, 69, 113, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.93);
  box-shadow: 0 14px 34px rgba(34, 54, 83, 0.07);
}
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 12px;
}
.header-right {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.header-right :deep(.el-button) {
  margin: 0;
}
.status-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 14px;
  padding: 4px;
  border-radius: 12px;
  background: #eef1f6;
}
.status-tabs button {
  padding: 8px 16px;
  color: #687589;
  border: 0;
  border-radius: 9px;
  background: transparent;
  cursor: pointer;
}
.status-tabs button.active {
  color: #fff;
  background: #244975;
  box-shadow: 0 5px 14px rgba(36, 73, 117, 0.2);
}
.order-workspace :deep(.el-table) {
  overflow: hidden;
  border: 1px solid #edf0f4;
  border-radius: 14px;
}
.order-workspace :deep(.el-table th.el-table__cell) {
  color: #536075;
  background: #f7f6f2;
}
.order-detail {
  padding: 12px 20px;
}
.buyer-phone {
  color: var(--color-text-secondary, #999);
  font-size: 12px;
  margin-left: 4px;
}
.list-tip {
  margin-top: 12px;
  padding: 10px 12px;
  color: #6d798b;
  font-size: 12px;
  border-radius: 10px;
  background: #f4f6f9;
}
.no-action {
  color: var(--color-text-placeholder, #bbb);
}
@media (max-width: 1180px) {
  .order-route {
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .route-intro {
    grid-column: 1 / -1;
    padding-right: 0;
  }
  .route-step {
    border-left: 0;
    border-top: 1px solid #e7e9ee;
  }
  .step-arrow {
    display: none;
  }
}
@media (max-width: 820px) {
  .orders-page {
    padding: 14px;
  }
  .order-hero {
    align-items: flex-start;
    padding: 24px;
    flex-direction: column;
  }
  .hero-actions {
    justify-content: flex-start;
  }
  .customer-scope {
    grid-template-columns: 44px minmax(0, 1fr);
  }
  .customer-scope :deep(.el-button) {
    grid-column: 1 / -1;
    justify-self: flex-start;
  }
  .order-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .order-route {
    grid-template-columns: 1fr;
  }
  .route-intro {
    grid-column: auto;
  }
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .order-workspace {
    padding: 18px 14px;
  }
}
@media (max-width: 520px) {
  .order-metrics {
    grid-template-columns: 1fr;
  }
  .header-right {
    width: 100%;
  }
  .header-right :deep(.el-select) {
    width: 100% !important;
  }
}
</style>
