<template>
  <view class="page">
    <view class="header">
      <text
        class="back-btn"
        @click="goBack"
      >
        ‹
      </text>
      <text class="header-title">
        {{ title }}
      </text>
      <view style="width:60rpx" />
    </view>
    <scroll-view
      scroll-y
      class="content-scroll"
    >
      <rich-text
        :nodes="content"
        class="doc-content"
      />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const content = ref('<p>内容加载中...</p>')
const title = ref('协议与政策')

onMounted(() => {
  const opts = getCurrentPages().pop()?.options || {}
  const type = opts.type || opts.title || ''
  const nameMap: Record<string, string> = {
    'privacy-policy': '隐私政策',
    'user-agreement': '用户协议',
    'child-privacy': '儿童隐私保护',
    'third-party-sdk': '第三方SDK列表',
    'teen-mode-intro': '青少年模式说明',
    'data-collection': '个人信息收集清单',
  }
  title.value = nameMap[type] || opts.title || '协议与政策'
  if (title.value) uni.setNavigationBarTitle({ title: title.value })
  // Load content from API or static
  loadDocContent(type)
})

async function loadDocContent(type: string) {
  try {
    const { legalApi } = await import('../../api')
    const res: any = await (legalApi as any).getDoc?.(type)
    content.value = res?.content || `<h2>${title.value}</h2><p>文档内容加载中...</p>`
  } catch {
    content.value = `<h2>${title.value}</h2><p>相关法律文档内容将在此展示。我们重视您的隐私权益，请查阅完整文档了解详情。</p>`
  }
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #fff; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content-scroll { padding: 32rpx 24rpx; }
.doc-content { font-size: 28rpx; line-height: 1.8; color: #2C2C2C; }
.doc-content :deep(h2) { font-size: 34rpx; font-weight: 600; margin-bottom: 20rpx; }
.doc-content :deep(h3) { font-size: 30rpx; font-weight: 500; margin-top: 24rpx; margin-bottom: 12rpx; }
.doc-content :deep(p) { margin-bottom: 16rpx; text-indent: 2em; }
.doc-content :deep(ul), .doc-content :deep(ol) { padding-left: 40rpx; margin-bottom: 16rpx; }
.doc-content :deep(li) { margin-bottom: 8rpx; }
</style>
