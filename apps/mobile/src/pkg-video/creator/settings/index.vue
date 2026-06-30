<template>
  <view class="cs-page">
    <view class="cs-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="cs-header-inner">
        <view class="cs-icon-btn" @tap="goBack"><AppIcon name="arrow-left" :size="20" color="#1a1a1a" /></view>
        <text class="cs-title">创作者设置</text>
      </view>
      <!-- Tab bar -->
      <view class="cs-tabs">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="cs-tab"
          :class="{ 'cs-tab-active': tab === t.key }"
          @tap="tab = t.key"
        >
          {{ t.label }}
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="cs-scroll" :style="{ paddingTop: statusBarHeight + 92 + 'px' }">
      <!-- 加载态 -->
      <view v-if="loading" class="cs-state">
        <text class="cs-state-txt">加载中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="errMsg" class="cs-state">
        <AppIcon name="alert-circle" :size="40" color="#ccc" />
        <text class="cs-state-txt">{{ errMsg }}</text>
        <view class="cs-state-btn" @tap="load">重试</view>
      </view>

      <view v-else class="cs-body">
        <!-- 个人资料 -->
        <view v-if="tab === 'profile'" class="cs-profile">
          <view class="cs-avatar-box">
            <view class="cs-avatar-wrap" @tap="onEditAvatar">
              <image lazy-load class="cs-avatar" :src="profile.avatar || ('https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(profile.nickname || 'creator'))" mode="aspectFill" />
              <view class="cs-avatar-edit"><AppIcon name="upload" :size="12" color="#ffffff" /></view>
            </view>
            <text class="cs-avatar-tip">点击头像更换</text>
          </view>

          <view class="cs-field">
            <text class="cs-label">昵称</text>
            <input class="cs-input" v-model="profile.nickname" />
          </view>
          <view class="cs-field">
            <text class="cs-label">专业领域</text>
            <input class="cs-input" v-model="profile.specialty" placeholder="如：八字命理、紫微斗数" />
          </view>
          <view class="cs-field">
            <text class="cs-label">个人网站</text>
            <input class="cs-input" v-model="profile.website" placeholder="https://" />
          </view>
          <view class="cs-field">
            <text class="cs-label">个人简介</text>
            <textarea class="cs-textarea" v-model="profile.bio" />
          </view>
        </view>

        <!-- 通知 -->
        <view v-if="tab === 'notify'" class="cs-toggle-card">
          <view v-for="(n, i) in notifyItems" :key="n.key" class="cs-toggle-row" :class="{ 'cs-row-border': i > 0 }">
            <text class="cs-toggle-label">{{ n.label }}</text>
            <view class="cs-switch" :class="{ 'cs-switch-on': notify[n.key] }" @tap="notify[n.key] = !notify[n.key]">
              <view class="cs-switch-dot" :class="{ 'cs-switch-dot-on': notify[n.key] }" />
            </view>
          </view>
        </view>

        <!-- 隐私 -->
        <view v-if="tab === 'privacy'" class="cs-toggle-card">
          <view v-for="(p, i) in privacyItems" :key="p.key" class="cs-toggle-row" :class="{ 'cs-row-border': i > 0 }">
            <text class="cs-toggle-label">{{ p.label }}</text>
            <view class="cs-switch" :class="{ 'cs-switch-on': privacy[p.key] }" @tap="privacy[p.key] = !privacy[p.key]">
              <view class="cs-switch-dot" :class="{ 'cs-switch-dot-on': privacy[p.key] }" />
            </view>
          </view>
        </view>

        <!-- 收款 -->
        <view v-if="tab === 'payment'" class="cs-payment">
          <view class="cs-pay-notice">
            <AppIcon name="info" :size="20" color="#c41e3a" />
            <text class="cs-pay-notice-txt">收款账号在「申请提现」时填写，暂无需在此预先绑定。</text>
          </view>
          <view class="cs-pay-tip">
            <text class="cs-pay-tip-txt">每月 1 日自动结算上月收益，满 ¥10 即可提现。</text>
          </view>
        </view>
      </view>
      <view class="cs-pad" />
    </scroll-view>

    <view v-if="!loading && !errMsg && tab !== 'payment'" class="cs-footer">
      <view class="cs-save" :class="{ 'cs-save-done': saved }" @tap="handleSave">
        <AppIcon v-if="saving" name="loader-2" :size="16" color="#ffffff" class="cs-spin" />
        <text>{{ saving ? '保存中…' : saved ? '保存成功' : '保存设置' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { creatorApi } from '@/lib/creator-data'

type Tab = 'profile' | 'notify' | 'privacy' | 'payment'
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
.cs-page { min-height: 100vh; background: #f5f5f5; }
.cs-header { position: fixed; top: 0; left: 0; right: 0; z-index: 10; background: #ffffff; border-bottom: 1px solid #eee; }
.cs-header-inner { display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 16px; }
.cs-icon-btn { padding: 2px; }
.cs-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.cs-tabs { display: flex; border-top: 1px solid #f5f5f5; }
.cs-tab { flex: 1; text-align: center; padding: 12px 0; font-size: 12px; font-weight: 500; color: #999; border-bottom: 2px solid transparent; }
.cs-tab-active { color: var(--brand); border-bottom-color: var(--brand); }
.cs-scroll { height: 100vh; box-sizing: border-box; }
.cs-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 32px; }
.cs-state-txt { font-size: 14px; color: #999; }
.cs-state-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); color: #ffffff; border-radius: 999px; font-size: 14px; }
.cs-body { padding: 20px 16px; }
/* 个人资料 */
.cs-profile { display: flex; flex-direction: column; gap: 20px; }
.cs-avatar-box { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.cs-avatar-wrap { position: relative; }
.cs-avatar { width: 80px; height: 80px; border-radius: 50%; }
.cs-avatar-edit { position: absolute; bottom: 0; right: 0; width: 24px; height: 24px; background: var(--brand); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.cs-avatar-tip { font-size: 12px; color: #999; }
.cs-field { display: flex; flex-direction: column; }
.cs-label { font-size: 12px; font-weight: 500; color: #1a1a1a; margin-bottom: 6px; }
.cs-input { width: 100%; height: 36px; padding: 0 12px; box-sizing: border-box; font-size: 14px; color: #1a1a1a; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; }
.cs-textarea { width: 100%; min-height: 90px; padding: 8px 12px; box-sizing: border-box; font-size: 14px; color: #1a1a1a; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; }
/* 开关卡片 */
.cs-toggle-card { background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px; }
.cs-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
.cs-row-border { border-top: 1px solid #f0f0f0; }
.cs-toggle-label { font-size: 14px; color: #1a1a1a; }
.cs-switch { width: 44px; height: 24px; border-radius: 999px; background: #e5e5e5; position: relative; transition: background 0.2s; }
.cs-switch-on { background: var(--brand); }
.cs-switch-dot { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #ffffff; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.15); transition: left 0.2s; }
.cs-switch-dot-on { left: 22px; }
/* 收款 */
.cs-payment { display: flex; flex-direction: column; gap: 12px; }
.cs-pay-notice { display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; background: rgba(196, 30, 58, 0.05); border: 1px solid rgba(196, 30, 58, 0.15); border-radius: 12px; }
.cs-pay-notice-txt { flex: 1; font-size: 13px; color: #1a1a1a; line-height: 1.5; }
.cs-pay-tip { padding: 12px; background: rgba(0, 0, 0, 0.03); border-radius: 12px; }
.cs-pay-tip-txt { font-size: 12px; color: #999; line-height: 1.5; }
.cs-pad { height: 100px; }
.cs-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #ffffff; border-top: 1px solid #eee; padding: 16px; }
.cs-save { height: 44px; border-radius: 12px; background: var(--brand); color: #ffffff; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 600; }
.cs-save-done { background: #16a34a; }
.cs-spin { animation: cs-rotate 1s linear infinite; }
@keyframes cs-rotate { from { transform: rotate(0); } to { transform: rotate(360deg); } }
</style>
