<template>
  <view class="page">
    <view class="header">
      <text class="back-btn" @click="goBack">‹</text>
      <text class="header-title">发布课程</text>
      <view style="width:60rpx" />
    </view>

    <scroll-view scroll-y class="content">
      <!-- 课程封面 -->
      <view class="section">
        <text class="section-title">课程封面</text>
        <view class="cover-area" @click="uploadCover">
          <image v-if="form.cover" :src="form.cover" class="cover-img" mode="aspectFill" />
          <text v-else class="cover-placeholder">点击上传封面图</text>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="section">
        <text class="section-title">基本信息</text>
        <input class="field" v-model="form.title" placeholder="课程标题（必填）" />
        <textarea class="field textarea" v-model="form.description" placeholder="课程简介..." />
        <view class="row">
          <input class="field half" v-model.number="form.price" type="digit" placeholder="价格（0=免费）" />
          <input class="field half" v-model.number="form.originalPrice" type="digit" placeholder="原价" />
        </view>
      </view>

      <!-- 课程视频 -->
      <view class="section">
        <text class="section-title">课程视频</text>
        <view class="upload-area" @click="pickVideo">
          <text class="upload-icon">🎬</text>
          <text class="upload-hint">{{ videoFile ? videoFile.name : '点击选择视频（建议在电脑浏览器操作大文件）' }}</text>
          <text class="upload-size" v-if="videoFile">{{ formatSize(videoFile.size) }}</text>
        </view>
        <!-- 上传进度 -->
        <view v-if="uploading" class="progress-wrap">
          <progress :percent="uploadProgress" stroke-width="6" backgroundColor="#E8E3DB" activeColor="#C41E3A" />
          <text class="progress-text">{{ uploadProgress }}%</text>
        </view>
        <!-- 已上传视频 -->
        <view v-if="form.videoUrl" class="video-uploaded">
          <text>✅ 视频已上传</text>
        </view>
      </view>

      <!-- 章节管理 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">课程章节</text>
          <text class="add-btn" @click="addChapter">+ 添加章节</text>
        </view>
        <view v-for="(ch, ci) in chapters" :key="ci" class="chapter-card">
          <view class="chapter-header">
            <text class="chapter-index">第{{ ci + 1 }}章</text>
            <text class="delete-btn" @click="removeChapter(ci)">删除</text>
          </view>
          <input class="field" v-model="ch.title" placeholder="章节标题" />
          <view v-for="(ls, li) in ch.lessons" :key="li" class="lesson-row">
            <input class="field flex1" v-model="ls.title" placeholder="课时标题" />
            <text class="delete-btn" @click="removeLesson(ci, li)">×</text>
          </view>
          <text class="add-btn small" @click="addLesson(ci)">+ 课时</text>
        </view>
      </view>

      <!-- 提交 -->
      <button class="submit-btn" :loading="submitting" :disabled="submitting || !canSubmit" @click="doSubmit">
        {{ submitting ? '发布中...' : '发布课程' }}
      </button>
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { courseApi, uploadApi } from '../../api'

const videoFile = ref<any>(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const submitting = ref(false)

const form = reactive({
  title: '', description: '', cover: '', price: 0, originalPrice: 0, videoUrl: '',
})

const chapters = ref<{ title: string; lessons: { title: string }[] }[]>([
  { title: '', lessons: [{ title: '' }] },
])

const canSubmit = computed(() => form.title.trim())

// ── 封面上传 ──
async function uploadCover() {
  const res = await uni.chooseImage({ count: 1, sizeType: ['compressed'] })
  uni.showLoading({ title: '上传中' })
  try {
    const r = await uploadApi.upload(res.tempFilePaths[0]) as any
    form.cover = r?.url || r?.data?.url || ''
  } finally { uni.hideLoading() }
}

// ── 视频选择+上传 ──
async function pickVideo() {
  // H5 和 APP 支持大文件选择
  const res = await uni.chooseVideo({
    sourceType: ['album', 'camera'],
    maxDuration: 3600,
    compressed: false,
  })
  videoFile.value = res.tempFile ? { name: res.tempFile.name || 'video.mp4', size: res.tempFile.size || 0 } : null
  if (res.tempFilePath) {
    uploading.value = true
    uploadProgress.value = 0
    try {
      const r = await uploadApi.upload(res.tempFilePath, (p: number) => { uploadProgress.value = p }) as any
      form.videoUrl = r?.url || r?.data?.url || ''
    } finally { uploading.value = false }
  }
}

// ── 章节管理 ──
function addChapter() { chapters.value.push({ title: '', lessons: [{ title: '' }] }) }
function removeChapter(i: number) { chapters.value.splice(i, 1) }
function addLesson(ci: number) { chapters.value[ci].lessons.push({ title: '' }) }
function removeLesson(ci: number, li: number) { chapters.value[ci].lessons.splice(li, 1) }

// ── 提交 ──
async function doSubmit() {
  submitting.value = true
  try {
    await courseApi.create({
      ...form,
      chapters: chapters.value.filter(c => c.title.trim()),
    })
    uni.showToast({ title: '提交成功，等待审核', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e: any) {
    uni.showToast({ title: e.message || '发布失败', icon: 'none' })
  } finally { submitting.value = false }
}

function formatSize(b: number) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1024).toFixed(0) + ' KB' }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { min-height:100vh; background:#F5F0E8; }
.header { display:flex; align-items:center; justify-content:space-between; padding:20rpx 24rpx; background:#fff; border-bottom:1rpx solid #E5E1DB; }
.back-btn { font-size:48rpx; color:#2C2C2C; line-height:1; }
.header-title { font-size:32rpx; font-weight:600; }
.content { padding:20rpx; padding-bottom:160rpx; }

.section { background:#fff; border-radius:16rpx; padding:20rpx; margin-bottom:20rpx; }
.section-title { font-size:28rpx; font-weight:600; color:#2C2C2C; margin-bottom:16rpx; display:block; }
.section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16rpx; }

.cover-area { width:200rpx; height:120rpx; background:#FAFAFA; border:2rpx dashed #E8E3DB; border-radius:12rpx; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.cover-img { width:100%; height:100%; }
.cover-placeholder { font-size:24rpx; color:#999; }

.field { width:100%; height:80rpx; background:#F5F1EB; border:1rpx solid #E8E3DB; border-radius:10rpx; padding:0 16rpx; font-size:28rpx; margin-bottom:12rpx; box-sizing:border-box; }
.textarea { height:160rpx; padding:16rpx; }
.half { width:calc(50% - 8rpx); display:inline-block; }
.half:first-child { margin-right:16rpx; }
.row { display:flex; }

.upload-area { padding:40rpx; background:#FAFAFA; border:2rpx dashed #E8E3DB; border-radius:12rpx; text-align:center; }
.upload-icon { font-size:48rpx; display:block; margin-bottom:8rpx; }
.upload-hint { font-size:24rpx; color:#999; }
.upload-size { font-size:20rpx; color:#C41E3A; margin-top:8rpx; }

.progress-wrap { margin-top:12rpx; display:flex; align-items:center; gap:12rpx; }
.progress-text { font-size:24rpx; color:#C41E3A; font-weight:600; }
.video-uploaded { padding:12rpx; font-size:24rpx; color:#52C41A; }

.chapter-card { background:#FAFAFA; border-radius:12rpx; padding:16rpx; margin-bottom:12rpx; }
.chapter-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8rpx; }
.chapter-index { font-size:26rpx; font-weight:600; color:#2C2C2C; }
.lesson-row { display:flex; align-items:center; gap:8rpx; }
.flex1 { flex:1; }

.add-btn { font-size:24rpx; color:#C41E3A; }
.add-btn.small { margin-top:8rpx; display:inline-block; }
.delete-btn { font-size:22rpx; color:#999; }

.submit-btn { width:100%; height:88rpx; background:linear-gradient(135deg,#C41E3A,#8B0000); color:#fff; border:none; border-radius:16rpx; font-size:30rpx; font-weight:600; margin-top:20rpx; }
.safe-bottom { height:60rpx; }
</style>
