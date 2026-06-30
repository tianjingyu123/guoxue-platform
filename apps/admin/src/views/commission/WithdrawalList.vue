<template>
  <div class="page">
    <div class="header">
      <h2>提现审核</h2>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
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

    <DataTable
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="total"
      actions-width="180"
      @change="fetchList"
    >
      <template #toolbar>
        <el-radio-group
          v-model="filterStatus"
          @change="onFilterChange"
        >
          <el-radio-button value="">
            全部
          </el-radio-button>
          <el-radio-button value="PENDING">
            待审核
          </el-radio-button>
          <el-radio-button value="APPROVED">
            已通过
          </el-radio-button>
          <el-radio-button value="PAID">
            已打款
          </el-radio-button>
          <el-radio-button value="REJECTED">
            已拒绝
          </el-radio-button>
        </el-radio-group>
        <el-button @click="exportData">
          导出CSV
        </el-button>
      </template>

      <template #user="{ row }">
        {{ row.user?.nickname || "--" }}
      </template>
      <template #phone="{ row }">
        {{ row.user?.phone || "--" }}
      </template>
      <template #station="{ row }">
        {{ row.station?.name || "--" }}
      </template>
      <template #amount="{ row }">
        ¥{{ Number(row.amount).toFixed(2) }}
      </template>
      <template #method="{ row }">
        {{ row.alipayAccount ? "支付宝" : row.bankName ? "银行卡" : "未指定" }}
      </template>
      <template #account="{ row }">
        {{ row.alipayAccount || row.bankAccount || "--" }}
      </template>
      <template #status="{ row }">
        <el-tag
          :type="statusType(row.status)"
          size="small"
        >
          {{ statusLabel(row.status) }}
        </el-tag>
      </template>
      <template #createdAt="{ row }">
        {{ row.createdAt?.slice(0, 16).replace("T", " ") }}
      </template>
      <template #actions="{ row }">
        <template v-if="row.status === 'PENDING'">
          <el-button
            type="success"
            size="small"
            :disabled="submitting"
            @click="audit(row, 'APPROVED')"
          >
            通过
          </el-button>
          <el-button
            type="primary"
            size="small"
            :disabled="submitting"
            @click="markPaid(row)"
          >
            打款
          </el-button>
          <el-button
            type="danger"
            size="small"
            :disabled="submitting"
            @click="audit(row, 'REJECTED')"
          >
            拒绝
          </el-button>
        </template>
        <span
          v-else
          style="color:#999"
        >--</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { commissionApi } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";
import { exportCSV } from "@/utils/export";
import DataTable from "@/components/DataTable.vue";

// 提现申请行：依据表格列、行操作与导出访问字段声明
interface WithdrawalRow {
  id: string
  userId?: string
  user?: { nickname?: string; phone?: string }
  station?: { name?: string }
  amount: number | string
  alipayAccount?: string
  bankName?: string
  bankAccount?: string
  status?: string
  createdAt?: string
}

const list = ref<WithdrawalRow[]>([]);
const loading = ref(false);
const error = ref(false);
const submitting = ref(false);
const filterStatus = ref("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const columns = [
  { prop: "user", label: "申请人", width: 120, slot: "user" },
  { prop: "phone", label: "手机号", width: 130, slot: "phone" },
  { prop: "station", label: "分站", width: 140, slot: "station" },
  { prop: "amount", label: "提现金额", width: 110, slot: "amount" },
  { prop: "method", label: "提现方式", width: 120, slot: "method" },
  { prop: "account", label: "账号", width: 180, slot: "account", showOverflow: true },
  { prop: "status", label: "状态", width: 90, slot: "status" },
  { prop: "createdAt", label: "申请时间", width: 170, slot: "createdAt" },
];

onMounted(() => fetchList());

function onFilterChange() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await commissionApi.listWithdrawals({
      page: page.value, pageSize: pageSize.value,
      status: filterStatus.value || undefined,
    });
    list.value = data.withdrawals || [];
    total.value = data.total || 0;
  } catch {
    list.value = [];
    total.value = 0;
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function audit(row: WithdrawalRow, status: string) {
  if (submitting.value) return;
  const isReject = status === "REJECTED";
  const title = isReject ? "确认拒绝" : "确认通过";
  const msg = isReject ? "确定拒绝该提现申请？请填写拒绝原因。" : "确定通过该提现申请？可填写备注。";
  try {
    const { value: remark } = await ElMessageBox.prompt(msg, title, {
      inputPlaceholder: "备注（可选）", inputValue: "",
      confirmButtonText: "确定", cancelButtonText: "取消", type: "warning",
    });
    submitting.value = true;
    await commissionApi.auditWithdrawal(row.id, { status, remark: remark || undefined });
    ElMessage.success(status === "APPROVED" ? "已通过" : "已拒绝");
    fetchList();
  } catch { /* 取消或失败不处理 */ } finally {
    submitting.value = false;
  }
}

// 确认打款：将提现推进到 PAID 终态。
// 后端 auditWithdrawal 仅允许从 PENDING 发起状态变更（status !== "PENDING" 即抛错），
// 故打款按钮挂在待审核(PENDING)记录上，一步完成「审核通过并打款」。
// 注：已通过(APPROVED)记录 -> PAID 暂不被后端支持，如需「审核→打款」两步流转需后端放宽 auditWithdrawal 的状态守卫。
async function markPaid(row: WithdrawalRow) {
  if (submitting.value) return;
  try {
    await ElMessageBox.confirm(
      `确认已向「${row.user?.nickname || row.userId}」打款 ¥${Number(row.amount).toFixed(2)}？此操作将把提现标记为已打款（终态），不可撤销。`,
      "确认放款",
      { confirmButtonText: "确认打款", cancelButtonText: "取消", type: "warning" },
    );
    submitting.value = true;
    await commissionApi.auditWithdrawal(row.id, { status: "PAID", remark: "管理员确认打款" });
    ElMessage.success("已打款");
    fetchList();
  } catch { /* 取消或失败不处理 */ } finally {
    submitting.value = false;
  }
}

function statusType(s: string) {
  return ({ PENDING: "warning", APPROVED: "success", PAID: "", REJECTED: "danger" } as Record<string, string>)[s] || "";
}

function statusLabel(s?: string) {
  if (!s) return "--";
  return ({ PENDING: "待审核", APPROVED: "已通过", PAID: "已打款", REJECTED: "已拒绝" } as Record<string, string>)[s] || s;
}

function exportData() {
  exportCSV(
    "提现审核",
    [
      { label: "申请人", key: "userName" }, { label: "手机号", key: "userPhone" },
      { label: "分站", key: "stationName" }, { label: "提现金额", key: "amount" },
      { label: "提现方式", key: "method" }, { label: "账号", key: "account" },
      { label: "状态", key: "statusLabel" }, { label: "申请时间", key: "createdAt" },
    ],
    list.value.map((r) => ({
      ...r,
      userName: r.user?.nickname || "--", userPhone: r.user?.phone || "--",
      stationName: r.station?.name || "--",
      method: r.alipayAccount ? "支付宝" : r.bankName ? "银行卡" : "未指定",
      account: r.alipayAccount || r.bankAccount || "--",
      statusLabel: statusLabel(r.status),
      createdAt: r.createdAt?.slice(0, 16).replace("T", " "),
    })),
  );
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: var(--color-text-title); }
</style>
