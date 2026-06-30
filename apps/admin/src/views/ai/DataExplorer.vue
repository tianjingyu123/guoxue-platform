<template>
  <div
    class="page"
    style="display:flex;flex-direction:column;height:calc(100vh - 100px)"
  >
    <div class="toolbar">
      <h3>AI 数据探索</h3>
      <span style="color:var(--color-text-secondary);font-size:13px">用自然语言查询数据库，AI 自动转 SQL 并解读结果</span>
    </div>

    <!-- 快速提问 -->
    <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">
      <el-tag
        v-for="q in quickQuestions"
        :key="q"
        size="small"
        style="cursor:pointer"
        effect="plain"
        @click="quickAsk(q)"
      >
        {{ q }}
      </el-tag>
    </div>

    <!-- ChatUI 对话区 -->
    <div style="flex:1;border:1px solid var(--color-border);border-radius:8px;overflow:hidden;display:flex;flex-direction:column">
      <ChatUI
        ref="chatRef"
        :config="chatConfig"
        @message-sent="onUserMessage"
        @message-received="onAiResponse"
      />

      <!-- SQL 结果卡片（在对话下方展示结构化数据） -->
      <div
        v-if="loading || queryErr || currentResult"
        class="result-area"
      >
        <!-- 加载态 -->
        <div
          v-if="loading"
          v-loading="true"
          element-loading-text="查询中..."
          style="height:120px"
        />

        <!-- 错误态 -->
        <el-result
          v-else-if="queryErr"
          icon="error"
          title="查询失败"
          :sub-title="queryErrMsg"
        >
          <template #extra>
            <el-button
              type="primary"
              :disabled="!lastQuestion"
              @click="retryQuery"
            >
              重试
            </el-button>
          </template>
        </el-result>

        <!-- 正常结果 -->
        <template v-else>
          <el-collapse v-model="resultCollapse">
          <el-collapse-item
            title="生成的 SQL"
            name="sql"
          >
            <pre class="sql-block">{{ currentResult.sql }}</pre>
          </el-collapse-item>
        </el-collapse>

        <div
          v-if="currentResult.chartSuggestion"
          class="chart-suggestion"
        >
          <el-icon><TrendCharts /></el-icon>
          <el-tag
            :type="chartTagType(currentResult.chartSuggestion.type)"
            size="small"
          >
            {{ chartLabel(currentResult.chartSuggestion.type) }}
          </el-tag>
          <span style="font-size:13px;font-weight:500">{{ currentResult.chartSuggestion.title }}</span>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:13px;color:var(--color-text-body)">
            查询结果（{{ currentResult.rowCount || 0 }} 条）
          </span>
          <el-button
            v-if="currentResult.rowCount > 0"
            size="small"
            @click="exportCsv"
          >
            导出 CSV
          </el-button>
        </div>

        <el-table
          v-if="currentResult.rowCount > 0"
          :data="currentResult.data"
          stripe
          border
          size="small"
          max-height="300"
          style="width:100%"
        >
          <el-table-column
            v-for="col in dataColumns"
            :key="col"
            :prop="col"
            :label="col"
            min-width="100"
            show-overflow-tooltip
          />
        </el-table>
          <el-empty
            v-else
            description="无数据"
            :image-size="40"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, computed } from 'vue'
import { TrendCharts } from '@element-plus/icons-vue'
import { ChatUI } from '@/components/ChatUI'
import type { ChatUIConfig, ChatMessage } from '@/components/ChatUI/types'
import { aiDataExplorerApi } from '@/api'
import { ElMessage } from 'element-plus'

const chatRef = ref<InstanceType<typeof ChatUI>>()
const currentResult = ref<any>(null)
const resultCollapse = ref<string[]>(['sql'])
const loading = ref(false)
const queryErr = ref(false)
const queryErrMsg = ref('')
const lastQuestion = ref('')

const quickQuestions = [
  '最近7天每天的订单金额',
  '注册用户数最多的前10天',
  '各内容类型数量统计',
  '最近30天每天的评论数',
  '付费用户和非付费用户占比',
]

const chatConfig: ChatUIConfig = {
  apiEndpoint: '/api/v1/ai/chat/stream',
  fallbackEndpoint: '/api/v1/ai/data-explorer/ask',
  placeholder: '输入问题，例如：最近30天每天的新增订单数？',
  showSources: false,
  showFeedback: true,
  showRetry: true,
  welcomeMessage: '你好！我是 AI 数据助手。你可以用中文向我提问，我会自动查询数据库并分析结果。试试上面的快捷问题吧！',
  systemContext: `
你是一个 SQL 专家。数据库是 PostgreSQL。
可查询的表：User (用户), Content (内容), Comment (评论), "Order" (订单), Subscription (订阅), Favorite (收藏), Station (分站)
查询规则：
1. 只生成 SELECT 查询
2. 使用双引号包裹表名和字段名
3. LIMIT 最多 1000 条
4. 时间字段用 ISO 8601 格式比较
`,
  extraBody: { scene: 'nl2sql', options: { maxTokens: 500, temperature: 0.1 } },
}

const dataColumns = computed(() => {
  if (!currentResult.value?.data?.length) return []
  return Object.keys(currentResult.value.data[0])
})

function chartLabel(type: string) {
  const m: Record<string,string> = { line:'折线图', bar:'柱状图', pie:'饼图', table:'表格' }
  return m[type] || type
}

function chartTagType(type: string) {
  const m: Record<string,string> = { line:'primary', bar:'success', pie:'warning', table:'info' }
  return m[type] || 'info'
}

/** 快捷提问 — 直接用 DataExplorer API 查数据 */
async function quickAsk(q: string) {
  chatRef.value?.addMessage({
    id: `q-${Date.now()}`, role: 'user', content: q, createdAt: new Date(),
  })
  lastQuestion.value = q
  loading.value = true; currentResult.value = null; queryErr.value = false

  try {
    const res = await aiDataExplorerApi.ask(q)
    currentResult.value = res.data

    // 在对话中添加 AI 摘要
    if (res.data?.aiSummary) {
      chatRef.value?.addMessage({
        id: `a-${Date.now()}`, role: 'assistant',
        content: `${res.data.aiSummary}\n\n> 共查询到 **${res.data.rowCount}** 条数据`,
        createdAt: new Date(),
      })
    }
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || e.message || '查询失败'
    queryErr.value = true; queryErrMsg.value = errMsg
    chatRef.value?.addMessage({
      id: `err-${Date.now()}`, role: 'assistant',
      content: `查询失败：${errMsg}`, createdAt: new Date(),
    })
  } finally {
    loading.value = false
  }
}

/** 重试上一次查询 */
function retryQuery() {
  if (lastQuestion.value) quickAsk(lastQuestion.value)
}

/** 用户发送消息 → 也走 DataExplorer API */
async function onUserMessage(msg: ChatMessage) {
  lastQuestion.value = msg.content
  loading.value = true; currentResult.value = null; queryErr.value = false

  try {
    const res = await aiDataExplorerApi.ask(msg.content)
    currentResult.value = res.data

    if (res.data?.aiSummary) {
      chatRef.value?.addMessage({
        id: `a-${Date.now()}`, role: 'assistant',
        content: `${res.data.aiSummary}\n\n> 共查询到 **${res.data.rowCount}** 条数据，下方可展开 SQL 和明细`,
        createdAt: new Date(),
      })
    }
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || e.message || '查询失败'
    queryErr.value = true; queryErrMsg.value = errMsg
    chatRef.value?.addMessage({
      id: `err-${Date.now()}`, role: 'assistant',
      content: `查询失败：${errMsg}`, createdAt: new Date(),
    })
  } finally {
    loading.value = false
  }
}

function onAiResponse(msg: ChatMessage) {
  // SSE 流式响应完成后的回调（通用 AI 对话用）
  // DataExplorer 走 quickAsk/onUserMessage 专用路径
}

function exportCsv() {
  if (!currentResult.value?.data?.length) return
  const cols = dataColumns.value
  const header = cols.join(',')
  const rows = currentResult.value.data.map((r: any) =>
    cols.map((c: string) => {
      const v = r[c]
      if (v === null || v === undefined) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  )
  const csv = '﻿' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `data-export-${Date.now()}.csv`
  a.click(); URL.revokeObjectURL(url)
}
</script>

<style scoped>
.toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px }
.result-area { border-top:1px solid var(--color-border); padding:12px; background:#fff; max-height:400px; overflow-y:auto }
.sql-block { background:#1e1e1e; color:#d4d4d4; padding:10px; border-radius:6px; margin:0; font-size:12px; overflow-x:auto; line-height:1.6 }
.chart-suggestion { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid var(--color-border); margin-bottom:8px }
</style>
