<template>
  <view class="page">
    <!-- 加载 -->
    <DataState
      :is-loading="loading && !room"
      :error="loadError"
      :is-empty="!loading && !room"
      empty-icon="📡"
      empty-title="直播间不存在"
      empty-description="房间已结束或链接无效"
      empty-action-text="返回"
      :empty-show-action="true"
      skeleton-type="detail"
      @retry="fetchRoom"
      @empty-action="goBack"
    >
      <template v-if="room">
        <!-- ===== 播放器区域 ===== -->
        <view
          class="player-area"
          @click="toggleControls"
        >
          <!-- 视频播放器 TRTC 占位 -->
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
          <image
            v-if="room.cover"
            :src="room.cover"
            class="player-bg"
            mode="aspectFill"
          />
          <!-- #endif -->
          <!-- 纯占位 -->
          <view
            v-if="!playUrl && !room.cover"
            class="player-placeholder"
          >
            <text class="placeholder-logo">
              📡
            </text>
            <text
              v-if="room.status === 'LIVING'"
              class="placeholder-text"
            >
              直播已连接
            </text>
            <text
              v-else-if="room.status === 'WAITING'"
              class="placeholder-text"
            >
              等待开播
            </text>
            <text
              v-else
              class="placeholder-text"
            >
              直播已结束
            </text>
          </view>

          <!-- 遮罩层 -->
          <view
            class="player-overlay"
            :class="{ hidden: !showControls }"
          >
            <!-- 顶部栏 -->
            <view class="top-bar">
              <text
                class="back-btn"
                @click.stop="goBack"
              >
                ‹
              </text>
              <view
                class="host-info"
                @click.stop="goHostProfile"
              >
                <image
                  v-if="room.user?.avatar || room.hostAvatar"
                  :src="room.user?.avatar || room.hostAvatar"
                  class="host-avatar"
                  mode="aspectFill"
                />
                <view
                  v-else
                  class="host-avatar-placeholder"
                />
                <view class="host-text">
                  <text class="host-name">
                    {{ room.user?.nickname || room.hostName || '主播' }}
                  </text>
                  <text class="host-fans">
                    {{ viewCountText }} 观看
                  </text>
                </view>
              </view>
              <view class="top-actions">
                <text
                  class="action-btn"
                  @click.stop="shareRoom"
                >
                  ↗
                </text>
                <text
                  class="action-btn"
                  @click.stop="goBack"
                >
                  ✕
                </text>
              </view>
            </view>

            <!-- 直播状态角标 -->
            <view
              class="live-badge"
              :class="room.status"
            >
              <view
                v-if="room.status === 'LIVING'"
                class="badge-dot"
              />
              <text>{{ statusText }}</text>
            </view>

            <!-- 礼物动画横幅 -->
            <view class="gift-banner-area">
              <view
                v-for="(anim, idx) in giftAnimations"
                :key="anim.id"
                class="gift-banner-item"
                :style="{ animationDelay: idx * 0.3 + 's' }"
              >
                <text class="gift-banner-icon">
                  {{ anim.giftIcon || '🎁' }}
                </text>
                <text class="gift-banner-text">
                  <text class="gift-banner-user">
                    {{ anim.userName }}
                  </text>
                  送出
                  <text class="gift-banner-name">
                    {{ anim.giftName }}
                  </text>
                  <text
                    v-if="anim.quantity > 1"
                    class="gift-banner-qty"
                  >
                    x{{ anim.quantity }}
                  </text>
                </text>
              </view>
            </view>

            <!-- 浮动爱心 -->
            <view class="hearts-area">
              <text
                v-for="heart in floatingHearts"
                :key="heart.id"
                class="floating-heart"
                :style="{ left: heart.x + '%' }"
              >
                ❤️
              </text>
            </view>

            <!-- 秒杀商品浮窗 -->
            <view
              v-if="flashSales.length && showFlashSale"
              class="flash-popup"
              @click.stop
            >
              <view class="flash-header">
                <text class="flash-title">
                  ⚡ 限时秒杀
                </text>
                <text
                  class="flash-close"
                  @click.stop="showFlashSale = false"
                >
                  ✕
                </text>
              </view>
              <scroll-view
                scroll-x
                class="flash-scroll"
                show-scrollbar="false"
              >
                <view
                  v-for="fs in flashSales"
                  :key="fs.id"
                  class="flash-item"
                  @click.stop="buyFlash(fs)"
                >
                  <text class="fs-price">
                    {{ fs.flashPrice }}币
                  </text>
                  <text class="fs-name">
                    {{ fs.productName || '商品' }}
                  </text>
                  <text class="fs-stock">
                    剩{{ fs.stock - fs.soldCount }}件
                  </text>
                  <text class="fs-btn">
                    抢购
                  </text>
                </view>
              </scroll-view>
            </view>

            <!-- 礼物面板 -->
            <view
              v-if="showGiftPanel"
              class="gift-panel"
              @click.stop
            >
              <view class="gift-panel-header">
                <text class="gift-panel-title">
                  送礼物
                </text>
                <text
                  class="gift-panel-close"
                  @click="showGiftPanel = false"
                >
                  ✕
                </text>
              </view>
              <scroll-view
                scroll-x
                class="gift-scroll"
                show-scrollbar="false"
              >
                <view
                  v-for="g in gifts"
                  :key="g.id"
                  class="gift-item"
                  @click="sendGiftAction(g)"
                >
                  <text class="gift-icon">
                    {{ g.icon || '🎁' }}
                  </text>
                  <text class="gift-name">
                    {{ g.name }}
                  </text>
                  <text class="gift-price">
                    {{ g.priceCoin || g.price }}币
                  </text>
                </view>
              </scroll-view>
            </view>

            <!-- 商品购物袋入口 -->
            <view
              v-if="products.length > 0 && !showGiftPanel"
              class="product-entrance"
              @click.stop="showProductPanel = !showProductPanel"
            >
              <text class="product-entrance-icon">
                🛍️
              </text>
              <text class="product-entrance-text">
                购物袋
              </text>
              <text class="product-entrance-badge">
                {{ products.length }}
              </text>
            </view>

            <!-- 预约按钮 -->
            <view
              v-if="room.status === 'WAITING' || room.status === 'UPCOMING'"
              class="book-area"
              @click.stop
            >
              <view class="book-card">
                <text class="book-count">
                  {{ bookingCount }}人已预约
                </text>
                <view
                  class="book-btn"
                  :class="{ booked: isBooked }"
                  @click="toggleBook"
                >
                  <text>{{ isBooked ? '已预约' : '预约直播' }}</text>
                </view>
                <text
                  v-if="room.startTime || room.startAt"
                  class="book-time"
                >
                  {{ formatDateTime(room.startTime || room.startAt) }} 开播
                </text>
              </view>
            </view>

            <!-- 离开提示 -->
            <view
              v-if="showLeaveTip"
              class="leave-tip"
              @click.stop="showLeaveTip = false"
            >
              <text class="leave-text">
                再逛逛？正在直播中
              </text>
              <view class="leave-actions">
                <text
                  class="leave-action danger"
                  @click.stop="goBack"
                >
                  离开
                </text>
                <text
                  class="leave-action primary"
                  @click.stop="showLeaveTip = false"
                >
                  继续观看
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 弹幕层 ===== -->
        <view
          v-if="room.status === 'LIVING'"
          class="danmaku-layer"
        >
          <view
            v-for="(dm, idx) in visibleDanmakus"
            :key="dm.id + '-' + idx"
            class="danmaku-item"
            :class="'dm-' + dm.type"
          >
            <text
              v-if="dm.type !== 'system'"
              class="dm-user"
            >
              {{ dm.nickname || dm.user }}：
            </text>
            <text
              v-if="dm.type === 'gift'"
              class="dm-content"
            >
              {{ dm.nickname || '用户' }} 送出 {{ dm.giftName }}{{ dm.quantity > 1 ? ' x' + dm.quantity : '' }}
            </text>
            <text
              v-else-if="dm.type === 'system'"
              class="dm-content dm-system"
            >
              {{ dm.content }}
            </text>
            <text
              v-else
              class="dm-content"
            >
              {{ dm.content || dm.text }}
            </text>
          </view>
        </view>

        <!-- ===== 聊天消息区（非直播时） ===== -->
        <view
          v-if="room.status !== 'LIVING'"
          class="chat-area"
        >
          <scroll-view
            scroll-y
            class="chat-scroll"
            :scroll-into-view="'msg-' + (messages.length - 1)"
          >
            <view
              v-for="(msg, i) in messages"
              :id="'msg-' + i"
              :key="i"
              class="chat-msg"
            >
              <text
                v-if="msg.type === 'system'"
                class="msg-system"
              >
                {{ msg.content }}
              </text>
              <template v-else>
                <text
                  class="msg-user"
                  :style="{ color: msg.color || '#C9A96E' }"
                >
                  {{ msg.nickname || msg.user }}：
                </text>
                <text class="msg-text">
                  {{ msg.content || msg.text }}
                </text>
              </template>
            </view>
          </scroll-view>
        </view>

        <!-- ===== 底部操作栏 ===== -->
        <view class="bottom-bar">
          <input
            v-model="inputText"
            class="chat-input"
            placeholder="说点什么..."
            placeholder-style="color: rgba(255,255,255,0.4)"
            :disabled="sending"
            @confirm="sendMessage"
          >
          <view class="bottom-actions">
            <text
              class="ba-item"
              @click="openGiftPanel"
            >
              🎁
            </text>
            <text
              class="ba-item"
              @click="doLike"
            >
              ❤️
              <text
                v-if="likeCount > 0"
                class="ba-count"
              >
                {{ likeCount }}
              </text>
            </text>
            <text
              v-if="flashSales.length"
              class="ba-item"
              @click="toggleFlashSale"
            >
              ⚡
            </text>
            <text
              v-if="products.length"
              class="ba-item"
              @click="showProductPanel = !showProductPanel"
            >
              🛍️
            </text>
            <text
              class="ba-item"
              @click="shareRoom"
            >
              ↗
            </text>
          </view>
        </view>
      </template>
    </DataState>

    <!-- 商品面板（购物袋） -->
    <view
      v-if="showProductPanel && products.length"
      class="product-panel-mask"
      @click="showProductPanel = false"
    >
      <view
        class="product-panel"
        @click.stop
      >
        <view class="pp-header">
          <text class="pp-title">
            直播商品
          </text>
          <text
            class="pp-close"
            @click="showProductPanel = false"
          >
            ✕
          </text>
        </view>
        <scroll-view
          scroll-y
          class="pp-list"
        >
          <view
            v-for="p in products"
            :key="p.id"
            class="pp-item"
            @click="goProductDetail(p)"
          >
            <image
              v-if="p.cover || p.productCover"
              :src="p.cover || p.productCover"
              class="pp-cover"
              mode="aspectFill"
            />
            <view
              v-else
              class="pp-cover-placeholder"
            >
              🛍️
            </view>
            <view class="pp-info">
              <text class="pp-name">
                {{ p.name || p.productName }}
              </text>
              <text
                v-if="p.flashPrice || p.price"
                class="pp-price"
              >
                <text
                  v-if="p.flashPrice"
                  class="pp-flash"
                >
                  ⚡
                </text>
                ¥{{ ((p.flashPrice || p.price) / 100).toFixed(2) }}
                <text
                  v-if="p.originalPrice"
                  class="pp-original"
                >
                  ¥{{ (p.originalPrice / 100).toFixed(2) }}
                </text>
              </text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { liveApi, liveRoomApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface ChatMsg {
  id?: string
  type?: string
  user?: string
  userId?: string
  nickname?: string
  content?: string
  text?: string
  color?: string
  giftName?: string
  quantity?: number
  timestamp?: number
}

interface GiftAnim {
  id: number
  userName: string
  giftName: string
  giftIcon: string
  quantity: number
}

const id = ref('')
const room = ref<any>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const showControls = ref(true)
const showLeaveTip = ref(false)
const showGiftPanel = ref(false)
const showFlashSale = ref(false)
const showProductPanel = ref(false)
const inputText = ref('')
const messages = ref<ChatMsg[]>([])
const likeCount = ref(0)
const sending = ref(false)
const playUrl = ref('')
const gifts = ref<any[]>([])
const flashSales = ref<any[]>([])
const products = ref<any[]>([])
const bookingCount = ref(0)
const isBooked = ref(false)
const floatingHearts = ref<{ id: number; x: number }[]>([])
const giftAnimations = ref<GiftAnim[]>([])
const visibleDanmakus = ref<ChatMsg[]>([])

let socketTask: any = null
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null
let controlsTimer: ReturnType<typeof setTimeout> | null = null
let heartId = 0
let giftAnimId = 0
let danmakuTimer: ReturnType<typeof setInterval> | null = null

const viewCountText = computed(() => {
  const v = (room.value?.viewCount || 0) + likeCount.value
  if (v >= 10000) return (v / 10000).toFixed(1) + '万'
  return String(v)
})

const statusText = computed(() => {
  const map: Record<string, string> = {
    LIVING: '直播中',
    WAITING: '即将开始',
    UPCOMING: '即将开始',
    REPLAY: '回放中',
    ENDED: '已结束',
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
  if (danmakuTimer) clearInterval(danmakuTimer)
})

// ─── 数据拉取 ───

async function fetchRoom() {
  loading.value = true
  loadError.value = null
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
        fetchProducts(),
      ])
      connectWS()
      startDanmakuLoop()
    } else if (room.value.status === 'WAITING' || room.value.status === 'UPCOMING') {
      await fetchBookingStatus()
    }
  } catch (e: any) {
    room.value = null
    loadError.value = e?.errMsg || e?.message || '加载失败'
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
    gifts.value = (await liveRoomApi.getGifts()) || []
  } catch {
    /* empty */
  }
}

async function fetchFlashSales() {
  try {
    flashSales.value = (await liveRoomApi.getFlashSales(id.value)) || []
  } catch {
    /* empty */
  }
}

async function fetchProducts() {
  try {
    // 尝试获取直播间商品列表
    const res = await liveRoomApi.getFlashSales(id.value)
    if (Array.isArray(res)) {
      products.value = res
    }
  } catch {
    /* empty */
  }
}

async function fetchBookingStatus() {
  try {
    const data = await liveRoomApi.bookings(id.value)
    bookingCount.value = data?.bookingCount || 0
  } catch {
    /* empty */
  }
}

// ─── 弹幕循环 ───

function startDanmakuLoop() {
  danmakuTimer = setInterval(() => {
    if (visibleDanmakus.value.length > 0) {
      visibleDanmakus.value = visibleDanmakus.value.slice(-8)
    }
  }, 5000) as any
}

// ─── WebSocket ───

function connectWS() {
  if (socketTask) return

  try {
    // #ifdef H5
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
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
    } catch {
      /* empty */
    }
    socketTask = null
  }
}

function handleWSMessage(data: string) {
  try {
    const msg = JSON.parse(data)
    switch (msg.type || msg.event) {
      case 'live:chat': {
        const newMsg: ChatMsg = {
          id: Date.now().toString(),
          userId: msg.userId,
          nickname: msg.nickname,
          content: msg.content,
          color: '#C9A96E',
          timestamp: msg.timestamp,
        }
        messages.value.push(newMsg)
        visibleDanmakus.value.push(newMsg)
        break
      }
      case 'live:gift': {
        const giftMsg: ChatMsg = {
          type: 'system',
          content: (msg.nickname || '用户') + ' 送出 ' + msg.giftName + (msg.quantity > 1 ? ' x' + msg.quantity : ''),
          giftName: msg.giftName,
          quantity: msg.quantity,
        }
        messages.value.push(giftMsg)
        visibleDanmakus.value.push(giftMsg)

        // 礼物动画
        giftAnimId++
        giftAnimations.value.push({
          id: giftAnimId,
          userName: msg.nickname || '用户',
          giftName: msg.giftName,
          giftIcon: msg.giftIcon || '🎁',
          quantity: msg.quantity || 1,
        })
        setTimeout(() => {
          giftAnimations.value = giftAnimations.value.slice(-3)
        }, 4000)
        break
      }
      case 'live:like': {
        likeCount.value++
        // 浮动爱心
        heartId++
        floatingHearts.value.push({ id: heartId, x: Math.random() * 70 + 15 })
        setTimeout(() => {
          floatingHearts.value = floatingHearts.value.slice(-20)
        }, 3000)
        break
      }
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
    if (visibleDanmakus.value.length > 20) {
      visibleDanmakus.value = visibleDanmakus.value.slice(-15)
    }
  } catch {
    /* 非JSON消息忽略 */
  }
}

// ─── 用户操作 ───

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || sending.value) return
  sending.value = true
  inputText.value = ''

  messages.value.push({ nickname: '我', content: text, color: '#fff' })
  visibleDanmakus.value.push({ nickname: '我', content: text })

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
    fetchGifts().then(() => {
      showGiftPanel.value = true
    })
    return
  }
  showGiftPanel.value = !showGiftPanel.value
}

function toggleFlashSale() {
  showFlashSale.value = !showFlashSale.value
}

async function sendGiftAction(gift: any) {
  showGiftPanel.value = false
  try {
    await liveRoomApi.sendGift(id.value, { giftId: gift.id, quantity: 1 })
    uni.showToast({ title: '送出 ' + gift.name, icon: 'none' })

    // 本地添加礼物动画
    giftAnimId++
    giftAnimations.value.push({
      id: giftAnimId,
      userName: '我',
      giftName: gift.name,
      giftIcon: gift.icon || '🎁',
      quantity: 1,
    })
    setTimeout(() => {
      giftAnimations.value = giftAnimations.value.slice(-3)
    }, 4000)

    messages.value.push({ type: 'system', content: '我送出 ' + gift.name })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '礼物发送失败', icon: 'none' })
  }
}

async function doLike() {
  likeCount.value++
  heartId++
  floatingHearts.value.push({ id: heartId, x: Math.random() * 70 + 15 })
  setTimeout(() => {
    floatingHearts.value = floatingHearts.value.slice(-20)
  }, 3000)

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
    uni.showToast({
      title: isBooked.value ? '已预约' : '已取消预约',
      icon: 'success',
    })
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

function goProductDetail(p: any) {
  uni.navigateTo({
    url: `/pages/shop/product-detail?id=${p.productId || p.id}`,
  })
}

function goHostProfile() {
  if (room.value?.user?.id || room.value?.hostId) {
    uni.navigateTo({
      url: `/pages/user/profile?id=${room.value.user?.id || room.value.hostId}`,
    })
  }
}

function shareRoom() {
  // #ifdef MP-WEIXIN
  uni.showToast({ title: '请点击右上角分享', icon: 'none' })
  // #endif
  // #ifdef H5
  uni.setClipboardData({
    data: window.location.href,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'success' })
    },
  })
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

function formatDateTime(t: string): string {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000)
  const time =
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  if (diffDays === 0) return '今天 ' + time
  if (diffDays === 1) return '明天 ' + time
  return d.getMonth() + 1 + '/' + d.getDate() + ' ' + time
}

function goBack() {
  disconnectWS()
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #0a0a1a;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* ===== 播放器 ===== */
.player-area {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: #000;
}
.player-video {
  width: 100%;
  height: 100%;
}
.player-bg {
  width: 100%;
  height: 100%;
  filter: brightness(0.6);
}
.player-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #1a1a3e, #0a0a1a);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.placeholder-logo {
  font-size: 96rpx;
  opacity: 0.6;
}
.placeholder-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.5);
}

.player-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  transition: opacity 0.3s;
}
.player-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}

/* 顶部栏 */
.top-bar {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  padding-top: calc(28rpx + env(safe-area-inset-top, 0px));
  gap: 16rpx;
  background: linear-gradient(180deg, rgba(0,0,0,0.6), transparent);
}
.back-btn {
  font-size: 44rpx;
  color: #fff;
  padding: 0 8rpx;
  font-weight: 300;
}
.host-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.host-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  border: 2rpx solid #C9A96E;
}
.host-avatar-placeholder {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}
.host-text {
  display: flex;
  flex-direction: column;
}
.host-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #fff;
}
.host-fans {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
}
.top-actions {
  display: flex;
  gap: 24rpx;
}
.action-btn {
  font-size: 40rpx;
  color: #fff;
}

/* 直播状态角标 */
.live-badge {
  position: absolute;
  top: 160rpx;
  left: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #fff;
  backdrop-filter: blur(4rpx);
}
.live-badge.LIVING {
  background: rgba(196, 30, 58, 0.85);
}
.live-badge.WAITING,
.live-badge.UPCOMING {
  background: rgba(64, 158, 255, 0.6);
}
.live-badge.REPLAY {
  background: rgba(144, 147, 153, 0.6);
}
.live-badge.ENDED {
  background: rgba(144, 147, 153, 0.6);
}
.badge-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #fff;
  animation: breathe 1.5s ease-in-out infinite;
}

/* ===== 礼物动画横幅 ===== */
.gift-banner-area {
  position: absolute;
  top: 200rpx;
  left: 24rpx;
  right: 24rpx;
  z-index: 15;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.gift-banner-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 12rpx;
  padding: 12rpx 20rpx;
  backdrop-filter: blur(4rpx);
  animation: giftSlideIn 0.5s ease-out;
}
@keyframes giftSlideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
.gift-banner-icon {
  font-size: 36rpx;
}
.gift-banner-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
}
.gift-banner-user {
  color: #C9A96E;
  font-weight: bold;
}
.gift-banner-name {
  color: #C41E3A;
  font-weight: bold;
}
.gift-banner-qty {
  color: #C9A96E;
}

/* ===== 浮动爱心 ===== */
.hearts-area {
  position: absolute;
  bottom: 100rpx;
  right: 40rpx;
  z-index: 12;
  pointer-events: none;
}
.floating-heart {
  position: absolute;
  font-size: 40rpx;
  animation: heartFloat 2s ease-out forwards;
}
@keyframes heartFloat {
  0% {
    transform: translateY(0) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translateY(-300rpx) scale(1.2);
    opacity: 0;
  }
}

/* ===== 商品购物袋入口 ===== */
.product-entrance {
  position: absolute;
  top: 260rpx;
  right: 16rpx;
  z-index: 15;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 20rpx;
  padding: 12rpx 16rpx;
  backdrop-filter: blur(4rpx);
}
.product-entrance-icon {
  font-size: 36rpx;
}
.product-entrance-text {
  font-size: 20rpx;
  color: #fff;
}
.product-entrance-badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  min-width: 28rpx;
  height: 28rpx;
  background: #C41E3A;
  color: #fff;
  border-radius: 14rpx;
  font-size: 18rpx;
  text-align: center;
  line-height: 28rpx;
}

/* ===== 秒杀浮窗 ===== */
.flash-popup {
  position: absolute;
  top: 300rpx;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 0 24rpx;
}
.flash-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.flash-title {
  font-size: 28rpx;
  color: #FF6B00;
  font-weight: bold;
}
.flash-close {
  font-size: 32rpx;
  color: #fff;
  padding: 8rpx;
}
.flash-scroll {
  white-space: nowrap;
  display: flex;
  gap: 12rpx;
}
.flash-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  border: 1rpx solid rgba(255, 107, 0, 0.4);
  min-width: 160rpx;
}
.fs-price {
  font-size: 30rpx;
  color: #FF6B00;
  font-weight: bold;
}
.fs-name {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160rpx;
}
.fs-stock {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.5);
}
.fs-btn {
  font-size: 22rpx;
  color: #fff;
  background: #FF6B00;
  padding: 4rpx 20rpx;
  border-radius: 20rpx;
}

/* ===== 礼物面板 ===== */
.gift-panel {
  position: absolute;
  bottom: 120rpx;
  left: 0;
  right: 0;
  z-index: 20;
  background: rgba(0, 0, 0, 0.92);
  padding: 24rpx;
  border-radius: 24rpx 24rpx 0 0;
}
.gift-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.gift-panel-title {
  font-size: 28rpx;
  color: #fff;
  font-weight: bold;
}
.gift-panel-close {
  font-size: 32rpx;
  color: #fff;
  padding: 8rpx;
}
.gift-scroll {
  white-space: nowrap;
  display: flex;
  gap: 16rpx;
}
.gift-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  width: 140rpx;
  padding: 16rpx 0;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1rpx solid transparent;
}
.gift-item:active {
  border-color: #C9A96E;
  background: rgba(201, 169, 110, 0.15);
}
.gift-icon {
  font-size: 56rpx;
}
.gift-name {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}
.gift-price {
  font-size: 20rpx;
  color: #C9A96E;
}

/* ===== 预约区 ===== */
.book-area {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
}
.book-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 24rpx;
  padding: 48rpx 64rpx;
  backdrop-filter: blur(8rpx);
}
.book-count {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.6);
}
.book-btn {
  padding: 20rpx 64rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  border-radius: 44rpx;
  color: #fff;
  font-size: 30rpx;
  font-weight: bold;
  box-shadow: 0 4rpx 20rpx rgba(196, 30, 58, 0.35);
}
.book-btn.booked {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.6);
  box-shadow: none;
}
.book-time {
  font-size: 24rpx;
  color: #C9A96E;
}

/* ===== 离开提示 ===== */
.leave-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.88);
  border-radius: 20rpx;
  padding: 40rpx;
  text-align: center;
  min-width: 400rpx;
  z-index: 30;
  backdrop-filter: blur(8rpx);
}
.leave-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 24rpx;
  display: block;
}
.leave-actions {
  display: flex;
  gap: 20rpx;
  justify-content: center;
}
.leave-action {
  font-size: 28rpx;
  padding: 16rpx 40rpx;
  border-radius: 28rpx;
}
.leave-action.danger {
  color: #C41E3A;
  border: 1rpx solid rgba(196, 30, 58, 0.4);
}
.leave-action.primary {
  color: #fff;
  background: linear-gradient(135deg, #C41E3A, #A01830);
}

/* ===== 弹幕层 ===== */
.danmaku-layer {
  position: absolute;
  bottom: 120rpx;
  left: 16rpx;
  right: 16rpx;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  pointer-events: none;
}
.danmaku-item {
  font-size: 24rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  max-width: 80%;
  line-height: 1.5;
  animation: fadeIn 0.3s ease-out;
  backdrop-filter: blur(2rpx);
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.dm-user {
  color: #C9A96E;
  font-weight: bold;
}
.dm-content {
  color: #fff;
}
.dm-system {
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  width: 100%;
}

/* ===== 聊天区 ===== */
.chat-area {
  position: absolute;
  bottom: 120rpx;
  left: 24rpx;
  right: 24rpx;
  z-index: 5;
  max-height: 360rpx;
}
.chat-scroll {
  max-height: 360rpx;
}
.chat-msg {
  padding: 4rpx 0;
  display: flex;
  flex-wrap: wrap;
}
.msg-system {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
  width: 100%;
  text-align: center;
  padding: 4rpx 0;
}
.msg-user {
  font-size: 24rpx;
  font-weight: bold;
  flex-shrink: 0;
  margin-right: 6rpx;
}
.msg-text {
  font-size: 24rpx;
  color: #fff;
}

/* ===== 底部操作栏 ===== */
.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  z-index: 10;
}
.chat-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 40rpx;
  padding: 16rpx 28rpx;
  font-size: 26rpx;
  color: #fff;
  border: 1rpx solid rgba(255, 255, 255, 0.2);
  height: 60rpx;
  box-sizing: border-box;
}
.bottom-actions {
  display: flex;
  gap: 20rpx;
  align-items: center;
}
.ba-item {
  font-size: 44rpx;
  color: #fff;
  position: relative;
}
.ba-count {
  font-size: 20rpx;
  position: absolute;
  top: -8rpx;
  right: -16rpx;
  background: #C41E3A;
  border-radius: 16rpx;
  padding: 0 8rpx;
  min-width: 24rpx;
  text-align: center;
  line-height: 28rpx;
}

/* ===== 商品面板 ===== */
.product-panel-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.product-panel {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.pp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #F5F0E8;
}
.pp-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #2C2C2C;
}
.pp-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}
.pp-list {
  padding: 16rpx 24rpx;
  max-height: 60vh;
}
.pp-item {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F5F0E8;
}
.pp-cover {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.pp-cover-placeholder {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  flex-shrink: 0;
}
.pp-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8rpx;
}
.pp-name {
  font-size: 26rpx;
  color: #2C2C2C;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.pp-price {
  font-size: 30rpx;
  color: #C41E3A;
  font-weight: bold;
}
.pp-flash {
  font-size: 24rpx;
}
.pp-original {
  font-size: 22rpx;
  color: #ccc;
  text-decoration: line-through;
  margin-left: 8rpx;
  font-weight: normal;
}

@keyframes breathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
