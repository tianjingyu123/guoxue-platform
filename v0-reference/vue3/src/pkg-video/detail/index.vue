<template>
  <view
    class="vp"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- 视频容器：支持上下滑动 -->
    <view class="vp__stage">
      <!-- 上一个视频预览 -->
      <view
        v-if="prevVideo"
        class="vp__layer"
        :style="layerStyle(-windowH - swipeOffset)"
      >
        <image class="vp__cover" :src="prevVideo.coverUrl" mode="aspectFill" />
        <view class="vp__shade" />
      </view>

      <!-- 当前视频 -->
      <view
        class="vp__layer"
        :style="curLayerStyle"
        @tap="onSingleTap"
      >
        <image class="vp__cover" :src="currentVideo.coverUrl" mode="aspectFill" />
        <!-- 暂停图标 -->
        <view v-if="!isPlaying" class="vp__pause">
          <view class="vp__pause-btn">
            <AppIcon name="play" :size="48" color="#ffffff" :fill="true" />
          </view>
        </view>
        <!-- 双击飘心 -->
        <view
          v-for="heart in floatingHearts"
          :key="heart.id"
          class="vp__heart"
          :style="{ left: heart.x - 24 + 'px', top: heart.y - 24 + 'px' }"
        >
          <AppIcon name="heart" :size="48" color="#c41e3a" :fill="true" />
        </view>
        <view class="vp__shade" />
      </view>

      <!-- 下一个视频预览 -->
      <view
        v-if="nextVideo"
        class="vp__layer"
        :style="layerStyle(windowH - swipeOffset)"
      >
        <image class="vp__cover" :src="nextVideo.coverUrl" mode="aspectFill" />
        <view class="vp__shade" />
      </view>
    </view>

    <!-- 滑动提示 -->
    <view v-if="currentIndex === 0 && !isTransitioning" class="vp__swipe-tip">
      <AppIcon name="chevron-up" :size="32" color="rgba(255,255,255,0.5)" />
      <text class="vp__swipe-tip-txt">上滑看下一个</text>
    </view>

    <!-- 顶部导航 -->
    <view class="vp__top" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="vp__top-row">
        <view class="vp__icon-btn" @tap="onBack">
          <AppIcon name="chevron-left" :size="36" color="#ffffff" />
        </view>
        <!-- 进度指示器 -->
        <view class="vp__progress">
          <view
            v-for="(_, i) in videos"
            :key="i"
            class="vp__dot"
            :class="{ 'vp__dot--active': i === currentIndex }"
          />
        </view>
        <view class="vp__top-right">
          <view v-if="cartTotal > 0" class="vp__icon-btn vp__icon-btn--cart" @tap="showCart = true">
            <AppIcon name="shopping-cart" :size="30" color="#ffffff" />
            <text class="vp__cart-badge">{{ cartTotal }}</text>
          </view>
          <view class="vp__icon-btn" @tap="isMuted = !isMuted">
            <AppIcon :name="isMuted ? 'volume-x' : 'volume-2'" :size="30" color="#ffffff" />
          </view>
        </view>
      </view>
    </view>

    <!-- 右侧互动按钮 -->
    <view class="vp__actions">
      <!-- 作者头像 -->
      <view class="vp__avatar-wrap">
        <image class="vp__avatar" :src="currentVideo.author.avatar" mode="aspectFill" />
        <view v-if="currentVideo.author.verified" class="vp__verified">
          <AppIcon name="check" :size="18" color="#ffffff" />
        </view>
        <view v-if="!currentVideo.author.isFollowed" class="vp__follow-plus" @tap="onFollow">
          <AppIcon name="plus" :size="22" color="#ffffff" />
        </view>
      </view>

      <!-- 点赞 -->
      <view class="vp__act" @tap="onLike">
        <view class="vp__act-circle" :class="{ 'vp__act-circle--liked': currentVideo.isLiked }">
          <AppIcon name="heart" :size="42" :color="currentVideo.isLiked ? '#c41e3a' : '#ffffff'" :fill="currentVideo.isLiked" />
        </view>
        <text class="vp__act-txt">{{ fmt(currentVideo.likes) }}</text>
      </view>

      <!-- 评论 -->
      <view class="vp__act" @tap="showComments = true">
        <view class="vp__act-circle">
          <AppIcon name="message-circle" :size="42" color="#ffffff" />
        </view>
        <text class="vp__act-txt">{{ fmt(currentVideo.comments) }}</text>
      </view>

      <!-- 收藏 -->
      <view class="vp__act" @tap="onCollect">
        <view class="vp__act-circle" :class="{ 'vp__act-circle--collected': currentVideo.isCollected }">
          <AppIcon name="bookmark" :size="42" :color="currentVideo.isCollected ? '#F5A623' : '#ffffff'" :fill="currentVideo.isCollected" />
        </view>
        <text class="vp__act-txt">收藏</text>
      </view>

      <!-- 分享 -->
      <view class="vp__act">
        <view class="vp__act-circle">
          <AppIcon name="share-2" :size="38" color="#ffffff" />
        </view>
        <text class="vp__act-txt">{{ fmt(currentVideo.shares) }}</text>
      </view>

      <!-- 音乐唱片 -->
      <view class="vp__disc">
        <view class="vp__disc-core" />
      </view>
    </view>

    <!-- 底部信息区 -->
    <view class="vp__bottom" :style="{ paddingBottom: 'calc(' + safeBottom + 'px + 16rpx)' }">
      <view class="vp__author-row">
        <text class="vp__author-name">@{{ currentVideo.author.name }}</text>
        <view v-if="currentVideo.author.verified" class="vp__auth-badge"><text class="vp__auth-badge-txt">认证</text></view>
        <view v-if="!currentVideo.author.isFollowed" class="vp__follow-btn" @tap="onFollow"><text class="vp__follow-btn-txt">关注</text></view>
      </view>
      <text class="vp__title">{{ currentVideo.title }}</text>
      <view class="vp__music">
        <AppIcon name="music" :size="26" color="rgba(255,255,255,0.7)" />
        <text class="vp__music-txt">{{ currentVideo.music }}</text>
      </view>
      <!-- 商品入口 -->
      <view v-if="currentVideo.products.length > 0" class="vp__goods-entry" @tap="showProducts = true">
        <view class="vp__goods-icon"><AppIcon name="shopping-bag" :size="26" color="#ffffff" /></view>
        <text class="vp__goods-txt">{{ currentVideo.products.length }}件同款好物</text>
        <AppIcon name="chevron-up" :size="28" color="rgba(255,255,255,0.6)" />
      </view>
    </view>

    <!-- 评论弹层 -->
    <view v-if="showComments" class="sheet-mask" @tap="showComments = false">
      <view class="sheet" @tap.stop>
        <view class="sheet__head">
          <text class="sheet__title">{{ fmt(currentVideo.comments) }} 条评论</text>
          <view @tap="showComments = false"><AppIcon name="x" :size="36" color="#999" /></view>
        </view>
        <scroll-view scroll-y class="sheet__body">
          <view v-for="(c, i) in currentVideo.hotComments" :key="i" class="cmt">
            <view class="cmt__avatar"><text class="cmt__avatar-txt">{{ c.user.charAt(0) }}</text></view>
            <view class="cmt__main">
              <text class="cmt__user">{{ c.user }}</text>
              <text class="cmt__content">{{ c.content }}</text>
              <view class="cmt__ops">
                <view class="cmt__like"><AppIcon name="heart" :size="26" color="#999" /><text class="cmt__like-txt">{{ c.likes }}</text></view>
                <text class="cmt__reply">回复</text>
              </view>
            </view>
          </view>
          <text class="sheet__more">— 更多评论请在App中查看 —</text>
        </scroll-view>
      </view>
    </view>

    <!-- 商品弹层 -->
    <view v-if="showProducts" class="sheet-mask" @tap="showProducts = false">
      <view class="sheet" @tap.stop>
        <view class="sheet__head">
          <text class="sheet__title">视频同款</text>
          <view @tap="showProducts = false"><AppIcon name="x" :size="36" color="#999" /></view>
        </view>
        <scroll-view scroll-y class="sheet__body">
          <view v-for="p in currentVideo.products" :key="p.id" class="prod">
            <image class="prod__img" :src="p.image" mode="aspectFill" />
            <view class="prod__info">
              <text class="prod__name">{{ p.name }}</text>
              <view class="prod__price-row">
                <text class="prod__price">¥{{ p.price }}</text>
                <text class="prod__origin">¥{{ p.originalPrice }}</text>
              </view>
              <view class="prod__foot">
                <text class="prod__sales">已售 {{ fmt(p.sales) }}</text>
                <view class="prod__buy" :class="{ 'prod__buy--added': addedToCart === p.id }" @tap="addToCart(p)">
                  <text class="prod__buy-txt">{{ addedToCart === p.id ? '已加入' : '加入购物车' }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 购物车弹层 -->
    <view v-if="showCart" class="sheet-mask" @tap="showCart = false">
      <view class="sheet" @tap.stop>
        <view class="sheet__head">
          <text class="sheet__title">购物车 ({{ cartTotal }})</text>
          <view @tap="showCart = false"><AppIcon name="x" :size="36" color="#999" /></view>
        </view>
        <scroll-view scroll-y class="sheet__body">
          <text v-if="cart.length === 0" class="sheet__empty">购物车是空的</text>
          <view v-for="item in cart" :key="item.productId" class="cart-row">
            <image class="cart-row__img" :src="item.product.image" mode="aspectFill" />
            <view class="cart-row__info">
              <text class="cart-row__name">{{ item.product.name }}</text>
              <text class="cart-row__price">¥{{ item.product.price }}</text>
            </view>
            <view class="cart-row__qty">
              <view class="cart-row__btn" @tap="updateQty(item.productId, -1)"><AppIcon name="minus" :size="26" color="#333" /></view>
              <text class="cart-row__num">{{ item.quantity }}</text>
              <view class="cart-row__btn" @tap="updateQty(item.productId, 1)"><AppIcon name="plus" :size="26" color="#333" /></view>
            </view>
          </view>
        </scroll-view>
        <view v-if="cart.length > 0" class="cart-foot" :style="{ paddingBottom: 'calc(' + safeBottom + 'px + 16rpx)' }">
          <view class="cart-foot__total">
            <text class="cart-foot__label">合计：</text>
            <text class="cart-foot__amount">¥{{ cartAmount }}</text>
          </view>
          <view class="cart-foot__checkout" @tap="onCheckout"><text class="cart-foot__checkout-txt">去结算</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { mockVideos, formatVideoNumber as fmt, type VideoItem, type VideoProduct } from '@/lib/video-data'

interface CartItem { productId: string; quantity: number; product: VideoProduct }

// ===== 系统信息 =====
const sysInfo = uni.getSystemInfoSync()
const statusBarHeight = ref(sysInfo.statusBarHeight || 0)
const safeBottom = ref(sysInfo.safeAreaInsets?.bottom || 0)
const windowH = ref(sysInfo.windowHeight || 0)

// ===== 数据（默认渲染真实 mock；@data-needs 由 Claude 接入） =====
// @data-needs: 视频流，参数 id(来自 onLoad)，GET 返回 VideoItem[]
const videos = ref<VideoItem[]>(mockVideos.map((v) => ({ ...v })))
const currentIndex = ref(0)

// ===== 播放/UI 状态 =====
const isPlaying = ref(true)
const isMuted = ref(false)
const showComments = ref(false)
const showProducts = ref(false)
const showCart = ref(false)
const isTransitioning = ref(false)
const swipeOffset = ref(0)
const floatingHearts = ref<Array<{ id: number; x: number; y: number }>>([])
const cart = ref<CartItem[]>([])
const addedToCart = ref<string | null>(null)

let touchStartY = 0
let touchCurrentY = 0
let heartId = 0
let lastTapTime = 0

const currentVideo = computed(() => videos.value[currentIndex.value])
const prevVideo = computed(() => (currentIndex.value > 0 ? videos.value[currentIndex.value - 1] : null))
const nextVideo = computed(() => (currentIndex.value < videos.value.length - 1 ? videos.value[currentIndex.value + 1] : null))

const cartTotal = computed(() => cart.value.reduce((s, i) => s + i.quantity, 0))
const cartAmount = computed(() => cart.value.reduce((s, i) => s + i.quantity * i.product.price, 0))

const curLayerStyle = computed(() => ({
  transform: `translateY(${-swipeOffset.value}px)`,
  transition: isTransitioning.value ? 'transform 0.3s ease-out' : 'none',
}))
function layerStyle(offset: number) {
  return {
    transform: `translateY(${offset}px)`,
    transition: isTransitioning.value ? 'transform 0.3s ease-out' : 'none',
  }
}

onLoad((opts) => {
  const id = opts?.id
  if (id) {
    const idx = videos.value.findIndex((v) => v.id === String(id))
    if (idx !== -1) currentIndex.value = idx
  }
})

// ===== 触摸滑动 =====
function onTouchStart(e: any) {
  if (showComments.value || showProducts.value || showCart.value) return
  touchStartY = e.touches[0].clientY
  touchCurrentY = e.touches[0].clientY
}
function onTouchMove(e: any) {
  if (showComments.value || showProducts.value || showCart.value || isTransitioning.value) return
  touchCurrentY = e.touches[0].clientY
  const diff = touchStartY - touchCurrentY
  if ((diff > 0 && nextVideo.value) || (diff < 0 && prevVideo.value)) {
    swipeOffset.value = Math.max(-150, Math.min(150, diff))
  }
}
function onTouchEnd() {
  if (showComments.value || showProducts.value || showCart.value || isTransitioning.value) return
  const diff = touchStartY - touchCurrentY
  const threshold = 80
  if (Math.abs(diff) > threshold) {
    if (diff > 0 && nextVideo.value) {
      isTransitioning.value = true
      swipeOffset.value = windowH.value
      setTimeout(() => {
        currentIndex.value += 1
        swipeOffset.value = 0
        isTransitioning.value = false
      }, 300)
    } else if (diff < 0 && prevVideo.value) {
      isTransitioning.value = true
      swipeOffset.value = -windowH.value
      setTimeout(() => {
        currentIndex.value -= 1
        swipeOffset.value = 0
        isTransitioning.value = false
      }, 300)
    } else {
      swipeOffset.value = 0
    }
  } else {
    swipeOffset.value = 0
  }
}

// ===== 单击暂停 / 双击点赞 =====
function onSingleTap(e: any) {
  const now = Date.now()
  if (now - lastTapTime < 280) {
    // 双击
    lastTapTime = 0
    const touch = e.changedTouches?.[0] || e.detail || {}
    const x = touch.clientX || windowH.value / 2
    const y = touch.clientY || windowH.value / 2
    const id = heartId++
    floatingHearts.value.push({ id, x, y })
    setTimeout(() => {
      floatingHearts.value = floatingHearts.value.filter((h) => h.id !== id)
    }, 1000)
    if (!currentVideo.value.isLiked) onLike()
    return
  }
  lastTapTime = now
  setTimeout(() => {
    if (lastTapTime !== 0 && Date.now() - lastTapTime >= 280) {
      isPlaying.value = !isPlaying.value
      lastTapTime = 0
    }
  }, 300)
}

function onLike() {
  const v = currentVideo.value
  v.isLiked = !v.isLiked
  v.likes += v.isLiked ? 1 : -1
}
function onCollect() {
  currentVideo.value.isCollected = !currentVideo.value.isCollected
}
function onFollow() {
  currentVideo.value.author.isFollowed = !currentVideo.value.author.isFollowed
}

function addToCart(product: VideoProduct) {
  const existing = cart.value.find((i) => i.productId === product.id)
  if (existing) existing.quantity += 1
  else cart.value.push({ productId: product.id, quantity: 1, product })
  addedToCart.value = product.id
  setTimeout(() => { addedToCart.value = null }, 1500)
}
function updateQty(productId: string, delta: number) {
  const item = cart.value.find((i) => i.productId === productId)
  if (!item) return
  item.quantity += delta
  if (item.quantity <= 0) cart.value = cart.value.filter((i) => i.productId !== productId)
}
function onCheckout() {
  uni.showToast({ title: '结算功能开发中', icon: 'none' })
}

function onBack() {
  goBack()
}
</script>

<style scoped lang="scss">
.vp {
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
}
.vp__stage { position: absolute; inset: 0; overflow: hidden; }
.vp__layer { position: absolute; inset: 0; width: 100%; height: 100%; }
.vp__cover { width: 100%; height: 100%; }
.vp__shade {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3), transparent 35%, transparent 65%, rgba(0,0,0,0.6));
}
.vp__pause { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); }
.vp__pause-btn { width: 140rpx; height: 140rpx; border-radius: 999rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.vp__heart { position: absolute; animation: float-heart 1s ease-out forwards; pointer-events: none; }
@keyframes float-heart {
  0% { transform: scale(0) translateY(0); opacity: 1; }
  50% { transform: scale(1.2) translateY(-50px); opacity: 1; }
  100% { transform: scale(1) translateY(-100px); opacity: 0; }
}

.vp__swipe-tip {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center; gap: 8rpx;
  pointer-events: none; animation: tip-pulse 1.5s ease-in-out infinite;
}
.vp__swipe-tip-txt { font-size: 22rpx; color: rgba(255,255,255,0.5); }
@keyframes tip-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.9; } }

/* 顶部导航 */
.vp__top { position: absolute; top: 0; left: 0; right: 0; z-index: 30; }
.vp__top-row { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; }
.vp__icon-btn { position: relative; width: 64rpx; height: 64rpx; border-radius: 999rpx; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.vp__top-right { display: flex; align-items: center; gap: 12rpx; }
.vp__cart-badge { position: absolute; top: -6rpx; right: -6rpx; min-width: 32rpx; height: 32rpx; padding: 0 6rpx; border-radius: 999rpx; background: #c41e3a; color: #fff; font-size: 18rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.vp__progress { display: flex; align-items: center; gap: 6rpx; }
.vp__dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: rgba(255,255,255,0.4); transition: all 0.2s; }
.vp__dot--active { width: 28rpx; background: #fff; }

/* 右侧互动 */
.vp__actions { position: absolute; right: 20rpx; bottom: 320rpx; z-index: 30; display: flex; flex-direction: column; align-items: center; gap: 36rpx; }
.vp__avatar-wrap { position: relative; margin-bottom: 8rpx; }
.vp__avatar { width: 84rpx; height: 84rpx; border-radius: 999rpx; border: 3rpx solid #fff; background: #333; }
.vp__verified { position: absolute; bottom: -2rpx; right: -2rpx; width: 30rpx; height: 30rpx; border-radius: 999rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.vp__follow-plus { position: absolute; bottom: -16rpx; left: 50%; transform: translateX(-50%); width: 36rpx; height: 36rpx; border-radius: 999rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.vp__act { display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.vp__act-circle { width: 80rpx; height: 80rpx; border-radius: 999rpx; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.vp__act-circle--liked { background: rgba(230,57,80,0.2); }
.vp__act-circle--collected { background: rgba(245,166,35,0.2); }
.vp__act-txt { font-size: 22rpx; color: #fff; font-weight: 500; }
.vp__disc { width: 80rpx; height: 80rpx; border-radius: 999rpx; background: linear-gradient(135deg, #2b2b2b, #111); border: 3rpx solid #444; display: flex; align-items: center; justify-content: center; animation: spin 3s linear infinite; }
.vp__disc-core { width: 28rpx; height: 28rpx; border-radius: 999rpx; background: rgba(255,255,255,0.2); }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* 底部信息 */
.vp__bottom { position: absolute; left: 0; right: 130rpx; bottom: 0; z-index: 30; padding: 28rpx; }
.vp__author-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 14rpx; }
.vp__author-name { font-size: 30rpx; font-weight: 600; color: #fff; }
.vp__auth-badge { padding: 2rpx 10rpx; border-radius: 6rpx; background: rgba(201,168,106,0.8); }
.vp__auth-badge-txt { font-size: 18rpx; color: #fff; }
.vp__follow-btn { padding: 4rpx 18rpx; border-radius: 999rpx; background: #c41e3a; }
.vp__follow-btn-txt { font-size: 22rpx; color: #fff; font-weight: 500; }
.vp__title { display: block; font-size: 26rpx; color: #fff; line-height: 1.5; margin-bottom: 16rpx; }
.vp__music { display: flex; align-items: center; gap: 10rpx; margin-bottom: 16rpx; }
.vp__music-txt { font-size: 22rpx; color: rgba(255,255,255,0.7); flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.vp__goods-entry { display: inline-flex; align-items: center; gap: 10rpx; padding: 12rpx 20rpx; background: rgba(255,255,255,0.1); border-radius: 999rpx; align-self: flex-start; }
.vp__goods-icon { width: 40rpx; height: 40rpx; border-radius: 8rpx; background: linear-gradient(135deg, #F5C24B, #F5853F); display: flex; align-items: center; justify-content: center; }
.vp__goods-txt { font-size: 22rpx; color: #fff; }

/* 弹层通用 */
.sheet-mask { position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.5); }
.sheet { position: absolute; left: 0; right: 0; bottom: 0; background: var(--surface, #fff); border-radius: 32rpx 32rpx 0 0; max-height: 70vh; display: flex; flex-direction: column; animation: slide-up 0.3s ease-out; }
@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.sheet__head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; border-bottom: 1rpx solid var(--border, #eee); }
.sheet__title { font-size: 30rpx; font-weight: 600; color: var(--text, #1a1a1a); }
.sheet__body { padding: 28rpx; max-height: 56vh; }
.sheet__more { display: block; text-align: center; font-size: 22rpx; color: var(--text-muted, #999); padding: 28rpx 0; }
.sheet__empty { display: block; text-align: center; font-size: 26rpx; color: var(--text-muted, #999); padding: 64rpx 0; }

/* 评论 */
.cmt { display: flex; gap: 20rpx; margin-bottom: 28rpx; }
.cmt__avatar { width: 56rpx; height: 56rpx; border-radius: 999rpx; background: var(--surface-sunken, #f0f0f0); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cmt__avatar-txt { font-size: 24rpx; font-weight: 500; color: var(--text-muted, #999); }
.cmt__main { flex: 1; display: flex; flex-direction: column; }
.cmt__user { font-size: 22rpx; color: var(--text-muted, #999); margin-bottom: 6rpx; }
.cmt__content { font-size: 26rpx; color: var(--text, #1a1a1a); }
.cmt__ops { display: flex; align-items: center; gap: 28rpx; margin-top: 12rpx; }
.cmt__like { display: flex; align-items: center; gap: 6rpx; }
.cmt__like-txt { font-size: 22rpx; color: var(--text-muted, #999); }
.cmt__reply { font-size: 22rpx; color: var(--text-muted, #999); }

/* 商品 */
.prod { display: flex; gap: 20rpx; padding: 20rpx; background: var(--surface-sunken, #f7f7f7); border-radius: 20rpx; margin-bottom: 18rpx; }
.prod__img { width: 140rpx; height: 140rpx; border-radius: 14rpx; flex-shrink: 0; }
.prod__info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.prod__name { font-size: 26rpx; font-weight: 500; color: var(--text, #1a1a1a); line-height: 1.4; }
.prod__price-row { display: flex; align-items: baseline; gap: 12rpx; margin: 10rpx 0; }
.prod__price { font-size: 30rpx; font-weight: 700; color: #c41e3a; }
.prod__origin { font-size: 22rpx; color: var(--text-muted, #999); text-decoration: line-through; }
.prod__foot { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.prod__sales { font-size: 22rpx; color: var(--text-muted, #999); }
.prod__buy { padding: 10rpx 28rpx; border-radius: 999rpx; background: #c41e3a; }
.prod__buy--added { background: #34A853; }
.prod__buy-txt { font-size: 22rpx; color: #fff; font-weight: 500; }

/* 购物车 */
.cart-row { display: flex; gap: 20rpx; padding: 20rpx; background: var(--surface-sunken, #f7f7f7); border-radius: 20rpx; margin-bottom: 18rpx; align-items: center; }
.cart-row__img { width: 112rpx; height: 112rpx; border-radius: 14rpx; flex-shrink: 0; }
.cart-row__info { flex: 1; min-width: 0; }
.cart-row__name { display: block; font-size: 26rpx; font-weight: 500; color: var(--text, #1a1a1a); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 8rpx; }
.cart-row__price { font-size: 28rpx; font-weight: 700; color: #c41e3a; }
.cart-row__qty { display: flex; align-items: center; gap: 16rpx; }
.cart-row__btn { width: 48rpx; height: 48rpx; border-radius: 999rpx; background: var(--surface, #fff); border: 1rpx solid var(--border, #eee); display: flex; align-items: center; justify-content: center; }
.cart-row__num { min-width: 36rpx; text-align: center; font-size: 26rpx; font-weight: 500; color: var(--text, #1a1a1a); }
.cart-foot { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; border-top: 1rpx solid var(--border, #eee); }
.cart-foot__label { font-size: 24rpx; color: var(--text-muted, #999); }
.cart-foot__amount { font-size: 38rpx; font-weight: 700; color: #c41e3a; }
.cart-foot__checkout { padding: 20rpx 56rpx; border-radius: 999rpx; background: #c41e3a; }
.cart-foot__checkout-txt { font-size: 28rpx; color: #fff; font-weight: 500; }
</style>
