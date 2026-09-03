<template>
  <div
    class="bigscreen tech-screen platform command-screen"
    :aria-busy="loading"
  >
    <header class="command-header">
      <div class="command-brand">
        <span
          class="command-mark"
          aria-hidden="true"
        ><Connection /></span>
        <div>
          <h1>平台数据指挥中心</h1>
          <p>{{ BRAND.platformName }} <span class="command-updated">平台更新：{{ formatScreenTime(data.updatedAt) }}</span><span class="command-cache">缓存 60 秒 · 每 30 秒同步</span></p>
        </div>
      </div>
      <div class="command-tools">
        <span
          v-if="previewMode"
          class="preview-note"
        >设计预览 · 示例数据</span>
        <span
          class="sync-state"
          :class="{ 'is-stale': stale || loadError }"
          role="status"
        ><i aria-hidden="true" />{{ syncLabel }}</span>
        <button
          class="screen-presentation-button"
          type="button"
          :disabled="loading || refreshing"
          @click="load(true)"
        >
          {{ refreshing ? '同步中…' : '刷新数据' }}
        </button>
        <BigscreenActions />
      </div>
    </header>

    <div
      v-if="loading || loadError || !hasData"
      class="command-state"
      role="status"
    >
      <Connection aria-hidden="true" />
      <h2>{{ loading ? '正在连接平台全景' : '暂时无法获取平台数据' }}</h2>
      <p>{{ loading ? '读取数据源，请稍候' : '请检查网络或稍后重试，未获取的数据不会显示为零。' }}</p>
      <button
        v-if="!loading"
        class="screen-presentation-button"
        type="button"
        @click="load(true)"
      >
        重新获取
      </button>
    </div>
    <template v-else>
      <p
        v-if="stale"
        class="command-notice"
        role="alert"
      >
        平台汇总同步失败，保留上次成功数据。可点击“刷新数据”重试。
      </p>
      <div class="command-primary">
        <section
          class="command-panel audience-panel"
          aria-labelledby="audience-title"
        >
          <div class="panel-heading">
            <h2 id="audience-title">
              用户观测
            </h2><span>平台累计</span>
          </div>
          <dl class="audience-metrics">
            <div class="hero-metric">
              <dt>累计用户</dt><dd>{{ fmt(data.totalUsers) }}<small>人</small></dd>
            </div>
            <div class="split-metrics">
              <div><dt>今日新增</dt><dd>{{ fmt(data.todayNewUsers) }}</dd></div><div><dt>当前在线</dt><dd>{{ fmt(data.dailyActiveUsers) }}</dd></div>
            </div>
          </dl>
          <div
            v-if="signalsEnabled"
            class="content-supply"
          >
            <div class="panel-heading">
              <h2>内容供给</h2><span :class="{ 'is-stale': states.content.status !== 'ready' }">{{ sourceLabel(states.content) }}</span>
            </div>
            <dl class="supply-metrics">
              <div><dt>已发布帖子</dt><dd>{{ fmt(content.totalPosts) }}</dd></div>
              <div><dt>视频总数</dt><dd>{{ fmt(content.totalVideos) }}</dd></div>
              <div><dt>近 30 天新增文章</dt><dd>{{ fmt(content.monthGrowth?.articles) }}</dd></div>
              <div><dt>近 30 天新增帖子</dt><dd>{{ fmt(content.monthGrowth?.posts) }}</dd></div>
            </dl>
          </div>
          <p class="panel-note">
            当前在线为连接计数；今日新增按服务端当日口径。
          </p>
        </section>

        <section
          class="service-network"
          aria-label="平台资源关系图"
        >
          <div class="network-title">
            <h2>平台服务网络</h2><p>五类资源的连接与构成</p>
          </div>
          <div class="network-stage">
            <svg
              class="network-lines"
              viewBox="0 0 600 600"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="network-glow"><stop
                  stop-color="#74DDCF"
                  stop-opacity=".15"
                /><stop
                  offset="1"
                  stop-color="#74DDCF"
                  stop-opacity="0"
                /></radialGradient>
                <linearGradient id="network-light"><stop
                  stop-color="#74DDCF"
                  stop-opacity=".65"
                /><stop
                  offset=".5"
                  stop-color="#74DDCF"
                  stop-opacity=".06"
                /><stop
                  offset="1"
                  stop-color="#91BBEF"
                  stop-opacity=".5"
                /></linearGradient>
              </defs>
              <circle
                cx="300"
                cy="300"
                r="285"
                fill="url(#network-glow)"
              />
              <circle
                cx="300"
                cy="300"
                r="222"
                stroke="url(#network-light)"
              />
              <circle
                cx="300"
                cy="300"
                r="241"
                stroke="#74DDCF"
                stroke-opacity=".28"
                stroke-dasharray="1 10"
                stroke-width="3"
              />
              <circle
                cx="300"
                cy="300"
                r="265"
                stroke="#74DDCF"
                stroke-opacity=".09"
              />
              <ellipse
                cx="300"
                cy="300"
                rx="287"
                ry="100"
                stroke="url(#network-light)"
                transform="rotate(-23 300 300)"
              />
              <path
                d="M300 60L516 228L438 492L162 492L84 228Z"
                stroke="#91BBEF"
                stroke-opacity=".2"
              />
              <path
                v-for="asset in composition.items"
                :key="asset.key"
                :d="`M300 300L${asset.x * 6} ${asset.y * 6}`"
                :stroke="asset.color"
                :stroke-opacity="selectedKey === asset.key ? .8 : .2"
                :stroke-dasharray="selectedKey === asset.key ? undefined : '3 7'"
              />
              <circle
                cx="300"
                cy="300"
                r="106"
                fill="#0b2836"
                stroke="url(#network-light)"
              />
              <circle
                cx="300"
                cy="300"
                r="117"
                stroke="#74DDCF"
                stroke-opacity=".18"
              />
              <path
                d="M274 30H326M570 274V326M274 570H326M30 274V326"
                stroke="#91BBEF"
                stroke-opacity=".5"
              />
            </svg>
            <button
              class="network-core"
              type="button"
              :aria-label="selectedAsset ? '返回平台资源总览' : '平台资源总览'"
              @click="selectedKey = null"
            >
              <span>{{ selectedAsset?.label ?? '平台资源总量' }}</span><strong>{{ fmt(selectedAsset ? selectedAsset.value : composition.total) }}</strong><small>{{ coreCaption }}</small>
            </button>
            <button
              v-for="asset in composition.items"
              :key="asset.key"
              type="button"
              class="network-node"
              :class="{ 'is-selected': selectedKey === asset.key }"
              :style="{ left: `${asset.x}%`, top: `${asset.y}%`, '--node-color': asset.color }"
              :aria-pressed="selectedKey === asset.key"
              :aria-label="`${asset.label}，${fmt(asset.value)}，查看构成`"
              :title="asset.scope"
              @click="selectAsset(asset.key)"
            >
              <span
                class="node-icon"
                aria-hidden="true"
              ><component :is="assetIcons[asset.key]" /></span><span>{{ asset.label }}<b>{{ fmt(asset.value) }}</b></span>
            </button>
          </div>
          <div
            class="resource-composition"
            aria-label="资源数量构成"
          >
            <div
              class="composition-track"
              aria-hidden="true"
            >
              <span
                v-for="asset in composition.items"
                :key="asset.key"
                :style="{ width: `${asset.percent ?? 0}%`, background: asset.color }"
              />
            </div>
            <div class="asset-legend">
              <button
                v-for="asset in composition.items"
                :key="asset.key"
                type="button"
                :aria-pressed="selectedKey === asset.key"
                @click="selectAsset(asset.key)"
              >
                <i
                  :style="{ background: asset.color }"
                  aria-hidden="true"
                /><span>{{ asset.label }}<small>{{ asset.percent === null ? '—' : `${asset.percent.toFixed(1)}%` }}</small></span>
              </button>
            </div>
          </div>
          <p class="network-caption">
            {{ composition.complete ? '节点表示资源关系，数量占比见结构条' : '部分数据暂未提供，暂停合计与占比计算' }}
          </p>
        </section>

        <section
          class="command-panel business-panel"
          aria-labelledby="business-title"
        >
          <div class="panel-heading">
            <h2 id="business-title">
              经营表现
            </h2><span>交易口径</span>
          </div>
          <dl>
            <div class="hero-metric">
              <dt>累计交易额</dt><dd><small>¥</small>{{ fmt(data.totalGmv) }}</dd>
            </div>
          </dl>
          <template v-if="signalsEnabled">
            <div class="panel-heading trade-heading">
              <h2>今日交易</h2><span :class="{ 'is-stale': states.transactions.status !== 'ready' }">{{ sourceLabel(states.transactions) }}</span>
            </div>
            <dl class="today-trades">
              <div><dt>今日成交额</dt><dd>¥ {{ fmt(transactions.todayRevenue) }}</dd></div>
              <div class="split-metrics">
                <div><dt>成交订单</dt><dd>{{ fmt(transactions.todayOrders) }}<small>笔</small></dd></div><div><dt>近 1 小时</dt><dd>{{ fmt(transactions.hourOrders) }}<small>笔</small></dd></div>
              </div>
            </dl>
            <div class="order-mix">
              <h3>今日成交类型</h3><div
                v-for="row in orderMix"
                :key="row.type"
                class="order-mix-row"
              >
                <span>{{ orderTypeLabel(row.type) }}</span><b>¥ {{ fmt(row.amount) }}</b><i :style="{ width: `${row.percent}%` }" />
              </div><p
                v-if="!orderMix.length"
                class="panel-note"
              >
                {{ states.transactions.status === 'ready' ? '当前暂无成交类型分布' : '等待交易数据' }}
              </p>
            </div>
          </template>
          <p class="panel-note">
            已支付订单金额，不等于平台净收入。
          </p>
        </section>
      </div>

      <PlatformIntelligence
        v-if="signalsEnabled"
        :growth="growth"
        :transactions="transactions"
        :ai="ai"
        :offline="offline"
        :alerts="alerts"
        :states="states"
        :can-read-operations="canReadOperations"
      />
      <p
        v-else-if="!previewMode"
        class="restricted-note"
      >
        当前令牌视图仅显示平台汇总。更多内部运营指标需使用具备权限的后台账号。
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Box, Collection, Connection, Document, Reading } from '@element-plus/icons-vue'
import BigscreenActions from '@/components/BigscreenActions.vue'
import PlatformIntelligence from '@/components/PlatformIntelligence.vue'
import { bigscreenApi } from '@/api'
import { BRAND } from '@/lib/brand'
import { useAuthStore } from '@/store/auth'
import { usePlatformSignals } from '@/composables/usePlatformSignals'
import { formatScreenNumber as fmt, formatScreenTime, orderTypeLabel, platformComposition, sourceLabel, type PlatformAssetKey, type PlatformScreen } from '@/utils/platform-screen'
import '@/styles/platform-command.css'

const route = useRoute()
const auth = useAuthStore()
const previewMode = computed(() => import.meta.env.DEV && route.path.startsWith('/__qa/'))
const signalsEnabled = computed(() => !route.query.token && !previewMode.value && auth.isLogin)
const canReadOperations = computed(() => signalsEnabled.value && auth.hasRole('SUPER_ADMIN', 'OPERATION_ADMIN'))
const { transactions, content, ai, offline, growth, alerts, states, refresh: refreshSignals } = usePlatformSignals(() => signalsEnabled.value, () => canReadOperations.value)
const assetIcons = { totalCourses: Reading, totalCircles: Connection, totalProducts: Box, totalClassicBooks: Collection, totalArticles: Document }
const data = ref<PlatformScreen>({})
const loading = ref(true)
const refreshing = ref(false)
const loadError = ref(false)
const stale = ref(false)
const selectedKey = ref<PlatformAssetKey | null>(null)
const hasData = computed(() => Object.keys(data.value).length > 0)
const composition = computed(() => platformComposition(data.value))
const selectedAsset = computed(() => composition.value.items.find(item => item.key === selectedKey.value))
const coreCaption = computed(() => {
  const asset = selectedAsset.value
  if (asset) return asset.percent === null ? '暂无占比 · 点击返回' : `占比 ${asset.percent.toFixed(1)}%`
  return composition.value.complete ? '五类资源汇总' : '等待完整数据'
})
const syncLabel = computed(() => loading.value || refreshing.value ? '正在同步' : stale.value ? '同步延迟' : loadError.value ? '连接失败' : '平台数据已连接')
const orderMix = computed(() => {
  const rows = (transactions.value.typeBreakdown ?? []).filter(item => Number.isFinite(item.amount) && item.amount > 0)
  const total = rows.reduce((sum, item) => sum + item.amount, 0)
  return rows.sort((a, b) => b.amount - a.amount).slice(0, 4).map(item => ({ ...item, percent: item.amount / total * 100 }))
})
let timer: ReturnType<typeof setInterval> | undefined
let disposed = false
function selectAsset(key: PlatformAssetKey) { selectedKey.value = selectedKey.value === key ? null : key }

async function load(force = false) {
  if (refreshing.value || disposed) return
  if (!hasData.value) loading.value = true
  refreshing.value = true
  try {
    const result = previewMode.value ? { data: previewData } : await bigscreenApi.platform(typeof route.query.token === 'string' ? route.query.token : undefined)
    if (disposed) return
    if (!result.data || !Object.keys(result.data).length) throw new Error('empty platform data')
    data.value = result.data
    loadError.value = false
    stale.value = false
    // 汇总成功后才读取已获权限的额外数据，不给无效令牌或未登录用户扩大请求。
    void refreshSignals(force)
  } catch {
    if (!disposed) { if (hasData.value) stale.value = true; else loadError.value = true }
  } finally {
    if (!disposed) { loading.value = false; refreshing.value = false }
  }
}
const previewData: PlatformScreen = {
  totalUsers: 286430, todayNewUsers: 1286, dailyActiveUsers: 38520, totalCourses: 1268,
  totalCircles: 842, totalProducts: 5680, totalClassicBooks: 12930, totalArticles: 48620,
  totalGmv: 86520490, updatedAt: new Date().toISOString(),
}
onMounted(() => { void load(); if (!previewMode.value) timer = setInterval(() => void load(), 30000) })
onBeforeUnmount(() => { disposed = true; if (timer) clearInterval(timer) })
</script>
