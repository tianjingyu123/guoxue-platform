<template>
  <view class="cart-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">购物车({{ totalCount }})</text>
        <text class="header-edit" @click="isEditing = !isEditing">{{ isEditing ? '完成' : '编辑' }}</text>
      </view>
    </view>

    <view v-if="loading" class="load-area">
      <LoadingSkeleton v-for="i in 2" :key="i" type="card" />
    </view>

    <view v-else-if="empty" class="empty-wrap">
      <view class="empty-icon">🛒</view>
      <text class="empty-title">购物车是空的</text>
      <text class="empty-desc">快去挑选心仪的商品吧</text>
      <view class="empty-btn" @click="goPage('/pages/discover/index')">去逛逛</view>
      <view class="recommend-section">
        <view class="section-head">
          <text class="section-title">热门推荐</text>
          <text class="section-more" @click="goPage('/pages/mall/index')">更多</text>
        </view>
        <view class="recommend-grid">
          <view v-for="p in recommendProducts" :key="p.id" class="recommend-card">
            <view class="recommend-img">🛍</view>
            <text class="recommend-name">{{ p.name }}</text>
            <text class="recommend-price">¥{{ p.price }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="cart-body">
      <view v-if="saved > 0 && !isEditing" class="save-tip">
        <text class="save-text">已为您节省 ¥{{ saved }}</text>
        <text class="save-link">领更多优惠券 ›</text>
      </view>

      <view v-for="group in groups" :key="group.id" class="shop-card">
        <view class="shop-header">
          <view class="shop-info">
            <view class="shop-avatar">{{ group.sellerName[0] }}</view>
            <text class="shop-name">{{ group.sellerName }}</text>
            <text class="shop-tag">{{ group.sellerType === 'circle' ? '圈子' : '驿站' }}</text>
          </view>
          <text class="shop-arrow">›</text>
        </view>

        <view v-for="item in group.items" :key="item.id" class="cart-item">
          <view class="item-left">
            <text v-if="isEditing" class="item-del" @click="removeItem(group.id, item.id)">🗑</text>
            <view v-else class="item-check" :class="{ on: sel.has(item.id) }" @click="toggleSel(item.id)">
              <text v-if="sel.has(item.id)" class="check-mark">✓</text>
            </view>
          </view>
          <view class="item-img-wrap">
            <image v-if="item.image" :src="item.image" class="item-img" mode="aspectFill" />
            <text v-else class="item-img-fb">📦</text>
          </view>
          <view class="item-info">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-spec">{{ item.spec }}</text>
            <view class="item-bottom">
              <view class="price-row">
                <text class="price">¥{{ item.price }}</text>
                <text v-if="item.originalPrice > item.price" class="price-old">¥{{ item.originalPrice }}</text>
              </view>
              <view v-if="item.type === 'product'" class="qty-ctrl">
                <text class="qty-btn" @click="changeQty(group.id, item.id, -1)">−</text>
                <text class="qty-num">{{ item.quantity }}</text>
                <text class="qty-btn" @click="changeQty(group.id, item.id, 1)">+</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="groupFreeDiff(group) > 0 && groupSelTotal(group) > 0" class="free-ship-hint">
          <text class="hint-text">再买 ¥{{ groupFreeDiff(group) }} 即可享受包邮</text>
          <text class="hint-link" @click="goPage('/pages/mall/index')">去凑单 ›</text>
        </view>

        <view class="shop-sub">
          <text class="sub-label">小计：</text>
          <text class="sub-val">¥{{ groupSelTotal(group) }}</text>
        </view>
      </view>

      <view v-if="invalidItems.length" class="invalid-card">
        <view class="invalid-head">
          <text class="invalid-title">失效商品({{ invalidItems.length }})</text>
          <text class="invalid-clear" @click="invalidItems = []">清空</text>
        </view>
        <view v-for="it in invalidItems" :key="it.id" class="invalid-item">
          <view class="invalid-img-wrap">
            <image v-if="it.image" :src="it.image" class="invalid-img" mode="aspectFill" />
            <view class="invalid-overlay"><text class="invalid-tag">失效</text></view>
          </view>
          <view class="invalid-info">
            <text class="invalid-name">{{ it.name }}</text>
            <text class="invalid-reason">{{ it.reason }}</text>
            <text class="invalid-price">¥{{ it.price }}</text>
          </view>
        </view>
      </view>

      <view class="recommend-row">
        <text class="section-title">为你推荐</text>
        <scroll-view scroll-x class="rec-scroll" :show-scrollbar="false">
          <view v-for="p in recommendProducts" :key="p.id" class="rec-chip">
            <view class="rec-img">🛍</view>
            <text class="rec-name">{{ p.name }}</text>
            <text class="rec-price">¥{{ p.price }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="!loading && !empty" class="bottom-bar">
      <view class="bottom-left" @click="toggleAll">
        <view class="dot" :class="{ on: allSelected }">
          <text v-if="allSelected" class="check-mark">✓</text>
        </view>
        <text class="all-text">全选</text>
      </view>
      <view class="bottom-right">
        <template v-if="isEditing">
          <view class="action-btn" :class="{ off: sel.size === 0 }" @click="batchRemove">
            <text>删除({{ sel.size }})</text>
          </view>
        </template>
        <template v-else>
          <view class="total-block">
            <view class="total-line">
              <text class="total-label">合计:</text>
              <text class="total-num">¥{{ totalPrice }}</text>
            </view>
            <text v-if="saved > 0" class="total-old">¥{{ originalPrice }}</text>
          </view>
          <view class="action-btn" :class="{ off: sel.size === 0 }" @click="goCheckout">
            <text>结算({{ totalCount }})</text>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'

interface CartItem {
  id: number; name: string; spec: string; price: number
  originalPrice: number; quantity: number; image: string; type: string
}

const loading = ref(true)
const empty = ref(false)
const isEditing = ref(false)

const groups = reactive([
  {
    id: 1, sellerName: '易道书院', sellerType: 'circle', freeShippingThreshold: 199,
    items: [
      { id: 1, name: '《渊海子平》精装典藏版', spec: '精装版 / 全三册', price: 168, originalPrice: 298, quantity: 1, image: '', type: 'product' },
      { id: 2, name: '八字命理入门到精通', spec: '视频课程 / 共36节', price: 299, originalPrice: 599, quantity: 1, image: '', type: 'course' },
    ],
  },
  {
    id: 2, sellerName: '玄学文创旗舰店', sellerType: 'store', freeShippingThreshold: 99,
    items: [
      { id: 3, name: '天然黑曜石貔貅手链', spec: '14mm / 男款', price: 128, originalPrice: 199, quantity: 2, image: '', type: 'product' },
    ],
  },
])

const invalidItems = ref([
  { id: 101, name: '限量版紫水晶摆件', spec: '已下架', price: 388, image: '', reason: '商品已下架' },
])

const recommendProducts = [
  { id: 1, name: '紫微斗数全书', price: 88 },
  { id: 2, name: '开光铜钱挂件', price: 68 },
  { id: 3, name: '风水罗盘专业版', price: 268 },
  { id: 4, name: '命理学基础课', price: 199 },
]

const sel = ref(new Set<number>())

const totalPrice = computed(() => {
  let s = 0
  groups.forEach(g => g.items.forEach(i => { if (sel.value.has(i.id)) s += i.price * i.quantity }))
  return s.toFixed(2)
})
const originalPrice = computed(() => {
  let s = 0
  groups.forEach(g => g.items.forEach(i => { if (sel.value.has(i.id)) s += i.originalPrice * i.quantity }))
  return s.toFixed(2)
})
const saved = computed(() => (Number(originalPrice.value) - Number(totalPrice.value)).toFixed(2))
const totalCount = computed(() => {
  let c = 0
  groups.forEach(g => g.items.forEach(i => { if (sel.value.has(i.id)) c += i.quantity }))
  return c
})
const allSelected = computed(() => {
  let n = 0; groups.forEach(g => n += g.items.length)
  return sel.value.size === n && n > 0
})

function groupSelTotal(g: typeof groups[0]) {
  return g.items.reduce((s, i) => sel.value.has(i.id) ? s + i.price * i.quantity : s, 0).toFixed(2)
}
function groupFreeDiff(g: typeof groups[0]) {
  return Math.max(0, (g.freeShippingThreshold || 0) - Number(groupSelTotal(g)))
}

function toggleAll() {
  if (allSelected.value) { sel.value = new Set(); return }
  const ids = new Set<number>(); groups.forEach(g => g.items.forEach(i => ids.add(i.id)))
  sel.value = ids
}
function toggleSel(id: number) {
  const n = new Set(sel.value); n.has(id) ? n.delete(id) : n.add(id); sel.value = n
}
function changeQty(gid: number, iid: number, d: number) {
  const g = groups.find(x => x.id === gid)
  const item = g?.items.find(x => x.id === iid)
  if (item) item.quantity = Math.max(1, item.quantity + d)
}
function removeItem(gid: number, iid: number) {
  const gi = groups.findIndex(x => x.id === gid)
  if (gi < 0) return
  groups[gi].items = groups[gi].items.filter(x => x.id !== iid)
  if (groups[gi].items.length === 0) { groups.splice(gi, 1); if (groups.length === 0) empty.value = true }
  const n = new Set(sel.value); n.delete(iid); sel.value = n
}
function batchRemove() {
  if (sel.value.size === 0) return
  for (let i = groups.length - 1; i >= 0; i--) {
    groups[i].items = groups[i].items.filter(x => !sel.value.has(x.id))
    if (groups[i].items.length === 0) groups.splice(i, 1)
  }
  sel.value = new Set(); isEditing.value = false
  if (groups.length === 0) empty.value = true
}
function goCheckout() { if (sel.value.size) uni.navigateTo({ url: '/pages/checkout/index' }) }
function goPage(url: string) { uni.navigateTo({ url }) }

setTimeout(() => {
  const ids = new Set<number>(); groups.forEach(g => g.items.forEach(i => ids.add(i.id)))
  sel.value = ids; loading.value = false
}, 500)
</script>

<style scoped>
.cart-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 120rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { flex: 1; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-edit { font-size: 26rpx; color: #C41E3A; font-weight: 500; }
.load-area { padding: 24rpx; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 48rpx; }
.empty-icon { font-size: 96rpx; margin-bottom: 24rpx; }
.empty-title { font-size: 32rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 8rpx; }
.empty-desc { font-size: 26rpx; color: #999; margin-bottom: 32rpx; }
.empty-btn { padding: 16rpx 48rpx; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: 500; }

.recommend-section { width: 100%; margin-top: 60rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.section-more { font-size: 24rpx; color: #C41E3A; }
.recommend-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.recommend-card { background: #fff; border-radius: 16rpx; padding: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.recommend-img { width: 100%; aspect-ratio: 1; border-radius: 12rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.recommend-name { font-size: 24rpx; color: #333; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recommend-price { font-size: 24rpx; color: #C41E3A; font-weight: 500; margin-top: 4rpx; }

.cart-body { padding: 16rpx 24rpx; }
.save-tip { margin-bottom: 16rpx; padding: 16rpx 24rpx; border-radius: 16rpx; background: rgba(196,30,58,0.08); display: flex; justify-content: space-between; align-items: center; }
.save-text { font-size: 24rpx; color: #C41E3A; }
.save-link { font-size: 24rpx; color: #C41E3A; }

.shop-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.shop-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; padding-bottom: 16rpx; border-bottom: 1px solid #F0EDE5; }
.shop-info { display: flex; align-items: center; gap: 12rpx; }
.shop-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; background: rgba(196,30,58,0.1); color: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 600; }
.shop-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.shop-tag { font-size: 20rpx; color: #999; background: #F5F1EB; padding: 2rpx 12rpx; border-radius: 8rpx; }
.shop-arrow { font-size: 36rpx; color: #999; }

.cart-item { display: flex; gap: 16rpx; padding: 16rpx 0; }
.cart-item + .cart-item { border-top: 1px solid #F5F1EB; }
.item-left { display: flex; align-items: center; flex-shrink: 0; }
.item-check { width: 40rpx; height: 40rpx; border-radius: 50%; border: 3rpx solid #CCC; display: flex; align-items: center; justify-content: center; }
.item-check.on { background: #C41E3A; border-color: #C41E3A; }
.check-mark { font-size: 24rpx; color: #fff; font-weight: 700; }
.item-del { font-size: 36rpx; }

.item-img-wrap { width: 160rpx; height: 160rpx; border-radius: 16rpx; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #F5F0E8, #EDE5D5); }
.item-img { width: 100%; height: 100%; }
.item-img-fb { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.item-name { font-size: 26rpx; font-weight: 500; color: #333; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.item-spec { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.item-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
.price-row { display: flex; align-items: baseline; gap: 8rpx; }
.price { font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.price-old { font-size: 22rpx; color: #999; text-decoration: line-through; }
.qty-ctrl { display: flex; align-items: center; background: #F5F1EB; border-radius: 32rpx; }
.qty-btn { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #666; }
.qty-num { min-width: 52rpx; text-align: center; font-size: 28rpx; font-weight: 500; color: #333; }

.free-ship-hint { margin-top: 16rpx; padding: 16rpx 20rpx; border-radius: 12rpx; background: rgba(201,169,110,0.1); display: flex; justify-content: space-between; align-items: center; }
.hint-text { font-size: 22rpx; color: #C9A96E; }
.hint-link { font-size: 22rpx; color: #C9A96E; font-weight: 500; }

.shop-sub { display: flex; justify-content: flex-end; margin-top: 16rpx; padding-top: 16rpx; border-top: 1px solid #F0EDE5; }
.sub-label { font-size: 24rpx; color: #999; }
.sub-val { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }

.invalid-card { background: rgba(255,255,255,0.6); border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; border: 2rpx dashed #E8E0D5; }
.invalid-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.invalid-title { font-size: 26rpx; color: #999; }
.invalid-clear { font-size: 24rpx; color: #C41E3A; }
.invalid-item { display: flex; gap: 16rpx; opacity: 0.6; margin-bottom: 12rpx; }
.invalid-img-wrap { width: 128rpx; height: 128rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; position: relative; background: #F5F1EB; }
.invalid-img { width: 100%; height: 100%; }
.invalid-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.invalid-tag { font-size: 20rpx; color: #fff; background: rgba(0,0,0,0.5); padding: 2rpx 12rpx; border-radius: 6rpx; }
.invalid-info { flex: 1; min-width: 0; }
.invalid-name { font-size: 26rpx; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.invalid-reason { font-size: 22rpx; color: #C41E3A; margin-top: 4rpx; }
.invalid-price { font-size: 22rpx; color: #999; text-decoration: line-through; margin-top: 4rpx; }

.recommend-row { margin-top: 8rpx; }
.rec-scroll { white-space: nowrap; margin-top: 12rpx; }
.rec-chip { display: inline-flex; flex-direction: column; width: 200rpx; background: #fff; border-radius: 16rpx; padding: 12rpx; margin-right: 12rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.rec-img { width: 100%; aspect-ratio: 1; border-radius: 12rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.rec-name { font-size: 22rpx; color: #333; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-price { font-size: 22rpx; color: #C41E3A; font-weight: 500; margin-top: 4rpx; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; display: flex; align-items: center; justify-content: space-between; padding: 12rpx 24rpx; padding-bottom: calc(12rpx + env(safe-area-inset-bottom)); }
.bottom-left { display: flex; align-items: center; gap: 12rpx; }
.dot { width: 40rpx; height: 40rpx; border-radius: 50%; border: 3rpx solid #CCC; display: flex; align-items: center; justify-content: center; }
.dot.on { background: #C41E3A; border-color: #C41E3A; }
.all-text { font-size: 26rpx; color: #2C2C2C; }
.bottom-right { display: flex; align-items: center; gap: 24rpx; }
.total-block { text-align: right; }
.total-line { display: flex; align-items: baseline; gap: 4rpx; }
.total-label { font-size: 24rpx; color: #999; }
.total-num { font-size: 36rpx; font-weight: 700; color: #C41E3A; }
.total-old { font-size: 20rpx; color: #999; text-decoration: line-through; display: block; }
.action-btn { padding: 16rpx 40rpx; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: 500; }
.action-btn.off { opacity: 0.5; background: #CCC; }
</style>
