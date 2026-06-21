<!--
  圈子收益明细（从原型 app/circles/[id]/earnings/detail/page.tsx 高保真迁移）
  收益概览渐变卡 + 收入构成进度条 + 历史收益 + 收益说明
-->
<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view
      class="nav"
      :style="{ paddingTop: statusBarH + 'px' }"
    >
      <view class="nav-inner">
        <view
          class="nav-btn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#2C2C2C"
          />
        </view>
        <text class="nav-title">
          收益明细
        </text>
        <view class="nav-btn" />
      </view>
    </view>

    <scroll-view
      scroll-y
      class="scroll"
    >
      <view class="body">
        <!-- 骨架屏 -->
        <view
          v-if="loading"
          class="earn-skeleton"
        >
          <view
            v-for="i in 3"
            :key="i"
            class="earn-sk-row"
          >
            <view class="earn-sk-block sk-anim" />
          </view>
        </view>
        <error-state
          v-else-if="error"
          :message="error"
          @retry="loadData"
        />
        <template v-else>
          <!-- 收益概览 -->
          <view class="overview">
            <view class="ov-top">
              <view>
                <text class="ov-label">
                  本月收益
                </text>
                <text class="ov-month">
                  ¥{{ fmt(data.monthEarnings) }}
                </text>
              </view>
              <view class="ov-total">
                <text class="ov-label">
                  累计收益
                </text>
                <text class="ov-total-num">
                  ¥{{ fmt(data.totalEarnings) }}
                </text>
              </view>
            </view>
            <view class="ov-stats">
              <view class="ov-stat">
                <app-icon
                  name="users"
                  :size="28"
                  color="#ffffff"
                /><text class="ov-stat-t">
                  {{ data.memberCount }} 名成员
                </text>
              </view>
              <view class="ov-stat">
                <app-icon
                  name="trending-up"
                  :size="28"
                  color="#ffffff"
                /><text class="ov-stat-t">
                  ↑ 15% 同比增长
                </text>
              </view>
            </view>
          </view>

          <!-- 收入构成 -->
          <view class="sec">
            <text class="sec-title">
              收入构成
            </text>
            <view class="list">
              <view
                v-for="item in data.earningsList"
                :key="item.id"
                class="card"
              >
                <view class="card-head">
                  <view class="card-info">
                    <text class="card-source">
                      {{ item.source }}
                    </text>
                    <text class="card-desc">
                      {{ item.description }}
                    </text>
                  </view>
                  <text
                    class="card-trend"
                    :class="item.trend === 'up' ? 'up' : 'down'"
                  >
                    {{ item.trend === 'up' ? '↑' : '↓' }}
                  </text>
                </view>
                <view class="card-bar-row">
                  <view class="bar-track">
                    <view
                      class="bar-fill"
                      :style="{ width: item.percentage + '%' }"
                    />
                  </view>
                  <view class="card-amount">
                    <text class="card-amount-num">
                      ¥{{ fmt(item.amount) }}
                    </text>
                    <text class="card-amount-pct">
                      {{ item.percentage }}%
                    </text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 历史收益 -->
          <view class="sec">
            <text class="sec-title">
              历史收益
            </text>
            <view class="list">
              <view
                v-for="(item, idx) in data.history"
                :key="idx"
                class="card hist"
              >
                <view class="hist-left">
                  <app-icon
                    name="calendar"
                    :size="32"
                    color="#999999"
                  />
                  <view>
                    <text class="hist-month">
                      {{ item.month }}
                    </text>
                    <text class="hist-members">
                      {{ item.members }} 名成员
                    </text>
                  </view>
                </view>
                <view class="hist-right">
                  <text class="hist-earn">
                    ¥{{ fmt(item.earnings) }}
                  </text>
                  <text class="hist-badge">
                    月均 ¥{{ Math.round(item.earnings / item.members) }}
                  </text>
                </view>
              </view>
            </view>
          </view>

          <!-- 说明 -->
          <view class="note">
            <text class="note-title">
              收益说明
            </text>
            <view class="note-list">
              <text class="note-li">
                • 圈费：新成员加入圈子的费用
              </text>
              <text class="note-li">
                • 课程销售：圈内付费课程的销售额
              </text>
              <text class="note-li">
                • 咨询服务：一对一付费咨询费用
              </text>
              <text class="note-li">
                • 商品销售：圈子内销售的相关商品
              </text>
              <text class="note-li">
                • 收益结算：每月月底统一结算，次月1日可提现
              </text>
            </view>
          </view>
        </template>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 圈子收益明细页（纯展示）
 */
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ErrorState from '@/components/common/error-state.vue'
import { goBack } from '@/utils/router'
import { circleManageApi } from '@/lib/circle-detail-data'

const circleId = ref('1')

onLoad((q) => { if (q?.id) circleId.value = q.id })

const loading = ref(true)
const error = ref('')
const statusBarH = uni.getSystemInfoSync().statusBarHeight || 20

onMounted(() => { loadData() })

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await circleManageApi.getEarnings(circleId.value)
    data.value = res
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const data = ref({
  totalEarnings: 285400,
  monthEarnings: 28540,
  memberCount: 12800,
  earningsList: [
    { id: '1', source: '圈费收入', amount: 12500, percentage: 43.8, description: '圈子成员加入费用', trend: 'up' },
    { id: '2', source: '课程销售', amount: 8200, percentage: 28.7, description: '付费课程收入', trend: 'up' },
    { id: '3', source: '咨询服务', amount: 5100, percentage: 17.9, description: '一对一咨询费用', trend: 'down' },
    { id: '4', source: '商品销售', amount: 2740, percentage: 9.6, description: '圈子商品销售', trend: 'up' },
  ],
  history: [
    { month: '2024年1月', earnings: 28540, members: 12800, rate: 123 },
    { month: '2023年12月', earnings: 26800, members: 12100, rate: 98 },
    { month: '2023年11月', earnings: 24900, members: 11450, rate: 82 },
    { month: '2023年10月', earnings: 23200, members: 10800, rate: 76 },
  ],
})

function fmt(n: number) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F7F4EE; }
.nav { background: #F7F4EE; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #ECE7DD; }
.nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; }
.nav-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.scroll { height: calc(100vh - 100rpx); }
.body { padding-bottom: 60rpx; }

.overview { margin: 32rpx 32rpx 0; padding: 32rpx; border-radius: 24rpx; background: linear-gradient(135deg, #C41E3A, #9A1528); }
.ov-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32rpx; }
.ov-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.8); margin-bottom: 8rpx; }
.ov-month { font-size: 56rpx; font-weight: 700; color: #ffffff; }
.ov-total { text-align: right; }
.ov-total-num { font-size: 36rpx; font-weight: 700; color: #ffffff; }
.ov-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.ov-stat { display: flex; align-items: center; gap: 10rpx; }
.ov-stat-t { font-size: 24rpx; color: #ffffff; }

.sec { margin: 48rpx 32rpx 0; }
.sec-title { display: block; font-size: 26rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 20rpx; }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.card { background: #ffffff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16rpx; }
.card-source { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.card-desc { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; }
.card-trend { font-size: 24rpx; font-weight: 700; }
.card-trend.up { color: #16A34A; }
.card-trend.down { color: #DC2626; }
.card-bar-row { display: flex; align-items: center; }
.bar-track { flex: 1; height: 14rpx; background: #F0EDE6; border-radius: 999rpx; overflow: hidden; }
.bar-fill { height: 100%; background: #C41E3A; border-radius: 999rpx; }
.card-amount { margin-left: 24rpx; text-align: right; }
.card-amount-num { display: block; font-size: 28rpx; font-weight: 700; color: #2C2C2C; }
.card-amount-pct { display: block; font-size: 22rpx; color: #999999; }

.hist { display: flex; align-items: center; justify-content: space-between; }
.hist-left { display: flex; align-items: center; gap: 14rpx; }
.hist-month { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.hist-members { display: block; font-size: 22rpx; color: #999999; margin-top: 2rpx; }
.hist-right { text-align: right; }
.hist-earn { display: block; font-size: 28rpx; font-weight: 700; color: #2C2C2C; }
.hist-badge { display: inline-block; font-size: 20rpx; color: #666666; background: #F0EDE6; padding: 2rpx 12rpx; border-radius: 999rpx; margin-top: 8rpx; }

.note { margin: 48rpx 32rpx 0; padding: 28rpx; background: #EFF6FF; border: 1rpx solid #BFDBFE; border-radius: 16rpx; }
.note-title { display: block; font-size: 26rpx; font-weight: 600; color: #1E3A8A; margin-bottom: 14rpx; }
.note-list { display: flex; flex-direction: column; gap: 8rpx; }
.note-li { font-size: 22rpx; color: #1E40AF; line-height: 1.6; }

/* 骨架屏 */
.earn-skeleton { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.earn-sk-row { display: flex; gap: 16rpx; }
.earn-sk-block { flex: 1; height: 120rpx; border-radius: 16rpx; }
.sk-anim { background: linear-gradient(90deg, #E8E0D0 25%, #F0EDE6 50%, #E8E0D0 75%); background-size: 200% 100%; animation: sk-shimmer 1.5s infinite; }
@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
