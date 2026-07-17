<template>
  <div class="page">
    <div class="page-header">
      <h3>收入结算</h3>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="收入结算数据加载失败，请稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchAll"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-row
      v-else
      v-loading="loadingOverview"
      :gutter="16"
      style="margin-bottom:20px"
    >
      <el-col :span="6">
        <el-card
          class="stat-card"
          shadow="hover"
        >
          <div class="stat-label">
            累计销售额
          </div>
          <div class="stat-value">
            {{ fmtMoney(overview.totalRevenue ?? overview.totalSales) }}
          </div>
          <div class="stat-note">
            共 {{ overview.totalOrders ?? "—" }} 笔有效订单
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          class="stat-card"
          shadow="hover"
        >
          <div class="stat-label">
            待结算金额
          </div>
          <div
            class="stat-value"
            style="color:#E6A23C"
          >
            {{ fmtMoney(overview.pendingSettlement) }}
          </div>
          <div
            v-if="overview.pendingSettlement == null"
            class="stat-note"
          >
            后端统计上线中，暂无法展示
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          class="stat-card"
          shadow="hover"
        >
          <div class="stat-label">
            已结算金额
          </div>
          <div
            class="stat-value"
            style="color:#67C23A"
          >
            {{ fmtMoney(overview.settledAmount) }}
          </div>
          <div
            v-if="overview.settledAmount == null"
            class="stat-note"
          >
            后端统计上线中，暂无法展示
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          class="stat-card"
          shadow="hover"
        >
          <!-- commissionRate 后端语义 = 商家分成比例（0.85 = 85% 归商家），非平台抽成 -->
          <div class="stat-label">
            商家分成比例
          </div>
          <div class="stat-value">
            {{ shareRateText }}
          </div>
          <div class="stat-note">
            {{ platformFeeText }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <h4
      v-if="!error"
      style="margin-bottom:12px"
    >
      结算记录
    </h4>
    <el-table
      v-if="!error"
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无结算记录" />
      </template>
      <el-table-column
        label="结算周期"
        min-width="200"
      >
        <template #default="{ row }">
          {{ formatDate(row.periodStart) }} ~ {{ formatDate(row.periodEnd) }}
        </template>
      </el-table-column>
      <el-table-column
        label="订单数"
        width="80"
        prop="orderCount"
      />
      <el-table-column
        label="总销售额"
        width="120"
        align="right"
      >
        <template #default="{ row }">
          {{ fmtMoney(row.totalRevenue) }}
        </template>
      </el-table-column>
      <el-table-column
        label="平台服务费"
        width="120"
        align="right"
      >
        <template #default="{ row }">
          {{ fmtMoney(row.commission) }}
        </template>
      </el-table-column>
      <el-table-column
        label="结算金额"
        width="130"
        align="right"
      >
        <template #default="{ row }">
          <strong style="color:#C41E3A">{{ fmtMoney(row.settlementAmount) }}</strong>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="({ PENDING: 'warning', PAID: 'success', CANCELLED: 'info' } as any)[row.status] || 'info'"
            size="small"
          >
            {{ ({ PENDING: "待结算", PAID: "已支付", CANCELLED: "已取消" } as any)[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="支付时间"
        width="150"
      >
        <template #default="{ row }">
          {{ fmtTime(row.paidAt) }}
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="!error"
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchSettlements"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { merchantBackendApi } from "@/api";

/**
 * 收入概览——后端 getRevenueOverview 现有字段：
 * totalSales/totalOrders/merchantShare/platformShare/commissionRate（commissionRate=商家分成比例）；
 * 新契约补充字段（后端补齐中·缺则"—"降级）：totalRevenue/pendingSettlement/settledAmount/merchantShareRate。
 */
interface RevenueOverview {
  totalSales?: number;
  totalOrders?: number;
  merchantShare?: number;
  platformShare?: number;
  commissionRate?: number;
  totalRevenue?: number;
  pendingSettlement?: number;
  settledAmount?: number;
  merchantShareRate?: number;
}
/** 结算记录行（字段宽松 optional） */
interface SettlementRow {
  periodStart?: string;
  periodEnd?: string;
  orderCount?: number;
  totalRevenue?: number;
  commission?: number;
  settlementAmount?: number;
  status?: string;
  paidAt?: string;
}

const overview = ref<RevenueOverview>({});
const list = ref<SettlementRow[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const loadingOverview = ref(false);
const error = ref(false);

/** 商家分成比例：新契约 merchantShareRate 优先，回退现有 commissionRate（两者均=归商家比例） */
const shareRate = computed(() => overview.value.merchantShareRate ?? overview.value.commissionRate);
const shareRateText = computed(() => (shareRate.value != null ? (shareRate.value * 100).toFixed(1).replace(/\.0$/, "") + "%" : "—"));
const platformFeeText = computed(() =>
  shareRate.value != null ? `平台服务费 ${((1 - shareRate.value) * 100).toFixed(1).replace(/\.0$/, "")}%` : "比例加载中",
);

/** 金额：千分位两位小数，空值显示 —（不显示假 ¥0） */
function fmtMoney(v?: number | string | null): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 时间：YYYY-MM-DD HH:mm，空值显示 — */
function fmtTime(d?: string | null): string {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
}

/** 日期：YYYY-MM-DD（结算周期用） */
function formatDate(d?: string | null): string {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

onMounted(() => fetchAll());

function fetchAll() {
  error.value = false;
  fetchOverview();
  fetchSettlements();
}

async function fetchOverview() {
  loadingOverview.value = true;
  try {
    const res = await merchantBackendApi.getRevenue();
    overview.value = (res as { data?: RevenueOverview }).data ?? (res as RevenueOverview);
  } catch (e) {
    error.value = true;
  } finally { loadingOverview.value = false; }
}

async function fetchSettlements() {
  loading.value = true;
  try {
    const res = await merchantBackendApi.listSettlements({ page: page.value, pageSize: 20 });
    // 兼容两种响应包装：{ data: {...} } 或直接返回 data
    const data = (res as { data?: { items?: SettlementRow[]; list?: SettlementRow[]; data?: SettlementRow[]; total?: number } }).data ?? (res as { items?: SettlementRow[]; list?: SettlementRow[]; data?: SettlementRow[]; total?: number });
    list.value = data.items || data.list || data.data || [];
    total.value = data.total || 0;
  } catch (e) {
    error.value = true;
  } finally { loading.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.stat-card { text-align: center; padding: 12px; }
.stat-card .stat-label { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 8px; }
.stat-card .stat-value { font-size: 24px; font-weight: bold; color: var(--color-text-title); }
.stat-card .stat-note { font-size: 12px; color: var(--color-text-secondary, #999); margin-top: 6px; }
</style>
