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
        <el-button @click="fetchList">
          刷新
        </el-button>
      </div>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="无法获取充值记录，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <el-table
        v-loading="loading"
        :data="list"
        border
        stripe
      >
        <template #empty>
          <el-empty description="暂无充值记录，可按用户ID筛选后重试" />
        </template>
        <el-table-column
          label="用户昵称"
          width="130"
          show-overflow-tooltip
        >
        <template #default="{ row }">
          {{ row.user?.nickname || "—" }}
        </template>
      </el-table-column>
      <el-table-column
        label="手机号"
        width="130"
      >
        <template #default="{ row }">
          {{ maskPhone(row.user?.phone) }}
        </template>
      </el-table-column>
      <el-table-column
        label="用户ID"
        width="110"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="String(row.userId || '')"
            placement="top"
          >
            <span
              class="copyable"
              @click="copyText(String(row.userId || ''))"
            >{{ String(row.userId || '').slice(0, 8) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column
        label="人民币金额"
        width="120"
        align="right"
      >
        <template #default="{ row }">
          <span class="money">{{ fmtMoney(row.amountRmb) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="币数"
        width="100"
        align="right"
      >
        <template #default="{ row }">
          {{ fmtInt(row.amountCoin) }}
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
        label="支付单号"
        width="120"
      >
        <template #default="{ row }">
          <el-tooltip
            v-if="row.orderNo"
            :content="row.orderNo"
            placement="top"
          >
            <span
              class="copyable"
              @click="copyText(row.orderNo!)"
            >{{ row.orderNo.slice(0, 8) }}…</span>
          </el-tooltip>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
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
        label="充值时间"
        width="150"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="fullTime(row.createdAt)"
            placement="top"
          >
            <span>{{ formatTime(row.createdAt) }}</span>
          </el-tooltip>
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
    </template>

    <!-- 管理员充值弹窗 -->
    <el-dialog
      v-model="rechargeVisible"
      title="管理员充值"
      width="500px"
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="管理员充值不会立即到账：提交后进入资金审批中心，财务审批通过才入账"
        style="margin-bottom:12px"
      />
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
            :min="10"
            :step="100"
            style="width: 100%"
          />
          <span class="field-tip">最低 10 币（与后端校验一致）</span>
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
          提交审批
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { coinApi, api } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";
import { exportCSV } from "@/utils/export";

// 充值记录行（后端 VirtualCoinRecharge：amountRmb/amountCoin/payMethod/orderNo/status/createdAt）
interface RechargeRow {
  userId?: string | number
  user?: { nickname?: string; phone?: string }
  amountRmb?: number | string
  amountCoin?: number
  payMethod: string
  status: string
  orderNo?: string
  createdAt: string
}

const list = ref<RechargeRow[]>([]);
const loading = ref(false);
const error = ref(false);
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
  error.value = false;
  try {
    const { data } = await coinApi.getRecharges(
      page.value,
      pageSize.value,
      filterUserId.value || undefined,
    );
    // 后端返回 { recharges, total, page, pageSize }（"recharges" 键或被拦截器解包为 items）
    list.value = data.items || data.recharges || data.list || [];
    total.value = data.total || 0;
  } catch {
    list.value = [];
    total.value = 0;
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function fmtMoney(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("zh-CN");
}

function maskPhone(phone?: string) {
  if (!phone) return "—";
  const s = String(phone);
  if (s.length < 7) return s;
  return s.slice(0, 3) + "****" + s.slice(-4);
}

async function copyText(text: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.warning("复制失败，请手动复制");
  }
}

function payMethodLabel(method: string) {
  const map: Record<string, string> = {
    WECHAT: "微信",
    ALIPAY: "支付宝",
    ADMIN: "管理员充值",
    BANK: "银行转账",
  };
  return map[method] || method || "—";
}

// 后端字段：status = PENDING / PAID / FAILED / REFUNDED
function statusType(status: string) {
  const map: Record<string, string> = {
    PENDING: "warning",
    PAID: "success",
    FAILED: "danger",
    REFUNDED: "info",
  };
  return map[status] || "info";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "待支付",
    PAID: "已到账",
    FAILED: "失败",
    REFUNDED: "已退款",
  };
  return map[status] || status || "—";
}

function formatTime(t: string) {
  if (!t) return "—";
  return t.slice(5, 16).replace("T", " ");
}
function fullTime(t: string) {
  if (!t) return "—";
  return t.slice(0, 19).replace("T", " ");
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
  // 后端 AdminRechargeDto @Min(10)：低于 10 币直接被 400 打回，这里先拦
  if (!coins || coins < 10) {
    ElMessage.warning("充值币数最低 10 币");
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确认给用户 ${userId} 充值 ${coins} 国学币？\n提交后需财务在资金审批中心审批通过才会到账。`,
      "确认提交审批",
      { type: "warning", confirmButtonText: "提交审批", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  submitting.value = true;
  try {
    // 直调审批端点（后端已改为创建资金审批单，不立即到账）；字段名对齐后端 AdminRechargeDto
    await api.post("/coin/admin/recharge", {
      userId,
      amountCoin: coins,
      description: rechargeForm.value.remark || undefined,
    });
    ElMessage.success("已提交审批，待财务审批后生效");
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
      { label: "支付单号", key: "orderNo" },
      { label: "状态", key: "status" },
      { label: "充值时间", key: "createdAt" },
    ],
    list.value.map((r) => ({
      nickname: r.user?.nickname || "—",
      phone: maskPhone(r.user?.phone),
      userId: r.userId,
      amount: fmtMoney(r.amountRmb),
      coins: r.amountCoin ?? "—",
      payMethod: payMethodLabel(r.payMethod),
      orderNo: r.orderNo || "—",
      status: statusLabel(r.status),
      createdAt: fullTime(r.createdAt),
    })),
  );
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: var(--color-text-title); }
.filter-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
.money { font-weight: 600; }
.copyable { cursor: pointer; color: var(--el-color-primary); }
.field-tip { margin-left: 8px; font-size: 12px; color: var(--color-text-secondary); }
</style>
