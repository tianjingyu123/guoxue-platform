<!--
  B4 · 订单详情（V0 视觉稿 1:1 还原）
  态B 订单详情：状态横幅 + 收货信息(脱敏) + 商品清单 + 金额 + 订单信息 + 底部发货/售后操作
  规格红线：收货人信息脱敏；商家只做发货/查看；退款审批由平台处理（此处保留商家侧处理入口）
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

          <!-- 物流信息（已发货则展示） -->
          <view v-if="order.shippedAt" class="card">
            <view class="card-h">
              <text class="card-h-ic">◈</text>
              <text class="card-h-t">物流信息</text>
            </view>
            <view class="kv">
              <text class="k">发货时间</text>
              <text class="v">{{ formatTime(order.shippedAt) }}</text>
            </view>
            <view class="kv">
              <text class="k">物流状态</text>
              <text class="v v-sent">商品已发出</text>
            </view>
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
      <view class="fbtn fbtn-primary" @tap="showShip = true">
        <AppIcon name="truck" :size="16" color="#fff" />
        <text>填写运单发货</text>
      </view>
    </view>
    <!-- 底部操作栏：退款处理 -->
    <view v-else-if="order && order.status === 'REFUNDED'" class="ship-bar" :style="footStyle">
      <view class="fbtn fbtn-ghost" :class="{ disabled: submitting }" @tap="handleReject">
        <text>拒绝退款</text>
      </view>
      <view class="fbtn fbtn-primary" :class="{ disabled: submitting }" @tap="handleApprove">
        <text>{{ submitting ? '处理中…' : '同意退款' }}</text>
      </view>
    </view>

    <!-- 发货弹窗 -->
    <view v-if="showShip" class="mask" @tap="showShip = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">填写物流信息</text>
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
          @tap="handleShip"
        >
          <AppIcon name="check-circle" :size="16" color="#fff" />
          <text>{{ submitting ? '提交中…' : '确认发货' }}</text>
        </view>
      </view>
    </view>

    <!-- 快递选择浮层 -->
    <view v-if="showExpress" class="mask" @tap="showExpress = false">
      <view class="sheet" @tap.stop>
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
import {
  merchantBackendApi,
  orderStatusConfig,
  expressCompanies,
  type MerchantOrder,
} from '@/lib/merchant-data'

const statusBarH = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarH.value = e.statusBarHeight || 0 } })

const statusCfg = orderStatusConfig

const orderId = ref('')
const order = ref<MerchantOrder | null>(null)
const loading = ref(true)
const error = ref('')

const showShip = ref(false)
const showExpress = ref(false)
const expressCompany = ref('')
const trackingNo = ref('')
const submitting = ref(false)

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
    order.value = await merchantBackendApi.getOrder(orderId.value)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
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

const statusDescMap: Record<string, string> = {
  PENDING: '等待买家付款',
  PAID: '买家已付款，请在 48 小时内发货',
  SHIPPED: '商品已发出，等待买家确认收货',
  COMPLETED: '交易已完成',
  REFUNDED: '买家申请退款，请及时处理',
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

async function handleShip() {
  if (!trackingNo.value || !expressCompany.value || submitting.value) return
  submitting.value = true
  try {
    await merchantBackendApi.shipOrder(orderId.value, expressCompany.value, trackingNo.value)
    showShip.value = false
    expressCompany.value = ''
    trackingNo.value = ''
    uni.showToast({ title: '发货成功', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发货失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function handleApprove() {
  if (submitting.value) return
  uni.showModal({
    title: '同意退款',
    content: '确认同意此订单的退款申请？退款将原路退回买家。',
    confirmColor: '#C41E3A',
    success: async (res) => {
      if (!res.confirm) return
      submitting.value = true
      try {
        await merchantBackendApi.approveRefund(orderId.value)
        uni.showToast({ title: '已同意退款', icon: 'success' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      } finally {
        submitting.value = false
      }
    },
  })
}

function handleReject() {
  if (submitting.value) return
  uni.showModal({
    title: '拒绝退款',
    editable: true,
    placeholderText: '请填写拒绝原因',
    confirmColor: '#C41E3A',
    success: async (res) => {
      if (!res.confirm) return
      const reason = (res.content || '').trim()
      if (!reason) {
        uni.showToast({ title: '请填写拒绝原因', icon: 'none' })
        return
      }
      submitting.value = true
      try {
        await merchantBackendApi.rejectRefund(orderId.value, reason)
        uni.showToast({ title: '已拒绝退款', icon: 'success' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      } finally {
        submitting.value = false
      }
    },
  })
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
</style>
