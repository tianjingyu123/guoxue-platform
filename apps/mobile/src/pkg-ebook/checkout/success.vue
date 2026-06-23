<template>
  <view class="page">
    <!-- 加载态 -->
    <view v-if="loading" class="hero">
      <text class="hero-title">加载中...</text>
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="hero">
      <text class="hero-title">{{ error }}</text>
      <view class="hero-actions">
        <view class="btn-primary" @tap="fetchData(order?.orderNo || '1')">
          <text class="btn-primary-tx">重试</text>
        </view>
      </view>
    </view>
    <!-- 正常内容 -->
    <template v-else>
    <!-- 成功 Hero -->
    <view class="hero">
      <view class="check-circle">
        <AppIcon name="check-circle" :size="80" :color="C.primary" />
      </view>
      <text class="hero-title">支付成功！</text>
      <text class="hero-sub">《{{ order.successBookTitle }}》已添加到你的书架</text>
      <view class="hero-actions">
        <view class="btn-primary" @tap="goReader">
          <AppIcon name="book-open" :size="32" color="#ffffff" />
          <text class="btn-primary-tx">立即阅读</text>
        </view>
        <view class="btn-outline" @tap="goShelf">
          <text class="btn-outline-tx">去书架</text>
        </view>
      </view>
    </view>

    <!-- 订单详情 -->
    <view class="section">
      <view class="order-card">
        <view class="order-row">
          <text class="order-label">订单号</text>
          <text class="order-val mono">{{ order.orderNo }}</text>
        </view>
        <view class="order-row">
          <text class="order-label">支付方式</text>
          <text class="order-val">{{ order.payLabel }}</text>
        </view>
        <view class="order-row">
          <text class="order-label">实付金额</text>
          <text class="order-val price">¥{{ order.amount }}</text>
        </view>
        <view class="order-row">
          <text class="order-label">购买时间</text>
          <text class="order-val">{{ order.payTime }}</text>
        </view>
      </view>
    </view>

    <!-- 相关推荐 -->
    <view class="section">
      <view class="rec-hd">
        <text class="rec-title">买了此书的人还买了</text>
        <view class="rec-more" @tap="goStore">
          <text class="rec-more-tx">更多</text>
          <AppIcon name="chevron-right" :size="32" :color="C.primary" />
        </view>
      </view>
      <scroll-view scroll-x class="rec-scroll">
        <view class="rec-list">
          <view v-for="rb in related" :key="rb.id" class="rec-item" @tap="goDetail(rb.id)">
            <view class="rec-cover" :style="{ background: rb.coverColor }">
              <view class="cover-spine" />
              <view class="cover-text-wrap"><text class="cover-text">{{ rb.title }}</text></view>
            </view>
            <text class="rec-name">{{ rb.title }}</text>
            <text class="rec-price">¥{{ rb.price }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    </template><!-- v-else end -->
  </view>

  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { ebookApi, EBOOK_COVER, type EbookRelated } from '@/lib/ebook-data'

const C = { primary: '#2563eb' }
const loading = ref(true)
const error = ref('')
const order = ref<any>({})
const related = ref<EbookRelated[]>([])

async function fetchData(id: string) {
  loading.value = true
  error.value = ''
  try {
    const [orderData, storeData] = await Promise.all([
      ebookApi.orderInfo(id),
      ebookApi.store(),
    ])
    order.value = orderData
    // 取 store 前3本作为相关推荐
    related.value = (storeData || []).slice(0, 3).map((b: any) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      price: b.price,
      coverColor: (EBOOK_COVER as any)[b.color]?.from || '#3b6fd4',
    }))
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((q: any = {}) => { fetchData(q?.id || '1') })

function goReader() {
  uni.redirectTo({ url: '/pkg-ebook/reader/index?id=1' })
}
function goShelf() {
  uni.redirectTo({ url: '/pkg-ebook/bookshelf/index' })
}
function goStore() {
  uni.navigateTo({ url: '/pkg-ebook/store/index' })
}
function goDetail(id: string) {
  uni.redirectTo({ url: `/pkg-ebook/detail/index?id=${id}` })
}
</script>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: var(--ebook-bg);
}
.hero {
  width: 100%;
  background: #fff;
  padding: 128rpx 64rpx 80rpx;
  text-align: center;
  border-bottom: 2rpx solid var(--ebook-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}
.check-circle {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.hero-title {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--ebook-text);
}
.hero-sub {
  font-size: 28rpx;
  color: var(--ebook-text-soft);
  margin-top: 16rpx;
}
.hero-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 48rpx;
}
.btn-primary {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 48rpx;
  background: var(--ebook-primary);
  border-radius: 16rpx;
}
.btn-primary-tx {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
.btn-outline {
  padding: 20rpx 48rpx;
  border: 2rpx solid var(--ebook-border);
  border-radius: 16rpx;
}
.btn-outline-tx {
  font-size: 28rpx;
  color: var(--ebook-text-soft);
}
.section {
  width: 100%;
  padding: 40rpx 32rpx 0;
  box-sizing: border-box;
}
.order-card {
  background: #fff;
  border-radius: 24rpx;
  border: 2rpx solid var(--ebook-border);
  overflow: hidden;
}
.order-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-top: 2rpx solid var(--ebook-border);
}
.order-row:first-child {
  border-top: none;
}
.order-label {
  font-size: 28rpx;
  color: var(--ebook-text-soft);
}
.order-val {
  font-size: 28rpx;
  color: var(--ebook-text);
}
.order-val.mono {
  font-size: 24rpx;
  font-family: monospace;
}
.order-val.price {
  font-weight: 700;
  color: var(--ebook-price);
}
.rec-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.rec-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--ebook-text);
}
.rec-more {
  display: flex;
  align-items: center;
  gap: 2rpx;
}
.rec-more-tx {
  font-size: 28rpx;
  color: var(--ebook-primary);
}
.rec-scroll {
  width: 100%;
  white-space: nowrap;
}
.rec-list {
  display: flex;
  gap: 24rpx;
  padding-bottom: 64rpx;
}
.rec-item {
  width: 192rpx;
  flex-shrink: 0;
}
.rec-cover {
  width: 100%;
  height: 288rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
  margin-bottom: 16rpx;
  position: relative;
  overflow: hidden;
}
.cover-spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
  background: rgba(255, 255, 255, 0.1);
}
.cover-text-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
}
.cover-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 20rpx;
  font-weight: 500;
  text-align: center;
  line-height: 1.4;
  white-space: normal;
}
.rec-name {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: var(--ebook-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rec-price {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--ebook-price);
}
</style>
