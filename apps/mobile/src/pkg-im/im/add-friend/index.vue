<template>
  <app-safe-area-top />
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="back-btn" @tap="goBack">
        <AppIcon name="arrow-left" :size="40" color="#2c2c2c" />
      </view>
      <text class="nav-title">添加好友</text>
    </view>

    <view class="content">
      <!-- 按账号添加 -->
      <view class="search-bar">
        <view class="search-input-wrap">
          <AppIcon name="at-sign" :size="32" color="#999999" class="search-icon" />
          <input
            class="search-input"
            :value="query"
            placeholder="输入对方账号 / 智玄号"
            placeholder-class="search-ph"
            confirm-type="send"
            @input="onInput"
            @confirm="onAdd"
          />
        </view>
        <view class="search-btn" :class="{ 'btn-disabled': submitting || !query.trim() }" @tap="onAdd">
          <view v-if="submitting" class="spin">
            <AppIcon name="loader-2" :size="28" color="#ffffff" />
          </view>
          <text v-else class="search-btn-text">添加</text>
        </view>
      </view>

      <!-- 说明：暂无公开用户搜索能力，仅支持按账号发起申请 -->
      <view class="notice">
        <AppIcon name="info" :size="28" color="#B45309" />
        <text class="notice-text">输入对方账号或智玄号发起好友申请，对方同意后成为好友。</text>
      </view>

      <!-- 其他方式 -->
      <view>
        <text class="section-title">其他方式</text>
        <view class="method-list">
          <view v-for="tip in TIPS" :key="tip.label" class="method-item">
            <view class="method-icon">
              <AppIcon :name="tip.icon" :size="40" color="#c41e3a" />
            </view>
            <view class="method-body">
              <text class="method-label">{{ tip.label }}</text>
              <text class="method-desc">{{ tip.desc }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { imApi } from '@/lib/im-data'

const TIPS = [
  { icon: 'qr-code', label: '扫一扫', desc: '扫描好友二维码' },
  { icon: 'phone', label: '手机联系人', desc: '从通讯录添加好友' },
  { icon: 'at-sign', label: '智玄号', desc: '通过智玄号添加' },
]

const query = ref('')
const submitting = ref(false)

// 绑定到 uni <input>，vue-tsc 按原生 input 事件签名校验，保留 any
function onInput(e: any) {
  query.value = e.detail.value
}

// 发起好友申请（真连 POST /im/friends）；防重复提交
async function onAdd() {
  const account = query.value.trim()
  if (!account || submitting.value) return
  submitting.value = true
  try {
    await imApi.addFriend(account)
    uni.showToast({ title: '好友申请已发送', icon: 'none' })
    query.value = ''
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发送失败，请检查账号', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 导航栏 */
.navbar {
  position: sticky;
  top: var(--status-bar-height, 0px);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 24rpx;
  height: 96rpx;
  padding: 0 32rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid #e8e0d5;
}
.back-btn {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}

/* 内容 */
.content {
  padding: 32rpx 32rpx 160rpx;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 48rpx;
}
.search-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  height: 72rpx;
  border: 2rpx solid #e8e0d5;
  border-radius: 12rpx;
  background: #ffffff;
}
.search-icon {
  position: absolute;
  left: 24rpx;
}
.search-input {
  flex: 1;
  height: 72rpx;
  padding-left: 72rpx;
  padding-right: 24rpx;
  font-size: 32rpx;
  color: #2c2c2c;
  background: transparent;
}
.search-ph {
  color: #999999;
}
.search-btn {
  flex-shrink: 0;
  height: 72rpx;
  padding: 0 32rpx;
  border-radius: 12rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-disabled {
  opacity: 0.5;
}
.search-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 说明条 */
.notice {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 24rpx;
  margin-bottom: 40rpx;
  background: #FFFBEB;
  border: 1rpx solid rgba(217, 119, 6, 0.25);
  border-radius: 16rpx;
}
.notice-text {
  flex: 1;
  font-size: 24rpx;
  line-height: 1.6;
  color: #B45309;
}

/* 区块标题 */
.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 24rpx;
}

/* 其他方式 */
.method-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.method-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  background: #ffffff;
  border: 2rpx solid #e8e0d5;
  border-radius: 24rpx;
}
.method-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.method-body {
  display: flex;
  flex-direction: column;
}
.method-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.method-desc {
  font-size: 24rpx;
  color: #999999;
}

/* 空态 */
.empty {
  padding: 96rpx 0;
  text-align: center;
}
.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 搜索结果 */
.result-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.result-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  background: #ffffff;
  border: 2rpx solid #e8e0d5;
  border-radius: 24rpx;
}
.result-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #f0ebe5;
  flex-shrink: 0;
}
.result-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.result-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.result-bio {
  font-size: 24rpx;
  color: #999999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-mutual {
  font-size: 24rpx;
  color: #999999;
}
.add-btn {
  flex-shrink: 0;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.add-btn-default {
  background: var(--brand);
}
.add-btn-done {
  background: transparent;
  border: 2rpx solid #e8e0d5;
}
.add-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
.add-btn-text-done {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}

/* loading 旋转 */
.spin {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
