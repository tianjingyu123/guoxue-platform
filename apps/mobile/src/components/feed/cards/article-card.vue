<script setup lang="ts">
/**
 * 文章卡 · 编辑部摘录式。
 * 首图统一按 16:9 安全裁切，正文摘要承担主要阅读吸引力；发布端仍可上传常见横竖图，
 * 不要求作者为了不同入口重复制作素材。无首图文章继续由公共流数据层拦截。
 */
import { computed } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { type FeedEnvelope, payloadNum } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const hasCover = computed(() => !!(props.item.cover && props.item.cover.trim()))
const readMinutes = computed(() => payloadNum(props.item, 'readMinutes'))
const hook = computed(() => (readMinutes.value ? `${readMinutes.value} 分钟` : '阅读全文'))
const excerpt = computed(() => (props.item.subtitle || '').trim())
const sectionLabel = computed(() => {
  const reason = (props.item.reason || '').trim()
  return reason && reason !== '热门文章' ? reason : '编辑精选'
})
</script>

<template>
  <view v-if="hasCover" class="fcard article-card">
    <view class="cov">
      <smart-cover :src="item.cover" :title="item.title" type="default" deco class="cov-img" />
      <view class="image-shade" />
      <text class="section-label">{{ sectionLabel }}</text>
    </view>
    <view class="body">
      <view class="editorial-mark" />
      <text class="title serif">{{ item.title }}</text>
      <text v-if="excerpt" class="excerpt">{{ excerpt }}</text>
      <view class="meta">
        <smart-avatar :src="item.author?.avatar" :name="item.author?.name || ''" class="ava" />
        <text class="name">{{ item.author?.name || '平台作者' }}</text>
        <view class="read-entry">
          <text class="hook">{{ hook }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>
  </view>

</template>

<style scoped>
.fcard {
  position: relative;
  overflow: hidden;
  background: #fff;
  border: 2rpx solid rgba(82, 61, 39, .08);
  border-radius: 22rpx;
  box-shadow: 0 8rpx 24rpx rgba(66, 48, 29, .07);
}
.cov { position: relative; width: 100%; padding-top: 56.25%; overflow: hidden; background: #eee9df; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.image-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(24, 20, 16, .04) 42%, rgba(24, 20, 16, .42) 100%);
}
.section-label {
  position: absolute;
  left: 16rpx;
  bottom: 14rpx;
  padding: 5rpx 10rpx;
  border: 1rpx solid rgba(255, 255, 255, .42);
  border-radius: 5rpx;
  color: rgba(255, 255, 255, .96);
  font-size: 18rpx;
  letter-spacing: 1rpx;
  background: rgba(36, 29, 23, .34);
}
.body { position: relative; padding: 20rpx 20rpx 22rpx 26rpx; }
.editorial-mark {
  position: absolute;
  left: 14rpx;
  top: 24rpx;
  width: 4rpx;
  height: 42rpx;
  border-radius: 4rpx;
  background: #c41e3a;
}
.serif { font-family: var(--font-serif, 'STSong', serif); }
.title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #28231f;
  font-size: 29rpx;
  font-weight: 700;
  line-height: 1.45;
}
.excerpt {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 12rpx;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  color: #746b61;
  font-size: 22rpx;
  line-height: 1.65;
}
.meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 18rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid #eee7dc;
}
.ava { width: 36rpx; height: 36rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; background: rgba(150,150,150,.18); display: flex; align-items: center; justify-content: center; }
.name { flex: 1; min-width: 0; font-size: 22rpx; color: #9a9184; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.read-entry { display: flex; flex-shrink: 0; align-items: center; gap: 4rpx; }
.hook { font-size: 21rpx; font-weight: 600; color: #8a6420; }
.arrow { color: #b28b49; font-size: 27rpx; line-height: 1; }
</style>
