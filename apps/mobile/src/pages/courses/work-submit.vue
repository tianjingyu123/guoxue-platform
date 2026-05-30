<template>
  <view class="page">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">‹ 返回</text>
      <text class="nav-title">提交作业</text>
      <text class="nav-placeholder" />
    </view>

    <view class="form-area">
      <text class="form-label">作业内容</text>
      <textarea
        v-model="content"
        class="content-input"
        placeholder="请输入你的作业内容..."
        :maxlength="5000"
      />

      <view v-if="images.length > 0" class="image-list">
        <view v-for="(img, i) in images" :key="i" class="image-item">
          <image :src="img" class="preview-img" mode="aspectFill" />
          <text class="remove-img" @click="removeImage(i)">✕</text>
        </view>
      </view>

      <view class="upload-row">
        <button class="upload-btn" @click="chooseImage">📷 上传图片</button>
        <text class="upload-hint">最多9张</text>
      </view>

      <button class="submit-btn" @click="doSubmit" :disabled="submitting || !content.trim()">
        {{ submitting ? '提交中...' : '提交作业' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { courseApi, uploadApi } from '../../api'

const courseId = ref('')
const chapterId = ref('')
const content = ref('')
const images = ref<string[]>([])
const uploadedUrls = ref<string[]>([])
const uploading = ref(false)
const submitting = ref(false)

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  courseId.value = opts.courseId || ''
  chapterId.value = opts.chapterId || ''
})

async function chooseImage() {
  uni.chooseImage({
    count: 9 - images.value.length,
    sizeType: ['compressed'],
    success: async (res: any) => {
      images.value.push(...res.tempFilePaths)
      // 立即上传图片
      uploading.value = true
      try {
        const results = await uploadApi.images(res.tempFilePaths) as any[]
        uploadedUrls.value.push(...results.map((r: any) => r.url || r.data?.url))
      } catch {
        uni.showToast({ title: '图片上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    },
  })
}

function removeImage(i: number) {
  images.value.splice(i, 1)
  uploadedUrls.value.splice(i, 1)
}

async function doSubmit() {
  if (!content.value.trim()) return
  submitting.value = true
  try {
    await courseApi.submitWork(chapterId.value, content.value.trim(), uploadedUrls.value)
    uni.showToast({ title: '作业提交成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch {
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style>
.page {
  background: #F5F0E8;
  min-height: 100vh;
}

.nav-bar {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 10px 12px;
  border-bottom: 1px solid #E8E0D5;
}
.nav-back {
  font-size: 16px;
  color: #C41E3A;
  width: 70px;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #2C2C2C;
}
.nav-placeholder { width: 70px; }

.form-area {
  padding: 16px;
}

.form-label {
  font-size: 14px;
  color: #2C2C2C;
  font-weight: 500;
  margin-bottom: 8px;
  display: block;
}

.content-input {
  width: 100%;
  height: 200px;
  background: #fff;
  border: 1px solid #E8E0D5;
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
  box-sizing: border-box;
  line-height: 1.6;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.image-item {
  position: relative;
  width: 80px;
  height: 80px;
}
.preview-img {
  width: 100%;
  height: 100%;
  border-radius: 8px;
}
.remove-img {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  background: #C41E3A;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 20px;
  font-size: 12px;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.upload-btn {
  height: 32px;
  background: #F5F0E8;
  color: #C9A96E;
  border: 1px dashed #C9A96E;
  border-radius: 16px;
  font-size: 12px;
  padding: 0 14px;
}
.upload-hint {
  font-size: 11px;
  color: #bbb;
}

.submit-btn {
  width: 100%;
  height: 46px;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  border-radius: 23px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  margin-top: 24px;
}
.submit-btn[disabled] {
  opacity: 0.5;
}
</style>
