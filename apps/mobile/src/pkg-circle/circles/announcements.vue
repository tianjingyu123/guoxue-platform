<script setup lang="ts">
/**
 * 圈子公告详情（从原型 app/circles/[id]/announcements/[annoId]/page.tsx 高保真迁移）
 * 故宫红顶栏 + 圈子来源 + 置顶标识 + 富文本正文(块解析) + 其他公告 + 底部确认已读栏
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { goBack, navigateTo } from '@/utils/router'
import { shareLink } from '@/utils/share'
import { apiGet, apiPost } from '@/utils/request'

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

interface ContentBlock {
  type: 'bold' | 'ordered' | 'bullet' | 'divider' | 'text' | 'space'
  text?: string
}

/** 后端 CircleAnnouncement 原始项（GET /circles/:id/announcement | /announcements） */
interface RawAnnouncement {
  id?: string
  content?: string
  isTop?: boolean
  createdAt?: string
  user?: { id?: string; nickname?: string; avatar?: string } | null
}

const circleId = ref('')
const circleName = ref('')
const announcement = ref<Announcement | null>(null)
const related = ref<Announcement[]>([])
const isRead = ref(false)
const loading = ref(true)

/** 公告无独立标题字段，取正文首个非空行作标题，剩余作正文 */
function deriveTitle(content: string): { title: string; body: string } {
  const lines = content.split('\n')
  const idx = lines.findIndex((l) => l.trim())
  if (idx < 0) return { title: '圈子公告', body: content }
  const title = lines[idx].trim().replace(/\*\*/g, '').replace(/^#+\s*/, '').replace(/[:：]$/, '').slice(0, 40)
  const body = lines.slice(idx + 1).join('\n').trim()
  return { title, body: body || content }
}

function adapt(raw: RawAnnouncement, splitTitle: boolean): Announcement {
  const content = raw.content || ''
  const { title, body } = deriveTitle(content)
  return {
    id: String(raw.id || ''),
    circleId: circleId.value,
    circleName: circleName.value,
    title,
    content: splitTitle ? body : content,
    isPinned: !!raw.isTop,
    isRead: true, // 后端未返回逐条已读态，列表项默认不显示未读点
    readCount: 0, // 后端未返回已读数
    publishedAt: raw.createdAt || '',
    author: { id: raw.user?.id || '', name: raw.user?.nickname || '圈子管理员', avatar: raw.user?.avatar || '' },
  }
}

async function load() {
  loading.value = true
  try {
    if (!circleId.value) { announcement.value = null; return }
    const [circle, main, listResp] = await Promise.all([
      apiGet<{ name?: string; circle?: { name?: string } }>(`/circles/${circleId.value}`).catch(() => null),
      apiGet<RawAnnouncement>(`/circles/${circleId.value}/announcement`).catch(() => null),
      apiGet<{ list?: RawAnnouncement[] }>(`/circles/${circleId.value}/announcements?page=1&pageSize=10`).catch(() => null),
    ])
    circleName.value = circle?.name || circle?.circle?.name || '本圈'
    if (main?.content) {
      announcement.value = adapt(main, true)
      isRead.value = false
    } else {
      announcement.value = null
    }
    const mainId = announcement.value?.id
    related.value = (listResp?.list || [])
      .filter((a) => a?.content && String(a.id || '') !== mainId)
      .map((a) => adapt(a, false))
  } catch {
    announcement.value = null
  } finally {
    loading.value = false
  }
}

onLoad((q) => {
  if (q?.circleId) circleId.value = String(q.circleId)
})
onMounted(load)

// 富文本块解析（替代 dangerouslySetInnerHTML，跨端安全）
const blocks = computed<ContentBlock[]>(() => {
  const content = announcement.value?.content || ''
  return content.split('\n').map((line): ContentBlock => {
    const t = line.trim()
    if (!t) return { type: 'space' }
    if (t.startsWith('**') && t.endsWith('**')) return { type: 'bold', text: t.replace(/\*\*/g, '') }
    if (/^\d+\./.test(t)) return { type: 'ordered', text: t }
    if (t.startsWith('• ')) return { type: 'bullet', text: t.slice(2) }
    if (t === '---') return { type: 'divider' }
    return { type: 'text', text: t }
  })
})

function fmtDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
async function markRead() {
  if (isRead.value || !announcement.value?.id) { isRead.value = true; return }
  try {
    await apiPost(`/circles/${circleId.value}/announcements/${announcement.value.id}/read`, {})
  } catch { /* 已读上报失败不阻塞 UI */ }
  isRead.value = true
  uni.showToast({ title: '已标记为已读', icon: 'success' })
}
function openCircle() { navigateTo(`/pkg-circle/circles/detail?id=${circleId.value}`) }
function openRelated(id: string) { navigateTo(`/pkg-circle/circles/announcements?id=${id}&circleId=${circleId.value}`) }
async function share() {
  await shareLink({
    title: announcement.value?.title || '圈子公告',
    text: announcement.value?.circleName ? `来自${announcement.value.circleName}` : undefined,
  })
}
</script>

<template>
  <view class="an">
    <!-- 顶栏 -->
    <view class="an-hdr">
      <view class="an-hdr-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#ffffff" /></view>
      <text class="an-hdr-title">圈子公告</text>
      <view class="an-hdr-btn" @tap="share"><app-icon name="share-2" :size="36" color="#ffffff" /></view>
    </view>

    <scroll-view scroll-y class="an-body">
      <!-- 加载态 -->
      <view v-if="loading" class="an-empty"><AppLoading /></view>

      <!-- 空态 -->
      <view v-else-if="!announcement" class="an-empty">
        <app-icon name="bell-off" :size="96" color="#d8d2c6" />
        <text class="an-empty-t">该圈子暂无公告</text>
      </view>

      <template v-else>
      <!-- 圈子来源 -->
      <view class="an-source" @tap="openCircle">
        <app-icon name="bell" :size="28" color="#C41E3A" />
        <text class="an-source-t">来自圈子：<text class="an-source-name">{{ announcement?.circleName }}</text></text>
        <app-icon name="chevron-right" :size="28" color="#999999" />
      </view>

      <!-- 主内容卡片 -->
      <view class="an-card">
        <view v-if="announcement?.isPinned" class="an-pin">
          <app-icon name="pin" :size="24" color="#C9A96E" />
          <text class="an-pin-t">置顶公告</text>
        </view>
        <view class="an-card-body">
          <text class="an-title">{{ announcement?.title }}</text>
          <!-- 元信息 -->
          <view class="an-meta">
            <view class="an-meta-author">
              <view class="an-avatar"><text class="an-avatar-t">管</text></view>
              <text class="an-meta-t">{{ announcement?.author?.name }}</text>
            </view>
            <view v-if="announcement?.publishedAt" class="an-meta-item">
              <app-icon name="clock" :size="26" color="#999999" />
              <text class="an-meta-t">{{ fmtDate(announcement?.publishedAt || '') }}</text>
            </view>
            <view v-if="(announcement?.readCount ?? 0) > 0" class="an-meta-item right">
              <app-icon name="eye" :size="26" color="#999999" />
              <text class="an-meta-t">{{ announcement?.readCount }} 已读</text>
            </view>
          </view>
          <!-- 富文本正文 -->
          <view class="an-content">
            <template v-for="(b, i) in blocks" :key="i">
              <view v-if="b.type === 'space'" class="an-c-space" />
              <text v-else-if="b.type === 'bold'" class="an-c-bold">{{ b.text }}</text>
              <text v-else-if="b.type === 'ordered'" class="an-c-ordered">{{ b.text }}</text>
              <view v-else-if="b.type === 'bullet'" class="an-c-bullet">
                <text class="an-c-bullet-dot">•</text><text class="an-c-bullet-t">{{ b.text }}</text>
              </view>
              <view v-else-if="b.type === 'divider'" class="an-c-divider" />
              <text v-else class="an-c-text">{{ b.text }}</text>
            </template>
          </view>
        </view>
      </view>

      <!-- 其他公告 -->
      <view v-if="related.length" class="an-related">
        <text class="an-related-title">其他公告</text>
        <view class="an-related-list">
          <view v-for="item in related" :key="item.id" class="an-related-item" @tap="openRelated(item.id)">
            <view class="an-related-icon">
              <app-icon :name="item.isPinned ? 'pin' : 'bell'" :size="26" :color="item.isPinned ? '#C9A96E' : '#C41E3A'" />
            </view>
            <view class="an-related-info">
              <text class="an-related-t" :class="{ read: item.isRead }">{{ item.title }}</text>
              <text class="an-related-date">{{ fmtDate(item.publishedAt) }}</text>
            </view>
            <view v-if="!item.isRead" class="an-related-dot" />
          </view>
        </view>
      </view>
      <view class="an-spacer" />
      </template>
    </scroll-view>

    <!-- 底部确认已读栏 -->
    <view v-if="announcement" class="an-foot">
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
.an-hdr { display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: var(--brand); padding-top: var(--status-bar-height, 0); flex-shrink: 0; }
.an-hdr-btn { width: 60rpx; height: 60rpx; border-radius: 999rpx; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; }
.an-hdr-title { flex: 1; font-size: 30rpx; font-weight: 500; color: #ffffff; }
.an-body { flex: 1; overflow: hidden; }
.an-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 200rpx 0; }
.an-empty-t { font-size: 28rpx; color: #999999; }
.an-source { display: flex; align-items: center; gap: 12rpx; padding: 22rpx 24rpx; background: #ffffff; border-bottom: 2rpx solid #f0ebe3; }
.an-source-t { flex: 1; font-size: 26rpx; color: #666666; }
.an-source-name { color: var(--brand); font-weight: 500; }
.an-card { margin: 24rpx; background: #ffffff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.06); }
.an-pin { display: flex; align-items: center; gap: 8rpx; padding: 16rpx 24rpx; background: linear-gradient(90deg, #fff8e7, #fffdf5); border-bottom: 2rpx solid #f5edd0; }
.an-pin-t { font-size: 22rpx; font-weight: 500; color: #c9a96e; }
.an-card-body { padding: 32rpx; }
.an-title { display: block; font-size: 34rpx; font-weight: 700; color: #2c2c2c; line-height: 1.4; margin-bottom: 20rpx; }
.an-meta { display: flex; align-items: center; gap: 24rpx; padding-bottom: 24rpx; margin-bottom: 24rpx; border-bottom: 2rpx solid #f5f0e8; }
.an-meta-author { display: flex; align-items: center; gap: 8rpx; }
.an-avatar { width: 36rpx; height: 36rpx; border-radius: 999rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.an-avatar-t { font-size: 18rpx; color: #ffffff; font-weight: 700; }
.an-meta-item { display: flex; align-items: center; gap: 4rpx; }
.an-meta-item.right { margin-left: auto; }
.an-meta-t { font-size: 22rpx; color: #999999; }
.an-content { display: flex; flex-direction: column; }
.an-c-space { height: 20rpx; }
.an-c-bold { display: block; font-size: 28rpx; font-weight: 600; color: #2c2c2c; margin-top: 24rpx; margin-bottom: 8rpx; }
.an-c-ordered { display: block; font-size: 28rpx; color: #555555; line-height: 1.8; padding-left: 24rpx; }
.an-c-bullet { display: flex; gap: 12rpx; padding-left: 24rpx; }
.an-c-bullet-dot { color: var(--brand); font-size: 28rpx; flex-shrink: 0; }
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
.an-related-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: var(--brand); flex-shrink: 0; margin-top: 12rpx; }
.an-spacer { height: 40rpx; }
.an-foot { display: flex; gap: 24rpx; padding: 18rpx 24rpx; background: #ffffff; border-top: 2rpx solid #f0ebe3; padding-bottom: calc(18rpx + constant(safe-area-inset-bottom)); padding-bottom: calc(18rpx + env(safe-area-inset-bottom)); flex-shrink: 0; }
.an-foot-back { flex: 1; height: 88rpx; border-radius: 20rpx; border: 2rpx solid #e8e3db; display: flex; align-items: center; justify-content: center; }
.an-foot-back-t { font-size: 28rpx; color: #666666; font-weight: 500; }
.an-foot-read { flex: 1; height: 88rpx; border-radius: 20rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; gap: 8rpx; box-shadow: 0 4rpx 12rpx rgba(196,30,58,0.3); }
.an-foot-read.done { background: #f5f0e8; box-shadow: none; }
.an-foot-read-t { font-size: 28rpx; font-weight: 600; color: #ffffff; }
.an-foot-read-t.done { color: #999999; }
</style>
