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
        隐私政策
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
    const res: any = await (legalApi as any).getDoc?.('privacy-policy')
    content.value = res?.content || generateContent()
  } catch { content.value = generateContent() }
  uni.setNavigationBarTitle({ title: '隐私政策' })
})

function generateContent(): string {
  return `
    <h2>隐私政策</h2>
    <p>欢迎您使用国学传统文化平台（以下简称"本平台"）。本平台深知个人信息对您的重要性，并会尽全力保护您的个人信息安全可靠。</p>
    <h3>一、信息收集</h3>
    <p>我们在您使用服务时收集以下类型的信息：注册信息（昵称、手机号）、个人资料（头像、性别、生日）、使用记录（浏览、收藏、评论）等。</p>
    <h3>二、信息使用</h3>
    <p>我们收集的信息用于向您提供服务和改善用户体验，包括但不限于：账户管理、内容推荐、客户服务、安全保障等。</p>
    <h3>三、信息共享</h3>
    <p>我们不会向第三方分享您的个人信息，但以下情况除外：获得您的明确同意、法律法规要求、保护平台合法权益等。</p>
    <h3>四、信息安全</h3>
    <p>我们采用业界成熟的安全技术和措施保护您的个人信息安全，包括数据加密、访问控制、安全审计等。</p>
    <h3>五、您的权利</h3>
    <p>您有权查询、更正、删除您的个人信息，以及撤回授权、注销账户。您可以在"我的-设置"中行使上述权利。</p>
    <h3>六、联系我们</h3>
    <p>如您对隐私政策有任何疑问，请通过以下方式联系我们：客服热线 400-xxx-xxxx 或在线客服。</p>
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
