<template>
  <view class="watch" :class="{ 'watch--commerce': room.type === 'commerce' }">
    <!-- 加载骨架 -->
    <view v-if="loading" class="watch-loading">
      <view class="watch-loading__spinner" />
      <text class="watch-loading__txt">加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="watch-error">
      <text class="watch-error__txt">{{ error }}</text>
      <view class="watch-error__retry" @tap="retry"><text class="watch-error__retry-txt">重试</text></view>
    </view>

    <!-- 正常内容 -->
    <template v-else>
    <!-- 直播画面背景（占位渐变，接入推流后替换） -->
    <view class="watch__stage">
      <!-- 低延时直播画面（FLV·小程序/App live-player + H5 flv.js） -->
      <LivePlayer
        v-if="playUrl"
        :flv-url="playUrl.flv"
        :hls-url="playUrl.hls"
        object-fit="contain"
        class="watch__stage-player"
      />
      <view class="watch__stage-mask" />
      <!-- 未直播/加载中占位 -->
      <view v-if="!playUrl" class="watch__stage-ph">
        <view class="watch__stage-ph-icon">
          <AppIcon :name="room.type === 'commerce' ? 'shopping-bag' : 'book-open'" :size="88" color="rgba(255,255,255,0.5)" />
        </view>
        <text class="watch__stage-ph-txt">{{ playHint }}</text>
      </view>
    </view>

    <!-- 顶部信息栏 -->
    <view class="watch__top" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="watch__top-inner">
        <view class="watch__top-row">
          <!-- 主播信息胶囊 -->
          <view class="host-card">
            <view class="host-card__avatar-wrap">
              <image lazy-load class="host-card__avatar" :src="room.hostAvatar" mode="aspectFill" />
              <view class="host-card__live-dot" />
            </view>
            <view class="host-card__info">
              <text class="host-card__name">{{ room.hostName }}</text>
              <text class="host-card__fans">{{ formatCount(room.followers) }} 粉丝</text>
            </view>
            <view class="host-card__follow" :class="{ 'host-card__follow--on': isFollowing }" @tap="onFollow">
              <text class="host-card__follow-txt">{{ isFollowing ? '已关注' : '关注' }}</text>
            </view>
          </view>
          <!-- 右侧：在线人数 + 关闭 -->
          <view class="watch__top-right">
            <view class="online-box">
              <AppIcon name="users" :size="28" color="rgba(255,255,255,0.8)" />
              <text class="online-box__count">{{ formatCount(room.viewerCount) }}</text>
            </view>
            <view class="watch__close" @tap="onClose">
              <AppIcon name="x" :size="40" color="#fff" />
            </view>
          </view>
        </view>

        <!-- 直播间标题 -->
        <view class="watch__title-row">
          <text class="watch__title">{{ room.title }}</text>
        </view>

        <!-- 合规提示 -->
        <view class="watch__disclaimer">
          <Disclaimer variant="entertainment" tone="inline" />
        </view>
      </view>
    </view>

    <!-- 右上角榜单入口 -->
    <view class="rank-entry-wrap">
      <view class="rank-entry" @tap="showRank = true">
        <AppIcon name="crown" :size="28" color="#fff" />
        <text class="rank-entry__txt">榜单</text>
        <AppIcon name="chevron-down" :size="24" color="#fff" />
      </view>
    </view>

    <!-- 商品讲解卡（电商直播） -->
    <view v-if="room.type === 'commerce' && explainingProduct" class="explain-card" @tap="openQuickBuy(explainingProduct)">
      <image lazy-load class="explain-card__img" :src="explainingProduct.cover" mode="aspectFill" />
      <view class="explain-card__info">
        <view class="explain-card__tag"><text class="explain-card__tag-txt">讲解中</text></view>
        <text class="explain-card__name">{{ explainingProduct.name }}</text>
        <view class="explain-card__price-row">
          <text class="explain-card__price">¥{{ explainingProduct.price }}</text>
          <text class="explain-card__origin">¥{{ explainingProduct.originalPrice }}</text>
        </view>
      </view>
      <view class="explain-card__buy"><text class="explain-card__buy-txt">抢购</text></view>
    </view>

    <!-- 系统消息横幅（进入/送礼/购买） -->
    <view class="sys-banners">
      <view v-for="m in systemBanners" :key="m.id" class="sys-banner" :class="`sys-banner--${m.type}`">
        <text class="sys-banner__user">{{ m.user }}</text>
        <text class="sys-banner__content">{{ m.content }}</text>
        <text v-if="m.giftIcon" class="sys-banner__icon">{{ m.giftIcon }}</text>
      </view>
    </view>

    <!-- 飘屏礼物（大礼物横幅滑入） -->
    <view class="gift-flyers">
      <view v-for="g in giftFlyers" :key="g.id" class="gift-flyer">
        <image lazy-load class="gift-flyer__avatar" :src="g.avatar" mode="aspectFill" />
        <view class="gift-flyer__info">
          <text class="gift-flyer__user">{{ g.user }}</text>
          <text class="gift-flyer__desc">送出 {{ g.giftName }}</text>
        </view>
        <text class="gift-flyer__icon">{{ g.giftIcon }}</text>
        <text class="gift-flyer__count">x{{ g.count }}</text>
      </view>
    </view>

    <!-- 电商实时已售通知 -->
    <view v-if="room.type === 'commerce' && saleNotif" class="sale-notif">
      <AppIcon name="shopping-cart" :size="26" color="#C41E3A" />
      <text class="sale-notif__txt">{{ saleNotif }}</text>
    </view>

    <!-- 左侧弹幕区 -->
    <scroll-view scroll-y class="danmaku" :scroll-top="danmakuScrollTop" :scroll-with-animation="true">
      <view class="danmaku__inner">
        <view v-for="c in comments" :key="c.id" class="danmaku__item">
          <view class="danmaku__row">
            <view class="danmaku__tag"><text class="danmaku__tag-txt">{{ c.userName }}</text></view>
            <text class="danmaku__content">{{ c.content }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 飘心 -->
    <view class="hearts">
      <view
        v-for="h in floatingHearts"
        :key="h.id"
        class="heart"
        :style="{ left: h.left + 'rpx', animationDuration: h.duration + 's' }"
      >
        <AppIcon name="heart" :size="48" color="#ef4444" :fill="true" />
      </view>
    </view>

    <!-- 底部互动栏 -->
    <view class="watch__bottom" :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12rpx)' }">
      <view class="watch__bottom-row">
        <!-- 输入框 -->
        <view class="input-box" @tap="showCommentInput = true">
          <text class="input-box__ph">说点什么...</text>
          <view class="input-box__send"><AppIcon name="send" :size="24" color="#fff" /></view>
        </view>
        <!-- 电商：购物车 -->
        <view v-if="room.type === 'commerce'" class="act-btn act-btn--cart" @tap="showProductList = true">
          <AppIcon name="shopping-cart" :size="40" color="#f87171" />
          <view v-if="products.length" class="act-btn__badge"><text class="act-btn__badge-txt">{{ products.length }}</text></view>
        </view>
        <!-- 点赞 -->
        <view class="act-btn" @tap="onTapLike">
          <AppIcon name="heart" :size="40" color="#ef4444" :fill="true" />
        </view>
        <!-- 礼物 -->
        <view class="act-btn act-btn--gift" @tap="showGiftPanel = true">
          <AppIcon name="gift" :size="40" color="#fbbf24" />
        </view>
        <!-- 连麦 -->
        <view class="act-btn act-btn--mic" @tap="showMicSheet = true">
          <AppIcon name="phone" :size="40" color="#60a5fa" />
        </view>
        <!-- 分享 -->
        <view class="act-btn" @tap="showShare = true">
          <AppIcon name="share-2" :size="40" color="rgba(255,255,255,0.8)" />
        </view>
        <!-- 举报 -->
        <view class="act-btn" @tap="onReport">
          <AppIcon name="flag" :size="40" color="rgba(255,255,255,0.8)" />
        </view>
      </view>
    </view>

    <!-- ===== 弹窗层 ===== -->

    <!-- 弹幕输入 -->
    <view v-if="showCommentInput" class="modal-mask modal-mask--bottom" @tap="showCommentInput = false">
      <view class="comment-input" @tap.stop>
        <input
          class="comment-input__field"
          v-model="commentText"
          placeholder="说点什么..."
          placeholder-class="comment-input__ph"
          :focus="showCommentInput"
          confirm-type="send"
          @confirm="onSendComment"
        />
        <view class="comment-input__send" :class="{ 'comment-input__send--on': commentText.trim() }" @tap="onSendComment">
          <text class="comment-input__send-txt">发送</text>
        </view>
      </view>
    </view>

    <!-- 榜单 -->
    <view v-if="showRank" class="modal-mask modal-mask--bottom" @tap="showRank = false">
      <view class="rank-sheet" @tap.stop>
        <view class="rank-sheet__head">
          <text class="rank-sheet__title">打赏榜</text>
          <view @tap="showRank = false"><AppIcon name="x" :size="40" color="#999" /></view>
        </view>
        <view class="rank-sheet__list">
          <view v-for="item in rankList" :key="item.rank" class="rank-row">
            <text class="rank-row__no" :class="`rank-row__no--${item.rank}`">{{ item.rank }}</text>
            <text class="rank-row__user">{{ item.user }}</text>
            <view class="rank-row__amount">
              <AppIcon name="coins" :size="26" color="#C9A96E" />
              <text class="rank-row__amount-txt">{{ formatCount(item.amount) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 商品列表 -->
    <view v-if="showProductList" class="modal-mask modal-mask--bottom" @tap="showProductList = false">
      <view class="product-sheet" @tap.stop>
        <view class="product-sheet__head">
          <text class="product-sheet__title">全部商品（{{ products.length }}）</text>
          <view @tap="showProductList = false"><AppIcon name="x" :size="40" color="#999" /></view>
        </view>
        <scroll-view scroll-y class="product-sheet__list">
          <view v-for="(p, idx) in products" :key="p.id" class="product-row">
            <text class="product-row__no">{{ idx + 1 }}</text>
            <image lazy-load class="product-row__img" :src="p.cover" mode="aspectFill" />
            <view class="product-row__info">
              <text class="product-row__name">{{ p.name }}</text>
              <view v-if="p.isExplaining" class="product-row__tag"><text class="product-row__tag-txt">讲解中</text></view>
              <view class="product-row__price-row">
                <text class="product-row__price">¥{{ p.price }}</text>
                <text class="product-row__origin">¥{{ p.originalPrice }}</text>
                <text class="product-row__sold">已售{{ p.sold }}</text>
              </view>
            </view>
            <view class="product-row__buy" @tap="openQuickBuy(p)"><text class="product-row__buy-txt">购买</text></view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 礼物面板 -->
    <GiftPanel :open="showGiftPanel" :balance="coinBalance" @close="showGiftPanel = false" @send="onSendGift" />

    <!-- 连麦 -->
    <MicConnectSheet :open="showMicSheet" :host-name="room.hostName" @close="showMicSheet = false" />

    <!-- 分享 -->
    <view v-if="showShare" class="modal-mask modal-mask--bottom" @tap="showShare = false">
      <view class="share-sheet" @tap.stop>
        <text class="share-sheet__title">分享直播间</text>
        <view class="share-sheet__grid">
          <view v-for="s in shareChannels" :key="s.key" class="share-item" @tap="onShare(s.key)">
            <view class="share-item__icon"><AppIcon :name="s.icon" :size="52" color="#666" /></view>
            <text class="share-item__label">{{ s.label }}</text>
          </view>
        </view>
        <view class="share-sheet__cancel" @tap="showShare = false"><text class="share-sheet__cancel-txt">取消</text></view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import GiftPanel from '@/components/live/gift-panel.vue'
import MicConnectSheet from '@/components/live/mic-connect-sheet.vue'
import LivePlayer from '@/components/live/live-player.vue'
import { type LiveGift } from '@/lib/live-gifts'
import { goBack, navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { useTim, type TimMessage } from '@/composables/useTim'
import {
  liveWatchRoom,
  liveApi,
  type VerticalLiveComment,
  type VerticalLiveProduct,
  type LiveWatchRankItem,
} from '@/lib/live-data'

// ===== 系统信息（状态栏） =====
const statusBarHeight = ref(0)

// ===== 直播间数据 =====
const loading = ref(true)
const error = ref('')
// 模板裸访问大量房间字段，保留 any 避免收敛触发大量报错
const room = ref<any>({ ...liveWatchRoom })
const comments = ref<VerticalLiveComment[]>([])
const products = ref<VerticalLiveProduct[]>([])
const rankList = ref<LiveWatchRankItem[]>([])
const coinBalance = ref(0)
const isFollowing = ref(false)

// ===== 弹幕：TIM 群实时收发（容错降级：TIM 未就绪不崩，弹幕区留空）=====
const tim = useTim()
let danmakuGroupId = ''
let offTimMessage: (() => void) | null = null

/** 加入弹幕群 + 订阅群消息上屏（仅直播中且有 imGroupId 时） */
async function joinDanmaku(groupId: string) {
  if (!groupId) return
  danmakuGroupId = groupId
  try {
    await tim.joinGroup(groupId)
    offTimMessage = tim.onMessage((msgs: TimMessage[]) => {
      const fresh = msgs.filter((m) => m.conversationType === 'GROUP' && m.to === danmakuGroupId && m.payload?.text)
      if (!fresh.length) return
      fresh.forEach((m) => {
        comments.value.push({ id: m.ID, userName: m.nick || '观众', content: m.payload.text || '', type: 'text' })
      })
      if (comments.value.length > 80) comments.value.splice(0, comments.value.length - 80)
      scrollDanmakuToBottom()
    })
  } catch { /* TIM 未就绪 → 弹幕降级只读空态，不阻断观看 */ }
}

// ===== 低延时播放地址（C1）=====
const playUrl = ref<{ flv: string; hls: string } | null>(null)

// 未开播占位文案：由房间真实状态判定（后端 play-url 错误信息「直播未开始或已结束」两态同文，
// 不能用字符串包含'结束'来区分，否则 WAITING 预告房会被误标为「已结束」）。
const playHint = computed(() => {
  const s = String(room.value?.status || '').toUpperCase()
  if (s === 'ENDED' || s === 'REPLAY') return '直播已结束'
  if (s === 'BANNED' || s === 'CANCELLED') return '直播已停止'
  return '直播即将开始'
})

// 拉取观众播放地址：仅直播中后端才返回；未开播/已结束抛错→保持占位（文案走 playHint 按房间状态判定）
async function fetchPlayUrl(roomId: string) {
  try {
    playUrl.value = await liveApi.getPlayUrl(roomId)
  } catch {
    playUrl.value = null
  }
}

// 讲解中的商品（电商直播浮卡）
const explainingProduct = computed(() => products.value.find((p) => p.isExplaining) || null)

async function fetchRoomData(roomId: string) {
  loading.value = true
  error.value = ''
  try {
    const data = await liveApi.getWatchRoom(roomId)
    room.value = { ...liveWatchRoom, ...data.room }
    comments.value = data.comments
    products.value = data.products
    // 直播中且有弹幕群 → 加入 TIM 群实时弹幕
    if (room.value.imGroupId) joinDanmaku(room.value.imGroupId)
    // 佣-V2-P3：进直播间视同该圈子全店渠道点击（仅已登录且直播间关联圈子才上报·失败静默不扰观看）
    if (getToken() && room.value.circleId) liveApi.reportCircleChannelClick(room.value.circleId)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// 后端礼物清单（用于把 GiftPanel 的展示礼物按名映射到真实 uuid，供 sendGift 真扣费）
const backendGifts = ref<{ id: string; name: string; price: number }[]>([])
async function fetchGifts() {
  try {
    const data = await liveApi.getGifts()
    coinBalance.value = data.balance
    backendGifts.value = data.gifts.map((g) => ({ id: g.id, name: g.name, price: g.price }))
  } catch {}
}

/** 打赏榜真连 — GET /live/rooms/:id/gift-ranking（无打赏则空列表） */
async function fetchRanking(roomId: string) {
  try {
    rankList.value = await liveApi.getGiftRanking(roomId)
  } catch { rankList.value = [] }
}

function retry() {
  fetchRoomData(room.value.id)
  fetchGifts()
  fetchRanking(room.value.id)
}

// ===== UI 状态（弹窗开关、临时输入，仅 UI 层） =====
const showCommentInput = ref(false)
const commentText = ref('')
const showRank = ref(false)
const showProductList = ref(false)
const showGiftPanel = ref(false)
const showMicSheet = ref(false)
const showShare = ref(false)

const danmakuScrollTop = ref(0)
const floatingHearts = ref<Array<{ id: number; left: number; duration: number }>>([])
const giftFlyers = ref<Array<{ id: number; user: string; avatar: string; giftName: string; giftIcon: string; count: number }>>([])
const systemBanners = ref<Array<{ id: number; type: string; user: string; content: string; giftIcon?: string }>>([])
const saleNotif = ref('')

const shareChannels = [
  { key: 'wechat', label: '微信', icon: 'message-circle' },
  { key: 'moments', label: '朋友圈', icon: 'users' },
  { key: 'copy', label: '复制链接', icon: 'file-text' },
]

let heartId = 0
let flyerId = 0

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

// ===== 交互函数（UI 状态切换由前端负责；关注/送礼/下单等业务交 Claude 接入） =====
function onClose() {
  goBack()
}

function onFollow() {
  isFollowing.value = !isFollowing.value
  // @data-needs: 关注/取关接口, POST /api/live/{id}/follow
}

let sendingComment = false
async function onSendComment() {
  const text = commentText.value.trim()
  if (!text || sendingComment) { showCommentInput.value = false; return }
  sendingComment = true
  // 乐观上屏 + 清空
  comments.value.push({ id: 'local-' + Date.now(), userName: '我', content: text, type: 'text' })
  commentText.value = ''
  scrollDanmakuToBottom()
  showCommentInput.value = false
  try {
    // 弹幕走 TIM 群实时下发给其他观众；同时后端持久化（并行，互不阻塞）
    if (danmakuGroupId) await tim.sendGroupText(danmakuGroupId, text)
    liveApi.sendComment(room.value.id, text).catch(() => {})
  } catch { /* TIM 发送失败 → 已本地上屏，静默降级 */ }
  finally { sendingComment = false }
}

function onTapLike() {
  spawnHeart()
  // 点赞计数上报（fire-and-forget，失败不影响飘心动画）
  liveApi.likeRoom(room.value.id).catch(() => {})
}

function spawnHeart() {
  const id = ++heartId
  floatingHearts.value.push({ id, left: 40 + Math.random() * 80, duration: 2 + Math.random() })
  setTimeout(() => {
    floatingHearts.value = floatingHearts.value.filter((h) => h.id !== id)
  }, 3000)
}

let sendingGift = false
async function onSendGift(gift: LiveGift) {
  if (sendingGift) return
  const count = 1
  // 送礼前余额校验（后端事务也会校验，这里做即时反馈）
  if (coinBalance.value < gift.price * count) {
    uni.showToast({ title: '国学币余额不足', icon: 'none' })
    return
  }
  // 按名映射到后端礼物取真实 uuid（后端未配同名礼物则无法真扣费）
  const backendGift = backendGifts.value.find((g) => g.name === gift.name)
  if (!backendGift) {
    uni.showToast({ title: '该礼物暂不可用', icon: 'none' })
    return
  }
  sendingGift = true
  showGiftPanel.value = false
  try {
    // 真实送礼：后端事务扣国学币 + 记打赏
    await liveApi.sendGift(room.value.id, backendGift.id, count)
    // 成功后飘屏 + 弹幕 + 扣余额
    const fid = ++flyerId
    giftFlyers.value.push({ id: fid, user: '我', avatar: room.value.hostAvatar, giftName: gift.name, giftIcon: gift.icon, count })
    setTimeout(() => { giftFlyers.value = giftFlyers.value.filter((g) => g.id !== fid) }, 4000)
    comments.value.push({ id: 'gift-' + Date.now(), userName: '我', content: `送出 ${gift.name}`, type: 'gift', giftInfo: { name: gift.name, icon: gift.icon, count } })
    scrollDanmakuToBottom()
    coinBalance.value = Math.max(0, coinBalance.value - gift.price * count)
    // 送礼后刷新打赏榜 + 通过 TIM 群广播（让其他观众看到）
    fetchRanking(room.value.id)
    if (danmakuGroupId) tim.sendGroupText(danmakuGroupId, `送出 ${gift.name} x${count}`).catch(() => {})
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '送礼失败', icon: 'none' })
  } finally {
    sendingGift = false
  }
}

/**
 * 购买（佣-V2-P3）：直跳真实结算页并带 LIVE 内容来源（sourceContentType/Id 随下单落库·直播购买归因发起圈子）。
 * 原 QuickBuySheet 为纯 UI 假支付（onPay 空实现·从未接线），按数据流铁律改走真实下单链路。
 */
function openQuickBuy(p: VerticalLiveProduct) {
  showProductList.value = false
  navigateTo(`/pkg-shop/checkout/index?productId=${p.id}&quantity=1&sourceContentType=LIVE&sourceContentId=${room.value.id}`)
}

function onShare(_key: string) {
  // @data-needs: 分享渠道调用（uni.share），此处仅关闭面板
  showShare.value = false
}

function onReport() {
  // 举报直播间。举报页尚未迁移，先以 toast 占位。
  // @data-needs: 举报页路由 /pkg-mine/report/index?type=live&targetId={room.id}（待迁移后改为 navigateTo）
  uni.showToast({ title: '举报已提交，感谢反馈', icon: 'none' })
}

function scrollDanmakuToBottom() {
  danmakuScrollTop.value = danmakuScrollTop.value + 9999
}

onLoad((opts) => {
  const roomId = opts?.id || '1'
  if (opts?.type === 'commerce') room.value.type = 'commerce'
  fetchRoomData(roomId)
  fetchPlayUrl(roomId)
  fetchGifts()
  fetchRanking(roomId)
})

onMounted(() => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.statusBarHeight || 0
  } catch (e) {}
})

onUnmounted(() => {
  // 退订 TIM 群消息 + 退出弹幕群
  if (offTimMessage) offTimMessage()
  if (danmakuGroupId) tim.quitGroup(danmakuGroupId)
})
</script>

<style scoped>
.watch {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

/* 加载/错误覆盖层 */
.watch-loading, .watch-error { position: absolute; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; }
.watch-loading__spinner { width: 64rpx; height: 64rpx; border-radius: 50%; border: 4rpx solid rgba(255,255,255,0.2); border-top-color: var(--brand); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.watch-loading__txt { font-size: 26rpx; color: rgba(255,255,255,0.6); margin-top: 24rpx; }
.watch-error__txt { font-size: 28rpx; color: rgba(255,255,255,0.8); margin-bottom: 32rpx; }
.watch-error__retry { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.watch-error__retry-txt { font-size: 28rpx; color: #fff; font-weight: 500; }

/* 视频画面占位 */
.watch__stage {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, #111827, #1f2937, #111827);
}
.watch__stage-player {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.watch__stage-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%);
}
/* 直播画面占位（接入推流后移除） */
.watch__stage-ph {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.3;
}
.watch__stage-ph-icon {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.watch__stage-ph-txt { font-size: 26rpx; color: rgba(255,255,255,0.5); }

/* 顶部信息栏 */
.watch__top {
  position: absolute;
  top: 0; left: 0; right: 0;
  z-index: 30;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.4), transparent);
}
.watch__top-inner { padding: 24rpx 32rpx; }
.watch__top-row { display: flex; align-items: center; justify-content: space-between; }
.host-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 24rpx 12rpx 12rpx;
  background: rgba(0,0,0,0.4);
  border-radius: 999rpx;
  min-width: 0;
  flex-shrink: 1;
}
.host-card__avatar-wrap { position: relative; flex-shrink: 0; }
.host-card__avatar { width: 80rpx; height: 80rpx; border-radius: 50%; border: 4rpx solid #ef4444; background: #444; }
.host-card__live-dot {
  position: absolute; bottom: 0; right: 0;
  width: 24rpx; height: 24rpx;
  background: #ef4444; border-radius: 50%; border: 4rpx solid #000;
}
.host-card__info { display: flex; flex-direction: column; min-width: 0; }
.host-card__name {
  font-size: 28rpx; font-weight: 500; color: #fff;
  max-width: 200rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.host-card__fans { font-size: 20rpx; color: rgba(255,255,255,0.6); white-space: nowrap; }
.host-card__follow {
  height: 56rpx; padding: 0 24rpx; margin-left: 8rpx;
  background: #ef4444; border-radius: 999rpx;
  display: flex; align-items: center; flex-shrink: 0;
}
.host-card__follow--on { background: rgba(255,255,255,0.2); }
.host-card__follow-txt { font-size: 24rpx; color: #fff; white-space: nowrap; }
.watch__top-right { display: flex; align-items: center; gap: 16rpx; flex-shrink: 0; }
.online-box {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 20rpx;
  background: rgba(0,0,0,0.4); border-radius: 999rpx;
}
.online-box__count { font-size: 24rpx; color: #fff; white-space: nowrap; }
.watch__close {
  width: 64rpx; height: 64rpx; border-radius: 50%;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

/* 标题 */
.watch__title-row { margin-top: 16rpx; overflow: hidden; }
.watch__title {
  font-size: 24rpx; color: rgba(255,255,255,0.8);
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.watch__disclaimer { margin-top: 16rpx; }

/* 右上角榜单入口 */
.rank-entry-wrap { position: absolute; top: 220rpx; right: 24rpx; z-index: 20; }
.rank-entry {
  display: flex; align-items: center; gap: 8rpx;
  padding: 8rpx 16rpx;
  background: linear-gradient(to right, rgba(245,158,11,0.8), rgba(249,115,22,0.8));
  border-radius: 999rpx;
}
.rank-entry__txt { font-size: 20rpx; font-weight: 500; color: #fff; white-space: nowrap; }

/* 商品讲解卡 */
.explain-card {
  position: absolute;
  left: 24rpx; bottom: 300rpx;
  display: flex; align-items: center; gap: 12rpx;
  background-color: rgba(0,0,0,0.55);
  border-radius: 16rpx; padding: 10rpx;
  width: 440rpx; z-index: 18;
}
.explain-card__img { width: 96rpx; height: 96rpx; border-radius: 12rpx; flex-shrink: 0; }
.explain-card__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.explain-card__tag { background-color: var(--brand); border-radius: 8rpx; padding: 2rpx 10rpx; align-self: flex-start; }
.explain-card__tag-txt { font-size: 16rpx; color: #fff; white-space: nowrap; }
.explain-card__name { font-size: 22rpx; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.explain-card__price-row { display: flex; align-items: baseline; gap: 8rpx; }
.explain-card__price { font-size: 28rpx; color: #FFD700; font-weight: 700; }
.explain-card__origin { font-size: 18rpx; color: rgba(255,255,255,0.5); text-decoration: line-through; }
.explain-card__buy { flex-shrink: 0; background-color: var(--brand); border-radius: 24rpx; padding: 12rpx 22rpx; }
.explain-card__buy-txt { font-size: 22rpx; color: #fff; font-weight: 600; white-space: nowrap; }

/* 系统消息横幅 */
.sys-banners {
  position: absolute;
  top: 280rpx; left: 24rpx;
  display: flex; flex-direction: column; gap: 8rpx;
  z-index: 15;
}
.sys-banner {
  display: flex; align-items: center; gap: 6rpx;
  border-radius: 999rpx; padding: 12rpx 24rpx;
  max-width: 460rpx;
}
.sys-banner--enter { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
.sys-banner--gift { background: linear-gradient(to right, rgba(245,158,11,0.3), rgba(249,115,22,0.3)); color: #fde68a; }
.sys-banner--buy { background: linear-gradient(to right, rgba(239,68,68,0.3), rgba(236,72,153,0.3)); color: #fbcfe8; }
.sys-banner__icon { font-size: 24rpx; }
.sys-banner__user { font-size: 24rpx; color: inherit; font-weight: 500; white-space: nowrap; }
.sys-banner__content { font-size: 24rpx; color: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 飘屏礼物 */
.gift-flyers { position: absolute; left: 0; top: 380rpx; z-index: 16; display: flex; flex-direction: column; gap: 12rpx; }
.gift-flyer {
  display: flex; align-items: center; gap: 12rpx;
  background: linear-gradient(to right, rgba(196,30,58,0.85), rgba(201,169,110,0.6));
  border-radius: 0 40rpx 40rpx 0;
  padding: 10rpx 24rpx 10rpx 10rpx;
  animation: flyer-in 0.4s ease;
}
@keyframes flyer-in { 0% { transform: translateX(-100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
.gift-flyer__avatar { width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0; }
.gift-flyer__info { display: flex; flex-direction: column; }
.gift-flyer__user { font-size: 20rpx; color: #FFD700; white-space: nowrap; }
.gift-flyer__desc { font-size: 18rpx; color: #fff; white-space: nowrap; }
.gift-flyer__icon { font-size: 40rpx; }
.gift-flyer__count { font-size: 28rpx; color: #FFD700; font-weight: 700; font-style: italic; }

/* 电商已售通知 */
.sale-notif {
  position: absolute;
  left: 24rpx; bottom: 640rpx;
  display: flex; align-items: center; gap: 6rpx;
  background-color: rgba(255,255,255,0.92);
  border-radius: 24rpx; padding: 8rpx 18rpx;
  z-index: 16; animation: flyer-in 0.4s ease;
}
.sale-notif__txt { font-size: 20rpx; color: var(--brand); white-space: nowrap; }

/* 弹幕区 */
.danmaku {
  position: absolute;
  left: 24rpx; right: 192rpx; bottom: 176rpx;
  height: 420rpx; z-index: 10;
}
.danmaku__inner { display: flex; flex-direction: column; gap: 12rpx; justify-content: flex-end; min-height: 100%; }
.danmaku__item { max-width: 100%; }
.danmaku__row { display: flex; align-items: flex-start; gap: 16rpx; }
.danmaku__tag { flex-shrink: 0; padding: 8rpx 16rpx; background: rgba(196,30,58,0.2); border-radius: 999rpx; }
.danmaku__tag-txt { font-size: 20rpx; font-weight: 500; color: var(--brand); white-space: nowrap; }
.danmaku__content { font-size: 28rpx; color: rgba(255,255,255,0.9); line-height: 1.625; }

/* 飘心 */
.hearts { position: absolute; right: 40rpx; bottom: 200rpx; width: 160rpx; height: 600rpx; z-index: 14; pointer-events: none; }
.heart { position: absolute; bottom: 0; animation: heart-float linear forwards; }
@keyframes heart-float {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translateY(-560rpx) translateX(-30rpx) scale(1.1); opacity: 0; }
}

/* 底部互动栏 */
.watch__bottom {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  z-index: 30;
  padding-top: 32rpx;
  background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.6), transparent);
}
  .watch__bottom-row { display: flex; align-items: center; gap: 24rpx; padding: 0 24rpx 24rpx; }
  .input-box {
  flex: 0 1 auto;
  width: 288rpx;
  min-width: 0;
  height: 80rpx; padding: 0 32rpx;
  background: rgba(255,255,255,0.1);
  border: 2rpx solid rgba(255,255,255,0.1);
  border-radius: 999rpx;
  display: flex; align-items: center; justify-content: space-between;
  }
  .input-box__ph { flex: 1; min-width: 0; font-size: 28rpx; color: rgba(255,255,255,0.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.input-box__send {
  width: 40rpx; height: 40rpx; border-radius: 50%;
  background: var(--brand);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
  .act-btn {
  position: relative;
  width: 80rpx; height: 80rpx; border-radius: 999rpx;
  background: rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center; flex: 0 1 auto; min-width: 0;
  }
.act-btn--gift { background: linear-gradient(135deg, rgba(245,158,11,0.3), rgba(249,115,22,0.3)); }
.act-btn--mic { background: linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.3)); }
.act-btn--cart { background: linear-gradient(135deg, rgba(239,68,68,0.3), rgba(236,72,153,0.3)); }
.act-btn__badge {
  position: absolute; top: -2rpx; right: -2rpx;
  min-width: 32rpx; height: 32rpx; border-radius: 16rpx;
  background-color: #ef4444;
  display: flex; align-items: center; justify-content: center; padding: 0 6rpx;
}
.act-btn__badge-txt { font-size: 16rpx; color: #fff; font-weight: 700; }

/* 通用弹窗遮罩 */
.modal-mask { position: fixed; inset: 0; background-color: rgba(0,0,0,0.5); z-index: 100; }
.modal-mask--bottom { display: flex; flex-direction: column; justify-content: flex-end; }

/* 弹幕输入 */
.comment-input {
  display: flex; align-items: center; gap: 16rpx;
  background-color: #1c1c1e;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom) + 20rpx);
}
.comment-input__field {
  flex: 1;
  background-color: rgba(255,255,255,0.12);
  border-radius: 36rpx; padding: 16rpx 28rpx;
  font-size: 26rpx; color: #fff;
}
.comment-input__ph { color: rgba(255,255,255,0.5); }
.comment-input__send { flex-shrink: 0; background-color: rgba(255,255,255,0.18); border-radius: 36rpx; padding: 16rpx 32rpx; }
.comment-input__send--on { background-color: var(--brand); }
.comment-input__send-txt { font-size: 26rpx; color: #fff; }

/* 榜单 sheet */
.rank-sheet { background-color: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx; max-height: 70vh; }
.rank-sheet__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.rank-sheet__title { font-size: 32rpx; font-weight: 700; color: #1c1c1e; }
.rank-sheet__list { display: flex; flex-direction: column; gap: 8rpx; }
.rank-row { display: flex; align-items: center; gap: 20rpx; padding: 18rpx 8rpx; }
.rank-row__no { width: 44rpx; text-align: center; font-size: 28rpx; font-weight: 700; color: #999; flex-shrink: 0; }
.rank-row__no--1 { color: var(--brand); }
.rank-row__no--2 { color: #C9A96E; }
.rank-row__no--3 { color: #E0A458; }
.rank-row__user { flex: 1; font-size: 26rpx; color: #1c1c1e; }
.rank-row__amount { display: flex; align-items: center; gap: 6rpx; }
.rank-row__amount-txt { font-size: 24rpx; color: #C9A96E; font-weight: 600; }

/* 商品 sheet */
.product-sheet { background-color: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx 32rpx 0; max-height: 70vh; display: flex; flex-direction: column; }
.product-sheet__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.product-sheet__title { font-size: 30rpx; font-weight: 700; color: #1c1c1e; }
.product-sheet__list { flex: 1; max-height: 60vh; }
.product-row { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; border-bottom: 1px solid #f0f0f0; }
.product-row__no { width: 32rpx; font-size: 24rpx; color: #C9A96E; font-weight: 700; flex-shrink: 0; }
.product-row__img { width: 120rpx; height: 120rpx; border-radius: 12rpx; flex-shrink: 0; }
.product-row__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.product-row__name { font-size: 26rpx; color: #1c1c1e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.product-row__tag { align-self: flex-start; background-color: var(--brand); border-radius: 8rpx; padding: 2rpx 10rpx; }
.product-row__tag-txt { font-size: 16rpx; color: #fff; white-space: nowrap; }
.product-row__price-row { display: flex; align-items: baseline; gap: 10rpx; }
.product-row__price { font-size: 30rpx; color: var(--brand); font-weight: 700; }
.product-row__origin { font-size: 20rpx; color: #999; text-decoration: line-through; }
.product-row__sold { font-size: 20rpx; color: #999; }
.product-row__buy { flex-shrink: 0; background-color: var(--brand); border-radius: 28rpx; padding: 14rpx 28rpx; }
.product-row__buy-txt { font-size: 24rpx; color: #fff; font-weight: 600; white-space: nowrap; }

/* 分享 sheet */
.share-sheet { background-color: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx 32rpx calc(env(safe-area-inset-bottom) + 32rpx); }
.share-sheet__title { font-size: 28rpx; font-weight: 600; color: #1c1c1e; text-align: center; display: block; margin-bottom: 32rpx; }
.share-sheet__grid { display: flex; gap: 48rpx; padding: 0 16rpx; }
.share-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.share-item__icon { width: 96rpx; height: 96rpx; border-radius: 50%; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; }
.share-item__label { font-size: 22rpx; color: #666; }
.share-sheet__cancel { margin-top: 32rpx; padding: 24rpx; text-align: center; border-top: 1px solid #f0f0f0; }
.share-sheet__cancel-txt { font-size: 28rpx; color: #999; }
</style>
