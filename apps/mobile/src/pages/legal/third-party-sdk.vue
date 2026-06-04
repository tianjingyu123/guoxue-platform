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
        第三方SDK列表
      </text>
      <view style="width:60rpx" />
    </view>
    <scroll-view
      scroll-y
      class="content-scroll"
    >
      <text class="page-desc">
        以下为我们使用的第三方SDK清单。这些SDK可能会收集您的个人信息，我们会对合作方进行严格的安全监督。
      </text>
      <view
        v-for="sdk in sdks"
        :key="sdk.name"
        class="sdk-card"
      >
        <view class="sdk-header">
          <text class="sdk-name">
            {{ sdk.name }}
          </text>
          <text class="sdk-purpose">
            {{ sdk.purpose }}
          </text>
        </view>
        <view class="sdk-body">
          <view class="sdk-row">
            <text class="sdk-label">
              使用目的
            </text><text class="sdk-value">
              {{ sdk.purpose }}
            </text>
          </view>
          <view class="sdk-row">
            <text class="sdk-label">
              收集信息
            </text><text class="sdk-value">
              {{ sdk.data }}
            </text>
          </view>
          <view class="sdk-row">
            <text class="sdk-label">
              隐私链接
            </text><text
              class="sdk-value link"
              @click="openLink(sdk.link)"
            >
              {{ sdk.link }}
            </text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const sdks = ref([
  { name: '微信SDK', purpose: '微信登录、分享、支付', data: '设备信息、网络状态', link: 'https://privacy.qq.com/' },
  { name: '支付宝SDK', purpose: '支付宝支付', data: '设备信息、网络状态', link: 'https://render.alipay.com/p/c/k2h4n8e1' },
  { name: '极光推送', purpose: '消息推送服务', data: '设备标识符、网络信息', link: 'https://www.jiguang.cn/agreement/privacy' },
  { name: '腾讯地图', purpose: '位置服务、同城功能', data: '位置信息、设备信息', link: 'https://privacy.qq.com/' },
  { name: '阿里云OSS', purpose: '图片存储服务', data: '无个人信息收集', link: 'https://terms.aliyun.com/' },
  { name: '友盟统计', purpose: '数据统计分析', data: '设备信息、使用记录', link: 'https://www.umeng.com/policy' },
])

function openLink(url: string) {
  uni.showToast({ title: '即将跳转至第三方隐私链接', icon: 'none' })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; position: sticky; top: 0; z-index: 10; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content-scroll { padding: 24rpx; }
.page-desc { font-size: 24rpx; color: #666; line-height: 1.6; display: block; margin-bottom: 20rpx; }
.sdk-card { background: #fff; border-radius: 16rpx; margin-bottom: 16rpx; overflow: hidden; }
.sdk-header { background: linear-gradient(135deg, #C41E3A, #9a1830); padding: 20rpx 24rpx; }
.sdk-name { font-size: 28rpx; font-weight: 600; color: #fff; display: block; margin-bottom: 4rpx; }
.sdk-purpose { font-size: 22rpx; color: rgba(255,255,255,0.8); display: block; }
.sdk-body { padding: 20rpx 24rpx; }
.sdk-row { display: flex; padding: 10rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.sdk-row:last-child { border-bottom: none; }
.sdk-label { font-size: 24rpx; color: #999; width: 140rpx; flex-shrink: 0; }
.sdk-value { font-size: 24rpx; color: #2C2C2C; flex: 1; }
.sdk-value.link { color: #1976d2; text-decoration: underline; }
</style>
