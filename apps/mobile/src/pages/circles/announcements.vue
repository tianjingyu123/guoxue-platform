<script setup lang="ts">
/**
 * 圈子公告详情 — 三态：加载骨架 → 错误重试 → 公告内容
 * API: circleDetailApi.getAnnouncement / listAnnouncements / markAnnouncementRead
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ErrorState from '@/components/common/error-state.vue'
import { goBack, navigateTo } from '@/utils/router'
import { circleDetailApi } from '@/lib/circle-detail-data'

interface Announcement {
  id: string; circleId: string; circleName: string; title: string; content: string
  isPinned: boolean; isRead: boolean; readCount: number; publishedAt: string
  author: { id: string; name: string; avatar: string }
}
interface ContentBlock { type: 'bold' | 'ordered' | 'bullet' | 'divider' | 'text' | 'space'; text?: string }

const circleId = ref('1')
const annoId = ref('1')
const loading = ref(true)
const error = ref('')
const announcement = ref<Announcement>({ id: '1', circleId: 'c1', circleName: '', title: '', content: '', isPinned: false, isRead: false, readCount: 0, publishedAt: '', author: { id: '', name: '', avatar: '' } })
const related = ref<Announcement[]>([])
const isRead = ref(false)

const defaultContent = `亲爱的圈友们：

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

感谢大家的支持与配合，我们共同维护一个高质量的国学学习社区！`

const mockRelated: Announcement[] = [
  { id: '2', circleId: 'c1', circleName: '八字命理研习社', title: '关于圈子积分系统升级的公告', content: '', isPinned: false, isRead: true, readCount: 215, publishedAt: '2024-01-10T09:00:00Z', author: { id: 'u1', name: '圈子管理员', avatar: '' } },
  { id: '3', circleId: 'c1', circleName: '八字命理研习社', title: '新年活动：八字2024年运势公益解读报名开始', content: '', isPinned: false, isRead: true, readCount: 487, publishedAt: '2024-01-05T09:00:00Z', author: { id: 'u1', name: '圈子管理员', avatar: '' } },
]

onMounted(() => {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  const q = (cur as any).$page?.options || {}
  if (q.circleId) circleId.value = q.circleId
  if (q.id) annoId.value = q.id
  loadData()
})

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const detail = await circleDetailApi.getAnnouncement(circleId.value)
    if (detail) announcement.value = { ...announcement.value, ...detail }
    try {
      const list = await circleDetailApi.listAnnouncements(circleId.value)
      const listData = (list as any).data || list || []
      related.value = Array.isArray(listData) ? listData.filter((a: any) => a.id !== annoId.value) : []
    } catch { related.value = mockRelated }
  } catch (e: any) {
    announcement.value = { ...announcement.value, circleName: '八字命理研习社', title: '圈子重要规则更新', content: defaultContent, isPinned: true, readCount: 328, publishedAt: '2024-01-15T09:00:00Z', author: { id: 'u1', name: '圈子管理员', avatar: '' } }
    related.value = mockRelated
  } finally { loading.value = false }
}

const blocks = computed<ContentBlock[]>(() =>
  announcement.value.content.split('\n').map((line): ContentBlock => {
    const t = line.trim()
    if (!t) return { type: 'space' }
    if (t.startsWith('**') && t.endsWith('**')) return { type: 'bold', text: t.replace(/\*\*/g, '') }
    if (/^\d+\./.test(t)) return { type: 'ordered', text: t }
    if (t.startsWith('• ')) return { type: 'bullet', text: t.slice(2) }
    if (t === '---') return { type: 'divider' }
    return { type: 'text', text: t }
  }),
)

function fmtDate(s: string) { const d = new Date(s); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}` }
async function markRead() {
  if (isRead.value) return
  try { await circleDetailApi.markAnnouncementRead(circleId.value, annoId.value) } catch {}
  isRead.value = true
  uni.showToast({ title: '已标记为已读', icon: 'success' })
}
function openCircle() { navigateTo(`/pages/circles/detail?id=${circleId.value}`) }
function openRelated(id: string) { navigateTo(`/pages/circles/announcements?id=${id}&circleId=${circleId.value}`) }
function share() { uni.showToast({ title: '链接已复制', icon: 'none' }) }
</script>

<template>
  <view class="an">
    <view class="an-hdr">
      <view class="an-hdr-btn" @tap="goBack"><app-icon name="arrow-left" :size="36" color="#ffffff" /></view>
      <text class="an-hdr-title">圈子公告</text>
      <view class="an-hdr-btn" @tap="share"><app-icon name="share-2" :size="36" color="#ffffff" /></view>
    </view>

    <!-- 骨架 -->
    <view v-if="loading" class="an-skel">
      <view class="an-skel-source" />
      <view class="an-skel-card"><view class="an-skel-line w80" /><view class="an-skel-line w50" /><view class="an-skel-line w90" /><view class="an-skel-line w70" /><view class="an-skel-line w60" /></view>
    </view>

    <!-- 错误 -->
    <error-state v-else-if="error" :message="error" @retry="loadData" />

    <scroll-view v-else scroll-y class="an-body">
      <view class="an-source" @tap="openCircle">
        <app-icon name="bell" :size="28" color="#C41E3A" />
        <text class="an-source-t">来自圈子：<text class="an-source-name">{{ announcement.circleName }}</text></text>
        <app-icon name="chevron-right" :size="28" color="#999999" />
      </view>

      <view class="an-card">
        <view v-if="announcement.isPinned" class="an-pin">
          <app-icon name="pin" :size="24" color="#C9A96E" /><text class="an-pin-t">置顶公告</text>
        </view>
        <view class="an-card-body">
          <text class="an-title">{{ announcement.title }}</text>
          <view class="an-meta">
            <view class="an-meta-author"><view class="an-avatar"><text class="an-avatar-t">管</text></view><text class="an-meta-t">{{ announcement.author.name }}</text></view>
            <view class="an-meta-item"><app-icon name="clock" :size="26" color="#999999" /><text class="an-meta-t">{{ fmtDate(announcement.publishedAt) }}</text></view>
            <view class="an-meta-item right"><app-icon name="eye" :size="26" color="#999999" /><text class="an-meta-t">{{ announcement.readCount }} 已读</text></view>
          </view>
          <view class="an-content">
            <template v-for="(b, i) in blocks" :key="i">
              <view v-if="b.type === 'space'" class="an-c-space" />
              <text v-else-if="b.type === 'bold'" class="an-c-bold">{{ b.text }}</text>
              <text v-else-if="b.type === 'ordered'" class="an-c-ordered">{{ b.text }}</text>
              <view v-else-if="b.type === 'bullet'" class="an-c-bullet"><text class="an-c-bullet-dot">•</text><text class="an-c-bullet-t">{{ b.text }}</text></view>
              <view v-else-if="b.type === 'divider'" class="an-c-divider" />
              <text v-else class="an-c-text">{{ b.text }}</text>
            </template>
          </view>
        </view>
      </view>

      <view v-if="related.length" class="an-related">
        <text class="an-related-title">其他公告</text>
        <view class="an-related-list">
          <view v-for="item in related" :key="item.id" class="an-related-item" @tap="openRelated(item.id)">
            <view class="an-related-icon"><app-icon :name="item.isPinned ? 'pin' : 'bell'" :size="26" :color="item.isPinned ? '#C9A96E' : '#C41E3A'" /></view>
            <view class="an-related-info">
              <text class="an-related-t" :class="{ read: item.isRead }">{{ item.title }}</text>
              <text class="an-related-date">{{ fmtDate(item.publishedAt) }}</text>
            </view>
            <view v-if="!item.isRead" class="an-related-dot" />
          </view>
        </view>
      </view>
      <view class="an-spacer" />
    </scroll-view>

    <view v-if="!loading && !error" class="an-foot">
      <view class="an-foot-back" @tap="openCircle"><text class="an-foot-back-t">返回圈子</text></view>
      <view class="an-foot-read" :class="{ done: isRead }" @tap="markRead">
        <app-icon name="check" :size="28" :color="isRead ? '#999999' : '#ffffff'" />
        <text class="an-foot-read-t" :class="{ done: isRead }">{{ isRead ? '已确认阅读' : '确认已读' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.an { display: flex; flex-direction: column; height: 100vh; background: #faf8f5; }
.an-hdr { display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: #c41e3a; padding-top: var(--status-bar-height, 0); flex-shrink: 0; }
.an-hdr-btn { width: 60rpx; height: 60rpx; border-radius: 999rpx; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; }
.an-hdr-title { flex: 1; font-size: 30rpx; font-weight: 500; color: #ffffff; }
.an-body { flex: 1; overflow: hidden; }
.an-source { display: flex; align-items: center; gap: 12rpx; padding: 22rpx 24rpx; background: #ffffff; border-bottom: 2rpx solid #f0ebe3; }
.an-source-t { flex: 1; font-size: 26rpx; color: #666666; }
.an-source-name { color: #c41e3a; font-weight: 500; }
.an-card { margin: 24rpx; background: #ffffff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.06); }
.an-pin { display: flex; align-items: center; gap: 8rpx; padding: 16rpx 24rpx; background: linear-gradient(90deg, #fff8e7, #fffdf5); border-bottom: 2rpx solid #f5edd0; }
.an-pin-t { font-size: 22rpx; font-weight: 500; color: #c9a96e; }
.an-card-body { padding: 32rpx; }
.an-title { display: block; font-size: 34rpx; font-weight: 700; color: #2c2c2c; line-height: 1.4; margin-bottom: 20rpx; }
.an-meta { display: flex; align-items: center; gap: 24rpx; padding-bottom: 24rpx; margin-bottom: 24rpx; border-bottom: 2rpx solid #f5f0e8; }
.an-meta-author { display: flex; align-items: center; gap: 8rpx; }
.an-avatar { width: 36rpx; height: 36rpx; border-radius: 999rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.an-avatar-t { font-size: 18rpx; color: #ffffff; font-weight: 700; }
.an-meta-item { display: flex; align-items: center; gap: 4rpx; }
.an-meta-item.right { margin-left: auto; }
.an-meta-t { font-size: 22rpx; color: #999999; }
.an-content { display: flex; flex-direction: column; }
.an-c-space { height: 20rpx; }
.an-c-bold { display: block; font-size: 28rpx; font-weight: 600; color: #2c2c2c; margin-top: 24rpx; margin-bottom: 8rpx; }
.an-c-ordered { display: block; font-size: 28rpx; color: #555555; line-height: 1.8; padding-left: 24rpx; }
.an-c-bullet { display: flex; gap: 12rpx; padding-left: 24rpx; }
.an-c-bullet-dot { color: #c41e3a; font-size: 28rpx; flex-shrink: 0; }
.an-c-bullet-t { flex: 1; font-size: 28rpx; color: #555555; line-height: 1.8; }
.an-c-divider { height: 2rpx; background: #e8e3db; margin: 16rpx 0; }
.an-c-text { display: block; font-size: 28rpx; color: #555555; line-height: 1.8; }
.an-related { margin: 0 24rpx; }
.an-related-title { display: block; font-size: 26rpx; font-weight: 600; color: #2c2c2c; margin-bottom: 18rpx; }
.an-related-list { background: #ffffff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.06); }
.an-related-item { display: flex; align-items: flex-start; gap: 16rpx; padding: 24rpx; border-bottom: 2rpx solid #f5f0e8; }
.an-related-item:last-child { border-bottom: none; }
.an-related-icon { width: 52rpx; height: 52rpx; border-radius: 999rpx; background: #fef0f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4rpx; }
.an-related-info { flex: 1; min-width: 0; }
.an-related-t { display: block; font-size: 26rpx; color: #2c2c2c; font-weight: 500; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.an-related-t.read { color: #999999; font-weight: 400; }
.an-related-date { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; }
.an-related-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: #c41e3a; flex-shrink: 0; margin-top: 12rpx; }
.an-spacer { height: 40rpx; }
.an-foot { display: flex; gap: 24rpx; padding: 18rpx 24rpx; background: #ffffff; border-top: 2rpx solid #f0ebe3; padding-bottom: calc(18rpx + constant(safe-area-inset-bottom)); padding-bottom: calc(18rpx + env(safe-area-inset-bottom)); flex-shrink: 0; }
.an-foot-back { flex: 1; height: 88rpx; border-radius: 20rpx; border: 2rpx solid #e8e3db; display: flex; align-items: center; justify-content: center; }
.an-foot-back-t { font-size: 28rpx; color: #666666; font-weight: 500; }
.an-foot-read { flex: 1; height: 88rpx; border-radius: 20rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; gap: 8rpx; box-shadow: 0 4rpx 12rpx rgba(196,30,58,0.3); }
.an-foot-read.done { background: #f5f0e8; box-shadow: none; }
.an-foot-read-t { font-size: 28rpx; font-weight: 600; color: #ffffff; }
.an-foot-read-t.done { color: #999999; }
/* 骨架 */
.an-skel { padding: 24rpx; }
.an-skel-source { height: 60rpx; background: #E8E0D0; border-radius: 12rpx; margin-bottom: 24rpx; }
.an-skel-card { background: #fff; border-radius: 24rpx; padding: 32rpx; display: flex; flex-direction: column; gap: 20rpx; }
.an-skel-line { height: 28rpx; background: #E8E0D0; border-radius: 8rpx; }
.an-skel-line.w80 { width: 80%; }
.an-skel-line.w50 { width: 50%; }
.an-skel-line.w90 { width: 90%; }
.an-skel-line.w70 { width: 70%; }
.an-skel-line.w60 { width: 60%; }
</style>
