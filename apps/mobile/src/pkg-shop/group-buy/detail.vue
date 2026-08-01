<template>
  <view class="gbd-page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="nav-btn" hover-class="nav-hover" @tap="goBack">
        <app-icon name="chevron-left" :size="36" color="#fff" />
      </view>
      <text class="nav-title">拼团详情</text>
      <view class="nav-btn" hover-class="nav-hover">
        <app-icon name="share-2" :size="32" color="#fff" />
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="state-box">
      <AppLoading />
    </view>
    <!-- 加载失败 -->
    <view v-else-if="error" class="state-box">
      <view class="state-icon">
        <app-icon name="alert-circle" :size="72" color="#b8ab94" />
      </view>
      <text class="state-text">{{ error }}</text>
      <view class="state-retry" @tap="retryLoad">
        <text class="state-retry-text">重试</text>
      </view>
    </view>
    <template v-else-if="detail">
      <!-- 商品信息 -->
      <view class="product-card">
        <view class="pc-main">
          <image lazy-load class="pc-cover" :src="detail.cover" mode="aspectFill" />
          <view class="pc-info">
            <text class="pc-title">{{ detail.title }}</text>
            <text class="pc-desc">{{ detail.description }}</text>
            <view class="pc-price">
              <text class="price-now">¥{{ formatPrice(detail.price) }}</text>
              <text class="price-old">¥{{ formatPrice(detail.originalPrice) }}</text>
              <text class="save-tag">省¥{{ savedAmount }}</text>
            </view>
          </view>
        </view>
        <view class="pc-meta">
          <view class="meta-item">
            <app-icon name="users" :size="28" color="#ff6b35" />
            <text class="meta-text">{{ detail.minMembers }}人成团</text>
          </view>
          <view v-if="validityText" class="meta-item">
            <app-icon name="clock" :size="28" color="#ff6b35" />
            <text class="meta-text">{{ validityText }}</text>
          </view>
        </view>
      </view>

      <!-- 正在拼团 -->
      <view class="section">
      <view class="section-head">
        <text class="section-title">正在拼团</text>
        <text class="section-count">{{ groups.length }}个团进行中</text>
      </view>
      <view class="groups">
        <view v-for="g in groups" :key="g.id" class="group">
          <view class="g-owner">
            <image lazy-load class="g-owner-avatar" :src="g.owner.avatar" mode="aspectFill" />
            <view class="g-crown">
              <app-icon name="crown" :size="20" color="#fff" />
            </view>
          </view>
          <view class="g-members">
            <image lazy-load
              v-for="(m, i) in g.members"
              :key="i"
              class="g-member-avatar"
              :src="m.avatar"
              mode="aspectFill"
            />
            <view
              v-for="n in (g.minMembers - g.currentMembers)"
              :key="'ge' + n"
              class="g-member-empty"
            >
              <text class="g-q">?</text>
            </view>
          </view>
          <view class="g-info">
            <text class="g-remain">还差<text class="g-remain-num">{{ g.minMembers - g.currentMembers }}</text>人成团</text>
            <view class="g-cd">
              <app-icon name="clock" :size="20" color="#999" />
              <text class="g-cd-text">{{ cdText(g.id) }}</text>
            </view>
          </view>
          <view class="g-btn" hover-class="btn-hover" @tap="join(g.id)">
            <text class="g-btn-text">{{ joiningId === g.id ? '加入中...' : '去参团' }}</text>
          </view>
        </view>
      </view>
      <view v-if="!groups.length" class="g-empty">
        <app-icon name="users" :size="64" color="#d4c5a9" />
        <text class="g-empty-text">暂无进行中的拼团</text>
        <text class="g-empty-sub">快来开启第一个拼团吧</text>
      </view>
    </view>

    <!-- 拼团规则 -->
    <view class="section">
      <text class="section-title">拼团规则</text>
      <view class="rules">
        <view v-for="(r, i) in detail.rules" :key="i" class="rule">
          <app-icon name="check" :size="26" color="#ff6b35" />
          <text class="rule-text">{{ r }}</text>
        </view>
      </view>
    </view>

      <!-- 底部开新团 -->
      <view class="footer">
        <view class="footer-btn" hover-class="btn-hover" @tap="create">
          <app-icon name="plus" :size="28" color="#fff" />
          <text class="footer-btn-text">¥{{ formatPrice(detail.price) }} 开新团</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, navigateTo, redirectTo } from '@/utils/router'
import AppLoading from '@/components/common/app-loading.vue'
import { shopApi, formatCountdown } from '@/lib/shop-data'
import { formatPrice } from '@/utils/format'

interface GroupBuyDetailData {
  id: string
  cover: string
  minMembers: number
  title: string
  description: string
  price: number
  originalPrice: number
  rules: string[]
  expireMinutes?: number
}
interface ActiveGroup {
  id: string
  owner: { avatar: string }
  members: { avatar: string }[]
  minMembers: number
  currentMembers: number
  endOffsetMs: number
}

const detail = ref<GroupBuyDetailData | null>(null)
/** 节省金额：两位小数取整，避免浮点误差 */
const savedAmount = computed(() => Math.max(0, Math.round(((detail.value?.originalPrice || 0) - (detail.value?.price || 0)) * 100) / 100))
/** 有效期展示：用真实 expireMinutes 换算（整点→X小时，否则X分钟）；后端未配(0)则不显固定"24小时" */
const validityText = computed(() => {
  const min = detail.value?.expireMinutes || 0
  if (min <= 0) return ''
  return min % 60 === 0 ? `${min / 60}小时有效` : `${min}分钟有效`
})
const groups = ref<ActiveGroup[]>([])
const loading = ref(true)
const error = ref('')
const joiningId = ref<string | null>(null)

const endMap: Record<string, number> = {}
const tick = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

let pageId = ''
onLoad((q) => {
  if (q && q.id) pageId = String(q.id)
})
onMounted(async () => {
  try {
    const res = await shopApi.getGroupBuyDetail(pageId || 'default')
    detail.value = res.detail
    groups.value = res.activeGroups
    groups.value.forEach((g) => {
      endMap[g.id] = Date.now() + g.endOffsetMs
    })
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
  timer = setInterval(() => (tick.value += 1), 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function cdText(id: string): string {
  void tick.value
  const c = formatCountdown((endMap[id] ?? Date.now()) - Date.now())
  return `${c.h}:${c.m}:${c.s}`
}
/** 参团（加入已有团）：调 join 创建拼团订单 → 跳支付 */
async function join(groupId: string) {
  if (joiningId.value) return
  joiningId.value = groupId
  try {
    const res = await shopApi.joinGroupBuy(pageId, groupId)
    redirectTo(`/shop/paying?orderId=${res.orderId}&method=wechat&amount=${res.amount}`)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '参团失败', icon: 'none' })
    joiningId.value = null
  }
}
/** 开新团：调 join（不传 groupId）创建拼团订单 → 跳支付 */
async function create() {
  if (joiningId.value) return
  joiningId.value = 'new'
  try {
    const res = await shopApi.joinGroupBuy(pageId)
    redirectTo(`/shop/paying?orderId=${res.orderId}&method=wechat&amount=${res.amount}`)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '开团失败', icon: 'none' })
    joiningId.value = null
  }
}
async function retryLoad() {
  loading.value = true
  error.value = ''
  try {
    const res = await shopApi.getGroupBuyDetail(pageId || 'default')
    detail.value = res.detail
    groups.value = res.activeGroups
    Object.keys(endMap).forEach((k) => delete endMap[k])
    groups.value.forEach((g) => {
      endMap[g.id] = Date.now() + g.endOffsetMs
    })
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.gbd-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 140rpx;
}
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  padding-top: var(--status-bar-height, 0px);
  background: linear-gradient(90deg, #ff6b35, var(--brand));
}
.nav-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-hover {
  opacity: 0.6;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #fff;
}

.product-card {
  margin: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.pc-main {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
}
.pc-cover {
  width: 224rpx;
  height: 224rpx;
  border-radius: 16rpx;
  background: #f0ece2;
}
.pc-info {
  flex: 1;
  min-width: 0;
}
.pc-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2c2c;
  line-height: 1.4;
  display: block;
}
.pc-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  line-height: 1.5;
  display: block;
}
.pc-price {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 24rpx;
}
.price-now {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--brand);
}
.price-old {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
}
.save-tag {
  padding: 2rpx 12rpx;
  background: #fff0ed;
  color: var(--brand);
  font-size: 20rpx;
  border-radius: 8rpx;
}
.pc-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: linear-gradient(90deg, #fff5f0, #fff0ed);
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.meta-text {
  font-size: 26rpx;
  color: #666;
}

.section {
  margin: 0 24rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.section-count {
  font-size: 24rpx;
  color: #999;
}
.groups {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.group {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.g-owner {
  position: relative;
  flex-shrink: 0;
}
.g-owner-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  border: 4rpx solid #ff6b35;
  background: #f0ece2;
}
.g-crown {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #ff6b35;
  display: flex;
  align-items: center;
  justify-content: center;
}
.g-members {
  display: flex;
}
.g-member-avatar,
.g-member-empty {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  margin-left: -16rpx;
}
.g-member-avatar {
  background: #f0ece2;
}
.g-member-empty {
  border-style: dashed;
  border-color: #e8e3db;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.g-q {
  font-size: 32rpx;
  color: #ccc;
}
.g-info {
  flex: 1;
  text-align: right;
}
.g-remain {
  font-size: 26rpx;
  color: #666;
}
.g-remain-num {
  color: var(--brand);
  font-weight: 700;
  margin: 0 6rpx;
}
.g-cd {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4rpx;
  margin-top: 6rpx;
}
.g-cd-text {
  font-size: 22rpx;
  color: #999;
  font-variant-numeric: tabular-nums;
}
.g-btn {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  background: linear-gradient(90deg, #ff6b35, var(--brand));
  border-radius: 999rpx;
}
.g-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
}
.btn-hover {
  opacity: 0.85;
}
.g-empty {
  padding: 48rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.g-empty-text {
  font-size: 26rpx;
  color: #999;
}
.g-empty-sub {
  font-size: 22rpx;
  color: #ccc;
}

.rules {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 24rpx;
}
.rule {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
}
.rule-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #efe8da;
}
.footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx 0;
  background: linear-gradient(90deg, #ff6b35, var(--brand));
  border-radius: 999rpx;
}
.footer-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}

/* 三态UI */
.state-box {
  padding: 96rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.state-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #f0ece2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.state-text {
  font-size: 26rpx;
  color: #b8ab94;
}
.state-retry {
  padding: 12rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.state-retry-text {
  font-size: 26rpx;
  color: #fff;
}
</style>
