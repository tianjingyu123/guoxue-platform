<template>
  <div class="page">
    <div class="header">
      <h2>充值记录</h2>
      <div class="filter-row">
        <el-input
          v-model="filterUserId"
          placeholder="按用户ID筛选"
          clearable
          style="width: 200px"
          @clear="onFilterChange"
          @keyup.enter="onFilterChange"
        />
        <el-button
          type="primary"
          @click="onFilterChange"
        >
          搜索
        </el-button>
        <el-button
          type="success"
          @click="openRechargeDialog"
        >
          管理员充值
        </el-button>
        <el-button @click="exportData">
          导出CSV
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        label="用户昵称"
        width="130"
      >
        <template #default="{ row }">
          {{ row.user?.nickname || "--" }}
        </template>
      </el-table-column>
      <el-table-column
        label="手机号"
        width="130"
      >
        <template #default="{ row }">
          {{ row.user?.phone || "--" }}
        </template>
      </el-table-column>
      <el-table-column
        label="用户ID"
        width="80"
      >
        <template #default="{ row }">
          {{ row.userId }}
        </template>
      </el-table-column>
      <el-table-column
        label="人民币金额"
        width="110"
      >
        <template #default="{ row }">
          ¥{{ Number(row.amount).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        label="币数"
        width="90"
      >
        <template #default="{ row }">
          {{ row.coins }}
        </template>
      </el-table-column>
      <el-table-column
        label="支付方式"
        width="100"
      >
        <template #default="{ row }">
          {{ payMethodLabel(row.payMethod) }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusType(row.status)"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="备注"
        width="160"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.remark || "--" }}
        </template>
      </el-table-column>
      <el-table-column
        label="充值时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="total > pageSize"
      class="pagination"
    >
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <!-- 管理员充值弹窗 -->
    <el-dialog
      v-model="rechargeVisible"
      title="管理员充值"
      width="500px"
    >
      <el-form
        :model="rechargeForm"
        label-width="100px"
      >
        <el-form-item
          label="用户ID"
          required
        >
          <el-input
            v-model="rechargeForm.userId"
            placeholder="输入用户ID"
          />
        </el-form-item>
        <el-form-item
          label="充值币数"
          required
        >
          <el-input-number
            v-model="rechargeForm.coins"
            :min="1"
            :step="100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="rechargeForm.remark"
            type="textarea"
            :rows="3"
            placeholder="可选，填写充值原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitRecharge"
        >
          确认充值
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { coinApi } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";
import { exportCSV } from "@/utils/export";

const list = ref<any[]>([]);
const loading = ref(false);
const filterUserId = ref("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

// 充值弹窗
const rechargeVisible = ref(false);
const submitting = ref(false);
const rechargeForm = ref({ userId: "", coins: 100, remark: "" });

onMounted(() => fetchList());

function onFilterChange() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await coinApi.getRecharges(
      page.value,
      pageSize.value,
      filterUserId.value || undefined,
    );
    list.value = data.recharges || data.list || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function payMethodLabel(method: string) {
  const map: Record<string, string> = {
    WECHAT: "微信",
    ALIPAY: "支付宝",
    ADMIN: "管理员充值",
    BANK: "银行转账",
  };
  return map[method] || method || "--";
}

function statusType(status: string) {
  const map: Record<string, string> = {
    PENDING: "warning",
    SUCCESS: "success",
    FAILED: "danger",
    REFUND: "info",
  };
  return map[status] || "";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "待支付",
    SUCCESS: "成功",
    FAILED: "失败",
    REFUND: "已退款",
  };
  return map[status] || status || "--";
}

function formatTime(t: string) {
  if (!t) return "--";
  return t.slice(0, 16).replace("T", " ");
}

function openRechargeDialog() {
  rechargeForm.value = { userId: "", coins: 100, remark: "" };
  rechargeVisible.value = true;
}

async function submitRecharge() {
  const { userId, coins } = rechargeForm.value;
  if (!userId) {
    ElMessage.warning("请输入用户ID");
    return;
  }
  if (!coins || coins <= 0) {
    ElMessage.warning("请输入有效的币数");
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确认给用户 ${userId} 充值 ${coins} 币？`,
      "确认充值",
      { type: "warning", confirmButtonText: "确认", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  submitting.value = true;
  try {
    await coinApi.adminRecharge(rechargeForm.value);
    ElMessage.success("充值成功");
    rechargeVisible.value = false;
    fetchList();
  } finally {
    submitting.value = false;
  }
}

function exportData() {
  exportCSV(
    "充值记录",
    [
      { label: "用户昵称", key: "nickname" },
      { label: "手机号", key: "phone" },
      { label: "用户ID", key: "userId" },
      { label: "人民币金额", key: "amount" },
      { label: "币数", key: "coins" },
      { label: "支付方式", key: "payMethod" },
      { label: "状态", key: "status" },
      { label: "备注", key: "remark" },
      { label: "充值时间", key: "createdAt" },
    ],
    list.value.map((r) => ({
      nickname: r.user?.nickname || "--",
      phone: r.user?.phone || "--",
      userId: r.userId,
      amount: `¥${Number(r.amount).toFixed(2)}`,
      coins: r.coins,
      payMethod: payMethodLabel(r.payMethod),
      status: statusLabel(r.status),
      remark: r.remark || "--",
      createdAt: formatTime(r.createdAt),
    })),
  );
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: #8b4513; }
.filter-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
