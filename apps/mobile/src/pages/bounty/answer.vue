<template>
  <view class="page">
    <view class="header">
      <text class="title">回答悬赏</text>
    </view>

    <!-- 原问题摘要 -->
    <view v-if="question" class="question-summary">
      <text class="qs-title">{{ question.title }}</text>
      <text class="qs-body">{{ question.description }}</text>
    </view>

    <view class="form">
      <view class="form-item">
        <text class="form-label">回答内容 <text class="required">*</text></text>
        <textarea v-model="content" placeholder="请输入你的回答..." maxlength="5000" class="form-textarea" />
        <text class="char-count">{{ content.length }}/5000</text>
      </view>

      <view class="form-item">
        <text class="form-label">图片上传（可选）</text>
        <view class="upload-area">
          <view v-for="(img, idx) in images" :key="idx" class="upload-preview">
            <image :src="img" mode="aspectFill" class="upload-img" />
            <text class="upload-remove" @click="removeImage(idx)">×</text>
          </view>
          <view v-if="images.length < 9" class="upload-btn" @click="chooseImage">
            <text class="upload-plus">+</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">语音回答（可选）</text>
        <view class="audio-area">
          <button v-if="!recording" class="audio-btn" @click="startRecord">🎤 开始录音</button>
          <button v-else class="audio-btn recording" @click="stopRecord">⏹ 停止录音</button>
          <text v-if="audioUrl" class="audio-ready">已录制音频</text>
        </view>
      </view>

      <button class="submit-btn" @click="submit" :loading="submitting" :disabled="!canSubmit">提交回答</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api, uploadApi } from '../../api'

const questionId = ref('')
const question = ref<any>(null)
const content = ref('')
const images = ref<string[]>([])
const audioUrl = ref('')
const recording = ref(false)
const submitting = ref(false)

const canSubmit = computed(() => content.value.trim().length > 0)

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  questionId.value = opts.id || ''

  if (questionId.value) {
    try {
      question.value = await api.get(`/bounty/${questionId.value}`)
    } catch { /* */ }
  }
})

async function chooseImage() {
  try {
    const res = await uni.chooseImage({ count: 9 - images.value.length, sizeType: ['compressed'] })
    const tempFiles = res.tempFilePaths || res.tempFiles?.map((f: any) => f.path) || []
    uni.showLoading({ title: '上传中...' })
    const results = await uploadApi.images(tempFiles)
    uni.hideLoading()
    const urls = (Array.isArray(results) ? results : []).map((r: any) => r.url || r.data?.url || r)
    images.value.push(...urls)
  } catch { uni.hideLoading() }
}

function removeImage(idx: number) { images.value.splice(idx, 1) }

async function startRecord() {
  try {
    await uni.startVoiceRecord({})
    recording.value = true
  } catch (e: any) {
    uni.showToast({ title: '录音启动失败', icon: 'none' })
  }
}

async function stopRecord() {
  try {
    const res = await uni.stopVoiceRecord()
    recording.value = false
    const tempPath = res.tempFilePath
    if (tempPath) {
      uni.showLoading({ title: '上传中...' })
      const result: any = await uploadApi.audio(tempPath)
      uni.hideLoading()
      audioUrl.value = result.url || result.data?.url || result
    }
  } catch { recording.value = false; uni.hideLoading() }
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    await api.post(`/bounty/${questionId.value}/answer`, {
      content: content.value.trim(),
      images: images.value,
      audioUrl: audioUrl.value || undefined,
    })
    uni.showToast({ title: '回答成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (e: any) {
    uni.showToast({ title: e.errMsg || '提交失败', icon: 'none' })
  } finally { submitting.value = false }
}
</script>

<style scoped>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }
.header { margin-bottom: 16px; }
.title { font-size: 20px; font-weight: bold; color: #C41E3A; }

.question-summary { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 12px; border-left: 3px solid #C41E3A; }
.qs-title { font-size: 15px; font-weight: bold; color: #333; display: block; margin-bottom: 6px; }
.qs-body { font-size: 13px; color: #666; display: block; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }

.form { background: #fff; border-radius: 10px; padding: 16px; }
.form-item { margin-bottom: 18px; }
.form-label { font-size: 14px; font-weight: bold; color: #333; display: block; margin-bottom: 8px; }
.required { color: #C41E3A; }
.form-textarea { width: 100%; min-height: 150px; padding: 10px; border: 1px solid #E8E0D5; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.char-count { font-size: 11px; color: #bbb; text-align: right; display: block; margin-top: 4px; }

.upload-area { display: flex; gap: 8px; flex-wrap: wrap; }
.upload-preview { position: relative; width: 80px; height: 80px; }
.upload-img { width: 100%; height: 100%; border-radius: 8px; }
.upload-remove { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.5); color: #fff; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.upload-btn { width: 80px; height: 80px; border: 1px dashed #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #F5F0E8; }
.upload-plus { font-size: 28px; color: #999; line-height: 1; }

.audio-area { display: flex; align-items: center; gap: 12px; }
.audio-btn { background: #F5F0E8; color: #333; border: 1px solid #E8E0D5; border-radius: 20px; padding: 8px 20px; font-size: 14px; }
.audio-btn.recording { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.audio-ready { font-size: 12px; color: #27ae60; }

.submit-btn { width: 100%; background: #C41E3A; color: #fff; border-radius: 24px; padding: 12px; font-size: 16px; border: none; margin-top: 8px; }
.submit-btn[disabled] { background: #ccc; }
</style>
