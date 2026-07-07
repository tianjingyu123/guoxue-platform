<script setup lang="ts">
/**
 * V3 共读拼团 · 发起页
 * 选古籍书（onLoad 带 bookId 从书详情预填 / 无则从古籍馆列表选）→ 设目标（章节数/成团人数/天数）
 * → 建组 → 展示共读卡 + useShare 招募分享（带 token+ref）+ 复制链接。
 * 纯学习激励·无资金·R 安全。
 */
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { useShare } from '@/composables/useShare'
import { classicsApi, type RankBook } from '@/lib/classics-data'
import { sharedReadingApi, type CreateGroupResult } from '@/lib/shared-reading-data'

const { toAppMessage, toTimeline } = useShare()

const loggedIn = ref(true)

// —— 选书阶段 ——
const loading = ref(true)
const error = ref('')
const books = ref<RankBook[]>([])
const selectedBook = ref<{ id: string; title: string } | null>(null)
/** 从书详情带 bookId 预填时锁定书籍，不展示书单选择 */
const bookLocked = ref(false)

// —— 目标设置 ——
const targetChapters = ref('') // 空 = 全书
const minMembers = ref(3)
const durationDays = ref(7)
const MEMBER_OPTIONS = [3, 4, 5]
const DAY_OPTIONS = [7, 14, 21]

// —— 建组结果 ——
const submitting = ref(false)
const created = ref<CreateGroupResult | null>(null)
const createdTitle = ref('')

/** 分享落地路径（携带令牌；useShare 自动追加分享者 ref 归因） */
function sharePath(): string {
  return `/pkg-classics/shared-reading/invite?token=${created.value?.inviteToken || ''}`
}
const shareTitle = computed(() => `${durationDays.value}天共读《${createdTitle.value}》，就差你了！`)

async function loadBooks() {
  loading.value = true
  error.value = ''
  try {
    const res = await classicsApi.ranking('hot')
    books.value = res.books
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function selectBook(b: { id: string; title: string }) {
  selectedBook.value = { id: b.id, title: b.title }
}

async function onCreate() {
  if (submitting.value) return
  if (!selectedBook.value) {
    uni.showToast({ title: '请先选择一本古籍', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const tc = Number(targetChapters.value)
    const res = await sharedReadingApi.create({
      classicBookId: selectedBook.value.id,
      targetChapters: tc > 0 ? tc : undefined,
      minMembers: minMembers.value,
      maxMembers: 5,
      durationDays: durationDays.value,
    })
    createdTitle.value = selectedBook.value.title
    created.value = res
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发起失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

/** 招募分享链接：优先后端 shareUrl；缺失时按真实 H5 招募路由兜底拼接，确保他人点开能落到招募页 */
function shareLink(): string {
  if (created.value?.shareUrl) return created.value.shareUrl
  const token = created.value?.inviteToken || ''
  return `https://api.rebugx.cn/h5/#/pkg-classics/shared-reading/invite?token=${token}`
}
function copyLink() {
  const url = shareLink()
  uni.setClipboardData({
    data: url,
    success: () => uni.showToast({ title: '链接已复制，发给好友即可', icon: 'none' }),
  })
}

function goDetail() {
  if (created.value?.groupId) {
    navigateTo(`/pkg-classics/shared-reading/detail?id=${created.value.groupId}`)
  }
}

onLoad((q: Record<string, string> = {}) => {
  loggedIn.value = !!getToken()
  if (q.bookId) {
    selectedBook.value = { id: String(q.bookId), title: q.bookTitle ? decodeURIComponent(q.bookTitle) : '古籍' }
    bookLocked.value = true
    loading.value = false
    return
  }
  if (!loggedIn.value) { loading.value = false; return }
  loadBooks()
})

// 微信原生分享（好友/群 + 朋友圈）；路径自动带 token+ref 归因
onShareAppMessage(() => toAppMessage({ title: shareTitle.value, path: sharePath() }))
onShareTimeline(() => toTimeline({ title: shareTitle.value, path: sharePath() }))
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-back" @tap="navigateBack()"><app-icon name="chevron-left" :size="40" color="#666" /></view>
      <text class="hdr-title">发起共读</text>
      <view class="hdr-link" @tap="navigateTo('/pkg-classics/shared-reading/mine')"><text class="hdr-link-t">我的共读</text></view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- 顶部说明卡 -->
      <view class="hero">
        <view class="hero-icon"><app-icon name="users" :size="52" color="#fff" /></view>
        <text class="hero-title">共读拼团 · 结伴同修</text>
        <text class="hero-sub">选一本古籍，邀 3-5 位书友结伴共读。周期内一起在古籍馆读完目标章节，全员达成即得共读学分与结业卡。以文会友，零资金纯激励。</text>
      </view>

      <!-- 未登录 -->
      <view v-if="!loggedIn" class="state">
        <app-icon name="user" :size="88" color="#ccc" />
        <text class="state-t">登录后即可发起共读</text>
        <view class="btn btn-primary" @tap="navigateTo('/login')"><text class="btn-t">去登录</text></view>
      </view>

      <!-- 已建组：共读卡 + 分享 -->
      <template v-else-if="created">
        <view class="card invite-card">
          <view class="ic-badge"><app-icon name="check" :size="36" color="#fff" /></view>
          <text class="ic-title">共读已发起</text>
          <text class="ic-sub">《{{ createdTitle }}》· {{ durationDays }} 天共读已创建，把链接发给好友，满 {{ minMembers }} 人即可开读。</text>
          <view class="ic-url"><text class="ic-url-t">{{ created.shareUrl }}</text></view>
          <view class="ic-actions">
            <!-- #ifdef MP-WEIXIN -->
            <button class="share-btn" open-type="share"><app-icon name="share-2" :size="30" color="#fff" /><text class="share-btn-t">分享招募</text></button>
            <!-- #endif -->
            <!-- #ifndef MP-WEIXIN -->
            <!-- 非小程序端 open-type=share 不生效，改为复制链接（否则点击「无反应」） -->
            <view class="share-btn" @tap="copyLink"><app-icon name="share-2" :size="30" color="#fff" /><text class="share-btn-t">分享招募</text></view>
            <!-- #endif -->
            <view class="copy-btn" @tap="copyLink"><app-icon name="copy" :size="30" color="var(--brand)" /><text class="copy-btn-t">复制链接</text></view>
          </view>
        </view>
        <view class="foot-links">
          <text class="foot-link" @tap="goDetail">查看共读进度</text>
          <text class="foot-dot">·</text>
          <text class="foot-link" @tap="navigateTo('/pkg-classics/shared-reading/mine')">我的共读</text>
        </view>
      </template>

      <!-- 发起态：选书 + 设目标 -->
      <template v-else>
        <!-- 已锁定书籍（从书详情跳来） -->
        <view v-if="bookLocked && selectedBook" class="sec">
          <text class="sec-title">共读书籍</text>
          <view class="locked-book">
            <view class="lb-cover"><app-icon name="book-open" :size="40" color="#c41e3a" /></view>
            <text class="lb-title">《{{ selectedBook.title }}》</text>
          </view>
        </view>

        <!-- 书单选择 -->
        <view v-else class="sec">
          <text class="sec-title">选择古籍</text>
          <view v-if="loading" class="state">
            <view class="skel" v-for="i in 3" :key="i" />
          </view>
          <view v-else-if="error" class="state">
            <app-icon name="alert-circle" :size="80" color="#ccc" />
            <text class="state-t">{{ error }}</text>
            <view class="btn btn-ghost" @tap="loadBooks"><text class="btn-t-ghost">重试</text></view>
          </view>
          <view v-else-if="books.length === 0" class="state">
            <app-icon name="inbox" :size="88" color="#ccc" />
            <text class="state-t">暂无可选古籍</text>
          </view>
          <view v-else class="book-list">
            <view
              v-for="b in books"
              :key="b.id"
              class="book-item"
              :class="{ 'book-on': selectedBook && selectedBook.id === b.id }"
              @tap="selectBook(b)"
            >
              <view class="radio" :class="{ 'radio-on': selectedBook && selectedBook.id === b.id }">
                <view v-if="selectedBook && selectedBook.id === b.id" class="radio-dot" />
              </view>
              <view class="book-info">
                <text class="book-title">{{ b.title }}</text>
                <text class="book-meta">{{ b.author }} · {{ b.dynasty }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 目标设置 -->
        <template v-if="!loading && !error">
          <view class="sec">
            <text class="sec-title">目标章节</text>
            <view class="target-row">
              <input
                class="target-input"
                type="number"
                v-model="targetChapters"
                placeholder="留空 = 读完全书"
                placeholder-class="ph"
              />
              <text class="target-unit">章</text>
            </view>
            <text class="sec-hint">周期内各自在古籍馆读到目标章节即算完成，留空则以读完全书为目标。</text>
          </view>

          <view class="sec">
            <text class="sec-title">成团人数</text>
            <view class="opt-row">
              <view
                v-for="n in MEMBER_OPTIONS"
                :key="n"
                class="opt"
                :class="{ 'opt-on': minMembers === n }"
                @tap="minMembers = n"
              >
                <text class="opt-t" :class="{ 'opt-t-on': minMembers === n }">{{ n }} 人</text>
              </view>
            </view>
            <text class="sec-hint">最多 5 人，满此人数即可开读。</text>
          </view>

          <view class="sec">
            <text class="sec-title">共读天数</text>
            <view class="opt-row">
              <view
                v-for="d in DAY_OPTIONS"
                :key="d"
                class="opt"
                :class="{ 'opt-on': durationDays === d }"
                @tap="durationDays = d"
              >
                <text class="opt-t" :class="{ 'opt-t-on': durationDays === d }">{{ d }} 天</text>
              </view>
            </view>
          </view>

          <view class="cta-bar">
            <view class="btn btn-primary btn-block" :class="{ 'btn-disabled': submitting || !selectedBook }" @tap="onCreate">
              <text class="btn-t">{{ submitting ? '发起中…' : '发起共读' }}</text>
            </view>
          </view>
        </template>
      </template>

      <view class="disclaimer">
        <text class="disclaimer-t">共读学分为学习荣誉成长值，不可兑现、不涉及任何资金。以文会友，共学共进。</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper, #faf8f5); display: flex; flex-direction: column; }
.hdr { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: var(--card, #fff); border-bottom: 2rpx solid var(--border, #eee); padding-top: calc(var(--status-bar-height, 0px) + 16rpx); }
.hdr-back { padding: 6rpx; }
.hdr-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.hdr-link { padding: 6rpx 12rpx; }
.hdr-link-t { font-size: 24rpx; color: var(--brand); }
.body { flex: 1; }

.hero { margin: 24rpx; padding: 40rpx 32rpx; border-radius: 28rpx; background: linear-gradient(135deg, #c41e3a, rgba(196,30,58,0.82)); display: flex; flex-direction: column; align-items: center; text-align: center; }
.hero-icon { width: 104rpx; height: 104rpx; border-radius: 28rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.hero-title { font-size: 34rpx; font-weight: 700; color: #fff; }
.hero-sub { font-size: 24rpx; color: rgba(255,255,255,0.88); line-height: 1.6; margin-top: 12rpx; }

.sec { padding: 20rpx 32rpx 8rpx; }
.sec-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.sec-hint { display: block; font-size: 22rpx; color: var(--text-soft, #999); line-height: 1.5; margin-top: 12rpx; }

.state { display: flex; flex-direction: column; align-items: center; padding: 64rpx 48rpx; gap: 16rpx; }
.state-t { font-size: 28rpx; color: var(--text-soft, #999); }
.skel { width: 100%; height: 108rpx; margin: 10rpx 0; border-radius: 20rpx; background: #eee; }

.locked-book { display: flex; align-items: center; gap: 20rpx; margin-top: 16rpx; padding: 28rpx 24rpx; border-radius: 20rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.lb-cover { width: 72rpx; height: 72rpx; border-radius: 16rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lb-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }

.book-list { margin-top: 16rpx; }
.book-item { display: flex; align-items: center; gap: 20rpx; padding: 26rpx 24rpx; margin-bottom: 16rpx; border-radius: 20rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.book-on { border-color: var(--brand); background: rgba(196,30,58,0.04); }
.radio { width: 40rpx; height: 40rpx; border-radius: 999rpx; border: 3rpx solid var(--border, #ddd); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.radio-on { border-color: var(--brand); }
.radio-dot { width: 22rpx; height: 22rpx; border-radius: 999rpx; background: var(--brand); }
.book-info { flex: 1; min-width: 0; }
.book-title { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2c2c2c); }
.book-meta { display: block; font-size: 22rpx; color: var(--text-soft, #999); margin-top: 6rpx; }

.target-row { display: flex; align-items: center; gap: 12rpx; margin-top: 16rpx; padding: 8rpx 24rpx; border-radius: 20rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.target-input { flex: 1; height: 80rpx; font-size: 28rpx; color: var(--text-ink, #2c2c2c); }
.ph { color: #bbb; }
.target-unit { font-size: 26rpx; color: var(--text-soft, #999); }

.opt-row { display: flex; gap: 16rpx; margin-top: 16rpx; }
.opt { flex: 1; padding: 22rpx 0; border-radius: 16rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); display: flex; align-items: center; justify-content: center; }
.opt-on { border-color: var(--brand); background: rgba(196,30,58,0.06); }
.opt-t { font-size: 27rpx; color: var(--text-soft, #666); }
.opt-t-on { color: var(--brand); font-weight: 600; }

.cta-bar { padding: 32rpx 32rpx 8rpx; }
.btn { padding: 24rpx 48rpx; border-radius: 999rpx; text-align: center; display: flex; align-items: center; justify-content: center; }
.btn-block { width: 100%; }
.btn-primary { background: var(--brand); }
.btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.btn-ghost { border: 2rpx solid var(--border, #ddd); background: transparent; }
.btn-t-ghost { font-size: 26rpx; color: var(--text-soft, #666); }
.btn-disabled { opacity: 0.5; }

.card { margin: 8rpx 24rpx 0; padding: 40rpx 32rpx; border-radius: 28rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.invite-card { display: flex; flex-direction: column; align-items: center; text-align: center; }
.ic-badge { width: 88rpx; height: 88rpx; border-radius: 999rpx; background: #10b981; display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.ic-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); }
.ic-sub { font-size: 24rpx; color: var(--text-soft, #999); line-height: 1.6; margin-top: 12rpx; }
.ic-url { width: 100%; margin-top: 24rpx; padding: 20rpx 24rpx; border-radius: 16rpx; background: var(--secondary, #f5f5f5); }
.ic-url-t { font-size: 22rpx; color: var(--text-soft, #888); word-break: break-all; }
.ic-actions { width: 100%; display: flex; gap: 20rpx; margin-top: 28rpx; }
.share-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 22rpx 0; border-radius: 999rpx; background: var(--brand); line-height: 1.4; border: none; }
.share-btn::after { border: none; }
.share-btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.copy-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 22rpx 0; border-radius: 999rpx; border: 2rpx solid var(--brand); }
.copy-btn-t { font-size: 28rpx; font-weight: 600; color: var(--brand); }

.foot-links { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 32rpx 0 8rpx; }
.foot-link { font-size: 26rpx; color: var(--brand); }
.foot-dot { color: var(--text-soft, #ccc); }

.disclaimer { padding: 32rpx 40rpx 48rpx; }
.disclaimer-t { font-size: 22rpx; color: var(--text-soft, #aaa); line-height: 1.6; text-align: center; }
</style>
