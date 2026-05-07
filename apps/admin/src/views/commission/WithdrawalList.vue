<template>
  <div class="page">
    <div class="header">
      <h2>提现审核</h2>
      <div class="filter-row">
        <el-radio-group v-model="filterStatus" @change="onFilterChange">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="PENDING">待审核</el-radio-button>
          <el-radio-button value="APPROVED">已通过</el-radio-button>
          <el-radio-button value="PAID">已打款</el-radio-button>
          <el-radio-button value="REJECTED">已拒绝</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column label="申请人" width="120">
        <template #default="{ row }">{{ row.user?.nickname || "--" }}</template>
      </el-table-column>
      <el-table-column label="手机号" width="130">
        <template #default="{ row }">{{ row.user?.phone || "--" }}</template>
      </el-table-column>
      <el-table-column label="分站" width="140">
        <template #default="{ row }">{{ row.station?.name || "--" }}</template>
      </el-table-column>
      <el-table-column label="提现金额" width="110">
        <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="提现方式" width="120">
        <template #default="{ row }">
          {{ row.alipayAccount ? "支付宝" : row.bankName ? "银行卡" : "未指定" }}
        </template>
      </el-table-column>
      <el-table-column label="账号" width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.alipayAccount || row.bankAccount || "--" }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="申请时间" width="170">
        <template #default="{ row }">{{ row.createdAt?.slice(0, 16).replace("T", " ") }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'PENDING'">
            <el-button type="success" size="small" @click="audit(row, 'APPROVED')">通过</el-button>
            <el-button type="danger" size="small" @click="audit(row, 'REJECTED')">拒绝</el-button>
          </template>
          <span v-else style="color:#999">--</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination" v-if="total > pageSize">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { commissionApi } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";

const list = ref<any[]>([]);
const loading = ref(false);
const filterStatus = ref("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

onMounted(() => fetchList());

function onFilterChange() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await commissionApi.listWithdrawals({
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

async function audit(row: any, status: string) {
  const isReject = status === "REJECTED";
  const title = isReject ? "确认拒绝" : "确认通过";
  const msg = isReject
    ? "确定拒绝该提现申请？请填写拒绝原因。"
    : "确定通过该提现申请？可填写备注。";
  try {
    const { value: remark } = await ElMessageBox.prompt(msg, title, {
      inputPlaceholder: "备注（可选）",
      inputValue: "",
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    await commissionApi.auditWithdrawal(row.id, {
      status,
      remark: remark || undefined,
    });
    ElMessage.success(status === "APPROVED" ? "已通过" : "已拒绝");
    fetchList();
  } catch {
    // 取消或关闭
  }
}

function statusType(s: string) {
  const map: Record<string, string> = {
    PENDING: "warning",
    APPROVED: "success",
    PAID: "",
    REJECTED: "danger",
  };
  return map[s] || "";
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    PENDING: "待审核",
    APPROVED: "已通过",
    PAID: "已打款",
    REJECTED: "已拒绝",
  };
  return map[s] || s;
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: #8b4513; }
.filter-row { display: flex; gap: 8px; align-items: center; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
