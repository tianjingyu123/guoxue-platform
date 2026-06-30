<template>
  <!-- 加载骨架屏 -->
  <view v-if="loading" class="skeleton-page">
    <view class="skeleton-nav" />
    <view class="skeleton-card" />
    <view class="skeleton-card" />
    <view class="skeleton-card skeleton-card-sm" />
  </view>
  <!-- 错误状态 -->
  <view v-else-if="error" class="error-state">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="fetchData">重试</view>
  </view>
  <!-- 正常内容 -->
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-btn" @tap="goBack">
        <AppIcon name="chevron-left" :size="48" color="#2C2C2C" />
      </view>
      <text class="nav-title">创建直播</text>
      <text class="nav-draft">存草稿</text>
    </view>

    <view class="body">
      <!-- 直播模式选择 -->
      <view class="card">
        <text class="label">直播模式 <text class="req">*</text></text>
        <view class="mode-grid">
          <view class="mode-card" :class="{ 'mode-active': liveMode === 'vertical' }" @tap="liveMode = 'vertical'">
            <view class="mode-badge">推荐</view>
            <view class="mode-icon" :class="{ 'mode-icon-active': liveMode === 'vertical' }">
              <AppIcon name="smartphone" :size="40" :color="liveMode === 'vertical' ? '#fff' : '#666'" />
            </view>
            <text class="mode-name" :class="{ 'mode-name-active': liveMode === 'vertical' }">手机竖屏</text>
            <text class="mode-desc">适合带货、聊天互动</text>
          </view>
          <view class="mode-card" :class="{ 'mode-active': liveMode === 'horizontal' }" @tap="liveMode = 'horizontal'">
            <view class="mode-icon" :class="{ 'mode-icon-active': liveMode === 'horizontal' }">
              <AppIcon name="monitor" :size="40" :color="liveMode === 'horizontal' ? '#fff' : '#666'" />
            </view>
            <text class="mode-name" :class="{ 'mode-name-active': liveMode === 'horizontal' }">OBS横屏</text>
            <text class="mode-desc">适合课程、课件讲解</text>
          </view>
        </view>
        <!-- OBS提示 -->
        <view v-if="liveMode === 'horizontal'" class="obs-tip">
          <AppIcon name="settings" :size="32" color="#d97706" />
          <view class="obs-tip-body">
            <text class="obs-tip-title">OBS推流设置</text>
            <text class="obs-tip-desc">横屏直播需要使用OBS等推流软件，开播后将显示推流地址。</text>
            <text class="obs-tip-link">查看OBS配置教程</text>
          </view>
        </view>
      </view>

      <!-- 封面上传 -->
      <view class="card">
        <text class="label">直播封面 <text class="req">*</text></text>
        <view class="cover-upload">
          <AppIcon name="camera" :size="80" color="#999999" />
          <text class="cover-tip">点击上传封面</text>
          <text class="cover-hint">建议尺寸 16:9，支持 JPG/PNG</text>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="card card-gap">
        <!-- 标题 -->
        <view class="field">
          <text class="label">直播标题 <text class="req">*</text></text>
          <input v-model="title" class="input" placeholder="请输入直播标题，最多30字" placeholder-class="ph" maxlength="30" />
          <view class="field-foot">
            <text class="char-count">{{ title.length }}/30</text>
          </view>
        </view>
        <!-- 开播时间 -->
        <view class="field">
          <text class="label">开播时间 <text class="req">*</text></text>
          <view class="picker-btn" @tap="showDatePicker = true">
            <view class="picker-left">
              <AppIcon name="calendar" :size="40" color="#999999" />
              <text class="picker-ph">请选择开播时间</text>
            </view>
            <AppIcon name="chevron-right" :size="40" color="#999999" />
          </view>
        </view>
        <!-- 直播类型 -->
        <view class="field">
          <text class="label">直播类型</text>
          <view class="type-grid">
            <view
              v-for="item in typeOptions"
              :key="item.value"
              class="type-card"
              :class="{ 'type-active': liveType === item.value }"
              @tap="liveType = item.value"
            >
              <text class="type-name" :class="{ 'type-name-active': liveType === item.value }">{{ item.label }}</text>
              <text class="type-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>
        <!-- 分类 -->
        <view class="field">
          <text class="label">直播分类 <text class="req">*</text></text>
          <view class="picker-btn" @tap="showCategoryPicker = true">
            <text class="picker-ph">{{ selectedCategoryName || '请选择分类' }}</text>
            <AppIcon name="chevron-right" :size="40" color="#999999" />
          </view>
        </view>
      </view>

      <!-- 更多设置 -->
      <view class="card card-gap">
        <!-- 描述 -->
        <view class="field">
          <text class="label">直播简介</text>
          <textarea v-model="description" class="textarea" placeholder="介绍一下本场直播的内容..." placeholder-class="ph" maxlength="200" />
          <view class="field-foot">
            <text class="char-count">{{ description.length }}/200</text>
          </view>
        </view>
        <!-- 标签 -->
        <view class="field">
          <text class="label">直播标签 <text class="label-note">（最多5个）</text></text>
          <view class="tag-input-row">
            <input v-model="tagInput" class="tag-input" placeholder="输入标签后回车添加" placeholder-class="ph" maxlength="10" @confirm="addTag" />
            <view class="tag-add-btn" @tap="addTag">添加</view>
          </view>
        </view>
        <!-- 公开设置 -->
        <view class="switch-row">
          <view class="switch-info">
            <text class="switch-title">公开直播</text>
            <text class="switch-desc">关闭后仅粉丝可见</text>
          </view>
          <view class="switch" :class="{ 'switch-on': isPublic }" @tap="isPublic = !isPublic">
            <view class="switch-dot" :class="{ 'switch-dot-on': isPublic }" />
          </view>
        </view>
      </view>

      <!-- 提示 -->
      <view class="info-tip">
        <AppIcon name="info" :size="32" color="#C9A96E" />
        <text class="info-tip-txt">直播开始前15分钟将推送通知给已预约的用户，请确保按时开播</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="footer">
      <view class="submit-btn" @tap="onCreate">{{ submitting ? '创建中...' : '创建直播' }}</view>
    </view>

    <!-- 分类选择器 -->
    <view v-if="showCategoryPicker" class="sheet-mask" @tap="showCategoryPicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-cancel" @tap="showCategoryPicker = false">取消</text>
          <text class="sheet-title">选择分类</text>
          <view class="sheet-placeholder" />
        </view>
        <view class="cat-grid">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-item"
            :class="{ 'cat-item-active': categoryId === cat.id }"
            @tap="selectCategory(cat.id)"
          >
            {{ cat.name }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { liveApi, type LiveCategory } from '@/lib/live-data'

// 三态UI
const loading = ref(true)
const error = ref('')

// UI 临时状态
const liveMode = ref<'vertical' | 'horizontal'>('vertical')
const liveType = ref<'knowledge' | 'ecommerce'>('knowledge')
const title = ref('')
const description = ref('')
const tagInput = ref('')
const isPublic = ref(true)
const categoryId = ref('')
const showCategoryPicker = ref(false)
const showDatePicker = ref(false)
const categories = ref<LiveCategory[]>([])

const typeOptions = [
  { value: 'knowledge' as const, label: '知识授课', desc: '适合课程讲解' },
  { value: 'ecommerce' as const, label: '电商带货', desc: '适合商品销售' },
]

const selectedCategoryName = computed(() => categories.value.find((c) => c.id === categoryId.value)?.name || '')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    categories.value = await liveApi.getCategories()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchData() })

function selectCategory(id: string) {
  categoryId.value = id
  showCategoryPicker.value = false
}
function addTag() {}

// 创建直播（写操作，防重复）。description/tags/liveType/liveMode 后端 LiveRoom 暂无对应字段，仅提交核心字段
const submitting = ref(false)
async function onCreate() {
  if (submitting.value) return
  if (!title.value.trim()) {
    uni.showToast({ title: '请输入直播标题', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await liveApi.createRoom({ title: title.value.trim(), chargeType: 'FREE' })
    uni.showToast({ title: '创建成功', icon: 'success' })
    setTimeout(() => goBack(), 800)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '创建失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* 骨架屏 */
.skeleton-page {
  min-height: 100vh;
  background: #FAF8F5;
  padding: 32rpx;
}
.skeleton-nav {
  height: 96rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}
.skeleton-card {
  height: 320rpx;
  background: #fff;
  border-radius: 32rpx;
  margin-bottom: 32rpx;
}
.skeleton-card-sm {
  height: 200rpx;
}

/* 错误状态 */
.error-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #FAF8F5;
  padding: 48rpx;
}
.error-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 32rpx;
}
.retry-btn {
  padding: 20rpx 64rpx;
  background: var(--brand);
  color: #fff;
  border-radius: 24rpx;
  font-size: 28rpx;
}

.page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 192rpx;
}

/* 导航 */
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 1rpx solid #E8E3DB;
  height: 96rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-btn {
  margin-left: -8rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.nav-draft {
  font-size: 26rpx;
  color: #666666;
}

.body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* 卡片 */
.card {
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
}
.card-gap {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  margin-bottom: 24rpx;
}
.label-note {
  font-size: 24rpx;
  color: #999999;
  font-weight: 400;
}
.req {
  color: var(--brand);
}

/* 直播模式 */
.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.mode-card {
  position: relative;
  padding: 32rpx;
  border-radius: 24rpx;
  border: 4rpx solid #E8E3DB;
  background: #FAF8F5;
}
.mode-active {
  border-color: var(--brand);
  background: #fef2f2;
}
.mode-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: var(--brand);
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.mode-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: #E8E3DB;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.mode-icon-active {
  background: var(--brand);
}
.mode-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.mode-name-active {
  color: var(--brand);
}
.mode-desc {
  display: block;
  font-size: 20rpx;
  color: #999;
  margin-top: 8rpx;
}
.obs-tip {
  margin-top: 24rpx;
  padding: 24rpx;
  background: #fffbeb;
  border: 1rpx solid #fde68a;
  border-radius: 24rpx;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.obs-tip-body {
  flex: 1;
}
.obs-tip-title {
  display: block;
  font-size: 24rpx;
  color: #92400e;
  font-weight: 500;
}
.obs-tip-desc {
  display: block;
  font-size: 20rpx;
  color: #b45309;
  margin-top: 8rpx;
}
.obs-tip-link {
  display: inline-block;
  font-size: 20rpx;
  color: #92400e;
  text-decoration: underline;
  margin-top: 8rpx;
}

/* 封面上传 */
.cover-upload {
  aspect-ratio: 16 / 9;
  border-radius: 24rpx;
  border: 4rpx dashed #E8E3DB;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.cover-tip {
  font-size: 28rpx;
  color: #999999;
}
.cover-hint {
  font-size: 24rpx;
  color: #999999;
}

/* 字段 */
.field {
  display: flex;
  flex-direction: column;
}
.field .label {
  margin-bottom: 16rpx;
}
.input {
  width: 100%;
  box-sizing: border-box;
  padding: 24rpx 32rpx;
  border-radius: 24rpx;
  border: 1rpx solid #E8E3DB;
  background: #FAF8F5;
  font-size: 28rpx;
  color: #2C2C2C;
}
.ph {
  color: #999999;
}
.field-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 8rpx;
}
.char-count {
  font-size: 24rpx;
  color: #999999;
}
.picker-btn {
  width: 100%;
  box-sizing: border-box;
  padding: 24rpx 32rpx;
  border-radius: 24rpx;
  border: 1rpx solid #E8E3DB;
  background: #FAF8F5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.picker-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.picker-ph {
  font-size: 28rpx;
  color: #999999;
}

/* 类型 */
.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.type-card {
  padding: 32rpx;
  border-radius: 24rpx;
  border: 4rpx solid #E8E3DB;
  background: #FAF8F5;
}
.type-active {
  border-color: var(--brand);
  background: #fef2f2;
}
.type-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.type-name-active {
  color: var(--brand);
}
.type-desc {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 标签 */
.tag-input-row {
  display: flex;
  gap: 16rpx;
}
.tag-input {
  flex: 1;
  box-sizing: border-box;
  padding: 16rpx 32rpx;
  border-radius: 24rpx;
  border: 1rpx solid #E8E3DB;
  background: #FAF8F5;
  font-size: 28rpx;
  color: #2C2C2C;
}
.tag-add-btn {
  padding: 16rpx 32rpx;
  background: var(--brand);
  color: #fff;
  border-radius: 24rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
}

/* 开关 */
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}
.switch-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.switch-desc {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
}
.switch {
  width: 96rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background: #d1d5db;
  position: relative;
  flex-shrink: 0;
}
.switch-on {
  background: var(--brand);
}
.switch-dot {
  position: absolute;
  top: 6rpx;
  left: 8rpx;
  width: 40rpx;
  height: 40rpx;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}
.switch-dot-on {
  transform: translateX(40rpx);
}

/* 提示 */
.info-tip {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 0 16rpx;
}
.info-tip-txt {
  flex: 1;
  font-size: 24rpx;
  color: #999999;
  line-height: 1.5;
}

/* 底部按钮 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #E8E3DB;
  padding: 32rpx;
}
.submit-btn {
  width: 100%;
  box-sizing: border-box;
  padding: 28rpx 0;
  background: linear-gradient(to right, var(--brand), #E85D75);
  color: #fff;
  border-radius: 24rpx;
  font-size: 30rpx;
  font-weight: 500;
  text-align: center;
}

/* 弹层 */
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 48rpx 48rpx 0 0;
  max-height: 60vh;
  overflow: hidden;
}
.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #E8E3DB;
}
.sheet-cancel {
  font-size: 28rpx;
  color: #666666;
}
.sheet-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.sheet-placeholder {
  width: 64rpx;
}
.cat-grid {
  padding: 32rpx;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24rpx;
}
.cat-item {
  padding: 24rpx;
  border-radius: 24rpx;
  border: 4rpx solid #E8E3DB;
  background: #FAF8F5;
  color: #2C2C2C;
  text-align: center;
  font-size: 26rpx;
}
.cat-item-active {
  border-color: var(--brand);
  background: #fef2f2;
  color: var(--brand);
}
</style>
