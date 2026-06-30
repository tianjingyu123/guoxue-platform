<template>
  <div class="page">
    <PageHeader title="创作者提现审核">
      <template #actions>
        <div style="display:flex;gap:8px">
          <el-select
            v-model="statusFilter"
            placeholder="状态筛选"
            clearable
            style="width:130px"
            @change="onSearch"
          >
            <el-option
              label="待审核"
              value="PENDING"
            />
            <el-option
              label="已通过"
              value="APPROVED"
            />
            <el-option
              label="已打款"
              value="PAID"
            />
            <el-option
              label="已拒绝"
              value="REJECTED"
            />
          </el-select>
          <el-input
            v-model="keyword"
            placeholder="昵称 / 手机号搜索"
            clearable
            style="width:200px"
            @keyup.enter="onSearch"
            @clear="onSearch"
          />
          <el-button
            type="primary"
            @click="onSearch"
          >
            搜索
          </el-button>
          <el-button
            :disabled="!list.length"
            @click="exportData"
          >
            导出CSV
          </el-button>
        </div>
      </template>
    </PageHeader>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
      title="创作者收益以虚拟币结算。提现走「申请 → 通过 → 打款」人工审核流：申请时对应币数已冻结，「打款」真实扣减，「拒绝」自动解冻退回创作者可用余额。"
    />

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

    <DataTable
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="total"
      :actions-width="220"
      @change="fetchList"
    >
      <template #applicant="{ row }">
        <div class="applicant-cell">
          <el-avatar
            :size="28"
            :src="row.avatar"
          >
            {{ (row.nickname || '?').slice(0, 1) }}
          </el-avatar>
          <span>{{ row.nickname || '未命名' }}</span>
        </div>
      </template>
      <template #amount="{ row }">
        {{ formatNum(row.amount) }} 币
      </template>
      <template #status="{ row }">
        <el-tag
          :type="statusType(row.status)"
          size="small"
        >
          {{ statusLabel(row.status) }}
        </el-tag>
      </template>
      <template #actions="{ row }">
        <template v-if="row.status === 'PENDING'">
          <el-button
            link
            type="success"
            :loading="acting === row.id"
            @click="onReview(row, 'approve')"
          >
            通过
          </el-button>
          <el-button
            link
            type="primary"
            :loading="acting === row.id"
            @click="onReview(row, 'pay')"
          >
            打款
          </el-button>
          <el-button
            link
            type="danger"
            :loading="acting === row.id"
            @click="onReview(row, 'reject')"
          >
            拒绝
          </el-button>
        </template>
        <template v-else-if="row.status === 'APPROVED'">
          <el-button
            link
            type="primary"
            :loading="acting === row.id"
            @click="onReview(row, 'pay')"
          >
            打款
          </el-button>
          <el-button
            link
            type="danger"
            :loading="acting === row.id"
            @click="onReview(row, 'reject')"
          >
            拒绝
          </el-button>
        </template>
        <span
          v-else
          class="muted"
        >—</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";
import { exportCSV } from "@/utils/export";
import DataTable from "@/components/DataTable.vue";
import PageHeader from "@/components/PageHeader.vue";

type Action = "approve" | "reject" | "pay";

/** 提现申请行（id/amount/status 脚本中直接使用，必填；其余 optional） */
interface WithdrawalRow {
  id: string
  amount: number
  status: string
  avatar?: string
  nickname?: string
  phone?: string
  method?: string
  account?: string
  createdAt?: string
  processedAt?: string
}

const list = ref<WithdrawalRow[]>([]);
const loading = ref(false);
const error = ref(false);
const keyword = ref("");
const statusFilter = ref("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const acting = ref<string | null>(null);

const columns = [
  { prop: "applicant", label: "申请人", minWidth: 160, slot: "applicant" },
  { prop: "phone", label: "手机号", width: 140 },
  { prop: "amount", label: "提现金额", width: 120, slot: "amount" },
  { prop: "method", label: "提现方式", width: 110 },
  { prop: "account", label: "收款账号", width: 160, showOverflow: true },
  { prop: "status", label: "状态", width: 100, slot: "status" },
  { prop: "createdAt", label: "申请时间", width: 160 },
  { prop: "processedAt", label: "处理时间", width: 160 },
];

onMounted(() => fetchList());

function onSearch() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await api.get("/videos/creator/admin/withdrawals", {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: keyword.value || undefined,
        status: statusFilter.value || undefined,
      },
    });
    list.value = data.items || [];
    total.value = data.total || 0;
  } catch {
    list.value = [];
    total.value = 0;
    error.value = true;
  } finally {
    loading.value = false;
  }
}

const ACTION_LABEL: Record<Action, string> = { approve: "通过", reject: "拒绝", pay: "打款" };

async function onReview(row: WithdrawalRow, action: Action) {
  if (acting.value) return; // 防重复
  const label = ACTION_LABEL[action];
  let note = "";
  try {
    const tip =
      action === "pay"
        ? `确认向「${row.nickname || "该创作者"}」打款 ${formatNum(row.amount)} 币？打款后将真实扣减冻结余额，不可撤销。`
        : action === "reject"
          ? `确认拒绝「${row.nickname || "该创作者"}」的提现申请？冻结的 ${formatNum(row.amount)} 币将自动退回其可用余额。`
          : `确认通过「${row.nickname || "该创作者"}」的提现申请？`;
    const res = await ElMessageBox.prompt(tip, `${label}提现`, {
      confirmButtonText: `确认${label}`,
      cancelButtonText: "取消",
      inputPlaceholder: action === "reject" ? "请填写拒绝原因（必填）" : "审核备注（可选）",
      inputValue: "",
      inputValidator: (v: string) =>
        action === "reject" && !String(v || "").trim() ? "拒绝时必须填写原因" : true,
      type: action === "reject" ? "warning" : undefined,
    });
    note = String(res.value || "").trim();
  } catch {
    return; // 用户取消
  }

  acting.value = row.id;
  try {
    await api.post(`/videos/creator/admin/withdrawals/${row.id}/review`, { action, note });
    ElMessage.success(`${label}成功`);
    fetchList();
  } catch {
    // 拦截器已弹出错误提示
  } finally {
    acting.value = null;
  }
}

function formatNum(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n ?? 0);
}

function statusType(s: string) {
  return (
    { PENDING: "warning", APPROVED: "success", PAID: "", REJECTED: "danger" } as Record<string, string>
  )[s] || "";
}
function statusLabel(s: string) {
  return (
    { PENDING: "待审核", APPROVED: "已通过", PAID: "已打款", REJECTED: "已拒绝" } as Record<string, string>
  )[s] || s;
}

function exportData() {
  exportCSV(
    "创作者提现记录",
    [
      { label: "申请人", key: "nickname" },
      { label: "手机号", key: "phone" },
      { label: "提现金额(币)", key: "amount" },
      { label: "提现方式", key: "method" },
      { label: "收款账号", key: "account" },
      { label: "状态", key: "statusLabel" },
      { label: "申请时间", key: "createdAt" },
      { label: "处理时间", key: "processedAt" },
    ],
    list.value.map((r) => ({ ...r, statusLabel: statusLabel(r.status) })),
  );
}
</script>

<style scoped>
.page { padding: 20px; }
.applicant-cell { display: flex; align-items: center; gap: 8px; }
.muted { color: var(--color-text-secondary); }
</style>
