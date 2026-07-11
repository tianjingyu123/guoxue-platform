<script setup lang="ts">
/**
 * 排盘钩子卡 · 运营特制图 4:3 · 底部渐变衬底叠干支/钩子文案 · 「工具」金标 · 测一测›
 * 全图卡无标题区（战略转化位）。payload: { hint, action }
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { type FeedEnvelope, ratioPadding, payloadStr } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const pad = computed(() => ratioPadding(props.item.coverRatio || '4:3'))
const hint = computed(() => payloadStr(props.item, 'hint') || props.item.subtitle || '')
const action = computed(() => payloadStr(props.item, 'action') || (props.item.metric ? String(props.item.metric.value) : '测一测'))
</script>

<template>
  <view class="fcard">
    <view class="cov" :style="{ paddingTop: pad }">
      <smart-cover :src="item.cover" :title="item.title" type="default" class="cov-img" />
      <text class="seal gold">工具</text>
      <!-- 底部渐变衬底 + 当日干支 + 钩子文案 -->
      <view class="ov">
        <text class="ov-title serif">{{ item.title }}</text>
        <view class="ov-line">
          <text v-if="hint" class="ov-hint">{{ hint }}</text>
          <view class="ov-cta"><text class="cta-t">{{ action }}</text><app-icon name="chevron-right" :size="20" color="#ffffff" /></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; overflow: hidden; background: #f2efea; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.seal { position: absolute; top: 16rpx; left: 16rpx; font-size: 20rpx; color: #fff; font-weight: 500; padding: 4rpx 14rpx; border-radius: 999rpx; z-index: 2; }
.seal.gold { background: rgba(201,169,110,.95); }
.ov {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 32rpx 20rpx 20rpx;
  background: linear-gradient(to top, rgba(90,10,20,.62), rgba(90,10,20,0));
}
.ov-title { display: block; font-family: var(--font-serif, 'STSong', serif); color: #fff; font-size: 32rpx; font-weight: 700; }
.serif { font-family: var(--font-serif, 'STSong', serif); }
.ov-line { margin-top: 8rpx; display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.ov-hint { flex: 1; min-width: 0; font-size: 22rpx; color: rgba(255,255,255,.85); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.ov-cta { flex-shrink: 0; display: flex; align-items: center; gap: 2rpx; }
.cta-t { font-size: 22rpx; color: #fff; font-weight: 500; }
</style>
