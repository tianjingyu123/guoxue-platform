<script setup lang="ts">
/**
 * 万年历 · 黄历择吉（自 V0 app/yijing/wannianli + components/yijing/wannianli/wannianli-app.tsx 还原）
 * 结构：顶栏（岁次副标题 + 纪年转换入口）+ 底部导航（黄历 / 择日）
 *      + 黄历：日/月/年分段切换 · 日视图（老黄历撕历全量）/ 月视图 / 年视图
 *      + 择日：择吉通书（按事项筛吉日）
 *      + 纪年转换子页（顶栏入口）。
 *
 * 🔴 2026-07-14 补回「择日」：上个批次以「AI 接口功能」为由把整个 tab 砍了，
 *    连底部导航一起取消了 —— 但择吉是这个工具的主功能，而且根本不需要 AI：
 *    老黄历逐日载明宜忌/建除/天神/吉神凶煞，择吉是查表+排序，不是生成。
 *    现由 lib/zeji-engine 本地真算（与黄历同一份语料，宜忌逐字对得上）。
 *    V0 的「专业精批」那一档（结合事主生辰做神煞筛选）仍留待 AI 批次。
 *
 * 取舍：V0 的「档案 / 养生」两个 tab 在 V0 中即为静态假数据（源码自注"静态假数据"）→ 不还原，不造 mock。
 * 数据全部来自 @/pkg-paipan/lib/{wannianli,zeji}-engine 本地真算，无网络请求。
 */
import { ref, computed } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { buildAlmanac } from '@/pkg-paipan/lib/wannianli-engine'
import { findEventByTerm, type ZejiEvent } from '@/pkg-paipan/lib/zeji-engine'
import SegmentedControl from './components/segmented-control.vue'
import DayView from './components/day-view.vue'
import MonthView from './components/month-view.vue'
import YearView from './components/year-view.vue'
import EraConverter from './components/era-converter.vue'
import ZejiPicker from './components/zeji-picker.vue'

const CALENDAR_VIEWS = [
  { key: 'day', label: '日' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
]

/** 底部导航（V0 的 BottomNav；档案/养生为 V0 假数据，不还原） */
const NAV_ITEMS = [
  { key: 'calendar', label: '黄历', icon: 'calendar' },
  { key: 'zeji', label: '择日', icon: 'sparkles' },
]

const tab = ref<'calendar' | 'zeji'>('calendar')
const calView = ref<string>('day')
// 纪年转换作为右上入口进入的独立子页
const showEra = ref(false)
// 全局选中日期（默认今天），驱动各视图
const selectedDate = ref<Date>(new Date())
// 从黄历宜忌点进择日时带入的事项
const seedEvent = ref<ZejiEvent | null>(null)

// 黄历页头随选中日期动态显示岁次干支
const headerTitle = computed(() => {
  if (showEra.value) return '古今纪年转换'
  return tab.value === 'zeji' ? '择吉通书' : '万年历 · 黄历'
})
const headerSubtitle = computed(() => {
  if (showEra.value) return '历法 · 干支 · 纪元'
  if (tab.value === 'zeji') return '按事项择吉日 · 黄历真算'
  return `${buildAlmanac(selectedDate.value).day.lunarYear} · 择吉通书`
})

function onNav(key: string) {
  tab.value = key as 'calendar' | 'zeji'
  // 手动切到择日时清掉上次带入的事项，回到默认事项
  if (key === 'zeji') seedEvent.value = null
}

/**
 * 黄历宜忌点击 → 跳择日并带入该事项（V0 的联动）。
 * 黄历里的词是「嫁娶」「开市」这类正式用语，findEventByTerm 会把它映射到择吉事项。
 * 映射不到的（如「馀事勿取」这种不是事项的词）就不跳，避免点了没反应还切走了页。
 */
function onPickYiJi(term: string) {
  const e = findEventByTerm(term)
  if (!e) {
    uni.showToast({ title: `「${term}」暂不支持择吉`, icon: 'none' })
    return
  }
  seedEvent.value = e
  tab.value = 'zeji'
}

/** 择日结果点「看这天的完整黄历」→ 回黄历日视图并定位到那天 */
function onOpenDay(d: Date) {
  selectedDate.value = d
  calView.value = 'day'
  tab.value = 'calendar'
}

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
  // 在择日页按返回，先回黄历（而不是直接退出工具）
  if (tab.value === 'zeji') {
    tab.value = 'calendar'
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
        <view v-if="!showEra && tab === 'calendar'" class="hd-btn" @tap="showEra = true">
          <app-icon name="repeat" :size="36" color="var(--text-ink)" />
        </view>
      </template>
    </tool-header>

    <!-- 黄历视图的日/月/年切换 + 回到今天 -->
    <view v-if="!showEra && tab === 'calendar'" class="seg-row">
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

      <zeji-picker v-else-if="tab === 'zeji'" :initial-event="seedEvent" @open-day="onOpenDay" />

      <template v-else>
        <day-view
          v-if="calView === 'day'"
          :date="selectedDate"
          @change-date="onChangeDate"
          @pick-yiji="onPickYiJi"
        />
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
      </template>

      <view class="disc-wrap">
        <disclaimer
          variant="custom"
          tone="subtle"
          text="黄历宜忌、神煞、择吉等内容源自传统民俗文化，仅供文化研习参考，不构成任何预测或建议。"
        />
      </view>
    </scroll-view>

    <!-- 底部导航（V0 的 BottomNav；纪年转换是子页，进去时隐藏） -->
    <view v-if="!showEra" class="nav">
      <view
        v-for="n in NAV_ITEMS"
        :key="n.key"
        class="nav-item"
        @tap="onNav(n.key)"
      >
        <app-icon
          :name="n.icon"
          :size="40"
          :color="tab === n.key ? '#C41E3A' : '#9A8C7E'"
        />
        <text class="nav-label" :class="{ 'nav-label--on': tab === n.key }">{{ n.label }}</text>
      </view>
    </view>
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

/* 底部导航（黄历 / 择日）——贴底，含 iOS 安全区 */
.nav {
  display: flex;
  flex-shrink: 0;
  background: #fff;
  border-top: 1rpx solid rgba(58, 42, 30, 0.08);
  padding-bottom: env(safe-area-inset-bottom);
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  height: 100rpx;
}
.nav-label {
  font-size: 21rpx;
  color: #9a8c7e;
}
.nav-label--on {
  color: #c41e3a;
  font-weight: 600;
}

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
