<script setup lang="ts">
/**
 * 圈子数据看板（从原型 app/circles/[id]/dashboard/page.tsx 高保真迁移）
 * 概览KPI卡 + 近30天趋势柱图(四指标切换) + 活跃贡献者TOP5 + 热门内容TOP5 + 流失预警 + 收益构成
 * 原型趋势图用 CSS 柱条(非recharts),跨端直接复用
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'

type TrendType = 'members' | 'posts' | 'active' | 'revenue'

const circleId = ref('1')
const refreshing = ref(false)
const trendType = ref<TrendType>('members')

const overview = {
  totalMembers: 12580, membersGrowth: 8.5,
  activeMembers: 3240, activeGrowth: 12.3,
  totalPosts: 8960, postsGrowth: -2.1,
  totalRevenue: 156800, revenueGrowth: 15.8,
}

const trends = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
  members: 12000 + Math.floor(Math.random() * 600),
  posts: 200 + Math.floor(Math.random() * 100),
  active: 2800 + Math.floor(Math.random() * 500),
  revenue: 4000 + Math.floor(Math.random() * 2000),
}))

const contributors = [
  { id: '1', name: '易学大师', posts: 128, likes: 3560 },
  { id: '2', name: '命理研究者', posts: 96, likes: 2840 },
  { id: '3', name: '周易爱好者', posts: 85, likes: 2120 },
  { id: '4', name: '风水学徒', posts: 72, likes: 1890 },
  { id: '5', name: '国学传承', posts: 68, likes: 1650 },
]

const hotPosts = [
  { id: '1', title: '八字入门：如何看懂自己的命盘', author: '易学大师', views: 12580, likes: 896, comments: 234 },
  { id: '2', title: '紫微斗数与八字的区别详解', author: '命理研究者', views: 9860, likes: 756, comments: 189 },
  { id: '3', title: '2024年流年运势预测方法', author: '周易爱好者', views: 8420, likes: 623, comments: 156 },
  { id: '4', title: '风水布局的基本原则', author: '风水学徒', views: 7650, likes: 542, comments: 128 },
  { id: '5', title: '易经六十四卦快速记忆法', author: '国学传承', views: 6890, likes: 489, comments: 98 },
]

const churnWarning = [
  { id: '1', name: '沉默用户A', daysSilent: 28 },
  { id: '2', name: '流失风险B', daysSilent: 25 },
  { id: '3', name: '待唤醒C', daysSilent: 23 },
]

const revenue = {
  total: 156800,
  items: [
    { name: '入圈费', value: 89600, percent: 57.1, color: '#C41E3A' },
    { name: '打赏收入', value: 34200, percent: 21.8, color: '#C9A96E' },
    { name: '连麦咨询', value: 23400, percent: 14.9, color: '#4A90D9' },
    { name: '知识付费', value: 9600, percent: 6.2, color: '#52C41A' },
  ],
}

const kpis = computed(() => [
  { icon: 'users', label: '总成员', value: overview.totalMembers, growth: overview.membersGrowth, color: '#C41E3A' },
  { icon: 'activity', label: '活跃成员', value: overview.activeMembers, growth: overview.activeGrowth, color: '#4A90D9' },
  { icon: 'file-text', label: '总帖子', value: overview.totalPosts, growth: overview.postsGrowth, color: '#C9A96E' },
  { icon: 'dollar-sign', label: '总收益', value: overview.totalRevenue, growth: overview.revenueGrowth, color: '#52C41A', isPrice: true },
])

const TREND_LABEL: Record<TrendType, string> = { members: '成员', posts: '帖子', active: '活跃', revenue: '收益' }
const trendTypes: TrendType[] = ['members', 'posts', 'active', 'revenue']

const trendMax = computed(() => Math.max(...trends.map((t) => t[trendType.value])))
const trendMin = computed(() => Math.min(...trends.map((t) => t[trendType.value])))

function barHeight(v: number) {
  const range = trendMax.value - trendMin.value
  const h = range === 0 ? 50 : ((v - trendMin.value) / range) * 100
  return Math.max(h, 5)
}
function fmtNum(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
function rankColor(i: number) { return ['#FFD700', '#C0C0C0', '#CD7F32'][i] || '' }
function hotBg(i: number) { return ['#FFD70020', '#C0C0C020', '#CD7F3220'][i] || '#F5F5F5' }
function hotColor(i: number) { return ['#B8860B', '#808080', '#8B4513'][i] || '#999999' }

function refresh() {
  refreshing.value = true
  setTimeout(() => { refreshing.value = false; uni.showToast({ title: '已刷新', icon: 'success' }) }, 800)
}
function openPost(id: string) { navigateTo(`/pkg-circle/circles/post?id=${id}&circleId=${circleId.value}`) }
</script>

<template>
  <view class="db">
    <!-- 顶栏 -->
    <view class="db-hdr">
      <view class="db-hdr-l">
        <view
          class="db-hdr-btn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="34"
            color="#2C2C2C"
          />
        </view>
        <text class="db-hdr-title">
          数据看板
        </text>
      </view>
      <view
        class="db-hdr-btn"
        @tap="refresh"
      >
        <app-icon
          name="refresh-cw"
          :size="34"
          color="#666666"
          :class="{ spin: refreshing }"
        />
      </view>
    </view>

    <scroll-view
      scroll-y
      class="db-body"
    >
      <!-- 概览卡片 -->
      <view class="db-kpis">
        <view
          v-for="k in kpis"
          :key="k.label"
          class="db-kpi"
        >
          <view class="db-kpi-top">
            <view
              class="db-kpi-icon"
              :style="{ background: k.color + '15' }"
            >
              <app-icon
                :name="k.icon"
                :size="26"
                :color="k.color"
              />
            </view>
            <text class="db-kpi-label">
              {{ k.label }}
            </text>
          </view>
          <view class="db-kpi-bot">
            <text class="db-kpi-value">
              {{ k.isPrice ? '¥' : '' }}{{ fmtNum(k.value) }}
            </text>
            <view class="db-kpi-growth">
              <app-icon
                :name="k.growth >= 0 ? 'trending-up' : 'trending-down'"
                :size="22"
                :color="k.growth >= 0 ? '#52C41A' : '#FF4D4F'"
              />
              <text
                class="db-kpi-growth-t"
                :style="{ color: k.growth >= 0 ? '#52C41A' : '#FF4D4F' }"
              >
                {{ Math.abs(k.growth) }}%
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 趋势图 -->
      <view class="db-card">
        <view class="db-card-head">
          <text class="db-card-title">
            近30天趋势
          </text>
          <view class="db-trend-tabs">
            <view
              v-for="t in trendTypes"
              :key="t"
              class="db-trend-tab"
              :class="{ on: trendType === t }"
              @tap="trendType = t"
            >
              <text
                class="db-trend-tab-t"
                :class="{ on: trendType === t }"
              >
                {{ TREND_LABEL[t] }}
              </text>
            </view>
          </view>
        </view>
        <view class="db-chart">
          <view
            v-for="(t, i) in trends"
            :key="i"
            class="db-bar"
            :class="{ last: i === trends.length - 1 }"
            :style="{ height: barHeight(t[trendType]) + '%' }"
          />
        </view>
        <view class="db-chart-axis">
          <text class="db-axis-t">
            30天前
          </text><text class="db-axis-t">
            今日
          </text>
        </view>
      </view>

      <!-- 活跃贡献者 -->
      <view class="db-card">
        <text class="db-card-title">
          活跃贡献者 TOP5
        </text>
        <view class="db-list">
          <view
            v-for="(c, i) in contributors"
            :key="c.id"
            class="db-contrib"
          >
            <view class="db-contrib-avatar-wrap">
              <view class="db-contrib-avatar">
                <text class="db-contrib-avatar-t">
                  {{ c.name[0] }}
                </text>
              </view>
              <view
                v-if="i < 3"
                class="db-contrib-rank"
                :style="{ background: rankColor(i) }"
              >
                <text class="db-contrib-rank-t">
                  {{ i + 1 }}
                </text>
              </view>
            </view>
            <view class="db-contrib-info">
              <text class="db-contrib-name">
                {{ c.name }}
              </text>
              <text class="db-contrib-posts">
                {{ c.posts }}篇帖子
              </text>
            </view>
            <view class="db-contrib-likes">
              <app-icon
                name="heart"
                :size="22"
                color="#C41E3A"
                :fill="true"
              />
              <text class="db-contrib-likes-t">
                {{ fmtNum(c.likes) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 热门内容 -->
      <view class="db-card">
        <text class="db-card-title">
          热门内容 TOP5
        </text>
        <view class="db-list">
          <view
            v-for="(p, i) in hotPosts"
            :key="p.id"
            class="db-hot"
            @tap="openPost(p.id)"
          >
            <view
              class="db-hot-rank"
              :style="{ background: hotBg(i), color: hotColor(i) }"
            >
              <text
                class="db-hot-rank-t"
                :style="{ color: hotColor(i) }"
              >
                {{ i + 1 }}
              </text>
            </view>
            <view class="db-hot-info">
              <text class="db-hot-title">
                {{ p.title }}
              </text>
              <view class="db-hot-meta">
                <view class="db-hot-stat">
                  <app-icon
                    name="eye"
                    :size="20"
                    color="#999999"
                  /><text class="db-hot-stat-t">
                    {{ fmtNum(p.views) }}
                  </text>
                </view>
                <view class="db-hot-stat">
                  <app-icon
                    name="heart"
                    :size="20"
                    color="#999999"
                  /><text class="db-hot-stat-t">
                    {{ fmtNum(p.likes) }}
                  </text>
                </view>
                <view class="db-hot-stat">
                  <app-icon
                    name="message-circle"
                    :size="20"
                    color="#999999"
                  /><text class="db-hot-stat-t">
                    {{ p.comments }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 流失预警 -->
      <view
        v-if="churnWarning.length"
        class="db-churn"
      >
        <view class="db-churn-head">
          <app-icon
            name="alert-triangle"
            :size="26"
            color="#FA8C16"
          />
          <text class="db-churn-title">
            流失预警
          </text>
          <view class="db-churn-count">
            <text class="db-churn-count-t">
              {{ churnWarning.length }}人
            </text>
          </view>
        </view>
        <view class="db-churn-list">
          <view
            v-for="u in churnWarning"
            :key="u.id"
            class="db-churn-item"
          >
            <view class="db-churn-avatar">
              <text class="db-churn-avatar-t">
                {{ u.name[0] }}
              </text>
            </view>
            <view class="db-churn-info">
              <text class="db-churn-name">
                {{ u.name }}
              </text>
              <text class="db-churn-days">
                已沉默{{ u.daysSilent }}天
              </text>
            </view>
            <text class="db-churn-wake">
              唤醒
            </text>
          </view>
        </view>
      </view>

      <!-- 收益构成 -->
      <view class="db-card">
        <view class="db-card-head">
          <text class="db-card-title">
            收益构成
          </text>
          <text class="db-revenue-total">
            ¥{{ fmtNum(revenue.total) }}
          </text>
        </view>
        <view class="db-revenue-list">
          <view
            v-for="(item, i) in revenue.items"
            :key="i"
            class="db-revenue-item"
          >
            <view class="db-revenue-row">
              <view class="db-revenue-name-wrap">
                <view
                  class="db-revenue-dot"
                  :style="{ background: item.color }"
                />
                <text class="db-revenue-name">
                  {{ item.name }}
                </text>
              </view>
              <text class="db-revenue-value">
                ¥{{ fmtNum(item.value) }}
              </text>
            </view>
            <view class="db-revenue-track">
              <view
                class="db-revenue-fill"
                :style="{ width: item.percent + '%', background: item.color }"
              />
            </view>
          </view>
        </view>
      </view>
      <view class="db-spacer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.db { display: flex; flex-direction: column; height: 100vh; background: #faf8f5; }
.db-hdr { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 16rpx; background: #ffffff; border-bottom: 2rpx solid #e8e3db; padding-top: var(--status-bar-height, 0); flex-shrink: 0; }
.db-hdr-l { display: flex; align-items: center; gap: 12rpx; }
.db-hdr-btn { width: 56rpx; height: 56rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.db-hdr-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }
.spin { animation: db-spin 1s linear infinite; }
@keyframes db-spin { to { transform: rotate(360deg); } }
.db-body { flex: 1; overflow: hidden; padding: 24rpx; }
.db-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 18rpx; margin-bottom: 24rpx; }
.db-kpi { background: #ffffff; border-radius: 24rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.db-kpi-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.db-kpi-icon { width: 52rpx; height: 52rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; }
.db-kpi-label { font-size: 22rpx; color: #999999; }
.db-kpi-bot { display: flex; align-items: flex-end; justify-content: space-between; }
.db-kpi-value { font-size: 38rpx; font-weight: 700; color: #2c2c2c; }
.db-kpi-growth { display: flex; align-items: center; gap: 2rpx; }
.db-kpi-growth-t { font-size: 22rpx; }
.db-card { background: #ffffff; border-radius: 24rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); margin-bottom: 24rpx; }
.db-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.db-card-title { font-size: 30rpx; font-weight: 600; color: #2c2c2c; }
.db-trend-tabs { display: flex; gap: 8rpx; }
.db-trend-tab { padding: 8rpx 18rpx; border-radius: 999rpx; background: #faf8f5; }
.db-trend-tab.on { background: #c41e3a; }
.db-trend-tab-t { font-size: 22rpx; color: #666666; }
.db-trend-tab-t.on { color: #ffffff; }
.db-chart { height: 200rpx; display: flex; align-items: flex-end; gap: 4rpx; }
.db-bar { flex: 1; border-radius: 6rpx 6rpx 0 0; background: linear-gradient(180deg, #e8e3db 0%, #f5f0e8 100%); }
.db-bar.last { background: linear-gradient(180deg, #c41e3a 0%, #e85a71 100%); }
.db-chart-axis { display: flex; justify-content: space-between; margin-top: 12rpx; }
.db-axis-t { font-size: 22rpx; color: #999999; }
.db-list { display: flex; flex-direction: column; gap: 24rpx; }
.db-contrib { display: flex; align-items: center; gap: 18rpx; }
.db-contrib-avatar-wrap { position: relative; }
.db-contrib-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; background: linear-gradient(135deg, #c9a96e, #e8d5b7); display: flex; align-items: center; justify-content: center; }
.db-contrib-avatar-t { font-size: 26rpx; color: #ffffff; font-weight: 500; }
.db-contrib-rank { position: absolute; top: -6rpx; right: -6rpx; width: 30rpx; height: 30rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.db-contrib-rank-t { font-size: 18rpx; font-weight: 700; color: #ffffff; }
.db-contrib-info { flex: 1; min-width: 0; }
.db-contrib-name { display: block; font-size: 26rpx; font-weight: 500; color: #2c2c2c; }
.db-contrib-posts { display: block; font-size: 22rpx; color: #999999; margin-top: 2rpx; }
.db-contrib-likes { display: flex; align-items: center; gap: 4rpx; }
.db-contrib-likes-t { font-size: 22rpx; color: #c41e3a; }
.db-hot { display: flex; align-items: flex-start; gap: 16rpx; padding: 12rpx; border-radius: 16rpx; }
.db-hot-rank { width: 40rpx; height: 40rpx; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.db-hot-rank-t { font-size: 22rpx; font-weight: 700; }
.db-hot-info { flex: 1; min-width: 0; }
.db-hot-title { display: block; font-size: 26rpx; color: #2c2c2c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-hot-meta { display: flex; align-items: center; gap: 20rpx; margin-top: 8rpx; }
.db-hot-stat { display: flex; align-items: center; gap: 4rpx; }
.db-hot-stat-t { font-size: 20rpx; color: #999999; }
.db-churn { background: linear-gradient(90deg, #fff7e6, #fff1d6); border-radius: 24rpx; padding: 24rpx; border: 2rpx solid #ffd591; margin-bottom: 24rpx; }
.db-churn-head { display: flex; align-items: center; gap: 8rpx; margin-bottom: 18rpx; }
.db-churn-title { font-size: 30rpx; font-weight: 600; color: #2c2c2c; }
.db-churn-count { margin-left: auto; padding: 2rpx 14rpx; background: #fa8c16; border-radius: 999rpx; }
.db-churn-count-t { font-size: 20rpx; color: #ffffff; }
.db-churn-list { display: flex; flex-direction: column; gap: 12rpx; }
.db-churn-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx; background: rgba(255,255,255,0.6); border-radius: 16rpx; }
.db-churn-avatar { width: 56rpx; height: 56rpx; border-radius: 999rpx; background: #faf8f5; display: flex; align-items: center; justify-content: center; }
.db-churn-avatar-t { font-size: 24rpx; color: #999999; }
.db-churn-info { flex: 1; }
.db-churn-name { display: block; font-size: 26rpx; color: #2c2c2c; }
.db-churn-days { display: block; font-size: 22rpx; color: #999999; margin-top: 2rpx; }
.db-churn-wake { font-size: 22rpx; color: #fa8c16; }
.db-revenue-total { font-size: 34rpx; font-weight: 700; color: #c41e3a; }
.db-revenue-list { display: flex; flex-direction: column; gap: 24rpx; }
.db-revenue-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.db-revenue-name-wrap { display: flex; align-items: center; gap: 12rpx; }
.db-revenue-dot { width: 16rpx; height: 16rpx; border-radius: 999rpx; }
.db-revenue-name { font-size: 26rpx; color: #666666; }
.db-revenue-value { font-size: 26rpx; font-weight: 500; color: #2c2c2c; }
.db-revenue-track { height: 16rpx; background: #f5f5f5; border-radius: 999rpx; overflow: hidden; }
.db-revenue-fill { height: 100%; border-radius: 999rpx; }
.db-spacer { height: 40rpx; }
</style>
