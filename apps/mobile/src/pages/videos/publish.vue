<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="goBack">
        <text class="nav-back">‹</text>
      </view>
      <text class="nav-title">发布视频</text>
      <view class="nav-right">
        <text class="publish-btn" :class="{ disabled: publishing || !canPublish }" @click="publish">
          {{ publishing ? '发布中...' : '发布' }}
        </text>
      </view>
    </view>

    <!-- 视频选择区域 -->
    <view class="video-section" v-if="!videoPath">
      <view class="video-placeholder">
        <text class="vp-icon">🎬</text>
        <text class="vp-text">选择或拍摄视频</text>
        <text class="vp-hint">支持 mp4 / webm，最大200MB</text>
        <view class="vp-actions">
          <button class="vp-btn" @click="chooseVideo">📂 相册选择</button>
          <button class="vp-btn primary" @click="recordVideo">🎥 拍摄视频</button>
        </view>
      </view>
    </view>

    <!-- 视频预览 -->
    <view class="video-section" v-else>
      <view class="preview-wrap">
        <video
          :src="videoPath"
          class="preview-video"
          :autoplay="false"
          :muted="false"
          object-fit="contain"
          :show-center-play-btn="true"
        />
        <view class="preview-actions">
          <text class="preview-retake" @click="retakeVideo">重新选择</text>
        </view>
      </view>

      <!-- 上传进度 -->
      <view v-if="uploading" class="upload-progress">
        <text class="up-text">上传中...</text>
        <view class="up-bar">
          <view class="up-fill" :style="{ width: uploadProgress + '%' }" />
        </view>
        <text class="up-percent">{{ uploadProgress }}%</text>
      </view>
    </view>

    <!-- 表单 -->
    <view class="form" v-if="videoPath && !uploading">
      <!-- 标题 -->
      <view class="form-row">
        <text class="form-label">标题</text>
        <input
          v-model="title"
          class="form-input"
          placeholder="给视频取个标题..."
          maxlength="50"
        />
      </view>

      <!-- 封面 -->
      <view class="form-row">
        <text class="form-label">封面</text>
        <view class="cover-row">
          <view v-if="coverUrl" class="cover-preview-wrap">
            <image :src="coverUrl" class="cover-preview" mode="aspectFill" />
            <text class="cover-remove" @click="coverUrl = ''">×</text>
          </view>
          <view v-else class="cover-add" @click="chooseCover">
            <text class="cover-add-icon">🖼</text>
            <text class="cover-add-text">添加封面</text>
          </view>
        </view>
      </view>

      <!-- 圈子 -->
      <view class="form-row">
        <text class="form-label">发布到圈子</text>
        <picker
          v-if="circles.length > 0"
          mode="selector"
          :range="circleNames"
          :value="circleIndex"
          @change="onCircleChange"
        >
          <view class="picker-val">
            <text :class="{ placeholder: circleIndex < 0 }">
              {{ circleIndex >= 0 ? circleNames[circleIndex] : '不发布到圈子' }}
            </text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
        <text v-else class="form-hint">暂无已加入的圈子</text>
      </view>

      <!-- 描述 -->
      <view class="form-row">
        <text class="form-label">描述</text>
        <textarea
          v-model="description"
          class="form-textarea"
          placeholder="介绍一下视频内容..."
          :maxlength="200"
        />
        <text class="char-count">{{ description.length }}/200</text>
      </view>
    </view>

    <view class="bottom-safe" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { videoApi, uploadApi, circleApi } from "../../api"

const videoPath = ref("")
const coverUrl = ref("")
const title = ref("")
const description = ref("")
const circleIndex = ref(-1)
const circles = ref<any[]>([])
const uploadedUrl = ref("")

const uploading = ref(false)
const uploadProgress = ref(0)
const publishing = ref(false)

const circleNames = computed(() => circles.value.map((c: any) => c.circle?.name || c.name || ""))

const canPublish = computed(() => !!(uploadedUrl.value || videoPath.value))

onMounted(() => {
  fetchMyCircles()
})

async function fetchMyCircles() {
  try {
    const res = await circleApi.my()
    circles.value = Array.isArray(res) ? res : []
  } catch { /* 静默 */ }
}

function chooseVideo() {
  uni.chooseVideo({
    sourceType: ["album"],
    maxDuration: 300,
    compressed: true,
    success: (res) => {
      videoPath.value = res.tempFilePath
      uploadedUrl.value = ""
    },
  })
}

function recordVideo() {
  uni.chooseVideo({
    sourceType: ["camera"],
    maxDuration: 300,
    compressed: true,
    success: (res) => {
      videoPath.value = res.tempFilePath
      uploadedUrl.value = ""
    },
  })
}

function retakeVideo() {
  videoPath.value = ""
  uploadedUrl.value = ""
  coverUrl.value = ""
  title.value = ""
  description.value = ""
}

function chooseCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: async (res) => {
      const fp = res.tempFilePaths?.[0]
      if (!fp) return
      try {
        const uploadRes: any = await uploadApi.image(fp)
        const url = uploadRes?.data?.url || uploadRes?.url || ""
        if (url) coverUrl.value = url
        else uni.showToast({ title: "封面上传失败", icon: "none" })
      } catch {
        uni.showToast({ title: "封面上传失败", icon: "none" })
      }
    },
  })
}

function onCircleChange(e: any) {
  circleIndex.value = e.detail.value
}

function goBack() {
  if (videoPath.value && !uploadedUrl.value) {
    uni.showModal({
      title: "放弃发布？",
      content: "视频尚未上传，返回将丢失内容",
      success: (res) => { if (res.confirm) uni.navigateBack() },
    })
  } else {
    uni.navigateBack()
  }
}

async function publish() {
  if (!canPublish.value || publishing.value) return

  publishing.value = true
  try {
    let videoUrl = uploadedUrl.value

    // 1. 先上传视频
    if (!videoUrl && videoPath.value) {
      uploading.value = true
      uploadProgress.value = 0
      const progressTimer = setInterval(() => {
        if (uploadProgress.value < 90) uploadProgress.value += 10
      }, 500)

      try {
        const res: any = await uploadApi.video(videoPath.value)
        clearInterval(progressTimer)
        uploadProgress.value = 100
        videoUrl = res?.data?.url || res?.url || ""
        if (!videoUrl) {
          uni.showToast({ title: "视频上传失败", icon: "none" })
          return
        }
        uploadedUrl.value = videoUrl
      } catch {
        clearInterval(progressTimer)
        uni.showToast({ title: "视频上传失败", icon: "none" })
        return
      } finally {
        uploading.value = false
      }
    }

    // 2. 创建视频记录
    const data: any = {
      videoUrl,
      title: title.value.trim() || undefined,
      coverUrl: coverUrl.value || undefined,
    }
    const circleId = circleIndex.value >= 0 ? circles.value[circleIndex.value]?.circle?.id || circles.value[circleIndex.value]?.id : undefined
    if (circleId) data.circleId = circleId

    await videoApi.create(data)
    uni.showToast({ title: "发布成功", icon: "success" })
    setTimeout(() => {
      uni.switchTab({ url: "/pages/videos/videos" })
    }, 800)
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || "发布失败", icon: "none" })
  } finally {
    publishing.value = false
  }
}
</script>

<style>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* ===== 顶栏 ===== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  padding-top: calc(10px + env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1px solid #E8E0D5;
}
.nav-left {
  width: 44px;
}
.nav-back {
  font-size: 32px;
  color: #333;
  line-height: 1;
}
.nav-title {
  font-size: 16px;
  font-weight: bold;
  color: #2C2C2C;
}
.nav-right {
  display: flex;
  gap: 12px;
  align-items: center;
}
.publish-btn {
  font-size: 13px;
  color: #fff;
  background: #C41E3A;
  padding: 6px 16px;
  border-radius: 14px;
  font-weight: 500;
}
.publish-btn.disabled {
  opacity: 0.4;
}

/* ===== 视频选择 ===== */
.video-section {
  background: #fff;
  margin: 10px;
  border-radius: 10px;
  overflow: hidden;
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 8px;
}
.vp-icon {
  font-size: 52px;
}
.vp-text {
  font-size: 16px;
  font-weight: bold;
  color: #2C2C2C;
}
.vp-hint {
  font-size: 12px;
  color: #999;
  margin-bottom: 16px;
}
.vp-actions {
  display: flex;
  gap: 16px;
}
.vp-btn {
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  background: #F5F0E8;
  color: #2C2C2C;
  border: 1px solid #E8E0D5;
}
.vp-btn.primary {
  background: #C41E3A;
  color: #fff;
  border-color: #C41E3A;
}

/* ===== 视频预览 ===== */
.preview-wrap {
  position: relative;
}
.preview-video {
  width: 100%;
  height: 300px;
}
.preview-actions {
  display: flex;
  justify-content: center;
  padding: 10px;
}
.preview-retake {
  font-size: 13px;
  color: #C41E3A;
  padding: 6px 20px;
  border: 1px solid #C41E3A;
  border-radius: 16px;
}

/* 上传进度 */
.upload-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #F5F0E8;
}
.up-text {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}
.up-bar {
  flex: 1;
  height: 6px;
  background: #E8E0D5;
  border-radius: 3px;
  overflow: hidden;
}
.up-fill {
  height: 100%;
  background: linear-gradient(90deg, #C9A96E, #C41E3A);
  border-radius: 3px;
  transition: width 0.3s;
}
.up-percent {
  font-size: 12px;
  color: #C41E3A;
  flex-shrink: 0;
  min-width: 36px;
  text-align: right;
}

/* ===== 表单 ===== */
.form {
  margin: 10px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
}
.form-row {
  padding: 14px 16px;
  border-bottom: 1px solid #F5F0E8;
}
.form-label {
  font-size: 13px;
  color: #999;
  margin-bottom: 8px;
  display: block;
}
.form-input {
  width: 100%;
  height: 38px;
  border: 1px solid #E8E0D5;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 14px;
  color: #2C2C2C;
  box-sizing: border-box;
}
.form-textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid #E8E0D5;
  border-radius: 6px;
  padding: 10px;
  font-size: 14px;
  color: #2C2C2C;
  box-sizing: border-box;
}
.char-count {
  font-size: 11px;
  color: #ccc;
  text-align: right;
  margin-top: 4px;
  display: block;
}
.form-hint {
  font-size: 13px;
  color: #ccc;
}

/* ===== 封面 ===== */
.cover-row {
  display: flex;
}
.cover-preview-wrap {
  position: relative;
  width: 100px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
}
.cover-preview {
  width: 100%;
  height: 100%;
}
.cover-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: #C41E3A;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 18px;
  font-size: 14px;
  font-weight: bold;
}
.cover-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 60px;
  border: 2px dashed #C9A96E;
  border-radius: 6px;
  background: #F5F0E8;
}
.cover-add-icon {
  font-size: 20px;
}
.cover-add-text {
  font-size: 10px;
  color: #C9A96E;
  margin-top: 2px;
}

/* ===== 选择器 ===== */
.picker-val {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid #E8E0D5;
  border-radius: 6px;
  font-size: 14px;
  color: #2C2C2C;
}
.picker-val .placeholder {
  color: #ccc;
}
.picker-arrow {
  font-size: 20px;
  color: #ccc;
}

/* ===== 底部安全区 ===== */
.bottom-safe {
  height: calc(40px + env(safe-area-inset-bottom));
}
</style>
