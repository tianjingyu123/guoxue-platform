<template>
  <div class="page">
    <div class="toolbar">
      <h3>售后管理</h3>
      <el-select
        v-model="filterStatus"
        placeholder="筛选状态"
        clearable
        style="width:140px"
        @change="fetchList"
      >
        <el-option
          label="待处理"
          value="PENDING"
        />
        <el-option
          label="已同意"
          value="APPROVED"
        />
        <el-option
          label="已拒绝"
          value="REJECTED"
        />
        <el-option
          label="已完成"
          value="COMPLETED"
        />
        <el-option
          label="已取消"
          value="CANCELLED"
        />
      </el-select>
    </div>

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

    <el-table
      v-loading="loading"
      :data="items"
      stripe
    >
      <template #empty>
        <el-empty description="暂无售后记录" />
      </template>
      <el-table-column
        label="售后编号"
        width="100"
      >
        <template #default="{ row }">
          {{ row.id?.slice(0, 10) }}...
        </template>
      </el-table-column>
      <el-table-column
        label="订单编号"
        width="100"
      >
        <template #default="{ row }">
          {{ row.orderId?.slice(0, 10) }}...
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="80"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ typeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="reason"
        label="原因"
        min-width="150"
        show-overflow-tooltip
      />
      <el-table-column
        label="金额"
        width="100"
      >
        <template #default="{ row }">
          ¥{{ row.amount ? Number(row.amount).toFixed(2) : '-' }}
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
      <!-- F5 投诉 SLA：24h 首响倒计时（超时红色·后端 createdAt+24h 推导） -->
      <el-table-column
        label="首响SLA"
        width="110"
      >
        <template #default="{ row }">
          <span
            v-if="row.status === 'PENDING' && row.slaDueAt"
            :style="{ color: slaColor(row), fontWeight: slaOverdue(row) ? '700' : '400', fontSize: '12px' }"
          >
            {{ slaText(row) }}
          </span>
          <span
            v-else
            style="color:#999;font-size:12px"
          >—</span>
        </template>
      </el-table-column>
      <!-- 缓冲期内订单（钱还在平台未结算）标注可快速退款——仅提示·资金动作人工 -->
      <el-table-column
        label="快速退款"
        width="90"
      >
        <template #default="{ row }">
          <el-tooltip
            v-if="row.fastRefundEligible"
            content="订单资金仍在结算缓冲期内（未结算给商家），投诉成立可走快速退款通道；资金操作需人工执行"
            placement="top"
          >
            <el-tag
              type="success"
              size="small"
            >
              可快速退款
            </el-tag>
          </el-tooltip>
          <span
            v-else
            style="color:#999;font-size:12px"
          >—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="申请时间"
        width="100"
      >
        <template #default="{ row }">
          {{ row.createdAt?.slice(0, 10) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="180"
        fixed="right"
      >
        <template #default="{ row }">
          <template v-if="row.status === 'PENDING'">
            <el-button
              size="small"
              type="success"
              @click="handleProcess(row, 'approve')"
            >
              同意
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleProcess(row, 'reject')"
            >
              拒绝
            </el-button>
          </template>
          <span
            v-else
            style="color:#999;font-size:12px"
          >--</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-if="total > 0"
      v-model:current-page="page"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <!-- 处理弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogAction === 'approve' ? '同意售后' : '拒绝售后'"
      width="420px"
    >
      <!-- 快速退款通道标注：投诉成立处置处提示（只标注·不自动退款） -->
      <el-alert
        v-if="dialogAction === 'approve' && processRow?.fastRefundEligible"
        type="success"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
        title="可快速退款：该订单资金仍在结算缓冲期内（未结算给商家），退款不涉追回，可走快速退款通道。资金操作需人工在结算/财务侧执行。"
      />
      <el-form label-width="60px">
        <el-form-item label="备注">
          <el-input
            v-model="processRemark"
            type="textarea"
            :rows="3"
            :placeholder="dialogAction === 'reject' ? '请填写拒绝原因' : '可选填备注'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          :type="dialogAction === 'approve' ? 'success' : 'danger'"
          :loading="processing"
          @click="confirmProcess"
        >
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

/** 售后申请行（字段宽松 optional，仅覆盖模板/脚本实际访问字段） */
interface AfterSaleRow {
  id?: string;
  orderId?: string;
  type?: string;
  reason?: string;
  amount?: number | string;
  status?: string;
  createdAt?: string;
  /** F5 投诉 SLA（后端 createdAt+24h 推导） */
  slaDueAt?: string | null;
  slaOverdue?: boolean;
  /** 订单资金仍在结算缓冲期内（可快速退款标注·仅提示） */
  fastRefundEligible?: boolean;
}

const loading = ref(false);
const error = ref(false);
const processing = ref(false);
const items = ref<AfterSaleRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const filterStatus = ref("PENDING");
const dialogVisible = ref(false);
const dialogAction = ref("");
const processRemark = ref("");
const processId = ref("");
const processRow = ref<AfterSaleRow | null>(null);

// ── F5 投诉 SLA：24h 首响倒计时（30s 刷新一次·超时红色） ──
const nowTick = ref(Date.now());
let slaTimer: number | undefined;

function slaOverdue(row: AfterSaleRow) {
  return !!row.slaDueAt && new Date(row.slaDueAt).getTime() <= nowTick.value;
}

function slaText(row: AfterSaleRow) {
  if (!row.slaDueAt) return "—";
  const diff = new Date(row.slaDueAt).getTime() - nowTick.value;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  return diff > 0 ? `剩 ${h}h${m}m` : `超时 ${h}h${m}m`;
}

function slaColor(row: AfterSaleRow) {
  if (slaOverdue(row)) return "#f56c6c"; // 超时红色
  const remain = new Date(row.slaDueAt as string).getTime() - nowTick.value;
  return remain < 4 * 3_600_000 ? "#e6a23c" : "#606266"; // 临期橙色
}

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

onMounted(() => {
  fetchList();
  slaTimer = window.setInterval(() => { nowTick.value = Date.now(); }, 30_000);
});

onUnmounted(() => {
  if (slaTimer) window.clearInterval(slaTimer);
});

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await api.get("/shop/admin/after-sales", {
      params: {
        page: page.value, pageSize: pageSize.value,
        status: filterStatus.value || undefined,
      },
    });
    items.value = data?.items || data?.data || [];
    total.value = data?.total || 0;
  } catch {
    items.value = [];
    total.value = 0;
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function handleProcess(row: AfterSaleRow, action: string) {
  processId.value = row.id ?? "";
  processRow.value = row;
  dialogAction.value = action;
  processRemark.value = "";
  dialogVisible.value = true;
}

async function confirmProcess() {
  if (dialogAction.value === "reject" && !processRemark.value.trim()) {
    ElMessage.warning("请填写拒绝原因");
    return;
  }
  if (processing.value) return;
  processing.value = true;
  try {
    await api.put(`/shop/admin/after-sales/${processId.value}/process`, {
      action: dialogAction.value,
      remark: processRemark.value,
    });
    ElMessage.success(dialogAction.value === "approve" ? "已同意售后" : "已拒绝售后");
    dialogVisible.value = false;
    fetchList();
  } catch (e) {
    ElMessage.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "操作失败");
  } finally {
    processing.value = false;
  }
}
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 16px; }
</style>
