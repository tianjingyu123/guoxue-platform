<template>
  <view class="ins-page">
    <app-nav-bar title="经营洞察" :show-back="true" background="#C41E3A" color="#ffffff" :no-border="true" />

    <scroll-view scroll-y class="ins-scroll">
      <!-- 三态 -->
      <view v-if="loading" class="ins-state"><text class="ins-state-txt">加载中...</text></view>
      <view v-else-if="error" class="ins-state">
        <text class="ins-state-txt">{{ error }}</text>
        <view class="ins-retry" @tap="load"><text class="ins-retry-txt">重试</text></view>
      </view>

      <!-- 空态：还没有客户档案 -->
      <view v-else-if="data && data.totalClients === 0" class="ins-state">
        <text class="ins-state-emoji">📊</text>
        <text class="ins-state-txt">{{ data.advice.text }}</text>
        <view class="ins-retry" @tap="goList()"><text class="ins-retry-txt">去建客户档案</text></view>
      </view>

      <template v-else-if="data">
        <!-- AI 经营建议 -->
        <view class="ins-card ins-advice">
          <view class="ins-card-head">
            <text class="ins-card-title">经营建议</text>
            <view class="ins-advice-tag"><text class="ins-advice-tag-txt">{{ data.advice.source === 'ai' ? 'AI' : '规则' }}</text></view>
          </view>
          <text class="ins-advice-txt">{{ data.advice.text }}</text>
        </view>

        <!-- 商机雷达：只挂数字+跳转（名单在客户列表分层 tab） -->
        <view class="ins-card">
          <view class="ins-card-head">
            <text class="ins-card-title">商机雷达</text>
            <text class="ins-card-sub">点数字去列表跟进</text>
          </view>
          <view class="ins-radar">
            <view class="ins-radar-item" @tap="goList('DORMANT')">
              <text class="ins-radar-num dormant">{{ data.radar.dormant }}</text>
              <text class="ins-radar-label">沉睡客户</text>
              <text class="ins-radar-hint">建议回访唤醒 ›</text>
            </view>
            <view class="ins-radar-item" @tap="goList('AT_RISK')">
              <text class="ins-radar-num atrisk">{{ data.radar.atRisk }}</text>
              <text class="ins-radar-label">流失预警</text>
              <text class="ins-radar-hint">优先问候跟进 ›</text>
            </view>
            <view class="ins-radar-item" @tap="goList()">
              <text class="ins-radar-num birthday">{{ data.radar.birthdayThisMonth }}</text>
              <text class="ins-radar-label">本月生日</text>
              <text class="ins-radar-hint">看待办提醒 ›</text>
            </view>
          </view>
          <view class="ins-lichun" :class="{ near: data.radar.lichun.isNear }">
            <text class="ins-lichun-txt">
              距立春（{{ data.radar.lichun.date }}）还有 {{ data.radar.lichun.daysUntil }} 天{{ data.radar.lichun.isNear ? '，流年更替咨询高峰将至，建议提前准备内容与问候' : '' }}
            </text>
          </view>
        </view>

        <!-- 服务结构（近90天） -->
        <view class="ins-card">
          <view class="ins-card-head">
            <text class="ins-card-title">服务结构</text>
            <text class="ins-card-sub">近90天 · {{ data.serve90.totalCount }} 次 · ¥{{ data.serve90.totalAmount }}</text>
          </view>
          <view v-if="data.serve90.items.length === 0" class="ins-empty-line">
            <text class="ins-empty-line-txt">近90天还没有服务记录，去客户详情里补记一笔吧</text>
          </view>
          <view v-else class="ins-struct">
            <view v-for="it in data.serve90.items" :key="it.type" class="ins-struct-row">
              <text class="ins-struct-label">{{ it.label }}</text>
              <view class="ins-struct-bar">
                <view class="ins-struct-fill" :style="{ width: Math.max(it.countPct, 2) + '%' }" />
              </view>
              <text class="ins-struct-val">{{ it.count }}次 · {{ it.countPct }}%</text>
            </view>
            <text class="ins-struct-note">金额占比：{{ amountPctLine }}</text>
          </view>
        </view>

        <!-- 客群节律 -->
        <view class="ins-card">
          <view class="ins-card-head">
            <text class="ins-card-title">客群节律</text>
            <text class="ins-card-sub">近6个月服务频次</text>
          </view>
          <view class="ins-trend">
            <view v-for="m in data.monthlyTrend" :key="m.month" class="ins-trend-col">
              <text class="ins-trend-count">{{ m.count || '' }}</text>
              <view class="ins-trend-bar" :style="{ height: trendHeight(m.count) + 'rpx' }" />
              <text class="ins-trend-month">{{ m.month.slice(5) }}月</text>
            </view>
          </view>
          <view class="ins-gap">
            <text v-if="data.repurchase" class="ins-gap-txt">
              复购间隔：平均 {{ data.repurchase.avgDays }} 天 · 中位 {{ data.repurchase.medianDays }} 天（{{ data.repurchase.sampledClients }} 位客户有复购）
            </text>
            <text v-else class="ins-gap-txt muted">复购样本不足（近6月尚无客户在不同日期二次服务）</text>
          </view>
        </view>

        <!-- R3 合规脚注 -->
        <view class="ins-foot">
          <text class="ins-foot-txt">以上均为你名下客户池的统计聚合，不含任何个体标签与名单；个体跟进请前往客户列表与提醒待办。</text>
        </view>
        <view class="ins-bottom-pad" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { navigateTo } from '@/utils/router'
import { crmApi, type CrmInsights, type RfmTier } from '@/lib/crm-data'

const loading = ref(true)
const error = ref('')
const data = ref<CrmInsights | null>(null)

const amountPctLine = computed(() => {
  if (!data.value || data.value.serve90.items.length === 0) return ''
  return data.value.serve90.items.map((i) => `${i.label} ${i.amountPct}%`).join(' · ')
})

onShow(() => {
  load()
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await crmApi.insights()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

/** 洞察页只挂数字，名单在客户列表分层 tab（R3） */
function goList(tier?: RfmTier) {
  navigateTo(`/pkg-mine/crm/index${tier ? `?tier=${tier}` : ''}`)
}

/** 趋势柱高（最高 120rpx·0 次给 4rpx 底线） */
function trendHeight(count: number) {
  const max = Math.max(...(data.value?.monthlyTrend.map((m) => m.count) ?? [0]), 1)
  return count === 0 ? 4 : Math.max(Math.round((count / max) * 120), 16)
}
</script>

<style scoped lang="scss">
/* iOS Safari flex bug：用固定 height 才能让 flex:1 滚动子项正确填充(min-height:100vh 会算出高度0致内容空白) */
.ins-page { height: 100vh; background: #f5f2ee; display: flex; flex-direction: column; }
.ins-scroll { flex: 1; height: 0; min-height: 0; }

.ins-state { padding: 120rpx 40rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.ins-state-emoji { font-size: 64rpx; }
.ins-state-txt { font-size: 26rpx; color: #999; line-height: 1.6; text-align: center; }
.ins-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: #c41e3a; }
.ins-retry-txt { font-size: 26rpx; color: #fff; }

.ins-card { margin: 24rpx 24rpx 0; padding: 28rpx; border-radius: 24rpx; background: #fff; }
.ins-card-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.ins-card-title { font-size: 30rpx; font-weight: 700; color: #1a1a1a; }
.ins-card-sub { margin-left: auto; font-size: 22rpx; color: #999; }

.ins-advice { background: linear-gradient(135deg, #fff7f2 0%, #fff 60%); border: 1rpx solid #f3e2e5; }
.ins-advice-tag { padding: 2rpx 14rpx; border-radius: 8rpx; background: #c41e3a; }
.ins-advice-tag-txt { font-size: 20rpx; font-weight: 600; color: #fff; }
.ins-advice-txt { font-size: 26rpx; line-height: 1.7; color: #4a4a4a; }

.ins-radar { display: flex; gap: 16rpx; }
.ins-radar-item { flex: 1; padding: 20rpx 12rpx; border-radius: 16rpx; background: #fafafa; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.ins-radar-num { font-size: 44rpx; font-weight: 700; color: #1a1a1a;
  &.dormant { color: #6b7280; }
  &.atrisk { color: #c2410c; }
  &.birthday { color: #c41e3a; }
}
.ins-radar-label { font-size: 24rpx; color: #333; }
.ins-radar-hint { font-size: 20rpx; color: #c41e3a; }
.ins-lichun { margin-top: 20rpx; padding: 16rpx 20rpx; border-radius: 16rpx; background: #f0fdf4;
  &.near { background: #fff7ed; }
}
.ins-lichun-txt { font-size: 22rpx; line-height: 1.6; color: #15803d;
  .ins-lichun.near & { color: #9a3412; }
}

.ins-empty-line { padding: 24rpx 0; }
.ins-empty-line-txt { font-size: 24rpx; color: #999; }

.ins-struct-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 18rpx;
  &:last-of-type { margin-bottom: 12rpx; }
}
.ins-struct-label { width: 88rpx; font-size: 24rpx; color: #333; flex-shrink: 0; }
.ins-struct-bar { flex: 1; height: 20rpx; border-radius: 999rpx; background: #f5f2ee; overflow: hidden; }
.ins-struct-fill { height: 100%; border-radius: 999rpx; background: linear-gradient(90deg, #c41e3a, #e2657c); }
.ins-struct-val { width: 160rpx; font-size: 22rpx; color: #666; text-align: right; flex-shrink: 0; }
.ins-struct-note { display: block; margin-top: 8rpx; font-size: 20rpx; color: #999; }

.ins-trend { display: flex; align-items: flex-end; gap: 12rpx; height: 180rpx; padding: 0 8rpx; }
.ins-trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 8rpx; height: 100%; }
.ins-trend-count { font-size: 20rpx; color: #c41e3a; font-weight: 600; }
.ins-trend-bar { width: 40rpx; border-radius: 8rpx 8rpx 4rpx 4rpx; background: linear-gradient(180deg, #e2657c, #c41e3a); }
.ins-trend-month { font-size: 20rpx; color: #999; }
.ins-gap { margin-top: 20rpx; padding: 16rpx 20rpx; border-radius: 16rpx; background: #fafafa; }
.ins-gap-txt { font-size: 22rpx; line-height: 1.6; color: #666;
  &.muted { color: #999; }
}

.ins-foot { margin: 24rpx 40rpx 0; }
.ins-foot-txt { font-size: 20rpx; line-height: 1.6; color: #b0a89a; }

.ins-bottom-pad { height: 60rpx; }
</style>
