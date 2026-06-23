<template>
  <view class="cfg-page">
    <!-- Header (动态主题色) -->
    <view class="cfg-header" :style="{ paddingTop: statusBarHeight + 'px', background: theme.primary }">
      <view class="cfg-header-inner">
        <view class="cfg-hbtn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#ffffff" /></view>
        <text class="cfg-title">分站配置</text>
        <view class="cfg-hbtn" @tap="handleSave">
          <app-icon :name="saving ? 'loader-2' : 'save'" :size="40" color="#ffffff" :class="{ 'cfg-spin': saving }" />
        </view>
      </view>
    </view>

    <view class="cfg-body">
      <!-- Logo -->
      <view class="cfg-card">
        <text class="cfg-label">分站Logo</text>
        <view class="cfg-logo-row">
          <view class="cfg-logo" :style="{ borderColor: theme.primary }">
            <app-icon name="camera" :size="64" color="#9ca3af" />
          </view>
          <view class="cfg-logo-tip">
            <text class="cfg-logo-t1">建议尺寸：200x200像素</text>
            <text class="cfg-logo-t2">支持 JPG、PNG 格式，最大 2MB</text>
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="cfg-card">
        <text class="cfg-h3">基本信息</text>
        <view class="cfg-field">
          <text class="cfg-flabel">分站名称 *</text>
          <input class="cfg-input" v-model="form.name" maxlength="20" placeholder="请输入分站名称" />
          <text class="cfg-count">{{ (form.name || '').length }}/20</text>
        </view>
        <view class="cfg-field">
          <text class="cfg-flabel">分站简介</text>
          <textarea class="cfg-textarea" v-model="form.description" maxlength="200" placeholder="介绍一下你的分站..." />
          <text class="cfg-count">{{ (form.description || '').length }}/200</text>
        </view>
      </view>

      <!-- 主题色 -->
      <view class="cfg-card">
        <view class="cfg-theme-head">
          <text class="cfg-h3">主题色</text>
          <text class="cfg-theme-toggle" :style="{ color: theme.primary }" @tap="useCustomColor = !useCustomColor">
            {{ useCustomColor ? '使用预设' : '自定义' }}
          </text>
        </view>

        <view v-if="!useCustomColor" class="cfg-presets">
          <view
            v-for="p in presets"
            :key="p.id"
            class="cfg-preset"
            :class="{ active: selectedTheme === p.id }"
            @tap="selectedTheme = p.id"
          >
            <view class="cfg-preset-swatch" :style="{ background: `linear-gradient(135deg, ${p.primary} 50%, ${p.secondary} 50%)` }" />
            <text class="cfg-preset-name">{{ p.name }}</text>
            <view v-if="selectedTheme === p.id" class="cfg-preset-check">
              <app-icon name="check" :size="20" color="#ffffff" />
            </view>
          </view>
        </view>

        <view v-else class="cfg-custom">
          <view class="cfg-custom-row">
            <text class="cfg-custom-label">主色调</text>
            <view class="cfg-color-box" :style="{ background: customColor.primary }" />
            <input class="cfg-input cfg-color-input" v-model="customColor.primary" placeholder="#C41E3A" />
          </view>
          <view class="cfg-custom-row">
            <text class="cfg-custom-label">辅助色</text>
            <view class="cfg-color-box" :style="{ background: customColor.secondary }" />
            <input class="cfg-input cfg-color-input" v-model="customColor.secondary" placeholder="#C9A96E" />
          </view>
        </view>

        <!-- 预览 -->
        <view class="cfg-preview" :style="{ background: theme.primary + '1a' }">
          <view class="cfg-preview-head">
            <app-icon name="eye" :size="28" :color="theme.primary" />
            <text class="cfg-preview-title" :style="{ color: theme.primary }">预览效果</text>
          </view>
          <view class="cfg-preview-nav" :style="{ background: theme.primary }">
            <text class="cfg-preview-nav-txt">导航栏样式</text>
          </view>
          <view class="cfg-preview-btns">
            <view class="cfg-pv-btn" :style="{ background: theme.primary }"><text class="cfg-pv-btn-txt">主按钮</text></view>
            <view class="cfg-pv-btn cfg-pv-btn-out" :style="{ borderColor: theme.primary }"><text class="cfg-pv-btn-txt" :style="{ color: theme.primary }">次按钮</text></view>
          </view>
        </view>
      </view>

      <!-- 联系方式 -->
      <view class="cfg-card">
        <text class="cfg-h3">联系方式</text>
        <view class="cfg-contact-row">
          <view class="cfg-contact-icon"><app-icon name="phone" :size="36" color="#6b7280" /></view>
          <input class="cfg-input cfg-contact-input" v-model="form.contactPhone" placeholder="联系电话" />
        </view>
        <view class="cfg-contact-row">
          <view class="cfg-contact-icon"><app-icon name="message-circle" :size="36" color="#6b7280" /></view>
          <input class="cfg-input cfg-contact-input" v-model="form.contactWechat" placeholder="微信号" />
        </view>
        <view class="cfg-contact-row">
          <view class="cfg-contact-icon"><app-icon name="mail" :size="36" color="#6b7280" /></view>
          <input class="cfg-input cfg-contact-input" v-model="form.contactEmail" placeholder="邮箱地址" />
        </view>
      </view>

      <!-- 小程序码 -->
      <view class="cfg-card">
        <text class="cfg-label">小程序码</text>
        <view class="cfg-qr-row">
          <view class="cfg-qr-box">
            <app-icon name="upload" :size="64" color="#9ca3af" />
            <text class="cfg-qr-tip">上传小程序码</text>
          </view>
          <view class="cfg-qr-info">
            <text class="cfg-qr-t1">上传小程序码供用户扫码访问</text>
            <text class="cfg-qr-t2">建议尺寸：430x430像素</text>
          </view>
        </view>
      </view>

      <!-- 站长信息 -->
      <view class="cfg-card">
        <text class="cfg-h3">站长信息</text>
        <view class="cfg-master">
          <image class="cfg-master-avatar" :src="masterAvatar" mode="aspectFill" />
          <view class="cfg-master-info">
            <text class="cfg-master-name">{{ master.nickname }}</text>
            <text class="cfg-master-phone">{{ master.phone }}</text>
          </view>
          <text class="cfg-master-join">入驻：{{ master.joinDate }}</text>
        </view>
      </view>

      <!-- 状态信息 -->
      <view class="cfg-card">
        <view class="cfg-status-row">
          <text class="cfg-status-label">分站状态</text>
          <text class="cfg-status-badge">运营中</text>
        </view>
        <view class="cfg-status-row">
          <text class="cfg-status-label">分站代码</text>
          <text class="cfg-status-val cfg-mono">demo_station</text>
        </view>
        <view class="cfg-status-row">
          <text class="cfg-status-label">最后更新</text>
          <text class="cfg-status-val">2026-06-01 15:30:00</text>
        </view>
      </view>
    </view>

    <!-- 底部保存 -->
    <view class="cfg-savebar">
      <view class="cfg-save-btn" :style="{ background: theme.primary }" @tap="handleSave">
        <app-icon v-if="saving" name="loader-2" :size="28" color="#ffffff" class="cfg-spin" />
        <text class="cfg-save-txt">{{ saving ? '保存中...' : '保存配置' }}</text>
      </view>
    </view>
  </view>

  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { navigateTo } from '@/utils/router'

const statusBarHeight = ref(20)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 20 } })

const presets = [
  { id: 'guoxue', name: '故宫红', primary: '#C41E3A', secondary: '#C9A96E' },
  { id: 'jade', name: '玉石青', primary: '#2E8B57', secondary: '#98D8C8' },
  { id: 'royal', name: '皇家蓝', primary: '#1E3A8A', secondary: '#60A5FA' },
  { id: 'zen', name: '禅意灰', primary: '#4A5568', secondary: '#A0AEC0' },
  { id: 'sunset', name: '晚霞紫', primary: '#7C3AED', secondary: '#C4B5FD' },
  { id: 'ocean', name: '海天蓝', primary: '#0EA5E9', secondary: '#7DD3FC' },
  { id: 'forest', name: '竹林绿', primary: '#059669', secondary: '#6EE7B7' },
  { id: 'earth', name: '大地褐', primary: '#92400E', secondary: '#FCD34D' },
]

const selectedTheme = ref('guoxue')
const useCustomColor = ref(false)
const customColor = reactive({ primary: '#C41E3A', secondary: '#C9A96E' })
const saving = ref(false)

const theme = computed(() => {
  if (useCustomColor.value) return { primary: customColor.primary, secondary: customColor.secondary }
  const p = presets.find((x) => x.id === selectedTheme.value)
  return p ? { primary: p.primary, secondary: p.secondary } : { primary: '#C41E3A', secondary: '#C9A96E' }
})

const form = reactive({
  name: '明德国学馆',
  description: '传承国学智慧，弘扬传统文化。明德国学馆致力于为国学爱好者提供专业的学习平台和优质的文化内容。',
  contactPhone: '138****8888',
  contactWechat: 'mingde_guoxue',
  contactEmail: 'contact@mingde.com',
})

const summary = { memberCount: 1256, totalRevenue: 89650, contentCount: 328, visitCount: 45820 }
const master = { nickname: '明德先生', phone: '138****8888', joinDate: '2025-01-15' }
const masterAvatar = 'https://picsum.photos/seed/mingde-master/120/120'

function handleSave() {
  if (saving.value) return
  saving.value = true
  setTimeout(() => { saving.value = false; uni.showToast({ title: '保存成功', icon: 'none' }) }, 600)
}

function goBack() { uni.navigateBack({ fail: () => navigateTo('/pages/index/index') }) }
</script>

<style scoped lang="scss">
.cfg-page { min-height: 100vh; background: #FAF8F5; }

.cfg-header { position: sticky; top: 0; z-index: 50; }
.cfg-header-inner { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 16rpx; }
.cfg-hbtn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.cfg-title { font-size: 34rpx; font-weight: 600; color: #fff; }

.cfg-body { padding-bottom: 200rpx; }
.cfg-card { margin: 32rpx 32rpx 0; padding: 32rpx; background: #fff; border-radius: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04); }

/* Summary */
.cfg-summary { display: flex; }
.cfg-sum-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.cfg-sum-num { font-size: 36rpx; font-weight: 700; }
.cfg-sum-label { font-size: 22rpx; color: #6b7280; }

.cfg-label { font-size: 28rpx; font-weight: 500; color: #374151; margin-bottom: 24rpx; display: block; }
.cfg-h3 { font-size: 30rpx; font-weight: 500; color: #1f2937; margin-bottom: 28rpx; display: block; }

/* Logo */
.cfg-logo-row { display: flex; align-items: center; gap: 28rpx; }
.cfg-logo { width: 144rpx; height: 144rpx; border-radius: 50%; border: 4rpx solid #C41E3A; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cfg-logo-tip { flex: 1; }
.cfg-logo-t1 { font-size: 26rpx; color: #4b5563; display: block; }
.cfg-logo-t2 { font-size: 22rpx; color: #9ca3af; margin-top: 6rpx; display: block; }

/* Fields */
.cfg-field { margin-bottom: 28rpx; }
.cfg-field:last-child { margin-bottom: 0; }
.cfg-flabel { font-size: 26rpx; color: #4b5563; margin-bottom: 12rpx; display: block; }
.cfg-input { height: 76rpx; padding: 0 24rpx; background: #fff; border: 1rpx solid #e5e7eb; border-radius: 14rpx; font-size: 28rpx; color: #1f2937; box-sizing: border-box; }
.cfg-textarea { width: 100%; min-height: 180rpx; padding: 16rpx 24rpx; background: #fff; border: 1rpx solid #e5e7eb; border-radius: 14rpx; font-size: 28rpx; color: #1f2937; box-sizing: border-box; }
.cfg-count { font-size: 22rpx; color: #9ca3af; margin-top: 8rpx; text-align: right; display: block; }

/* Theme */
.cfg-theme-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28rpx; }
.cfg-theme-toggle { font-size: 26rpx; }
.cfg-presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; }
.cfg-preset { position: relative; padding: 16rpx; border-radius: 16rpx; border: 4rpx solid transparent; }
.cfg-preset.active { border-color: #1f2937; }
.cfg-preset-swatch { width: 100%; aspect-ratio: 1; border-radius: 14rpx; margin-bottom: 8rpx; }
.cfg-preset-name { font-size: 22rpx; color: #4b5563; text-align: center; display: block; }
.cfg-preset-check { position: absolute; top: -8rpx; right: -8rpx; width: 36rpx; height: 36rpx; border-radius: 50%; background: #1f2937; display: flex; align-items: center; justify-content: center; }

.cfg-custom { display: flex; flex-direction: column; gap: 24rpx; }
.cfg-custom-row { display: flex; align-items: center; gap: 24rpx; }
.cfg-custom-label { font-size: 26rpx; color: #4b5563; width: 120rpx; }
.cfg-color-box { width: 64rpx; height: 64rpx; border-radius: 12rpx; border: 1rpx solid #e5e7eb; flex-shrink: 0; }
.cfg-color-input { flex: 1; font-family: monospace; }

.cfg-preview { margin-top: 32rpx; padding: 24rpx; border-radius: 16rpx; }
.cfg-preview-head { display: flex; align-items: center; gap: 12rpx; }
.cfg-preview-title { font-size: 26rpx; }
.cfg-preview-nav { margin-top: 16rpx; height: 88rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.cfg-preview-nav-txt { font-size: 26rpx; color: #fff; }
.cfg-preview-btns { display: flex; gap: 16rpx; margin-top: 16rpx; }
.cfg-pv-btn { flex: 1; padding: 18rpx 0; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.cfg-pv-btn-out { background: transparent; border: 1rpx solid; }
.cfg-pv-btn-txt { font-size: 26rpx; color: #fff; }

/* Contacts */
.cfg-contact-row { display: flex; align-items: center; gap: 24rpx; margin-bottom: 28rpx; }
.cfg-contact-row:last-child { margin-bottom: 0; }
.cfg-contact-icon { width: 72rpx; height: 72rpx; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cfg-contact-input { flex: 1; }

/* QR */
.cfg-qr-row { display: flex; align-items: flex-start; gap: 28rpx; }
.cfg-qr-box { width: 224rpx; height: 224rpx; border-radius: 16rpx; border: 4rpx dashed #d1d5db; background: #fafafa; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; flex-shrink: 0; }
.cfg-qr-tip { font-size: 22rpx; color: #9ca3af; }
.cfg-qr-info { flex: 1; padding-top: 16rpx; }
.cfg-qr-t1 { font-size: 26rpx; color: #4b5563; display: block; }
.cfg-qr-t2 { font-size: 22rpx; color: #9ca3af; margin-top: 6rpx; display: block; }

/* Master */
.cfg-master { display: flex; align-items: center; gap: 24rpx; }
.cfg-master-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: #f3f4f6; flex-shrink: 0; }
.cfg-master-info { flex: 1; }
.cfg-master-name { font-size: 28rpx; font-weight: 500; color: #1f2937; display: block; }
.cfg-master-phone { font-size: 26rpx; color: #6b7280; margin-top: 4rpx; display: block; }
.cfg-master-join { font-size: 22rpx; color: #9ca3af; }

/* Status */
.cfg-status-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.cfg-status-row:last-child { margin-bottom: 0; }
.cfg-status-label { font-size: 26rpx; color: #6b7280; }
.cfg-status-val { font-size: 26rpx; color: #374151; }
.cfg-mono { font-family: monospace; }
.cfg-status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 8rpx; background: #dcfce7; color: #16a34a; }

/* Save bar */
.cfg-savebar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #f0f0f0; padding: 24rpx 32rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); }
.cfg-save-btn { height: 88rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.cfg-save-txt { font-size: 30rpx; font-weight: 500; color: #fff; }

.cfg-spin { animation: cfg-spin 1s linear infinite; }
@keyframes cfg-spin { to { transform: rotate(360deg); } }
</style>
