<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack } from '@/utils/router'
import {
  mineApi,
  likeTypeNames,
  likeTypeStyles,
  likeFilterOptions,
  type LikeItem,
  type LikeTargetType,
} from '@/lib/mine-data'

const list = ref<LikeItem[]>([])
const loading = ref(true)
const error = ref('')
const filter = ref<LikeTargetType | 'all'>('all')
const unliking = ref<string | number | null>(null)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await mineApi.getMyLikes()
    list.value = data.map((i: LikeItem) => ({ ...i }))
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() {
  fetchData()
}

onMounted(() => {
  fetchData()
})

const filtered = computed(() =>
  filter.value === 'all'
    ? list.value
    : list.value.filter((i) => i.target.type === filter.value),
)
const isEmpty = computed(() => filtered.value.length === 0)

async function unlike(item: LikeItem) {
  if (unliking.value !== null) return
  unliking.value = item.id
  try {
    await mineApi.removeMyLike(item.id)
    list.value = list.value.filter((i) => i.id !== item.id)
    uni.showToast({ title: '已取消点赞', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    unliking.value = null
  }
}
/** 跳原内容页（原为"开发中"toast）。circle_post 详情页需 circleId 本数据没有；question/answer/comment 无独立详情页 → 保持提示 */
function openTarget(item: LikeItem) {
  const { id, type } = item.target
  const url =
    type === 'article' ? `/pkg-circle/articles/detail?id=${id}`
    : type === 'course' ? `/pkg-course/detail/index?id=${id}`
    : type === 'video' ? `/pkg-video/detail/index?id=${id}`
    : type === 'product' ? `/pkg-mall/product/detail?id=${id}`
    : type === 'circle_post' ? `/pkg-circle/circles/post?id=${id}`
    : ''
  if (!url) { uni.showToast({ title: '该内容暂不支持跳转', icon: 'none' }); return }
  uni.navigateTo({ url, fail: () => uni.showToast({ title: '打开失败', icon: 'none' }) })
}
</script>

<template>
  <view class="page">
    <app-nav-bar title="我的点赞" :title-size="36" />

    <!-- 筛选栏 -->
    <scroll-view scroll-x class="filter-scroll">
      <view class="filter-row">
        <text
          v-for="opt in likeFilterOptions"
          :key="opt.value"
          class="filter-chip"
          :class="{ active: filter === opt.value }"
          @tap="filter = opt.value"
        >{{ opt.label }}</text>
      </view>
    </scroll-view>

    <!-- 加载/错误 -->
    <view v-if="loading" class="loading"><AppLoading /></view>
    <view v-else-if="error" class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
    <template v-else>
    <view v-if="!isEmpty" class="count-bar">共 {{ filtered.length }} 条点赞记录</view>

    <!-- 空态 -->
    <view v-if="isEmpty" class="empty">
      <view class="empty-icon"><AppIcon name="heart" :size="44" color="#C9C2B6" /></view>
      <text class="empty-title">暂无点赞记录</text>
      <text class="empty-desc">去发现更多精彩内容吧</text>
      <view class="empty-btn" @tap="goBack"><text class="empty-btn-text">去逛逛</text></view>
    </view>

    <scroll-view v-else scroll-y class="scroll">
      <view class="like-list">
        <view v-for="item in filtered" :key="item.id" class="like-item" @tap="openTarget(item)">
          <view
            class="type-icon"
            :style="{ background: likeTypeStyles[item.target.type].bg }"
          >
            <AppIcon
              :name="likeTypeStyles[item.target.type].icon"
              :size="18"
              :color="likeTypeStyles[item.target.type].color"
            />
          </view>
          <view class="like-body">
            <text class="like-title">{{ item.target.title }}</text>
            <view class="like-meta">
              <view class="like-author" v-if="item.target.author">
                <smart-avatar :src="item.target.author.avatar" :name="item.target.author.nickname" class="author-avatar" />
                <text class="author-name">{{ item.target.author.nickname }}</text>
              </view>
              <text class="like-type">{{ likeTypeNames[item.target.type] }}</text>
            </view>
          </view>
          <view class="like-right">
            <text class="like-time">{{ item.createdAt }}</text>
            <view class="heart-btn" :class="{ disabled: unliking === item.id }" @tap.stop="unlike(item)">
              <AppIcon name="heart" :size="18" color="#C41E3A" />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
    </template>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 三态 */
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }

.filter-scroll { background: #fff; border-bottom: 1rpx solid #EDE7DC; white-space: nowrap; }
.filter-row { display: inline-flex; gap: 16rpx; padding: 20rpx 24rpx; }
.filter-chip { font-size: 26rpx; color: #6f6760; background: #F2ECE1; padding: 12rpx 28rpx; border-radius: 999rpx; }
.filter-chip.active { background: var(--brand); color: #fff; }

.count-bar { padding: 16rpx 24rpx 0; font-size: 22rpx; color: #b8b0a4; }

.empty { flex: 1; padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.empty-icon { width: 140rpx; height: 140rpx; border-radius: 50%; background: #F2ECE1; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.empty-title { font-size: 28rpx; color: #6f6760; }
.empty-desc { font-size: 24rpx; color: #b8b0a4; }
.empty-btn { margin-top: 24rpx; padding: 18rpx 56rpx; background: var(--brand); border-radius: 999rpx; }
.empty-btn-text { font-size: 28rpx; color: #fff; }

.scroll { flex: 1; padding: 24rpx; box-sizing: border-box; }
.like-list { display: flex; flex-direction: column; gap: 16rpx; }
.like-item { background: #fff; border-radius: 16rpx; padding: 24rpx; display: flex; gap: 20rpx; align-items: flex-start; }
.type-icon { width: 72rpx; height: 72rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.like-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14rpx; }
.like-title { font-size: 28rpx; color: #2C2C2C; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.like-meta { display: flex; align-items: center; gap: 12rpx; }
.like-author { display: flex; align-items: center; gap: 8rpx; }
.author-avatar { width: 36rpx; height: 36rpx; border-radius: 50%; background: #F2ECE1; }
.author-name { font-size: 22rpx; color: #8a8178; }
.like-type { font-size: 20rpx; color: #b8b0a4; background: #F2ECE1; padding: 2rpx 12rpx; border-radius: 8rpx; }
.like-right { display: flex; flex-direction: column; align-items: flex-end; gap: 16rpx; flex-shrink: 0; }
.like-time { font-size: 20rpx; color: #b8b0a4; }
.heart-btn { width: 56rpx; height: 56rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; }
.heart-btn.disabled { opacity: 0.5; }
</style>
