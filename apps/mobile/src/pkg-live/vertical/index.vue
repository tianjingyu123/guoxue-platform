<template>
  <view class="page" @dblclick="onDoubleTap">
    <!-- 加载/错误覆盖层 -->
    <view v-if="loading" class="state-overlay">
      <view class="state-spinner" />
      <text class="state-txt">加载中...</text>
    </view>
    <view v-else-if="error" class="state-overlay">
      <text class="state-txt">{{ error }}</text>
      <view class="state-retry" @tap="fetchData('1')"><text class="state-retry-txt">重试</text></view>
    </view>
    <template v-else>
    <!-- 视频背景 -->
    <view class="video-bg">
      <image lazy-load class="video-img" :src="room.hostAvatar" mode="aspectFill" />
      <view class="video-mask" />
    </view>

    <!-- 顶部信息栏 -->
    <view class="top-bar">
      <view class="top-row">
        <!-- 主播信息 -->
        <view class="host-pill">
          <view class="host-avatar-wrap">
            <image lazy-load class="host-avatar" :src="room.hostAvatar" mode="aspectFill" />
            <view class="live-tag">LIVE</view>
          </view>
          <view class="host-text">
            <view class="host-name-row">
              <text class="host-name">{{ room.hostName }}</text>
              <view class="host-level">
                <AppIcon name="crown" :size="20" color="#fff" />
                <text class="host-level-txt">Lv.{{ room.hostLevel }}</text>
              </view>
            </view>
            <text class="host-fans">{{ formatCount(room.followers) }} 粉丝</text>
          </view>
          <view class="follow-btn" :class="{ 'follow-btn--on': isFollowing }" @tap="onToggleFollow">
            {{ isFollowing ? '已关注' : '关注' }}
          </view>
        </view>

        <!-- 右侧 -->
        <view class="top-right">
          <view class="viewer-pill">
            <AppIcon name="users" :size="28" color="rgba(255,255,255,0.7)" />
            <text class="viewer-num">{{ formatCount(viewerCount) }}</text>
          </view>
          <view class="close-btn" @tap="goBack">
            <AppIcon name="x" :size="40" color="#fff" />
          </view>
        </view>
      </view>

      <!-- 在线观众头像 -->
      <view class="online-row">
        <view v-for="(avatar, i) in room.onlineAvatars" :key="i" class="online-avatar" :class="{ 'online-avatar-first': i === 0 }">
          <image lazy-load class="online-img" :src="avatar" mode="aspectFill" />
        </view>
        <text class="online-more">+{{ formatCount(viewerCount - 3) }}</text>
      </view>
    </view>

    <!-- 礼物动画 overlay（左侧滑入） -->
    <view class="gift-anim-layer">
      <view v-for="anim in giftAnimations" :key="anim.id" class="gift-anim">
        <view class="gift-anim__icon">
          <image lazy-load class="gift-anim__img" :src="anim.gift.icon" mode="aspectFit" />
        </view>
        <view class="gift-anim__info">
          <text class="gift-anim__user">{{ anim.user }}</text>
          <text class="gift-anim__txt">送出 {{ anim.gift.name }}</text>
        </view>
      </view>
    </view>

    <!-- 飘心动画区域（右侧底部上方） -->
    <view class="hearts-layer">
      <view
        v-for="heart in floatingHearts"
        :key="heart.id"
        class="float-heart"
        :style="{ transform: `translateX(${heart.x}px) scale(${heart.scale})` }"
      >
        <AppIcon name="heart" :size="56" color="#C41E3A" :fill="true" />
      </view>
    </view>

    <!-- 弹幕区域 -->
    <view class="danmaku">
      <view v-for="c in comments" :key="c.id" class="dm-item">
        <!-- 系统 -->
        <view v-if="c.type === 'system'" class="dm-system">
          <text class="dm-system-txt">{{ c.content }}</text>
        </view>
        <!-- 进入直播间（紫色高亮） -->
        <view v-else-if="c.type === 'enter'" class="dm-enter">
          <text class="dm-enter-name">{{ c.userName }} </text>
          <text class="dm-enter-txt">{{ c.content }}</text>
        </view>
        <!-- 礼物（金色背景+礼物图标） -->
        <view v-else-if="c.type === 'gift'" class="dm-gift">
          <text class="dm-gift-name">{{ c.userName }} </text>
          <text class="dm-gift-txt">送出 {{ c.giftInfo?.name }} × {{ c.giftInfo?.count }}</text>
        </view>
        <!-- 普通文本 -->
        <view v-else class="dm-text">
          <text class="dm-name" :class="{ 'dm-name--host': c.isHost }">{{ c.userName }}:</text>
          <text class="dm-content">{{ c.content }}</text>
        </view>
      </view>
    </view>

    <!-- 商品浮窗 -->
    <view v-if="currentProduct" class="product-float" @tap="onOpenProductDetail(currentProduct)">
      <view class="pf-card">
        <view class="pf-img-wrap">
          <image lazy-load class="pf-img" :src="currentProduct.cover" mode="aspectFill" />
          <view class="pf-badge">讲解中</view>
        </view>
        <view class="pf-info">
          <text class="pf-name">{{ currentProduct.name }}</text>
          <view class="pf-price-row">
            <text class="pf-price">¥{{ currentProduct.price }}</text>
            <text class="pf-origin">¥{{ currentProduct.originalPrice }}</text>
          </view>
        </view>
        <view class="pf-buy">立即购买</view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-inner">
        <view class="dm-input" @tap="onOpenCommentInput">说点什么...</view>
        <view class="action-btn action-cart" @tap="onOpenProductList">
          <AppIcon name="shopping-cart" :size="40" color="#fff" />
          <view class="cart-badge">{{ products.length }}</view>
        </view>
        <view class="action-btn action-gift" @tap="onOpenGiftPanel">
          <AppIcon name="gift" :size="40" color="#fff" />
        </view>
        <view class="action-btn action-glass" @tap="onDoubleTap">
          <AppIcon name="heart" :size="40" color="#C41E3A" :fill="true" />
        </view>
        <view class="action-btn action-glass" @tap="onShare">
          <AppIcon name="share-2" :size="40" color="#fff" />
        </view>
      </view>
    </view>

    <!-- ========== 弹幕输入框弹窗 ========== -->
    <view v-if="showCommentInput" class="ci-mask" @tap="onCloseCommentInput">
      <view class="ci-bar" @tap.stop>
        <input
          v-model="commentInput"
          class="ci-field"
          placeholder="发送弹幕..."
          placeholder-class="ci-ph"
          :focus="showCommentInput"
          confirm-type="send"
          @confirm="onSendComment"
        />
        <view class="ci-send" :class="{ 'ci-send--off': !commentInput.trim() }" @tap="onSendComment">
          <AppIcon name="chevron-right" :size="40" color="#fff" />
        </view>
      </view>
    </view>

    <!-- ========== 礼物面板 ========== -->
    <view v-if="showGiftPanel" class="gp-mask" @tap="onCloseGiftPanel">
      <view class="gp-sheet" @tap.stop>
        <view class="gp-head">
          <text class="gp-title">送礼物</text>
          <view @tap="onCloseGiftPanel">
            <AppIcon name="x" :size="40" color="rgba(255,255,255,0.6)" />
          </view>
        </view>
        <view class="gp-grid">
          <view v-for="g in gifts" :key="g.id" class="gp-cell" @tap="onSendGift(g)">
            <image lazy-load class="gp-cell__img" :src="g.icon" mode="aspectFit" />
            <text class="gp-cell__name">{{ g.name }}</text>
            <text class="gp-cell__price">{{ g.price }}国学币</text>
          </view>
        </view>
        <view class="gp-foot">
          <text class="gp-balance">余额：{{ coinBalance }} 国学币</text>
          <text class="gp-recharge" @tap="onRecharge">充值</text>
        </view>
      </view>
    </view>

    <!-- ========== 商品列表弹窗 ========== -->
    <view v-if="showProductList" class="pl-mask" @tap="onCloseProductList">
      <view class="pl-sheet" @tap.stop>
        <view class="pl-head">
          <text class="pl-title">直播间好物</text>
          <view @tap="onCloseProductList">
            <AppIcon name="x" :size="40" color="rgba(255,255,255,0.6)" />
          </view>
        </view>
        <scroll-view scroll-y class="pl-body">
          <view v-for="(product, idx) in products" :key="product.id" class="pl-row" @tap="onOpenProductDetail(product)">
            <view class="pl-img-wrap">
              <view class="pl-idx">{{ idx + 1 }}</view>
              <image lazy-load class="pl-img" :src="product.cover" mode="aspectFill" />
              <view v-if="product.isExplaining" class="pl-explaining">讲解中</view>
            </view>
            <view class="pl-info">
              <text class="pl-name">{{ product.name }}</text>
              <view class="pl-price-row">
                <text class="pl-price">¥{{ product.price }}</text>
                <text class="pl-origin">¥{{ product.originalPrice }}</text>
              </view>
              <text class="pl-sold">已售 {{ product.sold }}</text>
            </view>
            <view class="pl-buy">立即购买</view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ========== 半屏确认订单 ========== -->
    <QuickBuySheet
      :open="showProductDetail && !!selectedProduct"
      :product="quickBuyProduct"
      @close="onCloseProductDetail"
      @paid="onPaid"
    />
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import QuickBuySheet, { type QuickBuyProduct } from '@/components/live/quick-buy-sheet.vue'
import { goBack } from '@/utils/router'
import {
  liveApi,
  type VerticalLiveProduct,
  type LiveGift,
} from '@/lib/live-data'

const loading = ref(true)
const error = ref('')
const room = ref<any>({})
const comments = ref<any[]>([])
const products = ref<VerticalLiveProduct[]>([])
const gifts = ref<LiveGift[]>([])
const coinBalance = ref(0)

async function fetchData(roomId: string) {
  loading.value = true
  error.value = ''
  try {
    const [roomData, giftsData] = await Promise.all([
      liveApi.getVerticalRoom(roomId),
      liveApi.getGifts(),
    ])
    room.value = roomData.room
    comments.value = roomData.comments
    products.value = roomData.products
    gifts.value = giftsData.gifts
    coinBalance.value = giftsData.balance
    viewerCount.value = roomData.room.viewerCount || 0
    likeCount.value = roomData.room.likeCount || 0
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// ===== UI 状态 ref =====
const isFollowing = ref(false)
const viewerCount = ref(0)
const likeCount = ref(0)

onLoad((opts: any) => {
  fetchData(opts?.id || '1')
})

onMounted(() => {
  // 初始值在 fetchData 后更新
})
const floatingHearts = ref<{ id: number; x: number; scale: number }[]>([])
const giftAnimations = ref<{ id: number; gift: LiveGift; user: string }[]>([])
const commentInput = ref('')
const showCommentInput = ref(false)
const showGiftPanel = ref(false)
const showProductList = ref(false)
const showProductDetail = ref(false)
const selectedProduct = ref<VerticalLiveProduct | null>(null)

const currentProduct = computed(() => products.value.find((p) => p.isExplaining) || products.value[0])

// 当前选中商品 → QuickBuySheet 入参（附带规格）
const quickBuyProduct = computed<QuickBuyProduct | null>(() => {
  const p = selectedProduct.value
  if (!p) return null
  return {
    id: p.id,
    name: p.name,
    cover: p.cover,
    price: p.price,
    originalPrice: p.originalPrice,
    stock: p.stock,
    sold: p.sold,
    skus: ['标准装', '豪华装', '套装'],
  }
})

function formatCount(count: number) {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  return count.toString()
}

// ===== 交互（UI 占位，业务逻辑由 Claude Code 对接）=====
// @data-needs: 关注/取关主播接口
function onToggleFollow() { isFollowing.value = !isFollowing.value }
// @data-needs: 分享直播间
function onShare() {}
// 双击点赞 + 飘心动画（@data-needs: 上报点赞数）
function onDoubleTap() {
  likeCount.value++
  const id = Date.now() + Math.random()
  floatingHearts.value.push({ id, x: Math.random() * 60 - 30, scale: 0.8 + Math.random() * 0.4 })
  setTimeout(() => {
    floatingHearts.value = floatingHearts.value.filter((h) => h.id !== id)
  }, 1500)
}
function onOpenCommentInput() { showCommentInput.value = true }
function onCloseCommentInput() { showCommentInput.value = false }
// @data-needs: 发送弹幕接口，入参 content
function onSendComment() {
  if (!commentInput.value.trim()) return
  comments.value.push({ id: Date.now().toString(), userName: '我', content: commentInput.value, type: 'text' })
  commentInput.value = ''
  showCommentInput.value = false
}
function onOpenGiftPanel() { showGiftPanel.value = true }
function onCloseGiftPanel() { showGiftPanel.value = false }
// @data-needs: 送礼接口，入参 giftId，扣减 coinBalance
function onSendGift(gift: LiveGift) {
  const id = Date.now() + Math.random()
  giftAnimations.value.push({ id, gift, user: '我' })
  comments.value.push({
    id: Date.now().toString(),
    userName: '我',
    content: '',
    type: 'gift',
    giftInfo: { name: gift.name, icon: gift.icon, count: 1 },
  })
  setTimeout(() => {
    giftAnimations.value = giftAnimations.value.filter((g) => g.id !== id)
  }, 3000)
  showGiftPanel.value = false
}
// @data-needs: 跳转充值页/充值弹窗
function onRecharge() {}
function onOpenProductList() { showProductList.value = true }
function onCloseProductList() { showProductList.value = false }
function onOpenProductDetail(product: VerticalLiveProduct) {
  selectedProduct.value = product
  showProductDetail.value = true
  showProductList.value = false
}
function onCloseProductDetail() { showProductDetail.value = false }
// @data-needs: 支付成功回调，返回直播间继续观看
function onPaid() { showProductDetail.value = false }
</script>

<style scoped>
.page {
  position: fixed;
  inset: 0;
  background: #000;
}

/* 加载/错误覆盖层 */
.state-overlay { position: absolute; inset: 0; z-index: 200; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; }
.state-spinner { width: 64rpx; height: 64rpx; border-radius: 50%; border: 4rpx solid rgba(255,255,255,0.2); border-top-color: var(--brand); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.state-txt { font-size: 26rpx; color: rgba(255,255,255,0.6); margin-top: 24rpx; }
.state-retry { margin-top: 32rpx; padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.state-retry-txt { font-size: 28rpx; color: #fff; font-weight: 500; }

/* 视频背景 */
.video-bg {
  position: absolute;
  inset: 0;
}
.video-img {
  width: 100%;
  height: 100%;
}
.video-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent 50%, rgba(0, 0, 0, 0.8));
}

/* 顶部信息栏 */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 96rpx 32rpx 0;
}
.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.host-pill {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 999rpx;
  padding: 8rpx 24rpx 8rpx 8rpx;
}
.host-avatar-wrap {
  position: relative;
}
.host-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 4rpx solid var(--brand);
}
.live-tag {
  position: absolute;
  bottom: -4rpx;
  left: 50%;
  transform: translateX(-50%);
  background: var(--brand);
  color: #fff;
  font-size: 16rpx;
  padding: 0 12rpx;
  border-radius: 4rpx;
  font-weight: 500;
}
.host-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.host-name {
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
}
.host-level {
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: linear-gradient(to right, #f59e0b, #f97316);
  border-radius: 999rpx;
  padding: 2rpx 12rpx;
}
.host-level-txt {
  font-size: 20rpx;
  color: #fff;
  font-weight: 500;
}
.host-fans {
  color: rgba(255, 255, 255, 0.7);
  font-size: 22rpx;
}
.follow-btn {
  margin-left: 8rpx;
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 500;
  background: var(--brand);
  color: #fff;
}
.follow-btn--on {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
}
.top-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.viewer-pill {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 999rpx;
  padding: 12rpx 24rpx;
}
.viewer-num {
  color: #fff;
  font-size: 22rpx;
}
.close-btn {
  width: 64rpx;
  height: 64rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.online-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
}
.online-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 2rpx solid rgba(255, 255, 255, 0.4);
  margin-left: -8rpx;
}
.online-avatar-first {
  margin-left: 0;
}
.online-img {
  width: 100%;
  height: 100%;
}
.online-more {
  color: rgba(255, 255, 255, 0.6);
  font-size: 22rpx;
  margin-left: 8rpx;
}

/* 礼物动画 overlay */
.gift-anim-layer {
  position: absolute;
  left: 32rpx;
  top: 33%;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.gift-anim {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: linear-gradient(to right, rgba(196, 30, 58, 0.9), rgba(201, 169, 110, 0.9));
  border-radius: 999rpx;
  padding: 16rpx 32rpx;
}
.gift-anim__icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.gift-anim__img {
  width: 56rpx;
  height: 56rpx;
}
.gift-anim__user {
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
  display: block;
}
.gift-anim__txt {
  color: rgba(255, 255, 255, 0.8);
  font-size: 22rpx;
}

/* 飘心动画 */
.hearts-layer {
  position: absolute;
  right: 32rpx;
  bottom: 352rpx;
  width: 128rpx;
  height: 256rpx;
  pointer-events: none;
  z-index: 20;
}
.float-heart {
  position: absolute;
  bottom: 0;
  left: 50%;
  animation: floatUp 1.5s ease-out forwards;
}
@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-240rpx) scale(0.5);
  }
}

/* 弹幕 */
.danmaku {
  position: absolute;
  left: 32rpx;
  bottom: 352rpx;
  width: 576rpx;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.dm-item {
  display: flex;
}
.dm-system {
  display: inline-block;
  background: rgba(201, 169, 110, 0.8);
  border-radius: 16rpx;
  padding: 8rpx 20rpx;
}
.dm-system-txt {
  color: #fff;
  font-size: 22rpx;
}
.dm-enter {
  display: inline-block;
  background: rgba(139, 92, 246, 0.35);
  border-radius: 16rpx;
  padding: 8rpx 20rpx;
}
.dm-enter-name {
  color: #C9A96E;
  font-size: 22rpx;
}
.dm-enter-txt {
  color: rgba(255, 255, 255, 0.6);
  font-size: 22rpx;
}
.dm-gift {
  display: inline-block;
  background: linear-gradient(to right, rgba(196, 30, 58, 0.5), rgba(201, 169, 110, 0.5));
  border-radius: 16rpx;
  padding: 8rpx 20rpx;
}
.dm-gift-name {
  color: #FFD700;
  font-size: 22rpx;
}
.dm-gift-txt {
  color: #fff;
  font-size: 22rpx;
}
.dm-text {
  display: inline-block;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16rpx;
  padding: 8rpx 20rpx;
}
.dm-name {
  color: #C9A96E;
  font-size: 22rpx;
}
.dm-name--host {
  color: var(--brand);
}
.dm-content {
  color: #fff;
  font-size: 22rpx;
  margin-left: 8rpx;
}

/* 商品浮窗 */
.product-float {
  position: absolute;
  left: 32rpx;
  right: 32rpx;
  bottom: 240rpx;
  z-index: 10;
}
.pf-card {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 24rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.pf-img-wrap {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
}
.pf-img {
  width: 100%;
  height: 100%;
}
.pf-badge {
  position: absolute;
  top: 0;
  left: 0;
  background: var(--brand);
  color: #fff;
  font-size: 16rpx;
  padding: 2rpx 8rpx;
  border-radius: 0 0 8rpx 0;
}
.pf-info {
  flex: 1;
  min-width: 0;
}
.pf-name {
  color: #fff;
  font-size: 28rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.pf-price-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 4rpx;
}
.pf-price {
  color: var(--brand);
  font-weight: 700;
  font-size: 28rpx;
}
.pf-origin {
  color: rgba(255, 255, 255, 0.4);
  font-size: 22rpx;
  text-decoration: line-through;
}
.pf-buy {
  background: var(--brand);
  color: #fff;
  font-size: 22rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-weight: 500;
  flex-shrink: 0;
}

/* 底部操作栏 */
.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  padding-bottom: env(safe-area-inset-bottom);
}
.bottom-inner {
  padding: 16rpx 32rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.dm-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  padding: 20rpx 32rpx;
  color: rgba(255, 255, 255, 0.5);
  font-size: 28rpx;
}
.action-btn {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.action-cart {
  background: var(--brand);
}
.cart-badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #C9A96E;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}
.action-gift {
  background: linear-gradient(to bottom right, #f59e0b, #f97316);
}
.action-glass {
  background: rgba(255, 255, 255, 0.1);
}

/* ===== 弹幕输入框弹窗 ===== */
.ci-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.ci-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #1a1a1a;
  padding: 32rpx 32rpx 64rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.ci-field {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  padding: 24rpx 32rpx;
  color: #fff;
  font-size: 28rpx;
}
.ci-ph {
  color: rgba(255, 255, 255, 0.4);
}
.ci-send {
  width: 88rpx;
  height: 88rpx;
  background: var(--brand);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ci-send--off {
  background: #555;
}

/* ===== 礼物面板 ===== */
.gp-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.gp-sheet {
  background: #1a1a1a;
  border-radius: 48rpx 48rpx 0 0;
  padding: 32rpx 32rpx 64rpx;
}
.gp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.gp-title {
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
}
.gp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
}
.gp-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
}
.gp-cell__img {
  width: 72rpx;
  height: 72rpx;
}
.gp-cell__name {
  color: #fff;
  font-size: 22rpx;
}
.gp-cell__price {
  color: #C9A96E;
  font-size: 20rpx;
}
.gp-foot {
  margin-top: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.gp-balance {
  color: rgba(255, 255, 255, 0.6);
  font-size: 22rpx;
}
.gp-recharge {
  color: var(--brand);
  font-size: 22rpx;
}

/* ===== 商品列表弹窗 ===== */
.pl-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.pl-sheet {
  background: #1a1a1a;
  border-radius: 48rpx 48rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.pl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.pl-title {
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
}
.pl-body {
  flex: 1;
  padding: 32rpx;
}
.pl-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
  margin-bottom: 24rpx;
}
.pl-img-wrap {
  position: relative;
  flex-shrink: 0;
}
.pl-idx {
  position: absolute;
  left: -8rpx;
  top: -8rpx;
  width: 40rpx;
  height: 40rpx;
  background: var(--brand);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  z-index: 10;
}
.pl-img {
  width: 128rpx;
  height: 128rpx;
  border-radius: 16rpx;
}
.pl-explaining {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--brand);
  color: #fff;
  font-size: 16rpx;
  text-align: center;
  padding: 2rpx 0;
  border-radius: 0 0 16rpx 16rpx;
}
.pl-info {
  flex: 1;
  min-width: 0;
}
.pl-name {
  color: #fff;
  font-size: 28rpx;
  line-height: 1.4;
  display: block;
}
.pl-price-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 8rpx;
}
.pl-price {
  color: var(--brand);
  font-weight: 700;
  font-size: 30rpx;
}
.pl-origin {
  color: rgba(255, 255, 255, 0.4);
  font-size: 22rpx;
  text-decoration: line-through;
}
.pl-sold {
  color: rgba(255, 255, 255, 0.5);
  font-size: 22rpx;
  margin-top: 4rpx;
  display: block;
}
.pl-buy {
  background: var(--brand);
  color: #fff;
  font-size: 22rpx;
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  font-weight: 500;
  flex-shrink: 0;
}
</style>
