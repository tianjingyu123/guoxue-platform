<template>
  <view class="page">
    <rich-text :nodes="content" class="doc-content" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const content = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const route = pages[pages.length - 1]?.route || ''
  const title = route.includes('privacy') ? '隐私政策' :
    route.includes('user-agreement') ? '用户协议' :
    route.includes('child-privacy') ? '儿童隐私保护' :
    route.includes('third-party-sdk') ? '第三方SDK列表' :
    route.includes('teen-mode-intro') ? '青少年模式说明' :
    route.includes('data-collection') ? '个人信息收集清单' : '法律文档'
  content.value = `<h2>${title}</h2><p>相关法律文档内容将在此展示。</p>`
  uni.setNavigationBarTitle({ title })
})
</script>

<style>
.page { background: #fff; min-height: 100vh; padding: 20px 16px; }
.doc-content { font-size: 14px; line-height: 1.8; }
</style>
