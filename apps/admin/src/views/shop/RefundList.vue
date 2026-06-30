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
          <span class="value">¥{{ fmt(stats.pendingAmount) }}</span><span class="label">待处理金额</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">¥{{ fmt(stats.todayRefund) }}</span><span class="label">今日退款</span>
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
          label="已同意"
          name="APPROVED"
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
        <el-empty description="暂无退款申请" />
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
          {{ row.user?.nickname || row.userId }}
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
        label="退款金额"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ fmt(row.amount) }}
        </template>
      </el-table-column>
      <el-table-column
        label="退款原因"
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
        width="200"
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
              同意退款
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
          <template v-else>
            <span
              v-if="row.logistics"
              class="reason text-muted"
            >{{ row.logistics }}</span>
            <el-tag
              v-else-if="activeTab === 'APPROVED'"
              type="success"
              size="small"
            >
              已同意
            </el-tag>
            <el-tag
              v-else
              type="danger"
              size="small"
            >
              已拒绝
            </el-tag>
          </template>
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
      title="确认退款"
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
        <el-descriptions-item label="退款金额">
          ¥{{ fmt(approveTarget?.amount) }}
        </el-descriptions-item>
        <el-descriptions-item label="退款原因">
          {{ approveTarget?.reason || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="用户">
          {{ approveTarget?.user?.nickname || approveTarget?.userId }}
        </el-descriptions-item>
      </el-descriptions>
      <p style="margin-top:12px; color:#e6a23c">
        ⚠️ 确认后将执行退款，资金将原路退回，此操作不可撤销。
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
          确认退款
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
import { orderApi, api } from "@/api";

// 退款审核基于「售后申请(AfterSale)」实体：其 status 枚举(PENDING/APPROVED/REJECTED/...)
// 与本页标签完全对应，且平台侧仅 AfterSale 有「带原因拒绝退款」的真实端点
// (PUT /shop/admin/after-sales/:id/process)。订单(Order)无平台级拒绝退款端点。

const loading = ref(false);
const error = ref(false);
const processing = ref(false);
const activeTab = ref("PENDING");
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const stats = reactive({ pending: 0, pendingAmount: 0, todayRefund: 0, totalProcessed: 0 });

const approveVisible = ref(false);
const approveTarget = ref<any>(null);
const rejectVisible = ref(false);
const rejectReason = ref("");
const pendingItem = ref<any>(null);

function fmt(v: number | string | undefined | null) {
  if (v === null || v === undefined) return "0.00";
  return Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(d: string) {
  return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-";
}
function typeLabel(t: string) {
  return ({ refund: "退款", return: "退货", exchange: "换货" } as Record<string, string>)[t] || t || "退款";
}

onMounted(() => { fetchList(); fetchStats(); });

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params = { page: page.value, pageSize: pageSize.value, status: activeTab.value };
    const { data } = await api.get("/shop/admin/after-sales", { params });
    list.value = (data as any)?.items || [];
    total.value = (data as any)?.total || 0;
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
    const pendingItems = (pendingRes.data as any)?.items || [];
    stats.pending = (pendingRes.data as any)?.total ?? pendingItems.length;
    stats.pendingAmount = pendingItems.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

    const approvedRes = await api.get("/shop/admin/after-sales", { params: { page: 1, pageSize: 100, status: "APPROVED" } });
    const approvedItems = (approvedRes.data as any)?.items || [];
    stats.totalProcessed = (approvedRes.data as any)?.total ?? approvedItems.length;

    const todayStr = new Date().toISOString().slice(0, 10);
    stats.todayRefund = approvedItems
      .filter((r: any) => String(r.updatedAt || r.createdAt || "").slice(0, 10) === todayStr)
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  } catch { /* 统计失败不阻塞主流程 */ }
}

function showApproveConfirm(row: any) {
  approveTarget.value = row;
  approveVisible.value = true;
}

async function confirmApprove() {
  if (!approveTarget.value || processing.value) return;
  processing.value = true;
  try {
    // 同意退款：先对订单执行真实退款（原路退回 + 冲正分佣），再将售后单标记为已通过。
    await orderApi.refund(approveTarget.value.orderId);
    await api.put(`/shop/admin/after-sales/${approveTarget.value.id}/process`, { action: "approve" });
    ElMessage.success("退款已同意，资金将原路退回");
    approveVisible.value = false;
    await fetchList();
    await fetchStats();
  } catch {
    ElMessage.error("操作失败，请重试");
  } finally { processing.value = false; }
}

function showReject(row: any) {
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
    r.orderId, r.user?.nickname || r.userId, typeLabel(r.type),
    r.amount, r.reason || "-", activeTab.value, formatDate(r.createdAt),
  ]);
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `退款记录_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
</style>
