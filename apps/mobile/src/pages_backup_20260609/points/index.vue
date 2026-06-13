<template>
  <view class="points-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">积分中心</text>
        <text class="header-action" @click="goPage('/pages/points/history/index')">明细</text>
      </view>
    </view>

    <!-- 积分余额 -->
    <view class="balance-card">
      <view class="bc-deco" />
      <view class="bc-content">
        <view class="bc-header">
          <text class="bc-icon">🪙</text>
          <text class="bc-label">我的积分</text>
        </view>
        <text class="bc-num">{{ pointsInfo.balance.toLocaleString() }}</text>
        <text class="bc-rate">100积分 = ¥1.00，可在兑换时抵扣</text>

        <view v-if="pointsInfo" class="bc-stats">
          <view class="bcs-item">
            <text class="bcs-label">累计获取</text>
            <text class="bcs-val">{{ pointsInfo.totalEarned.toLocaleString() }}</text>
          </view>
          <view class="bcs-item">
            <text class="bcs-label">累计使用</text>
            <text class="bcs-val">{{ pointsInfo.totalSpent.toLocaleString() }}</text>
          </view>
          <view class="bcs-item">
            <text class="bcs-label">今日获取</text>
            <text class="bcs-val plus">+{{ pointsInfo.todayEarned }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 积分任务 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">如何获取积分</text>
        <text class="section-more" @click="goPage('/pages/points/tasks/index')">更多任务 ›</text>
      </view>
      <view class="task-list">
        <view v-for="t in tasks" :key="t.id" class="task-item">
          <view class="task-left">
            <view class="task-icon">{{ t.icon }}</view>
            <view class="task-info">
              <view class="task-name-row">
                <text class="task-name">{{ t.title }}</text>
                <text class="task-points">+{{ t.points }}积分</text>
              </view>
              <text class="task-limit">{{ t.limit }}</text>
            </view>
          </view>
          <text v-if="t.completed" class="task-done">✅ 已完成</text>
          <text v-else class="task-action">{{ t.action }}</text>
        </view>
      </view>
    </view>

    <!-- 积分兑换 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">积分兑换</text>
        <text class="section-more" @click="goPage('/pages/points/exchange/index')">全部商品 ›</text>
      </view>
      <view class="exchange-grid">
        <view
          v-for="item in exchangeItems"
          :key="item.id"
          class="ex-item"
          :class="{ off: pointsInfo.balance < item.points }"
          @click="handleExchange(item)"
        >
          <view class="ex-top">
            <view class="ex-icon" :class="item.color">{{ item.icon }}</view>
            <text class="ex-stock">剩{{ item.stock }}</text>
          </view>
          <text class="ex-title">{{ item.title }}</text>
          <view class="ex-bottom">
            <view class="ex-points">
              <text class="ex-p-icon">🪙</text>
              <text class="ex-p-num">{{ item.points }}</text>
            </view>
            <view class="ex-btn" :class="{ disabled: pointsInfo.balance < item.points }">
              <text>{{ pointsInfo.balance >= item.points ? '兑换' : '积分不足' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 积分明细 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">近期明细</text>
        <text class="section-more" @click="goPage('/pages/points/history/index')">全部记录 ›</text>
      </view>
      <view class="history-list">
        <view v-for="h in historyItems" :key="h.id" class="hist-item">
          <view class="hist-info">
            <text class="hist-title">{{ h.title }}</text>
            <text class="hist-time">{{ h.time }}</text>
          </view>
          <text class="hist-points" :class="{ earn: h.type === 'earn' }">{{ h.points > 0 ? '+' : '' }}{{ h.points }}</text>
        </view>
      </view>
    </view>

    <!-- 积分说明 -->
    <view class="section">
      <view class="info-card">
        <text class="info-title">积分说明：</text>
        <text class="info-text">积分可用于兑换优惠券、国学币、会员体验及实物礼品。积分有效期为获取后12个月，请及时使用。</text>
      </view>
    </view>

    <!-- 兑换确认弹窗 -->
    <view v-if="showExchangeModal && selectedItem" class="modal-mask" @click="showExchangeModal = false">
      <view class="exchange-dialog" @click.stop>
        <template v-if="!exchangeSuccess">
          <view class="ed-icon-wrap">🎁</view>
          <text class="ed-title">确认兑换</text>
          <text class="ed-desc">使用 <text class="ed-hl">{{ selectedItem.points }}积分</text> 兑换</text>
          <view class="ed-item-name">{{ selectedItem.title }}</view>
          <text class="ed-after">兑换后积分余额：{{ (pointsInfo.balance - selectedItem.points).toLocaleString() }}</text>
          <view class="ed-actions">
            <view class="ed-btn cancel" @click="showExchangeModal = false">取消</view>
            <view class="ed-btn confirm" @click="confirmExchange">确认兑换</view>
          </view>
        </template>
        <template v-else>
          <view class="ed-icon-wrap">✅</view>
          <text class="ed-title">兑换成功</text>
          <text class="ed-desc">{{ selectedItem.title }} 已发放至您的账户</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const pointsInfo = reactive({
  balance: 1280, totalEarned: 5680, totalSpent: 4400, todayEarned: 50,
})

const tasks = ref([
  { id: 1, icon: '📅', title: '每日签到', points: 5, limit: '每日1次', completed: true, action: '去签到' },
  { id: 2, icon: '📄', title: '浏览文章', points: 3, limit: '每日最多5次 (3/5)', completed: false, action: '去浏览' },
  { id: 3, icon: '💬', title: '发表评论', points: 5, limit: '每日最多3次 (0/3)', completed: false, action: '去评论' },
  { id: 4, icon: '📤', title: '分享内容', points: 10, limit: '每日1次', completed: false, action: '去分享' },
  { id: 5, icon: '🎓', title: '完成课程', points: 20, limit: '每日最多3次 (0/3)', completed: false, action: '去学习' },
  { id: 6, icon: '👥', title: '邀请好友', points: 50, limit: '不限次数', completed: false, action: '去邀请' },
])

const exchangeItems = ref([
  { id: 1, icon: '🎫', title: '5元优惠券', points: 500, stock: 200, color: 'ex-red' },
  { id: 2, icon: '🪙', title: '50国学币', points: 500, stock: 150, color: 'ex-gold' },
  { id: 3, icon: '👑', title: '7天会员体验', points: 1000, stock: 50, color: 'ex-purple' },
  { id: 4, icon: '📚', title: '《易经入门》电子书', points: 800, stock: 80, color: 'ex-blue' },
  { id: 5, icon: '🎁', title: '国学文创礼盒', points: 2000, stock: 20, color: 'ex-orange' },
  { id: 6, icon: '💳', title: '20元话费充值', points: 1800, stock: 100, color: 'ex-green' },
])

const historyItems = ref([
  { id: 1, title: '每日签到', time: '2026-06-08 08:30', points: 5, type: 'earn' },
  { id: 2, title: '浏览文章奖励', time: '2026-06-08 10:15', points: 3, type: 'earn' },
  { id: 3, title: '兑换50国学币', time: '2026-06-07 16:20', points: -500, type: 'spend' },
  { id: 4, title: '分享内容奖励', time: '2026-06-07 09:00', points: 10, type: 'earn' },
  { id: 5, title: '邀请好友奖励', time: '2026-06-06 14:00', points: 50, type: 'earn' },
])

const showExchangeModal = ref(false)
const selectedItem = ref<any>(null)
const exchangeSuccess = ref(false)

function handleExchange(item: any) {
  if (pointsInfo.balance < item.points) return
  selectedItem.value = item
  showExchangeModal.value = true
  exchangeSuccess.value = false
}

function confirmExchange() {
  if (!selectedItem.value) return
  pointsInfo.balance -= selectedItem.value.points
  pointsInfo.totalSpent += selectedItem.value.points
  exchangeSuccess.value = true
  setTimeout(() => {
    showExchangeModal.value = false
    selectedItem.value = null
  }, 2000)
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.points-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 80rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { flex: 1; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-action { font-size: 26rpx; color: #C41E3A; }

/* 余额卡片 */
.balance-card { margin: 16rpx 24rpx; background: linear-gradient(135deg, #C9A96E, #B8943D, #D4A84B); border-radius: 24rpx; overflow: hidden; position: relative; box-shadow: 0 8rpx 28rpx rgba(201,169,110,0.3); }
.bc-deco { position: absolute; right: -24rpx; top: -24rpx; width: 160rpx; height: 160rpx; border-radius: 50%; background: rgba(255,255,255,0.08); }
.bc-content { position: relative; padding: 28rpx 32rpx; }
.bc-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.bc-icon { font-size: 32rpx; }
.bc-label { font-size: 24rpx; color: rgba(255,255,255,0.8); }
.bc-num { font-size: 64rpx; font-weight: 700; color: #fff; display: block; }
.bc-rate { font-size: 22rpx; color: rgba(255,255,255,0.65); margin-top: 4rpx; display: block; }

.bc-stats { display: flex; gap: 40rpx; margin-top: 24rpx; padding-top: 20rpx; border-top: 1px solid rgba(255,255,255,0.2); }
.bcs-item { }
.bcs-label { font-size: 20rpx; color: rgba(255,255,255,0.6); display: block; }
.bcs-val { font-size: 26rpx; font-weight: 500; color: #fff; margin-top: 2rpx; display: block; }
.bcs-val.plus { color: #A5D6A7; }

/* 区块 */
.section { padding: 0 24rpx; margin-top: 28rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.section-more { font-size: 24rpx; color: #C9A96E; }

/* 任务 */
.task-list { background: #fff; border-radius: 20rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.task-item { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.task-item + .task-item { border-top: 1px solid #F5F1EB; }
.task-left { display: flex; align-items: center; gap: 16rpx; }
.task-icon { font-size: 36rpx; width: 72rpx; height: 72rpx; border-radius: 20rpx; background: rgba(201,169,110,0.08); display: flex; align-items: center; justify-content: center; }
.task-name-row { display: flex; align-items: center; gap: 12rpx; }
.task-name { font-size: 26rpx; font-weight: 500; color: #333; }
.task-points { font-size: 20rpx; color: #C9A96E; background: rgba(201,169,110,0.1); padding: 2rpx 10rpx; border-radius: 8rpx; }
.task-limit { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
.task-done { font-size: 22rpx; color: #52C41A; white-space: nowrap; }
.task-action { font-size: 22rpx; color: #C41E3A; background: rgba(196,30,58,0.06); padding: 6rpx 16rpx; border-radius: 24rpx; white-space: nowrap; }

/* 兑换 */
.exchange-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.ex-item { background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.ex-item.off { opacity: 0.55; }
.ex-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12rpx; }
.ex-icon { width: 56rpx; height: 56rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.ex-red { background: rgba(196,30,58,0.08); }
.ex-gold { background: rgba(201,169,110,0.1); }
.ex-purple { background: rgba(114,46,209,0.08); }
.ex-blue { background: rgba(22,119,255,0.08); }
.ex-orange { background: rgba(250,140,22,0.08); }
.ex-green { background: rgba(82,196,26,0.08); }
.ex-stock { font-size: 18rpx; color: #BBB; }
.ex-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.ex-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.ex-points { display: flex; align-items: center; gap: 4rpx; }
.ex-p-icon { font-size: 24rpx; }
.ex-p-num { font-size: 26rpx; font-weight: 600; color: #C9A96E; }
.ex-btn { padding: 6rpx 20rpx; border-radius: 24rpx; background: #C41E3A; color: #fff; font-size: 22rpx; }
.ex-btn.disabled { background: #DDD; color: #999; }

/* 历史 */
.history-list { background: #fff; border-radius: 20rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.hist-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; }
.hist-item + .hist-item { border-top: 1px solid #F5F1EB; }
.hist-title { font-size: 26rpx; color: #333; display: block; }
.hist-time { font-size: 22rpx; color: #BBB; margin-top: 4rpx; display: block; }
.hist-points { font-size: 28rpx; font-weight: 600; color: #C41E3A; white-space: nowrap; }
.hist-points.earn { color: #52C41A; }

/* 说明 */
.info-card { padding: 20rpx 24rpx; background: rgba(201,169,110,0.06); border-radius: 16rpx; }
.info-title { font-size: 24rpx; font-weight: 500; color: #333; }
.info-text { font-size: 24rpx; color: #888; line-height: 1.6; }

/* 兑换弹窗 */
.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 48rpx; }
.exchange-dialog { width: 100%; max-width: 560rpx; background: #fff; border-radius: 24rpx; padding: 48rpx 32rpx 32rpx; text-align: center; }
.ed-icon-wrap { font-size: 72rpx; margin-bottom: 20rpx; }
.ed-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; display: block; }
.ed-desc { font-size: 26rpx; color: #999; margin-top: 8rpx; display: block; }
.ed-hl { color: #C9A96E; font-weight: 500; }
.ed-item-name { padding: 16rpx; margin: 20rpx 0; background: #F5F1EB; border-radius: 14rpx; font-size: 28rpx; color: #333; }
.ed-after { font-size: 24rpx; color: #BBB; display: block; margin-bottom: 24rpx; }
.ed-actions { display: flex; gap: 16rpx; }
.ed-btn { flex: 1; padding: 20rpx 0; border-radius: 16rpx; font-size: 28rpx; text-align: center; }
.ed-btn.cancel { background: #F5F1EB; color: #999; }
.ed-btn.confirm { background: #C41E3A; color: #fff; font-weight: 500; }
</style>
