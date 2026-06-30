<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left">
          <view class="nav-btn" @tap="onBack">
            <AppIcon name="chevron-left" :size="40" color="#2C2C2C" />
          </view>
          <text class="nav-title">直播间装修</text>
        </view>
        <view class="save-btn" @tap="onSave">
          <text class="save-btn-txt">保存配置</text>
        </view>
      </view>
    </view>

    <view class="body">
      <!-- Tab 切换 -->
      <view class="tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <AppIcon :name="tab.icon" :size="28" :color="activeTab === tab.key ? '#fff' : '#666'" />
          <text class="tab-txt" :class="{ active: activeTab === tab.key }">{{ tab.label }}</text>
        </view>
      </view>

      <!-- 主题模版 Tab -->
      <view v-if="activeTab === 'templates'" class="tab-content">
        <view class="section">
          <text class="section-title">预设氛围模版</text>
          <view class="theme-grid">
            <view
              v-for="theme in themeTemplates"
              :key="theme.id"
              class="theme-card"
              :class="{ selected: selectedTheme === theme.id }"
              @tap="selectedTheme = theme.id"
            >
              <view class="theme-preview" :style="{ background: `linear-gradient(135deg, ${theme.bg1}, ${theme.bg2})` }">
                <text class="theme-emoji">{{ theme.preview }}</text>
                <view v-if="selectedTheme === theme.id" class="theme-check">
                  <AppIcon name="check" :size="24" color="#fff" />
                </view>
                <view v-if="!theme.isFree" class="theme-vip">
                  <AppIcon name="crown" :size="20" color="#fff" />
                  <text class="theme-vip-txt">会员</text>
                </view>
                <view v-if="theme.isUsing" class="theme-using">
                  <text class="theme-using-txt">使用中</text>
                </view>
              </view>
              <view class="theme-info">
                <text class="theme-name">{{ theme.name }}</text>
                <text class="theme-desc">{{ theme.desc }}</text>
                <view class="theme-colors">
                  <view class="color-dot" :style="{ backgroundColor: theme.primaryColor }" />
                  <view class="color-dot" :style="{ backgroundColor: theme.secondaryColor }" />
                  <text class="theme-color-label">主色调</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 自定义主题 -->
        <view class="card">
          <view class="card-head-row">
            <text class="card-title">自定义主题</text>
            <view class="vip-tag">
              <AppIcon name="crown" :size="20" color="#d97706" />
              <text class="vip-tag-txt">高级会员专享</text>
            </view>
          </view>

          <view class="field-block">
            <text class="field-label">品牌Logo</text>
            <view class="logo-row">
              <view class="logo-upload">
                <AppIcon name="upload" :size="40" color="#999" />
              </view>
              <view class="logo-tip">
                <text class="logo-tip-txt">支持PNG/JPG格式</text>
                <text class="logo-tip-txt">建议尺寸200x200px</text>
              </view>
            </view>
          </view>

          <view class="field-block">
            <text class="field-label">主色调</text>
            <view class="color-pick-row">
              <view
                v-for="color in customColors"
                :key="color"
                class="color-pick"
                :class="{ active: customColor === color }"
                :style="{ backgroundColor: color }"
                @tap="customColor = color"
              />
              <view class="color-pick-add">
                <AppIcon name="plus" :size="32" color="#999" />
              </view>
            </view>
          </view>

          <view class="field-block last">
            <text class="field-label">自定义背景</text>
            <view class="bg-grid">
              <view class="bg-cell dashed">
                <AppIcon name="upload" :size="40" color="#999" />
                <text class="bg-cell-txt">上传图片</text>
              </view>
              <view class="bg-cell dashed">
                <AppIcon name="play" :size="40" color="#999" />
                <text class="bg-cell-txt">上传视频</text>
              </view>
              <view class="bg-cell green">
                <text class="bg-cell-green-txt">绿幕</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 视觉元素 Tab -->
      <view v-if="activeTab === 'elements'" class="tab-content">
        <view class="card">
          <text class="card-title block">背景设置</text>
          <view class="slider-row">
            <text class="slider-label">背景模糊</text>
            <view class="slider-track" @tap="setSlider('blur', $event)">
              <view class="slider-fill" :style="{ width: blur + '%' }" />
              <view class="slider-thumb" :style="{ left: blur + '%' }" />
            </view>
          </view>
          <view class="slider-row">
            <text class="slider-label">背景暗度</text>
            <view class="slider-track" @tap="setSlider('dark', $event)">
              <view class="slider-fill" :style="{ width: dark + '%' }" />
              <view class="slider-thumb" :style="{ left: dark + '%' }" />
            </view>
          </view>
        </view>

        <view class="card">
          <view class="card-head-row">
            <text class="card-title">直播间挂件</text>
            <view class="ghost-btn">
              <AppIcon name="plus" :size="24" color="#666" />
              <text class="ghost-btn-txt">添加挂件</text>
            </view>
          </view>
          <view class="pendant-grid">
            <view
              v-for="p in pendants"
              :key="p.id"
              class="pendant"
              :class="{ active: activePendants.includes(p.id) }"
              @tap="togglePendant(p.id)"
            >
              <view class="pendant-icon">
                <text class="pendant-icon-txt">{{ p.icon }}</text>
              </view>
              <view class="pendant-info">
                <text class="pendant-name">{{ p.name }}</text>
                <text class="pendant-pos">位置：{{ p.position }}</text>
              </view>
              <view class="switch" :class="{ on: activePendants.includes(p.id) }">
                <view class="switch-knob" />
              </view>
            </view>
          </view>
        </view>

        <view class="card">
          <text class="card-title block">UI组件样式</text>
          <view class="comp-list">
            <view v-for="c in componentStyles" :key="c.label" class="comp-row">
              <view class="comp-left">
                <AppIcon :name="c.icon" :size="32" color="#999" />
                <text class="comp-label">{{ c.label }}</text>
              </view>
              <view class="comp-tag">
                <text class="comp-tag-txt">{{ c.tag }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 动效配置 Tab -->
      <view v-if="activeTab === 'effects'" class="tab-content">
        <view class="card">
          <text class="card-title block">动效开关</text>
          <view class="effect-list">
            <view v-for="e in effects" :key="e.id" class="effect-row">
              <view class="effect-left">
                <view class="effect-icon" :class="{ on: effectSettings[e.type] }">
                  <AppIcon :name="e.icon" :size="36" :color="effectSettings[e.type] ? '#C41E3A' : '#999'" />
                </view>
                <view class="effect-info">
                  <text class="effect-name">{{ e.name }}</text>
                  <text class="effect-desc">{{ e.desc }}</text>
                </view>
              </view>
              <view class="switch" :class="{ on: effectSettings[e.type] }" @tap="toggleEffect(e.type)">
                <view class="switch-knob" />
              </view>
            </view>
          </view>
        </view>

        <view class="card">
          <text class="card-title block">入场特效样式</text>
          <view class="enter-grid">
            <view
              v-for="(s, idx) in enterStyles"
              :key="s.name"
              class="enter-cell"
              :class="{ active: idx === 0 }"
            >
              <view class="enter-emoji-wrap">
                <text class="enter-emoji">{{ s.emoji }}</text>
              </view>
              <text class="enter-name">{{ s.name }}</text>
            </view>
          </view>
        </view>

        <view class="card">
          <text class="card-title block">点赞动效样式</text>
          <view class="like-grid">
            <view
              v-for="(s, idx) in likeStyles"
              :key="s"
              class="like-cell"
              :class="{ active: idx === 0 }"
            >
              <text class="like-txt">{{ s }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 实时预览 -->
      <view class="card preview-card">
        <view class="preview-head">
          <text class="preview-head-txt">实时预览</text>
          <view class="preview-ctrls">
            <view class="preview-ctrl" @tap="isPreviewPlaying = !isPreviewPlaying">
              <AppIcon :name="isPreviewPlaying ? 'pause' : 'play'" :size="28" color="#666" />
            </view>
            <view class="preview-ctrl">
              <AppIcon name="rotate-ccw" :size="28" color="#666" />
            </view>
          </view>
        </view>
        <view class="preview-screen" :style="{ background: `linear-gradient(135deg, ${currentTheme.bg1}, ${currentTheme.bg2})` }">
          <!-- 顶部信息栏 -->
          <view class="pv-top">
            <view class="pv-anchor">
              <view class="pv-avatar"><text class="pv-avatar-txt">主</text></view>
              <text class="pv-anchor-name">主播昵称</text>
            </view>
            <view class="pv-viewers">
              <AppIcon name="eye" :size="24" color="rgba(255,255,255,0.7)" />
              <text class="pv-viewers-txt">1.2万</text>
            </view>
          </view>
          <!-- 挂件 -->
          <text v-if="activePendants.includes(1)" class="pv-pendant-fu">福</text>
          <text v-if="activePendants.includes(4)" class="pv-pendant-coin">🪙</text>
          <!-- 弹幕 -->
          <view class="pv-danmaku">
            <view class="pv-dm"><text class="pv-dm-txt"><text class="pv-dm-user">用户A</text> 老师讲得真好！</text></view>
            <view class="pv-dm"><text class="pv-dm-txt"><text class="pv-dm-user">用户B</text> 涨知识了</text></view>
          </view>
          <!-- 点赞 -->
          <view v-if="effectSettings.like && isPreviewPlaying" class="pv-likes">
            <AppIcon name="heart" :size="40" color="#ef4444" />
            <AppIcon name="heart" :size="32" color="#ef4444" />
            <AppIcon name="heart" :size="24" color="#ef4444" />
          </view>
          <!-- 主题色条 -->
          <view class="pv-color-bar" :style="{ backgroundColor: currentTheme.primaryColor }" />
          <!-- 底部栏 -->
          <view class="pv-bottom">
            <view class="pv-input"><text class="pv-input-txt">说点什么...</text></view>
            <view class="pv-act"><AppIcon name="heart" :size="32" color="#fff" /></view>
            <view class="pv-act"><AppIcon name="gift" :size="32" color="#fff" /></view>
          </view>
        </view>
      </view>

      <!-- 当前配置摘要 -->
      <view class="card summary-card">
        <text class="summary-title">当前配置</text>
        <view class="summary-row">
          <text class="summary-label">主题模版</text>
          <text class="summary-value">{{ currentTheme.name }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">已启用挂件</text>
          <text class="summary-value">{{ activePendants.length }}个</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">已启用动效</text>
          <text class="summary-value">{{ enabledEffectCount }}个</text>
        </view>
      </view>
    </view>

    <!-- 底部固定操作栏 -->
    <view class="footer">
      <view class="footer-btn outline" @tap="onReset">
        <text class="footer-btn-txt">重置默认</text>
      </view>
      <view class="footer-btn primary" @tap="onSave">
        <text class="footer-btn-txt primary-txt">保存并应用</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  themeTemplates as templates,
  themePendants,
  themeEffects,
  themeCustomColors,
  themeEnterStyles,
  themeLikeStyles,
  themeComponentStyles,
} from '@/lib/live-data'

const statusBarHeight = ref(0)
const tabs = [
  { key: 'templates', label: '主题模版', icon: 'palette' },
  { key: 'elements', label: '视觉元素', icon: 'image' },
  { key: 'effects', label: '动效配置', icon: 'sparkles' },
]
const themeTemplates = ref(templates)
const pendants = ref(themePendants)
const effects = ref(themeEffects)
const customColors = ref(themeCustomColors)
const enterStyles = ref(themeEnterStyles)
const likeStyles = ref(themeLikeStyles)
const componentStyles = ref(themeComponentStyles)

const activeTab = ref('templates')
const selectedTheme = ref('default')
const customColor = ref('#8B5CF6')
const isPreviewPlaying = ref(true)
const activePendants = ref<number[]>([1, 4])
const blur = ref(30)
const dark = ref(50)
const effectSettings = ref<Record<string, boolean>>({
  enter: true,
  like: true,
  gift: true,
  danmaku: false,
})

const currentTheme = computed(
  () => themeTemplates.value.find((t) => t.id === selectedTheme.value) || themeTemplates.value[0],
)
const enabledEffectCount = computed(() => Object.values(effectSettings.value).filter(Boolean).length)

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {}
})

function togglePendant(id: number) {
  const arr = activePendants.value
  activePendants.value = arr.includes(id) ? arr.filter((p) => p !== id) : [...arr, id]
}
function toggleEffect(type: string) {
  effectSettings.value[type] = !effectSettings.value[type]
}
function setSlider(key: 'blur' | 'dark', e: any) {
  // 原型为离散滑块,这里点击切换示意值
  const cur = key === 'blur' ? blur : dark
  cur.value = cur.value >= 100 ? 0 : cur.value + 10
}
function onSave() {
  uni.showToast({ title: '配置已保存', icon: 'success' })
}
function onReset() {
  selectedTheme.value = 'default'
  activePendants.value = [1, 4]
  effectSettings.value = { enter: true, like: true, gift: true, danmaku: false }
  uni.showToast({ title: '已重置', icon: 'none' })
}
function onBack() {
  goBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 160rpx;
}

/* 导航 */
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1rpx solid #E8E3DB;
}
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.save-btn {
  padding: 12rpx 28rpx;
  border-radius: 12rpx;
  background: var(--brand);
}
.save-btn-txt {
  font-size: 26rpx;
  color: #fff;
}

.body {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* Tabs */
.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8rpx;
  padding: 8rpx;
  background: rgba(232, 227, 219, 0.5);
  border-radius: 16rpx;
}
.tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 64rpx;
  border-radius: 12rpx;
}
.tab.active {
  background: var(--brand);
}
.tab-txt {
  font-size: 24rpx;
  color: #666;
}
.tab-txt.active {
  color: #fff;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 卡片 */
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  border: 1rpx solid #E8E3DB;
}
.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.card-title.block {
  display: block;
  margin-bottom: 24rpx;
}
.card-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  margin-bottom: 24rpx;
}

/* 主题网格 */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}
.theme-card {
  border-radius: 20rpx;
  overflow: hidden;
  background: #fff;
  border: 1rpx solid #E8E3DB;
}
.theme-card.selected {
  border: 4rpx solid var(--brand);
}
.theme-preview {
  position: relative;
  height: 140rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.theme-emoji {
  font-size: 56rpx;
}
.theme-check {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 999rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.theme-vip {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: #f59e0b;
}
.theme-vip-txt {
  font-size: 18rpx;
  color: #fff;
}
.theme-using {
  position: absolute;
  bottom: 12rpx;
  right: 12rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #16a34a;
}
.theme-using-txt {
  font-size: 18rpx;
  color: #fff;
}
.theme-info {
  padding: 16rpx;
}
.theme-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.theme-desc {
  display: block;
  font-size: 20rpx;
  color: #999;
  margin-top: 2rpx;
}
.theme-colors {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
}
.color-dot {
  width: 28rpx;
  height: 28rpx;
  border-radius: 999rpx;
  border: 2rpx solid #fff;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.15);
}
.theme-color-label {
  font-size: 20rpx;
  color: #999;
  margin-left: 4rpx;
}

/* 自定义主题 */
.vip-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 14rpx;
  border: 1rpx solid #E8E3DB;
  border-radius: 8rpx;
}
.vip-tag-txt {
  font-size: 20rpx;
  color: #d97706;
}
.field-block {
  margin-bottom: 32rpx;
}
.field-block.last {
  margin-bottom: 0;
}
.field-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
}
.logo-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.logo-upload {
  width: 120rpx;
  height: 120rpx;
  border-radius: 20rpx;
  border: 2rpx dashed #E8E3DB;
  background: rgba(232, 227, 219, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-tip-txt {
  display: block;
  font-size: 22rpx;
  color: #999;
}
.color-pick-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.color-pick {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  border: 4rpx solid transparent;
}
.color-pick.active {
  border-color: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
}
.color-pick-add {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  border: 2rpx dashed #E8E3DB;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bg-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}
.bg-cell {
  aspect-ratio: 16 / 9;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}
.bg-cell.dashed {
  border: 2rpx dashed #E8E3DB;
  background: rgba(232, 227, 219, 0.3);
}
.bg-cell.green {
  background: linear-gradient(135deg, #10b981, #047857);
}
.bg-cell-txt {
  font-size: 20rpx;
  color: #999;
}
.bg-cell-green-txt {
  font-size: 20rpx;
  font-weight: 500;
  color: #fff;
}

/* 滑块 */
.slider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.slider-row:last-child {
  margin-bottom: 0;
}
.slider-label {
  font-size: 26rpx;
  color: #2C2C2C;
}
.slider-track {
  position: relative;
  width: 240rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #E8E3DB;
}
.slider-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 8rpx;
  border-radius: 999rpx;
  background: var(--brand);
}
.slider-thumb {
  position: absolute;
  top: 50%;
  width: 28rpx;
  height: 28rpx;
  border-radius: 999rpx;
  background: #fff;
  border: 2rpx solid var(--brand);
  transform: translate(-50%, -50%);
}

/* 挂件 */
.pendant-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.pendant {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  border: 1rpx solid #E8E3DB;
}
.pendant.active {
  border-color: var(--brand);
  background: rgba(196, 30, 58, 0.05);
}
.pendant-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(232, 227, 219, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pendant-icon-txt {
  font-size: 32rpx;
}
.pendant-info {
  flex: 1;
  min-width: 0;
}
.pendant-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.pendant-pos {
  display: block;
  font-size: 20rpx;
  color: #999;
}
.ghost-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
}
.ghost-btn-txt {
  font-size: 24rpx;
  color: #666;
}

/* 开关 */
.switch {
  flex-shrink: 0;
  width: 72rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: #d1cdc4;
  position: relative;
  transition: background 0.2s;
}
.switch.on {
  background: var(--brand);
}
.switch-knob {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 999rpx;
  background: #fff;
  transition: left 0.2s;
}
.switch.on .switch-knob {
  left: 36rpx;
}

/* UI 组件样式 */
.comp-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.comp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx;
  border-radius: 16rpx;
  background: rgba(232, 227, 219, 0.3);
}
.comp-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.comp-label {
  font-size: 26rpx;
  color: #2C2C2C;
}
.comp-tag {
  padding: 4rpx 14rpx;
  border: 1rpx solid #E8E3DB;
  border-radius: 8rpx;
}
.comp-tag-txt {
  font-size: 20rpx;
  color: #666;
}

/* 动效 */
.effect-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.effect-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  border-radius: 16rpx;
  border: 1rpx solid #E8E3DB;
}
.effect-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.effect-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(232, 227, 219, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.effect-icon.on {
  background: rgba(196, 30, 58, 0.1);
}
.effect-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.effect-desc {
  display: block;
  font-size: 20rpx;
  color: #999;
}
.enter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}
.enter-cell {
  padding: 20rpx;
  border-radius: 16rpx;
  border: 1rpx solid #E8E3DB;
  text-align: center;
}
.enter-cell.active {
  border-color: var(--brand);
  background: rgba(196, 30, 58, 0.05);
}
.enter-emoji-wrap {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background: rgba(232, 227, 219, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12rpx;
}
.enter-emoji {
  font-size: 28rpx;
}
.enter-name {
  font-size: 20rpx;
  color: #2C2C2C;
}
.like-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.like-cell {
  padding: 16rpx 8rpx;
  border-radius: 16rpx;
  border: 1rpx solid #E8E3DB;
  text-align: center;
}
.like-cell.active {
  border-color: var(--brand);
  background: rgba(196, 30, 58, 0.05);
}
.like-txt {
  font-size: 22rpx;
  color: #2C2C2C;
}

/* 预览卡 */
.preview-card {
  padding: 0;
  overflow: hidden;
}
.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #E8E3DB;
  background: rgba(232, 227, 219, 0.3);
}
.preview-head-txt {
  font-size: 24rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.preview-ctrls {
  display: flex;
  gap: 8rpx;
}
.preview-ctrl {
  width: 48rpx;
  height: 48rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-screen {
  position: relative;
  aspect-ratio: 9 / 16;
  overflow: hidden;
}
.pv-top {
  position: absolute;
  top: 24rpx;
  left: 24rpx;
  right: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pv-anchor {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 16rpx;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 999rpx;
}
.pv-avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pv-avatar-txt {
  font-size: 18rpx;
  color: #fff;
}
.pv-anchor-name {
  font-size: 18rpx;
  color: #fff;
}
.pv-viewers {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 999rpx;
}
.pv-viewers-txt {
  font-size: 18rpx;
  color: #fff;
}
.pv-pendant-fu {
  position: absolute;
  top: 96rpx;
  left: 24rpx;
  font-size: 40rpx;
  color: #fff;
  opacity: 0.8;
}
.pv-pendant-coin {
  position: absolute;
  top: 96rpx;
  right: 24rpx;
  font-size: 32rpx;
  opacity: 0.8;
}
.pv-danmaku {
  position: absolute;
  left: 24rpx;
  bottom: 220rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  max-width: 70%;
}
.pv-dm {
  padding: 8rpx 16rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 999rpx;
}
.pv-dm-txt {
  font-size: 18rpx;
  color: #fff;
}
.pv-dm-user {
  color: #fbbf24;
  margin-right: 6rpx;
}
.pv-likes {
  position: absolute;
  right: 40rpx;
  bottom: 280rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  animation: floatUp 2s ease-in-out infinite;
}
@keyframes floatUp {
  0% { transform: translateY(0); opacity: 0.8; }
  50% { opacity: 0.4; }
  100% { transform: translateY(-40rpx); opacity: 0; }
}
.pv-color-bar {
  position: absolute;
  bottom: 120rpx;
  left: 24rpx;
  right: 24rpx;
  height: 6rpx;
  border-radius: 999rpx;
  opacity: 0.5;
}
.pv-bottom {
  position: absolute;
  bottom: 24rpx;
  left: 24rpx;
  right: 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.pv-input {
  flex: 1;
  height: 56rpx;
  padding: 0 24rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
}
.pv-input-txt {
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.5);
}
.pv-act {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 配置摘要 */
.summary-card {
  padding: 24rpx;
}
.summary-title {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: #2C2C2C;
  margin-bottom: 16rpx;
}
.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.summary-row:last-child {
  margin-bottom: 0;
}
.summary-label {
  font-size: 22rpx;
  color: #999;
}
.summary-value {
  font-size: 22rpx;
  font-weight: 500;
  color: #2C2C2C;
}

/* 底部固定栏 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #E8E3DB;
}
.footer-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.footer-btn.outline {
  border: 1rpx solid #E8E3DB;
  background: #fff;
}
.footer-btn.primary {
  background: var(--brand);
}
.footer-btn-txt {
  font-size: 28rpx;
  color: #2C2C2C;
}
.primary-txt {
  color: #fff;
}
</style>
