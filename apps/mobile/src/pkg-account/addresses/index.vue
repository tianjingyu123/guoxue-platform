<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="#2C2C2C" />
        </view>
        <text class="nav-title">收货地址</text>
        <view class="nav-add" @tap="goEdit()">
          <app-icon name="plus" :size="40" color="#C41E3A" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 空态 -->
      <view v-if="loading" class="loading-state">加载中...</view>
      <view v-else-if="error" class="error-state">
        <text>{{ error }}</text>
        <view @tap="fetchAddresses">重试</view>
      </view>
      <template v-else>
        <view v-if="addresses.length === 0" class="empty">
          <view class="empty-icon">
            <app-icon name="map-pin" :size="80" color="#999999" />
          </view>
          <text class="empty-text">还没有收货地址，添加一个方便下单</text>
          <view class="empty-btn" @tap="goEdit()">
            <text class="empty-btn-text">添加地址</text>
          </view>
        </view>

        <!-- 地址列表 -->
        <view class="list">
          <view
            v-for="addr in addresses"
            :key="addr.id"
            class="addr-wrap"
          >
            <!-- 删除按钮 -->
            <view class="delete-zone" @tap="confirmDelete(addr.id)">
              <app-icon name="trash-2" :size="44" color="#FFFFFF" />
            </view>
            <!-- 地址卡片 -->
            <view
              class="addr-card"
              :class="{ swiped: swipedId === addr.id }"
              @touchstart="onTouchStart"
              @touchmove="onTouchMove($event, addr.id)"
              @touchend="onTouchEnd"
              @tap="goEdit(addr.id)"
            >
              <view class="addr-top">
                <view class="addr-pin" :class="{ active: addr.isDefault }">
                  <app-icon name="map-pin" :size="32" :color="addr.isDefault ? '#C41E3A' : '#999999'" />
                </view>
                <view class="addr-main">
                  <view class="addr-line1">
                    <text class="addr-name">{{ addr.name }}</text>
                    <text class="addr-phone">{{ addr.phone }}</text>
                    <view v-if="addr.isDefault" class="addr-tag">
                      <text class="addr-tag-text">默认</text>
                    </view>
                  </view>
                  <text class="addr-detail">{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.address }}</text>
                </view>
              </view>

              <view class="addr-foot">
                <view class="foot-default" @tap.stop="setDefault(addr)">
                  <view class="radio" :class="{ checked: addr.isDefault }">
                    <app-icon v-if="addr.isDefault" name="check" :size="18" color="#FFFFFF" />
                  </view>
                  <text class="foot-default-text" :class="{ active: addr.isDefault }">设为默认</text>
                </view>
                <view class="foot-edit" @tap.stop="goEdit(addr.id)">
                  <text class="foot-edit-text">编辑</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="bottom-gap" />
      </template>
    </scroll-view>

    <!-- 底部新增 -->
    <view v-if="addresses.length > 0" class="footer" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="add-btn" @tap="goEdit()">
        <app-icon name="plus" :size="34" color="#FFFFFF" />
        <text class="add-btn-text">新增收货地址</text>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <view v-if="deleteId" class="mask mask-fade-in" @tap="cancelDelete">
      <view class="confirm-box dialog-pop-in" @tap.stop>
        <text class="confirm-title">删除地址</text>
        <text class="confirm-desc">确定要删除这个收货地址吗？</text>
        <view class="confirm-actions">
          <view class="confirm-btn ghost" @tap="cancelDelete">
            <text class="confirm-btn-text">取消</text>
          </view>
          <view class="confirm-btn danger" @tap="doDelete">
            <text class="confirm-btn-text-danger">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { goBack, navigateTo } from '@/utils/router'
import { accountApi, type ShippingAddressItem } from '@/pkg-account/lib/account-data'

const statusBarHeight = ref(20)
const navHeight = ref(64)
const safeBottom = ref(0)

const addresses = ref<ShippingAddressItem[]>([])
const swipedId = ref('')
const deleteId = ref('')
const loading = ref(false)
const error = ref('')
const deleting = ref(false)

let touchStartX = 0

async function fetchAddresses() {
  loading.value = true
  error.value = ''
  try {
    const data = await accountApi.addresses()
    addresses.value = data || []
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = statusBarHeight.value + 44
    safeBottom.value = info.safeAreaInsets?.bottom || 0
  } catch (e) {
    statusBarHeight.value = 20
    navHeight.value = 64
  }
})

// 用 onShow 拉取：新增/编辑地址子页保存后 goBack 无 emit，靠 onShow 每次返回重拉覆盖陈旧列表（首次进入也会触发）
onShow(fetchAddresses)

function onTouchStart(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  touchStartX = e.touches[0].clientX
}
function onTouchMove(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */, id: string) {
  const diff = touchStartX - e.touches[0].clientX
  if (diff > 40) {
    swipedId.value = id
  } else if (diff < -20) {
    swipedId.value = ''
  }
}
function onTouchEnd() {
  touchStartX = 0
}

const settingDefault = ref(false)
async function setDefault(addr: ShippingAddressItem) {
  if (addr.isDefault || settingDefault.value) return
  settingDefault.value = true
  try {
    await accountApi.setDefaultAddress(addr.id)
    addresses.value = addresses.value.map((a) => ({ ...a, isDefault: a.id === addr.id }))
    uni.showToast({ title: '已设为默认', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '设置失败', icon: 'none' })
  } finally {
    settingDefault.value = false
  }
}

function confirmDelete(id: string) {
  deleteId.value = id
}
function cancelDelete() {
  deleteId.value = ''
  swipedId.value = ''
}
async function doDelete() {
  if (deleting.value) return
  const idToDelete = deleteId.value
  deleting.value = true
  try {
    await accountApi.deleteAddress(idToDelete)
    addresses.value = addresses.value.filter((a) => a.id !== idToDelete)
    deleteId.value = ''
    swipedId.value = ''
    uni.showToast({ title: '已删除', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
  } finally {
    deleting.value = false
  }
}

function goEdit(id?: string) {
  navigateTo(id ? `/shop/addresses/edit?id=${id}` : '/shop/addresses/edit')
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
}
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #FFFFFF;
  border-bottom: 1rpx solid #F0EAE2;
}
.nav-bar {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 12rpx;
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.nav-add {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

.empty {
  padding: 160rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 32rpx;
}
.empty-btn {
  padding: 0 48rpx;
  height: 72rpx;
  background: var(--brand);
  border-radius: 36rpx;
  display: flex;
  align-items: center;
}
.empty-btn-text {
  font-size: 28rpx;
  color: #FFFFFF;
}

.list {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.addr-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 24rpx;
}
.delete-zone {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 140rpx;
  background: #E74C3C;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 24rpx 24rpx 0;
}
.addr-card {
  position: relative;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 28rpx;
  transition: transform 0.25s;
  transform: translateX(0);
}
.addr-card.swiped {
  transform: translateX(-140rpx);
}
.addr-top {
  display: flex;
  gap: 20rpx;
}
.addr-pin {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #FAF8F5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.addr-pin.active {
  background: rgba(196, 30, 58, 0.1);
}
.addr-main {
  flex: 1;
  min-width: 0;
}
.addr-line1 {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}
.addr-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.addr-phone {
  font-size: 26rpx;
  color: #666666;
}
.addr-tag {
  padding: 2rpx 12rpx;
  background: var(--brand);
  border-radius: 6rpx;
}
.addr-tag-text {
  font-size: 20rpx;
  color: #FFFFFF;
}
.addr-detail {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.5;
}
.addr-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #F0EAE2;
}
.foot-default {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.radio {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 2rpx solid #CCCCCC;
  display: flex;
  align-items: center;
  justify-content: center;
}
.radio.checked {
  border-color: var(--brand);
  background: var(--brand);
}
.foot-default-text {
  font-size: 26rpx;
  color: #666666;
}
.foot-default-text.active {
  color: var(--brand);
}
.foot-edit {
  padding: 4rpx 8rpx;
}
.foot-edit-text {
  font-size: 26rpx;
  color: #666666;
}

.bottom-gap {
  height: 180rpx;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1rpx solid #F0EAE2;
  padding: 20rpx 24rpx;
}
.add-btn {
  height: 88rpx;
  background: var(--brand);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}
.add-btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-box {
  width: 560rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 48rpx 40rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.confirm-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 16rpx;
}
.confirm-desc {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 40rpx;
}
.confirm-actions {
  display: flex;
  gap: 20rpx;
  width: 100%;
}
.confirm-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-btn.ghost {
  border: 1rpx solid #E8E3DB;
}
.confirm-btn.danger {
  background: #E74C3C;
}
.confirm-btn-text {
  font-size: 28rpx;
  color: #666666;
}
.confirm-btn-text-danger {
  font-size: 28rpx;
  color: #FFFFFF;
}
</style>
