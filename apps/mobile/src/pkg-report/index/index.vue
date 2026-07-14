<template>
  <view class="rp-page">
    <!-- 顶部导航 -->
    <view class="rp-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="rp-header-row">
        <view class="rp-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#2c2c2c" />
        </view>
        <text class="rp-header-title">举报</text>
        <view class="rp-header-spacer" />
      </view>
    </view>

    <view class="rp-body">
      <!-- 举报对象摘要 -->
      <view class="rp-section">
        <text class="rp-section-label">举报对象</text>
        <view class="rp-target-card">
          <!-- 用户 -->
          <view v-if="target.type === 'user'" class="rp-target-user">
            <view class="rp-avatar rp-avatar-lg">
              <app-icon name="user" :size="36" color="#C41E3A" />
            </view>
            <view class="rp-target-main">
              <view class="rp-target-name-row">
                <text class="rp-target-name">{{ target.name }}</text>
                <text class="rp-badge-outline">用户</text>
              </view>
              <text class="rp-target-desc">{{ target.description }}</text>
            </view>
          </view>
          <!-- 评论 -->
          <view v-else-if="target.type === 'comment'" class="rp-target-row">
            <view class="rp-target-thumb">
              <app-icon name="message-square" :size="36" color="#999999" />
            </view>
            <view class="rp-target-main">
              <view class="rp-target-meta">
                <text class="rp-target-author">{{ target.author }}</text>
                <text class="rp-target-time">{{ target.time }}</text>
              </view>
              <text class="rp-target-content">{{ target.content }}</text>
            </view>
          </view>
          <!-- 帖子 -->
          <view v-else class="rp-target-row">
            <view class="rp-target-thumb">
              <app-icon name="file-text" :size="36" color="#999999" />
            </view>
            <view class="rp-target-main">
              <view class="rp-target-meta">
                <view class="rp-avatar rp-avatar-xs">
                  <text class="rp-avatar-letter">{{ (target.author || '某')[0] }}</text>
                </view>
                <text class="rp-target-author">{{ target.author }}</text>
                <text class="rp-target-time">{{ target.time }}</text>
              </view>
              <text class="rp-target-content">{{ target.content }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 举报类型 -->
      <view class="rp-section">
        <text class="rp-section-label">举报类型 <text class="rp-required">*</text></text>
        <view class="rp-type-list">
          <view
            v-for="type in reportTypes"
            :key="type.id"
            class="rp-type-item"
            :class="{ 'rp-type-item-active': selectedType === type.id }"
            @tap="selectedType = type.id"
          >
            <view class="rp-type-text">
              <text class="rp-type-label">{{ type.label }}</text>
              <text class="rp-type-desc">{{ type.description }}</text>
            </view>
            <view class="rp-radio" :class="{ 'rp-radio-active': selectedType === type.id }">
              <view v-if="selectedType === type.id" class="rp-radio-dot" />
            </view>
          </view>
        </view>
      </view>

      <!-- 详细说明 -->
      <view class="rp-section">
        <text class="rp-section-label">详细说明 <text v-if="selectedType === 'other'" class="rp-required">*</text></text>
        <textarea
          v-model="reason"
          class="rp-textarea"
          placeholder="请详细描述举报理由，便于我们快速处理"
          placeholder-class="rp-placeholder"
          :maxlength="500"
        />
        <text class="rp-counter">{{ reason.length }}/500</text>
      </view>

      <!-- 上传截图 -->
      <view class="rp-section">
        <text class="rp-section-label">上传截图 <text class="rp-section-hint">(可选，最多4张)</text></text>
        <view class="rp-image-grid">
          <view v-for="(img, index) in images" :key="index" class="rp-image-item">
            <image lazy-load :src="img" class="rp-image" mode="aspectFill" />
            <view class="rp-image-remove" @tap="removeImage(index)">
              <app-icon name="x" :size="24" color="#ffffff" />
            </view>
          </view>
          <view v-if="images.length < 4" class="rp-image-add" @tap="addImage">
            <app-icon name="image-plus" :size="40" color="#999999" />
            <text class="rp-image-add-text">添加图片</text>
          </view>
        </view>
        <text class="rp-image-tip">支持 JPG、PNG 格式，建议上传清晰的违规截图</text>
      </view>

      <!-- 温馨提示 -->
      <view class="rp-notice">
        <text class="rp-notice-text"><text class="rp-notice-strong">温馨提示：</text>请如实填写举报信息，恶意举报将影响你的信誉分。我们将在24小时内处理你的举报，处理结果会通过站内信通知。</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="rp-footer">
      <view
        class="rp-submit"
        :class="{ 'rp-submit-disabled': !canSubmit || isSubmitting }"
        @tap="handleSubmit"
      >
        <view v-if="isSubmitting" class="rp-spinner" />
        <text class="rp-submit-text">{{ isSubmitting ? '提交中...' : '提交举报' }}</text>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="showSuccess" class="rp-mask">
      <view class="rp-success-card">
        <view class="rp-success-icon">
          <app-icon name="check-circle" :size="64" color="#22C55E" />
        </view>
        <text class="rp-success-title">举报已提交</text>
        <text class="rp-success-desc">感谢你的举报，我们将在24小时内核实处理。如有需要，我们会通过站内信与你联系。</text>
        <view class="rp-success-btn" @tap="goHome">
          <text class="rp-success-btn-text">返回首页</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 举报页 —— 2026-07-14 真连改造
 *
 * 改造前：整页是假的 —— 举报对象是写死的「某用户/这里是被举报内容的摘要片段…」，
 *   提交是 `setTimeout(800)` 后弹成功，**一个请求都不发**；而且全项目没有任何页面能跳进来。
 *   后端举报端点（提交/列表/处理/统计）和 admin 举报处理台**早就做完了**，
 *   结果运营的举报池永远是空的 —— 用户举报不了，平台也看不见违规内容（合规风险）。
 *
 * 现在：从调用方接 targetType/targetId（+ 可选摘要），真提交 POST /audit/reports。
 * 后端 reason 是单个字符串字段、不收图片 —— 所以证据图先传 COS，链接附在 reason 末尾，
 * 保证运营在后台点得开（不做"传了但丢掉"的假动作）。
 */
import { ref, computed, onMounted } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { reportApi, REPORT_TARGET_LABEL, type ReportTargetType } from '@/lib/report-data'
import { uploadImage } from '@/utils/request'

const statusBarHeight = ref(0)
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch (e) {
  statusBarHeight.value = 0
}

// 举报类型
const reportTypes = [
  { id: 'inappropriate', label: '违规内容', description: '违反平台规定或法律法规的内容' },
  { id: 'pornography', label: '色情低俗', description: '包含色情、低俗或不雅内容' },
  { id: 'spam', label: '垃圾广告', description: '发布垃圾信息或恶意推广广告' },
  { id: 'inducement', label: '诱导分享', description: '诱导用户分享、关注或点击' },
  { id: 'copyright', label: '侵权内容', description: '侵犯他人知识产权或原创内容' },
  { id: 'harassment', label: '骚扰辱骂', description: '对他人进行骚扰、辱骂或人身攻击' },
  { id: 'fraud', label: '欺诈行为', description: '存在欺诈、诈骗或虚假宣传' },
  { id: 'other', label: '其他问题', description: '其他需要举报的违规行为' },
]

// 被举报对象信息（按 type 区分，字段按需可选）
interface ReportTarget {
  type: string
  content?: string
  author?: string
  time?: string
  name?: string
  description?: string
}

/** 举报对象：由调用方通过 url 参数传入（targetType/targetId + 可选摘要），不再是写死的假数据 */
const targetType = ref<ReportTargetType>('POST')
const targetId = ref('')
const targetTitle = ref('')
const targetAuthor = ref('')

/** 模板里按 type 分支渲染：用户走 user 分支、评论走 comment 分支、其余按内容卡渲染 */
const target = computed<ReportTarget>(() => {
  const t = targetType.value
  const label = REPORT_TARGET_LABEL[t] || '内容'
  if (t === 'USER') {
    return { type: 'user', name: targetTitle.value || '该用户', description: `举报该${label}` }
  }
  if (t === 'COMMENT') {
    return { type: 'comment', content: targetTitle.value || `（${label}）`, author: targetAuthor.value || '', time: '' }
  }
  return { type: 'post', content: targetTitle.value || `（${label}）`, author: targetAuthor.value || '', time: '' }
})

onMounted(() => {
  // uni 的 onLoad 参数在 setup 里通过当前页面栈取，H5/小程序都可用
  const pages = getCurrentPages()
  const opts = (pages[pages.length - 1] as unknown as { options?: Record<string, string> })?.options || {}
  const t = String(opts.targetType || '').toUpperCase()
  if (t) targetType.value = t as ReportTargetType
  targetId.value = String(opts.targetId || '')
  targetTitle.value = decodeURIComponent(String(opts.title || ''))
  targetAuthor.value = decodeURIComponent(String(opts.author || ''))
})

const selectedType = ref<string | null>(null)
const reason = ref('')
const images = ref<string[]>([])
const isSubmitting = ref(false)
const showSuccess = ref(false)

const canSubmit = computed(() => {
  return !!selectedType.value && (selectedType.value !== 'other' || reason.value.trim().length > 0)
})

function addImage() {
  uni.chooseImage({
    count: 4 - images.value.length,
    success: (res: any) => {
      const paths = res.tempFilePaths || []
      images.value = [...images.value, ...paths].slice(0, 4)
    },
  })
}

function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

async function handleSubmit() {
  if (!canSubmit.value || isSubmitting.value) {
    if (!selectedType.value) uni.showToast({ title: '请选择举报类型', icon: 'none' })
    return
  }
  if (!targetId.value) {
    uni.showToast({ title: '举报对象缺失，请从内容页进入', icon: 'none' })
    return
  }
  isSubmitting.value = true
  try {
    // 证据图先传 COS（后端 reason 只有一个文本字段，不收图片数组）
    let evidence = ''
    if (images.value.length) {
      uni.showLoading({ title: '上传凭证…', mask: true })
      const urls: string[] = []
      for (const p of images.value) {
        try {
          urls.push(await uploadImage(p))
        } catch {
          // 单张失败不阻断举报本身
        }
      }
      uni.hideLoading()
      if (urls.length) evidence = `\n[凭证] ${urls.join(' ')}`
    }

    const typeLabel = reportTypes.find((r) => r.id === selectedType.value)?.label || selectedType.value
    const detail = reason.value.trim()
    const reasonText = `【${typeLabel}】${detail ? detail : ''}${evidence}`.trim()

    await reportApi.submit({
      targetType: targetType.value,
      targetId: targetId.value,
      reason: reasonText,
    })
    showSuccess.value = true
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: (e as Error)?.message || '提交失败，请稍后重试', icon: 'none' })
  } finally {
    isSubmitting.value = false
  }
}

function goHome() {
  navigateTo('/')
}

function goBack() {
  navigateBack()
}
</script>

<style scoped>
.rp-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 160rpx;
}

/* Header */
.rp-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 2rpx solid #ececec;
}
.rp-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.rp-icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rp-header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.rp-header-spacer {
  width: 64rpx;
}

.rp-body {
  padding: 24rpx;
}

.rp-section {
  margin-bottom: 40rpx;
}
.rp-section-label {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #888;
  margin-bottom: 20rpx;
}
.rp-section-hint {
  font-size: 22rpx;
  color: #aaa;
  font-weight: 400;
}
.rp-required {
  color: var(--brand);
}

/* 举报对象 */
.rp-target-card {
  background: rgba(245, 240, 232, 0.5);
  border-radius: 16rpx;
  padding: 28rpx;
}
.rp-target-user {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.rp-target-row {
  display: flex;
  gap: 24rpx;
}
.rp-avatar {
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rp-avatar-lg {
  width: 88rpx;
  height: 88rpx;
}
.rp-avatar-xs {
  width: 36rpx;
  height: 36rpx;
}
.rp-avatar-letter {
  font-size: 20rpx;
  color: var(--brand);
}
.rp-target-thumb {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rp-target-main {
  flex: 1;
  min-width: 0;
}
.rp-target-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.rp-target-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rp-badge-outline {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  color: #888;
}
.rp-target-desc {
  display: block;
  font-size: 24rpx;
  color: #888;
  margin-top: 4rpx;
}
.rp-target-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.rp-target-author {
  font-size: 24rpx;
  color: #888;
}
.rp-target-time {
  font-size: 24rpx;
  color: #aaa;
}
.rp-target-content {
  font-size: 28rpx;
  color: #666;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 举报类型 */
.rp-type-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.rp-type-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  border-radius: 20rpx;
  border: 2rpx solid #ececec;
  background: #fff;
}
.rp-type-item-active {
  border-color: var(--brand);
  background: rgba(196, 30, 58, 0.05);
}
.rp-type-text {
  flex: 1;
}
.rp-type-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rp-type-desc {
  display: block;
  font-size: 24rpx;
  color: #888;
  margin-top: 4rpx;
}
.rp-radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(136, 136, 136, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rp-radio-active {
  border-color: var(--brand);
  background: var(--brand);
}
.rp-radio-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #fff;
}

/* 详细说明 */
.rp-textarea {
  width: 100%;
  height: 240rpx;
  padding: 28rpx;
  border-radius: 20rpx;
  border: 2rpx solid #ececec;
  background: #fff;
  font-size: 28rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.rp-placeholder {
  color: #aaa;
}
.rp-counter {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #aaa;
  margin-top: 8rpx;
}

/* 上传截图 */
.rp-image-grid {
  display: flex;
  gap: 24rpx;
  flex-wrap: wrap;
}
.rp-image-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}
.rp-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
}
.rp-image-remove {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #EF4444;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rp-image-add {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  border: 4rpx dashed #ddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.rp-image-add-text {
  font-size: 20rpx;
  color: #999;
}
.rp-image-tip {
  display: block;
  font-size: 22rpx;
  color: #aaa;
  margin-top: 16rpx;
}

/* 温馨提示 */
.rp-notice {
  padding: 28rpx;
  border-radius: 20rpx;
  background: rgba(201, 169, 110, 0.08);
  border: 2rpx solid rgba(201, 169, 110, 0.2);
}
.rp-notice-text {
  font-size: 24rpx;
  color: #888;
  line-height: 1.6;
}
.rp-notice-strong {
  color: #C9A96E;
  font-weight: 500;
}

/* 底部操作栏 */
.rp-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  border-top: 2rpx solid #ececec;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.rp-submit {
  width: 100%;
  height: 96rpx;
  border-radius: 20rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.rp-submit-disabled {
  background: #ccc;
}
.rp-submit-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
.rp-spinner {
  width: 32rpx;
  height: 32rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: rp-spin 0.8s linear infinite;
}
@keyframes rp-spin {
  to { transform: rotate(360deg); }
}

/* 成功弹窗 */
.rp-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.rp-success-card {
  width: 100%;
  max-width: 560rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 64rpx 48rpx;
  text-align: center;
}
.rp-success-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 32rpx;
}
.rp-success-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.rp-success-desc {
  display: block;
  font-size: 26rpx;
  color: #888;
  line-height: 1.6;
  margin-bottom: 48rpx;
}
.rp-success-btn {
  width: 100%;
  height: 88rpx;
  background: var(--brand);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rp-success-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
</style>
