<template>
  <view class="page">
    <!-- 加载 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">诗词加载中...</text>
    </view>

    <!-- 内容 -->
    <scroll-view v-else-if="poem" scroll-y class="scroll-wrap">
      <!-- 顶部背景 -->
      <view class="header-bg">
        <view class="header-overlay" />
        <view class="header-content">
          <text class="poem-title">{{ poem.title }}</text>
          <text class="poem-author">
            {{ poem.dynasty ? `〔${poem.dynasty}〕` : '' }}{{ poem.author || '佚名' }}
          </text>
        </view>
      </view>

      <!-- 诗文正文 -->
      <view class="poem-body-card">
        <view class="poem-lines">
          <text
            v-for="(line, i) in poemLines"
            :key="i"
            class="poem-line"
          >{{ line }}</text>
        </view>

        <!-- 操作栏 -->
        <view class="action-row">
          <view class="action-item" @click="toggleLike">
            <text class="action-icon">{{ isLiked ? '❤️' : '🤍' }}</text>
            <text class="action-label">{{ likeCount }}</text>
          </view>
          <view class="action-item" @click="toggleCollect">
            <text class="action-icon">{{ isCollected ? '⭐' : '☆' }}</text>
            <text class="action-label">收藏</text>
          </view>
          <view class="action-item" @click="copyPoem">
            <text class="action-icon">📋</text>
            <text class="action-label">复制</text>
          </view>
          <view class="action-item" @click="sharePoem">
            <text class="action-icon">↗</text>
            <text class="action-label">分享</text>
          </view>
        </view>
      </view>

      <!-- 标签 -->
      <view v-if="poem.tags?.length" class="tags-section">
        <text v-for="t in poem.tags" :key="t" class="tag-chip">{{ t }}</text>
      </view>

      <!-- 注释/赏析 -->
      <view class="section-card" v-if="appreciation">
        <view class="section-tab-row">
          <text
            class="section-tab"
            :class="{ active: activeTab === 'translation' }"
            @click="activeTab = 'translation'"
          >译文</text>
          <text
            class="section-tab"
            :class="{ active: activeTab === 'annotation' }"
            @click="activeTab = 'annotation'"
          >注释</text>
          <text
            class="section-tab"
            :class="{ active: activeTab === 'appreciation' }"
            @click="activeTab = 'appreciation'"
          >赏析</text>
        </view>
        <view class="section-body">
          <text v-if="activeTab === 'translation'" class="section-text">
            {{ appreciation.translation || '暂无译文，AI生成中...' }}
          </text>
          <text v-if="activeTab === 'annotation'" class="section-text">
            {{ appreciation.annotation || '暂无注释，AI生成中...' }}
          </text>
          <text v-if="activeTab === 'appreciation'" class="section-text">
            {{ appreciation.appreciation || '暂无赏析，AI生成中...' }}
          </text>
        </view>
      </view>

      <!-- 每日推荐 -->
      <view v-if="dailyPoem && dailyPoem.id !== poem.id" class="section-card">
        <text class="card-title">📖 每日一诗</text>
        <view class="daily-poem" @click="goPoem(dailyPoem.id)">
          <text class="daily-title">{{ dailyPoem.title }}</text>
          <text class="daily-author">{{ dailyPoem.dynasty ? `〔${dailyPoem.dynasty}〕` : '' }}{{ dailyPoem.author }}</text>
          <text class="daily-excerpt">{{ dailyPoem.excerpt || extractExcerpt(dailyPoem.body) }}</text>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="bottom-space" />
    </scroll-view>

    <!-- 错误 -->
    <view v-else class="loading-wrap">
      <text class="loading-text">诗词不存在或加载失败</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { contentsApi, interactApi } from '../../api'

const poem = ref<any>(null)
const appreciation = ref<any>(null)
const dailyPoem = ref<any>(null)
const loading = ref(true)
const isLiked = ref(false)
const isCollected = ref(false)
const likeCount = ref(0)
const activeTab = ref('translation')

const poemLines = computed(() => {
  if (!poem.value?.body) return []
  const text = poem.value.body
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return text.split(/[\n\r]+/).filter((l: string) => l.trim())
})

onMounted(async () => {
  const pages = getCurrentPages()
  const id = (pages[pages.length - 1] as any)?.options?.id
  if (!id) { loading.value = false; return }

  try {
    const [detail, daily] = await Promise.all([
      contentsApi.detail(id),
      contentsApi.dailyPoem().catch(() => null),
    ])
    poem.value = detail
    likeCount.value = detail?.likeCount || 0
    dailyPoem.value = daily

    contentsApi.poemAppreciation(id).then((res: any) => {
      appreciation.value = res
    }).catch(() => {})
  } catch {
    poem.value = null
  } finally {
    loading.value = false
  }
})

function toggleLike() {
  if (!poem.value) return
  isLiked.value = !isLiked.value
  likeCount.value += isLiked.value ? 1 : -1
  interactApi.toggleLike('CONTENT', poem.value.id).catch(() => {})
}

function toggleCollect() {
  if (!poem.value) return
  isCollected.value = !isCollected.value
  interactApi.toggleCollect('CONTENT', poem.value.id).catch(() => {})
  uni.showToast({ title: isCollected.value ? '已收藏' : '已取消', icon: 'none' })
}

function copyPoem() {
  if (!poem.value) return
  const lines = poemLines.value.join('\n')
  const text = `${poem.value.title}\n${poem.value.dynasty ? `〔${poem.value.dynasty}〕` : ''}${poem.value.author || ''}\n\n${lines}`
  uni.setClipboardData({ data: text })
}

function sharePoem() {
  uni.showToast({ title: '已复制分享链接', icon: 'success' })
}

function goPoem(id: string) {
  uni.redirectTo({ url: `/pages/poetry/poem-detail?id=${id}` })
}

function extractExcerpt(body?: string): string {
  if (!body) return ''
  const text = body.replace(/<[^>]+>/g, '').trim()
  return text.slice(0, 40) + (text.length > 40 ? '...' : '')
}
</script>

<style>
.page {
  min-height: 100vh;
  background: #f8f5f0;
}
.scroll-wrap {
  height: 100vh;
}

/* 顶部背景 */
.header-bg {
  position: relative;
  height: 200px;
  background: linear-gradient(135deg, #2c1810 0%, #4a2c1a 50%, #1a1a2e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-overlay {
  position: absolute;
  inset: 0;
  background: url('data:image/svg+xml,...') repeat;
  opacity: 0.05;
}
.header-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 20px;
}
.poem-title {
  font-size: 26px;
  font-weight: bold;
  color: #f5e6d3;
  letter-spacing: 4px;
  display: block;
  margin-bottom: 12px;
  font-family: "STKaiti", "KaiTi", serif;
}
.poem-author {
  font-size: 14px;
  color: #c9a96e;
  letter-spacing: 2px;
  display: block;
}

/* 诗文卡片 */
.poem-body-card {
  margin: -30px 16px 16px;
  background: #fff;
  border-radius: 12px;
  padding: 28px 20px 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 5;
}
.poem-lines {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 10px 0 20px;
}
.poem-line {
  font-size: 18px;
  color: #2c1810;
  letter-spacing: 2px;
  line-height: 1.8;
  font-family: "STKaiti", "KaiTi", serif;
  text-align: center;
}

/* 操作栏 */
.action-row {
  display: flex;
  justify-content: space-around;
  border-top: 1px solid #f0ebe3;
  padding-top: 14px;
  margin-top: 10px;
}
.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.action-icon {
  font-size: 22px;
}
.action-label {
  font-size: 11px;
  color: #8b7355;
}

/* 标签 */
.tags-section {
  padding: 0 16px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-chip {
  background: #f0ebe3;
  color: #8b7355;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
}

/* 注释/赏析卡片 */
.section-card {
  margin: 0 16px 16px;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.card-title {
  font-size: 15px;
  font-weight: bold;
  color: #2c1810;
  margin-bottom: 12px;
  display: block;
}
.section-tab-row {
  display: flex;
  gap: 16px;
  border-bottom: 1px solid #f0ebe3;
  padding-bottom: 10px;
  margin-bottom: 14px;
}
.section-tab {
  font-size: 14px;
  color: #8b7355;
  padding-bottom: 4px;
}
.section-tab.active {
  color: #c41e3a;
  font-weight: bold;
  border-bottom: 2px solid #c41e3a;
}
.section-body {
  padding: 4px 0;
}
.section-text {
  font-size: 14px;
  color: #4a3728;
  line-height: 1.8;
}

/* 每日一诗 */
.daily-poem {
  padding: 12px;
  background: #faf7f2;
  border-radius: 8px;
  border-left: 3px solid #c9a96e;
}
.daily-title {
  font-size: 15px;
  font-weight: bold;
  color: #2c1810;
  display: block;
  margin-bottom: 4px;
}
.daily-author {
  font-size: 12px;
  color: #8b7355;
  display: block;
  margin-bottom: 6px;
}
.daily-excerpt {
  font-size: 13px;
  color: #6b5a4a;
  line-height: 1.6;
  display: block;
}

/* 加载 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.loading-text {
  font-size: 15px;
  color: #8b7355;
}
.bottom-space {
  height: 40px;
}
</style>
