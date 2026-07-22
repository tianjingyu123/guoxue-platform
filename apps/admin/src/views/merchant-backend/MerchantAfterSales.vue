<template>
  <div class="page">
    <div class="page-header">
      <h3>售后管理</h3>
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
          <el-option label="换货" value="exchange" />
          <el-option label="交易申诉" value="other" />
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
            <el-button size="small" text type="danger" :disabled="submitting" @click="handleInspection(row, false)">
              验收不合格
            </el-button>
            <el-button size="small" text type="success" :disabled="submitting" @click="handleInspection(row, true)">
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
        <el-descriptions-item v-if="current.logistics" label="处理记录" :span="2">
          {{ logisticsLabel(current.logistics) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
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
    if (filterType.value) params.type = filterType.value;
    const res = await merchantBackendApi.listAfterSales(params);
    // 兼容两种响应包装：{ data: {...} } 或直接返回 data
    const data = (res as { data?: { items?: AfterSalesRow[]; list?: AfterSalesRow[]; data?: AfterSalesRow[]; total?: number } }).data ?? (res as { items?: AfterSalesRow[]; list?: AfterSalesRow[]; data?: AfterSalesRow[]; total?: number });
    list.value = data.items || data.list || data.data || [];
    total.value = data.total || 0;
  } catch (e) {
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
.page { padding: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.header-right { display: flex; gap: 12px; }
</style>
