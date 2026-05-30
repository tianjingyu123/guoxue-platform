<template>
  <div class="page">
    <div class="toolbar">
      <h3>售后管理</h3>
      <el-select v-model="filterStatus" placeholder="筛选状态" clearable style="width:140px" @change="fetchList">
        <el-option label="待处理" value="PENDING" />
        <el-option label="已同意" value="APPROVED" />
        <el-option label="已拒绝" value="REJECTED" />
        <el-option label="已完成" value="COMPLETED" />
        <el-option label="已取消" value="CANCELLED" />
      </el-select>
    </div>

    <el-table v-loading="loading" :data="items" stripe>
      <el-table-column label="售后编号" width="100">
        <template #default="{ row }">{{ row.id?.slice(0, 10) }}...</template>
      </el-table-column>
      <el-table-column label="订单编号" width="100">
        <template #default="{ row }">{{ row.orderId?.slice(0, 10) }}...</template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag size="small">{{ typeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="150" show-overflow-tooltip />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">
          ¥{{ row.amount ? Number(row.amount).toFixed(2) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="申请时间" width="100">
        <template #default="{ row }">{{ row.createdAt?.slice(0, 10) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'PENDING'">
            <el-button size="small" type="success" @click="handleProcess(row, 'approve')">同意</el-button>
            <el-button size="small" type="danger" @click="handleProcess(row, 'reject')">拒绝</el-button>
          </template>
          <span v-else style="color:#999;font-size:12px">--</span>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && items.length === 0" description="暂无售后记录" />

    <!-- 分页 -->
    <el-pagination
      v-if="total > 0"
      layout="total, prev, pager, next"
      :total="total" :page-size="pageSize"
      v-model:current-page="page"
      @current-change="fetchList"
      style="margin-top:16px;justify-content:flex-end"
    />

    <!-- 处理弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogAction === 'approve' ? '同意售后' : '拒绝售后'" width="420px">
      <el-form label-width="60px">
        <el-form-item label="备注">
          <el-input v-model="processRemark" type="textarea" :rows="3" :placeholder="dialogAction === 'reject' ? '请填写拒绝原因' : '可选填备注'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button :type="dialogAction === 'approve' ? 'success' : 'danger'" @click="confirmProcess">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

const loading = ref(false);
const items = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const filterStatus = ref("PENDING");
const dialogVisible = ref(false);
const dialogAction = ref("");
const processRemark = ref("");
const processId = ref("");

function typeLabel(t: string) {
  const map: Record<string, string> = { refund: "退款", return: "退货", exchange: "换货" };
  return map[t] || t;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    PENDING: "待处理", APPROVED: "已同意", REJECTED: "已拒绝",
    CANCELLED: "已取消", COMPLETED: "已完成", PROCESSING: "处理中",
  };
  return map[s] || s;
}

function statusType(s: string) {
  const map: Record<string, string> = {
    PENDING: "warning", APPROVED: "success", REJECTED: "danger",
    CANCELLED: "info", COMPLETED: "success",
  };
  return map[s] || "info";
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await api.get("/shop/admin/after-sales", {
      params: {
        page: page.value, pageSize: pageSize.value,
        status: filterStatus.value || undefined,
      },
    });
    items.value = data?.items || data?.data || [];
    total.value = data?.total || 0;
  } finally {
    loading.value = false;
  }
}

function handleProcess(row: any, action: string) {
  processId.value = row.id;
  dialogAction.value = action;
  processRemark.value = "";
  dialogVisible.value = true;
}

async function confirmProcess() {
  if (dialogAction.value === "reject" && !processRemark.value.trim()) {
    ElMessage.warning("请填写拒绝原因");
    return;
  }
  try {
    await api.put(`/shop/admin/after-sales/${processId.value}/process`, {
      action: dialogAction.value,
      remark: processRemark.value,
    });
    ElMessage.success(dialogAction.value === "approve" ? "已同意售后" : "已拒绝售后");
    dialogVisible.value = false;
    fetchList();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || "操作失败");
  }
}
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 16px; }
</style>
