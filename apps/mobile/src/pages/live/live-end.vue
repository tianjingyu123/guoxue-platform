<template>
  <view class="page">
    <!-- 加载态 -->
    <view
      v-if="loading"
      class="loading-wrap"
    >
      <view class="skeleton-cover" />
      <view class="skeleton-body">
        <view
          v-for="i in 3"
          :key="i"
          class="skeleton-card"
        />
      </view>
    </view>

    <!-- 错误态 -->
    <view
      v-else-if="loadError"
      class="error-wrap"
    >
      <view class="error-inner">
        <text class="error-icon">
          ⚠️
        </text>
        <text class="error-text">
          {{ loadError }}
        </text>
        <view
          class="error-retry"
          @click="loadRoom"
        >
          重新加载
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view
      v-else-if="!room"
      class="empty-state"
    >
      <text class="empty-text">
        直播不存在
      </text>
    </view>

    <template v-else>
      <!-- 封面区域 -->
      <view class="cover-section">
        <image
          :src="room.cover"
          mode="aspectFill"
          class="cover-bg"
        />
        <view class="cover-overlay" />

        <!-- 顶部导航 -->
        <view class="cover-top">
          <view
            class="top-btn"
            @click="goBack"
          >
            <text class="top-btn-icon">
              ←
            </text>
          </view>
        </view>

        <!-- 直播已结束标识 -->
        <view class="cover-center">
          <view class="end-badge">
            <view class="end-badge-icon-wrap">
              <text class="end-badge-icon">
                📡
              </text>
            </view>
            <text class="end-badge-title">
              直播已结束
            </text>
            <text class="end-badge-duration">
              时长 {{ formatDuration(room.stats.duration) }}
            </text>
          </view>
        </view>

        <!-- 底部信息 -->
        <view class="cover-bottom">
          <text class="cover-title">
            {{ room.title }}
          </text>
          <view class="cover-tags">
            <text
              v-for="tag in room.tags"
              :key="tag"
              class="cover-tag"
            >
              {{ tag }}
            </text>
          </view>
        </view>
      </view>

      <!-- 主播信息 -->
      <view class="host-card">
        <view
          class="host-left"
          @click="goProfile(room.host.id)"
        >
          <image
            :src="room.host.avatar"
            mode="aspectFill"
            class="host-avatar"
          />
          <view class="host-info">
            <text class="host-name">
              {{ room.host.name }}
            </text>
            <text class="host-fans">
              {{ formatNumber(room.host.followers) }} 粉丝
            </text>
          </view>
        </view>
        <text
          :class="['host-follow-btn', isFollowing ? 'following' : '']"
          @click="handleFollow"
        >
          {{ isFollowing ? '✓ 已关注' : '+ 关注' }}
        </text>
      </view>

      <!-- 直播数据统计 -->
      <view class="data-section">
        <text class="section-title">
          直播数据
        </text>
        <view class="data-grid">
          <view class="data-item">
            <text class="data-icon accent">
              👁️
            </text>
            <text class="data-value">
              {{ formatNumber(room.stats.totalViewers) }}
            </text>
            <text class="data-label">
              总观看
            </text>
          </view>
          <view class="data-item">
            <text class="data-icon gold">
              👥
            </text>
            <text class="data-value">
              {{ formatNumber(room.stats.peakViewers) }}
            </text>
            <text class="data-label">
              峰值在线
            </text>
          </view>
          <view class="data-item">
            <text class="data-icon pink">
              ❤️
            </text>
            <text class="data-value">
              {{ formatNumber(room.stats.totalLikes) }}
            </text>
            <text class="data-label">
              总点赞
            </text>
          </view>
          <view class="data-item">
            <text class="data-icon orange">
              🎁
            </text>
            <text class="data-value">
              {{ formatNumber(room.stats.totalGifts) }}
            </text>
            <text class="data-label">
              礼物收入
            </text>
          </view>
        </view>
      </view>

      <!-- 讲师其他直播 -->
      <view class="recommend-section">
        <view class="recommend-header">
          <text class="section-title">
            讲师其他直播
          </text>
          <view
            class="recommend-more"
            @click="goProfileLives(room.host.id)"
          >
            <text class="more-text">
              查看全部
            </text>
            <text class="more-arrow">
              ›
            </text>
          </view>
        </view>
        <view class="recommend-list">
          <view
            v-for="live in recommendLives"
            :key="live.id"
            class="recommend-item"
            @click="goRecommendLive(live)"
          >
            <view class="recommend-cover-wrap">
              <image
                :src="live.cover"
                mode="aspectFill"
                class="recommend-cover"
              />
              <text
                v-if="live.status === 'live'"
                class="live-badge live-status"
              >
                🔴 直播中
              </text>
              <text
                v-if="live.status === 'preview'"
                class="live-badge preview-status"
              >
                预告
              </text>
            </view>
            <view class="recommend-info">
              <text class="recommend-title">
                {{ live.title }}
              </text>
              <text class="recommend-meta">
                {{ live.status === 'live' ? formatNumber(live.viewers) + ' 观看' : live.bookedCount + ' 人预约' }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 相关课程推荐 -->
      <view class="course-section">
        <view class="recommend-header">
          <text class="section-title">
            相关课程推荐
          </text>
          <view
            class="recommend-more"
            @click="goCourses"
          >
            <text class="more-text">
              查看更多
            </text>
            <text class="more-arrow">
              ›
            </text>
          </view>
        </view>
        <view class="course-grid">
          <view
            v-for="course in recommendCourses"
            :key="course.id"
            class="course-card"
            @click="goCourse(course.id)"
          >
            <image
              :src="course.cover"
              mode="aspectFill"
              class="course-cover"
            />
            <view class="course-body">
              <text class="course-title">
                {{ course.title }}
              </text>
              <view class="course-footer">
                <text class="course-price">
                  ¥{{ course.price }}
                </text>
                <text class="course-lessons">
                  {{ course.lessons }}课时
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部固定按钮 -->
      <view class="bottom-bar">
        <view class="bottom-inner">
          <view
            class="bottom-btn outline"
            @click="goCircle(room.host.id)"
          >
            进入讲师圈子
          </view>
          <view
            v-if="room.hasReplay"
            class="bottom-btn primary"
            @click="goReplay(room.id)"
          >
            ▶ 查看回放
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { liveApi } from '../../api'

const loading = ref(true)
const loadError = ref<string | null>(null)
const room = ref<any>(null)
const isFollowing = ref(false)
const recommendLives = ref<any[]>([])
const recommendCourses = ref<any[]>([])

const roomId = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  roomId.value = opts.id || ''
  if (roomId.value) loadRoom()
  else { loading.value = false; loadError.value = '缺少直播ID' }
})

async function loadRoom() {
  loading.value = true
  loadError.value = null
  try {
    const raw = await liveApi.roomDetail(roomId.value)
    room.value = mapRoomEnd(raw)
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    console.error(e)
  } finally {
    loading.value = false
  }
}

function mapRoomEnd(raw: any) {
  return {
    id: raw.id,
    title: raw.title || '',
    cover: raw.cover || '',
    status: raw.status || 'replay',
    tags: raw.tags || [],
    host: {
      id: raw.hostId || raw.userId || raw.host?.id || '',
      name: raw.hostName || raw.host?.name || raw.user?.nickname || '',
      avatar: raw.hostAvatar || raw.host?.avatar || raw.user?.avatar || '',
      followers: raw.hostFans || raw.host?.followers || 0,
    },
    stats: {
      duration: raw.duration || 0,
      totalViewers: raw.viewCount || raw.totalViewers || 0,
      peakViewers: raw.peakViewers || 0,
      totalLikes: raw.likeCount || raw.totalLikes || 0,
      totalGifts: raw.giftCount || raw.totalGifts || 0,
    },
    hasReplay: raw.hasReplay !== undefined ? raw.hasReplay : (raw.status === 'REPLAY' || raw.status === 'ENDED'),
  }
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}

function formatNumber(num: number) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toString()
}

function handleFollow() { isFollowing.value = !isFollowing.value }
function goBack() { uni.navigateBack() }
function goProfile(id: string) { uni.navigateTo({ url: `/pages/user/user?id=${id}` }) }
function goProfileLives(id: string) { uni.navigateTo({ url: `/pages/user/user?id=${id}&tab=lives` }) }
function goRecommendLive(live: any) {
  if (live.status === 'live') uni.navigateTo({ url: `/pages/live/live-room?id=${live.id}` })
  else if (live.status === 'preview') uni.navigateTo({ url: `/pages/live/preview?id=${live.id}` })
}
function goCourse(id: string) { uni.navigateTo({ url: `/pages/courses/course-detail?id=${id}` }) }
function goCourses() { uni.navigateTo({ url: '/pages/courses/courses' }) }
function goCircle(hostId: string) { uni.navigateTo({ url: `/pages/circles/circle-detail?hostId=${hostId}` }) }
function goReplay(roomId: string) { uni.navigateTo({ url: `/pages/live/replay-player?id=${roomId}` }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 120rpx; }

/* 错误态 */
.error-wrap { display: flex; align-items: center; justify-content: center; min-height: 70vh; padding: 48rpx; }
.error-inner { text-align: center; }
.error-icon { font-size: 72rpx; display: block; margin-bottom: 16rpx; }
.error-text { font-size: 26rpx; color: #999; margin-bottom: 24rpx; display: block; }
.error-retry { display: inline-block; padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 40rpx; font-size: 26rpx; }

/* 骨架 */
.loading-wrap { }
.skeleton-cover { height: 512rpx; background: #E8E3DB; }
.skeleton-body { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.skeleton-card { background: #E8E3DB; border-radius: 24rpx; height: 192rpx; }

/* 封面区域 */
.cover-section { position: relative; height: 512rpx; overflow: hidden; }
.cover-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.cover-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 50%, rgba(0,0,0,0.7) 100%); }
.cover-top { position: absolute; top: 0; left: 0; right: 0; padding: 24rpx; z-index: 2; }
.top-btn { width: 64rpx; height: 64rpx; background: rgba(0,0,0,0.3); backdrop-filter: blur(8px); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.top-btn-icon { font-size: 36rpx; color: #fff; }

.cover-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2; }
.end-badge { background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); border-radius: 32rpx; padding: 32rpx 48rpx; text-align: center; }
.end-badge-icon-wrap { width: 72rpx; height: 72rpx; margin: 0 auto 12rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.end-badge-icon { font-size: 36rpx; color: #fff; }
.end-badge-title { display: block; font-size: 32rpx; font-weight: 500; color: #fff; margin-bottom: 8rpx; }
.end-badge-duration { display: block; font-size: 24rpx; color: rgba(255,255,255,0.7); }

.cover-bottom { position: absolute; bottom: 0; left: 0; right: 0; padding: 24rpx; z-index: 2; }
.cover-title { display: block; font-size: 34rpx; font-weight: bold; color: #fff; margin-bottom: 12rpx; }
.cover-tags { display: flex; gap: 8rpx; }
.cover-tag { padding: 4rpx 16rpx; background: rgba(255,255,255,0.2); color: #fff; border-radius: 20rpx; font-size: 22rpx; }

/* 主播卡片 */
.host-card { display: flex; align-items: center; justify-content: space-between; margin: -32rpx 24rpx 16rpx; padding: 24rpx; background: #fff; border-radius: 24rpx; position: relative; z-index: 5; }
.host-left { display: flex; align-items: center; gap: 16rpx; flex: 1; }
.host-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #E8E3DB; flex-shrink: 0; }
.host-name { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.host-fans { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.host-follow-btn { padding: 12rpx 32rpx; border-radius: 40rpx; font-size: 24rpx; background: #C41E3A; color: #fff; }
.host-follow-btn.following { background: #FAF8F5; color: #999; }

/* 统计数据 */
.data-section { margin: 0 24rpx 16rpx; padding: 24rpx; background: #fff; border-radius: 24rpx; }
.section-title { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 24rpx; }
.data-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.data-item { text-align: center; padding: 16rpx; background: #FAF8F5; border-radius: 16rpx; }
.data-icon { font-size: 32rpx; margin-bottom: 8rpx; display: block; }
.data-icon.accent { color: #C41E3A; }
.data-icon.gold { color: #C9A96E; }
.data-icon.pink { color: #ec4899; }
.data-icon.orange { color: #f59e0b; }
.data-value { display: block; font-size: 32rpx; font-weight: bold; color: #2C2C2C; }
.data-label { display: block; font-size: 20rpx; color: #999; margin-top: 4rpx; }

/* 推荐 */
.recommend-section, .course-section { margin: 0 24rpx 16rpx; padding: 24rpx; background: #fff; border-radius: 24rpx; }
.recommend-header { display: flex; align-items: center; justify-content: space-between; }
.recommend-more { display: flex; align-items: center; gap: 4rpx; }
.more-text { font-size: 24rpx; color: #999; }
.more-arrow { font-size: 28rpx; color: #999; }
.recommend-list { display: flex; flex-direction: column; gap: 16rpx; }
.recommend-item { display: flex; gap: 12rpx; }
.recommend-cover-wrap { position: relative; width: 144rpx; height: 96rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; }
.recommend-cover { width: 100%; height: 100%; background: #E8E3DB; }
.live-badge { position: absolute; top: 4rpx; left: 4rpx; font-size: 20rpx; padding: 2rpx 8rpx; border-radius: 4rpx; color: #fff; }
.live-status { background: #C41E3A; }
.preview-status { background: #C9A96E; }
.recommend-info { flex: 1; min-width: 0; }
.recommend-title { display: block; font-size: 24rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.recommend-meta { display: block; font-size: 22rpx; color: #999; margin-top: 8rpx; }

/* 课程 */
.course-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.course-card { background: #FAF8F5; border-radius: 16rpx; overflow: hidden; }
.course-cover { width: 100%; height: 160rpx; background: #E8E3DB; }
.course-body { padding: 16rpx; }
.course-title { display: block; font-size: 24rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 12rpx; }
.course-footer { display: flex; align-items: center; justify-content: space-between; }
.course-price { font-size: 28rpx; font-weight: bold; color: #C41E3A; }
.course-lessons { font-size: 20rpx; color: #999; }

/* 底部固定按钮 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E8E3DB; padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); z-index: 20; }
.bottom-inner { display: flex; gap: 16rpx; }
.bottom-btn { flex: 1; text-align: center; padding: 20rpx 0; border-radius: 16rpx; font-size: 28rpx; font-weight: 500; }
.bottom-btn.outline { border: 1rpx solid #E8E3DB; color: #2C2C2C; }
.bottom-btn.primary { background: #C41E3A; color: #fff; }
</style>
