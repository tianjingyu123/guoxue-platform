<script setup lang="ts">
/**
 * 排盘主页「今日时刻」Hero（自 V0 components/home/today-hero.tsx 还原）
 * 大号衬线日号 + 干支岁次 + 当前时辰吉凶 + 建除宜忌 + 冲煞/财神/喜神方位，整卡可进完整万年历。
 * 数据源：主包轻量黄历 almanac-lite（纯干支/节气推算，微信主包 2MB 上限约束下不引 lunar-typescript）；
 * 农历月日在 H5/App 端动态加载 lunar-typescript 补充显示，小程序端显示节气行。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { buildLiteAlmanac, type LiteAlmanac } from '@/lib/paipan/almanac-lite'

const alm = ref<LiteAlmanac | null>(null)
const now = new Date()
const lunarText = ref('')

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
const dayNum = String(now.getDate())
const monthLabel = `${now.getMonth() + 1}月 ${MONTH_EN[now.getMonth()]}`
const weekday = WEEKDAYS[now.getDay()]

onMounted(async () => {
  alm.value = buildLiteAlmanac(now)
  // #ifndef MP-WEIXIN
  try {
    const { Solar } = await import('@/pkg-paipan/lib/lunar/index.js')
    const lunar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate()).getLunar()
    lunarText.value = `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
  } catch {
    // 加载失败则维持节气行
  }
  // #endif
})

const subLine = computed(() => lunarText.value || alm.value?.jieqiLine || '')
const yiText = computed(() => alm.value?.yi.join(' · ') || '诸事顺遂')
const jiText = computed(() => alm.value?.ji.join(' · ') || '百无禁忌')

const luckText: Record<string, string> = { good: '宜行事', bad: '宜静守', neutral: '平和' }

function goWannianli() {
  navigateTo('/paipan/wannianli')
}
</script>

<template>
  <!-- 加载占位 -->
  <view v-if="!alm" class="hero hero-skeleton" />

  <view v-else class="hero">
    <!-- 顶行：品牌 + 完整黄历入口 -->
    <view class="hero-top">
      <view class="brand">
        <image class="brand-logo" src="/static/logo.jpg" mode="aspectFill" />
        <view class="brand-texts">
          <text class="brand-name">热卜国学</text>
          <text class="brand-sub">GUOXUE STUDIO</text>
        </view>
      </view>
      <view class="full-link" @tap="goWannianli">
        <text class="full-link-text">完整黄历</text>
        <app-icon name="chevron-right" :size="24" color="var(--text-soft)" />
      </view>
    </view>

    <!-- 主体：大字日号 + 农历/节气信息 -->
    <view @tap="goWannianli">
      <view class="day-row">
        <text class="day-num">{{ dayNum }}</text>
        <view class="day-info">
          <text class="day-month">{{ monthLabel }} · {{ weekday }}</text>
          <text class="day-lunar">{{ subLine }}</text>
        </view>
      </view>
      <view class="ganzhi-line">
        <text class="ganzhi-text">{{ alm.ganZhiLine }}</text>
      </view>
    </view>

    <!-- 当前时辰吉凶（黄黑道） -->
    <view class="hour-row">
      <view class="hour-left">
        <app-icon name="clock-3" :size="28" color="var(--text-soft)" />
        <text class="hour-text">
          此刻 <text class="hour-name">{{ alm.currentHour.name }}</text>
          <text class="hour-range"> {{ alm.currentHour.range }} · {{ alm.currentHour.god }}</text>
        </text>
      </view>
      <text class="hour-luck" :class="`hour-luck-${alm.currentHour.luck}`">{{ luckText[alm.currentHour.luck] }}</text>
    </view>

    <!-- 宜 / 忌 摘要（建除十二神） -->
    <view class="yiji-grid">
      <view class="yiji-card yiji-yi" @tap="goWannianli">
        <view class="yiji-head">
          <view class="yiji-tag yiji-tag-yi"><text class="yiji-tag-text">宜</text></view>
          <text class="yiji-label">今日适宜 · {{ alm.jianChu }}</text>
        </view>
        <text class="yiji-content">{{ yiText }}</text>
      </view>
      <view class="yiji-card yiji-ji" @tap="goWannianli">
        <view class="yiji-head">
          <view class="yiji-tag yiji-tag-ji"><text class="yiji-tag-text">忌</text></view>
          <text class="yiji-label">今日忌讳</text>
        </view>
        <text class="yiji-content">{{ jiText }}</text>
      </view>
    </view>

    <!-- 冲煞 / 财神 / 喜神 -->
    <view class="gods-row">
      <view class="god-item">
        <text class="god-label">冲煞</text>
        <text class="god-value god-bad">{{ alm.chongSha }}</text>
      </view>
      <view class="god-item">
        <text class="god-label">财神</text>
        <text class="god-value god-gold">{{ alm.caiShen }}</text>
      </view>
      <view class="god-item">
        <text class="god-label">喜神</text>
        <text class="god-value god-brand">{{ alm.xiShen }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.hero {
  position: relative;
  overflow: hidden;
  border-radius: 32rpx;
  border: 1rpx solid rgba(201, 169, 110, 0.4);
  background: var(--card);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  padding: 32rpx;
}
.hero-skeleton {
  height: 560rpx;
  animation: hero-pulse 1.5s ease-in-out infinite;
}
@keyframes hero-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 顶行 */
.hero-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28rpx; }
.brand { display: flex; align-items: center; gap: 18rpx; }
.brand-logo { width: 64rpx; height: 64rpx; border-radius: 12rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1); }
.brand-texts { display: flex; flex-direction: column; }
.brand-name {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 26rpx; font-weight: 700; letter-spacing: 2rpx; color: var(--text-ink);
}
.brand-sub { font-size: 18rpx; letter-spacing: 4rpx; color: var(--text-soft); }
.full-link {
  display: flex; align-items: center; gap: 4rpx;
  border: 1rpx solid rgba(201, 169, 110, 0.5);
  border-radius: 999rpx; padding: 8rpx 22rpx;
}
.full-link-text { font-size: 24rpx; color: var(--text-soft); }

/* 大字日号 */
.day-row { display: flex; align-items: flex-end; gap: 32rpx; }
.day-num {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 144rpx; font-weight: 900; line-height: 0.85; color: var(--brand);
}
.day-info { display: flex; flex-direction: column; padding-bottom: 10rpx; }
.day-month {
  font-family: Georgia, 'Songti SC', serif;
  font-size: 34rpx; font-weight: 700; color: var(--text-ink);
}
.day-lunar { margin-top: 8rpx; font-family: Georgia, 'Songti SC', serif; font-size: 26rpx; color: var(--text-soft); }
.ganzhi-line {
  margin-top: 24rpx; padding: 12rpx 0; text-align: center;
  border-top: 1rpx solid rgba(201, 169, 110, 0.4);
  border-bottom: 1rpx solid rgba(201, 169, 110, 0.4);
}
.ganzhi-text { font-family: Georgia, 'Songti SC', serif; font-size: 26rpx; color: var(--text-ink); }

/* 当前时辰 */
.hour-row {
  margin-top: 24rpx; padding: 20rpx 32rpx;
  display: flex; align-items: center; justify-content: space-between;
  border-radius: 24rpx; background: rgba(0, 0, 0, 0.03);
}
.hour-left { display: flex; align-items: center; gap: 16rpx; }
.hour-text { font-family: Georgia, 'Songti SC', serif; font-size: 26rpx; color: var(--text-ink); }
.hour-name { font-weight: 700; color: var(--brand); }
.hour-range { font-size: 22rpx; color: var(--text-soft); }
.hour-luck { font-family: Georgia, 'Songti SC', serif; font-size: 26rpx; font-weight: 700; }
.hour-luck-good { color: #2f9d6a; }
.hour-luck-bad { color: var(--brand); }
.hour-luck-neutral { color: var(--text-soft); }

/* 宜忌 */
.yiji-grid { margin-top: 24rpx; display: flex; gap: 20rpx; }
.yiji-card { flex: 1; border-radius: 24rpx; padding: 24rpx; }
.yiji-yi { border: 1rpx solid rgba(47, 157, 106, 0.3); background: rgba(47, 157, 106, 0.05); }
.yiji-ji { border: 1rpx solid rgba(196, 30, 58, 0.3); background: rgba(196, 30, 58, 0.05); }
.yiji-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.yiji-tag {
  width: 40rpx; height: 40rpx; border-radius: 8rpx;
  display: flex; align-items: center; justify-content: center;
}
.yiji-tag-yi { background: #2f9d6a; }
.yiji-tag-ji { background: var(--brand); }
.yiji-tag-text { font-family: Georgia, 'Songti SC', serif; font-size: 24rpx; font-weight: 700; color: #ffffff; }
.yiji-label { font-size: 22rpx; color: var(--text-soft); }
.yiji-content {
  font-family: Georgia, 'Songti SC', serif;
  font-size: 26rpx; line-height: 1.6; color: var(--text-ink);
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
}

/* 方位吉神 */
.gods-row {
  margin-top: 24rpx; padding: 20rpx 0;
  display: flex; align-items: center; justify-content: space-around;
  border: 1rpx solid rgba(201, 169, 110, 0.4); border-radius: 24rpx;
}
.god-item { display: flex; align-items: center; gap: 12rpx; }
.god-label { font-family: Georgia, 'Songti SC', serif; font-size: 26rpx; color: var(--text-soft); }
.god-value { font-family: Georgia, 'Songti SC', serif; font-size: 26rpx; font-weight: 700; }
.god-bad { color: var(--brand); }
.god-gold { color: var(--jewel-gold-deep, #b8985f); }
.god-brand { color: var(--brand); }
</style>
