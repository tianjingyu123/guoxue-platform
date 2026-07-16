<script setup lang="ts">
/** 课程卡 - 从原型 components/cards/course-card.tsx 迁移(feed/rail/rank/list 四变体) */
import { computed } from 'vue'
import { navigateTo } from '@/utils/router'
import { track } from '@/composables/useTrack'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { type CourseCardData, type CardVariant, formatCount, courseHotKind } from '@/lib/card-utils'
import { formatPrice } from '@/utils/format'

const props = withDefaults(defineProps<{ data: CourseCardData; variant?: CardVariant; rank?: number }>(), {
  variant: 'feed',
})
const kind = computed(() => courseHotKind(props.data.tag))
const hotText = computed(() => (kind.value === 'hot' ? '热销' : kind.value === 'new' ? '新品' : ''))
const rankClass = computed(() => {
  const r = props.rank ?? 0
  if (r === 1) return 'rk-1'
  if (r === 2) return 'rk-2'
  if (r === 3) return 'rk-3'
  return 'rk-n'
})
function open() {
  track.click('course_card', { id: props.data.id })
  navigateTo(`/course/${props.data.id}`)
}
</script>

<template>
  <!-- ---------- 横滑小卡 rail ---------- -->
  <view v-if="variant === 'rail'" class="rail" hover-class="card-press" @tap="open">
    <view class="cover r-169">
      <smart-cover class="cover-img" :src="data.cover" :title="data.title" type="course" deco />
      <text class="type-badge">课程</text>
    </view>
    <view class="rail-body">
      <text class="rail-title">{{ data.title }}</text>
      <view class="price-row-sm">
        <text v-if="data.free" class="price-free-sm">免费</text>
        <view v-else class="price">
          <text class="price-cny">¥</text>
          <text class="price-num-sm">{{ formatPrice(data.price) }}</text>
        </view>
      </view>
    </view>
  </view>

  <!-- ---------- 榜单卡 rank ---------- -->
  <view v-else-if="variant === 'rank'" class="rank" hover-class="card-press" @tap="open">
    <text class="rank-badge" :class="rankClass">{{ rank }}</text>
    <view class="rank-cover">
      <smart-cover class="cover-img" :src="data.cover" :title="data.title" type="course" deco :deco-size="36" />
    </view>
    <view class="rank-info">
      <text class="rank-title">{{ data.title }}</text>
      <view class="rank-meta">
        <view v-if="data.free" class="price-free-sm">免费</view>
        <view v-else class="price">
          <text class="price-cny">¥</text>
          <text class="price-num-sm">{{ formatPrice(data.price) }}</text>
        </view>
        <text v-if="data.students" class="meta-soft">{{ formatCount(data.students) }}人学</text>
      </view>
    </view>
  </view>

  <!-- ---------- 横向列表卡 list ---------- -->
  <view v-else-if="variant === 'list'" class="list" hover-class="card-press" @tap="open">
    <view class="list-cover">
      <smart-cover class="cover-img" :src="data.cover" :title="data.title" type="course" deco :deco-size="44" />
    </view>
    <view class="list-body">
      <view>
        <text class="list-title">{{ data.title }}</text>
        <text v-if="data.teacher" class="meta-soft">{{ data.teacher }}</text>
      </view>
      <view class="list-foot">
        <view v-if="data.free" class="price-free-sm">免费</view>
        <view v-else class="price">
          <text class="price-cny">¥</text>
          <text class="price-num">{{ formatPrice(data.price) }}</text>
          <text v-if="data.originalPrice" class="price-orig">¥{{ formatPrice(data.originalPrice) }}</text>
        </view>
        <text v-if="data.students" class="meta-soft">{{ formatCount(data.students) }}人学</text>
      </view>
    </view>
  </view>

  <!-- ---------- 瀑布流竖卡 feed(默认) ---------- -->
  <view v-else class="card" hover-class="card-press" @tap="open">
    <view class="cover r-169">
      <smart-cover class="cover-img" :src="data.cover" :title="data.title" type="course" deco />
      <text class="type-badge">课程</text>
      <text v-if="kind" class="hot-badge" :class="kind === 'new' ? 'hot-new' : 'hot-red'">{{ hotText }}</text>
    </view>
    <view class="body">
      <text class="title">{{ data.title }}</text>
      <view class="price-row">
        <view v-if="data.free" class="price-free">免费</view>
        <view v-else class="price">
          <text class="price-cny">¥</text>
          <text class="price-num">{{ formatPrice(data.price) }}</text>
          <text v-if="data.originalPrice" class="price-orig">¥{{ formatPrice(data.originalPrice) }}</text>
        </view>
      </view>
      <view v-if="data.teacher" class="author">
        <smart-avatar :src="data.teacherAvatar" :name="data.teacher" class="avatar" />
        <text class="author-name">{{ data.teacher }}</text>
        <text v-if="data.students" class="author-trail">{{ formatCount(data.students) }}人学</text>
      </view>
    </view>

  </view>
</template>

<style scoped lang="scss">
.card { overflow: hidden; background: var(--surface); border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); margin-bottom: 12rpx; }
.card-press { transform: scale(0.98); }
.cover { position: relative; width: 100%; background: var(--surface-sunken); overflow: hidden; }
.r-34 { padding-bottom: 133.33%; }
.r-sq { padding-bottom: 100%; }
.r-169 { padding-bottom: 56.25%; } /* 课程素材原生 16:9（规范）：所见即所得不裁切 */
.cover-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.type-badge { position: absolute; top: 16rpx; left: 16rpx; z-index: 10; font-size: 20rpx; padding: 2rpx 14rpx; border-radius: 999rpx; color: rgba(255,255,255,0.95); font-weight: 500; background: rgba(0,0,0,0.45); }
.hot-badge { position: absolute; top: 16rpx; right: 16rpx; z-index: 10; font-size: 20rpx; padding: 2rpx 14rpx; border-radius: 999rpx; font-weight: 500; }
.hot-red { background: var(--brand); color: #fff; }
.hot-new { background: rgba(0,0,0,0.45); color: rgba(255,255,255,0.95); }
.body { padding: 18rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; font-weight: 500; color: var(--text-strong); line-height: 1.5; margin-bottom: 12rpx; }
.price-row { margin-bottom: 12rpx; }
.price { display: flex; align-items: baseline; }
.price-cny { color: var(--brand); font-weight: 700; font-size: 22rpx; }
.price-num { color: var(--brand); font-weight: 700; font-size: 32rpx; margin-left: 2rpx; }
.price-num-sm { color: var(--brand); font-weight: 700; font-size: 28rpx; margin-left: 2rpx; }
.price-orig { font-size: 22rpx; color: var(--text-soft); text-decoration: line-through; margin-left: 8rpx; }
.price-free { font-size: 26rpx; font-weight: 700; color: var(--success); }
.price-free-sm { font-size: 26rpx; font-weight: 700; color: var(--success); }
.author { display: flex; align-items: center; gap: 10rpx; }
.avatar { width: 32rpx; height: 32rpx; border-radius: 999rpx; overflow: hidden; background: rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; }
.avatar-ph { font-size: 16rpx; color: var(--text); }
.author-name { font-size: 22rpx; color: var(--text); flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.author-trail { font-size: 22rpx; color: var(--text-soft); flex-shrink: 0; }
.meta-soft { font-size: 22rpx; color: var(--text-soft); flex-shrink: 0; }

/* rail 横滑小卡 */
.rail { flex-shrink: 0; width: 360rpx; overflow: hidden; background: var(--surface); border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); }
.rail-body { padding: 16rpx; }
.rail-title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 26rpx; color: var(--text-strong); line-height: 1.35; margin-bottom: 8rpx; min-height: 72rpx; }
.price-row-sm { display: flex; align-items: baseline; }

/* rank 榜单卡 */
.rank { display: flex; align-items: center; gap: 20rpx; padding: 16rpx 0; }
.rank-badge { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 40rpx; height: 40rpx; border-radius: 12rpx; font-size: 22rpx; font-weight: 700; }
.rk-1 { background: #E8B339; color: #fff; }
.rk-2 { background: #B8B8C0; color: #fff; }
.rk-3 { background: #C9885B; color: #fff; }
.rk-n { background: var(--surface-sunken); color: var(--text-soft); }
.rank-cover { flex-shrink: 0; position: relative; width: 128rpx; height: 72rpx; border-radius: 12rpx; overflow: hidden; background: var(--surface-sunken); } /* 16:9 课程原生比例 */
.rank-info { flex: 1; min-width: 0; }
.rank-title { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-strong); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rank-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 6rpx; }

/* list 横向列表卡 */
.list { display: flex; gap: 24rpx; padding: 16rpx; background: var(--surface); border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); }
.list-cover { flex-shrink: 0; position: relative; width: 240rpx; height: 135rpx; border-radius: 16rpx; overflow: hidden; background: var(--surface-sunken); } /* 16:9 课程原生比例 */
.list-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 4rpx 0; }
.list-title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; font-weight: 500; color: var(--text-strong); line-height: 1.35; margin-bottom: 8rpx; }
.list-foot { display: flex; align-items: flex-end; justify-content: space-between; }
</style>
