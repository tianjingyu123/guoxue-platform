<template>
  <view class="op-set">
    <!-- 自定义导航（红渐变·内置状态栏安全区留白） -->
    <app-nav-bar
      title="运营商设置"
      :show-back="true"
      background="linear-gradient(135deg, #A01828, #C41E3A)"
      color="#ffffff"
      :no-border="true"
      :serif-title="true"
    />

    <!-- loading -->
    <view v-if="loading" class="st-state">
      <view class="st-spinner" /><text class="st-state-txt">加载中...</text>
    </view>

    <!-- error -->
    <view v-else-if="error" class="st-state">
      <app-icon name="alert-circle" :size="96" color="#CFC8BC" />
      <text class="st-state-txt">{{ error }}</text>
      <view class="st-state-btn" @tap="load"><text class="st-state-btn-txt">重新加载</text></view>
    </view>

    <scroll-view v-else scroll-y class="st-scroll">
      <!-- ===== 基本信息（只读·沿用平台账号，编辑跳平台设置） ===== -->
      <view class="st-group">
        <text class="st-group-lbl">基本信息</text>
        <view class="st-card">
          <!-- 头像与昵称 -->
          <view class="st-row" @tap="goPlatformAccount">
            <view class="st-avatar">
              <image v-if="me.avatar" class="st-avatar-img" :src="me.avatar" mode="aspectFill" />
              <text v-else class="st-avatar-txt">{{ avatarChar }}</text>
            </view>
            <view class="st-row-main">
              <text class="st-row-label">头像与昵称</text>
              <text class="st-tag">平台账号</text>
            </view>
            <app-icon name="chevron-right" :size="28" color="#CFC8BC" />
          </view>
          <!-- 手机号 -->
          <view class="st-row st-row-border" @tap="goPlatformAccount">
            <view class="st-icn"><app-icon name="phone" :size="34" color="#97794a" /></view>
            <text class="st-row-label st-row-label-flex">手机号</text>
            <text class="st-row-val">{{ me.phone ? maskPhone(me.phone) : '未绑定' }}</text>
            <app-icon name="chevron-right" :size="28" color="#CFC8BC" />
          </view>
          <!-- 微信绑定 -->
          <view class="st-row st-row-border" @tap="goPlatformAccount">
            <view class="st-icn"><app-icon name="message-circle" :size="34" color="#97794a" /></view>
            <text class="st-row-label st-row-label-flex">微信绑定</text>
            <text class="st-row-val">{{ me.wechatBound ? '已绑定' : '未绑定' }}</text>
            <app-icon name="chevron-right" :size="28" color="#CFC8BC" />
          </view>
        </view>
        <text class="st-note">头像、昵称、手机、微信由平台统一账号管理，点击跳转平台账号设置。</text>
      </view>

      <!-- ===== 通知设置（复用平台账号 notifySettings，跨端云同步） ===== -->
      <view class="st-group">
        <text class="st-group-lbl">通知设置</text>
        <view class="st-card">
          <view v-for="(n, idx) in notifyItems" :key="n.key" class="st-row" :class="{ 'st-row-border': idx > 0 }">
            <view class="st-icn"><app-icon :name="n.icon" :size="34" color="#97794a" /></view>
            <text class="st-row-label st-row-label-flex">{{ n.label }}</text>
            <switch
              :checked="notifications[n.key]"
              color="#C41E3A"
              style="transform: scale(0.9)"
              :disabled="savingKey !== null"
              @change="onToggle(n.key, $event)"
            />
          </view>
        </view>
        <text class="st-note">通知偏好已与平台账号同步，换设备登录后仍会保留。</text>
      </view>

      <!-- ===== 协议与帮助 ===== -->
      <view class="st-group">
        <text class="st-group-lbl">协议与帮助</text>
        <view class="st-card">
          <view class="st-row" @tap="goAgreement">
            <view class="st-icn"><app-icon name="file-text" :size="34" color="#97794a" /></view>
            <text class="st-row-label st-row-label-flex">运营商服务协议</text>
            <app-icon name="chevron-right" :size="28" color="#CFC8BC" />
          </view>
          <view class="st-row st-row-border" @tap="goHelp">
            <view class="st-icn"><app-icon name="help-circle" :size="34" color="#97794a" /></view>
            <text class="st-row-label st-row-label-flex">帮助中心</text>
            <app-icon name="chevron-right" :size="28" color="#CFC8BC" />
          </view>
        </view>
      </view>

      <!-- ===== 退出运营商身份 ===== -->
      <view class="st-logout" @tap="onExitOperator">
        <text class="st-logout-txt">退出运营商身份</text>
      </view>
      <text class="st-note st-note-center">退出后将保留平台普通用户账号，团队与名额数据不会删除。</text>

      <view class="st-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { apiGet, apiPut } from '@/utils/request'
import { navigateTo } from '@/utils/router'

// === 基本信息：来自 /auth/me 真实字段 ===
const loading = ref(true)
const error = ref('')
const me = reactive({ nickname: '', phone: '', avatar: '', wechatBound: false })

/** 头像占位字符（昵称首字，衬线） */
const avatarChar = computed(() => (me.nickname ? me.nickname.slice(0, 1) : '运'))

/** 手机号脱敏展示 */
function maskPhone(p: string): string {
  const s = String(p)
  return s.length >= 11 ? s.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : s
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [data, settings] = await Promise.all([
      // /auth/me 返回结构较杂，此处仅取展示字段，保留 any
      apiGet<any>('/auth/me'),
      apiGet<OperatorNotifySetting[]>('/users/notify-settings?scope=operator'),
    ])
    me.nickname = data?.nickname || ''
    me.phone = data?.phone || ''
    me.avatar = data?.avatar || ''
    // 微信绑定态：后端 openId/unionId/wechatOpenId 任一存在即视为已绑定
    me.wechatBound = !!(data?.openId || data?.unionId || data?.wechatOpenId)
    for (const item of settings) {
      if (isNotifyKey(item.key)) notifications[item.key] = item.value
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// === 通知设置：复用 User.notifySettings JSON，运营商专属键不影响 C 端通用通知开关 ===
type NotifyKey = 'operatorTeam' | 'operatorReport' | 'operatorDormant' | 'operatorSystem'
interface OperatorNotifySetting { key: string; label: string; icon: string; value: boolean }
const notifyItems: { key: NotifyKey; label: string; icon: string }[] = [
  { key: 'operatorTeam', label: '团队事件通知', icon: 'users' },
  { key: 'operatorReport', label: '业绩报告推送', icon: 'bar-chart-3' },
  { key: 'operatorDormant', label: '沉寂预警提醒', icon: 'alert-triangle' },
  { key: 'operatorSystem', label: '系统通知', icon: 'bell' },
]
const notifications = reactive<Record<NotifyKey, boolean>>({
  operatorTeam: true,
  operatorReport: true,
  operatorDormant: true,
  operatorSystem: false,
})
const savingKey = ref<NotifyKey | null>(null)

function isNotifyKey(key: string): key is NotifyKey {
  return notifyItems.some((item) => item.key === key)
}

async function onToggle(key: NotifyKey, e: Event) {
  if (savingKey.value !== null) return
  const previous = notifications[key]
  const next = Boolean((e as CustomEvent<{ value: boolean }>).detail?.value)
  if (next === previous) return
  notifications[key] = next
  savingKey.value = key
  try {
    await apiPut('/users/notify-settings', { key, value: next })
    uni.showToast({ title: '已同步', icon: 'success', duration: 1000 })
  } catch (e) {
    notifications[key] = previous
    uni.showToast({ title: (e as Error)?.message || '同步失败，已恢复原设置', icon: 'none' })
  } finally {
    savingKey.value = null
  }
}

// === 基本信息编辑：跳平台账号设置（沿用平台统一账号） ===
function goPlatformAccount() {
  navigateTo('/mine/edit-profile')
}

// === 协议入口 ===
function goAgreement() {
  navigateTo('/pkg-operator/agreement-operator/index')
}

function goHelp() {
  navigateTo('/help')
}

// === 退出运营商身份（保留平台账号，仅解除运营商身份·后端无端点则诚实提示） ===
function onExitOperator() {
  uni.showModal({
    title: '退出运营商身份',
    content: '退出后将保留平台普通用户账号，团队与名额数据不会删除。确定退出吗？',
    confirmColor: '#C41E3A',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '如需退出请联系客服', icon: 'none' })
      }
    },
  })
}

onMounted(load)
</script>

<style lang="scss" scoped>
.op-set {
  min-height: 100vh;
  background: #faf8f5;
}

.st-scroll {
  height: calc(100vh - 200rpx);
}

/* 三态 */
.st-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 38rpx;
  gap: 24rpx;
}
.st-state-txt {
  font-size: 28rpx;
  color: #6e6e73;
}
.st-spinner {
  width: 56rpx;
  height: 56rpx;
  border: 6rpx solid #f0d0d4;
  border-top-color: #c41e3a;
  border-radius: 50%;
  animation: st-rotate 0.8s linear infinite;
}
.st-state-btn {
  margin-top: 8rpx;
  padding: 16rpx 48rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}
.st-state-btn-txt {
  color: #fff;
  font-size: 28rpx;
}
@keyframes st-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 分组 */
.st-group {
  padding: 0 38rpx;
  margin-top: 40rpx;
  display: flex;
  flex-direction: column;
}
.st-group:first-child {
  margin-top: 34rpx;
}
.st-group-lbl {
  font-size: 24rpx;
  color: #999999;
  font-weight: 500;
  margin: 0 4rpx 16rpx;
}

/* 卡片 */
.st-card {
  background: #ffffff;
  border-radius: 35rpx;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
  overflow: hidden;
}

/* 行 */
.st-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 30rpx;
  min-height: 88rpx;
}
.st-row-border {
  border-top: 2rpx solid #ece7df;
}
.st-row-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.st-row-label {
  font-size: 28rpx;
  color: #2c2c2c;
}
.st-row-label-flex {
  flex: 1;
}
.st-row-val {
  font-size: 26rpx;
  color: #999999;
}

/* 图标底座 */
.st-icn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: #fbf6ee;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 头像 */
.st-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #a01828, #c41e3a);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.st-avatar-img {
  width: 100%;
  height: 100%;
}
.st-avatar-txt {
  font-family: 'Songti SC', serif;
  font-size: 34rpx;
  color: #ffffff;
}

/* 平台标签 */
.st-tag {
  font-size: 20rpx;
  color: #97794a;
  background: rgba(201, 169, 110, 0.15);
  padding: 4rpx 14rpx;
  border-radius: 10rpx;
}

/* 说明 */
.st-note {
  font-size: 22rpx;
  color: #999999;
  line-height: 1.6;
  margin-top: 16rpx;
  padding: 0 4rpx;
}
.st-note-center {
  text-align: center;
  padding: 0 38rpx;
}

/* 退出 */
.st-logout {
  margin: 40rpx 38rpx 0;
  padding: 28rpx;
  background: #ffffff;
  border-radius: 35rpx;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88rpx;
}
.st-logout-txt {
  font-size: 28rpx;
  font-weight: 600;
  color: #c41e3a;
}

.st-bottom {
  height: 60rpx;
}
</style>
