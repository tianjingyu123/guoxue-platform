<template>
  <view class="bcs-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">批量发放优惠券</text>
        <view class="header-spacer" />
      </view>
    </view>

    <view class="bcs-body">
      <!-- 选择优惠券 -->
      <view class="card">
        <view class="card-head">
          <text class="card-icon">🎫</text>
          <text class="card-title">选择优惠券</text>
          <text class="card-required">*</text>
        </view>
        <view class="select-box" @click="showCouponSelect = true">
          <view v-if="selectedCoupon" class="sel-coupon">
            <view class="sel-icon">
              <text>🎫</text>
            </view>
            <view class="sel-info">
              <text class="sel-name">{{ selectedCoupon.name }}</text>
              <text class="sel-meta">库存 {{ selectedCoupon.stock }} | 有效期至 {{ selectedCoupon.expireAt }}</text>
            </view>
          </view>
          <text v-else class="sel-placeholder">请选择要发放的优惠券</text>
          <text class="sel-arrow">›</text>
        </view>
      </view>

      <!-- 目标用户 -->
      <view class="card">
        <view class="card-head">
          <text class="card-icon">🎯</text>
          <text class="card-title">目标用户</text>
        </view>
        <view class="filter-grid">
          <view v-for="ft in filterTypes" :key="ft.type" class="filter-chip" :class="{ active: config.userFilter.type === ft.type }" @click="updateFilter({ type: ft.type })">
            <text class="fc-emoji">{{ ft.emoji }}</text>
            <text class="fc-label">{{ ft.label }}</text>
          </view>
        </view>

        <view v-if="config.userFilter.type === 'level'" class="filter-detail">
          <text class="fd-label">选择会员等级</text>
          <view class="fd-chips">
            <text v-for="lv in memberLevels" :key="lv.value" class="fd-chip" :class="{ active: (config.userFilter.levels || []).includes(lv.value) }" @click="toggleLevel(lv.value)">{{ lv.label }}</text>
          </view>
        </view>

        <view v-if="config.userFilter.type === 'register_time'" class="filter-detail">
          <view class="fd-field">
            <text class="fd-label">注册开始日期</text>
            <picker mode="date" :value="config.userFilter.registerStart || ''" @change="e => updateFilter({ registerStart: e.detail.value })">
              <view class="fd-picker">{{ config.userFilter.registerStart || '请选择' }}</view>
            </picker>
          </view>
          <view class="fd-field">
            <text class="fd-label">注册结束日期</text>
            <picker mode="date" :value="config.userFilter.registerEnd || ''" @change="e => updateFilter({ registerEnd: e.detail.value })">
              <view class="fd-picker">{{ config.userFilter.registerEnd || '请选择' }}</view>
            </picker>
          </view>
        </view>

        <view v-if="config.userFilter.type === 'consumption'" class="filter-detail">
          <view class="fd-row">
            <view class="fd-half">
              <text class="fd-label">最低消费(元)</text>
              <input v-model="minConsumption" type="digit" class="fd-input" placeholder="0" @blur="updateFilter({ minConsumption: Number(minConsumption) })" />
            </view>
            <view class="fd-half">
              <text class="fd-label">最高消费(元)</text>
              <input v-model="maxConsumption" type="digit" class="fd-input" placeholder="不限" @blur="updateFilter({ maxConsumption: Number(maxConsumption) })" />
            </view>
          </view>
        </view>

        <view v-if="config.userFilter.type === 'uid_list'" class="filter-detail">
          <text class="fd-label">输入用户UID（每行一个或用逗号分隔）</text>
          <textarea v-model="uidList" class="fd-textarea" placeholder="例如：10001&#10;10002&#10;10003" @blur="updateFilter({ uidList })" />
          <text class="fd-hint">已输入 {{ (uidList || '').split(/[\n,]/).filter(Boolean).length }} 个用户</text>
        </view>
      </view>

      <!-- 发放时间 -->
      <view class="card">
        <view class="card-head">
          <text class="card-icon">⏰</text>
          <text class="card-title">发放时间</text>
        </view>
        <view class="time-tabs">
          <view class="time-tab" :class="{ active: config.sendTime === 'now' }" @click="config.sendTime = 'now'">
            <text>立即发放</text>
          </view>
          <view class="time-tab" :class="{ active: config.sendTime === 'scheduled' }" @click="config.sendTime = 'scheduled'">
            <text>定时发放</text>
          </view>
        </view>
        <picker v-if="config.sendTime === 'scheduled'" mode="multiSelector" :value="[0]" @change="e => config.scheduledTime = e.detail.value">
          <view class="fd-picker">{{ config.scheduledTime || '请选择时间' }}</view>
        </picker>
      </view>

      <!-- 发放限制 -->
      <view class="card">
        <view class="card-head">
          <text class="card-icon">🔧</text>
          <text class="card-title">发放限制</text>
        </view>
        <view class="fd-field">
          <text class="fd-label">每人限领数量</text>
          <input v-model.number="config.perUserLimit" type="number" class="fd-input" />
        </view>
        <view class="fd-field">
          <text class="fd-label">发放总量限制（选填）</text>
          <input v-model.number="config.totalLimit" type="number" class="fd-input" placeholder="不限" />
        </view>
      </view>

      <!-- 警告 -->
      <view class="warn-card">
        <text class="warn-icon">⚠️</text>
        <text class="warn-text">优惠券发放后不可撤销，请仔细核对发放条件和数量。大批量发放可能需要较长时间处理。</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view class="bb-btn outline" @click="handlePreview">
        <text>👁️ 预览</text>
      </view>
      <view class="bb-btn primary" @click="handleSend">
        <text>📤 确认发放</text>
      </view>
    </view>

    <!-- 优惠券选择弹窗 -->
    <view v-if="showCouponSelect" class="modal-mask" @click="showCouponSelect = false">
      <view class="modal-panel" @click.stop>
        <view class="mp-head">
          <text class="mp-title">选择优惠券</text>
          <text class="mp-close" @click="showCouponSelect = false">✕</text>
        </view>
        <view class="mp-body">
          <view v-for="c in coupons" :key="c.id" class="cp-item" :class="{ active: config.couponId === c.id }" @click="selectCoupon(c.id)">
            <view class="cp-icon">
              <text class="cp-val">{{ c.type === 'discount' ? (c.value / 10) + '折' : c.type === 'cash' ? '¥' + c.value : '免邮' }}</text>
            </view>
            <view class="cp-info">
              <text class="cp-name">{{ c.name }}</text>
              <text class="cp-meta">{{ c.minOrder > 0 ? '满' + c.minOrder + '可用' : '无门槛' }} · 库存{{ c.stock }} · 有效期至{{ c.expireAt }}</text>
            </view>
            <text v-if="config.couponId === c.id" class="cp-check">✓</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 预览弹窗 -->
    <view v-if="showPreview && previewData" class="modal-mask" @click="showPreview = false">
      <view class="modal-center" @click.stop>
        <text class="mc-title">发放预览</text>
        <view class="mc-body">
          <view class="mc-stat">
            <text class="mc-stat-label">目标用户数</text>
            <text class="mc-stat-val">{{ previewData.userCount.toLocaleString() }}</text>
          </view>
          <view class="mc-row">
            <view class="mc-cell">
              <text class="mc-cell-label">优惠券</text>
              <text class="mc-cell-val">{{ selectedCoupon?.name }}</text>
            </view>
            <view class="mc-cell">
              <text class="mc-cell-label">每人限领</text>
              <text class="mc-cell-val">{{ config.perUserLimit }}张</text>
            </view>
          </view>
          <view v-if="previewData.totalBudget > 0" class="mc-budget">
            <text>预计最大预算：¥{{ previewData.totalBudget.toLocaleString() }}</text>
          </view>
          <view class="mc-note">
            <text>ℹ️ 实际发放数量取决于优惠券库存和用户是否已领取。</text>
          </view>
        </view>
        <view class="mc-foot">
          <view class="mc-btn outline" @click="showPreview = false"><text>返回修改</text></view>
          <view class="mc-btn primary" @click="showConfirm = true"><text>确认发放</text></view>
        </view>
      </view>
    </view>

    <!-- 二次确认弹窗 -->
    <view v-if="showConfirm" class="modal-mask" @click="showConfirm = false">
      <view class="modal-center" @click.stop>
        <view class="confirm-icon">
          <text>⚠️</text>
        </view>
        <text class="confirm-title">确认发放优惠券？</text>
        <text class="confirm-desc">即将向 {{ previewData?.userCount.toLocaleString() }} 位用户发放优惠券，此操作不可撤销。</text>
        <view class="mc-foot">
          <view class="mc-btn outline" @click="showConfirm = false"><text>取消</text></view>
          <view class="mc-btn primary" @click="handleConfirmSend"><text>{{ sending ? '发放中...' : '确认发放' }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

interface Coupon { id: number; name: string; type: string; value: number; minOrder: number; stock: number; expireAt: string }

const showCouponSelect = ref(false)
const showPreview = ref(false)
const showConfirm = ref(false)
const sending = ref(false)
const previewData = ref<{ userCount: number; totalBudget: number } | null>(null)
const minConsumption = ref('')
const maxConsumption = ref('')
const uidList = ref('')

const coupons = ref<Coupon[]>([
  { id: 1, name: '新人专享满100减20', type: 'cash', value: 20, minOrder: 100, stock: 1000, expireAt: '2026-07-31' },
  { id: 2, name: '会员8折优惠券', type: 'discount', value: 80, minOrder: 50, stock: 500, expireAt: '2026-06-30' },
  { id: 3, name: '满200减50大额券', type: 'cash', value: 50, minOrder: 200, stock: 200, expireAt: '2026-08-15' },
  { id: 4, name: '免运费券', type: 'shipping', value: 0, minOrder: 0, stock: 2000, expireAt: '2026-12-31' },
])

const config = reactive<{
  couponId: number | null
  userFilter: { type: string; levels?: string[]; registerStart?: string; registerEnd?: string; minConsumption?: number; maxConsumption?: number; uidList?: string }
  sendTime: string
  scheduledTime?: string
  perUserLimit: number
  totalLimit?: number
}>({
  couponId: null,
  userFilter: { type: 'all' },
  sendTime: 'now',
  perUserLimit: 1,
})

const memberLevels = [
  { value: 'normal', label: '普通用户' },
  { value: 'vip1', label: 'VIP1' },
  { value: 'vip2', label: 'VIP2' },
  { value: 'vip3', label: 'VIP3' },
  { value: 'svip', label: 'SVIP' },
]

const filterTypes = [
  { type: 'all', label: '全部用户', emoji: '👥' },
  { type: 'level', label: '按会员等级', emoji: '🎁' },
  { type: 'register_time', label: '按注册时间', emoji: '📅' },
  { type: 'consumption', label: '按消费金额', emoji: '🔍' },
  { type: 'uid_list', label: '指定用户', emoji: '🔎' },
]

const selectedCoupon = computed(() => coupons.value.find(c => c.id === config.couponId))

function updateFilter(updates: Record<string, any>) {
  Object.assign(config.userFilter, updates)
}

function toggleLevel(val: string) {
  const levels = config.userFilter.levels || []
  const idx = levels.indexOf(val)
  if (idx >= 0) config.userFilter.levels = levels.filter(l => l !== val)
  else config.userFilter.levels = [...levels, val]
}

function selectCoupon(id: number) {
  config.couponId = id
  showCouponSelect.value = false
}

async function handlePreview() {
  if (!config.couponId) return
  let userCount = 0
  switch (config.userFilter.type) {
    case 'all': userCount = 12580; break
    case 'level': userCount = (config.userFilter.levels?.length || 0) * 2000; break
    case 'register_time': userCount = 3500; break
    case 'consumption': userCount = 1800; break
    case 'uid_list': userCount = (config.userFilter.uidList || '').split(/[\n,]/).filter(Boolean).length; break
  }
  const coupon = selectedCoupon.value
  const totalBudget = coupon?.type === 'cash' ? userCount * config.perUserLimit * coupon.value : 0
  previewData.value = { userCount, totalBudget }
  showPreview.value = true
}

function handleSend() {
  if (!config.couponId) return
  if (!previewData.value) { handlePreview().then(() => { showConfirm.value = true }) }
  else { showConfirm.value = true }
}

async function handleConfirmSend() {
  sending.value = true
  await new Promise(r => setTimeout(r, 1500))
  sending.value = false
  showConfirm.value = false
  showPreview.value = false
  uni.showToast({ title: '发放成功', icon: 'success' })
}
</script>

<style scoped>
.bcs-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.bcs-body { padding: 16rpx 24rpx; display: flex; flex-direction: column; gap: 14rpx; }
.card { background: #fff; border-radius: 14rpx; padding: 18rpx 20rpx; border: 1px solid #E8E0D5; }
.card-head { display: flex; align-items: center; gap: 6rpx; margin-bottom: 12rpx; }
.card-icon { font-size: 24rpx; }
.card-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.card-required { font-size: 22rpx; color: #C41E3A; }

.select-box { display: flex; align-items: center; justify-content: space-between; padding: 14rpx; border: 1px solid #E8E0D5; border-radius: 12rpx; }
.sel-coupon { display: flex; align-items: center; gap: 12rpx; }
.sel-icon { width: 64rpx; height: 64rpx; border-radius: 12rpx; background: rgba(196,30,58,0.06); display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.sel-info { display: flex; flex-direction: column; }
.sel-name { font-size: 24rpx; font-weight: 500; color: #333; }
.sel-meta { font-size: 18rpx; color: #999; }
.sel-placeholder { font-size: 24rpx; color: #BBB; }
.sel-arrow { font-size: 32rpx; color: #BBB; }

.filter-grid { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 12rpx; }
.filter-chip { display: flex; align-items: center; gap: 6rpx; padding: 12rpx 20rpx; border-radius: 12rpx; border: 1px solid #E8E0D5; }
.filter-chip.active { border-color: #C41E3A; background: rgba(196,30,58,0.04); }
.fc-emoji { font-size: 22rpx; }
.fc-label { font-size: 22rpx; color: #666; }
.filter-chip.active .fc-label { color: #C41E3A; }

.filter-detail { padding-top: 12rpx; border-top: 1px solid #F5F1EB; }
.fd-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.fd-chips { display: flex; flex-wrap: wrap; gap: 8rpx; }
.fd-chip { font-size: 22rpx; padding: 8rpx 18rpx; border-radius: 24rpx; border: 1px solid #E8E0D5; color: #666; }
.fd-chip.active { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.fd-field { margin-bottom: 12rpx; }
.fd-picker { padding: 12rpx 16rpx; border: 1px solid #E8E0D5; border-radius: 10rpx; font-size: 24rpx; color: #666; }
.fd-input { padding: 12rpx 16rpx; border: 1px solid #E8E0D5; border-radius: 10rpx; font-size: 24rpx; color: #333; width: 100%; box-sizing: border-box; }
.fd-row { display: flex; gap: 12rpx; }
.fd-half { flex: 1; }
.fd-textarea { width: 100%; height: 140rpx; padding: 12rpx; border: 1px solid #E8E0D5; border-radius: 10rpx; font-size: 24rpx; box-sizing: border-box; }
.fd-hint { font-size: 20rpx; color: #BBB; display: block; margin-top: 6rpx; }

.time-tabs { display: flex; gap: 10rpx; margin-bottom: 12rpx; }
.time-tab { flex: 1; padding: 14rpx; text-align: center; border: 1px solid #E8E0D5; border-radius: 12rpx; }
.time-tab.active { border-color: #C41E3A; background: rgba(196,30,58,0.04); }
.time-tab text { font-size: 24rpx; color: #666; }
.time-tab.active text { color: #C41E3A; }

.warn-card { display: flex; align-items: flex-start; gap: 8rpx; padding: 16rpx; background: #FFFBF0; border-radius: 12rpx; }
.warn-icon { font-size: 24rpx; flex-shrink: 0; margin-top: 2rpx; }
.warn-text { font-size: 22rpx; color: #8B6914; line-height: 1.5; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 14rpx 24rpx; padding-bottom: calc(14rpx + env(safe-area-inset-bottom)); display: flex; gap: 14rpx; z-index: 20; }
.bb-btn { flex: 1; padding: 16rpx; text-align: center; border-radius: 12rpx; }
.bb-btn.outline { border: 1px solid #E8E0D5; }
.bb-btn.primary { background: #C41E3A; }
.bb-btn text { font-size: 26rpx; }
.bb-btn.outline text { color: #666; }
.bb-btn.primary text { color: #fff; }

.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.modal-panel { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; max-height: 70vh; display: flex; flex-direction: column; }
.mp-head { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; border-bottom: 1px solid #E8E0D5; }
.mp-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.mp-close { font-size: 36rpx; color: #999; }
.mp-body { flex: 1; overflow-y: auto; padding: 16rpx 24rpx; }
.cp-item { display: flex; align-items: center; gap: 14rpx; padding: 16rpx; border-radius: 12rpx; border: 1px solid #E8E0D5; margin-bottom: 10rpx; }
.cp-item.active { border-color: #C41E3A; background: rgba(196,30,58,0.04); }
.cp-icon { width: 76rpx; height: 76rpx; border-radius: 12rpx; background: rgba(196,30,58,0.06); display: flex; align-items: center; justify-content: center; }
.cp-val { font-size: 22rpx; font-weight: 700; color: #C41E3A; }
.cp-info { flex: 1; }
.cp-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; }
.cp-meta { font-size: 20rpx; color: #999; display: block; margin-top: 2rpx; }
.cp-check { font-size: 28rpx; color: #C41E3A; }

.modal-center { width: 600rpx; background: #fff; border-radius: 20rpx; overflow: hidden; }
.modal-mask:has(.modal-center) { align-items: center; justify-content: center; }
.mc-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; text-align: center; padding: 24rpx; display: block; border-bottom: 1px solid #E8E0D5; }
.mc-body { padding: 24rpx; }
.mc-stat { text-align: center; margin-bottom: 20rpx; }
.mc-stat-label { font-size: 22rpx; color: #999; display: block; }
.mc-stat-val { font-size: 52rpx; font-weight: 700; color: #C41E3A; }
.mc-row { display: flex; gap: 14rpx; margin-bottom: 14rpx; }
.mc-cell { flex: 1; padding: 14rpx; background: #F5F1EB; border-radius: 10rpx; text-align: center; }
.mc-cell-label { font-size: 18rpx; color: #999; display: block; }
.mc-cell-val { font-size: 22rpx; color: #333; font-weight: 500; }
.mc-budget { padding: 14rpx; background: #FFFBF0; border-radius: 10rpx; text-align: center; margin-bottom: 14rpx; }
.mc-budget text { font-size: 22rpx; color: #8B6914; }
.mc-note { display: flex; align-items: flex-start; gap: 6rpx; }
.mc-note text { font-size: 18rpx; color: #BBB; }
.mc-foot { display: flex; gap: 14rpx; padding: 16rpx 24rpx 24rpx; border-top: 1px solid #E8E0D5; }
.mc-btn { flex: 1; padding: 14rpx; text-align: center; border-radius: 12rpx; }
.mc-btn.outline { border: 1px solid #E8E0D5; }
.mc-btn.primary { background: #C41E3A; }
.mc-btn text { font-size: 24rpx; }
.mc-btn.outline text { color: #666; }
.mc-btn.primary text { color: #fff; }

.confirm-icon { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(255,193,7,0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.confirm-icon text { font-size: 48rpx; }
.confirm-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; text-align: center; display: block; margin: 16rpx 0 10rpx; }
.confirm-desc { font-size: 22rpx; color: #999; text-align: center; display: block; padding: 0 24rpx; }
</style>
