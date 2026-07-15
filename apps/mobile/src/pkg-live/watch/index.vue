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

    <!-- ===== 预约态（WAITING·V0 状态B：封面压暗 + 倒计时 + 预约提醒）===== -->
    <scroll-view v-else-if="isWaiting" scroll-y class="pre">
      <view class="pre__cover-wrap">
        <image v-if="room.cover" lazy-load class="pre__cover" :src="room.cover" mode="aspectFill" />
        <view v-else class="pre__cover pre__cover--ph" />
        <view class="pre__overlay">
          <text class="pre__label">距开播还有</text>
          <text class="pre__time">{{ countdownText }}</text>
          <!-- 预约人数：真实值（0 或拉取失败不显示该行） -->
          <text v-if="bookingCount > 0" class="pre__count">已有 {{ bookingCount }} 人预约</text>
        </view>
        <view class="state-back" :style="{ top: (statusBarHeight + 10) + 'px' }" @tap="onClose">
          <AppIcon name="chevron-left" :size="30" color="#fff" />
        </view>
      </view>
      <!-- 标题 + 开播时间 + 预约按钮 -->
      <view class="pre__reserve">
        <view class="pre__reserve-main">
          <text class="pre__reserve-title">{{ room.title }}</text>
          <text v-if="startTimeText" class="pre__reserve-sub">{{ startTimeText }} 开播</text>
        </view>
        <view class="pre__btn" :class="{ 'pre__btn--booked': booked }" @tap="onToggleBook">
          <text class="pre__btn-txt" :class="{ 'pre__btn-txt--booked': booked }">{{ bookingSubmitting ? '提交中…' : booked ? '已预约' : '预约提醒' }}</text>
        </view>
      </view>
      <!-- 付费场说明（移动端无直播购票支付接线 → 只如实展示票价，不做假支付按钮） -->
      <view v-if="isPaidRoom" class="pre__ticket">
        <text class="pre__ticket-txt">本场为付费直播 <text class="pre__ticket-price">¥{{ room.chargePrice }}</text></text>
      </view>
    </scroll-view>

    <!-- ===== 回放态（ENDED/REPLAY·V0 状态C：封面 + 回放徽章 + 点播）===== -->
    <scroll-view v-else-if="isReplayState" scroll-y class="rp">
      <view class="rp__cover-wrap">
        <!-- 点击播放后原地渲染点播 video（回放是点播，不走 live-player 直播内核） -->
        <video
          v-if="replayPlaying && room.replayUrl"
          id="replay-video"
          class="rp__video"
          :src="room.replayUrl"
          :controls="true"
          autoplay
          object-fit="contain"
          @play="onReplayPlay"
          @timeupdate="onReplayTimeUpdate"
        />
        <template v-else>
          <image v-if="room.cover" lazy-load class="rp__cover" :src="room.cover" mode="aspectFill" />
          <view v-else class="rp__cover rp__cover--ph" />
          <view class="rp__badge"><text class="rp__badge-txt">回放</text></view>
          <view v-if="room.replayUrl" class="rp__play" @tap="replayPlaying = true">
            <AppIcon name="play" :size="40" color="#ffffff" :fill="true" />
          </view>
        </template>
        <view class="state-back" :style="{ top: (statusBarHeight + 10) + 'px' }" @tap="onClose">
          <AppIcon name="chevron-left" :size="30" color="#fff" />
        </view>
      </view>
      <view class="rp__info">
        <text class="rp__title">{{ room.title }}</text>
        <view class="rp__host-row">
          <smart-avatar :src="room.hostAvatar" :name="room.hostName" class="rp__host-avatar" />
          <text class="rp__host-name">{{ room.hostName }}</text>
        </view>
        <!-- #21 回放章节点（主播标注·点击 seek·无标注不渲染） -->
        <template v-if="room.replayUrl && room.replayChapters?.length">
          <text class="rp__chapter-label">回放章节</text>
          <view class="rp__chapter-list">
            <view
              v-for="(c, i) in room.replayChapters" :key="i"
              class="rp__chapter-row" @tap="seekToChapter(c.t)"
            >
              <text class="rp__chapter-time">{{ fmtChapterTime(c.t) }}</text>
              <text class="rp__chapter-name">{{ c.title }}</text>
            </view>
          </view>
        </template>
        <!-- 续播提示（本地进度记忆·>30s 才显示） -->
        <text v-if="!replayPlaying && savedReplayPos > 30" class="rp__resume-tip">上次看到 {{ fmtChapterTime(savedReplayPos) }}，点击播放自动续播</text>
        <!-- 无回放：空态 -->
        <view v-if="!room.replayUrl" class="rp__empty">
          <text class="rp__empty-txt">直播已结束 · 暂无回放</text>
        </view>
      </view>
    </scroll-view>

    <!-- 正常内容（直播中 LIVING：既有全屏沉浸层原样保留） -->
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
              <smart-avatar :src="room.hostAvatar" :name="room.hostName" class="host-card__avatar" />
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

        <!-- 画质角标（V0 quality-badge·basic 不显示）+ 来源圈子（可点跳圈子详情） -->
        <view v-if="qualityLabel || (room.circleName && room.circleId)" class="watch__meta-row">
          <view v-if="qualityLabel" class="quality-badge"><text class="quality-badge__txt">{{ qualityLabel }}</text></view>
          <view v-if="room.circleName && room.circleId" class="circle-link" @tap="goCircleDetail">
            <text class="circle-link__txt">来自圈子 {{ room.circleName }}</text>
            <AppIcon name="chevron-right" :size="22" color="rgba(232,220,196,0.8)" />
          </view>
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
          <text class="explain-card__price">¥{{ formatPrice(explainingProduct.price) }}</text>
          <text class="explain-card__origin">¥{{ formatPrice(explainingProduct.originalPrice) }}</text>
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
        <smart-avatar :src="g.avatar" :name="g.user" class="gift-flyer__avatar" />
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
                <text class="product-row__price">¥{{ formatPrice(p.price) }}</text>
                <text class="product-row__origin">¥{{ formatPrice(p.originalPrice) }}</text>
                <text class="product-row__sold">已售{{ p.sold }}</text>
              </view>
            </view>
            <view class="product-row__buy" @tap="openQuickBuy(p)"><text class="product-row__buy-txt">购买</text></view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 礼物面板（真连：真实礼物清单直传·送礼直接用礼物 uuid 扣费） -->
    <GiftPanel :open="showGiftPanel" :balance="coinBalance" :gifts="gifts" @close="showGiftPanel = false" @send="onSendGift" />

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
import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import GiftPanel from '@/components/live/gift-panel.vue'
import MicConnectSheet from '@/components/live/mic-connect-sheet.vue'
import LivePlayer from '@/components/live/live-player.vue'
import { goBack, navigateTo } from '@/utils/router'
import { gotoReport } from '@/lib/report-data'
import { getToken } from '@/utils/storage'
import { useTim, type TimMessage } from '@/composables/useTim'
import { formatPrice } from '@/utils/format'
import {
  liveApi,
  type LiveGift,
  type VerticalLiveComment,
  type VerticalLiveProduct,
  type LiveWatchRankItem,
} from '@/lib/live-data'

// ===== 系统信息（状态栏） =====
const statusBarHeight = ref(0)
// 组件实例（uni.createVideoContext 在组件内需传 this·回放章节 seek 用）
const instance = getCurrentInstance()

// ===== 直播间数据 =====
const loading = ref(true)
const error = ref('')
// 房间默认值（本地空对象·真实数据由 fetchRoomData 填充；原 mock 常量 liveWatchRoom 已按数据流铁律移除）
const defaultWatchRoom = {
  id: '',
  type: 'knowledge' as 'knowledge' | 'commerce',
  title: '',
  hostName: '',
  hostAvatar: '',
  hostId: '',
  followers: 0,
  viewerCount: 0,
  likeCount: 0,
  isFollowing: false,
  onlineAvatars: [] as string[],
  imGroupId: '',
  circleId: '',
  status: '',
  cover: '',
  startTime: '',
  chargeType: 'FREE',
  chargePrice: 0,
  quality: '',
  replayUrl: '',
  replayChapters: [] as { t: number; title: string }[], // #21 回放章节点
  circleName: '',
}
// 模板裸访问大量房间字段，保留 any 避免收敛触发大量报错
const room = ref<any>({ ...defaultWatchRoom })
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
    room.value = { ...defaultWatchRoom, ...data.room }
    comments.value = data.comments
    products.value = data.products
    // 直播中且有弹幕群 → 加入 TIM 群实时弹幕
    if (room.value.imGroupId) joinDanmaku(room.value.imGroupId)
    // 关注态初始化（未登录/失败降级为未关注，不阻断）
    if (room.value.hostId) {
      liveApi.isFollowingHost(room.value.hostId).then((v) => { isFollowing.value = v }).catch(() => {})
    }
    // 佣-V2-P3：进直播间视同该圈子全店渠道点击（仅已登录且直播间关联圈子才上报·失败静默不扰观看）
    if (getToken() && room.value.circleId) liveApi.reportCircleChannelClick(room.value.circleId)
    // 预约态 → 拉取真实预约人数（失败归零则该行不显示）
    if (isWaiting.value) fetchBookingCount(room.value.id)
    // 回放态 → 读本地观看进度（#21 续播记忆）
    if (isReplayState.value) loadReplayPos(room.value.id || roomId)
    // 播放地址只在直播中才拉（预告/回放态请求必被后端 400 拒，白耗一次请求+控制台报错）
    if (roomStatus.value === 'LIVING') fetchPlayUrl(room.value.id || roomId)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// ===== 房间状态三分支（WAITING 预约态 / ENDED·REPLAY 回放态 / 其余走既有沉浸层） =====
const roomStatus = computed(() => String(room.value?.status || '').toUpperCase())
const isWaiting = computed(() => roomStatus.value === 'WAITING')
const isReplayState = computed(() => roomStatus.value === 'ENDED' || roomStatus.value === 'REPLAY')
/** 付费场：只如实展示票价（移动端无 LIVESTREAM 支付接线 → 不做购票按钮） */
const isPaidRoom = computed(() => room.value?.chargeType && room.value.chargeType !== 'FREE' && Number(room.value.chargePrice) > 0)

// ===== 画质角标（V0 quality-badge·观众侧只见结果不见计费；basic 不显示） =====
const qualityLabel = computed(() => {
  const q = String(room.value?.quality || '').toLowerCase()
  if (q === 'hd') return '高清 720P'
  if (q === 'uhd') return '超清 1080P'
  return ''
})

// ===== 来源圈子 → 圈子详情 =====
function goCircleDetail() {
  if (room.value?.circleId) navigateTo(`/pkg-circle/circles/detail?id=${room.value.circleId}`)
}

// ===== 预约态：倒计时（每分钟刷新·onUnmounted 清理） =====
const nowTs = ref(Date.now())
let countdownTimer: ReturnType<typeof setInterval> | null = null
const countdownText = computed(() => {
  const raw = room.value?.startTime
  const st = raw ? new Date(raw).getTime() : NaN
  if (!Number.isFinite(st)) return '即将开播' // 无 startTime → 兜底文案
  const diff = st - nowTs.value
  if (diff <= 0) return '即将开播'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  return days > 0 ? `${days} 天 ${hours} 小时` : `${hours} 小时 ${mins} 分`
})
/** 开播时间行「M月D日 HH:mm」 */
const startTimeText = computed(() => {
  const raw = room.value?.startTime
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

// ===== 预约（POST/DELETE /live/rooms/:id/book·后端无「我是否已预约」查询 → 本次会话乐观维护） =====
const bookingCount = ref(0)
const booked = ref(false)
const bookingSubmitting = ref(false)
async function fetchBookingCount(roomId: string) {
  try { bookingCount.value = await liveApi.getBookingCount(roomId) } catch { bookingCount.value = 0 }
}
async function onToggleBook() {
  if (bookingSubmitting.value) return
  bookingSubmitting.value = true
  try {
    if (!booked.value) {
      const res = await liveApi.bookRoom(room.value.id)
      booked.value = true
      bookingCount.value = res.bookingCount || bookingCount.value + 1
      uni.showToast({ title: '预约成功', icon: 'none' })
    } else {
      await liveApi.unbookRoom(room.value.id)
      booked.value = false
      bookingCount.value = Math.max(0, bookingCount.value - 1)
      uni.showToast({ title: '已取消预约', icon: 'none' })
    }
  } catch (e) {
    // 未登录/非 WAITING 等 → 透传后端错误信息
    uni.showToast({ title: (e as Error)?.message || '操作失败，请重试', icon: 'none' })
  } finally {
    bookingSubmitting.value = false
  }
}

// ===== 回放态：点击封面播放钮后原地渲染点播 video =====
const replayPlaying = ref(false)

// ===== #21 回放章节点 + 观看进度记忆（本地 uni.setStorageSync·后端进度表 TODO） =====
const REPLAY_POS_PREFIX = 'live_replay_pos_'
const savedReplayPos = ref(0)
let replayCtx: UniApp.VideoContext | null = null
let lastPosSaveAt = 0
let resumeDone = false

function getReplayCtx(): UniApp.VideoContext | null {
  if (!replayCtx) replayCtx = uni.createVideoContext('replay-video', instance?.proxy || undefined)
  return replayCtx
}
/** 秒 → mm:ss / h:mm:ss（章节时间点展示） */
function fmtChapterTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
/** 章节点击：未播则先起播（video v-if 渲染后再 seek），已播直接 seek */
function seekToChapter(t: number) {
  resumeDone = true // 手动选章节 → 不再自动续播覆盖
  if (!replayPlaying.value) {
    replayPlaying.value = true
    setTimeout(() => getReplayCtx()?.seek(t), 600) // 等 video 挂载完成
  } else {
    getReplayCtx()?.seek(t)
  }
}
/** 起播回调：首次播放时按本地记忆续播（>30s 才续，避免开头几秒也跳） */
function onReplayPlay() {
  if (resumeDone) return
  resumeDone = true
  if (savedReplayPos.value > 30) {
    getReplayCtx()?.seek(savedReplayPos.value)
    uni.showToast({ title: `已为你续播至 ${fmtChapterTime(savedReplayPos.value)}`, icon: 'none' })
  }
}
/** 播放进度本地记忆（5 秒节流写 storage）·uni video timeupdate 事件 detail.currentTime */
function onReplayTimeUpdate(e: Event) {
  const detail = (e as unknown as { detail?: { currentTime?: number } })?.detail
  const cur = Number(detail?.currentTime) || 0
  const now = Date.now()
  if (cur > 5 && now - lastPosSaveAt > 5000) {
    lastPosSaveAt = now
    try { uni.setStorageSync(REPLAY_POS_PREFIX + room.value.id, Math.floor(cur)) } catch { /* storage 满/不可用 → 忽略 */ }
  }
}
/** 读本地进度（fetchRoomData 成功后调用） */
function loadReplayPos(roomId: string) {
  try { savedReplayPos.value = Number(uni.getStorageSync(REPLAY_POS_PREFIX + roomId)) || 0 } catch { savedReplayPos.value = 0 }
}

// 后端礼物清单（真连：完整礼物对象直传 GiftPanel·送礼直接用礼物 uuid，无需再按名映射）
const gifts = ref<LiveGift[]>([])
async function fetchGifts() {
  try {
    const data = await liveApi.getGifts()
    coinBalance.value = data.balance
    gifts.value = data.gifts
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

// 关注/取关主播 — 复用平台用户关注端点 POST/DELETE /users/:id/follow（与短视频批同一套）
let followSubmitting = false
async function onFollow() {
  const hostId = room.value.hostId
  if (!hostId) {
    uni.showToast({ title: '暂无法关注该主播', icon: 'none' })
    return
  }
  if (followSubmitting) return
  followSubmitting = true
  const prev = isFollowing.value
  isFollowing.value = !prev // 乐观切换，失败回滚
  try {
    if (prev) await liveApi.unfollowHost(hostId)
    else await liveApi.followHost(hostId)
  } catch (e) {
    isFollowing.value = prev
    uni.showToast({ title: (e as Error)?.message || '操作失败，请重试', icon: 'none' })
  } finally {
    followSubmitting = false
  }
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
async function onSendGift(gift: LiveGift, quantity: number) {
  if (sendingGift) return
  const count = Math.min(99, Math.max(1, Math.floor(quantity) || 1))
  // 送礼前余额校验（面板已禁用不足态·此处为后端事务前的最后即时反馈）
  if (coinBalance.value < gift.price * count) {
    uni.showToast({ title: '金币余额不足', icon: 'none' })
    return
  }
  sendingGift = true
  showGiftPanel.value = false
  try {
    // 真实送礼：直接用后端礼物 uuid（后端事务扣国学币 + 记打赏）
    await liveApi.sendGift(room.value.id, gift.id, count)
    // 成功后飘屏 + 弹幕 + 扣余额（icon 为图片链接时飘屏文本位传空串容错）
    const flyIcon = gift.icon && !/^https?:\/\//.test(gift.icon) ? gift.icon : ''
    const fid = ++flyerId
    giftFlyers.value.push({ id: fid, user: '我', avatar: room.value.hostAvatar, giftName: gift.name, giftIcon: flyIcon, count })
    setTimeout(() => { giftFlyers.value = giftFlyers.value.filter((g) => g.id !== fid) }, 4000)
    comments.value.push({ id: 'gift-' + Date.now(), userName: '我', content: `送出 ${gift.name} x${count}`, type: 'gift', giftInfo: { name: gift.name, icon: flyIcon, count } })
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

/**
 * 举报直播间
 * 🔴 原实现是假 toast「举报已提交，感谢反馈」—— 什么都没提交。
 *    举报页（pkg-report）其实早就迁移好了，后端端点也一直在。
 */
function onReport() {
  showShare.value = false
  gotoReport('LIVE', String(room.value?.id || ''), room.value?.title, room.value?.hostName)
}

function scrollDanmakuToBottom() {
  danmakuScrollTop.value = danmakuScrollTop.value + 9999
}

onLoad((opts) => {
  const roomId = opts?.id || '1'
  if (opts?.type === 'commerce') room.value.type = 'commerce'
  fetchRoomData(roomId) // 播放地址在 fetchRoomData 内按 LIVING 态条件拉取
  fetchGifts()
  fetchRanking(roomId)
})

onMounted(() => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.statusBarHeight || 0
  } catch (e) {}
  // 预约态倒计时每分钟刷新（常驻轻量 ticker·非 WAITING 态无副作用）
  countdownTimer = setInterval(() => { nowTs.value = Date.now() }, 60000)
})

onUnmounted(() => {
  // 退订 TIM 群消息 + 退出弹幕群
  if (offTimMessage) offTimMessage()
  if (danmakuGroupId) tim.quitGroup(danmakuGroupId)
  // 清理倒计时定时器
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
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

/* 画质角标 + 来源圈子（V0 quality-badge：深底毛玻璃 + 暖金字） */
.watch__meta-row { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
.quality-badge {
  height: 40rpx; padding: 0 16rpx; border-radius: 20rpx;
  background: rgba(0,0,0,0.5);
  display: inline-flex; align-items: center;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.quality-badge__txt { font-size: 21rpx; font-weight: 600; color: #E8DCC4; }
.circle-link { display: inline-flex; align-items: center; gap: 4rpx; }
.circle-link__txt { font-size: 21rpx; color: rgba(232,220,196,0.8); }

/* ===== 三态共用：状态页返回钮（深底毛玻璃圆钮） ===== */
.state-back {
  position: absolute; left: 24rpx;
  width: 60rpx; height: 60rpx; border-radius: 50%;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  z-index: 5;
}

/* ===== 预约态（V0 状态B·深色 --bg-page:#141210 系） ===== */
.pre { position: absolute; inset: 0; background: #141210; }
.pre__cover-wrap { position: relative; }
/* 16:9 封面压暗（brightness 0.45） */
.pre__cover { display: block; width: 100%; height: 422rpx; filter: brightness(0.45); }
.pre__cover--ph { background: linear-gradient(180deg, #2A2620, #141210); filter: none; }
.pre__overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx;
}
.pre__label { font-size: 24rpx; color: #E8DCC4; letter-spacing: 4rpx; }
.pre__time { font-size: 44rpx; font-weight: 700; color: #FFFFFF; }
.pre__count { font-size: 23rpx; color: rgba(255,255,255,0.75); }
.pre__reserve { padding: 28rpx 32rpx; display: flex; align-items: center; gap: 24rpx; }
.pre__reserve-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.pre__reserve-title { font-size: 29rpx; font-weight: 600; color: #F5F2ED; line-height: 1.4; }
.pre__reserve-sub { font-size: 23rpx; color: #7A7468; }
.pre__btn {
  height: 76rpx; padding: 0 44rpx; border-radius: 38rpx; flex-shrink: 0;
  background: #C41E3A; /* --brand */
  display: flex; align-items: center; justify-content: center;
}
/* 已预约：灰态（可再点取消） */
.pre__btn--booked { background: rgba(255,255,255,0.12); }
.pre__btn-txt { font-size: 27rpx; font-weight: 600; color: #FFFFFF; white-space: nowrap; }
.pre__btn-txt--booked { color: #B8B2A8; }
.pre__ticket {
  margin: 0 32rpx; padding: 20rpx 28rpx;
  background: #2A2620; /* --bg-warm */ border-radius: 16rpx;
}
.pre__ticket-txt { font-size: 23rpx; color: #B8B2A8; line-height: 1.65; }
.pre__ticket-price { color: #C9A96E; font-weight: 600; }

/* ===== 回放态（V0 状态C·点播） ===== */
.rp { position: absolute; inset: 0; background: #141210; }
.rp__cover-wrap { position: relative; background: #000; }
.rp__cover { display: block; width: 100%; height: 422rpx; }
.rp__cover--ph { background: linear-gradient(180deg, #2A2620, #141210); }
.rp__video { display: block; width: 100%; height: 422rpx; }
.rp__badge {
  position: absolute; top: 20rpx; left: 20rpx;
  height: 44rpx; padding: 0 18rpx; border-radius: 22rpx;
  background: rgba(0,0,0,0.55);
  display: inline-flex; align-items: center;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.rp__badge-txt { font-size: 22rpx; font-weight: 600; color: #E8DCC4; }
.rp__play {
  position: absolute; inset: 0; margin: auto;
  width: 108rpx; height: 108rpx; border-radius: 50%;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
.rp__info { padding: 24rpx 32rpx 0; }
.rp__title { font-size: 32rpx; font-weight: 700; color: #F5F2ED; line-height: 1.4; }
.rp__host-row { display: flex; align-items: center; gap: 16rpx; margin-top: 24rpx; }
.rp__host-avatar { width: 76rpx; height: 76rpx; border-radius: 50%; border: 3rpx solid #C9A96E; background: #2A2620; }
.rp__host-name { font-size: 28rpx; font-weight: 600; color: #F5F2ED; }
.rp__empty { margin-top: 48rpx; padding: 64rpx 0; display: flex; justify-content: center; background: #211E1A; border-radius: 36rpx; }
.rp__empty-txt { font-size: 26rpx; color: #7A7468; }

/* #21 回放章节点（V0 circle-live-viewer chapter-list·深色卡+金色时间点） */
.rp__chapter-label { display: block; margin: 40rpx 4rpx 16rpx; font-size: 24rpx; color: #7A7468; }
.rp__chapter-list { background: #211E1A; border-radius: 36rpx; padding: 8rpx 0; }
.rp__chapter-row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; }
.rp__chapter-row + .rp__chapter-row { border-top: 1rpx solid rgba(255, 255, 255, 0.08); }
.rp__chapter-row:active { background: rgba(255, 255, 255, 0.04); }
.rp__chapter-time { flex-shrink: 0; font-size: 24rpx; font-weight: 600; color: #C9A96E; font-variant-numeric: tabular-nums; }
.rp__chapter-name { flex: 1; min-width: 0; font-size: 26rpx; color: #B8B2A8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rp__resume-tip { display: block; margin: 20rpx 4rpx 0; font-size: 22rpx; color: #7A7468; }

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
