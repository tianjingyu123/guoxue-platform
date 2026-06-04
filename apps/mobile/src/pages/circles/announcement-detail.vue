<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="header-bar">
      <view
        class="header-left"
        @click="goBack"
      >
        <text class="header-icon">
          ←
        </text>
      </view>
      <text class="header-title">
        圈子公告
      </text>
      <view
        class="header-right"
        @click="handleShare"
      >
        <text class="header-icon">
          ↗
        </text>
      </view>
    </view>

    <view
      v-if="isLoading"
      class="skeleton-wrap"
    >
      <view class="skeleton-line w-3/4" />
      <view class="skeleton-line w-1/3" />
      <view
        v-for="i in 5"
        :key="i"
        class="skeleton-block"
      />
    </view>

    <template v-else-if="announcement">
      <!-- 圈子来源标签 -->
      <view
        class="source-bar"
        @click="goCircle"
      >
        <text class="source-icon">
          🔔
        </text>
        <text class="source-text">
          来自圈子：<text class="source-name">
            {{ announcement.circleName }}
          </text>
        </text>
        <text class="source-arrow">
          ›
        </text>
      </view>

      <!-- 主内容卡片 -->
      <view class="content-card">
        <!-- 置顶标识 -->
        <view
          v-if="announcement.isPinned"
          class="pinned-bar"
        >
          <text class="pinned-icon">
            📌
          </text>
          <text class="pinned-text">
            置顶公告
          </text>
        </view>

        <view class="content-body">
          <!-- 标题 -->
          <text class="content-title">
            {{ announcement.title }}
          </text>

          <!-- 元信息 -->
          <view class="meta-row">
            <view class="meta-author">
              <view
                v-if="announcement.author.avatar"
                class="avatar-small"
              >
                <image
                  :src="announcement.author.avatar"
                  mode="aspectFill"
                  class="avatar-img"
                />
              </view>
              <view
                v-else
                class="avatar-small avatar-fallback"
              >
                <text class="avatar-fallback-text">
                  管
                </text>
              </view>
              <text class="meta-name">
                {{ announcement.author.name }}
              </text>
            </view>
            <view class="meta-item">
              <text class="meta-icon">
                🕐
              </text>
              <text class="meta-label">
                {{ formatDate(announcement.publishedAt) }}
              </text>
            </view>
            <view class="meta-item ml-auto">
              <text class="meta-icon">
                👁
              </text>
              <text class="meta-label">
                {{ announcement.readCount }} 已读
              </text>
            </view>
          </view>

          <!-- 正文 -->
          <view class="rich-content">
            <view
              v-for="(line, i) in contentLines"
              :key="i"
            >
              <view
                v-if="!line.trim()"
                class="rich-space"
              />
              <text
                v-else-if="isBoldTitle(line)"
                class="rich-title"
              >
                {{ stripBold(line) }}
              </text>
              <view
                v-else-if="isNumberedList(line)"
                class="rich-list-item"
              >
                <text class="rich-list-text">
                  {{ line }}
                </text>
              </view>
              <view
                v-else-if="isBulletList(line)"
                class="rich-bullet-item"
              >
                <text class="rich-bullet-dot">
                  •
                </text>
                <text class="rich-bullet-text">
                  {{ line.slice(2) }}
                </text>
              </view>
              <view
                v-else-if="isDivider(line)"
                class="rich-divider"
              />
              <text
                v-else
                class="rich-paragraph"
              >
                {{ line }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 相关公告 -->
      <view
        v-if="related.length > 0"
        class="related-section"
      >
        <text class="related-title">
          其他公告
        </text>
        <view class="related-list">
          <view
            v-for="item in related"
            :key="item.id"
            class="related-item"
            @click="goAnnouncement(item.id)"
          >
            <view class="related-icon-wrap">
              <text
                v-if="item.isPinned"
                class="related-icon"
              >
                📌
              </text>
              <text
                v-else
                class="related-icon bell"
              >
                🔔
              </text>
            </view>
            <view class="related-info">
              <text
                class="related-name"
                :class="{ read: item.isRead }"
              >
                {{ item.title }}
              </text>
              <text class="related-time">
                {{ formatDate(item.publishedAt) }}
              </text>
            </view>
            <view
              v-if="!item.isRead"
              class="unread-dot"
            />
          </view>
        </view>
      </view>

      <!-- 底部确认按钮 -->
      <view class="bottom-bar">
        <view class="bottom-inner">
          <view
            class="btn-back"
            @click="goCircle"
          >
            返回圈子
          </view>
          <view
            class="btn-read"
            :class="{ disabled: isRead }"
            @click="handleRead"
          >
            <text class="btn-read-icon">
              ✓
            </text>
            <text>{{ isRead ? '已确认阅读' : '确认已读' }}</text>
          </view>
        </view>
      </view>

      <!-- Toast -->
      <view
        v-if="showReadToast"
        class="toast"
      >
        {{ '✓ 已标记为已读' }}
      </view>
      <view
        v-if="showShareToast"
        class="toast"
      >
        链接已复制
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { circleApi } from '../../api'

interface Announcement {
  id: string
  circleId: string
  circleName: string
  title: string
  content: string
  isPinned: boolean
  isRead: boolean
  readCount: number
  publishedAt: string
  author: { id: string; name: string; avatar: string }
}

interface QueryParams {
  id?: string
  circleId?: string
  annoId?: string
  [key: string]: any
}

const mockAnnouncement: Announcement = {
  id: '1',
  circleId: 'c1',
  circleName: '八字命理研习社',
  title: '圈子重要规则更新：关于内容质量与互动规范的说明',
  content: `亲爱的圈友们：

为了给大家提供更好的学习交流环境，圈子管理团队经过讨论，决定对圈子规则进行更新。请各位圈友仔细阅读以下内容：

**一、内容质量要求**

1. 所有发帖须与命理、国学相关，严禁发布无关广告、营销内容；
2. 提倡原创内容，转载须注明来源，严禁直接搬运他人付费内容；
3. 对他人的命盘分析须基于专业知识，不得无依据妄下论断；
4. 鼓励图文并茂，高质量帖子将获得精华标注并获得额外积分奖励。

**二、互动规范**

1. 评论须礼貌友善，禁止人身攻击、谩骂或带有侮辱性语言；
2. 圈内讨论应基于理性分析，欢迎不同观点，但须以事实为据；
3. 私信功能须用于正当学习交流，严禁骚扰行为；
4. 发现违规内容请通过举报功能反映，切勿在评论区引战。

**三、违规处理**

• 首次违规：警告并删除违规内容
• 二次违规：禁言3天
• 三次及以上：移出圈子，严重者永久封禁

**四、新功能上线**

本周我们将上线"每周精华"评选活动，每周日由管理团队评选5篇优质帖子，作者将获得：
- 精华徽章展示
- 50积分奖励
- 优先推荐展示权益

感谢大家的支持与配合，我们共同维护一个高质量的国学学习社区！`,
  isPinned: true,
  isRead: false,
  readCount: 328,
  publishedAt: '2024-01-15T09:00:00Z',
  author: { id: 'u1', name: '圈子管理员', avatar: '' },
}

const mockRelated: Announcement[] = [
  {
    id: '2', circleId: 'c1', circleName: '八字命理研习社',
    title: '关于圈子积分系统升级的公告',
    content: '',
    isPinned: false, isRead: true, readCount: 215,
    publishedAt: '2024-01-10T09:00:00Z',
    author: { id: 'u1', name: '圈子管理员', avatar: '' },
  },
  {
    id: '3', circleId: 'c1', circleName: '八字命理研习社',
    title: '新年活动：八字2024年运势公益解读报名开始',
    content: '',
    isPinned: false, isRead: true, readCount: 487,
    publishedAt: '2024-01-05T09:00:00Z',
    author: { id: 'u1', name: '圈子管理员', avatar: '' },
  },
]

const isLoading = ref(true)
const announcement = ref<Announcement | null>(null)
const related = ref<Announcement[]>([])
const isRead = ref(false)
const showReadToast = ref(false)
const showShareToast = ref(false)
const query = ref<QueryParams>({})

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  query.value = page?.options || {}
  const circleId = query.value.circleId || query.value.id || ''
  const annoId = query.value.annoId || query.value.announcementId || ''
  await loadData(circleId, annoId)
})

async function loadData(circleId: string, annoId: string) {
  isLoading.value = true
  try {
    const [annoRes, allRes] = await Promise.all([
      circleApi.getAnnouncement(circleId),
      circleApi.listAnnouncements(circleId),
    ])
    const allList: any[] = Array.isArray(allRes) ? allRes : (allRes?.data || allRes?.list || [])
    const found = allList.find((a: any) => a.id === annoId)
    announcement.value = (found as Announcement) || mockAnnouncement
    isRead.value = found?.isRead || mockAnnouncement.isRead
    related.value = (allList.filter((a: any) => a.id !== annoId) || mockRelated).slice(0, 3)
  } catch {
    announcement.value = mockAnnouncement
    related.value = mockRelated
    isRead.value = mockAnnouncement.isRead
  } finally {
    isLoading.value = false
  }
}

const contentLines = computed(() => {
  if (!announcement.value) return []
  return announcement.value.content.split('\n')
})

function isBoldTitle(line: string) {
  return line.startsWith('**') && line.endsWith('**')
}
function stripBold(line: string) {
  return line.replace(/\*\*/g, '')
}
function isNumberedList(line: string) {
  return /^\d+\./.test(line)
}
function isBulletList(line: string) {
  return line.startsWith('• ')
}
function isDivider(line: string) {
  return line.trim() === '---'
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

async function handleRead() {
  if (isRead.value) return
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const circleId = query.value.circleId || query.value.id || ''
  const annoId = query.value.annoId || ''
  try {
    await circleApi.markAnnouncementRead?.(circleId, annoId)
  } catch { /* ignore */ }
  isRead.value = true
  showReadToast.value = true
  setTimeout(() => { showReadToast.value = false }, 2000)
}

function handleShare() {
  uni.setClipboardData({
    data: window?.location?.href || '',
    success: () => {
      showShareToast.value = true
      setTimeout(() => { showShareToast.value = false }, 2000)
    },
  })
}

function goBack() {
  uni.navigateBack()
}

function goCircle() {
  const circleId = query.value.circleId || query.value.id || ''
  if (circleId) {
    uni.navigateTo({ url: `/pages/circles/circle-detail?id=${circleId}` })
  }
}

function goAnnouncement(annoId: string) {
  const circleId = query.value.circleId || query.value.id || ''
  uni.navigateTo({ url: `/pages/circles/announcement-detail?circleId=${circleId}&annoId=${annoId}` })
}
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
  padding-bottom: 140rpx;
}

/* ===== 顶部导航 ===== */
.header-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  background: #C41E3A;
  display: flex;
  align-items: center;
  height: 112rpx;
  padding: 0 24rpx;
  gap: 16rpx;
}
.header-left, .header-right {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}
.header-icon {
  font-size: 40rpx;
  color: #fff;
}
.header-title {
  flex: 1;
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.header-right {
  margin-left: auto;
}

/* ===== 骨架屏 ===== */
.skeleton-wrap {
  padding: 32rpx 24rpx;
}
.skeleton-line {
  height: 40rpx;
  background: #F2EFEA;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}
.skeleton-line.w-3\/4 { width: 75%; }
.skeleton-line.w-1\/3 { width: 33%; }
.skeleton-block {
  height: 32rpx;
  background: #F2EFEA;
  border-radius: 8rpx;
  margin-bottom: 12rpx;
}

/* ===== 来源标签 ===== */
.source-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 2rpx solid #F0EBE3;
}
.source-icon { font-size: 28rpx; }
.source-text { flex: 1; font-size: 26rpx; color: #666; }
.source-name { color: #C41E3A; font-weight: 500; }
.source-arrow { font-size: 32rpx; color: #999; }

/* ===== 主内容卡片 ===== */
.content-card {
  margin: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 32rpx rgba(0, 0, 0, 0.06);
}
.pinned-bar {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 20rpx 32rpx;
  background: linear-gradient(to right, #FFF8E7, #FFFDF5);
  border-bottom: 2rpx solid #F5EDD0;
}
.pinned-icon { font-size: 24rpx; }
.pinned-text { font-size: 24rpx; font-weight: 500; color: #C9A96E; }

.content-body { padding: 40rpx; }
.content-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #2C2C2C;
  line-height: 1.4;
  display: block;
  margin-bottom: 24rpx;
}

/* ===== 元信息 ===== */
.meta-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-bottom: 24rpx;
  margin-bottom: 24rpx;
  border-bottom: 2rpx solid #F5F0E8;
}
.meta-author { display: flex; align-items: center; gap: 10rpx; }
.avatar-small {
  width: 40rpx; height: 40rpx; border-radius: 50%; overflow: hidden;
}
.avatar-img { width: 100%; height: 100%; }
.avatar-fallback {
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-fallback-text { font-size: 16rpx; color: #fff; font-weight: bold; }
.meta-name { font-size: 24rpx; color: #666; }
.meta-item { display: flex; align-items: center; gap: 8rpx; }
.meta-icon { font-size: 24rpx; }
.meta-label { font-size: 24rpx; color: #999; }
.ml-auto { margin-left: auto; }

/* ===== 富文本 ===== */
.rich-content {
  font-size: 30rpx;
  line-height: 2;
  color: #555;
}
.rich-space { height: 16rpx; }
.rich-title {
  font-weight: 600;
  color: #2C2C2C;
  margin-top: 32rpx;
  margin-bottom: 8rpx;
  display: block;
}
.rich-list-item {
  padding-left: 32rpx;
  color: #555;
}
.rich-list-text { font-size: 30rpx; }
.rich-bullet-item {
  display: flex;
  gap: 12rpx;
  padding-left: 32rpx;
  color: #555;
}
.rich-bullet-dot { color: #C41E3A; flex-shrink: 0; margin-top: 8rpx; }
.rich-bullet-text { font-size: 30rpx; }
.rich-divider {
  height: 2rpx;
  background: #E8E3DB;
  margin: 24rpx 0;
}
.rich-paragraph {
  display: block;
  color: #555;
}

/* ===== 相关公告 ===== */
.related-section {
  margin: 0 24rpx;
}
.related-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 20rpx;
  display: block;
}
.related-list {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 32rpx rgba(0, 0, 0, 0.06);
}
.related-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 28rpx 32rpx;
  border-bottom: 2rpx solid #F5F0E8;
}
.related-item:last-child { border-bottom: none; }
.related-icon-wrap {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #FEF0F0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}
.related-icon { font-size: 28rpx; }
.related-icon.bell { font-size: 28rpx; }
.related-info { flex: 1; min-width: 0; }
.related-name {
  font-size: 28rpx;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  color: #2C2C2C;
  font-weight: 500;
}
.related-name.read { color: #999; font-weight: normal; }
.related-time {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}
.unread-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #C41E3A;
  flex-shrink: 0;
  margin-top: 16rpx;
}

/* ===== 底部按钮 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 2rpx solid #F0EBE3;
  padding: 20rpx 32rpx;
}
.bottom-inner {
  display: flex;
  gap: 16rpx;
}
.btn-back {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 16rpx;
  border: 2rpx solid #E8E3DB;
  color: #666;
  font-size: 28rpx;
  font-weight: 500;
}
.btn-read {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 16rpx;
  background: linear-gradient(to right, #C41E3A, #E8294A);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.3);
}
.btn-read.disabled {
  background: #F5F0E8;
  color: #999;
  box-shadow: none;
}
.btn-read-icon { font-size: 28rpx; }

/* ===== Toast ===== */
.toast {
  position: fixed;
  top: 160rpx;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  background: rgba(44, 44, 44, 0.9);
  color: #fff;
  font-size: 28rpx;
  padding: 16rpx 32rpx;
  border-radius: 50rpx;
}
</style>
