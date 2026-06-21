<template>
  <view class="earn-page">
    <!-- 顶部导航 -->
    <view class="earn-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="earn-nav-inner">
        <view class="earn-nav-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="48" color="#1f2937" />
        </view>
        <text class="earn-nav-title">推广收益</text>
        <view class="earn-nav-btn" :class="{ spinning: refreshing }" @tap="onRefresh">
          <app-icon name="refresh-cw" :size="40" color="#4b5563" />
        </view>
      </view>
    </view>

    <view class="earn-content">
      <!-- 收益总览卡片 -->
      <view class="earn-overview">
        <view class="earn-overview-top">
          <view>
            <text class="earn-ov-label">可提现余额</text>
            <text class="earn-ov-balance">¥{{ overview.availableBalance.toFixed(2) }}</text>
          </view>
          <view class="earn-withdraw-btn" @tap="goWithdraw">
            <app-icon name="wallet" :size="32" color="#C41E3A" />
            <text class="earn-withdraw-txt">提现</text>
          </view>
        </view>
        <view class="earn-ov-stats">
          <view class="earn-ov-stat">
            <view class="earn-ov-stat-head">
              <app-icon name="snowflake" :size="24" color="rgba(255,255,255,0.7)" />
              <text class="earn-ov-stat-label">冻结中</text>
            </view>
            <text class="earn-ov-stat-val">¥{{ overview.frozenBalance.toFixed(2) }}</text>
          </view>
          <view class="earn-ov-stat">
            <view class="earn-ov-stat-head">
              <app-icon name="trending-up" :size="24" color="rgba(255,255,255,0.7)" />
              <text class="earn-ov-stat-label">累计收益</text>
            </view>
            <text class="earn-ov-stat-val">¥{{ overview.totalEarnings.toFixed(2) }}</text>
          </view>
          <view class="earn-ov-stat">
            <view class="earn-ov-stat-head">
              <app-icon name="clock" :size="24" color="rgba(255,255,255,0.7)" />
              <text class="earn-ov-stat-label">本月收益</text>
            </view>
            <text class="earn-ov-stat-val">¥{{ overview.monthEarnings.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 今日/上月对比 -->
      <view class="earn-compare">
        <view class="earn-compare-card">
          <text class="earn-compare-label">今日收益</text>
          <text class="earn-compare-val earn-red">+¥{{ overview.todayEarnings.toFixed(2) }}</text>
        </view>
        <view class="earn-compare-card">
          <text class="earn-compare-label">上月收益</text>
          <text class="earn-compare-val">¥{{ overview.lastMonthEarnings.toFixed(2) }}</text>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="earn-tabs">
        <view class="earn-tab" :class="{ active: activeTab === 'earnings' }" @tap="activeTab = 'earnings'">
          <text class="earn-tab-txt">收益明细</text>
        </view>
        <view class="earn-tab" :class="{ active: activeTab === 'withdraw' }" @tap="activeTab = 'withdraw'">
          <text class="earn-tab-txt">提现记录</text>
        </view>
      </view>

      <!-- 收益明细 -->
      <block v-if="activeTab === 'earnings'">
        <scroll-view scroll-x class="earn-filter-scroll">
          <view class="earn-filter-row">
            <view
              v-for="f in filterTypes"
              :key="f.value"
              class="earn-filter"
              :class="{ active: filterType === f.value }"
              @tap="filterType = f.value"
            >
              <text class="earn-filter-txt" :style="{ color: filterType === f.value ? '#fff' : '#4b5563' }">{{ f.label }}</text>
            </view>
          </view>
        </scroll-view>

        <view v-if="filteredEarnings.length === 0" class="earn-empty">
          <app-icon name="file-text" :size="96" color="#d1d5db" />
          <text class="earn-empty-txt">暂无收益记录</text>
        </view>
        <view v-else class="earn-list">
          <view v-for="item in filteredEarnings" :key="item.id" class="earn-item">
            <view class="earn-item-main">
              <view class="earn-item-icon" :class="statusIconClass(item.status)">
                <app-icon :name="typeIcon(item.type)" :size="32" :color="statusColor(item.status)" />
              </view>
              <view class="earn-item-info">
                <view class="earn-item-row1">
                  <text class="earn-item-title">{{ item.title }}</text>
                  <text class="earn-item-amount">+¥{{ item.amount.toFixed(2) }}</text>
                </view>
                <text class="earn-item-desc">{{ item.description }}</text>
                <view class="earn-item-row2">
                  <text class="earn-item-time">{{ item.createdAt }}</text>
                  <text class="earn-item-status" :class="statusBadgeClass(item.status)">{{ statusName(item.status) }}</text>
                </view>
              </view>
            </view>
            <view v-if="item.relatedUser" class="earn-item-user">
              <image :src="item.relatedUser.avatar" class="earn-item-avatar" mode="aspectFill" />
              <text class="earn-item-from">来自 {{ item.relatedUser.nickname }}</text>
              <text v-if="item.relatedOrder" class="earn-item-order">订单金额 ¥{{ item.relatedOrder.orderAmount }}</text>
            </view>
          </view>
        </view>
      </block>

      <!-- 提现记录 -->
      <block v-else>
        <view v-if="withdrawRecords.length === 0" class="earn-empty">
          <app-icon name="wallet" :size="96" color="#d1d5db" />
          <text class="earn-empty-txt">暂无提现记录</text>
        </view>
        <view v-else class="earn-list">
          <view v-for="r in withdrawRecords" :key="r.id" class="earn-wd-item">
            <view class="earn-wd-row1">
              <view class="earn-wd-method-wrap">
                <text class="earn-wd-method">提现到{{ r.method === 'alipay' ? '支付宝' : '银行卡' }}</text>
                <text class="earn-wd-account">{{ r.account }}</text>
              </view>
              <text class="earn-wd-status" :class="wdBadgeClass(r.status)">{{ wdStatusName(r.status) }}</text>
            </view>
            <view class="earn-wd-row2">
              <view>
                <text class="earn-wd-amount">¥{{ r.actualAmount.toFixed(2) }}</text>
                <text class="earn-wd-fee">(手续费 ¥{{ r.fee.toFixed(2) }})</text>
              </view>
              <text class="earn-wd-time">{{ r.createdAt }}</text>
            </view>
            <text v-if="r.status === 'failed' && r.failReason" class="earn-wd-fail">失败原因：{{ r.failReason }}</text>
            <text v-if="r.completedAt" class="earn-wd-completed">到账时间：{{ r.completedAt }}</text>
          </view>
        </view>
      </block>

      <!-- 底部提示 -->
      <view class="earn-tip">
        <text class="earn-tip-txt"><text class="earn-tip-bold">收益说明：</text>推广收益将在订单完成后7天内结算，结算后可申请提现。如有疑问请联系客服。</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

type'all' | 'live' | 'course' | 'shop' | 'membership' = 'course_commission' | 'product_commission' | 'member_commission' | 'team_bonus' | 'platform_reward' | 'invite_reward'
type EarnStatus = 'settled' | 'pending' | 'frozen'
type WdStatus = 'pending' | 'processing' | 'success' | 'failed'

const overview = {
  availableBalance: 3680.5,
  frozenBalance: 520.0,
  totalEarnings: 28650.0,
  todayEarnings: 168.0,
  monthEarnings: 3280.0,
  lastMonthEarnings: 4520.0,
}

const earningsList = [
  { id: 1, type: 'course_commission' as'all' | 'live' | 'course' | 'shop' | 'membership', title: '课程分销佣金', description: '用户"国学爱好者"购买了《八字命理入门》', amount: 29.9, status: 'settled' as EarnStatus, createdAt: '2026-06-03 14:30', relatedUser: { id: 101, nickname: '国学爱好者', avatar: '/static/experts/expert-1.jpg' }, relatedOrder: { orderId: 'ORD202606031430', orderAmount: 299.0 } },
  { id: 2, type: 'member_commission' as'all' | 'live' | 'course' | 'shop' | 'membership', title: '会员推广佣金', description: '用户"易学新人"开通了年度VIP', amount: 99.0, status: 'settled' as EarnStatus, createdAt: '2026-06-03 10:15', relatedUser: { id: 102, nickname: '易学新人', avatar: '/static/experts/expert-2.jpg' }, relatedOrder: { orderId: 'ORD202606031015', orderAmount: 998.0 } },
  { id: 3, type: 'team_bonus' as'all' | 'live' | 'course' | 'shop' | 'membership', title: '团队奖励', description: '团队本周业绩达标奖励', amount: 200.0, status: 'pending' as EarnStatus, createdAt: '2026-06-02 18:00', relatedUser: null, relatedOrder: null },
  { id: 4, type: 'product_commission' as'all' | 'live' | 'course' | 'shop' | 'membership', title: '商品分销佣金', description: '用户"风水学徒"购买了专业风水罗盘', amount: 58.0, status: 'frozen' as EarnStatus, createdAt: '2026-06-02 15:20', relatedUser: { id: 103, nickname: '风水学徒', avatar: '/static/experts/expert-1.jpg' }, relatedOrder: { orderId: 'ORD202606021520', orderAmount: 580.0 } },
  { id: 5, type: 'invite_reward' as'all' | 'live' | 'course' | 'shop' | 'membership', title: '邀请奖励', description: '成功邀请用户"玄学入门者"注册', amount: 10.0, status: 'settled' as EarnStatus, createdAt: '2026-06-01 09:30', relatedUser: { id: 104, nickname: '玄学入门者', avatar: '/static/experts/expert-2.jpg' }, relatedOrder: null },
  { id: 6, type: 'platform_reward' as'all' | 'live' | 'course' | 'shop' | 'membership', title: '平台奖励', description: '月度推广达人奖励', amount: 500.0, status: 'settled' as EarnStatus, createdAt: '2026-06-01 00:00', relatedUser: null, relatedOrder: null },
]

const withdrawRecords = [
  { id: 1, amount: 1000.0, fee: 6.0, actualAmount: 994.0, status: 'success' as WdStatus, method: 'alipay', account: '138****8888', createdAt: '2026-05-28 10:00', completedAt: '2026-05-28 12:30', failReason: '' },
  { id: 2, amount: 500.0, fee: 3.0, actualAmount: 497.0, status: 'processing' as WdStatus, method: 'bank', account: '6222****1234', createdAt: '2026-06-02 14:00', completedAt: '', failReason: '' },
]

const filterTypes = [
  { value: 'all', label: '全部' },
  { value: 'course_commission', label: '课程佣金' },
  { value: 'product_commission', label: '商品佣金' },
  { value: 'member_commission', label: '会员佣金' },
  { value: 'team_bonus', label: '团队奖励' },
  { value: 'invite_reward', label: '邀请奖励' },
]

const activeTab = ref<'earnings' | 'withdraw'>('earnings')
const filterType = ref<EarnType | 'all'>('all')
const refreshing = ref(false)

const filteredEarnings = computed(() =>
  filterType.value === 'all' | 'live' | 'course' | 'shop' | 'membership'? earningsList : earningsList.filter((i) => i.type === filterType.value),
)

function typeIcon(type:'all' | 'live' | 'course' | 'shop' | 'membership'): string {
  const map: Record<EarnType, string> = {
    course_commission: 'book-open',
    product_commission: 'shopping-bag',
    member_commission: 'crown',
    team_bonus: 'users',
    platform_reward: 'gift',
    invite_reward: 'user-plus',
  }
  return map[type] || 'wallet'
}
function statusName(s: EarnStatus): string {
  return { settled: '已结算', pending: '待结算', frozen: '冻结中' }[s]
}
function statusColor(s: EarnStatus): string {
  return { settled: '#16a34a', pending: '#d97706', frozen: '#2563eb' }[s]
}
function statusIconClass(s: EarnStatus): string {
  return { settled: 'bg-green', pending: 'bg-amber', frozen: 'bg-blue' }[s]
}
function statusBadgeClass(s: EarnStatus): string {
  return { settled: 'badge-green', pending: 'badge-amber', frozen: 'badge-blue' }[s]
}
function wdStatusName(s: WdStatus): string {
  return { pending: '待处理', processing: '处理中', success: '已到账', failed: '提现失败' }[s]
}
function wdBadgeClass(s: WdStatus): string {
  return { pending: 'badge-amber', processing: 'badge-blue', success: 'badge-green', failed: 'badge-red' }[s]
}

function onRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  setTimeout(() => { refreshing.value = false }, 800)
}
function goWithdraw() {
  uni.navigateTo({ url: '/pkg-mine/wallet/withdraw', fail: () => uni.showToast({ title: '提现', icon: 'none' }) })
}
function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
</script>

<style lang="scss" scoped>
.earn-page {
  min-height: 100vh;
  background: #faf8f5;
}
.earn-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #faf8f5;
  border-bottom: 1rpx solid #f3f4f6;
}
.earn-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
}
.earn-nav-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.earn-nav-btn.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.earn-nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #111827;
}

.earn-content {
  padding: 32rpx;
}

.earn-overview {
  background: linear-gradient(to bottom right, #C41E3A, #A01830);
  border-radius: 32rpx;
  padding: 40rpx;
  margin-bottom: 32rpx;
}
.earn-overview-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.earn-ov-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8rpx;
  display: block;
}
.earn-ov-balance {
  font-size: 60rpx;
  font-weight: 700;
  color: #fff;
}
.earn-withdraw-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx 28rpx;
}
.earn-withdraw-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #C41E3A;
}
.earn-ov-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
}
.earn-ov-stat-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}
.earn-ov-stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}
.earn-ov-stat-val {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}

.earn-compare {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  margin-bottom: 32rpx;
}
.earn-compare-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}
.earn-compare-label {
  font-size: 28rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
  display: block;
}
.earn-compare-val {
  font-size: 40rpx;
  font-weight: 700;
  color: #111827;
}
.earn-red {
  color: #C41E3A;
}

.earn-tabs {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 6rpx;
  margin-bottom: 32rpx;
}
.earn-tab {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}
.earn-tab.active {
  background: #f3f4f6;
}
.earn-tab-txt {
  font-size: 28rpx;
  color: #6b7280;
}
.earn-tab.active .earn-tab-txt {
  color: #111827;
  font-weight: 500;
}

.earn-filter-scroll {
  white-space: nowrap;
  margin-bottom: 16rpx;
}
.earn-filter-row {
  display: inline-flex;
  gap: 16rpx;
  padding-bottom: 12rpx;
}
.earn-filter {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #fff;
}
.earn-filter.active {
  background: #C41E3A;
}
.earn-filter-txt {
  font-size: 28rpx;
}

.earn-empty {
  background: #fff;
  border-radius: 16rpx;
  padding: 64rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.earn-empty-txt {
  font-size: 28rpx;
  color: #6b7280;
  margin-top: 24rpx;
}

.earn-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.earn-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}
.earn-item-main {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}
.earn-item-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.bg-green { background: #f0fdf4; }
.bg-amber { background: #fffbeb; }
.bg-blue { background: #eff6ff; }
.earn-item-info {
  flex: 1;
  min-width: 0;
}
.earn-item-row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.earn-item-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #111827;
}
.earn-item-amount {
  font-size: 30rpx;
  font-weight: 600;
  color: #C41E3A;
}
.earn-item-desc {
  font-size: 28rpx;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 16rpx;
  display: block;
}
.earn-item-row2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.earn-item-time {
  font-size: 22rpx;
  color: #9ca3af;
}
.earn-item-status {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}
.badge-green { color: #16a34a; background: #f0fdf4; }
.badge-amber { color: #d97706; background: #fffbeb; }
.badge-blue { color: #2563eb; background: #eff6ff; }
.badge-red { color: #dc2626; background: #fef2f2; }
.earn-item-user {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f3f4f6;
}
.earn-item-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.earn-item-from {
  font-size: 28rpx;
  color: #4b5563;
}
.earn-item-order {
  font-size: 22rpx;
  color: #9ca3af;
  margin-left: auto;
}

.earn-wd-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}
.earn-wd-row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.earn-wd-method {
  font-size: 30rpx;
  font-weight: 500;
  color: #111827;
}
.earn-wd-account {
  font-size: 28rpx;
  color: #6b7280;
  margin-left: 16rpx;
}
.earn-wd-status {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}
.earn-wd-row2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.earn-wd-amount {
  font-size: 40rpx;
  font-weight: 700;
  color: #111827;
}
.earn-wd-fee {
  font-size: 22rpx;
  color: #9ca3af;
  margin-left: 16rpx;
}
.earn-wd-time {
  font-size: 28rpx;
  color: #9ca3af;
}
.earn-wd-fail {
  display: block;
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #ef4444;
}
.earn-wd-completed {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.earn-tip {
  margin-top: 48rpx;
  padding: 32rpx;
  background: #fffbeb;
  border-radius: 16rpx;
}
.earn-tip-txt {
  font-size: 28rpx;
  color: #92400e;
  line-height: 1.6;
}
.earn-tip-bold {
  font-weight: 500;
  color: #92400e;
}
</style>
