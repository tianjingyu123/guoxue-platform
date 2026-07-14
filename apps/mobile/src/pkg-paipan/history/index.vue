<script setup lang="ts">
/**
 * 全部排盘记录（排盘首页右上角「历史」入口）
 *
 * 此前这条路由指向 coming-soon 占位页 —— 是条死链，但记录其实一直都在本地存着，
 * 只是散在 21 个工具各自的记录页里，没有一个总入口。这里用主包的跨工具聚合器
 * （lib/paipan/recent-charts）把它们汇到一处，按工具筛选，点进去回到对应工具页复盘。
 *
 * 记录都是真的（本地 storage），没排过盘就是空的 —— 不造任何示例数据。
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import { navigateTo } from '@/utils/router'
import { recentCharts, chartCounts, RECENT_TOOLS, type RecentChart } from '@/lib/paipan/recent-charts'

const all = ref<RecentChart[]>([])
const counts = ref<Record<string, number>>({})
const filter = ref('')
const keyword = ref('')

/** 有记录的工具才出现在筛选条上（没记录的工具列出来只是噪音） */
const tabs = computed(() => {
  const withRecords = RECENT_TOOLS.filter((t) => (counts.value[t.key] ?? 0) > 0)
  return [{ key: '', label: `全部 ${all.value.length}` }, ...withRecords.map((t) => ({
    key: t.key,
    label: `${t.label} ${counts.value[t.key]}`,
  }))]
})

const list = computed(() => {
  let out = all.value
  if (filter.value) out = out.filter((r) => r.toolKey === filter.value)
  const kw = keyword.value.trim()
  if (kw) out = out.filter((r) => r.title.includes(kw) || r.summary.includes(kw))
  return out
})

function load() {
  // 取全量（各工具 store 自己限了 50 条上限，总量可控）
  all.value = recentCharts(1000)
  counts.value = chartCounts()
}

onMounted(load)
onShow(load)

function open(r: RecentChart) {
  navigateTo(r.href)
}
</script>

<template>
  <view class="ph">
    <ToolHeader title="排盘记录" subtitle="全部工具 · 随取随看" />

    <view class="ph-bar">
      <view class="ph-search">
        <AppIcon name="search" :size="16" color="#B8AA9A" />
        <input
          v-model="keyword"
          class="ph-search-input"
          placeholder="搜姓名 / 问事"
          placeholder-class="ph-ph"
          confirm-type="search"
        />
      </view>
    </view>

    <scroll-view v-if="all.length" class="ph-tabs" scroll-x :show-scrollbar="false">
      <view class="ph-tabs-inner">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="ph-tab"
          :class="{ 'ph-tab--on': filter === t.key }"
          @tap="filter = t.key"
        >
          <text class="ph-tab-txt" :class="{ 'ph-tab-txt--on': filter === t.key }">{{ t.label }}</text>
        </view>
      </view>
    </scroll-view>

    <scroll-view class="ph-body" scroll-y :show-scrollbar="false">
      <PaperCard v-if="!all.length" padding="lg">
        <view class="ph-empty">
          <AppIcon name="history" :size="44" color="#D5C9B8" />
          <text class="ph-empty-txt">还没有排盘记录</text>
          <text class="ph-empty-sub">回首页选个工具起一盘，记录会自动留在这里</text>
        </view>
      </PaperCard>

      <PaperCard v-else-if="!list.length" padding="lg">
        <view class="ph-empty">
          <text class="ph-empty-txt">没有匹配的记录</text>
        </view>
      </PaperCard>

      <PaperCard v-else padding="none">
        <view
          v-for="(r, i) in list"
          :key="r.toolKey + r.ts + i"
          class="ph-item"
          :class="{ 'ph-item--line': i !== list.length - 1 }"
          @tap="open(r)"
        >
          <view class="ph-avatar">{{ (r.title || '盘').slice(0, 1) }}</view>
          <view class="ph-info">
            <view class="ph-row">
              <text class="ph-title">{{ r.title }}</text>
              <text class="ph-tool">{{ r.toolLabel }}</text>
            </view>
            <text class="ph-summary">{{ r.summary || '—' }}</text>
          </view>
          <view class="ph-right">
            <text class="ph-time">{{ r.timeText }}</text>
            <AppIcon name="chevron-right" :size="16" color="#B8AA9A" />
          </view>
        </view>
      </PaperCard>

      <view class="ph-space" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.ph {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F7F3EC;
}

.ph-bar {
  padding: 20rpx 24rpx 0;
}

.ph-search {
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 76rpx;
  padding: 0 20rpx;
  border-radius: 38rpx;
  background: #FDFAF4;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
}

.ph-search-input {
  flex: 1;
  height: 76rpx;
  font-size: 26rpx;
  color: #3A2A1E;
}

.ph-ph {
  color: #C4B8A8;
}

.ph-tabs {
  white-space: nowrap;
  padding: 20rpx 0 0;
}

.ph-tabs-inner {
  display: inline-flex;
  gap: 12rpx;
  padding: 0 24rpx;
}

.ph-tab {
  padding: 10rpx 22rpx;
  border-radius: 30rpx;
  background: rgba(154, 140, 126, 0.1);
}

.ph-tab--on {
  background: #C41E3A;
}

.ph-tab-txt {
  font-size: 23rpx;
  color: #7A6C5E;
}

.ph-tab-txt--on {
  color: #fff;
  font-weight: 600;
}

.ph-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx;
  box-sizing: border-box;
}

.ph-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
}

.ph-item--line {
  border-bottom: 1rpx solid rgba(58, 42, 30, 0.08);
}

.ph-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
  font-size: 30rpx;
  font-weight: 700;
  color: #C41E3A;
}

.ph-info {
  flex: 1;
  min-width: 0;
}

.ph-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.ph-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280rpx;
}

.ph-tool {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(154, 140, 126, 0.12);
  font-size: 18rpx;
  color: #7A6C5E;
}

.ph-summary {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #9A8C7E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ph-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.ph-time {
  font-size: 20rpx;
  color: #B8AA9A;
}

.ph-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 72rpx 24rpx;
}

.ph-empty-txt {
  font-size: 28rpx;
  color: #7A6C5E;
}

.ph-empty-sub {
  font-size: 22rpx;
  color: #B8AA9A;
  text-align: center;
}

.ph-space {
  height: 40rpx;
}
</style>
