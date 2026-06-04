<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="header-title">举报</text>
        <view style="width:60rpx" />
      </view>
    </view>

    <scroll-view scroll-y class="content-scroll">
      <!-- 举报对象摘要 -->
      <view class="section">
        <text class="section-label">举报对象</text>
        <view class="target-card">
          <view class="tc-icon"><text>{{ targetType === 'user' ? '👤' : targetType === 'comment' ? '💬' : '📄' }}</text></view>
          <view class="tc-info">
            <text class="tc-name">{{ targetTitle || '目标内容' }}</text>
            <text class="tc-type">{{ targetType === 'user' ? '用户' : targetType === 'comment' ? '评论' : '内容' }}</text>
          </view>
        </view>
      </view>

      <!-- 举报类型 -->
      <view class="section">
        <text class="section-label">举报类型 <text class="required">*</text></text>
        <view class="report-types">
          <view v-for="r in reportTypes" :key="r.id" class="rt-item" :class="{ selected: selectedType === r.id }" @click="selectedType = r.id">
            <view class="rt-info">
              <text class="rt-label">{{ r.label }}</text>
              <text class="rt-desc">{{ r.description }}</text>
            </view>
            <view class="rt-radio" :class="{ checked: selectedType === r.id }">
              <view v-if="selectedType === r.id" class="rt-dot" />
            </view>
          </view>
        </view>
      </view>

      <!-- 详细说明 -->
      <view class="section">
        <text class="section-label">详细说明 <text v-if="selectedType === 'other'" class="required">*</text></text>
        <textarea v-model="reason" class="reason-textarea" placeholder="请详细描述举报理由，便于我们快速处理" maxlength="500" />
        <text class="char-count">{{ reason.length }}/500</text>
      </view>

      <!-- 上传截图 -->
      <view class="section">
        <text class="section-label">上传截图 <text class="optional">(可选，最多4张)</text></text>
        <view class="image-grid">
          <view v-for="(img, idx) in images" :key="idx" class="img-preview">
            <image :src="img" mode="aspectFill" class="img-pic" />
            <text class="img-remove" @click="removeImage(idx)">✕</text>
          </view>
          <view v-if="images.length < 4" class="img-add" @click="chooseImage">
            <text class="img-add-icon">+</text>
            <text class="img-add-text">添加图片</text>
          </view>
        </view>
        <text class="img-tip">支持 JPG、PNG 格式，建议上传清晰的违规截图</text>
      </view>

      <!-- 提示说明 -->
      <view class="tip-section">
        <text class="tip-text">温馨提示：请如实填写举报信息，恶意举报将影响你的信誉分。我们将在24小时内处理你的举报，处理结果会通过站内信通知。</text>
      </view>
    </scroll-view>

    <!-- 底部提交 -->
    <view class="bottom-bar">
      <view class="submit-btn" :class="{ disabled: !canSubmit || submitting }" @click="submit">
        <text v-if="submitting">⏳ 提交中...</text>
        <text v-else>提交举报</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { reportApi } from '../../api'

const selectedType = ref<string>(''); const reason = ref(''); const images = ref<string[]>([]); const submitting = ref(false)
const targetId = ref(''); const targetType = ref('post'); const targetTitle = ref('')

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

const canSubmit = computed(() => selectedType.value && (selectedType.value !== 'other' || reason.value.trim().length > 0))

onMounted(() => {
  const opts = (getCurrentPages().pop()?.options || {})
  targetId.value = opts.targetId || ''; targetType.value = opts.type || opts.targetType || 'post'; targetTitle.value = opts.targetTitle || ''
})

function chooseImage() {
  uni.chooseImage({ count: 4 - images.value.length, success: (res) => { images.value.push(...res.tempFilePaths) } })
}

function removeImage(idx: number) { images.value = images.value.filter((_, i) => i !== idx) }

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    await reportApi.report({ targetId: targetId.value, type: targetType.value, reason: selectedType.value, detail: reason.value })
    uni.showToast({ title: '举报提交成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch { uni.showToast({ title: '提交失败', icon: 'none' }) }
  submitting.value = false
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 120rpx; }
.header { background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content-scroll { padding: 24rpx; }
.section { margin-bottom: 28rpx; }
.section-label { font-size: 26rpx; font-weight: 500; color: #555; display: block; margin-bottom: 12rpx; }
.required { color: #C41E3A; }
.optional { font-size: 22rpx; color: #999; font-weight: normal; }
.target-card { display: flex; align-items: center; gap: 12rpx; padding: 16rpx; background: #faf8f5; border-radius: 12rpx; }
.tc-icon { font-size: 36rpx; }
.tc-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.tc-type { font-size: 22rpx; color: #999; }
.report-types { display: flex; flex-direction: column; gap: 8rpx; }
.rt-item { display: flex; align-items: center; justify-content: space-between; padding: 20rpx; background: #fff; border: 1rpx solid #E5E1DB; border-radius: 12rpx; }
.rt-item.selected { border-color: #C41E3A; background: #fef0f0; }
.rt-info { flex: 1; }
.rt-label { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.rt-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.rt-radio { width: 36rpx; height: 36rpx; border-radius: 50%; border: 2rpx solid #ddd; display: flex; align-items: center; justify-content: center; }
.rt-radio.checked { border-color: #C41E3A; }
.rt-dot { width: 18rpx; height: 18rpx; border-radius: 50%; background: #C41E3A; }
.reason-textarea { width: 100%; background: #fff; border: 1rpx solid #E5E1DB; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; min-height: 160rpx; box-sizing: border-box; }
.char-count { font-size: 22rpx; color: #ccc; text-align: right; display: block; margin-top: 8rpx; }
.image-grid { display: flex; gap: 12rpx; flex-wrap: wrap; }
.img-preview { position: relative; width: 140rpx; height: 140rpx; border-radius: 12rpx; overflow: hidden; }
.img-pic { width: 100%; height: 100%; }
.img-remove { position: absolute; top: -8rpx; right: -8rpx; width: 32rpx; height: 32rpx; background: #e53935; color: #fff; border-radius: 50%; font-size: 20rpx; display: flex; align-items: center; justify-content: center; }
.img-add { width: 140rpx; height: 140rpx; border: 2rpx dashed #ddd; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.img-add-icon { font-size: 40rpx; color: #999; }
.img-add-text { font-size: 20rpx; color: #999; margin-top: 4rpx; }
.img-tip { font-size: 22rpx; color: #ccc; display: block; margin-top: 8rpx; }
.tip-section { padding: 20rpx; background: #fff8e8; border: 1rpx solid #f0d88a; border-radius: 12rpx; }
.tip-text { font-size: 22rpx; color: #8b6914; line-height: 1.6; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid #E5E1DB; }
.submit-btn { width: 100%; padding: 20rpx; text-align: center; background: #C41E3A; color: #fff; border-radius: 12rpx; font-size: 28rpx; font-weight: 500; }
.submit-btn.disabled { background: #ccc; color: #999; }
</style>
