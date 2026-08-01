<!--
  B4 · 订单详情（V0 视觉稿 1:1 还原）
  态B 订单详情：状态横幅 + 收货信息(脱敏) + 商品清单 + 金额 + 订单信息 + 底部发货/售后操作
  规格红线：收货人信息脱敏；订单与售后状态分离；售后处理统一从消息中心进入
  视觉 token：宣纸白#FAF8F5 / 卡片白#FFF / 朱红#C41E3A / 金#C9A96E
-->
<template>
  <view class="page">
    <!-- 品牌头 -->
    <view class="nav" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="go('/merchant/orders')">
          <AppIcon name="arrow-left" :size="20" color="#ffffff" />
        </view>
        <text class="nav-title">订单详情</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: statusBarH + 48 + 'px' }">
      <!-- 加载态 -->
      <view v-if="loading" class="state">
        <text class="state-txt">加载中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="state">
        <AppIcon name="alert-circle" :size="44" color="#C41E3A" />
        <text class="state-title">加载失败</text>
        <text class="state-txt">{{ error }}</text>
        <view class="state-btn" @tap="load"><text>重试</text></view>
      </view>

      <template v-else-if="order">
        <view class="body">
          <!-- 状态横幅 -->
          <view class="status-banner">
            <text class="sb-t">{{ statusCfg[order.status].label }}</text>
            <text class="sb-d">{{ statusDesc }}</text>
          </view>

          <!-- 收货信息（脱敏·无则降级隐藏） -->
          <view v-if="shipping" class="card">
            <view class="card-h">
              <text class="card-h-ic">◈</text>
              <text class="card-h-t">收货信息</text>
            </view>
            <view v-if="shipping.name" class="kv">
              <text class="k">收货人</text>
              <text class="v">{{ shipping.name }}</text>
            </view>
            <view v-if="shipping.phone" class="kv">
              <text class="k">联系电话</text>
              <view class="v-copy">
                <text class="v">{{ shipping.phone }}</text>
                <view class="copy-btn" @tap="copy(shipping.phone)">
                  <AppIcon name="copy" :size="12" color="#6E6E73" />
                </view>
              </view>
            </view>
            <view v-if="addressText" class="kv">
              <text class="k">收货地址</text>
              <text class="v v-addr">{{ addressText }}</text>
            </view>
            <view class="mask-note">
              <text class="mask-note-txt">⚠ 收货人隐私已脱敏。打印面单时系统临时授权完整信息，商家后台不留存明文。</text>
            </view>
          </view>

          <!-- 商品清单 -->
          <view class="card">
            <view class="card-h">
              <text class="card-h-ic">◈</text>
              <text class="card-h-t">商品清单</text>
            </view>
            <view class="goods">
              <image
                v-if="order.productImage"
                class="goods-img"
                :src="order.productImage"
                mode="aspectFill"
                lazy-load
              />
              <view v-else class="goods-img goods-img-ph">
                <AppIcon name="package" :size="24" color="#B0A088" />
              </view>
              <view class="goods-info">
                <text class="goods-name">{{ order.productTitle || '商品' }}</text>
                <text class="goods-spec">{{ order.buyerNickname || '匿名买家' }}</text>
              </view>
              <view class="goods-price">
                <text class="goods-p">¥{{ amountText }}</text>
                <text class="goods-q">×1</text>
              </view>
            </view>
            <view class="kv kv-top">
              <text class="k">商品金额</text>
              <text class="v">¥{{ amountText }}</text>
            </view>
            <view class="kv">
              <text class="k">运费</text>
              <text class="v">¥0.00（包邮）</text>
            </view>
            <view class="kv">
              <text class="k">实付</text>
              <text class="v v-pay">¥{{ amountText }}</text>
            </view>
          </view>

          <!-- 贺卡任务（供-P2·归因订单才有，无则降级隐藏） -->
          <view v-if="giftCard" class="card gift-card">
            <view class="card-h">
              <text class="card-h-ic gift-ic">🎁</text>
              <text class="card-h-t">贺卡任务</text>
              <text class="gift-badge">发货请随包裹放入</text>
            </view>
            <view v-if="giftCard.fromName" class="kv">
              <text class="k">从业者署名</text>
              <text class="v">{{ giftCard.fromName }}</text>
            </view>
            <view v-if="giftCard.blessing" class="gift-blessing">
              <text class="gift-blessing-txt">「{{ giftCard.blessing }}」</text>
            </view>
            <view v-if="giftCard.qrRef" class="kv">
              <text class="k">名片码内容</text>
              <view class="v-copy">
                <text class="v v-qr">{{ giftCard.qrRef }}</text>
                <view class="copy-btn" @tap="copy(giftCard.qrRef)">
                  <AppIcon name="copy" :size="12" color="#6E6E73" />
                </view>
              </view>
            </view>
            <text class="gift-hint">可在后台「订单管理 → 打印贺卡」打印 A6 贺卡（含名片二维码）</text>
          </view>

          <!-- 物流信息（已发货则展示真实运单与快递100轨迹） -->
          <view v-if="order.shippedAt" class="card">
            <view class="card-h">
              <text class="card-h-ic">◈</text>
              <text class="card-h-t">物流信息</text>
              <view class="logistics-actions">
                <text class="logistics-action" @tap="loadShipment">刷新轨迹</text>
                <text
                  v-if="order.status === 'SHIPPED' && shipment?.logistics"
                  class="logistics-action logistics-action-edit"
                  @tap="openEditShipment"
                >修改运单</text>
              </view>
            </view>
            <view class="kv">
              <text class="k">发货时间</text>
              <text class="v">{{ formatTime(order.shippedAt) }}</text>
            </view>
            <template v-if="shipment?.logistics">
              <view class="kv">
                <text class="k">快递公司</text>
                <text class="v">{{ shipment.logistics.company || '—' }}</text>
              </view>
              <view class="kv">
                <text class="k">物流单号</text>
                <view class="v-copy">
                  <text class="v">{{ shipment.logistics.trackingNo || '—' }}</text>
                  <view
                    v-if="shipment.logistics.trackingNo"
                    class="copy-btn"
                    @tap="copy(shipment.logistics.trackingNo)"
                  >
                    <AppIcon name="copy" :size="12" color="#6E6E73" />
                  </view>
                </view>
              </view>
              <view class="kv">
                <text class="k">物流状态</text>
                <text class="v v-sent">{{ shipmentStatusText }}</text>
              </view>
            </template>
            <view v-if="shipmentLoading" class="track-empty">正在查询快递100…</view>
            <view v-else-if="trackItems.length" class="track-list">
              <view v-for="(item, index) in trackItems" :key="`${item.time || ''}-${index}`" class="track-item">
                <view class="track-axis">
                  <view class="track-dot" :class="{ active: index === 0 }" />
                  <view v-if="index < trackItems.length - 1" class="track-line" />
                </view>
                <view class="track-body">
                  <text class="track-status">{{ item.status || '物流状态更新' }}</text>
                  <text v-if="item.location" class="track-location">{{ item.location }}</text>
                  <text v-if="item.time" class="track-time">{{ item.time }}</text>
                </view>
              </view>
            </view>
            <view v-else class="track-empty">{{ shipmentMessage }}</view>
          </view>

          <!-- 订单信息 -->
          <view class="card">
            <view class="card-h">
              <text class="card-h-ic">◈</text>
              <text class="card-h-t">订单信息</text>
            </view>
            <view class="kv">
              <text class="k">订单编号</text>
              <view class="v-copy">
                <text class="v">{{ order.id }}</text>
                <view class="copy-btn" @tap="copy(order.id)">
                  <AppIcon name="copy" :size="12" color="#6E6E73" />
                </view>
              </view>
            </view>
            <view class="kv">
              <text class="k">下单时间</text>
              <text class="v">{{ formatTime(order.createdAt) }}</text>
            </view>
            <view v-if="order.paidAt" class="kv">
              <text class="k">付款时间</text>
              <text class="v">{{ formatTime(order.paidAt) }}</text>
            </view>
            <view class="kv">
              <text class="k">支付方式</text>
              <text class="v">{{ payMethodText }}</text>
            </view>
          </view>

          <view style="height: 180rpx" />
        </view>
      </template>
    </scroll-view>

    <!-- 底部操作栏：待发货 -->
    <view v-if="order && order.status === 'PAID'" class="ship-bar" :style="footStyle">
      <view v-if="shipping && shipping.phone" class="fbtn fbtn-ghost" @tap="callPhone(shipping.phone)">
        <text>联系买家</text>
      </view>
      <view class="fbtn fbtn-primary" @tap="openShip">
        <AppIcon name="truck" :size="16" color="#fff" />
        <text>填写运单发货</text>
      </view>
    </view>


    <!-- 发货弹窗 -->
    <view v-if="showShip" class="mask" @tap="showShip = false" @touchmove.self.prevent>
      <view class="sheet" @tap.stop @touchmove.stop>
        <text class="sheet-title">{{ shipmentMode === 'edit' ? '修改物流信息' : '填写物流信息' }}</text>
        <view class="field">
          <text class="field-label">快递公司 <text class="req">*</text></text>
          <view class="field-select" @tap="showExpress = true">
            <text :class="expressCompany ? 'select-val' : 'select-ph'">
              {{ expressCompany || '请选择快递公司' }}
            </text>
            <AppIcon name="chevron-right" :size="16" color="#999" />
          </view>
        </view>
        <view class="field">
          <text class="field-label">物流单号 <text class="req">*</text></text>
          <input class="field-input" v-model="trackingNo" placeholder="请输入物流单号" placeholder-class="ph" />
          <text class="field-hint">请仔细核对单号，填写错误将影响买家查询物流</text>
        </view>
        <view v-if="giftCard" class="gift-tip">
          <text class="gift-tip-txt">🎁 本单含贺卡任务（{{ giftCard.fromName || '从业者' }}），请打印后随包裹放入</text>
        </view>
        <view v-if="order" class="ship-preview">
          <text class="ship-preview-label">发货商品</text>
          <view class="ship-preview-row">
            <image
              v-if="order.productImage"
              class="ship-preview-img"
              :src="order.productImage"
              mode="aspectFill"
              lazy-load
            />
            <view v-else class="ship-preview-thumb">
              <AppIcon name="package" :size="18" color="#B0A088" />
            </view>
            <text class="ship-preview-name">{{ order.productTitle || '商品' }}</text>
          </view>
        </view>
        <view
          class="ship-submit"
          :class="{ disabled: !trackingNo || !expressCompany || submitting }"
          @tap="handleShipment"
        >
          <AppIcon name="check-circle" :size="16" color="#fff" />
          <text>{{ submitting ? '提交中…' : shipmentMode === 'edit' ? '保存修改' : '确认发货' }}</text>
        </view>
      </view>
    </view>

    <!-- 快递选择浮层 -->
    <view v-if="showExpress" class="mask" @tap="showExpress = false" @touchmove.self.prevent>
      <view class="sheet" @tap.stop @touchmove.stop>
        <text class="sheet-title">选择快递公司</text>
        <scroll-view scroll-y class="express-list">
          <view
            v-for="c in expressCompanies"
            :key="c"
            class="express-item"
            :class="{ active: expressCompany === c }"
            @tap="pickExpress(c)"
          >
            <text>{{ c }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import {
  merchantBackendApi,
  orderStatusConfig,
  expressCompanies,
  type MerchantOrder,
  type MerchantShipmentDetail,
} from '@/pkg-merchant/lib/merchant-data'

const statusBarH = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarH.value = e.statusBarHeight || 0 } })

const statusCfg = orderStatusConfig

const orderId = ref('')
const order = ref<MerchantOrder | null>(null)
const shipment = ref<MerchantShipmentDetail | null>(null)
const loading = ref(true)
const error = ref('')

const showShip = ref(false)
const showExpress = ref(false)
const shipmentMode = ref<'ship' | 'edit'>('ship')
const shipmentLoading = ref(false)
const expressCompany = ref('')
const trackingNo = ref('')
const submitting = ref(false)

useOverlayScrollLock(() => showShip.value || showExpress.value)

const footStyle = 'padding-bottom: calc(24rpx + env(safe-area-inset-bottom));'

onLoad((opts) => {
  orderId.value = opts?.id ? String(opts.id) : ''
  load()
})

async function load() {
  if (!orderId.value) {
    error.value = '缺少订单参数'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const nextOrder = await merchantBackendApi.getOrder(orderId.value)
    order.value = nextOrder
    if (nextOrder.status === 'SHIPPED' || nextOrder.status === 'COMPLETED') {
      void loadShipment()
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadShipment() {
  if (!orderId.value || shipmentLoading.value) return
  shipmentLoading.value = true
  try {
    shipment.value = await merchantBackendApi.getShipment(orderId.value)
  } catch (e) {
    shipment.value = {
      logistics: null,
      track: {
        state: 'unknown',
        message: (e as Error)?.message || '物流查询暂不可用，请稍后刷新',
        tracks: [],
      },
    }
  } finally {
    shipmentLoading.value = false
  }
}

const shipping = computed(() => order.value?.shippingInfo || null)
/** 白标贺卡任务（供-P2）：归因订单才有，无则整卡降级隐藏 */
const giftCard = computed(() => order.value?.giftCardMeta || null)
const addressText = computed(() => {
  const s = shipping.value
  if (!s) return ''
  return [s.province, s.city, s.district, s.detail].filter(Boolean).join('')
})
const amountText = computed(() => Number(order.value?.amount ?? 0).toFixed(2))
const trackItems = computed(() => shipment.value?.track?.tracks?.slice(0, 8) || [])
const shipmentMessage = computed(() => shipment.value?.track?.message || '暂无物流轨迹，快递揽收后会自动更新')
const shipmentStatusText = computed(() => {
  const state = String(shipment.value?.track?.state ?? 'unknown')
  const map: Record<string, string> = {
    '0': '运输中',
    '1': '已揽收',
    '2': '物流异常',
    '3': '已签收',
    '4': '已退签',
    '5': '派送中',
    '6': '退回中',
    '7': '转投中',
    '10': '清关中',
    '11': '已清关',
    PICKED_UP: '已揽收',
    IN_TRANSIT: '运输中',
    OUT_FOR_DELIVERY: '派送中',
    EXCEPTION: '物流异常',
    SIGNED: '已签收',
    RETURNING: '退回中',
    RETURNED: '已退回',
    TRANSFERRED: '转投中',
    CUSTOMS_CLEARANCE: '清关中',
    CUSTOMS_RELEASED: '已清关',
    REJECTED: '已拒收',
    unknown: '等待物流更新',
  }
  return map[state] || shipment.value?.logistics?.status || '等待物流更新'
})

const statusDescMap: Record<string, string> = {
  PENDING: '等待买家付款',
  PAID: '买家已付款，请在 48 小时内发货',
  SHIPPED: '商品已发出，等待买家确认收货',
  COMPLETED: '交易已完成',
  REFUNDED: '退款已完成，本订单交易已关闭',
  CANCELLED: '订单已取消',
}
const statusDesc = computed(() => statusDescMap[order.value?.status || ''] || '')

const payMethodMap: Record<string, string> = {
  WECHAT: '微信支付',
  ALIPAY: '支付宝',
  BALANCE: '余额支付',
  COIN: '虚拟币',
}
const payMethodText = computed(() => {
  const m = order.value?.payMethod
  if (!m) return '—'
  return payMethodMap[m] || m
})

function pickExpress(name: string) {
  expressCompany.value = name
  showExpress.value = false
}

function openShip() {
  shipmentMode.value = 'ship'
  expressCompany.value = ''
  trackingNo.value = ''
  showShip.value = true
}

function openEditShipment() {
  const logistics = shipment.value?.logistics
  if (!logistics) return
  shipmentMode.value = 'edit'
  expressCompany.value = logistics.company || ''
  trackingNo.value = logistics.trackingNo || ''
  showShip.value = true
}

async function handleShipment() {
  const company = expressCompany.value.trim()
  const no = trackingNo.value.trim()
  if (!no || !company || submitting.value) return
  submitting.value = true
  try {
    const isEdit = shipmentMode.value === 'edit'
    if (isEdit) {
      await merchantBackendApi.updateShipment(orderId.value, company, no)
    } else {
      await merchantBackendApi.shipOrder(orderId.value, company, no)
    }
    showShip.value = false
    uni.showToast({ title: isEdit ? '运单已更新' : '发货成功', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '物流信息提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function formatTime(s?: string | null) {
  return s ? String(s).replace('T', ' ').slice(0, 16) : ''
}
function copy(text?: string | null) {
  if (!text) return
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}
function callPhone(phone?: string | null) {
  if (!phone) return
  uni.makePhoneCall({ phoneNumber: phone, fail: () => {} })
}
function go(path: string) {
  navigateTo(path)
}
</script>

<style lang="scss" scoped>
$paper: #faf8f5;
$card: #ffffff;
$red: #c41e3a;
$red-dark: #a01830;
$gold: #c9a96e;
$t1: #2c2c2c;
$t2: #6e6e73;
$t3: #999999;
$line: #edeae4;

.page {
  min-height: 100vh;
  background: $paper;
}

/* 品牌头 */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: linear-gradient(135deg, $red, $red-dark);
}
.nav-inner {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
}
.nav-back {
  width: 56rpx;
  height: 48px;
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.scroll {
  height: 100vh;
  box-sizing: border-box;
}
.body {
  padding: 32rpx 40rpx 60rpx;
}

/* 状态横幅 */
.status-banner {
  background: linear-gradient(135deg, $red, $red-dark);
  border-radius: 16px;
  padding: 32rpx;
  margin-bottom: 28rpx;
  display: flex;
  flex-direction: column;
}
.sb-t {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}
.sb-d {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 8rpx;
}

/* 卡片 */
.card {
  background: $card;
  border-radius: 18px;
  padding: 32rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.card-h {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.card-h-ic {
  font-size: 15px;
  color: $gold;
}
.card-h-t {
  font-size: 15px;
  font-weight: 600;
  color: $t1;
}
.logistics-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.logistics-action {
  font-size: 12px;
  color: $gold;
}
.logistics-action-edit {
  color: $red;
}

.kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}
.kv-top {
  border-top: 1px dashed $line;
  margin-top: 12rpx;
  padding-top: 24rpx;
}
.k {
  font-size: 13px;
  color: $t2;
  flex-shrink: 0;
}
.v {
  font-size: 13px;
  color: $t1;
  text-align: right;
}
.v-addr {
  flex: 1;
  margin-left: 40rpx;
  line-height: 1.5;
}
.v-pay {
  color: $red;
  font-weight: 700;
}
.v-sent {
  color: $gold;
}
.v-copy {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.copy-btn {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 快递100真实轨迹 */
.track-list {
  border-top: 1px dashed $line;
  margin-top: 16rpx;
  padding-top: 24rpx;
}
.track-item {
  display: flex;
  min-height: 92rpx;
}
.track-axis {
  width: 28rpx;
  margin-right: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.track-dot {
  width: 12rpx;
  height: 12rpx;
  margin-top: 8rpx;
  border-radius: 50%;
  background: #d8d1c5;
  flex-shrink: 0;
}
.track-dot.active {
  width: 16rpx;
  height: 16rpx;
  margin-top: 6rpx;
  background: $red;
  box-shadow: 0 0 0 6rpx rgba(196, 30, 58, 0.08);
}
.track-line {
  width: 1px;
  flex: 1;
  margin-top: 8rpx;
  background: $line;
}
.track-body {
  flex: 1;
  min-width: 0;
  padding-bottom: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.track-status {
  font-size: 13px;
  color: $t1;
  line-height: 1.5;
}
.track-location,
.track-time {
  font-size: 11px;
  color: $t3;
  line-height: 1.45;
}
.track-empty {
  border-top: 1px dashed $line;
  margin-top: 16rpx;
  padding-top: 24rpx;
  font-size: 12px;
  color: $t3;
  line-height: 1.5;
}

/* 脱敏提示 */
.mask-note {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: #fbf7ef;
  border-radius: 10px;
}
.mask-note-txt {
  font-size: 11px;
  color: $gold;
  line-height: 1.5;
}

/* 商品行 */
.goods {
  display: flex;
  gap: 24rpx;
  padding-bottom: 12rpx;
}
.goods-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12px;
  background: linear-gradient(135deg, #e8dfd3, #d8ccb8);
  flex-shrink: 0;
}
.goods-img-ph {
  display: flex;
  align-items: center;
  justify-content: center;
}
.goods-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.goods-name {
  font-size: 14px;
  color: $t1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-spec {
  font-size: 12px;
  color: $t3;
  margin-top: 8rpx;
}
.goods-price {
  text-align: right;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.goods-p {
  color: $red;
  font-size: 14px;
  font-weight: 600;
}
.goods-q {
  font-size: 12px;
  color: $t3;
  margin-top: 4rpx;
}

/* 贺卡卡 */
.gift-card {
  border: 1px solid rgba(196, 30, 58, 0.18);
}
.gift-ic {
  color: $red;
}
.gift-badge {
  margin-left: auto;
  font-size: 11px;
  color: $red;
  background: rgba(196, 30, 58, 0.08);
  border-radius: 4px;
  padding: 4rpx 16rpx;
}
.gift-blessing {
  background: #faf7f2;
  border-radius: 8px;
  padding: 20rpx 24rpx;
  margin: 8rpx 0 16rpx;
}
.gift-blessing-txt {
  font-size: 13px;
  color: #6b5d48;
  line-height: 1.6;
}
.v-qr {
  max-width: 360rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gift-hint {
  font-size: 12px;
  color: $t3;
  margin-top: 16rpx;
  line-height: 1.5;
}

/* 底部操作栏 */
.ship-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 60;
  background: $card;
  border-top: 1px solid $line;
  padding: 24rpx 40rpx;
  display: flex;
  gap: 20rpx;
}
.fbtn {
  flex: 1;
  height: 44px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.fbtn text {
  font-size: 14px;
}
.fbtn-ghost {
  background: #fff;
  border: 1px solid #ddd;
}
.fbtn-ghost text {
  color: $t2;
}
.fbtn-primary {
  background: $red;
}
.fbtn-primary text {
  color: #fff;
}
.fbtn.disabled {
  opacity: 0.5;
}

/* 弹层 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: $card;
  border-radius: 18px 18px 0 0;
  padding: 40rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}
.sheet-title {
  font-size: 16px;
  font-weight: 600;
  color: $t1;
  display: block;
  margin-bottom: 32rpx;
  text-align: center;
}
.field {
  margin-bottom: 32rpx;
}
.field-label {
  font-size: 14px;
  color: $t1;
  display: block;
  margin-bottom: 16rpx;
}
.req {
  color: $red;
}
.field-select {
  height: 84rpx;
  border: 1px solid $line;
  border-radius: 12px;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.select-val {
  font-size: 14px;
  color: $t1;
}
.select-ph {
  font-size: 14px;
  color: $t3;
}
.field-input {
  width: 100%;
  box-sizing: border-box;
  height: 84rpx;
  border: 1px solid $line;
  border-radius: 12px;
  padding: 0 24rpx;
  font-size: 14px;
  color: $t1;
}
.ph {
  color: $t3;
}
.field-hint {
  font-size: 12px;
  color: $t3;
  margin-top: 8rpx;
  display: block;
}
.gift-tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(196, 30, 58, 0.06);
  border-radius: 10px;
  padding: 16rpx 24rpx;
  margin-bottom: 24rpx;
}
.gift-tip-txt {
  font-size: 12px;
  color: $red;
  line-height: 1.5;
}
.ship-preview {
  background: $paper;
  border-radius: 12px;
  padding: 24rpx;
  margin-bottom: 32rpx;
}
.ship-preview-label {
  font-size: 12px;
  color: $t3;
  display: block;
  margin-bottom: 16rpx;
}
.ship-preview-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ship-preview-thumb {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8px;
  background: #f3f0ea;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ship-preview-img {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8px;
  background: #f3f0ea;
}
.ship-preview-name {
  font-size: 14px;
  color: $t1;
  flex: 1;
}
.ship-submit {
  height: 44px;
  background: $red;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.ship-submit text {
  font-size: 15px;
  color: #fff;
}
.ship-submit.disabled {
  opacity: 0.5;
}

.express-list {
  max-height: 50vh;
}
.express-item {
  padding: 28rpx 8rpx;
  border-bottom: 1px solid $line;
}
.express-item text {
  font-size: 15px;
  color: $t1;
}
.express-item.active text {
  color: $red;
  font-weight: 600;
}

/* 加载/错误态 */
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 48rpx;
  gap: 12px;
}
.state-title {
  font-size: 16px;
  font-weight: 600;
  color: $t1;
  margin-top: 4px;
}
.state-txt {
  font-size: 14px;
  color: $t3;
  text-align: center;
  line-height: 1.5;
}
.state-btn {
  margin-top: 8px;
  padding: 16rpx 48rpx;
  border: 1px solid $line;
  border-radius: 999px;
  background: #fff;
}
.state-btn text {
  font-size: 14px;
  color: $red;
}

/* 真实物流轨迹 */
.v-copy { display: flex; align-items: center; justify-content: flex-end; gap: 12rpx; min-width: 0; }
.v-no { max-width: 360rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.copy-mini { flex-shrink: 0; color: #c41e3a; font-size: 21rpx; }
.track-trigger {
  min-height: 88rpx;
  margin-top: 20rpx;
  border: 1px solid #edc6cd;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: #fff8f8;
}
.track-trigger.disabled { opacity: 0.55; pointer-events: none; }
.track-trigger-text { color: #c41e3a; font-size: 23rpx; font-weight: 600; }
.track-error,
.track-empty {
  margin-top: 16rpx;
  padding: 18rpx 20rpx;
  border-radius: 10rpx;
  background: #faf8f5;
  color: #8a8178;
  font-size: 22rpx;
  line-height: 1.55;
}
.track-error { color: #b91c1c; background: #fff1f2; }
.track-list { margin-top: 24rpx; padding-top: 4rpx; border-top: 1px dashed #e4ddd3; }
.track-row { display: flex; min-height: 92rpx; }
.track-line { position: relative; width: 36rpx; flex-shrink: 0; }
.track-line::after { content: ''; position: absolute; top: 22rpx; bottom: -8rpx; left: 10rpx; width: 2rpx; background: #e4ddd3; }
.track-row:last-of-type .track-line::after { display: none; }
.track-dot { position: relative; z-index: 1; width: 16rpx; height: 16rpx; margin: 12rpx 0 0 3rpx; border: 4rpx solid #fff; border-radius: 50%; background: #b8afa4; box-shadow: 0 0 0 2rpx #ddd4c8; }
.track-dot.first { background: #c41e3a; box-shadow: 0 0 0 2rpx #edc6cd; }
.track-main { flex: 1; min-width: 0; padding: 6rpx 0 22rpx; }
.track-status { display: block; color: #3f3a36; font-size: 23rpx; line-height: 1.55; }
.track-meta { display: block; margin-top: 7rpx; color: #99918a; font-size: 20rpx; }
.track-more { min-height: 64rpx; display: flex; align-items: center; justify-content: center; color: #8a6d2f; font-size: 22rpx; }
</style>
