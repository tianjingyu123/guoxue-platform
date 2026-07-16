<script setup lang="ts">
/**
 * V3 共读拼团 · 组详情（onLoad id）
 * 书名+状态+目标章节+截止+成团进度；成员进度列表；我的进度+去阅读（跳古籍阅读器）；
 * RECRUITING：分享补人 +（发起人满员）手动开读；退组/解散；COMPLETED：结业庆祝 + canvas 结业卡分享。
 * 三态 + 非成员友好态。
 */
import { ref, computed, getCurrentInstance, nextTick } from 'vue'
import { onLoad, onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { getToken, getUserInfo } from '@/utils/storage'
import { useShare } from '@/composables/useShare'
import { BRAND } from '@/lib/brand'
import {
  sharedReadingApi,
  SHARED_READING_STATUS_LABEL,
  fmtDeadline,
  daysLeft,
  type SharedReadingDetail,
} from '@/lib/shared-reading-data'

const instance = getCurrentInstance()?.proxy
const { toAppMessage, toTimeline } = useShare()

const groupId = ref('')
const loggedIn = ref(true)
const loading = ref(true)
const error = ref('')
const detail = ref<SharedReadingDetail | null>(null)

// 写操作防重
const starting = ref(false)
const leaving = ref(false)
const savingCert = ref(false)

const myUserId = computed(() => String(getUserInfo<{ id?: string | number }>()?.id ?? ''))
/** 我是否为发起人（组长） */
const amLeader = computed(
  () => !!detail.value?.members.some((m) => m.isLeader && m.userId === myUserId.value),
)
/** 发起人可手动开读：招募中 + 已满成团人数 */
const canStart = computed(
  () =>
    !!detail.value &&
    amLeader.value &&
    detail.value.status === 'RECRUITING' &&
    detail.value.memberCount >= detail.value.minMembers,
)
const isRecruiting = computed(() => detail.value?.status === 'RECRUITING')
const isReading = computed(() => detail.value?.status === 'READING')
const isCompleted = computed(() => detail.value?.status === 'COMPLETED')

const deadlineText = computed(() => (detail.value?.deadline ? fmtDeadline(detail.value.deadline) : ''))
const daysRemain = computed(() => daysLeft(detail.value?.deadline ?? null))

// 结业卡画布尺寸（2:3 竖版）
const canvasW = ref(300)
const canvasH = ref(450)

function pct(done: number): number {
  const t = detail.value?.targetChapters || 1
  return Math.min(100, Math.round((done / t) * 100))
}

/** 组详情深链（庆祝/通用分享落地；useShare 自动追加分享者 ref 归因） */
const sharePath = computed(() => `/pkg-classics/shared-reading/detail?id=${groupId.value}`)
const shareTitle = computed(() =>
  detail.value ? `我在共读《${detail.value.book.title}》，就差你了，一起来读吧！` : '一起来共读吧',
)
/**
 * 招募裂变链接：详情返回真 inviteToken 时（招募中且我是成员）落地邀请页，
 * 好友点开可直接加入 → 真招募闭环；否则为空（不下发）。
 */
const invitePath = computed(() =>
  detail.value?.inviteToken
    ? `/pkg-classics/shared-reading/invite?token=${detail.value.inviteToken}`
    : '',
)
/** 招募分享标题（后端详情已返回 durationDays，拼「N天共读…就差你了！」） */
const recruitShareTitle = computed(() => {
  if (!detail.value) return '一起来共读吧'
  const d = detail.value.durationDays
  return `${d ? d + '天' : ''}共读《${detail.value.book.title}》，就差你了！`
})
/** 招募态优先分享真邀请链接（可直接加入），其余态分享组详情深链 */
const activeSharePath = computed(() =>
  isRecruiting.value && invitePath.value ? invitePath.value : sharePath.value,
)
const activeShareTitle = computed(() =>
  isRecruiting.value && invitePath.value ? recruitShareTitle.value : shareTitle.value,
)
onShareAppMessage(() => toAppMessage({ title: activeShareTitle.value, path: activeSharePath.value }))
onShareTimeline(() => toTimeline({ title: activeShareTitle.value, path: activeSharePath.value }))

async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await sharedReadingApi.detail(groupId.value)
    if (isCompleted.value) {
      await nextTick()
      setTimeout(drawCert, 80)
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function toReader() {
  if (!detail.value) return
  uni.navigateTo({ url: `/pkg-classics/reader/index?bookId=${detail.value.book.id}` })
}

function copyLink() {
  // 招募态用后端下发的真邀请链接（shareUrl），其余态回落组详情深链
  const link = detail.value?.shareUrl || `https://api.rebugx.cn/h5${sharePath.value}`
  uni.setClipboardData({
    data: link,
    success: () => uni.showToast({ title: '链接已复制，发给好友', icon: 'none' }),
  })
}

async function onStart() {
  if (starting.value || !detail.value) return
  starting.value = true
  try {
    await sharedReadingApi.start(groupId.value)
    uni.showToast({ title: '已开读，开始共读吧', icon: 'success' })
    load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '开读失败', icon: 'none' })
  } finally {
    starting.value = false
  }
}

function onLeave() {
  if (leaving.value || !detail.value) return
  const dissolve = amLeader.value
  uni.showModal({
    title: dissolve ? '解散共读组' : '退出共读组',
    content: dissolve ? '你是发起人，退出将解散整个共读组，确定吗？' : '确定退出该共读组吗？',
    confirmText: dissolve ? '解散' : '退出',
    confirmColor: '#c41e3a',
    success: async (r) => {
      if (!r.confirm) return
      leaving.value = true
      try {
        await sharedReadingApi.leave(groupId.value)
        uni.showToast({ title: dissolve ? '共读组已解散' : '已退出', icon: 'none' })
        setTimeout(() => navigateBack(), 600)
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      } finally {
        leaving.value = false
      }
    },
  })
}

// ============ 结业卡 canvas ============
function drawCert() {
  const d = detail.value
  if (!d) return
  const W = canvasW.value
  const H = canvasH.value
  const ctx = uni.createCanvasContext('srCertCanvas', instance)
  const name = getUserInfo<{ nickname?: string }>()?.nickname || '读者'

  ctx.setFillStyle('#fdf8f3')
  ctx.fillRect(0, 0, W, H)
  ctx.setStrokeStyle('#e8d5b5')
  ctx.setLineWidth(2)
  ctx.strokeRect(10, 10, W - 20, H - 20)

  // 顶部色块
  const headH = 118
  ctx.setFillStyle('#c41e3a')
  ctx.fillRect(10, 10, W - 20, headH)
  ctx.setFillStyle('rgba(255,255,255,0.9)')
  ctx.setFontSize(12)
  ctx.setTextAlign('center')
  ctx.fillText(`${BRAND.name} · 古籍共读`, W / 2, 42)
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(28)
  ctx.fillText('共 读 结 业 卡', W / 2, 82)
  ctx.setFontSize(11)
  ctx.setFillStyle('rgba(255,255,255,0.85)')
  ctx.fillText('SHARED READING ACCOMPLISHED', W / 2, 104)

  // 白卡
  const cardX = 26
  const cardY = 10 + headH + 22
  const cardW = W - 52
  const cardH = 186
  ctx.setFillStyle('#ffffff')
  ctx.fillRect(cardX, cardY, cardW, cardH)
  ctx.setStrokeStyle('#f0e6d6')
  ctx.strokeRect(cardX, cardY, cardW, cardH)

  ctx.setTextAlign('center')
  ctx.setFillStyle('#2c2c2c')
  ctx.setFontSize(22)
  ctx.fillText(name, W / 2, cardY + 44)
  ctx.setFillStyle('#666666')
  ctx.setFontSize(13)
  ctx.fillText('已完成共读', W / 2, cardY + 72)
  ctx.setFillStyle('#c41e3a')
  ctx.setFontSize(18)
  ctx.fillText(`《${d.book.title}》`, W / 2, cardY + 104)
  ctx.setFillStyle('#666666')
  ctx.setFontSize(12)
  ctx.fillText(`目标 ${d.targetChapters} 章 · ${d.memberCount} 人同修`, W / 2, cardY + 138)

  ctx.setStrokeStyle('#e8d5b5')
  ctx.setLineWidth(1)
  ctx.beginPath()
  ctx.moveTo(cardX + 20, cardY + 152)
  ctx.lineTo(cardX + cardW - 20, cardY + 152)
  ctx.stroke()
  ctx.setFillStyle('#8a6d4a')
  ctx.setFontSize(11)
  ctx.fillText('以文会友 · 共学共进', W / 2, cardY + 174)

  // 底部
  ctx.setFillStyle('#b0a48c')
  ctx.setFontSize(10)
  ctx.fillText('扫码开启你的古籍共读之旅', W / 2, H - 40)
  ctx.setFillStyle('#c41e3a')
  ctx.setFontSize(13)
  ctx.fillText(BRAND.name, W / 2, H - 20)

  ctx.draw()
}

function onSaveCert() {
  if (savingCert.value || !detail.value) return
  savingCert.value = true
  drawCert()
  setTimeout(() => {
    uni.canvasToTempFilePath({
      canvasId: 'srCertCanvas',
      success: (res) => {
        // #ifdef H5
        uni.previewImage({ urls: [res.tempFilePath], current: res.tempFilePath })
        uni.showToast({ title: '长按图片可保存到相册', icon: 'none' })
        savingCert.value = false
        // #endif
        // #ifndef H5
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => uni.showToast({ title: '结业卡已保存到相册', icon: 'success' }),
          fail: (err) => {
            if (/auth|deny|授权/.test(err.errMsg || '')) {
              uni.showModal({ title: '提示', content: '需要相册权限才能保存，请在设置中开启', showCancel: false })
            } else {
              uni.showToast({ title: '保存失败，请重试', icon: 'none' })
            }
          },
          complete: () => { savingCert.value = false },
        })
        // #endif
      },
      fail: () => {
        uni.showToast({ title: '结业卡生成失败，请重试', icon: 'none' })
        savingCert.value = false
      },
    }, instance)
  }, 80)
}

onLoad((q: Record<string, string> = {}) => {
  groupId.value = q.id || ''
  uni.getSystemInfo({
    success: (e) => {
      const w = Math.min(320, Math.max(260, (e.windowWidth || 375) - 80))
      canvasW.value = Math.round(w)
      canvasH.value = Math.round(w * 1.5)
    },
  })
})

// onShow：阅读返回后刷新进度
onShow(() => {
  loggedIn.value = !!getToken()
  if (!groupId.value) {
    error.value = '共读组不存在'
    loading.value = false
    return
  }
  if (!loggedIn.value) { loading.value = false; return }
  load()
})
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-back" @tap="navigateBack()"><app-icon name="chevron-left" :size="40" color="#666" /></view>
      <text class="hdr-title">共读详情</text>
      <view class="hdr-link" @tap="navigateTo('/pkg-classics/shared-reading/mine')"><text class="hdr-link-t">我的共读</text></view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- 未登录 -->
      <view v-if="!loggedIn" class="state">
        <app-icon name="user" :size="88" color="#ccc" />
        <text class="state-t">登录后查看共读详情</text>
        <view class="btn btn-primary" @tap="navigateTo('/login')"><text class="btn-t">去登录</text></view>
      </view>

      <!-- loading -->
      <view v-else-if="loading" class="state">
        <view class="skel skel-hero" />
        <view class="skel" v-for="i in 3" :key="i" />
      </view>

      <!-- error -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="88" color="#ccc" />
        <text class="state-t">{{ error }}</text>
        <view class="btn btn-ghost" @tap="load"><text class="btn-t-ghost">重试</text></view>
      </view>

      <template v-else-if="detail">
        <!-- 概览卡 -->
        <view class="hero" :class="{ 'hero-done': isCompleted }">
          <view class="hero-top">
            <text class="tag" :class="'tag-' + detail.status.toLowerCase()">{{ SHARED_READING_STATUS_LABEL[detail.status] }}</text>
          </view>
          <text class="hero-book">《{{ detail.book.title }}</text>
          <text class="hero-target">目标 {{ detail.targetChapters }} 章 · {{ detail.memberCount }} 人共读</text>

          <!-- 招募进度 -->
          <view v-if="isRecruiting" class="recruit">
            <view class="recruit-bar"><view class="recruit-fill" :style="{ width: Math.min(100, Math.round(detail.memberCount / detail.minMembers * 100)) + '%' }" /></view>
            <text class="recruit-t">已 {{ detail.memberCount }} / 成团需 {{ detail.minMembers }} 人</text>
          </view>
          <!-- 进行中：截止 -->
          <view v-else-if="isReading && deadlineText" class="deadline">
            <app-icon name="clock" :size="26" color="#fff" />
            <text class="deadline-t">{{ daysRemain > 0 ? `还剩 ${daysRemain} 天` : '今日截止' }} · {{ deadlineText }}</text>
          </view>
          <!-- 达成庆祝 -->
          <view v-else-if="isCompleted" class="celebrate">
            <app-icon name="party-popper" :size="30" color="#fff" />
            <text class="celebrate-t">共读达成！全员完成目标，恭喜！</text>
          </view>
        </view>

        <!-- 非成员提示 -->
        <view v-if="!detail.iAmMember" class="notice">
          <app-icon name="info" :size="28" color="#b45309" />
          <text class="notice-t">你还不是该共读组成员。想加入请通过好友分享的邀请链接进入。</text>
        </view>

        <!-- 我的进度（成员且非招募中） -->
        <view v-if="detail.iAmMember && !isRecruiting" class="mine-card">
          <view class="mine-head">
            <text class="mine-title">我的进度</text>
            <text class="mine-done" v-if="detail.myProgress.completed">已完成 ✓</text>
          </view>
          <view class="prog-bar"><view class="prog-fill" :style="{ width: pct(detail.myProgress.completedChapters) + '%' }" /></view>
          <text class="mine-sub">已读 {{ detail.myProgress.completedChapters }} / {{ detail.targetChapters }} 章</text>
          <view class="btn btn-primary btn-block read-btn" @tap="toReader"><app-icon name="book-open" :size="30" color="#fff" /><text class="btn-t">去阅读</text></view>
        </view>

        <!-- 成员进度列表 -->
        <view class="sec">
          <text class="sec-title">共读成员（{{ detail.memberCount }}）</text>
          <view class="members">
            <view v-for="m in detail.members" :key="m.userId" class="member">
              <image v-if="m.avatar" class="m-avatar" :src="m.avatar" mode="aspectFill" />
              <view v-else class="m-avatar m-avatar-ph"><text class="m-avatar-t">{{ (m.nickname || '读').charAt(0) }}</text></view>
              <view class="m-body">
                <view class="m-name-row">
                  <text class="m-name">{{ m.nickname || '书友' }}</text>
                  <text v-if="m.isLeader" class="m-leader">发起人</text>
                  <text v-if="m.userId === myUserId" class="m-me">我</text>
                </view>
                <view v-if="!isRecruiting" class="m-prog-bar"><view class="m-prog-fill" :style="{ width: pct(m.completedChapters) + '%' }" /></view>
              </view>
              <view class="m-stat">
                <app-icon v-if="m.completed" name="check-circle" :size="30" color="#10b981" />
                <text v-else-if="!isRecruiting" class="m-stat-t">{{ m.completedChapters }}/{{ detail.targetChapters }}</text>
                <text v-else class="m-stat-t">已加入</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 结业卡（已达成） -->
        <view v-if="isCompleted" class="sec">
          <view class="cert-preview">
            <view class="cp-badge"><app-icon name="award" :size="44" color="#c41e3a" /></view>
            <text class="cp-title">共读结业卡</text>
            <text class="cp-sub">《{{ detail.book.title }}》· {{ detail.memberCount }} 人同修达成</text>
            <view class="cp-actions">
              <view class="btn btn-primary" :class="{ 'btn-disabled': savingCert }" @tap="onSaveCert"><app-icon name="download" :size="28" color="#fff" /><text class="btn-t">{{ savingCert ? '生成中…' : '保存结业卡' }}</text></view>
              <!-- #ifdef MP-WEIXIN -->
              <button class="btn btn-ghost share-native" open-type="share"><app-icon name="share-2" :size="28" color="var(--brand)" /><text class="btn-t-ghost">分享喜悦</text></button>
              <!-- #endif -->
              <!-- #ifndef MP-WEIXIN -->
              <view class="btn btn-ghost" @tap="copyLink"><app-icon name="share-2" :size="28" color="var(--brand)" /><text class="btn-t-ghost">分享喜悦</text></view>
              <!-- #endif -->
            </view>
          </view>
        </view>

        <!-- 招募中操作：分享补人 + 开读 -->
        <view v-if="isRecruiting && detail.iAmMember" class="sec actions-sec">
          <!-- 分享补人：仅在拿到真招募 token 时显示（非招募态/非成员后端不下发） -->
          <template v-if="detail.inviteToken">
            <!-- #ifdef MP-WEIXIN -->
            <button class="btn btn-primary btn-block share-native" open-type="share"><app-icon name="share-2" :size="30" color="#fff" /><text class="btn-t">分享招募补人</text></button>
            <!-- #endif -->
            <!-- #ifndef MP-WEIXIN -->
            <view class="btn btn-primary btn-block" @tap="copyLink"><app-icon name="share-2" :size="30" color="#fff" /><text class="btn-t">分享招募补人</text></view>
            <!-- #endif -->
          </template>
          <view v-if="canStart" class="btn btn-outline btn-block" :class="{ 'btn-disabled': starting }" @tap="onStart">
            <text class="btn-t-outline">{{ starting ? '开读中…' : '人数已满 · 立即开读' }}</text>
          </view>
          <text v-else-if="amLeader" class="start-hint">满 {{ detail.minMembers }} 人后可手动开读（或满员自动开读）</text>
        </view>

        <!-- 退组 / 解散（仅招募期成员可退） -->
        <view v-if="detail.iAmMember && isRecruiting" class="leave-sec">
          <view class="leave-btn" :class="{ 'btn-disabled': leaving }" @tap="onLeave">
            <text class="leave-t">{{ amLeader ? '解散共读组' : '退出共读组' }}</text>
          </view>
        </view>

        <view class="disclaimer">
          <text class="disclaimer-t">共读学分为学习荣誉成长值，不可兑现、不涉及任何资金。以文会友，共学共进。</text>
        </view>
      </template>
    </scroll-view>

    <!-- 离屏结业卡画布 -->
    <canvas
      canvas-id="srCertCanvas"
      class="cert-canvas-offscreen"
      :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
    />
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

.state { display: flex; flex-direction: column; align-items: center; padding: 72rpx 48rpx; gap: 16rpx; }
.state-t { font-size: 28rpx; color: var(--text-soft, #999); text-align: center; }
.skel { width: calc(100% - 64rpx); height: 108rpx; margin: 10rpx 0; border-radius: 20rpx; background: #eee; }
.skel-hero { height: 240rpx; }

.hero { margin: 24rpx; padding: 40rpx 32rpx; border-radius: 28rpx; background: linear-gradient(135deg, #c41e3a, rgba(196,30,58,0.82)); display: flex; flex-direction: column; align-items: center; text-align: center; }
.hero-done { background: linear-gradient(135deg, #0f9d6b, #10b981); }
.hero-top { margin-bottom: 12rpx; }
.hero-book { font-size: 42rpx; font-weight: 800; color: #fff; font-family: var(--font-serif, serif); }
.hero-target { font-size: 24rpx; color: rgba(255,255,255,0.9); margin-top: 12rpx; }
.recruit { width: 100%; margin-top: 24rpx; }
.recruit-bar { width: 100%; height: 14rpx; border-radius: 999rpx; background: rgba(255,255,255,0.25); overflow: hidden; }
.recruit-fill { height: 100%; border-radius: 999rpx; background: #fff; transition: width 0.3s; }
.recruit-t { display: block; font-size: 24rpx; color: #fff; font-weight: 600; margin-top: 12rpx; }
.deadline { display: flex; align-items: center; gap: 10rpx; margin-top: 20rpx; padding: 8rpx 24rpx; border-radius: 999rpx; background: rgba(255,255,255,0.18); }
.deadline-t { font-size: 24rpx; color: #fff; }
.celebrate { display: flex; align-items: center; gap: 12rpx; margin-top: 20rpx; }
.celebrate-t { font-size: 26rpx; color: #fff; font-weight: 600; }

.tag { font-size: 22rpx; padding: 4rpx 20rpx; border-radius: 999rpx; background: rgba(255,255,255,0.9); color: #c41e3a; font-weight: 600; }
.tag-recruiting { background: #fff; color: #b45309; }
.tag-reading { background: #fff; color: #1d4ed8; }
.tag-completed { background: #fff; color: #047857; }
.tag-expired { background: rgba(255,255,255,0.85); color: #6b7280; }

.notice { display: flex; align-items: center; gap: 14rpx; margin: 0 24rpx 8rpx; padding: 22rpx 24rpx; border-radius: 20rpx; background: #fffbeb; border: 2rpx solid #fde68a; }
.notice-t { flex: 1; font-size: 24rpx; color: #92400e; line-height: 1.5; }

.mine-card { margin: 16rpx 24rpx; padding: 32rpx; border-radius: 24rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.mine-head { display: flex; align-items: center; justify-content: space-between; }
.mine-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.mine-done { font-size: 24rpx; color: #10b981; font-weight: 600; }
.prog-bar { width: 100%; height: 16rpx; border-radius: 999rpx; background: #f0f0f0; overflow: hidden; margin: 20rpx 0 12rpx; }
.prog-fill { height: 100%; border-radius: 999rpx; background: var(--brand); transition: width 0.3s; }
.mine-sub { font-size: 24rpx; color: var(--text-soft, #999); }
.read-btn { margin-top: 24rpx; gap: 12rpx; }

.sec { padding: 16rpx 32rpx 8rpx; }
.sec-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.actions-sec { display: flex; flex-direction: column; gap: 16rpx; padding-top: 24rpx; }

.members { margin-top: 16rpx; }
.member { display: flex; align-items: center; gap: 20rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; border-radius: 20rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.m-avatar { width: 76rpx; height: 76rpx; border-radius: 999rpx; flex-shrink: 0; }
.m-avatar-ph { background: #a06a38; display: flex; align-items: center; justify-content: center; }
.m-avatar-t { font-size: 30rpx; color: #fff; font-weight: 600; }
.m-body { flex: 1; min-width: 0; }
.m-name-row { display: flex; align-items: center; gap: 12rpx; }
.m-name { font-size: 27rpx; font-weight: 500; color: var(--text-ink, #2c2c2c); }
.m-leader { font-size: 18rpx; color: #b45309; background: #fef3c7; padding: 2rpx 10rpx; border-radius: 6rpx; }
.m-me { font-size: 18rpx; color: var(--brand); background: rgba(196,30,58,0.1); padding: 2rpx 10rpx; border-radius: 6rpx; }
.m-prog-bar { width: 100%; height: 12rpx; border-radius: 999rpx; background: #f0f0f0; overflow: hidden; margin-top: 12rpx; }
.m-prog-fill { height: 100%; border-radius: 999rpx; background: var(--brand); }
.m-stat { flex-shrink: 0; min-width: 80rpx; text-align: right; }
.m-stat-t { font-size: 22rpx; color: var(--text-soft, #999); }

.cert-preview { margin-top: 8rpx; padding: 40rpx 32rpx; border-radius: 24rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); display: flex; flex-direction: column; align-items: center; text-align: center; }
.cp-badge { width: 96rpx; height: 96rpx; border-radius: 999rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.cp-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); margin-top: 20rpx; }
.cp-sub { font-size: 24rpx; color: var(--text-soft, #999); margin-top: 10rpx; }
.cp-actions { display: flex; gap: 20rpx; margin-top: 28rpx; width: 100%; }

.btn { padding: 22rpx 40rpx; border-radius: 999rpx; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10rpx; }
.btn-block { width: 100%; }
.btn-primary { background: var(--brand); flex: 1; }
.btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.btn-ghost { border: 2rpx solid var(--brand); background: transparent; flex: 1; }
.btn-t-ghost { font-size: 28rpx; font-weight: 600; color: var(--brand); }
.btn-outline { border: 2rpx solid var(--brand); background: rgba(196,30,58,0.04); }
.btn-t-outline { font-size: 28rpx; font-weight: 600; color: var(--brand); }
.btn-disabled { opacity: 0.5; }
.share-native { line-height: 1.4; border: none; }
.share-native::after { border: none; }
.btn-ghost.share-native { border: 2rpx solid var(--brand); }
.start-hint { display: block; text-align: center; font-size: 23rpx; color: var(--text-soft, #999); padding: 8rpx 0; }

.leave-sec { padding: 24rpx 32rpx 8rpx; }
.leave-btn { padding: 20rpx 0; text-align: center; }
.leave-t { font-size: 26rpx; color: var(--text-soft, #999); }

.disclaimer { padding: 32rpx 40rpx 48rpx; }
.disclaimer-t { font-size: 22rpx; color: var(--text-soft, #aaa); line-height: 1.6; text-align: center; }

.cert-canvas-offscreen { position: fixed; left: -9999rpx; top: 0; }
</style>
