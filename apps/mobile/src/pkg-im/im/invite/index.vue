<template>
  <view class="page">
    <!-- 顶部导航（红渐变） -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner">
        <view class="nav-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#FFFFFF" />
        </view>
        <text class="navbar__title">邀请好友</text>
        <view class="nav-btn nav-btn--ph" />
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="loading">
      <view class="spinner" />
      <text class="loading-txt">加载中…</text>
    </view>

    <scroll-view v-else scroll-y class="scroll">
      <view class="content">
        <!-- 邀请奖励说明 -->
        <view class="reward">
          <view class="reward-head">
            <app-icon name="gift" :size="36" color="#D97706" />
            <text class="reward-title">邀请奖励</text>
          </view>
          <view class="reward-list">
            <text class="reward-item">• 好友注册即得 <text class="reward-strong">10积分</text></text>
            <text class="reward-item">• 好友首次付费返佣 <text class="reward-strong">10%</text></text>
            <text class="reward-item">• 好友开通会员再得 <text class="reward-strong">20元</text></text>
          </view>
        </view>

        <!-- Tab 切换 -->
        <view class="tabs">
          <view :class="['tab', activeTab === 'link' && 'tab-on']" @tap="activeTab = 'link'">
            <app-icon name="link-2" :size="28" :color="activeTab === 'link' ? '#2C2C2C' : '#9A8F80'" />
            <text class="tab-txt">推荐链接</text>
          </view>
          <view :class="['tab', activeTab === 'qrcode' && 'tab-on']" @tap="activeTab = 'qrcode'">
            <app-icon name="qr-code" :size="28" :color="activeTab === 'qrcode' ? '#2C2C2C' : '#9A8F80'" />
            <text class="tab-txt">二维码</text>
          </view>
          <view :class="['tab', activeTab === 'poster' && 'tab-on']" @tap="activeTab = 'poster'">
            <app-icon name="image" :size="28" :color="activeTab === 'poster' ? '#2C2C2C' : '#9A8F80'" />
            <text class="tab-txt">分享海报</text>
          </view>
        </view>

        <!-- 推荐链接 -->
        <view v-if="activeTab === 'link'" class="panel">
          <view class="card">
            <text class="card-label">我的邀请码</text>
            <view class="code-row">
              <text class="code-val">{{ linkInfo.inviteCode }}</text>
              <view class="btn-outline sm" @tap="onCopyCode">
                <app-icon name="copy" :size="28" color="#2C2C2C" />
                <text class="btn-outline-txt">复制</text>
              </view>
            </view>
          </view>

          <view class="card">
            <text class="card-label">邀请链接</text>
            <view class="link-box"><text class="link-txt">{{ linkInfo.inviteLink }}</text></view>
            <view :class="['btn-primary', copied && 'btn-disabled']" @tap="onCopyLink">
              <app-icon :name="copied ? 'check' : 'copy'" :size="30" color="#FFFFFF" />
              <text class="btn-primary-txt">{{ copied ? '已复制' : '复制链接' }}</text>
            </view>
          </view>
        </view>

        <!-- 二维码 -->
        <view v-else-if="activeTab === 'qrcode'" class="panel">
          <view class="card qr-card">
            <view class="qr-frame">
              <view class="qr-img"><app-icon name="qr-code" :size="160" color="#2C2C2C" /></view>
            </view>
            <text class="qr-hint">长按或扫描二维码加入</text>
            <text class="qr-code">邀请码: {{ linkInfo.inviteCode }}</text>
            <view class="row-btns">
              <view class="btn-outline flex1" @tap="onSaveQr">
                <app-icon name="download" :size="30" color="#2C2C2C" />
                <text class="btn-outline-txt">保存二维码</text>
              </view>
              <view class="btn-primary flex1" @tap="onCopyLink">
                <app-icon name="copy" :size="30" color="#FFFFFF" />
                <text class="btn-primary-txt">复制链接</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 分享海报 -->
        <view v-else class="panel">
          <view class="card">
            <!-- 背景选择 -->
            <text class="card-label">选择背景</text>
            <view class="bg-list">
              <view
                v-for="(bg, i) in posterConfig.backgroundImages"
                :key="i"
                :class="['bg-item', selectedBg === i && 'bg-on']"
                @tap="selectedBg = i"
              >
                <view class="bg-thumb" :style="{ background: bgThemes[i] }" />
              </view>
            </view>

            <!-- 海报预览（DOM 同构卡片） -->
            <view class="poster-area">
              <view class="poster" :style="{ background: bgThemes[selectedBg] }">
                <view class="poster-mask" />
                <view class="poster-inner">
                  <view class="poster-avatar"><app-icon name="user" :size="48" color="#FFFFFF" /></view>
                  <text class="poster-name">{{ posterConfig.userName }}</text>
                  <text class="poster-title">{{ posterConfig.title }}</text>
                  <text class="poster-subtitle">{{ posterConfig.subtitle }}</text>
                  <view class="poster-benefits">
                    <text v-for="(b, i) in posterConfig.benefits" :key="i" class="poster-benefit">• {{ b }}</text>
                  </view>
                  <view class="poster-qr">
                    <view class="poster-qr-img"><app-icon name="qr-code" :size="100" color="#2C2C2C" /></view>
                    <text class="poster-qr-tip">扫码加入</text>
                    <text class="poster-qr-code">邀请码: {{ posterConfig.inviteCode }}</text>
                  </view>
                </view>
              </view>
            </view>

            <!-- 操作按钮 -->
            <view class="row-btns">
              <view class="btn-outline flex1" @tap="onRegen">
                <app-icon name="image" :size="30" color="#2C2C2C" />
                <text class="btn-outline-txt">重新生成</text>
              </view>
              <view class="btn-primary flex1" @tap="onSavePoster">
                <app-icon name="download" :size="30" color="#FFFFFF" />
                <text class="btn-primary-txt">保存海报</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 分享渠道 -->
        <view class="card">
          <text class="card-label">分享到</text>
          <view class="channels">
            <view class="channel" @tap="onShare('wechat')">
              <view class="ch-icon" style="background:#22C35E">
                <app-icon name="message-circle" :size="30" color="#FFFFFF" />
              </view>
              <text class="ch-label">微信</text>
            </view>
            <view class="channel" @tap="onShare('moments')">
              <view class="ch-icon" style="background:#16A34A">
                <app-icon name="users" :size="30" color="#FFFFFF" />
              </view>
              <text class="ch-label">朋友圈</text>
            </view>
            <view class="channel" @tap="onShare('qq')">
              <view class="ch-icon" style="background:#3B82F6">
                <app-icon name="message-circle" :size="30" color="#FFFFFF" />
              </view>
              <text class="ch-label">QQ</text>
            </view>
            <view class="channel" @tap="onShare('copy')">
              <view class="ch-icon" style="background:#EFEAE2">
                <app-icon name="copy" :size="30" color="#9A8F80" />
              </view>
              <text class="ch-label">复制链接</text>
            </view>
          </view>
        </view>

        <!-- 查看邀请记录 -->
        <view class="btn-record" @tap="go('/mine/invite-records')">
          <text class="btn-record-txt">查看邀请记录</text>
          <app-icon name="chevron-right" :size="28" color="#9A8F80" />
        </view>

        <view class="safe-bottom" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'
import { BRAND } from '@/lib/brand'

type TabType = 'link' | 'qrcode' | 'poster'

const statusBarHeight = ref(0)
const loading = ref(true)
const activeTab = ref<TabType>('link')
const copied = ref(false)
const selectedBg = ref(0)

// 邀请链接信息（对应 getInviteLinkInfo mock）
// 域名取品牌配置真源 BRAND.h5Url（生产 https://api.rebugx.cn/h5/），
// 拼装为 H5 落地页带邀请码，杜绝 example.com 占位域名
const INVITE_CODE = 'GUOXUE2026'
const linkInfo = ref({
  inviteCode: INVITE_CODE,
  inviteLink: `${BRAND.h5Url.replace(/\/$/, '')}/pages/index/index?invite=${INVITE_CODE}`,
  qrCodeUrl: '',
})

// 海报配置（对应 getInvitePosterConfig mock）
const posterConfig = ref({
  userName: '国学爱好者',
  inviteCode: 'ABC123',
  title: '邀请好友，共享国学智慧',
  subtitle: `扫码加入${BRAND.nameShort}，开启国学之旅`,
  benefits: ['好友注册即得10积分', '好友首次付费返佣10%', '好友开通会员再得20元'],
  backgroundImages: ['背景1', '背景2', '背景3'],
})

// 三套背景主题（对应 backgroundImages 三选项）
const bgThemes = ['linear-gradient(135deg,#C41E2D 0%,#8B1520 100%)', 'linear-gradient(135deg,#1E3A5F 0%,#0F2138 100%)', 'linear-gradient(135deg,#7C5A1E 0%,#4A350F 100%)']

try {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
} catch {}

// 模拟加载
setTimeout(() => { loading.value = false }, 300)

function goBack() { uni.navigateBack({ delta: 1 }) }
function go(path: string) { navigateTo(path) }

function onCopyCode() {
  uni.setClipboardData({ data: linkInfo.value.inviteCode, success: () => uni.showToast({ title: '邀请码已复制', icon: 'none' }) })
}
function onCopyLink() {
  uni.setClipboardData({ data: linkInfo.value.inviteLink, success: () => {
    copied.value = true
    uni.showToast({ title: '链接已复制', icon: 'none' })
    setTimeout(() => { copied.value = false }, 2000)
  } })
}
function onSaveQr() { uni.showToast({ title: '二维码已保存', icon: 'none' }) }
function onRegen() { uni.showToast({ title: '海报已重新生成', icon: 'none' }) }
function onSavePoster() { uni.showToast({ title: '海报已保存', icon: 'none' }) }
function onShare(channel: string) {
  if (channel === 'copy') { onCopyLink(); return }
  const messages: Record<string, string> = {
    wechat: '请在微信中打开分享',
    moments: '请在微信朋友圈中打开分享',
    qq: '请在QQ中打开分享',
  }
  uni.showToast({ title: messages[channel] || '', icon: 'none' })
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }

/* 导航 */
.navbar { background: linear-gradient(90deg, #C41E2D 0%, #D4424F 100%); }
.navbar__inner { display: flex; align-items: center; justify-content: space-between; height: 112rpx; padding: 0 16rpx; }
.nav-btn { width: 80rpx; height: 80rpx; display: flex; align-items: center; justify-content: center; }
.nav-btn--ph { opacity: 0; }
.navbar__title { font-size: 36rpx; font-weight: 600; color: #FFFFFF; }

/* 加载 */
.loading { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.spinner { width: 64rpx; height: 64rpx; border: 6rpx solid #EFEAE2; border-top-color: #C41E2D; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-txt { font-size: 26rpx; color: #9A8F80; }

.scroll { flex: 1; }
.content { padding: 32rpx; display: flex; flex-direction: column; gap: 32rpx; }

/* 奖励说明 */
.reward { background: linear-gradient(90deg, #FFFBEB 0%, #FFF7ED 100%); border: 1rpx solid rgba(217,119,6,0.25); border-radius: 24rpx; padding: 32rpx; }
.reward-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.reward-title { font-size: 30rpx; font-weight: 600; color: #92400E; }
.reward-list { display: flex; flex-direction: column; gap: 8rpx; }
.reward-item { font-size: 26rpx; color: #B45309; line-height: 1.6; }
.reward-strong { font-weight: 600; color: #92400E; }

/* Tabs */
.tabs { display: flex; background: #EFEAE2; border-radius: 16rpx; padding: 8rpx; }
.tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 18rpx 0; border-radius: 12rpx; }
.tab-on { background: #FFFFFF; }
.tab-txt { font-size: 26rpx; color: #9A8F80; }
.tab-on .tab-txt { color: #2C2C2C; font-weight: 500; }

.panel { display: flex; flex-direction: column; gap: 32rpx; }

/* 卡片通用 */
.card { background: #FFFFFF; border: 1rpx solid #EFEAE2; border-radius: 24rpx; padding: 32rpx; }
.card-label { display: block; font-size: 26rpx; color: #9A8F80; margin-bottom: 16rpx; }

/* 邀请码 */
.code-row { display: flex; align-items: center; justify-content: space-between; }
.code-val { font-size: 44rpx; font-weight: 700; color: #C41E2D; letter-spacing: 8rpx; }

/* 链接 */
.link-box { background: rgba(0,0,0,0.04); border-radius: 12rpx; padding: 24rpx; }
.link-txt { font-size: 26rpx; color: rgba(44,44,44,0.8); word-break: break-all; }

/* 按钮 */
.btn-primary { display: flex; align-items: center; justify-content: center; gap: 12rpx; background: #C41E2D; border-radius: 16rpx; padding: 24rpx 0; margin-top: 24rpx; }
.btn-primary-txt { font-size: 28rpx; color: #FFFFFF; font-weight: 500; }
.btn-disabled { opacity: 0.6; }
.btn-outline { display: flex; align-items: center; justify-content: center; gap: 12rpx; border: 1rpx solid #E0D8CC; border-radius: 16rpx; padding: 22rpx 0; background: #FFFFFF; }
.btn-outline.sm { padding: 14rpx 28rpx; }
.btn-outline-txt { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.flex1 { flex: 1; }
.row-btns { display: flex; gap: 24rpx; margin-top: 32rpx; }

/* 二维码 */
.qr-card { display: flex; flex-direction: column; align-items: center; padding: 48rpx 32rpx; }
.qr-frame { background: #FFFFFF; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); }
.qr-img { width: 320rpx; height: 320rpx; display: flex; align-items: center; justify-content: center; }
.qr-hint { font-size: 26rpx; color: #9A8F80; margin-top: 32rpx; }
.qr-code { font-size: 28rpx; color: #C41E2D; font-weight: 600; margin-top: 8rpx; }

/* 海报背景选择 */
.bg-list { display: flex; gap: 16rpx; }
.bg-item { width: 112rpx; height: 168rpx; border-radius: 16rpx; overflow: hidden; border: 4rpx solid transparent; }
.bg-on { border-color: #C41E2D; }
.bg-thumb { width: 100%; height: 100%; }

/* 海报预览 */
.poster-area { display: flex; justify-content: center; background: rgba(0,0,0,0.03); border-radius: 16rpx; padding: 32rpx; margin-top: 32rpx; }
.poster { position: relative; width: 400rpx; height: 600rpx; border-radius: 16rpx; overflow: hidden; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.18); }
.poster-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.3); }
.poster-inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; padding: 40rpx 32rpx; height: 100%; }
.poster-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.poster-name { font-size: 28rpx; font-weight: 700; color: #FFFFFF; margin-top: 16rpx; }
.poster-title { font-size: 34rpx; font-weight: 700; color: #FFFFFF; margin-top: 24rpx; text-align: center; }
.poster-subtitle { font-size: 22rpx; color: rgba(255,255,255,0.8); margin-top: 12rpx; text-align: center; }
.poster-benefits { display: flex; flex-direction: column; gap: 8rpx; align-self: flex-start; margin-top: 24rpx; }
.poster-benefit { font-size: 22rpx; color: #FFFFFF; }
.poster-qr { margin-top: auto; background: #FFFFFF; border-radius: 12rpx; padding: 16rpx; display: flex; flex-direction: column; align-items: center; }
.poster-qr-img { width: 140rpx; height: 140rpx; display: flex; align-items: center; justify-content: center; }
.poster-qr-tip { font-size: 20rpx; color: #666666; margin-top: 4rpx; }
.poster-qr-code { font-size: 20rpx; color: #C41E2D; font-weight: 600; margin-top: 4rpx; }

/* 分享渠道 */
.channels { display: flex; }
.channel { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.ch-icon { width: 88rpx; height: 88rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.ch-label { font-size: 22rpx; color: #9A8F80; }

/* 邀请记录入口 */
.btn-record { display: flex; align-items: center; justify-content: space-between; background: #FFFFFF; border: 1rpx solid #E0D8CC; border-radius: 16rpx; padding: 28rpx 32rpx; }
.btn-record-txt { font-size: 28rpx; color: #2C2C2C; }

.safe-bottom { height: 32rpx; }
</style>
