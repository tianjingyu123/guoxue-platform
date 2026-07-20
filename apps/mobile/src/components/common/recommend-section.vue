<script setup lang="ts">
/**
 * 全平台统一「猜你喜欢 / 相关推荐」区块。
 * 病灶：商品/课程/圈子详情各缺推荐，且无统一推荐组件，各页各做。
 * 解药：统一区块，传 title + items（标准化卡片数据），空则不渲染。
 *
 * 用法：
 *   <recommend-section title="经常一起购买" :items="recItems" />
 *   item 形如 { id, cover, title, subtitle?, price?, tag?, href }
 */
import { navigateTo } from '@/utils/router'
import { formatPrice } from '@/utils/format'
import { getCurrentInstance, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { apiPostOptionalAuth } from '@/utils/request'

export interface RecommendItem {
  id: string | number
  cover: string
  title: string
  subtitle?: string
  /** 价格（元），>0 才显示 */
  price?: number
  /** 角标文案（如「热门」） */
  tag?: string
  /** 点击跳转路径（原型路径，走 navigateTo） */
  href: string
  /** 服务端生成的推荐批次，供真实曝光/点击归因。 */
  recommendId?: string
  itemType?: string
  position?: number
}

const props = withDefaults(defineProps<{
  title?: string
  items?: RecommendItem[]
}>(), {
  title: '猜你喜欢',
  items: () => [],
})


const instance = getCurrentInstance()
const reportedImpressions = new Set<string>()
let observer: any = null
let mounted = false

function trackingKey(item: RecommendItem) {
  return `${item.recommendId}:${item.itemType}:${item.id}`
}

function sendTracking(action: 'IMPRESSION' | 'CLICK', items: RecommendItem[]) {
  const groups = new Map<string, RecommendItem[]>()
  for (const item of items) {
    if (!item.recommendId || !item.itemType) continue
    const group = groups.get(item.recommendId) || []
    group.push(item)
    groups.set(item.recommendId, group)
  }
  for (const [recommendId, group] of groups) {
    void apiPostOptionalAuth('/recommend/log', {
      recommendId,
      interactions: group.map(item => ({
        itemId: String(item.id),
        itemType: item.itemType,
        position: item.position ?? 0,
        action,
      })),
    }).catch(() => undefined)
  }
}

function reportImpressions() {
  const pending = props.items.filter((item) => {
    if (!item.recommendId || !item.itemType) return false
    const key = trackingKey(item)
    if (reportedImpressions.has(key)) return false
    reportedImpressions.add(key)
    return true
  })
  if (pending.length) sendTracking('IMPRESSION', pending)
}

async function armImpressionObserver() {
  if (!mounted || !props.items.length) return
  // #ifdef H5
  await nextTick()
  observer?.disconnect()
  try {
    observer = uni.createIntersectionObserver(instance as any)
    observer.relativeToViewport({ top: 0, bottom: 0 }).observe('.rec', (res: any) => {
      if (res.intersectionRatio > 0) {
        reportImpressions()
        observer?.disconnect()
        observer = null
      }
    })
  } catch {
    reportImpressions()
  }
  // #endif
  // #ifndef H5
  reportImpressions()
  // #endif
}

watch(() => props.items.map(item => trackingKey(item)).join('|'), () => {
  if (mounted) void armImpressionObserver()
})
onMounted(() => {
  mounted = true
  void armImpressionObserver()
})
onUnmounted(() => {
  mounted = false
  observer?.disconnect()
  observer = null
})
function go(item: RecommendItem) {
  sendTracking('CLICK', [item])
  if (item.href) navigateTo(item.href)
}
</script>

<template>
  <view v-if="items.length" class="rec">
    <view class="rec__head">
      <view class="rec__bar" />
      <text class="rec__title">{{ title }}</text>
    </view>
    <view class="rec__grid">
      <view
        v-for="item in items"
        :key="item.id"
        class="rec__card btn-press"
        @tap="go(item)"
      >
        <view class="rec__cover">
          <image :src="item.cover" mode="aspectFill" class="rec__img" lazy-load />
          <text v-if="item.tag" class="rec__tag">{{ item.tag }}</text>
        </view>
        <text class="rec__name">{{ item.title }}</text>
        <text v-if="item.subtitle" class="rec__sub">{{ item.subtitle }}</text>
        <text v-if="item.price && item.price > 0" class="rec__price">¥{{ formatPrice(item.price) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.rec { padding: $space-lg $space-md; }
.rec__head {
  display: flex;
  align-items: center;
  gap: $space-xs;
  margin-bottom: $space-md;
}
.rec__bar {
  width: 6rpx;
  height: 30rpx;
  border-radius: $radius-full;
  background: var(--brand);
}
.rec__title {
  font-size: $font-lg;
  font-weight: 700;
  color: var(--text-strong);
}
.rec__grid {
  display: flex;
  flex-wrap: wrap;
  gap: $space-sm;
}
.rec__card {
  width: calc((100% - #{$space-sm} * 2) / 3);
}
.rec__cover {
  @include cover-3x4;
  margin-bottom: $space-xs;
}
.rec__img { display: block; }
.rec__tag {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  padding: 2rpx 10rpx;
  font-size: 18rpx;
  color: #fff;
  background: var(--brand);
  border-radius: $radius-sm;
}
.rec__name {
  font-size: $font-sm;
  color: var(--text-strong);
  @include line-clamp(2);
}
.rec__sub {
  font-size: $font-xs;
  color: var(--text-soft);
  @include ellipsis;
}
.rec__price {
  font-size: $font-md;
  font-weight: 700;
  color: var(--brand);
  @include price-font;
}
</style>
