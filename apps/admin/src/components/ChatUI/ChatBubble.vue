<template>
  <div :class="['chat-bubble', message.role]">
    <!-- AI 水印 -->
    <div
      v-if="message.role === 'assistant'"
      class="bubble-ai-badge"
    >
      <el-icon><Cpu /></el-icon>
      <span>AI 生成</span>
      <el-tooltip
        content="此内容由AI生成，仅供参考"
        placement="top"
      >
        <el-icon class="ai-info-icon">
          <InfoFilled />
        </el-icon>
      </el-tooltip>
    </div>

    <!-- 消息内容 -->
    <div class="bubble-body">
      <!-- 流式输出中：显示原始文本 + 光标动画 -->
      <div
        v-if="message.isStreaming"
        class="bubble-text streaming"
      >
        <SafeHtml
          tag="span"
          :html="renderedContent"
        />
        <span class="cursor-blink">|</span>
      </div>

      <!-- 完整消息：Markdown 渲染 -->
      <SafeHtml
        v-else
        class="bubble-text"
        :html="renderedContent"
        @click="onContentClick"
      />

      <!-- 参考来源 -->
      <div
        v-if="showSources && message.sources?.length"
        class="bubble-sources"
      >
        <div class="sources-title">
          参考来源
        </div>
        <div
          v-for="s in message.sources"
          :key="s.index"
          class="source-item"
          @click="$emit('sourceClick', s)"
        >
          <sup>[{{ s.index + 1 }}]</sup>
          <span class="source-title">{{ s.title }}</span>
          <span
            v-if="s.excerpt"
            class="source-excerpt"
          > — {{ s.excerpt.slice(0, 80) }}{{ s.excerpt.length > 80 ? '...' : '' }}</span>
        </div>
      </div>

      <!-- Token 用量 -->
      <div
        v-if="message.usage"
        class="bubble-usage"
      >
        {{ message.usage.promptTokens ?? '?' }} ↑ / {{ message.usage.completionTokens ?? '?' }} ↓ tokens
      </div>

      <!-- 时间 -->
      <div
        v-if="message.createdAt && !message.isStreaming"
        class="bubble-time"
      >
        {{ formatTime(message.createdAt) }}
      </div>
    </div>

    <!-- 操作按钮 -->
    <div
      v-if="showFeedback && message.role === 'assistant' && !message.isStreaming"
      class="bubble-actions"
    >
      <el-button
        size="small"
        text
        :type="message.feedback === 'like' ? 'primary' : ''"
        @click="$emit('feedback', 'like')"
      >
        <el-icon><Select /></el-icon>
      </el-button>
      <el-button
        size="small"
        text
        :type="message.feedback === 'dislike' ? 'danger' : ''"
        @click="$emit('feedback', 'dislike')"
      >
        <el-icon><CloseBold /></el-icon>
      </el-button>
      <el-button
        v-if="showRetry"
        size="small"
        text
        @click="$emit('retry')"
      >
        <el-icon><Refresh /></el-icon>
        重新生成
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Cpu, Select, CloseBold, Refresh, InfoFilled } from '@element-plus/icons-vue'
import SafeHtml from '@/components/SafeHtml.vue'
import { renderMarkdown } from './markdown'
import type { ChatMessage, ChatSource } from './types'

const props = defineProps<{
  message: ChatMessage
  showSources?: boolean
  showFeedback?: boolean
  showRetry?: boolean
}>()

const emit = defineEmits<{
  feedback: [type: 'like' | 'dislike']
  retry: []
  sourceClick: [source: ChatSource]
}>()

const renderedContent = computed(() => renderMarkdown(props.message.content))

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/** 点击消息内容中的引用标注 [n]，触发 sourceClick 事件 */
function onContentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'SUP' && target.textContent) {
    const match = target.textContent.match(/\[(\d+)\]/)
    if (match && props.message.sources) {
      const idx = parseInt(match[1]) - 1
      const source = props.message.sources[idx]
      if (source) {
        // 触发 sourceClick 事件，同时滚动到来源区
        emit('sourceClick', source)
        const sourcesEl = (e.currentTarget as HTMLElement)?.parentElement?.querySelector('.bubble-sources')
        if (sourcesEl) sourcesEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }
}
</script>

<style scoped>
.chat-bubble { display:flex; flex-direction:column; gap:6px; max-width:80%; padding:12px 16px; border-radius:12px; position:relative }
.chat-bubble.user { align-self:flex-end; background:#409eff; color:#fff }
.chat-bubble.assistant { align-self:flex-start; background:#f5f7fa; color:#303133 }
.chat-bubble.system { align-self:center; background:#fdf6ec; color:#e6a23c; font-size:12px; max-width:90% }

.bubble-ai-badge { display:flex; align-items:center; gap:4px; font-size:11px; color:#909399; margin-bottom:4px; padding:2px 8px; background:linear-gradient(135deg, #f0f5ff 0%, #e6f0ff 100%); border-radius:4px; width:fit-content; user-select:none }
.bubble-ai-badge .ai-info-icon { font-size:12px; color:#a0c4ff; cursor:help }
.bubble-body { flex:1 }
.bubble-text { font-size:14px; line-height:1.7; word-break:break-word }
.bubble-text :deep(p) { margin:4px 0 }
.bubble-text :deep(pre) { margin:8px 0 }
.bubble-text :deep(code) { font-family: 'Consolas', 'Monaco', monospace }
.bubble-text :deep(a) { color:#409eff }
.user .bubble-text :deep(a) { color:#fff; text-decoration:underline }
.user .bubble-text :deep(code) { background:rgba(255,255,255,.2) }

.cursor-blink { animation: blink 1s step-end infinite; font-weight:100; font-size:16px }
@keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }

.bubble-sources { margin-top:8px; padding-top:8px; border-top:1px solid #e4e7ed }
.sources-title { font-size:12px; color:#909399; margin-bottom:4px; font-weight:500 }
.source-item { font-size:12px; color:#409eff; cursor:pointer; margin:2px 0; padding:2px 4px; border-radius:4px; transition: background .2s }
.source-item:hover { background:rgba(64,158,255,0.08) }
.source-excerpt { color:#909399; font-size:11px }

.bubble-usage { font-size:11px; color:#c0c4cc; margin-top:6px }
.bubble-time { font-size:11px; color:#909399; margin-top:4px }
.user .bubble-time { color:rgba(255,255,255,0.7) }

.bubble-actions { display:flex; gap:2px; margin-top:2px; opacity:0; transition:opacity .2s }
.chat-bubble:hover .bubble-actions { opacity:1 }
</style>
