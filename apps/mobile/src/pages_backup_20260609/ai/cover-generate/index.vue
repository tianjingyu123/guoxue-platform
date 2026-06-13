<template>
  <view class="cg-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">AI 封面生成</text>
        <text class="header-history" @click="showHistory = true; loadHistory()">📋</text>
      </view>
    </view>

    <view class="cg-body">
      <view class="field">
        <text class="field-label">内容标题</text>
        <input v-model="title" class="field-input" placeholder="输入文章/帖子标题" />
      </view>

      <view class="field">
        <view class="field-label-row">
          <text class="field-label">生成描述 (Prompt)</text>
          <text class="field-smart" :class="{ disabled: !title }" @click="handleSmartPrompt">✨ 智能生成</text>
        </view>
        <textarea v-model="prompt" class="field-textarea" placeholder="描述你想要的封面风格、元素、色调等（可选）" />
      </view>

      <view class="field">
        <text class="field-label">封面风格</text>
        <view class="style-grid">
          <view v-for="s in styles" :key="s.value" class="style-card" :class="{ active: selectedStyle === s.value }" @click="selectedStyle = s.value">
            <view class="style-thumb">🖼️</view>
            <text class="style-name">{{ s.label }}</text>
            <view v-if="selectedStyle === s.value" class="style-check">✓</view>
          </view>
        </view>
      </view>

      <view class="field">
        <text class="field-label">封面尺寸</text>
        <view class="size-row">
          <view v-for="s in sizeOptions" :key="s.value" class="size-card" :class="{ active: selectedSize === s.value }" @click="selectedSize = s.value">
            <text class="size-label">{{ s.label }}</text>
            <text class="size-ratio">{{ s.ratio }}</text>
          </view>
        </view>
      </view>

      <view class="field">
        <text class="field-label">生成数量</text>
        <view class="count-row">
          <view v-for="c in [2, 4, 6]" :key="c" class="count-card" :class="{ active: generateCount === c }" @click="generateCount = c">
            <text>{{ c }} 张</text>
          </view>
        </view>
      </view>

      <view class="gen-btn" :class="{ disabled: !title || generating }" @click="handleGenerate">
        <text v-if="generating">⏳ AI 生成中...</text>
        <text v-else>✨ 生成封面</text>
      </view>

      <view v-if="results.length > 0" class="results-section">
        <view class="results-head">
          <text class="results-title">生成结果</text>
          <text class="results-retry" @click="handleGenerate">🔄 重新生成</text>
        </view>
        <view class="results-grid">
          <view v-for="r in results" :key="r.id" class="result-card" :class="{ selected: selectedResultId === r.id }" @click="selectedResultId = r.id">
            <view class="result-img-wrap">
              <image v-if="r.url" :src="r.url" class="result-img" mode="aspectFill" />
              <text v-else class="result-placeholder">🖼️</text>
            </view>
            <view v-if="selectedResultId === r.id" class="result-check">✓</view>
          </view>
        </view>

        <view v-if="selectedResult" class="preview-card">
          <view class="preview-img">
            <image v-if="selectedResult.url" :src="selectedResult.url" class="preview-img-inner" mode="aspectFill" />
            <text v-else class="preview-placeholder">🖼️</text>
          </view>
          <view class="preview-meta">
            <text class="preview-tag">{{ styleLabel(selectedResult.style) }}</text>
            <text class="preview-tag">{{ selectedResult.size }}</text>
          </view>
          <view class="preview-actions">
            <view class="preview-btn outline" @click="handleSave"><text>💾 保存</text></view>
            <view class="preview-btn outline" @click="handleDownload"><text>📥 下载</text></view>
          </view>
          <view v-if="contentId" class="preview-btn primary" @click="handleApply"><text>应用为封面</text></view>
        </view>
      </view>
    </view>

    <view v-if="showHistory" class="sheet-mask" @click="showHistory = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle" />
        <text class="sheet-title">生成历史</text>
        <scroll-view scroll-y class="sheet-body">
          <view v-if="historyLoading" class="history-loading">
            <view v-for="i in 3" :key="i" class="skeleton-card" />
          </view>
          <view v-else-if="history.length === 0" class="history-empty"><text>暂无生成历史</text></view>
          <view v-for="item in history" :key="item.id" class="history-item">
            <view class="hi-header">
              <text class="hi-title">{{ item.title }}</text>
              <text class="hi-time">{{ item.createdAt }}</text>
            </view>
            <view class="hi-thumbs">
              <view v-for="r in item.results" :key="r.id" class="hi-thumb" :class="{ active: r.id === item.selectedId }">
                <image v-if="r.url" :src="r.url" class="hi-thumb-img" mode="aspectFill" />
                <text v-else class="hi-thumb-empty">🖼️</text>
              </view>
            </view>
            <text class="hi-detail">查看详情 ›</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onLoad } from 'vue'

const title = ref('')
const prompt = ref('')
const selectedStyle = ref('traditional')
const selectedSize = ref('16:9')
const generateCount = ref(4)
const generating = ref(false)
const results = ref<{ id: string; url: string; style: string; size: string; prompt: string }[]>([])
const selectedResultId = ref<string | null>(null)
const saving = ref(false)
const showHistory = ref(false)
const historyLoading = ref(false)
const history = ref<{ id: string; title: string; createdAt: string; selectedId: string; results: { id: string; url: string }[] }[]>([])
const contentId = ref('')
const contentSummary = ref('')

const styles = [
  { value: 'traditional', label: '传统中国风' },
  { value: 'minimal', label: '极简风格' },
  { value: 'ink', label: '水墨风格' },
  { value: 'modern', label: '现代设计' },
  { value: 'calligraphy', label: '书法风格' },
  { value: 'nature', label: '自然风景' },
]

const sizeOptions = [
  { value: '16:9', label: '横版', ratio: '16:9' },
  { value: '4:3', label: '标准', ratio: '4:3' },
  { value: '1:1', label: '方形', ratio: '1:1' },
  { value: '3:4', label: '竖版', ratio: '3:4' },
]

const selectedResult = computed(() => results.value.find(r => r.id === selectedResultId.value))

function styleLabel(v: string) { return styles.find(s => s.value === v)?.label || v }

function handleSmartPrompt() {
  if (!title.value) return
  prompt.value = `为"${title.value}"设计一个${styleLabel(selectedStyle.value)}风格的封面，要求画面精美、构图合理、色彩协调`
}

function handleGenerate() {
  if (!title.value.trim() || generating.value) return
  generating.value = true
  results.value = []
  selectedResultId.value = null
  setTimeout(() => {
    results.value = Array.from({ length: generateCount.value }, (_, i) => ({
      id: `r${Date.now()}_${i}`,
      url: '',
      style: selectedStyle.value,
      size: selectedSize.value,
      prompt: prompt.value || `为"${title.value}"生成的封面方案${i + 1}`,
    }))
    if (results.value.length > 0) selectedResultId.value = results.value[0].id
    generating.value = false
  }, 1500)
}

function handleSave() {
  if (saving.value) return
  saving.value = true
  setTimeout(() => { uni.showToast({ title: '已保存到素材库', icon: 'success' }); saving.value = false }, 500)
}

function handleDownload() { uni.showToast({ title: '下载中...', icon: 'loading' }) }

function handleApply() { uni.navigateBack() }

function loadHistory() {
  historyLoading.value = true
  setTimeout(() => { historyLoading.value = false }, 500)
}
</script>

<style scoped>
.cg-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: linear-gradient(90deg, #C41E3A, #9a1830); }
.header-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #fff; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #fff; }
.header-history { font-size: 32rpx; width: 56rpx; text-align: right; }

.cg-body { padding: 24rpx; }
.field { margin-bottom: 24rpx; }
.field-label { font-size: 26rpx; font-weight: 500; color: #333; display: block; margin-bottom: 10rpx; }
.field-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.field-smart { font-size: 22rpx; color: #C41E3A; }
.field-smart.disabled { opacity: 0.5; }
.field-input { background: #fff; border-radius: 14rpx; padding: 16rpx 18rpx; font-size: 26rpx; color: #333; }
.field-textarea { background: #fff; border-radius: 14rpx; padding: 16rpx 18rpx; font-size: 26rpx; color: #333; width: 100%; box-sizing: border-box; height: 160rpx; }

.style-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.style-card { background: #fff; border-radius: 14rpx; padding: 20rpx 0 14rpx; text-align: center; border: 2px solid transparent; position: relative; }
.style-card.active { border-color: #C41E3A; background: #FFF5F5; }
.style-thumb { font-size: 36rpx; margin-bottom: 8rpx; }
.style-name { font-size: 22rpx; color: #666; }
.style-card.active .style-name { color: #C41E3A; }
.style-check { position: absolute; top: -6rpx; right: -6rpx; width: 36rpx; height: 36rpx; border-radius: 50%; background: #C41E3A; color: #fff; font-size: 20rpx; display: flex; align-items: center; justify-content: center; }

.size-row, .count-row { display: flex; gap: 12rpx; }
.size-card, .count-card { flex: 1; background: #fff; border-radius: 14rpx; padding: 16rpx 0; text-align: center; border: 2px solid transparent; }
.size-card.active, .count-card.active { border-color: #C41E3A; background: #FFF5F5; }
.size-label { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.size-card.active .size-label, .count-card.active text { color: #C41E3A; }
.size-ratio { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.count-card text { font-size: 26rpx; color: #333; }

.gen-btn { background: linear-gradient(90deg, #C41E3A, #9a1830); border-radius: 16rpx; padding: 24rpx; text-align: center; margin-bottom: 32rpx; }
.gen-btn.disabled { opacity: 0.6; }
.gen-btn text { font-size: 30rpx; font-weight: 600; color: #fff; }

.results-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.results-title { font-size: 28rpx; font-weight: 600; color: #333; }
.results-retry { font-size: 22rpx; color: #C41E3A; }
.results-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; margin-bottom: 20rpx; }
.result-card { border-radius: 14rpx; overflow: hidden; border: 2px solid transparent; position: relative; }
.result-card.selected { border-color: #C41E3A; }
.result-img-wrap { aspect-ratio: 16/9; background: #f0f0f0; }
.result-img { width: 100%; height: 100%; }
.result-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 48rpx; }
.result-check { position: absolute; top: 8rpx; right: 8rpx; width: 36rpx; height: 36rpx; border-radius: 50%; background: #C41E3A; color: #fff; font-size: 20rpx; display: flex; align-items: center; justify-content: center; }

.preview-card { background: #fff; border-radius: 16rpx; padding: 20rpx; }
.preview-img { border-radius: 12rpx; overflow: hidden; aspect-ratio: 16/9; background: #f0f0f0; margin-bottom: 14rpx; }
.preview-img-inner { width: 100%; height: 100%; }
.preview-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 56rpx; }
.preview-meta { display: flex; gap: 8rpx; margin-bottom: 16rpx; }
.preview-tag { font-size: 20rpx; color: #999; background: #F5F1EB; padding: 4rpx 12rpx; border-radius: 8rpx; }
.preview-actions { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.preview-btn { flex: 1; padding: 18rpx; border-radius: 14rpx; text-align: center; }
.preview-btn.outline { border: 1px solid #E8E0D5; }
.preview-btn.outline text { font-size: 24rpx; color: #666; }
.preview-btn.primary { background: #C41E3A; }
.preview-btn.primary text { font-size: 24rpx; color: #fff; }

.sheet-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.sheet-panel { background: #fff; border-radius: 24rpx 24rpx 0 0; height: 70vh; width: 100%; display: flex; flex-direction: column; }
.sheet-handle { width: 60rpx; height: 6rpx; background: #E8E0D5; border-radius: 3rpx; margin: 16rpx auto; }
.sheet-title { font-size: 30rpx; font-weight: 600; color: #333; text-align: center; margin-bottom: 16rpx; }
.sheet-body { flex: 1; padding: 0 24rpx; }

.history-loading { display: flex; flex-direction: column; gap: 16rpx; }
.skeleton-card { height: 120rpx; background: #f0f0f0; border-radius: 14rpx; }
.history-empty { text-align: center; padding: 80rpx 0; color: #999; font-size: 26rpx; }
.history-item { background: #FAF8F5; border-radius: 14rpx; padding: 16rpx; margin-bottom: 16rpx; }
.hi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.hi-title { font-size: 26rpx; font-weight: 500; color: #333; max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hi-time { font-size: 20rpx; color: #999; }
.hi-thumbs { display: flex; gap: 8rpx; overflow-x: auto; margin-bottom: 10rpx; }
.hi-thumb { width: 120rpx; height: 72rpx; border-radius: 8rpx; overflow: hidden; border: 2px solid transparent; flex-shrink: 0; background: #f0f0f0; }
.hi-thumb.active { border-color: #C41E3A; }
.hi-thumb-img { width: 100%; height: 100%; }
.hi-thumb-empty { display: flex; align-items: center; justify-content: center; font-size: 28rpx; height: 100%; }
.hi-detail { font-size: 22rpx; color: #C41E3A; }
</style>
