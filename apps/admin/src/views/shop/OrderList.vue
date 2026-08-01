<script setup lang="ts">
import { ref, onMounted, reactive, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { orderApi, api } from "@/api";
import { exportCSV } from "@/utils/export";
import DataTable from "@/components/DataTable.vue";
import PageHeader from "@/components/PageHeader.vue";

/** 订单商品明细行（字段宽松 optional） */
interface OrderItemRow { name?: string; price?: number | string; quantity?: number; specs?: string }
/** 订单收货地址（归一化后） */
interface OrderAddress {
  contactName?: string; contactPhone?: string;
  province?: string; city?: string; district?: string; address?: string; zipCode?: string;
}
/** 订单行（字段宽松 optional，仅覆盖模板/脚本实际访问字段） */
interface OrderRow {
  id?: string;
  user?: { nickname?: string };
  type?: string;
  targetId?: string;
  amount?: number | string;
  coinAmount?: number;
  quantity?: number;
  status?: string;
  createdAt?: string;
  paidAt?: string;
  /** 下单时收货地址快照（后端 Order.shippingInfo Json：{name,phone,province,city,district,detail}） */
  shippingInfo?: string | Record<string, unknown> | null;
  /** enrichOrders 补全的商品/SKU（列表与详情端点均带） */
  product?: { title?: string; price?: number | string } | null;
  sku?: { name?: string; price?: number | string; specs?: Record<string, string> } | null;
  address?: OrderAddress;
  items?: OrderItemRow[];
  /** 白标贺卡任务（供-P2）：归因订单自动生成，存在即可打印 A6 贺卡 */
  giftCardMeta?: { fromName?: string; blessing?: string; qrRef?: string } | null;
}

const orders = ref<OrderRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref(false);
const acting = ref(false);
const savingLogistics = ref(false);

// ── 筛选（后端 shop-order.service listOrders 全支持：orderNo/type/status/startDate/endDate） ──
const filterStatus = ref("");
const filterType = ref("");
const filterOrderNo = ref("");
const filterDateRange = ref<string[]>([]);

// 物流弹窗
const logisticsVisible = ref(false);
const logisticsOrderId = ref("");
const logisticsForm = reactive({
  company: "", logisticsNo: "", contactName: "", contactPhone: "",
  province: "", city: "", district: "", address: "", zipCode: "", remark: "",
});

// ── 详情弹窗（先探新管理端详情端点，404 逐级降级，绝不假成功） ──
const detailVisible = ref(false);
const detailLoading = ref(false);
/** 详情数据来源：admin=新管理端详情端点 / detail=现有 /shop/orders/:id / row=仅列表行快照 */
const detailSource = ref<"admin" | "detail" | "row">("row");
// 详情对象在弹窗模板内多处裸访问字段，收敛为 OrderRow 会引发多处 possibly-undefined/索引报错，故保留 any。
const detailRow = ref<any>(null);

const statusLabels: Record<string, string> = {
  PENDING: "待支付", PAID: "已支付", SHIPPED: "已发货", COMPLETED: "已完成", REFUNDED: "已退款", CANCELLED: "已取消",
};
const statusTagTypes: Record<string, string> = {
  PENDING: "warning", PAID: "warning", SHIPPED: "primary", COMPLETED: "success", REFUNDED: "info", CANCELLED: "info",
};
/** OrderType 全量 12 值翻译（schema enum OrderType 1057-1070·漏一个就英文枚举直出员工界面） */
const typeLabels: Record<string, string> = {
  MEMBER: "书院会员", COURSE: "课程", PRODUCT: "商品", CIRCLE_JOIN: "入圈",
  CIRCLE_RENEW: "圈子续费", STATION_MASTER: "分站站长", OPERATOR: "运营商",
  BOT_SERVICE: "智能体服务", PAIPAN: "排盘", LIVESTREAM: "直播", BUNDLE: "课程组合包",
  PRACTITIONER_PRO: "从业者会员",
};
const typeTagTypes: Record<string, string> = {
  PRODUCT: "primary", MEMBER: "success", PRACTITIONER_PRO: "success",
  COURSE: "warning", BUNDLE: "warning", LIVESTREAM: "warning",
  CIRCLE_JOIN: "danger", CIRCLE_RENEW: "danger",
  STATION_MASTER: "info", OPERATOR: "info", BOT_SERVICE: "info", PAIPAN: "info",
};

const columns = [
  { prop: "orderNo", label: "订单号", width: 130, slot: "orderNo" },
  { prop: "user", label: "用户", width: 100, slot: "user" },
  { prop: "type", label: "类型", width: 100, slot: "type" },
  { prop: "amount", label: "金额", width: 110, slot: "amount", align: "right" },
  { prop: "status", label: "状态", width: 90, slot: "status" },
  { prop: "createdAt", label: "下单时间", width: 130, slot: "createdAt" },
];

onMounted(() => fetchList());

/** 金额千分位两位小数 */
function fmtAmount(v: number | string | undefined | null) {
  if (v === null || v === undefined || v === "") return "0.00";
  return Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/** 列表时间：MM-DD HH:mm（悬浮 tooltip 给完整时间） */
function fmtTime(d?: string) {
  if (!d) return "-";
  const t = new Date(d);
  if (isNaN(t.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
}
function fmtFullTime(d?: string) {
  if (!d) return "-";
  const t = new Date(d);
  if (isNaN(t.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`;
}
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    ElMessage.success("已复制");
  }
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string | number | undefined> = {
      page: page.value, pageSize: pageSize.value,
      status: filterStatus.value || undefined,
      type: filterType.value || undefined,
      orderNo: filterOrderNo.value.trim() || undefined,
    };
    if (filterDateRange.value?.length === 2) {
      params.startDate = filterDateRange.value[0];
      params.endDate = filterDateRange.value[1];
    }
    const { data } = await orderApi.list(params);
    orders.value = data.orders;
    total.value = data.total;
  } catch {
    orders.value = [];
    total.value = 0;
    error.value = true;
  } finally { loading.value = false; }
}

function doSearch() { page.value = 1; fetchList(); }
function resetFilters() {
  filterStatus.value = ""; filterType.value = ""; filterOrderNo.value = ""; filterDateRange.value = [];
  page.value = 1;
  fetchList();
}

// ── 详情：归一化收货信息与商品明细（新端点 address/items 优先·再退 shippingInfo 快照·再退 enrich 的 product/sku） ──

/** shippingInfo 快照解析：{name,phone,province,city,district,detail} 或物流表口径 {contactName,contactPhone,address} */
function parseShippingInfo(raw: unknown): OrderAddress | undefined {
  let obj: Record<string, unknown> | null = null;
  if (typeof raw === "string" && raw.trim()) {
    try { obj = JSON.parse(raw); } catch { return undefined; }
  } else if (raw && typeof raw === "object") {
    obj = raw as Record<string, unknown>;
  }
  if (!obj) return undefined;
  const s = (v: unknown) => (v == null ? undefined : String(v));
  const addr: OrderAddress = {
    contactName: s(obj.contactName ?? obj.name),
    contactPhone: s(obj.contactPhone ?? obj.phone),
    province: s(obj.province), city: s(obj.city), district: s(obj.district),
    address: s(obj.address ?? obj.detail), zipCode: s(obj.zipCode),
  };
  return Object.values(addr).some(Boolean) ? addr : undefined;
}

/** 把订单数据归一化成详情弹窗需要的 address/items（不伪造：拼不出就留空，模板明示待后端） */
function normalizeDetail(data: Record<string, any>): OrderRow {
  const merged: any = { ...data };
  if (!merged.address) merged.address = parseShippingInfo(merged.shippingInfo);
  if (!Array.isArray(merged.items) || merged.items.length === 0) {
    if (merged.product?.title) {
      merged.items = [{
        name: merged.product.title,
        price: merged.sku?.price ?? merged.product.price ?? merged.amount,
        quantity: merged.quantity || 1,
        specs: merged.sku?.name || "",
      }];
    }
  }
  return merged as OrderRow;
}

/**
 * P0 详情盲发修复：原实现直接读列表行上不存在的 address/items（永远空）。
 * 现改为：①先探新管理端详情端点 GET /shop/admin/orders/:id（后端在建·返回含收货信息+明细）；
 * ② 404/未部署 → 降级现有 GET /shop/orders/:id（管理员可查·enrichOrders 带 product/sku + shippingInfo 快照）；
 * ③ 再失败 → 仅用列表行归一化（listOrders 同样 enrich 过，多数字段仍在）；拼不出的部分明示"待后端部署"。
 */
async function loadOrderDetail(row: OrderRow): Promise<OrderRow> {
  const id = row.id ?? "";
  try {
    const { data } = await api.get(`/shop/admin/orders/${id}`);
    detailSource.value = "admin";
    return normalizeDetail({ ...row, ...(data || {}) });
  } catch { /* 新端点未部署（404）或失败 → 降级 */ }
  try {
    const { data } = await orderApi.detail(id);
    detailSource.value = "detail";
    return normalizeDetail({ ...row, ...(data || {}) });
  } catch { /* 详情端点也失败 → 只用列表行 */ }
  detailSource.value = "row";
  return normalizeDetail({ ...row });
}

async function showDetail(row: OrderRow) {
  detailRow.value = normalizeDetail({ ...row }); // 先渲染列表行已有信息，避免白等
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    detailRow.value = await loadOrderDetail(row);
  } finally { detailLoading.value = false; }
}

const router = useRouter();
/** 白标贺卡打印（供-P2）：新标签页打开 A6 打印模板，供发货时打印随包裹放入 */
function openGiftCardPrint(row: OrderRow) {
  const href = router.resolve({ name: "GiftCardPrint", query: { orderId: row.id ?? "" } }).href;
  window.open(href, "_blank");
}

async function handlePay(orderId: string) {
  try {
    await ElMessageBox.confirm(
      "确认该订单已收到用户付款？此操作将标记订单为已支付，涉及资金入账。",
      "支付确认",
      { type: "warning", confirmButtonText: "确认收款" },
    );
    if (acting.value) return;
    acting.value = true;
    await orderApi.pay(orderId);
    ElMessage.success("支付确认成功");
    fetchList();
  } catch { /* */ } finally { acting.value = false; }
}

// ── 发货弹窗：必须能看到收货信息再发（原实现一个裸 confirm 盲发） ──
const shipVisible = ref(false);
const shipRow = ref<OrderRow | null>(null);
const shipLoading = ref(false);
async function openShip(row: OrderRow) {
  shipRow.value = normalizeDetail({ ...row });
  shipVisible.value = true;
  shipLoading.value = true;
  try {
    shipRow.value = await loadOrderDetail(row);
  } finally { shipLoading.value = false; }
}
async function confirmShip() {
  if (!shipRow.value?.id || acting.value) return;
  acting.value = true;
  try {
    await orderApi.ship(shipRow.value.id);
    ElMessage.success("发货成功");
    shipVisible.value = false;
    fetchList();
  } catch { /* 拦截器已提示 */ } finally { acting.value = false; }
}

// ── 退款弹窗：L4 语义前端最大化——金额明示 + 理由必填 + 不可逆红色警示。
//    真四眼流（发起人≠审批人二次审批）需后端支持，已记后端清单；当前端点为单人直退。 ──
const refundVisible = ref(false);
const refundRow = ref<OrderRow | null>(null);
const refundReason = ref("");
function openRefund(row: OrderRow) {
  refundRow.value = row;
  refundReason.value = "";
  refundVisible.value = true;
}
async function confirmRefund() {
  const target = refundRow.value;
  const reason = refundReason.value.trim();
  if (!target?.id) return;
  if (!reason) { ElMessage.warning("请填写退款理由"); return; }
  if (acting.value) return;
  acting.value = true;
  try {
    // 后端 RefundOrderDto 支持 reason（可选）·orderApi.refund 不传 body 故此处直调端点带上理由留痕
    await api.put(`/shop/orders/${target.id}/refund`, { reason });
    ElMessage.success("退款已执行，资金将原路退回");
    refundVisible.value = false;
    fetchList();
  } catch { /* 拦截器已提示 */ } finally { acting.value = false; }
}

async function handleComplete(orderId: string) {
  try {
    await ElMessageBox.confirm("确认要完成该订单吗？", "操作确认", { type: "info", confirmButtonText: "确认完成" });
    if (acting.value) return;
    acting.value = true;
    await orderApi.complete(orderId);
    ElMessage.success("订单已完成");
    fetchList();
  } catch { /* */ } finally { acting.value = false; }
}

async function openLogistics(row: OrderRow) {
  logisticsOrderId.value = row.id ?? "";
  try {
    const { data } = await orderApi.getLogistics(row.id ?? "");
    const init: Record<string, string> = {
      company: "", logisticsNo: "", contactName: "", contactPhone: "",
      province: "", city: "", district: "", address: "", zipCode: "", remark: "",
    };
    if (data.logistics) {
      Object.keys(init).forEach(k => {
        (logisticsForm as Record<string, string>)[k] = data.logistics[k] || "";
      });
    } else {
      Object.assign(logisticsForm, init);
    }
  } catch {
    Object.assign(logisticsForm, { company: "", logisticsNo: "", contactName: "", contactPhone: "", province: "", city: "", district: "", address: "", zipCode: "", remark: "" });
  }
  logisticsVisible.value = true;
}

async function saveLogistics() {
  if (savingLogistics.value) return;
  savingLogistics.value = true;
  try {
    const payload: Record<string, string> = {};
    Object.entries(logisticsForm).forEach(([k, v]) => { if (v) payload[k] = v; });
    await orderApi.updateLogistics(logisticsOrderId.value, payload);
    ElMessage.success("物流信息已保存");
    logisticsVisible.value = false;
    fetchList();
  } catch { /* */ } finally { savingLogistics.value = false; }
}

const shipAddressText = computed(() => {
  const a = shipRow.value?.address;
  if (!a) return "";
  return [a.province, a.city, a.district, a.address].filter(Boolean).join(" ");
});

function exportData() {
  exportCSV(
    "订单列表",
    [
      { label: "订单号", key: "id" },
      { label: "用户", key: "userName" }, { label: "类型", key: "typeLabel" },
      { label: "金额", key: "amount" }, { label: "状态", key: "statusLabel" },
      { label: "时间", key: "createdAtLabel" },
    ],
    orders.value.map((o) => ({
      ...o,
      userName: o.user?.nickname || "-",
      typeLabel: typeLabels[o.type ?? ""] || o.type,
      statusLabel: statusLabels[o.status ?? ""] || o.status,
      createdAtLabel: fmtFullTime(o.createdAt),
    })),
  );
}
</script>

<template>
  <div class="order-list">
    <PageHeader title="订单管理" />
    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        加载失败，请
        <el-button
          link
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-alert>
    <DataTable
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :data="orders"
      :loading="loading"
      :total="total"
      actions-width="300"
      @change="fetchList"
    >
      <template #toolbar>
        <el-input
          v-model="filterOrderNo"
          placeholder="订单号搜索"
          clearable
          style="width:180px"
          @keyup.enter="doSearch"
          @clear="doSearch"
        />
        <el-select
          v-model="filterType"
          placeholder="类型"
          clearable
          style="width:130px"
          @change="doSearch"
        >
          <el-option
            v-for="(label, key) in typeLabels"
            :key="key"
            :label="label"
            :value="key"
          />
        </el-select>
        <el-select
          v-model="filterStatus"
          placeholder="状态"
          clearable
          style="width:110px"
          @change="doSearch"
        >
          <el-option
            v-for="(label, key) in statusLabels"
            :key="key"
            :label="label"
            :value="key"
          />
        </el-select>
        <el-date-picker
          v-model="filterDateRange"
          type="daterange"
          range-separator="~"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width:240px"
          @change="doSearch"
        />
        <el-button
          type="primary"
          @click="doSearch"
        >
          查询
        </el-button>
        <el-button @click="resetFilters">
          重置
        </el-button>
        <el-button @click="exportData">
          导出CSV（当前页）
        </el-button>
      </template>

      <template #orderNo="{ row }">
        <el-tooltip
          :content="row.id"
          placement="top"
        >
          <span
            class="order-no"
            @click="copyText(row.id)"
          >{{ (row.id || '').slice(0, 8) }}…</span>
        </el-tooltip>
      </template>
      <template #user="{ row }">
        {{ row.user?.nickname || '-' }}
      </template>
      <template #type="{ row }">
        <el-tag
          size="small"
          effect="plain"
          :type="typeTagTypes[row.type] || 'info'"
        >
          {{ typeLabels[row.type] || row.type }}
        </el-tag>
      </template>
      <template #amount="{ row }">
        <span class="amount-cell">¥{{ fmtAmount(row.amount) }}</span>
      </template>
      <template #status="{ row }">
        <el-tag
          size="small"
          :type="statusTagTypes[row.status] || 'info'"
        >
          {{ statusLabels[row.status] || row.status }}
        </el-tag>
      </template>
      <template #createdAt="{ row }">
        <el-tooltip
          :content="fmtFullTime(row.createdAt)"
          placement="top"
        >
          <span>{{ fmtTime(row.createdAt) }}</span>
        </el-tooltip>
      </template>

      <template #actions="{ row }">
        <el-button
          size="small"
          type="primary"
          link
          @click="showDetail(row)"
        >
          详情
        </el-button>
        <el-button
          v-if="row.giftCardMeta"
          size="small"
          type="warning"
          link
          @click="openGiftCardPrint(row)"
        >
          打印贺卡
        </el-button>
        <template v-if="row.status === 'PENDING'">
          <el-button
            size="small"
            type="success"
            @click="handlePay(row.id)"
          >
            确认支付
          </el-button>
        </template>
        <template v-if="row.status === 'PAID'">
          <el-button
            size="small"
            @click="openShip(row)"
          >
            发货
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="openRefund(row)"
          >
            退款
          </el-button>
        </template>
        <template v-if="row.status === 'SHIPPED'">
          <el-button
            size="small"
            type="success"
            @click="handleComplete(row.id)"
          >
            完成
          </el-button>
        </template>
        <el-button
          v-if="['PAID','SHIPPED'].includes(row.status)"
          size="small"
          type="info"
          @click="openLogistics(row)"
        >
          物流
        </el-button>
        <span
          v-if="['COMPLETED','REFUNDED','CANCELLED'].includes(row.status)"
          style="color:#999"
        >-</span>
      </template>
    </DataTable>

    <!-- 发货确认弹窗：必须看到收货信息才允许发货 -->
    <el-dialog
      v-model="shipVisible"
      title="发货确认"
      width="520px"
    >
      <div v-loading="shipLoading">
        <el-descriptions
          v-if="shipRow"
          :column="1"
          border
          size="small"
        >
          <el-descriptions-item label="订单号">
            {{ shipRow.id }}
          </el-descriptions-item>
          <el-descriptions-item label="商品">
            {{ shipRow.items?.[0]?.name || shipRow.product?.title || '-' }}
            <span v-if="shipRow.quantity"> × {{ shipRow.quantity }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="收件人">
            {{ shipRow.address?.contactName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ shipRow.address?.contactPhone || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="收货地址">
            {{ shipAddressText || '—' }}
          </el-descriptions-item>
        </el-descriptions>
        <el-alert
          v-if="!shipLoading && !shipRow?.address"
          type="warning"
          :closable="false"
          show-icon
          style="margin-top:12px"
          title="未取到收货信息：可能是虚拟商品订单，或详情数据待后端部署。请先在「物流」中核对地址后再发货。"
        />
      </div>
      <template #footer>
        <el-button @click="shipVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="acting"
          :disabled="shipLoading"
          @click="confirmShip"
        >
          确认发货
        </el-button>
      </template>
    </el-dialog>

    <!-- 退款弹窗：金额明示 + 理由必填 + 不可逆警示（真四眼复核流已记后端清单） -->
    <el-dialog
      v-model="refundVisible"
      title="退款确认"
      width="480px"
    >
      <el-descriptions
        :column="1"
        border
        size="small"
      >
        <el-descriptions-item label="订单号">
          {{ refundRow?.id }}
        </el-descriptions-item>
        <el-descriptions-item label="用户">
          {{ refundRow?.user?.nickname || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="退款金额">
          <span class="refund-amount">¥{{ fmtAmount(refundRow?.amount) }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <el-input
        v-model="refundReason"
        type="textarea"
        :rows="3"
        placeholder="退款理由（必填，将写入审计留痕）"
        style="margin-top:12px"
      />
      <p class="danger-hint">
        此操作真金退款不可逆：确认后 ¥{{ fmtAmount(refundRow?.amount) }} 将原路退回用户支付渠道。
      </p>
      <template #footer>
        <el-button @click="refundVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="acting"
          :disabled="!refundReason.trim()"
          @click="confirmRefund"
        >
          确认退款
        </el-button>
      </template>
    </el-dialog>

    <!-- 物流信息弹窗 -->
    <el-dialog
      v-model="logisticsVisible"
      title="物流信息"
      width="550px"
    >
      <el-form
        :model="logisticsForm"
        label-width="100px"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="物流公司">
              <el-input
                v-model="logisticsForm.company"
                placeholder="如 顺丰速运"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物流单号">
              <el-input
                v-model="logisticsForm.logisticsNo"
                placeholder="快递单号"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="logisticsForm.contactName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="logisticsForm.contactPhone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="省">
              <el-input v-model="logisticsForm.province" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="市">
              <el-input v-model="logisticsForm.city" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="区">
              <el-input v-model="logisticsForm.district" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="详细地址">
          <el-input
            v-model="logisticsForm.address"
            placeholder="街道/门牌号"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="logisticsForm.remark"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="logisticsVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="savingLogistics"
          @click="saveLogistics"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 订单详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="订单详情"
      width="640px"
    >
      <template v-if="detailRow">
        <div v-loading="detailLoading">
          <el-descriptions
            :column="2"
            border
            size="small"
          >
            <el-descriptions-item
              label="订单编号"
              :span="2"
            >
              {{ detailRow.id }}
              <el-button
                size="small"
                link
                type="primary"
                @click="copyText(detailRow.id)"
              >
                复制
              </el-button>
            </el-descriptions-item>
            <el-descriptions-item label="用户">
              {{ detailRow.user?.nickname || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="类型">
              {{ typeLabels[detailRow.type] || detailRow.type }}
            </el-descriptions-item>
            <el-descriptions-item label="金额">
              ¥{{ fmtAmount(detailRow.amount) }}
            </el-descriptions-item>
            <el-descriptions-item label="虚拟币">
              {{ detailRow.coinAmount ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag
                size="small"
                :type="statusTagTypes[detailRow.status] || 'info'"
              >
                {{ statusLabels[detailRow.status] || detailRow.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ fmtFullTime(detailRow.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="detailRow.paidAt"
              label="支付时间"
              :span="2"
            >
              {{ fmtFullTime(detailRow.paidAt) }}
            </el-descriptions-item>
            <el-descriptions-item
              label="目标ID"
              :span="2"
            >
              {{ detailRow.targetId || '-' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="detailRow.giftCardMeta"
              label="贺卡任务"
              :span="2"
            >
              {{ detailRow.giftCardMeta.fromName || '国学甄选' }} 为您甄选
              <el-button
                size="small"
                type="warning"
                link
                @click="openGiftCardPrint(detailRow)"
              >
                打印贺卡
              </el-button>
            </el-descriptions-item>
          </el-descriptions>

          <el-divider content-position="left">
            收货信息
          </el-divider>
          <el-descriptions
            v-if="detailRow.address"
            :column="2"
            border
            size="small"
          >
            <el-descriptions-item label="收件人">
              {{ detailRow.address.contactName || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              {{ detailRow.address.contactPhone || '-' }}
            </el-descriptions-item>
            <el-descriptions-item
              label="收货地址"
              :span="2"
            >
              {{ [detailRow.address.province, detailRow.address.city, detailRow.address.district, detailRow.address.address].filter(Boolean).join(' ') || '-' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="detailRow.address.zipCode"
              label="邮编"
            >
              {{ detailRow.address.zipCode }}
            </el-descriptions-item>
          </el-descriptions>
          <el-empty
            v-else
            :description="detailRow.type === 'PRODUCT' && detailSource === 'row' ? '收货信息拉取失败：详情数据待后端部署' : '暂无收货信息（虚拟商品/服务类订单无需收货地址）'"
            :image-size="60"
          />

          <el-divider content-position="left">
            商品明细
          </el-divider>
          <template v-if="detailRow.items && detailRow.items.length > 0">
            <el-table
              :data="detailRow.items"
              border
              size="small"
            >
              <el-table-column
                label="商品名称"
                prop="name"
                min-width="160"
              />
              <el-table-column
                label="规格"
                width="110"
              >
                <template #default="{ row }">
                  {{ row.specs || '-' }}
                </template>
              </el-table-column>
              <el-table-column
                label="单价"
                width="100"
                align="right"
              >
                <template #default="{ row }">
                  ¥{{ fmtAmount(row.price) }}
                </template>
              </el-table-column>
              <el-table-column
                label="数量"
                width="70"
                prop="quantity"
              />
              <el-table-column
                label="小计"
                width="100"
                align="right"
              >
                <template #default="{ row }">
                  ¥{{ fmtAmount(Number(row.price) * Number(row.quantity || 1)) }}
                </template>
              </el-table-column>
            </el-table>
          </template>
          <el-empty
            v-else
            :description="detailSource === 'row' ? '商品明细拉取失败：详情数据待后端部署' : '暂无商品明细'"
            :image-size="60"
          />
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.order-list { padding: 0; }
.order-no { cursor: pointer; color: var(--el-color-primary, #409eff); font-family: monospace; }
.amount-cell { font-variant-numeric: tabular-nums; }
.refund-amount { color: var(--color-error, #f56c6c); font-weight: 700; }
.danger-hint { margin-top: 12px; color: var(--color-error, #f56c6c); font-size: 13px; }
</style>
