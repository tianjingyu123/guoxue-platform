<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view
      class="nav"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="nav-inner">
        <view class="nav-left">
          <view
            class="nav-back"
            @tap="goBack"
          >
            <app-icon
              name="arrow-left"
              :size="40"
              color="#fff"
            />
          </view>
          <text class="nav-title">
            AI 封面生成
          </text>
        </view>
        <view
          class="nav-history"
          @tap="openHistory"
        >
          <app-icon
            name="history"
            :size="40"
            color="#fff"
          />
        </view>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view
      v-if="loading"
      class="skeleton"
    >
      <view
        v-for="i in 5"
        :key="i"
        class="sk-block"
      />
    </view>

    <scroll-view
      v-else
      scroll-y
      class="body"
    >
      <view class="content">
        <!-- 内容标题 -->
        <view class="field">
          <text class="field-label">
            内容标题
          </text>
          <input
            v-model="title"
            class="field-input"
            placeholder="输入文章/帖子标题"
            placeholder-class="ph"
          >
        </view>

        <!-- Prompt -->
        <view class="field">
          <view class="field-head">
            <text class="field-label">
              生成描述 (Prompt)
            </text>
            <view
              class="smart-btn"
              :class="{ disabled: !title.trim() }"
              @tap="handleSmartPrompt"
            >
              <app-icon
                name="wand-2"
                :size="24"
                :color="title.trim() ? '#C41E3A' : '#C41E3A80'"
              />
              <text class="smart-txt">
                智能生成
              </text>
            </view>
          </view>
          <textarea
            v-model="prompt"
            class="field-textarea"
            placeholder="描述你想要的封面风格、元素、色调等（可选，AI会根据标题自动生成）"
            placeholder-class="ph"
            :maxlength="-1"
          />
        </view>

        <!-- 封面风格 -->
        <view class="field">
          <text class="field-label">
            封面风格
          </text>
          <view class="style-grid">
            <view
              v-for="s in styles"
              :key="s.value"
              class="style-card"
              :class="{ active: selectedStyle === s.value }"
              @tap="selectedStyle = s.value"
            >
              <view
                class="style-thumb"
                :style="{ background: s.preview }"
              >
                <app-icon
                  name="image"
                  :size="44"
                  color="#ffffffcc"
                />
              </view>
              <text
                class="style-name"
                :class="{ active: selectedStyle === s.value }"
              >
                {{ s.label }}
              </text>
              <view
                v-if="selectedStyle === s.value"
                class="style-check"
              >
                <app-icon
                  name="check"
                  :size="22"
                  color="#fff"
                />
              </view>
            </view>
          </view>
        </view>

        <!-- 封面尺寸 -->
        <view class="field">
          <text class="field-label">
            封面尺寸
          </text>
          <view class="size-row">
            <view
              v-for="sz in sizeOptions"
              :key="sz.value"
              class="size-card"
              :class="{ active: selectedSize === sz.value }"
              @tap="selectedSize = sz.value"
            >
              <text
                class="size-label"
                :class="{ active: selectedSize === sz.value }"
              >
                {{ sz.label }}
              </text>
              <text class="size-ratio">
                {{ sz.ratio }}
              </text>
            </view>
          </view>
        </view>

        <!-- 生成数量 -->
        <view class="field">
          <text class="field-label">
            生成数量
          </text>
          <view class="count-row">
            <view
              v-for="c in [2, 4, 6]"
              :key="c"
              class="count-card"
              :class="{ active: generateCount === c }"
              @tap="generateCount = c"
            >
              <text
                class="count-txt"
                :class="{ active: generateCount === c }"
              >
                {{ c }} 张
              </text>
            </view>
          </view>
        </view>

        <!-- 生成按钮 -->
        <view
          class="gen-btn"
          :class="{ disabled: !title.trim() || generating }"
          @tap="handleGenerate"
        >
          <app-icon
            v-if="generating"
            name="refresh-cw"
            :size="36"
            color="#fff"
            class="spin"
          />
          <app-icon
            v-else
            name="sparkles"
            :size="36"
            color="#fff"
          />
          <text class="gen-txt">
            {{ generating ? 'AI 生成中...' : '生成封面' }}
          </text>
        </view>

        <!-- 生成结果 -->
        <view
          v-if="results.length"
          class="results"
        >
          <view class="results-head">
            <text class="results-title">
              生成结果
            </text>
            <view
              class="regen"
              @tap="handleGenerate"
            >
              <app-icon
                name="refresh-cw"
                :size="28"
                color="#C41E3A"
              />
              <text class="regen-txt">
                重新生成
              </text>
            </view>
          </view>

          <view class="result-grid">
            <view
              v-for="r in results"
              :key="r.id"
              class="result-cell"
              :class="{ active: selectedResultId === r.id }"
              @tap="selectedResultId = r.id"
            >
              <view
                class="result-img"
                :style="{ background: r.bg }"
              />
              <view
                v-if="selectedResultId === r.id"
                class="result-check"
              >
                <app-icon
                  name="check"
                  :size="26"
                  color="#fff"
                />
              </view>
            </view>
          </view>

          <!-- 选中预览 -->
          <view
            v-if="selectedResult"
            class="preview"
          >
            <view
              class="preview-img"
              :style="{ background: selectedResult.bg }"
            />
            <view class="preview-meta">
              <view class="meta-tags">
                <text class="meta-tag">
                  {{ getStyleName(selectedResult.style) }}
                </text>
                <text class="meta-tag">
                  {{ selectedResult.size }}
                </text>
              </view>
              <text class="meta-prompt">
                {{ selectedResult.prompt }}
              </text>
            </view>
            <view class="preview-actions">
              <view
                class="act-btn outline"
                @tap="handleSave"
              >
                <app-icon
                  name="save"
                  :size="28"
                  color="#444"
                />
                <text class="act-txt">
                  保存
                </text>
              </view>
              <view
                class="act-btn outline"
                @tap="handleDownload"
              >
                <app-icon
                  name="download"
                  :size="28"
                  color="#444"
                />
                <text class="act-txt">
                  下载
                </text>
              </view>
            </view>
            <view
              v-if="contentId"
              class="apply-btn"
              @tap="handleApply"
            >
              <text class="apply-txt">
                应用此封面
              </text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 历史记录弹层 -->
    <view
      v-if="showHistory"
      class="sheet-mask"
      @tap="showHistory = false"
    >
      <view
        class="sheet"
        @tap.stop
      >
        <view class="sheet-head">
          <text class="sheet-title">
            生成历史
          </text>
        </view>
        <scroll-view
          scroll-y
          class="sheet-body"
        >
          <view
            v-if="historyLoading"
            class="hist-loading"
          >
            <view
              v-for="i in 3"
              :key="i"
              class="hist-sk"
            />
          </view>
          <view
            v-else-if="!history.length"
            class="hist-empty"
          >
            <text class="hist-empty-txt">
              暂无生成历史
            </text>
          </view>
          <view v-else>
            <view
              v-for="item in history"
              :key="item.id"
              class="hist-item"
            >
              <view class="hist-item-head">
                <text class="hist-item-title">
                  {{ item.title }}
                </text>
                <text class="hist-item-time">
                  {{ item.createdAt }}
                </text>
              </view>
              <scroll-view
                scroll-x
                class="hist-thumbs"
              >
                <view
                  v-for="r in item.results"
                  :key="r.id"
                  class="hist-thumb"
                  :class="{ active: r.id === item.selectedId }"
                  :style="{ background: r.bg }"
                />
              </scroll-view>
              <view class="hist-detail">
                <text class="hist-detail-txt">
                  查看详情
                </text>
                <app-icon
                  name="chevron-right"
                  :size="22"
                  color="#C41E3A"
                />
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateBack } from '@/utils/router'

const statusBarHeight = ref(20)

// URL query
const title = ref('')
const contentSummary = ref('')
const contentId = ref('')

const prompt = ref('')
const selectedStyle = ref('traditional')
const selectedSize = ref('16:9')
const generateCount = ref(4)

const loading = ref(true)
const generating = ref(false)
const results = ref<any[]>([])
const selectedResultId = ref<string | null>(null)

const showHistory = ref(false)
const history = ref<any[]>([])
const historyLoading = ref(false)

const styles = [
  { value: 'traditional', label: '传统国风', preview: 'linear-gradient(135deg,#C41E3A,#9a1830)' },
  { value: 'ink', label: '水墨风格', preview: 'linear-gradient(135deg,#374151,#111827)' },
  { value: 'modern', label: '简约现代', preview: 'linear-gradient(135deg,#2563eb,#1e40af)' },
  { value: 'vintage', label: '复古怀旧', preview: 'linear-gradient(135deg,#b45309,#78350f)' },
  { value: 'gradient', label: '渐变色彩', preview: 'linear-gradient(135deg,#8b5cf6,#ec4899)' },
  { value: 'illustration', label: '插画风格', preview: 'linear-gradient(135deg,#f59e0b,#d97706)' },
]

const sizeOptions = [
  { value: '16:9', label: '横版', ratio: '16:9' },
  { value: '4:3', label: '标准', ratio: '4:3' },
  { value: '1:1', label: '方形', ratio: '1:1' },
  { value: '3:4', label: '竖版', ratio: '3:4' },
]

const styleBgs: Record<string, string[]> = {
  traditional: ['linear-gradient(135deg,#C41E3A,#7a1428)', 'linear-gradient(135deg,#d4a14e,#9a6a1e)', 'linear-gradient(135deg,#8a1228,#4a0a16)', 'linear-gradient(135deg,#C41E3A,#C9A96E)'],
  modern: ['linear-gradient(135deg,#2563eb,#1e3a8a)', 'linear-gradient(135deg,#0ea5e9,#0369a1)', 'linear-gradient(135deg,#6366f1,#4338ca)', 'linear-gradient(135deg,#3b82f6,#1d4ed8)'],
  ink: ['linear-gradient(135deg,#374151,#0f172a)', 'linear-gradient(135deg,#4b5563,#111827)', 'linear-gradient(135deg,#1f2937,#000)', 'linear-gradient(135deg,#52525b,#18181b)'],
  vintage: ['linear-gradient(135deg,#b45309,#78350f)', 'linear-gradient(135deg,#a16207,#713f12)', 'linear-gradient(135deg,#92400e,#451a03)', 'linear-gradient(135deg,#d97706,#92400e)'],
  gradient: ['linear-gradient(135deg,#8b5cf6,#ec4899)', 'linear-gradient(135deg,#6366f1,#d946ef)', 'linear-gradient(135deg,#a855f7,#f43f5e)', 'linear-gradient(135deg,#7c3aed,#db2777)'],
  illustration: ['linear-gradient(135deg,#f59e0b,#b45309)', 'linear-gradient(135deg,#fb923c,#c2410c)', 'linear-gradient(135deg,#fbbf24,#d97706)', 'linear-gradient(135deg,#f97316,#9a3412)'],
}

function getStyleName(v: string) {
  return styles.find(s => s.value === v)?.label || v
}

const selectedResult = computed(() => results.value.find(r => r.id === selectedResultId.value))

onMounted(() => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.statusBarHeight || 20
    const pages = getCurrentPages()
    const cur: any = pages[pages.length - 1]
    const opts = cur?.options || cur?.$page?.options || {}
    if (opts.title) title.value = decodeURIComponent(opts.title)
    if (opts.summary) contentSummary.value = decodeURIComponent(opts.summary)
    if (opts.contentId) contentId.value = opts.contentId
  } catch (e) {}
  setTimeout(() => { loading.value = false }, 300)
})

function goBack() {
  navigateBack()
}

function handleSmartPrompt() {
  if (!title.value.trim()) return
  const styleName = getStyleName(selectedStyle.value)
  prompt.value = `以"${title.value}"为主题，采用${styleName}风格，画面典雅大气，色调和谐，构图均衡，富有国学文化意境与艺术美感。`
}

function handleGenerate() {
  if (!title.value.trim() || generating.value) return
  generating.value = true
  results.value = []
  selectedResultId.value = null
  const bgs = styleBgs[selectedStyle.value] || styleBgs.traditional
  setTimeout(() => {
    const list = []
    for (let i = 0; i < generateCount.value; i++) {
      list.push({
        id: 'r' + Date.now() + '_' + i,
        bg: bgs[i % bgs.length],
        style: selectedStyle.value,
        size: selectedSize.value,
        prompt: prompt.value || `以"${title.value}"为主题的${getStyleName(selectedStyle.value)}风格封面`,
      })
    }
    results.value = list
    selectedResultId.value = list[0].id
    generating.value = false
  }, 1500)
}

function handleSave() {
  uni.showToast({ title: '已保存到素材库', icon: 'success' })
}

function handleDownload() {
  uni.showToast({ title: '已开始下载', icon: 'none' })
}

function handleApply() {
  uni.showToast({ title: '已应用封面', icon: 'success' })
  setTimeout(() => navigateBack(), 600)
}

function openHistory() {
  showHistory.value = true
  historyLoading.value = true
  setTimeout(() => {
    history.value = [
      {
        id: 'h1', title: '论语二十讲·学而篇', createdAt: '2 小时前', selectedId: 'h1r2',
        results: [
          { id: 'h1r1', bg: 'linear-gradient(135deg,#C41E3A,#7a1428)' },
          { id: 'h1r2', bg: 'linear-gradient(135deg,#d4a14e,#9a6a1e)' },
          { id: 'h1r3', bg: 'linear-gradient(135deg,#8a1228,#4a0a16)' },
        ],
      },
      {
        id: 'h2', title: '周易入门：六十四卦详解', createdAt: '昨天', selectedId: 'h2r1',
        results: [
          { id: 'h2r1', bg: 'linear-gradient(135deg,#374151,#0f172a)' },
          { id: 'h2r2', bg: 'linear-gradient(135deg,#4b5563,#111827)' },
        ],
      },
    ]
    historyLoading.value = false
  }, 800)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(90deg, #C41E3A, #9a1830);
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.nav-back, .nav-history {
  padding: 6rpx;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
}
.skeleton {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.sk-block {
  height: 120rpx;
  border-radius: 16rpx;
  background: #ececec;
}
.body {
  height: calc(100vh - 100rpx);
}
.content {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 44rpx;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.field-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #374151;
}
.field-input {
  background: #fff;
  border: 1rpx solid #e5e7eb;
  border-radius: 14rpx;
  padding: 22rpx 24rpx;
  font-size: 28rpx;
  color: #1f2937;
}
.field-textarea {
  background: #fff;
  border: 1rpx solid #e5e7eb;
  border-radius: 14rpx;
  padding: 22rpx 24rpx;
  font-size: 26rpx;
  color: #1f2937;
  height: 150rpx;
  width: 100%;
  box-sizing: border-box;
}
.ph {
  color: #9ca3af;
}
.smart-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.smart-btn.disabled {
  opacity: 0.5;
}
.smart-txt {
  font-size: 24rpx;
  color: #C41E3A;
}
.style-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}
.style-card {
  position: relative;
  padding: 20rpx;
  border-radius: 16rpx;
  border: 3rpx solid #e5e7eb;
  background: #fff;
}
.style-card.active {
  border-color: #C41E3A;
  background: #fef2f2;
}
.style-thumb {
  width: 100%;
  height: 96rpx;
  border-radius: 10rpx;
  margin-bottom: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.style-name {
  font-size: 24rpx;
  font-weight: 500;
  color: #374151;
  text-align: center;
  display: block;
}
.style-name.active {
  color: #C41E3A;
}
.style-check {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 40rpx;
  height: 40rpx;
  background: #C41E3A;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.size-row, .count-row {
  display: flex;
  gap: 16rpx;
}
.size-card {
  flex: 1;
  padding: 16rpx 12rpx;
  border-radius: 14rpx;
  border: 3rpx solid #e5e7eb;
  background: #fff;
  text-align: center;
}
.size-card.active {
  border-color: #C41E3A;
  background: #fef2f2;
}
.size-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #374151;
  display: block;
}
.size-label.active {
  color: #C41E3A;
}
.size-ratio {
  font-size: 22rpx;
  color: #9ca3af;
}
.count-card {
  flex: 1;
  padding: 22rpx 0;
  border-radius: 14rpx;
  border: 3rpx solid #e5e7eb;
  background: #fff;
  text-align: center;
}
.count-card.active {
  border-color: #C41E3A;
  background: #fef2f2;
}
.count-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #374151;
}
.count-txt.active {
  color: #C41E3A;
}
.gen-btn {
  height: 96rpx;
  border-radius: 16rpx;
  background: linear-gradient(90deg, #C41E3A, #9a1830);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.gen-btn.disabled {
  opacity: 0.6;
}
.gen-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.results {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.results-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.results-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}
.regen {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.regen-txt {
  font-size: 26rpx;
  color: #C41E3A;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}
.result-cell {
  position: relative;
  border-radius: 14rpx;
  overflow: hidden;
  border: 3rpx solid #e5e7eb;
}
.result-cell.active {
  border-color: #C41E3A;
}
.result-img {
  width: 100%;
  height: 0;
  padding-bottom: 56.25%;
}
.result-check {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 44rpx;
  height: 44rpx;
  background: #C41E3A;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.preview-img {
  width: 100%;
  height: 0;
  padding-bottom: 56.25%;
  border-radius: 14rpx;
}
.preview-meta {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.meta-tags {
  display: flex;
  gap: 12rpx;
}
.meta-tag {
  font-size: 22rpx;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}
.meta-prompt {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.5;
}
.preview-actions {
  display: flex;
  gap: 20rpx;
}
.act-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.act-btn.outline {
  border: 1rpx solid #d1d5db;
  background: #fff;
}
.act-txt {
  font-size: 28rpx;
  color: #444;
}
.apply-btn {
  height: 88rpx;
  border-radius: 14rpx;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.apply-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  height: 70vh;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 32rpx;
  box-sizing: border-box;
}
.sheet-head {
  padding-bottom: 24rpx;
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
}
.sheet-body {
  height: calc(70vh - 120rpx);
}
.hist-loading {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.hist-sk {
  height: 140rpx;
  border-radius: 14rpx;
  background: #ececec;
}
.hist-empty {
  text-align: center;
  padding: 80rpx 0;
}
.hist-empty-txt {
  font-size: 28rpx;
  color: #9ca3af;
}
.hist-item {
  background: #f9fafb;
  border-radius: 14rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.hist-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hist-item-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
}
.hist-item-time {
  font-size: 22rpx;
  color: #9ca3af;
}
.hist-thumbs {
  white-space: nowrap;
}
.hist-thumb {
  display: inline-block;
  width: 120rpx;
  height: 72rpx;
  border-radius: 8rpx;
  margin-right: 12rpx;
  border: 3rpx solid transparent;
}
.hist-thumb.active {
  border-color: #C41E3A;
}
.hist-detail {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.hist-detail-txt {
  font-size: 24rpx;
  color: #C41E3A;
}
</style>
