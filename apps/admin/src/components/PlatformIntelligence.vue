<template>
  <div class="command-intelligence">
    <div class="intelligence-grid">
      <section
        v-if="canReadOperations"
        class="command-panel growth-panel"
        aria-labelledby="growth-title"
      >
        <div class="panel-heading">
          <h2 id="growth-title">
            用户增长
          </h2><div
            class="period-switch"
            aria-label="增长统计时段"
          >
            <button
              v-for="period in [7, 30]"
              :key="period"
              type="button"
              :aria-pressed="days === period"
              @click="days = period"
            >
              {{ period }} 天
            </button>
          </div>
        </div>
        <div class="growth-summary">
          <strong>{{ fmt(series.total) }}<small>人新增</small></strong><span :class="{ 'is-stale': states.growth.status !== 'ready' }">{{ sourceLabel(states.growth) }}</span>
        </div>
        <template v-if="series.points.length && series.complete">
          <svg
            class="growth-chart"
            viewBox="0 0 330 112"
            role="img"
            :aria-label="`所示 ${series.points.length} 天新增 ${fmt(series.total)} 人，最高单日 ${fmt(series.peak)} 人，详细数据见下方`"
          >
            <defs><linearGradient
              id="growth-fill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            ><stop
              stop-color="#74DDCF"
              stop-opacity=".3"
            /><stop
              offset="1"
              stop-color="#74DDCF"
              stop-opacity="0"
            /></linearGradient></defs>
            <path
              d="M28 16H322M28 56H322M28 96H322"
              stroke="#7cabb32b"
              stroke-dasharray="3 5"
            />
            <text
              x="0"
              y="20"
            >{{ fmt(series.scale) }}</text><text
              x="8"
              y="99"
            >0</text>
            <path
              :d="`${series.path} L322 96 L28 96 Z`"
              fill="url(#growth-fill)"
            />
            <path
              :d="series.path"
              stroke="#74DDCF"
              stroke-width="2.5"
              fill="none"
            />
          </svg>
          <div class="chart-range">
            <span>{{ series.points[0].date }}</span><span>{{ series.points.at(-1)?.date }}</span>
          </div>
          <details class="growth-details">
            <summary>查看每日数据与口径</summary><p>显示接口提供的历史日期，不与“今日新增”强行合并。日期范围以图中为准。</p><div class="daily-table">
              <table>
                <caption class="screen-reader-only">
                  每日新增用户
                </caption><thead><tr><th>日期</th><th>新增人数</th></tr></thead><tbody>
                  <tr
                    v-for="point in series.points"
                    :key="point.date"
                  >
                    <td>{{ point.date }}</td><td>{{ fmt(point.newUsers) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </template>
        <p
          v-else
          class="signal-empty"
        >
          {{ states.growth.status === 'ready' ? '暂无完整历史序列' : '增长数据暂未就绪' }}
        </p>
      </section>

      <section
        class="command-panel recent-panel"
        aria-labelledby="recent-title"
      >
        <div class="panel-heading">
          <h2 id="recent-title">
            最新成交
          </h2><span :class="{ 'is-stale': states.transactions.status !== 'ready' }">{{ sourceLabel(states.transactions) }}</span>
        </div>
        <div
          v-if="transactions.recentOrders?.length"
          class="recent-trades"
        >
          <div
            v-for="order in transactions.recentOrders.slice(0, 5)"
            :key="order.id"
            class="recent-trade"
          >
            <span>{{ orderTypeLabel(order.type) }}<small>{{ shortTime(order.at) }}</small></span><b>¥ {{ fmt(order.amount) }}</b>
          </div>
        </div>
        <div
          v-else
          class="signal-empty"
        >
          <span
            class="empty-signal"
            aria-hidden="true"
          >—</span><p>{{ states.transactions.status === 'ready' ? '暂无已支付订单' : '等待交易数据' }}</p><small>成交后展示最近 5 笔，不显示客户信息</small>
        </div>
        <p class="source-time">
          来源更新 {{ clockTime(transactions.updatedAt) }}
        </p>
      </section>

      <section
        class="command-panel ai-signal-panel"
        aria-labelledby="ai-signal-title"
      >
        <div class="panel-heading">
          <h2 id="ai-signal-title">
            AI 服务
          </h2><span :class="{ 'is-stale': states.ai.status !== 'ready' }">{{ sourceLabel(states.ai) }}</span>
        </div>
        <dl class="ai-signal-metrics">
          <div class="ai-primary">
            <dt>累计分析调用</dt><dd>{{ fmt(ai.totalApiCalls) }}</dd>
          </div><div><dt>今日分析调用</dt><dd>{{ fmt(ai.todayApiCalls) }}</dd></div><div><dt>机器人对话</dt><dd>{{ fmt(ai.botConversations) }}</dd></div><div><dt>知识条目</dt><dd>{{ fmt(ai.knowledgeBaseSize) }}</dd></div>
        </dl>
        <p class="source-time">
          调用记录口径 · {{ clockTime(ai.updatedAt) }}
        </p>
      </section>

      <section
        class="command-panel coverage-panel"
        aria-labelledby="coverage-title"
      >
        <div class="panel-heading">
          <h2 id="coverage-title">
            线下覆盖
          </h2><span :class="{ 'is-stale': states.offline.status !== 'ready' }">{{ sourceLabel(states.offline) }}</span>
        </div>
        <dl class="coverage-metrics">
          <div><dd>{{ fmt(offline.totalStations) }}</dd><dt>运营中驿站</dt></div><div><dd>{{ fmt(offline.totalStudents) }}</dd><dt>累计报名</dt></div><div><dd>{{ fmt(offline.totalCourses) }}</dd><dt>审核通过课程</dt></div>
        </dl>
        <div
          v-if="cities.length"
          class="city-bars"
        >
          <div
            v-for="city in cities"
            :key="city.city"
          >
            <span>{{ city.city || '未填写城市' }}</span><i :style="{ width: `${city.percent}%` }" /><b>{{ fmt(city.count) }}</b>
          </div>
        </div>
        <p
          v-else
          class="panel-note"
        >
          {{ states.offline.status === 'ready' ? '暂无运营中驿站分布' : '城市分布暂未就绪' }}
        </p>
        <p class="source-time">
          来源更新 {{ clockTime(offline.updatedAt) }}
        </p>
      </section>
    </div>
    <div
      v-if="canReadOperations"
      class="operations-strip"
      :class="{ 'has-alerts': alertCount !== null && alertCount > 0 }"
    >
      <span class="operations-label"><i aria-hidden="true" />运营关注</span>
      <span v-if="states.alerts.status !== 'ready'">{{ sourceLabel(states.alerts) }}，请到驾驶舱核对当前异常</span>
      <span v-else-if="alertCount === null">异常数据不完整，请到驾驶舱核对</span>
      <span v-else-if="alertCount === 0">当前统计范围内暂无系统与风控预警</span>
      <span v-else>{{ alertCount }} 项预警待关注 · {{ firstAlert }}</span>
      <router-link to="/cockpit">
        查看管理驾驶舱
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AiSignals, AlertSignals, GrowthPoint, OfflineSignals, SignalKey, SignalState, TransactionSignals } from '@/composables/usePlatformSignals'
import { buildGrowthSeries, formatScreenNumber as fmt, orderTypeLabel, sourceLabel } from '@/utils/platform-screen'

const props = defineProps<{ growth: GrowthPoint[]; transactions: TransactionSignals; ai: AiSignals; offline: OfflineSignals; alerts: AlertSignals; states: Record<SignalKey, SignalState>; canReadOperations: boolean }>()
const days = ref(7)
const series = computed(() => buildGrowthSeries(props.growth, days.value))
const cities = computed(() => {
  const rows = (props.offline.cityDistribution ?? []).filter(city => Number.isFinite(city.count) && city.count > 0).slice().sort((a, b) => b.count - a.count).slice(0, 3)
  const max = Math.max(...rows.map(city => city.count), 1)
  return rows.map(city => ({ ...city, percent: city.count / max * 100 }))
})
const alertCount = computed(() => Array.isArray(props.alerts.systemAlerts) && Array.isArray(props.alerts.riskAlerts) ? props.alerts.systemAlerts.length + props.alerts.riskAlerts.length : null)
const firstAlert = computed(() => props.alerts.systemAlerts?.[0]?.message || props.alerts.riskAlerts?.[0]?.title || '请核对详情')
function shortTime(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return '时间暂未提供'
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}
function clockTime(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return '暂未提供'
  return new Date(value).toLocaleTimeString('zh-CN', { hour12: false })
}
</script>
