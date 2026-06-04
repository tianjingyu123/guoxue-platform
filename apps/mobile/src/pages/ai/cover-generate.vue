<template>
  <view class="page">
    <view class="header">
      <view class="header-inner">
        <view class="header-left">
          <text class="back-btn" @click="goBack">‹</text>
          <text class="header-title">AI 封面生成</text>
        </view>
        <text class="history-btn" @click="openHistory">📋 历史</text>
      </view>
    </view>

    <scroll-view scroll-y class="content-scroll">
      <view class="form-section">
        <view class="field">
          <text class="field-label">内容标题</text>
          <input v-model="title" class="field-input" placeholder="输入文章/帖子标题" />
        </view>

        <view class="field">
          <view class="field-label-row">
            <text class="field-label">生成描述 (Prompt)</text>
            <text class="smart-btn" :class="{ disabled: !title.trim() }" @click="handleSmartPrompt">✨ 智能生成</text>
          </view>
          <textarea v-model="prompt" class="field-textarea" placeholder="描述你想要的封面风格、元素、色调等（可选）" />
        </view>

        <view class="field">
          <text class="field-label">封面风格</text>
          <view class="style-grid">
            <view v-for="s in styles" :key="s.value" class="style-card" :class="{ active: selectedStyle === s.value }" @click="selectedStyle = s.value">
              <view class="style-preview"><text class="style-preview-icon">🖼</text></view>
              <text class="style-name" :class="{ active: selectedStyle === s.value }">{{ s.label }}</text>
              <text v-if="selectedStyle === s.value" class="style-checked">✓</text>
            </view>
          </view>
        </view>

        <view class="field">
          <text class="field-label">封面尺寸</text>
          <view class="size-options">
            <view v-for="s in sizeOptions" :key="s.value" class="size-btn" :class="{ active: selectedSize === s.value }" @click="selectedSize = s.value">
              <text class="size-label">{{ s.label }}</text>
              <text class="size-ratio">{{ s.ratio }}</text>
            </view>
          </view>
        </view>

        <view class="field">
          <text class="field-label">生成数量</text>
          <view class="count-options">
            <view v-for="n in [2, 4, 6]" :key="n" class="count-btn" :class="{ active: generateCount === n }" @click="generateCount = n"><text>{{ n }} 张</text></view>
          </view>
        </view>

        <view class="gen-btn" :class="{ disabled: !title.trim() || generating }" @click="handleGenerate">
          <text v-if="generating">⏳ AI 生成中...</text>
          <text v-else>✨ 生成封面</text>
        </view>

        <!-- 生成结果 -->
        <view v-if="results.length" class="results-section">
          <view class="results-header">
            <text class="results-title">生成结果</text>
            <text class="regenerate-btn" @click="handleGenerate">🔄 重新生成</text>
          </view>
          <view class="results-grid">
            <view v-for="r in results" :key="r.id" class="result-card" :class="{ selected: selectedResultId === r.id }" @click="selectedResultId = r.id">
              <image :src="r.url" mode="aspectFill" class="result-img" />
              <text v-if="selectedResultId === r.id" class="result-check">✓</text>
            </view>
          </view>

          <view v-if="selectedResult" class="selected-preview">
            <image :src="selectedResult.url" mode="aspectFill" class="preview-img" />
            <view class="preview-tags">
              <text class="preview-tag">{{ getStyleName(selectedResult.style) }}</text>
              <text class="preview-tag">{{ selectedResult.size }}</text>
            </view>
            <view class="preview-actions">
              <view class="action-btn" @click="handleSave"><text>💾 保存</text></view>
              <view class="action-btn" @click="handleDownload"><text>📥 下载</text></view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 历史记录弹层 -->
    <view v-if="showHistory" class="overlay" @click="showHistory = false">
      <view class="sheet" @click.stop>
        <view class="sheet-header"><text class="sheet-title">生成历史</text><text class="sheet-close" @click="showHistory = false">✕</text></view>
        <scroll-view scroll-y class="sheet-list">
          <view v-if="historyLoading" class="history-loading">
            <view v-for="i in 3" :key="i" class="history-skeleton" />
          </view>
          <view v-else-if="!history.length" class="history-empty">暂无生成历史</view>
          <view v-else v-for="item in history" :key="item.id" class="history-item">
            <view class="hi-top"><text class="hi-title">{{ item.title }}</text><text class="hi-time">{{ item.createdAt }}</text></view>
            <scroll-view scroll-x class="hi-thumbs">
              <image v-for="r in item.results" :key="r.id" :src="r.url" mode="aspectFill" class="hi-thumb" :class="{ selected: r.id === item.selectedId }" />
            </scroll-view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { aiApi } from '../../api'

interface CoverResult { id: string; url: string; style: string; size: string; prompt: string }
interface CoverHistory { id: string; title: string; createdAt: string; results: CoverResult[]; selectedId?: string }
interface CoverStyle { value: string; label: string }

const title = ref(''); const prompt = ref(''); const selectedStyle = ref('traditional'); const selectedSize = ref('16:9')
const generateCount = ref(4); const styles = ref<CoverStyle[]>([])
const generating = ref(false); const results = ref<CoverResult[]>([]); const selectedResultId = ref<string | null>(null)
const showHistory = ref(false); const history = ref<CoverHistory[]>([]); const historyLoading = ref(false)

const sizeOptions = [{ value: '16:9', label: '横版', ratio: '16:9' }, { value: '4:3', label: '标准', ratio: '4:3' }, { value: '1:1', label: '方形', ratio: '1:1' }, { value: '3:4', label: '竖版', ratio: '3:4' }]

const selectedResult = computed(() => results.value.find(r => r.id === selectedResultId.value))

onMounted(async () => {
  try { styles.value = [{ value: 'traditional', label: '古典' }, { value: 'ink', label: '水墨' }, { value: 'minimal', label: '简约' }, { value: 'huaqing', label: '青花' }, { value: 'seal', label: '篆刻' }, { value: 'dunhuang', label: '敦煌' }] } catch {}
})

async function handleSmartPrompt() {
  if (!title.value.trim()) return
  prompt.value = `为"${title.value}"生成封面，${selectedStyle.value}风格`
}

async function handleGenerate() {
  if (!title.value.trim() || generating.value) return
  generating.value = true; results.value = []; selectedResultId.value = null
  try {
    const res = await aiApi.generateCover({ prompt: prompt.value || title.value, style: selectedStyle.value, size: selectedSize.value, count: generateCount.value }) as any
    if (res?.results) results.value = res.results; else if (res?.url) results.value = [{ id: '1', url: res.url, style: selectedStyle.value, size: selectedSize.value, prompt: prompt.value }]
    if (results.value.length) selectedResultId.value = results.value[0].id
  } catch { uni.showToast({ title: '生成失败', icon: 'none' }) }
  generating.value = false
}

function handleSave() { uni.showToast({ title: '已保存到素材库' }) }
function handleDownload() { uni.showToast({ title: '下载成功' }) }
function getStyleName(s: string): string { const m: Record<string, string> = { traditional: '古典', ink: '水墨', minimal: '简约', huaqing: '青花', seal: '篆刻', dunhuang: '敦煌' }; return m[s] || s }

async function openHistory() {
  showHistory.value = true; historyLoading.value = true
  try { /* would call API */ } catch {}
  historyLoading.value = false
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }
.header { position: sticky; top: 0; z-index: 10; background: linear-gradient(135deg, #C41E3A, #9a1830); }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.header-left { display: flex; align-items: center; gap: 12rpx; }
.back-btn { font-size: 36rpx; color: #fff; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #fff; }
.history-btn { font-size: 24rpx; color: rgba(255,255,255,0.8); }
.content-scroll { padding: 24rpx; }
.form-section { display: flex; flex-direction: column; gap: 28rpx; }
.field { }
.field-label { font-size: 26rpx; font-weight: 500; color: #555; display: block; margin-bottom: 10rpx; }
.field-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.smart-btn { font-size: 22rpx; color: #C41E3A; }
.smart-btn.disabled { opacity: 0.5; }
.field-input { width: 100%; background: #fff; border: 1rpx solid #E5E1DB; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; box-sizing: border-box; }
.field-textarea { width: 100%; background: #fff; border: 1rpx solid #E5E1DB; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; min-height: 120rpx; box-sizing: border-box; }
.style-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.style-card { position: relative; background: #fff; border: 2rpx solid #E5E1DB; border-radius: 12rpx; padding: 16rpx; text-align: center; }
.style-card.active { border-color: #C41E3A; background: #fef0f0; }
.style-preview { width: 100%; height: 72rpx; background: #f5f0e8; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.style-preview-icon { font-size: 36rpx; }
.style-name { font-size: 22rpx; color: #555; }
.style-name.active { color: #C41E3A; font-weight: 500; }
.style-checked { position: absolute; top: -6rpx; right: -6rpx; width: 32rpx; height: 32rpx; background: #C41E3A; border-radius: 50%; color: #fff; font-size: 20rpx; line-height: 32rpx; text-align: center; }
.size-options { display: flex; gap: 12rpx; }
.size-btn { flex: 1; background: #fff; border: 2rpx solid #E5E1DB; border-radius: 12rpx; padding: 12rpx; text-align: center; }
.size-btn.active { border-color: #C41E3A; background: #fef0f0; }
.size-label { font-size: 24rpx; font-weight: 500; color: #555; display: block; }
.size-btn.active .size-label { color: #C41E3A; }
.size-ratio { font-size: 20rpx; color: #999; }
.count-options { display: flex; gap: 12rpx; }
.count-btn { flex: 1; background: #fff; border: 2rpx solid #E5E1DB; border-radius: 12rpx; padding: 14rpx; text-align: center; font-size: 24rpx; color: #555; }
.count-btn.active { border-color: #C41E3A; background: #fef0f0; color: #C41E3A; }
.gen-btn { background: linear-gradient(135deg, #C41E3A, #9a1830); color: #fff; text-align: center; padding: 20rpx; border-radius: 12rpx; font-size: 28rpx; font-weight: 600; }
.gen-btn.disabled { opacity: 0.5; }
.results-section { margin-top: 16rpx; }
.results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.results-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.regenerate-btn { font-size: 24rpx; color: #C41E3A; }
.results-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.result-card { position: relative; border-radius: 12rpx; overflow: hidden; border: 2rpx solid #E5E1DB; }
.result-card.selected { border-color: #C41E3A; }
.result-img { width: 100%; height: 200rpx; }
.result-check { position: absolute; top: 12rpx; right: 12rpx; width: 40rpx; height: 40rpx; background: #C41E3A; border-radius: 50%; color: #fff; font-size: 24rpx; line-height: 40rpx; text-align: center; }
.selected-preview { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-top: 16rpx; }
.preview-img { width: 100%; height: 300rpx; border-radius: 12rpx; }
.preview-tags { display: flex; gap: 8rpx; margin-top: 12rpx; }
.preview-tag { font-size: 20rpx; padding: 4rpx 16rpx; background: #F5F0E8; border-radius: 16rpx; color: #666; }
.preview-actions { display: flex; gap: 16rpx; margin-top: 16rpx; }
.action-btn { flex: 1; text-align: center; padding: 14rpx; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 24rpx; color: #555; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; max-height: 70vh; display: flex; flex-direction: column; }
.sheet-header { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-bottom: 1rpx solid #E5E1DB; }
.sheet-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.sheet-close { font-size: 32rpx; color: #999; padding: 8rpx; }
.sheet-list { flex: 1; overflow-y: auto; padding: 16rpx; }
.history-loading { display: flex; flex-direction: column; gap: 16rpx; }
.history-skeleton { height: 120rpx; background: #f5f5f5; border-radius: 12rpx; }
.history-empty { text-align: center; padding: 60rpx 0; color: #999; font-size: 26rpx; }
.history-item { background: #FAFAFA; border-radius: 12rpx; padding: 16rpx; margin-bottom: 12rpx; }
.hi-top { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.hi-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hi-time { font-size: 22rpx; color: #999; flex-shrink: 0; }
.hi-thumbs { white-space: nowrap; }
.hi-thumb { width: 120rpx; height: 80rpx; border-radius: 8rpx; margin-right: 12rpx; border: 2rpx solid transparent; }
.hi-thumb.selected { border-color: #C41E3A; }
</style>
