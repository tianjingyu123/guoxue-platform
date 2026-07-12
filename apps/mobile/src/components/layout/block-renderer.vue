<script setup lang="ts">
/**
 * 平台微页面区块渲染器（P2·配置驱动展示）
 * 按 block.type 显式分发（小程序无 <component :is>）。当前安全支持：
 *   banner（图片/轮播·可跳转）/ notice（公告条）/ richtext（富文本/文字段）
 * 未知类型优雅跳过（不报错）。后续增量接入 feed/bigCard/rail/rank/kingkong 等首页原生块。
 * 数据来自 MarketingPage 已发布组件（config JSON）。
 */
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'
import type { LayoutBlock } from '@/lib/page-layout-data'

defineProps<{ blocks: LayoutBlock[] }>()

// banner 轮播当前页
const bannerIdx = ref<Record<string, number>>({})

function asArr(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : []
}
function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}
function bannerItems(b: LayoutBlock): Array<{ image: string; link: string; title: string }> {
  const imgs = asArr(b.config.images)
  if (imgs.length) {
    return imgs.map((it) => ({ image: str(it.image) || str(it.cover), link: str(it.link), title: str(it.title) }))
  }
  const single = str(b.config.image) || str(b.config.cover)
  return single ? [{ image: single, link: str(b.config.link), title: str(b.config.title) }] : []
}
function go(link: string) {
  if (link) navigateTo(link)
}
</script>

<template>
  <view class="blocks">
    <template v-for="b in blocks" :key="b.id">
      <!-- banner / 轮播 -->
      <view v-if="b.type === 'banner'" class="blk-banner">
        <view
          v-for="(it, i) in bannerItems(b)"
          :key="i"
          v-show="(bannerIdx[b.id] || 0) === i"
          class="blk-banner-slide"
          hover-class="blk-press"
          @tap="go(it.link)"
        >
          <image class="blk-banner-img" :src="it.image" mode="aspectFill" lazy-load />
          <view v-if="it.title" class="blk-banner-cap"><text class="blk-banner-cap-t">{{ it.title }}</text></view>
        </view>
        <view v-if="bannerItems(b).length > 1" class="blk-dots">
          <view
            v-for="(_, i) in bannerItems(b)"
            :key="i"
            class="blk-dot"
            :class="{ on: (bannerIdx[b.id] || 0) === i }"
            @tap="bannerIdx[b.id] = i"
          />
        </view>
      </view>

      <!-- notice 公告条 -->
      <view v-else-if="b.type === 'notice'" class="blk-notice" hover-class="blk-press" @tap="go(str(b.config.link))">
        <text class="blk-notice-t">{{ b.title || str(b.config.text) }}</text>
      </view>

      <!-- richtext 文字段 -->
      <view v-else-if="b.type === 'richtext'" class="blk-rich">
        <text v-if="b.title" class="blk-rich-title serif">{{ b.title }}</text>
        <text class="blk-rich-body">{{ str(b.config.text) || str(b.config.content) }}</text>
      </view>

      <!-- 未知类型：优雅跳过（预留 feed/bigCard/rail/rank/kingkong 增量接入） -->
    </template>
  </view>
</template>

<style scoped>
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.blk-press { opacity: 0.85; }
.blocks { display: flex; flex-direction: column; gap: 20rpx; }

.blk-banner { position: relative; margin: 0 24rpx; border-radius: 24rpx; overflow: hidden; }
.blk-banner-slide { position: relative; width: 100%; }
.blk-banner-img { width: 100%; height: 240rpx; display: block; background: #f2efea; }
.blk-banner-cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 40rpx 24rpx 16rpx; background: linear-gradient(to top, rgba(0,0,0,0.5), transparent); }
.blk-banner-cap-t { color: #fff; font-size: 28rpx; font-weight: 600; }
.blk-dots { position: absolute; right: 24rpx; bottom: 16rpx; display: flex; gap: 8rpx; }
.blk-dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: rgba(255,255,255,0.5); }
.blk-dot.on { width: 24rpx; border-radius: 6rpx; background: #fff; }

.blk-notice { margin: 0 24rpx; padding: 16rpx 24rpx; background: rgba(201,169,110,0.14); border-radius: 16rpx; }
.blk-notice-t { font-size: 24rpx; color: #8A6D3B; }

.blk-rich { margin: 0 24rpx; padding: 24rpx; background: #fff; border-radius: 24rpx; box-shadow: 0 2rpx 8rpx rgba(60,50,40,0.06); }
.blk-rich-title { display: block; font-size: 30rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 12rpx; }
.blk-rich-body { font-size: 26rpx; color: #6E6E73; line-height: 1.7; white-space: pre-wrap; }
</style>
