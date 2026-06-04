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
        个人信息收集清单
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
    const res: any = await (legalApi as any).getDoc?.('data-collection')
    content.value = res?.content || generateContent()
  } catch { content.value = generateContent() }
  uni.setNavigationBarTitle({ title: '个人信息收集清单' })
})

function generateContent(): string {
  return `
    <h2>个人信息收集清单</h2>
    <p>为向您提供本平台服务，我们会收集以下个人信息：</p>
    <h3>1. 注册登录信息</h3>
    <p>手机号码、昵称、头像、密码（加密存储）</p>
    <h3>2. 个人资料</h3>
    <p>性别、出生日期、地区、个人简介、实名认证信息</p>
    <h3>3. 使用记录</h3>
    <p>浏览记录、搜索记录、收藏内容、学习进度、购买记录</p>
    <h3>4. 互动信息</h3>
    <p>评论内容、点赞记录、关注列表、私信内容</p>
    <h3>5. 设备信息</h3>
    <p>设备型号、操作系统版本、唯一设备标识符、网络信息</p>
    <h3>6. 位置信息</h3>
    <p>精确或大致地理位置（需您授权）</p>
    <p>以上信息的收集范围以最小必要为原则，您可以在"隐私授权管理"中管理相关权限。</p>
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
.doc-content :deep(h3) { font-size: 28rpx; font-weight: 500; margin-top: 28rpx; margin-bottom: 12rpx; color: #C41E3A; }
.doc-content :deep(p) { margin-bottom: 12rpx; color: #444; }
</style>
