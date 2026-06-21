<template>
  <view class="page">
    <app-nav-bar
      title="发票管理"
      :back-size="40"
      :title-size="36"
      title-align="left"
    />

    <!-- Tab 切换 -->
    <view class="tabs">
      <view
        v-for="tab in tabList"
        :key="tab.key"
        class="tab-item"
        @tap="activeTab = tab.key"
      >
        <view class="tab-inner">
          <text
            class="tab-text"
            :class="{ active: activeTab === tab.key }"
          >
            {{ tab.label }}
          </text>
          <view
            v-if="tab.count > 0"
            class="tab-badge"
            :class="{ active: activeTab === tab.key }"
          >
            <text
              class="tab-badge-text"
              :class="{ active: activeTab === tab.key }"
            >
              {{ tab.count }}
            </text>
          </view>
        </view>
        <view
          v-if="activeTab === tab.key"
          class="tab-bar"
        />
      </view>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
    >
      <!-- 申请开票 -->
      <block v-if="activeTab === 'apply'">
        <!-- 选择订单 -->
        <view class="card">
          <view class="card-title-row">
            <app-icon
              name="file-text"
              :size="40"
              color="#C41E3A"
            />
            <text class="card-title">
              选择订单
            </text>
          </view>
          <view
            v-if="applicableOrders.length === 0"
            class="orders-empty"
          >
            <text class="orders-empty-text">
              暂无可开票订单
            </text>
          </view>
          <view
            v-else
            class="order-list"
          >
            <view
              v-for="order in applicableOrders"
              :key="order.orderId"
              class="order-item"
              :class="{ selected: selectedOrders.includes(order.orderId) }"
              @tap="toggleOrder(order.orderId)"
            >
              <view
                class="order-radio"
                :class="{ selected: selectedOrders.includes(order.orderId) }"
              >
                <app-icon
                  v-if="selectedOrders.includes(order.orderId)"
                  name="check"
                  :size="20"
                  color="#FFFFFF"
                />
              </view>
              <view class="order-info">
                <text class="order-name">
                  {{ order.productName }}
                </text>
                <text class="order-no">
                  订单号：{{ order.orderNo }}
                </text>
                <text class="order-time">
                  {{ order.createdAt }}
                </text>
              </view>
              <text class="order-amount">
                ¥{{ order.amount }}
              </text>
            </view>
          </view>
          <view
            v-if="selectedOrders.length > 0"
            class="order-total"
          >
            <text class="order-total-label">
              已选 {{ selectedOrders.length }} 笔订单
            </text>
            <text class="order-total-value">
              ¥{{ totalAmount }}
            </text>
          </view>
        </view>

        <!-- 发票类型 -->
        <view class="card">
          <text class="card-title">
            发票类型
          </text>
          <view class="type-grid">
            <view
              v-for="type in invoiceTypes"
              :key="type.key"
              class="type-card"
              :class="{ active: invoiceType === type.key }"
              @tap="invoiceType = type.key"
            >
              <app-icon
                :name="type.icon"
                :size="48"
                :color="invoiceType === type.key ? '#C41E3A' : '#666666'"
              />
              <text
                class="type-name"
                :class="{ active: invoiceType === type.key }"
              >
                {{ type.label }}
              </text>
              <text class="type-desc">
                {{ type.desc }}
              </text>
            </view>
          </view>
        </view>

        <!-- 发票信息 -->
        <view class="card">
          <text class="card-title">
            发票信息
          </text>
          <view class="form">
            <view class="field">
              <text class="field-label">
                {{ invoiceType === 'company' ? '公司名称' : '个人姓名' }} <text class="req">
                  *
                </text>
              </text>
              <input
                v-model="title"
                class="field-input"
                :placeholder="invoiceType === 'company' ? '请输入公司全称' : '请输入真实姓名'"
              >
            </view>
            <view
              v-if="invoiceType === 'company'"
              class="field"
            >
              <text class="field-label">
                税号 <text class="req">
                  *
                </text>
              </text>
              <input
                v-model="taxNumber"
                class="field-input"
                placeholder="请输入纳税人识别号"
              >
            </view>
            <view class="field">
              <text class="field-label">
                接收邮箱 <text class="req">
                  *
                </text>
              </text>
              <view class="field-icon-wrap">
                <app-icon
                  name="mail"
                  :size="36"
                  color="#999999"
                  class="field-icon"
                />
                <input
                  v-model="email"
                  class="field-input has-icon"
                  placeholder="用于接收电子发票"
                >
              </view>
            </view>
            <view class="field">
              <text class="field-label">
                联系电话（选填）
              </text>
              <view class="field-icon-wrap">
                <app-icon
                  name="phone"
                  :size="36"
                  color="#999999"
                  class="field-icon"
                />
                <input
                  v-model="phone"
                  class="field-input has-icon"
                  placeholder="方便开票问题联系"
                >
              </view>
            </view>
          </view>
        </view>

        <!-- 温馨提示 -->
        <view class="tips-card">
          <app-icon
            name="alert-circle"
            :size="40"
            color="#ca8a04"
            class="tips-icon"
          />
          <view class="tips-body">
            <text class="tips-title">
              温馨提示
            </text>
            <view class="tips-li">
              <text class="tips-text">
                电子发票与纸质发票具有同等法律效力
              </text>
            </view>
            <view class="tips-li">
              <text class="tips-text">
                发票将在1-3个工作日内发送至您的邮箱
              </text>
            </view>
            <view class="tips-li">
              <text class="tips-text">
                如有问题请联系客服
              </text>
            </view>
          </view>
        </view>

        <view class="bottom-gap" />
      </block>

      <!-- 已申请 -->
      <block v-else>
        <view
          v-if="records.length === 0"
          class="empty"
        >
          <app-icon
            name="file-text"
            :size="96"
            color="#D1D5DB"
          />
          <text class="empty-text">
            暂无发票记录
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
                :size="36"
                color="#C41E3A"
              />
              <text class="record-title">
                {{ rec.title }}
              </text>
            </view>
            <view
              class="record-status"
              :style="{ background: statusCfg(rec.status).bg }"
            >
              <text
                class="record-status-text"
                :style="{ color: statusCfg(rec.status).color }"
              >
                {{ statusCfg(rec.status).label }}
              </text>
            </view>
          </view>
          <text
            v-if="rec.taxNumber"
            class="record-tax"
          >
            税号：{{ rec.taxNumber }}
          </text>
          <view class="record-foot">
            <view class="record-foot-left">
              <text class="record-amount">
                ¥{{ rec.amount }}
              </text>
              <text class="record-time">
                {{ rec.createdAt }}
              </text>
            </view>
            <view class="record-actions">
              <view
                v-if="rec.status === 'completed'"
                class="record-btn primary"
                @tap="downloadInvoice(rec)"
              >
                <app-icon
                  name="download"
                  :size="24"
                  color="#FFFFFF"
                />
                <text class="record-btn-text primary">
                  下载
                </text>
              </view>
              <view class="record-btn ghost">
                <app-icon
                  name="eye"
                  :size="24"
                  color="#666666"
                />
                <text class="record-btn-text">
                  详情
                </text>
              </view>
            </view>
          </view>
          <view
            v-if="rec.status === 'rejected' && rec.rejectReason"
            class="reject-tip"
          >
            <text class="reject-text">
              驳回原因：{{ rec.rejectReason }}
            </text>
          </view>
        </view>
        <view class="bottom-gap" />
      </block>
    </scroll-view>

    <!-- 底部提交 -->
    <view
      v-if="activeTab === 'apply'"
      class="submit-bar"
      :style="{ paddingBottom: 16 + safeBottom + 'px' }"
    >
      <view
        class="submit-btn"
        :class="{ disabled: selectedOrders.length === 0 }"
        @tap="submitApply"
      >
        <text class="submit-text">
          提交申请{{ totalAmount > 0 ? ' ¥' + totalAmount : '' }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderApi, invoiceStatusConfig } from '@/lib/order-data'

const safeBottom = ref(0)
const activeTab = ref<'apply' | 'list'>('apply')

const applicableOrders = ref<any[]>([])
const records = ref<any[]>([])
const loading = ref(true)
const loadError = ref(false)

const tabList = computed(() => [
  { key: 'apply' as const, label: '申请开票', count: applicableOrders.value.length },
  { key: 'list' as const, label: '已申请', count: records.value.length },
])

const invoiceTypes = [
  { key: 'personal' as const, label: '个人发票', icon: 'user', desc: '个人消费使用' },
  { key: 'company' as const, label: '企业发票', icon: 'building-2', desc: '公司报销使用' },
]

const selectedOrders = ref<string[]>([])
const invoiceType = ref<'personal' | 'company'>('personal')
const title = ref('')
const taxNumber = ref('')
const email = ref('')
const phone = ref('')

const totalAmount = computed(() =>
  applicableOrders.value.filter((o) => selectedOrders.value.includes(o.orderId)).reduce((s, o) => s + o.amount, 0),
)

function toggleOrder(orderId: string) {
  const i = selectedOrders.value.indexOf(orderId)
  if (i === -1) selectedOrders.value.push(orderId)
  else selectedOrders.value.splice(i, 1)
}

function statusCfg(status: string) {
  return invoiceStatusConfig[status] || { label: status, color: '#999', bg: '#F5F5F5' }
}

onLoad(async () => {
  try {
    const info = uni.getSystemInfoSync()
    safeBottom.value = info.safeAreaInsets?.bottom || 0
  } catch (e) {
    safeBottom.value = 0
  }
  try {
    const res = await orderApi.getInvoices()
    applicableOrders.value = res.orders
    records.value = res.records
  } catch (e) {
    loadError.value = true
  } finally {
    loading.value = false
  }
})

function submitApply() {
  if (selectedOrders.value.length === 0) {
    uni.showToast({ title: '请选择要开票的订单', icon: 'none' })
    return
  }
  if (!title.value.trim()) {
    uni.showToast({ title: invoiceType.value === 'company' ? '请输入公司名称' : '请输入个人姓名', icon: 'none' })
    return
  }
  if (invoiceType.value === 'company' && !taxNumber.value.trim()) {
    uni.showToast({ title: '请输入税号', icon: 'none' })
    return
  }
  if (!email.value.trim()) {
    uni.showToast({ title: '请输入接收邮箱', icon: 'none' })
    return
  }
  selectedOrders.value = []
  title.value = ''
  taxNumber.value = ''
  email.value = ''
  phone.value = ''
  activeTab.value = 'list'
  uni.showToast({ title: '申请已提交', icon: 'success' })
}

function downloadInvoice(_rec: any) {
  uni.showToast({ title: '发票下载中', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FAF8F5;
}

/* Tab */
.tabs {
  flex-shrink: 0;
  display: flex;
  background: #FFFFFF;
  border-bottom: 1rpx solid #E8E3DB;
}
.tab-item {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.tab-inner {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.tab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #666666;
}
.tab-text.active {
  color: #C41E3A;
}
.tab-badge {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tab-badge.active {
  background: #C41E3A;
}
.tab-badge-text {
  font-size: 20rpx;
  color: #4B5563;
}
.tab-badge-text.active {
  color: #FFFFFF;
}
.tab-bar {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 96rpx;
  height: 4rpx;
  border-radius: 999rpx;
  background: #C41E3A;
}

.scroll-area {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

.card {
  margin: 32rpx 32rpx 0;
  padding: 32rpx;
  background: #FFFFFF;
  border-radius: 32rpx;
}
.card-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2C2C2C;
}

/* 订单列表 */
.orders-empty {
  padding: 48rpx 0;
  text-align: center;
}
.orders-empty-text {
  font-size: 28rpx;
  color: #999999;
}
.order-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.order-item {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  border: 4rpx solid #E8E3DB;
  background: #FAF8F5;
}
.order-item.selected {
  border-color: #C41E3A;
  background: #fef2f2;
}
.order-radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 4rpx solid #d1d5db;
  flex-shrink: 0;
  margin-top: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.order-radio.selected {
  border-color: #C41E3A;
  background: #C41E3A;
}
.order-info {
  flex: 1;
  min-width: 0;
}
.order-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.order-no {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999999;
}
.order-time {
  display: block;
  font-size: 24rpx;
  color: #999999;
}
.order-amount {
  font-size: 30rpx;
  font-weight: 600;
  color: #C41E3A;
}
.order-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid #E8E3DB;
}
.order-total-label {
  font-size: 28rpx;
  color: #666666;
}
.order-total-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #C41E3A;
}

/* 发票类型 */
.type-grid {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;
}
.type-card {
  flex: 1;
  padding: 32rpx;
  border-radius: 24rpx;
  border: 4rpx solid #E8E3DB;
  display: flex;
  flex-direction: column;
}
.type-card.active {
  border-color: #C41E3A;
  background: #fef2f2;
}
.type-name {
  margin-top: 16rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.type-name.active {
  color: #C41E3A;
}
.type-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999999;
}

/* 表单 */
.form {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.field-label {
  display: block;
  margin-bottom: 16rpx;
  font-size: 28rpx;
  color: #666666;
}
.req {
  color: #ef4444;
}
.field-input {
  width: 100%;
  height: 88rpx;
  box-sizing: border-box;
  padding: 0 32rpx;
  border-radius: 24rpx;
  border: 1rpx solid #E8E3DB;
  font-size: 28rpx;
  color: #2C2C2C;
  background: #FFFFFF;
}
.field-icon-wrap {
  position: relative;
}
.field-icon {
  position: absolute;
  left: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}
.field-input.has-icon {
  padding-left: 80rpx;
}

/* 温馨提示 */
.tips-card {
  display: flex;
  gap: 16rpx;
  margin: 32rpx;
  padding: 32rpx;
  background: #fefce8;
  border-radius: 24rpx;
}
.tips-icon {
  flex-shrink: 0;
  margin-top: 4rpx;
}
.tips-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #a16207;
  margin-bottom: 8rpx;
}
.tips-li {
  display: flex;
}
.tips-text {
  font-size: 24rpx;
  color: #ca8a04;
  line-height: 1.6;
}

/* 已申请记录 */
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
.record-card {
  margin: 32rpx 32rpx 0;
  padding: 32rpx;
  background: #FFFFFF;
  border-radius: 32rpx;
}
.record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.record-type {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.record-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.record-status {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}
.record-status-text {
  font-size: 22rpx;
}
.record-tax {
  display: block;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color: #999999;
}
.record-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 24rpx;
  border-top: 1rpx solid #E8E3DB;
}
.record-amount {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #C41E3A;
}
.record-time {
  display: block;
  font-size: 24rpx;
  color: #999999;
}
.record-actions {
  display: flex;
  gap: 16rpx;
}
.record-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
}
.record-btn.primary {
  background: #C41E3A;
}
.record-btn.ghost {
  border: 1rpx solid #E8E3DB;
}
.record-btn-text {
  font-size: 24rpx;
  color: #666666;
}
.record-btn-text.primary {
  color: #FFFFFF;
}
.reject-tip {
  margin-top: 24rpx;
  padding: 16rpx;
  background: #fef2f2;
  border-radius: 16rpx;
}
.reject-text {
  font-size: 24rpx;
  color: #dc2626;
}

.bottom-gap {
  height: 180rpx;
}

/* 提交栏 */
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #E8E3DB;
}
.submit-btn {
  height: 88rpx;
  border-radius: 999rpx;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-btn.disabled {
  opacity: 0.5;
}
.submit-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}
</style>
