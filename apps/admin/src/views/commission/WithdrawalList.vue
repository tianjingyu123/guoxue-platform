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
        <!-- 待审核：只能通过/拒绝。打款不再能一步完成 —— 必须先审核，再取卡号线下转账，最后回填流水号。 -->
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
            type="danger"
            size="small"
            :disabled="submitting"
            @click="audit(row, 'REJECTED')"
          >
            拒绝
          </el-button>
        </template>
        <!-- 已通过：取收款账户去线下转账 → 回填流水号确认打款 -->
        <template v-else-if="row.status === 'APPROVED'">
          <el-button
            type="warning"
            size="small"
            :disabled="submitting"
            @click="openPayout(row)"
          >
            打款
          </el-button>
        </template>
        <span
          v-else
          style="color:#999"
        >--</span>
      </template>
    </DataTable>

    <!-- 打款弹窗：取完整收款账户 → 线下转账 → 回填流水号确认 -->
    <el-dialog
      v-model="payoutVisible"
      title="确认打款"
      width="520px"
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="本次查看完整收款账户已记入审计日志"
        description="请先在网银/支付宝完成转账，再回填转账流水号。流水号唯一，可防重复打款。"
        style="margin-bottom:16px"
      />

      <div v-loading="revealing">
        <el-descriptions
          v-if="payoutAccount"
          :column="1"
          border
          size="small"
        >
          <el-descriptions-item label="打款金额">
            <span style="color:#f56c6c;font-weight:600;font-size:16px">
              ¥{{ Number(payoutAccount.amount).toFixed(2) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item
            v-if="payoutAccount.bankAccount"
            label="开户行"
          >
            {{ payoutAccount.bankName || "--" }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="payoutAccount.bankAccount"
            label="银行卡号"
          >
            <span
              style="font-family:monospace;font-weight:600"
              :selectable="true"
            >{{ payoutAccount.bankAccount }}</span>
          </el-descriptions-item>
          <el-descriptions-item
            v-if="payoutAccount.bankHolder"
            label="开户人"
          >
            {{ payoutAccount.bankHolder }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="payoutAccount.alipayAccount"
            label="支付宝账号"
          >
            <span style="font-family:monospace;font-weight:600">{{ payoutAccount.alipayAccount }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-form
        label-width="90px"
        style="margin-top:16px"
      >
        <el-form-item
          label="转账流水号"
          required
        >
          <el-input
            v-model="payoutRef"
            placeholder="银行回单号 / 支付宝订单号（必填·用于对账与防重复打款）"
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="payoutVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="submitting"
          :disabled="!payoutAccount || payoutRef.trim().length < 4"
          @click="confirmPayout"
        >
          确认已打款
        </el-button>
      </template>
    </el-dialog>
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
    list.value = data.items || data.withdrawals || [];
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

// ───────── 打款流程（APPROVED → PAID）─────────
//
// 此前是 PENDING 一步点「打款」直接置 PAID —— 但管理员那时【根本没拿到完整卡号】（列表一律脱敏），
// 也没有转账流水号，等于「没转账就把提现标成已打款」。整条链路在人工这一步是断的。
//
// 现在的正确顺序：审核通过 → 取收款账户（后端强制审计留痕）→ 线下转账 → 回填流水号确认打款。
// 流水号是出款幂等键（DB 唯一约束），既保证可对账，也防重复打款。
const payoutVisible = ref(false);
const payoutRow = ref<WithdrawalRow | null>(null);
const payoutAccount = ref<PayoutAccount | null>(null);
const payoutRef = ref("");
const revealing = ref(false);

interface PayoutAccount {
  amount: number;
  bankName?: string | null;
  bankAccount?: string | null;
  bankHolder?: string | null;
  alipayAccount?: string | null;
}

async function openPayout(row: WithdrawalRow) {
  payoutRow.value = row;
  payoutAccount.value = null;
  payoutRef.value = "";
  payoutVisible.value = true;
  // 取完整收款账户：这是唯一会返回明文卡号的接口，后端每次调用都会记审计（谁、何时、看了哪条）
  revealing.value = true;
  try {
    const res = await commissionApi.revealPayoutAccount(row.id);
    payoutAccount.value = res.data as PayoutAccount;
  } catch (e: unknown) {
    ElMessage.error("获取收款账户失败：" + errMsg(e));
    payoutVisible.value = false;
  } finally {
    revealing.value = false;
  }
}

async function confirmPayout() {
  if (submitting.value || !payoutRow.value) return;
  const ref_ = payoutRef.value.trim();
  if (ref_.length < 4) {
    ElMessage.warning("请填写转账流水号（银行回单号 / 支付宝订单号）");
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确认已向「${payoutRow.value.user?.nickname || payoutRow.value.userId}」转账 ¥${Number(payoutRow.value.amount).toFixed(2)}？\n流水号：${ref_}\n此操作不可撤销。`,
      "确认打款",
      { confirmButtonText: "确认已打款", cancelButtonText: "取消", type: "warning" },
    );
    submitting.value = true;
    await commissionApi.confirmPayout(payoutRow.value.id, ref_);
    ElMessage.success("已确认打款");
    payoutVisible.value = false;
    fetchList();
  } catch (e: unknown) {
    if (e !== "cancel" && e !== "close") ElMessage.error("确认打款失败：" + errMsg(e));
  } finally {
    submitting.value = false;
  }
}

function errMsg(e: unknown): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || "未知错误";
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
