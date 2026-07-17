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
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
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
// 金刚区图标项：config.items = [{ icon, label, color, link }]
function kkItems(b: LayoutBlock): Array<{ icon: string; label: string; color: string; link: string }> {
  return asArr(b.config.items).map((it) => ({
    icon: str(it.icon) || 'grid', label: str(it.label), color: str(it.color) || '#C41E3A', link: str(it.link),
  }))
}
// 横滑专栏卡：config.items = [{ cover, title, sub, price, link }]
function railItems(b: LayoutBlock): Array<{ cover: string; title: string; sub: string; price: string; link: string }> {
  return asArr(b.config.items).map((it) => ({
    cover: str(it.cover) || str(it.image), title: str(it.title), sub: str(it.sub) || str(it.subtitle),
    price: str(it.price), link: str(it.link),
  }))
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
// banner swiper 滑动/自动轮播 → 同步自绘指示点（与点击指示点设 current 构成双向同步）
function onBannerChange(id: string, e: { detail?: { current?: number } }) {
  bannerIdx.value[id] = e?.detail?.current ?? 0
}
</script>

<template>
  <view class="blocks">
    <template v-for="b in blocks" :key="b.id">
      <!-- banner / 轮播 -->
      <view v-if="b.type === 'banner'" class="blk-banner">
        <!-- 多图：uni 原生 swiper（自动轮播 4s + 循环 + 手势滑动）。原实现是 v-show 静态切换：
             无 autoplay 无手势，只能点 10rpx 小指示点，运营配的第 2 张起用户几乎看不到。
             指示点自绘保留（隐藏原生 indicator-dots），外热区 padding 撑大可点，与 current 双向同步。 -->
        <template v-if="bannerItems(b).length > 1">
          <swiper
            class="blk-banner-swiper"
            :autoplay="true"
            :interval="4000"
            circular
            :indicator-dots="false"
            :current="bannerIdx[b.id] || 0"
            @change="onBannerChange(b.id, $event)"
          >
            <swiper-item v-for="(it, i) in bannerItems(b)" :key="i">
              <view class="blk-banner-slide" hover-class="blk-press" @tap="go(it.link)">
                <image class="blk-banner-img" :src="it.image" mode="aspectFill" lazy-load />
                <view v-if="it.title" class="blk-banner-cap"><text class="blk-banner-cap-t">{{ it.title }}</text></view>
              </view>
            </swiper-item>
          </swiper>
          <view class="blk-dots">
            <view
              v-for="(_, i) in bannerItems(b)"
              :key="i"
              class="blk-dot-hit"
              @tap="bannerIdx[b.id] = i"
            >
              <view class="blk-dot" :class="{ on: (bannerIdx[b.id] || 0) === i }" />
            </view>
          </view>
        </template>
        <!-- 单图：不套 swiper，保持原静态展示 -->
        <view
          v-else-if="bannerItems(b).length === 1"
          class="blk-banner-slide"
          hover-class="blk-press"
          @tap="go(bannerItems(b)[0].link)"
        >
          <image class="blk-banner-img" :src="bannerItems(b)[0].image" mode="aspectFill" lazy-load />
          <view v-if="bannerItems(b)[0].title" class="blk-banner-cap">
            <text class="blk-banner-cap-t">{{ bannerItems(b)[0].title }}</text>
          </view>
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

      <!-- kingkong 金刚区（图标导航·config.items 运营配置）-->
      <view v-else-if="b.type === 'kingkong'" class="blk-kk">
        <view v-if="b.title" class="blk-sec-head"><text class="blk-sec-title serif">{{ b.title }}</text></view>
        <view class="blk-kk-grid">
          <view v-for="(it, i) in kkItems(b)" :key="i" class="blk-kk-item" hover-class="blk-press" @tap="go(it.link)">
            <view class="blk-kk-ico" :style="{ background: it.color + '1a' }">
              <app-icon :name="it.icon" :size="42" :color="it.color" />
            </view>
            <text class="blk-kk-label">{{ it.label }}</text>
          </view>
        </view>
      </view>

      <!-- rail 横滑专栏（config.title + config.items 运营手选卡）-->
      <view v-else-if="b.type === 'rail'" class="blk-rail-wrap">
        <view v-if="b.title" class="blk-sec-head">
          <text class="blk-sec-title serif">{{ b.title }}</text>
          <text v-if="str(b.config.moreLink)" class="blk-sec-more" @tap="go(str(b.config.moreLink))">更多 ›</text>
        </view>
        <scroll-view class="blk-rail" scroll-x :show-scrollbar="false">
          <view class="blk-rail-inner">
            <view v-for="(it, i) in railItems(b)" :key="i" class="blk-rail-card" hover-class="blk-press" @tap="go(it.link)">
              <view class="blk-rail-cov">
                <smart-cover :src="it.cover" :title="it.title" type="course" class="blk-rail-img" />
              </view>
              <text class="blk-rail-title">{{ it.title }}</text>
              <view class="blk-rail-meta">
                <text v-if="it.sub" class="blk-rail-sub">{{ it.sub }}</text>
                <text v-if="it.price" class="blk-rail-price">¥{{ it.price }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- bigCard 2:1 大卡（运营重点位·config: cover/title/subtitle/price/tag/link）-->
      <view v-else-if="b.type === 'bigCard'" class="blk-big-wrap">
        <view class="blk-big" hover-class="blk-press" @tap="go(str(b.config.link))">
          <view class="blk-big-ratio">
            <image class="blk-big-img" :src="str(b.config.cover) || str(b.config.image)" mode="aspectFill" lazy-load />
          </view>
          <view class="blk-big-shade" />
          <text v-if="str(b.config.tag)" class="blk-big-tag">{{ str(b.config.tag) }}</text>
          <view class="blk-big-txt">
            <text class="blk-big-title serif">{{ b.title || str(b.config.title) }}</text>
            <view class="blk-big-row">
              <text v-if="str(b.config.price)" class="blk-big-price">¥{{ str(b.config.price) }}</text>
              <text v-if="str(b.config.subtitle)" class="blk-big-sub">{{ str(b.config.subtitle) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 未知类型：优雅跳过（feed 双列瀑布流由首页原生承载） -->
    </template>
  </view>
</template>

<style scoped>
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.blk-press { opacity: 0.85; }
.blocks { display: flex; flex-direction: column; gap: 20rpx; }

.blk-banner { position: relative; margin: 0 24rpx; border-radius: 24rpx; overflow: hidden; }
/* swiper 是原生固定高容器，高度与单图 banner 图一致 */
.blk-banner-swiper { width: 100%; height: 240rpx; }
.blk-banner-slide { position: relative; width: 100%; height: 100%; }
.blk-banner-img { width: 100%; height: 240rpx; display: block; background: #f2efea; }
.blk-banner-cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 40rpx 24rpx 16rpx; background: linear-gradient(to top, rgba(0,0,0,0.5), transparent); }
.blk-banner-cap-t { color: #fff; font-size: 28rpx; font-weight: 600; }
/* 指示点：本体 12rpx，外层 .blk-dot-hit 用 padding 撑出 ≥40rpx 热区（原 10rpx 裸点手指点不中） */
.blk-dots { position: absolute; right: 10rpx; bottom: 2rpx; display: flex; }
.blk-dot-hit { padding: 16rpx 14rpx; display: flex; align-items: center; justify-content: center; }
.blk-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: rgba(255,255,255,0.5); }
.blk-dot.on { width: 24rpx; border-radius: 6rpx; background: #fff; }

.blk-notice { margin: 0 24rpx; padding: 16rpx 24rpx; background: rgba(201,169,110,0.14); border-radius: 16rpx; }
.blk-notice-t { font-size: 24rpx; color: #8A6D3B; }

.blk-rich { margin: 0 24rpx; padding: 24rpx; background: #fff; border-radius: 24rpx; box-shadow: 0 2rpx 8rpx rgba(60,50,40,0.06); }
.blk-rich-title { display: block; font-size: 30rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 12rpx; }
.blk-rich-body { font-size: 26rpx; color: #6E6E73; line-height: 1.7; white-space: pre-wrap; }

/* 区块通用节头 */
.blk-sec-head { display: flex; align-items: center; justify-content: space-between; padding: 4rpx 24rpx 12rpx; }
.blk-sec-title { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.blk-sec-more { font-size: 24rpx; color: #999; }

/* 金刚区 */
.blk-kk { }
.blk-kk-grid { display: flex; flex-wrap: wrap; background: #fff; border-radius: 28rpx; margin: 0 24rpx; padding: 24rpx 8rpx 8rpx; box-shadow: 0 2rpx 8rpx rgba(60,50,40,0.06); }
.blk-kk-item { width: 20%; display: flex; flex-direction: column; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.blk-kk-ico { width: 88rpx; height: 88rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.blk-kk-label { font-size: 24rpx; color: #2C2C2C; }

/* 横滑专栏 */
.blk-rail { white-space: nowrap; }
.blk-rail-inner { display: inline-flex; gap: 20rpx; padding: 0 24rpx 4rpx; }
.blk-rail-card { flex-shrink: 0; width: 240rpx; background: #fff; border-radius: 20rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(60,50,40,0.06); }
.blk-rail-cov { position: relative; width: 100%; padding-top: 75%; }
.blk-rail-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.blk-rail-title { display: block; padding: 12rpx 16rpx 0; font-size: 26rpx; font-weight: 500; color: #2C2C2C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.blk-rail-meta { display: flex; align-items: center; justify-content: space-between; padding: 6rpx 16rpx 16rpx; }
.blk-rail-sub { font-size: 22rpx; color: #999; }
.blk-rail-price { font-size: 28rpx; font-weight: 700; color: #C41E3A; margin-left: auto; }

/* 2:1 大卡 */
.blk-big-wrap { padding: 0 24rpx; }
.blk-big { position: relative; border-radius: 28rpx; overflow: hidden; box-shadow: 0 4rpx 16rpx rgba(60,50,40,0.1); }
.blk-big-ratio { position: relative; width: 100%; padding-top: 50%; }
.blk-big-img { position: absolute; inset: 0; width: 100%; height: 100%; background: #f2efea; }
.blk-big-shade { position: absolute; inset: 0; background: linear-gradient(to top, rgba(20,15,10,0.72), rgba(20,15,10,0.1) 60%, transparent); }
.blk-big-tag { position: absolute; top: 20rpx; left: 20rpx; font-size: 22rpx; font-weight: 700; color: #fff; background: rgba(180,140,70,0.95); border-radius: 10rpx; padding: 4rpx 16rpx; }
.blk-big-txt { position: absolute; left: 24rpx; right: 24rpx; bottom: 24rpx; }
.blk-big-title { display: block; font-size: 36rpx; font-weight: 700; color: #fff; line-height: 1.3; }
.blk-big-row { display: flex; align-items: baseline; gap: 12rpx; margin-top: 8rpx; }
.blk-big-price { font-size: 34rpx; font-weight: 700; color: #FFD98A; }
.blk-big-sub { font-size: 24rpx; color: rgba(255,255,255,0.9); }
</style>
