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
        用户协议
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
      <view class="doc-footer">
        <text class="doc-footer-text">
          最后更新：2026年1月1日
        </text>
        <text class="doc-footer-text">
          国学传统文化平台
        </text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const content = ref('')

onMounted(async () => {
  try {
    const { legalApi } = await import('../../api')
    const res: any = await (legalApi as any).getDoc?.('user-agreement')
    content.value = res?.content || generateContent()
  } catch { content.value = generateContent() }
  uni.setNavigationBarTitle({ title: '用户协议' })
})

function generateContent(): string {
  return `
    <h2>用户协议</h2>
    <p>欢迎您使用国学传统文化平台（以下简称"本平台"）。在注册和使用本平台前，请您仔细阅读本协议的全部内容。</p>
    <h3>一、账户注册</h3>
    <p>您需提供真实、准确的注册信息并保持更新。您对账户下的一切行为承担法律责任，请妥善保管账户信息。</p>
    <h3>二、服务内容</h3>
    <p>本平台提供包括但不限于：国学课程学习、传统文化内容浏览、社区交流、在线咨询等服务。平台保留调整服务内容的权利。</p>
    <h3>三、用户行为规范</h3>
    <p>用户在使用本平台时须遵守法律法规，不得发布违法信息、侵犯他人权益、干扰平台正常运行等行为。</p>
    <h3>四、知识产权</h3>
    <p>平台上所有内容的著作权、商标权等知识产权归平台或相关权利人所有，未经许可不得擅自使用。</p>
    <h3>五、免责声明</h3>
    <p>平台不对用户的行为做任何明示或暗示的担保。用户因使用平台产生的风险由用户自行承担。</p>
    <h3>六、协议变更</h3>
    <p>本平台有权根据需要修改本协议，修改后的协议一经发布即生效。如您继续使用服务，视为接受修改后的协议。</p>
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
.doc-content :deep(h2) { font-size: 36rpx; font-weight: 600; margin-bottom: 24rpx; text-align: center; }
.doc-content :deep(h3) { font-size: 30rpx; font-weight: 500; margin-top: 32rpx; margin-bottom: 16rpx; }
.doc-content :deep(p) { margin-bottom: 16rpx; text-indent: 2em; color: #444; }
.doc-footer { margin-top: 48rpx; padding-top: 24rpx; border-top: 1rpx solid #f5f5f5; text-align: center; }
.doc-footer-text { font-size: 22rpx; color: #ccc; display: block; margin-bottom: 8rpx; }
</style>
