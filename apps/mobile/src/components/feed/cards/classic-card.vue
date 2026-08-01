<script setup lang="ts">
/**
 * 古籍卡 · 统一 3:4，书封本身承担类型识别，保留阅读钩子。
 * 去数字化：不显共读人数。有扫描封面用真图；无封面用 FlatCover 仿真书封（永不缺图）。
 */
import { computed } from 'vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { type FeedEnvelope, payloadStr } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const hasCover = computed(() => !!(props.item.cover && props.item.cover.trim()))
const coverColor = computed(() => coverColorForBook(props.item.title))
const author = computed(() => props.item.author?.name || payloadStr(props.item, 'author') || '')
const dynasty = computed(() => payloadStr(props.item, 'dynasty') || '')
const category = computed(() => {
  const value = payloadStr(props.item, 'category') || ''
  const labels: Record<string, string> = {
    经: '经部',
    史: '史部',
    子: '子部',
    集: '集部',
    释: '释家',
    道: '道家',
    命: '命理',
  }
  return labels[value] || value
})
const coverLabel = computed(() => dynasty.value || category.value)
const coverFooter = computed(() => author.value)
const summary = computed(() => {
  const value = (props.item.subtitle || '').replace(/\s+/g, ' ').trim()
  if (value && value !== props.item.title) return value
  return category.value
    ? `从${category.value}原典入手，支持原文研读与智能伴读。`
    : '支持原文研读、白话译注与智能伴读。'
})
</script>

<template>
  <view class="fcard">
    <view class="cov">
      <!-- 古籍/电子书素材 2:3 装入 3:4 容器：scaleToFill 适度纵向变形保全整幅书封（书名不被裁切），优于 aspectFill 裁边 -->
      <image v-if="hasCover" class="cov-img" :src="item.cover" mode="scaleToFill" lazy-load />
      <view v-else class="cov-img flat-wrap">
        <flat-cover
          :title="item.title"
          :label="coverLabel"
          :footer="coverFooter"
          :cover-color="coverColor"
          title-size="40rpx"
        />
      </view>
    </view>
    <view class="body">
      <text class="summary">{{ summary }}</text>
      <view class="study-line">
        <text class="scope">原文精校 · 白话译注</text>
        <view class="hook">
          <view class="hook-dot" />
          <text class="hook-text">AI 伴读</text>
          <text class="hook-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; padding-top: 133.33%; overflow: hidden; background: #f6f1e7; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.flat-wrap { display: flex; align-items: stretch; justify-content: center; }
.flat-wrap > :deep(.flat-cover) { width: 100%; }
.body { padding: 18rpx 20rpx 20rpx; }
.summary {
  display: -webkit-box;
  min-height: 68rpx;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #5f584e;
  font-size: 24rpx;
  line-height: 1.45;
}
.study-line { margin-top: 14rpx; padding-top: 14rpx; border-top: 1rpx solid #eee8dc; display: flex; align-items: center; gap: 10rpx; }
.scope { flex: 1; min-width: 0; color: #9a9184; font-size: 21rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hook {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 7rpx 10rpx;
  border-radius: 999rpx;
  background: #f6f0e3;
  color: #7d5b1d;
}
.hook-dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: #c89c45; box-shadow: 0 0 0 5rpx rgba(200, 156, 69, .12); }
.hook-text, .hook-arrow { font-size: 21rpx; line-height: 1; }
.hook-arrow { margin-top: -1rpx; }
</style>
