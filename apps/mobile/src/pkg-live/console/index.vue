<template>
  <!-- 加载骨架屏（深色 shimmer） -->
  <view v-if="loading" class="sk-page">
    <view class="sk-topbar">
      <view class="sk sk-pill sk-w96" />
      <view class="sk sk-pill sk-w180" />
      <view class="sk sk-pill sk-w96 sk-ml-auto" />
    </view>
    <view class="sk-stats">
      <view class="sk sk-stat" />
      <view class="sk sk-stat" />
      <view class="sk sk-stat" />
      <view class="sk sk-stat" />
    </view>
    <view class="sk-danmu">
      <view class="sk-dm-row"><view class="sk sk-av" /><view class="sk sk-dm-bd sk-w280" /></view>
      <view class="sk-dm-row"><view class="sk sk-av" /><view class="sk sk-dm-bd sk-w340" /></view>
      <view class="sk-dm-row"><view class="sk sk-av" /><view class="sk sk-dm-bd sk-w240" /></view>
    </view>
    <view class="sk-opbar">
      <view class="sk sk-op" /><view class="sk sk-op" /><view class="sk sk-op" /><view class="sk sk-op" /><view class="sk sk-op" />
    </view>
  </view>

  <!-- 错误状态 -->
  <view v-else-if="error" class="error-state">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="fetchData">重试</view>
  </view>

  <!-- 正常内容（直播中驾驶舱·深色） -->
  <view v-else class="page">
    <!-- ── 顶部状态条 ── -->
    <view class="topbar">
      <view class="live">
        <view class="dot" />
        <text class="live-txt">直播中</text>
      </view>
      <text class="mono time-txt">{{ formatTime(liveTime) }}</text>
      <view class="qtag" :class="{ warn: remainWarn }">
        <text class="qtag-txt">{{ qualityStatusLabel }}</text>
      </view>
      <view v-if="isHostCompanion" class="modebtn" @tap="returnToHost">
        <text class="modebtn-txt">返回直播间</text>
      </view>
      <view class="endbtn" @tap="showEndDialog = true">
        <text class="endbtn-txt">下播</text>
      </view>
    </view>

    <!-- 手机主播画面由上一层 .nvue TRTC 页面持续采集，本页只处理数据与运营控制。 -->
    <view v-if="isHostCompanion" class="preview compact">
      <view class="preview-unavailable">
        <text class="preview-unavailable-title">直播画面正在后台持续推送</text>
        <text class="preview-unavailable-sub">操作完成后返回直播间查看画面和公屏</text>
      </view>
      <view class="preview-actions">
        <view class="preview-action preview-action--primary" @tap="returnToHost">返回直播间</view>
      </view>
    </view>

    <!-- ── 数据看板四格 ── -->
    <view v-if="consoleMode || isObsMode" class="stats">
      <view class="stat">
        <text class="mono stat-n">{{ formatNum(stats.onlineCount) }}</text>
        <text class="stat-l">在线人数</text>
      </view>
      <view class="stat">
        <text class="mono stat-n">{{ formatNum(stats.totalViews) }}</text>
        <text class="stat-l">累计观看</text>
      </view>
      <view class="stat">
        <text class="mono stat-n">{{ formatNum(stats.newFollowers) }}</text>
        <text class="stat-l">新增粉丝</text>
      </view>
      <view class="stat">
        <text class="mono stat-n gold">¥{{ formatNum(sessionIncome) }}</text>
        <text class="stat-l">本场收入</text>
      </view>
    </view>

    <!-- ── 时长警示横幅（剩余<15分钟） ── -->
    <view v-if="remainWarn" class="banner">
      <text class="banner-txt">{{ qualityLabel }}时长仅剩 {{ remainMinutes }} 分钟，耗尽后自动降为标清</text>
      <text class="banner-link" @tap="onRenewDuration">立即续购 ›</text>
    </view>

    <!-- ── 弹幕流 ── -->
    <view v-if="!consoleMode && !isObsMode" class="room-section-title">
      <text>互动公屏</text>
      <text class="room-section-meta">{{ formatNum(stats.onlineCount) }} 人在线</text>
    </view>
    <scroll-view v-if="danmakuList.length > 0" scroll-y class="danmu" :scroll-top="danmakuScrollTop" :scroll-with-animation="false">
      <view class="sys">—— 以下为实时弹幕 ——</view>
      <view
        v-for="item in danmakuList"
        :key="item.id"
        class="dm"
        @longpress="onDanmakuLongPress(item)"
      >
        <view class="av">
          <text class="av-txt">{{ (item.user || '?').charAt(0) }}</text>
        </view>
        <view class="bd">
          <text class="bd-user" :class="{ vip: item.isVip }">{{ item.user }}</text>
          <text class="bd-content">{{ item.content }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 弹幕空态（刚开播） -->
    <view v-else class="danmu danmu-empty">
      <text class="empty-title">直播已开始，观众正在路上</text>
      <text class="empty-sub">分享直播间到圈子，召唤第一批观众</text>
      <view class="sharebtn" @tap="onShareRoom">
        <text class="sharebtn-txt">分享直播间</text>
      </view>
    </view>

    <!-- ── 底部操作栏 ── -->
    <view class="opbar">
      <view class="op" @tap="showProductSheet = true">
        <view class="op-ic">
          <AppIcon name="shopping-bag" :size="28" color="#A89FA8" />
          <view v-if="products.length > 0" class="op-cnt">
            <text class="op-cnt-txt">{{ products.length }}</text>
          </view>
        </view>
        <text class="op-txt">商品</text>
      </view>
      <view class="op" @tap="openMutedSheet">
        <view class="op-ic"><AppIcon name="ban" :size="28" color="#A89FA8" /></view>
        <text class="op-txt">禁言管理</text>
      </view>
      <view v-if="canUseLiveMic" class="op" @tap="openMicSheet">
        <view class="op-ic">
          <AppIcon name="mic" :size="28" color="#A89FA8" />
          <view v-if="pendingMicCount > 0" class="op-cnt"><text class="op-cnt-txt">{{ pendingMicCount }}</text></view>
        </view>
        <text class="op-txt">连麦</text>
      </view>
      <view class="op" @tap="onShareRoom">
        <view class="op-ic"><AppIcon name="share-2" :size="28" color="#A89FA8" /></view>
        <text class="op-txt">分享</text>
      </view>
    </view>

    <!-- ── 下播二次确认弹窗（不透明纯色卡·X5安全） ── -->
    <view v-if="showEndDialog" class="mask" @tap="showEndDialog = false" @touchmove.self.prevent>
      <view class="dialog" @tap.stop @touchmove.stop>
        <text class="dialog-title">确认结束本场直播？</text>
        <text class="dialog-desc">已直播 {{ humanDuration }} · 累计 {{ formatNum(stats.totalViews) }} 人观看{{ '\n' }}结束后将自动生成回放</text>
        <view class="dialog-btns">
          <view class="dialog-btn cancel" @tap="showEndDialog = false">
            <text class="dialog-btn-txt cancel-txt">继续直播</text>
          </view>
          <view class="dialog-btn confirm" @tap="onConfirmEnd">
            <text class="dialog-btn-txt confirm-txt">结束直播</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ── 商品半屏列表 ── -->
    <view v-if="showProductSheet" class="mask sheet-mask" @tap="showProductSheet = false" @touchmove.self.prevent>
      <view class="sheet" @tap.stop @touchmove.stop>
        <view class="sheet-head">
          <text class="sheet-title">本场商品（{{ products.length }}）</text>
          <view class="sheet-actions">
            <view class="sheet-manage" @tap="goManageProducts">管理商品</view>
            <view class="sheet-close" @tap="showProductSheet = false">
              <AppIcon name="x" :size="32" color="#A89FA8" />
            </view>
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view v-if="products.length === 0" class="sheet-empty">
            <text class="sheet-empty-txt">本场暂未挂载商品</text>
            <view class="sheet-empty-btn" @tap="goManageProducts">去添加商品</view>
          </view>
          <view v-for="p in products" :key="p.id" class="prod">
            <view class="prod-img">
              <AppIcon name="package" :size="40" color="#6E6470" />
            </view>
            <view class="prod-info">
              <view class="prod-name-row">
                <text class="prod-name">{{ p.name }}</text>
                <view v-if="p.isLive" class="prod-tag live-tag"><text class="prod-tag-txt">讲解中</text></view>
                <view v-else-if="p.isHot" class="prod-tag hot-tag"><text class="prod-tag-txt">爆</text></view>
              </view>
              <view class="prod-meta">
                <text class="prod-price">¥{{ formatPrice(p.price) }}</text>
                <text class="prod-stock">库存 {{ p.stock }} · 已售 {{ p.sold }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ── 禁言管理半屏列表 ── -->
    <view v-if="showMutedSheet" class="mask sheet-mask" @tap="showMutedSheet = false" @touchmove.self.prevent>
      <view class="sheet" @tap.stop @touchmove.stop>
        <view class="sheet-head">
          <text class="sheet-title">禁言名单（{{ mutedUsers.length }}）</text>
          <view class="sheet-close" @tap="showMutedSheet = false">
            <AppIcon name="x" :size="32" color="#A89FA8" />
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view v-if="mutedLoading" class="sheet-state">
            <AppIcon name="loader-2" :size="34" color="#A89FA8" />
            <text class="sheet-state-txt">正在加载禁言名单…</text>
          </view>
          <view v-else-if="mutedError" class="sheet-state">
            <text class="sheet-state-txt error">{{ mutedError }}</text>
            <view class="sheet-retry" @tap="loadMutedUsers">重新加载</view>
          </view>
          <view v-else>
            <view v-if="mutedUsers.length === 0" class="sheet-empty">
              <text class="sheet-empty-txt">当前没有被禁言的用户</text>
            </view>
            <view v-for="item in mutedUsers" :key="item.id" class="muted-row">
              <view class="muted-avatar">
                <image v-if="item.avatar" class="muted-avatar-img" :src="item.avatar" mode="aspectFill" />
                <text v-else class="muted-avatar-txt">{{ (item.nickname || '用').charAt(0) }}</text>
              </view>
              <view class="muted-info">
                <text class="muted-name">{{ item.nickname }}</text>
                <text class="muted-meta">{{ formatMutedStatus(item) }}</text>
              </view>
              <view
                class="muted-action"
                :class="{ disabled: unmutingUserId === item.userId }"
                @tap="confirmUnmute(item)"
              >
                {{ unmutingUserId === item.userId ? '解除中…' : '解除禁言' }}
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="showMicSheet" class="mask sheet-mask" @tap="showMicSheet = false" @touchmove.self.prevent>
      <view class="sheet" @tap.stop @touchmove.stop>
        <view class="sheet-head">
          <text class="sheet-title">语音连麦（{{ micItems.length }}）</text>
          <view class="sheet-close" @tap="showMicSheet = false">
            <AppIcon name="x" :size="32" color="#A89FA8" />
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view v-if="micLoading" class="sheet-state"><text class="sheet-state-txt">正在加载连麦申请…</text></view>
          <view v-else-if="micItems.length === 0" class="sheet-empty"><text class="sheet-empty-txt">暂无连麦申请</text></view>
          <view v-for="item in micItems" :key="item.id" class="mic-row">
            <view class="mic-user">
              <text class="mic-user-name">麦位 {{ item.position }} · 用户 {{ shortUserId(item.userId) }}</text>
              <text class="mic-user-state">{{ micStatusText(item.status) }}</text>
            </view>
            <view class="mic-actions">
              <template v-if="item.status === 'PENDING'">
                <view class="mic-action mic-action--primary" :class="{ disabled: micBusyUserId === item.userId }" @tap="manageMic(item, 'ACCEPT')">接受</view>
                <view class="mic-action" :class="{ disabled: micBusyUserId === item.userId }" @tap="manageMic(item, 'REJECT')">拒绝</view>
              </template>
              <template v-else>
                <view class="mic-action" :class="{ disabled: micBusyUserId === item.userId }" @tap="manageMic(item, item.status === 'MUTED' ? 'UNMUTE' : 'MUTE')">
                  {{ item.status === 'MUTED' ? '解除静音' : '静音' }}
                </view>
                <view class="mic-action mic-action--danger" :class="{ disabled: micBusyUserId === item.userId }" @tap="manageMic(item, 'KICK')">移出</view>
              </template>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { formatPrice } from '@/utils/format'
import { withRef } from '@/utils/referral'
import { buildH5Url } from '@/utils/share'
import { liveApi, type ConsoleDanmaku, type ConsoleProduct, type LiveMutedUserItem } from '@/lib/live-data'
import { liveMicApi, type LiveMicItem } from '@/pkg-live/live-mic-data'
import { isLiveTrtcSupported, joinLiveAudio, leaveLiveAudio } from '@/pkg-live/live-trtc-client'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _goBack = goBack // 保留返回工具（顶栏无返回键时用于兜底）

// ===== 三态 UI =====
const loading = ref(true)
const error = ref('')
const consoleId = ref('1')
const roomTitle = ref('')
const isObsMode = ref(false)
const isHostCompanion = ref(false)
const consoleMode = ref(false)

// ===== 数据（由 API 异步获取）=====
const stats = ref({
  onlineCount: 0,
  totalViews: 0,
  newFollowers: 0,
  totalGift: 0,
  totalSales: 0,
  peakOnline: 0,
  avgWatchTime: '0:00',
  interactionRate: '0%',
})
const danmakuList = ref<ConsoleDanmaku[]>([])
const products = ref<ConsoleProduct[]>([])

// ===== UI 状态 =====
const liveTime = ref(0) // 已播秒数
const danmakuScrollTop = ref(0)
const showEndDialog = ref(false)
const showProductSheet = ref(false)
const showMutedSheet = ref(false)
const showMicSheet = ref(false)
useOverlayScrollLock(() =>
  showEndDialog.value || showProductSheet.value || showMutedSheet.value || showMicSheet.value,
)
const mutedUsers = ref<LiveMutedUserItem[]>([])
const mutedLoading = ref(false)
const mutedError = ref('')
const unmutingUserId = ref('')
const canUseLiveMic = isLiveTrtcSupported()
const micItems = ref<LiveMicItem[]>([])
const micLoading = ref(false)
const micBusyUserId = ref('')
const pendingMicCount = computed(() => micItems.value.filter((item) => item.status === 'PENDING').length)
let hostRtcJoined = false
let micPollTimer: ReturnType<typeof setInterval> | null = null

// 画质档来自直播间；付费档剩余分钟来自额度账户。额度接口失败时只显示档位，不伪造 0。
const quality = ref<'basic' | 'hd' | 'uhd'>('basic')
const remainMinutes = ref(0)
const quotaLoaded = ref(false)
const qualityLabel = computed(() => quality.value === 'uhd' ? '超清' : quality.value === 'hd' ? '高清' : '标清')
const qualityStatusLabel = computed(() =>
  quality.value === 'basic' || !quotaLoaded.value ? qualityLabel.value : `${qualityLabel.value} · 剩余 ${remainMinutes.value} 分钟`,
)
const remainWarn = computed(() => quality.value !== 'basic' && quotaLoaded.value && remainMinutes.value > 0 && remainMinutes.value < 15)

// 本场收入 = 打赏 + 带货 GMV（金额单位分→元由 formatPrice 处理，这里 stats 已是元口径展示值）
const sessionIncome = computed(() => (stats.value.totalGift || 0) + (stats.value.totalSales || 0))

// ===== 格式化 =====
function formatNum(n: number) {
  return (n || 0).toLocaleString('en-US')
}
function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (v: number) => v.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
const humanDuration = computed(() => {
  const h = Math.floor(liveTime.value / 3600)
  const m = Math.floor((liveTime.value % 3600) / 60)
  return h > 0 ? `${h}小时${m}分` : `${m}分`
})

// ===== API 数据获取 =====
async function fetchData(silent = false) {
  if (!silent) {
    loading.value = true
    error.value = ''
  }
  try {
    const [res, quota] = await Promise.all([
      liveApi.getConsoleData(consoleId.value),
      liveApi.getQuota().catch(() => null),
    ])
    roomTitle.value = res.title || ''
    stats.value = res.stats
    danmakuList.value = res.danmaku
    products.value = res.products
    quality.value = res.quality
    quotaLoaded.value = quota !== null
    remainMinutes.value = quota
      ? (res.quality === 'uhd' ? quota.uhdMinutes : res.quality === 'hd' ? quota.hdMinutes : 0)
      : 0
    scrollDanmakuToBottom()
  } catch (e) {
    // 后台轮询失败时保留上一帧数据，避免弱网下反复弹 Toast 干扰主播操作。
    if (!silent) error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    if (!silent) loading.value = false
  }
}

const refreshAfterProductEdit = ref(false)
function goManageProducts() {
  showProductSheet.value = false
  refreshAfterProductEdit.value = true
  navigateTo(`/pkg-live/products/index?id=${consoleId.value}`)
}
onShow(() => {
  if (!refreshAfterProductEdit.value) return
  refreshAfterProductEdit.value = false
  fetchData(true)
})

function scrollDanmakuToBottom() {
  danmakuScrollTop.value = danmakuList.value.length * 9999
}

// ===== 计时器 =====
let liveTimer: ReturnType<typeof setInterval> | null = null
let consolePollTimer: ReturnType<typeof setInterval> | null = null

onLoad((options) => {
  if (options?.id) consoleId.value = String(options.id)
  isObsMode.value = options?.source === 'obs'
  isHostCompanion.value = options?.source === 'host'
  consoleMode.value = isObsMode.value || isHostCompanion.value
  fetchData()
  if (canUseLiveMic) {
    void loadMics()
    micPollTimer = setInterval(() => { void loadMics(true) }, 2500)
  }
  liveTimer = setInterval(() => {
    liveTime.value += 1
  }, 1000)
  consolePollTimer = setInterval(() => { void fetchData(true) }, 3000)
})

// 主播页禁止直接返回造成「本地推流已停、服务端仍直播中」；统一走下播确认。
onBackPress(() => {
  if (isHostCompanion.value) {
    uni.navigateBack()
    return true
  }
  if (!showEndDialog.value) showEndDialog.value = true
  return true
})

function returnToHost() {
  uni.navigateBack()
}

onUnmounted(() => {
  if (liveTimer) clearInterval(liveTimer)
  if (micPollTimer) clearInterval(micPollTimer)
  if (consolePollTimer) clearInterval(consolePollTimer)
  if (!isHostCompanion.value) leaveLiveAudio()
})

async function loadMics(silent = false) {
  if (!canUseLiveMic || micLoading.value) return
  if (!silent) micLoading.value = true
  try {
    micItems.value = await liveMicApi.list(consoleId.value)
    if (hostRtcJoined && !micItems.value.some((item) => item.status === 'OCCUPIED' || item.status === 'MUTED')) {
      leaveLiveAudio()
      hostRtcJoined = false
    }
  } catch (error) {
    if (!silent) uni.showToast({ title: (error as Error)?.message || '连麦列表加载失败', icon: 'none' })
  } finally {
    if (!silent) micLoading.value = false
  }
}

function openMicSheet() {
  showMicSheet.value = true
  void loadMics()
}

function shortUserId(userId: string) {
  return userId.length > 8 ? userId.slice(-8) : userId
}

function micStatusText(status: LiveMicItem['status']) {
  if (status === 'PENDING') return '等待审批'
  if (status === 'MUTED') return '连麦中 · 已静音'
  return '连麦中'
}

async function ensureHostRtc() {
  if (hostRtcJoined) return
  const config = await liveMicApi.getRtcConfig(consoleId.value)
  await joinLiveAudio(config)
  hostRtcJoined = true
}

async function manageMic(item: LiveMicItem, action: 'ACCEPT' | 'REJECT' | 'MUTE' | 'UNMUTE' | 'KICK') {
  if (micBusyUserId.value) return
  micBusyUserId.value = item.userId
  try {
    // 先确保主播已进入 TRTC 房间，再放行观众，避免对方进房后无人接听。
    if (action === 'ACCEPT') await ensureHostRtc()
    await liveMicApi.manage(consoleId.value, item.userId, action, item.position)
    await loadMics(true)
    const message: Record<typeof action, string> = {
      ACCEPT: '已接受连麦', REJECT: '已拒绝', MUTE: '已静音', UNMUTE: '已解除静音', KICK: '已移出连麦',
    }
    uni.showToast({ title: message[action], icon: 'none' })
  } catch (error) {
    uni.showToast({ title: (error as Error)?.message || '连麦操作失败', icon: 'none' })
  } finally {
    micBusyUserId.value = ''
  }
}

// ===== 弹幕长按 → 禁言/复制 =====
function onDanmakuLongPress(item: ConsoleDanmaku) {
  uni.showActionSheet({
    itemList: ['禁言该用户', '复制内容'],
    success: (res) => {
      if (res.tapIndex === 0) confirmMute(item)
      else if (res.tapIndex === 1) copyContent(item)
    },
  })
}

function copyContent(item: ConsoleDanmaku) {
  uni.setClipboardData({ data: item.content, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}

// 禁言 — POST /live/rooms/:id/mute（房主或管理员）
function confirmMute(item: ConsoleDanmaku) {
  if (!item.userId) {
    uni.showToast({ title: '无法定位该用户', icon: 'none' })
    return
  }
  uni.showModal({
    title: '禁言用户',
    content: `确定禁言「${item.user}」吗？禁言后其将无法在本直播间发言。`,
    confirmText: '禁言',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await liveApi.muteUser(consoleId.value, item.userId!)
        uni.showToast({ title: '已禁言', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '禁言失败', icon: 'none' })
      }
    },
  })
}

// ===== 禁言名单 =====
async function loadMutedUsers() {
  if (mutedLoading.value) return
  mutedLoading.value = true
  mutedError.value = ''
  try {
    mutedUsers.value = await liveApi.getMutedUsers(consoleId.value)
  } catch (e) {
    mutedError.value = (e as Error)?.message || '禁言名单加载失败，请重试'
  } finally {
    mutedLoading.value = false
  }
}

function openMutedSheet() {
  showMutedSheet.value = true
  loadMutedUsers()
}

function formatMutedStatus(item: LiveMutedUserItem) {
  if (item.isPermanent || !item.expiresAt) return '永久禁言'
  const date = new Date(item.expiresAt)
  if (Number.isNaN(date.getTime())) return '限时禁言'
  const pad = (value: number) => String(value).padStart(2, '0')
  return `禁言至 ${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function confirmUnmute(item: LiveMutedUserItem) {
  if (unmutingUserId.value) return
  uni.showModal({
    title: '解除禁言',
    content: `确定允许「${item.nickname}」重新在本直播间发言吗？`,
    confirmText: '解除',
    success: (res) => {
      if (!res.confirm) return
      unmutingUserId.value = item.userId
      liveApi.unmuteUser(consoleId.value, item.userId)
        .then(() => {
          mutedUsers.value = mutedUsers.value.filter((muted) => muted.userId !== item.userId)
          uni.showToast({ title: '已解除禁言', icon: 'success' })
        })
        .catch((e) => {
          uni.showToast({ title: (e as Error)?.message || '解除失败，请重试', icon: 'none' })
        })
        .finally(() => {
          unmutingUserId.value = ''
        })
    },
  })
}

function buildShareUrl(): string {
  return withRef(buildH5Url('pkg-live/watch/index', { id: consoleId.value }))
}

// ===== 分享直播间：H5 优先系统分享，不支持时复制可归因链接 =====
async function onShareRoom() {
  const url = buildShareUrl()
  // #ifdef H5
  const webNavigator = navigator as Navigator & {
    share?: (data: { title?: string; url?: string }) => Promise<void>
  }
  if (typeof webNavigator.share === 'function') {
    try {
      await webNavigator.share({ title: roomTitle.value || '直播间', url })
      return
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
    }
  }
  // #endif
  uni.setClipboardData({
    data: url,
    success: () => uni.showToast({ title: '直播链接已复制，可粘贴分享给好友', icon: 'none' }),
  })
}

// ===== 时长续购：进入真实画质时长包购买页 =====
function onRenewDuration() {
  uni.navigateTo({ url: '/pkg-live/quality-packages/index' })
}

// ===== 下播 — PUT /live/rooms/:id/end（房主本人有权）=====
const ending = ref(false)
async function onConfirmEnd() {
  if (ending.value) return
  ending.value = true
  uni.showLoading({ title: '正在下播…' })
  try {
    await liveApi.endLive(consoleId.value)
    leaveLiveAudio()
    showEndDialog.value = false
    uni.hideLoading()
    if (isHostCompanion.value) {
      const endedRoomId = consoleId.value
      uni.navigateBack({
        success: () => setTimeout(() => uni.$emit('live:host-ended', endedRoomId), 80),
        fail: () => uni.redirectTo({ url: `/pkg-live/end/index?id=${endedRoomId}` }),
      })
      return
    }
    uni.redirectTo({ url: `/pkg-live/end/index?id=${consoleId.value}` })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: (e as Error)?.message || '下播失败，请重试', icon: 'none' })
  } finally {
    ending.value = false
  }
}
</script>

<style scoped>
/* ===== 深色 token ===== */
.page {
  min-height: 100vh;
  height: 100vh;
  background: #17141a;
  display: flex;
  flex-direction: column;
}

.mic-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #2a2530;
}
.mic-user { flex: 1; min-width: 0; }
.mic-user-name { display: block; color: #f2edf3; font-size: 27rpx; }
.mic-user-state { display: block; margin-top: 8rpx; color: #938995; font-size: 23rpx; }
.mic-actions { display: flex; gap: 12rpx; }
.mic-action {
  padding: 14rpx 20rpx;
  border-radius: 14rpx;
  color: #d7ced9;
  background-color: #332d3a;
  font-size: 24rpx;
}
.mic-action--primary { color: #fff; background-color: #3978f6; }
.mic-action--danger { color: #ffaca8; background-color: #472b30; }
.mic-action.disabled { opacity: 0.45; pointer-events: none; }

/* ── 顶部状态条 ── */
.topbar {
  height: 104rpx;
  display: flex;
  align-items: center;
  padding: 0 28rpx;
  border-bottom: 2rpx solid #2a2530;
  flex-shrink: 0;
}
.live {
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: #c41e3a;
  border-radius: 999rpx;
  padding: 8rpx 20rpx;
}
.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #fff;
  animation: breath 1.6s ease-in-out infinite;
}
@keyframes breath {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}
.live-txt {
  font-size: 24rpx;
  font-weight: 600;
  color: #fff;
}
.time-txt {
  font-size: 24rpx;
  color: #a89fa8;
  margin-left: 20rpx;
}
.qtag {
  background: #221e28;
  border-radius: 999rpx;
  padding: 8rpx 20rpx;
  margin-left: 20rpx;
}
.qtag-txt {
  font-size: 24rpx;
  color: #c9a96e;
}
.qtag.warn {
  background: #3a2417;
  border: 2rpx solid #5a3a22;
}
.qtag.warn .qtag-txt {
  color: #e8833a;
  font-weight: 600;
}
.modebtn {
  margin-left: auto;
  border-radius: 999rpx;
  padding: 10rpx 22rpx;
  background: #302936;
}
.modebtn-txt { color: #f5f0eb; font-size: 23rpx; font-weight: 600; }
.endbtn {
  margin-left: 14rpx;
  border: 2rpx solid #4a424f;
  border-radius: 999rpx;
  padding: 10rpx 28rpx;
}
.endbtn-txt {
  font-size: 24rpx;
  color: #a89fa8;
}

/* ── 主播画面：切换控制台时保留小窗，推流组件不销毁 ── */
.preview {
  height: 560rpx;
  flex-shrink: 0;
  background: #070709;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: height .2s ease;
}
.preview.compact { height: 230rpx; }
.preview-unavailable { width: 100%; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; }
.preview-unavailable-title { color: #e8e1e9; font-size: 27rpx; }
.preview-unavailable-sub { color: #817784; font-size: 23rpx; }
.preview-status { order: -1; min-height: 48rpx; display: flex; align-items: center; gap: 10rpx; padding: 6rpx 22rpx; color: #e8e1e9; font-size: 22rpx; background: #100e12; }
.preview-status.error { color: #ffb2ad; }
.preview-dot { width: 13rpx; height: 13rpx; border-radius: 50%; background: #d18c33; }
.preview-dot.connected { background: #33ca75; box-shadow: 0 0 12rpx rgba(51,202,117,.7); }
.preview-actions { min-height: 70rpx; display: flex; justify-content: flex-end; align-items: center; gap: 12rpx; padding: 8rpx 18rpx; background: #100e12; }
.preview-action { padding: 12rpx 18rpx; border-radius: 999rpx; color: #f5f0eb; font-size: 22rpx; background: rgba(23,20,26,.82); border: 1rpx solid rgba(255,255,255,.2); }
.preview-action--retry { background: rgba(154,107,49,.92); border-color: #c8924c; font-weight: 600; }
.preview-action--primary { background: rgba(196,30,58,.92); border-color: #c41e3a; font-weight: 600; }
.room-section-title { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 28rpx 10rpx; color: #f3edf4; font-size: 27rpx; font-weight: 600; }
.room-section-meta { color: #8f8592; font-size: 22rpx; font-weight: 400; }

/* ── 数据看板 ── */
.stats {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 28rpx;
  flex-shrink: 0;
}
.stat {
  flex: 1;
  background: #221e28;
  border-radius: 24rpx;
  padding: 20rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-n {
  font-size: 34rpx;
  font-weight: 700;
  color: #f5f0eb;
}
.stat-n.gold {
  color: #c9a96e;
}
.stat-l {
  font-size: 20rpx;
  color: #6e6470;
  margin-top: 6rpx;
}

/* ── 时长警示横幅 ── */
.banner {
  margin: 0 28rpx 16rpx;
  background: #3a2417;
  border: 2rpx solid #5a3a22;
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.banner-txt {
  font-size: 24rpx;
  color: #e8833a;
}
.banner-link {
  font-size: 24rpx;
  color: #f5f0eb;
  font-weight: 600;
  text-decoration: underline;
}

/* ── 弹幕流 ── */
.danmu {
  flex: 1;
  height: 0;
  padding: 8rpx 28rpx 24rpx;
}
.sys {
  text-align: center;
  font-size: 22rpx;
  color: #5a525e;
  padding: 12rpx 0;
}
.dm {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  max-width: 86%;
  margin-bottom: 16rpx;
}
.av {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #2e2836;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.av-txt {
  font-size: 24rpx;
  color: #a89fa8;
}
.bd {
  background: #221e28;
  border-radius: 8rpx 24rpx 24rpx 24rpx;
  padding: 12rpx 20rpx;
}
.bd-user {
  font-size: 24rpx;
  font-weight: 600;
  color: #8b7fa0;
  display: block;
}
.bd-user.vip {
  color: #c9a96e;
}
.bd-content {
  font-size: 26rpx;
  line-height: 1.5;
  color: #f5f0eb;
}

/* 弹幕空态 */
.danmu-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.empty-title {
  font-size: 26rpx;
  color: #a89fa8;
  line-height: 2;
}
.empty-sub {
  font-size: 24rpx;
  color: #6e6470;
  margin-bottom: 16rpx;
}
.sharebtn {
  border: 2rpx solid #c41e3a;
  border-radius: 999rpx;
  padding: 12rpx 36rpx;
}
.sharebtn-txt {
  font-size: 24rpx;
  color: #c41e3a;
}

/* ── 底部操作栏 ── */
.opbar {
  height: 152rpx;
  border-top: 2rpx solid #2a2530;
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  background: #17141a;
}
.op {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}
.op-ic {
  width: 56rpx;
  height: 56rpx;
  border: 2rpx solid #3a3440;
  border-radius: 16rpx;
  background: #221e28;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.op-cnt {
  position: absolute;
  top: -12rpx;
  right: -18rpx;
  background: #eb2f96;
  border-radius: 999rpx;
  padding: 2rpx 10rpx;
  min-width: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.op-cnt-txt {
  font-size: 18rpx;
  color: #fff;
}
.op-txt {
  font-size: 22rpx;
  color: #a89fa8;
}

/* ── 弹窗（不透明纯色卡·X5 安全） ── */
.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.dialog {
  width: 560rpx;
  background: #221e28;
  border: 2rpx solid #332d3a;
  border-radius: 36rpx;
  padding: 48rpx 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dialog-title {
  font-size: 32rpx;
  color: #f5f0eb;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.dialog-desc {
  font-size: 24rpx;
  color: #a89fa8;
  line-height: 1.7;
  text-align: center;
  margin-bottom: 36rpx;
}
.dialog-btns {
  display: flex;
  gap: 20rpx;
  width: 100%;
}
.dialog-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-btn.cancel {
  border: 2rpx solid #4a424f;
  background: transparent;
}
.dialog-btn.confirm {
  background: #c41e3a;
}
.dialog-btn-txt {
  font-size: 28rpx;
}
.cancel-txt {
  color: #a89fa8;
}
.confirm-txt {
  color: #fff;
  font-weight: 600;
}

/* ── 商品/禁言半屏 ── */
.sheet-mask {
  align-items: flex-end;
}
.sheet {
  width: 100%;
  height: 70vh;
  max-height: 70vh;
  box-sizing: border-box;
  background: #221e28;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  display: flex;
  flex-direction: column;
}
.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  border-bottom: 2rpx solid #332d3a;
}
.sheet-actions {
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.sheet-manage {
  color: #c9a96e;
  font-size: 24rpx;
  font-weight: 600;
}
.sheet-title {
  font-size: 30rpx;
  color: #f5f0eb;
  font-weight: 600;
}
.sheet-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-body {
  box-sizing: border-box;
  padding: 16rpx 28rpx 40rpx;
  height: 0;
  flex: 1;
}
.sheet-empty {
  padding: 80rpx 0;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
.sheet-empty-txt {
  font-size: 26rpx;
  color: #6e6470;
}
.sheet-empty-btn {
  margin-top: 20rpx;
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  border: 1rpx solid #c9a96e;
  color: #c9a96e;
  font-size: 24rpx;
  display: flex;
  align-items: center;
}
.prod {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #2a2530;
}
.prod-img {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: #2e2836;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.prod-info {
  flex: 1;
  min-width: 0;
}
.prod-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.prod-name {
  font-size: 26rpx;
  color: #f5f0eb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prod-tag {
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  flex-shrink: 0;
}
.prod-tag.live-tag {
  background: #c41e3a;
}
.prod-tag.hot-tag {
  background: #eb2f96;
}
.prod-tag-txt {
  font-size: 18rpx;
  color: #fff;
}
.prod-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 8rpx;
}
.prod-price {
  font-size: 26rpx;
  color: #c9a96e;
  font-weight: 600;
}
.prod-stock {
  font-size: 22rpx;
  color: #6e6470;
}

.sheet-state {
  min-height: 320rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
}
.sheet-state-txt {
  font-size: 25rpx;
  color: #8e858f;
  line-height: 1.5;
  text-align: center;
}
.sheet-state-txt.error {
  color: #c7bdc8;
}
.sheet-retry {
  height: 64rpx;
  padding: 0 30rpx;
  border: 1rpx solid #c9a96e;
  border-radius: 999rpx;
  color: #c9a96e;
  font-size: 24rpx;
  display: flex;
  align-items: center;
}
.muted-row {
  min-height: 116rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  border-bottom: 2rpx solid #2a2530;
}
.muted-avatar {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  background: #312b38;
  display: flex;
  align-items: center;
  justify-content: center;
}
.muted-avatar-img {
  width: 100%;
  height: 100%;
}
.muted-avatar-txt {
  font-size: 28rpx;
  color: #b8afb9;
}
.muted-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.muted-name {
  color: #f5f0eb;
  font-size: 27rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.muted-meta {
  color: #746b76;
  font-size: 22rpx;
}
.muted-action {
  flex-shrink: 0;
  color: #c9a96e;
  font-size: 24rpx;
  padding: 18rpx 0 18rpx 24rpx;
}
.muted-action.disabled {
  color: #5f5661;
}

/* ===== 错误态 ===== */
.error-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #17141a;
  padding: 48rpx;
}
.error-text {
  font-size: 28rpx;
  color: #a89fa8;
  margin-bottom: 32rpx;
}
.retry-btn {
  padding: 20rpx 64rpx;
  background: #c41e3a;
  color: #fff;
  border-radius: 999rpx;
  font-size: 28rpx;
}

/* ===== 骨架屏（深色 shimmer） ===== */
.sk-page {
  min-height: 100vh;
  height: 100vh;
  background: #17141a;
  display: flex;
  flex-direction: column;
}
.sk {
  background: linear-gradient(90deg, #221e28 25%, #2c2733 50%, #221e28 75%);
  background-size: 200% 100%;
  animation: sk 1.4s infinite;
  border-radius: 16rpx;
}
@keyframes sk {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.sk-topbar {
  height: 104rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 28rpx;
  border-bottom: 2rpx solid #2a2530;
}
.sk-pill {
  height: 48rpx;
  border-radius: 999rpx;
}
.sk-w96 { width: 160rpx; }
.sk-w180 { width: 260rpx; }
.sk-ml-auto { margin-left: auto; }
.sk-stats {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 28rpx;
}
.sk-stat {
  flex: 1;
  height: 116rpx;
}
.sk-danmu {
  flex: 1;
  padding: 16rpx 28rpx;
}
.sk-dm-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.sk-av {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
}
.sk-dm-bd {
  height: 68rpx;
}
.sk-w280 { width: 400rpx; }
.sk-w340 { width: 480rpx; }
.sk-w240 { width: 340rpx; }
.sk-opbar {
  height: 152rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 28rpx;
  border-top: 2rpx solid #2a2530;
}
.sk-op {
  flex: 1;
  height: 88rpx;
}

/* ── 等宽字体 ── */
.mono {
  font-family: "SF Mono", Menlo, Consolas, monospace;
}
</style>
