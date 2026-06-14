<template>
  <div class="page">
    <div class="page-header">
      <h3>售后管理</h3>
      <div class="header-right">
        <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width:140px" @change="fetchList">
          <el-option label="待处理" value="PENDING" />
          <el-option label="已同意" value="APPROVED" />
          <el-option label="已拒绝" value="REJECTED" />
          <el-option label="已完成" value="COMPLETED" />
        </el-select>
        <el-select v-model="filterType" placeholder="全部类型" clearable style="width:120px" @change="fetchList">
          <el-option label="退款" value="REFUND" />
          <el-option label="退货退款" value="RETURN" />
          <el-option label="换货" value="EXCHANGE" />
        </el-select>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="id" label="售后单号" width="200" show-overflow-tooltip />
      <el-table-column prop="orderId" label="关联订单" width="200" show-overflow-tooltip />
      <el-table-column prop="buyerName" label="买家" width="100" />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag :type="row.type === 'REFUND' ? 'warning' : row.type === 'RETURN' ? '' : 'info'" size="small">
            {{ ({ REFUND: "退款", RETURN: "退货退款", EXCHANGE: "换货" } as any)[row.type] || row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ Number(row.amount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'PENDING' ? 'warning' : row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'info'" size="small">
            {{ ({ PENDING: "待处理", APPROVED: "已同意", REJECTED: "已拒绝", COMPLETED: "已完成" } as any)[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="160" show-overflow-tooltip />
      <el-table-column label="申请时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'PENDING'" size="small" text type="success" @click="handleAction(row, 'APPROVED')">同意</el-button>
          <el-button v-if="row.status === 'PENDING'" size="small" text type="danger" @click="handleAction(row, 'REJECTED')">拒绝</el-button>
          <el-button size="small" text type="primary" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end" @current-change="fetchList" />

    <el-dialog v-model="detailDialog" title="售后详情" width="550px">
      <el-descriptions v-if="current" :column="2" border size="small">
        <el-descriptions-item label="售后单号">{{ current.id }}</el-descriptions-item>
        <el-descriptions-item label="关联订单">{{ current.orderId }}</el-descriptions-item>
        <el-descriptions-item label="买家">{{ current.buyerName }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ current.type }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ Number(current.amount || 0).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ current.status }}</el-descriptions-item>
        <el-descriptions-item label="原因" :span="2">{{ current.reason }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { merchantBackendApi } from "@/api";

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const filterStatus = ref("");
const filterType = ref("");
const detailDialog = ref(false);
const current = ref<any>(null);

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: 20 };
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterType.value) params.type = filterType.value;
    const res = await merchantBackendApi.listAfterSales(params);
    const data = (res as any).data ?? res;
    list.value = data.list || data.data || [];
    total.value = data.total || 0;
  } finally { loading.value = false; }
}

function openDetail(row: any) { current.value = row; detailDialog.value = true; }

async function handleAction(row: any, action: string) {
  const label = action === "APPROVED" ? "同意" : "拒绝";
  try {
    await ElMessageBox.confirm(`确认${label}该售后申请？`, "操作确认", { type: "warning" });
    await (merchantBackendApi as any).handleAfterSale?.(row.id, { action });
    ElMessage.success(`${label}成功`);
    fetchList();
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.header-right { display: flex; gap: 12px; }
</style>
