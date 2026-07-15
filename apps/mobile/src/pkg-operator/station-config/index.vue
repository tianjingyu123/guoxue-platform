<template>
  <view class="cfg-page">
    <!-- Header (动态主题色) -->
    <view class="cfg-header" :style="{ paddingTop: statusBarHeight + 'px', background: theme.primary }">
      <view class="cfg-header-inner">
        <view class="cfg-hbtn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#ffffff" /></view>
        <text class="cfg-title">分站装修</text>
        <view class="cfg-hbtn" @tap="handleSave">
          <app-icon :name="saving ? 'loader-2' : 'save'" :size="40" color="#ffffff" :class="{ 'cfg-spin': saving }" />
        </view>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="cfg-state">
      <view v-for="i in 4" :key="i" class="cfg-skeleton" />
    </view>
    <!-- 错误 -->
    <view v-else-if="error" class="cfg-state">
      <app-icon name="alert-circle" :size="72" color="#ef4444" />
      <text class="cfg-state-text">{{ error }}</text>
      <view class="cfg-state-btn" @tap="retry"><text>重试</text></view>
    </view>
    <!-- 未开通分站引导 -->
    <view v-else-if="notOpened" class="cfg-state">
      <app-icon name="store" :size="80" color="#C9A96E" />
      <text class="cfg-state-title">你还没有开通分站</text>
      <text class="cfg-state-desc">开通专属分站，打造属于你的国学品牌</text>
      <view class="cfg-state-btn" @tap="navigateTo('/pkg-operator/join-station/index')"><text>了解分站</text></view>
    </view>

    <!-- 正常内容 -->
    <view v-else class="cfg-body">
      <!-- Logo -->
      <view class="cfg-card">
        <text class="cfg-label">分站Logo</text>
        <view class="cfg-logo-row">
          <view class="cfg-logo" :style="{ borderColor: theme.primary }">
            <image lazy-load v-if="form.logo" class="cfg-logo-img" :src="form.logo" mode="aspectFill" />
            <app-icon v-else name="camera" :size="64" color="#9ca3af" />
          </view>
          <view class="cfg-logo-tip">
            <text class="cfg-logo-t1">建议尺寸：200x200像素</text>
            <text class="cfg-logo-t2">支持 JPG、PNG 格式，最大 2MB</text>
            <view class="cfg-logo-upload" :style="{ color: theme.primary }" @tap="uploadLogo">
              <app-icon name="upload" :size="26" :color="theme.primary" />
              <text class="cfg-logo-upload-txt">更换 Logo</text>
            </view>
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
          <textarea class="cfg-textarea" v-model="form.intro" maxlength="200" placeholder="介绍一下你的分站..." />
          <text class="cfg-count">{{ (form.intro || '').length }}/200</text>
        </view>
      </view>

      <!-- 首页模板（核心：换肤起步皮肤） -->
      <view class="cfg-card">
        <view class="cfg-theme-head">
          <text class="cfg-h3">首页模板</text>
          <text class="cfg-tpl-hint">选择适合你的分站定位</text>
        </view>
        <view class="cfg-tpl-list">
          <view
            v-for="t in templates"
            :key="t.id"
            class="cfg-tpl"
            :class="{ active: form.templateId === t.id }"
            :style="form.templateId === t.id ? { borderColor: theme.primary } : {}"
            @tap="form.templateId = t.id"
          >
            <view class="cfg-tpl-top">
              <text class="cfg-tpl-name">{{ t.name }}</text>
              <view v-if="form.templateId === t.id" class="cfg-tpl-check" :style="{ background: theme.primary }">
                <app-icon name="check" :size="20" color="#ffffff" />
              </view>
            </view>
            <text class="cfg-tpl-desc">{{ t.desc }}</text>
            <view class="cfg-tpl-tabs">
              <text v-for="tab in t.tabs" :key="tab" class="cfg-tpl-tab">{{ tab }}</text>
            </view>
          </view>
        </view>

        <!-- 选中模板的首页预览 -->
        <view v-if="selectedTemplate" class="cfg-tpl-preview">
          <view class="cfg-tpl-preview-head">
            <app-icon name="smartphone" :size="26" :color="theme.primary" />
            <text class="cfg-tpl-preview-title" :style="{ color: theme.primary }">{{ selectedTemplate.name }} · 首页结构</text>
          </view>
          <view class="cfg-tpl-preview-phone">
            <view class="cfg-tpl-pv-nav" :style="{ background: theme.primary }">
              <text class="cfg-tpl-pv-nav-txt">{{ form.name || '我的分站' }}</text>
            </view>
            <view class="cfg-tpl-pv-tabs">
              <text v-for="(tab, i) in selectedTemplate.tabs" :key="tab" class="cfg-tpl-pv-tab" :class="{ on: i === 0 }" :style="i === 0 ? { color: theme.primary, borderColor: theme.primary } : {}">{{ tab }}</text>
            </view>
            <view class="cfg-tpl-pv-modules">
              <view v-for="m in selectedTemplate.modules" :key="m" class="cfg-tpl-pv-module">
                <view class="cfg-tpl-pv-module-bar" :style="{ background: theme.primary + '22' }" />
                <text class="cfg-tpl-pv-module-txt">{{ moduleLabel(m) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 微页面深度装修入口 -->
      <view class="cfg-card cfg-mp-entry" @tap="goMicroPage">
        <view class="cfg-mp-icon"><app-icon name="layout" :size="44" color="#C41E3A" /></view>
        <view class="cfg-mp-body">
          <text class="cfg-mp-title">微页面装修</text>
          <text class="cfg-mp-desc">想要更自由？像装修店铺一样搭建首页楼层</text>
        </view>
        <app-icon name="chevron-right" :size="32" color="#9ca3af" />
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
            :class="{ active: form.themeColor.toLowerCase() === p.primary.toLowerCase() }"
            @tap="form.themeColor = p.primary"
          >
            <view class="cfg-preset-swatch" :style="{ background: `linear-gradient(135deg, ${p.primary} 50%, ${p.secondary} 50%)` }" />
            <text class="cfg-preset-name">{{ p.name }}</text>
            <view v-if="form.themeColor.toLowerCase() === p.primary.toLowerCase()" class="cfg-preset-check">
              <app-icon name="check" :size="20" color="#ffffff" />
            </view>
          </view>
        </view>

        <view v-else class="cfg-custom">
          <view class="cfg-custom-row">
            <text class="cfg-custom-label">主色调</text>
            <view class="cfg-color-box" :style="{ background: isValidHex(form.themeColor) ? form.themeColor : '#ccc' }" />
            <input class="cfg-input cfg-color-input" v-model="form.themeColor" placeholder="#C41E3A" maxlength="7" />
          </view>
          <text v-if="!isValidHex(form.themeColor)" class="cfg-custom-err">请输入合法的 16 进制颜色，如 #C41E3A</text>
        </view>
      </view>

      <!-- 经营数据（真实统计·只读） -->
      <view class="cfg-card">
        <text class="cfg-h3">经营数据</text>
        <view class="cfg-summary">
          <view class="cfg-sum-item">
            <text class="cfg-sum-num" :style="{ color: theme.primary }">{{ fmtMoney(config.totalEarning) }}</text>
            <text class="cfg-sum-label">累计收益(元)</text>
          </view>
          <view class="cfg-sum-item">
            <text class="cfg-sum-num" :style="{ color: theme.primary }">{{ fmtMoney(config.monthEarning) }}</text>
            <text class="cfg-sum-label">本月收益(元)</text>
          </view>
          <view class="cfg-sum-item">
            <text class="cfg-sum-num" :style="{ color: theme.primary }">{{ config.monthOrders }}</text>
            <text class="cfg-sum-label">本月订单</text>
          </view>
          <view class="cfg-sum-item">
            <text class="cfg-sum-num" :style="{ color: theme.primary }">{{ config.lockedUsers }}</text>
            <text class="cfg-sum-label">锁定用户</text>
          </view>
        </view>
      </view>

      <!-- 站长信息 -->
      <view class="cfg-card">
        <text class="cfg-h3">站长信息</text>
        <view class="cfg-master">
          <image lazy-load class="cfg-master-avatar" :src="config.masterAvatar || defaultAvatar" mode="aspectFill" />
          <view class="cfg-master-info">
            <text class="cfg-master-name">{{ config.masterNickname || '站长' }}</text>
            <text class="cfg-master-phone">入驻：{{ config.createTime }}</text>
          </view>
        </view>
      </view>

      <!-- 状态信息 -->
      <view class="cfg-card">
        <view class="cfg-status-row">
          <text class="cfg-status-label">分站状态</text>
          <text class="cfg-status-badge" :class="statusClass">{{ statusLabel }}</text>
        </view>
        <view class="cfg-status-row">
          <text class="cfg-status-label">分站代码</text>
          <text class="cfg-status-val cfg-mono">{{ config.code }}</text>
        </view>
        <view class="cfg-status-row">
          <text class="cfg-status-label">推广链接</text>
          <text class="cfg-status-val cfg-link" @tap="copyShareLink">复制</text>
        </view>
      </view>
    </view>

    <!-- 底部保存 -->
    <view v-if="!loading && !error && !notOpened" class="cfg-savebar">
      <view class="cfg-save-btn" :style="{ background: theme.primary, opacity: saving ? 0.7 : 1 }" @tap="handleSave">
        <app-icon v-if="saving" name="loader-2" :size="28" color="#ffffff" class="cfg-spin" />
        <text class="cfg-save-txt">{{ saving ? '保存中...' : '保存配置' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { operatorApi, type StationConfigData, type StationTemplateOption } from '@/lib/operator-data'

const statusBarHeight = ref(20)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 20 } })

const defaultAvatar = 'https://api.rebugx.cn/assets/experts/expert-1.webp'

// 预设主题色（仅前端展示标识，持久化只存主色 themeColor）
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

// 首页模块中文名（对齐后端 STATION_TEMPLATES.modules）
const MODULE_LABELS: Record<string, string> = {
  article: '文章', course: '课程', circle: '圈子', product: '商城',
  video: '视频', live: '直播', paipan: '排盘', marketing: '活动',
}
function moduleLabel(m: string) { return MODULE_LABELS[m] || m }

const loading = ref(true)
const error = ref('')
const notOpened = ref(false)
const saving = ref(false)

const config = ref<StationConfigData>({} as StationConfigData)
const templates = ref<StationTemplateOption[]>([])
const useCustomColor = ref(false)

// 可编辑表单（与 config 解耦，避免误改只读统计）
const form = reactive({ name: '', intro: '', logo: '', themeColor: '#C41E3A', templateId: 'default' })

const theme = computed(() => ({ primary: isValidHex(form.themeColor) ? form.themeColor : '#C41E3A' }))
const selectedTemplate = computed(() => templates.value.find((t) => t.id === form.templateId) || null)

const statusLabel = computed(() => ({ active: '运营中', pending: '审核中', expired: '已到期', paused: '已暂停' }[config.value.status] || '运营中'))
const statusClass = computed(() => `st-${config.value.status || 'active'}`)

function isValidHex(c: string) { return /^#[0-9a-fA-F]{6}$/.test(c || '') }
function fmtMoney(n: number) {
  const v = Number(n) || 0
  return v >= 10000 ? (v / 10000).toFixed(1) + 'w' : v.toLocaleString()
}

async function fetchData() {
  try {
    const [cfg, tpls] = await Promise.all([
      operatorApi.getStationConfig(),
      operatorApi.getStationTemplates(),
    ])
    config.value = cfg
    templates.value = tpls
    form.name = cfg.name
    form.intro = cfg.intro
    form.logo = cfg.logo
    form.themeColor = cfg.themeColor
    form.templateId = cfg.templateId
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (/没有开通|未开通|NOT_FOUND|404/.test(msg)) notOpened.value = true
    else error.value = msg || '加载失败'
  } finally {
    loading.value = false
  }
}

async function retry() {
  loading.value = true
  error.value = ''
  notOpened.value = false
  await fetchData()
}

onMounted(fetchData)

function uploadLogo() {
  // Logo 上传依赖 OSS 文件服务，后端暂未开放上传端点 → 诚实提示，不伪造成功
  uni.showToast({ title: 'Logo 上传即将开放', icon: 'none' })
}

async function handleSave() {
  if (saving.value) return
  if (!form.name.trim()) { uni.showToast({ title: '请填写分站名称', icon: 'none' }); return }
  if (!isValidHex(form.themeColor)) { uni.showToast({ title: '主题色格式不正确', icon: 'none' }); return }
  saving.value = true
  try {
    await operatorApi.updateStationConfig({
      name: form.name.trim(),
      intro: form.intro.trim(),
      themeColor: form.themeColor,
      templateId: form.templateId,
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function copyShareLink() {
  // import.meta.env 在 uni-app 下缺少类型声明，保留 as any
  const base = (import.meta as any).env?.VITE_H5_URL || ''
  const link = `${base}/#/pages/index/index?ref=${config.value.code}`
  uni.setClipboardData({ data: link, success: () => uni.showToast({ title: '推广链接已复制', icon: 'none' }) })
}

function goMicroPage() { navigateTo('/pkg-operator/micro-page-editor/index') }

function goBack() { uni.navigateBack({ fail: () => navigateTo('/pages/index/index') }) }
</script>

<style scoped lang="scss">
.cfg-page { min-height: 100vh; background: #FAF8F5; }

.cfg-header { position: sticky; top: 0; z-index: 50; }
.cfg-header-inner { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 16rpx; }
.cfg-hbtn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.cfg-title { font-size: 34rpx; font-weight: 600; color: #fff; }

/* 三态 */
.cfg-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 120rpx 48rpx; }
.cfg-skeleton { width: 100%; height: 160rpx; background: #EDE7DC; border-radius: 24rpx; opacity: 0.6; }
.cfg-state-text { font-size: 28rpx; color: #ef4444; text-align: center; }
.cfg-state-title { font-size: 32rpx; font-weight: 600; color: #1f2937; }
.cfg-state-desc { font-size: 26rpx; color: #8a8178; text-align: center; }
.cfg-state-btn { padding: 16rpx 56rpx; background: var(--brand); border-radius: 16rpx; }
.cfg-state-btn text { font-size: 28rpx; color: #fff; }

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
.cfg-logo { width: 144rpx; height: 144rpx; border-radius: 50%; border: 4rpx solid var(--brand); background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.cfg-logo-img { width: 100%; height: 100%; }
.cfg-logo-tip { flex: 1; }
.cfg-logo-t1 { font-size: 26rpx; color: #4b5563; display: block; }
.cfg-logo-t2 { font-size: 22rpx; color: #9ca3af; margin-top: 6rpx; display: block; }
.cfg-logo-upload { display: inline-flex; align-items: center; gap: 6rpx; margin-top: 16rpx; }
.cfg-logo-upload-txt { font-size: 24rpx; }

/* Fields */
.cfg-field { margin-bottom: 28rpx; }
.cfg-field:last-child { margin-bottom: 0; }
.cfg-flabel { font-size: 26rpx; color: #4b5563; margin-bottom: 12rpx; display: block; }
.cfg-input { height: 76rpx; padding: 0 24rpx; background: #fff; border: 1rpx solid #e5e7eb; border-radius: 14rpx; font-size: 28rpx; color: #1f2937; box-sizing: border-box; }
.cfg-textarea { width: 100%; min-height: 180rpx; padding: 16rpx 24rpx; background: #fff; border: 1rpx solid #e5e7eb; border-radius: 14rpx; font-size: 28rpx; color: #1f2937; box-sizing: border-box; }
.cfg-count { font-size: 22rpx; color: #9ca3af; margin-top: 8rpx; text-align: right; display: block; }

/* 首页模板 */
.cfg-tpl-hint { font-size: 24rpx; color: #9ca3af; }
.cfg-tpl-list { display: flex; flex-direction: column; gap: 20rpx; }
.cfg-tpl { padding: 24rpx; border-radius: 20rpx; border: 3rpx solid #eee; background: #fafafa; }
.cfg-tpl.active { background: #fff; }
.cfg-tpl-top { display: flex; align-items: center; justify-content: space-between; }
.cfg-tpl-name { font-size: 30rpx; font-weight: 600; color: #1f2937; }
.cfg-tpl-check { width: 40rpx; height: 40rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.cfg-tpl-desc { font-size: 24rpx; color: #6b7280; margin-top: 8rpx; display: block; }
.cfg-tpl-tabs { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.cfg-tpl-tab { font-size: 22rpx; color: #8a8178; background: #F2ECE1; border-radius: 8rpx; padding: 4rpx 16rpx; }

/* 模板预览 */
.cfg-tpl-preview { margin-top: 28rpx; padding: 24rpx; border-radius: 20rpx; background: #F8F5F0; }
.cfg-tpl-preview-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.cfg-tpl-preview-title { font-size: 26rpx; font-weight: 500; }
.cfg-tpl-preview-phone { background: #fff; border-radius: 16rpx; overflow: hidden; border: 1rpx solid #eee; }
.cfg-tpl-pv-nav { height: 80rpx; display: flex; align-items: center; justify-content: center; }
.cfg-tpl-pv-nav-txt { font-size: 28rpx; font-weight: 600; color: #fff; }
.cfg-tpl-pv-tabs { display: flex; gap: 28rpx; padding: 20rpx 24rpx; border-bottom: 1rpx solid #f0f0f0; }
.cfg-tpl-pv-tab { font-size: 24rpx; color: #9ca3af; padding-bottom: 6rpx; border-bottom: 4rpx solid transparent; }
.cfg-tpl-pv-tab.on { font-weight: 600; }
.cfg-tpl-pv-modules { padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.cfg-tpl-pv-module { display: flex; align-items: center; gap: 16rpx; }
.cfg-tpl-pv-module-bar { width: 72rpx; height: 48rpx; border-radius: 10rpx; flex-shrink: 0; }
.cfg-tpl-pv-module-txt { font-size: 24rpx; color: #4b5563; }

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
.cfg-custom-err { font-size: 22rpx; color: #ef4444; }

/* 微页面装修入口 */
.cfg-mp-entry { display: flex; align-items: center; gap: 24rpx; }
.cfg-mp-icon { width: 88rpx; height: 88rpx; border-radius: 20rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cfg-mp-body { flex: 1; min-width: 0; }
.cfg-mp-title { font-size: 30rpx; font-weight: 600; color: #1f2937; display: block; }
.cfg-mp-desc { font-size: 24rpx; color: #9ca3af; margin-top: 6rpx; display: block; }

/* Master */
.cfg-master { display: flex; align-items: center; gap: 24rpx; }
.cfg-master-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: #f3f4f6; flex-shrink: 0; }
.cfg-master-info { flex: 1; }
.cfg-master-name { font-size: 28rpx; font-weight: 500; color: #1f2937; display: block; }
.cfg-master-phone { font-size: 26rpx; color: #6b7280; margin-top: 4rpx; display: block; }

/* Status */
.cfg-status-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.cfg-status-row:last-child { margin-bottom: 0; }
.cfg-status-label { font-size: 26rpx; color: #6b7280; }
.cfg-status-val { font-size: 26rpx; color: #374151; }
.cfg-mono { font-family: monospace; }
.cfg-link { color: var(--brand); }
.cfg-status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 8rpx; background: #dcfce7; color: #16a34a; }
.cfg-status-badge.st-pending { background: #fef9c3; color: #ca8a04; }
.cfg-status-badge.st-expired, .cfg-status-badge.st-paused { background: #fee2e2; color: #dc2626; }

/* Save bar */
.cfg-savebar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #f0f0f0; padding: 24rpx 32rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); }
.cfg-save-btn { height: 88rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.cfg-save-txt { font-size: 30rpx; font-weight: 500; color: #fff; }

.cfg-spin { animation: cfg-spin 1s linear infinite; }
@keyframes cfg-spin { to { transform: rotate(360deg); } }
</style>
