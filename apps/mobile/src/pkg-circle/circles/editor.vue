<template>
  <view class="editor-page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <view class="nav-actions">
          <view class="btn-draft" :class="{ disabled: saving }" @tap="handleSaveDraft">
            <app-icon :name="saving ? 'loader-2' : 'save'" :size="16" color="#8a8a8a" :class="{ spin: saving }" />
            <text class="btn-draft-text">草稿</text>
          </view>
          <view class="btn-publish" :class="{ disabled: publishing || !content.trim() }" @tap="handlePublish">
            <app-icon :name="publishing ? 'loader-2' : 'send'" :size="16" color="#fff" :class="{ spin: publishing }" />
            <text class="btn-publish-text">发布</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 类型选择 -->
    <view class="type-bar">
      <view
        v-for="t in (['post', 'article'] as const)"
        :key="t"
        class="type-item"
        :class="{ active: type === t }"
        @tap="type = t"
      >
        <text class="type-text" :class="{ active: type === t }">{{ t === 'post' ? '发帖' : '写文章' }}</text>
      </view>
    </view>

    <!-- 编辑区 -->
    <view class="edit-area">
      <input
        v-if="type === 'article'"
        v-model="title"
        class="title-input"
        placeholder="请输入标题"
        placeholder-class="ph"
      />
      <textarea
        v-model="content"
        class="content-input"
        :placeholder="type === 'post' ? '分享你的想法...' : '开始写作...'"
        placeholder-class="ph"
        auto-height
      />

      <!-- 已上传图片 -->
      <view v-if="images.length > 0" class="img-grid">
        <view v-for="(img, i) in images" :key="i" class="img-cell">
          <image lazy-load :src="img" class="img-thumb" mode="aspectFill" />
          <view class="img-del" @tap="removeImage(i)">
            <app-icon name="x" :size="12" color="#fff" />
          </view>
        </view>
      </view>

      <!-- 封面预览 -->
      <view v-if="cover && type === 'article'" class="cover-block">
        <text class="cover-label">封面图</text>
        <view class="cover-wrap">
          <image lazy-load :src="cover" class="cover-img" mode="aspectFill" />
          <view class="cover-del" @tap="cover = ''">
            <app-icon name="x" :size="16" color="#fff" />
          </view>
        </view>
      </view>
    </view>

    <!-- 选择圈子（必选，后端发帖/发文章均需归属圈子） -->
    <view class="select-row" @tap="showCircleSelect = true">
      <template v-if="selectedCircleData">
        <view class="circle-avatar">
          <image lazy-load :src="selectedCircleData.cover" class="circle-avatar-img" mode="aspectFill" />
        </view>
        <text class="select-text">{{ selectedCircleData.name }}</text>
      </template>
      <template v-else>
        <app-icon name="hash" :size="16" color="#8a8a8a" />
        <text class="select-placeholder">选择要发布到的圈子</text>
      </template>
      <app-icon name="chevron-down" :size="16" color="#8a8a8a" class="select-arrow" />
    </view>

    <!-- 选择标签（仅文章，后端文章支持 tags，帖子无标签字段） -->
    <view v-if="type === 'article'" class="select-row" @tap="showTopicSelect = true">
      <app-icon name="tag" :size="16" color="#8a8a8a" />
      <view v-if="selectedTopics.length > 0" class="topic-tags">
        <text v-for="t in selectedTopics" :key="t" class="topic-tag">#{{ t }}</text>
      </view>
      <text v-else class="select-placeholder">添加标签</text>
      <app-icon name="chevron-down" :size="16" color="#8a8a8a" class="select-arrow" />
    </view>

    <!-- 底部工具栏 -->
    <view class="toolbar">
      <view class="tool-format">
        <view class="tool-btn" @tap="insertFormat('bold')"><app-icon name="bold" :size="20" color="#8a8a8a" /></view>
        <view class="tool-btn" @tap="insertFormat('italic')"><app-icon name="italic" :size="20" color="#8a8a8a" /></view>
        <view class="tool-btn" @tap="insertFormat('quote')"><app-icon name="quote" :size="20" color="#8a8a8a" /></view>
        <view class="tool-btn" @tap="handleImageUpload"><app-icon name="image" :size="20" color="#8a8a8a" /></view>
      </view>
      <view class="tool-ai">
        <!-- 创-P3 创作助手抽屉入口（引用/命盘/案例/润色四合一·原独立润色并入第四 tab） -->
        <view class="ai-chip ai-red" @tap="showAssist = true">
          <app-icon name="sparkles" :size="12" color="#C41E3A" />
          <text class="ai-chip-text red">创作助手</text>
        </view>
        <template v-if="type === 'article'">
          <view class="ai-chip ai-blue" @tap="openAIPanel('title')">
            <app-icon name="wand-2" :size="12" color="#2563eb" />
            <text class="ai-chip-text blue">标题</text>
          </view>
          <view class="ai-chip ai-green" @tap="openAIPanel('cover')">
            <app-icon name="image-plus" :size="12" color="#059669" />
            <text class="ai-chip-text green">封面</text>
          </view>
          <view class="ai-chip ai-orange" @tap="openAIPanel('tags')">
            <app-icon name="tag" :size="12" color="#ea580c" />
            <text class="ai-chip-text orange">标签</text>
          </view>
        </template>
      </view>
    </view>

    <!-- 圈子选择弹窗 -->
    <view v-if="showCircleSelect" class="mask" @tap="showCircleSelect = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title center">选择圈子</text>
        </view>
        <view class="sheet-body">
          <view v-if="circlesLoading" class="sheet-state">
            <app-icon name="loader-2" :size="28" color="#a855f7" class="spin" />
            <text class="sheet-state-text">加载中...</text>
          </view>
          <view v-else-if="circles.length === 0" class="sheet-state">
            <text class="sheet-state-text">你还没有加入任何圈子</text>
          </view>
          <view
            v-for="circle in circles"
            :key="circle.id"
            class="opt-row"
            :class="{ active: selectedCircle === circle.id }"
            @tap="selectCircle(circle.id)"
          >
            <view class="opt-avatar"><image lazy-load :src="circle.cover" class="opt-avatar-img" mode="aspectFill" /></view>
            <text class="opt-text">{{ circle.name }}</text>
            <app-icon v-if="selectedCircle === circle.id" name="check" :size="20" color="#C41E3A" class="opt-check" />
          </view>
        </view>
      </view>
    </view>

    <!-- 标签选择弹窗 -->
    <view v-if="showTopicSelect" class="mask" @tap="showTopicSelect = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-header between">
          <text class="sheet-count">已选 {{ selectedTopics.length }}/3</text>
          <text class="sheet-title">选择标签</text>
          <text class="sheet-done" @tap="showTopicSelect = false">完成</text>
        </view>
        <view class="sheet-body">
          <view v-if="tags.length === 0" class="sheet-state">
            <text class="sheet-state-text">暂无热门标签</text>
          </view>
          <view v-else class="topic-pool">
            <view
              v-for="tag in tags"
              :key="tag.id"
              class="topic-pick"
              :class="{ active: selectedTopics.includes(tag.name) }"
              @tap="toggleTopic(tag.name)"
            >
              #{{ tag.name }}
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- AI面板 -->
    <view v-if="showAIPanel" class="mask" @tap="showAIPanel = null">
      <view class="sheet ai-sheet" @tap.stop>
        <view class="sheet-header between">
          <view @tap="showAIPanel = null"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
          <view class="ai-sheet-title">
            <app-icon name="sparkles" :size="16" color="#a855f7" />
            <text class="ai-sheet-title-text">{{ aiPanelTitle }}</text>
          </view>
          <view class="ai-sheet-spacer" />
        </view>

        <view class="sheet-body">
          <view v-if="aiLoading" class="ai-loading">
            <app-icon name="loader-2" :size="32" color="#a855f7" class="spin" />
            <text class="ai-loading-text">AI正在思考中...</text>
          </view>

          <template v-else>
            <!-- 标题建议 -->
            <view v-if="showAIPanel === 'title' && aiResult" class="ai-section">
              <view
                v-for="(s, i) in aiResult.titles"
                :key="i"
                class="title-sug"
                @tap="applyTitle(s)"
              >{{ s }}</view>
              <view class="ai-refresh-full" @tap="handleAITitle">
                <app-icon name="refresh-cw" :size="16" color="#8a8a8a" />
                <text class="ai-refresh-text">换一批</text>
              </view>
            </view>

            <!-- 标签推荐 -->
            <view v-if="showAIPanel === 'tags' && aiResult" class="ai-section">
              <view class="tag-pool">
                <view
                  v-for="(tag, i) in aiResult.tags"
                  :key="i"
                  class="tag-pick"
                  :class="{ active: selectedTopics.includes(tag) }"
                  @tap="pickTag(tag)"
                >{{ tag }}</view>
              </view>
              <view class="ai-actions">
                <view class="ai-apply orange" @tap="showAIPanel = null">完成选择</view>
                <view class="ai-refresh" @tap="handleAITags"><app-icon name="refresh-cw" :size="16" color="#8a8a8a" /></view>
              </view>
            </view>

            <!-- 封面生成 -->
            <view v-if="showAIPanel === 'cover'" class="ai-section">
              <view class="cover-gen">
                <text class="cover-gen-label">描述你想要的封面</text>
                <textarea
                  v-model="coverPrompt"
                  class="cover-gen-input"
                  placeholder="例如：古典中国风，山水画背景，配八卦图案..."
                  placeholder-class="ph"
                />
              </view>
              <!-- 真实图片 -->
              <image lazy-load
                v-if="aiResult && aiResult.imageUrl"
                :src="aiResult.imageUrl"
                class="cover-gen-result"
                mode="aspectFill"
              />
              <!-- 降级：图片生成服务未配置，仅返回设计提示词 -->
              <view v-else-if="aiResult && aiResult.designPrompt" class="cover-gen-fallback">
                <text class="cover-gen-fallback-label">AI 已生成封面设计提示词（图片生成服务待配置）：</text>
                <text class="cover-gen-fallback-text">{{ aiResult.designPrompt }}</text>
              </view>
              <view class="ai-actions">
                <template v-if="aiResult && aiResult.imageUrl">
                  <view class="ai-apply green" @tap="useCover">使用此封面</view>
                  <view class="ai-refresh" @tap="handleAICover"><app-icon name="refresh-cw" :size="16" color="#8a8a8a" /></view>
                </template>
                <view v-else class="ai-apply green full" :class="{ disabled: !coverPrompt.trim() }" @tap="handleAICover">生成封面</view>
              </view>
            </view>
          </template>
        </view>
      </view>
    </view>

    <!-- 创-P3 创作助手抽屉（引用/命盘/案例/润色） -->
    <creation-assist-drawer
      :visible="showAssist"
      :content="content"
      :tags="selectedTopics"
      @close="showAssist = false"
      @insert="handleAssistInsert"
      @apply-polish="handleAssistPolish"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateBack } from '@/utils/router'
import { circleApi } from '@/lib/circle-data'
import { articleApi, tagApi } from '@/lib/article-data'
import { publishAssistApi } from '@/lib/publish-assist-data'
import CreationAssistDrawer from '@/components/circle/creation-assist-drawer.vue'

interface CircleItem { id: string; name: string; cover: string }

const statusBarHeight = ref(0)

const type = ref<'post' | 'article'>('post')
const title = ref('')
const content = ref('')
const cover = ref('')                        // 封面图：AI 生成的 base64 data url 或本地临时路径
const images = ref<string[]>([])
const selectedCircle = ref<string | null>(null)
const selectedTopics = ref<string[]>([])     // 已选标签名（文章 tags）
const circles = ref<CircleItem[]>([])
const circlesLoading = ref(false)
const tags = ref<{ id: string; name: string }[]>([])

const showCircleSelect = ref(false)
const showTopicSelect = ref(false)
const showAssist = ref(false)   // 创-P3 创作助手抽屉
const showAIPanel = ref<'title' | 'tags' | 'cover' | null>(null)
const aiLoading = ref(false)
// AI 返回结构不定（润色/标题/标签/封面各异），保守保留 any
const aiResult = ref<any>(null)
const coverPrompt = ref('')
const saving = ref(false)
const publishing = ref(false)

const selectedCircleData = computed(() => circles.value.find(c => c.id === selectedCircle.value))
const aiPanelTitle = computed(() => {
  const m: Record<string, string> = { title: '标题优化', tags: '标签推荐', cover: '生成封面' }
  return showAIPanel.value ? m[showAIPanel.value] : ''
})

onLoad((opts) => {
  if (opts?.circleId) selectedCircle.value = opts.circleId
})

onMounted(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {}
  loadCircles()
  loadTags()
})

async function loadCircles() {
  circlesLoading.value = true
  try {
    const list = await circleApi.my()
    circles.value = list.map(c => ({ id: c.id, name: c.name, cover: c.cover }))
  } catch {
    circles.value = []
  } finally {
    circlesLoading.value = false
  }
}

async function loadTags() {
  try {
    const hot = await tagApi.hot(15)
    tags.value = hot.map(t => ({ id: t.id, name: t.name }))
  } catch {
    tags.value = []
  }
}

function goBack() { navigateBack() }

function insertFormat(format: 'bold' | 'italic' | 'quote') {
  let snippet = ''
  if (format === 'bold') snippet = '**粗体文字**'
  else if (format === 'italic') snippet = '*斜体文字*'
  else snippet = '\n> 引用文字\n'
  content.value += snippet
}

function handleImageUpload() {
  uni.chooseImage({
    count: Math.max(1, 9 - images.value.length),
    // uni.chooseImage 成功回调类型由 SDK 重载约束，保留 any
    success: (res: any) => {
      const paths: string[] = res.tempFilePaths || []
      images.value.push(...paths)
    },
  })
}
function removeImage(i: number) { images.value.splice(i, 1) }

function selectCircle(id: string) {
  selectedCircle.value = id
  showCircleSelect.value = false
}
function toggleTopic(name: string) {
  const idx = selectedTopics.value.indexOf(name)
  if (idx >= 0) selectedTopics.value.splice(idx, 1)
  else if (selectedTopics.value.length < 3) selectedTopics.value.push(name)
}

function openAIPanel(panel: 'title' | 'tags' | 'cover') {
  showAIPanel.value = panel
  aiResult.value = null
  if (panel === 'title') handleAITitle()
  else if (panel === 'tags') { if (content.value.trim()) handleAITags() }
  else if (panel === 'cover') coverPrompt.value = ''
}

/** 创作助手插入：引用卡/命盘卡/案例卡文本追加到正文末尾（uni-app textarea 无跨端光标 API，与 insertFormat 同策略） */
function handleAssistInsert(text: string) {
  const cur = content.value.replace(/\s+$/, '')
  content.value = cur ? `${cur}\n\n${text}\n` : `${text}\n`
}

/** 创作助手润色应用：整文替换（与原独立润色面板行为一致） */
function handleAssistPolish(text: string) {
  content.value = text
}

async function handleAITitle() {
  const base = content.value.trim() || title.value.trim()
  if (!base) { uni.showToast({ title: '请先输入内容', icon: 'none' }); showAIPanel.value = null; return }
  aiLoading.value = true
  try {
    const res = await publishAssistApi.optimizeTitle(base)
    aiResult.value = { titles: res.titles }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '生成失败', icon: 'none' })
    showAIPanel.value = null
  } finally { aiLoading.value = false }
}
async function handleAITags() {
  if (!content.value.trim()) { uni.showToast({ title: '请先输入内容', icon: 'none' }); showAIPanel.value = null; return }
  aiLoading.value = true
  try {
    const res = await publishAssistApi.suggestTags(content.value)
    aiResult.value = { tags: res.tags }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '推荐失败', icon: 'none' })
    showAIPanel.value = null
  } finally { aiLoading.value = false }
}
async function handleAICover() {
  if (!coverPrompt.value.trim()) return
  aiLoading.value = true
  try {
    const res = await publishAssistApi.generateCover(coverPrompt.value)
    aiResult.value = res
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '生成失败', icon: 'none' })
  } finally { aiLoading.value = false }
}

function applyTitle(s: string) { title.value = s; showAIPanel.value = null }
function pickTag(tag: string) {
  if (!selectedTopics.value.includes(tag) && selectedTopics.value.length < 3) selectedTopics.value.push(tag)
}
function useCover() {
  if (aiResult.value?.imageUrl) { cover.value = aiResult.value.imageUrl; showAIPanel.value = null }
}

/** 公共校验：内容 + 圈子必选 */
function validateBase(): boolean {
  if (!content.value.trim()) { uni.showToast({ title: '请输入内容', icon: 'none' }); return false }
  if (!selectedCircle.value) { uni.showToast({ title: '请选择要发布到的圈子', icon: 'none' }); return false }
  return true
}

async function handleSaveDraft() {
  if (saving.value) return
  if (!validateBase()) return
  saving.value = true
  try {
    if (type.value === 'article') {
      await articleApi.saveDraft({
        title: title.value.trim() || '无标题',
        content: content.value,
        cover: cover.value || undefined,
        tags: selectedTopics.value,
        circleId: selectedCircle.value!,
      })
    } else {
      await articleApi.createPost(selectedCircle.value!, {
        type: images.value.length ? 'IMAGE' : 'TEXT',
        content: content.value,
        images: images.value.length ? images.value : undefined,
        status: 'DRAFT',
      })
    }
    uni.showToast({ title: '草稿已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally { saving.value = false }
}

async function handlePublish() {
  if (publishing.value) return
  if (!validateBase()) return
  if (type.value === 'article' && !title.value.trim()) { uni.showToast({ title: '请输入文章标题', icon: 'none' }); return }
  publishing.value = true
  try {
    if (type.value === 'article') {
      await articleApi.create(selectedCircle.value!, {
        title: title.value.trim(),
        content: content.value,
        cover: cover.value || undefined,
        tags: selectedTopics.value,
      })
    } else {
      await articleApi.createPost(selectedCircle.value!, {
        type: images.value.length ? 'IMAGE' : 'TEXT',
        content: content.value,
        images: images.value.length ? images.value : undefined,
        status: 'PUBLISHED',
      })
    }
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => navigateBack(), 600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发布失败', icon: 'none' })
  } finally { publishing.value = false }
}
</script>

<style scoped>
.editor-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1rpx solid #ececec;
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.nav-back { padding: 16rpx; margin-left: -16rpx; }
.nav-actions { display: flex; align-items: center; gap: 16rpx; }
.btn-draft {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
}
.btn-draft-text { font-size: 26rpx; color: #8a8a8a; }
.btn-publish {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 32rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.btn-publish.disabled { opacity: 0.5; }
.btn-draft.disabled { opacity: 0.5; }
.btn-publish-text { font-size: 26rpx; color: #fff; }

/* 类型选择 */
.type-bar {
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #ececec;
  display: flex;
  gap: 32rpx;
}
.type-item { padding-bottom: 8rpx; border-bottom: 4rpx solid transparent; }
.type-item.active { border-bottom-color: var(--brand); }
.type-text { font-size: 28rpx; font-weight: 500; color: #8a8a8a; }
.type-text.active { color: var(--brand); }

/* 编辑区 */
.edit-area { flex: 1; padding: 32rpx; }
.title-input {
  width: 100%;
  font-size: 40rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 32rpx;
}
.content-input {
  width: 100%;
  min-height: 400rpx;
  font-size: 32rpx;
  line-height: 1.6;
  color: #1a1a1a;
}
.ph { color: #8a8a8a; }

.img-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-top: 32rpx;
}
.img-cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f4f4f5;
}
.img-thumb { width: 100%; height: 100%; }
.img-del {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0,0,0,0.5);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-block { margin-top: 32rpx; }
.cover-label { font-size: 26rpx; color: #8a8a8a; margin-bottom: 16rpx; display: block; }
.cover-wrap {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f4f4f5;
}
.cover-img { width: 100%; height: 100%; }
.cover-del {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 48rpx;
  height: 48rpx;
  background: rgba(0,0,0,0.5);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 选择行 */
.select-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  border-top: 1rpx solid #ececec;
}
.circle-avatar { width: 48rpx; height: 48rpx; border-radius: 999rpx; overflow: hidden; }
.circle-avatar-img { width: 100%; height: 100%; }
.select-text { font-size: 28rpx; color: #1a1a1a; }
.select-placeholder { font-size: 28rpx; color: #8a8a8a; }
.select-arrow { margin-left: auto; }
.topic-tags { display: flex; flex-wrap: wrap; gap: 8rpx; flex: 1; }
.topic-tag {
  padding: 4rpx 16rpx;
  background: rgba(196,30,58,0.1);
  color: var(--brand);
  font-size: 22rpx;
  border-radius: 999rpx;
}

/* 工具栏 */
.toolbar {
  position: sticky;
  bottom: 0;
  background: #fff;
  border-top: 1rpx solid #ececec;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.tool-format { display: flex; align-items: center; gap: 32rpx; }
.tool-btn { padding: 8rpx; }
.tool-ai { display: flex; align-items: center; gap: 16rpx; }
.ai-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
}
.ai-red { background: rgba(196,30,58,0.1); }
.ai-blue { background: rgba(37,99,235,0.1); }
.ai-green { background: rgba(5,150,105,0.1); }
.ai-orange { background: rgba(234,88,12,0.1); }
.ai-chip-text { font-size: 22rpx; }
.ai-chip-text.red { color: #C41E3A; }
.ai-chip-text.blue { color: #2563eb; }
.ai-chip-text.green { color: #059669; }
.ai-chip-text.orange { color: #ea580c; }

/* 弹窗 */
.mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0,0,0,0.5);
}
.sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 60vh;
  overflow-y: auto;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
.ai-sheet { max-height: 70vh; }
.sheet-header {
  position: sticky;
  top: 0;
  background: #fff;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #ececec;
}
.sheet-header.between { display: flex; align-items: center; justify-content: space-between; }
.sheet-title { font-size: 30rpx; font-weight: 600; color: #1a1a1a; }
.sheet-title.center { text-align: center; display: block; }
.sheet-count { font-size: 26rpx; color: #8a8a8a; }
.sheet-done { font-size: 26rpx; color: var(--brand); }
.sheet-body { padding: 32rpx; }
.sheet-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 64rpx 0;
}
.sheet-state-text { font-size: 26rpx; color: #8a8a8a; }
.opt-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: #f4f4f5;
  margin-bottom: 16rpx;
}
.opt-row.active { background: rgba(196,30,58,0.1); }
.opt-avatar { width: 80rpx; height: 80rpx; border-radius: 999rpx; overflow: hidden; }
.opt-avatar-img { width: 100%; height: 100%; }
.opt-text { font-size: 28rpx; color: #1a1a1a; }
.opt-check { margin-left: auto; }
.topic-pool { display: flex; flex-wrap: wrap; gap: 16rpx; }
.topic-pick {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  background: #f4f4f5;
  color: #1a1a1a;
}
.topic-pick.active { background: var(--brand); color: #fff; }

/* AI面板 */
.ai-sheet-title { display: flex; align-items: center; gap: 16rpx; }
.ai-sheet-title-text { font-size: 30rpx; font-weight: 600; color: #1a1a1a; }
.ai-sheet-spacer { width: 40rpx; }
.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 96rpx 0;
}
.ai-loading-text { font-size: 26rpx; color: #8a8a8a; margin-top: 24rpx; }
.ai-section { display: flex; flex-direction: column; gap: 32rpx; }
.ai-actions { display: flex; gap: 16rpx; }
.ai-apply {
  flex: 1;
  text-align: center;
  padding: 24rpx;
  border-radius: 24rpx;
  font-size: 28rpx;
  color: #fff;
}
.ai-apply.orange { background: #f97316; }
.ai-apply.green { background: #22c55e; }
.ai-apply.full { flex: 1; }
.ai-apply.disabled { opacity: 0.5; }
.ai-refresh {
  padding: 24rpx 32rpx;
  border: 1rpx solid #ececec;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-refresh-full {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 20rpx;
  border: 1rpx solid #ececec;
  border-radius: 24rpx;
}
.ai-refresh-text { font-size: 28rpx; color: #1a1a1a; }
.title-sug {
  width: 100%;
  padding: 24rpx;
  background: rgba(37,99,235,0.08);
  border-radius: 24rpx;
  font-size: 28rpx;
  color: #1a1a1a;
}
.tag-pool { display: flex; flex-wrap: wrap; gap: 16rpx; }
.tag-pick {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  background: rgba(234,88,12,0.08);
  color: #ea580c;
}
.tag-pick.active { background: #f97316; color: #fff; }
.cover-gen { display: flex; flex-direction: column; }
.cover-gen-label { font-size: 28rpx; color: #8a8a8a; margin-bottom: 16rpx; }
.cover-gen-input {
  width: 100%;
  height: 192rpx;
  padding: 24rpx;
  background: #f4f4f5;
  border-radius: 24rpx;
  font-size: 28rpx;
}
.cover-gen-result {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 24rpx;
  overflow: hidden;
}
.cover-gen-fallback {
  padding: 24rpx;
  background: rgba(5,150,105,0.06);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.cover-gen-fallback-label { font-size: 24rpx; color: #059669; }
.cover-gen-fallback-text { font-size: 26rpx; color: #1a1a1a; line-height: 1.6; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
