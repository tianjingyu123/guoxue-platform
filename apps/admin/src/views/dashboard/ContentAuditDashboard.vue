<script setup lang="ts">
import { ref, onMounted, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import {
  Document, Checked, CircleCheck, CircleClose, Files, View, WarningFilled,
  ChatLineSquare, VideoCamera, Notebook, CaretTop, CaretBottom,
} from '@element-plus/icons-vue'
import GreetingHeader from '@/components/GreetingHeader.vue'
import AnimatedCounter from '@/components/AnimatedCounter.vue'
import AnomalyAlert from '@/components/AnomalyAlert.vue'
import ChartCard from '@/components/ChartCard.vue'

interface AlertItem { text: string; count: number; level: 'critical' | 'warning' | 'info' }
interface CardDelta { value: number; dir: 'up' | 'down' | 'flat'; label: string }
interface CardItem { label: string; value: number; icon: Component; highlight?: boolean; suffix?: string; route?: string; delta?: CardDelta }
// option 为 echarts 配置对象，结构复杂，保留 any（框架类型）
interface ChartItem { title: string; option: any }
interface QuickAction { label: string; path: string; icon: Component; badge?: number }
/** 内容类型分布项 */
interface ContentDist { name: string; count: number }

/** 日环比：仅当昨日基准>0 时计算，否则返回 undefined（诚实留白） */
function makeDelta(todayVal: number, yesterdayVal: number, label = '环比昨日'): CardDelta | undefined {
  if (!(yesterdayVal > 0)) return undefined
  const g = (todayVal - yesterdayVal) / yesterdayVal * 100
  return { value: Math.abs(Math.round(g * 10) / 10), dir: g > 0 ? 'up' : g < 0 ? 'down' : 'flat', label }
}

const username = ref('内容审核员')
const router = useRouter()

// 角色专属快捷操作（仅指向 CONTENT_AUDITOR 有权访问的管理页）
const quickActions = ref<QuickAction[]>([])

function onCardClick(card: CardItem) {
  if (card.route) router.push(card.route)
}

const alerts = ref<AlertItem[]>([])
const cards = ref<CardItem[]>([])
const charts = ref<ChartItem[]>([])
const loading = ref(true)
const loadError = ref(false)

onMounted(load)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const [overviewRes, statsRes, healthRes, chartsRes] = await Promise.all([
      api.get('/dashboard/today-overview'),
      api.get('/dashboard/stats'),
      api.get('/dashboard/content-health'),
      api.get('/dashboard/charts'),
    ])
    const ov = overviewRes.data ?? {}
    const st = statsRes.data ?? {}
    const health = healthRes.data ?? {}
    const ch = chartsRes.data ?? {}

    const pendingAudits = ov.pendingAudits ?? 0

    // 告警
    const aList: AlertItem[] = []
    if (pendingAudits > 20) aList.push({ text: '待审核内容超过20条', count: pendingAudits, level: 'warning' })
    if ((health.lowQualityCount ?? 0) > 10) aList.push({ text: '低质内容数超过10条', count: health.lowQualityCount, level: 'warning' })
    alerts.value = aList

    // 角色专属 KPI（内容品控=待审内容数/今日审核量/驳回率）
    const passRate = health.passRate ?? 0
    const rejectRate = health.rejectRate ?? 0
    cards.value = [
      { label: '待审核内容', value: pendingAudits, icon: Document, highlight: pendingAudits > 0, route: '/contents/audit' },
      { label: '今日审核量', value: st.todayAudited ?? 0, icon: Checked, route: '/contents/audit' },
      { label: '通过率', value: passRate, icon: CircleCheck, suffix: '%' },
      { label: '驳回率', value: rejectRate, icon: CircleClose, suffix: '%', highlight: rejectRate > 20 },
      { label: '低质内容数', value: health.lowQualityCount ?? 0, icon: WarningFilled, highlight: (health.lowQualityCount ?? 0) > 0, route: '/contents' },
      { label: '今日新增内容', value: st.todayNewContent ?? 0, icon: Document, route: '/contents' },
      { label: '总内容数', value: st.articleCount ?? 0, icon: Files, route: '/contents' },
      { label: '总浏览量', value: st.totalViews ?? 0, icon: View },
    ]

    // 真实日环比：今日审核量/今日新增内容 vs 昨日同口径（后端 stats 已补昨日基准）
    // 待审核内容/通过率/驳回率/低质内容/总数为快照型，无历史可比，诚实留白
    const auditCard = cards.value.find((c) => c.label === '今日审核量')
    if (auditCard) auditCard.delta = makeDelta(st.todayAudited ?? 0, st.todayAuditedYesterday ?? 0)
    const newContentCard = cards.value.find((c) => c.label === '今日新增内容')
    if (newContentCard) newContentCard.delta = makeDelta(st.todayNewContent ?? 0, st.todayNewContentYesterday ?? 0)

    // 快捷操作 + 待办徽标（近7日质检统计无日粒度历史，故不展示环比，诚实留白）
    quickActions.value = [
      { label: '内容审核', path: '/contents/audit', icon: Checked, badge: pendingAudits },
      { label: '内容管理', path: '/contents', icon: Files },
      { label: '评论管理', path: '/comments', icon: ChatLineSquare },
      { label: '短视频审核', path: '/videos', icon: VideoCamera },
      { label: '文章管理', path: '/articles', icon: Document },
    ]

    // 环形图 — 内容类型分布
    const distribution = ((ch.contentDistribution ?? []) as ContentDist[]).filter((d) => d.count > 0)
    const total = distribution.reduce((s, d) => s + d.count, 0)
    const palette = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#A8E6CF']
    charts.value = distribution.length ? [{
      title: '内容类型分布',
      option: {
        tooltip: {
          trigger: 'item', backgroundColor: '#fff',
          borderColor: '#F0F0F0', borderWidth: 1,
          textStyle: { color: '#1A1A1A', fontSize: 13 },
          // echarts tooltip 回调参数类型复杂，保留 any（框架类型）
          formatter: (p: any) => `${p.name}：${p.value}（${p.percent}%）`,
        },
        legend: {
          orient: 'vertical', right: 10, top: 'middle',
          itemWidth: 12, itemHeight: 12, itemGap: 16,
          textStyle: { color: '#666', fontSize: 13 },
          formatter: (name: string) => {
            const item = distribution.find((d) => d.name === name)
            const pct = item ? ((item.count / total) * 100).toFixed(1) : '0'
            return `${name}  ${pct}%`
          },
        },
        series: [{
          type: 'pie', radius: ['40%', '70%'], center: ['38%', '50%'],
          avoidLabelOverlap: false, label: { show: false }, labelLine: { show: false },
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
          data: distribution.map((d, i) => ({
            name: d.name, value: d.count,
            itemStyle: { color: palette[i % palette.length] },
          })),
        }],
      },
    }] : []
  } catch (e) {
    console.error('内容审核仪表盘数据加载失败', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    v-loading="loading"
    class="dashboard"
  >
    <GreetingHeader :username="username" />
    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取内容审核数据，请检查网络或稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="load"
        >
          重试
        </el-button>
      </template>
    </el-result>
    <template v-else>
    <!-- 角色专属快捷操作 -->
    <div class="quick-actions">
      <div class="quick-actions__title">
        快捷操作
      </div>
      <div class="quick-actions__grid">
        <div
          v-for="qa in quickActions"
          :key="qa.path"
          class="qa-card"
          @click="router.push(qa.path)"
        >
          <el-badge
            :value="qa.badge ?? 0"
            :hidden="!qa.badge"
            :max="99"
            class="qa-badge"
          >
            <div class="qa-icon">
              <el-icon :size="22">
                <component :is="qa.icon" />
              </el-icon>
            </div>
          </el-badge>
          <span class="qa-label">{{ qa.label }}</span>
        </div>
      </div>
    </div>
    <div
      v-if="alerts.length"
      class="alerts-row"
    >
      <AnomalyAlert
        v-for="a in alerts"
        :key="a.text"
        v-bind="a"
      />
    </div>
    <el-row
      :gutter="20"
      class="stats-row"
    >
      <el-col
        v-for="card in cards"
        :key="card.label"
        :xs="24"
        :sm="12"
        :md="6"
      >
        <div
          class="stat-card"
          :class="{ 'stat-card--link': card.route }"
          @click="onCardClick(card)"
        >
          <div class="stat-card__top">
            <span class="stat-card__label">{{ card.label }}</span>
            <div class="stat-card__icon">
              <el-icon :size="18">
                <component :is="card.icon" />
              </el-icon>
            </div>
          </div>
          <div class="stat-card__value">
            <AnimatedCounter
              :value="card.value"
              :highlight="card.highlight"
            />
            <span
              v-if="card.suffix"
              class="stat-card__suffix"
            >{{ card.suffix }}</span>
          </div>
          <div
            v-if="card.delta"
            class="stat-card__delta"
            :class="`stat-card__delta--${card.delta.dir}`"
          >
            <el-icon :size="12">
              <component :is="card.delta.dir === 'down' ? CaretBottom : CaretTop" />
            </el-icon>
            <span>{{ card.delta.value }}% {{ card.delta.label }}</span>
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row
      :gutter="20"
      class="charts-row"
    >
      <el-col
        v-for="ch in charts"
        :key="ch.title"
        :xs="24"
        :md="24"
      >
        <ChartCard
          :title="ch.title"
          :option="ch.option"
          :height="320"
        />
      </el-col>
      <el-col
        v-if="!charts.length"
        :xs="24"
        :md="24"
      >
        <el-empty description="暂无内容分布数据" />
      </el-col>
    </el-row>
    </template>
  </div>
</template>

<style scoped>
.dashboard { padding: 0; }

/* 快捷操作 */
.quick-actions {
  background: #FFFFFF; border-radius: 16px; padding: 18px 22px 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); margin-bottom: 20px;
}
.quick-actions__title { font-size: 14px; font-weight: 600; color: var(--color-text-title, #1A1A1A); margin-bottom: 14px; }
.quick-actions__grid { display: flex; flex-wrap: wrap; gap: 8px; }
.qa-card {
  flex: 1 1 92px; min-width: 92px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 14px 8px; border-radius: 12px; cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}
.qa-card:hover { background: rgba(255, 107, 107, 0.06); transform: translateY(-2px); }
.qa-badge :deep(.el-badge__content) { border: none; }
.qa-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: rgba(255, 107, 107, 0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.qa-label { font-size: 13px; color: var(--color-text-secondary); }

.alerts-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.stats-row { margin-bottom: 20px; }
.stat-card {
  background: #FFFFFF; border-radius: 16px; padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-bottom: 20px;
}
.stat-card--link { cursor: pointer; }
.stat-card--link:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); }
.stat-card__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.stat-card__label { font-size: 13px; color: var(--color-text-secondary); }
.stat-card__icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255, 107, 107, 0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.stat-card__value {
  font-size: 28px; font-weight: 700; color: #1A1A1A;
  font-feature-settings: "tnum"; line-height: 1.2;
}
.stat-card__suffix { font-size: 16px; font-weight: 600; margin-left: 2px; color: var(--color-text-secondary); }
.stat-card__delta { display: flex; align-items: center; gap: 3px; margin-top: 8px; font-size: 12px; font-weight: 600; }
.stat-card__delta--up { color: var(--color-error, #F56C6C); }
.stat-card__delta--down { color: var(--color-success, #67C23A); }
.stat-card__delta--flat { color: var(--color-text-secondary); }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
