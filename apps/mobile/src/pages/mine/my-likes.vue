<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          我的点赞
        </text>
        <view class="header-right" />
      </view>

      <!-- 筛选 -->
      <view class="filter-bar">
        <scroll-view
          scroll-x
          class="filter-scroll"
          show-scrollbar="false"
        >
          <view
            v-for="f in filterOptions"
            :key="f.value"
            class="filter-chip"
            :class="{ active: filter === f.value }"
            @click="switchFilter(f.value)"
          >
            {{ f.label }}
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 统计 -->
    <view
      v-if="!loading && likes.length > 0"
      class="stats-line"
    >
      <text>共 {{ likes.length }} 条点赞记录</text>
    </view>

    <view class="content">
      <DataState
        :is-loading="loading"
        :error="loadError"
        :is-empty="!loading && likes.length === 0"
        empty-icon="❤"
        empty-title="暂无点赞记录"
        empty-description="去发现更多精彩内容吧"
        empty-action-text="去逛逛"
        :empty-show-action="true"
        skeleton-type="card"
        @retry="loadData"
        @empty-action="goHome"
      >
        <view class="likes-list">
          <view
            v-for="item in likes"
            :key="item.id"
            class="like-card"
            @click="goDetail(item)"
          >
            <view
              class="like-type-icon"
              :class="'ltic-' + item.target.type"
            >
              <text class="like-type-icon-text">
                {{ typeIcon(item.target.type) }}
              </text>
            </view>
            <view class="like-info">
              <text class="like-title">
                {{ item.target.title }}
              </text>
              <view class="like-meta">
                <image
                  v-if="item.target.author?.avatar"
                  :src="item.target.author.avatar"
                  class="like-author-avatar"
                  mode="aspectFill"
                />
                <text class="like-author-name">
                  {{ item.target.author?.nickname || '' }}
                </text>
                <text class="like-type-tag">
                  {{ typeLabel(item.target.type) }}
                </text>
              </view>
            </view>
            <view class="like-right">
              <text class="like-time">
                {{ item.createdAt }}
              </text>
              <text
                class="like-heart"
                :class="{ unliking: unlikingId === item.id }"
                @click.stop="handleUnlike(item)"
              >
                ❤
              </text>
            </view>
          </view>
        </view>
      </DataState>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DataState from '../../components/DataState.vue'

interface LikeAuthor {
  nickname: string
  avatar?: string
}

interface LikeTarget {
  id: string
  type: string
  title: string
  author?: LikeAuthor
  cover?: string
}

interface LikeItem {
  id: number
  target: LikeTarget
  createdAt: string
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const likes = ref<LikeItem[]>([])
const filter = ref<string>('all')
const unlikingId = ref<number | null>(null)

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '文章', value: 'article' },
  { label: '课程', value: 'course' },
  { label: '视频', value: 'video' },
  { label: '帖子', value: 'circle_post' },
  { label: '问答', value: 'question' },
  { label: '商品', value: 'product' },
]

function typeIcon(type: string): string {
  const map: Record<string, string> = { article: '📄', course: '📖', video: '🎬', product: '🛍', circle_post: '👥', question: '❓', answer: '💬', comment: '💬' }
  return map[type] || '📄'
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { article: '文章', course: '课程', video: '视频', product: '商品', circle_post: '帖子', question: '问答', answer: '回答', comment: '评论' }
  return map[type] || type
}

function switchFilter(val: string) {
  filter.value = val
  loadData()
}

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 500))
    likes.value = [
      {
        id: 1,
        target: { id: 'c1', type: 'course', title: '周易入门：从零开始学习易经', author: { nickname: '易学大师王老师', avatar: '' } },
        createdAt: '2026-06-03',
      },
      {
        id: 2,
        target: { id: 'a1', type: 'article', title: '八字命理中的十神详解', author: { nickname: '道法自然', avatar: '' } },
        createdAt: '2026-06-02',
      },
      {
        id: 3,
        target: { id: 'v1', type: 'video', title: '梅花易数实战案例分析', author: { nickname: '玄学研究院', avatar: '' } },
        createdAt: '2026-06-01',
      },
      {
        id: 4,
        target: { id: 'p1', type: 'product', title: '开光铜葫芦摆件' },
        createdAt: '2026-05-30',
      },
    ]
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleUnlike(item: LikeItem) {
  unlikingId.value = item.id
  await new Promise((r) => setTimeout(r, 300))
  likes.value = likes.value.filter((l) => l.id !== item.id)
  unlikingId.value = null
  uni.showToast({ title: '已取消点赞', icon: 'none' })
}

function goDetail(item: LikeItem) {
  uni.showToast({ title: '打开：' + item.target.title, icon: 'none' })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-right { width: 80rpx; }

.filter-bar { padding: 12rpx 24rpx 16rpx; }
.filter-scroll { white-space: nowrap; }
.filter-chip { display: inline-block; padding: 8rpx 24rpx; border-radius: 28rpx; font-size: 22rpx; background: #F5F0E8; color: #666; margin-right: 12rpx; }
.filter-chip.active { background: #C41E3A; color: #fff; font-weight: 500; }

.stats-line { padding: 16rpx 24rpx; font-size: 22rpx; color: #999; border-bottom: 1rpx solid #E8E3DB; }

.content { padding: 16rpx 24rpx; }
.likes-list { display: flex; flex-direction: column; gap: 12rpx; }

.like-card { display: flex; gap: 16rpx; background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.like-type-icon { width: 72rpx; height: 72rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ltic-article { background: #E3F2FD; }
.ltic-course { background: #FFF3E0; }
.ltic-video { background: #FCE4EC; }
.ltic-product { background: #E8F5E9; }
.ltic-circle_post { background: #F3E5F5; }
.ltic-question { background: #FFF8E1; }
.ltic-answer { background: #E0F2F1; }
.ltic-comment { background: #F5F5F5; }
.like-type-icon-text { font-size: 32rpx; }

.like-info { flex: 1; min-width: 0; }
.like-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.like-meta { display: flex; align-items: center; gap: 8rpx; margin-top: 12rpx; }
.like-author-avatar { width: 36rpx; height: 36rpx; border-radius: 50%; }
.like-author-name { font-size: 20rpx; color: #999; }
.like-type-tag { font-size: 18rpx; padding: 2rpx 10rpx; background: #F5F0E8; color: #B8B0A4; border-radius: 12rpx; }

.like-right { text-align: right; flex-shrink: 0; }
.like-time { font-size: 20rpx; color: #B8B0A4; display: block; }
.like-heart { font-size: 36rpx; color: #C41E3A; display: block; margin-top: 8rpx; }
.like-heart.unliking { opacity: 0.5; }
</style>
