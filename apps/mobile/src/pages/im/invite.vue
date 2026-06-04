<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">邀请好友</text>
      <view class="nav-placeholder" />
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!linkInfo"
      empty-icon="🎁"
      empty-title="暂无邀请信息"
      skeleton-type="card"
      @retry="loadFullData"
    >
      <view class="content">
        <!-- 邀请奖励说明 -->
        <view class="reward-card">
          <view class="reward-header">
            <text class="reward-icon">🎁</text>
            <text class="reward-title">邀请奖励</text>
          </view>
          <view class="reward-list">
            <text class="reward-item">• 好友注册即得 <text class="reward-highlight">10积分</text></text>
            <text class="reward-item">• 好友首次付费返佣 <text class="reward-highlight">10%</text></text>
            <text class="reward-item">• 好友开通会员再得 <text class="reward-highlight">20元</text></text>
          </view>
        </view>

        <!-- Tab切换 -->
        <view class="tabs">
          <text class="tab" :class="{ active: activeTab === 'link' }" @click="activeTab = 'link'">🔗 推荐链接</text>
          <text class="tab" :class="{ active: activeTab === 'qrcode' }" @click="activeTab = 'qrcode'">📱 二维码</text>
          <text class="tab" :class="{ active: activeTab === 'poster' }" @click="activeTab = 'poster'">🖼 分享海报</text>
        </view>

        <!-- 推荐链接 -->
        <view v-if="activeTab === 'link'" class="tab-content">
          <view class="info-card">
            <text class="info-label">我的邀请码</text>
            <view class="info-code-row">
              <text class="info-code">{{ linkInfo?.inviteCode || '------' }}</text>
              <text class="info-copy" @click="copyCode">📋 复制</text>
            </view>
          </view>
          <view class="info-card">
            <text class="info-label">邀请链接</text>
            <view class="info-link-box">
              <text class="info-link-text">{{ linkInfo?.inviteLink || 'https://...' }}</text>
            </view>
            <text class="info-copy-link" @click="copyLink">
              {{ copied ? '✅ 已复制' : '📋 复制链接' }}
            </text>
          </view>
        </view>

        <!-- 二维码 -->
        <view v-if="activeTab === 'qrcode'" class="tab-content">
          <view class="qrcode-card">
            <view class="qrcode-img-wrap">
              <view class="qrcode-img-placeholder">📱 扫码加入</view>
            </view>
            <text class="qrcode-hint">长按或扫描二维码加入</text>
            <text class="qrcode-code">邀请码: {{ linkInfo?.inviteCode || '------' }}</text>
            <view class="qrcode-actions">
              <text class="qrcode-btn qrcode-btn-outline" @click="saveQr">⬇ 保存二维码</text>
              <text class="qrcode-btn qrcode-btn-primary" @click="copyLink">📋 复制链接</text>
            </view>
          </view>
        </view>

        <!-- 分享海报 -->
        <view v-if="activeTab === 'poster'" class="tab-content">
          <view class="poster-card">
            <!-- 背景选择 -->
            <view class="poster-bg-section">
              <text class="poster-label">选择背景</text>
              <scroll-view scroll-x class="poster-bg-scroll" show-scrollbar="false">
                <view class="poster-bg-row">
                  <view
                    v-for="(bg, idx) in posterBgList"
                    :key="idx"
                    class="poster-bg-thumb"
                    :class="{ selected: selectedBg === idx }"
                    @click="selectedBg = idx"
                  >
                    <view class="poster-bg-placeholder">🎨</view>
                  </view>
                </view>
              </scroll-view>
            </view>

            <!-- 海报预览 -->
            <view class="poster-preview">
              <view class="poster-placeholder">
                <text class="poster-placeholder-title">邀请海报</text>
                <text class="poster-placeholder-name">{{ posterConfig?.userName || '用户' }}</text>
                <text class="poster-placeholder-sub">邀请您加入国学平台</text>
                <view class="poster-placeholder-qr">
                  <text class="poster-placeholder-code">邀请码: {{ posterConfig?.inviteCode || linkInfo?.inviteCode || '------' }}</text>
                </view>
              </view>
            </view>

            <!-- 操作按钮 -->
            <view class="poster-actions">
              <text class="poster-btn poster-btn-outline" @click="regeneratePoster">🔄 重新生成</text>
              <text class="poster-btn poster-btn-primary" @click="savePoster">⬇ 保存海报</text>
            </view>
          </view>
        </view>

        <!-- 分享渠道 -->
        <view class="share-section">
          <text class="share-title">分享到</text>
          <view class="share-grid">
            <view class="share-item" @click="shareTo('wechat')">
              <view class="share-icon wechat"><text>💬</text></view>
              <text class="share-name">微信</text>
            </view>
            <view class="share-item" @click="shareTo('moments')">
              <view class="share-icon moments"><text>🔄</text></view>
              <text class="share-name">朋友圈</text>
            </view>
            <view class="share-item" @click="shareTo('qq')">
              <view class="share-icon qq"><text>🐧</text></view>
              <text class="share-name">QQ</text>
            </view>
            <view class="share-item" @click="copyLink">
              <view class="share-icon copy"><text>📋</text></view>
              <text class="share-name">复制链接</text>
            </view>
          </view>
        </view>

        <!-- 查看邀请记录 -->
        <view class="records-link" @click="goRecords">
          <text>查看邀请记录</text>
          <text>›</text>
        </view>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { api, commissionApi } from '../../api'

interface InviteLinkInfo {
  inviteCode: string
  inviteLink: string
  qrCodeUrl?: string
}

interface PosterConfig {
  userName: string
  title: string
  subtitle: string
  benefits: string[]
  qrCodeUrl: string
  inviteCode: string
  backgroundImages: string[]
  userAvatar?: string
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const activeTab = ref<'link' | 'qrcode' | 'poster'>('link')
const linkInfo = ref<InviteLinkInfo | null>(null)
const posterConfig = ref<PosterConfig | null>(null)
const copied = ref(false)
const selectedBg = ref(0)
const posterBgList = ref([1, 2, 3]) // 占位背景列表

function goBack() { uni.navigateBack() }

function goRecords() {
  uni.navigateTo({ url: '/pages/mine/invite-records' })
}

async function loadFullData() {
  loading.value = true
  loadError.value = null
  try {
    // 优先从 commissionApi 获取推荐链接信息
    let inviteCode = 'GUOXUE888'
    let inviteLink = 'https://api.rebugx.cn/invite?code=GUOXUE888'
    try {
      const linksRes = await commissionApi.referralLinks() as any
      const links = Array.isArray(linksRes?.data ?? linksRes) ? (linksRes?.data ?? linksRes) : []
      if (links.length > 0) {
        const link = links[0]
        inviteCode = link.code || link.inviteCode || inviteCode
        inviteLink = link.url || link.link || inviteLink
      }
    } catch {
      // commissionApi 不可用时，尝试通过用户资料获取邀请码
      try {
        const profile = await api.get('/auth/me') as any
        const data = profile?.data ?? profile
        inviteCode = data.inviteCode || data.referralCode || inviteCode
        inviteLink = data.inviteLink || `https://api.rebugx.cn/invite?code=${inviteCode}`
      } catch {
        // 使用默认值
      }
    }

    linkInfo.value = {
      inviteCode,
      inviteLink,
      qrCodeUrl: '',
    }

    posterConfig.value = {
      userName: '',
      title: '邀请您加入国学平台',
      subtitle: '一起学习传统文化',
      benefits: ['专属国学课程', '名师在线答疑', '经典古籍库'],
      qrCodeUrl: '',
      inviteCode,
      backgroundImages: [],
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadFullData() })

async function copyLink() {
  if (!linkInfo.value) return
  try {
    await uni.setClipboardData({ data: linkInfo.value.inviteLink })
    copied.value = true
    uni.showToast({ title: '链接已复制', icon: 'none' })
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
}

async function copyCode() {
  if (!linkInfo.value) return
  try {
    await uni.setClipboardData({ data: linkInfo.value.inviteCode })
    uni.showToast({ title: '邀请码已复制', icon: 'none' })
  } catch {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
}

function saveQr() {
  uni.showToast({ title: '二维码已保存', icon: 'none' })
}

function regeneratePoster() {
  uni.showToast({ title: '海报重新生成中...', icon: 'none' })
}

function savePoster() {
  uni.showToast({ title: '海报已保存', icon: 'none' })
}

function shareTo(channel: string) {
  const messages: Record<string, string> = {
    wechat: '请在微信中打开分享',
    moments: '请在微信朋友圈中打开分享',
    qq: '请在QQ中打开分享',
    weibo: '请在微博中打开分享',
    copy: '链接已复制',
  }
  if (channel === 'copy') {
    copyLink()
  } else {
    uni.showToast({ title: messages[channel] || '分享功能开发中', icon: 'none' })
  }
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

/* 导航 */
.nav { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: linear-gradient(135deg, #C41E3A, #B01A32); color: #fff; }
.nav-back { font-size: 22px; color: #fff; padding: 4px; }
.nav-title { font-size: 18px; font-weight: 600; color: #fff; }
.nav-placeholder { width: 30px; }

.content { padding: 16px; }

/* 奖励卡片 */
.reward-card { background: linear-gradient(135deg, #fef7e6, #fef0e0); border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid rgba(201,169,110,0.3); }
.reward-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.reward-icon { font-size: 20px; }
.reward-title { font-weight: 600; font-size: 15px; color: #8B6914; }
.reward-list { }
.reward-item { font-size: 13px; color: #8B6914; display: block; line-height: 1.8; }
.reward-highlight { font-weight: 600; color: #C41E3A; }

/* Tabs */
.tabs { display: flex; background: #fff; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
.tab { flex: 1; text-align: center; padding: 12px 8px; font-size: 13px; color: #666; border-bottom: 2px solid transparent; }
.tab.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: 600; }

/* Tab内容 */
.tab-content { margin-bottom: 16px; }
.info-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.info-label { font-size: 13px; color: #999; display: block; margin-bottom: 8px; }
.info-code-row { display: flex; align-items: center; justify-content: space-between; }
.info-code { font-size: 24px; font-weight: bold; color: #C41E3A; letter-spacing: 4px; }
.info-copy { font-size: 13px; color: #C41E3A; padding: 4px 12px; border: 1px solid #C41E3A; border-radius: 6px; }
.info-link-box { background: #F5F0E8; border-radius: 8px; padding: 10px 12px; }
.info-link-text { font-size: 13px; color: #666; word-break: break-all; }
.info-copy-link { display: block; text-align: center; margin-top: 12px; padding: 10px; background: #C41E3A; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; }

/* 二维码 */
.qrcode-card { background: #fff; border-radius: 12px; padding: 24px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.qrcode-img-wrap { display: inline-block; padding: 12px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.qrcode-img-placeholder { width: 160px; height: 160px; background: #F5F0E8; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #999; }
.qrcode-hint { font-size: 14px; color: #999; display: block; margin-top: 12px; }
.qrcode-code { font-size: 14px; color: #C41E3A; font-weight: 600; display: block; margin-top: 4px; }
.qrcode-actions { display: flex; gap: 12px; margin-top: 16px; }
.qrcode-btn { flex: 1; padding: 10px; border-radius: 8px; font-size: 13px; text-align: center; }
.qrcode-btn-outline { background: #F5F0E8; color: #666; }
.qrcode-btn-primary { background: #C41E3A; color: #fff; }

/* 海报 */
.poster-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.poster-bg-section { margin-bottom: 16px; }
.poster-label { font-size: 13px; color: #999; display: block; margin-bottom: 8px; }
.poster-bg-scroll { white-space: nowrap; }
.poster-bg-row { display: inline-flex; gap: 8px; }
.poster-bg-thumb { width: 60px; height: 80px; border-radius: 8px; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; background: #F5F0E8; border: 2px solid transparent; }
.poster-bg-thumb.selected { border-color: #C41E3A; }
.poster-bg-placeholder { font-size: 24px; }

.poster-preview { background: #F5F0E8; border-radius: 8px; padding: 24px; margin-bottom: 12px; display: flex; justify-content: center; }
.poster-placeholder { width: 240px; text-align: center; }
.poster-placeholder-title { font-size: 20px; font-weight: bold; color: #C41E3A; display: block; margin-bottom: 12px; }
.poster-placeholder-name { font-size: 16px; color: #2C2C2C; display: block; font-weight: 500; }
.poster-placeholder-sub { font-size: 13px; color: #666; display: block; margin: 8px 0 16px; }
.poster-placeholder-qr { background: #fff; border-radius: 8px; padding: 12px; display: inline-block; }
.poster-placeholder-code { font-size: 12px; color: #C41E3A; }

.poster-actions { display: flex; gap: 12px; }
.poster-btn { flex: 1; padding: 10px; border-radius: 8px; font-size: 13px; text-align: center; }
.poster-btn-outline { background: #F5F0E8; color: #666; }
.poster-btn-primary { background: #C41E3A; color: #fff; }

/* 分享 */
.share-section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.share-title { font-size: 13px; color: #999; display: block; margin-bottom: 12px; }
.share-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.share-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.share-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.share-icon.wechat { background: #07c160; }
.share-icon.moments { background: #06ad56; }
.share-icon.qq { background: #12b7f5; }
.share-icon.copy { background: #F5F0E8; }
.share-name { font-size: 11px; color: #666; }

/* 邀请记录 */
.records-link {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-radius: 12px; padding: 14px 16px;
  font-size: 14px; color: #2C2C2C; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.records-link:active { background: #FAF8F5; }
</style>
