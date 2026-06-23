<template>
  <view class="od-page">
    <!-- 顶部导航 -->
    <view class="od-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="od-header-inner">
        <view class="od-back" @tap="go('/merchant/orders')">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="od-title">订单详情</text>
      </view>
    </view>

    <scroll-view scroll-y class="od-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- 订单状态 -->
      <view class="od-status-banner">
        <AppIcon name="package" :size="40" color="#fff" />
        <view>
          <text class="od-status-label">{{ statusCfg[d.status].label }}</text>
          <text class="od-status-desc">请尽快发货，超时将自动关闭订单</text>
        </view>
      </view>

      <!-- 收货信息 -->
      <view class="od-card od-addr-card">
        <AppIcon name="map-pin" :size="20" color="#6b7280" />
        <view class="od-addr-info">
          <view class="od-addr-top">
            <text class="od-buyer-name">{{ d.buyer.name }}</text>
            <text class="od-buyer-phone">{{ d.buyer.phone }}</text>
            <view class="od-copy-btn" @tap="copy(d.buyer.phone)">
              <AppIcon name="copy" :size="12" color="#6b7280" />
            </view>
          </view>
          <text class="od-addr-detail">{{ d.buyer.address }}</text>
        </view>
        <view class="od-phone-btn" @tap="callPhone(d.buyer.phone)">
          <AppIcon name="phone" :size="16" color="#1a1a1a" />
        </view>
      </view>

      <!-- 商品信息 -->
      <view class="od-card">
        <text class="od-card-title">商品信息</text>
        <view v-for="p in d.products" :key="p.id" class="od-product">
          <view class="od-thumb">
            <AppIcon name="package" :size="24" color="#c4b59a" />
          </view>
          <view class="od-product-info">
            <text class="od-product-name">{{ p.title }}</text>
            <text class="od-product-specs">{{ p.specs }}</text>
            <view class="od-product-meta">
              <text class="od-product-price">¥{{ p.price }}</text>
              <text class="od-product-qty">x{{ p.quantity }}</text>
            </view>
          </view>
        </view>
        <view v-if="d.remark" class="od-remark">
          <AppIcon name="message-square" :size="16" color="#d97706" />
          <view>
            <text class="od-remark-label">买家备注</text>
            <text class="od-remark-txt">{{ d.remark }}</text>
          </view>
        </view>
      </view>

      <!-- 金额明细 -->
      <view class="od-card">
        <text class="od-card-title">金额明细</text>
        <view class="od-amount-row">
          <text class="od-amount-label">商品总价</text>
          <text class="od-amount-val">¥{{ d.amounts.productTotal }}</text>
        </view>
        <view class="od-amount-row">
          <text class="od-amount-label">运费</text>
          <text class="od-amount-val">{{ d.amounts.shipping === 0 ? '免运费' : '¥' + d.amounts.shipping }}</text>
        </view>
        <view v-if="d.amounts.discount > 0" class="od-amount-row">
          <text class="od-amount-label">优惠</text>
          <text class="od-amount-discount">-¥{{ d.amounts.discount }}</text>
        </view>
        <view class="od-divider" />
        <view class="od-amount-row">
          <text class="od-total-label">实付金额</text>
          <text class="od-total-val">¥{{ d.amounts.total }}</text>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="od-card">
        <text class="od-card-title">订单信息</text>
        <view class="od-info-row">
          <text class="od-info-label">订单编号</text>
          <view class="od-info-copy">
            <text class="od-info-val">{{ orderId }}</text>
            <view class="od-copy-btn" @tap="copy(orderId)">
              <AppIcon name="copy" :size="12" color="#6b7280" />
            </view>
          </view>
        </view>
        <view class="od-info-row">
          <text class="od-info-label">下单时间</text>
          <text class="od-info-val">{{ d.createdAt }}</text>
        </view>
        <view class="od-info-row">
          <text class="od-info-label">付款时间</text>
          <text class="od-info-val">{{ d.paidAt }}</text>
        </view>
        <view class="od-info-row">
          <text class="od-info-label">支付方式</text>
          <text class="od-info-val">{{ d.payMethod }}</text>
        </view>
      </view>

      <!-- 订单进度 -->
      <view class="od-card">
        <text class="od-card-title">订单进度</text>
        <view class="od-timeline">
          <view v-for="(item, i) in d.timeline" :key="i" class="od-tl-item">
            <view class="od-tl-line">
              <view class="od-tl-dot" :class="{ active: i === 0 }" />
              <view v-if="i < d.timeline.length - 1" class="od-tl-bar" />
            </view>
            <view class="od-tl-body">
              <text class="od-tl-title" :class="{ active: i === 0 }">{{ item.title }}</text>
              <text class="od-tl-desc">{{ item.desc }}</text>
              <text class="od-tl-time">{{ item.time }}</text>
            </view>
          </view>
        </view>
      </view>
      <view style="height: 90px" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="d.status === 'pending'" class="od-footer">
      <view class="od-foot-btn outline" @tap="toast">修改价格</view>
      <view class="od-foot-btn primary" @tap="showShip = true">
        <AppIcon name="truck" :size="16" color="#fff" />
        <text>发货</text>
      </view>
    </view>

    <!-- 发货弹窗 -->
    <view v-if="showShip" class="od-mask" @tap="showShip = false">
      <view class="od-ship" @tap.stop>
        <text class="od-ship-title">填写物流信息</text>
        <view class="od-ship-field">
          <text class="od-ship-label">快递公司 <text class="od-req">*</text></text>
          <view class="od-ship-select" @tap="showExpress = true">
            <text :class="expressCompany ? 'od-select-val' : 'od-select-ph'">
              {{ expressName || '请选择快递公司' }}
            </text>
            <AppIcon name="chevron-right" :size="16" color="#9ca3af" />
          </view>
        </view>
        <view class="od-ship-field">
          <text class="od-ship-label">物流单号 <text class="od-req">*</text></text>
          <input class="od-ship-input" v-model="trackingNo" placeholder="请输入物流单号" placeholder-class="od-ph" />
          <text class="od-ship-hint">请仔细核对单号，填写错误将影响买家查询物流</text>
        </view>
        <view class="od-ship-preview">
          <text class="od-ship-preview-label">发货商品</text>
          <view class="od-ship-preview-row">
            <view class="od-ship-preview-thumb">
              <AppIcon name="package" :size="18" color="#c4b59a" />
            </view>
            <view>
              <text class="od-ship-preview-name">{{ d.products[0].title }}</text>
              <text class="od-ship-preview-qty">x{{ d.products[0].quantity }}</text>
            </view>
          </view>
        </view>
        <view
          class="od-ship-submit"
          :class="{ disabled: !trackingNo || !expressCompany || isSubmitting }"
          @tap="handleShip"
        >
          <AppIcon name="check-circle" :size="16" color="#fff" />
          <text>{{ isSubmitting ? '提交中...' : '确认发货' }}</text>
        </view>
      </view>
    </view>

    <!-- 快递选择浮层 -->
    <view v-if="showExpress" class="od-mask" @tap="showExpress = false">
      <view class="od-sheet" @tap.stop>
        <text class="od-sheet-title">选择快递公司</text>
        <scroll-view scroll-y class="od-sheet-list">
          <view
            v-for="c in expressCompanies"
            :key="c.id"
            class="od-sheet-item"
            :class="{ active: expressCompany === c.id }"
            @tap="pickExpress(c.id)"
          >
            {{ c.name }}
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
import { merchantOrderDetail, orderDetailStatusConfig, expressCompanies } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })

const d = merchantOrderDetail
const statusCfg = orderDetailStatusConfig
const orderId = ref(merchantOrderDetail.id)

const showShip = ref(false)
const showExpress = ref(false)
const expressCompany = ref('')
const trackingNo = ref('')
const isSubmitting = ref(false)

onLoad((opts: any) => {
  if (opts?.id) orderId.value = String(opts.id)
})

const expressName = computed(() => expressCompanies.find((c) => c.id === expressCompany.value)?.name || '')

function pickExpress(id: string) {
  expressCompany.value = id
  showExpress.value = false
}
function handleShip() {
  if (!trackingNo.value || !expressCompany.value || isSubmitting.value) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    showShip.value = false
    expressCompany.value = ''
    trackingNo.value = ''
    uni.showToast({ title: '发货成功', icon: 'success' })
  }, 1500)
}
function copy(text: string) {
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}
function callPhone(phone: string) {
  uni.makePhoneCall({ phoneNumber: phone, fail: () => {} })
}
function toast() {
  uni.showToast({ title: '演示功能', icon: 'none' })
}
function go(path: string) {
  navigateTo(path)
}
</script>

<style scoped>
.od-page { min-height: 100vh; background: #f5f5f7; }
.od-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.od-header-inner { height: 44px; display: flex; align-items: center; padding: 0 16px; }
.od-back { width: 32px; display: flex; align-items: center; }
.od-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.od-scroll { height: 100vh; box-sizing: border-box; }

.od-status-banner { background: linear-gradient(135deg, #f97316, #ea580c); padding: 16px; display: flex; align-items: center; gap: 12px; }
.od-status-label { font-size: 18px; font-weight: 600; color: #fff; display: block; }
.od-status-desc { font-size: 13px; color: rgba(255,255,255,0.85); margin-top: 2px; display: block; }

.od-card { background: #fff; border-radius: 12px; margin: 12px 16px 0; padding: 16px; }
.od-addr-card { display: flex; align-items: flex-start; gap: 12px; margin-top: -8px; position: relative; z-index: 10; }
.od-addr-info { flex: 1; min-width: 0; }
.od-addr-top { display: flex; align-items: center; gap: 8px; }
.od-buyer-name { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.od-buyer-phone { font-size: 14px; color: #6b7280; }
.od-copy-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
.od-addr-detail { font-size: 13px; color: #6b7280; margin-top: 4px; display: block; line-height: 1.5; }
.od-phone-btn { width: 40px; height: 40px; border: 1px solid #e5e5e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.od-card-title { font-size: 15px; font-weight: 500; color: #1a1a1a; display: block; margin-bottom: 12px; }
.od-product { display: flex; gap: 12px; }
.od-thumb { width: 64px; height: 64px; border-radius: 8px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.od-product-info { flex: 1; min-width: 0; }
.od-product-name { font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.4; }
.od-product-specs { font-size: 12px; color: #9ca3af; margin-top: 4px; display: block; }
.od-product-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.od-product-price { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.od-product-qty { font-size: 12px; color: #9ca3af; }
.od-remark { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px; background: #fffbeb; border-radius: 8px; }
.od-remark-label { font-size: 12px; color: #9ca3af; display: block; }
.od-remark-txt { font-size: 14px; color: #1a1a1a; margin-top: 2px; display: block; }

.od-amount-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.od-amount-label { font-size: 14px; color: #6b7280; }
.od-amount-val { font-size: 14px; color: #1a1a1a; }
.od-amount-discount { font-size: 14px; color: #ef4444; }
.od-divider { height: 1px; background: #f3f4f6; margin: 8px 0; }
.od-total-label { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.od-total-val { font-size: 18px; font-weight: 700; color: #c41e3a; }

.od-info-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.od-info-row:last-child { margin-bottom: 0; }
.od-info-label { font-size: 14px; color: #6b7280; }
.od-info-val { font-size: 14px; color: #1a1a1a; }
.od-info-copy { display: flex; align-items: center; gap: 2px; }

.od-timeline { display: flex; flex-direction: column; }
.od-tl-item { display: flex; gap: 12px; }
.od-tl-line { display: flex; flex-direction: column; align-items: center; }
.od-tl-dot { width: 12px; height: 12px; border-radius: 50%; background: #d1d5db; margin-top: 2px; }
.od-tl-dot.active { background: #c41e3a; }
.od-tl-bar { width: 1px; flex: 1; background: #e5e5e5; margin: 4px 0; }
.od-tl-body { flex: 1; padding-bottom: 16px; }
.od-tl-title { font-size: 14px; font-weight: 500; color: #9ca3af; display: block; }
.od-tl-title.active { color: #1a1a1a; }
.od-tl-desc { font-size: 12px; color: #9ca3af; margin-top: 2px; display: block; }
.od-tl-time { font-size: 12px; color: #9ca3af; margin-top: 4px; display: block; }

.od-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ededed; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 12px; z-index: 60; }
.od-foot-btn { flex: 1; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 15px; }
.od-foot-btn.outline { border: 1px solid #d1d5db; color: #1a1a1a; }
.od-foot-btn.primary { background: #c41e3a; color: #fff; }

.od-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-end; }
.od-ship { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px 16px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
.od-ship-title { font-size: 16px; font-weight: 600; color: #1a1a1a; display: block; margin-bottom: 16px; }
.od-ship-field { margin-bottom: 16px; }
.od-ship-label { font-size: 14px; color: #1a1a1a; display: block; margin-bottom: 8px; }
.od-req { color: #ef4444; }
.od-ship-select { height: 42px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; }
.od-select-val { font-size: 14px; color: #1a1a1a; }
.od-select-ph { font-size: 14px; color: #9ca3af; }
.od-ship-input { width: 100%; box-sizing: border-box; height: 42px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; font-size: 14px; color: #1a1a1a; }
.od-ph { color: #9ca3af; }
.od-ship-hint { font-size: 12px; color: #9ca3af; margin-top: 4px; display: block; }
.od-ship-preview { background: #f5f5f7; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
.od-ship-preview-label { font-size: 12px; color: #9ca3af; display: block; margin-bottom: 8px; }
.od-ship-preview-row { display: flex; align-items: center; gap: 8px; }
.od-ship-preview-thumb { width: 40px; height: 40px; border-radius: 6px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.od-ship-preview-name { font-size: 14px; color: #1a1a1a; display: block; }
.od-ship-preview-qty { font-size: 12px; color: #9ca3af; }
.od-ship-submit { height: 44px; background: #c41e3a; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 15px; color: #fff; }
.od-ship-submit.disabled { opacity: 0.5; }

.od-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
.od-sheet-title { font-size: 16px; font-weight: 600; color: #1a1a1a; display: block; text-align: center; margin-bottom: 12px; }
.od-sheet-list { max-height: 50vh; }
.od-sheet-item { padding: 14px 4px; border-bottom: 1px solid #f3f4f6; font-size: 15px; color: #1a1a1a; }
.od-sheet-item.active { color: #c41e3a; }
</style>
