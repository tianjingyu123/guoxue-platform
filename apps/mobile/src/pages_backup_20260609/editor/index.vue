<template>
  <view class="ed-page">
    <!-- 顶部导航 -->
    <view class="header-bar">
      <text class="header-back" @click="uni.navigateBack()">‹</text>
      <view class="header-actions">
        <view class="ha-draft" :class="{ loading: saving }" @click="handleSaveDraft">
          <text>{{ saving ? '⏳' : '💾' }} 草稿</text>
        </view>
        <view class="ha-publish" :class="{ disabled: !content.trim() || publishing }" @click="handlePublish">
          <text>{{ publishing ? '⏳' : '📤' }} 发布</text>
        </view>
      </view>
    </view>

    <!-- 类型选择 -->
    <view class="type-tabs">
      <view class="tt-item" :class="{ active: type === 'post' }" @click="type = 'post'">
        <text>发帖</text>
      </view>
      <view class="tt-item" :class="{ active: type === 'article' }" @click="type = 'article'">
        <text>写文章</text>
      </view>
    </view>

    <!-- 编辑区 -->
    <scroll-view scroll-y class="editor-area">
      <!-- 标题（仅文章模式） -->
      <input v-if="type === 'article'" v-model="title" class="ea-title" placeholder="请输入标题" />

      <!-- 内容 -->
      <textarea v-model="content" class="ea-textarea" :placeholder="type === 'post' ? '分享你的想法...' : '开始写作...'" />

      <!-- 已上传图片 -->
      <view v-if="images.length" class="image-grid">
        <view v-for="(img, i) in images" :key="i" class="ig-item">
          <text class="ig-remove" @click="images.splice(i, 1)">✕</text>
          <text>🖼️</text>
        </view>
      </view>

      <!-- 封面预览 -->
      <view v-if="cover && type === 'article'" class="cover-preview">
        <text class="cp-label">封面图</text>
        <view class="cp-img">
          <text class="cp-remove" @click="cover = ''">✕</text>
          <text>🖼️</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部区域 -->
    <view class="bottom-area">
      <!-- 选择圈子 -->
      <view class="ba-row" @click="showCircleSelect = true">
        <template v-if="selectedCircleData">
          <text class="ba-circle-name">👥 {{ selectedCircleData.name }}</text>
        </template>
        <template v-else>
          <text class="ba-placeholder"># 选择圈子（可选）</text>
        </template>
        <text class="ba-arrow">›</text>
      </view>

      <!-- 选择话题 -->
      <view class="ba-row" @click="showTopicSelect = true">
        <template v-if="selectedTopics.length > 0">
          <view class="ba-tags">
            <text v-for="tid in selectedTopics" :key="tid" class="ba-tag">#{{ topics.find(t => t.id === tid)?.name }}</text>
          </view>
        </template>
        <template v-else>
          <text class="ba-placeholder">🏷️ 添加话题标签</text>
        </template>
        <text class="ba-arrow">›</text>
      </view>

      <!-- 格式工具栏 -->
      <view class="toolbar">
        <view class="tb-left">
          <text class="tb-btn" @click="insertFormat('bold')">**B**</text>
          <text class="tb-btn" @click="insertFormat('italic')">_I_</text>
          <text class="tb-btn" @click="insertFormat('quote')">"</text>
          <text class="tb-btn" @click="handleImageUpload">🖼️</text>
        </view>
        <view class="tb-right">
          <text class="tb-ai" @click="openAIPanel('polish')">✨ 润色</text>
          <text v-if="type === 'article'" class="tb-ai" @click="openAIPanel('title')">💡 标题</text>
          <text v-if="type === 'article'" class="tb-ai" @click="openAIPanel('cover')">🎨 封面</text>
          <text class="tb-ai" @click="openAIPanel('tags')">🏷️ 标签</text>
        </view>
      </view>
    </view>

    <!-- 圈子选择弹窗 -->
    <view v-if="showCircleSelect" class="modal-mask" @click="showCircleSelect = false">
      <view class="sheet" @click.stop>
        <text class="sheet-title">选择圈子</text>
        <view class="sheet-list">
          <view class="sl-item" :class="{ active: !selectedCircle }" @click="selectedCircle = null; showCircleSelect = false">
            <text>不选择圈子</text>
            <text v-if="!selectedCircle" class="sl-check">✓</text>
          </view>
          <view v-for="c in circles" :key="c.id" class="sl-item" :class="{ active: selectedCircle === c.id }" @click="selectedCircle = c.id; showCircleSelect = false">
            <text>👥 {{ c.name }}</text>
            <text v-if="selectedCircle === c.id" class="sl-check">✓</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 话题选择弹窗 -->
    <view v-if="showTopicSelect" class="modal-mask" @click="showTopicSelect = false">
      <view class="sheet" @click.stop>
        <view class="sheet-header">
          <text class="sh-count">已选 {{ selectedTopics.length }}/3</text>
          <text class="sheet-title">选择话题</text>
          <text class="sh-done" @click="showTopicSelect = false">完成</text>
        </view>
        <view class="topic-grid">
          <view v-for="tp in topics" :key="tp.id" class="tg-item" :class="{ active: selectedTopics.includes(tp.id) }" @click="toggleTopic(tp.id)">
            <text>#{{ tp.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- AI面板 -->
    <view v-if="showAIPanel" class="modal-mask" @click="showAIPanel = null">
      <view class="sheet ai-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sh-cancel" @click="showAIPanel = null">✕</text>
          <text class="sheet-title ai-title">
            <template v-if="showAIPanel === 'polish'">✨ AI润色</template>
            <template v-if="showAIPanel === 'title'">💡 标题优化</template>
            <template v-if="showAIPanel === 'tags'">🏷️ 标签推荐</template>
            <template v-if="showAIPanel === 'cover'">🎨 生成封面</template>
          </text>
          <view class="sh-spacer" />
        </view>

        <view class="ai-body">
          <!-- 加载中 -->
          <view v-if="aiLoading" class="ai-loading">
            <text class="ai-spinner">⏳</text>
            <text>AI正在思考中...</text>
          </view>

          <!-- 润色结果 -->
          <template v-else-if="showAIPanel === 'polish' && aiResult">
            <view class="ai-result-box">
              <text>{{ aiResult.polished }}</text>
            </view>
            <view v-if="aiResult.changes" class="ai-changes">
              <text v-for="(c, i) in aiResult.changes" :key="i">• {{ c }}</text>
            </view>
            <view class="ai-actions">
              <view class="aia-apply" @click="content = aiResult.polished; showAIPanel = null"><text>应用润色</text></view>
              <view class="aia-retry" @click="handleAIPolish"><text>🔄</text></view>
            </view>
          </template>

          <!-- 标题建议 -->
          <template v-else-if="showAIPanel === 'title' && aiResult">
            <view v-for="(s, i) in aiResult.suggestions" :key="i" class="ai-title-option" @click="title = s; showAIPanel = null">
              <text>{{ s }}</text>
            </view>
            <view class="aia-retry full" @click="handleAITitle"><text>🔄 换一批</text></view>
          </template>

          <!-- 标签推荐 -->
          <template v-else-if="showAIPanel === 'tags' && aiResult">
            <view class="ai-tag-grid">
              <view v-for="(tag, i) in aiResult.tags" :key="i" class="ait-item" :class="{ active: selectedTags.includes(tag) }" @click="toggleAITag(tag)">
                <text>{{ tag }}</text>
              </view>
            </view>
            <view class="ai-actions">
              <view class="aia-apply" @click="showAIPanel = null"><text>完成选择</text></view>
              <view class="aia-retry" @click="handleAITags"><text>🔄</text></view>
            </view>
          </template>

          <!-- 封面生成 -->
          <template v-else-if="showAIPanel === 'cover'">
            <view class="mb-field">
              <text class="mb-label">描述你想要的封面</text>
              <textarea v-model="coverPrompt" class="mb-textarea" placeholder="例如：古典中国风，山水画背景，配八卦图案..." />
            </view>
            <view v-if="aiResult?.imageUrl" class="ai-cover-preview">
              <text>🖼️</text>
            </view>
            <view class="ai-actions">
              <template v-if="aiResult?.imageUrl">
                <view class="aia-apply" @click="cover = aiResult.imageUrl; showAIPanel = null"><text>使用此封面</text></view>
                <view class="aia-retry" @click="handleAICover"><text>🔄</text></view>
              </template>
              <template v-else>
                <view class="aia-apply full" :class="{ disabled: !coverPrompt.trim() }" @click="handleAICover"><text>生成封面</text></view>
              </template>
            </view>
          </template>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const type = ref<'post' | 'article'>('post')
const title = ref('')
const content = ref('')
const cover = ref('')
const images = ref<string[]>([])
const selectedCircle = ref<string | null>(null)
const selectedTags = ref<string[]>([])
const selectedTopics = ref<string[]>([])

const circles = [
  { id: '1', name: '八字研习社' },
  { id: '2', name: '紫微斗数交流' },
  { id: '3', name: '风水堪舆' },
]

const topics = [
  { id: '1', name: '八字命理' },
  { id: '2', name: '紫微斗数' },
  { id: '3', name: '风水布局' },
  { id: '4', name: '每日打卡' },
  { id: '5', name: '学习心得' },
]

const showCircleSelect = ref(false)
const showTopicSelect = ref(false)
const showAIPanel = ref<'polish' | 'title' | 'tags' | 'cover' | null>(null)
const aiLoading = ref(false)
const aiResult = ref<any>(null)
const coverPrompt = ref('')
const saving = ref(false)
const publishing = ref(false)

const selectedCircleData = computed(() => circles.find(c => c.id === selectedCircle.value))

function insertFormat(format: 'bold' | 'italic' | 'quote') {
  const markers: Record<string, string> = { bold: '**粗体**', italic: '_斜体_', quote: '\n> 引用\n' }
  content.value += markers[format]
}

function handleImageUpload() {
  const url = '/placeholder'
  images.value.push(url)
  uni.showToast({ title: '图片已添加', icon: 'success' })
}

function toggleTopic(id: string) {
  const idx = selectedTopics.value.indexOf(id)
  if (idx >= 0) selectedTopics.value.splice(idx, 1)
  else if (selectedTopics.value.length < 3) selectedTopics.value.push(id)
}

function toggleAITag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(tag)
}

function openAIPanel(panel: 'polish' | 'title' | 'tags' | 'cover') {
  showAIPanel.value = panel
  aiResult.value = null
  coverPrompt.value = ''

  if (panel === 'polish') handleAIPolish()
  else if (panel === 'title') handleAITitle()
  else if (panel === 'tags') handleAITags()
}

function handleAIPolish() {
  if (!content.value.trim()) return
  aiLoading.value = true
  setTimeout(() => {
    aiResult.value = {
      polished: content.value + '\n\n（AI润色后的内容会更加流畅、专业）',
      changes: ['优化了段落结构', '增强了表达的专业性', '修正了语法问题'],
    }
    aiLoading.value = false
  }, 1500)
}

function handleAITitle() {
  aiLoading.value = true
  setTimeout(() => {
    aiResult.value = {
      suggestions: [
        '深入解析八字命理的核心奥秘',
        '八字命理入门：从基础到实践',
        '探索八字命理的智慧之道',
      ],
    }
    aiLoading.value = false
  }, 1000)
}

function handleAITags() {
  if (!content.value.trim()) return
  aiLoading.value = true
  setTimeout(() => {
    aiResult.value = { tags: ['八字命理', '国学智慧', '传统文化', '命理学习', '易学入门'] }
    aiLoading.value = false
  }, 1000)
}

function handleAICover() {
  if (!coverPrompt.value.trim()) return
  aiLoading.value = true
  setTimeout(() => {
    aiResult.value = { imageUrl: '/placeholder?cover' }
    aiLoading.value = false
  }, 2000)
}

function handleSaveDraft() {
  saving.value = true
  setTimeout(() => {
    saving.value = false
    uni.showToast({ title: '草稿已保存', icon: 'success' })
  }, 800)
}

function handlePublish() {
  if (!content.value.trim()) return
  publishing.value = true
  setTimeout(() => {
    publishing.value = false
    uni.showToast({ title: '发布成功', icon: 'success' })
    uni.navigateBack()
  }, 1500)
}
</script>

<style scoped>
.ed-page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }

.header-bar { height: 80rpx; background: #fff; border-bottom: 1px solid #E8E0D5; display: flex; align-items: center; justify-content: space-between; padding: 0 20rpx; flex-shrink: 0; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-actions { display: flex; align-items: center; gap: 12rpx; }
.ha-draft { padding: 10rpx 16rpx; }
.ha-draft text { font-size: 24rpx; color: #999; }
.ha-publish { padding: 10rpx 20rpx; border-radius: 28rpx; background: #C41E3A; }
.ha-publish.disabled { background: #F5F1EB; }
.ha-publish text { font-size: 24rpx; color: #fff; font-weight: 500; }
.ha-publish.disabled text { color: #BBB; }

.type-tabs { display: flex; gap: 32rpx; padding: 16rpx 24rpx; background: #fff; border-bottom: 1px solid #F5F1EB; flex-shrink: 0; }
.tt-item { padding-bottom: 8rpx; border-bottom: 4rpx solid transparent; }
.tt-item text { font-size: 26rpx; color: #999; }
.tt-item.active { border-bottom-color: #C41E3A; }
.tt-item.active text { color: #C41E3A; font-weight: 500; }

.editor-area { flex: 1; padding: 20rpx 24rpx; }
.ea-title { width: 100%; font-size: 34rpx; font-weight: 700; color: #333; margin-bottom: 20rpx; background: transparent; }
.ea-textarea { width: 100%; min-height: 300rpx; font-size: 26rpx; color: #555; line-height: 1.8; background: transparent; }

.image-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-top: 20rpx; }
.ig-item { aspect-ratio: 1; border-radius: 12rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; position: relative; }
.ig-item text { font-size: 40rpx; }
.ig-remove { position: absolute; top: 4rpx; right: 4rpx; width: 36rpx; height: 36rpx; border-radius: 50%; background: rgba(0,0,0,0.5); color: #fff; font-size: 20rpx !important; display: flex; align-items: center; justify-content: center; }

.cover-preview { margin-top: 20rpx; }
.cp-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 10rpx; }
.cp-img { aspect-ratio: 16/9; border-radius: 12rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; position: relative; }
.cp-img text { font-size: 60rpx; }
.cp-remove { position: absolute; top: 8rpx; right: 8rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(0,0,0,0.5); color: #fff; font-size: 24rpx !important; display: flex; align-items: center; justify-content: center; }

.bottom-area { flex-shrink: 0; background: #fff; border-top: 1px solid #E8E0D5; }
.ba-row { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; border-bottom: 1px solid #F5F1EB; }
.ba-placeholder { font-size: 24rpx; color: #999; }
.ba-circle-name { font-size: 24rpx; color: #333; }
.ba-tags { display: flex; flex-wrap: wrap; gap: 8rpx; }
.ba-tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 20rpx; background: rgba(196,30,58,0.06); color: #C41E3A; }
.ba-arrow { font-size: 32rpx; color: #CCC; }

.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 20rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.tb-left { display: flex; gap: 8rpx; }
.tb-btn { font-size: 24rpx; padding: 10rpx 16rpx; border-radius: 8rpx; background: #F5F1EB; color: #666; font-weight: 600; }
.tb-right { display: flex; gap: 6rpx; }
.tb-ai { font-size: 20rpx; padding: 8rpx 14rpx; border-radius: 20rpx; background: linear-gradient(135deg, rgba(196,30,58,0.06), rgba(240,160,48,0.06)); color: #C41E3A; }

.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; }
.sheet { background: #fff; border-radius: 28rpx 28rpx 0 0; width: 100%; max-width: 600rpx; max-height: 70vh; display: flex; flex-direction: column; }
.sheet-title { font-size: 28rpx; font-weight: 600; color: #333; text-align: center; padding: 20rpx; }
.sheet-header { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; border-bottom: 1px solid #E8E0D5; flex-shrink: 0; }
.sh-cancel { font-size: 28rpx; color: #999; }
.sh-count { font-size: 22rpx; color: #999; }
.sh-done { font-size: 24rpx; color: #C41E3A; font-weight: 500; }
.sh-spacer { width: 40rpx; }
.sheet-list { flex: 1; overflow-y: auto; padding: 16rpx 24rpx; }
.sl-item { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 16rpx; border-radius: 14rpx; margin-bottom: 8rpx; background: #FAF8F5; }
.sl-item text { font-size: 26rpx; color: #333; }
.sl-item.active { background: rgba(196,30,58,0.06); }
.sl-check { color: #C41E3A !important; font-weight: 700; }

.topic-grid { display: flex; flex-wrap: wrap; gap: 12rpx; padding: 24rpx; }
.tg-item { padding: 14rpx 22rpx; border-radius: 24rpx; background: #F5F1EB; }
.tg-item text { font-size: 24rpx; color: #555; }
.tg-item.active { background: #C41E3A; }
.tg-item.active text { color: #fff; }

.ai-sheet { max-height: 75vh; }
.ai-title { display: flex; align-items: center; gap: 8rpx; }
.ai-body { flex: 1; overflow-y: auto; padding: 24rpx; }
.ai-loading { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 60rpx 0; }
.ai-spinner { font-size: 48rpx; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.ai-loading text { font-size: 24rpx; color: #999; }

.ai-result-box { padding: 20rpx; border-radius: 14rpx; background: rgba(196,30,58,0.04); margin-bottom: 16rpx; }
.ai-result-box text { font-size: 24rpx; color: #555; line-height: 1.7; white-space: pre-wrap; }
.ai-changes { margin-bottom: 20rpx; }
.ai-changes text { font-size: 20rpx; color: #C41E3A; display: block; line-height: 1.6; }

.ai-actions { display: flex; gap: 12rpx; }
.aia-apply { flex: 1; padding: 18rpx; border-radius: 14rpx; background: #C41E3A; text-align: center; }
.aia-apply.full { flex: none; width: 100%; }
.aia-apply.disabled { background: #F5F1EB; }
.aia-apply text { font-size: 24rpx; color: #fff; font-weight: 500; }
.aia-apply.disabled text { color: #BBB; }
.aia-retry { width: 64rpx; padding: 18rpx; border-radius: 14rpx; border: 2rpx solid #E8E0D5; text-align: center; }
.aia-retry.full { width: 100%; }
.aia-retry text { font-size: 24rpx; }

.ai-title-option { padding: 20rpx; border-radius: 14rpx; background: rgba(196,30,58,0.04); margin-bottom: 10rpx; }
.ai-title-option text { font-size: 24rpx; color: #333; line-height: 1.5; }

.ai-tag-grid { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 24rpx; }
.ait-item { padding: 12rpx 20rpx; border-radius: 20rpx; background: #F5F1EB; }
.ait-item text { font-size: 22rpx; color: #666; }
.ait-item.active { background: #F0A030; }
.ait-item.active text { color: #fff; }

.ai-cover-preview { aspect-ratio: 16/9; border-radius: 14rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.ai-cover-preview text { font-size: 60rpx; }

.mb-field { margin-bottom: 20rpx; }
.mb-label { font-size: 24rpx; color: #666; display: block; margin-bottom: 10rpx; }
.mb-textarea { width: 100%; height: 150rpx; padding: 16rpx; border-radius: 12rpx; background: #F5F1EB; font-size: 24rpx; color: #333; box-sizing: border-box; }
</style>
