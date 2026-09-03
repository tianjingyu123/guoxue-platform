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
              label="全部"
              value=""
            />
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
      title="创作者收益以虚拟币结算。提现流程：申请 → 通过 → 打款（仅「已通过」的申请可打款）。申请时对应币数已冻结，「打款」真实扣减，「拒绝」自动解冻退回创作者可用余额。"
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
      :actions-width="180"
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
        {{ formatCoin(row.amount) }} 币
      </template>
      <template #method="{ row }">
        {{ methodLabel(row.method) }}
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
        <!-- 状态机对齐后端新校验：PENDING 只能通过/拒绝，打款只对 APPROVED 开放 -->
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
            @click="openPayDialog(row)"
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

    <!-- 打款弹窗：先取明文收款账号核对 → 流水号必填 → 确认 -->
    <el-dialog
      v-model="payVisible"
      title="打款确认"
      width="560px"
      :close-on-click-modal="false"
    >
      <template v-if="payRow">
        <el-descriptions
          :column="1"
          border
          style="margin-bottom:12px"
        >
          <el-descriptions-item label="申请人">
            {{ payRow.nickname || '未命名' }}（{{ payRow.phone || '无手机号' }}）
          </el-descriptions-item>
          <el-descriptions-item label="提现币数">
            <b>{{ formatCoin(payRow.amount) }} 币</b>
          </el-descriptions-item>
          <el-descriptions-item label="提现方式">
            {{ methodLabel(payRow.method) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 收款账号（reveal 契约·404 诚实降级） -->
        <div
          v-loading="payAccountLoading"
          class="account-block"
        >
          <template v-if="payAccountLoading">
            <span class="muted">正在获取收款账号…</span>
          </template>
          <el-descriptions
            v-else-if="payAccount"
            :column="1"
            border
          >
            <el-descriptions-item label="收款账号（明文）">
              <b>{{ payAccount.account || payAccount.accountNo || '—' }}</b>
            </el-descriptions-item>
            <el-descriptions-item
              v-if="payAccount.name || payAccount.realName"
              label="收款人姓名"
            >
              {{ payAccount.name || payAccount.realName }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="payAccount.bank"
              label="开户行"
            >
              {{ payAccount.bank }}
            </el-descriptions-item>
          </el-descriptions>
          <el-alert
            v-else-if="payAccountMissing"
            type="warning"
            :closable="false"
            show-icon
            title="收款账号明文端点待后端部署，无法在线核对账号——请勿盲打。如必须打款，请先通过财务线下记录核对收款账号，并勾选下方确认。"
          />
          <el-alert
            v-else
            type="error"
            :closable="false"
            show-icon
          >
            <template #title>
              收款账号获取失败，
              <el-button
                link
                type="primary"
                @click="fetchPayAccount"
              >
                重试
              </el-button>
            </template>
          </el-alert>
        </div>

        <el-alert
          type="warning"
          :closable="false"
          show-icon
          style="margin:12px 0"
          title="币→人民币折算规则系统当前未内置，请与财务确认折算金额后再线下转账；本操作仅登记打款并扣减冻结币数。"
        />

        <el-form label-width="110px">
          <el-form-item
            label="打款流水号"
            required
          >
            <el-input
              v-model="payoutRef"
              placeholder="必填：银行/微信/支付宝转账流水号，用于对账与幂等"
              maxlength="64"
            />
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="payNote"
              placeholder="可选：打款备注"
              maxlength="200"
            />
          </el-form-item>
          <el-form-item
            v-if="payAccountMissing"
            label=" "
          >
            <el-checkbox v-model="payOfflineChecked">
              我已通过财务线下记录核对收款账号，确认继续打款
            </el-checkbox>
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="payVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="paySubmitting"
          :disabled="!payoutRef.trim() || (payAccountMissing && !payOfflineChecked)"
          @click="submitPay"
        >
          确认打款
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";
import { api } from "@/api";
import { exportCSV } from "@/utils/export";
import DataTable from "@/components/DataTable.vue";
import PageHeader from "@/components/PageHeader.vue";

type Action = "approve" | "reject";

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

/** 收款账号明文（reveal 契约返回，字段名宽松兼容） */
interface PayoutAccount {
  account?: string
  accountNo?: string
  name?: string
  realName?: string
  bank?: string
}

/** 免全局拦截器请求：reveal 端点 404 时降级提示，不弹英文错误 toast */
const probe = axios.create({ baseURL: "/api/v1", timeout: 15000, validateStatus: () => true });
probe.interceptors.request.use((c) => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
function unwrap<T>(d: unknown): T | undefined {
  const value = d && typeof d === "object" && "code" in d && "data" in d
    ? (d as { data: unknown }).data
    : d;
  return value as T | undefined;
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
  { prop: "amount", label: "提现币数", width: 130, align: "right", slot: "amount" },
  { prop: "method", label: "提现方式", width: 100, slot: "method" },
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

const ACTION_LABEL: Record<Action, string> = { approve: "通过", reject: "拒绝" };

/** 通过/拒绝（拒绝理由必填保持） */
async function onReview(row: WithdrawalRow, action: Action) {
  if (acting.value) return; // 防重复
  const label = ACTION_LABEL[action];
  let note = "";
  try {
    const tip =
      action === "reject"
        ? `确认拒绝「${row.nickname || "该创作者"}」的提现申请？冻结的 ${formatCoin(row.amount)} 币将自动退回其可用余额。`
        : `确认通过「${row.nickname || "该创作者"}」的提现申请？通过后进入待打款队列。`;
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

// ───────── 打款弹窗（对齐后端新契约：需先 APPROVED·payoutRef 必填·先 reveal 明文账号核对） ─────────
const payVisible = ref(false);
const payRow = ref<WithdrawalRow | null>(null);
const payAccountLoading = ref(false);
const payAccount = ref<PayoutAccount | null>(null);
const payAccountMissing = ref(false); // reveal 端点 404（待部署）
const payoutRef = ref("");
const payNote = ref("");
const payOfflineChecked = ref(false);
const paySubmitting = ref(false);

function openPayDialog(row: WithdrawalRow) {
  if (row.status !== "APPROVED") {
    ElMessage.warning("只有「已通过」的申请才能打款，请先审核通过");
    return;
  }
  payRow.value = row;
  payAccount.value = null;
  payAccountMissing.value = false;
  payoutRef.value = "";
  payNote.value = "";
  payOfflineChecked.value = false;
  payVisible.value = true;
  fetchPayAccount();
}

async function fetchPayAccount() {
  if (!payRow.value) return;
  payAccountLoading.value = true;
  payAccountMissing.value = false;
  payAccount.value = null;
  try {
    const res = await probe.get(`/videos/creator/admin/withdrawals/${payRow.value.id}/payout-account`);
    if (res.status === 404) { payAccountMissing.value = true; return; }
    if (res.status >= 400) return; // 走模板里的"获取失败+重试"分支
    payAccount.value = unwrap<PayoutAccount>(res.data) || null;
  } catch { /* 网络失败走"获取失败+重试"分支 */ } finally { payAccountLoading.value = false; }
}

async function submitPay() {
  if (!payRow.value || paySubmitting.value) return;
  const refNo = payoutRef.value.trim();
  if (!refNo) { ElMessage.warning("请填写打款流水号"); return; }
  if (payAccountMissing.value && !payOfflineChecked.value) {
    ElMessage.warning("取号端点待部署，请先勾选「已线下核对收款账号」");
    return;
  }
  // L4 资金支出最终确认：写明币数与折算现实
  try {
    await ElMessageBox.confirm(
      `确认向「${payRow.value.nickname || "该创作者"}」登记打款 ${formatCoin(payRow.value.amount)} 币？` +
      "登记后将真实扣减其冻结币数，不可撤销。币→人民币折算金额请以财务确认为准。",
      "最终确认",
      { type: "warning", confirmButtonText: "确认打款", cancelButtonText: "再想想" },
    );
  } catch { return; }
  paySubmitting.value = true;
  acting.value = payRow.value.id;
  try {
    await api.post(`/videos/creator/admin/withdrawals/${payRow.value.id}/review`, {
      action: "pay",
      note: payNote.value.trim(),
      payoutRef: refNo,
    });
    ElMessage.success("打款登记成功");
    payVisible.value = false;
    fetchList();
  } catch {
    // 拦截器已弹出错误提示（含后端"需先 APPROVED / payoutRef 必填"校验）
  } finally {
    paySubmitting.value = false;
    acting.value = null;
  }
}

/** 资金列不压缩万位：全额千分位 */
function formatCoin(n?: number) {
  return Number(n ?? 0).toLocaleString("zh-CN");
}

/** 提现方式翻译 */
function methodLabel(m?: string) {
  const map: Record<string, string> = {
    WECHAT: "微信", WEIXIN: "微信", ALIPAY: "支付宝",
    BANK: "银行卡", BANK_CARD: "银行卡", BANKCARD: "银行卡",
  };
  if (!m) return "—";
  return map[String(m).toUpperCase()] || m;
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
      { label: "提现币数", key: "amount" },
      { label: "提现方式", key: "methodText" },
      { label: "收款账号", key: "account" },
      { label: "状态", key: "statusText" },
      { label: "申请时间", key: "createdAt" },
      { label: "处理时间", key: "processedAt" },
    ],
    list.value.map((r) => ({ ...r, statusText: statusLabel(r.status), methodText: methodLabel(r.method) })),
  );
}
</script>

<style scoped>
.page { padding: 20px; }
.applicant-cell { display: flex; align-items: center; gap: 8px; }
.muted { color: var(--color-text-secondary); }
.account-block { min-height: 48px; }
</style>
