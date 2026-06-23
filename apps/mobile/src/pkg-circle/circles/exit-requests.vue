<script setup lang="ts">
/**
 * 退出申请审核页（从原型 app/circles/[id]/exit-requests/page.tsx 269行高保真迁移）
 * 统计栏 + 待审核/已处理双Tab + 圈主审核说明 + 卡片(退款核算/驳回原因/流转说明) + 同意/拒绝 + 拒绝弹窗
 * 数据/退款计算复用 lib/circle-exit.ts
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { mockExitRequests, getExitStageDisplay, type ExitApplication } from '@/lib/circle-exit'

const requests = ref<ExitApplication[]>(mockExitRequests)
const filter = ref<'pending' | 'processed'>('pending')
const rejectingId = ref<string | null>(null)
const rejectReason = ref('')

const pending = computed(() => requests.value.filter((r) => r.stage === 'owner_reviewing'))
const processed = computed(() => requests.value.filter((r) => r.stage !== 'owner_reviewing'))
const display = computed(() => (filter.value === 'pending' ? pending.value : processed.value))

function toneCls(tone: string) {
  if (tone === 'approved') return 'er-tone-ok'
  if (tone === 'rejected') return 'er-tone-no'
  return 'er-tone-pending'
}

function approve(id: string) {
  requests.value = requests.value.map((r) =>
    r.id === id ? { ...r, stage: 'platform_reviewing' as const, ownerReviewedAt: new Date().toISOString().slice(0, 10) } : r,
  )
}
function openReject(id: string) { rejectingId.value = id; rejectReason.value = '' }
function confirmReject() {
  const id = rejectingId.value
  if (!id) return
  requests.value = requests.value.map((r) =>
    r.id === id
      ? { ...r, stage: 'rejected' as const, rejectBy: 'owner' as const, rejectReason: rejectReason.value || '圈主未通过退出申请', ownerReviewedAt: new Date().toISOString().slice(0, 10) }
      : r,
  )
  rejectingId.value = null; rejectReason.value = ''
}
</script>

<template>
  <view class="er">
    <!-- 顶部导航 -->
    <view class="er-nav">
      <view class="er-nav-bar">
        <view class="er-back" @tap="goBack"><app-icon name="chevron-left" :size="44" color="#2C2C2C" /></view>
        <text class="er-title">退出申请审核</text>
        <view class="er-nav-ph" />
      </view>
      <view class="er-stats">
        <view class="er-stat">
          <view class="er-stat-icon"><app-icon name="log-out" :size="28" color="#C41E3A" /></view>
          <view>
            <text class="er-stat-num er-red">{{ pending.length }}</text>
            <text class="er-stat-label">待审核</text>
          </view>
        </view>
        <view class="er-divider" />
        <view>
          <text class="er-stat-num">{{ processed.length }}</text>
          <text class="er-stat-label">已处理</text>
        </view>
      </view>
      <view class="er-tabs">
        <view v-for="t in [{ key: 'pending', label: '待审核' }, { key: 'processed', label: '已处理' }]" :key="t.key"
          class="er-tab" :class="{ 'er-tab-on': filter === t.key }" @tap="filter = t.key as any">
          <text>{{ t.label }}</text>
          <view v-if="filter === t.key" class="er-tab-line" />
        </view>
      </view>
    </view>

    <!-- 圈主审核说明 -->
    <view v-if="filter === 'pending' && pending.length > 0" class="er-note">
      <text class="er-note-text">请核对成员身份与圈内行为记录后审核。同意后将进入平台审核与退款处理；退款金额由系统按使用天数自动核算。</text>
    </view>

    <!-- 空态 -->
    <view v-if="display.length === 0" class="er-empty">
      <view class="er-empty-icon"><app-icon name="log-out" :size="56" color="#CCCCCC" /></view>
      <text class="er-empty-text">{{ filter === 'pending' ? '暂无待审核申请' : '暂无已处理记录' }}</text>
    </view>

    <!-- 列表 -->
    <view v-else class="er-list">
      <view v-for="req in display" :key="req.id" class="er-card" :class="{ 'er-card-done': req.stage !== 'owner_reviewing' }">
        <view class="er-card-body">
          <view class="er-card-head">
            <image class="er-avatar" :src="req.user.avatar || '/static/avatars/me.png'" mode="aspectFill" />
            <view class="er-userinfo">
              <view class="er-name-row">
                <text class="er-name">{{ req.user.name }}</text>
                <text class="er-badge" :class="toneCls(getExitStageDisplay(req.stage).tone)">{{ getExitStageDisplay(req.stage).label }}</text>
              </view>
              <view class="er-meta">
                <view class="er-meta-item"><app-icon name="calendar" :size="22" color="#999999" /><text>加入 {{ req.joinDate }}</text></view>
                <view class="er-meta-item"><app-icon name="clock" :size="22" color="#999999" /><text>已用 {{ req.breakdown.usedDays }} 天</text></view>
              </view>
            </view>
          </view>

          <text v-if="req.reason" class="er-reason"><text class="er-reason-label">退出原因：</text>{{ req.reason }}</text>

          <!-- 退款核算 -->
          <view class="er-refund">
            <view class="er-refund-head"><app-icon name="coins" :size="26" color="#C41E3A" /><text>退款核算</text></view>
            <text class="er-refund-detail">已付 ¥{{ req.breakdown.paidAmount }} · 扣 ¥{{ req.breakdown.deduction }}（{{ req.breakdown.usedDays }}天 × ¥{{ req.breakdown.dailyRate }}）</text>
            <view class="er-refund-total">
              <text class="er-refund-label">应退金额</text>
              <text class="er-refund-amount">¥{{ req.breakdown.refundAmount }}</text>
            </view>
          </view>

          <text v-if="req.stage === 'rejected' && req.rejectReason" class="er-rej">{{ req.rejectBy === 'owner' ? '圈主驳回：' : '平台驳回：' }}{{ req.rejectReason }}</text>
          <text v-if="req.stage === 'platform_reviewing'" class="er-flow">已同意，等待平台审核与退款处理</text>
          <text v-if="req.stage === 'refunded'" class="er-flow-ok">退款 ¥{{ req.breakdown.refundAmount }} 已于 {{ req.refundedAt }} 到账</text>
        </view>

        <view v-if="req.stage === 'owner_reviewing'" class="er-actions">
          <view class="er-act" @tap="openReject(req.id)"><app-icon name="x-circle" :size="28" color="#666666" /><text>拒绝</text></view>
          <view class="er-act-divider" />
          <view class="er-act er-act-ok" @tap="approve(req.id)"><app-icon name="check-circle" :size="28" color="#C41E3A" /><text>同意退出</text></view>
        </view>
      </view>
    </view>

    <!-- 拒绝原因弹窗 -->
    <view v-if="rejectingId" class="er-modal-mask" @tap="rejectingId = null">
      <view class="er-modal" @tap.stop>
        <text class="er-modal-title">拒绝退出申请</text>
        <textarea v-model="rejectReason" class="er-modal-input" placeholder="请填写拒绝原因，便于成员了解情况（选填）" />
        <view class="er-modal-btns">
          <view class="er-modal-cancel" @tap="rejectingId = null">取消</view>
          <view class="er-modal-ok" @tap="confirmReject">确认拒绝</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.er { min-height: 100vh; background: #FAF8F5; }
.er-nav { position: sticky; top: 0; z-index: 40; background: #fff; border-bottom: 1rpx solid #F2EFEA; }
.er-nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; height: 96rpx; }
.er-back { margin-left: -8rpx; }
.er-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.er-nav-ph { width: 48rpx; }
.er-stats { display: flex; align-items: center; gap: 28rpx; padding: 20rpx 24rpx; background: linear-gradient(to right, rgba(196,30,58,0.05), transparent); }
.er-stat { display: flex; align-items: center; gap: 14rpx; }
.er-stat-icon { width: 52rpx; height: 52rpx; border-radius: 999rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.er-stat-num { display: block; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.er-red { color: #C41E3A; }
.er-stat-label { display: block; font-size: 22rpx; color: #999999; }
.er-divider { width: 1rpx; height: 52rpx; background: #E8E3DB; }
.er-tabs { display: flex; border-bottom: 1rpx solid #F2EFEA; }
.er-tab { flex: 1; padding: 22rpx 0; text-align: center; font-size: 28rpx; font-weight: 500; color: #999999; position: relative; }
.er-tab-on { color: #C41E3A; }
.er-tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 48rpx; height: 4rpx; background: #C41E3A; border-radius: 999rpx; }
.er-note { margin: 20rpx 24rpx 0; padding: 18rpx; border-radius: 16rpx; background: rgba(201,169,110,0.1); border: 1rpx solid rgba(201,169,110,0.2); }
.er-note-text { font-size: 22rpx; color: #7A6A4F; line-height: 1.7; }
.er-empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.er-empty-icon { width: 120rpx; height: 120rpx; border-radius: 999rpx; background: #F2EFEA; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.er-empty-text { font-size: 28rpx; color: #999999; }
.er-list { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.er-card { background: #fff; border-radius: 20rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.er-card-done { opacity: 0.8; box-shadow: none; }
.er-card-body { padding: 24rpx; }
.er-card-head { display: flex; align-items: flex-start; gap: 18rpx; }
.er-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; background: #F2EFEA; flex-shrink: 0; }
.er-userinfo { flex: 1; min-width: 0; }
.er-name-row { display: flex; align-items: center; gap: 12rpx; }
.er-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.er-badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 999rpx; white-space: nowrap; }
.er-tone-ok { background: #ECFDF3; color: #16A34A; }
.er-tone-no { background: #FEF2F2; color: #DC2626; }
.er-tone-pending { background: rgba(201,169,110,0.1); color: #C9A96E; }
.er-meta { display: flex; gap: 24rpx; margin-top: 8rpx; }
.er-meta-item { display: flex; align-items: center; gap: 6rpx; font-size: 22rpx; color: #999999; }
.er-reason { display: block; font-size: 26rpx; color: #666666; margin-top: 18rpx; }
.er-reason-label { color: #999999; }
.er-refund { margin-top: 18rpx; padding: 18rpx; border-radius: 16rpx; background: #FAF8F5; }
.er-refund-head { display: flex; align-items: center; gap: 8rpx; font-size: 22rpx; color: #999999; margin-bottom: 10rpx; }
.er-refund-detail { display: block; font-size: 22rpx; color: #666666; }
.er-refund-total { display: flex; align-items: center; justify-content: space-between; padding-top: 10rpx; }
.er-refund-label { font-size: 22rpx; color: #999999; }
.er-refund-amount { font-size: 34rpx; font-weight: 700; color: #C41E3A; }
.er-rej { display: block; margin-top: 14rpx; font-size: 22rpx; color: #EF4444; }
.er-flow { display: block; margin-top: 14rpx; font-size: 22rpx; color: #C9A96E; }
.er-flow-ok { display: block; margin-top: 14rpx; font-size: 22rpx; color: #16A34A; }
.er-actions { display: flex; border-top: 1rpx solid #F2EFEA; }
.er-act { flex: 1; padding: 22rpx 0; display: flex; align-items: center; justify-content: center; gap: 8rpx; font-size: 28rpx; color: #666666; }
.er-act-ok { color: #C41E3A; font-weight: 500; }
.er-act-divider { width: 1rpx; background: #F2EFEA; }
.er-modal-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 0 64rpx; }
.er-modal { background: #fff; border-radius: 28rpx; width: 100%; max-width: 600rpx; padding: 36rpx; }
.er-modal-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.er-modal-input { width: 100%; height: 180rpx; margin-top: 28rpx; padding: 20rpx; border: 1rpx solid #E8E3DB; border-radius: 14rpx; font-size: 26rpx; box-sizing: border-box; }
.er-modal-btns { display: flex; gap: 20rpx; margin-top: 28rpx; }
.er-modal-cancel { flex: 1; padding: 20rpx 0; text-align: center; border: 1rpx solid #E8E3DB; border-radius: 14rpx; color: #666666; font-size: 28rpx; }
.er-modal-ok { flex: 1; padding: 20rpx 0; text-align: center; background: #C41E3A; color: #fff; border-radius: 14rpx; font-size: 28rpx; }
</style>
