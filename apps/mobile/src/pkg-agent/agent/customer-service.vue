<script setup lang="ts">
/**
 * 智能客服 —— 平台自建 RAG 链路（/ai/customer-service·知识库检索 + DeepSeek）。
 * H5：fetch SSE 流式打字机；非 H5 端降级非流式接口。
 */
import { ref, onMounted } from 'vue'
import SimpleChat, { type SimpleChatStreamHandlers } from '@/components/agent/simple-chat.vue'
import { agentApi, csAiApi, type AiHistoryMsg, type Recommendation } from '@/lib/agent-data'
import { streamChat, streamChatSupported } from '@/utils/stream-chat'
import { BRAND } from '@/lib/brand'

const loading = ref(true)
const error = ref('')
const welcome = ref('')
const quick = ref<string[]>([])
const showHumanSupport = ref(false)

// 多轮上下文（自建链路无状态，本页维护近几轮）
const history: AiHistoryMsg[] = []

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const data = await agentApi.getCsWelcome()
    welcome.value = data?.welcome || ''
    quick.value = data?.quick || []
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

function openTicket() {
  showHumanSupport.value = false
  uni.navigateTo({
    url: `/pkg-mine/feedback/index?type=other&source=${encodeURIComponent('智能客服转人工')}`,
  })
}

function previewServiceQr() {
  if (!BRAND.serviceWechatQrUrl) return
  uni.previewImage({ current: BRAND.serviceWechatQrUrl, urls: [BRAND.serviceWechatQrUrl] })
}

function callService() {
  if (!BRAND.servicePhone) return
  uni.makePhoneCall({ phoneNumber: BRAND.servicePhone })
}

function saveServiceQr() {
  if (!BRAND.serviceWechatQrUrl) return
  // #ifdef H5
  previewServiceQr()
  uni.showToast({ title: '请长按二维码保存或识别', icon: 'none' })
  // #endif
  // #ifndef H5
  uni.showLoading({ title: '保存中...' })
  uni.downloadFile({
    url: BRAND.serviceWechatQrUrl,
    success: (download) => {
      if (download.statusCode !== 200) {
        uni.showToast({ title: '二维码下载失败', icon: 'none' })
        return
      }
      uni.saveImageToPhotosAlbum({
        filePath: download.tempFilePath,
        success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
        fail: () => uni.showToast({ title: '请允许相册权限，或长按二维码保存', icon: 'none' }),
      })
    },
    fail: () => uni.showToast({ title: '二维码下载失败', icon: 'none' }),
    complete: () => uni.hideLoading(),
  })
  // #endif
}

function copyServiceWechat() {
  if (!BRAND.serviceWechat) return
  uni.setClipboardData({ data: BRAND.serviceWechat, success: () => uni.showToast({ title: '微信号已复制', icon: 'success' }) })
}

/** 流式回复：H5 走 SSE（/ai/customer-service/stream）；其他端降级非流式 */
async function resolveStream(text: string, handlers: SimpleChatStreamHandlers): Promise<void> {
  let acc = ''
  if (streamChatSupported()) {
    await streamChat(
      '/ai/customer-service/stream',
      { question: text, history: history.slice(-8) },
      {
        onChunk: (t) => { acc += t; handlers.appendText(t) },
        onMeta: (m) => {
          if (m.disclaimer) handlers.setDisclaimer(m.disclaimer)
          if (m.recommendation) handlers.setRecommendation(m.recommendation as Recommendation)
        },
      },
    )
  } else {
    const result = await csAiApi.ask(text, history)
    acc = result.answer
    if (acc) handlers.appendText(acc)
    if (result.recommendation) handlers.setRecommendation(result.recommendation)
  }
  history.push({ role: 'user', content: text }, { role: 'assistant', content: acc.slice(0, 2000) })
}
</script>

<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="chat-page">
    <SimpleChat
      title="智能客服"
      icon-name="headphones"
      icon-color="#2563eb"
      icon-bg="rgba(37,99,235,0.12)"
      :welcome="welcome"
      scene-hint="我会先帮你解决问题，再为你找到相关内容和服务"
      :quick-prompts="quick"
      :resolve-stream="resolveStream"
      experience-key="SERVICE"
      agent-name="平台智能客服"
    />
    <view class="human-entry" @tap="showHumanSupport = true">
      <text class="human-entry-text">需要人工协助</text>
    </view>

    <view v-if="showHumanSupport" class="support-mask" @tap.self="showHumanSupport = false">
      <view class="support-sheet">
        <view class="support-head">
          <view>
            <text class="support-title">人工客服</text>
            <text class="support-desc">提交工单可保留处理记录，紧急问题也可联系企业微信</text>
          </view>
          <text class="support-close" @tap="showHumanSupport = false">×</text>
        </view>
        <view class="ticket-btn" @tap="openTicket">
          <text class="ticket-title">提交人工工单</text>
          <text class="ticket-desc">支持上传截图，可在“我的反馈”查看处理进度</text>
        </view>
        <view v-if="BRAND.serviceWechatQrUrl" class="qr-area" @tap="previewServiceQr">
          <image class="service-qr" :src="BRAND.serviceWechatQrUrl" mode="aspectFit" show-menu-by-longpress />
          <text class="qr-tip">点击放大，长按识别企业微信二维码</text>
        </view>
        <view v-if="BRAND.serviceWechatQrUrl" class="qr-actions">
          <view class="qr-action" @tap="previewServiceQr">放大识别</view>
          <view class="qr-action qr-action-primary" @tap="saveServiceQr">保存到相册</view>
        </view>
        <view v-if="BRAND.serviceWechat" class="contact-row" @tap="copyServiceWechat">
          <text>企业微信</text><text class="contact-value">{{ BRAND.serviceWechat }}（点击复制）</text>
        </view>
        <view v-if="BRAND.servicePhone" class="contact-row" @tap="callService">
          <text>客服电话</text><text class="contact-value">{{ BRAND.servicePhone }}</text>
        </view>
        <view v-if="BRAND.serviceEmail" class="contact-row">
          <text>客服邮箱</text><text class="contact-value">{{ BRAND.serviceEmail }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
.chat-page { position: relative; min-height: 100vh; }
.human-entry { position: fixed; right: 24rpx; bottom: calc(150rpx + env(safe-area-inset-bottom)); z-index: 20; padding: 18rpx 28rpx; border-radius: 999rpx; background: #fff; box-shadow: 0 8rpx 28rpx rgba(37, 99, 235, 0.18); border: 1rpx solid rgba(37, 99, 235, 0.2); }
.human-entry-text { color: #2563eb; font-size: 26rpx; font-weight: 600; }
.support-mask { position: fixed; inset: 0; z-index: 80; display: flex; align-items: flex-end; background: rgba(0,0,0,.42); }
.support-sheet { width: 100%; padding: 34rpx 32rpx calc(34rpx + env(safe-area-inset-bottom)); border-radius: 28rpx 28rpx 0 0; background: #fff; }
.support-head { display: flex; justify-content: space-between; gap: 24rpx; }
.support-title { display: block; font-size: 34rpx; font-weight: 700; color: #26221e; }
.support-desc { display: block; margin-top: 10rpx; font-size: 24rpx; line-height: 1.55; color: #77706a; }
.support-close { font-size: 48rpx; line-height: 40rpx; color: #999; padding: 0 8rpx; }
.ticket-btn { margin-top: 28rpx; padding: 24rpx; border-radius: 18rpx; background: #2563eb; }
.ticket-title, .ticket-desc { display: block; color: #fff; }
.ticket-title { font-size: 29rpx; font-weight: 650; }
.ticket-desc { margin-top: 8rpx; font-size: 23rpx; opacity: .86; }
.qr-area { display: flex; flex-direction: column; align-items: center; margin-top: 26rpx; }
.service-qr { width: 300rpx; height: 300rpx; border-radius: 16rpx; background: #f7f7f7; }
.qr-tip { margin-top: 12rpx; font-size: 23rpx; color: #77706a; }
.qr-actions { display: flex; gap: 18rpx; margin-top: 18rpx; }
.qr-action { flex: 1; text-align: center; padding: 18rpx 12rpx; border-radius: 12rpx; border: 1rpx solid #d8e4ff; color: #2563eb; font-size: 25rpx; }
.qr-action-primary { color: #fff; background: #2563eb; border-color: #2563eb; }
.contact-row { display: flex; justify-content: space-between; padding: 22rpx 4rpx; border-bottom: 1rpx solid #eeeae5; font-size: 26rpx; color: #635d57; }
.contact-value { color: #2563eb; }
</style>
