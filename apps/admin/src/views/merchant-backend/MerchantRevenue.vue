<template>
  <div class="revenue-page">
    <section class="revenue-hero">
      <div class="hero-copy">
        <p class="eyebrow">
          资金对账中心 · SETTLEMENT LEDGER
        </p>
        <h1>每一笔成交，最终都要清楚落到账上</h1>
        <p>
          同时核对成交、商家应得、平台服务费与实际到账。商家侧只读，平台生成结算单并完成打款，
          避免把“累计收入”误解为可立即提现余额。
        </p>
        <div class="hero-actions">
          <el-button
            plain
            @click="router.push('/merchant-backend/orders')"
          >
            核对订单
          </el-button>
          <el-button
            plain
            @click="router.push('/merchant-backend/after-sales')"
          >
            核对售后
          </el-button>
          <el-button
            type="primary"
            :loading="loading"
            @click="fetchAll"
          >
            刷新账目
          </el-button>
        </div>
      </div>
      <div class="hero-total">
        <span>累计应得分成</span>
        <strong>{{ fmtMoney(merchantShare) }}</strong>
        <small>{{ totalOrdersText }}</small>
      </div>
    </section>

    <el-result
      v-if="error"
      icon="error"
      title="收入结算数据加载失败"
      sub-title="请检查网络或稍后重试，现有账目不会受到影响。"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchAll"
        >
          重新加载
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <section
        v-loading="loadingOverview"
        class="money-metrics"
        aria-label="资金指标总览"
      >
        <article class="money-card tone-sales">
          <span>累计有效成交</span>
          <strong>{{ fmtMoney(overview.totalSales) }}</strong>
          <small>{{ totalOrdersText }}</small>
        </article>
        <article class="money-card tone-share">
          <span>累计应得分成</span>
          <strong>{{ fmtMoney(merchantShare) }}</strong>
          <small>按当前商家留成比例估算</small>
        </article>
        <article class="money-card tone-pending">
          <span>待平台结算</span>
          <strong>{{ fmtMoney(overview.pendingSettlement) }}</strong>
          <small>{{ pendingCount }} 个账期待处理</small>
        </article>
        <article class="money-card tone-paid">
          <span>已结算到账</span>
          <strong>{{ fmtMoney(overview.settledAmount) }}</strong>
          <small>{{ paidCount }} 个账期已完成</small>
        </article>
      </section>

      <section class="settlement-policy">
        <div>
          <p class="eyebrow">
            SETTLEMENT POLICY
          </p>
          <h2>当前结算规则</h2>
          <span>结算比例、账期和收款账户由平台审核维护，商家不能自行修改资金结果。</span>
        </div>
        <dl>
          <div>
            <dt>商家留成</dt>
            <dd>{{ shareRateText }}</dd>
          </div>
          <div>
            <dt>平台服务费</dt>
            <dd>{{ platformFeeText }}</dd>
          </div>
          <div>
            <dt>结算方式</dt>
            <dd>平台审核后打款</dd>
          </div>
        </dl>
      </section>

      <section class="revenue-workspace">
        <div class="ledger-panel">
          <header class="panel-header">
            <div>
              <p class="eyebrow">
                SETTLEMENT BILLS
              </p>
              <h2>结算账单</h2>
              <span>点击账单可展开金额构成和到账信息。</span>
            </div>
            <div
              class="status-tabs"
              role="tablist"
              aria-label="结算状态筛选"
            >
              <button
                v-for="tab in statusTabs"
                :key="tab.value || 'all'"
                type="button"
                :class="{ active: statusFilter === tab.value }"
                @click="statusFilter = tab.value"
              >
                {{ tab.label }} <small>{{ tab.count }}</small>
              </button>
            </div>
          </header>

          <div
            v-loading="loading"
            class="bill-list"
          >
            <button
              v-for="row in filteredList"
              :key="row.id"
              type="button"
              class="bill-card"
              :class="{ expanded: expandedId === row.id }"
              @click="toggle(row.id)"
            >
              <span
                class="status-line"
                :class="statusClass(row.status)"
              />
              <span class="bill-main">
                <span class="bill-period">{{ periodText(row) }}</span>
                <small>{{ row.orderCount ?? 0 }} 笔订单 · {{ settlementNo(row) }}</small>
              </span>
              <span class="bill-money">
                <small>商家应得</small>
                <strong>{{ fmtMoney(row.settlementAmount) }}</strong>
              </span>
              <span
                class="bill-status"
                :class="statusClass(row.status)"
              >
                {{ statusText(row.status) }}
              </span>
              <span class="bill-arrow">{{ expandedId === row.id ? "⌃" : "⌄" }}</span>

              <span
                v-if="expandedId === row.id"
                class="bill-detail"
              >
                <span class="detail-grid">
                  <span>
                    <small>订单成交额</small>
                    <strong>{{ fmtMoney(row.totalRevenue) }}</strong>
                  </span>
                  <span>
                    <small>平台服务费</small>
                    <strong class="fee">− {{ fmtMoney(row.commission) }}</strong>
                  </span>
                  <span>
                    <small>实际打款</small>
                    <strong>{{ fmtMoney(row.paidAmount ?? row.settlementAmount) }}</strong>
                  </span>
                  <span>
                    <small>到账时间</small>
                    <strong>{{ fmtTime(row.paidAt) }}</strong>
                  </span>
                </span>
                <span
                  v-if="row.remark"
                  class="bill-remark"
                >结算备注：{{ row.remark }}</span>
                <span
                  v-else
                  class="bill-remark"
                >账目说明：成交额减去平台服务费，得到本期商家应得金额。</span>
              </span>
            </button>

            <el-empty
              v-if="!loading && filteredList.length === 0"
              description="当前筛选下暂无结算账单"
            />
          </div>

          <el-pagination
            v-if="total > pageSize"
            v-model:current-page="page"
            :total="total"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            @current-change="fetchSettlements"
          />
        </div>

        <aside class="finance-rail">
          <article class="rail-card">
            <p class="eyebrow">
              MONEY ROUTE
            </p>
            <h2>一笔钱的三段旅程</h2>
            <ol class="money-route">
              <li>
                <b>01</b>
                <span><strong>订单沉淀</strong><small>已支付、已发货或已完成订单进入有效成交口径。</small></span>
              </li>
              <li>
                <b>02</b>
                <span><strong>账期核算</strong><small>平台按结算周期聚合成交并扣除约定服务费。</small></span>
              </li>
              <li>
                <b>03</b>
                <span><strong>审核打款</strong><small>结算单审核通过后打款，到账时间在账单内留痕。</small></span>
              </li>
            </ol>
          </article>

          <article class="rail-card reconciliation">
            <p class="eyebrow">
              RECONCILIATION
            </p>
            <h2>今日对账提醒</h2>
            <div class="reconcile-row">
              <span>待结算账期</span>
              <strong>{{ pendingCount }}</strong>
            </div>
            <div class="reconcile-row">
              <span>已取消账期</span>
              <strong :class="{ danger: cancelledCount > 0 }">{{ cancelledCount }}</strong>
            </div>
            <p>{{ reconciliationHint }}</p>
            <button
              type="button"
              @click="router.push('/merchant-backend/orders')"
            >
              查看订单来源 ›
            </button>
          </article>

          <article class="rail-card safety">
            <p class="eyebrow">
              ACCOUNT SAFETY
            </p>
            <h2>资金安全边界</h2>
            <ul>
              <li>商家端不提供自行改价、生成结算或确认打款入口。</li>
              <li>退款与退货必须先进入售后质检闭环，再影响资金结果。</li>
              <li>实际打款金额、时间与备注均保留在结算单中。</li>
            </ul>
          </article>
        </aside>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { merchantBackendApi } from "@/api";

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

interface SettlementRow {
  id: string;
  periodStart?: string;
  periodEnd?: string;
  orderCount?: number;
  totalRevenue?: number;
  commission?: number;
  settlementAmount?: number;
  paidAmount?: number | null;
  status?: string;
  paidAt?: string | null;
  remark?: string | null;
}

const router = useRouter();
const route = useRoute();
const pageSize = 100;
const overview = ref<RevenueOverview>({});
const list = ref<SettlementRow[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const loadingOverview = ref(false);
const error = ref(false);
const statusFilter = ref("");
const expandedId = ref("");
const isPreview = computed(() => Boolean(route.meta.devPreview));

const previewOverview: RevenueOverview = {
  totalSales: 286430.8,
  totalOrders: 742,
  merchantShare: 243466.18,
  platformShare: 42964.62,
  merchantShareRate: 0.85,
  commissionRate: 0.85,
  totalRevenue: 268120.4,
  pendingSettlement: 18420.6,
  settledAmount: 225045.58,
};

const previewRows: SettlementRow[] = [
  {
    id: "ST20260715001",
    periodStart: "2026-07-01T00:00:00.000Z",
    periodEnd: "2026-07-15T23:59:59.000Z",
    orderCount: 56,
    totalRevenue: 21671.3,
    commission: 3250.7,
    settlementAmount: 18420.6,
    status: "PENDING",
    remark: "待平台完成账期复核",
  },
  {
    id: "ST20260630002",
    periodStart: "2026-06-16T00:00:00.000Z",
    periodEnd: "2026-06-30T23:59:59.000Z",
    orderCount: 63,
    totalRevenue: 24890.4,
    commission: 3733.56,
    settlementAmount: 21156.84,
    paidAmount: 21156.84,
    status: "PAID",
    paidAt: "2026-07-08T09:26:00.000Z",
    remark: "已打款至审核通过的商家收款账户",
  },
  {
    id: "ST20260615003",
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-15T23:59:59.000Z",
    orderCount: 48,
    totalRevenue: 19432,
    commission: 2914.8,
    settlementAmount: 16517.2,
    paidAmount: 16517.2,
    status: "PAID",
    paidAt: "2026-06-23T11:12:00.000Z",
  },
  {
    id: "ST20260531004",
    periodStart: "2026-05-16T00:00:00.000Z",
    periodEnd: "2026-05-31T23:59:59.000Z",
    orderCount: 41,
    totalRevenue: 15380.9,
    commission: 2307.14,
    settlementAmount: 13073.76,
    status: "CANCELLED",
    remark: "账期包含售后争议订单，已撤销并重新核算",
  },
];

const shareRate = computed(() => overview.value.merchantShareRate ?? overview.value.commissionRate);
const normalizedShareRate = computed(() => {
  const value = Number(shareRate.value);
  if (!Number.isFinite(value)) return null;
  return value > 1 ? value / 100 : value;
});
const shareRateText = computed(() => normalizedShareRate.value == null
  ? "—"
  : `${Number((normalizedShareRate.value * 100).toFixed(2))}%`);
const platformFeeText = computed(() => normalizedShareRate.value == null
  ? "—"
  : `${Number(((1 - normalizedShareRate.value) * 100).toFixed(2))}%`);
const merchantShare = computed(() => {
  if (overview.value.merchantShare != null) return Number(overview.value.merchantShare);
  if (overview.value.totalSales != null && normalizedShareRate.value != null) {
    return Number(overview.value.totalSales) * normalizedShareRate.value;
  }
  return null;
});
const totalOrdersText = computed(() => overview.value.totalOrders == null
  ? "有效订单口径加载中"
  : `共 ${overview.value.totalOrders} 笔有效订单`);

const pendingCount = computed(() => list.value.filter((item) => item.status === "PENDING").length);
const paidCount = computed(() => list.value.filter((item) => item.status === "PAID").length);
const cancelledCount = computed(() => list.value.filter((item) => item.status === "CANCELLED").length);
const filteredList = computed(() => statusFilter.value
  ? list.value.filter((item) => item.status === statusFilter.value)
  : list.value);
const statusTabs = computed(() => [
  { label: "全部", value: "", count: list.value.length },
  { label: "待结算", value: "PENDING", count: pendingCount.value },
  { label: "已到账", value: "PAID", count: paidCount.value },
  { label: "已取消", value: "CANCELLED", count: cancelledCount.value },
]);
const reconciliationHint = computed(() => {
  if (cancelledCount.value > 0) return "存在已取消账期，请结合售后争议与订单状态核对重新生成原因。";
  if (pendingCount.value > 0) return "当前有待结算账期，到账前可先核对订单数、成交额和平台服务费。";
  return "当前结算账目无待处理异常，继续关注新账期生成。";
});

function unwrap<T>(response: unknown): T {
  const outer = response as { data?: T | { data?: T } };
  if (outer?.data && typeof outer.data === "object" && "data" in outer.data) {
    return (outer.data as { data?: T }).data as T;
  }
  return (outer?.data ?? response) as T;
}

function fmtMoney(value?: number | string | null): string {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtTime(value?: string | null): string {
  if (!value) return "—";
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "—";
  return time.toLocaleString("zh-CN", { hour12: false });
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "—";
  const month = String(time.getMonth() + 1).padStart(2, "0");
  const day = String(time.getDate()).padStart(2, "0");
  return `${time.getFullYear()}.${month}.${day}`;
}

function periodText(row: SettlementRow) {
  return `${formatDate(row.periodStart)} — ${formatDate(row.periodEnd)}`;
}

function settlementNo(row: SettlementRow) {
  return `结算单 ${row.id}`;
}

function statusText(status?: string) {
  return ({ PENDING: "待平台结算", PAID: "已到账", CANCELLED: "已取消" } as Record<string, string>)[status || ""] || status || "未知状态";
}

function statusClass(status?: string) {
  if (status === "PAID") return "paid";
  if (status === "PENDING") return "pending";
  return "cancelled";
}

function toggle(id: string) {
  expandedId.value = expandedId.value === id ? "" : id;
}

async function fetchOverview() {
  loadingOverview.value = true;
  try {
    if (isPreview.value) {
      overview.value = previewOverview;
      return;
    }
    overview.value = unwrap<RevenueOverview>(await merchantBackendApi.getRevenue());
  } finally {
    loadingOverview.value = false;
  }
}

async function fetchSettlements() {
  loading.value = true;
  try {
    if (isPreview.value) {
      list.value = previewRows;
      total.value = previewRows.length;
      return;
    }
    const payload = unwrap<{ items?: SettlementRow[]; list?: SettlementRow[]; data?: SettlementRow[]; total?: number }>(
      await merchantBackendApi.listSettlements({ page: page.value, pageSize }),
    );
    list.value = payload?.items || payload?.list || payload?.data || [];
    total.value = Number(payload?.total || list.value.length);
  } finally {
    loading.value = false;
  }
}

async function fetchAll() {
  error.value = false;
  try {
    await Promise.all([fetchOverview(), fetchSettlements()]);
  } catch {
    error.value = true;
  }
}

onMounted(fetchAll);
</script>

<style scoped>
.revenue-page{
  min-height:100%;
  padding:24px;
  background:
    radial-gradient(circle at 92% 1%,rgba(219,188,123,.14),transparent 28%),
    #f4f6f9;
  color:#1f2a37;
  box-sizing:border-box
}
.revenue-hero{
  position:relative;
  overflow:hidden;
  display:flex;
  justify-content:space-between;
  gap:32px;
  min-height:220px;
  padding:34px 38px;
  border-radius:28px;
  color:#fff;
  background:
    radial-gradient(circle at 90% 20%,rgba(221,192,126,.32),transparent 26%),
    linear-gradient(125deg,#102a46 0%,#174b69 58%,#5e5a4c 100%);
  box-shadow:0 20px 50px rgba(21,47,72,.18);
  box-sizing:border-box
}
.revenue-hero::after{
  content:"";
  position:absolute;
  right:-80px;
  bottom:-180px;
  width:360px;
  height:360px;
  border:1px solid rgba(255,255,255,.12);
  border-radius:50%;
  box-shadow:0 0 0 42px rgba(255,255,255,.035),0 0 0 84px rgba(255,255,255,.025)
}
.hero-copy{position:relative;z-index:1;max-width:760px}
.eyebrow{margin:0 0 8px;color:#a36a33;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
.revenue-hero .eyebrow{color:#f1d69d}
.hero-copy h1{margin:0;font:700 31px/1.28 "Songti SC","STSong",serif;letter-spacing:.03em}
.hero-copy>p:not(.eyebrow){max-width:700px;margin:14px 0 22px;color:rgba(255,255,255,.75);line-height:1.8}
.hero-actions{display:flex;gap:10px;flex-wrap:wrap}
.revenue-hero :deep(.el-button.is-plain){border-color:rgba(255,255,255,.3);color:#fff;background:rgba(255,255,255,.05)}
.revenue-hero :deep(.el-button--primary){border-color:#c53c4d;background:#c53c4d}
.hero-total{position:relative;z-index:1;align-self:center;min-width:250px;padding:24px 28px;border-left:1px solid rgba(255,255,255,.2)}
.hero-total span,.hero-total small{display:block;color:rgba(255,255,255,.7)}
.hero-total strong{display:block;margin:8px 0;font:700 34px/1.1 Georgia,serif;color:#f2d493}
.money-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:18px 0}
.money-card{position:relative;overflow:hidden;min-height:138px;padding:22px 24px;border:1px solid #e8ebef;border-radius:20px;background:#fff;box-shadow:0 9px 24px rgba(31,42,55,.05);box-sizing:border-box}
.money-card::after{content:"";position:absolute;right:-30px;top:-38px;width:104px;height:104px;border-radius:50%;background:var(--tone)}
.money-card span,.money-card small{position:relative;z-index:1;display:block;color:#7b8794}
.money-card strong{position:relative;z-index:1;display:block;margin:12px 0 8px;font:700 27px/1 Georgia,serif;color:#24374a}
.tone-sales{--tone:#e5edf7}.tone-share{--tone:#f3ead5}.tone-pending{--tone:#f7dfdc}.tone-paid{--tone:#dceee9}
.settlement-policy{display:flex;align-items:center;justify-content:space-between;gap:30px;margin-bottom:18px;padding:22px 26px;border:1px solid #e8e0d2;border-radius:20px;background:#fffdf8}
.settlement-policy h2,.panel-header h2,.rail-card h2{margin:0;font:700 21px/1.3 "Songti SC","STSong",serif}
.settlement-policy>div>span,.panel-header>div>span{display:block;margin-top:7px;color:#808b96;font-size:13px}
.settlement-policy dl{display:grid;grid-template-columns:repeat(3,minmax(140px,1fr));gap:10px;margin:0}
.settlement-policy dl div{padding:12px 18px;border-left:1px solid #e5ddd0}
.settlement-policy dt{color:#8b9299;font-size:12px}
.settlement-policy dd{margin:6px 0 0;color:#3e4c59;font-weight:750}
.revenue-workspace{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(280px,.7fr);gap:18px;align-items:start}
.ledger-panel,.rail-card{border:1px solid #e7e9ed;border-radius:22px;background:#fff;box-shadow:0 9px 24px rgba(31,42,55,.05)}
.ledger-panel{padding:24px}
.panel-header{display:flex;justify-content:space-between;gap:20px;margin-bottom:20px}
.status-tabs{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.status-tabs button{padding:8px 12px;border:1px solid #e6e9ed;border-radius:999px;color:#697683;background:#fff;cursor:pointer}
.status-tabs button.active{border-color:#254f70;color:#fff;background:#254f70}
.status-tabs small{margin-left:3px;opacity:.75}
.bill-list{min-height:180px}
.bill-card{position:relative;display:grid;grid-template-columns:4px minmax(220px,1.4fr) minmax(130px,.55fr) 110px 18px;gap:16px;align-items:center;width:100%;margin-bottom:10px;padding:18px;border:1px solid #e8ebee;border-radius:16px;color:inherit;text-align:left;background:#fff;cursor:pointer;transition:border-color .2s,box-shadow .2s,transform .2s}
.bill-card:hover{border-color:#b8c8d7;box-shadow:0 10px 24px rgba(34,67,94,.09);transform:translateY(-1px)}
.bill-card.expanded{border-color:#b6c7d4;background:#fbfdff}
.status-line{align-self:stretch;border-radius:99px;background:#aeb5bd}.status-line.pending{background:#d39b41}.status-line.paid{background:#3b9272}.status-line.cancelled{background:#b76868}
.bill-main,.bill-money{display:flex;flex-direction:column;gap:6px}
.bill-period{font-weight:750}.bill-main small,.bill-money small{color:#8a949e}
.bill-money strong{font:700 20px/1 Georgia,serif;color:#a36a33}
.bill-status{justify-self:start;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700}.bill-status.pending{color:#a36a33;background:#fff5df}.bill-status.paid{color:#247255;background:#e5f4ed}.bill-status.cancelled{color:#a34a4a;background:#faeaea}
.bill-arrow{color:#9aa4ad}
.bill-detail{grid-column:2/-1;display:block;padding-top:18px;border-top:1px dashed #dbe1e6}
.detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.detail-grid>span{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:12px;background:#f4f6f8}
.detail-grid small{color:#89939d}.detail-grid strong{font-size:14px}.detail-grid .fee{color:#b4574d}
.bill-remark{display:block;margin-top:12px;padding:10px 12px;border-radius:10px;color:#6e5b43;background:#fbf5e9;font-size:12px}
.finance-rail{display:flex;flex-direction:column;gap:14px}
.rail-card{padding:22px}
.money-route{list-style:none;margin:18px 0 0;padding:0}
.money-route li{position:relative;display:flex;gap:14px;padding-bottom:20px}
.money-route li:not(:last-child)::after{content:"";position:absolute;left:16px;top:34px;bottom:2px;width:1px;background:#d9dee4}
.money-route b{position:relative;z-index:1;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;color:#fff;background:#264f70;font-size:11px}
.money-route span{display:flex;flex:1;flex-direction:column;gap:5px}.money-route small{color:#7f8993;line-height:1.55}
.reconcile-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #edf0f2}.reconcile-row span{color:#798590}.reconcile-row strong{font:700 20px/1 Georgia,serif;color:#284d69}.reconcile-row strong.danger{color:#b64d4d}
.reconciliation>p:not(.eyebrow){margin:14px 0;color:#766750;line-height:1.65}
.rail-card button{width:100%;padding:11px;border:0;border-radius:12px;color:#1f5575;background:#eaf2f7;cursor:pointer}
.safety{background:linear-gradient(145deg,#fffdf8,#f7f4ee)}
.safety ul{margin:14px 0 0;padding-left:18px;color:#6f7780;line-height:1.8}
:deep(.el-pagination){justify-content:flex-end;margin-top:18px}
@media (max-width:1180px){
  .money-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .revenue-workspace{grid-template-columns:1fr}
  .finance-rail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media (max-width:820px){
  .revenue-page{padding:14px}
  .revenue-hero{flex-direction:column;padding:26px 24px;border-radius:22px}
  .hero-total{align-self:stretch;border-top:1px solid rgba(255,255,255,.2);border-left:0;padding:18px 0 0}
  .settlement-policy,.panel-header{align-items:flex-start;flex-direction:column}
  .settlement-policy dl{width:100%;grid-template-columns:1fr}
  .settlement-policy dl div{border-top:1px solid #e5ddd0;border-left:0}
  .finance-rail{grid-template-columns:1fr}
  .bill-card{grid-template-columns:4px 1fr auto}
  .bill-money{grid-column:2}.bill-status{grid-column:3;grid-row:1}.bill-arrow{grid-column:3;grid-row:2;justify-self:end}
  .bill-detail{grid-column:2/-1}.detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:520px){
  .money-metrics{grid-template-columns:1fr 1fr}
  .money-card{min-height:126px;padding:18px}
  .money-card strong{font-size:21px}
  .hero-copy h1{font-size:25px}
  .ledger-panel{padding:17px}
  .status-tabs{overflow-x:auto;flex-wrap:nowrap;width:100%}
  .status-tabs button{white-space:nowrap}
  .detail-grid{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){
  .bill-card{transition:none}
}
</style>
