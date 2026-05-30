<template>
  <view class="page">
    <!-- 加载 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">直播间加载中...</text>
    </view>

    <!-- 房间内容 -->
    <template v-else-if="room">
      <!-- 播放器区域 -->
      <view class="player-area" @click="toggleControls">
        <!-- #ifdef H5 -->
        <video
          v-if="playUrl"
          :src="playUrl"
          class="player-video"
          autoplay
          muted
          controls
          object-fit="contain"
          @error="onVideoError"
        />
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <image v-if="room.cover" :src="room.cover" class="player-bg" mode="aspectFill" />
        <!-- #endif -->
        <view v-if="!playUrl && !room.cover" class="player-placeholder" />

        <view class="player-overlay" :class="{ hidden: !showControls }">
          <!-- 顶部栏 -->
          <view class="top-bar">
            <text class="back-btn" @click.stop="goBack">←</text>
            <view class="host-info">
              <image v-if="room.user?.avatar" :src="room.user.avatar" class="host-avatar" mode="aspectFill" />
              <view v-else class="host-avatar-placeholder" />
              <view class="host-text">
                <text class="host-name">{{ room.user?.nickname || '主播' }}</text>
                <text class="host-fans">{{ viewCountText }} 观看</text>
              </view>
            </view>
            <view class="top-actions">
              <text class="action-btn" @click.stop="shareRoom">↗</text>
              <text class="action-btn" @click.stop="goBack">✕</text>
            </view>
          </view>

          <!-- 状态标签 -->
          <view class="status-badge" :class="room.status">
            <text v-if="room.status === 'LIVING'" class="status-dot living" />
            <text>{{ statusText }}</text>
          </view>

          <!-- 秒杀商品浮窗 -->
          <view v-if="flashSales.length && showFlashSale" class="flash-popup" @click.stop>
            <view class="flash-header">
              <text class="flash-title">⚡ 限时秒杀</text>
              <text class="flash-close" @click.stop="showFlashSale = false">✕</text>
            </view>
            <scroll-view scroll-x class="flash-scroll">
              <view v-for="fs in flashSales" :key="fs.id" class="flash-item" @click.stop="buyFlash(fs)">
                <text class="fs-price">{{ fs.flashPrice }}币</text>
                <text class="fs-stock">剩{{ fs.stock - fs.soldCount }}件</text>
                <text class="fs-btn">抢购</text>
              </view>
            </scroll-view>
          </view>

          <!-- 礼物选择面板 -->
          <view v-if="showGiftPanel" class="gift-panel" @click.stop>
            <view class="gift-panel-header">
              <text class="gift-panel-title">送礼物</text>
              <text class="gift-panel-close" @click="showGiftPanel = false">✕</text>
            </view>
            <scroll-view scroll-x class="gift-scroll">
              <view v-for="g in gifts" :key="g.id" class="gift-item" @click="sendGiftAction(g)">
                <text class="gift-icon">{{ g.icon || '🎁' }}</text>
                <text class="gift-name">{{ g.name }}</text>
                <text class="gift-price">{{ g.priceCoin }}币</text>
              </view>
            </scroll-view>
          </view>

          <!-- 预约按钮 (未开播时) -->
          <view v-if="room.status === 'WAITING'" class="book-area" @click.stop>
            <view class="book-card">
              <text class="book-count">{{ bookingCount }}人已预约</text>
              <view class="book-btn" :class="{ booked: isBooked }" @click="toggleBook">
                <text>{{ isBooked ? '已预约' : '预约直播' }}</text>
              </view>
              <text class="book-time" v-if="room.startTime">{{ formatDateTime(room.startTime) }} 开播</text>
            </view>
          </view>

          <!-- 离开提示 -->
          <view v-if="showLeaveTip" class="leave-tip" @click.stop="showLeaveTip = false">
            <text class="leave-text">再逛逛？正在直播中</text>
            <text class="leave-action" @click.stop="goBack">离开</text>
            <text class="leave-stay" @click.stop="showLeaveTip = false">继续观看</text>
          </view>
        </view>
      </view>

      <!-- 聊天消息区 -->
      <view class="chat-area">
        <scroll-view scroll-y class="chat-scroll" :scroll-into-view="'msg-' + (messages.length - 1)">
          <view
            v-for="(msg, i) in messages"
            :key="i"
            :id="'msg-' + i"
            class="chat-msg"
          >
            <text v-if="msg.type === 'system'" class="msg-system">{{ msg.content }}</text>
            <template v-else>
              <text class="msg-user" :style="{ color: msg.color || '#C9A96E' }">{{ msg.nickname || msg.user }}：</text>
              <text class="msg-text">{{ msg.content || msg.text }}</text>
            </template>
          </view>
        </scroll-view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <input
          v-model="inputText"
          class="chat-input"
          placeholder="说点什么..."
          placeholder-style="color: rgba(255,255,255,0.4)"
          :disabled="sending"
          @confirm="sendMessage"
        />
        <view class="bottom-actions">
          <text class="ba-item" @click="openGiftPanel">🎁</text>
          <text class="ba-item" @click="doLike">❤️{{ likeCount > 0 ? likeCount : '' }}</text>
          <text v-if="flashSales.length" class="ba-item" @click="showFlashSale = !showFlashSale">⚡</text>
          <text class="ba-item" @click="shareRoom">↗</text>
        </view>
      </view>
    </template>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-icon">📡</text>
      <text class="empty-text">房间不存在或已结束</text>
      <text class="empty-back" @click="goBack">返回</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { liveApi, liveRoomApi } from '../../api'

interface ChatMsg {
  id?: string
  type?: string
  user?: string
  userId?: string
  nickname?: string
  content?: string
  text?: string
  color?: string
  timestamp?: number
}

const id = ref('')
const room = ref<any>(null)
const loading = ref(true)
const showControls = ref(true)
const showLeaveTip = ref(false)
const showGiftPanel = ref(false)
const showFlashSale = ref(false)
const inputText = ref('')
const messages = ref<ChatMsg[]>([])
const likeCount = ref(0)
const sending = ref(false)
const playUrl = ref('')
const gifts = ref<any[]>([])
const flashSales = ref<any[]>([])
const bookingCount = ref(0)
const isBooked = ref(false)

let socketTask: any = null
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null
let controlsTimer: ReturnType<typeof setTimeout> | null = null

const viewCountText = computed(() => {
  const v = (room.value?.viewCount || 0) + likeCount.value
  if (v >= 10000) return (v / 10000).toFixed(1) + '万'
  return String(v)
})

const statusText = computed(() => {
  const map: Record<string, string> = {
    LIVING: '直播中',
    WAITING: '即将开始',
    REPLAY: '回放中',
  }
  return map[room.value?.status] || room.value?.status || '未知'
})

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  id.value = opts.id || ''
  if (id.value) {
    fetchRoom()
  } else {
    loading.value = false
  }
})

onUnmounted(() => {
  disconnectWS()
  if (wsReconnectTimer) clearTimeout(wsReconnectTimer)
  if (controlsTimer) clearTimeout(controlsTimer)
})

async function fetchRoom() {
  try {
    room.value = await liveApi.roomDetail(id.value)
    messages.value = [
      { type: 'system', content: '欢迎进入直播间，请文明发言' },
    ]

    if (room.value.status === 'LIVING') {
      await Promise.all([
        fetchPlayUrl(),
        fetchGifts(),
        fetchFlashSales(),
      ])
      connectWS()
    }

    if (room.value.status === 'WAITING') {
      await fetchBookingStatus()
    }
  } catch {
    room.value = null
  } finally {
    loading.value = false
  }
}

async function fetchPlayUrl() {
  try {
    const data = await liveRoomApi.getPlayUrl(id.value)
    // #ifdef H5
    playUrl.value = data?.flv || data?.hls || ''
    // #endif
    // #ifndef H5
    playUrl.value = data?.hls || data?.flv || ''
    // #endif
  } catch {
    // playUrl为空时显示封面
  }
}

function onVideoError(_e: any) {
  // HLS/FLV 地址过期时静默处理
}

async function fetchGifts() {
  try {
    gifts.value = await liveRoomApi.getGifts() || []
  } catch { /* empty */ }
}

async function fetchFlashSales() {
  try {
    flashSales.value = await liveRoomApi.getFlashSales(id.value) || []
  } catch { /* empty */ }
}

async function fetchBookingStatus() {
  try {
    const data = await liveRoomApi.bookings(id.value)
    bookingCount.value = data?.bookingCount || 0
  } catch { /* empty */ }
}

// ---------- WebSocket ----------

function connectWS() {
  if (socketTask) return

  try {
    // #ifdef H5
    const proto = (window.location.protocol === 'https:') ? 'wss:' : 'ws:'
    const wsUrl = proto + '//' + window.location.host + '/ws'
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'live:join', roomId: id.value }))
    }
    ws.onmessage = (event: MessageEvent) => {
      handleWSMessage(event.data)
    }
    ws.onclose = () => {
      socketTask = null
      wsReconnectTimer = setTimeout(connectWS, 3000)
    }
    ws.onerror = () => {
      ws.close()
    }
    socketTask = ws
    // #endif

    // #ifdef MP-WEIXIN
    socketTask = uni.connectSocket({
      url: 'wss://your-domain.com/ws',
      success: () => {},
    })
    socketTask.onOpen(() => {
      socketTask.send({ data: JSON.stringify({ type: 'live:join', roomId: id.value }) })
    })
    socketTask.onMessage((res: any) => {
      handleWSMessage(res.data)
    })
    socketTask.onClose(() => {
      socketTask = null
      wsReconnectTimer = setTimeout(connectWS, 3000)
    })
    socketTask.onError(() => {
      socketTask?.close()
    })
    // #endif
  } catch {
    socketTask = null
  }
}

function disconnectWS() {
  if (socketTask) {
    try {
      // #ifdef H5
      socketTask.close()
      // #endif
      // #ifdef MP-WEIXIN
      socketTask.close({})
      // #endif
    } catch { /* empty */ }
    socketTask = null
  }
}

function handleWSMessage(data: string) {
  try {
    const msg = JSON.parse(data)
    switch (msg.type || msg.event) {
      case 'live:chat':
        messages.value.push({
          userId: msg.userId,
          nickname: msg.nickname,
          content: msg.content,
          color: '#C9A96E',
          timestamp: msg.timestamp,
        })
        break
      case 'live:gift':
        messages.value.push({
          type: 'system',
          content: (msg.nickname || '用户') + ' 送出 ' + msg.giftName + (msg.quantity > 1 ? ' x' + msg.quantity : ''),
        })
        break
      case 'live:like':
        likeCount.value++
        break
      case 'live:user_joined':
        messages.value.push({
          type: 'system',
          content: (msg.nickname || '用户') + ' 进入直播间',
        })
        break
    }
    if (messages.value.length > 100) {
      messages.value = messages.value.slice(-50)
    }
  } catch { /* 非JSON消息忽略 */ }
}

// ---------- 用户操作 ----------

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || sending.value) return
  sending.value = true
  inputText.value = ''

  messages.value.push({ nickname: '我', content: text, color: '#fff' })

  try {
    await liveRoomApi.sendComment(id.value, { content: text })
  } catch {
    // 发送失败消息已本地显示
  } finally {
    sending.value = false
  }
}

function openGiftPanel() {
  if (!gifts.value.length) {
    fetchGifts().then(() => { showGiftPanel.value = true })
    return
  }
  showGiftPanel.value = !showGiftPanel.value
}

async function sendGiftAction(gift: any) {
  showGiftPanel.value = false
  try {
    await liveRoomApi.sendGift(id.value, { giftId: gift.id, quantity: 1 })
    uni.showToast({ title: '送出 ' + gift.name, icon: 'none' })
    messages.value.push({ type: 'system', content: '我送出 ' + gift.name })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '礼物发送失败', icon: 'none' })
  }
}

async function doLike() {
  likeCount.value++
  try {
    await liveRoomApi.toggleLike(id.value)
  } catch {
    // 乐观更新
  }
}

async function toggleBook() {
  try {
    if (isBooked.value) {
      await liveRoomApi.unbook(id.value)
      isBooked.value = false
      bookingCount.value = Math.max(0, bookingCount.value - 1)
    } else {
      await liveRoomApi.book(id.value)
      isBooked.value = true
      bookingCount.value++
    }
    uni.showToast({ title: isBooked.value ? '已预约' : '已取消预约', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

async function buyFlash(fs: any) {
  try {
    await liveRoomApi.flashSaleOrder(fs.id)
    uni.showToast({ title: '抢购成功', icon: 'success' })
    fs.soldCount++
  } catch (e: any) {
    uni.showToast({ title: e?.message || '抢购失败', icon: 'none' })
  }
}

function shareRoom() {
  // #ifdef MP-WEIXIN
  uni.showToast({ title: '请点击右上角分享', icon: 'none' })
  // #endif
  // #ifdef H5
  uni.setClipboardData({ data: window.location.href, success: () => {
    uni.showToast({ title: '链接已复制', icon: 'success' })
  }})
  // #endif
}

function toggleControls() {
  showControls.value = !showControls.value
  if (showControls.value) {
    if (controlsTimer) clearTimeout(controlsTimer)
    controlsTimer = setTimeout(() => {
      showControls.value = false
    }, 6000)
  }
}

function formatDateTime(t: string) {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000)
  const time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  if (diffDays === 0) return '今天 ' + time
  if (diffDays === 1) return '明天 ' + time
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + time
}

function goBack() {
  disconnectWS()
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #0a0a1a; min-height: 100vh; position: relative; overflow: hidden; }
.loading-wrap { display: flex; align-items: center; justify-content: center; height: 100vh; }
.loading-text { color: rgba(255,255,255,0.5); font-size: 15px; }

/* ===== 播放器 ===== */
.player-area { position: absolute; inset: 0; z-index: 1; background: #000; }
.player-video { width: 100%; height: 100%; }
.player-bg { width: 100%; height: 100%; filter: brightness(0.6); }
.player-placeholder { width: 100%; height: 100%; background: linear-gradient(180deg, #1a1a3e, #0a0a1a); }

.player-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; transition: opacity 0.3s; }
.player-overlay.hidden { opacity: 0; pointer-events: none; }

/* 顶部栏 */
.top-bar { display: flex; align-items: center; padding: 14px 12px; padding-top: calc(14px + env(safe-area-inset-top, 0px)); gap: 10px; }
.back-btn { font-size: 22px; color: #fff; padding: 0 4px; }
.host-info { flex: 1; display: flex; align-items: center; gap: 8px; }
.host-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #C9A96E; }
.host-avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2); }
.host-text { display: flex; flex-direction: column; }
.host-name { font-size: 14px; font-weight: bold; color: #fff; }
.host-fans { font-size: 11px; color: rgba(255,255,255,0.6); }
.top-actions { display: flex; gap: 16px; }
.action-btn { font-size: 20px; color: #fff; }

/* 状态标签 */
.status-badge { position: absolute; top: 100px; left: 16px; background: rgba(0,0,0,0.5); padding: 4px 12px; border-radius: 12px; display: flex; align-items: center; gap: 6px; }
.status-badge text { font-size: 12px; color: #fff; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.status-dot.living { background: #C41E3A; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.status-badge.WAITING { background: rgba(64,158,255,0.5); }
.status-badge.REPLAY { background: rgba(144,147,153,0.5); }

/* 秒杀浮窗 */
.flash-popup { position: absolute; top: 140px; left: 0; right: 0; z-index: 20; padding: 0 12px; }
.flash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.flash-title { font-size: 14px; color: #FF6B00; font-weight: bold; }
.flash-close { font-size: 16px; color: #fff; padding: 4px; }
.flash-scroll { white-space: nowrap; display: flex; gap: 8px; }
.flash-item { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; background: rgba(0,0,0,0.7); border-radius: 8px; padding: 8px 14px; border: 1px solid rgba(255,107,0,0.4); }
.fs-price { font-size: 15px; color: #FF6B00; font-weight: bold; }
.fs-stock { font-size: 10px; color: rgba(255,255,255,0.5); }
.fs-btn { font-size: 11px; color: #fff; background: #FF6B00; padding: 2px 10px; border-radius: 10px; }

/* 礼物面板 */
.gift-panel { position: absolute; bottom: 60px; left: 0; right: 0; z-index: 20; background: rgba(0,0,0,0.9); padding: 12px; border-radius: 12px 12px 0 0; }
.gift-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.gift-panel-title { font-size: 14px; color: #fff; font-weight: bold; }
.gift-panel-close { font-size: 16px; color: #fff; padding: 4px; }
.gift-scroll { white-space: nowrap; display: flex; gap: 10px; }
.gift-item { display: inline-flex; flex-direction: column; align-items: center; gap: 4px; width: 72px; padding: 8px 0; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid transparent; }
.gift-item:active { border-color: #C9A96E; }
.gift-icon { font-size: 32px; }
.gift-name { font-size: 11px; color: rgba(255,255,255,0.7); }
.gift-price { font-size: 10px; color: #C9A96E; }

/* 预约区 */
.book-area { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 20; }
.book-card { display: flex; flex-direction: column; align-items: center; gap: 10px; background: rgba(0,0,0,0.8); border-radius: 16px; padding: 24px 32px; }
.book-count { font-size: 13px; color: rgba(255,255,255,0.6); }
.book-btn { padding: 10px 32px; background: #C41E3A; border-radius: 22px; color: #fff; font-size: 15px; font-weight: bold; }
.book-btn.booked { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.6); }
.book-time { font-size: 12px; color: #C9A96E; }

/* 离开提示 */
.leave-tip { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.85); border-radius: 12px; padding: 20px; text-align: center; display: flex; flex-direction: column; gap: 10px; min-width: 200px; z-index: 30; }
.leave-text { font-size: 14px; color: rgba(255,255,255,0.8); }
.leave-action { font-size: 14px; color: #C41E3A; padding: 8px; }
.leave-stay { font-size: 14px; color: #C9A96E; padding: 8px; font-weight: bold; }

/* ===== 聊天区 ===== */
.chat-area { position: absolute; bottom: 60px; left: 12px; right: 12px; z-index: 5; max-height: 220px; }
.chat-scroll { max-height: 220px; }
.chat-msg { padding: 2px 0; display: flex; flex-wrap: wrap; }
.msg-system { font-size: 11px; color: rgba(255,255,255,0.4); width: 100%; text-align: center; padding: 2px 0; }
.msg-user { font-size: 12px; font-weight: bold; flex-shrink: 0; margin-right: 4px; }
.msg-text { font-size: 12px; color: #fff; }

/* ===== 底部操作栏 ===== */
.bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 8px; padding: 8px 12px; padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px)); background: linear-gradient(transparent, rgba(0,0,0,0.6)); z-index: 10; }
.chat-input { flex: 1; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 8px 16px; font-size: 13px; color: #fff; border: 1px solid rgba(255,255,255,0.2); }
.bottom-actions { display: flex; gap: 12px; }
.ba-item { font-size: 24px; color: #fff; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 12px; }
.empty-icon { font-size: 48px; }
.empty-text { color: rgba(255,255,255,0.5); font-size: 15px; }
.empty-back { color: #C9A96E; font-size: 14px; padding: 8px 24px; border: 1px solid #C9A96E; border-radius: 20px; }
</style>
