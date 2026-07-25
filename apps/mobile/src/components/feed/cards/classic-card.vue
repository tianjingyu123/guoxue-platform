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
const metaLine = computed(() => (
  [dynasty.value, author.value, category.value].filter(Boolean).join(' · ') || '经典古籍'
))
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
      <text class="title serif">{{ item.title }}</text>
      <view class="meta">
        <text class="name">{{ metaLine }}</text>
        <text class="hook">AI 智能伴读</text>
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
.serif { font-family: var(--font-serif, 'STSong', serif); }
.body { padding: 18rpx 20rpx 22rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c; }
.meta { margin-top: 16rpx; display: flex; align-items: center; gap: 10rpx; }
.name { flex: 1; min-width: 0; font-size: 22rpx; color: #9a9184; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hook { flex-shrink: 0; margin-left: auto; font-size: 22rpx; color: #8a6420; }
</style>
