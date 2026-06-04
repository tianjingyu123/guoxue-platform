<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ‹
        </text>
        <text class="top-title">
          {{ activity?.title || '活动详情' }}
        </text>
        <text
          class="share-btn"
          @click="handleShare"
        >
          📤
        </text>
      </view>
    </view>

    <!-- Banner -->
    <view
      v-if="activity?.bannerUrl"
      class="banner-wrap"
    >
      <image
        :src="activity.bannerUrl"
        mode="aspectFill"
        class="banner-img"
      />
      <view class="banner-overlay" />
      <view class="banner-text">
        <text class="banner-title">
          {{ activity.title }}
        </text>
        <text
          v-if="activity.subtitle"
          class="banner-sub"
        >
          {{ activity.subtitle }}
        </text>
      </view>
    </view>

    <!-- 倒计时 -->
    <view
      v-if="countdown"
      class="countdown-bar"
    >
      <view class="cd-left">
        <text class="cd-icon">
          🕐
        </text>
        <text class="cd-label">
          {{ activity?.status === 'upcoming' ? '距开始' : '距结束' }}
        </text>
      </view>
      <view
        v-if="!countdown.isEnded"
        class="cd-right"
      >
        <text class="cd-box">
          {{ countdown.hours }}
        </text>
        <text class="cd-colon">
          :
        </text>
        <text class="cd-box">
          {{ countdown.minutes }}
        </text>
        <text class="cd-colon">
          :
        </text>
        <text class="cd-box">
          {{ countdown.seconds }}
        </text>
      </view>
      <text
        v-else
        class="cd-ended"
      >
        {{ activity?.status === 'upcoming' ? '即将开始' : '已结束' }}
      </text>
    </view>

    <!-- 活动商品 -->
    <view
      v-if="activity"
      class="section"
    >
      <view
        v-if="activity.type === 'flash_sale'"
        class="section-header"
      >
        <text class="section-icon">
          ⚡
        </text>
        <text class="section-title">
          限时秒杀
        </text>
      </view>
      <view
        v-else-if="activity.type === 'group_buy'"
        class="section-header"
      >
        <text class="section-icon">
          👥
        </text>
        <text class="section-title">
          拼团购
        </text>
      </view>
      <view
        v-else-if="activity.type === 'promotion'"
        class="section-header"
      >
        <text class="section-icon">
          🎁
        </text>
        <text class="section-title">
          促销商品
        </text>
      </view>

      <!-- Flash Sale Items -->
      <view
        v-if="activity.type === 'flash_sale' && activity.items"
        class="item-list"
      >
        <view
          v-for="item in activity.items"
          :key="item.id"
          class="item-card"
        >
          <view class="item-row">
            <image
              :src="item.cover"
              mode="aspectFill"
              class="item-cover"
            />
            <view class="item-info">
              <text class="item-title">
                {{ item.title }}
              </text>
              <view class="price-row">
                <text class="sale-price">
                  ¥{{ item.salePrice }}
                </text>
                <text class="orig-price">
                  ¥{{ item.originalPrice }}
                </text>
              </view>
              <view class="progress-row">
                <text class="progress-text">
                  已抢 {{ calcProgress(item) }}%
                </text>
                <text class="limit-text">
                  限购 {{ item.limitPerUser }} 件
                </text>
              </view>
              <view class="progress-bar">
                <view
                  class="progress-fill"
                  :style="{ width: calcProgress(item) + '%' }"
                />
              </view>
            </view>
          </view>
          <view class="item-action">
            <view
              class="buy-btn"
              :class="{ disabled: item.status !== 'ongoing' }"
              @click="buyFlash(item)"
            >
              <text>{{ buyingId === item.id ? '抢购中...' : item.status === 'sold_out' ? '已抢光' : '立即抢购' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Group Buy Items -->
      <view
        v-if="activity.type === 'group_buy' && activity.items"
        class="item-list"
      >
        <view
          v-for="item in activity.items"
          :key="item.id"
          class="item-card"
        >
          <view class="item-row">
            <image
              :src="item.cover"
              mode="aspectFill"
              class="item-cover"
            />
            <view class="item-info">
              <text class="item-title">
                {{ item.title }}
              </text>
              <view class="price-row">
                <text class="sale-price">
                  ¥{{ item.groupPrice }}
                </text>
                <text class="orig-price">
                  ¥{{ item.originalPrice }}
                </text>
              </view>
              <text class="group-meta">
                {{ item.groupSize }}人团 · 已拼{{ item.completedGroups }}件
              </text>
            </view>
          </view>
          <view
            v-if="item.ongoingGroups?.length"
            class="ongoing-groups"
          >
            <text class="og-title">
              正在拼团：
            </text>
            <view
              v-for="g in item.ongoingGroups.slice(0, 2)"
              :key="g.id"
              class="og-item"
            >
              <image
                :src="g.leaderAvatar"
                mode="aspectFill"
                class="og-avatar"
              />
              <text class="og-name">
                {{ g.leaderName }}
              </text>
              <text class="og-remain">
                还差{{ item.groupSize - g.currentSize }}人
              </text>
              <text
                class="og-join"
                @click="joinGroupBuy(g.id)"
              >
                去拼团
              </text>
            </view>
          </view>
          <view class="item-action">
            <view
              class="buy-btn primary"
              @click="createGroupBuy(item.id)"
            >
              <text>{{ buyingId === item.id ? '开团中...' : '我要开团' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Promotion Items -->
      <view
        v-if="activity.type === 'promotion' && activity.items"
        class="promo-grid"
      >
        <view
          v-for="item in activity.items"
          :key="item.id"
          class="promo-card"
          @click="goProduct(item)"
        >
          <image
            :src="item.cover"
            mode="aspectFill"
            class="promo-cover"
          />
          <view class="promo-badge">
            {{ item.discountLabel }}
          </view>
          <view class="promo-info">
            <text class="promo-title">
              {{ item.title }}
            </text>
            <view class="promo-price-row">
              <text class="promo-price">
                ¥{{ item.promotionPrice }}
              </text>
              <text class="promo-orig">
                ¥{{ item.originalPrice }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 活动规则 -->
    <view
      v-if="activity?.rules?.length"
      class="rules-section"
    >
      <view
        class="rules-header"
        @click="showRules = !showRules"
      >
        <text class="rules-title">
          活动规则
        </text>
        <text class="rules-arrow">
          {{ showRules ? '▲' : '▼' }}
        </text>
      </view>
      <view
        v-if="showRules"
        class="rules-body"
      >
        <text
          v-for="(r, i) in activity.rules"
          :key="i"
          class="rule-item"
        >
          {{ i + 1 }}. {{ r }}
        </text>
      </view>
    </view>

    <!-- Loading -->
    <view
      v-if="loading"
      class="loading-wrap"
    >
      <text class="loading-text">
        加载中...
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { marketingApi, shopApi } from '../../api'

interface ActivityItem {
  id: number
  title: string
  cover: string
  salePrice?: number
  originalPrice?: number
  groupPrice?: number
  limitPerUser?: number
  status?: string
  soldCount?: number
  totalStock?: number
  completedGroups?: number
  groupSize?: number
  ongoingGroups?: Array<{ id: number; leaderName: string; leaderAvatar: string; currentSize: number }>
  promotionPrice?: number
  discountLabel?: string
  productId?: number
  tags?: string[]
}

interface ActivityDetail {
  title: string
  subtitle?: string
  bannerUrl?: string
  type: string
  status: string
  startTime: string
  endTime: string
  items?: ActivityItem[]
  rules?: string[]
  shareTitle?: string
}

const loading = ref(true)
const activity = ref<ActivityDetail | null>(null)
const buyingId = ref<number | null>(null)
const showRules = ref(false)
const countdown = ref<{ hours: string; minutes: string; seconds: string; isEnded: boolean } | null>(null)
let countdownTimer: number | null = null

onMounted(() => {
  loadActivity()
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

async function loadActivity() {
  loading.value = true
  try {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as any
    const route = page?.$page?.options?.route || page?.options?.route || 'flash-sale'
    const res = await marketingApi.pageByRoute(route)
    if (res) {
      activity.value = res as any || res.data
      startCountdown()
    }
  } catch { /* ignore */ }
  loading.value = false
}

function startCountdown() {
  if (!activity.value) return
  const target = activity.value.status === 'upcoming' ? activity.value.startTime : activity.value.endTime
  if (!target) return
  const update = () => {
    const diff = new Date(target).getTime() - Date.now()
    if (diff <= 0) {
      countdown.value = { hours: '00', minutes: '00', seconds: '00', isEnded: true }
      if (countdownTimer) clearInterval(countdownTimer)
      return
    }
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    countdown.value = {
      hours: String(h).padStart(2, '0'),
      minutes: String(m).padStart(2, '0'),
      seconds: String(s).padStart(2, '0'),
      isEnded: false,
    }
  }
  update()
  countdownTimer = setInterval(update, 1000) as any
}

function calcProgress(item: any): number {
  if (!item.totalStock) return 0
  return Math.round((item.soldCount / item.totalStock) * 100)
}

async function buyFlash(item: ActivityItem) {
  if (item.status !== 'ongoing') return
  buyingId.value = item.id
  try {
    const res = await marketingApi.flashSaleDetail(String(item.id))
    if (res) {
      uni.showToast({ title: '抢购成功' })
    }
  } catch { uni.showToast({ title: '抢购失败', icon: 'none' }) }
  buyingId.value = null
}

async function createGroupBuy(itemId: number) {
  buyingId.value = itemId
  try {
    const res = await marketingApi.createGroupBuy ? await marketingApi.createGroupBuy(itemId) : null
    if (res) {
      uni.showToast({ title: '开团成功' })
    }
  } catch { uni.showToast({ title: '开团失败', icon: 'none' }) }
  buyingId.value = null
}

async function joinGroupBuy(groupId: number) {
  buyingId.value = groupId
  try {
    const res = await marketingApi.joinGroupBuy ? await marketingApi.joinGroupBuy(groupId) : null
    if (res) {
      uni.showToast({ title: '参团成功' })
    }
  } catch { uni.showToast({ title: '参团失败', icon: 'none' }) }
  buyingId.value = null
}

function goProduct(item: ActivityItem) {
  uni.navigateTo({ url: `/pages/shop/product-detail?id=${item.productId || item.id}` })
}

function handleShare() {
  uni.showShareMenu({ withShareTicket: true })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 40rpx; }
.top-bar { position: sticky; top: 0; z-index: 50; background: rgba(245, 240, 232, 0.95); backdrop-filter: blur(10px); border-bottom: 1rpx solid #E5E1DB; }
.top-bar-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.back-btn { font-size: 40rpx; color: #2C2C2C; font-weight: bold; width: 60rpx; }
.top-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.share-btn { font-size: 36rpx; width: 60rpx; text-align: right; }

.banner-wrap { position: relative; width: 100%; height: 360rpx; overflow: hidden; }
.banner-img { width: 100%; height: 100%; }
.banner-overlay { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.6), transparent); }
.banner-text { position: absolute; bottom: 24rpx; left: 24rpx; right: 24rpx; }
.banner-title { font-size: 36rpx; font-weight: bold; color: #fff; display: block; }
.banner-sub { font-size: 24rpx; color: rgba(255,255,255,0.8); margin-top: 8rpx; display: block; }

.countdown-bar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: #fef0f0; }
.cd-left { display: flex; align-items: center; gap: 8rpx; }
.cd-icon { font-size: 28rpx; }
.cd-label { font-size: 24rpx; color: #666; }
.cd-right { display: flex; align-items: center; gap: 6rpx; }
.cd-box { background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: bold; padding: 4rpx 12rpx; border-radius: 6rpx; min-width: 48rpx; text-align: center; }
.cd-colon { font-size: 24rpx; color: #C41E3A; font-weight: bold; }
.cd-ended { font-size: 24rpx; color: #999; }

.section { margin: 16rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.section-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 20rpx; }
.section-icon { font-size: 32rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }

.item-list { display: flex; flex-direction: column; gap: 16rpx; }
.item-card { border: 1rpx solid #E5E1DB; border-radius: 12rpx; padding: 16rpx; }
.item-row { display: flex; gap: 16rpx; }
.item-cover { width: 160rpx; height: 160rpx; border-radius: 12rpx; flex-shrink: 0; }
.item-info { flex: 1; min-width: 0; }
.item-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.price-row { display: flex; align-items: baseline; gap: 12rpx; margin-top: 8rpx; }
.sale-price { font-size: 32rpx; font-weight: bold; color: #C41E3A; }
.orig-price { font-size: 22rpx; color: #999; text-decoration: line-through; }
.progress-row { display: flex; justify-content: space-between; margin-top: 10rpx; }
.progress-text, .limit-text { font-size: 20rpx; color: #999; }
.progress-bar { height: 12rpx; background: #f0f0f0; border-radius: 6rpx; margin-top: 6rpx; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #e8505a); border-radius: 6rpx; }
.group-meta { font-size: 22rpx; color: #999; margin-top: 6rpx; display: block; }
.item-action { margin-top: 12rpx; display: flex; justify-content: flex-end; }
.buy-btn { background: #C41E3A; color: #fff; padding: 10rpx 36rpx; border-radius: 28rpx; font-size: 24rpx; }
.buy-btn.disabled { background: #ccc; }
.buy-btn.primary { width: 100%; text-align: center; }

.ongoing-groups { border-top: 1rpx solid #E5E1DB; padding-top: 12rpx; margin-top: 12rpx; }
.og-title { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.og-item { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.og-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; }
.og-name { font-size: 24rpx; color: #2C2C2C; flex: 1; }
.og-remain { font-size: 22rpx; color: #999; }
.og-join { font-size: 22rpx; color: #C41E3A; padding: 4rpx 16rpx; border: 1rpx solid #C41E3A; border-radius: 20rpx; }

.promo-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.promo-card { width: calc(50% - 8rpx); border: 1rpx solid #E5E1DB; border-radius: 12rpx; overflow: hidden; }
.promo-cover { width: 100%; height: 240rpx; }
.promo-badge { position: absolute; top: 8rpx; left: 8rpx; background: #C41E3A; color: #fff; font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 16rpx; }
.promo-info { padding: 12rpx; }
.promo-title { font-size: 24rpx; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.promo-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 4rpx; }
.promo-price { font-size: 28rpx; font-weight: bold; color: #C41E3A; }
.promo-orig { font-size: 20rpx; color: #999; text-decoration: line-through; }

.rules-section { margin: 0 24rpx; background: #fff; border-radius: 16rpx; overflow: hidden; }
.rules-header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fafafa; }
.rules-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.rules-arrow { font-size: 24rpx; color: #999; }
.rules-body { padding: 16rpx 24rpx; }
.rule-item { display: block; font-size: 24rpx; color: #666; line-height: 1.8; }

.loading-wrap { display: flex; align-items: center; justify-content: center; padding: 100rpx 0; }
.loading-text { font-size: 28rpx; color: #999; }
</style>
