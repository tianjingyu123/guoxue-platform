<template>
  <view class="page">
    <view
      class="nav-bar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view
        class="nav-back"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="40"
          color="#1A1A1A"
        />
      </view>
      <text class="nav-title">
        发票管理
      </text>
      <view class="nav-placeholder" />
    </view>

    <!-- Tab 切换 -->
    <view
      class="tabs"
      :style="{ top: navHeight + 'px' }"
    >
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >
        <text
          class="tab-text"
          :class="{ active: activeTab === tab.key }"
        >
          {{ tab.label }}
        </text>
        <view
          v-if="activeTab === tab.key"
          class="tab-bar"
        />
      </view>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
      :style="{ paddingTop: navHeight + 44 + 'px' }"
    >
      <view
        v-if="loading"
        class="load-state"
      >
        <view class="loading-spinner" />
        <text class="loading-text">
          加载中...
        </text>
      </view>
      <view
        v-else-if="error"
        class="err-state"
      >
        <app-icon
          name="alert-circle"
          :size="80"
          color="#CCCCCC"
        />
        <text class="err-text">
          {{ error }}
        </text>
        <view
          class="retry-btn"
          @tap="loadInvoices"
        >
          <text class="retry-btn-text">
            重试
          </text>
        </view>
      </view>
      <template v-else>
        <block v-if="activeTab === 'apply'">
          <view
            v-if="applicableOrders.length === 0"
            class="empty"
          >
            <app-icon
              name="file-text"
              :size="120"
              color="#DDDDDD"
            />
            <text class="empty-text">
              暂无可开票订单
            </text>
          </view>
          <view
            v-for="order in applicableOrders"
            :key="order.orderId"
            class="apply-card"
          >
            <view class="apply-head">
              <text class="apply-no">
                订单号：{{ order.orderNo }}
              </text>
              <text class="apply-time">
                {{ order.createdAt }}
              </text>
            </view>
            <text class="apply-product">
              {{ order.productName }}
            </text>
            <view class="apply-foot">
              <view class="apply-amount">
                <text class="amount-label">
                  开票金额
                </text>
                <text class="amount-value">
                  ¥{{ order.amount }}
                </text>
              </view>
              <view
                class="apply-btn"
                @tap="openApply(order)"
              >
                <text class="apply-btn-text">
                  申请开票
                </text>
              </view>
            </view>
          </view>
        </block>

        <!-- 开票记录 -->
        <block v-else>
          <view
            v-if="records.length === 0"
            class="empty"
          >
            <app-icon
              name="file-text"
              :size="120"
              color="#DDDDDD"
            />
            <text class="empty-text">
              暂无开票记录
            </text>
          </view>
          <view
            v-for="rec in records"
            :key="rec.id"
            class="record-card"
          >
            <view class="record-head">
              <view class="record-type">
                <app-icon
                  :name="rec.type === 'company' ? 'building-2' : 'user'"
                  :size="32"
                  color="#9A2D2D"
                />
                <text class="record-title">
                  {{ rec.title }}
                </text>
              </view>
              <view
                class="record-status"
                :style="{ color: statusCfg(rec.status).color, background: statusCfg(rec.status).bg }"
              >
                <text
                  class="record-status-text"
                  :style="{ color: statusCfg(rec.status).color }"
                >
                  {{ statusCfg(rec.status).label }}
                </text>
              </view>
            </view>
            <view
              v-if="rec.taxNumber"
              class="record-row"
            >
              <text class="record-label">
                税号
              </text>
              <text class="record-val">
                {{ rec.taxNumber }}
              </text>
            </view>
            <view class="record-row">
              <text class="record-label">
                金额
              </text>
              <text class="record-val amount">
                ¥{{ rec.amount }}
              </text>
            </view>
            <view class="record-row">
              <text class="record-label">
                邮箱
              </text>
              <text class="record-val">
                {{ rec.email }}
              </text>
            </view>
            <view class="record-row">
              <text class="record-label">
                申请时间
              </text>
              <text class="record-val">
                {{ rec.createdAt }}
              </text>
            </view>
            <view
              v-if="rec.status === 'rejected' && rec.rejectReason"
              class="reject-tip"
            >
              <app-icon
                name="alert-circle"
                :size="28"
                color="#E74C3C"
              />
              <text class="reject-text">
                驳回原因：{{ rec.rejectReason }}
              </text>
            </view>
            <view
              v-if="rec.status === 'completed'"
              class="record-actions"
            >
              <view
                class="record-action"
                @tap="downloadInvoice(rec)"
              >
                <app-icon
                  name="download"
                  :size="28"
                  color="#9A2D2D"
                />
                <text class="record-action-text">
                  下载发票
                </text>
              </view>
              <view
                class="record-action"
                @tap="resendInvoice(rec)"
              >
                <app-icon
                  name="mail"
                  :size="28"
                  color="#9A2D2D"
                />
                <text class="record-action-text">
                  重发邮箱
                </text>
              </view>
            </view>
          </view>
        </block>
        <view class="bottom-gap" />
      </template>
    </scroll-view>

    <!-- 申请开票弹窗 -->
    <view
      v-if="showApply"
      class="mask"
      @tap="showApply = false"
    >
      <view
        class="apply-sheet"
        @tap.stop
      >
        <view class="sheet-head">
          <text class="sheet-title">
            申请开票
          </text>
          <view @tap="showApply = false">
            <app-icon
              name="x"
              :size="40"
              color="#999999"
            />
          </view>
        </view>
        <view class="type-switch">
          <view
            class="type-item"
            :class="{ active: form.type === 'personal' }"
            @tap="form.type = 'personal'"
          >
            <text
              class="type-text"
              :class="{ active: form.type === 'personal' }"
            >
              个人
            </text>
          </view>
          <view
            class="type-item"
            :class="{ active: form.type === 'company' }"
            @tap="form.type = 'company'"
          >
            <text
              class="type-text"
              :class="{ active: form.type === 'company' }"
            >
              企业
            </text>
          </view>
        </view>
        <view class="form-field">
          <text class="field-label">
            发票抬头
          </text>
          <input
            v-model="form.title"
            class="field-input"
            :placeholder="form.type === 'company' ? '请输入企业名称' : '请输入姓名'"
          >
        </view>
        <view
          v-if="form.type === 'company'"
          class="form-field"
        >
          <text class="field-label">
            税号
          </text>
          <input
            v-model="form.taxNumber"
            class="field-input"
            placeholder="请输入纳税人识别号"
          >
        </view>
        <view class="form-field">
          <text class="field-label">
            接收邮箱
          </text>
          <input
            v-model="form.email"
            class="field-input"
            placeholder="请输入电子邮箱"
          >
        </view>
        <view
          class="sheet-submit"
          @tap="submitApply"
        >
          <text class="sheet-submit-text">
            提交申请
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import {
  orderApi,
  invoiceStatusConfig,
  type InvoiceOrder,
} from '@/lib/order-data'

const statusBarHeight = ref(20)
const navHeight = ref(64)

const tabs = [
  { key: 'apply', label: '可开票' },
  { key: 'record', label: '开票记录' },
]
const activeTab = ref('apply')

const applicableOrders = ref<InvoiceOrder[]>([])
const records = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const submitting = ref(false)
const showApply = ref(false)
const form = reactive({ orderId: '', type: 'personal' as 'personal' | 'company', title: '', taxNumber: '', email: '' })

function statusCfg(status: string) {
  return invoiceStatusConfig[status] || { label: status, color: '#999', bg: '#F5F5F5' }
}

async function loadInvoices() {
  loading.value = true
  error.value = ''
  try {
    const res = await orderApi.getInvoices()
    applicableOrders.value = res.orders || []
    records.value = res.records || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally { loading.value = false }
}

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = statusBarHeight.value + 44
  } catch (e) {
    statusBarHeight.value = 20
    navHeight.value = 64
  }
  loadInvoices()
})

function openApply(order: InvoiceOrder) {
  form.orderId = order.orderId
  form.type = 'personal'
  form.title = ''
  form.taxNumber = ''
  form.email = ''
  showApply.value = true
}

async function submitApply() {
  if (submitting.value) return
  if (!form.title.trim()) {
    uni.showToast({ title: '请输入发票抬头', icon: 'none' })
    return
  }
  if (form.type === 'company' && !form.taxNumber.trim()) {
    uni.showToast({ title: '请输入税号', icon: 'none' })
    return
  }
  if (!form.email.trim()) {
    uni.showToast({ title: '请输入接收邮箱', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await orderApi.applyInvoice({
      orderId: form.orderId,
      type: form.type,
      title: form.title,
      taxNumber: form.taxNumber,
      email: form.email,
    })
    showApply.value = false
    uni.showToast({ title: '申请已提交', icon: 'success' })
    loadInvoices()
  } catch {
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally { submitting.value = false }
}

function downloadInvoice(_rec: any) {
  uni.showToast({ title: '发票下载中', icon: 'none' })
}
function resendInvoice(_rec: any) {
  uni.showToast({ title: '已重新发送', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #F5F5F5;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 12px;
  background: #FFFFFF;
}
.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.nav-placeholder {
  width: 60rpx;
}

.tabs {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 99;
  display: flex;
  height: 44px;
  background: #FFFFFF;
  border-bottom: 1rpx solid #EEEEEE;
}
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}
.tab-text {
  font-size: 28rpx;
  color: #666666;
}
.tab-text.active {
  color: #9A2D2D;
  font-weight: 600;
}
.tab-bar {
  position: absolute;
  bottom: 0;
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #9A2D2D;
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

.load-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.loading-spinner { width: 64rpx; height: 64rpx; border: 6rpx solid #E8E3DB; border-top-color: #9A2D2D; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 24rpx; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 28rpx; color: #999; }
.err-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.err-text { font-size: 28rpx; color: #999; margin-top: 16rpx; }
.retry-btn { margin-top: 24rpx; padding: 16rpx 48rpx; border-radius: 16rpx; background: #9A2D2D; }
.retry-btn-text { font-size: 26rpx; color: #fff; font-weight: 500; }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
  gap: 24rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999999;
}

.apply-card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
}
.apply-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.apply-no {
  font-size: 26rpx;
  color: #666666;
}
.apply-time {
  font-size: 24rpx;
  color: #999999;
}
.apply-product {
  display: block;
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #1A1A1A;
  line-height: 1.4;
}
.apply-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #F0F0F0;
}
.apply-amount {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.amount-label {
  font-size: 24rpx;
  color: #999999;
}
.amount-value {
  font-size: 34rpx;
  font-weight: 700;
  color: #9A2D2D;
}
.apply-btn {
  padding: 14rpx 36rpx;
  background: #9A2D2D;
  border-radius: 999rpx;
}
.apply-btn-text {
  font-size: 26rpx;
  color: #FFFFFF;
}

.record-card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
}
.record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #F0F0F0;
}
.record-type {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.record-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.record-status {
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
}
.record-status-text {
  font-size: 22rpx;
}
.record-row {
  display: flex;
  justify-content: space-between;
  margin-top: 16rpx;
}
.record-label {
  font-size: 26rpx;
  color: #999999;
}
.record-val {
  font-size: 26rpx;
  color: #1A1A1A;
  max-width: 460rpx;
  text-align: right;
}
.record-val.amount {
  color: #9A2D2D;
  font-weight: 600;
}
.reject-tip {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 20rpx;
  padding: 16rpx;
  background: rgba(231, 76, 60, 0.08);
  border-radius: 12rpx;
}
.reject-text {
  font-size: 24rpx;
  color: #E74C3C;
}
.record-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F0F0F0;
}
.record-action {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 28rpx;
  border: 1rpx solid #9A2D2D;
  border-radius: 999rpx;
}
.record-action-text {
  font-size: 24rpx;
  color: #9A2D2D;
}

.bottom-gap {
  height: 40rpx;
}

.mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}
.apply-sheet {
  width: 100%;
  padding: 32rpx;
  background: #FFFFFF;
  border-radius: 28rpx 28rpx 0 0;
}
.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.type-switch {
  display: flex;
  gap: 16rpx;
  margin-bottom: 28rpx;
}
.type-item {
  flex: 1;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 12rpx;
  border: 1rpx solid transparent;
}
.type-item.active {
  background: rgba(154, 45, 45, 0.08);
  border-color: #9A2D2D;
}
.type-text {
  font-size: 28rpx;
  color: #666666;
}
.type-text.active {
  color: #9A2D2D;
  font-weight: 600;
}
.form-field {
  margin-bottom: 24rpx;
}
.field-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  color: #666666;
}
.field-input {
  height: 80rpx;
  padding: 0 20rpx;
  background: #F8F8F8;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1A1A1A;
}
.sheet-submit {
  height: 88rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: #9A2D2D;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-submit-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
