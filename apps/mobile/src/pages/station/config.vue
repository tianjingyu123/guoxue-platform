<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view
      class="header"
      :style="{ background: currentTheme.primary }"
    >
      <text
        class="back-btn"
        @click="uni.navigateBack"
      >
        ‹
      </text>
      <text class="header-title">
        分站配置
      </text>
      <text
        class="header-save"
        :class="{ saving }"
        @click="handleSave"
      >
        {{ saving ? '保存中...' : '保存' }}
      </text>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
    >
      <!-- 运营数据摘要 -->
      <view
        v-if="summary"
        class="summary-card"
      >
        <view class="summary-grid">
          <view class="summary-item">
            <text
              class="summary-val"
              :style="{ color: currentTheme.primary }"
            >
              {{ summary.memberCount || 0 }}
            </text>
            <text class="summary-label">
              成员
            </text>
          </view>
          <view class="summary-item">
            <text
              class="summary-val"
              :style="{ color: currentTheme.primary }"
            >
              {{ formatMoney(summary.totalRevenue) }}
            </text>
            <text class="summary-label">
              收益
            </text>
          </view>
          <view class="summary-item">
            <text
              class="summary-val"
              :style="{ color: currentTheme.primary }"
            >
              {{ summary.contentCount || 0 }}
            </text>
            <text class="summary-label">
              内容
            </text>
          </view>
          <view class="summary-item">
            <text
              class="summary-val"
              :style="{ color: currentTheme.primary }"
            >
              {{ formatCount(summary.visitCount) }}
            </text>
            <text class="summary-label">
              访问
            </text>
          </view>
        </view>
      </view>

      <!-- Logo 上传 -->
      <view class="section">
        <text class="section-title">
          分站Logo
        </text>
        <view class="logo-upload">
          <view
            class="logo-preview"
            :style="{ borderColor: currentTheme.primary }"
            @click="chooseLogo"
          >
            <image
              v-if="formData.logo"
              :src="formData.logo"
              class="logo-img"
              mode="aspectFill"
            />
            <view
              v-else
              class="logo-placeholder"
            >
              <text class="logo-placeholder-icon">
                📷
              </text>
            </view>
            <view
              v-if="uploadingLogo"
              class="logo-overlay"
            >
              <text class="logo-loading">
                上传中...
              </text>
            </view>
          </view>
          <view class="logo-tips">
            <text class="tip-text">
              建议尺寸：200x200像素
            </text>
            <text class="tip-sub">
              支持 JPG、PNG 格式，最大 2MB
            </text>
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="section">
        <text class="section-title">
          基本信息
        </text>
        <view class="form-item">
          <text class="form-label">
            分站名称 *
          </text>
          <input
            v-model="formData.name"
            class="form-input"
            placeholder="请输入分站名称"
            maxlength="20"
          >
          <text class="form-count">
            {{ (formData.name || '').length }}/20
          </text>
        </view>
        <view class="form-item">
          <text class="form-label">
            分站简介
          </text>
          <textarea
            v-model="formData.description"
            class="form-textarea"
            placeholder="介绍一下你的分站..."
            maxlength="200"
          />
          <text class="form-count">
            {{ (formData.description || '').length }}/200
          </text>
        </view>
      </view>

      <!-- 主题色选择 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">
            主题色
          </text>
          <text
            class="section-toggle"
            :style="{ color: currentTheme.primary }"
            @click="useCustomColor = !useCustomColor"
          >
            {{ useCustomColor ? '使用预设' : '自定义' }}
          </text>
        </view>
        <view
          v-if="!useCustomColor"
          class="theme-grid"
        >
          <view
            v-for="p in themePresets"
            :key="p.id"
            class="theme-item"
            :class="{ 'theme-active': selectedTheme === p.id }"
            @click="selectedTheme = p.id"
          >
            <view
              class="theme-block"
              :style="{ background: `linear-gradient(135deg, ${p.primary} 50%, ${p.secondary} 50%)` }"
            />
            <text class="theme-name">
              {{ p.name }}
            </text>
            <text
              v-if="selectedTheme === p.id"
              class="theme-check"
            >
              ✓
            </text>
          </view>
        </view>
        <view
          v-else
          class="custom-colors"
        >
          <view class="color-row">
            <text class="color-label">
              主色调
            </text>
            <view class="color-picker-wrap">
              <input
                v-model="customColor.primary"
                type="text"
                class="color-input"
                placeholder="#C41E3A"
              >
              <view
                class="color-dot"
                :style="{ background: customColor.primary }"
              />
            </view>
          </view>
          <view class="color-row">
            <text class="color-label">
              辅助色
            </text>
            <view class="color-picker-wrap">
              <input
                v-model="customColor.secondary"
                type="text"
                class="color-input"
                placeholder="#C9A96E"
              >
              <view
                class="color-dot"
                :style="{ background: customColor.secondary }"
              />
            </view>
          </view>
        </view>
        <!-- 预览 -->
        <view
          class="preview-section"
          :style="{ background: currentTheme.primary + '10' }"
        >
          <view class="preview-header">
            <text
              class="preview-icon"
              :style="{ color: currentTheme.primary }"
            >
              👁
            </text>
            <text
              class="preview-title"
              :style="{ color: currentTheme.primary }"
            >
              导航栏样式
            </text>
          </view>
          <view
            class="preview-navbar"
            :style="{ background: currentTheme.primary }"
          >
            <text class="preview-nav-text">
              分站首页
            </text>
          </view>
          <view class="preview-buttons">
            <view
              class="preview-btn-primary"
              :style="{ background: currentTheme.primary }"
            >
              主按钮
            </view>
            <view
              class="preview-btn-secondary"
              :style="{ borderColor: currentTheme.primary, color: currentTheme.primary }"
            >
              次按钮
            </view>
          </view>
        </view>
      </view>

      <!-- 联系方式 -->
      <view class="section">
        <text class="section-title">
          联系方式
        </text>
        <view class="contact-row">
          <text class="contact-icon">
            📞
          </text>
          <input
            v-model="formData.contactPhone"
            class="contact-input"
            placeholder="联系电话"
            type="text"
          >
        </view>
        <view class="contact-row">
          <text class="contact-icon">
            💬
          </text>
          <input
            v-model="formData.contactWechat"
            class="contact-input"
            placeholder="微信号"
          >
        </view>
        <view class="contact-row">
          <text class="contact-icon">
            📧
          </text>
          <input
            v-model="formData.contactEmail"
            class="contact-input"
            placeholder="邮箱地址"
            type="email"
          >
        </view>
      </view>

      <!-- 小程序码 -->
      <view class="section">
        <text class="section-title">
          小程序码
        </text>
        <view class="qrcode-upload">
          <view
            class="qrcode-preview"
            @click="chooseQrcode"
          >
            <image
              v-if="formData.miniProgramQrcode"
              :src="formData.miniProgramQrcode"
              class="qrcode-img"
              mode="aspectFill"
            />
            <view
              v-else
              class="qrcode-placeholder"
            >
              <text class="qrcode-icon">
                ⬆️
              </text>
              <text class="qrcode-text">
                上传小程序码
              </text>
            </view>
          </view>
          <view class="qrcode-tips">
            <text class="tip-text">
              上传小程序码供用户扫码访问
            </text>
            <text class="tip-sub">
              建议尺寸：430x430像素
            </text>
          </view>
        </view>
      </view>

      <!-- 站长信息（只读） -->
      <view
        v-if="config?.masterInfo"
        class="section"
      >
        <text class="section-title">
          站长信息
        </text>
        <view class="master-row">
          <image
            v-if="config.masterInfo.avatar"
            :src="config.masterInfo.avatar"
            class="master-avatar"
            mode="aspectFill"
          />
          <view class="master-info">
            <text class="master-name">
              {{ config.masterInfo.nickname }}
            </text>
            <text class="master-phone">
              {{ config.masterInfo.phone }}
            </text>
          </view>
          <text
            v-if="config.masterInfo.joinDate"
            class="master-date"
          >
            入驻：{{ config.masterInfo.joinDate }}
          </text>
        </view>
      </view>

      <!-- 状态信息 -->
      <view class="section">
        <view class="status-row">
          <text class="status-label">
            分站状态
          </text>
          <text
            class="status-badge"
            :class="config?.status"
          >
            {{ statusLabel(config?.status) }}
          </text>
        </view>
        <view class="status-row">
          <text class="status-label">
            分站代码
          </text>
          <text class="status-code">
            {{ config?.code || '--' }}
          </text>
        </view>
        <view class="status-row">
          <text class="status-label">
            最后更新
          </text>
          <text class="status-value">
            {{ config?.updatedAt || '--' }}
          </text>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- 底部保存按钮 -->
    <view
      v-if="config"
      class="bottom-bar"
    >
      <button
        class="btn-save"
        :style="{ background: currentTheme.primary }"
        :disabled="saving"
        @click="handleSave"
      >
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="false"
      skeleton-type="detail"
      @retry="fetchData"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const saving = ref(false)
const config = ref<any>(null)
const summary = ref<any>(null)
const formData = ref<any>({})
const selectedTheme = ref('guoxue')
const useCustomColor = ref(false)
const customColor = ref({ primary: '#C41E3A', secondary: '#C9A96E' })
const uploadingLogo = ref(false)
const uploadingQrcode = ref(false)

const themePresets = [
  { id: 'guoxue', name: '国学红', primary: '#C41E3A', secondary: '#C9A96E' },
  { id: 'gold', name: '金色', primary: '#C9A96E', secondary: '#8B7500' },
  { id: 'ink', name: '墨色', primary: '#2C2C2C', secondary: '#666' },
  { id: 'blue', name: '深蓝', primary: '#1a365d', secondary: '#2b6cb0' },
  { id: 'green', name: '翠绿', primary: '#276749', secondary: '#38a169' },
  { id: 'purple', name: '紫色', primary: '#553c9a', secondary: '#805ad5' },
  { id: 'brown', name: '棕色', primary: '#744210', secondary: '#a68a5a' },
  { id: 'teal', name: '青绿', primary: '#234e52', secondary: '#319795' },
]

const currentTheme = computed(() => {
  if (useCustomColor.value) return customColor.value
  const preset = themePresets.find(p => p.id === selectedTheme.value)
  return preset || { primary: '#C41E3A', secondary: '#C9A96E' }
})

function getStationCode(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.code || page?.options?.stationCode || ''
}

onMounted(() => { fetchData() })

async function fetchData() {
  const code = getStationCode()
  loading.value = true; loadError.value = null
  try {
    const api = require('../../api')
    const [configRes, summaryRes]: any[] = await Promise.all([
      api.stationApi.getConfig?.(code).catch(() => ({})),
      api.stationApi.dashboardOverview?.(code).catch(() => ({})),
    ])
    const cfg = configRes?.data || configRes || {}
    config.value = cfg
    formData.value = {
      name: cfg.name || '',
      logo: cfg.logo || '',
      description: cfg.description || '',
      contactPhone: cfg.contactPhone || '',
      contactWechat: cfg.contactWechat || '',
      contactEmail: cfg.contactEmail || '',
      miniProgramQrcode: cfg.miniProgramQrcode || '',
    }
    selectedTheme.value = cfg.themeColorId || 'guoxue'
    if (cfg.customPrimaryColor) {
      useCustomColor.value = true
      customColor.value = {
        primary: cfg.customPrimaryColor,
        secondary: cfg.customSecondaryColor || '#C9A96E',
      }
    }
    summary.value = summaryRes?.data || summaryRes || null
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function chooseLogo() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFile = res.tempFilePaths[0]
      if (!tempFile) return
      uploadingLogo.value = true
      try {
        const api = require('../../api')
        const uploadRes: any = await api.stationApi.uploadImage?.(tempFile, 'logo')
        const url = uploadRes?.data?.url || uploadRes?.url || tempFile
        formData.value.logo = url
        uni.showToast({ title: '上传成功' })
      } catch {
        uni.showToast({ title: '上传失败', icon: 'none' })
      } finally {
        uploadingLogo.value = false
      }
    },
  })
}

function chooseQrcode() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFile = res.tempFilePaths[0]
      if (!tempFile) return
      uploadingQrcode.value = true
      try {
        const api = require('../../api')
        const uploadRes: any = await api.stationApi.uploadImage?.(tempFile, 'qrcode')
        const url = uploadRes?.data?.url || uploadRes?.url || tempFile
        formData.value.miniProgramQrcode = url
        uni.showToast({ title: '上传成功' })
      } catch {
        uni.showToast({ title: '上传失败', icon: 'none' })
      } finally {
        uploadingQrcode.value = false
      }
    },
  })
}

async function handleSave() {
  if (!formData.value.name?.trim()) {
    uni.showToast({ title: '请输入分站名称', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const api = require('../../api')
    const updateData = {
      ...formData.value,
      themeColorId: useCustomColor.value ? 'custom' : selectedTheme.value,
      customPrimaryColor: useCustomColor.value ? customColor.value.primary : undefined,
      customSecondaryColor: useCustomColor.value ? customColor.value.secondary : undefined,
    }
    await api.stationApi.updateConfig?.(getStationCode(), updateData)
    uni.showToast({ title: '保存成功' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function statusLabel(status?: string): string {
  const map: Record<string, string> = { active: '运营中', pending: '审核中', suspended: '已暂停', inactive: '已暂停' }
  return map[status || ''] || status || '未知'
}

function formatMoney(val?: number): string {
  if (!val) return '0'
  return (val / 10000).toFixed(1) + 'w'
}

function formatCount(val?: number): string {
  if (!val) return '0'
  if (val >= 10000) return (val / 10000).toFixed(1) + 'w'
  return String(val)
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

.header { padding: 60rpx 24rpx 20rpx; display: flex; align-items: center; justify-content: space-between; }
.back-btn { font-size: 44rpx; color: #fff; line-height: 1; }
.header-title { font-size: 32rpx; font-weight: 600; color: #fff; }
.header-save { font-size: 28rpx; color: #fff; padding: 8rpx 16rpx; border: 1rpx solid rgba(255,255,255,0.5); border-radius: 12rpx; }
.header-save.saving { opacity: 0.6; }

.scroll-area { padding: 24rpx; }

.summary-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; text-align: center; }
.summary-item { }
.summary-val { font-size: 36rpx; font-weight: bold; display: block; }
.summary-label { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }

.section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 20rpx; }
.section-toggle { font-size: 24rpx; }

.logo-upload { display: flex; align-items: center; gap: 24rpx; }
.logo-preview { width: 120rpx; height: 120rpx; border-radius: 50%; border: 2rpx dashed #E8E0D5; overflow: hidden; position: relative; flex-shrink: 0; }
.logo-img { width: 100%; height: 100%; }
.logo-placeholder { width: 100%; height: 100%; background: #F9F8F6; display: flex; align-items: center; justify-content: center; }
.logo-placeholder-icon { font-size: 48rpx; }
.logo-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.logo-loading { font-size: 22rpx; color: #fff; }
.logo-tips { flex: 1; }
.tip-text { font-size: 24rpx; color: #666; display: block; }
.tip-sub { font-size: 20rpx; color: #ccc; margin-top: 4rpx; display: block; }

.form-item { margin-bottom: 24rpx; position: relative; }
.form-label { font-size: 24rpx; color: #666; display: block; margin-bottom: 8rpx; }
.form-input { width: 100%; height: 72rpx; border: 1rpx solid #E8E0D5; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; box-sizing: border-box; }
.form-textarea { width: 100%; height: 160rpx; border: 1rpx solid #E8E0D5; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 26rpx; box-sizing: border-box; }
.form-count { position: absolute; right: 0; bottom: -32rpx; font-size: 20rpx; color: #ccc; }

.theme-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.theme-item { position: relative; padding: 12rpx; border-radius: 12rpx; border: 2rpx solid transparent; }
.theme-active { border-color: #2C2C2C; }
.theme-block { width: 100%; aspect-ratio: 1; border-radius: 8rpx; margin-bottom: 8rpx; }
.theme-name { font-size: 22rpx; color: #666; text-align: center; display: block; }
.theme-check { position: absolute; top: 4rpx; right: 4rpx; width: 32rpx; height: 32rpx; border-radius: 50%; background: #2C2C2C; color: #fff; font-size: 20rpx; display: flex; align-items: center; justify-content: center; }

.custom-colors { display: flex; flex-direction: column; gap: 20rpx; }
.color-row { display: flex; align-items: center; gap: 16rpx; }
.color-label { font-size: 24rpx; color: #666; width: 100rpx; }
.color-picker-wrap { flex: 1; position: relative; }
.color-input { width: 100%; height: 72rpx; border: 1rpx solid #E8E0D5; border-radius: 12rpx; padding: 0 60rpx 0 20rpx; font-size: 24rpx; font-family: monospace; box-sizing: border-box; }
.color-dot { position: absolute; right: 16rpx; top: 50%; transform: translateY(-50%); width: 32rpx; height: 32rpx; border-radius: 50%; border: 1rpx solid #E8E0D5; }

.preview-section { margin-top: 24rpx; padding: 20rpx; border-radius: 12rpx; }
.preview-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 16rpx; }
.preview-icon { font-size: 28rpx; }
.preview-title { font-size: 24rpx; }
.preview-navbar { height: 72rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 12rpx; }
.preview-nav-text { font-size: 26rpx; color: #fff; }
.preview-buttons { display: flex; gap: 16rpx; }
.preview-btn-primary { flex: 1; height: 64rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #fff; }
.preview-btn-secondary { flex: 1; height: 64rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; border: 2rpx solid; }

.contact-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.contact-icon { font-size: 36rpx; width: 56rpx; text-align: center; }
.contact-input { flex: 1; height: 72rpx; border: 1rpx solid #E8E0D5; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; }

.qrcode-upload { display: flex; gap: 24rpx; }
.qrcode-preview { width: 200rpx; height: 200rpx; border: 2rpx dashed #E8E0D5; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; }
.qrcode-img { width: 100%; height: 100%; }
.qrcode-placeholder { width: 100%; height: 100%; background: #F9F8F6; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; }
.qrcode-icon { font-size: 40rpx; }
.qrcode-text { font-size: 22rpx; color: #999; }
.qrcode-tips { flex: 1; padding-top: 16rpx; }

.master-row { display: flex; align-items: center; gap: 16rpx; }
.master-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; }
.master-info { flex: 1; }
.master-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.master-phone { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.master-date { font-size: 22rpx; color: #ccc; }

.status-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #F5F0E8; }
.status-row:last-child { border-bottom: none; }
.status-label { font-size: 24rpx; color: #666; }
.status-badge { padding: 6rpx 20rpx; border-radius: 12rpx; font-size: 22rpx; }
.status-badge.active { background: rgba(82,196,26,0.1); color: #52C41A; }
.status-badge.pending { background: rgba(245,158,11,0.1); color: #F59E0B; }
.status-badge.suspended { background: rgba(196,30,58,0.1); color: #C41E3A; }
.status-code { font-size: 24rpx; color: #2C2C2C; font-family: monospace; }
.status-value { font-size: 24rpx; color: #999; }

.bottom-spacer { height: 140rpx; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 16rpx 24rpx 40rpx; background: #fff; border-top: 1rpx solid #E8E0D5; }
.btn-save { width: 100%; height: 88rpx; border: none; border-radius: 44rpx; font-size: 30rpx; font-weight: 600; color: #fff; display: flex; align-items: center; justify-content: center; }
.btn-save[disabled] { opacity: 0.5; }
</style>
