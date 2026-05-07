<template>
  <div class="withdrawal-list">
    <h3>提现审核</h3>

    <el-radio-group v-model="filterStatus" style="margin: 12px 0" @change="fetch">
      <el-radio-button value="">全部</el-radio-button>
      <el-radio-button value="PENDING">待审核</el-radio-button>
      <el-radio-button value="APPROVED">已通过</el-radio-button>
      <el-radio-button value="PAID">已打款</el-radio-button>
      <el-radio-button value="REJECTED">已拒绝</el-radio-button>
    </el-radio-group>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="120" show-overflow-tooltip />
      <el-table-column label="申请人" width="140">
        <template #default="{ row }">{{ row.user?.nickname || row.user?.phone }}</template>
      </el-table-column>
      <el-table-column label="分站" width="140">
        <template #default="{ row }">{{ row.station?.name || "--" }}</template>
      </el-table-column>
      <el-table-column prop="amount" label="金额" width="100">
        <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="提现方式" width="120">
        <template #default="{ row }">
          {{ row.alipayAccount ? "支付宝" : row.bankName ? "银行卡" : "未指定" }}
        </template>
      </el-table-column>
      <el-table-column label="账号" width="180">
        <template #default="{ row }">{{ row.alipayAccount || row.bankAccount || "--" }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="申请时间" width="170" />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'PENDING'">
            <el-button type="success" size="small" @click="audit(row.id, 'APPROVED')">通过</el-button>
            <el-button type="danger" size="small" @click="audit(row.id, 'REJECTED')">拒绝</el-button>
          </template>
          <template v-else-if="row.status === 'APPROVED'">
            <el-button type="primary" size="small" @click="audit(row.id, 'PAID')">标记已打款</el-button>
          </template>
          <span v-else style="color: #999">--</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > pageSize"
      style="margin-top: 16px; justify-content: flex-end"
      v-model:current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="fetch"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { commissionApi } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";

const list = ref<any[]>([]);
const loading = ref(false);
const filterStatus = ref("PENDING");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

onMounted(() => fetch());

async function fetch() {
  loading.value = true;
  try {
    const { data } = await commissionApi.withdrawals({
      page: page.value,
      pageSize: pageSize.value,
      status: filterStatus.value || undefined,
    });
    list.value = data.withdrawals || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

async function audit(id: string, status: string) {
  const labels: Record<string, string> = { APPROVED: "通过", PAID: "标记已打款", REJECTED: "拒绝" };
  try {
    await ElMessageBox.confirm(`确认${labels[status]}该提现申请？`, "操作确认", { type: "warning" });
    await commissionApi.auditWithdrawal(id, { status });
    ElMessage.success("操作成功");
    fetch();
  } catch {
    // 取消
  }
}

function statusType(s: string) {
  const map: Record<string, string> = { PENDING: "warning", APPROVED: "success", PAID: "", REJECTED: "danger" };
  return map[s] || "";
}
function statusLabel(s: string) {
  const map: Record<string, string> = { PENDING: "待审核", APPROVED: "已通过", PAID: "已打款", REJECTED: "已拒绝" };
  return map[s] || s;
}
</script>

<style scoped>
h3 {
  margin: 0 0 4px;
  font-size: 18px;
}
</style>
