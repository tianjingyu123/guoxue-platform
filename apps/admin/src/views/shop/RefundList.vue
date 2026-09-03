<template>
  <div class="refund-page">
    <div class="page-header">
      <h3>退款审核</h3>
      <div>
        <el-button
          size="small"
          @click="exportCSV"
        >
          导出CSV
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="6">
        <div
          class="stat-card pending"
          :class="{ active: activeTab === 'PENDING' }"
          @click="activeTab = 'PENDING'; fetchList()"
        >
          <span class="value">{{ stats.pending }}</span><span class="label">待处理退款</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card amount">
          <span class="value">¥{{ fmt(stats.pendingAmount) }}</span><span class="label">待处理金额（近100条口径）</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">¥{{ fmt(stats.todayRefund) }}</span><span class="label">今日退款（近100条口径）</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ stats.totalProcessed }}</span><span class="label">累计已通过</span>
        </div>
      </el-col>
    </el-row>

    <!-- 状态筛选 -->
    <div class="filter-bar">
      <el-tabs
        v-model="activeTab"
        style="flex:1"
        @tab-change="fetchList"
      >
        <el-tab-pane
          label="待处理"
          name="PENDING"
        />
        <el-tab-pane
          label="退款中"
          name="PROCESSING"
        />
        <el-tab-pane
          label="已同意"
          name="APPROVED"
        />
        <el-tab-pane
          label="已完成"
          name="COMPLETED"
        />
        <el-tab-pane
          label="已拒绝"
          name="REJECTED"
        />
      </el-tabs>
    </div>

    <!-- 错误态 -->
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

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无售后申请" />
      </template>
      <el-table-column
        label="订单号"
        width="200"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.orderId || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="用户"
        width="160"
      >
        <template #default="{ row }">
          <template v-if="row.user?.nickname">
            <router-link
              class="user-link"
              :to="`/users/${row.userId}`"
            >
              {{ row.user.nickname }}
            </router-link>
          </template>
          <template v-else-if="row.userId">
            <el-tooltip
              :content="row.userId"
              placement="top"
            >
              <router-link
                class="user-link mono"
                :to="`/users/${row.userId}`"
              >
                {{ row.userId.slice(0, 8) }}…
              </router-link>
            </el-tooltip>
            <el-button
              size="small"
              link
              type="primary"
              @click.stop="copyText(row.userId)"
            >
              复制
            </el-button>
          </template>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="90"
      >
        <template #default="{ row }">
          {{ typeLabel(row.type) }}
        </template>
      </el-table-column>
      <el-table-column
        label="售后金额"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          {{ isRefundType(row.type) ? `¥${fmt(row.amount)}` : '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="申请原因"
        min-width="150"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.reason || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="申请时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="240"
        fixed="right"
      >
        <template #default="{ row }">
          <template v-if="activeTab === 'PENDING'">
            <el-button
              size="small"
              type="success"
              :disabled="processing"
              @click="showApproveConfirm(row)"
            >
              {{ approvalButtonLabel(row.type) }}
            </el-button>
            <el-button
              size="small"
              type="danger"
              :disabled="processing"
              @click="showReject(row)"
            >
              拒绝
            </el-button>
          </template>
          <template v-else-if="activeTab === 'APPROVED' && isReturnRefundType(row.type)">
            <el-tag
              type="warning"
              size="small"
            >
              等待买家退货/商家验收
            </el-tag>
          </template>
          <el-button
            v-else-if="activeTab === 'APPROVED' && !isRefundType(row.type)"
            size="small"
            type="success"
            plain
            :disabled="processing"
            @click="confirmComplete(row)"
          >
            确认完成
          </el-button>
          <span
            v-else-if="row.logistics"
            class="reason text-muted"
          >{{ logisticsLabel(row.logistics) }}</span>
          <el-tag
            v-else
            :type="activeTab === 'COMPLETED' ? 'success' : activeTab === 'REJECTED' ? 'danger' : 'info'"
            size="small"
          >
            {{ statusLabel(activeTab) }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @change="fetchList"
      />
    </div>

    <!-- 同意退款确认弹窗 -->
    <el-dialog
      v-model="approveVisible"
      :title="isReturnRefundType(approveTarget?.type) ? '同意退货退款' : isImmediateRefundType(approveTarget?.type) ? '确认退款' : '同意售后'"
      width="450px"
    >
      <el-descriptions
        :column="1"
        border
        size="small"
      >
        <el-descriptions-item label="订单号">
          {{ approveTarget?.orderId }}
        </el-descriptions-item>
        <el-descriptions-item label="售后金额">
          {{ isRefundType(approveTarget?.type) ? `¥${fmt(approveTarget?.amount)}` : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="退款原因">
          {{ approveTarget?.reason || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="用户">
          {{ approveTarget?.user?.nickname || approveTarget?.userId }}
        </el-descriptions-item>
      </el-descriptions>
      <p
        v-if="isImmediateRefundType(approveTarget?.type)"
        class="danger-hint"
      >
        此操作真金退款不可逆：确认后将向用户真金退款 ¥{{ fmt(approveTarget?.amount) }}，资金原路退回支付渠道。
      </p>
      <template v-else-if="isReturnRefundType(approveTarget?.type)">
        <p style="margin-top:12px; color:#e6a23c">
          同意后先由买家退货，不会立即退款；商家验收入库后才触发原路退款。
        </p>
        <el-input
          v-model="returnAddress"
          type="textarea"
          :rows="3"
          placeholder="必填：收件人、电话和完整退货地址"
        />
      </template>
      <p
        v-else
        style="margin-top:12px; color:#e6a23c"
      >
        该申请为{{ typeLabel(approveTarget?.type ?? '') }}，同意后不发生退款，仅流转售后状态。
      </p>
      <template #footer>
        <el-button @click="approveVisible = false">
          取消
        </el-button>
        <el-button
          type="success"
          :loading="processing"
          @click="confirmApprove"
        >
          {{ isImmediateRefundType(approveTarget?.type) ? '确认退款' : isReturnRefundType(approveTarget?.type) ? '确认并发送地址' : '确认同意' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 拒绝退款弹窗 -->
    <el-dialog
      v-model="rejectVisible"
      title="拒绝退款"
      width="450px"
    >
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="3"
        placeholder="请填写拒绝原因（必填）"
      />
      <template #footer>
        <el-button @click="rejectVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :disabled="!rejectReason.trim()"
          :loading="processing"
          @click="confirmReject"
        >
          确认拒绝
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/api";
import { downloadCsvRows } from "@/utils/export";

// 退款审核基于「售后申请(AfterSale)」实体：其 status 枚举(PENDING/APPROVED/REJECTED/...)
// 与本页标签完全对应，且平台侧仅 AfterSale 有「带原因拒绝退款」的真实端点
// (PUT /shop/admin/after-sales/:id/process)。订单(Order)无平台级拒绝退款端点。

/** 退款/售后申请行（字段宽松 optional） */
interface RefundRow {
  id?: string;
  orderId?: string;
  userId?: string;
  user?: { nickname?: string };
  type?: string;
  amount?: number | string;
  reason?: string;
  status?: string;
  logistics?: string;
  createdAt?: string;
  updatedAt?: string;
}
/** 售后列表响应（解包后） */
interface AfterSaleListResp { items?: RefundRow[]; total?: number }

const loading = ref(false);
const error = ref(false);
const processing = ref(false);
const activeTab = ref("PENDING");
const list = ref<RefundRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const stats = reactive({ pending: 0, pendingAmount: 0, todayRefund: 0, totalProcessed: 0 });

const approveVisible = ref(false);
const approveTarget = ref<RefundRow | null>(null);
const returnAddress = ref("");
const rejectVisible = ref(false);
const rejectReason = ref("");
const pendingItem = ref<RefundRow | null>(null);

function fmt(v: number | string | undefined | null) {
  if (v === null || v === undefined) return "0.00";
  return Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(d: string) {
  return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-";
}
/** 售后类型翻译与资金动作判定：兼容历史别名。 */
function normalizeAfterSaleType(t?: string | null) {
  const value = String(t || "").trim().toLowerCase();
  if (value === "refund") return "refund_only";
  if (value === "return") return "refund_with_return";
  return value;
}
function typeLabel(t: string) {
  return ({
    refund_only: "仅退款",
    refund_with_return: "退货退款",
    exchange: "换货",
    not_received: "未收到商品申诉",
    not_as_described: "描述不符申诉",
    quality_issue: "质量问题申诉",
    other: "其他售后",
  } as Record<string, string>)[normalizeAfterSaleType(t)] || t || "售后";
}
function isImmediateRefundType(t?: string | null) {
  return normalizeAfterSaleType(t) === "refund_only";
}
function isReturnRefundType(t?: string | null) {
  return normalizeAfterSaleType(t) === "refund_with_return";
}
function isRefundType(t?: string | null) {
  return isImmediateRefundType(t) || isReturnRefundType(t);
}
function approvalButtonLabel(t?: string | null) {
  if (isImmediateRefundType(t)) return "同意并退款";
  if (isReturnRefundType(t)) return "同意退货";
  return "同意申请";
}
function statusLabel(status?: string | null) {
  return ({ APPROVED: "已同意", PROCESSING: "退款处理中", COMPLETED: "已完成", REJECTED: "已拒绝" } as Record<string, string>)[status || ""] || status || "—";
}
function logisticsLabel(raw?: string | null) {
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

onMounted(() => { fetchList(); fetchStats(); });

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params = { page: page.value, pageSize: pageSize.value, status: activeTab.value };
    const { data } = await api.get("/shop/admin/after-sales", { params });
    list.value = (data as AfterSaleListResp)?.items || [];
    total.value = (data as AfterSaleListResp)?.total || 0;
  } catch {
    list.value = [];
    total.value = 0;
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function fetchStats() {
  try {
    const pendingRes = await api.get("/shop/admin/after-sales", { params: { page: 1, pageSize: 100, status: "PENDING" } });
    const pendingItems = (pendingRes.data as AfterSaleListResp)?.items || [];
    stats.pending = (pendingRes.data as AfterSaleListResp)?.total ?? pendingItems.length;
    stats.pendingAmount = pendingItems.filter((r) => isRefundType(r.type)).reduce((s: number, r: RefundRow) => s + Number(r.amount || 0), 0);

    const approvedRes = await api.get("/shop/admin/after-sales", { params: { page: 1, pageSize: 100, status: "COMPLETED" } });
    const approvedItems = (approvedRes.data as AfterSaleListResp)?.items || [];
    stats.totalProcessed = (approvedRes.data as AfterSaleListResp)?.total ?? approvedItems.length;

    const todayStr = new Date().toISOString().slice(0, 10);
    stats.todayRefund = approvedItems
      .filter((r: RefundRow) => isRefundType(r.type) && String(r.updatedAt || r.createdAt || "").slice(0, 10) === todayStr)
      .reduce((s: number, r: RefundRow) => s + Number(r.amount || 0), 0);
  } catch { /* 统计失败不阻塞主流程 */ }
}

function showApproveConfirm(row: RefundRow) {
  approveTarget.value = row;
  returnAddress.value = "";
  approveVisible.value = true;
}

async function confirmApprove() {
  if (!approveTarget.value || processing.value) return;
  const target = approveTarget.value;
  const address = returnAddress.value.trim();
  if (isReturnRefundType(target.type) && address.length < 8) {
    ElMessage.warning("请填写完整退货地址");
    return;
  }
  processing.value = true;
  try {
    await api.put(`/shop/admin/after-sales/${target.id}/process`, {
      action: "approve",
      remark: isReturnRefundType(target.type) ? address : undefined,
    });
    ElMessage.success(
      isImmediateRefundType(target.type)
        ? "退款已提交原支付渠道"
        : isReturnRefundType(target.type)
          ? "已同意退货，退货地址已发送"
          : "售后已同意",
    );
    approveVisible.value = false;
    await fetchList();
    await fetchStats();
  } catch (e) {
    ElMessage.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "操作失败，请重试");
  } finally {
    processing.value = false;
  }
}

async function confirmComplete(row: RefundRow) {
  if (processing.value) return;
  processing.value = true;
  try {
    await api.put(`/shop/admin/after-sales/${row.id}/process`, { action: "complete" });
    ElMessage.success("售后已完成");
    await fetchList();
    await fetchStats();
  } catch (e) {
    ElMessage.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "操作失败，请重试");
  } finally {
    processing.value = false;
  }
}

function showReject(row: RefundRow) {
  pendingItem.value = row;
  rejectReason.value = "";
  rejectVisible.value = true;
}

async function confirmReject() {
  if (!pendingItem.value || processing.value) return;
  const reason = rejectReason.value.trim();
  if (!reason) return;
  processing.value = true;
  try {
    // 拒绝退款：调用真实的售后处理端点并传递拒绝原因（原误调 orderApi.cancel 会取消订单且丢弃原因）。
    await api.put(`/shop/admin/after-sales/${pendingItem.value.id}/process`, { action: "reject", remark: reason });
    ElMessage.success("已拒绝退款");
    rejectVisible.value = false;
    await fetchList();
    await fetchStats();
  } catch {
    ElMessage.error("操作失败，请重试");
  } finally { processing.value = false; }
}

function exportCSV() {
  const headers = ["订单号", "用户", "类型", "退款金额", "退款原因", "状态", "申请时间"];
  const rows = list.value.map((r) => [
    r.orderId, r.user?.nickname || r.userId, typeLabel(r.type ?? ""),
    r.amount, r.reason || "-", activeTab.value, formatDate(r.createdAt ?? ""),
  ]);
  downloadCsvRows(`退款记录_${new Date().toISOString().slice(0, 10)}`, [headers, ...rows]);
  ElMessage.success("导出成功");
}
</script>

<style scoped>
.refund-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }

.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: all .2s; border: 2px solid transparent; }
.stat-card:hover { border-color: var(--color-info); }
.stat-card.active { border-color: var(--color-warning); background: #fdf6ec; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; }
.stat-card .label { display: block; font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }
.stat-card.amount .value { color: var(--color-error); }

.filter-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }

.reason { font-size: 12px; }
.text-muted { color: var(--color-text-secondary); }
.user-link { color: var(--el-color-primary, #409eff); text-decoration: none; }
.user-link:hover { text-decoration: underline; }
.mono { font-family: monospace; }
.danger-hint { margin-top: 12px; color: var(--color-error, #f56c6c); font-size: 13px; }
</style>
