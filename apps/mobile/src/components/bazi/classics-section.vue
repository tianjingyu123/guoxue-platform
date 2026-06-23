<script setup lang="ts">
/** 古籍参考（书封网格 + 原文/译文/对照切换）——对应原型 ClassicsSection */
import { ref } from 'vue'
import SectionTitle from './section-title.vue'
import { classics, baziApi } from '@/lib/bazi-result-data'

const selected = ref<string | null>(null)
const mode = ref<'原文' | '译文' | '对照'>('原文')
const contentLoading = ref(false)
const currentContent = ref<{ title: string; original: string; translation: string } | null>(null)

async function toggle(id: string) {
  if (selected.value === id) { selected.value = null; currentContent.value = null; return }
  selected.value = id
  contentLoading.value = true
  try {
    currentContent.value = await baziApi.classicsRef(id)
  } catch {
    currentContent.value = null
  } finally {
    contentLoading.value = false
  }
}
</script>

<template>
  <view class="cs">
    <section-title title="古籍参考">
      <template #extra><text class="cs-more">更多古籍</text></template>
    </section-title>
    <view class="cs-grid">
      <view v-for="b in classics" :key="b.id" class="cs-book" @tap="toggle(b.id)">
        <view class="cs-cover" :class="{ 'cs-cover-on': selected === b.id }">
          <view class="cs-cover-bg" />
          <view class="cs-spine" />
          <view class="cs-frame"><text class="cs-name-v">{{ b.name }}</text></view>
        </view>
        <text class="cs-label" :class="{ 'cs-label-on': selected === b.id }">{{ b.name }}</text>
      </view>
    </view>
    <view v-if="selected && contentLoading" class="cs-detail">
      <view class="cs-card"><text class="cs-body" style="color:#999;text-align:center">加载中...</text></view>
    </view>
    <view v-else-if="selected && currentContent" class="cs-detail">
      <view class="cs-modes">
        <view v-for="m in (['原文','译文','对照'] as const)" :key="m" class="cs-mode" :class="{ 'cs-mode-on': mode === m }" @tap="mode = m">
          <text class="cs-mode-text" :class="{ 'cs-mode-text-on': mode === m }">{{ m }}</text>
        </view>
      </view>
      <view class="cs-card">
        <text class="cs-title">{{ currentContent.title }}</text>
        <text v-if="mode === '原文'" class="cs-body">{{ currentContent.original }}</text>
        <text v-else-if="mode === '译文'" class="cs-body">{{ currentContent.translation }}</text>
        <text v-else class="cs-body"><text class="cs-tag-ink">【原文】</text>{{ currentContent.original }}{{ '\n\n' }}<text class="cs-tag-brand">【译文】</text>{{ currentContent.translation }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cs { background: var(--card); border-radius: 16rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); overflow: hidden; }
.cs-more { font-size: 22rpx; color: var(--brand); }
.cs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; padding: 0 24rpx 24rpx; }
.cs-book { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.cs-cover { position: relative; width: 136rpx; height: 184rpx; border-radius: 4rpx; overflow: hidden; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1); }
.cs-cover-on { box-shadow: 0 0 0 4rpx var(--brand), 0 4rpx 10rpx rgba(0,0,0,0.15); }
.cs-cover-bg { position: absolute; inset: 0; background: linear-gradient(to bottom, #fef3c7, #fffbeb, #fef3c7); }
.cs-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 12rpx; background: linear-gradient(to right, rgba(253,230,138,0.8), transparent); border-right: 2rpx solid rgba(252,211,77,0.4); }
.cs-frame { position: absolute; left: 28rpx; right: 12rpx; top: 20rpx; bottom: 20rpx; border: 2rpx solid rgba(251,191,36,0.4); border-radius: 2rpx; display: flex; align-items: center; justify-content: center; }
.cs-name-v { writing-mode: vertical-rl; font-size: 22rpx; font-weight: 700; color: var(--brand); letter-spacing: 2rpx; }
.cs-label { font-size: 22rpx; color: var(--text-soft); line-height: 1.2; }
.cs-label-on { color: var(--brand); font-weight: 600; }
.cs-detail { border-top: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding: 24rpx; background: rgba(0,0,0,0.02); }
.cs-modes { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.cs-mode { padding: 8rpx 24rpx; border-radius: 999rpx; background: var(--card); border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.cs-mode-on { background: var(--brand); border-color: var(--brand); }
.cs-mode-text { font-size: 22rpx; color: var(--text-soft); }
.cs-mode-text-on { color: #fff; }
.cs-card { background: var(--card); border-radius: 16rpx; padding: 24rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.cs-title { display: block; font-size: 28rpx; font-weight: 600; color: var(--text-ink); margin-bottom: 12rpx; }
.cs-body { font-size: 28rpx; line-height: 1.7; color: var(--text-soft); white-space: pre-line; }
.cs-tag-ink { color: var(--text-ink); font-weight: 500; }
.cs-tag-brand { color: var(--brand); font-weight: 500; }
</style>
