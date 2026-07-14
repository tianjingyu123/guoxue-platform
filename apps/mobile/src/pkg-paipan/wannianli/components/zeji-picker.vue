<script setup lang="ts">
/**
 * 择吉通书 · 普通择吉（万年历「择日」tab）
 *
 * V0 这一档原是「纯 UI + 静态假数据」，上个批次因此把整个 tab 砍了。
 * 但择吉不必依赖 AI —— 老黄历逐日载明宜忌/建除/天神/吉神凶煞，
 * 择吉就是「按事项筛日子 + 按吉凶排序」。现由 lib/zeji-engine 本地真算，
 * 与黄历日视图同一份语料，推荐的日子点进黄历宜忌逐字对得上。
 *
 * 每条推荐都列出理由（黄道/吉神/凶煞），不做黑箱评分。
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { ZEJI_CATEGORIES, pickAuspiciousDays, type ZejiDay, type ZejiEvent } from '@/pkg-paipan/lib/zeji-engine'

const props = defineProps<{
  /** 从黄历宜忌点进来时带入的事项（如「嫁娶」） */
  initialEvent?: ZejiEvent | null
}>()

const emit = defineEmits<{ (e: 'open-day', date: Date): void }>()

/** 扫描窗口：一季 / 半年 / 一年 */
const RANGES = [
  { key: 90, label: '未来三月' },
  { key: 180, label: '未来半年' },
  { key: 365, label: '未来一年' },
]

const catKey = ref(ZEJI_CATEGORIES[0].key)
const picked = ref<ZejiEvent>(ZEJI_CATEGORIES[0].events[0])
const range = ref(90)
const expanded = ref<string>('')

const category = computed(() => ZEJI_CATEGORIES.find((c) => c.key === catKey.value) ?? ZEJI_CATEGORIES[0])

const results = computed<ZejiDay[]>(() =>
  pickAuspiciousDays({ terms: picked.value.terms, days: range.value, limit: 20 }),
)

/** 黄历宜忌点击带入的事项：定位到它所属分类并选中 */
watch(
  () => props.initialEvent,
  (e) => {
    if (!e) return
    const cat = ZEJI_CATEGORIES.find((c) => c.events.some((x) => x.key === e.key))
    if (cat) catKey.value = cat.key
    picked.value = e
    expanded.value = ''
  },
  { immediate: true },
)

function onCat(key: string) {
  catKey.value = key
  const cat = ZEJI_CATEGORIES.find((c) => c.key === key)
  if (cat) picked.value = cat.events[0]
  expanded.value = ''
}

function onEvent(e: ZejiEvent) {
  picked.value = e
  expanded.value = ''
}

function toggle(d: ZejiDay) {
  expanded.value = expanded.value === d.solarText ? '' : d.solarText
}

function openDay(d: ZejiDay) {
  emit('open-day', d.date)
}

/** 吉度色阶：>=90 上吉 / >=75 次吉 / 其余 平 */
function tone(score: number): string {
  if (score >= 90) return 'gold'
  if (score >= 75) return 'good'
  return 'plain'
}
function toneLabel(score: number): string {
  if (score >= 90) return '上吉'
  if (score >= 75) return '次吉'
  return '平'
}
</script>

<template>
  <view class="zj">
    <!-- 事项分类 -->
    <scroll-view scroll-x class="zj-cats" :show-scrollbar="false">
      <view class="zj-cats-inner">
        <view
          v-for="c in ZEJI_CATEGORIES"
          :key="c.key"
          class="zj-cat"
          :class="{ 'zj-cat--on': catKey === c.key }"
          @tap="onCat(c.key)"
        >
          <text class="zj-cat-txt" :class="{ 'zj-cat-txt--on': catKey === c.key }">{{ c.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 事项 -->
    <view class="zj-events">
      <view
        v-for="e in category.events"
        :key="e.key"
        class="zj-event"
        :class="{ 'zj-event--on': picked.key === e.key }"
        @tap="onEvent(e)"
      >
        <text class="zj-event-txt" :class="{ 'zj-event-txt--on': picked.key === e.key }">{{ e.label }}</text>
      </view>
    </view>

    <!-- 扫描范围 -->
    <view class="zj-range">
      <view
        v-for="r in RANGES"
        :key="r.key"
        class="zj-range-item"
        :class="{ 'zj-range-item--on': range === r.key }"
        @tap="range = r.key"
      >
        <text class="zj-range-txt" :class="{ 'zj-range-txt--on': range === r.key }">{{ r.label }}</text>
      </view>
    </view>

    <!-- 结果 -->
    <view class="zj-head">
      <text class="zj-head-title">宜「{{ picked.label }}」之吉日</text>
      <text class="zj-head-sub">{{ results.length }} 天 · 按吉度排序</text>
    </view>

    <view v-if="!results.length" class="zj-empty">
      <AppIcon name="calendar" :size="40" color="#D5C9B8" />
      <text class="zj-empty-txt">{{ RANGES.find((r) => r.key === range)?.label }}内没有宜「{{ picked.label }}」的日子</text>
      <text class="zj-empty-sub">可把范围放宽到一年再看</text>
    </view>

    <view v-else class="zj-list">
      <view
        v-for="(d, i) in results"
        :key="d.solarText"
        class="zj-item"
        :class="{ 'zj-item--first': i === 0 }"
        @tap="toggle(d)"
      >
        <!-- 吉度 -->
        <view class="zj-score" :class="`zj-score--${tone(d.score)}`">
          <text class="zj-score-num" :class="`zj-score-num--${tone(d.score)}`">{{ d.score }}</text>
          <text class="zj-score-lab" :class="`zj-score-lab--${tone(d.score)}`">{{ toneLabel(d.score) }}</text>
        </view>

        <view class="zj-main">
          <view class="zj-row">
            <text class="zj-date">{{ d.solarText }}</text>
            <text class="zj-week">{{ d.weekday }}</text>
            <text v-if="i === 0" class="zj-first">首选</text>
          </view>
          <text class="zj-lunar">{{ d.lunarText }} · {{ d.ganzhi }} · {{ d.jianChu }}</text>
          <text class="zj-chong">{{ d.chongSha }}</text>

          <!-- 展开：为什么推它 -->
          <view v-if="expanded === d.solarText" class="zj-why">
            <text v-for="(r, ri) in d.reasons" :key="ri" class="zj-why-line">· {{ r }}</text>
            <view class="zj-why-btn" @tap.stop="openDay(d)">
              <text class="zj-why-btn-txt">看这天的完整黄历</text>
              <AppIcon name="chevron-right" :size="14" color="#C41E3A" />
            </view>
          </view>
        </view>

        <view class="zj-days">
          <text class="zj-days-num">{{ d.daysFromNow }}</text>
          <text class="zj-days-lab">天后</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.zj {
  padding: 0 24rpx;
}

/* 分类 */
.zj-cats {
  white-space: nowrap;
  margin-top: 8rpx;
}
.zj-cats-inner {
  display: inline-flex;
  gap: 12rpx;
  padding: 4rpx 0;
}
.zj-cat {
  padding: 10rpx 24rpx;
  border-radius: 30rpx;
  background: rgba(154, 140, 126, 0.1);
}
.zj-cat--on {
  background: #c41e3a;
}
.zj-cat-txt {
  font-size: 24rpx;
  color: #7a6c5e;
}
.zj-cat-txt--on {
  color: #fff;
  font-weight: 600;
}

/* 事项 */
.zj-events {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 20rpx;
}
.zj-event {
  padding: 12rpx 26rpx;
  border-radius: 10rpx;
  background: #fdfaf4;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
}
.zj-event--on {
  border-color: #c41e3a;
  background: rgba(196, 30, 58, 0.06);
}
.zj-event-txt {
  font-size: 26rpx;
  color: #3a2a1e;
}
.zj-event-txt--on {
  color: #c41e3a;
  font-weight: 700;
}

/* 范围 */
.zj-range {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}
.zj-range-item {
  flex: 1;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: rgba(154, 140, 126, 0.08);
}
.zj-range-item--on {
  background: rgba(196, 30, 58, 0.1);
}
.zj-range-txt {
  font-size: 23rpx;
  color: #7a6c5e;
}
.zj-range-txt--on {
  color: #c41e3a;
  font-weight: 600;
}

/* 标题 */
.zj-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 32rpx;
  margin-bottom: 16rpx;
}
.zj-head-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #3a2a1e;
}
.zj-head-sub {
  font-size: 22rpx;
  color: #9a8c7e;
}

/* 列表 */
.zj-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.zj-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 14rpx;
  background: #fff;
  border: 1rpx solid rgba(58, 42, 30, 0.08);
}
.zj-item--first {
  border-color: rgba(212, 175, 55, 0.5);
  background: #fffdf6;
}

.zj-score {
  width: 92rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10rpx 0;
  border-radius: 10rpx;
}
.zj-score--gold {
  background: rgba(212, 175, 55, 0.12);
}
.zj-score--good {
  background: rgba(196, 30, 58, 0.08);
}
.zj-score--plain {
  background: rgba(154, 140, 126, 0.1);
}
.zj-score-num {
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.2;
}
.zj-score-num--gold {
  color: #b8912f;
}
.zj-score-num--good {
  color: #c41e3a;
}
.zj-score-num--plain {
  color: #7a6c5e;
}
.zj-score-lab {
  font-size: 19rpx;
  margin-top: 2rpx;
}
.zj-score-lab--gold {
  color: #b8912f;
}
.zj-score-lab--good {
  color: #c41e3a;
}
.zj-score-lab--plain {
  color: #9a8c7e;
}

.zj-main {
  flex: 1;
  min-width: 0;
}
.zj-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.zj-date {
  font-size: 29rpx;
  font-weight: 700;
  color: #3a2a1e;
}
.zj-week {
  font-size: 22rpx;
  color: #9a8c7e;
}
.zj-first {
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  background: #d4af37;
  color: #fff;
  font-size: 19rpx;
}
.zj-lunar {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #7a6c5e;
}
.zj-chong {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #b8aa9a;
}

.zj-why {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed rgba(58, 42, 30, 0.12);
}
.zj-why-line {
  display: block;
  font-size: 22rpx;
  line-height: 1.8;
  color: #7a6c5e;
}
.zj-why-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 12rpx;
}
.zj-why-btn-txt {
  font-size: 23rpx;
  color: #c41e3a;
  font-weight: 600;
}

.zj-days {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.zj-days-num {
  font-size: 28rpx;
  font-weight: 700;
  color: #9a8c7e;
}
.zj-days-lab {
  font-size: 19rpx;
  color: #b8aa9a;
}

/* 空态 */
.zj-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 72rpx 24rpx;
}
.zj-empty-txt {
  font-size: 27rpx;
  color: #7a6c5e;
  text-align: center;
}
.zj-empty-sub {
  font-size: 22rpx;
  color: #b8aa9a;
}
</style>
