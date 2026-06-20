<template>
  <view class="page">
    <view
      class="nav-bar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view
        class="nav-back"
        @tap="onBack"
      >
        <app-icon
          name="arrow-left"
          :size="40"
          color="#1A1A1A"
        />
      </view>
      <text class="nav-title">
        {{ navTitle }}
      </text>
      <view
        v-if="view === 'create'"
        class="nav-right"
        @tap="switchToList"
      >
        <text class="nav-right-text">
          我的申诉
        </text>
      </view>
      <view
        v-else
        class="nav-placeholder"
      />
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
      :style="{ paddingTop: navHeight + 'px' }"
    >
      <!-- ============ 创建申诉 ============ -->
      <block v-if="view === 'create'">
        <!-- 订单信息 -->
        <view class="card order-card">
          <image
            class="order-cover"
            :src="order.productCover"
            mode="aspectFill"
          />
          <view class="order-info">
            <text class="order-name">
              {{ order.productName }}
            </text>
            <text class="order-no">
              订单号：{{ order.orderNo }}
            </text>
            <text class="order-amount">
              ¥{{ order.amount }}
            </text>
          </view>
        </view>

        <!-- 申诉类型 -->
        <view class="card">
          <text class="section-title">
            申诉类型
          </text>
          <view class="type-grid">
            <view
              v-for="t in disputeTypes"
              :key="t.value"
              class="type-cell"
              :class="{ active: form.type === t.value }"
              @tap="form.type = t.value"
            >
              <app-icon
                :name="t.icon"
                :size="44"
                :color="form.type === t.value ? '#9A2D2D' : '#999999'"
              />
              <text
                class="type-label"
                :class="{ active: form.type === t.value }"
              >
                {{ t.label }}
              </text>
              <text class="type-desc">
                {{ t.desc }}
              </text>
            </view>
          </view>
        </view>

        <!-- 问题描述 -->
        <view class="card">
          <text class="section-title">
            问题描述
          </text>
          <textarea
            v-model="form.description"
            class="desc-input"
            placeholder="请详细描述您遇到的问题，以便我们更快为您处理"
            :maxlength="500"
            placeholder-class="ph"
          />
          <text class="word-count">
            {{ form.description.length }}/500
          </text>
        </view>

        <!-- 上传凭证 -->
        <view class="card">
          <text class="section-title">
            上传凭证（选填）
          </text>
          <view class="upload-wrap">
            <view
              v-for="(img, i) in form.images"
              :key="i"
              class="upload-item"
            >
              <image
                class="upload-img"
                :src="img"
                mode="aspectFill"
              />
              <view
                class="upload-del"
                @tap="removeImage(i)"
              >
                <app-icon
                  name="x"
                  :size="24"
                  color="#FFFFFF"
                />
              </view>
            </view>
            <view
              v-if="form.images.length < 6"
              class="upload-add"
              @tap="addImage"
            >
              <app-icon
                name="camera"
                :size="48"
                color="#999999"
              />
              <text class="upload-hint">
                {{ form.images.length }}/6
              </text>
            </view>
          </view>
        </view>

        <!-- 期望解决方式 -->
        <view class="card">
          <text class="section-title">
            期望解决方式
          </text>
          <input
            v-model="form.expectation"
            class="expect-input"
            placeholder="如：退款、换货、补偿等"
          >
        </view>

        <view class="bottom-gap" />
      </block>

      <!-- ============ 我的申诉列表 ============ -->
      <block v-else-if="view === 'list'">
        <view
          v-if="disputes.length === 0"
          class="empty"
        >
          <app-icon
            name="file-text"
            :size="120"
            color="#DDDDDD"
          />
          <text class="empty-text">
            暂无申诉记录
          </text>
        </view>
        <view
          v-for="d in disputes"
          :key="d.id"
          class="dispute-card"
          @tap="openDetail(d.id)"
        >
          <view class="dispute-head">
            <text class="dispute-no">
              申诉单号：{{ d.orderNo }}
            </text>
            <view
              class="dispute-status"
              :style="{ color: sCfg(d.status).color, background: sCfg(d.status).bg }"
            >
              <app-icon
                :name="sCfg(d.status).icon"
                :size="24"
                :color="sCfg(d.status).color"
              />
              <text
                class="dispute-status-text"
                :style="{ color: sCfg(d.status).color }"
              >
                {{ sCfg(d.status).label }}
              </text>
            </view>
          </view>
          <view class="dispute-body">
            <image
              class="dispute-cover"
              :src="d.productCover"
              mode="aspectFill"
            />
            <view class="dispute-info">
              <text class="dispute-name">
                {{ d.productName }}
              </text>
              <text class="dispute-type">
                {{ typeLabel(d.type) }}
              </text>
              <text class="dispute-time">
                {{ d.createdAt }}
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="32"
              color="#CCCCCC"
            />
          </view>
        </view>
      </block>

      <!-- ============ 申诉详情 ============ -->
      <block v-else>
        <view class="card detail-status-card">
          <view
            class="detail-status"
            :style="{ color: sCfg(detail.status).color }"
          >
            <app-icon
              :name="sCfg(detail.status).icon"
              :size="48"
              :color="sCfg(detail.status).color"
            />
            <text
              class="detail-status-text"
              :style="{ color: sCfg(detail.status).color }"
            >
              {{ sCfg(detail.status).label }}
            </text>
          </view>
          <text class="detail-no">
            申诉单号：{{ detail.orderNo }}
          </text>
        </view>

        <view class="card">
          <text class="section-title">
            申诉商品
          </text>
          <view class="order-card-inner">
            <image
              class="order-cover"
              :src="detail.order.productCover"
              mode="aspectFill"
            />
            <view class="order-info">
              <text class="order-name">
                {{ detail.order.productName }}
              </text>
              <text class="order-amount">
                ¥{{ detail.order.amount }}
              </text>
            </view>
          </view>
        </view>

        <view class="card">
          <text class="section-title">
            申诉信息
          </text>
          <view class="info-row">
            <text class="info-label">
              申诉类型
            </text><text class="info-val">
              {{ typeLabel(detail.type) }}
            </text>
          </view>
          <view class="info-block">
            <text class="info-label">
              问题描述
            </text>
            <text class="info-desc">
              {{ detail.description }}
            </text>
          </view>
          <view
            v-if="detail.images.length"
            class="info-block"
          >
            <text class="info-label">
              凭证图片
            </text>
            <view class="detail-imgs">
              <image
                v-for="(img, i) in detail.images"
                :key="i"
                class="detail-img"
                :src="img"
                mode="aspectFill"
                @tap="previewImage(detail.images, i)"
              />
            </view>
          </view>
          <view class="info-block">
            <text class="info-label">
              期望解决
            </text>
            <text class="info-desc">
              {{ detail.expectation }}
            </text>
          </view>
        </view>

        <view class="card">
          <text class="section-title">
            处理进度
          </text>
          <view class="timeline">
            <view
              v-for="(node, idx) in detail.timeline"
              :key="idx"
              class="tl-node"
            >
              <view class="tl-col">
                <view
                  class="tl-dot"
                  :class="{ current: node.isCurrent, done: idx <= currentIdx }"
                />
                <view
                  v-if="idx < detail.timeline.length - 1"
                  class="tl-line"
                />
              </view>
              <view class="tl-body">
                <text
                  class="tl-title"
                  :class="{ active: idx <= currentIdx }"
                >
                  {{ node.title }}
                </text>
                <text class="tl-desc">
                  {{ node.description }}
                </text>
                <text
                  v-if="node.time"
                  class="tl-time"
                >
                  {{ node.time }}
                </text>
              </view>
            </view>
          </view>
        </view>
        <view class="bottom-gap" />
      </block>
    </scroll-view>

    <!-- 底部操作 -->
    <view
      v-if="view === 'create'"
      class="action-bar"
      :style="{ paddingBottom: safeBottom + 'px' }"
    >
      <view
        class="submit-btn"
        @tap="submit"
      >
        <text class="submit-text">
          提交申诉
        </text>
      </view>
    </view>
    <view
      v-else-if="view === 'detail' && detail.canCancel"
      class="action-bar"
      :style="{ paddingBottom: safeBottom + 'px' }"
    >
      <view
        class="cancel-btn"
        @tap="cancelDispute"
      >
        <text class="cancel-text">
          撤销申诉
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import {
  orderApi,
  disputeTypes,
  disputeStatusConfig,
  disputeOrder,
  myDisputes,
  disputeDetail,
  type DisputeOrderBrief,
  type DisputeListItem,
  type DisputeDetail as DisputeDetailType,
} from '@/lib/order-data'

const statusBarHeight = ref(20)
const navHeight = ref(64)
const safeBottom = ref(0)

const view = ref<'create' | 'list' | 'detail'>('create')
const submitting = ref(false)
const loading = ref(false)
const error = ref('')

const order = ref<DisputeOrderBrief>(disputeOrder)
const disputes = ref<DisputeListItem[]>(myDisputes)
const detail = ref<DisputeDetailType>(disputeDetail)

const form = reactive({
  type: disputeTypes[0].value,
  description: '',
  images: [] as string[],
  expectation: '',
})

const navTitle = computed(() =>
  view.value === 'create' ? '发起申诉' : view.value === 'list' ? '我的申诉' : '申诉详情',
)
const currentIdx = computed(() => detail.value?.timeline?.findIndex((n: any) => n.isCurrent) ?? -1)

async function loadDisputes() {
  loading.value = true
  error.value = ''
  try {
    const res = await orderApi.getDisputes()
    disputes.value = res.items || res || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally { loading.value = false }
}

async function loadDisputeDetail(id: string) {
  loading.value = true
  error.value = ''
  try {
    detail.value = await orderApi.getDisputeDetail(id)
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally { loading.value = false }
}

function sCfg(status: string) {
  return disputeStatusConfig[status] || { label: status, color: '#999', bg: '#F5F5F5', icon: 'clock' }
}
function typeLabel(val: string) {
  return disputeTypes.find((t) => t.value === val)?.label || val
}

onLoad((q) => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = statusBarHeight.value + 44
    safeBottom.value = info.safeAreaInsets?.bottom || 0
  } catch (e) {
    statusBarHeight.value = 20
    navHeight.value = 64
  }
  if (q && q.view === 'list') { view.value = 'list'; loadDisputes() }
})

function onBack() {
  if (view.value === 'detail') {
    view.value = 'list'
  } else {
    goBack()
  }
}
function switchToList() {
  view.value = 'list'
  loadDisputes()
}
function openDetail(id: string) {
  view.value = 'detail'
  loadDisputeDetail(id)
}

function addImage() {
  uni.chooseImage({
    count: 6 - form.images.length,
    success: (res) => form.images.push(...(res.tempFilePaths as string[])),
  })
}
function removeImage(i: number) {
  form.images.splice(i, 1)
}
function previewImage(urls: string[], current: number) {
  uni.previewImage({ urls, current })
}

async function submit() {
  if (submitting.value) return
  if (!form.description.trim()) {
    uni.showToast({ title: '请填写问题描述', icon: 'none' })
    return
  }
  if (!form.expectation.trim()) {
    uni.showToast({ title: '请填写期望解决方式', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await orderApi.submitDispute({
      type: form.type,
      description: form.description,
      images: form.images,
      expectation: form.expectation,
    })
    uni.showToast({ title: '申诉已提交', icon: 'success' })
    setTimeout(() => (view.value = 'list'), 1200)
  } catch {
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally { submitting.value = false }
}

async function cancelDispute() {
  uni.showModal({
    title: '撤销申诉',
    content: '确定要撤销这次申诉吗？',
    confirmColor: '#9A2D2D',
    success: async (res) => {
      if (res.confirm) {
        try {
          await orderApi.cancelDispute(detail.value.id)
          uni.showToast({ title: '已撤销', icon: 'none' })
          view.value = 'list'
        } catch { uni.showToast({ title: '撤销失败，请重试', icon: 'none' }) }
      }
    },
  })
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
  border-bottom: 1rpx solid #EEEEEE;
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
  width: 100rpx;
}
.nav-right {
  width: 100rpx;
  text-align: right;
}
.nav-right-text {
  font-size: 26rpx;
  color: #9A2D2D;
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

.card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.order-card {
  display: flex;
  gap: 20rpx;
}
.order-card-inner {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}
.order-cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
}
.order-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.order-name {
  font-size: 28rpx;
  color: #1A1A1A;
  line-height: 1.4;
}
.order-no {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999999;
}
.order-amount {
  margin-top: auto;
  font-size: 30rpx;
  font-weight: 600;
  color: #9A2D2D;
}

.type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 24rpx;
}
.type-cell {
  width: calc(50% - 10rpx);
  padding: 24rpx;
  background: #F8F8F8;
  border-radius: 16rpx;
  border: 1rpx solid transparent;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.type-cell.active {
  background: rgba(154, 45, 45, 0.06);
  border-color: #9A2D2D;
}
.type-label {
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: 600;
}
.type-label.active {
  color: #9A2D2D;
}
.type-desc {
  font-size: 22rpx;
  color: #999999;
}

.desc-input {
  width: 100%;
  height: 200rpx;
  margin-top: 20rpx;
  padding: 20rpx;
  background: #F8F8F8;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1A1A1A;
  box-sizing: border-box;
}
.ph {
  color: #BBBBBB;
}
.word-count {
  display: block;
  text-align: right;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999999;
}

.upload-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 24rpx;
}
.upload-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}
.upload-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
}
.upload-del {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-add {
  width: 160rpx;
  height: 160rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: #F8F8F8;
  border: 1rpx dashed #DDDDDD;
  border-radius: 12rpx;
}
.upload-hint {
  font-size: 22rpx;
  color: #999999;
}

.expect-input {
  height: 80rpx;
  margin-top: 20rpx;
  padding: 0 20rpx;
  background: #F8F8F8;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1A1A1A;
}

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

.dispute-card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
}
.dispute-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #F0F0F0;
}
.dispute-no {
  font-size: 26rpx;
  color: #666666;
}
.dispute-status {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
}
.dispute-status-text {
  font-size: 22rpx;
}
.dispute-body {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 20rpx;
}
.dispute-cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
}
.dispute-info {
  flex: 1;
}
.dispute-name {
  font-size: 28rpx;
  color: #1A1A1A;
  line-height: 1.4;
}
.dispute-type {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #9A2D2D;
}
.dispute-time {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #999999;
}

.detail-status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx;
}
.detail-status {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.detail-status-text {
  font-size: 34rpx;
  font-weight: 700;
}
.detail-no {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #999999;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
}
.info-label {
  font-size: 26rpx;
  color: #999999;
}
.info-val {
  font-size: 26rpx;
  color: #1A1A1A;
}
.info-block {
  margin-top: 20rpx;
}
.info-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #1A1A1A;
  line-height: 1.5;
}
.detail-imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 12rpx;
}
.detail-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
}

.timeline {
  margin-top: 24rpx;
}
.tl-node {
  display: flex;
  gap: 20rpx;
}
.tl-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tl-dot {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: #DDDDDD;
  flex-shrink: 0;
  margin-top: 6rpx;
}
.tl-dot.done {
  background: #9A2D2D;
}
.tl-dot.current {
  box-shadow: 0 0 0 6rpx rgba(154, 45, 45, 0.18);
}
.tl-line {
  flex: 1;
  width: 2rpx;
  background: #EEEEEE;
  margin: 4rpx 0;
}
.tl-body {
  flex: 1;
  padding-bottom: 36rpx;
}
.tl-title {
  font-size: 28rpx;
  color: #999999;
  font-weight: 600;
}
.tl-title.active {
  color: #1A1A1A;
}
.tl-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 26rpx;
  color: #666666;
}
.tl-time {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #999999;
}

.bottom-gap {
  height: 160rpx;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #EEEEEE;
}
.submit-btn {
  height: 88rpx;
  border-radius: 999rpx;
  background: #9A2D2D;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}
.cancel-btn {
  height: 88rpx;
  border-radius: 999rpx;
  border: 1rpx solid #DDDDDD;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cancel-text {
  font-size: 30rpx;
  color: #666666;
}
</style>
