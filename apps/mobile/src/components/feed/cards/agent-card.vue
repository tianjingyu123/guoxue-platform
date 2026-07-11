<script setup lang="ts">
/**
 * 智能体卡 · 宣纸模板卡（定稿 9a/9b）· 无封面图·内容自适应高度（脱离四档定比）
 * 槽位：头像34px圆（缺则首字墨底圆章）+ 名称 + 「AI·领域」金描边复合标 + 气泡文案 + CTA
 * payload: { question, action }；subtitle 作为领域标（如“命理/易学/诗词”）
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { type FeedEnvelope, payloadStr } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const avatar = computed(() => props.item.author?.avatar || '')
const hasAvatar = computed(() => !!avatar.value.trim())
const name = computed(() => props.item.author?.name || props.item.title || 'AI 学友')
const firstChar = computed(() => name.value.charAt(0))
// 领域标：subtitle（如“命理”），拼成「AI·领域」
const domain = computed(() => props.item.subtitle || '')
const bubble = computed(() => payloadStr(props.item, 'question') || props.item.title || '')
const action = computed(() => payloadStr(props.item, 'action') || (props.item.metric ? String(props.item.metric.value) : '问一问'))
</script>

<template>
  <view class="fcard agent">
    <view class="head">
      <image v-if="hasAvatar" class="ava" :src="avatar" mode="aspectFill" />
      <view v-else class="stamp serif"><text class="stamp-t">{{ firstChar }}</text></view>
      <text class="nm">{{ name }}</text>
      <text class="tag">AI{{ domain ? '·' + domain : '' }}</text>
    </view>
    <view class="bubble"><text class="bubble-t">{{ bubble }}</text></view>
    <view class="go"><text class="go-t">{{ action }}</text><app-icon name="chevron-right" :size="20" color="#c41e3a" /></view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(60,50,40,.06); }
.agent { padding-bottom: 10rpx; }
.head { display: flex; align-items: center; gap: 12rpx; padding: 24rpx 24rpx 0; }
.ava { width: 68rpx; height: 68rpx; border-radius: 999rpx; flex-shrink: 0; }
.stamp {
  width: 68rpx; height: 68rpx; border-radius: 999rpx; flex-shrink: 0;
  background: #2b2620; display: flex; align-items: center; justify-content: center;
}
.serif { font-family: var(--font-serif, 'STSong', serif); }
.stamp-t { font-size: 30rpx; font-weight: 700; color: #fff; font-family: var(--font-serif, 'STSong', serif); }
.nm { flex: 1; min-width: 0; font-size: 28rpx; font-weight: 700; color: #2c2c2c; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tag {
  flex-shrink: 0; font-size: 20rpx; color: #c9a96e;
  border: 2rpx solid #c9a96e; border-radius: 8rpx; padding: 2rpx 10rpx;
}
.bubble {
  margin: 20rpx 20rpx 0; background: #f6f1e7; border-radius: 16rpx; padding: 20rpx 24rpx;
}
.bubble-t { font-size: 26rpx; line-height: 1.6; color: #4a4438; }
.go { display: flex; align-items: center; gap: 4rpx; padding: 16rpx 24rpx 8rpx; }
.go-t { font-size: 24rpx; font-weight: 500; color: #c41e3a; }
</style>
