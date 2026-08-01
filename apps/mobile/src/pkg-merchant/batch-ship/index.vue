<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="back">
          <AppIcon name="arrow-left" :size="20" color="#fff" />
        </view>
        <view class="nav-copy">
          <text class="nav-title">批量发货</text>
          <text class="nav-sub">一批一承运商，逐件核对运单</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: statusBarH + 64 + 'px' }">
      <view class="content">
        <view class="manifest">
          <view>
            <text class="manifest-eyebrow">今日出库清单</text>
            <text class="manifest-count">{{ orders.length }}<text> 件待发</text></text>
          </view>
          <view class="manifest-progress">
            <text>{{ readyCount }}/{{ selectedIds.length || 0 }}</text>
            <text class="manifest-progress-label">已选件中运单就绪</text>
          </view>
        </view>

        <view class="carrier-card">
          <view class="section-head">
            <text class="section-title">本批承运商</text>
            <text class="section-note">将应用到本次勾选订单</text>
          </view>
          <scroll-view scroll-x class="carrier-scroll" :show-scrollbar="false">
            <view class="carrier-row">
              <view
                v-for="company in expressCompanies"
                :key="company"
                class="carrier-chip"
                :class="{ active: selectedCompany === company }"
                @tap="selectedCompany = company"
              >
                <text>{{ company }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view v-if="loading" class="state"><text>正在整理待发货订单…</text></view>
        <view v-else-if="error" class="state state-error">
          <text>{{ error }}</text>
          <view class="retry" @tap="load"><text>重新加载</text></view>
        </view>
        <view v-else-if="orders.length === 0" class="empty">
          <view class="empty-icon"><AppIcon name="check-circle" :size="34" color="#C9A96E" /></view>
          <text class="empty-title">待发订单已清空</text>
          <text class="empty-sub">新的已付款订单会自动进入这里。</text>
        </view>

        <view v-else class="parcel-list">
          <view
            v-for="(order, index) in orders"
            :key="order.id"
            class="parcel"
            :class="{ selected: isSelected(order.id) }"
            @tap="toggle(order.id)"
          >
            <view class="parcel-index">
              <text class="parcel-index-word">件</text>
              <text class="parcel-index-no">{{ String(index + 1).padStart(2, '0') }}</text>
            </view>

            <view class="parcel-main">
              <view class="parcel-top">
                <view class="check" :class="{ checked: isSelected(order.id) }">
                  <text v-if="isSelected(order.id)">✓</text>
                </view>
                <text class="order-no">{{ order.id }}</text>
              </view>
              <view class="goods-row">
                <image v-if="order.productImage" class="goods-img" :src="order.productImage" mode="aspectFill" />
                <view v-else class="goods-img goods-placeholder">
                  <AppIcon name="package" :size="20" color="#A8977E" />
                </view>
                <view class="goods-copy">
                  <text class="goods-title">{{ order.productTitle || '商品' }}</text>
                  <text class="buyer">收件人 {{ order.buyerNickname || '用户' }}</text>
                </view>
              </view>
              <view class="tracking-field" :class="{ ready: trackingMap[order.id]?.trim() }" @tap.stop>
                <text class="tracking-label">运单号</text>
                <input
                  v-model="trackingMap[order.id]"
                  class="tracking-input"
                  placeholder="扫描或输入运单号"
                  placeholder-class="tracking-placeholder"
                  @focus="ensureSelected(order.id)"
                />
              </view>
            </view>
          </view>
        </view>

        <view class="scroll-space" />
      </view>
    </scroll-view>

    <view v-if="orders.length" class="bottom" :style="footStyle">
      <view class="bottom-copy">
        <text class="bottom-main">已选 {{ selectedIds.length }} 件</text>
        <text class="bottom-sub">{{ selectedCompany || '请选择承运商' }}</text>
      </view>
      <view class="submit" :class="{ disabled: !canSubmit || submitting }" @tap="confirmSubmit">
        <AppIcon name="truck" :size="17" color="#fff" />
        <text>{{ submitting ? '正在发货…' : `确认发货 ${readyCount} 件` }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import {
  expressCompanies,
  merchantBackendApi,
  type MerchantOrder,
} from '@/pkg-merchant/lib/merchant-data'

const statusBarH = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarH.value = e.statusBarHeight || 0 } })

const orders = ref<MerchantOrder[]>([])
const selectedIds = ref<string[]>([])
const trackingMap = reactive<Record<string, string>>({})
const selectedCompany = ref('')
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const footStyle = 'padding-bottom: calc(18rpx + env(safe-area-inset-bottom));'

const readyCount = computed(() => selectedIds.value.filter((id) => Boolean(trackingMap[id]?.trim())).length)
const canSubmit = computed(() => Boolean(
  selectedCompany.value
  && selectedIds.value.length
  && readyCount.value === selectedIds.value.length,
))

onShow(() => { load() })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantBackendApi.getOrders({ status: 'PAID', page: 1, pageSize: 50 })
    orders.value = res.items
    const available = new Set(res.items.map((item) => item.id))
    selectedIds.value = selectedIds.value.filter((id) => available.has(id))
  } catch (e) {
    error.value = (e as Error)?.message || '待发货订单加载失败'
  } finally {
    loading.value = false
  }
}

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}

function toggle(id: string) {
  selectedIds.value = isSelected(id)
    ? selectedIds.value.filter((item) => item !== id)
    : [...selectedIds.value, id]
}

function ensureSelected(id: string) {
  if (!isSelected(id)) selectedIds.value = [...selectedIds.value, id]
}

function confirmSubmit() {
  if (!canSubmit.value || submitting.value) {
    const title = !selectedIds.value.length
      ? '请先勾选要发货的订单'
      : !selectedCompany.value
        ? '请选择本批承运商'
        : '请补全已选订单的运单号'
    uni.showToast({ title, icon: 'none' })
    return
  }
  uni.showModal({
    title: `确认发货 ${selectedIds.value.length} 件`,
    content: `承运商：${selectedCompany.value}\n提交后买家将看到物流信息，请再次核对运单号。`,
    confirmText: '确认发货',
    confirmColor: '#C41E3A',
    success: (res) => { if (res.confirm) void submit() },
  })
}

async function submit() {
  submitting.value = true
  try {
    const ids = [...selectedIds.value]
    const result = await merchantBackendApi.batchShipOrders(ids.map((orderId) => ({
      orderId,
      company: selectedCompany.value,
      trackingNo: trackingMap[orderId].trim(),
    })))
    const failed = result.items.filter((item) => !item.success)
    await load()
    selectedIds.value = failed.map((item) => item.orderId)
    if (!failed.length) {
      uni.showToast({ title: `已发货 ${result.successCount} 件`, icon: 'success' })
      return
    }
    uni.showModal({
      title: `成功 ${result.successCount} 件，失败 ${result.failedCount} 件`,
      content: failed.slice(0, 5).map((item) => `${item.orderId.slice(-8)}：${item.message || '处理失败'}`).join('\n'),
      showCancel: false,
      confirmText: '继续处理',
    })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '批量发货失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function back() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pkg-merchant/orders/index?status=PAID' }) })
}
</script>

<style lang="scss" scoped>
$paper: #f7f3ed;
$card: #fffdf9;
$ink: #292621;
$muted: #766e63;
$line: #e5ddd1;
$red: #c41e3a;
$red-dark: #9f172d;
$gold: #c6a15b;

.page { min-height: 100vh; background: $paper; color: $ink; }
.nav { position: fixed; inset: 0 0 auto; z-index: 50; background: linear-gradient(125deg, $red, $red-dark); }
.nav-inner { height: 64px; display: flex; align-items: center; padding: 0 28rpx 0 20rpx; }
.nav-back { width: 58rpx; height: 48px; display: flex; align-items: center; }
.nav-copy { display: flex; flex-direction: column; gap: 3px; }
.nav-title { color: #fff; font-size: 18px; font-weight: 750; letter-spacing: 1px; }
.nav-sub { color: rgba(255,255,255,.72); font-size: 10px; letter-spacing: .5px; }
.scroll { height: 100vh; box-sizing: border-box; }
.content { padding: 28rpx 28rpx 0; }

.manifest { position: relative; overflow: hidden; display: flex; align-items: flex-end; justify-content: space-between; min-height: 150rpx; padding: 30rpx 32rpx; background: $ink; border-radius: 8px 8px 24px 8px; box-sizing: border-box; box-shadow: 0 12rpx 32rpx rgba(56,42,27,.12); }
.manifest::after { content: ''; position: absolute; right: -34rpx; top: -50rpx; width: 150rpx; height: 150rpx; border: 1px solid rgba(198,161,91,.38); border-radius: 50%; box-shadow: 0 0 0 22rpx rgba(198,161,91,.06); }
.manifest-eyebrow { display: block; color: $gold; font-size: 11px; letter-spacing: 4rpx; }
.manifest-count { display: block; margin-top: 10rpx; color: #fff; font-size: 34px; font-family: 'STKaiti','KaiTi',serif; line-height: 1; }
.manifest-count text { font-size: 13px; color: rgba(255,255,255,.7); }
.manifest-progress { position: relative; z-index: 1; text-align: right; }
.manifest-progress > text:first-child { display: block; color: #fff; font-size: 20px; font-weight: 700; }
.manifest-progress-label { display: block; margin-top: 6rpx; color: rgba(255,255,255,.56); font-size: 10px; }

.carrier-card { margin-top: 24rpx; padding: 26rpx 0 24rpx 26rpx; background: $card; border: 1px solid $line; border-radius: 18px; }
.section-head { display: flex; align-items: baseline; padding-right: 26rpx; }
.section-title { font-size: 15px; font-weight: 700; }
.section-note { margin-left: auto; color: $muted; font-size: 10px; }
.carrier-scroll { margin-top: 20rpx; width: 100%; white-space: nowrap; }
.carrier-row { display: inline-flex; gap: 14rpx; padding-right: 26rpx; }
.carrier-chip { flex-shrink: 0; padding: 14rpx 22rpx; border: 1px solid $line; border-radius: 999px; background: #fff; }
.carrier-chip text { color: $muted; font-size: 12px; }
.carrier-chip.active { background: $red; border-color: $red; box-shadow: 0 6rpx 14rpx rgba(196,30,58,.18); }
.carrier-chip.active text { color: #fff; font-weight: 650; }

.parcel-list { margin-top: 24rpx; }
.parcel { display: flex; gap: 18rpx; margin-bottom: 18rpx; padding: 22rpx; background: $card; border: 1px solid $line; border-radius: 18px; transition: border-color .18s ease, box-shadow .18s ease; }
.parcel.selected { border-color: rgba(196,30,58,.52); box-shadow: 0 8rpx 24rpx rgba(94,59,42,.08); }
.parcel-index { width: 58rpx; height: 72rpx; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: $red; border: 1px solid rgba(196,30,58,.45); border-radius: 4px; }
.parcel-index-word { font-size: 9px; letter-spacing: 2rpx; }
.parcel-index-no { margin-top: 2rpx; font-size: 16px; font-weight: 800; }
.parcel-main { flex: 1; min-width: 0; }
.parcel-top { display: flex; align-items: center; }
.check { width: 32rpx; height: 32rpx; border: 1px solid #cfc4b5; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.check.checked { color: #fff; background: $red; border-color: $red; }
.check text { font-size: 10px; font-weight: 800; }
.order-no { margin-left: 12rpx; color: #9a9084; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goods-row { display: flex; align-items: center; gap: 16rpx; padding: 18rpx 0; }
.goods-img { width: 76rpx; height: 76rpx; flex-shrink: 0; border-radius: 10px; background: #eee6da; }
.goods-placeholder { display: flex; align-items: center; justify-content: center; }
.goods-copy { flex: 1; min-width: 0; }
.goods-title { display: block; font-size: 13px; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.buyer { display: block; margin-top: 7rpx; color: $muted; font-size: 10px; }
.tracking-field { display: flex; align-items: center; height: 72rpx; padding: 0 18rpx; border: 1px dashed #d8cdbc; border-radius: 12px; background: #faf7f2; box-sizing: border-box; }
.tracking-field.ready { border-style: solid; border-color: rgba(45,128,84,.42); background: #f4faf6; }
.tracking-label { flex-shrink: 0; color: $muted; font-size: 11px; }
.tracking-input { flex: 1; min-width: 0; margin-left: 18rpx; color: $ink; font-size: 13px; font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace; }
.tracking-placeholder { color: #b3aaa0; font-family: inherit; }

.state, .empty { margin-top: 24rpx; min-height: 280rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; color: $muted; font-size: 13px; }
.state-error { color: $red; }
.retry { margin-top: 20rpx; padding: 12rpx 28rpx; border: 1px solid $red; border-radius: 999px; }
.retry text { color: $red; font-size: 12px; }
.empty-icon { width: 92rpx; height: 92rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #efe7da; }
.empty-title { margin-top: 20rpx; color: $ink; font-size: 16px; font-weight: 700; }
.empty-sub { margin-top: 10rpx; color: $muted; font-size: 12px; }
.scroll-space { height: 190rpx; }

.bottom { position: fixed; left: 0; right: 0; bottom: 0; z-index: 45; display: flex; align-items: center; gap: 24rpx; padding: 18rpx 28rpx; background: rgba(255,253,249,.96); border-top: 1px solid $line; backdrop-filter: blur(14px); }
.bottom-copy { flex: 1; min-width: 0; }
.bottom-main { display: block; color: $ink; font-size: 14px; font-weight: 700; }
.bottom-sub { display: block; margin-top: 5rpx; color: $muted; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.submit { min-width: 280rpx; height: 82rpx; padding: 0 28rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; border-radius: 14px; background: $red; box-sizing: border-box; box-shadow: 0 9rpx 22rpx rgba(196,30,58,.22); }
.submit text { color: #fff; font-size: 13px; font-weight: 700; }
.submit.disabled { opacity: .42; box-shadow: none; }
</style>
