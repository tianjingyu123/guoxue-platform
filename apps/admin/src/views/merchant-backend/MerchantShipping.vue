<template>
  <div class="page">
    <div class="page-header">
      <h3>发货管理</h3>
      <div class="header-right">
        <el-select
          v-model="filterStatus"
          placeholder="全部状态"
          clearable
          style="width:120px"
          @change="onFilterChange"
        >
          <!-- 状态枚举与后端 OrderStatus 一致（无 DELIVERED，签收即 COMPLETED） -->
          <el-option
            label="待发货"
            value="PAID"
          />
          <el-option
            label="已发货"
            value="SHIPPED"
          />
          <el-option
            label="已完成"
            value="COMPLETED"
          />
        </el-select>
        <el-button @click="fetchList">
          刷新
        </el-button>
      </div>
    </div>

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
        :column="2"
        border
        size="small"
      >
        <el-descriptions-item label="物流公司">
          {{ trackBase.company || "—" }}
        </el-descriptions-item>
        <el-descriptions-item label="快递单号">
          {{ trackBase.trackingNo || "—" }}
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
import { ElMessage } from "element-plus";
import { api, merchantBackendApi } from "@/api";

/** 收货地址快照（Order.shippingInfo） */
interface ShippingInfo { name?: string; phone?: string; province?: string; city?: string; district?: string; detail?: string }
/**
 * 发货订单行——与后端 enrichOrders 真实返回对齐：
 * amount/payAmount/status/createdAt/shippingInfo + productTitle/buyerNickname；
 * orderNo 为新契约透传（缺省回退 id）；shipCompany/trackingNo 列表暂未返回（记后端清单），缺则"—"。
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
}
/** 物流轨迹项（快递100 返回） */
interface TrackItem { time?: string; status?: string; location?: string }
interface TrackResp { state?: string; tracks?: TrackItem[]; message?: string }

const list = ref<ShipOrderRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref(false);
const saving = ref(false);
const filterStatus = ref("PAID");
const selected = ref<ShipOrderRow[]>([]);

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

onMounted(() => fetchList());

function onFilterChange() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value };
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await merchantBackendApi.listOrders(params);
    // 兼容两种响应包装：{ data: {...} } 或直接返回 data
    const data = (res as { data?: { items?: ShipOrderRow[]; list?: ShipOrderRow[]; data?: ShipOrderRow[]; total?: number } }).data ?? (res as { items?: ShipOrderRow[]; list?: ShipOrderRow[]; data?: ShipOrderRow[]; total?: number });
    list.value = data.items || data.list || data.data || [];
    total.value = data.total || 0;
  } catch (e) {
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
    // 无批量端点：逐单调现有发货端点，allSettled 汇总结果
    const results = await Promise.allSettled(
      batchRows.value.map((r) =>
        merchantBackendApi.shipOrder(r.id, { company: batchCompany.value, trackingNo: r.inputTrackingNo.trim() }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    if (fail === 0) {
      ElMessage.success(`批量发货完成，共 ${ok} 单`);
    } else {
      ElMessage.warning(`批量发货完成：成功 ${ok} 单，失败 ${fail} 单（失败订单仍在待发货列表，请重试）`);
    }
    batchDialog.value = false;
    fetchList();
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
    // 真实物流查询端点（快递100）：后端未配置密钥时返回 message，诚实展示
    const res = await api.get("/shop/logistics/track", { params: { no: row.trackingNo, company: row.shipCompany || undefined } });
    const data = (res as { data?: TrackResp }).data ?? (res as TrackResp);
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
.page { padding: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.header-right { display: flex; gap: 12px; }
.batch-bar {
  display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
  padding: 8px 14px; border-radius: 6px;
  background: var(--el-color-primary-light-9, #ecf5ff);
  font-size: 13px; color: var(--el-color-primary, #409eff);
}
.muted { color: var(--color-text-placeholder, #ccc); }
.track-empty { text-align: center; color: var(--color-text-secondary, #999); padding: 20px; font-size: 13px; }
</style>
