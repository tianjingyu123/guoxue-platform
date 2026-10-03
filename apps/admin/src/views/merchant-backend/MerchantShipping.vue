<template>
  <div class="shipping-page">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">
          履约控制台 · FULFILLMENT CONTROL
        </p>
        <h1>从付款到签收，每一单都有明确下一步</h1>
        <p>先处理待发货，再跟进在途运单；批量动作保留逐单结果，异常订单不会被成功订单掩盖。</p>
      </div>
      <div class="hero-actions">
        <el-button
          class="ghost-btn"
          @click="router.push('/merchant-backend/inventory')"
        >
          库存与采购
        </el-button>
        <el-button
          class="ghost-btn"
          @click="router.push('/merchant-backend/after-sales')"
        >
          售后质检
        </el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="fetchList"
        >
          刷新数据
        </el-button>
      </div>
    </section>

    <section
      class="metrics"
      aria-label="发货状态总览"
    >
      <button
        v-for="item in shippingMetrics"
        :key="item.key"
        :class="['metric', item.tone, { active: filterStatus === item.filter }]"
        type="button"
        @click="applyStatusFilter(item.filter)"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.hint }}</small>
      </button>
    </section>

    <section class="workflow">
      <div class="workflow-copy">
        <p class="eyebrow dark">
          TODAY'S ROUTE
        </p>
        <h2>今日履约路径</h2>
        <span>按承诺时间完成拣货、核址、出库和轨迹跟进。</span>
      </div>
      <div class="workflow-track">
        <div><i>01</i><b>核对订单</b><span>商品、数量与收件信息</span></div>
        <div><i>02</i><b>拣货出库</b><span>库存占用转为销售出库</span></div>
        <div><i>03</i><b>回填运单</b><span>支持同快递批量录入</span></div>
        <div><i>04</i><b>跟踪签收</b><span>异常轨迹及时处理</span></div>
      </div>
    </section>

    <section class="workspace">
      <header class="workspace-head">
        <div>
          <p class="eyebrow dark">
            ORDER QUEUE
          </p>
          <h2>履约订单</h2>
        </div>
        <div
          class="status-tabs"
          role="tablist"
          aria-label="订单状态筛选"
        >
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            :class="{ active: filterStatus === tab.value }"
            @click="applyStatusFilter(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
      </header>

      <el-result
        v-if="error"
        icon="error"
        title="加载失败"
        sub-title="订单列表加载失败，请稍后重试"
      >
        <template #extra>
          <el-button
            type="primary"
            @click="fetchList"
          >
            重试
          </el-button>
        </template>
      </el-result>

      <template v-else>
        <!-- 批量操作栏：勾选待发货订单后出现 -->
        <div
          v-if="selectedShippable.length"
          class="batch-bar"
        >
          <span>已选 {{ selectedShippable.length }} 个待发货订单</span>
          <el-button
            type="primary"
            size="small"
            @click="openBatchShip"
          >
            批量发货
          </el-button>
        </div>

        <el-table
          v-loading="loading"
          :data="list"
          stripe
          @selection-change="handleSelection"
        >
          <template #empty>
            <el-empty description="暂无订单，买家付款后待发货订单会出现在这里" />
          </template>
          <el-table-column
            type="selection"
            width="50"
            :selectable="(row: ShipOrderRow) => row.status === 'PAID'"
          />
          <el-table-column
            label="订单号"
            width="180"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.orderNo || row.id }}
            </template>
          </el-table-column>
          <el-table-column
            label="商品"
            min-width="140"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.productTitle || "—" }}
            </template>
          </el-table-column>
          <el-table-column
            label="金额"
            width="110"
            align="right"
          >
            <template #default="{ row }">
              {{ fmtMoney(row.payAmount ?? row.amount) }}
            </template>
          </el-table-column>
          <el-table-column
            label="买家"
            width="110"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.buyerNickname || "—" }}
            </template>
          </el-table-column>
          <el-table-column
            label="收件人"
            width="110"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.shippingInfo?.name || "—" }}
            </template>
          </el-table-column>
          <el-table-column
            label="收货地址"
            min-width="180"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ shippingAddress(row) }}
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'PAID' ? 'warning' : row.status === 'SHIPPED' ? 'primary' : 'success'"
                size="small"
              >
                {{ ({ PAID: "待发货", SHIPPED: "已发货", COMPLETED: "已完成" } as Record<string, string>)[row.status || ''] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="物流信息"
            min-width="150"
          >
            <template #default="{ row }">
              <span v-if="row.shipCompany || row.trackingNo">{{ row.shipCompany || "—" }} / {{ row.trackingNo || "—" }}</span>
              <span
                v-else
                class="muted"
              >—</span>
            </template>
          </el-table-column>
          <el-table-column
            label="下单时间"
            width="150"
          >
            <template #default="{ row }">
              {{ fmtTime(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="120"
            fixed="right"
          >
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
              <el-button
                v-if="row.trackingNo"
                size="small"
                text
                type="info"
                @click="openTrack(row)"
              >
                物流
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          style="margin-top:16px;justify-content:flex-end"
          @current-change="fetchList"
          @size-change="onFilterChange"
        />
      </template>
    </section>

    <!-- 单笔发货 -->
    <el-dialog
      v-model="shipDialog"
      title="发货"
      width="450px"
    >
      <el-form label-width="80px">
        <el-form-item
          label="物流公司"
          required
        >
          <el-select
            v-model="shipForm.company"
            placeholder="选择物流公司"
            style="width:100%"
          >
            <el-option
              v-for="c in couriers"
              :key="c"
              :label="c"
              :value="c"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="快递单号"
          required
        >
          <el-input
            v-model="shipForm.trackingNo"
            placeholder="请输入快递单号"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doShip"
        >
          确认发货
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量发货：统一物流公司 + 逐单填运单号 -->
    <el-dialog
      v-model="batchDialog"
      title="批量发货"
      width="640px"
    >
      <el-form label-width="80px">
        <el-form-item
          label="物流公司"
          required
        >
          <el-select
            v-model="batchCompany"
            placeholder="选择物流公司（本批统一）"
            style="width:100%"
          >
            <el-option
              v-for="c in couriers"
              :key="c"
              :label="c"
              :value="c"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <el-table
        :data="batchRows"
        size="small"
        border
        max-height="360"
      >
        <el-table-column
          label="订单号"
          width="150"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.orderNo || row.id }}
          </template>
        </el-table-column>
        <el-table-column
          label="商品"
          min-width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.productTitle || "—" }}
          </template>
        </el-table-column>
        <el-table-column
          label="收件人"
          width="90"
        >
          <template #default="{ row }">
            {{ row.shippingInfo?.name || "—" }}
          </template>
        </el-table-column>
        <el-table-column
          label="快递单号"
          min-width="170"
        >
          <template #default="{ row }">
            <el-input
              v-model="row.inputTrackingNo"
              size="small"
              placeholder="请输入该单运单号"
            />
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="batchDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doBatchShip"
        >
          确认批量发货（{{ batchRows.length }} 单）
        </el-button>
      </template>
    </el-dialog>

    <!-- 物流轨迹（真实查询：GET /shop/logistics/track·快递100） -->
    <el-dialog
      v-model="trackDialog"
      title="物流轨迹"
      width="550px"
    >
      <el-descriptions
        :column="3"
        border
        size="small"
      >
        <el-descriptions-item label="物流公司">
          {{ trackBase.company || "—" }}
        </el-descriptions-item>
        <el-descriptions-item label="快递单号">
          {{ trackBase.trackingNo || "—" }}
        </el-descriptions-item>
        <el-descriptions-item label="物流状态">
          {{ logisticsStateText }}
        </el-descriptions-item>
      </el-descriptions>
      <div
        v-loading="trackLoading"
        style="min-height:80px;margin-top:16px"
      >
        <el-timeline v-if="trackData?.tracks?.length">
          <el-timeline-item
            v-for="(t, idx) in trackData.tracks"
            :key="idx"
            :timestamp="t.time"
            placement="top"
          >
            {{ t.status }}
          </el-timeline-item>
        </el-timeline>
        <div
          v-else-if="!trackLoading"
          class="track-empty"
        >
          {{ trackMessage }}
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { merchantBackendApi } from "@/api";

/** 收货地址快照（Order.shippingInfo） */
interface ShippingInfo { name?: string; phone?: string; province?: string; city?: string; district?: string; detail?: string }
/**
 * 发货订单行——与后端 enrichOrders 真实返回对齐：
 * amount/payAmount/status/createdAt/shippingInfo + productTitle/buyerNickname；
 * orderNo 缺省回退 id；shipCompany/trackingNo 由后端批量补齐，避免逐行查询运单。
 */
interface ShipOrderRow {
  id: string;
  orderNo?: string;
  amount?: number | string;
  payAmount?: number | string | null;
  productTitle?: string;
  buyerNickname?: string;
  shippingInfo?: ShippingInfo | null;
  status?: string;
  shipCompany?: string;
  trackingNo?: string;
  createdAt?: string;
  shippedAt?: string;
}
/** 物流轨迹项（快递100 返回） */
interface TrackItem { time?: string; status?: string; location?: string }
interface TrackResp { state?: string; tracks?: TrackItem[]; message?: string }
interface ShipmentResp { track?: TrackResp | null }
interface BatchShipResult {
  successCount: number;
  failedCount: number;
  items: Array<{ orderId: string; success: boolean; replayed?: boolean; message?: string }>;
}

const list = ref<ShipOrderRow[]>([]);
const overviewList = ref<ShipOrderRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref(false);
const saving = ref(false);
const filterStatus = ref("");
const selected = ref<ShipOrderRow[]>([]);
const route = useRoute();
const router = useRouter();
const isVisualPreview = import.meta.env.DEV && route.meta?.devPreview === true;

const previewOrders: ShipOrderRow[] = [
  {
    id: "order-preview-001",
    orderNo: "GX202607290001",
    productTitle: "文房四宝精品套装 · 雅集礼盒",
    buyerNickname: "林间听雨",
    amount: 899.9,
    payAmount: 899.9,
    status: "PAID",
    shippingInfo: { name: "林女士", phone: "138****2096", province: "浙江省", city: "杭州市", district: "临安区", detail: "锦城街道文教路 18 号" },
    createdAt: "2026-07-29T08:20:00.000Z",
  },
  {
    id: "order-preview-002",
    orderNo: "GX202607290002",
    productTitle: "国学经典诵读机 · 便携版",
    buyerNickname: "墨池",
    amount: 299.9,
    payAmount: 299.9,
    status: "PAID",
    shippingInfo: { name: "周先生", phone: "186****3721", province: "江苏省", city: "苏州市", district: "姑苏区", detail: "平江路 26 号" },
    createdAt: "2026-07-29T07:50:00.000Z",
  },
  {
    id: "order-preview-003",
    orderNo: "GX202607280028",
    productTitle: "精品紫砂壶套装 · 清韵",
    buyerNickname: "半卷书",
    amount: 599.9,
    payAmount: 599.9,
    status: "SHIPPED",
    shippingInfo: { name: "陈女士", province: "上海市", city: "上海市", district: "徐汇区", detail: "衡山路 108 号" },
    shipCompany: "顺丰速运",
    trackingNo: "SF1498227039156",
    createdAt: "2026-07-28T09:12:00.000Z",
    shippedAt: "2026-07-29T01:30:00.000Z",
  },
  {
    id: "order-preview-004",
    orderNo: "GX202607270019",
    productTitle: "宣纸体验装 · 四尺生宣",
    buyerNickname: "砚边人",
    amount: 129,
    payAmount: 129,
    status: "COMPLETED",
    shippingInfo: { name: "许先生", province: "北京市", city: "北京市", district: "海淀区", detail: "学院路 9 号" },
    shipCompany: "京东物流",
    trackingNo: "JDVA00290617215",
    createdAt: "2026-07-27T03:18:00.000Z",
    shippedAt: "2026-07-27T08:40:00.000Z",
  },
];

const statusTabs = [
  { label: "全部订单", value: "" },
  { label: "待发货", value: "PAID" },
  { label: "已发货", value: "SHIPPED" },
  { label: "已完成", value: "COMPLETED" },
];

const statusCounts = computed(() => ({
  all: overviewList.value.length,
  pending: overviewList.value.filter((item) => item.status === "PAID").length,
  shipped: overviewList.value.filter((item) => item.status === "SHIPPED").length,
  completed: overviewList.value.filter((item) => item.status === "COMPLETED").length,
}));
const currentPageAmount = computed(() =>
  overviewList.value.reduce((sum, item) => sum + Number(item.payAmount ?? item.amount ?? 0), 0),
);
const shippingMetrics = computed(() => [
  { key: "pending", label: "待发货", value: statusCounts.value.pending, hint: "优先完成核址与出库", filter: "PAID", tone: "urgent" },
  { key: "shipped", label: "运输中", value: statusCounts.value.shipped, hint: "点击查看在途运单", filter: "SHIPPED", tone: "moving" },
  { key: "completed", label: "已完成", value: statusCounts.value.completed, hint: "本页已签收订单", filter: "COMPLETED", tone: "done" },
  { key: "amount", label: "本页订单额", value: fmtMoney(currentPageAmount.value), hint: `${statusCounts.value.all} 笔订单`, filter: "", tone: "amount" },
]);

const couriers = ["顺丰速运", "中通快递", "圆通速递", "申通快递", "韵达快递", "EMS", "京东物流", "极兔速递", "德邦快递"];

const shipDialog = ref(false);
const shipOrderId = ref("");
const shipForm = reactive({ company: "", trackingNo: "" });

const batchDialog = ref(false);
const batchCompany = ref("");
const batchRows = ref<Array<ShipOrderRow & { inputTrackingNo: string }>>([]);

const trackDialog = ref(false);
const trackBase = reactive({ company: "", trackingNo: "" });
const trackData = ref<TrackResp | null>(null);
const trackLoading = ref(false);
const trackMessage = ref("暂无物流轨迹信息");
const logisticsStateText = computed(() => {
  const state = trackData.value?.state || "";
  const labels: Record<string, string> = {
    "0": "运输中",
    "1": "已揽收",
    "2": "物流异常",
    "3": "已签收",
    "4": "已退回",
    "5": "派送中",
    "6": "退回中",
    "7": "转投中",
    "10": "清关中",
    "11": "已清关",
    PICKED_UP: "已揽收",
    IN_TRANSIT: "运输中",
    OUT_FOR_DELIVERY: "派送中",
    EXCEPTION: "物流异常",
    SIGNED: "已签收",
    RETURNING: "退回中",
    RETURNED: "已退回",
    TRANSFERRED: "转投中",
    CUSTOMS_CLEARANCE: "清关中",
    CUSTOMS_RELEASED: "已清关",
    REJECTED: "已拒收",
  };
  return labels[state] || "等待物流更新";
});

const selectedShippable = computed(() => selected.value.filter((r) => r.status === "PAID"));

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

function shippingAddress(row: ShipOrderRow): string {
  const s = row.shippingInfo;
  if (!s) return "—";
  const addr = [s.province, s.city, s.district, s.detail].filter(Boolean).join(" ");
  return addr || "—";
}

function handleSelection(rows: ShipOrderRow[]) { selected.value = rows; }

onMounted(() => {
  if (isVisualPreview) ElMessage.closeAll();
  fetchList();
});

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
    overviewList.value = previewOrders;
    const rows = filterStatus.value
      ? previewOrders.filter((item) => item.status === filterStatus.value)
      : previewOrders;
    list.value = rows;
    total.value = rows.length;
    loading.value = false;
    return;
  }
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value };
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await merchantBackendApi.listOrders(params);
    // 兼容两种响应包装：{ data: {...} } 或直接返回 data
    const data = (res as { data?: { items?: ShipOrderRow[]; list?: ShipOrderRow[]; data?: ShipOrderRow[]; total?: number } }).data ?? (res as { items?: ShipOrderRow[]; list?: ShipOrderRow[]; data?: ShipOrderRow[]; total?: number });
    list.value = data.items || data.list || data.data || [];
    if (!filterStatus.value) overviewList.value = list.value;
    total.value = data.total || 0;
  } catch {
    error.value = true;
  } finally { loading.value = false; }
}

function openShip(row: ShipOrderRow) {
  shipOrderId.value = row.id;
  shipForm.company = "";
  shipForm.trackingNo = "";
  shipDialog.value = true;
}

async function doShip() {
  if (!shipForm.company || !shipForm.trackingNo) { ElMessage.warning("请填写物流信息"); return; }
  saving.value = true;
  try {
    await merchantBackendApi.shipOrder(shipOrderId.value, { company: shipForm.company, trackingNo: shipForm.trackingNo });
    ElMessage.success("发货成功");
    shipDialog.value = false;
    fetchList();
  } catch { /* 请求错误已由拦截器提示 */ } finally { saving.value = false; }
}

function openBatchShip() {
  batchCompany.value = "";
  batchRows.value = selectedShippable.value.map((r) => ({ ...r, inputTrackingNo: "" }));
  batchDialog.value = true;
}

async function doBatchShip() {
  if (!batchCompany.value) { ElMessage.warning("请选择物流公司"); return; }
  const missing = batchRows.value.filter((r) => !r.inputTrackingNo.trim());
  if (missing.length) { ElMessage.warning(`还有 ${missing.length} 个订单未填运单号`); return; }
  saving.value = true;
  try {
    const response = await merchantBackendApi.batchShipOrders(
      batchRows.value.map((r) => ({
        orderId: r.id,
        company: batchCompany.value,
        trackingNo: r.inputTrackingNo.trim(),
      })),
    );
    const result = response.data as BatchShipResult;
    const failed = result.items.filter((item) => !item.success);
    if (!failed.length) {
      ElMessage.success(`批量发货完成，共 ${result.successCount} 单`);
      batchDialog.value = false;
    } else {
      const failedIds = new Set(failed.map((item) => item.orderId));
      batchRows.value = batchRows.value.filter((row) => failedIds.has(row.id));
      const detail = failed
        .slice(0, 3)
        .map((item) => `${item.orderId.slice(-8)}：${item.message || "处理失败"}`)
        .join("；");
      ElMessage.warning(`成功 ${result.successCount} 单，失败 ${result.failedCount} 单。${detail}`);
    }
    await fetchList();
  } finally { saving.value = false; }
}

async function openTrack(row: ShipOrderRow) {
  trackBase.company = row.shipCompany || "";
  trackBase.trackingNo = row.trackingNo || "";
  trackData.value = null;
  trackMessage.value = "暂无物流轨迹信息";
  trackDialog.value = true;
  if (!row.trackingNo) { trackMessage.value = "该订单暂无运单号"; return; }
  trackLoading.value = true;
  try {
    // 通过商家运单端点查询：实时接口不可用时，后端会回退到已同步的轨迹快照。
    const res = await merchantBackendApi.getShipment(row.id);
    const payload = ((res as { data?: ShipmentResp }).data ?? res) as ShipmentResp;
    const data = payload.track || { state: "unknown", tracks: [], message: "暂无物流轨迹信息" };
    trackData.value = data;
    if (!data?.tracks?.length) {
      trackMessage.value = data?.message ? `物流轨迹查询暂不可用（${data.message}）` : "暂无物流轨迹信息（单号可能尚未被快递公司收录）";
    }
  } catch {
    trackMessage.value = "物流轨迹查询失败，请稍后重试";
  } finally { trackLoading.value = false; }
}
</script>

<style scoped>
.shipping-page {
  min-height: 100%;
  padding: 24px;
  color: #1f2d28;
  background:
    radial-gradient(circle at 92% 0%, rgba(188, 72, 49, .08), transparent 31%),
    linear-gradient(180deg, #f8f6f1 0, #f3f0e9 100%);
}
.hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  overflow: hidden;
  padding: 34px 36px;
  border: 1px solid rgba(32, 83, 67, .16);
  border-radius: 22px;
  color: #f8fbf8;
  background:
    radial-gradient(circle at 86% 28%, rgba(237, 190, 105, .28), transparent 25%),
    linear-gradient(132deg, #143d33 0%, #205b49 56%, #7e4b32 125%);
  box-shadow: 0 18px 42px rgba(25, 67, 54, .16);
}
.hero::after {
  position: absolute;
  right: -42px;
  bottom: -92px;
  width: 250px;
  height: 250px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 50%;
  box-shadow: 0 0 0 36px rgba(255,255,255,.035), 0 0 0 72px rgba(255,255,255,.025);
  content: "";
}
.hero-copy, .hero-actions { position: relative; z-index: 1; }
.eyebrow {
  margin: 0 0 8px;
  color: #e8c783;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .16em;
}
.eyebrow.dark { color: #9b6847; }
.hero h1 { margin: 0; font-size: clamp(26px, 2.3vw, 38px); line-height: 1.25; letter-spacing: -.02em; }
.hero-copy > p:last-child { max-width: 720px; margin: 13px 0 0; color: rgba(255,255,255,.72); line-height: 1.75; }
.hero-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.hero :deep(.ghost-btn) { border-color: rgba(255,255,255,.22); color: #fff; background: rgba(255,255,255,.08); }
.hero :deep(.ghost-btn:hover) { border-color: rgba(255,255,255,.42); background: rgba(255,255,255,.14); }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 18px 0; }
.metric {
  position: relative;
  min-height: 122px;
  padding: 19px 20px;
  overflow: hidden;
  border: 1px solid #e5e0d6;
  border-radius: 17px;
  text-align: left;
  color: #263832;
  background: rgba(255,255,255,.88);
  box-shadow: 0 8px 24px rgba(53, 48, 37, .055);
  cursor: pointer;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}
.metric:hover, .metric.active { transform: translateY(-2px); border-color: #b98b65; box-shadow: 0 12px 28px rgba(53, 48, 37, .1); }
.metric::after { position: absolute; right: -26px; top: -34px; width: 108px; height: 108px; border-radius: 50%; background: var(--metric-glow, #f3ede5); content: ""; }
.metric span, .metric strong, .metric small { position: relative; z-index: 1; display: block; }
.metric span { color: #6c7772; font-size: 13px; }
.metric strong { margin: 9px 0 5px; font-family: Georgia, "Times New Roman", serif; font-size: 30px; font-weight: 600; }
.metric small { color: #979d99; }
.metric.urgent { --metric-glow: #f8ddd5; }
.metric.urgent strong { color: #b44c36; }
.metric.moving { --metric-glow: #dcece6; }
.metric.moving strong { color: #25624e; }
.metric.done { --metric-glow: #e8eadb; }
.metric.amount { --metric-glow: #f4e6c9; }
.metric.amount strong { color: #8b5a2c; }
.workflow, .workspace {
  border: 1px solid #e6e0d5;
  border-radius: 20px;
  background: rgba(255,255,255,.88);
  box-shadow: 0 10px 28px rgba(53, 48, 37, .055);
}
.workflow { display: grid; grid-template-columns: 280px 1fr; gap: 24px; padding: 24px 26px; }
.workflow h2, .workspace h2 { margin: 0; font-family: "Noto Serif SC", "Songti SC", serif; font-size: 21px; }
.workflow-copy > span { display: block; margin-top: 8px; color: #8a918d; font-size: 13px; line-height: 1.6; }
.workflow-track { display: grid; grid-template-columns: repeat(4, 1fr); align-items: stretch; }
.workflow-track > div { position: relative; display: flex; flex-direction: column; min-width: 0; padding: 7px 26px 7px 20px; border-left: 1px solid #ede7dd; }
.workflow-track > div::after { position: absolute; right: 8px; top: 50%; color: #c9b59e; content: "›"; transform: translateY(-50%); }
.workflow-track > div:last-child::after { display: none; }
.workflow-track i { color: #b18055; font-family: Georgia, serif; font-size: 12px; font-style: normal; }
.workflow-track b { margin: 5px 0 4px; font-size: 15px; }
.workflow-track span { overflow: hidden; color: #909793; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.workspace { margin-top: 18px; padding: 22px; }
.workspace-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
.status-tabs { display: inline-flex; gap: 5px; padding: 5px; border-radius: 12px; background: #f2eee7; }
.status-tabs button { padding: 8px 15px; border: 0; border-radius: 9px; color: #777e7a; background: transparent; cursor: pointer; }
.status-tabs button.active { color: #fff; background: #245845; box-shadow: 0 5px 12px rgba(36,88,69,.18); }
.batch-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px;
  padding: 12px 16px; border: 1px solid #d8e5df; border-radius: 12px;
  background: #edf6f1;
  font-size: 13px; font-weight: 600; color: #245845;
}
.muted { color: var(--color-text-placeholder, #ccc); }
.track-empty { text-align: center; color: var(--color-text-secondary, #999); padding: 20px; font-size: 13px; }
@media (max-width: 1080px) {
  .metrics { grid-template-columns: repeat(2, 1fr); }
  .workflow { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .shipping-page { padding: 14px; }
  .hero { align-items: flex-start; flex-direction: column; padding: 26px 22px; }
  .hero-actions { justify-content: flex-start; }
  .metrics { grid-template-columns: 1fr 1fr; }
  .workflow-track { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .workflow-track > div { border: 1px solid #ede7dd; border-radius: 12px; }
  .workspace-head { align-items: flex-start; flex-direction: column; }
  .status-tabs { max-width: 100%; overflow-x: auto; }
  .status-tabs button { white-space: nowrap; }
}
</style>
