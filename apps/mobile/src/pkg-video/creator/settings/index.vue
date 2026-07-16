<template>
  <view class="cs-page">
    <!-- 自定义导航 -->
    <view class="cs-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="cs-header-inner">
        <view class="cs-back" hover-class="cs-hover" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#2C2C2C" />
        </view>
        <text class="cs-title">创作设置</text>
        <view class="cs-ph" />
      </view>
      <!-- Tab bar -->
      <view class="cs-tabs">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="cs-tab"
          :class="{ 'cs-tab-active': tab === t.key }"
          hover-class="cs-hover"
          @tap="tab = t.key"
        >
          <text class="cs-tab-txt" :class="{ 'cs-tab-txt-active': tab === t.key }">{{ t.label }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="cs-scroll" :style="{ paddingTop: statusBarHeight + 96 + 'px' }">
      <!-- 骨架/加载态 -->
      <view v-if="loading" class="cs-skeleton">
        <view class="cs-sk cs-sk-title" />
        <view class="cs-sk cs-sk-card" />
        <view class="cs-sk cs-sk-title" />
        <view class="cs-sk cs-sk-block" />
      </view>

      <!-- 错误态 -->
      <view v-else-if="errMsg" class="cs-state">
        <AppIcon name="alert-circle" :size="40" color="#DAD3C6" />
        <text class="cs-state-txt">{{ errMsg }}</text>
        <view class="cs-state-btn" hover-class="cs-hover" @tap="load">
          <text class="cs-state-btn-txt">重试</text>
        </view>
      </view>

      <view v-else class="cs-body">
        <!-- ===== 个人资料 ===== -->
        <view v-if="tab === 'profile'" class="cs-section">
          <view class="cs-avatar-box">
            <view class="cs-avatar-wrap" hover-class="cs-hover" @tap="onEditAvatar">
              <!-- 头像本地兜底：原 dicebear 外部URL H5 挡掉即空白（2026-07-16 深度走查修） -->
              <smart-avatar class="cs-avatar" :src="profile.avatar" :name="profile.nickname || '创'" />
              <view class="cs-avatar-edit"><AppIcon name="upload" :size="12" color="#ffffff" /></view>
            </view>
            <text class="cs-avatar-tip">点击头像更换</text>
          </view>

          <view class="cs-card cs-card-form">
            <view class="cs-field">
              <text class="cs-label">昵称</text>
              <input class="cs-input" v-model="profile.nickname" placeholder="填写你的创作者昵称" placeholder-class="cs-ph-txt" />
            </view>
            <view class="cs-field">
              <text class="cs-label">专业领域</text>
              <input class="cs-input" v-model="profile.specialty" placeholder="如：八字命理、紫微斗数" placeholder-class="cs-ph-txt" />
            </view>
            <view class="cs-field">
              <text class="cs-label">个人网站</text>
              <input class="cs-input" v-model="profile.website" placeholder="https://" placeholder-class="cs-ph-txt" />
            </view>
            <view class="cs-field cs-field-last">
              <text class="cs-label">个人简介</text>
              <textarea class="cs-textarea" v-model="profile.bio" placeholder="介绍一下你自己" placeholder-class="cs-ph-txt" />
            </view>
          </view>
        </view>

        <!-- ===== 通知 ===== -->
        <view v-if="tab === 'notify'" class="cs-section">
          <text class="cs-group-title">消息通知</text>
          <view class="cs-card">
            <view
              v-for="(n, i) in notifyItems"
              :key="n.key"
              class="cs-row"
              :class="{ 'cs-row-last': i === notifyItems.length - 1 }"
            >
              <text class="cs-row-label">{{ n.label }}</text>
              <view
                class="cs-switch"
                :class="notify[n.key] ? 'cs-switch-on' : 'cs-switch-off'"
                @tap="notify[n.key] = !notify[n.key]"
              >
                <view class="cs-switch-dot" :class="{ 'cs-switch-dot-on': notify[n.key] }" />
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 隐私 ===== -->
        <view v-if="tab === 'privacy'" class="cs-section">
          <text class="cs-group-title">隐私偏好</text>
          <view class="cs-card">
            <view
              v-for="(p, i) in privacyItems"
              :key="p.key"
              class="cs-row"
              :class="{ 'cs-row-last': i === privacyItems.length - 1 }"
            >
              <text class="cs-row-label">{{ p.label }}</text>
              <view
                class="cs-switch"
                :class="privacy[p.key] ? 'cs-switch-on' : 'cs-switch-off'"
                @tap="privacy[p.key] = !privacy[p.key]"
              >
                <view class="cs-switch-dot" :class="{ 'cs-switch-dot-on': privacy[p.key] }" />
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 带货管理 ===== -->
        <view v-if="tab === 'goods'" class="cs-section">
          <text class="cs-group-title">带货管理</text>
          <view class="cs-goods-card">
            <view class="cs-goods-head">
              <view class="cs-goods-ic"><AppIcon name="shopping-bag" :size="18" color="#C41E3A" /></view>
              <text class="cs-goods-head-txt">从平台商品库选品带货</text>
            </view>
            <text class="cs-goods-txt">带货商品来自平台商品库或你所属店铺，创作者不能自建商品。发布视频时可从商品库选一件挂在视频上。</text>
            <view class="cs-goods-btn" hover-class="cs-hover" @tap="goPickGoods">
              <text class="cs-goods-btn-txt">去选品</text>
            </view>
          </view>
        </view>

        <!-- ===== 收款 ===== -->
        <view v-if="tab === 'payment'" class="cs-section">
          <text class="cs-group-title">收款说明</text>
          <view class="cs-pay-notice">
            <AppIcon name="info" :size="18" color="#C41E3A" />
            <text class="cs-pay-notice-txt">收款账号在「申请提现」时填写，暂无需在此预先绑定。</text>
          </view>
          <view class="cs-pay-tip">
            <text class="cs-pay-tip-txt">每月 1 日自动结算上月收益，满 ¥10 即可提现。</text>
          </view>
        </view>
      </view>
      <view class="cs-pad" />
    </scroll-view>

    <!-- 保存按钮：收款/带货为纯说明页，无需保存 -->
    <view v-if="!loading && !errMsg && tab !== 'payment' && tab !== 'goods'" class="cs-footer" :style="{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }">
      <view class="cs-save" :class="{ 'cs-save-done': saved }" hover-class="cs-hover" @tap="handleSave">
        <AppIcon v-if="saving" name="loader-2" :size="16" color="#ffffff" class="cs-spin" />
        <AppIcon v-else-if="saved" name="check" :size="16" color="#ffffff" />
        <text class="cs-save-txt">{{ saving ? '保存中…' : saved ? '保存成功' : '保存设置' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack } from '@/utils/router'
import { creatorApi } from '@/lib/creator-data'

type Tab = 'profile' | 'notify' | 'privacy' | 'goods' | 'payment'
const statusBarHeight = ref(0)
const tab = ref<Tab>('profile')
const saving = ref(false)
const saved = ref(false)
const loading = ref(true)
const errMsg = ref('')

const tabs = [
  { key: 'profile' as const, label: '个人资料' },
  { key: 'notify' as const, label: '通知' },
  { key: 'privacy' as const, label: '隐私' },
  { key: 'goods' as const, label: '带货' },
  { key: 'payment' as const, label: '收款' },
]

const profile = ref({ nickname: '', avatar: '', bio: '', specialty: '', website: '' })

const notify = reactive<Record<string, boolean>>({
  newFollower: true, newComment: true, newOrder: true, newLike: false, system: true,
})
const notifyItems = [
  { key: 'newFollower', label: '新增关注' },
  { key: 'newComment', label: '评论提醒' },
  { key: 'newOrder', label: '新订单通知' },
  { key: 'newLike', label: '点赞提醒' },
  { key: 'system', label: '系统通知' },
]

const privacy = reactive<Record<string, boolean>>({
  showFollowers: true, showFollowing: false, allowComment: true, allowDm: true,
})
const privacyItems = [
  { key: 'showFollowers', label: '展示粉丝数' },
  { key: 'showFollowing', label: '展示关注数' },
  { key: 'allowComment', label: '允许评论' },
  { key: 'allowDm', label: '允许私信' },
]

function onEditAvatar() {
  uni.showToast({ title: '头像更换即将开放', icon: 'none' })
}

// 去选品：S-08 跳转目标待拍板（平台商品库页 / 所属店铺选品页未定），先占位提示
function goPickGoods() {
  uni.showToast({ title: '选品功能即将开放', icon: 'none' })
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const s = await creatorApi.getSettings()
    profile.value = {
      nickname: s.profile.nickname,
      avatar: s.profile.avatar,
      bio: s.profile.bio,
      specialty: s.profile.specialty,
      website: s.profile.website,
    }
    Object.assign(notify, s.notify)
    Object.assign(privacy, s.privacy)
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (saving.value) return
  saving.value = true
  saved.value = false
  try {
    const res = await creatorApi.saveSettings({
      profile: {
        nickname: profile.value.nickname,
        bio: profile.value.bio,
        specialty: profile.value.specialty,
        website: profile.value.website,
      },
      notify: { ...notify },
      privacy: { ...privacy },
    })
    if (res.success) {
      saved.value = true
      setTimeout(() => (saved.value = false), 2500)
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
  load()
})
</script>

<style scoped>
.cs-page { min-height: 100vh; background: #FAF8F5; }

/* 导航 */
.cs-header { position: fixed; top: 0; left: 0; right: 0; z-index: 10; background: #FAF8F5; border-bottom: 2rpx solid #F3EFE8; }
.cs-header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 40rpx; }
.cs-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; }
.cs-ph { width: 56rpx; }
.cs-title { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.cs-hover { opacity: 0.6; }

/* Tab */
.cs-tabs { display: flex; }
.cs-tab { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20rpx 0; border-bottom: 4rpx solid transparent; }
.cs-tab-active { border-bottom-color: #C41E3A; }
.cs-tab-txt { font-size: 24rpx; font-weight: 500; color: #999; }
.cs-tab-txt-active { color: #C41E3A; font-weight: 600; }

.cs-scroll { height: 100vh; box-sizing: border-box; }
.cs-body { padding: 32rpx 40rpx 0; }
.cs-section { display: flex; flex-direction: column; }
.cs-group-title { padding: 8rpx 8rpx 16rpx; font-size: 24rpx; color: #999; }

/* 骨架 */
.cs-skeleton { padding: 40rpx; display: flex; flex-direction: column; gap: 28rpx; }
.cs-sk { background: linear-gradient(90deg, #F3EFE8 25%, #ECE6DC 37%, #F3EFE8 63%); background-size: 400% 100%; border-radius: 16rpx; animation: cs-shimmer 1.4s ease infinite; }
.cs-sk-title { height: 36rpx; width: 160rpx; }
.cs-sk-card { height: 220rpx; border-radius: 36rpx; }
.cs-sk-block { height: 208rpx; border-radius: 36rpx; }
@keyframes cs-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

/* 状态 */
.cs-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 160rpx 64rpx; }
.cs-state-txt { font-size: 28rpx; color: #999; }
.cs-state-btn { margin-top: 8rpx; padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.cs-state-btn-txt { font-size: 28rpx; color: #ffffff; }

/* 卡片通用 */
.cs-card { background: #ffffff; border-radius: 36rpx; box-shadow: 0 4rpx 24rpx rgba(44,44,44,0.05); overflow: hidden; }

/* 个人资料 */
.cs-avatar-box { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding: 24rpx 0 40rpx; }
.cs-avatar-wrap { position: relative; }
.cs-avatar { width: 160rpx; height: 160rpx; border-radius: 50%; background: #F3EFE8; }
.cs-avatar-edit { position: absolute; bottom: 0; right: 0; width: 48rpx; height: 48rpx; background: #C41E3A; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 4rpx solid #FAF8F5; }
.cs-avatar-tip { font-size: 24rpx; color: #999; }
.cs-card-form { padding: 8rpx 32rpx; }
.cs-field { display: flex; flex-direction: column; padding: 24rpx 0; border-bottom: 2rpx solid #F3EFE8; }
.cs-field-last { border-bottom: none; }
.cs-label { font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 16rpx; }
.cs-input { width: 100%; height: 72rpx; padding: 0 24rpx; box-sizing: border-box; font-size: 28rpx; color: #2C2C2C; background: #FAF8F5; border-radius: 16rpx; }
.cs-textarea { width: 100%; min-height: 180rpx; padding: 20rpx 24rpx; box-sizing: border-box; font-size: 28rpx; color: #2C2C2C; background: #FAF8F5; border-radius: 16rpx; }
.cs-ph-txt { color: #999; }

/* 开关行 */
.cs-row { display: flex; align-items: center; justify-content: space-between; height: 104rpx; padding: 0 32rpx; border-bottom: 2rpx solid #F3EFE8; }
.cs-row-last { border-bottom: none; }
.cs-row-label { font-size: 28rpx; color: #2C2C2C; }
.cs-switch { width: 88rpx; height: 52rpx; border-radius: 999rpx; position: relative; flex: none; transition: background 0.2s; }
.cs-switch-on { background: #C41E3A; }
.cs-switch-off { background: #DAD3C6; }
.cs-switch-dot { position: absolute; top: 4rpx; left: 4rpx; width: 44rpx; height: 44rpx; background: #ffffff; border-radius: 50%; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15); transition: left 0.2s; }
.cs-switch-dot-on { left: 40rpx; }

/* 带货管理 */
.cs-goods-card { background: #ffffff; border-radius: 36rpx; box-shadow: 0 4rpx 24rpx rgba(44,44,44,0.05); padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
.cs-goods-head { display: flex; align-items: center; gap: 16rpx; }
.cs-goods-ic { width: 64rpx; height: 64rpx; border-radius: 20rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; }
.cs-goods-head-txt { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.cs-goods-txt { font-size: 26rpx; color: #6E6E73; line-height: 1.8; }
.cs-goods-btn { height: 84rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.cs-goods-btn-txt { font-size: 28rpx; font-weight: 600; color: #ffffff; }

/* 收款 */
.cs-pay-notice { display: flex; align-items: flex-start; gap: 20rpx; padding: 28rpx 32rpx; background: rgba(196,30,58,0.05); border: 2rpx solid rgba(196,30,58,0.15); border-radius: 36rpx; }
.cs-pay-notice-txt { flex: 1; font-size: 26rpx; color: #2C2C2C; line-height: 1.6; }
.cs-pay-tip { margin-top: 24rpx; padding: 24rpx 32rpx; background: rgba(0,0,0,0.03); border-radius: 36rpx; }
.cs-pay-tip-txt { font-size: 24rpx; color: #999; line-height: 1.6; }

.cs-pad { height: 200rpx; }

/* 底部保存 */
.cs-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #FAF8F5; border-top: 2rpx solid #F3EFE8; padding: 32rpx 40rpx; }
.cs-save { height: 88rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.cs-save-txt { font-size: 30rpx; font-weight: 600; color: #ffffff; }
.cs-save-done { background: #16a34a; }
.cs-spin { animation: cs-rotate 1s linear infinite; }
@keyframes cs-rotate { from { transform: rotate(0); } to { transform: rotate(360deg); } }
</style>
