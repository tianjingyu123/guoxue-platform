<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import {
  fortuneApi, getFortuneLevelInfo, formatFortuneDate,
  todayISO, shiftDate, CATEGORY_STYLE,
  type DailyFortune,
} from '@/lib/fortune-data'

const statusBarHeight = ref(0)
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch (e) {
  statusBarHeight.value = 0
}

const currentDate = ref(todayISO())
const loading = ref(true)
const error = ref('')
const fortune = ref<DailyFortune | null>(null)

async function fetchFortune() {
  loading.value = true
  error.value = ''
  try {
    fortune.value = await fortuneApi.getByDate(currentDate.value)
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad(() => { fetchFortune() })

const levelInfo = computed(() => fortune.value ? getFortuneLevelInfo(fortune.value.overallLevel) : { label: '', color: '' })
const dateLabel = computed(() => formatFortuneDate(currentDate.value))
// 圆环进度：周长 283（r=45），按分数填充
const dashArray = computed(() => `${(fortune.value?.overallScore || 0) * 2.83} 283`)

async function changeDate(days: number) {
  currentDate.value = shiftDate(currentDate.value, days)
  await fetchFortune()
}
function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/index/index' })
}
function comingSoon() {
  uni.showToast({ title: '详细解读即将上线', icon: 'none' })
}
function catLevelColor(level: string) {
  return getFortuneLevelInfo(level as never).color
}
function retry() {
  fetchFortune()
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 12 + 'px' }">
      <view class="nav-btn" @tap="goBack">
        <app-icon name="chevron-left" :size="44" color="#2c2c2c" />
      </view>
      <view class="nav-title">
        <app-icon name="sparkles" :size="36" color="#c41e3a" />
        <text class="nav-title-text">每日运势</text>
      </view>
      <view class="nav-btn" />
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: 'calc(100vh - ' + (statusBarHeight + 56) + 'px)' }">
      <!-- 加载态 -->
      <view v-if="loading" class="state-wrap">
        <view class="loading-spinner" />
        <text class="state-text">正在解读运势...</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="state-wrap">
        <app-icon name="alert-circle" :size="80" color="#c41e3a" />
        <text class="state-text">{{ error }}</text>
        <view class="retry-btn" @tap="retry"><text class="retry-text">重新加载</text></view>
      </view>
      <!-- 正常内容 -->
      <view v-else-if="fortune" class="body">
        <!-- 日期选择器 -->
        <view class="date-picker">
          <view class="date-arrow" @tap="changeDate(-1)">
            <app-icon name="chevron-left" :size="40" color="#2c2c2c" />
          </view>
          <view class="date-center">
            <text class="date-main">{{ dateLabel }}</text>
            <text class="date-sub">{{ fortune.lunarDate }} {{ fortune.weekday }}</text>
          </view>
          <view class="date-arrow" @tap="changeDate(1)">
            <app-icon name="chevron-right" :size="40" color="#2c2c2c" />
          </view>
        </view>

        <!-- 综合运势圆环 -->
        <view class="ring-wrap">
          <view class="ring">
            <!-- #ifdef H5 -->
            <svg class="ring-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#f0e6e6" stroke-width="8" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="#c41e3a" stroke-width="8"
                stroke-linecap="round" :stroke-dasharray="dashArray"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <!-- #endif -->
            <view class="ring-center">
              <text class="ring-score">{{ fortune.overallScore }}</text>
              <text class="ring-level" :style="{ color: levelInfo.color }">{{ levelInfo.label }}</text>
            </view>
          </view>
          <text class="ring-summary">{{ fortune.overallSummary }}</text>
        </view>

        <!-- 今日宜忌 -->
        <view class="yiji">
          <view class="yiji-card yiji-yi">
            <view class="yiji-head">
              <view class="yiji-badge yiji-badge-yi">宜</view>
              <text class="yiji-title yiji-title-yi">今日宜</text>
            </view>
            <view class="yiji-tags">
              <text v-for="(item, i) in fortune.yiji.yi" :key="i" class="yiji-tag yiji-tag-yi">{{ item }}</text>
            </view>
          </view>
          <view class="yiji-card yiji-ji">
            <view class="yiji-head">
              <view class="yiji-badge yiji-badge-ji">忌</view>
              <text class="yiji-title yiji-title-ji">今日忌</text>
            </view>
            <view class="yiji-tags">
              <text v-for="(item, i) in fortune.yiji.ji" :key="i" class="yiji-tag yiji-tag-ji">{{ item }}</text>
            </view>
          </view>
        </view>

        <!-- 分类运势 -->
        <view class="section">
          <text class="section-title">分类运势</text>
          <view class="cat-grid">
            <view v-for="cat in fortune.categories" :key="cat.category" class="cat-card">
              <view class="cat-head">
                <view class="cat-icon" :style="{ background: CATEGORY_STYLE[cat.category].bg }">
                  <app-icon :name="CATEGORY_STYLE[cat.category].icon" :size="36" :color="CATEGORY_STYLE[cat.category].color" />
                </view>
                <view class="cat-meta">
                  <text class="cat-name">{{ cat.categoryName }}</text>
                  <text class="cat-score" :style="{ color: catLevelColor(cat.level) }">{{ cat.score }}分</text>
                </view>
              </view>
              <text class="cat-summary">{{ cat.summary }}</text>
            </view>
          </view>
        </view>

        <!-- 今日幸运 -->
        <view class="lucky">
          <text class="lucky-title">今日幸运</text>
          <view class="lucky-grid">
            <view class="lucky-item"><text class="lucky-key">幸运色：</text><text class="lucky-val">{{ fortune.luckyColor }}</text></view>
            <view class="lucky-item"><text class="lucky-key">幸运数：</text><text class="lucky-val">{{ fortune.luckyNumber }}</text></view>
            <view class="lucky-item"><text class="lucky-key">吉方位：</text><text class="lucky-val">{{ fortune.luckyDirection }}</text></view>
            <view class="lucky-item"><text class="lucky-key">吉时：</text><text class="lucky-val">{{ fortune.luckyTime }}</text></view>
          </view>
        </view>

        <!-- 查看详细解读 -->
        <view class="detail-btn" @tap="comingSoon">
          <text class="detail-btn-text">查看详细解读</text>
          <app-icon name="arrow-right" :size="32" color="#ffffff" />
        </view>

        <!-- 今日提醒 -->
        <view v-if="fortune.tips.length" class="tips">
          <text class="tips-title">今日提醒</text>
          <view v-for="(tip, i) in fortune.tips" :key="i" class="tip-row">
            <text class="tip-dot">•</text>
            <text class="tip-text">{{ tip }}</text>
          </view>
        </view>

        <view class="bottom-safe" />
      </view>
    </scroll-view>
  </view>

  </view>
  </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fdf2f2 0%, #f7f7f7 40%);
}
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16rpx 12rpx;
  height: 44px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.nav-title-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.scroll {
  box-sizing: border-box;
}
.body {
  padding: 16rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

/* 日期选择器 */
.date-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32rpx;
  padding-top: 16rpx;
}
.date-arrow {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.date-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.date-main {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.date-sub {
  font-size: 24rpx;
  color: #999;
}

/* 圆环 */
.ring-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ring {
  position: relative;
  width: 320rpx;
  height: 320rpx;
}
.ring-svg {
  width: 100%;
  height: 100%;
}
.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.ring-score {
  font-size: 72rpx;
  font-weight: 700;
  color: #c41e3a;
  line-height: 1;
}
.ring-level {
  font-size: 32rpx;
  font-weight: 500;
  margin-top: 8rpx;
}
.ring-summary {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  margin-top: 24rpx;
  max-width: 480rpx;
  line-height: 1.5;
}

/* 宜忌 */
.yiji {
  display: flex;
  gap: 24rpx;
}
.yiji-card {
  flex: 1;
  border-radius: 20rpx;
  border: 2rpx solid;
  padding: 24rpx;
}
.yiji-yi {
  border-color: #bbf7d0;
  background: rgba(240, 253, 244, 0.5);
}
.yiji-ji {
  border-color: #fecaca;
  background: rgba(254, 242, 242, 0.5);
}
.yiji-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.yiji-badge {
  width: 44rpx;
  height: 44rpx;
  border-radius: 999rpx;
  color: #fff;
  font-size: 24rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.yiji-badge-yi {
  background: #22c55e;
}
.yiji-badge-ji {
  background: #ef4444;
}
.yiji-title {
  font-size: 26rpx;
  font-weight: 500;
}
.yiji-title-yi {
  color: #15803d;
}
.yiji-title-ji {
  color: #b91c1c;
}
.yiji-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.yiji-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}
.yiji-tag-yi {
  background: #dcfce7;
  color: #15803d;
}
.yiji-tag-ji {
  background: #fee2e2;
  color: #b91c1c;
}

/* 分类运势 */
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 24rpx;
  display: block;
}
.cat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.cat-card {
  border: 2rpx solid #f0f0f0;
  border-radius: 20rpx;
  padding: 24rpx;
  background: #fff;
}
.cat-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.cat-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-meta {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.cat-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.cat-score {
  font-size: 22rpx;
}
.cat-summary {
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 今日幸运 */
.lucky {
  background: linear-gradient(90deg, #fffbeb 0%, #fff7ed 100%);
  border: 2rpx solid #fde68a;
  border-radius: 20rpx;
  padding: 24rpx;
}
.lucky-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 24rpx;
  display: block;
}
.lucky-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.lucky-item {
  display: flex;
  align-items: center;
  font-size: 26rpx;
}
.lucky-key {
  color: #d97706;
}
.lucky-val {
  color: #2c2c2c;
  font-weight: 500;
}

/* 详细解读按钮 */
.detail-btn {
  height: 88rpx;
  background: #c41e3a;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.detail-btn-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
}

/* 今日提醒 */
.tips {
  border: 2rpx dashed #e0e0e0;
  border-radius: 20rpx;
  padding: 24rpx;
}
.tips-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 16rpx;
  display: block;
}
.tip-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.tip-dot {
  color: #c41e3a;
  font-size: 24rpx;
  line-height: 1.5;
}
.tip-text {
  flex: 1;
  font-size: 22rpx;
  color: #999;
  line-height: 1.5;
}
.bottom-safe {
  height: 48rpx;
}

/* 加载/错误态 */
.state-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  gap: 24rpx;
}
.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid #f0e6e6;
  border-top-color: #c41e3a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.state-text {
  font-size: 26rpx;
  color: #999;
}
.retry-btn {
  padding: 16rpx 48rpx;
  background: #c41e3a;
  border-radius: 12rpx;
}
.retry-text {
  color: #fff;
  font-size: 26rpx;
}
</style>
