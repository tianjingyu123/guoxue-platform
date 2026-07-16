<script setup lang="ts">
/**
 * 排盘钩子卡 · 统一 3:4（运营特制图 cover 填满）· 左上「占」朱红印章 · 底部渐变叠标题/干支 + 钩子
 * 全图卡（战略转化位）。去数字化：hook = payload.action || "测一测 ›"
 * payload: { hint, action }
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { type FeedEnvelope, payloadStr } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const hint = computed(() => payloadStr(props.item, 'hint') || props.item.subtitle || '')
const action = computed(() => payloadStr(props.item, 'action') || '测一测')
</script>

<template>
  <view class="fcard">
    <view class="cov">
      <smart-cover :src="item.cover" :title="item.title" type="paipan" deco class="cov-img" />
      <text class="seal serif">占</text>
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
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; padding-top: 133.33%; overflow: hidden; background: #f6f1e7; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.seal {
  position: absolute; top: 16rpx; left: 16rpx; width: 44rpx; height: 44rpx; border-radius: 12rpx;
  background: rgba(196,30,58,.92); color: #fff; font-size: 24rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center; z-index: 3;
  font-family: var(--font-serif, 'STSong', serif);
}
.serif { font-family: var(--font-serif, 'STSong', serif); }
.ov {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
  padding: 40rpx 20rpx 22rpx;
  background: linear-gradient(to top, rgba(90,10,20,.62), rgba(90,10,20,0));
}
.ov-title { display: block; font-family: var(--font-serif, 'STSong', serif); color: #fff; font-size: 32rpx; font-weight: 700; }
.ov-line { margin-top: 10rpx; display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.ov-hint { flex: 1; min-width: 0; font-size: 22rpx; color: rgba(255,255,255,.85); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.ov-cta { flex-shrink: 0; display: flex; align-items: center; gap: 2rpx; }
.cta-t { font-size: 22rpx; color: #fff; font-weight: 500; }
</style>
