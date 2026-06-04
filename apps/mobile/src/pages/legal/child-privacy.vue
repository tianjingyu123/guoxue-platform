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
        儿童隐私保护
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

const content = ref('')

onMounted(async () => {
  try {
    const { legalApi } = await import('../../api')
    const res: any = await (legalApi as any).getDoc?.('child-privacy')
    content.value = res?.content || generateContent()
  } catch { content.value = generateContent() }
  uni.setNavigationBarTitle({ title: '儿童隐私保护' })
})

function generateContent(): string {
  return `
    <h2>未成年人/儿童隐私保护声明</h2>
    <p>我们高度重视未成年人个人信息的保护。如果您是未满14周岁的儿童，请在监护人陪同下阅读本声明。</p>
    <h3>一、监护人须知</h3>
    <p>我们建议监护人指导儿童在使用本平台时遵守网络礼仪和法律法规。监护人应当履行监护职责，保护儿童个人信息安全。</p>
    <h3>二、信息收集</h3>
    <p>在未获得监护人同意的情况下，我们不会收集儿童的个人信息。如确需收集，将征得监护人的明确同意。</p>
    <h3>三、信息保护</h3>
    <p>我们采取严格的安全措施保护儿童个人信息，包括加密存储、访问控制、最小化收集原则等。</p>
    <h3>四、监护人权利</h3>
    <p>监护人有权查询、更正、删除被监护儿童的个人信息，以及撤回同意。请联系我们行使上述权利。</p>
  `
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #fff; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; position: sticky; top: 0; z-index: 10; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content-scroll { padding: 32rpx 24rpx; }
.doc-content { font-size: 28rpx; line-height: 1.8; color: #2C2C2C; }
.doc-content :deep(h2) { font-size: 34rpx; font-weight: 600; margin-bottom: 24rpx; }
.doc-content :deep(h3) { font-size: 28rpx; font-weight: 500; margin-top: 28rpx; margin-bottom: 12rpx; }
.doc-content :deep(p) { margin-bottom: 16rpx; text-indent: 2em; color: #444; }
</style>
