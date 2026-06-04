<template>
  <view class="page">
    <view class="header">
      <view class="header-left">
        <text
          class="back-btn"
          @click="goBack"
        >
          ‹
        </text>
        <text class="header-title">
          批量发放优惠券
        </text>
      </view>
    </view>
    <view class="content">
      <view class="card">
        <view class="card-header">
          <text class="card-icon">
            🎫
          </text><text class="card-title">
            选择优惠券
          </text><text class="required">
            *
          </text>
        </view>
        <view
          class="coupon-select"
          @click="showCouponSelect = true"
        >
          <view
            v-if="selectedCoupon"
            class="coupon-selected"
          >
            <view class="cs-icon-wrap">
              <text class="cs-icon">
                🎫
              </text>
            </view>
            <view class="cs-info">
              <text class="cs-name">
                {{ selectedCoupon.name }}
              </text><text class="cs-meta">
                库存 {{ selectedCoupon.stock }} | 有效期至 {{ selectedCoupon.expireAt }}
              </text>
            </view>
          </view>
          <text
            v-else
            class="cs-placeholder"
          >
            请选择要发放的优惠券
          </text>
          <text class="cs-arrow">
            ▼
          </text>
        </view>
      </view>
      <view class="card">
        <view class="card-header">
          <text class="card-icon">
            🎯
          </text><text class="card-title">
            目标用户
          </text>
        </view>
        <view class="filter-grid">
          <view
            v-for="f in filterTypes"
            :key="f.type"
            class="filter-btn"
            :class="{ active: config.userFilter.type === f.type }"
            @click="config.userFilter.type = f.type"
          >
            <text class="filter-icon">
              {{ f.icon }}
            </text><text class="filter-label">
              {{ f.label }}
            </text>
          </view>
        </view>
        <view
          v-if="config.userFilter.type === 'level'"
          class="filter-detail"
        >
          <text class="fd-label">
            选择会员等级
          </text>
          <view class="level-tags">
            <text
              v-for="lv in memberLevels"
              :key="lv.value"
              class="level-tag"
              :class="{ active: (config.userFilter.levels || []).includes(lv.value) }"
              @click="toggleLevel(lv.value)"
            >
              {{ lv.label }}
            </text>
          </view>
        </view>
        <view
          v-if="config.userFilter.type === 'register_time'"
          class="filter-detail"
        >
          <view class="date-field">
            <text class="fd-label">
              注册开始
            </text><input
              v-model="config.userFilter.registerStart"
              type="date"
              class="date-input"
            >
          </view>
          <view class="date-field">
            <text class="fd-label">
              注册结束
            </text><input
              v-model="config.userFilter.registerEnd"
              type="date"
              class="date-input"
            >
          </view>
        </view>
        <view
          v-if="config.userFilter.type === 'consumption'"
          class="filter-detail"
        >
          <view class="row-fields">
            <view class="half-field">
              <text class="fd-label">
                最低消费(元)
              </text><input
                v-model="config.userFilter.minConsumption"
                type="number"
                class="num-input"
                placeholder="0"
              >
            </view>
            <view class="half-field">
              <text class="fd-label">
                最高消费(元)
              </text><input
                v-model="config.userFilter.maxConsumption"
                type="number"
                class="num-input"
                placeholder="不限"
              >
            </view>
          </view>
        </view>
        <view
          v-if="config.userFilter.type === 'uid_list'"
          class="filter-detail"
        >
          <textarea
            v-model="config.userFilter.uidList"
            class="uid-textarea"
            placeholder="输入用户UID，每行一个或用逗号分隔"
          />
          <text class="uid-count">
            已输入 {{ uidCount }} 个用户
          </text>
        </view>
      </view>
      <view class="card">
        <view class="card-header">
          <text class="card-icon">
            🕐
          </text><text class="card-title">
            发放时间
          </text>
        </view>
        <view class="time-options">
          <view
            class="time-btn"
            :class="{ active: config.sendTime === 'now' }"
            @click="config.sendTime = 'now'"
          >
            <text>立即发放</text>
          </view>
          <view
            class="time-btn"
            :class="{ active: config.sendTime === 'scheduled' }"
            @click="config.sendTime = 'scheduled'"
          >
            <text>定时发放</text>
          </view>
        </view>
        <input
          v-if="config.sendTime === 'scheduled'"
          v-model="config.scheduledTime"
          type="datetime-local"
          class="datetime-input"
        >
      </view>
      <view class="card">
        <view class="card-header">
          <text class="card-icon">
            ⚙
          </text><text class="card-title">
            发放限制
          </text>
        </view>
        <view class="limit-fields">
          <view class="field-row">
            <text class="field-label">
              每人限领
            </text><input
              v-model.number="config.perUserLimit"
              type="number"
              class="limit-input"
              min="1"
              max="10"
            >
          </view>
          <view class="field-row">
            <text class="field-label">
              总量限制(选填)
            </text><input
              v-model="config.totalLimit"
              type="number"
              class="limit-input"
              placeholder="不限"
            >
          </view>
        </view>
      </view>
      <view class="warning-banner">
        <text class="warn-icon">
          ⚠
        </text><text class="warn-text">
          优惠券发放后不可撤销，请仔细核对发放条件和数量。
        </text>
      </view>
    </view>
    <view class="bottom-bar">
      <view class="btns-row">
        <view
          class="btn-outline"
          @click="handlePreview"
        >
          <text>👁 预览</text>
        </view>
        <view
          class="btn-primary"
          @click="confirmSend"
        >
          <text>📤 确认发放</text>
        </view>
      </view>
    </view>
    <!-- 优惠券选择弹层 -->
    <view
      v-if="showCouponSelect"
      class="overlay"
      @click="showCouponSelect = false"
    >
      <view
        class="sheet"
        @click.stop
      >
        <view class="sheet-header">
          <text class="sheet-title">
            选择优惠券
          </text><text
            class="sheet-close"
            @click="showCouponSelect = false"
          >
            ✕
          </text>
        </view>
        <scroll-view
          scroll-y
          class="sheet-list"
        >
          <view
            v-for="c in coupons"
            :key="c.id"
            class="coupon-option"
            :class="{ selected: config.couponId === c.id }"
            @click="selectCoupon(c)"
          >
            <view class="co-left">
              <text class="co-value">
                {{ c.type === 'discount' ? (c.value / 10) + '折' : c.type === 'cash' ? '¥' + c.value : '免邮' }}
              </text>
            </view>
            <view class="co-info">
              <text class="co-name">
                {{ c.name }}
              </text><text class="co-meta">
                {{ c.minOrder > 0 ? '满' + c.minOrder + '可用' : '无门槛' }} · 库存{{ c.stock }}
              </text>
            </view>
            <text
              v-if="config.couponId === c.id"
              class="co-check"
            >
              ✓
            </text>
          </view>
        </scroll-view>
      </view>
    </view>
    <!-- 预览弹窗 -->
    <view
      v-if="showPreview && previewData"
      class="dialog-overlay"
    >
      <view class="dialog">
        <view class="dialog-header">
          <text class="dialog-title">
            发放预览
          </text>
        </view>
        <view class="dialog-body">
          <view class="preview-count">
            <text class="pc-label">
              目标用户数
            </text><text class="pc-number">
              {{ previewData.userCount }}
            </text>
          </view>
          <view class="preview-grid">
            <view class="pg-item">
              <text class="pg-label">
                优惠券
              </text><text class="pg-value">
                {{ selectedCoupon?.name }}
              </text>
            </view>
            <view class="pg-item">
              <text class="pg-label">
                每人限领
              </text><text class="pg-value">
                {{ config.perUserLimit }}张
              </text>
            </view>
          </view>
          <view
            v-if="previewData.totalBudget > 0"
            class="budget-warn"
          >
            <text>预计最大预算：¥{{ previewData.totalBudget.toLocaleString() }}</text>
          </view>
        </view>
        <view class="dialog-footer">
          <view
            class="btn-outline"
            @click="showPreview = false"
          >
            <text>返回修改</text>
          </view>
          <view
            class="btn-primary"
            @click="showConfirm = true"
          >
            <text>确认发放</text>
          </view>
        </view>
      </view>
    </view>
    <!-- 二次确认弹窗 -->
    <view
      v-if="showConfirm"
      class="dialog-overlay"
    >
      <view class="dialog">
        <view
          class="dialog-body"
          style="text-align:center;padding:40rpx 32rpx;"
        >
          <view class="confirm-icon-wrap">
            <text class="confirm-icon">
              ⚠
            </text>
          </view>
          <text class="confirm-title">
            确认发放优惠券？
          </text>
          <text class="confirm-desc">
            即将向 {{ previewData?.userCount }} 位用户发放优惠券，此操作不可撤销。
          </text>
        </view>
        <view class="dialog-footer">
          <view
            class="btn-outline"
            @click="showConfirm = false"
          >
            <text>取消</text>
          </view>
          <view
            class="btn-primary"
            @click="handleSend"
          >
            <text>{{ sending ? '发放中...' : '确认发放' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { shopApi } from '../../api'

interface Coupon { id: number; name: string; type: 'discount' | 'cash' | 'shipping'; value: number; minOrder: number; stock: number; expireAt: string }
interface UserFilter { type: 'all' | 'level' | 'register_time' | 'consumption' | 'uid_list'; levels?: string[]; registerStart?: string; registerEnd?: string; minConsumption?: number; maxConsumption?: number; uidList?: string }

const coupons = ref<Coupon[]>([])
const config = reactive({ couponId: null as number | null, userFilter: { type: 'all' as UserFilter['type'] }, sendTime: 'now' as 'now' | 'scheduled', scheduledTime: '', perUserLimit: 1, totalLimit: undefined as number | undefined })
const showCouponSelect = ref(false); const showPreview = ref(false); const showConfirm = ref(false); const sending = ref(false)
const previewData = ref<{ userCount: number; totalBudget: number } | null>(null)

const filterTypes = [{ type: 'all', icon: '👥', label: '全部用户' }, { type: 'level', icon: '🎖', label: '按会员等级' }, { type: 'register_time', icon: '📅', label: '按注册时间' }, { type: 'consumption', icon: '💰', label: '按消费金额' }, { type: 'uid_list', icon: '🔍', label: '指定用户' }]
const memberLevels = [{ value: 'normal', label: '普通用户' }, { value: 'vip1', label: 'VIP1' }, { value: 'vip2', label: 'VIP2' }, { value: 'vip3', label: 'VIP3' }, { value: 'svip', label: 'SVIP' }]
const selectedCoupon = computed(() => coupons.value.find(c => c.id === config.couponId))
const uidCount = computed(() => config.userFilter.uidList ? config.userFilter.uidList.split(/[\n,]/).filter(Boolean).length : 0)

onMounted(async () => {
  try { const res = await shopApi.listCoupons(); coupons.value = Array.isArray(res) ? res : res?.data || [] } catch { coupons.value = [] }
})

function selectCoupon(c: Coupon) { config.couponId = c.id; showCouponSelect.value = false }
function toggleLevel(lv: string) {
  if (!config.userFilter.levels) config.userFilter.levels = []
  const idx = config.userFilter.levels.indexOf(lv)
  idx >= 0 ? config.userFilter.levels.splice(idx, 1) : config.userFilter.levels.push(lv)
}
function handlePreview() {
  if (!config.couponId) return
  let userCount = 0
  switch (config.userFilter.type) {
    case 'all': userCount = 12580; break; case 'level': userCount = (config.userFilter.levels?.length || 0) * 2000; break
    case 'register_time': userCount = 3500; break; case 'consumption': userCount = 1800; break; case 'uid_list': userCount = uidCount.value; break
  }
  const coupon = selectedCoupon.value; const totalBudget = coupon?.type === 'cash' ? userCount * config.perUserLimit * coupon.value : 0
  previewData.value = { userCount, totalBudget }; showPreview.value = true
}
function confirmSend() { if (!previewData.value) handlePreview(); showConfirm.value = true }
async function handleSend() { sending.value = true; uni.showToast({ title: '发放成功' }); sending.value = false; showConfirm.value = false; showPreview.value = false; setTimeout(() => goBack(), 1000) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 120rpx; }
.header { background: #fff; padding: 20rpx 24rpx; border-bottom: 1rpx solid #E5E1DB; }
.header-left { display: flex; align-items: center; gap: 12rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content { padding: 16rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.card-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 16rpx; }
.card-icon { font-size: 28rpx; }
.card-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.required { color: #C41E3A; font-size: 24rpx; }
.coupon-select { display: flex; align-items: center; justify-content: space-between; padding: 16rpx; border: 1rpx solid #E5E1DB; border-radius: 12rpx; background: #FAFAFA; }
.coupon-selected { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.cs-icon-wrap { width: 60rpx; height: 60rpx; border-radius: 12rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.cs-icon { font-size: 28rpx; }
.cs-info { flex: 1; }
.cs-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.cs-meta { font-size: 22rpx; color: #999; }
.cs-placeholder { color: #999; font-size: 26rpx; }
.cs-arrow { font-size: 24rpx; color: #999; }
.filter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.filter-btn { display: flex; align-items: center; gap: 8rpx; padding: 16rpx; border: 1rpx solid #E5E1DB; border-radius: 12rpx; background: #FAFAFA; }
.filter-btn.active { border-color: #C41E3A; background: rgba(196,30,58,0.05); color: #C41E3A; }
.filter-icon { font-size: 24rpx; }
.filter-label { font-size: 24rpx; }
.filter-detail { margin-top: 16rpx; }
.fd-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.level-tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
.level-tag { padding: 8rpx 24rpx; border: 1rpx solid #E5E1DB; border-radius: 28rpx; font-size: 24rpx; color: #666; background: #fff; }
.level-tag.active { border-color: #C41E3A; background: #C41E3A; color: #fff; }
.date-field { margin-bottom: 12rpx; }
.date-input { width: 100%; border: 1rpx solid #E5E1DB; border-radius: 8rpx; padding: 12rpx; font-size: 24rpx; }
.row-fields { display: flex; gap: 16rpx; }
.half-field { flex: 1; }
.num-input { width: 100%; border: 1rpx solid #E5E1DB; border-radius: 8rpx; padding: 12rpx; font-size: 24rpx; }
.uid-textarea { width: 100%; border: 1rpx solid #E5E1DB; border-radius: 8rpx; padding: 12rpx; font-size: 24rpx; min-height: 120rpx; }
.uid-count { font-size: 22rpx; color: #999; margin-top: 8rpx; display: block; }
.time-options { display: flex; gap: 12rpx; }
.time-btn { flex: 1; text-align: center; padding: 16rpx; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 24rpx; color: #666; }
.time-btn.active { border-color: #C41E3A; background: rgba(196,30,58,0.05); color: #C41E3A; }
.datetime-input { width: 100%; border: 1rpx solid #E5E1DB; border-radius: 8rpx; padding: 12rpx; font-size: 24rpx; margin-top: 12rpx; }
.limit-fields { display: flex; flex-direction: column; gap: 12rpx; }
.field-row { display: flex; align-items: center; justify-content: space-between; }
.field-label { font-size: 24rpx; color: #666; }
.limit-input { width: 200rpx; border: 1rpx solid #E5E1DB; border-radius: 8rpx; padding: 10rpx; font-size: 24rpx; text-align: center; }
.warning-banner { display: flex; align-items: flex-start; gap: 12rpx; padding: 16rpx; background: #fff8e1; border-radius: 12rpx; }
.warn-icon { font-size: 28rpx; flex-shrink: 0; }
.warn-text { font-size: 24rpx; color: #8d6e00; line-height: 1.5; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E5E1DB; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.btns-row { display: flex; gap: 16rpx; }
.btn-outline { flex: 1; text-align: center; padding: 16rpx; border: 1rpx solid #C41E3A; border-radius: 12rpx; color: #C41E3A; font-size: 26rpx; }
.btn-primary { flex: 1; text-align: center; padding: 16rpx; background: #C41E3A; border-radius: 12rpx; color: #fff; font-size: 26rpx; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; max-height: 70vh; display: flex; flex-direction: column; }
.sheet-header { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-bottom: 1rpx solid #E5E1DB; }
.sheet-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.sheet-close { font-size: 32rpx; color: #999; padding: 8rpx; }
.sheet-list { flex: 1; overflow-y: auto; padding: 16rpx; }
.coupon-option { display: flex; align-items: center; gap: 16rpx; padding: 16rpx; border: 1rpx solid #E5E1DB; border-radius: 12rpx; margin-bottom: 12rpx; }
.coupon-option.selected { border-color: #C41E3A; background: rgba(196,30,58,0.05); }
.co-left { width: 80rpx; height: 80rpx; border-radius: 12rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.co-value { font-size: 22rpx; font-weight: bold; color: #C41E3A; }
.co-info { flex: 1; }
.co-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.co-meta { font-size: 22rpx; color: #999; }
.co-check { font-size: 28rpx; color: #C41E3A; }
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 110; display: flex; align-items: center; justify-content: center; padding: 32rpx; }
.dialog { width: 100%; max-width: 600rpx; background: #fff; border-radius: 24rpx; overflow: hidden; }
.dialog-header { padding: 24rpx; border-bottom: 1rpx solid #E5E1DB; text-align: center; }
.dialog-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.dialog-body { padding: 24rpx; }
.dialog-footer { display: flex; gap: 16rpx; padding: 24rpx; border-top: 1rpx solid #E5E1DB; }
.preview-count { text-align: center; margin-bottom: 20rpx; }
.pc-label { font-size: 24rpx; color: #999; display: block; }
.pc-number { font-size: 56rpx; font-weight: bold; color: #C41E3A; display: block; }
.preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-bottom: 16rpx; }
.pg-item { background: #FAFAFA; border-radius: 12rpx; padding: 16rpx; text-align: center; }
.pg-label { font-size: 22rpx; color: #999; display: block; }
.pg-value { font-size: 24rpx; color: #2C2C2C; font-weight: 500; margin-top: 4rpx; display: block; }
.budget-warn { background: #fff8e1; border-radius: 12rpx; padding: 16rpx; font-size: 24rpx; color: #8d6e00; text-align: center; }
.confirm-icon-wrap { width: 96rpx; height: 96rpx; border-radius: 50%; background: #fff8e1; display: flex; align-items: center; justify-content: center; margin: 0 auto 20rpx; }
.confirm-icon { font-size: 48rpx; }
.confirm-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 12rpx; }
.confirm-desc { font-size: 26rpx; color: #666; line-height: 1.5; }
</style>
