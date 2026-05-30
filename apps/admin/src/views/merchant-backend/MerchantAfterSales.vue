<template>
  <div class="page">
    <div class="page-header">
      <h3>售后管理</h3>
      <div class="header-right">
        <el-select v-model="filterType" placeholder="全部类型" clearable style="width:120px" @change="fetchList">
          <el-option label="退款" value="refund" />
          <el-option label="退货" value="return" />
          <el-option label="换货" value="exchange" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width:120px" @change="fetchList">
          <el-option label="待处理" value="PENDING" />
          <el-option label="已同意" value="APPROVED" />
          <el-option label="已拒绝" value="REJECTED" />
          <el-option label="已完成" value="COMPLETED" />
        </el-select>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="订单号" width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ row.order?.id || row.orderId }}</template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.type === 'refund' ? 'danger' : row.type === 'return' ? 'warning' : ''">
            {{ ({ refund: "退款", return: "退货", exchange: "换货" } as any)[row.type] || row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ Number(row.amount || row.order?.amount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="180" show-overflow-tooltip />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="申请时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'PENDING'">
            <el-button size="small" text type="success" @click="processAfterSale(row, 'approve')">同意</el-button>
            <el-button size="small" text type="danger" @click="processAfterSale(row, 'reject')">拒绝</el-button>
          </template>
          <el-button v-if="row.status === 'APPROVED'" size="small" text type="primary" @click="processAfterSale(row, 'complete')">完成</el-button>
          <span v-else-if="row.status !== 'PENDING'" style="color:#ccc">-</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      @current-change="fetchList"
      style="margin-top:16px;justify-content:flex-end"
    />

    <!-- 处理 dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="450px">
      <el-form label-width="80px">
        <el-form-item label="备注">
          <el-input v-model="remark" type="textarea" :rows="3" placeholder="可选备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doProcess">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { merchantBackendApi } from "@/api";

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const saving = ref(false);
const filterType = ref("");
const filterStatus = ref("");

const dialogVisible = ref(false);
const dialogTitle = ref("");
const currentId = ref("");
const currentAction = ref("");
const remark = ref("");

const STATUS_MAP: Record<string, string> = {
  PENDING: "待处理", APPROVED: "已同意", REJECTED: "已拒绝", CANCELLED: "已取消", COMPLETED: "已完成",
};
function statusLabel(s: string) { return STATUS_MAP[s] || s; }
function statusType(s: string) {
  return { PENDING: "warning", APPROVED: "success", REJECTED: "danger", COMPLETED: "" }[s] || "info";
}
function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: 20 };
    if (filterType.value) params.type = filterType.value;
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await merchantBackendApi.listAfterSales(params);
    const data = (res as any).data ?? res;
    list.value = data.list || data.data || [];
    total.value = data.total || 0;
  } finally { loading.value = false; }
}

function processAfterSale(row: any, action: string) {
  currentId.value = row.id;
  currentAction.value = action;
  remark.value = "";
  dialogTitle.value = { approve: "同意售后", reject: "拒绝售后", complete: "完成售后" }[action] || "处理";
  dialogVisible.value = true;
}

async function doProcess() {
  saving.value = true;
  try {
    await merchantBackendApi.processAfterSale(currentId.value, { action: currentAction.value, remark: remark.value });
    ElMessage.success("操作成功");
    dialogVisible.value = false;
    fetchList();
  } catch { /* */ } finally { saving.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.header-right { display: flex; gap: 12px; }
</style>
