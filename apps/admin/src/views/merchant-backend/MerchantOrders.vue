<template>
  <div class="page">
    <div class="page-header">
      <h3>订单管理</h3>
      <div class="header-right">
        <el-select
          v-model="filterStatus"
          placeholder="全部状态"
          clearable
          style="width:140px"
          @change="onFilterChange"
        >
          <!-- 状态枚举与后端 OrderStatus 一致：PENDING/PAID/SHIPPED/COMPLETED/REFUNDED/CANCELLED -->
          <el-option
            label="待付款"
            value="PENDING"
          />
          <el-option
            label="已付款"
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
          <el-option
            label="已退款"
            value="REFUNDED"
          />
          <el-option
            label="已取消"
            value="CANCELLED"
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
      sub-title="订单数据加载失败，请稍后重试"
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

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无订单，买家下单后会出现在这里" />
      </template>
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="order-detail">
            <el-descriptions
              :column="3"
              border
              size="small"
            >
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
        min-width="150"
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
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusType(row.status)"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="买家"
        width="130"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.buyerNickname || "—" }}
          <span
            v-if="row.buyerPhone"
            class="buyer-phone"
          >{{ row.buyerPhone }}</span>
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
        width="200"
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
          <!-- approveRefund 后端仅拦 REFUNDED（走统一退款服务真金原路退），适用已付款后的各状态 -->
          <el-button
            v-if="REFUNDABLE.includes(row.status || '')"
            size="small"
            text
            type="danger"
            @click="doApproveRefund(row)"
          >
            退款
          </el-button>
          <el-button
            v-if="REFUNDABLE.includes(row.status || '')"
            size="small"
            text
            @click="openRejectRefund(row)"
          >
            拒绝退款
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="!error"
      class="list-tip"
    >
      买家发起的退款/退货申请，请到「售后管理」页处理（同意/拒绝在该页闭环）。
    </div>

    <el-pagination
      v-if="!error"
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:12px;justify-content:flex-end"
      @current-change="fetchList"
      @size-change="onFilterChange"
    />

    <!-- 发货 -->
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

    <!-- 拒绝退款 -->
    <el-dialog
      v-model="rejectDialog"
      title="拒绝退款"
      width="450px"
    >
      <el-form label-width="80px">
        <el-form-item
          label="拒绝原因"
          required
        >
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="3"
            placeholder="请输入拒绝退款原因（将告知买家）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doRejectRefund"
        >
          确认拒绝
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { merchantBackendApi } from "@/api";

/** 收货地址快照（Order.shippingInfo·下单时落库） */
interface ShippingInfo { name?: string; phone?: string; province?: string; city?: string; district?: string; detail?: string }
/**
 * 订单行——与后端 enrichOrders 真实返回对齐：
 * 原始 Order 字段（amount/payAmount/quantity/status/createdAt/paidAt/shippedAt/shippingInfo…）
 * + 补全字段 productTitle/productImage/buyerNickname/buyerPhone；
 * orderNo 为新契约透传字段（后端补齐中·缺省回退订单 id）。
 */
interface OrderRow {
  id: string;
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
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref(false);
const saving = ref(false);
const filterStatus = ref("");

const couriers = ["顺丰速运", "中通快递", "圆通速递", "申通快递", "韵达快递", "EMS", "京东物流", "极兔速递", "德邦快递"];

const shipDialog = ref(false);
const shipOrderId = ref("");
const shipForm = reactive({ company: "", trackingNo: "" });

const rejectDialog = ref(false);
const rejectOrderId = ref("");
const rejectReason = ref("");

/** 已付款后的可退款状态（approveRefund 后端仅拦 REFUNDED，PENDING/CANCELLED 无款可退） */
const REFUNDABLE = ["PAID", "SHIPPED", "COMPLETED"];

/** 与 prisma OrderStatus 枚举一一对应 */
const STATUS = {
  PENDING: ["待付款", "info"],
  PAID: ["已付款", "warning"],
  SHIPPED: ["已发货", "primary"],
  COMPLETED: ["已完成", "success"],
  REFUNDED: ["已退款", "danger"],
  CANCELLED: ["已取消", "info"],
} as Record<string, [string, string]>;

function statusLabel(s?: string) { return (s && STATUS[s]?.[0]) || s || "—"; }
function statusType(s?: string) { return (s && STATUS[s]?.[1]) || "info"; }

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
    const data = (res as { data?: { items?: OrderRow[]; list?: OrderRow[]; data?: OrderRow[]; total?: number } }).data ?? (res as { items?: OrderRow[]; list?: OrderRow[]; data?: OrderRow[]; total?: number });
    list.value = data.items || data.list || data.data || [];
    total.value = data.total || 0;
  } catch (e) {
    error.value = true;
  } finally { loading.value = false; }
}

function openShip(row: OrderRow) {
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

async function doApproveRefund(row: OrderRow) {
  const amountText = fmtMoney(row.payAmount ?? row.amount);
  try {
    // L4 资金操作：写明真金退款影响
    await ElMessageBox.confirm(
      `同意后将真金退款 ${amountText} 原路退回买家，分佣同步冲正，此操作不可撤销。确定退款？`,
      "退款确认",
      { type: "warning", confirmButtonText: "确认退款", cancelButtonText: "再想想", confirmButtonClass: "el-button--danger" },
    );
  } catch { return; }
  try {
    await merchantBackendApi.approveRefund(row.id);
    ElMessage.success("退款已受理，款项将原路退回买家");
    fetchList();
  } catch (e) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    ElMessage.error(msg || "退款受理失败，请稍后重试");
  }
}

function openRejectRefund(row: OrderRow) {
  rejectOrderId.value = row.id;
  rejectReason.value = "";
  rejectDialog.value = true;
}

async function doRejectRefund() {
  if (!rejectReason.value.trim()) { ElMessage.warning("请填写拒绝原因"); return; }
  saving.value = true;
  try {
    await merchantBackendApi.rejectRefund(rejectOrderId.value, { reason: rejectReason.value.trim() });
    ElMessage.success("已提交拒绝退款");
    rejectDialog.value = false;
    fetchList();
  } catch (e) {
    // 后端拒绝退款真实语义补齐中：404/异常时诚实提示
    const status = (e as { response?: { status?: number } })?.response?.status;
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    ElMessage.error(status === 404 ? "拒绝退款功能后端上线中，请稍后重试或到「售后管理」处理" : (msg || "操作失败，请稍后重试"));
  } finally { saving.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.header-right { display: flex; gap: 12px; }
.order-detail { padding: 12px 20px; }
.buyer-phone { color: var(--color-text-secondary, #999); font-size: 12px; margin-left: 4px; }
.list-tip { margin-top: 10px; font-size: 12px; color: var(--color-text-secondary, #999); }
</style>
