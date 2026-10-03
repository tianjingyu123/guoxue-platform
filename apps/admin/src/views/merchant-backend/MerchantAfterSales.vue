<template>
  <div class="after-sales-page">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">
          售后质检台 · SERVICE RECOVERY
        </p>
        <h1>把问题处理清楚，也把信任留在店里</h1>
        <p>仅退款先核证，退货退款先确认回寄；验收结果、库存回补与原路退款形成同一条可追溯记录。</p>
      </div>
      <div class="hero-actions">
        <el-button
          class="ghost-btn"
          @click="router.push('/merchant-backend/shipping')"
        >
          发货履约
        </el-button>
        <el-button
          class="ghost-btn"
          @click="router.push('/merchant-backend/inventory')"
        >
          库存与采购
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
      aria-label="售后状态总览"
    >
      <button
        v-for="item in afterSalesMetrics"
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

    <section class="service-route">
      <div class="route-copy">
        <p class="eyebrow dark">
          RECOVERY ROUTE
        </p>
        <h2>一条售后，四步闭环</h2>
        <span>把沟通、证据、实物和资金动作对应起来。</span>
      </div>
      <div class="route-track">
        <div><i>01</i><b>受理诉求</b><span>确认类型、原因与金额</span></div>
        <div><i>02</i><b>核验证据</b><span>订单、物流与商品情况</span></div>
        <div><i>03</i><b>处理决策</b><span>同意、拒绝或补充材料</span></div>
        <div><i>04</i><b>资金与库存</b><span>原路退款、验收回仓</span></div>
      </div>
    </section>

    <section class="workspace">
      <header class="workspace-head">
        <div>
          <p class="eyebrow dark">
            AFTER-SALES QUEUE
          </p>
          <h2>售后处理队列</h2>
        </div>
        <div class="header-right">
          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width:140px"
            @change="onFilterChange"
          >
            <el-option
              label="待处理"
              value="PENDING"
            />
            <el-option
              label="处理中"
              value="PROCESSING"
            />
            <el-option
              label="已同意"
              value="APPROVED"
            />
            <el-option
              label="已拒绝"
              value="REJECTED"
            />
            <el-option
              label="已取消"
              value="CANCELLED"
            />
            <el-option
              label="已完成"
              value="COMPLETED"
            />
          </el-select>
          <!-- 类型取值与 C 端真实写入一致：refund_only / refund_with_return（AfterSale.type） -->
          <el-select
            v-model="filterType"
            placeholder="全部类型"
            clearable
            style="width:130px"
            @change="onFilterChange"
          >
            <el-option
              label="仅退款"
              value="refund_only"
            />
            <el-option
              label="退货退款"
              value="refund_with_return"
            />
            <el-option
              label="换货"
              value="exchange"
            />
            <el-option
              label="交易申诉"
              value="other"
            />
          </el-select>
          <el-button @click="fetchList">
            刷新
          </el-button>
        </div>
      </header>

      <div
        class="status-tabs"
        role="tablist"
        aria-label="售后状态筛选"
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

      <el-result
        v-if="error"
        icon="error"
        title="加载失败"
        sub-title="售后列表加载失败，请稍后重试"
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
          <el-empty description="暂无售后申请，买家发起售后会出现在这里" />
        </template>
        <el-table-column
          prop="id"
          label="售后单号"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="orderId"
          label="关联订单"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column
          label="类型"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              :type="isReturnType(row.type) ? 'primary' : 'warning'"
              size="small"
            >
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="退款金额"
          width="110"
          align="right"
        >
          <template #default="{ row }">
            {{ isRefundType(row.type) ? fmtMoney(row.amount ?? row.order?.amount) : '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag
              :type="statusTagType(row.status)"
              size="small"
            >
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="reason"
          label="申请原因"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column
          label="申请时间"
          width="150"
        >
          <template #default="{ row }">
            {{ fmtTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="280"
          fixed="right"
        >
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button
                size="small"
                text
                type="success"
                :disabled="submitting"
                @click="handleAction(row, 'approve')"
              >
                同意
              </el-button>
              <el-button
                size="small"
                text
                type="danger"
                :disabled="submitting"
                @click="handleAction(row, 'reject')"
              >
                拒绝
              </el-button>
            </template>
            <template v-else-if="row.status === 'APPROVED' && isReturnType(row.type)">
              <el-button
                size="small"
                text
                type="danger"
                :disabled="submitting"
                @click="handleInspection(row, false)"
              >
                验收不合格
              </el-button>
              <el-button
                size="small"
                text
                type="success"
                :disabled="submitting"
                @click="handleInspection(row, true)"
              >
                验收入库并退款
              </el-button>
            </template>
            <el-button
              v-else-if="row.status === 'APPROVED' && !isRefundType(row.type)"
              size="small"
              text
              type="success"
              :disabled="submitting"
              @click="handleComplete(row)"
            >
              确认完成
            </el-button>
            <el-button
              size="small"
              text
              type="primary"
              @click="openDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="!error"
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchList"
        @size-change="onFilterChange"
      />
    </section>

    <el-dialog
      v-model="detailDialog"
      title="售后详情"
      width="550px"
    >
      <el-descriptions
        v-if="current"
        :column="2"
        border
        size="small"
      >
        <el-descriptions-item label="售后单号">
          {{ current.id }}
        </el-descriptions-item>
        <el-descriptions-item label="关联订单">
          {{ current.orderId || "—" }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          {{ typeLabel(current.type) }}
        </el-descriptions-item>
        <el-descriptions-item label="退款金额">
          {{ isRefundType(current.type) ? fmtMoney(current.amount ?? current.order?.amount) : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ statusLabel(current.status) }}
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">
          {{ fmtTime(current.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item
          label="申请原因"
          :span="2"
        >
          {{ current.reason || "—" }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="current.logistics"
          label="处理记录"
          :span="2"
        >
          {{ logisticsLabel(current.logistics) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRoute, useRouter } from "vue-router";
import { merchantBackendApi } from "@/api";

/**
 * 售后单行——后端 listAfterSales 返回 AfterSale 原始行 + order:{id,amount,status}。
 * type 真实取值（C 端写入）：refund_only / refund_with_return（历史数据可能存在 refund/return/exchange）。
 * 后端不返回买家昵称（仅 userId），买家列不展示。
 */
interface AfterSalesRow {
  id: string;
  orderId?: string;
  type?: string;
  amount?: number | string | null;
  status?: string;
  reason?: string;
  createdAt?: string;
  logistics?: string | null;
  order?: { id?: string; amount?: number | string; status?: string } | null;
}

const list = ref<AfterSalesRow[]>([]);
const overviewList = ref<AfterSalesRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref(false);
const filterStatus = ref("");
const filterType = ref("");
const detailDialog = ref(false);
const current = ref<AfterSalesRow | null>(null);
const submitting = ref(false);
const route = useRoute();
const router = useRouter();
const isVisualPreview = import.meta.env.DEV && route.meta?.devPreview === true;

const previewAfterSales: AfterSalesRow[] = [
  {
    id: "AS202607290001",
    orderId: "GX202607240067",
    type: "refund_only",
    amount: 129,
    status: "PENDING",
    reason: "收到的宣纸边角有轻微压痕，希望协商部分退款。",
    createdAt: "2026-07-29T08:15:00.000Z",
    order: { id: "GX202607240067", amount: 129, status: "COMPLETED" },
  },
  {
    id: "AS202607280014",
    orderId: "GX202607220039",
    type: "refund_with_return",
    amount: 599.9,
    status: "APPROVED",
    reason: "紫砂壶尺寸与预期不符，已按退货地址寄回。",
    createdAt: "2026-07-28T04:30:00.000Z",
    logistics: JSON.stringify({ returnAddress: "浙江省杭州市临安区锦城街道 18 号", company: "顺丰速运", logisticsNo: "SF14265009123" }),
    order: { id: "GX202607220039", amount: 599.9, status: "COMPLETED" },
  },
  {
    id: "AS202607270008",
    orderId: "GX202607210018",
    type: "exchange",
    amount: 0,
    status: "PROCESSING",
    reason: "诵读机无法正常连接蓝牙，申请换货。",
    createdAt: "2026-07-27T06:20:00.000Z",
    order: { id: "GX202607210018", amount: 299.9, status: "COMPLETED" },
  },
  {
    id: "AS202607250003",
    orderId: "GX202607180006",
    type: "refund_with_return",
    amount: 899.9,
    status: "COMPLETED",
    reason: "套装重复购买，商品未拆封。",
    createdAt: "2026-07-25T01:10:00.000Z",
    logistics: JSON.stringify({ company: "京东物流", logisticsNo: "JDVA201871209", inspection: "ACCEPTED", remark: "包装完整，已回补库存并完成退款" }),
    order: { id: "GX202607180006", amount: 899.9, status: "REFUNDED" },
  },
];

const statusTabs = [
  { label: "全部售后", value: "" },
  { label: "待处理", value: "PENDING" },
  { label: "处理中", value: "PROCESSING" },
  { label: "待退货验收", value: "APPROVED" },
  { label: "已完成", value: "COMPLETED" },
];

const afterSalesCounts = computed(() => ({
  all: overviewList.value.length,
  pending: overviewList.value.filter((item) => item.status === "PENDING").length,
  approved: overviewList.value.filter((item) => item.status === "APPROVED").length,
  processing: overviewList.value.filter((item) => item.status === "PROCESSING").length,
  completed: overviewList.value.filter((item) => item.status === "COMPLETED").length,
}));
const pendingRefundAmount = computed(() =>
  overviewList.value
    .filter((item) => ["PENDING", "APPROVED", "PROCESSING"].includes(item.status || "") && isRefundType(item.type))
    .reduce((sum, item) => sum + Number(item.amount ?? item.order?.amount ?? 0), 0),
);
const afterSalesMetrics = computed(() => [
  { key: "pending", label: "待处理", value: afterSalesCounts.value.pending, hint: "需要尽快作出首次回应", filter: "PENDING", tone: "urgent" },
  { key: "approved", label: "待验收", value: afterSalesCounts.value.approved, hint: "退回商品等待质检", filter: "APPROVED", tone: "inspection" },
  { key: "processing", label: "处理中", value: afterSalesCounts.value.processing, hint: "换货或协商正在推进", filter: "PROCESSING", tone: "moving" },
  { key: "amount", label: "待处理退款额", value: fmtMoney(pendingRefundAmount.value), hint: `${afterSalesCounts.value.all} 笔售后在本页`, filter: "", tone: "amount" },
]);

/** 类型翻译：覆盖 C 端 canonical 值与历史别名。 */
const TYPE_LABELS: Record<string, string> = {
  refund_only: "仅退款",
  refund_with_return: "退货退款",
  refund: "仅退款",
  return: "退货退款",
  exchange: "换货",
  not_received: "未收到商品申诉",
  not_as_described: "描述不符申诉",
  quality_issue: "质量问题申诉",
  other: "其他售后",
};
function normalizeAfterSaleType(t?: string) {
  const value = String(t || "").trim().toLowerCase();
  if (value === "refund") return "refund_only";
  if (value === "return") return "refund_with_return";
  return value;
}
function typeLabel(t?: string) { return TYPE_LABELS[normalizeAfterSaleType(t)] || t || "—"; }
function isReturnType(t?: string) { return normalizeAfterSaleType(t) === "refund_with_return"; }
function isImmediateRefundType(t?: string) { return normalizeAfterSaleType(t) === "refund_only"; }
function isRefundType(t?: string) { return isImmediateRefundType(t) || isReturnType(t); }

function logisticsLabel(raw?: string | null): string {
  if (!raw) return "—";
  try {
    const data = JSON.parse(raw) as { returnAddress?: string; company?: string; logisticsNo?: string; inspection?: string; remark?: string };
    return [
      data.returnAddress ? `退货地址：${data.returnAddress}` : "",
      data.logisticsNo ? `运单：${data.company || ""} ${data.logisticsNo}` : "",
      data.inspection ? `验收：${data.inspection === "ACCEPTED" ? "合格" : "不合格"}` : "",
      data.remark || "",
    ].filter(Boolean).join("；") || "—";
  } catch {
    return raw;
  }
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "待处理",
  APPROVED: "已同意",
  REJECTED: "已拒绝",
  CANCELLED: "已取消",
  COMPLETED: "已完成",
  PROCESSING: "处理中",
};
function statusLabel(s?: string) { return (s && STATUS_LABELS[s]) || s || "—"; }
function statusTagType(s?: string) {
  return s === "PENDING" ? "warning" : s === "APPROVED" || s === "COMPLETED" ? "success" : s === "REJECTED" ? "danger" : "info";
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
    overviewList.value = previewAfterSales;
    const rows = previewAfterSales.filter((item) =>
      (!filterStatus.value || item.status === filterStatus.value) &&
      (!filterType.value || normalizeAfterSaleType(item.type) === filterType.value),
    );
    list.value = rows;
    total.value = rows.length;
    loading.value = false;
    return;
  }
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value };
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterType.value) params.type = filterType.value;
    const res = await merchantBackendApi.listAfterSales(params);
    // 兼容两种响应包装：{ data: {...} } 或直接返回 data
    const data = (res as { data?: { items?: AfterSalesRow[]; list?: AfterSalesRow[]; data?: AfterSalesRow[]; total?: number } }).data ?? (res as { items?: AfterSalesRow[]; list?: AfterSalesRow[]; data?: AfterSalesRow[]; total?: number });
    list.value = data.items || data.list || data.data || [];
    if (!filterStatus.value && !filterType.value) overviewList.value = list.value;
    total.value = data.total || 0;
  } catch {
    error.value = true;
  } finally { loading.value = false; }
}

function openDetail(row: AfterSalesRow) { current.value = row; detailDialog.value = true; }

async function handleAction(row: AfterSalesRow, action: "approve" | "reject") {
  if (submitting.value) return;
  let remark = "";
  try {
    if (action === "reject") {
      const r = await ElMessageBox.prompt("请输入拒绝原因（将告知买家）", "拒绝售后", {
        inputType: "textarea",
        inputPlaceholder: "拒绝原因",
        inputValidator: (v: string) => (v && v.trim() ? true : "拒绝必须填写原因"),
      });
      remark = (r.value || "").trim();
    } else if (isReturnType(row.type)) {
      const r = await ElMessageBox.prompt(
        "请输入完整退货地址（收件人、电话和详细地址），买家将按此寄回商品。",
        "同意退货退款",
        {
          inputType: "textarea",
          inputPlaceholder: "收件人 电话 省市区详细地址",
          inputValidator: (v: string) => (v && v.trim().length >= 8 ? true : "请填写完整退货地址"),
          confirmButtonText: "确认并发送地址",
        },
      );
      remark = (r.value || "").trim();
    } else if (isImmediateRefundType(row.type)) {
      const amountText = fmtMoney(row.amount ?? row.order?.amount);
      await ElMessageBox.confirm(
        `确认将 ${amountText} 按原支付渠道全额退回买家？此操作不可撤销。`,
        "同意仅退款",
        { type: "warning", confirmButtonText: "确认同意并退款", cancelButtonText: "再想想" },
      );
    } else {
      await ElMessageBox.confirm(`确定同意该${typeLabel(row.type)}申请？`, "同意售后确认", {
        confirmButtonText: "确认同意",
        cancelButtonText: "再想想",
      });
    }
  } catch {
    return;
  }

  submitting.value = true;
  try {
    await merchantBackendApi.processAfterSale(row.id, { action, remark });
    ElMessage.success(
      action === "reject"
        ? "已拒绝该售后申请"
        : isImmediateRefundType(row.type)
          ? "退款已提交原支付渠道"
          : isReturnType(row.type)
            ? "已同意退货，退货地址已发送"
            : "已同意售后申请",
    );
    await fetchList();
  } catch (e) {
    ElMessage.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "操作失败，请重试");
  } finally {
    submitting.value = false;
  }
}

async function handleComplete(row: AfterSalesRow) {
  try {
    await ElMessageBox.confirm(`请确认该${typeLabel(row.type)}事项已实际完成。`, "确认售后完成", {
      confirmButtonText: "确认完成",
    });
  } catch {
    return;
  }
  submitting.value = true;
  try {
    await merchantBackendApi.processAfterSale(row.id, { action: "complete" });
    ElMessage.success("售后已完成");
    await fetchList();
  } catch (e) {
    ElMessage.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "操作失败，请重试");
  } finally {
    submitting.value = false;
  }
}

const inspectionRequestIds = new Map<string, string>();
function inspectionRequestId(id: string) {
  const existing = inspectionRequestIds.get(id);
  if (existing) return existing;
  const value = `return-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  inspectionRequestIds.set(id, value);
  return value;
}

async function handleInspection(row: AfterSalesRow, accepted: boolean) {
  let remark = "";
  try {
    if (accepted) {
      await ElMessageBox.confirm(
        "请确认退货商品已经实际收到且验收合格。确认后将回补库存并按原支付渠道全额退款，此操作不可撤销。",
        "退货验收入库",
        { type: "warning", confirmButtonText: "验收入库并退款" },
      );
      remark = "退货商品验收合格";
    } else {
      const r = await ElMessageBox.prompt("请输入验收不合格原因，该原因会展示给买家。", "验收不合格", {
        inputType: "textarea",
        inputValidator: (v: string) => (v && v.trim() ? true : "请填写验收不合格原因"),
        confirmButtonText: "确认不合格",
      });
      remark = (r.value || "").trim();
    }
  } catch {
    return;
  }
  submitting.value = true;
  try {
    await merchantBackendApi.inspectReturn(row.id, {
      requestId: inspectionRequestId(row.id),
      accepted,
      remark,
    });
    inspectionRequestIds.delete(row.id);
    ElMessage.success(accepted ? "已验收入库，退款已提交" : "已记录验收不合格");
    await fetchList();
  } catch (e) {
    ElMessage.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "验收处理失败");
  } finally {
    submitting.value = false;
  }
}

</script>

<style scoped>
.after-sales-page {
  min-height: 100%;
  padding: 24px;
  color: #312b29;
  background:
    radial-gradient(circle at 92% 0%, rgba(176, 72, 67, .08), transparent 31%),
    linear-gradient(180deg, #f8f5f1 0, #f2eee8 100%);
}
.hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  overflow: hidden;
  padding: 34px 36px;
  border: 1px solid rgba(99, 48, 45, .18);
  border-radius: 22px;
  color: #fff9f6;
  background:
    radial-gradient(circle at 86% 25%, rgba(232, 177, 118, .26), transparent 25%),
    linear-gradient(132deg, #4e2626 0%, #7f3c35 58%, #9b6a43 125%);
  box-shadow: 0 18px 42px rgba(85, 42, 39, .15);
}
.hero::after {
  position: absolute;
  right: -52px;
  bottom: -96px;
  width: 260px;
  height: 260px;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 50%;
  box-shadow: 0 0 0 38px rgba(255,255,255,.03), 0 0 0 76px rgba(255,255,255,.02);
  content: "";
}
.hero-copy, .hero-actions { position: relative; z-index: 1; }
.eyebrow { margin: 0 0 8px; color: #e7bd88; font-size: 12px; font-weight: 700; letter-spacing: .16em; }
.eyebrow.dark { color: #9e654c; }
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
  border: 1px solid #e6ddd7;
  border-radius: 17px;
  text-align: left;
  color: #3b302e;
  background: rgba(255,255,255,.88);
  box-shadow: 0 8px 24px rgba(69, 48, 43, .055);
  cursor: pointer;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}
.metric:hover, .metric.active { transform: translateY(-2px); border-color: #bd826c; box-shadow: 0 12px 28px rgba(69,48,43,.1); }
.metric::after { position: absolute; right: -26px; top: -34px; width: 108px; height: 108px; border-radius: 50%; background: var(--metric-glow, #f5e9e5); content: ""; }
.metric span, .metric strong, .metric small { position: relative; z-index: 1; display: block; }
.metric span { color: #756b68; font-size: 13px; }
.metric strong { margin: 9px 0 5px; font-family: Georgia, "Times New Roman", serif; font-size: 30px; font-weight: 600; }
.metric small { color: #9d9692; }
.metric.urgent { --metric-glow: #f5d8d4; }
.metric.urgent strong { color: #ae453b; }
.metric.inspection { --metric-glow: #f3e2cf; }
.metric.inspection strong { color: #9c653d; }
.metric.moving { --metric-glow: #dfeae8; }
.metric.moving strong { color: #2c635b; }
.metric.amount { --metric-glow: #f0e4cf; }
.metric.amount strong { color: #8a5739; }
.service-route, .workspace {
  border: 1px solid #e7ded7;
  border-radius: 20px;
  background: rgba(255,255,255,.88);
  box-shadow: 0 10px 28px rgba(69,48,43,.055);
}
.service-route { display: grid; grid-template-columns: 280px 1fr; gap: 24px; padding: 24px 26px; }
.service-route h2, .workspace h2 { margin: 0; font-family: "Noto Serif SC", "Songti SC", serif; font-size: 21px; }
.route-copy > span { display: block; margin-top: 8px; color: #928985; font-size: 13px; }
.route-track { display: grid; grid-template-columns: repeat(4, 1fr); }
.route-track > div { position: relative; display: flex; flex-direction: column; min-width: 0; padding: 7px 26px 7px 20px; border-left: 1px solid #eee5df; }
.route-track > div::after { position: absolute; right: 8px; top: 50%; color: #ccb29d; content: "›"; transform: translateY(-50%); }
.route-track > div:last-child::after { display: none; }
.route-track i { color: #ad7158; font-family: Georgia, serif; font-size: 12px; font-style: normal; }
.route-track b { margin: 5px 0 4px; font-size: 15px; }
.route-track span { overflow: hidden; color: #99908c; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.workspace { margin-top: 18px; padding: 22px; }
.workspace-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 14px; }
.header-right { display: flex; flex-wrap: wrap; gap: 10px; }
.status-tabs { display: inline-flex; gap: 5px; margin-bottom: 16px; padding: 5px; border-radius: 12px; background: #f2ece8; }
.status-tabs button { padding: 8px 15px; border: 0; border-radius: 9px; color: #7c716d; background: transparent; cursor: pointer; }
.status-tabs button.active { color: #fff; background: #7b3d36; box-shadow: 0 5px 12px rgba(123,61,54,.18); }
@media (max-width: 1080px) {
  .metrics { grid-template-columns: repeat(2, 1fr); }
  .service-route { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .after-sales-page { padding: 14px; }
  .hero { align-items: flex-start; flex-direction: column; padding: 26px 22px; }
  .hero-actions { justify-content: flex-start; }
  .metrics { grid-template-columns: 1fr 1fr; }
  .route-track { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .route-track > div { border: 1px solid #eee5df; border-radius: 12px; }
  .workspace-head { align-items: flex-start; flex-direction: column; }
  .status-tabs { max-width: 100%; overflow-x: auto; }
  .status-tabs button { white-space: nowrap; }
}
</style>
