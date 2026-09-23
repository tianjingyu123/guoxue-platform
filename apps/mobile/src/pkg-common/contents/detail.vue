<template>
  <view class="reader">
    <view
      v-if="loading"
      class="reader-state"
      role="status"
    >
      <text class="state-title">
        正在打开内容
      </text>
      <text class="state-note">
        稍等片刻
      </text>
    </view>
    <view
      v-else-if="error"
      class="reader-state"
      role="alert"
    >
      <text class="state-title">
        这篇内容暂时无法阅读
      </text>
      <text class="state-note">
        可能已下架，或当前网络不可用。
      </text>
      <button
        class="retry"
        @tap="load"
      >
        重新加载
      </button>
    </view>
    <view
      v-else-if="content"
      class="reader-inner"
    >
      <view class="reader-head">
        <text class="reader-type">
          {{ typeLabel }}
        </text>
        <text class="reader-title">
          {{ content.title }}
        </text>
        <text
          v-if="byline"
          class="reader-byline"
        >
          {{ byline }}
        </text>
        <text
          v-if="content.excerpt"
          class="reader-lead"
        >
          {{ content.excerpt }}
        </text>
      </view>
      <image
        v-if="content.cover"
        class="reader-cover"
        :src="content.cover"
        mode="widthFix"
      />
      <view class="reader-body">
        <rich-text
          v-if="bodyHtml"
          class="reader-rich"
          :nodes="bodyHtml"
        />
        <text
          v-else
          class="reader-empty"
        >
          暂无正文
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { apiGet } from '@/utils/request'
import { normalizeCourseContent } from '@/utils/rich-content'

interface PlatformContent {
  id: string
  title: string
  type: string
  author?: string | null
  dynasty?: string | null
  excerpt?: string | null
  cover?: string | null
  body?: string | null
}

const id = ref('')
const loading = ref(true)
const error = ref(false)
const content = ref<PlatformContent | null>(null)
let requestVersion = 0

const typeLabel = computed(() => ({ POEM: '诗词', CLASSIC: '古籍', ARTICLE: '文章' }[content.value?.type || ''] || '内容'))
const byline = computed(() => [content.value?.author, content.value?.dynasty].filter(Boolean).join(' · '))
const bodyHtml = computed(() => normalizeCourseContent(content.value?.body || ''))

async function load() {
  const version = ++requestVersion
  if (!id.value) { loading.value = false; error.value = true; return }
  loading.value = true
  error.value = false
  try {
    const data = await apiGet<PlatformContent>(`/contents/${encodeURIComponent(id.value)}`)
    if (version !== requestVersion) return
    content.value = data
  } catch {
    if (version !== requestVersion) return
    content.value = null
    error.value = true
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

onLoad((options) => { id.value = String(options?.id || '') })
onShow(() => { void load() })
onUnload(() => { requestVersion++ })
</script>

<style scoped>
.reader { min-height: 100vh; background: #fff; color: #2b2c2c; }
.reader-inner { max-width: 760px; margin: 0 auto; padding: 60rpx 44rpx 120rpx; }
.reader-head { display: flex; flex-direction: column; align-items: flex-start; }
.reader-type { color: #c41e3a; font-size: 25rpx; font-weight: 600; margin-bottom: 26rpx; }
.reader-title { font-family: "Noto Serif CJK SC", "Songti SC", serif; font-size: 48rpx; font-weight: 600; line-height: 1.45; }
.reader-byline { color: #6e6e73; font-size: 27rpx; margin-top: 24rpx; }
.reader-lead { color: #55565a; font-size: 32rpx; line-height: 1.8; margin-top: 44rpx; }
.reader-cover { display: block; width: 100%; height: auto; margin-top: 44rpx; border-radius: 14rpx; }
.reader-body { border-top: 1rpx solid #e6e1da; margin-top: 52rpx; padding-top: 44rpx; }
.reader-rich { color: #2b2c2c; font-size: 36rpx; line-height: 1.95; word-break: break-word; }
.reader-empty { color: #6e6e73; font-size: 30rpx; }
.reader-state { min-height: 55vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48rpx; text-align: center; }
.state-title { font-size: 36rpx; color: #2b2c2c; font-weight: 600; }
.state-note { font-size: 28rpx; color: #6e6e73; margin-top: 18rpx; }
.retry { margin-top: 40rpx; background: #c41e3a; color: #fff; border-radius: 44rpx; padding: 0 48rpx; font-size: 30rpx; }
</style>
