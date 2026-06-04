<template>
  <view class="page">
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="header-title">生成海报</text>
        <view style="width:60rpx" />
      </view>
    </view>

    <scroll-view scroll-y class="content-scroll">
      <!-- 海报预览 -->
      <view class="poster-preview">
        <view class="poster" :class="'t-' + selectedTemplate">
          <view class="poster-deco">
            <view class="poster-logo">
              <text class="pl-icon">🏛</text>
            </view>
            <text class="pl-brand">国学平台</text>
          </view>
          <view class="poster-body">
            <text class="pb-title">{{ sceneConfig.title }}</text>
            <text class="pb-subtitle">{{ sceneConfig.subtitle }}</text>
            <view class="pb-user">
              <text class="pb-avatar">👤</text>
              <view><text class="pb-name">国学爱好者</text><text class="pb-invite">邀请你一起探索国学</text></view>
            </view>
            <view class="pb-qrcode">
              <text class="qr-icon">📱</text>
              <text class="qr-tip">长按或扫码识别</text>
            </view>
            <text class="pb-reward">{{ sceneConfig.reward }}</text>
          </view>
          <view class="poster-footer">
            <text class="pf-text">国学平台 · 探索传统文化</text>
          </view>
        </view>
      </view>

      <!-- 模板选择 -->
      <view class="section">
        <text class="section-label">选择模板</text>
        <scroll-view scroll-x class="templates-scroll" show-scrollbar="false">
          <view v-for="t in posterTemplates" :key="t.id" class="template-thumb" :class="{ active: selectedTemplate === t.id }" @click="selectedTemplate = t.id">
            <view class="tt-preview" :class="t.bgClass">
              <text class="tt-icon">🖼</text>
            </view>
            <text class="tt-name" :class="{ active: selectedTemplate === t.id }">{{ t.name }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 提示 -->
      <view class="tip-card">
        <text class="tip-text">分享后若有朋友通过你的海报进入平台，你将获得推广奖励</text>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-inner">
        <view class="bb-btn" @click="savePoster">
          <text v-if="isSaving">⏳</text>
          <text v-else-if="isSaved">✅ 已保存</text>
          <text v-else>💾 保存图片</text>
        </view>
        <view class="bb-btn primary" @click="showShare = true">📤 直接分享</view>
      </view>
    </view>

    <!-- 分享菜单 -->
    <view v-if="showShare" class="share-overlay" @click="showShare = false">
      <view class="share-sheet" @click.stop>
        <view class="share-header"><text class="share-title">分享至</text></view>
        <view class="share-grid">
          <view v-for="s in shareTargets" :key="s.name" class="share-item" @click="shareTo(s)">
            <view class="si-icon" :style="{ background: s.color }"><text>{{ s.icon }}</text></view>
            <text class="si-name">{{ s.name }}</text>
          </view>
        </view>
        <view class="share-cancel" @click="showShare = false">取消</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const selectedTemplate = ref('classic'); const isSaving = ref(false); const isSaved = ref(false); const showShare = ref(false)

const posterTemplates = [
  { id: 'classic', name: '国风经典', bgClass: 'bg-classic' },
  { id: 'modern', name: '简约现代', bgClass: 'bg-modern' },
  { id: 'ink', name: '水墨丹青', bgClass: 'bg-ink' },
  { id: 'gold', name: '金色华章', bgClass: 'bg-gold' },
]

const sceneConfigs: Record<string, { title: string; subtitle: string; reward: string }> = {
  invite: { title: '邀请好友', subtitle: '与好友一起探索国学智慧', reward: '邀请1位好友，双方各得7天会员' },
  course: { title: '八字命理入门精讲', subtitle: '国学大师倾情授课', reward: '好友购买后你可获得10%返佣' },
  circle: { title: '八字命理研习社', subtitle: '1,280位圈友共同学习', reward: '邀请入圈可获得5%分成' },
  paipan: { title: '我的八字排盘结果', subtitle: 'AI智能命理分析', reward: '分享后好友可免费体验' },
}

const shareTargets = [
  { name: '微信好友', icon: '💬', color: '#07c160' },
  { name: '朋友圈', icon: '🌐', color: '#07c160' },
  { name: 'QQ好友', icon: '🐧', color: '#12b7f5' },
  { name: '微博', icon: '📢', color: '#e6162d' },
]

const sceneConfig = computed(() => sceneConfigs.invite)

async function savePoster() {
  isSaving.value = true
  await new Promise(r => setTimeout(r, 1500))
  isSaving.value = false; isSaved.value = true
  setTimeout(() => isSaved.value = false, 2000)
  uni.showToast({ title: '已保存到相册' })
}

function shareTo(target: any) {
  showShare.value = false
  uni.showToast({ title: `分享至${target.name}` })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 140rpx; }
.header { background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content-scroll { padding-bottom: 40rpx; }
.poster-preview { padding: 40rpx 24rpx; display: flex; justify-content: center; }
.poster { width: 480rpx; border-radius: 24rpx; overflow: hidden; box-shadow: 0 8rpx 48rpx rgba(0,0,0,0.12); }
.poster.t-classic { background: linear-gradient(180deg, #fef0f0, #fff); }
.poster.t-modern { background: linear-gradient(180deg, #1a1a2e, #16213e); color: #fff; }
.poster.t-ink { background: linear-gradient(180deg, #f5f0e8, #e8e0d0); }
.poster.t-gold { background: linear-gradient(180deg, #8b6914, #a08030); color: #fff; }
.poster-deco { padding: 32rpx; text-align: center; position: relative; }
.poster-logo { width: 88rpx; height: 88rpx; background: rgba(196,30,58,0.1); border-radius: 20rpx; display: flex; align-items: center; justify-content: center; margin: 0 auto 12rpx; }
.poster.t-modern .poster-logo { background: rgba(255,255,255,0.15); }
.poster.t-gold .poster-logo { background: rgba(255,255,255,0.15); }
.pl-icon { font-size: 36rpx; }
.pl-brand { font-size: 28rpx; font-weight: bold; color: #C41E3A; }
.poster.t-modern .pl-brand, .poster.t-gold .pl-brand { color: #fff; }
.poster.t-ink .pl-brand { color: #5a3a1a; }
.poster-body { padding: 0 32rpx 24rpx; }
.pb-title { font-size: 36rpx; font-weight: bold; display: block; text-align: center; }
.pb-subtitle { font-size: 24rpx; color: #999; display: block; text-align: center; margin-top: 8rpx; }
.poster.t-modern .pb-subtitle, .poster.t-gold .pb-subtitle { color: rgba(255,255,255,0.7); }
.pb-user { display: flex; align-items: center; gap: 12rpx; padding: 20rpx; background: rgba(0,0,0,0.04); border-radius: 16rpx; margin-top: 24rpx; }
.poster.t-modern .pb-user, .poster.t-gold .pb-user { background: rgba(255,255,255,0.1); }
.pb-avatar { font-size: 40rpx; }
.pb-name { font-size: 24rpx; font-weight: 500; display: block; }
.pb-invite { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
.pb-qrcode { display: flex; flex-direction: column; align-items: center; margin-top: 24rpx; }
.qr-icon { font-size: 80rpx; }
.qr-tip { font-size: 20rpx; color: #999; margin-top: 8rpx; }
.pb-reward { font-size: 22rpx; text-align: center; padding: 12rpx; background: rgba(196,30,58,0.08); border-radius: 12rpx; margin-top: 16rpx; color: #C41E3A; }
.poster.t-gold .pb-reward { background: rgba(255,255,255,0.15); color: #f0d88a; }
.poster-footer { padding: 16rpx 32rpx; border-top: 1rpx solid rgba(0,0,0,0.06); text-align: center; }
.pf-text { font-size: 20rpx; color: #999; }
.poster.t-modern .poster-footer, .poster.t-gold .poster-footer { border-color: rgba(255,255,255,0.15); }
.poster.t-modern .pf-text, .poster.t-gold .pf-text { color: rgba(255,255,255,0.5); }
.section { padding: 0 24rpx; margin-bottom: 24rpx; }
.section-label { font-size: 26rpx; font-weight: 500; color: #555; display: block; margin-bottom: 16rpx; }
.templates-scroll { white-space: nowrap; }
.template-thumb { display: inline-block; width: 140rpx; margin-right: 16rpx; border-radius: 16rpx; overflow: hidden; border: 2rpx solid transparent; }
.template-thumb.active { border-color: #C41E3A; }
.tt-preview { height: 180rpx; display: flex; align-items: center; justify-content: center; }
.bg-classic { background: linear-gradient(180deg, #fef0f0, #fff); }
.bg-modern { background: linear-gradient(180deg, #1a1a2e, #16213e); }
.bg-ink { background: linear-gradient(180deg, #f5f0e8, #e8e0d0); }
.bg-gold { background: linear-gradient(180deg, #8b6914, #a08030); }
.tt-icon { font-size: 36rpx; }
.tt-name { font-size: 22rpx; text-align: center; padding: 12rpx 0; color: #999; display: block; }
.tt-name.active { color: #C41E3A; font-weight: 500; }
.tip-card { margin: 0 24rpx; padding: 20rpx; background: #fef0f0; border-radius: 12rpx; }
.tip-text { font-size: 24rpx; color: #C41E3A; text-align: center; line-height: 1.6; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E5E1DB; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bottom-inner { display: flex; gap: 16rpx; }
.bb-btn { flex: 1; text-align: center; padding: 20rpx; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #666; }
.bb-btn.primary { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.share-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.share-sheet { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; }
.share-header { padding: 24rpx; text-align: center; border-bottom: 1rpx solid #E5E1DB; }
.share-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.share-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; padding: 32rpx 24rpx; }
.share-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.si-icon { width: 80rpx; height: 80rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
.si-name { font-size: 22rpx; color: #666; }
.share-cancel { text-align: center; padding: 20rpx; font-size: 28rpx; color: #2C2C2C; border-top: 1rpx solid #E5E1DB; }
</style>
