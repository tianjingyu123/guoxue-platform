<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { formatPrice } from '@/utils/format'
import { navigateTo } from '@/utils/router'
import { saveTempReferrer } from '@/utils/referral'
import {
  stationPinnedPublicApi,
  type PublicPinnedItem,
  type PublicPinnedStation,
  type StationPinnedBoard,
} from '@/lib/station-pinned-public-data'

const props = withDefaults(defineProps<{
  board: StationPinnedBoard
  inset?: boolean
}>(), {
  inset: true,
})

const station = ref<PublicPinnedStation | null>(null)
const items = ref<PublicPinnedItem[]>([])
let requestSeq = 0

const typeLabel: Record<string, string> = {
  course: '课程',
  product: '好物',
  circle: '圈子',
  agent: '智能体',
  ebook: '古籍',
  article: '文章',
  video: '视频',
  live_room: '直播',
}

function coverType(item: PublicPinnedItem) {
  if (item.contentType === 'live_room') return 'live'
  if (item.contentType === 'article') return 'default'
  if (item.contentType === 'agent') return 'default'
  return item.contentType
}

function hrefOf(item: PublicPinnedItem): string {
  const routes: Record<string, string> = {
    course: `/course/${item.id}`,
    product: `/mall/product/${item.id}`,
    circle: `/circles/${item.id}`,
    agent: `/agent/${item.id}`,
    ebook: `/classics/${item.id}`,
    article: `/articles/${item.id}`,
    video: `/video/${item.id}`,
    live_room: `/live/${item.id}`,
  }
  return routes[item.contentType] || ''
}

async function load() {
  const seq = ++requestSeq
  try {
    const result = await stationPinnedPublicApi.getCurrent(props.board)
    if (seq !== requestSeq) return
    station.value = result.station
    items.value = Array.isArray(result.items) ? result.items.slice(0, 6) : []
  } catch {
    if (seq !== requestSeq) return
    station.value = null
    items.value = []
  }
}

function open(item: PublicPinnedItem) {
  const currentStation = station.value
  const href = hrefOf(item)
  if (!currentStation || !href) return

  // 可见主推内容来自哪个分站，本次临时推荐就归哪个分站；订单端仍以服务端规则最终校验。
  saveTempReferrer(currentStation.userId)
  void stationPinnedPublicApi.reportClick(currentStation.id)
  navigateTo(href)
}

watch(() => props.board, load)
onMounted(load)
</script>

<template>
  <view
    v-if="station && items.length"
    class="sp"
    :class="{ 'sp--inset': inset }"
  >
    <view class="sp-head">
      <view class="sp-seal">
        <text class="sp-seal-txt">
          荐
        </text>
      </view>
      <view class="sp-head-main">
        <text class="sp-title">
          {{ station.name }} · 掌柜严选
        </text>
        <text class="sp-sub">
          本分站为你挑选的内容
        </text>
      </view>
      <text class="sp-mark">
        站长主推
      </text>
    </view>

    <scroll-view
      class="sp-scroll"
      scroll-x
      :show-scrollbar="false"
    >
      <view class="sp-track">
        <view
          v-for="item in items"
          :key="`${item.contentType}:${item.id}`"
          class="sp-card"
          hover-class="sp-card--press"
          :hover-stay-time="120"
          @tap="open(item)"
        >
          <view class="sp-cover">
            <smart-cover
              class="sp-cover-img"
              :src="item.cover"
              :title="item.title"
              :type="coverType(item)"
              deco
              :deco-size="48"
            />
            <text class="sp-type">
              {{ typeLabel[item.contentType] || '精选' }}
            </text>
            <text
              v-if="item.liveStatus === 'live'"
              class="sp-live"
            >
              LIVE
            </text>
          </view>
          <text class="sp-name">
            {{ item.title }}
          </text>
          <text
            v-if="item.price && item.price > 0"
            class="sp-price"
          >
            ¥{{ formatPrice(item.price) }}
          </text>
          <text
            v-else
            class="sp-free"
          >
            去看看
          </text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.sp {
  padding: 24rpx 0 20rpx;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(250, 248, 245, 0), rgba(140, 37, 38, 0.035));
}
.sp-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 18rpx;
}
.sp--inset .sp-head { padding: 0 32rpx; }
.sp-seal {
  width: 54rpx;
  height: 54rpx;
  flex: 0 0 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx 12rpx 12rpx 4rpx;
  background: #9f2f2f;
  box-shadow: 0 6rpx 16rpx rgba(127, 29, 29, 0.18);
}
.sp-seal-txt { color: #fffaf3; font-family: serif; font-size: 30rpx; font-weight: 700; }
.sp-head-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2rpx; }
.sp-title { color: var(--text-strong, #2c2924); font-size: 30rpx; line-height: 1.25; font-weight: 700; }
.sp-sub { color: var(--text-muted, #8a8175); font-size: 21rpx; line-height: 1.3; }
.sp-mark {
  flex: 0 0 auto;
  padding: 6rpx 12rpx;
  border: 1rpx solid rgba(159, 47, 47, 0.22);
  border-radius: 999rpx;
  color: #8c2526;
  background: rgba(159, 47, 47, 0.06);
  font-size: 20rpx;
}
.sp-scroll { width: 100%; white-space: nowrap; }
.sp-track { display: inline-flex; gap: 18rpx; padding: 0 0 8rpx; }
.sp--inset .sp-track { padding-left: 32rpx; padding-right: 32rpx; }
.sp-card { width: 210rpx; display: inline-flex; flex-direction: column; vertical-align: top; white-space: normal; }
.sp-card--press { opacity: 0.84; transform: scale(0.985); }
.sp-cover {
  position: relative;
  width: 210rpx;
  height: 144rpx;
  overflow: hidden;
  border-radius: 18rpx;
  background: #eee8de;
  box-shadow: 0 8rpx 22rpx rgba(65, 48, 34, 0.09);
}
.sp-cover-img { position: absolute; top: 0; right: 0; bottom: 0; left: 0; width: 100%; height: 100%; }
.sp-type,
.sp-live {
  position: absolute;
  top: 10rpx;
  padding: 4rpx 9rpx;
  border-radius: 999rpx;
  color: #fff;
  font-size: 18rpx;
  line-height: 1.2;
  background: rgba(41, 36, 30, 0.72);
}
.sp-type { left: 10rpx; }
.sp-live { right: 10rpx; background: #c41e3a; font-weight: 700; letter-spacing: 1rpx; }
.sp-name {
  display: -webkit-box;
  margin-top: 12rpx;
  overflow: hidden;
  color: var(--text-strong, #2c2924);
  font-size: 25rpx;
  font-weight: 600;
  line-height: 1.38;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.sp-price { margin-top: 6rpx; color: #a1282f; font-size: 24rpx; font-weight: 700; }
.sp-free { margin-top: 6rpx; color: var(--text-muted, #8a8175); font-size: 21rpx; }

@media (prefers-reduced-motion: reduce) {
  .sp-card--press { transform: none; }
}
</style>
