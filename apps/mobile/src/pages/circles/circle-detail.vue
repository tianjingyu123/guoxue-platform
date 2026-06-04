<template>
  <view class="page">
    <!-- 加载 -->
    <DataState
      :is-loading="loading && !circle"
      :error="loadError"
      :is-empty="!loading && !circle"
      empty-icon="👥"
      empty-title="圈子未找到"
      empty-description="该圈子不存在或已解散"
      empty-action-text="返回"
      :empty-show-action="true"
      skeleton-type="detail"
      @retry="initData"
      @empty-action="goBack"
    >
      <template v-if="circle">
        <!-- ===== 圈顶信息 ===== -->
        <view class="circle-header">
          <view class="ch-bg">
            <image
              v-if="circle.cover"
              :src="circle.cover"
              class="ch-cover"
              mode="aspectFill"
            />
            <view v-else class="ch-cover-placeholder">
              <text class="ch-placeholder-icon">{{ circle.name?.charAt(0) || '圈' }}</text>
            </view>
            <view class="ch-overlay" />
          </view>
          <view class="ch-content">
            <view class="ch-avatar-row">
              <image
                v-if="circle.cover"
                :src="circle.cover"
                class="ch-avatar"
                mode="aspectFill"
              />
              <view v-else class="ch-avatar-placeholder">
                <text>{{ circle.name?.charAt(0) || '圈' }}</text>
              </view>
              <view class="ch-text">
                <text class="ch-name">{{ circle.name }}</text>
                <view class="ch-tags" v-if="circle.tags?.length">
                  <text v-for="t in circle.tags.slice(0, 3)" :key="t" class="ch-tag">{{ t }}</text>
                </view>
              </view>
            </view>
            <text class="ch-intro">{{ circle.intro || '暂无简介' }}</text>
            <view class="ch-stats">
              <view class="ch-stat">
                <text class="ch-stat-num">{{ formatCount(circle.memberCount) }}</text>
                <text class="ch-stat-label">成员</text>
              </view>
              <view class="ch-stat">
                <text class="ch-stat-num">{{ formatCount(circle.postCount) }}</text>
                <text class="ch-stat-label">帖子</text>
              </view>
            </view>
            <!-- 加入/退出 -->
            <view class="ch-actions">
              <button
                v-if="!joined"
                class="ch-btn join"
                :disabled="joining"
                @click="joinCircle"
              >
                {{ joining ? '加入中...' : '+ 加入圈子' }}
              </button>
              <button
                v-else
                class="ch-btn leave"
                :disabled="leaving"
                @click="leaveCircle"
              >
                {{ leaving ? '退出中...' : '已加入' }}
              </button>
            </view>
          </view>
        </view>

        <!-- ===== 公告横幅 ===== -->
        <view v-if="announcement" class="announcement-bar" @click="goAnnouncement">
          <text class="announcement-icon">📢</text>
          <text class="announcement-text">{{ announcement }}</text>
          <text class="announcement-arrow">›</text>
        </view>

        <!-- ===== 精华帖子 ===== -->
        <view v-if="essencePosts.length > 0" class="essence-section">
          <view class="section-header">
            <text class="section-title">🌟 精华帖子</text>
            <text class="section-more" @click="switchToEssence">查看全部 ›</text>
          </view>
          <scroll-view scroll-x class="essence-scroll" show-scrollbar="false">
            <view
              v-for="post in essencePosts"
              :key="post.id"
              class="essence-card"
              @click="goPostDetail(post)"
            >
              <view v-if="post.images?.length" class="ec-cover">
                <image :src="post.images[0]" mode="aspectFill" class="ec-img" />
              </view>
              <view v-else class="ec-cover ec-cover-placeholder">
                <text>📝</text>
              </view>
              <view class="ec-info">
                <text class="ec-author">{{ post.author?.nickname || '匿名' }}</text>
                <text class="ec-title">{{ post.title || post.content?.slice(0, 30) }}</text>
                <view class="ec-stats">
                  <text>❤️ {{ post.likeCount || 0 }}</text>
                  <text>💬 {{ post.commentCount || 0 }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- ===== 帖子列表 ===== -->
        <view class="post-section">
          <view class="section-header">
            <text class="section-title">📝 全部帖子</text>
          </view>

          <DataState
            :is-loading="loadingPosts && posts.length === 0"
            :error="postLoadError"
            :is-empty="!loadingPosts && posts.length === 0"
            empty-icon="📝"
            empty-title="暂无帖子"
            empty-description="快来发表第一条帖子吧"
            skeleton-type="list"
            @retry="fetchPosts"
          >
            <view class="post-list">
              <view
                v-for="post in posts"
                :key="post.id"
                class="post-card"
                @click="goPostDetail(post)"
              >
                <view class="post-header">
                  <view class="post-user-info">
                    <image
                      v-if="post.author?.avatar"
                      :src="post.author.avatar"
                      class="post-avatar"
                      mode="aspectFill"
                    />
                    <view class="post-user-meta">
                      <text class="post-user">{{ post.author?.nickname || '匿名' }}</text>
                      <text class="post-time">{{ formatTime(post.createdAt) }}</text>
                    </view>
                  </view>
                  <view class="post-badges">
                    <text v-if="post.isTop" class="badge top">置顶</text>
                    <text v-if="post.isEssence" class="badge essence">精华</text>
                  </view>
                </view>

                <text class="post-title" v-if="post.title">{{ post.title }}</text>
                <text class="post-body">{{ post.content }}</text>

                <view v-if="post.images?.length" class="post-images">
                  <image
                    v-for="(img, idx) in post.images.slice(0, 3)"
                    :key="idx"
                    :src="img"
                    mode="aspectFill"
                    class="post-img"
                    @click.stop="previewImages(post.images, idx)"
                  />
                  <text v-if="post.images.length > 3" class="post-img-more">+{{ post.images.length - 3 }}</text>
                </view>

                <view class="post-footer">
                  <view class="footer-item" @click.stop="toggleLike(post)">
                    <text>{{ post.isLiked ? '❤️' : '🤍' }}</text>
                    <text class="footer-count">{{ post.likeCount || 0 }}</text>
                  </view>
                  <view class="footer-item">
                    <text>💬</text>
                    <text class="footer-count">{{ post.commentCount || 0 }}</text>
                  </view>
                  <view class="footer-item" @click.stop="sharePost(post)">
                    <text>↗</text>
                  </view>
                </view>
              </view>
            </view>

            <!-- 加载更多 -->
            <view v-if="loadingMorePosts" class="load-more">加载更多...</view>
            <view v-if="!hasMorePosts && posts.length > 0" class="no-more">— 已全部加载 —</view>
          </DataState>
        </view>
      </template>
    </DataState>

    <!-- 底部发布按钮 -->
    <view v-if="circle && joined" class="post-fab" @click="showCreatePanel">
      <text class="fab-icon">✏️</text>
      <text class="fab-text">发帖</text>
    </view>

    <!-- AI助理悬浮按钮 -->
    <view v-if="hasBot" class="bot-fab" @click="openBotChat">
      <text class="bot-fab-icon">🤖</text>
    </view>

    <!-- 发帖弹窗 -->
    <view v-if="showPostPanel" class="post-mask" @click="hideCreatePanel">
      <view class="post-panel" @click.stop>
        <view class="panel-header">
          <text class="panel-title">发表帖子</text>
          <view class="panel-actions">
            <text class="panel-char-count">{{ postContent.length }}/500</text>
            <button
              class="panel-submit-btn"
              :disabled="!postContent.trim() || submitting"
              @click="submitPost"
            >
              {{ submitting ? '发布中...' : '发布' }}
            </button>
            <text class="panel-close" @click="hideCreatePanel">✕</text>
          </view>
        </view>
        <input
          v-model="postTitle"
          placeholder="标题（选填）"
          class="post-title-input"
          maxlength="60"
        />
        <textarea
          v-model="postContent"
          placeholder="分享你的见解..."
          class="post-content-input"
          maxlength="500"
          auto-height
        />
        <view class="panel-images" v-if="postImages.length > 0">
          <view v-for="(img, idx) in postImages" :key="idx" class="panel-img-wrap">
            <image :src="img" class="panel-img" mode="aspectFill" />
            <text class="panel-img-remove" @click="removeImage(idx)">×</text>
          </view>
        </view>
        <view class="panel-tools">
          <view class="panel-tool" @click="chooseImage">
            <text>🖼️</text>
            <text class="panel-tool-text">图片</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { circleApi, interactApi, uploadApi } from '../../api'
import DataState from '../../components/DataState.vue'
import EmptyState from '../../components/EmptyState.vue'

interface PostAuthor {
  id: string
  nickname: string
  avatar: string
}

interface CirclePostItem {
  id: string
  title?: string
  content: string
  images?: string[]
  author?: PostAuthor
  likeCount: number
  commentCount: number
  isLiked: boolean
  isTop: boolean
  isEssence: boolean
  createdAt?: string
}

const circle = ref<any>(null)
const joined = ref(false)
const loading = ref(false)
const loadError = ref<string | null>(null)
const joining = ref(false)
const leaving = ref(false)

// 公告
const announcement = ref('')

// 帖子
const posts = ref<CirclePostItem[]>([])
const essencePosts = ref<CirclePostItem[]>([])
const loadingPosts = ref(false)
const loadingMorePosts = ref(false)
const hasMorePosts = ref(true)
const postPage = ref(1)
const postLoadError = ref<string | null>(null)

// AI助理
const hasBot = ref(false)

// 发帖
const showPostPanel = ref(false)
const postTitle = ref('')
const postContent = ref('')
const postImages = ref<string[]>([])
const submitting = ref(false)

const id = ref('')
const pageSize = 10

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  id.value = opts.id || ''
  if (id.value) initData()
})

// 下拉刷新
onPullDownRefresh(() => {
  postPage.value = 1
  hasMorePosts.value = true
  fetchPosts(true).finally(() => {
    uni.stopPullDownRefresh()
  })
})

// 上拉加载更多
onReachBottom(() => {
  if (!hasMorePosts.value || loadingMorePosts.value || loadingPosts.value) return
  loadingMorePosts.value = true
  postPage.value++
  fetchPosts(false).finally(() => {
    loadingMorePosts.value = false
  })
})

async function initData() {
  loading.value = true
  loadError.value = null
  try {
    const [circleData, postData] = await Promise.all([
      circleApi.detail(id.value).catch(() => null),
      circleApi.posts(id.value, { page: 1, pageSize }).catch(() => ({ posts: [] })),
    ])

    if (circleData) {
      circle.value = {
        id: circleData.id,
        name: circleData.name,
        cover: circleData.cover,
        intro: circleData.intro || circleData.description,
        memberCount: circleData.memberCount ?? 0,
        postCount: circleData.postCount ?? 0,
        tags: circleData.tags,
        isJoined: circleData.isJoined ?? circleData.joined ?? false,
      }
      joined.value = circle.value.isJoined
      announcement.value = circleData.notice || circleData.announcement || ''
    }

    // 处理帖子
    const rawPosts: any[] = postData.list || postData.items || postData.data || postData || []
    processPosts(rawPosts, true)

    // 检查AI助理
    try {
      const botRes = await circleApi.getExperts(id.value)
      hasBot.value = Array.isArray(botRes) && botRes.length > 0
    } catch {
      hasBot.value = false
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function processPosts(rawPosts: any[], reset: boolean) {
  const mapped: CirclePostItem[] = rawPosts
    .filter((p: any) => p && p.id)
    .map((p: any) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      images: p.images,
      author: p.author || p.user,
      likeCount: p.likeCount ?? 0,
      commentCount: p.commentCount ?? 0,
      isLiked: p.isLiked ?? p.liked ?? false,
      isTop: p.isTop ?? false,
      isEssence: p.isEssence ?? false,
      createdAt: p.createdAt,
    }))

  if (reset) {
    posts.value = mapped
  } else {
    const existIds = new Set(posts.value.map((x) => x.id))
    const news = mapped.filter((x) => !existIds.has(x.id))
    posts.value.push(...news)
  }
  hasMorePosts.value = rawPosts.length >= pageSize

  // 提取精华帖子
  essencePosts.value = mapped.filter((p) => p.isEssence).slice(0, 5)
}

async function fetchPosts(reset: boolean = true) {
  if (reset) loadingPosts.value = true
  postLoadError.value = null
  try {
    const params: Record<string, any> = { page: postPage.value, pageSize }
    const data = await circleApi.posts(id.value, params)
    const rawPosts: any[] = data.list || data.items || data.data || data || []
    processPosts(rawPosts, reset)
  } catch (e: any) {
    postLoadError.value = e?.errMsg || e?.message || '加载失败'
    if (reset) posts.value = []
  } finally {
    if (reset) loadingPosts.value = false
  }
}

function switchToEssence() {
  // 滚动到精华区域或切换tab
  uni.pageScrollTo({ selector: '.essence-section', duration: 300 })
}

// 加入/退出
async function joinCircle() {
  if (joining.value) return
  joining.value = true
  try {
    await circleApi.join(id.value)
    joined.value = true
    if (circle.value) {
      circle.value.memberCount = (circle.value.memberCount || 0) + 1
    }
    uni.showToast({ title: '已加入圈子', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || '加入失败', icon: 'none' })
  } finally {
    joining.value = false
  }
}

async function leaveCircle() {
  if (leaving.value) return
  leaving.value = true
  try {
    await circleApi.leave(id.value)
    joined.value = false
    if (circle.value) {
      circle.value.memberCount = Math.max(0, (circle.value.memberCount || 1) - 1)
    }
    uni.showToast({ title: '已退出圈子', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || '退出失败', icon: 'none' })
  } finally {
    leaving.value = false
  }
}

// 发帖
function showCreatePanel() {
  showPostPanel.value = true
}

function hideCreatePanel() {
  showPostPanel.value = false
}

function chooseImage() {
  const remain = 9 - postImages.value.length
  if (remain <= 0) {
    uni.showToast({ title: '最多9张图片', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      postImages.value.push(...(res.tempFilePaths || []))
    },
  })
}

function removeImage(idx: number) {
  postImages.value.splice(idx, 1)
}

async function submitPost() {
  const content = postContent.value.trim()
  if (!content || submitting.value) return
  submitting.value = true
  try {
    const data: Record<string, any> = { content, type: 'TEXT' }
    if (postTitle.value.trim()) data.title = postTitle.value.trim()
    if (postImages.value.length > 0) {
      data.images = postImages.value
      data.type = 'IMAGE'
    }
    await circleApi.createPost(id.value, data)
    uni.showToast({ title: '发布成功', icon: 'success' })

    postTitle.value = ''
    postContent.value = ''
    postImages.value = []
    showPostPanel.value = false

    postPage.value = 1
    hasMorePosts.value = true
    await fetchPosts(true)

    if (circle.value) {
      circle.value.postCount = (circle.value.postCount || 0) + 1
    }
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || '发布失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// 点赞
async function toggleLike(post: CirclePostItem) {
  const prevLiked = post.isLiked
  const prevCount = post.likeCount || 0
  post.isLiked = !post.isLiked
  post.likeCount = prevCount + (post.isLiked ? 1 : -1)
  try {
    await interactApi.toggleLike('circle_post', post.id)
  } catch {
    post.isLiked = prevLiked
    post.likeCount = prevCount
  }
}

// 跳转
function goPostDetail(post: CirclePostItem) {
  uni.navigateTo({
    url: `/pages/circles/post-detail?id=${post.id}&circleId=${id.value}`,
  })
}

function goAnnouncement() {
  uni.navigateTo({
    url: `/pages/circles/announcement-detail?circleId=${id.value}`,
  })
}

function openBotChat() {
  uni.navigateTo({ url: `/pages/circles/circle-bots?id=${id.value}` })
}

function sharePost(post: CirclePostItem) {
  uni.setClipboardData({
    data: `我在「${circle.value?.name}」分享了帖子：${post.title || post.content?.slice(0, 30)}`,
    success: () => uni.showToast({ title: '已复制分享文本', icon: 'success' }),
  })
}

function previewImages(images: string[], idx: number) {
  uni.previewImage({ current: images[idx], urls: images })
}

function goBack() {
  uni.navigateBack()
}

function formatCount(n: number | undefined): string {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return ''
  try {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return minutes + '分钟前'
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return hours + '小时前'
    const days = Math.floor(hours / 24)
    if (days < 7) return days + '天前'
    return timeStr.slice(0, 10)
  } catch {
    return timeStr.slice(0, 10)
  }
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

/* ===== 圈顶信息 ===== */
.circle-header {
  background: #fff;
  position: relative;
}
.ch-bg {
  position: relative;
  height: 240rpx;
  overflow: hidden;
}
.ch-cover {
  width: 100%;
  height: 100%;
}
.ch-cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ch-placeholder-icon {
  font-size: 96rpx;
  color: rgba(255, 255, 255, 0.4);
  font-weight: bold;
}
.ch-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80rpx;
  background: linear-gradient(transparent, #fff);
}

.ch-content {
  padding: 0 24rpx 24rpx;
  margin-top: -60rpx;
  position: relative;
  z-index: 2;
}
.ch-avatar-row {
  display: flex;
  align-items: flex-end;
  gap: 20rpx;
  margin-bottom: 16rpx;
}
.ch-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 24rpx;
  border: 4rpx solid #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}
.ch-avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 24rpx;
  border: 4rpx solid #fff;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: #fff;
  font-weight: bold;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}
.ch-text {
  flex: 1;
  padding-bottom: 8rpx;
}
.ch-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #2C2C2C;
  display: block;
}
.ch-tags {
  display: flex;
  gap: 8rpx;
  margin-top: 8rpx;
  flex-wrap: wrap;
}
.ch-tag {
  font-size: 20rpx;
  color: #C41E3A;
  background: #fef0f0;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.ch-intro {
  font-size: 26rpx;
  color: #888;
  display: block;
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.ch-stats {
  display: flex;
  gap: 48rpx;
  margin-bottom: 20rpx;
}
.ch-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ch-stat-num {
  font-size: 32rpx;
  font-weight: bold;
  color: #C41E3A;
}
.ch-stat-label {
  font-size: 22rpx;
  color: #999;
}

.ch-actions {
  display: flex;
  gap: 16rpx;
}
.ch-btn {
  flex: 1;
  height: 72rpx;
  border-radius: 36rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ch-btn.join {
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(196, 30, 58, 0.25);
}
.ch-btn.join:active {
  opacity: 0.9;
}
.ch-btn.leave {
  background: #F5F0E8;
  color: #999;
  border: 1rpx solid #E8E0D5;
}
.ch-btn:disabled {
  opacity: 0.6;
}

/* ===== 公告横幅 ===== */
.announcement-bar {
  background: #fff;
  margin: 16rpx 24rpx 0;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  border: 1rpx solid #F5F0E8;
}
.announcement-icon {
  font-size: 32rpx;
  flex-shrink: 0;
}
.announcement-text {
  flex: 1;
  font-size: 24rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.announcement-arrow {
  font-size: 32rpx;
  color: #ccc;
  flex-shrink: 0;
}

/* ===== 通用区块 ===== */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 24rpx 16rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #2C2C2C;
}
.section-more {
  font-size: 24rpx;
  color: #C9A96E;
}

/* ===== 精华帖子 ===== */
.essence-section {
  margin: 0 0 8rpx;
}
.essence-scroll {
  white-space: nowrap;
  padding: 0 24rpx;
}
.essence-card {
  display: inline-flex;
  flex-direction: column;
  width: 280rpx;
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  margin-right: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.ec-cover {
  height: 160rpx;
  overflow: hidden;
  background: #f0e8d8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ec-img {
  width: 100%;
  height: 100%;
}
.ec-cover-placeholder text {
  font-size: 40rpx;
}
.ec-info {
  padding: 12rpx;
}
.ec-author {
  font-size: 20rpx;
  color: #C41E3A;
  display: block;
  margin-bottom: 4rpx;
}
.ec-title {
  font-size: 24rpx;
  color: #2C2C2C;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6rpx;
}
.ec-stats {
  display: flex;
  gap: 12rpx;
  font-size: 20rpx;
  color: #999;
}

/* ===== 帖子列表 ===== */
.post-section {
  margin-top: 8rpx;
}
.post-list {
  padding: 0 24rpx;
}
.post-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.post-card:active {
  transform: scale(0.99);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.post-user-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.post-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.post-user-meta {
  display: flex;
  flex-direction: column;
}
.post-user {
  font-size: 26rpx;
  font-weight: 500;
  color: #C41E3A;
}
.post-time {
  font-size: 22rpx;
  color: #ccc;
}
.post-badges {
  display: flex;
  gap: 6rpx;
}
.badge {
  font-size: 20rpx;
  padding: 2rpx 14rpx;
  border-radius: 12rpx;
}
.badge.top {
  color: #C41E3A;
  background: #fde8e8;
}
.badge.essence {
  color: #C9A96E;
  background: #fdf5e6;
}

.post-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #2C2C2C;
  display: block;
  margin-bottom: 8rpx;
}
.post-body {
  font-size: 26rpx;
  color: #555;
  line-height: 1.7;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.post-images {
  display: flex;
  gap: 8rpx;
  margin-top: 12rpx;
  position: relative;
}
.post-img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.post-img-more {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 200rpx;
  height: 200rpx;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: bold;
  border-radius: 8rpx;
}

.post-footer {
  display: flex;
  gap: 32rpx;
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #F5F0E8;
}
.footer-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  color: #999;
}
.footer-count {
  font-size: 24rpx;
}

/* ===== FAB按钮 ===== */
.post-fab {
  position: fixed;
  right: 32rpx;
  bottom: 100rpx;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.fab-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.3);
}
.fab-text {
  font-size: 22rpx;
  color: #C41E3A;
  font-weight: 500;
}

.bot-fab {
  position: fixed;
  right: 32rpx;
  bottom: 220rpx;
  z-index: 100;
}
.bot-fab-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #C9A96E, #b8943e);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(201, 169, 110, 0.35);
}

/* ===== 发帖弹窗 ===== */
.post-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}
.post-panel {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
  max-height: 80vh;
  overflow-y: auto;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.panel-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #2C2C2C;
}
.panel-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.panel-char-count {
  font-size: 22rpx;
  color: #ccc;
}
.panel-submit-btn {
  font-size: 24rpx;
  color: #fff;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  padding: 10rpx 28rpx;
  border-radius: 28rpx;
  border: none;
  font-weight: 500;
}
.panel-submit-btn:disabled {
  opacity: 0.4;
}
.panel-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.post-title-input {
  width: 100%;
  height: 64rpx;
  border: 1rpx solid #E8E0D5;
  border-radius: 10rpx;
  padding: 0 16rpx;
  font-size: 28rpx;
  color: #2C2C2C;
  box-sizing: border-box;
  margin-bottom: 12rpx;
}
.post-content-input {
  width: 100%;
  min-height: 200rpx;
  border: 1rpx solid #E8E0D5;
  border-radius: 10rpx;
  padding: 16rpx;
  font-size: 28rpx;
  color: #2C2C2C;
  box-sizing: border-box;
}

.panel-images {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
  flex-wrap: wrap;
}
.panel-img-wrap {
  position: relative;
  width: 140rpx;
  height: 140rpx;
}
.panel-img {
  width: 100%;
  height: 100%;
  border-radius: 10rpx;
}
.panel-img-remove {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 32rpx;
  height: 32rpx;
  background: #C41E3A;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 30rpx;
  font-size: 24rpx;
  font-weight: bold;
}

.panel-tools {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F5F0E8;
}
.panel-tool {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 28rpx;
  color: #C41E3A;
}
.panel-tool-text {
  font-size: 24rpx;
}

/* ===== 通用 ===== */
.load-more {
  text-align: center;
  color: #C9A96E;
  padding: 24rpx 0;
  font-size: 26rpx;
}
.no-more {
  text-align: center;
  color: #ccc;
  padding: 24rpx 0;
  font-size: 24rpx;
}
</style>
