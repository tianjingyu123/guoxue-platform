<script setup lang="ts">
/** 商品评价页 - 从原型 app/mall/product/[id]/reviews/page.tsx 1:1 迁移 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { shopApi, reviewTags, reviewSortOptions } from '@/lib/shop-data'

const selectedTag = ref('all')
const sortBy = ref('default')
const showSortMenu = ref(false)
const likedReviews = ref<number[]>([])
const previewImage = ref<{ reviewId: number; index: number } | null>(null)
const fullReviews = ref<any[]>([])
const reviewSummary = ref({ goodRatePercent: 0, rating: 0, total: 0 })

onMounted(async () => {
  try {
    const res = await shopApi.getShopReviews()
    if (res.stats) {
      const goodCount = (res.stats.distribution || [])
        .filter((d: any) => d.stars >= 4)
        .reduce((a: number, b: any) => a + b.count, 0)
      reviewSummary.value = {
        goodRatePercent: res.stats.total > 0 ? Math.round(goodCount / res.stats.total * 100) : 0,
        rating: res.stats.average || 0,
        total: res.stats.total || 0,
      }
    }
    fullReviews.value = (res.items || []).map((r: any) => ({
      id: r.id,
      user: { name: r.userName || r.user?.name || '', avatar: r.avatar || r.user?.avatar || '', level: r.userLevel || r.user?.level || '' },
      rating: r.rating,
      content: r.content,
      images: r.images || [],
      spec: r.skuName || r.spec || '',
      time: r.createdAt || r.time || '',
      likes: r.likes,
      tags: r.tags || [],
      reply: r.reply || null,
    }))
  } catch { /* keep empty */ }
})

const sortLabel = computed(() => reviewSortOptions.find((o) => o.id === sortBy.value)?.label)
const sortedReviews = computed(() => {
  const list = fullReviews.value.filter((r) => selectedTag.value === 'all' || r.tags.includes(selectedTag.value))
  return [...list].sort((a, b) => {
    switch (sortBy.value) {
      case 'newest': return new Date(b.time).getTime() - new Date(a.time).getTime()
      case 'withImages': return b.images.length - a.images.length
      case 'mostLikes': return b.likes - a.likes
      default: return 0
    }
  })
})
const previewReview = computed(() => fullReviews.value.find((r) => r.id === previewImage.value?.reviewId) || null)

function pickSort(id: string) { sortBy.value = id; showSortMenu.value = false }
function toggleLike(id: number) {
  likedReviews.value = likedReviews.value.includes(id)
    ? likedReviews.value.filter((x) => x !== id)
    : [...likedReviews.value, id]
}
function openPreview(reviewId: number, index: number) { previewImage.value = { reviewId, index } }
function setPreviewIndex(index: number) { if (previewImage.value) previewImage.value = { ...previewImage.value, index } }
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <view
          class="back-btn"
          @tap="goBack"
        >
          <AppIcon
            name="arrow-left"
            :size="40"
            color="var(--text-strong)"
          />
        </view>
        <text class="header-title">
          商品评价
        </text>
        <view class="header-spacer" />
      </view>
    </view>

    <!-- 评价总览 -->
    <view class="overview">
      <view class="ov-rate">
        <text class="ov-percent">
          {{ reviewSummary.goodRatePercent }}%
        </text>
        <text class="ov-label">
          好评率
        </text>
      </view>
      <view class="ov-detail">
        <view class="ov-stars">
          <AppIcon
            v-for="i in 5"
            :key="i"
            name="star"
            :size="28"
            color="var(--gold, #c9a96e)"
            fill
          />
          <text class="ov-score">
            {{ reviewSummary.rating }}
          </text>
        </view>
        <text class="ov-total">
          共 {{ reviewSummary.total }} 条评价
        </text>
      </view>
    </view>

    <!-- 标签筛选 -->
    <scroll-view
      class="tag-scroll"
      scroll-x
    >
      <view class="tag-row">
        <view
          v-for="tag in reviewTags"
          :key="tag.id"
          class="tag"
          :class="{ 'tag-on': selectedTag === tag.id }"
          @tap="selectedTag = tag.id"
        >
          <text
            class="tag-text"
            :class="{ 'tag-text-on': selectedTag === tag.id }"
          >
            {{ tag.label }}({{ tag.count }})
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- 排序栏 -->
    <view class="sort-bar">
      <text class="sort-count">
        共 {{ sortedReviews.length }} 条评价
      </text>
      <view class="sort-dropdown">
        <view
          class="sort-trigger"
          @tap="showSortMenu = !showSortMenu"
        >
          <text class="sort-text">
            {{ sortLabel }}
          </text>
          <view
            class="sort-arrow"
            :class="{ 'sort-arrow-up': showSortMenu }"
          >
            <AppIcon
              name="chevron-down"
              :size="28"
              color="var(--text-strong)"
            />
          </view>
        </view>
        <view
          v-if="showSortMenu"
          class="sort-mask"
          @tap="showSortMenu = false"
        />
        <view
          v-if="showSortMenu"
          class="sort-menu"
        >
          <view
            v-for="opt in reviewSortOptions"
            :key="opt.id"
            class="sort-opt"
            :class="{ 'sort-opt-on': sortBy === opt.id }"
            @tap="pickSort(opt.id)"
          >
            <text
              class="sort-opt-text"
              :class="{ 'sort-opt-text-on': sortBy === opt.id }"
            >
              {{ opt.label }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 评价列表 -->
    <view class="review-list">
      <view
        v-for="r in sortedReviews"
        :key="r.id"
        class="review-item"
      >
        <view class="rv-head">
          <image
            class="rv-avatar"
            :src="r.user.avatar"
            mode="aspectFill"
          />
          <view class="rv-info">
            <view class="rv-name-row">
              <text class="rv-name">
                {{ r.user.name }}
              </text>
              <text
                v-if="r.user.level"
                class="rv-level"
              >
                {{ r.user.level }}
              </text>
            </view>
            <view class="rv-sub">
              <view class="rv-stars">
                <AppIcon
                  v-for="i in 5"
                  :key="i"
                  name="star"
                  :size="24"
                  :color="i <= r.rating ? 'var(--gold, #c9a96e)' : '#d4d4d4'"
                  :fill="i <= r.rating"
                />
              </view>
              <text class="rv-time">
                {{ r.time }}
              </text>
            </view>
          </view>
        </view>
        <text class="rv-content">
          {{ r.content }}
        </text>
        <scroll-view
          v-if="r.images.length"
          class="rv-imgs"
          scroll-x
        >
          <view class="rv-imgs-row">
            <image
              v-for="(img, i) in r.images"
              :key="i"
              class="rv-img"
              :src="img"
              mode="aspectFill"
              @tap="openPreview(r.id, i)"
            />
          </view>
        </scroll-view>
        <text class="rv-spec">
          购买规格：{{ r.spec }}
        </text>
        <view
          v-if="r.reply"
          class="rv-reply"
        >
          <view class="rv-reply-head">
            <text class="rv-reply-badge">
              商家回复
            </text>
            <text class="rv-reply-time">
              {{ r.reply.time }}
            </text>
          </view>
          <text class="rv-reply-text">
            {{ r.reply.content }}
          </text>
        </view>
        <view class="rv-foot">
          <view
            class="rv-like"
            :class="{ 'rv-like-on': likedReviews.includes(r.id) }"
            @tap="toggleLike(r.id)"
          >
            <AppIcon
              name="thumbs-up"
              :size="26"
              :color="likedReviews.includes(r.id) ? 'var(--brand)' : 'var(--text-soft)'"
              :fill="likedReviews.includes(r.id)"
            />
            <text
              class="rv-like-num"
              :class="{ 'rv-like-num-on': likedReviews.includes(r.id) }"
            >
              {{ r.likes + (likedReviews.includes(r.id) ? 1 : 0) }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <view
      v-if="!sortedReviews.length"
      class="empty"
    >
      <view class="empty-icon">
        <AppIcon
          name="star"
          :size="56"
          color="var(--text-soft)"
        />
      </view>
      <text class="empty-text">
        暂无相关评价
      </text>
    </view>

    <!-- 图片预览 -->
    <view
      v-if="previewImage"
      class="preview"
    >
      <view
        class="preview-close"
        @tap="previewImage = null"
      >
        <AppIcon
          name="x"
          :size="44"
          color="#fff"
        />
      </view>
      <view class="preview-body">
        <image
          v-if="previewReview"
          class="preview-img"
          :src="previewReview.images[previewImage.index]"
          mode="aspectFit"
        />
      </view>
      <view
        v-if="previewReview && previewReview.images.length > 1"
        class="preview-dots"
      >
        <view
          v-for="(_, i) in previewReview.images"
          :key="i"
          class="preview-dot"
          :class="{ 'preview-dot-on': previewImage.index === i }"
          @tap="setPreviewIndex(i)"
        />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg, #f5f5f5); padding-bottom: 28rpx; }
/* 顶部 */
.header { position: sticky; top: 0; z-index: 40; background: var(--surface); border-bottom: 1rpx solid var(--border, #eee); padding-top: var(--status-bar-height, 0px); }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 0 28rpx; height: 88rpx; }
.back-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.header-title { font-size: 30rpx; font-weight: 600; color: var(--text-strong); }
.header-spacer { width: 56rpx; }
/* 总览 */
.overview { display: flex; align-items: center; gap: 48rpx; padding: 36rpx 28rpx; background: linear-gradient(135deg, rgba(201,169,110,0.1), var(--surface) 50%, rgba(196,30,58,0.05)); }
.ov-rate { text-align: center; }
.ov-percent { font-size: 60rpx; font-weight: 700; color: var(--brand); }
.ov-label { display: block; font-size: 22rpx; color: var(--text-soft); margin-top: 6rpx; }
.ov-detail { flex: 1; }
.ov-stars { display: flex; align-items: center; gap: 4rpx; margin-bottom: 12rpx; }
.ov-score { font-size: 26rpx; color: var(--text-strong); margin-left: 8rpx; }
.ov-total { font-size: 26rpx; color: var(--text-soft); }
/* 标签 */
.tag-scroll { white-space: nowrap; background: var(--surface); padding: 20rpx 28rpx; border-bottom: 1rpx solid var(--border, #eee); }
.tag-row { display: inline-flex; gap: 16rpx; }
.tag { padding: 10rpx 24rpx; border-radius: 999rpx; background: var(--surface-sunken); }
.tag-on { background: var(--brand); }
.tag-text { font-size: 22rpx; font-weight: 500; color: var(--text-strong); }
.tag-text-on { color: #fff; }
/* 排序 */
.sort-bar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 28rpx; background: var(--surface); border-bottom: 1rpx solid var(--border, #eee); }
.sort-count { font-size: 26rpx; color: var(--text-soft); }
.sort-dropdown { position: relative; }
.sort-trigger { display: flex; align-items: center; gap: 6rpx; }
.sort-text { font-size: 26rpx; color: var(--text-strong); }
.sort-arrow { transition: transform 0.2s; }
.sort-arrow-up { transform: rotate(180deg); }
.sort-mask { position: fixed; inset: 0; z-index: 10; }
.sort-menu { position: absolute; right: 0; top: 56rpx; z-index: 20; width: 200rpx; background: var(--surface); border: 1rpx solid var(--border, #eee); border-radius: 12rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.1); overflow: hidden; }
.sort-opt { padding: 16rpx 24rpx; }
.sort-opt-on { background: rgba(196,30,58,0.05); }
.sort-opt-text { font-size: 26rpx; color: var(--text-strong); }
.sort-opt-text-on { color: var(--brand); }
/* 评价列表 */
.review-item { padding: 28rpx; background: var(--surface); border-bottom: 1rpx solid var(--border, #eee); }
.rv-head { display: flex; align-items: center; gap: 20rpx; margin-bottom: 20rpx; }
.rv-avatar { width: 68rpx; height: 68rpx; border-radius: 50%; background: var(--surface-sunken); }
.rv-info { flex: 1; }
.rv-name-row { display: flex; align-items: center; gap: 12rpx; }
.rv-name { font-size: 26rpx; font-weight: 500; color: var(--text-strong); }
.rv-level { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 6rpx; background: rgba(201,169,110,0.2); color: var(--gold, #c9a96e); }
.rv-sub { display: flex; align-items: center; gap: 12rpx; margin-top: 4rpx; }
.rv-stars { display: flex; gap: 2rpx; }
.rv-time { font-size: 22rpx; color: var(--text-soft); }
.rv-content { display: block; font-size: 26rpx; color: var(--text-strong); line-height: 1.6; margin-bottom: 20rpx; }
.rv-imgs { white-space: nowrap; margin-bottom: 20rpx; }
.rv-imgs-row { display: inline-flex; gap: 16rpx; }
.rv-img { width: 140rpx; height: 140rpx; border-radius: 12rpx; background: var(--surface-sunken); }
.rv-spec { display: block; font-size: 22rpx; color: var(--text-soft); margin-bottom: 20rpx; }
.rv-reply { background: rgba(0,0,0,0.03); border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.rv-reply-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.rv-reply-badge { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 6rpx; border: 1rpx solid rgba(196,30,58,0.3); color: var(--brand); }
.rv-reply-time { font-size: 18rpx; color: var(--text-soft); }
.rv-reply-text { font-size: 22rpx; color: var(--text-soft); line-height: 1.5; }
.rv-foot { display: flex; justify-content: flex-end; }
.rv-like { display: flex; align-items: center; gap: 6rpx; padding: 10rpx 24rpx; border-radius: 999rpx; background: var(--surface-sunken); }
.rv-like-on { background: rgba(196,30,58,0.1); }
.rv-like-num { font-size: 22rpx; color: var(--text-soft); }
.rv-like-num-on { color: var(--brand); }
/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { width: 140rpx; height: 140rpx; border-radius: 50%; background: var(--surface-sunken); display: flex; align-items: center; justify-content: center; margin-bottom: 28rpx; }
.empty-text { font-size: 26rpx; color: var(--text-soft); }
/* 图片预览 */
.preview { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; }
.preview-close { position: absolute; top: calc(28rpx + var(--status-bar-height, 0px)); right: 28rpx; z-index: 10; width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
.preview-body { width: 100%; padding: 28rpx; display: flex; align-items: center; justify-content: center; }
.preview-img { width: 100%; height: 750rpx; }
.preview-dots { position: absolute; bottom: 60rpx; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.preview-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: rgba(255,255,255,0.3); }
.preview-dot-on { background: #fff; }
</style>
