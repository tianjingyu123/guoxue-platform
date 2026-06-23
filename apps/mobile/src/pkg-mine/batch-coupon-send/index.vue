<template>
  <view class="coupon-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="chevron-left" :size="40" color="#1a1a1a" />
      </view>
      <text class="nav-title">批量发放优惠券</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="body">
      <view class="skeleton skel-card" />
      <view class="skeleton skel-card-lg" />
      <view class="skeleton skel-card-md" />
    </view>

    <view v-else class="body">
      <!-- 选择优惠券 -->
      <view class="section">
        <view class="section-head">
          <AppIcon name="ticket" :size="36" color="#c41e3a" />
          <text class="section-title">选择优惠券</text>
          <text class="required">*</text>
        </view>
        <view class="select-row" @tap="showCouponSelect = true">
          <view v-if="selectedCoupon" class="selected-coupon">
            <view class="coupon-icon">
              <AppIcon name="ticket" :size="34" color="#c41e3a" />
            </view>
            <view class="coupon-text">
              <text class="coupon-name">{{ selectedCoupon.name }}</text>
              <text class="coupon-meta">库存 {{ selectedCoupon.stock }} | 有效期至 {{ selectedCoupon.expireAt }}</text>
            </view>
          </view>
          <text v-else class="select-placeholder">请选择要发放的优惠券</text>
          <AppIcon name="chevron-down" :size="32" color="#9a8a78" />
        </view>
      </view>

      <!-- 目标用户 -->
      <view class="section">
        <view class="section-head">
          <AppIcon name="target" :size="36" color="#c41e3a" />
          <text class="section-title">目标用户</text>
        </view>
        <view class="filter-grid">
          <view
            v-for="item in filterOptions"
            :key="item.type"
            class="filter-opt"
            :class="{ active: config.userFilter.type === item.type }"
            @tap="setFilterType(item.type)"
          >
            <AppIcon :name="item.icon" :size="28" :color="config.userFilter.type === item.type ? '#c41e3a' : '#6b6055'" />
            <text class="filter-opt-text" :class="{ active: config.userFilter.type === item.type }">{{ item.label }}</text>
          </view>
        </view>

        <!-- 按会员等级 -->
        <view v-if="config.userFilter.type === 'level'" class="filter-detail">
          <text class="detail-label">选择会员等级</text>
          <view class="level-list">
            <view
              v-for="lv in memberLevels"
              :key="lv.value"
              class="level-chip"
              :class="{ active: (config.userFilter.levels || []).includes(lv.value) }"
              @tap="toggleLevel(lv.value)"
            >
              <text class="level-chip-text" :class="{ active: (config.userFilter.levels || []).includes(lv.value) }">{{ lv.label }}</text>
            </view>
          </view>
        </view>

        <!-- 按注册时间 -->
        <view v-if="config.userFilter.type === 'register_time'" class="filter-detail">
          <view class="field">
            <text class="field-label">注册开始日期</text>
            <picker mode="date" :value="config.userFilter.registerStart" @change="onDateChange('registerStart', $event)">
              <view class="picker-box">
                <text class="picker-text" :class="{ ph: !config.userFilter.registerStart }">{{ config.userFilter.registerStart || '请选择日期' }}</text>
                <AppIcon name="calendar" :size="28" color="#9a8a78" />
              </view>
            </picker>
          </view>
          <view class="field">
            <text class="field-label">注册结束日期</text>
            <picker mode="date" :value="config.userFilter.registerEnd" @change="onDateChange('registerEnd', $event)">
              <view class="picker-box">
                <text class="picker-text" :class="{ ph: !config.userFilter.registerEnd }">{{ config.userFilter.registerEnd || '请选择日期' }}</text>
                <AppIcon name="calendar" :size="28" color="#9a8a78" />
              </view>
            </picker>
          </view>
        </view>

        <!-- 按消费金额 -->
        <view v-if="config.userFilter.type === 'consumption'" class="filter-detail">
          <view class="two-col">
            <view class="field">
              <text class="field-label">最低消费(元)</text>
              <input class="input" type="number" placeholder="0" :value="config.userFilter.minConsumption || ''" @input="onNumInput('minConsumption', $event)" />
            </view>
            <view class="field">
              <text class="field-label">最高消费(元)</text>
              <input class="input" type="number" placeholder="不限" :value="config.userFilter.maxConsumption || ''" @input="onNumInput('maxConsumption', $event)" />
            </view>
          </view>
        </view>

        <!-- 指定用户 -->
        <view v-if="config.userFilter.type === 'uid_list'" class="filter-detail">
          <text class="field-label">输入用户UID（每行一个或用逗号分隔）</text>
          <textarea
            class="textarea"
            placeholder="例如：&#10;10001&#10;10002&#10;10003"
            :value="config.userFilter.uidList || ''"
            @input="onUidInput"
          />
          <text class="uid-count">已输入 {{ uidCount }} 个用户</text>
        </view>
      </view>

      <!-- 发放时间 -->
      <view class="section">
        <view class="section-head">
          <AppIcon name="clock" :size="36" color="#c41e3a" />
          <text class="section-title">发放时间</text>
        </view>
        <view class="seg-row">
          <view class="seg-btn" :class="{ active: config.sendTime === 'now' }" @tap="config.sendTime = 'now'">
            <text class="seg-text" :class="{ active: config.sendTime === 'now' }">立即发放</text>
          </view>
          <view class="seg-btn" :class="{ active: config.sendTime === 'scheduled' }" @tap="config.sendTime = 'scheduled'">
            <text class="seg-text" :class="{ active: config.sendTime === 'scheduled' }">定时发放</text>
          </view>
        </view>
        <picker v-if="config.sendTime === 'scheduled'" mode="date" :value="config.scheduledTime" @change="onScheduledChange">
          <view class="picker-box mt">
            <text class="picker-text" :class="{ ph: !config.scheduledTime }">{{ config.scheduledTime || '请选择发放日期' }}</text>
            <AppIcon name="calendar" :size="28" color="#9a8a78" />
          </view>
        </picker>
      </view>

      <!-- 发放限制 -->
      <view class="section">
        <view class="section-head">
          <AppIcon name="filter" :size="36" color="#c41e3a" />
          <text class="section-title">发放限制</text>
        </view>
        <view class="field">
          <text class="field-label">每人限领数量</text>
          <input class="input" type="number" :value="config.perUserLimit" @input="onPerUserInput" />
        </view>
        <view class="field">
          <text class="field-label">发放总量限制（选填）</text>
          <input class="input" type="number" placeholder="不限" :value="config.totalLimit || ''" @input="onTotalInput" />
        </view>
      </view>

      <!-- 提示 -->
      <view class="warn-box">
        <AppIcon name="alert-triangle" :size="28" color="#d97706" />
        <text class="warn-text">优惠券发放后不可撤销，请仔细核对发放条件和数量。大批量发放可能需要较长时间处理。</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="!loading" class="footer">
      <view class="footer-btn outline" :class="{ disabled: !config.couponId }" @tap="handlePreview">
        <AppIcon name="eye" :size="30" :color="config.couponId ? '#c41e3a' : '#b3a695'" />
        <text class="footer-btn-text" :class="{ disabled: !config.couponId }">预览</text>
      </view>
      <view class="footer-btn primary" :class="{ disabled: !config.couponId }" @tap="onSendClick">
        <AppIcon name="send" :size="30" color="#fff" />
        <text class="footer-btn-text-primary">确认发放</text>
      </view>
    </view>

    <!-- 优惠券选择弹窗 -->
    <view v-if="showCouponSelect" class="modal-mask" @tap="showCouponSelect = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择优惠券</text>
          <view @tap="showCouponSelect = false"><AppIcon name="x" :size="34" color="#1a1a1a" /></view>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view
            v-for="c in coupons"
            :key="c.id"
            class="coupon-opt"
            :class="{ active: config.couponId === c.id }"
            @tap="selectCoupon(c.id)"
          >
            <view class="coupon-opt-icon">
              <text class="coupon-opt-val">{{ couponBadge(c) }}</text>
            </view>
            <view class="coupon-opt-info">
              <text class="coupon-opt-name">{{ c.name }}</text>
              <text class="coupon-opt-meta">{{ c.minOrder > 0 ? '满' + c.minOrder + '可用' : '无门槛' }} · 库存{{ c.stock }} · 至{{ c.expireAt }}</text>
            </view>
            <AppIcon v-if="config.couponId === c.id" name="check" :size="32" color="#c41e3a" />
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 预览弹窗 -->
    <view v-if="showPreview && previewData" class="modal-mask center" @tap="showPreview = false">
      <view class="dialog" @tap.stop>
        <view class="dialog-head"><text class="dialog-title">发放预览</text></view>
        <view class="dialog-body">
          <view class="preview-count">
            <text class="preview-label">目标用户数</text>
            <text class="preview-num">{{ previewData.userCount.toLocaleString() }}</text>
          </view>
          <view class="preview-grid">
            <view class="preview-cell">
              <text class="preview-cell-label">优惠券</text>
              <text class="preview-cell-val">{{ selectedCoupon?.name }}</text>
            </view>
            <view class="preview-cell">
              <text class="preview-cell-label">每人限领</text>
              <text class="preview-cell-val">{{ config.perUserLimit }}张</text>
            </view>
          </view>
          <view v-if="previewData.totalBudget > 0" class="preview-budget">
            <text class="budget-text">预计最大预算：<text class="budget-num">¥{{ previewData.totalBudget.toLocaleString() }}</text></text>
          </view>
          <view class="preview-info">
            <AppIcon name="info" :size="26" color="#9a8a78" />
            <text class="preview-info-text">实际发放数量取决于优惠券库存和用户是否已领取。</text>
          </view>
        </view>
        <view class="dialog-foot">
          <view class="dialog-btn outline" @tap="showPreview = false"><text class="dialog-btn-text">返回修改</text></view>
          <view class="dialog-btn primary" @tap="showConfirm = true"><text class="dialog-btn-text-primary">确认发放</text></view>
        </view>
      </view>
    </view>

    <!-- 二次确认弹窗 -->
    <view v-if="showConfirm" class="modal-mask center" @tap="!sending && (showConfirm = false)">
      <view class="dialog" @tap.stop>
        <view class="confirm-body">
          <view class="confirm-icon">
            <AppIcon name="alert-triangle" :size="56" color="#d97706" />
          </view>
          <text class="confirm-title">确认发放优惠券？</text>
          <text class="confirm-desc">即将向 <text class="confirm-num">{{ (previewData?.userCount || 0).toLocaleString() }}</text> 位用户发放优惠券，此操作不可撤销。</text>
        </view>
        <view class="dialog-foot">
          <view class="dialog-btn outline" :class="{ disabled: sending }" @tap="!sending && (showConfirm = false)"><text class="dialog-btn-text">取消</text></view>
          <view class="dialog-btn primary" :class="{ disabled: sending }" @tap="handleSend"><text class="dialog-btn-text-primary">{{ sending ? '发放中...' : '确认发放' }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

interface Coupon {
  id: number
  name: string
  type: 'discount' | 'cash' | 'shipping'
  value: number
  minOrder: number
  stock: number
  expireAt: string
}
type FilterType = 'all' | 'level' | 'register_time' | 'consumption' | 'uid_list'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const loading = ref(true)
const coupons = ref<Coupon[]>([])
const showCouponSelect = ref(false)
const showPreview = ref(false)
const showConfirm = ref(false)
const sending = ref(false)
const previewData = ref<{ userCount: number; totalBudget: number } | null>(null)

const config = reactive({
  couponId: null as number | null,
  userFilter: {
    type: 'all' as FilterType,
    levels: [] as string[],
    registerStart: '',
    registerEnd: '',
    minConsumption: undefined as number | undefined,
    maxConsumption: undefined as number | undefined,
    uidList: '',
  },
  sendTime: 'now' as 'now' | 'scheduled',
  scheduledTime: '',
  perUserLimit: 1,
  totalLimit: undefined as number | undefined,
})

const mockCoupons: Coupon[] = [
  { id: 1, name: '新人专享满100减20', type: 'cash', value: 20, minOrder: 100, stock: 1000, expireAt: '2026-07-31' },
  { id: 2, name: '会员8折优惠券', type: 'discount', value: 80, minOrder: 50, stock: 500, expireAt: '2026-06-30' },
  { id: 3, name: '满200减50大额券', type: 'cash', value: 50, minOrder: 200, stock: 200, expireAt: '2026-08-15' },
  { id: 4, name: '免运费券', type: 'shipping', value: 0, minOrder: 0, stock: 2000, expireAt: '2026-12-31' },
]

const memberLevels = [
  { value: 'normal', label: '普通用户' },
  { value: 'vip1', label: 'VIP1' },
  { value: 'vip2', label: 'VIP2' },
  { value: 'vip3', label: 'VIP3' },
  { value: 'svip', label: 'SVIP' },
]

const filterOptions: { type: FilterType; label: string; icon: string }[] = [
  { type: 'all', label: '全部用户', icon: 'users' },
  { type: 'level', label: '按会员等级', icon: 'gift' },
  { type: 'register_time', label: '按注册时间', icon: 'calendar' },
  { type: 'consumption', label: '按消费金额', icon: 'filter' },
  { type: 'uid_list', label: '指定用户', icon: 'search' },
]

const selectedCoupon = computed(() => coupons.value.find((c) => c.id === config.couponId))
const uidCount = computed(() => (config.userFilter.uidList.split(/[\n,]/).filter(Boolean) || []).length)

function couponBadge(c: Coupon) {
  return c.type === 'discount' ? `${c.value / 10}折` : c.type === 'cash' ? `¥${c.value}` : '免邮'
}

function setFilterType(t: FilterType) { config.userFilter.type = t }
function toggleLevel(v: string) {
  const levels = config.userFilter.levels
  const i = levels.indexOf(v)
  if (i >= 0) levels.splice(i, 1)
  else levels.push(v)
}
function onDateChange(key: 'registerStart' | 'registerEnd', e: any) { config.userFilter[key] = e.detail.value }
function onScheduledChange(e: any) { config.scheduledTime = e.detail.value }
function onNumInput(key: 'minConsumption' | 'maxConsumption', e: any) {
  const v = Number(e.detail.value)
  config.userFilter[key] = isNaN(v) || v === 0 ? undefined : v
}
function onUidInput(e: any) { config.userFilter.uidList = e.detail.value }
function onPerUserInput(e: any) {
  let v = Number(e.detail.value) || 1
  if (v < 1) v = 1
  if (v > 10) v = 10
  config.perUserLimit = v
}
function onTotalInput(e: any) {
  const v = Number(e.detail.value)
  config.totalLimit = isNaN(v) || v === 0 ? undefined : v
}

function selectCoupon(id: number) {
  config.couponId = id
  showCouponSelect.value = false
}

async function handlePreview() {
  if (!config.couponId) {
    uni.showToast({ title: '请先选择优惠券', icon: 'none' })
    return
  }
  await new Promise((r) => setTimeout(r, 400))
  let userCount = 0
  switch (config.userFilter.type) {
    case 'all': userCount = 12580; break
    case 'level': userCount = (config.userFilter.levels.length || 0) * 2000; break
    case 'register_time': userCount = 3500; break
    case 'consumption': userCount = 1800; break
    case 'uid_list': userCount = uidCount.value; break
  }
  const coupon = selectedCoupon.value
  const totalBudget = coupon?.type === 'cash' ? userCount * config.perUserLimit * coupon.value : 0
  previewData.value = { userCount, totalBudget }
  showPreview.value = true
}

function onSendClick() {
  if (!config.couponId) {
    uni.showToast({ title: '请先选择优惠券', icon: 'none' })
    return
  }
  if (!previewData.value) {
    handlePreview().then(() => { showConfirm.value = true })
  } else {
    showConfirm.value = true
  }
}

async function handleSend() {
  if (sending.value) return
  sending.value = true
  await new Promise((r) => setTimeout(r, 1500))
  sending.value = false
  showConfirm.value = false
  showPreview.value = false
  uni.showToast({ title: '发放任务已提交', icon: 'success' })
  setTimeout(() => goBack(), 800)
}

function goBack() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
}

onMounted(async () => {
  await new Promise((r) => setTimeout(r, 500))
  coupons.value = mockCoupons
  loading.value = false
})
</script>

<style lang="scss" scoped>
.coupon-page { min-height: 100vh; background: #f7f4ef; padding-bottom: 160rpx; }
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 16rpx;
  background: #fff;
  border-bottom: 1rpx solid #ece6dc;
}
.nav-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 56rpx; }
.body { padding: 24rpx; }

.skeleton { background: #ece6dc; border-radius: 16rpx; animation: pulse 1.4s ease-in-out infinite; margin-bottom: 24rpx; }
.skel-card { height: 160rpx; }
.skel-card-lg { height: 320rpx; }
.skel-card-md { height: 220rpx; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

.section { background: #fff; border-radius: 20rpx; border: 1rpx solid #ece6dc; padding: 28rpx; margin-bottom: 24rpx; }
.section-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #1a1a1a; }
.required { color: #c41e3a; font-size: 28rpx; }

.select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border: 1rpx solid #ece6dc;
  border-radius: 16rpx;
}
.selected-coupon { display: flex; align-items: center; gap: 20rpx; flex: 1; min-width: 0; }
.coupon-icon { width: 72rpx; height: 72rpx; border-radius: 16rpx; background: #fdf2f4; display: flex; align-items: center; justify-content: center; }
.coupon-text { flex: 1; min-width: 0; }
.coupon-name { display: block; font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.coupon-meta { font-size: 22rpx; color: #9a8a78; }
.select-placeholder { color: #b3a695; font-size: 28rpx; }

.filter-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.filter-opt {
  width: calc(50% - 8rpx);
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 22rpx;
  border: 1rpx solid #ece6dc;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.filter-opt.active { border-color: #c41e3a; background: #fdf2f4; }
.filter-opt-text { font-size: 26rpx; color: #6b6055; }
.filter-opt-text.active { color: #c41e3a; }

.filter-detail { margin-top: 24rpx; }
.detail-label { display: block; font-size: 26rpx; color: #9a8a78; margin-bottom: 16rpx; }
.level-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.level-chip { padding: 12rpx 28rpx; border: 1rpx solid #ece6dc; border-radius: 32rpx; }
.level-chip.active { border-color: #c41e3a; background: #c41e3a; }
.level-chip-text { font-size: 26rpx; color: #6b6055; }
.level-chip-text.active { color: #fff; }

.field { margin-bottom: 20rpx; }
.field-label { display: block; font-size: 26rpx; color: #9a8a78; margin-bottom: 10rpx; }
.two-col { display: flex; gap: 20rpx; }
.two-col .field { flex: 1; }
.input {
  width: 100%;
  height: 76rpx;
  padding: 0 24rpx;
  background: #f7f4ef;
  border: 1rpx solid #ece6dc;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1a1a1a;
  box-sizing: border-box;
}
.textarea {
  width: 100%;
  height: 180rpx;
  padding: 20rpx 24rpx;
  background: #f7f4ef;
  border: 1rpx solid #ece6dc;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1a1a1a;
  box-sizing: border-box;
}
.uid-count { display: block; font-size: 22rpx; color: #9a8a78; margin-top: 10rpx; }
.picker-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 76rpx;
  padding: 0 24rpx;
  background: #f7f4ef;
  border: 1rpx solid #ece6dc;
  border-radius: 12rpx;
}
.picker-box.mt { margin-top: 16rpx; }
.picker-text { font-size: 28rpx; color: #1a1a1a; }
.picker-text.ph { color: #b3a695; }

.seg-row { display: flex; gap: 16rpx; }
.seg-btn { flex: 1; padding: 18rpx 0; text-align: center; border: 1rpx solid #ece6dc; border-radius: 12rpx; }
.seg-btn.active { border-color: #c41e3a; background: #fdf2f4; }
.seg-text { font-size: 28rpx; color: #6b6055; }
.seg-text.active { color: #c41e3a; }

.warn-box { display: flex; align-items: flex-start; gap: 12rpx; padding: 20rpx; background: #fffbeb; border-radius: 16rpx; }
.warn-text { flex: 1; font-size: 24rpx; color: #92400e; line-height: 1.5; }

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #ece6dc;
}
.footer-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  height: 88rpx;
  border-radius: 16rpx;
}
.footer-btn.outline { border: 1rpx solid #f0c0c8; background: #fdf2f4; }
.footer-btn.primary { background: #c41e3a; }
.footer-btn.disabled { opacity: 0.5; }
.footer-btn-text { font-size: 30rpx; color: #c41e3a; }
.footer-btn-text.disabled { color: #b3a695; }
.footer-btn-text-primary { font-size: 30rpx; color: #fff; font-weight: 500; }

.modal-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.modal-mask.center { align-items: center; justify-content: center; padding: 0 48rpx; }
.sheet { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; max-height: 70vh; display: flex; flex-direction: column; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx; border-bottom: 1rpx solid #ece6dc; }
.sheet-title { font-size: 32rpx; font-weight: 600; color: #1a1a1a; }
.sheet-body { padding: 24rpx; max-height: 56vh; }
.coupon-opt {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border: 1rpx solid #ece6dc;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}
.coupon-opt.active { border-color: #c41e3a; background: #fdf2f4; }
.coupon-opt-icon { width: 88rpx; height: 88rpx; border-radius: 16rpx; background: #fdf2f4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.coupon-opt-val { font-size: 28rpx; font-weight: 700; color: #c41e3a; }
.coupon-opt-info { flex: 1; min-width: 0; }
.coupon-opt-name { display: block; font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.coupon-opt-meta { font-size: 22rpx; color: #9a8a78; }

.dialog { width: 100%; max-width: 600rpx; background: #fff; border-radius: 28rpx; overflow: hidden; }
.dialog-head { padding: 28rpx; border-bottom: 1rpx solid #ece6dc; }
.dialog-title { font-size: 32rpx; font-weight: 600; color: #1a1a1a; text-align: center; display: block; }
.dialog-body { padding: 40rpx; }
.preview-count { text-align: center; margin-bottom: 28rpx; }
.preview-label { display: block; font-size: 26rpx; color: #9a8a78; margin-bottom: 8rpx; }
.preview-num { font-size: 60rpx; font-weight: 700; color: #c41e3a; }
.preview-grid { display: flex; gap: 20rpx; margin-bottom: 24rpx; }
.preview-cell { flex: 1; text-align: center; padding: 20rpx; background: #f7f4ef; border-radius: 12rpx; }
.preview-cell-label { display: block; font-size: 22rpx; color: #9a8a78; margin-bottom: 6rpx; }
.preview-cell-val { font-size: 26rpx; font-weight: 500; color: #1a1a1a; }
.preview-budget { text-align: center; padding: 20rpx; background: #fffbeb; border-radius: 12rpx; margin-bottom: 20rpx; }
.budget-text { font-size: 26rpx; color: #92400e; }
.budget-num { font-weight: 700; }
.preview-info { display: flex; align-items: flex-start; gap: 10rpx; }
.preview-info-text { flex: 1; font-size: 22rpx; color: #9a8a78; line-height: 1.5; }

.confirm-body { padding: 48rpx 40rpx 32rpx; text-align: center; }
.confirm-icon { width: 112rpx; height: 112rpx; margin: 0 auto 28rpx; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.confirm-title { display: block; font-size: 34rpx; font-weight: 600; color: #1a1a1a; margin-bottom: 16rpx; }
.confirm-desc { font-size: 26rpx; color: #6b6055; line-height: 1.6; }
.confirm-num { color: #c41e3a; font-weight: 600; }

.dialog-foot { display: flex; gap: 20rpx; padding: 24rpx; border-top: 1rpx solid #ece6dc; }
.dialog-btn { flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center; border-radius: 14rpx; }
.dialog-btn.outline { border: 1rpx solid #ece6dc; background: #fff; }
.dialog-btn.primary { background: #c41e3a; }
.dialog-btn.disabled { opacity: 0.6; }
.dialog-btn-text { font-size: 28rpx; color: #6b6055; }
.dialog-btn-text-primary { font-size: 28rpx; color: #fff; font-weight: 500; }
</style>
