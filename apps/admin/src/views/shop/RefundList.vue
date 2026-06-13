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
          <span class="value">{{ stats.totalProcessed }}</span><span class="label">累计处理</span>
        </div>
      </el-col>
    </el-row>

    <!-- 筛选 -->
    <div class="filter-bar">
      <el-input
        v-model="search.orderNo"
        placeholder="订单号"
        clearable
        style="width:180px"
        @change="fetchList"
      />
      <el-input
        v-model="search.userId"
        placeholder="用户ID/昵称"
        clearable
        style="width:160px"
        @change="fetchList"
      />
      <el-date-picker
        v-model="search.dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        size="default"
        style="width:260px"
        @change="fetchList"
      />
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

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        label="订单号"
        prop="orderNo"
        width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="用户"
        width="130"
      >
        <template #default="{ row }">
          {{ row.user?.nickname || row.userId }}
        </template>
      </el-table-column>
      <el-table-column
        label="商品/课程"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.product?.title || row.course?.title || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="退款金额"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ fmt(row.amount || row.refundAmount) }}
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
              @click="showApproveConfirm(row)"
            >
              同意退款
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="showReject(row)"
            >
              拒绝
            </el-button>
          </template>
          <template v-else>
            <span
              v-if="row.auditNote"
              class="reason text-muted"
            >{{ row.auditNote }}</span>
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
          {{ approveTarget?.orderNo }}
        </el-descriptions-item>
        <el-descriptions-item label="退款金额">
          ¥{{ fmt(approveTarget?.amount || approveTarget?.refundAmount) }}
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
import { orderApi } from "@/api";

const loading = ref(false);
const processing = ref(false);
const activeTab = ref("PENDING");
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const search = reactive({ orderNo: "", userId: "", dateRange: null as any });

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

onMounted(() => { fetchList(); fetchStats(); });

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value, status: activeTab.value };
    if (search.orderNo) params.orderNo = search.orderNo;
    if (search.userId) params.userId = search.userId;
    if (search.dateRange?.length === 2) {
      params.startDate = search.dateRange[0].toISOString().slice(0, 10);
      params.endDate = search.dateRange[1].toISOString().slice(0, 10);
    }
    const { data } = await orderApi.list(params);
    list.value = data?.orders || data?.data || [];
    total.value = data?.total || 0;
  } catch {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

async function fetchStats() {
  try {
    // 统计各状态退款单数
    const [pendingRes, approvedRes] = await Promise.all([
      orderApi.list({ page: 1, pageSize: 1, status: "PENDING" }),
      orderApi.list({ page: 1, pageSize: 1, status: "REFUNDED" }),
    ]);
    stats.pending = (pendingRes.data as any)?.total || 0;
    stats.totalProcessed = (approvedRes.data as any)?.total || 0;

    // 估算待处理金额
    if (stats.pending > 0) {
      const pendingList = await orderApi.list({ page: 1, pageSize: Math.min(stats.pending, 100), status: "PENDING" });
      const items = (pendingList.data as any)?.orders || (pendingList.data as any)?.data || [];
      stats.pendingAmount = items.reduce((s: number, r: any) => s + Number(r.amount || r.refundAmount || 0), 0);
    } else {
      stats.pendingAmount = 0;
    }

    // 今日退款
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      const todayRes = await orderApi.list({ page: 1, pageSize: 1, status: "REFUNDED", startDate: todayStr, endDate: todayStr });
      const todayData = todayRes.data as any;
      if (todayData?.total) {
        const todayItems = await orderApi.list({ page: 1, pageSize: Math.min((todayData as any).total, 100), status: "REFUNDED", startDate: todayStr, endDate: todayStr });
        const todayList = (todayItems.data as any)?.orders || (todayItems.data as any)?.data || [];
        stats.todayRefund = todayList.reduce((s: number, r: any) => s + Number(r.amount || r.refundAmount || 0), 0);
      }
    } catch { stats.todayRefund = 0; }
  } catch { /* ignore */ }
}

function showApproveConfirm(row: any) {
  approveTarget.value = row;
  approveVisible.value = true;
}

async function confirmApprove() {
  if (!approveTarget.value) return;
  processing.value = true;
  try {
    await orderApi.refund(approveTarget.value.id);
    ElMessage.success("退款已同意，资金将原路退回");
    approveVisible.value = false;
    await fetchList();
    await fetchStats();
  } catch { /* ignore */ } finally { processing.value = false; }
}

function showReject(row: any) {
  pendingItem.value = row;
  rejectReason.value = "";
  rejectVisible.value = true;
}

async function confirmReject() {
  if (!pendingItem.value) return;
  processing.value = true;
  try {
    await orderApi.cancel(pendingItem.value.id);
    ElMessage.success("已拒绝退款");
    rejectVisible.value = false;
    await fetchList();
    await fetchStats();
  } catch { /* ignore */ } finally { processing.value = false; }
}

function exportCSV() {
  const headers = ["订单号", "用户", "商品/课程", "退款金额", "退款原因", "状态", "申请时间"];
  const rows = list.value.map((r) => [
    r.orderNo, r.user?.nickname || r.userId, r.product?.title || r.course?.title || "-",
    r.amount || r.refundAmount, r.reason || "-", activeTab.value, formatDate(r.createdAt),
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

.stat-card { background: #f5f7fa; border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: all .2s; border: 2px solid transparent; }
.stat-card:hover { border-color: #409eff; }
.stat-card.active { border-color: #e6a23c; background: #fdf6ec; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; }
.stat-card .label { display: block; font-size: 13px; color: #909399; margin-top: 4px; }
.stat-card.amount .value { color: #f56c6c; }

.filter-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }

.reason { font-size: 12px; }
.text-muted { color: #909399; }
</style>
