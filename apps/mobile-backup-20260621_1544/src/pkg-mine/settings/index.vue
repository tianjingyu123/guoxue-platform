<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import {
  settingNotifyItems, settingCollectOptions, settingFontOptions,
  settingDarkOptions, settingCacheSize,
} from '@/lib/mine-data'

// 通知开关
const notifications = ref<Record<string, boolean>>(
  Object.fromEntries(settingNotifyItems.map((i) => [i.key, i.value])),
)
function toggleNotify(key: string) {
  notifications.value[key] = !notifications.value[key]
}

// 通用设置
const fontSize = ref('medium')
const darkMode = ref('system')
const collectVisible = ref('public')
const historyVisible = ref(true)
const cacheCleared = ref(false)

// 弹窗状态
const showLogout = ref(false)
const showClearCache = ref(false)
const showFont = ref(false)
const showDark = ref(false)
const showCollect = ref(false)

function labelOf(options: { label: string; value: string }[], v: string) {
  return options.find((o) => o.value === v)?.label ?? ''
}

function handleClearCache() {
  cacheCleared.value = true
  showClearCache.value = false
  setTimeout(() => (cacheCleared.value = false), 3000)
}
function handleLogout() {
  showLogout.value = false
  navigateTo('/login')
}

// 选项弹窗通用处理
type OptionDialogState = { title: string; options: { label: string; value: string }[]; current: string; onPick: (v: string) => void } | null
const optionDialog = ref<OptionDialogState>(null)
function openFont() {
  optionDialog.value = { title: '字体大小', options: settingFontOptions, current: fontSize.value, onPick: (v) => (fontSize.value = v) }
}
function openDark() {
  optionDialog.value = { title: '深色模式', options: settingDarkOptions, current: darkMode.value, onPick: (v) => (darkMode.value = v) }
}
function openCollect() {
  optionDialog.value = { title: '谁可以看我的收藏', options: settingCollectOptions, current: collectVisible.value, onPick: (v) => (collectVisible.value = v) }
}
function pickOption(v: string) {
  optionDialog.value?.onPick(v)
  optionDialog.value = null
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view
        class="nav-btn"
        @tap="goBack"
      >
        <AppIcon
          name="chevron-left"
          :size="22"
          color="#2C2C2C"
        />
      </view>
      <text class="nav-title">
        设置
      </text>
      <view class="nav-btn" />
    </view>

    <scroll-view
      scroll-y
      class="scroll"
    >
      <!-- 账号安全 -->
      <view class="group">
        <text class="group-title">
          账号安全
        </text>
        <view class="card">
          <view
            class="row"
            @tap="navigateTo('/mine/security')"
          >
            <AppIcon
              name="shield"
              :size="18"
              color="#C41E3A"
            />
            <text class="row-label">
              账号安全中心
            </text>
            <text class="row-badge">
              安全分 82
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
          <view
            class="row"
            @tap="navigateTo('/mine/change-password')"
          >
            <AppIcon
              name="lock"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              修改密码
            </text>
            <text class="row-sub">
              上次修改：30天前
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
          <view
            class="row"
            @tap="navigateTo('/mine/change-phone')"
          >
            <AppIcon
              name="phone"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              修改手机号
            </text>
            <text class="row-sub">
              138****8888
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
          <view
            class="row"
            @tap="navigateTo('/mine/payment-password')"
          >
            <AppIcon
              name="credit-card"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              支付密码
            </text>
            <text class="row-sub">
              已设置
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
          <view
            class="row"
            @tap="navigateTo('/mine/bind-accounts')"
          >
            <AppIcon
              name="smartphone"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              第三方账号
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
        </view>
      </view>

      <!-- 通知设置 -->
      <view class="group">
        <text class="group-title">
          通知设置
        </text>
        <view class="card">
          <view
            v-for="item in settingNotifyItems"
            :key="item.key"
            class="row"
          >
            <AppIcon
              :name="item.icon"
              :size="18"
              color="#999"
            />
            <text class="row-label">
              {{ item.label }}
            </text>
            <view
              class="switch"
              :class="{ on: notifications[item.key] }"
              @tap="toggleNotify(item.key)"
            >
              <view
                class="switch-dot"
                :class="{ on: notifications[item.key] }"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 隐私设置 -->
      <view class="group">
        <text class="group-title">
          隐私设置
        </text>
        <view class="card">
          <view
            class="row"
            @tap="navigateTo('/mine/blacklist')"
          >
            <AppIcon
              name="user-x"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              黑名单管理
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
          <view
            class="row"
            @tap="openCollect"
          >
            <AppIcon
              name="eye"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              谁可以看我的收藏
            </text>
            <text class="row-sub">
              {{ labelOf(settingCollectOptions, collectVisible) }}
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
          <view class="row">
            <AppIcon
              name="eye-off"
              :size="18"
              color="#999"
            />
            <text class="row-label">
              浏览记录可见
            </text>
            <view
              class="switch"
              :class="{ on: historyVisible }"
              @tap="historyVisible = !historyVisible"
            >
              <view
                class="switch-dot"
                :class="{ on: historyVisible }"
              />
            </view>
          </view>
          <view
            class="row"
            @tap="toastComingSoon"
          >
            <AppIcon
              name="history"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              清除浏览历史
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
        </view>
      </view>

      <!-- 通用 -->
      <view class="group">
        <text class="group-title">
          通用
        </text>
        <view class="card">
          <view
            class="row"
            @tap="showClearCache = true"
          >
            <AppIcon
              name="hard-drive"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              清除缓存
            </text>
            <text
              class="row-sub"
              :style="{ color: cacheCleared ? '#22c55e' : '#999' }"
            >
              {{ cacheCleared ? '已清除' : settingCacheSize }}
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
          <view
            class="row"
            @tap="openFont"
          >
            <AppIcon
              name="type"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              字体大小
            </text>
            <text class="row-sub">
              {{ labelOf(settingFontOptions, fontSize) }}
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
          <view
            class="row"
            @tap="openDark"
          >
            <AppIcon
              name="moon"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              深色模式
            </text>
            <text class="row-sub">
              {{ labelOf(settingDarkOptions, darkMode) }}
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
        </view>
      </view>

      <!-- 其他 -->
      <view class="group">
        <text class="group-title">
          其他
        </text>
        <view class="card">
          <view
            class="row"
            @tap="toastComingSoon"
          >
            <AppIcon
              name="help-circle"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              帮助与反馈
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
          <view
            class="row"
            @tap="toastComingSoon"
          >
            <AppIcon
              name="info"
              :size="18"
              color="#666"
            />
            <text class="row-label">
              关于我们
            </text>
            <text class="row-sub">
              v3.2.1
            </text>
            <AppIcon
              name="chevron-right"
              :size="16"
              color="#C9A96E"
            />
          </view>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-wrap">
        <view
          class="logout-btn"
          @tap="showLogout = true"
        >
          <text class="logout-text">
            退出登录
          </text>
        </view>
      </view>
      <view class="safe-bottom" />
    </scroll-view>

    <!-- 退出登录弹窗 -->
    <view
      v-if="showLogout"
      class="mask"
      @tap="showLogout = false"
    >
      <view
        class="dialog"
        @tap.stop
      >
        <text class="dialog-title">
          确认退出登录？
        </text>
        <text class="dialog-desc">
          退出后需重新登录才能使用完整功能
        </text>
        <view class="dialog-actions">
          <view
            class="dlg-btn ghost"
            @tap="showLogout = false"
          >
            <text class="dlg-btn-text ghost-text">
              取消
            </text>
          </view>
          <view
            class="dlg-btn danger"
            @tap="handleLogout"
          >
            <text class="dlg-btn-text danger-text">
              退出登录
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 清除缓存弹窗 -->
    <view
      v-if="showClearCache"
      class="mask"
      @tap="showClearCache = false"
    >
      <view
        class="dialog"
        @tap.stop
      >
        <text class="dialog-title">
          清除缓存
        </text>
        <text class="dialog-desc">
          将清除 <text class="hl">
            {{ settingCacheSize }}
          </text> 的缓存数据
        </text>
        <text class="dialog-desc sm">
          不影响账号数据和下载内容
        </text>
        <view class="dialog-actions">
          <view
            class="dlg-btn ghost"
            @tap="showClearCache = false"
          >
            <text class="dlg-btn-text ghost-text">
              取消
            </text>
          </view>
          <view
            class="dlg-btn primary"
            @tap="handleClearCache"
          >
            <text class="dlg-btn-text primary-text">
              确认清除
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 选项弹窗（字体/深色/收藏可见性） -->
    <view
      v-if="optionDialog"
      class="mask end"
      @tap="optionDialog = null"
    >
      <view
        class="sheet"
        @tap.stop
      >
        <text class="sheet-title">
          {{ optionDialog.title }}
        </text>
        <view
          v-for="opt in optionDialog.options"
          :key="opt.value"
          class="sheet-opt"
          @tap="pickOption(opt.value)"
        >
          <text
            class="sheet-opt-text"
            :class="{ active: optionDialog.current === opt.value }"
          >
            {{ opt.label }}
          </text>
          <AppIcon
            v-if="optionDialog.current === opt.value"
            name="check"
            :size="16"
            color="#C41E3A"
          />
        </view>
        <view
          class="sheet-cancel"
          @tap="optionDialog = null"
        >
          <text class="sheet-cancel-text">
            取消
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 16rpx;
  background: #fff;
  border-bottom: 1rpx solid #e8e3db;
}
.nav-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.scroll {
  flex: 1;
  height: 0;
}
.group {
  margin-top: 24rpx;
}
.group-title {
  display: block;
  padding: 0 32rpx;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color: #999;
  font-weight: 500;
}
.card {
  background: #fff;
}
.row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #e8e3db;
}
.row:last-child {
  border-bottom: none;
}
.row-label {
  flex: 1;
  font-size: 28rpx;
  color: #2c2c2c;
}
.row-sub {
  font-size: 24rpx;
  color: #999;
}
.row-badge {
  font-size: 24rpx;
  color: #d97706;
}
.switch {
  position: relative;
  width: 88rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
  transition: background 0.2s;
}
.switch.on {
  background: #c41e3a;
}
.switch-dot {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 40rpx;
  height: 40rpx;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}
.switch-dot.on {
  transform: translateX(40rpx);
}
.logout-wrap {
  padding: 32rpx;
}
.logout-btn {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 0;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.logout-text {
  font-size: 28rpx;
  color: #ef4444;
  font-weight: 500;
}
.safe-bottom {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
.mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mask.end {
  align-items: flex-end;
}
.dialog {
  width: 600rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 48rpx 40rpx 40rpx;
}
.dialog-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.dialog-desc {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
}
.dialog-desc.sm {
  font-size: 22rpx;
}
.hl {
  color: #c41e3a;
  font-weight: 500;
}
.dialog-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}
.dlg-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dlg-btn.ghost {
  border: 1rpx solid #e8e3db;
}
.dlg-btn.danger {
  background: #ef4444;
}
.dlg-btn.primary {
  background: #c41e3a;
}
.dlg-btn-text {
  font-size: 28rpx;
}
.ghost-text {
  color: #666;
}
.danger-text,
.primary-text {
  color: #fff;
  font-weight: 500;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
}
.sheet-title {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: #999;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #e8e3db;
}
.sheet-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 48rpx;
  border-bottom: 1rpx solid #e8e3db;
}
.sheet-opt-text {
  font-size: 28rpx;
  color: #2c2c2c;
}
.sheet-opt-text.active {
  color: #c41e3a;
  font-weight: 500;
}
.sheet-cancel {
  padding: 32rpx 0;
  text-align: center;
  border-top: 8rpx solid #faf8f5;
}
.sheet-cancel-text {
  font-size: 28rpx;
  color: #999;
}
</style>
