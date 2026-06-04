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
        分享
      </text>
      <view style="width:60rpx" />
    </view>

    <!-- 内容展示 -->
    <scroll-view
      scroll-y
      class="content-scroll"
    >
      <view class="preview-card">
        <view
          v-if="data.cover"
          class="preview-cover-wrap"
        >
          <image
            :src="data.cover"
            class="preview-cover"
            mode="aspectFill"
          />
          <view class="preview-overlay" />
        </view>
        <view class="preview-body">
          <text class="preview-title">
            {{ data.title || '国学精彩内容' }}
          </text>
          <text class="preview-desc">
            {{ data.description || data.subtitle || '来自国学传统文化平台的精选内容' }}
          </text>
        </view>
        <view class="preview-footer">
          <text class="preview-brand">
            国学传统文化平台
          </text>
          <text class="preview-qr">
            📱 扫码查看
          </text>
        </view>
      </view>

      <!-- 分享方式 -->
      <view class="share-section">
        <text class="share-section-title">
          分享到
        </text>
        <view class="share-grid">
          <view
            class="share-item"
            @click="shareTo('wechat')"
          >
            <view class="share-icon wechat">
              <text>💬</text>
            </view>
            <text class="share-label">
              微信
            </text>
          </view>
          <view
            class="share-item"
            @click="shareTo('moments')"
          >
            <view class="share-icon moments">
              <text>🔄</text>
            </view>
            <text class="share-label">
              朋友圈
            </text>
          </view>
          <view
            class="share-item"
            @click="shareTo('qq')"
          >
            <view class="share-icon qq">
              <text>🐧</text>
            </view>
            <text class="share-label">
              QQ
            </text>
          </view>
          <view
            class="share-item"
            @click="shareTo('weibo')"
          >
            <view class="share-icon weibo">
              <text>📢</text>
            </view>
            <text class="share-label">
              微博
            </text>
          </view>
          <view
            class="share-item"
            @click="shareTo('link')"
          >
            <view class="share-icon link">
              <text>🔗</text>
            </view>
            <text class="share-label">
              复制链接
            </text>
          </view>
          <view
            class="share-item"
            @click="shareTo('poster')"
          >
            <view class="share-icon poster">
              <text>🎨</text>
            </view>
            <text class="share-label">
              生成海报
            </text>
          </view>
        </view>
      </view>

      <!-- 分享文案 -->
      <view class="caption-section">
        <text class="share-section-title">
          分享文案
        </text>
        <textarea
          v-model="caption"
          class="caption-input"
          placeholder="说点什么..."
          maxlength="200"
        />
        <text class="caption-count">
          {{ caption.length }}/200
        </text>
      </view>

      <!-- 其他操作 -->
      <view class="actions-section">
        <view
          class="action-row"
          @click="download"
        >
          <text class="action-icon">
            📥
          </text>
          <text class="action-text">
            保存到相册
          </text>
        </view>
        <view
          class="action-row"
          @click="report"
        >
          <text class="action-icon">
            🚫
          </text>
          <text class="action-text">
            举报
          </text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { shareApi } from '../../api'

const data = ref<any>({})
const caption = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const opts = (pages[pages.length - 1] as any)?.options || {}
  data.value = {
    id: opts.id,
    title: opts.title || '',
    subtitle: opts.subtitle || '',
    cover: opts.cover || '',
    description: opts.description || '',
    type: opts.type || 'article',
  }
  caption.value = `「${data.value.title}」- 来自国学传统文化平台，推荐给你！`
})

function shareTo(target: string) {
  switch (target) {
    case 'wechat':
    case 'moments':
    case 'qq':
      uni.showToast({ title: `已跳转到${target === 'wechat' ? '微信' : target === 'moments' ? '朋友圈' : 'QQ'}分享`, icon: 'none' })
      break
    case 'weibo':
      uni.showToast({ title: '已跳转到微博分享', icon: 'none' })
      break
    case 'link':
      uni.setClipboardData({ data: `https://guoxue.app/share?id=${data.value.id}`, success: () => uni.showToast({ title: '链接已复制' }) })
      break
    case 'poster':
      uni.navigateTo({ url: `/pages/common/share-poster?id=${data.value.id}` })
      break
  }
}

function download() { uni.showToast({ title: '保存成功', icon: 'success' }) }
function report() { uni.showToast({ title: '已提交举报', icon: 'none' }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content-scroll { padding: 24rpx; }
.preview-card { background: #fff; border-radius: 20rpx; overflow: hidden; margin-bottom: 24rpx; }
.preview-cover-wrap { position: relative; height: 320rpx; }
.preview-cover { width: 100%; height: 100%; }
.preview-overlay { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.4) 0%, transparent 60%); }
.preview-body { padding: 24rpx; }
.preview-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 8rpx; }
.preview-desc { font-size: 26rpx; color: #666; line-height: 1.6; display: block; }
.preview-footer { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 24rpx; border-top: 1rpx solid #f5f5f5; }
.preview-brand { font-size: 22rpx; color: #999; }
.preview-qr { font-size: 22rpx; color: #C41E3A; }
.share-section { background: #fff; border-radius: 20rpx; padding: 32rpx; margin-bottom: 20rpx; }
.share-section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 20rpx; }
.share-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; }
.share-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.share-icon { width: 88rpx; height: 88rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.share-icon.wechat { background: #e8f5e9; }
.share-icon.moments { background: #e3f2fd; }
.share-icon.qq { background: #e3f2fd; }
.share-icon.weibo { background: #fce4ec; }
.share-icon.link { background: #f5f5f5; }
.share-icon.poster { background: #fff3e0; }
.share-label { font-size: 22rpx; color: #666; }
.caption-section { background: #fff; border-radius: 20rpx; padding: 32rpx; margin-bottom: 20rpx; }
.caption-input { width: 100%; min-height: 120rpx; padding: 16rpx; background: #F5F0E8; border-radius: 12rpx; font-size: 26rpx; color: #2C2C2C; box-sizing: border-box; }
.caption-count { font-size: 20rpx; color: #ccc; display: block; text-align: right; margin-top: 8rpx; }
.actions-section { background: #fff; border-radius: 20rpx; overflow: hidden; margin-bottom: 40rpx; }
.action-row { display: flex; align-items: center; gap: 16rpx; padding: 24rpx 32rpx; border-bottom: 1rpx solid #f5f5f5; }
.action-row:last-child { border-bottom: none; }
.action-icon { font-size: 32rpx; }
.action-text { font-size: 26rpx; color: #2C2C2C; }
</style>
