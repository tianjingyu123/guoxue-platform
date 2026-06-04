<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-left" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">知识库</text>
      <view class="nav-spacer" />
    </view>

    <!-- 搜索框 -->
    <view class="search-bar">
      <view class="search-inner">
        <text class="search-icon">🔍</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索知识..."
          @confirm="onSearch"
          @input="onSearch"
        />
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'confirmed' }"
        @click="switchTab('confirmed')"
      >
        <text class="tab-icon">📖</text>
        <text>已入库</text>
      </view>
      <view
        v-if="isOwner"
        class="tab-item"
        :class="{ active: activeTab === 'pending' }"
        @click="switchTab('pending')"
      >
        <text>待确认</text>
        <view v-if="pendingCount > 0" class="tab-badge">{{ pendingCount }}</view>
      </view>
    </view>

    <!-- 内容区 -->
    <view class="content-wrap">
      <template v-if="loading">
        <view v-for="i in 4" :key="i" class="sk-card">
          <view class="sk-title" />
          <view class="sk-line" />
          <view class="sk-line short" />
          <view class="sk-tags">
            <view class="sk-tag" />
            <view class="sk-tag" />
          </view>
        </view>
      </template>

      <template v-else-if="items.length === 0">
        <view class="empty-state">
          <view class="empty-icon-wrap">
            <text class="empty-icon">📖</text>
          </view>
          <text class="empty-text">{{ activeTab === 'confirmed' ? '暂无知识内容' : '暂无待确认内容' }}</text>
        </view>
      </template>

      <template v-else>
        <view v-for="item in items" :key="item.id" class="knowledge-card">
          <view class="kc-body">
            <!-- 标题 -->
            <view class="kc-title-row">
              <text class="kc-title">{{ item.title }}</text>
              <text v-if="item.status === 'pending'" class="kc-pending-badge">待确认</text>
            </view>

            <!-- 摘要 -->
            <text class="kc-summary">{{ item.summary }}</text>

            <!-- 标签 -->
            <view v-if="item.tags && item.tags.length > 0" class="kc-tags">
              <text v-for="(tag, idx) in item.tags.slice(0, 3)" :key="idx" class="kc-tag">
                <text class="kc-tag-icon">🏷</text>
                {{ tag }}
              </text>
              <text v-if="item.tags.length > 3" class="kc-tag-more">+{{ item.tags.length - 3 }}</text>
            </view>

            <!-- 来源和时间 -->
            <view class="kc-meta">
              <text class="kc-source">
                <text class="kc-meta-icon">📄</text>
                {{ sourceLabel(item.source) }}
              </text>
              <text class="kc-time">
                <text class="kc-meta-icon">🕐</text>
                {{ formatDate(item.createdAt) }}
              </text>
            </view>

            <!-- 展开详情 -->
            <view v-if="expandedIds[item.id]" class="kc-expanded">
              <text class="kc-expanded-text">{{ item.content }}</text>
            </view>

            <!-- 展开/收起 -->
            <view class="kc-toggle" @click="toggleExpand(item.id)">
              <text v-if="expandedIds[item.id]" class="kc-toggle-text">收起</text>
              <text v-else class="kc-toggle-text">查看详情</text>
            </view>
          </view>

          <!-- 圈主操作 -->
          <view v-if="isOwner && item.status === 'pending'" class="kc-actions">
            <view class="kc-action-btn ignore" @click="handleIgnore(item.id)">
              <text class="kc-action-icon">✕</text>
              <text>忽略</text>
            </view>
            <view class="kc-action-divider" />
            <view class="kc-action-btn confirm" @click="handleConfirm(item.id)">
              <text class="kc-action-icon">✓</text>
              <text>确认入库</text>
            </view>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { circleApi } from '../../api'

interface KnowledgeSource {
  type: string
  id?: string
  name: string
}

interface KnowledgeItem {
  id: string
  title: string
  summary: string
  content: string
  source: KnowledgeSource
  status: string
  tags: string[]
  createdAt: string
}

const activeTab = ref<'confirmed' | 'pending'>('confirmed')
const keyword = ref('')
const items = ref<KnowledgeItem[]>([])
const loading = ref(true)
const isOwner = ref(true)
const pendingCount = ref(5)
const expandedIds = ref<Record<string, boolean>>({})
const circleId = ref('')
const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null)

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  circleId.value = page?.options?.circleId || page?.options?.id || ''
  loadData()
})

watch(activeTab, () => {
  loadData()
})

function onSearch() {
  if (searchTimer.value) clearTimeout(searchTimer.value)
  searchTimer.value = setTimeout(() => {
    loadData()
  }, 300)
}

async function loadData() {
  loading.value = true
  try {
    const result = await circleApi.listKnowledge(circleId.value, {
      status: activeTab.value,
      keyword: keyword.value,
    })
    items.value = result?.data || result || []
  } catch {
    items.value = getMockData()
  } finally {
    loading.value = false
  }
}

function getMockData(): KnowledgeItem[] {
  const status = activeTab.value
  return [
    {
      id: '1',
      title: '八字命理中的天干地支基础知识',
      summary: '天干地支是中国古代记录时间的系统，由十天干和十二地支组成。',
      content: '天干包括：甲、乙、丙、丁、戊、己、庚、辛、壬、癸\n地支包括：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥',
      source: { type: 'post', id: 'p1', name: '周易大师的帖子' },
      status,
      tags: ['八字', '天干地支', '基础'],
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      title: '紫微斗数十二宫位详解',
      summary: '紫微斗数的命盘由十二个宫位组成。',
      content: '命宫、兄弟宫、夫妻宫、子女宫、财帛宫、疾厄宫、迁移宫、奴仆宫、官禄宫、田宅宫、福德宫、父母宫。',
      source: { type: 'article', id: 'a1', name: '紫微斗数入门' },
      status,
      tags: ['紫微斗数', '宫位'],
      createdAt: '2024-01-14T15:30:00Z',
    },
    {
      id: '3',
      title: '风水中的五行生克关系',
      summary: '五行相生：木生火、火生土、土生金、金生水、水生木。',
      content: '五行生克关系是风水学的核心理论。木生火：木材燃烧产生火；火生土：火燃烧后产生灰土。',
      source: { type: 'manual', name: '管理员整理' },
      status,
      tags: ['风水', '五行'],
      createdAt: '2024-01-13T09:00:00Z',
    },
  ]
}

function sourceLabel(source: KnowledgeSource): string {
  const labels: Record<string, string> = { post: '帖子', article: '文章', manual: '手动' }
  return `${labels[source.type] || source.type}：${source.name}`
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function switchTab(tab: 'confirmed' | 'pending') {
  if (activeTab.value === tab) return
  activeTab.value = tab
}

function toggleExpand(id: string) {
  expandedIds.value[id] = !expandedIds.value[id]
}

async function handleConfirm(id: string) {
  try {
    await circleApi.confirmKnowledge(circleId.value, id)
  } catch { /* ignore */ }
  items.value = items.value.filter((item) => item.id !== id)
}

async function handleIgnore(id: string) {
  try {
    await circleApi.ignoreKnowledge(circleId.value, id)
  } catch { /* ignore */ }
  items.value = items.value.filter((item) => item.id !== id)
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

/* ===== 顶部导航 ===== */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 2rpx solid #E8E3DB;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 112rpx;
}
.nav-left { padding: 12rpx; }
.nav-icon { font-size: 48rpx; color: #2C2C2C; }
.nav-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.nav-spacer { width: 80rpx; }

/* ===== 搜索框 ===== */
.search-bar { padding: 16rpx 32rpx; background: #fff; }
.search-inner { position: relative; }
.search-icon {
  position: absolute;
  left: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 28rpx;
  z-index: 1;
}
.search-input {
  width: 100%;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 80rpx;
  background: #FAF8F5;
  border-radius: 50rpx;
  font-size: 26rpx;
  color: #2C2C2C;
  border: none;
  outline: none;
}

/* ===== Tab切换 ===== */
.tab-bar {
  display: flex;
  padding: 0 32rpx;
  background: #fff;
  border-bottom: 2rpx solid #F0EBE3;
}
.tab-item {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  font-size: 26rpx;
  font-weight: 500;
  color: #666;
  border-bottom: 4rpx solid transparent;
  position: relative;
  transition: all 0.2s;
}
.tab-item.active { color: #C41E3A; border-bottom-color: #C41E3A; }
.tab-icon { margin-right: 8rpx; }
.tab-badge {
  position: absolute;
  top: 8rpx;
  right: 25%;
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  background: #C41E3A;
  color: #fff;
  border-radius: 50rpx;
  min-width: 36rpx;
  text-align: center;
}

/* ===== 内容区 ===== */
.content-wrap { padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* 骨架 */
.sk-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
}
.sk-title { height: 40rpx; background: #E8E3DB; border-radius: 8rpx; width: 75%; margin-bottom: 20rpx; }
.sk-line { height: 32rpx; background: #E8E3DB; border-radius: 8rpx; margin-bottom: 12rpx; }
.sk-line.short { width: 66%; }
.sk-tags { display: flex; gap: 12rpx; margin-top: 16rpx; }
.sk-tag { height: 48rpx; width: 128rpx; background: #E8E3DB; border-radius: 50rpx; }

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
}
.empty-icon-wrap {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: #FAF8F5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-icon { font-size: 56rpx; color: #C9A96E; }
.empty-text { font-size: 28rpx; color: #999; }

/* 知识卡片 */
.knowledge-card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.kc-body { padding: 32rpx; }
.kc-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; margin-bottom: 16rpx; }
.kc-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; line-height: 1.4; flex: 1; }
.kc-pending-badge { padding: 4rpx 14rpx; font-size: 22rpx; background: #FEF3C7; color: #D97706; border-radius: 50rpx; white-space: nowrap; flex-shrink: 0; }
.kc-summary { font-size: 26rpx; color: #666; line-height: 1.6; margin-bottom: 20rpx; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }

.kc-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 20rpx; }
.kc-tag { padding: 6rpx 16rpx; background: #FAF8F5; color: #666; font-size: 22rpx; border-radius: 50rpx; }
.kc-tag-icon { margin-right: 4rpx; }
.kc-tag-more { font-size: 22rpx; color: #999; line-height: 48rpx; }

.kc-meta { display: flex; align-items: center; justify-content: space-between; font-size: 24rpx; color: #999; }
.kc-meta-icon { margin-right: 4rpx; }
.kc-source { display: flex; align-items: center; gap: 4rpx; }
.kc-time { display: flex; align-items: center; gap: 4rpx; }

.kc-expanded { margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid #E8E3DB; }
.kc-expanded-text { font-size: 26rpx; color: #666; line-height: 1.8; white-space: pre-wrap; }

.kc-toggle { margin-top: 20rpx; text-align: center; }
.kc-toggle-text { font-size: 26rpx; color: #C41E3A; }

/* 圈主操作 */
.kc-actions {
  display: flex;
  border-top: 2rpx solid #E8E3DB;
}
.kc-action-btn {
  flex: 1;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 26rpx;
}
.kc-action-btn.ignore { color: #999; }
.kc-action-btn.confirm { color: #C41E3A; }
.kc-action-divider { width: 2rpx; background: #E8E3DB; }
.kc-action-icon { font-size: 28rpx; }
</style>
