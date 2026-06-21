<template>
  <view class="payment-methods">
    <!-- 顶部导航 -->
    <view
      class="nav-bar"
      :style="{ paddingTop: 'calc(20rpx + var(--status-bar-height, 0px))' }"
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
        支付方式
      </text>
      <view class="nav-placeholder" />
    </view>

    <scroll-view
      scroll-y
      class="content"
    >
      <!-- 已绑定支付方式 -->
      <view class="section">
        <text class="section-title">
          已绑定
        </text>
        <view
          v-for="m in methods"
          :key="m.id"
          class="method-card"
          @tap="openActions(m)"
        >
          <view
            class="method-icon"
            :class="m.type"
          >
            <app-icon
              :name="iconOf(m.type)"
              :size="40"
              color="#FFFFFF"
            />
          </view>
          <view class="method-info">
            <view class="method-name-row">
              <text class="method-name">
                {{ m.name }}
              </text>
              <text
                v-if="m.isDefault"
                class="default-tag"
              >
                默认
              </text>
            </view>
            <text class="method-account">
              {{ m.account }}
            </text>
          </view>
          <app-icon
            name="chevron-right"
            :size="36"
            color="#CCCCCC"
          />
        </view>
      </view>

      <!-- 添加支付方式 -->
      <view class="section">
        <text class="section-title">
          添加支付方式
        </text>
        <view
          v-for="opt in addOptions"
          :key="opt.type"
          class="add-card"
          @tap="onAdd(opt)"
        >
          <view
            class="method-icon"
            :class="opt.type"
          >
            <app-icon
              :name="iconOf(opt.type)"
              :size="40"
              color="#FFFFFF"
            />
          </view>
          <view class="method-info">
            <text class="method-name">
              {{ opt.name }}
            </text>
            <text class="method-account">
              {{ opt.desc }}
            </text>
          </view>
          <app-icon
            name="plus"
            :size="36"
            color="#9A2D2D"
          />
        </view>
      </view>

      <view class="safe-tip">
        <app-icon
          name="shield"
          :size="30"
          color="#999999"
        />
        <text class="safe-text">
          您的支付信息已加密保护
        </text>
      </view>
    </scroll-view>

    <!-- 操作菜单 -->
    <view
      v-if="actionMethod"
      class="mask"
      @tap="actionMethod = null"
    >
      <view
        class="action-sheet"
        @tap.stop
      >
        <view
          v-if="!actionMethod.isDefault"
          class="action-item"
          @tap="setDefault"
        >
          <text>设为默认</text>
        </view>
        <view
          class="action-item danger"
          @tap="askDelete"
        >
          <text>解除绑定</text>
        </view>
        <view
          class="action-item cancel"
          @tap="actionMethod = null"
        >
          <text>取消</text>
        </view>
      </view>
    </view>

    <!-- 删除确认 -->
    <view
      v-if="showDelete"
      class="mask center"
      @tap="showDelete = false"
    >
      <view
        class="dialog"
        @tap.stop
      >
        <text class="dialog-title">
          解除绑定
        </text>
        <text class="dialog-desc">
          确定要解除「{{ pendingDelete?.name }}」的绑定吗？
        </text>
        <view class="dialog-actions">
          <view
            class="dialog-btn"
            @tap="showDelete = false"
          >
            <text>取消</text>
          </view>
          <view
            class="dialog-btn confirm"
            @tap="confirmDelete"
          >
            <text>确定</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { navigateBack } from '@/utils/router'
import { addPaymentOptions, shopApi, type BoundPaymentMethod } from '@/lib/shop-data'

const methods = ref<BoundPaymentMethod[]>([])
const addOptions = addPaymentOptions
const actionMethod = ref<BoundPaymentMethod | null>(null)
const showDelete = ref(false)
const pendingDelete = ref<BoundPaymentMethod | null>(null)

onMounted(async () => {
  try {
    const res = await shopApi.getPaymentMethods()
    methods.value = Array.isArray(res) ? res : []
  } catch { /* keep empty */ }
})

function goBack() {
  navigateBack()
}
function iconOf(type: string) {
  if (type === 'wechat') return 'message-circle'
  if (type === 'alipay') return 'wallet'
  return 'credit-card'
}
function openActions(m: BoundPaymentMethod) {
  actionMethod.value = m
}
function setDefault() {
  if (!actionMethod.value) return
  methods.value = methods.value.map((m) => ({ ...m, isDefault: m.id === actionMethod.value!.id }))
  actionMethod.value = null
  uni.showToast({ title: '已设为默认', icon: 'success' })
}
function askDelete() {
  pendingDelete.value = actionMethod.value
  actionMethod.value = null
  showDelete.value = true
}
function confirmDelete() {
  if (pendingDelete.value) {
    methods.value = methods.value.filter((m) => m.id !== pendingDelete.value!.id)
  }
  showDelete.value = false
  pendingDelete.value = null
  uni.showToast({ title: '已解除绑定', icon: 'success' })
}
function onAdd(opt: { type: string; name: string }) {
  uni.showToast({ title: `绑定${opt.name}`, icon: 'none' })
}
</script>

<style lang="scss" scoped>
.payment-methods {
  min-height: 100vh;
  background: #F5F5F5;
  display: flex;
  flex-direction: column;
}
.nav-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #FFFFFF;
}
.nav-back { width: 60rpx; }
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.nav-placeholder { width: 60rpx; }
.content { flex: 1; }
.section { padding: 30rpx; }
.section-title {
  display: block;
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 20rpx;
}
.method-card, .add-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
}
.method-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &.wechat { background: #07C160; }
  &.alipay { background: #1677FF; }
  &.bank_card { background: #9A2D2D; }
}
.method-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.method-name-row { display: flex; align-items: center; gap: 12rpx; }
.method-name { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.default-tag {
  font-size: 20rpx;
  color: #9A2D2D;
  background: rgba(154, 45, 45, 0.1);
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.method-account { font-size: 24rpx; color: #999999; }
.safe-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 40rpx;
}
.safe-text { font-size: 24rpx; color: #999999; }
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  &.center { align-items: center; justify-content: center; }
}
.action-sheet {
  width: 100%;
  background: #F5F5F5;
  border-radius: 24rpx 24rpx 0 0;
  padding: 16rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.action-item {
  height: 100rpx;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #1A1A1A;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  &.danger text { color: #E74C3C; }
  &.cancel { margin-top: 12rpx; font-weight: 600; }
}
.dialog {
  width: 600rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 48rpx 40rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dialog-title { font-size: 34rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 20rpx; }
.dialog-desc { font-size: 28rpx; color: #666666; text-align: center; margin-bottom: 40rpx; }
.dialog-actions { display: flex; gap: 24rpx; width: 100%; }
.dialog-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  background: #F5F5F5;
  color: #666666;
  &.confirm { background: #9A2D2D; color: #FFFFFF; }
}
</style>
