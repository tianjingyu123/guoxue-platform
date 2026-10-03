<template>
  <view class="page">
    <AppNavBar
      title="第三方信息共享清单"
      :back-size="40"
    />

    <view class="body">
      <view class="hero-card">
        <view class="hero-icon">
          <AppIcon
            name="shield-check"
            :size="30"
            color="#ffffff"
          />
        </view>
        <view class="hero-copy">
          <text class="hero-kicker">
            公开透明 · 按实际集成核验
          </text>
          <text class="hero-title">
            当前版本集成 1 项第三方 SDK
          </text>
          <text class="hero-desc">
            清单依据客户端依赖与打包配置生成。未实际集成的支付、地图、推送、统计和社交 SDK 不会列入。
          </text>
        </view>
      </view>

      <view class="scope-row">
        <view class="scope-chip">
          <AppIcon
            name="smartphone"
            :size="15"
            color="#6f655b"
          />
          <text>H5 / Web</text>
        </view>
        <view class="scope-chip">
          <AppIcon
            name="lock"
            :size="15"
            color="#6f655b"
          />
          <text>按功能触发加载</text>
        </view>
        <view class="scope-chip">
          <AppIcon
            name="refresh-cw"
            :size="15"
            color="#6f655b"
          />
          <text>随版本同步更新</text>
        </view>
      </view>

      <view
        v-for="sdk in sdkDisclosures"
        :key="sdk.id"
        class="sdk-card"
      >
        <view class="card-head">
          <view class="sdk-mark">
            <AppIcon
              name="message-square"
              :size="24"
              color="#c41e3a"
            />
          </view>
          <view class="sdk-title-wrap">
            <text class="sdk-name">
              {{ sdk.name }}
            </text>
            <text class="sdk-provider">
              {{ sdk.provider }}
            </text>
          </view>
          <text class="version-badge">
            {{ sdk.version }}
          </text>
        </view>

        <view class="fact-list">
          <view class="fact-row">
            <text class="fact-label">
              使用目的
            </text>
            <text class="fact-value">
              {{ sdk.purpose }}
            </text>
          </view>
          <view class="fact-row">
            <text class="fact-label">
              触发场景
            </text>
            <text class="fact-value">
              {{ sdk.scene }}
            </text>
          </view>
          <view class="fact-row">
            <text class="fact-label">
              处理方式
            </text>
            <text class="fact-value">
              {{ sdk.processing }}
            </text>
          </view>
          <view class="fact-row">
            <text class="fact-label">
              所需权限
            </text>
            <text class="fact-value">
              {{ sdk.permission }}
            </text>
          </view>
        </view>

        <view class="data-section">
          <text class="section-label">
            可能处理的信息
          </text>
          <view class="tag-row">
            <text
              v-for="item in sdk.collectedData"
              :key="item"
              class="data-tag"
            >
              {{ item }}
            </text>
          </view>
        </view>

        <view class="link-row">
          <view
            class="link-button primary"
            role="button"
            :aria-label="`查看${sdk.name}个人信息保护规则`"
            @tap="openExternal(sdk.privacyPolicyUrl)"
          >
            <text>个人信息保护规则</text>
            <AppIcon
              name="external-link"
              :size="16"
              color="#c41e3a"
            />
          </view>
          <view
            class="link-button"
            role="button"
            :aria-label="`查看${sdk.name}官方网站`"
            @tap="openExternal(sdk.officialWebsite)"
          >
            <text>官方网站</text>
            <AppIcon
              name="external-link"
              :size="16"
              color="#6f655b"
            />
          </view>
        </view>
      </view>

      <view class="trust-note">
        <AppIcon
          name="info"
          :size="18"
          color="#8d6f36"
        />
        <text>支付、短信、内容审核等服务如由平台服务端调用，不等同于在客户端内嵌 SDK；相关个人信息处理规则以隐私政策和具体业务提示为准。</text>
      </view>

      <view class="service-card">
        <view class="service-copy">
          <text class="service-title">
            对信息处理有疑问？
          </text>
          <text class="service-desc">
            可通过平台智能客服提交问题，我们会保留完整咨询上下文。
          </text>
        </view>
        <view
          class="service-button"
          role="button"
          aria-label="联系平台客服"
          @tap="goService"
        >
          <AppIcon
            name="message-square"
            :size="17"
            color="#ffffff"
          />
          <text>联系平台客服</text>
        </view>
      </view>

      <text class="updated-at">
        核验日期：2026年8月11日
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { navigateTo } from '@/utils/router'

interface SdkDisclosure {
  id: string
  name: string
  provider: string
  version: string
  purpose: string
  scene: string
  processing: string
  permission: string
  collectedData: string[]
  privacyPolicyUrl: string
  officialWebsite: string
}

const sdkDisclosures: SdkDisclosure[] = [
  {
    id: 'tencent-im',
    name: '腾讯云即时通信 IM SDK',
    provider: '腾讯云计算（北京）有限责任公司',
    version: '3.6.6',
    purpose: '提供单聊、群聊、会话和消息收发能力',
    scene: '用户进入即时通信相关页面后动态加载',
    processing: '采用 SSL / HTTPS 加密传输，并采取加密、去标识化等安全措施',
    permission: '网络访问；当前 H5 版本不申请通讯录、定位或麦克风权限',
    collectedData: ['设备型号', '操作系统版本', '网络连接状态'],
    privacyPolicyUrl: 'https://cloud.tencent.com/document/product/269/58094',
    officialWebsite: 'https://cloud.tencent.com/product/im',
  },
  {
    id: 'tencent-trtc',
    name: '腾讯云实时音视频 TRTC SDK',
    provider: '腾讯云计算（北京）有限责任公司',
    version: '1.4.7（DCloud 官方插件）',
    purpose: '提供直播间低延时语音连麦、音频传输和弱网重连能力',
    scene: '仅在用户主动申请连麦且主播批准后加载；退出连麦即释放麦克风',
    processing: '房间凭据由热卜服务端临时签发，音频经腾讯云 TRTC 加密传输；不在客户端保存 SDKSecretKey',
    permission: '麦克风、网络访问、蓝牙音频设备（用户可拒绝，拒绝后仅不能连麦）',
    collectedData: ['麦克风音频', '设备型号', '操作系统版本', '网络质量', '临时房间标识与去标识化用户标识'],
    privacyPolicyUrl: 'https://cloud.tencent.com/document/product/647/16788',
    officialWebsite: 'https://cloud.tencent.com/product/trtc',
  },
]

function openExternal(url: string) {
  // #ifdef H5
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) window.location.href = url
  // #endif

  // #ifndef H5
  uni.setClipboardData({
    data: url,
    success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
  })
  // #endif
}

function goService() {
  navigateTo('/customer-service')
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f7f4ef;
  color: #27221d;
}

.body {
  padding: 28rpx 28rpx calc(72rpx + env(safe-area-inset-bottom));
}

.hero-card {
  display: flex;
  gap: 24rpx;
  padding: 34rpx;
  border-radius: 28rpx;
  background: linear-gradient(145deg, #30251f 0%, #5a3b30 58%, #7f2636 100%);
  box-shadow: 0 18rpx 44rpx rgba(69, 42, 34, 0.16);
}

.hero-icon {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.14);
}

.hero-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hero-kicker {
  margin-bottom: 10rpx;
  font-size: 22rpx;
  letter-spacing: 2rpx;
  color: #dfc8a0;
}

.hero-title {
  font-family: "Songti SC", "STSong", serif;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.35;
  color: #fff;
}

.hero-desc {
  margin-top: 14rpx;
  font-size: 25rpx;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.76);
}

.scope-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin: 24rpx 0;
}

.scope-chip {
  min-height: 56rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 0 18rpx;
  border: 1rpx solid #e5ded3;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.74);
  font-size: 23rpx;
  color: #6f655b;
}

.sdk-card {
  padding: 32rpx;
  border: 1rpx solid #e9e1d7;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 12rpx 36rpx rgba(68, 48, 35, 0.07);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding-bottom: 28rpx;
  border-bottom: 1rpx solid #f0ebe4;
}

.sdk-mark {
  width: 76rpx;
  height: 76rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22rpx;
  background: #fbebee;
}

.sdk-title-wrap {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.sdk-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #2b2620;
}

.sdk-provider {
  font-size: 22rpx;
  line-height: 1.45;
  color: #8a8178;
}

.version-badge {
  flex-shrink: 0;
  padding: 6rpx 12rpx;
  border-radius: 10rpx;
  background: #f3efe9;
  font-size: 20rpx;
  color: #766c62;
}

.fact-list {
  padding: 18rpx 0 8rpx;
}

.fact-row {
  display: grid;
  grid-template-columns: 124rpx 1fr;
  gap: 18rpx;
  padding: 13rpx 0;
}

.fact-label,
.section-label {
  font-size: 23rpx;
  color: #8a8178;
}

.fact-value {
  font-size: 25rpx;
  line-height: 1.6;
  color: #38312b;
}

.data-section {
  padding: 22rpx 0 26rpx;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.data-tag {
  padding: 9rpx 16rpx;
  border-radius: 10rpx;
  background: #f4f1ec;
  font-size: 22rpx;
  color: #675d54;
}

.link-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.link-button {
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  border: 1rpx solid #ded5ca;
  border-radius: 18rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #62584e;
}

.link-button.primary {
  border-color: rgba(196, 30, 58, 0.22);
  background: #fff7f8;
  color: #c41e3a;
}

.link-button:active,
.service-button:active {
  transform: scale(0.985);
  opacity: 0.86;
}

.trust-note {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-top: 24rpx;
  padding: 26rpx;
  border: 1rpx solid #eadfca;
  border-radius: 22rpx;
  background: #fffaf0;
}

.trust-note text {
  flex: 1;
  font-size: 23rpx;
  line-height: 1.65;
  color: #766347;
}

.service-card {
  margin-top: 24rpx;
  padding: 30rpx;
  border-radius: 24rpx;
  background: #2e2823;
}

.service-copy {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.service-title {
  font-size: 29rpx;
  font-weight: 700;
  color: #fff;
}

.service-desc {
  font-size: 23rpx;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.66);
}

.service-button {
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-top: 24rpx;
  border-radius: 18rpx;
  background: #c41e3a;
  font-size: 27rpx;
  font-weight: 700;
  color: #fff;
}

.updated-at {
  display: block;
  margin-top: 28rpx;
  text-align: center;
  font-size: 21rpx;
  color: #9a9188;
}
</style>
