<template>
  <main class="dashboard-page">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">
          经营脉搏 · BUSINESS PULSE
        </p>
        <h1>{{ shopName || "商家经营驾驶舱" }}</h1>
        <p>把成交、订单、商品、服务与口碑放进一张经营地图，数据不仅用于查看，也直接通往下一步行动。</p>
      </div>
      <div
        class="hero-summary"
        aria-label="累计经营概览"
      >
        <span>累计成交</span>
        <strong>{{ fmtMoney(dashboard.totalSales) }}</strong>
        <small>{{ dashboard.totalOrders ?? "—" }} 笔订单沉淀</small>
      </div>
      <div class="hero-actions">
        <el-button
          plain
          @click="router.push('/merchant-backend/orders')"
        >
          订单中枢
        </el-button>
        <el-button
          plain
          @click="router.push('/merchant-backend/inventory')"
        >
          库存与采购
        </el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="loadDashboard"
        >
          刷新数据
        </el-button>
      </div>
    </section>

    <el-result
      v-if="error"
      icon="error"
      title="经营数据加载失败"
      sub-title="网络恢复后可重新读取，当前没有使用模拟数据覆盖真实经营结果。"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="loadDashboard"
        >
          重新加载
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <section
        v-loading="loading"
        class="metric-grid"
        aria-label="经营关键指标"
      >
        <button
          v-for="card in cards"
          :key="card.label"
          :class="['metric-card', `tone-${card.tone}`]"
          type="button"
          :aria-label="`${card.label}${card.value}，${card.action}`"
          @click="router.push(card.path)"
        >
          <span class="metric-kicker">{{ card.kicker }}</span>
          <strong>{{ card.value }}</strong>
          <span class="metric-label">{{ card.label }}</span>
          <small>{{ card.action }} <b>›</b></small>
        </button>
      </section>

      <section class="route-card">
        <div class="section-lead">
          <div>
            <p class="eyebrow dark">
              OPERATING ROUTE
            </p>
            <h2>今天先处理什么</h2>
          </div>
          <p>先清阻塞成交的问题，再维护履约与口碑。每个节点都可直接进入处理队列。</p>
        </div>
        <div
          class="route-track"
          aria-label="今日经营任务"
        >
          <button
            type="button"
            @click="router.push('/merchant-backend/orders')"
          >
            <i>01</i>
            <span>
              <b>成交确认</b>
              <small>{{ dashboard.todayOrders ?? "—" }} 笔今日订单</small>
            </span>
            <em>查看订单 ›</em>
          </button>
          <button
            type="button"
            :class="{ urgent: Number(pendingShip || 0) > 0 }"
            @click="router.push('/merchant-backend/shipping')"
          >
            <i>02</i>
            <span>
              <b>发货履约</b>
              <small>{{ pendingShip ?? "—" }} 笔等待出库</small>
            </span>
            <em>去发货 ›</em>
          </button>
          <button
            type="button"
            :class="{ urgent: Number(pendingAfterSales || 0) > 0 }"
            @click="router.push('/merchant-backend/after-sales')"
          >
            <i>03</i>
            <span>
              <b>售后止损</b>
              <small>{{ pendingAfterSales ?? "—" }} 笔等待处理</small>
            </span>
            <em>去质检 ›</em>
          </button>
          <button
            type="button"
            :class="{ urgent: Number(dashboard.pendingReviews || 0) > 0 }"
            @click="router.push('/merchant-backend/reviews')"
          >
            <i>04</i>
            <span>
              <b>口碑维护</b>
              <small>{{ dashboard.pendingReviews ?? "—" }} 条等待回复</small>
            </span>
            <em>去回复 ›</em>
          </button>
        </div>
      </section>

      <section class="decision-grid">
        <article class="decision-card">
          <header>
            <div>
              <p class="eyebrow dark">
                TODAY
              </p>
              <h2>今日经营判断</h2>
            </div>
            <span class="live-dot">实时快照</span>
          </header>
          <div class="today-amount">
            <span>今日成交额</span>
            <strong>{{ fmtMoney(dashboard.todaySales) }}</strong>
          </div>
          <p>{{ todayInsight }}</p>
          <button
            type="button"
            @click="router.push('/merchant-backend/revenue')"
          >
            查看收入与结算明细 ›
          </button>
        </article>

        <article class="decision-card service-card">
          <header>
            <div>
              <p class="eyebrow dark">
                SERVICE HEALTH
              </p>
              <h2>服务健康度</h2>
            </div>
            <span>{{ ratingText }}</span>
          </header>
          <div class="score-line">
            <strong>{{ ratingValue }}</strong>
            <div>
              <span>店铺评分</span>
              <i><b :style="{ width: `${ratingProgress}%` }" /></i>
            </div>
          </div>
          <p>{{ serviceInsight }}</p>
          <button
            type="button"
            @click="router.push('/merchant-backend/reviews')"
          >
            查看评价与回复 ›
          </button>
        </article>

        <article class="decision-card stock-card">
          <header>
            <div>
              <p class="eyebrow dark">
                MERCHANDISE
              </p>
              <h2>商品经营面</h2>
            </div>
            <span>{{ productDisplay }} 件商品</span>
          </header>
          <div class="stock-actions">
            <button
              type="button"
              @click="router.push('/merchant-backend/products')"
            >
              <b>商品管理</b><small>上下架与内容完善</small><em>›</em>
            </button>
            <button
              type="button"
              @click="router.push('/merchant-backend/inventory')"
            >
              <b>库存与采购</b><small>预警、盘点与补货</small><em>›</em>
            </button>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { merchantBackendApi } from "@/api";

interface DashboardData {
  todayOrders?: number;
  todaySales?: number;
  totalProducts?: number;
  pendingReviews?: number;
  totalSales?: number;
  totalOrders?: number;
  rating?: number;
}

const router = useRouter();
const route = useRoute();
const previewMode = computed(() => import.meta.env.DEV && route.path.startsWith("/__qa/"));
const loading = ref(false);
const error = ref(false);
const dashboard = ref<DashboardData>({});
const shopName = ref("");
const pendingAfterSales = ref<number | null>(null);
const pendingShip = ref<number | null>(null);
const productTotal = ref<number | null>(null);

function fmtMoney(value?: number | string | null): string {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const productDisplay = computed(() => productTotal.value ?? dashboard.value.totalProducts ?? "—");
const ratingValue = computed(() => dashboard.value.rating == null ? "—" : Number(dashboard.value.rating).toFixed(1));
const ratingProgress = computed(() => Math.max(0, Math.min(100, Number(dashboard.value.rating || 0) / 5 * 100)));
const ratingText = computed(() => {
  const rating = Number(dashboard.value.rating || 0);
  if (!rating) return "等待评价";
  if (rating >= 4.8) return "口碑优秀";
  if (rating >= 4.5) return "口碑稳定";
  return "需要关注";
});

const cards = computed(() => [
  {
    kicker: "TODAY ORDERS",
    label: "今日订单",
    value: dashboard.value.todayOrders ?? "—",
    action: "进入订单处理队列",
    path: "/merchant-backend/orders",
    tone: "blue",
  },
  {
    kicker: "TODAY REVENUE",
    label: "今日销售额",
    value: fmtMoney(dashboard.value.todaySales),
    action: "查看收入与结算",
    path: "/merchant-backend/revenue",
    tone: "gold",
  },
  {
    kicker: "FULFILLMENT",
    label: "待发货",
    value: pendingShip.value ?? "—",
    action: "进入履约控制台",
    path: "/merchant-backend/shipping",
    tone: "teal",
  },
  {
    kicker: "AFTER SALES",
    label: "待处理售后",
    value: pendingAfterSales.value ?? "—",
    action: "进入售后质检台",
    path: "/merchant-backend/after-sales",
    tone: "red",
  },
  {
    kicker: "MERCHANDISE",
    label: "商品总数",
    value: productDisplay.value,
    action: "管理商品与库存",
    path: "/merchant-backend/products",
    tone: "brown",
  },
  {
    kicker: "REPUTATION",
    label: "待回复评价",
    value: dashboard.value.pendingReviews ?? "—",
    action: "维护店铺口碑",
    path: "/merchant-backend/reviews",
    tone: "purple",
  },
]);

const todayInsight = computed(() => {
  const orders = Number(dashboard.value.todayOrders || 0);
  const sales = Number(dashboard.value.todaySales || 0);
  if (!orders) return "今日尚未形成新订单。可先检查在售商品内容、库存与活动承接是否完整。";
  const average = sales / orders;
  return `今日已形成 ${orders} 笔订单，平均客单约 ${fmtMoney(average)}。优先确保已付款订单及时出库，避免成交在履约环节流失。`;
});

const serviceInsight = computed(() => {
  const afterSales = Number(pendingAfterSales.value || 0);
  const reviews = Number(dashboard.value.pendingReviews || 0);
  if (!afterSales && !reviews) return "当前没有待处理售后与待回复评价，服务队列保持清洁。";
  return `当前有 ${afterSales} 笔售后、${reviews} 条评价等待处理。先回应情绪，再解决事实问题，有助于保住复购与店铺评分。`;
});

function applyPreviewData() {
  shopName.value = "雅集文房旗舰店";
  dashboard.value = {
    todayOrders: 18,
    todaySales: 6896.2,
    totalProducts: 37,
    pendingReviews: 4,
    totalSales: 286430.8,
    totalOrders: 742,
    rating: 4.8,
  };
  pendingAfterSales.value = 3;
  pendingShip.value = 7;
  productTotal.value = 37;
}

async function loadDashboard() {
  if (previewMode.value) {
    ElMessage.closeAll();
    applyPreviewData();
    return;
  }
  loading.value = true;
  error.value = false;
  try {
    const response = await merchantBackendApi.getDashboard();
    dashboard.value = (response as { data?: DashboardData }).data ?? (response as DashboardData);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }

  const tasks = [
    merchantBackendApi.getProfile().then((response) => {
      const value = response as { data?: { shopName?: string }; shopName?: string };
      shopName.value = value.data?.shopName ?? value.shopName ?? "";
    }),
    merchantBackendApi.listAfterSales({ status: "PENDING", page: 1, pageSize: 1 }).then((response) => {
      const value = (response as { data?: { total?: number } }).data ?? (response as { total?: number });
      pendingAfterSales.value = value.total ?? 0;
    }),
    merchantBackendApi.listOrders({ status: "PAID", page: 1, pageSize: 1 }).then((response) => {
      const value = (response as { data?: { total?: number } }).data ?? (response as { total?: number });
      pendingShip.value = value.total ?? 0;
    }),
    merchantBackendApi.listProducts({ page: 1, pageSize: 1 }).then((response) => {
      const value = (response as { data?: { total?: number } }).data ?? (response as { total?: number });
      productTotal.value = value.total ?? null;
    }),
  ];
  await Promise.allSettled(tasks);
}

onMounted(loadDashboard);
</script>

<style scoped>
.dashboard-page {
  min-height: 100%;
  padding: 24px;
  color: #243247;
  background:
    radial-gradient(circle at 8% 4%, rgba(49, 92, 140, .08), transparent 27%),
    linear-gradient(180deg, #f3f6fa 0, #f8f9fb 100%);
}
.hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(210px, .55fr) auto;
  gap: 28px;
  align-items: center;
  overflow: hidden;
  padding: 32px 34px;
  border-radius: 24px;
  color: #fff;
  background:
    radial-gradient(circle at 82% 16%, rgba(229, 194, 117, .28), transparent 24%),
    linear-gradient(128deg, #122b4b 0%, #1f4b74 58%, #6e624a 100%);
  box-shadow: 0 18px 40px rgba(22, 48, 78, .18);
}
.hero::after {
  position: absolute;
  right: -80px;
  top: -116px;
  width: 330px;
  height: 330px;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 50%;
  box-shadow: 0 0 0 46px rgba(255,255,255,.035), 0 0 0 92px rgba(255,255,255,.02);
  content: "";
}
.hero-copy, .hero-summary, .hero-actions { position: relative; z-index: 1; }
.eyebrow {
  margin: 0 0 9px;
  color: #efd79a;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .16em;
}
.eyebrow.dark { color: #a17a37; }
.hero h1 { margin: 0; font-family: "Noto Serif SC", "Songti SC", serif; font-size: 32px; letter-spacing: .04em; }
.hero-copy > p:last-child { max-width: 710px; margin: 12px 0 0; color: rgba(255,255,255,.7); line-height: 1.8; }
.hero-summary { padding-left: 26px; border-left: 1px solid rgba(255,255,255,.18); }
.hero-summary span, .hero-summary small { display: block; color: rgba(255,255,255,.67); }
.hero-summary strong { display: block; margin: 6px 0; color: #f5df9c; font-family: Georgia, serif; font-size: 28px; white-space: nowrap; }
.hero-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
.hero-actions :deep(.el-button.is-plain) { color: #fff; border-color: rgba(255,255,255,.27); background: rgba(255,255,255,.06); }
.hero-actions :deep(.el-button--primary) { border-color: #d44750; background: #d44750; }

.metric-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; margin: 18px 0; }
.metric-card {
  position: relative;
  min-height: 158px;
  overflow: hidden;
  padding: 20px;
  border: 1px solid rgba(63, 82, 106, .12);
  border-radius: 18px;
  text-align: left;
  color: inherit;
  background: rgba(255,255,255,.92);
  cursor: pointer;
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.metric-card::after {
  position: absolute;
  right: -32px;
  top: -38px;
  width: 118px;
  height: 118px;
  border-radius: 50%;
  background: var(--glow, #e8eef5);
  content: "";
}
.metric-card:hover, .metric-card:focus-visible { transform: translateY(-3px); border-color: #8da7c2; box-shadow: 0 14px 30px rgba(35, 56, 79, .11); outline: none; }
.metric-card > * { position: relative; z-index: 1; display: block; }
.metric-kicker { color: #8893a0; font-size: 10px; font-weight: 800; letter-spacing: .1em; }
.metric-card strong { margin: 14px 0 3px; font-family: Georgia, serif; font-size: 30px; font-weight: 600; }
.metric-label { color: #526276; font-size: 13px; }
.metric-card small { margin-top: 16px; color: #8b95a2; }
.metric-card small b { float: right; color: #466b92; font-size: 17px; }
.tone-blue { --glow: #dce8f5; }.tone-blue strong { color: #285a88; }
.tone-gold { --glow: #f4ead2; }.tone-gold strong { color: #986c2b; }
.tone-teal { --glow: #dcecea; }.tone-teal strong { color: #27706c; }
.tone-red { --glow: #f4dedc; }.tone-red strong { color: #b34745; }
.tone-brown { --glow: #eee4da; }.tone-brown strong { color: #80563f; }
.tone-purple { --glow: #e9e2ef; }.tone-purple strong { color: #6e5184; }

.route-card, .decision-card {
  border: 1px solid rgba(65, 82, 104, .11);
  border-radius: 20px;
  background: rgba(255,255,255,.94);
  box-shadow: 0 10px 28px rgba(33, 48, 67, .06);
}
.route-card { padding: 25px; }
.section-lead { display: flex; align-items: end; justify-content: space-between; gap: 24px; }
.section-lead h2, .decision-card h2 { margin: 0; font-family: "Noto Serif SC", "Songti SC", serif; font-size: 22px; }
.section-lead > p { max-width: 490px; margin: 0; color: #87919e; line-height: 1.7; text-align: right; }
.route-track { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin-top: 22px; overflow: hidden; border: 1px solid #e9edf2; border-radius: 16px; background: #e9edf2; }
.route-track button {
  display: grid;
  grid-template-columns: 36px minmax(0,1fr);
  gap: 12px;
  align-items: center;
  min-height: 104px;
  padding: 17px;
  border: 0;
  color: inherit;
  text-align: left;
  background: #fff;
  cursor: pointer;
  transition: background .2s ease;
}
.route-track button:hover, .route-track button:focus-visible { background: #f4f8fc; outline: none; }
.route-track button.urgent { background: linear-gradient(135deg, #fff 0%, #fff7f5 100%); }
.route-track i { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 50%; color: #fff; font: 700 11px Georgia, serif; background: #315f8d; }
.route-track .urgent i { background: #c04e4b; }
.route-track span b, .route-track span small { display: block; }
.route-track span small { margin-top: 5px; color: #8a94a0; }
.route-track em { grid-column: 2; color: #577594; font-size: 12px; font-style: normal; }

.decision-grid { display: grid; grid-template-columns: 1.15fr 1fr 1fr; gap: 16px; margin-top: 18px; }
.decision-card { padding: 24px; }
.decision-card header { display: flex; align-items: start; justify-content: space-between; gap: 16px; }
.decision-card header > span, .live-dot { padding: 5px 9px; border-radius: 999px; color: #6e7c8d; font-size: 11px; background: #eef3f7; }
.live-dot::before { display: inline-block; width: 6px; height: 6px; margin-right: 5px; border-radius: 50%; background: #40a576; content: ""; animation: pulse 1.8s infinite; }
.today-amount { display: flex; align-items: baseline; gap: 14px; margin: 24px 0 13px; }
.today-amount span { color: #7c8897; }
.today-amount strong { color: #9a6d2c; font: 600 33px Georgia, serif; }
.decision-card > p { min-height: 44px; margin: 0 0 18px; color: #737f8d; line-height: 1.7; }
.decision-card > button {
  padding: 0;
  border: 0;
  color: #315f8d;
  font-weight: 700;
  background: none;
  cursor: pointer;
}
.score-line { display: flex; align-items: center; gap: 18px; margin: 23px 0 14px; }
.score-line > strong { color: #6d4d79; font: 600 42px Georgia, serif; }
.score-line > div { flex: 1; }
.score-line span { display: block; margin-bottom: 8px; color: #788493; font-size: 12px; }
.score-line i { display: block; height: 7px; overflow: hidden; border-radius: 99px; background: #eee9f1; }
.score-line i b { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #6b4e7c, #b98b9e); }
.stock-actions { display: grid; gap: 10px; margin-top: 22px; }
.stock-actions button { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 14px; border: 1px solid #e7e9ed; border-radius: 13px; color: inherit; text-align: left; background: #fafbfc; cursor: pointer; }
.stock-actions button:hover { border-color: #b6c5d4; background: #f4f8fb; }
.stock-actions b { font-size: 13px; }.stock-actions small { color: #9099a4; }.stock-actions em { grid-column: 2; grid-row: 1/3; align-self: center; color: #527394; font-size: 18px; font-style: normal; }

@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(64,165,118,.28); } 50% { box-shadow: 0 0 0 6px rgba(64,165,118,0); } }
@media (max-width: 1280px) {
  .hero { grid-template-columns: minmax(0,1fr) auto; }
  .hero-actions { grid-column: 1/-1; justify-content: flex-start; }
  .metric-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .dashboard-page { padding: 16px; }
  .hero { grid-template-columns: 1fr; padding: 26px; }
  .hero-summary { padding: 15px 0 0; border-top: 1px solid rgba(255,255,255,.16); border-left: 0; }
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
  .route-track { grid-template-columns: repeat(2, 1fr); }
  .decision-grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .dashboard-page { padding: 10px; }
  .hero h1 { font-size: 27px; }
  .metric-grid { gap: 8px; }
  .metric-card { min-height: 144px; padding: 16px; }
  .metric-card strong { font-size: 25px; }
  .section-lead { align-items: start; flex-direction: column; }
  .section-lead > p { text-align: left; }
  .route-track { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .metric-card, .route-track button { transition: none; }
  .metric-card:hover { transform: none; }
  .live-dot::before { animation: none; }
}
</style>
