<template>
  <view class="poster-page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="22" color="#1f2937" />
      </view>
      <text class="nav-title">生成海报</text>
      <view class="nav-placeholder" />
    </view>

    <scroll-view scroll-y class="body">
      <!-- 海报预览 -->
      <view class="preview-wrap">
        <view class="poster" :class="'tpl-' + selectedTemplate">
          <!-- 头部装饰 -->
          <view class="poster-head">
            <view class="poster-logo">
              <app-icon :name="sceneConfig.icon" :size="28" :color="logoColor" />
            </view>
            <text class="poster-brand">{{ BRAND.name }}</text>
          </view>

          <!-- 内容 -->
          <view class="poster-body">
            <text class="poster-title">{{ sceneConfig.title }}</text>
            <text class="poster-subtitle">{{ sceneConfig.subtitle }}</text>

            <!-- 用户信息（真实登录用户·未登录回退通用署名） -->
            <view class="poster-user">
              <smart-avatar class="user-avatar" :src="userAvatar" :name="userName" />
              <view class="user-info">
                <text class="user-name">{{ userName }}</text>
                <text class="user-desc">邀请你一起探索国学</text>
              </view>
            </view>

            <!-- 二维码 -->
            <view class="poster-qr">
              <view class="qr-box">
                <app-icon name="qr-code" :size="80" color="#1f2937" />
              </view>
              <text class="qr-tip">长按或扫码识别</text>
            </view>

            <!-- 奖励 -->
            <view class="poster-reward">{{ sceneConfig.reward }}</view>
          </view>

          <!-- 底部 -->
          <view class="poster-foot">
            <view class="foot-logo">
              <app-icon name="compass" :size="16" :color="logoColor" />
            </view>
            <text class="foot-text">{{ BRAND.name }} · 探索易学智慧</text>
          </view>
        </view>
      </view>

      <!-- 模板选择 -->
      <view class="section">
        <text class="section-title">选择模板</text>
        <scroll-view scroll-x class="tpl-list">
          <view
            v-for="tpl in posterTemplates"
            :key="tpl.id"
            class="tpl-item"
            :class="{ 'tpl-active': selectedTemplate === tpl.id }"
            @tap="selectedTemplate = tpl.id"
          >
            <view class="tpl-thumb" :class="'tpl-' + tpl.id">
              <view class="tpl-thumb-icon">
                <app-icon name="sparkles" :size="16" :color="tpl.id === 'modern' ? '#fff' : '#C41E3A'" />
              </view>
            </view>
            <text class="tpl-name" :class="{ 'tpl-name-active': selectedTemplate === tpl.id }">{{ tpl.name }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 提示 -->
      <view class="tip-card">
        <text class="tip-text">分享后若有朋友通过你的海报进入平台，你将获得推广奖励</text>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="action-bar">
      <view class="action-btn action-save" :class="{ 'action-saved': isSaved }" @tap="handleSave">
        <view v-if="isSaving" class="spinner" />
        <template v-else-if="isSaved">
          <app-icon name="check" :size="20" color="#fff" />
          <text class="action-text action-text-light">已保存到相册</text>
        </template>
        <template v-else>
          <app-icon name="download" :size="20" color="#1f2937" />
          <text class="action-text">保存图片</text>
        </template>
      </view>
      <view class="action-btn action-share" @tap="showShareMenu = true">
        <app-icon name="share-2" :size="20" color="#fff" />
        <text class="action-text action-text-light">直接分享</text>
      </view>
    </view>

    <!-- 分享菜单 -->
    <view v-if="showShareMenu" class="share-mask" @tap="showShareMenu = false">
      <view class="share-sheet" @tap.stop>
        <view class="share-header">
          <text class="share-header-title">分享至</text>
        </view>
        <view class="share-grid">
          <view v-for="item in shareChannels" :key="item.name" class="share-channel">
            <view class="channel-icon" :style="{ background: item.color }">
              <app-icon :name="item.icon" :size="24" color="#fff" />
            </view>
            <text class="channel-name">{{ item.name }}</text>
          </view>
        </view>
        <view class="share-cancel" @tap="showShareMenu = false">取消</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { BRAND } from '@/lib/brand'
import { mineApi } from '@/lib/mine-data'

type SceneKey = 'invite' | 'course' | 'circle' | 'paipan'

const posterTemplates = [
  { id: 'classic', name: '国风经典' },
  { id: 'modern', name: '简约现代' },
  { id: 'ink', name: '水墨丹青' },
  { id: 'gold', name: '金色华章' },
]

const sceneConfigs: Record<SceneKey, { title: string; subtitle: string; icon: string; reward: string }> = {
  invite: { title: '邀请好友', subtitle: '与好友一起探索国学智慧', icon: 'gift', reward: '邀请1位好友，双方各得7天会员' },
  course: { title: '八字命理入门精讲', subtitle: '周易大师倾情授课', icon: 'book-open', reward: '好友购买后你可获得10%返佣' },
  circle: { title: '八字命理研习社', subtitle: '1,280位圈友共同学习', icon: 'users', reward: '邀请入圈可获得5%分成' },
  paipan: { title: '我的八字排盘结果', subtitle: 'AI智能命理分析', icon: 'sparkles', reward: '分享后好友可免费体验' },
}

const shareChannels = [
  { name: '微信好友', icon: 'message-circle', color: '#07c160' },
  { name: '朋友圈', icon: 'users', color: '#06ad56' },
  { name: 'QQ好友', icon: 'message-square', color: '#1e90ff' },
  { name: '微博', icon: 'share-2', color: '#e6162d' },
]

const scene = ref<SceneKey>('invite')
const selectedTemplate = ref('classic')
const isSaving = ref(false)
const isSaved = ref(false)
const showShareMenu = ref(false)

const sceneConfig = computed(() => sceneConfigs[scene.value] || sceneConfigs.invite)
const logoColor = computed(() => (selectedTemplate.value === 'modern' ? '#fff' : '#C41E3A'))

// 海报署名用真实登录用户（原硬编码演示用户"李易安"违反数据流铁律）；未登录/失败回退通用署名
const userName = ref('国学同道')
const userAvatar = ref('')

onLoad((options?: Record<string, string>) => {
  const s = options?.scene as SceneKey
  if (s && sceneConfigs[s]) scene.value = s
  mineApi.getProfile().then((p) => {
    if (p?.nickname) userName.value = p.nickname
    if (p?.avatar) userAvatar.value = p.avatar
  }).catch(() => { /* 未登录保持通用署名 */ })
})

function handleSave() {
  if (isSaving.value) return
  isSaving.value = true
  setTimeout(() => {
    isSaving.value = false
    isSaved.value = true
    uni.showToast({ title: '已保存到相册', icon: 'success' })
    setTimeout(() => { isSaved.value = false }, 2000)
  }, 1500)
}
</script>

<style scoped>
.poster-page {
  min-height: 100vh;
  background: #f5f5f4;
  display: flex;
  flex-direction: column;
}

.nav {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  padding-top: var(--status-bar-height, 0);
  background: rgba(245, 245, 244, 0.95);
  border-bottom: 1rpx solid #e7e5e4;
}

.nav-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #1f2937; }
.nav-placeholder { width: 56rpx; }

.body { flex: 1; }

.preview-wrap {
  padding: 48rpx;
  display: flex;
  justify-content: center;
}

.poster {
  width: 576rpx;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.18);
}

.tpl-classic { background: linear-gradient(to bottom, rgba(196, 30, 45, 0.12), rgba(201, 169, 110, 0.08), #fff); }
.tpl-modern { background: linear-gradient(to bottom, #0f172a, #1e293b, #0f172a); }
.tpl-ink { background: linear-gradient(to bottom, #f5f5f4, #fafaf9, #f5f5f4); }
.tpl-gold { background: linear-gradient(to bottom, rgba(120, 53, 15, 0.85), rgba(146, 64, 14, 0.6), rgba(120, 53, 15, 0.85)); }

.poster-head {
  height: 220rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.poster-logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: rgba(196, 30, 45, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tpl-modern .poster-logo, .tpl-gold .poster-logo { background: rgba(255, 255, 255, 0.2); }

.poster-brand {
  font-size: 36rpx;
  font-weight: bold;
  margin-top: 16rpx;
  color: #1f2937;
}
.tpl-modern .poster-brand, .tpl-gold .poster-brand { color: #fff; }
.tpl-ink .poster-brand { color: #292524; }

.poster-body { padding: 32rpx 48rpx; }

.poster-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  text-align: center;
  color: #1f2937;
}
.tpl-modern .poster-title, .tpl-gold .poster-title { color: #fff; }
.tpl-ink .poster-title { color: #292524; }

.poster-subtitle {
  display: block;
  font-size: 26rpx;
  text-align: center;
  margin-top: 8rpx;
  color: #6b7280;
}
.tpl-modern .poster-subtitle, .tpl-gold .poster-subtitle { color: rgba(255, 255, 255, 0.7); }

.poster-user {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 40rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: rgba(0, 0, 0, 0.04);
}
.tpl-modern .poster-user, .tpl-gold .poster-user { background: rgba(255, 255, 255, 0.1); }

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(196, 30, 45, 0.15);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
}
.user-avatar-img {
  background: #f5f5f4;
}

.user-info { flex: 1; }
.user-name { display: block; font-size: 28rpx; font-weight: 500; color: #1f2937; }
.tpl-modern .user-name, .tpl-gold .user-name { color: #fff; }
.tpl-ink .user-name { color: #292524; }
.user-desc { display: block; font-size: 22rpx; color: #6b7280; margin-top: 4rpx; }
.tpl-modern .user-desc, .tpl-gold .user-desc { color: rgba(255, 255, 255, 0.6); }

.poster-qr {
  margin-top: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-box {
  width: 200rpx;
  height: 200rpx;
  border-radius: 24rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-tip { font-size: 22rpx; margin-top: 16rpx; color: #6b7280; }
.tpl-modern .qr-tip, .tpl-gold .qr-tip { color: rgba(255, 255, 255, 0.6); }

.poster-reward {
  margin-top: 32rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  text-align: center;
  font-size: 22rpx;
  background: rgba(201, 169, 110, 0.12);
  color: #b8893a;
}
.tpl-modern .poster-reward { background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8); }
.tpl-gold .poster-reward { background: rgba(245, 158, 11, 0.2); color: #fde68a; }

.poster-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx 48rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.08);
}
.tpl-modern .poster-foot { border-top-color: rgba(255, 255, 255, 0.1); }

.foot-logo {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  background: rgba(196, 30, 45, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tpl-modern .foot-logo, .tpl-gold .foot-logo { background: rgba(255, 255, 255, 0.15); }

.foot-text { font-size: 22rpx; color: #9ca3af; }
.tpl-modern .foot-text, .tpl-gold .foot-text { color: rgba(255, 255, 255, 0.5); }

.section { padding: 0 32rpx; }
.section-title { display: block; font-size: 28rpx; font-weight: 500; color: #1f2937; margin-bottom: 24rpx; }

.tpl-list { white-space: nowrap; }

.tpl-item {
  display: inline-block;
  width: 160rpx;
  margin-right: 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
  border: 4rpx solid transparent;
  vertical-align: top;
}

.tpl-active { border-color: var(--brand); box-shadow: 0 8rpx 24rpx rgba(196, 30, 45, 0.2); }

.tpl-thumb {
  height: 220rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tpl-thumb-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(196, 30, 45, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tpl-thumb.tpl-modern .tpl-thumb-icon { background: rgba(255, 255, 255, 0.2); }

.tpl-name {
  display: block;
  padding: 16rpx 0;
  text-align: center;
  font-size: 22rpx;
  background: #fff;
  color: #6b7280;
}
.tpl-name-active { color: var(--brand); font-weight: 500; }

.tip-card {
  margin: 48rpx 32rpx 0;
  padding: 24rpx;
  border-radius: 16rpx;
  background: rgba(201, 169, 110, 0.06);
  border: 1rpx solid rgba(201, 169, 110, 0.2);
}
.tip-text { font-size: 22rpx; text-align: center; color: #6b7280; }

.action-bar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  border-top: 1rpx solid #e7e5e4;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  height: 88rpx;
  border-radius: 24rpx;
  font-weight: 500;
}

.action-save { background: #f3f4f6; }
.action-saved { background: #22c55e; }
.action-share { background: var(--brand); }

.action-text { font-size: 30rpx; color: #1f2937; }
.action-text-light { color: #fff; }

.spinner {
  width: 36rpx;
  height: 36rpx;
  border: 4rpx solid rgba(0, 0, 0, 0.2);
  border-top-color: #1f2937;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.share-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
}

.share-sheet {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.share-header { padding: 32rpx; border-bottom: 1rpx solid #e7e5e4; }
.share-header-title { display: block; text-align: center; font-size: 30rpx; font-weight: 600; color: #1f2937; }

.share-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 48rpx 32rpx;
}

.share-channel {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.channel-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.channel-name { font-size: 22rpx; color: #6b7280; }

.share-cancel {
  padding: 32rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #1f2937;
  border-top: 1rpx solid #e7e5e4;
}
</style>
