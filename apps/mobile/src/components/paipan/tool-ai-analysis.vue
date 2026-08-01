<script setup lang="ts">
/**
 * 排盘结果页共用 AI 解析组件：H5 真流式，小程序/App 降级为非流式。
 * 只负责解读已经算好的结构化盘面，不让 AI 参与排盘计算。
 */
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { apiPost } from '@/utils/request'
import { streamChat, streamChatSupported } from '@/utils/stream-chat'
import { getToken } from '@/utils/storage'
import { navigateTo } from '@/utils/router'

interface AnalyzeResponse {
  id?: string
  analysisContent?: string
}

const props = withDefaults(defineProps<{
  toolId: string
  input: unknown
  result: unknown
  requestKey: string
  recordId?: string
}>(), {
  recordId: '',
})

const opened = ref(false)
const analyzing = ref(false)
const content = ref('')
const errorText = ref('')
const disclaimer = ref('')
const runVersion = ref(0)

const buttonLabel = computed(() => {
  if (analyzing.value) return content.value ? '解析生成中…' : '正在读盘…'
  if (content.value) return opened.value ? '收起AI解析' : '查看AI解析'
  return 'AI智能解析'
})

const statusLabel = computed(() => {
  if (analyzing.value) return content.value ? '实时生成' : '研读盘面'
  if (errorText.value) return '生成中断'
  return '解析完成'
})

const renderedContent = computed(() => renderMarkdown(content.value))

watch(() => props.requestKey, () => {
  // 起局参数变化后旧解析不再属于当前盘，必须清空，防止“新盘显示旧解”。
  runVersion.value += 1
  opened.value = false
  analyzing.value = false
  content.value = ''
  errorText.value = ''
  disclaimer.value = ''
})

function currentFullPath(): string {
  try {
    const pages = getCurrentPages() as Array<{ route?: string; options?: Record<string, unknown> }>
    const page = pages[pages.length - 1]
    if (!page?.route) return ''
    const query = Object.entries(page.options || {})
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&')
    return `/${page.route}${query ? `?${query}` : ''}`
  } catch {
    return ''
  }
}

function askLogin() {
  uni.showModal({
    title: '登录后开始解析',
    content: 'AI解析会保存到你的个人记录中，登录后可继续查看。',
    confirmText: '去登录',
    cancelText: '稍后再说',
    confirmColor: '#C41E3A',
    success: (res) => {
      if (!res.confirm) return
      const redirect = currentFullPath()
      if (redirect) {
        try { uni.setStorageSync('login:redirect', redirect) } catch { /* 回跳记录失败不阻断登录 */ }
      }
      navigateTo('/login')
    },
  })
}

async function startAnalysis() {
  if (analyzing.value) return
  if (content.value) {
    opened.value = !opened.value
    return
  }
  if (!getToken()) {
    askLogin()
    return
  }

  const activeRun = ++runVersion.value
  opened.value = true
  analyzing.value = true
  errorText.value = ''
  disclaimer.value = ''

  const body = {
    input: props.input || {},
    result: props.result || {},
    paipanRecordId: props.recordId || undefined,
  }

  try {
    if (streamChatSupported()) {
      await streamChat(`/tools/${props.toolId}/analyze/stream`, body, {
        onChunk: (chunk) => {
          if (activeRun === runVersion.value) content.value += chunk
        },
        onMeta: (meta) => {
          if (activeRun === runVersion.value) disclaimer.value = meta.disclaimer || ''
        },
      })
    } else {
      const res = await apiPost<AnalyzeResponse>(
        `/tools/${props.toolId}/analyze`, body, undefined, 90000,
      )
      if (activeRun === runVersion.value) content.value = res.analysisContent || ''
    }
    if (activeRun !== runVersion.value) return
    if (!content.value.trim()) throw new Error('AI 未返回有效解析，请稍后重试')
  } catch (error) {
    if (activeRun !== runVersion.value) return
    errorText.value = (error as Error)?.message || 'AI解析暂时不可用，请稍后重试'
  } finally {
    if (activeRun === runVersion.value) analyzing.value = false
  }
}

function retry() {
  content.value = ''
  errorText.value = ''
  startAnalysis()
}

function copyAnalysis() {
  if (!content.value) return
  uni.setClipboardData({
    data: content.value,
    success: () => uni.showToast({ title: '解析已复制', icon: 'none' }),
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 安全的轻量 Markdown：先转义 AI 文本，再只开放标题/列表/粗体四种阅读格式。 */
function renderMarkdown(text: string): string {
  if (!text) return ''
  const inline = (raw: string) => escapeHtml(raw).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  return text.split('\n').map((raw) => {
    const line = raw.trimEnd()
    if (!line.trim()) return '<div style="height:18rpx"></div>'
    if (line.startsWith('### ')) return `<div style="font-size:29rpx;font-weight:700;color:#3A2A1E;margin:24rpx 0 8rpx">${inline(line.slice(4))}</div>`
    if (line.startsWith('## ')) return `<div style="font-size:31rpx;font-weight:700;color:#C41E3A;margin:30rpx 0 10rpx">${inline(line.slice(3))}</div>`
    if (line.startsWith('# ')) return `<div style="font-size:34rpx;font-weight:800;color:#3A2A1E;margin:30rpx 0 12rpx">${inline(line.slice(2))}</div>`
    if (/^[-*]\s+/.test(line)) return `<div style="font-size:27rpx;line-height:1.9;color:#4B3B30;padding-left:24rpx">• ${inline(line.replace(/^[-*]\s+/, ''))}</div>`
    if (/^\d+[.、]\s*/.test(line)) return `<div style="font-size:27rpx;line-height:1.9;color:#4B3B30;padding-left:12rpx">${inline(line)}</div>`
    return `<div style="font-size:27rpx;line-height:1.95;color:#4B3B30">${inline(line)}</div>`
  }).join('')
}
</script>

<template>
  <view class="tool-ai">
    <view class="tool-ai-actions">
      <view class="tool-ai-primary" :class="{ busy: analyzing }" @tap="startAnalysis">
        <app-icon :name="analyzing ? 'loader-2' : 'sparkles'" :size="32" color="#ffffff" :class="{ spin: analyzing }" />
        <text class="tool-ai-primary-text">{{ buttonLabel }}</text>
      </view>
      <view class="tool-ai-secondary"><slot name="secondary" /></view>
    </view>

    <view v-if="opened" class="tool-ai-card">
      <view class="tool-ai-head">
        <view class="tool-ai-heading">
          <view class="tool-ai-seal"><text class="tool-ai-seal-text">解</text></view>
          <view>
            <text class="tool-ai-title">AI盘面解读</text>
            <text class="tool-ai-subtitle">依据当前盘面逐项研判</text>
          </view>
        </view>
        <view class="tool-ai-status" :class="{ live: analyzing, failed: !!errorText }">
          <view v-if="analyzing" class="tool-ai-dot" />
          <text class="tool-ai-status-text">{{ statusLabel }}</text>
        </view>
      </view>

      <view v-if="!content && analyzing" class="tool-ai-reading">
        <view class="tool-ai-orbit"><view class="tool-ai-orbit-core" /></view>
        <view class="tool-ai-reading-copy">
          <text class="tool-ai-reading-title">正在研读九宫、值符与值使</text>
          <text class="tool-ai-reading-sub">首段生成后将实时呈现，无需等待全文完成</text>
        </view>
      </view>

      <view v-if="content" class="tool-ai-paper">
        <rich-text class="tool-ai-content" :nodes="renderedContent" />
        <view v-if="analyzing" class="tool-ai-caret" />
      </view>

      <view v-if="errorText" class="tool-ai-error">
        <app-icon name="alert-circle" :size="30" color="#B45309" />
        <view class="tool-ai-error-copy">
          <text class="tool-ai-error-title">{{ errorText }}</text>
          <text v-if="content" class="tool-ai-error-sub">已生成的内容为你保留，可重试生成完整解析。</text>
        </view>
        <view class="tool-ai-retry" @tap="retry"><text class="tool-ai-retry-text">重试</text></view>
      </view>

      <view v-if="content && !analyzing" class="tool-ai-foot">
        <text class="tool-ai-foot-note">AI生成 · 仅供传统文化学习参考</text>
        <view class="tool-ai-copy" @tap="copyAnalysis">
          <app-icon name="copy" :size="24" color="var(--brand)" />
          <text class="tool-ai-copy-text">复制解析</text>
        </view>
      </view>
      <text v-if="disclaimer" class="tool-ai-sr-note">已附AI风险提示</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.tool-ai { padding: 24rpx 24rpx 0; }
.tool-ai-actions { display: flex; align-items: stretch; gap: 24rpx; }
.tool-ai-primary { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 26rpx 18rpx; background: var(--brand); border-radius: 20rpx; box-shadow: 0 8rpx 20rpx rgba(196,30,58,0.25); }
.tool-ai-primary.busy { opacity: 0.88; }
.tool-ai-primary-text { font-size: 28rpx; font-weight: 600; color: #fff; white-space: nowrap; }
.tool-ai-secondary { flex-shrink: 0; display: flex; }
.spin { animation: tool-ai-spin 0.9s linear infinite; }
@keyframes tool-ai-spin { to { transform: rotate(360deg); } }

.tool-ai-card { position: relative; margin-top: 22rpx; padding: 28rpx; overflow: hidden; background: #FFFDF8; border: 2rpx solid rgba(150,112,53,0.2); border-radius: 24rpx; box-shadow: 0 10rpx 28rpx rgba(71,45,24,0.08); }
.tool-ai-card::before { content: ''; position: absolute; left: 0; top: 28rpx; bottom: 28rpx; width: 6rpx; border-radius: 0 8rpx 8rpx 0; background: linear-gradient(180deg, #C41E3A, #8E1527); }
.tool-ai-head { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding-bottom: 22rpx; border-bottom: 2rpx solid rgba(90,60,35,0.08); }
.tool-ai-heading { display: flex; align-items: center; gap: 16rpx; min-width: 0; }
.tool-ai-seal { width: 58rpx; height: 58rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 3rpx solid #C41E3A; border-radius: 8rpx; transform: rotate(-2deg); background: rgba(196,30,58,0.04); }
.tool-ai-seal-text { font-size: 30rpx; line-height: 1; font-weight: 800; color: #C41E3A; }
.tool-ai-title { display: block; font-size: 30rpx; font-weight: 750; color: var(--text-ink); }
.tool-ai-subtitle { display: block; margin-top: 4rpx; font-size: 21rpx; color: var(--text-soft); }
.tool-ai-status { flex-shrink: 0; display: flex; align-items: center; gap: 8rpx; padding: 7rpx 14rpx; border-radius: 999rpx; background: rgba(5,150,105,0.09); }
.tool-ai-status.live { background: rgba(196,30,58,0.08); }
.tool-ai-status.failed { background: rgba(180,83,9,0.1); }
.tool-ai-status-text { font-size: 20rpx; font-weight: 600; color: #047857; }
.tool-ai-status.live .tool-ai-status-text { color: var(--brand); }
.tool-ai-status.failed .tool-ai-status-text { color: #B45309; }
.tool-ai-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: var(--brand); box-shadow: 0 0 0 0 rgba(196,30,58,0.35); animation: tool-ai-pulse 1.4s ease-out infinite; }
@keyframes tool-ai-pulse { 70% { box-shadow: 0 0 0 10rpx rgba(196,30,58,0); } 100% { box-shadow: 0 0 0 0 rgba(196,30,58,0); } }

.tool-ai-reading { display: flex; align-items: center; gap: 22rpx; padding: 34rpx 6rpx 16rpx; }
.tool-ai-orbit { width: 58rpx; height: 58rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 3rpx solid rgba(196,30,58,0.16); border-top-color: var(--brand); border-radius: 50%; animation: tool-ai-spin 1.2s linear infinite; }
.tool-ai-orbit-core { width: 16rpx; height: 16rpx; border-radius: 50%; background: var(--brand); opacity: 0.72; }
.tool-ai-reading-copy { min-width: 0; }
.tool-ai-reading-title { display: block; font-size: 26rpx; font-weight: 600; color: var(--text-ink); }
.tool-ai-reading-sub { display: block; margin-top: 6rpx; font-size: 21rpx; line-height: 1.5; color: var(--text-soft); }
.tool-ai-paper { position: relative; padding-top: 22rpx; }
.tool-ai-content { display: block; word-break: break-word; }
.tool-ai-caret { display: inline-block; width: 4rpx; height: 28rpx; margin: 0 0 -4rpx 5rpx; border-radius: 4rpx; background: var(--brand); animation: tool-ai-blink 0.8s steps(1) infinite; }
@keyframes tool-ai-blink { 50% { opacity: 0; } }
.tool-ai-error { display: flex; align-items: flex-start; gap: 12rpx; margin-top: 20rpx; padding: 18rpx; border-radius: 14rpx; background: rgba(180,83,9,0.08); }
.tool-ai-error-copy { flex: 1; min-width: 0; }
.tool-ai-error-title { display: block; font-size: 23rpx; line-height: 1.5; color: #92400E; }
.tool-ai-error-sub { display: block; margin-top: 4rpx; font-size: 20rpx; color: #A16207; }
.tool-ai-retry { flex-shrink: 0; padding: 8rpx 18rpx; border: 2rpx solid rgba(180,83,9,0.25); border-radius: 999rpx; }
.tool-ai-retry-text { font-size: 21rpx; font-weight: 600; color: #92400E; }
.tool-ai-foot { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-top: 22rpx; padding-top: 18rpx; border-top: 2rpx solid rgba(90,60,35,0.08); }
.tool-ai-foot-note { font-size: 20rpx; color: var(--text-soft); }
.tool-ai-copy { display: flex; align-items: center; gap: 7rpx; padding: 8rpx 14rpx; border-radius: 999rpx; background: rgba(196,30,58,0.06); }
.tool-ai-copy-text { font-size: 21rpx; font-weight: 600; color: var(--brand); }
.tool-ai-sr-note { position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .spin, .tool-ai-orbit, .tool-ai-dot, .tool-ai-caret { animation: none; }
}
</style>
