<script setup lang="ts">
/** 我的笔记 —— 跨模块聚合古籍读书笔记 + 电子书笔记，按更新时间倒序，可按来源筛选。
 *  点击笔记跳转对应书籍详情。三态齐全。 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { mineApi, type NoteItem, type NoteSource } from '@/lib/mine-data'

const notes = ref<NoteItem[]>([])
const isLoading = ref(true)
const error = ref('')
const activeTab = ref<NoteSource | 'all'>('all')

const sourceMeta: Record<NoteSource, { name: string; color: string; bg: string }> = {
  classic: { name: '古籍', color: '#92400e', bg: 'rgba(146,64,14,0.1)' },
  ebook: { name: '电子书', color: '#0d9488', bg: 'rgba(13,148,136,0.1)' },
}

const tabs = computed(() => {
  const c = notes.value.filter((n) => n.source === 'classic').length
  return [
    { id: 'all' as const, name: '全部', count: notes.value.length },
    { id: 'classic' as const, name: '古籍', count: c },
  ]
})

const displayList = computed(() =>
  activeTab.value === 'all' ? notes.value : notes.value.filter((n) => n.source === activeTab.value),
)

async function fetchData() {
  isLoading.value = true
  error.value = ''
  try {
    notes.value = await mineApi.getNotes()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

function goBack() { navigateBack() }
function openNote(n: NoteItem) {
  if (!n.bookId) { uni.showToast({ title: '来源已失效', icon: 'none' }); return }
  navigateTo(n.source === 'classic' ? `/classic/${n.bookId}` : `/ebook/${n.bookId}`)
}
</script>

<template>
  <view class="notes-page">
    <!-- 头部 -->
    <view class="header">
      <view class="hd-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="hd-title">我的笔记</text>
      <view class="hd-back" />
    </view>

    <!-- 来源筛选 tab -->
    <view class="tabs">
      <view
        v-for="t in tabs" :key="t.id"
        class="tab" :class="{ on: activeTab === t.id }"
        @tap="activeTab = t.id"
      >
        <text class="tab-t" :class="{ on: activeTab === t.id }">{{ t.name }}</text>
        <text v-if="t.count" class="tab-c">{{ t.count }}</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="isLoading" class="state">
      <AppLoading />
    </view>
    <!-- 错误 -->
    <view v-else-if="error" class="state">
      <text class="state-t">{{ error }}</text>
      <view class="state-btn" @tap="fetchData"><text class="state-btn-t">重试</text></view>
    </view>
    <!-- 空 -->
    <view v-else-if="displayList.length === 0" class="state">
      <app-icon name="book-open" :size="64" color="#cccccc" />
      <text class="state-t">还没有笔记</text>
      <text class="state-sub">阅读古籍时，点击底部「笔记」即可记录</text>
    </view>
    <!-- 列表 -->
    <view v-else class="list">
      <view
        v-for="n in displayList" :key="n.id"
        class="note-card" @tap="openNote(n)"
      >
        <view class="nc-head">
          <text class="nc-badge" :style="{ color: sourceMeta[n.source].color, background: sourceMeta[n.source].bg }">{{ n.sourceName }}</text>
          <text class="nc-book">《{{ n.bookTitle }}》</text>
          <text v-if="n.chapter" class="nc-chapter">· {{ n.chapter }}</text>
        </view>
        <text class="nc-content">{{ n.content }}</text>
        <text v-if="n.updatedAt" class="nc-time">{{ n.updatedAt }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.notes-page { min-height: 100vh; background: #faf8f5; padding-bottom: 24rpx; }
.header {
  position: sticky; top: 0; z-index: 40; display: flex; align-items: center; justify-content: space-between;
  padding: 0 24rpx; height: 88rpx; padding-top: var(--status-bar-height, 0);
  background: rgba(250,248,245,0.95); backdrop-filter: blur(12px); border-bottom: 1rpx solid #ece8e1;
}
.hd-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.hd-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }
.tabs { display: flex; gap: 16rpx; padding: 20rpx 24rpx; }
.tab { display: flex; align-items: center; gap: 6rpx; padding: 10rpx 28rpx; border-radius: 999rpx; background: #fff; border: 1rpx solid #ece8e1; }
.tab.on { background: #8c1f28; border-color: #8c1f28; }
.tab-t { font-size: 26rpx; color: #666; }
.tab-t.on { color: #fff; }
.tab-c { font-size: 22rpx; color: #999; }
.tab.on .tab-c { color: rgba(255,255,255,0.85); }
.state { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 140rpx 48rpx; }
.state-t { font-size: 28rpx; color: #666; }
.state-sub { font-size: 24rpx; color: #999; text-align: center; }
.state-btn { margin-top: 12rpx; padding: 14rpx 48rpx; border-radius: 999rpx; background: #8c1f28; }
.state-btn-t { font-size: 26rpx; color: #fff; }
.list { padding: 0 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.note-card { background: #fff; border-radius: 20rpx; padding: 24rpx; border: 1rpx solid #f0ece5; }
.nc-head { display: flex; align-items: center; gap: 10rpx; margin-bottom: 14rpx; flex-wrap: wrap; }
.nc-badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 6rpx; }
.nc-book { font-size: 26rpx; font-weight: 600; color: #2c2c2c; }
.nc-chapter { font-size: 24rpx; color: #999; }
.nc-content { display: block; font-size: 28rpx; line-height: 1.7; color: #3c3c3c; }
.nc-time { display: block; margin-top: 14rpx; font-size: 22rpx; color: #b0b0b0; }
</style>
