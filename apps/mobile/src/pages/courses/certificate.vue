<template>
  <view class="page">
    <view v-if="loading" class="loading">加载中...</view>

    <view v-else-if="cert" class="certificate">
      <!-- 证书主体 -->
      <view class="cert-body">
        <view class="cert-border">
          <view class="cert-inner">
            <text class="cert-label">结课证书</text>
            <text class="cert-title">{{ cert.courseTitle }}</text>
            <view class="cert-divider" />
            <text class="cert-to">此证书授予</text>
            <text class="cert-name">{{ cert.studentName }}</text>
            <text class="cert-desc">
              已完成全部 {{ cert.totalChapters }} 个章节的学习，特发此证，以资鼓励。
            </text>
            <view class="cert-divider" />
            <view class="cert-bottom">
              <view class="cert-info">
                <text class="cert-no">编号：{{ cert.certificateNo }}</text>
                <text class="cert-date">颁发日期：{{ new Date().toLocaleDateString() }}</text>
              </view>
              <view class="cert-seal">热卜国学</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 操作栏 -->
      <view class="cert-actions">
        <button class="action-btn primary" @click="saveImage">保存证书图片</button>
        <button class="action-btn" @click="shareCert">分享证书</button>
      </view>
    </view>

    <view v-else class="error-state">
      <text class="error-icon">⚠️</text>
      <text class="error-text">{{ errorMsg || '证书加载失败' }}</text>
      <button class="retry-btn" @click="fetchCert">重新加载</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { courseApi } from '@/api'

const cert = ref<any>(null)
const loading = ref(false)
const errorMsg = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  if (opts.courseId) fetchCert(opts.courseId)
  else {
    errorMsg.value = '缺少课程ID参数'
  }
})

async function fetchCert(courseId?: string) {
  if (!courseId) return
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await courseApi.certificate(courseId)
    cert.value = res
  } catch (e: any) {
    errorMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function saveImage() {
  uni.showToast({ title: '长按证书区域即可保存', icon: 'none' })
}

function shareCert() {
  if (!cert.value) return
  uni.setClipboardData({
    data: `🎓 我在热卜国学完成了《${cert.value.courseTitle}》的学习！`,
    success: () => uni.showToast({ title: '已复制分享文案', icon: 'success' }),
  })
}
</script>

<style scoped>
.page { padding: 16px; background: #F5F0E8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
.loading { padding: 60px 0; color: #C9A96E; }

.certificate { width: 100%; max-width: 360px; }
.cert-body { margin-bottom: 20px; }
.cert-border {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  border-radius: 16px; padding: 3px;
  box-shadow: 0 8px 32px rgba(196,30,58,0.2);
}
.cert-inner {
  background: #FFFBF0;
  border-radius: 13px; padding: 32px 24px;
  display: flex; flex-direction: column; align-items: center;
}
.cert-label { font-size: 13px; color: #C9A96E; letter-spacing: 4px; margin-bottom: 8px; }
.cert-title { font-size: 22px; font-weight: bold; color: #C41E3A; text-align: center; font-family: 'Noto Serif SC', serif; }
.cert-divider {
  width: 60px; height: 2px; background: linear-gradient(90deg, transparent, #C9A96E, transparent);
  margin: 20px 0;
}
.cert-to { font-size: 13px; color: #999; }
.cert-name { font-size: 20px; font-weight: 600; color: #2C2C2C; margin-top: 8px; font-family: 'Noto Serif SC', serif; }
.cert-desc { font-size: 13px; color: #666; text-align: center; line-height: 1.8; margin-top: 12px; }
.cert-bottom { display: flex; align-items: flex-end; justify-content: space-between; width: 100%; margin-top: 8px; }
.cert-info { text-align: left; }
.cert-no { font-size: 10px; color: #bbb; display: block; }
.cert-date { font-size: 10px; color: #bbb; display: block; margin-top: 2px; }
.cert-seal {
  font-size: 14px; color: #C41E3A; font-weight: bold;
  border: 2px solid #C41E3A; border-radius: 6px; padding: 6px 12px;
  font-family: 'Noto Serif SC', serif; transform: rotate(-5deg);
}

.cert-actions { display: flex; gap: 12px; width: 100%; max-width: 360px; }
.action-btn {
  flex: 1; height: 44px; border-radius: 22px; font-size: 14px; border: 1px solid #C41E3A;
  background: #fff; color: #C41E3A; display: flex; align-items: center; justify-content: center;
}
.action-btn.primary { background: #C41E3A; color: #fff; border: none; }

.error-state { display: flex; flex-direction: column; align-items: center; padding: 60px 0; }
.error-icon { font-size: 48px; }
.error-text { font-size: 14px; color: #999; margin-top: 12px; }
.retry-btn { background: #C41E3A; color: #fff; border-radius: 20px; padding: 8px 32px; font-size: 14px; border: none; margin-top: 16px; }
</style>
