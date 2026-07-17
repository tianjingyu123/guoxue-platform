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
        label="原因"
        min-width="150"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ parsedReason(row).text || '-' }}
          <el-tag
            v-if="parsedReason(row).images.length"
            size="small"
            type="info"
            effect="plain"
          >
            {{ parsedReason(row).images.length }}图
          </el-tag>
        </template>
      </el-table-column>
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
        width="120"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="fmtFullTime(row.createdAt)"
            placement="top"
          >
            <span>{{ fmtTime(row.createdAt) }}</span>
          </el-tooltip>
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

    <!-- 处理弹窗：审核弹窗内呈现被审内容本体（订单金额/申请原因/凭证图） -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogAction === 'approve' ? '同意售后' : '拒绝售后'"
      width="520px"
    >
      <!-- 快速退款通道标注：投诉成立处置处提示（只标注·不自动退款） -->
      <el-alert
        v-if="dialogAction === 'approve' && processRow?.fastRefundEligible"
        type="success"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
        title="可快速退款：该订单资金仍在结算缓冲期内（未结算给商家），退款不涉追回，可走快速退款通道。"
      />
      <el-descriptions
        :column="1"
        border
        size="small"
      >
        <el-descriptions-item label="订单编号">
          {{ processRow?.orderId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="售后类型">
          {{ typeLabel(processRow?.type ?? '') }}
        </el-descriptions-item>
        <el-descriptions-item label="申请金额">
          <span :class="{ 'amount-strong': isRefundType(processRow?.type) }">
            ¥{{ processRow?.amount ? Number(processRow.amount).toFixed(2) : '-' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="申请原因">
          <span style="white-space:pre-wrap">{{ parsedReason(processRow).text || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item
          v-if="parsedReason(processRow).images.length"
          label="凭证图片"
        >
          <div class="voucher-imgs">
            <el-image
              v-for="(img, i) in parsedReason(processRow).images"
              :key="img"
              :src="img"
              :preview-src-list="parsedReason(processRow).images"
              :initial-index="i"
              fit="cover"
              class="voucher-img"
              preview-teleported
            />
          </div>
        </el-descriptions-item>
      </el-descriptions>
      <p
        v-if="dialogAction === 'approve' && isRefundType(processRow?.type)"
        class="danger-hint"
      >
        此操作真金退款不可逆：同意后将向用户真金退款
        ¥{{ processRow?.amount ? Number(processRow.amount).toFixed(2) : '-' }}，资金原路退回支付渠道。
      </p>
      <el-form
        label-width="60px"
        style="margin-top:12px"
      >
        <el-form-item label="备注">
          <el-input
            v-model="processRemark"
            type="textarea"
            :rows="3"
            :placeholder="dialogAction === 'reject' ? '请填写拒绝原因（必填）' : '可选填备注'"
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
import { ElMessage } from "element-plus";
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

/** 售后类型翻译：C 端真实写入 refund_only / refund_with_return（原映射漏这两值致英文直出） */
function typeLabel(t: string) {
  const map: Record<string, string> = {
    refund_only: "仅退款", refund_with_return: "退货退款",
    refund: "退款", REFUND: "退款", return: "退货", exchange: "换货",
  };
  return map[t] || t;
}
/** 退款类判定（与后端 isRefundType 同口径：type 含 refund 即同意时真金退款） */
function isRefundType(t?: string | null) {
  return /refund/i.test(t ?? "");
}

/**
 * 被审内容解析：后端 applyAfterSale 把凭证图并入 reason 存档
 * （格式 "原因文本\n[凭证图片] url1 url2"），此处拆回 文本 + 图片列表 供弹窗呈现。
 */
function parsedReason(row: AfterSaleRow | null): { text: string; images: string[] } {
  const raw = row?.reason || "";
  const marker = "[凭证图片]";
  const idx = raw.indexOf(marker);
  if (idx < 0) return { text: raw, images: [] };
  const text = raw.slice(0, idx).trim();
  const images = raw.slice(idx + marker.length).trim().split(/\s+/).filter((u) => /^https?:\/\//.test(u));
  return { text, images };
}

/** 列表时间：MM-DD HH:mm（原先只切到日期，同日多单无法排序核对） */
function fmtTime(d?: string) {
  if (!d) return "-";
  const t = new Date(d);
  if (isNaN(t.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
}
function fmtFullTime(d?: string) {
  if (!d) return "-";
  const t = new Date(d);
  if (isNaN(t.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`;
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
.voucher-imgs { display: flex; gap: 8px; flex-wrap: wrap; }
.voucher-img { width: 64px; height: 64px; border-radius: 4px; cursor: pointer; }
.amount-strong { color: var(--color-error, #f56c6c); font-weight: 700; }
.danger-hint { margin-top: 12px; color: var(--color-error, #f56c6c); font-size: 13px; }
</style>
