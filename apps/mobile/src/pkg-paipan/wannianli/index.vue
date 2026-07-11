<script setup lang="ts">
/**
 * 万年历 · 黄历择吉（自 V0 app/yijing/wannianli + components/yijing/wannianli/wannianli-app.tsx 还原）
 * 结构：顶栏（岁次副标题 + 纪年转换入口）+ 日/月/年分段切换 + 回到今天
 *      + 日视图（老黄历撕历全量）/ 月视图 / 年视图 / 纪年转换子页。
 * 取舍（V0→本批范围）：
 * - "择日"tab 为 AI 接口功能 → 本批不还原，整块砍掉（规范第 6 条）；
 * - "档案/养生"tab 在 V0 中为静态假数据（源码自注"静态假数据"）→ 砍掉，不造 mock；
 * - 底部导航因只剩黄历一个 tab 随之取消，纪年转换保留为顶栏入口（真算，convertEra）。
 * 数据全部来自 @/pkg-paipan/lib/wannianli-engine 本地真算，无网络请求。
 */
import { ref, computed } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { buildAlmanac } from '@/pkg-paipan/lib/wannianli-engine'
import SegmentedControl from './components/segmented-control.vue'
import DayView from './components/day-view.vue'
import MonthView from './components/month-view.vue'
import YearView from './components/year-view.vue'
import EraConverter from './components/era-converter.vue'

const CALENDAR_VIEWS = [
  { key: 'day', label: '日' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
]

const calView = ref<string>('day')
// 纪年转换作为右上入口进入的独立子页
const showEra = ref(false)
// 全局选中日期（默认今天），驱动各视图
const selectedDate = ref<Date>(new Date())

// 黄历页头随选中日期动态显示岁次干支
const headerTitle = computed(() => (showEra.value ? '古今纪年转换' : '万年历 · 黄历'))
const headerSubtitle = computed(() => {
  if (showEra.value) return '历法 · 干支 · 纪元'
  return `${buildAlmanac(selectedDate.value).day.lunarYear} · 择吉通书`
})

const isTodaySelected = computed(() => {
  const now = new Date()
  const d = selectedDate.value
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
})

function onChangeDate(d: Date) {
  selectedDate.value = d
}

function goToday() {
  selectedDate.value = new Date()
}

function onSegChange(key: string) {
  calView.value = key
}

function handleBack() {
  if (showEra.value) {
    showEra.value = false
    return
  }
  const pages = getCurrentPages()
  if (pages.length > 1) navigateBack()
  else navigateTo('/paipan')
}
</script>

<template>
  <view class="page">
    <tool-header
      :title="headerTitle"
      :subtitle="headerSubtitle"
      share
      share-title="万年历 · 黄历择吉"
      @back="handleBack"
    >
      <template #actions>
        <view v-if="!showEra" class="hd-btn" @tap="showEra = true">
          <app-icon name="repeat" :size="36" color="var(--text-ink)" />
        </view>
      </template>
    </tool-header>

    <!-- 黄历视图的日/月/年切换 + 回到今天 -->
    <view v-if="!showEra" class="seg-row">
      <view class="seg-side" />
      <segmented-control :options="CALENDAR_VIEWS" :active-key="calView" @change="onSegChange" />
      <view class="seg-side seg-side-right">
        <view v-if="!isTodaySelected" class="today-btn" @tap="goToday">
          <text class="today-btn-text">今</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <era-converter v-if="showEra" :date="selectedDate" />
      <day-view v-else-if="calView === 'day'" :date="selectedDate" @change-date="onChangeDate" />
      <month-view
        v-else-if="calView === 'month'"
        :date="selectedDate"
        @select-date="onChangeDate"
        @open-day="calView = 'day'"
      />
      <year-view
        v-else
        :date="selectedDate"
        @select-month="onChangeDate"
        @open-month="calView = 'month'"
      />
      <view class="disc-wrap">
        <disclaimer
          variant="custom"
          tone="subtle"
          text="黄历宜忌、神煞、择吉等内容源自传统民俗文化，仅供文化研习参考，不构成任何预测或建议。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--bg-paper);
  display: flex;
  flex-direction: column;
}
.body { flex: 1; min-height: 0; }

.hd-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  &:active { background: rgba(0, 0, 0, 0.05); }
}

.seg-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  border-bottom: 1rpx solid var(--line);
  background: rgba(255, 255, 255, 0.4);
  padding: 16rpx 32rpx;
}
.seg-side { flex: 1; display: flex; }
.seg-side-right { justify-content: flex-end; }
.today-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1rpx solid rgba(196, 30, 58, 0.4);
  background: rgba(196, 30, 58, 0.08);
  &:active { background: rgba(196, 30, 58, 0.16); }
}
.today-btn-text {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--brand);
}
.disc-wrap { padding: 0 32rpx 48rpx; }
</style>
