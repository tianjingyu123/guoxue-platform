<template>
  <view class="payment-methods">
    <!-- 顶部导航 -->
    <app-nav-bar title="支付方式" back-icon="chevron-left" :back-size="40" title-align="left" :bar-height="106">
      <template #right>
        <view class="nav-add" @tap="showAdd = true">
          <app-icon name="plus" :size="28" color="#C41E3A" />
          <text class="nav-add-text">添加</text>
        </view>
      </template>
    </app-nav-bar>

    <scroll-view scroll-y class="content">
      <view class="list">
        <view v-for="m in methods" :key="m.id" class="method-card">
          <view class="method-head">
            <view class="method-icon" :class="m.type">
              <app-icon :name="iconOf(m.type)" :size="40" color="#FFFFFF" />
            </view>
            <view class="method-info">
              <view class="method-name-row">
                <text class="method-name">{{ m.name }}</text>
                <text v-if="m.cardType" class="card-tag">{{ m.cardType === 'debit' ? '储蓄卡' : '信用卡' }}</text>
                <text v-if="m.isDefault" class="default-tag">默认</text>
              </view>
              <text class="method-account">{{ m.account }}</text>
            </view>
            <view class="method-more" @tap="openActions(m)">
              <app-icon name="more-vertical" :size="36" color="#999999" />
            </view>
          </view>
          <view class="method-foot">
            <text class="bind-time">绑定时间：{{ m.bindTime }}</text>
            <view v-if="m.isDefault" class="prefer">
              <app-icon name="check" :size="24" color="#07C160" />
              <text class="prefer-text">支付时优先使用</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 安全提示 -->
      <view class="safe-tip">
        <app-icon name="alert-circle" :size="30" color="#999999" />
        <text class="safe-text">您的支付信息已加密存储，我们不会保存您的支付密码。如有疑问请联系客服。</text>
      </view>
    </scroll-view>

    <!-- 操作菜单 -->
    <view v-if="actionMethod" class="mask" @tap="actionMethod = null">
      <view class="action-sheet" @tap.stop>
        <view v-if="!actionMethod.isDefault" class="action-item" @tap="setDefault">
          <app-icon name="star" :size="32" color="#C9A96E" />
          <text>设为默认</text>
        </view>
        <view class="action-item danger" @tap="askDelete">
          <app-icon name="trash-2" :size="32" color="#C41E3A" />
          <text>解除绑定</text>
        </view>
        <view class="action-item cancel" @tap="actionMethod = null">
          <text>取消</text>
        </view>
      </view>
    </view>

    <!-- 添加支付方式弹窗 -->
    <view v-if="showAdd" class="mask" @tap="showAdd = false">
      <view class="add-sheet" @tap.stop>
        <text class="add-title">添加支付方式</text>
        <view v-for="opt in addOptions" :key="opt.type" class="add-option" @tap="onAdd(opt)">
          <view class="add-icon" :class="opt.type">
            <app-icon :name="iconOf(opt.type)" :size="38" color="#FFFFFF" />
          </view>
          <view class="add-info">
            <text class="add-name">{{ opt.name }}</text>
            <text class="add-desc">{{ opt.desc }}</text>
          </view>
          <app-icon name="chevron-right" :size="32" color="#CCCCCC" />
        </view>
        <view class="add-cancel" @tap="showAdd = false"><text>取消</text></view>
      </view>
    </view>

    <!-- 删除确认 -->
    <view v-if="showDelete" class="mask center" @tap="showDelete = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">解除绑定</text>
        <text class="dialog-desc">解除绑定后，将无法使用该支付方式进行支付，确定解除吗？</text>
        <view class="dialog-actions">
          <view class="dialog-btn" @tap="showDelete = false"><text>取消</text></view>
          <view class="dialog-btn confirm" @tap="confirmDelete"><text>确定</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { boundPaymentMethods, addPaymentOptions, type BoundPaymentMethod } from '@/lib/shop-data'

const methods = ref<BoundPaymentMethod[]>([...boundPaymentMethods])
const addOptions = addPaymentOptions
const actionMethod = ref<BoundPaymentMethod | null>(null)
const showAdd = ref(false)
const showDelete = ref(false)
const pendingDelete = ref<BoundPaymentMethod | null>(null)

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
  showAdd.value = false
  uni.showToast({ title: `将跳转${opt.name}授权页面`, icon: 'none' })
}
</script>

<style lang="scss" scoped>
.payment-methods {
  min-height: 100vh;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
}
.nav-add { display: flex; align-items: center; gap: 6rpx; justify-content: flex-end; white-space: nowrap; }
.nav-add-text { font-size: 26rpx; color: #C41E3A; }
.content { flex: 1; }
.list { padding: 30rpx; }
.method-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 24rpx;
}
.method-head { display: flex; align-items: center; gap: 24rpx; }
.method-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &.wechat { background: #07C160; }
  &.alipay { background: #1677FF; }
  &.bank_card { background: linear-gradient(135deg, #C41E3A, #8B0000); }
}
.method-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.method-name-row { display: flex; align-items: center; gap: 12rpx; }
.method-name { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.card-tag {
  font-size: 20rpx;
  color: #666666;
  background: #FAF8F5;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.default-tag {
  font-size: 20rpx;
  color: #C41E3A;
  background: rgba(196, 30, 58, 0.1);
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.method-account { font-size: 24rpx; color: #999999; }
.method-more { padding: 8rpx; }
.method-foot {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #E8E3DB;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bind-time { font-size: 22rpx; color: #999999; }
.prefer { display: flex; align-items: center; gap: 6rpx; }
.prefer-text { font-size: 22rpx; color: #07C160; }
.safe-tip {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 0 30rpx 40rpx;
}
.safe-text { flex: 1; font-size: 22rpx; color: #999999; line-height: 1.5; }
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
  gap: 12rpx;
  font-size: 32rpx;
  color: #1A1A1A;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  &.danger text { color: #C41E3A; }
  &.cancel { margin-top: 12rpx; font-weight: 600; }
}
.add-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}
.add-title { display: block; text-align: center; font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; }
.add-option {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #FAF8F5;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.add-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &.wechat { background: #07C160; }
  &.alipay { background: #1677FF; }
  &.bank_card { background: linear-gradient(135deg, #C41E3A, #8B0000); }
}
.add-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.add-name { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.add-desc { font-size: 24rpx; color: #999999; }
.add-cancel {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: #666666;
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
.dialog-desc { font-size: 28rpx; color: #666666; text-align: center; margin-bottom: 40rpx; line-height: 1.5; }
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
  &.confirm { background: #C41E3A; color: #FFFFFF; }
}
</style>
