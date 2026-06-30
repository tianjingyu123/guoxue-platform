<script setup lang="ts">
/**
 * 圈子知识库（视觉层沿用原型 knowledge；逻辑层重写为真连后端）
 * 已入库(GET knowledge) / 待确认(GET candidates) 双Tab；确认/忽略走 confirm/reject 端点(防重复)。
 * 后端知识条目为 RAG 文本块(content+sourceType)，title/summary 由 content 派生，无 tags(不造假)。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { knowledgeApi, type KnowledgeItem } from '@/lib/circle-knowledge-data'

const circleId = ref('')
const activeTab = ref<'confirmed' | 'pending'>('confirmed')
const keyword = ref('')
const expandedId = ref<string | null>(null)
const loading = ref(true)
const error = ref('')
const acting = ref(false)
const confirmedItems = ref<KnowledgeItem[]>([])
const pendingItems = ref<KnowledgeItem[]>([])

const currentItems = computed(() => (activeTab.value === 'confirmed' ? confirmedItems.value : pendingItems.value))
const filteredItems = computed(() => {
  const k = keyword.value.trim()
  if (!k) return currentItems.value
  return currentItems.value.filter(it => it.title.includes(k) || it.summary.includes(k) || it.content.includes(k))
})
const pendingCount = computed(() => pendingItems.value.length)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [list, cands] = await Promise.all([
      knowledgeApi.list(circleId.value),
      knowledgeApi.candidates(circleId.value),
    ])
    confirmedItems.value = list
    pendingItems.value = cands
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

function toggleExpand(id: string) { expandedId.value = expandedId.value === id ? null : id }
function fmtDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

async function confirmItem(id: string) {
  if (acting.value) return
  acting.value = true
  try {
    await knowledgeApi.confirm(circleId.value, id)
    uni.showToast({ title: '已确认入库', icon: 'success' })
    await load()
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}
async function ignoreItem(id: string) {
  if (acting.value) return
  acting.value = true
  try {
    await knowledgeApi.reject(circleId.value, id)
    uni.showToast({ title: '已忽略', icon: 'none' })
    await load()
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}

onLoad((opt) => { circleId.value = (opt?.id || opt?.circleId || '') as string })
onMounted(load)
</script>

<template>
  <view class="kb">
    <!-- 顶部固定区 -->
    <view class="kb-top">
      <view class="kb-nav">
        <view class="kb-nav-btn" @tap="goBack"><app-icon name="chevron-left" :size="44" color="#2C2C2C" /></view>
        <text class="kb-nav-title">知识库</text>
        <view class="kb-nav-btn" />
      </view>

      <!-- 搜索框 -->
      <view class="kb-search-wrap">
        <view class="kb-search">
          <app-icon name="search" :size="30" color="#999999" />
          <input v-model="keyword" class="kb-search-input" placeholder="搜索知识..." placeholder-class="kb-ph" />
        </view>
      </view>

      <!-- Tab -->
      <view class="kb-tabs">
        <view class="kb-tab" :class="{ on: activeTab === 'confirmed' }" @tap="activeTab = 'confirmed'">
          <app-icon name="book-open" :size="28" :color="activeTab === 'confirmed' ? '#C41E3A' : '#666666'" />
          <text class="kb-tab-t" :class="{ on: activeTab === 'confirmed' }">已入库</text>
        </view>
        <view class="kb-tab" :class="{ on: activeTab === 'pending' }" @tap="activeTab = 'pending'">
          <text class="kb-tab-t" :class="{ on: activeTab === 'pending' }">待确认</text>
          <view v-if="pendingCount > 0" class="kb-badge"><text class="kb-badge-t">{{ pendingCount }}</text></view>
        </view>
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view scroll-y class="kb-body">
      <!-- 三态 -->
      <view v-if="loading" class="kb-empty"><text class="kb-empty-t">加载中…</text></view>
      <view v-else-if="error" class="kb-empty">
        <text class="kb-empty-t">{{ error }}</text>
        <view class="kb-retry" @tap="load"><text class="kb-retry-t">重试</text></view>
      </view>
      <view v-else-if="filteredItems.length === 0" class="kb-empty">
        <view class="kb-empty-icon"><app-icon name="book-open" :size="48" color="#C9A96E" /></view>
        <text class="kb-empty-t">{{ activeTab === 'confirmed' ? '暂无知识内容' : '暂无待确认内容' }}</text>
      </view>

      <view v-else class="kb-list">
        <view v-for="item in filteredItems" :key="item.id" class="kb-card">
          <view class="kb-card-body">
            <!-- 标题行 -->
            <view class="kb-card-head">
              <text class="kb-card-title">{{ item.title }}</text>
              <view v-if="activeTab === 'pending'" class="kb-pending"><text class="kb-pending-t">待确认</text></view>
            </view>
            <!-- 摘要 -->
            <text class="kb-card-summary">{{ item.summary }}</text>
            <!-- 来源与时间 -->
            <view class="kb-meta">
              <view class="kb-meta-l">
                <app-icon name="file-text" :size="24" color="#999999" />
                <text class="kb-meta-t">来源：{{ item.sourceLabel }}</text>
              </view>
              <view class="kb-meta-r">
                <app-icon name="clock" :size="24" color="#999999" />
                <text class="kb-meta-t">{{ fmtDate(item.createdAt) }}</text>
              </view>
            </view>
            <!-- 展开详情 -->
            <view v-if="expandedId === item.id" class="kb-detail">
              <text class="kb-detail-t">{{ item.content }}</text>
            </view>
            <!-- 展开/收起 -->
            <view class="kb-toggle" @tap="toggleExpand(item.id)">
              <text class="kb-toggle-t">{{ expandedId === item.id ? '收起' : '查看详情' }}</text>
              <app-icon :name="expandedId === item.id ? 'chevron-up' : 'chevron-down'" :size="28" color="#C41E3A" />
            </view>
          </view>
          <!-- 圈主操作（仅待确认） -->
          <view v-if="activeTab === 'pending'" class="kb-actions">
            <view class="kb-action" @tap="ignoreItem(item.id)">
              <app-icon name="x" :size="28" color="#999999" /><text class="kb-action-t ignore">忽略</text>
            </view>
            <view class="kb-action-div" />
            <view class="kb-action" @tap="confirmItem(item.id)">
              <app-icon name="check" :size="28" color="#C41E3A" /><text class="kb-action-t confirm">确认入库</text>
            </view>
          </view>
        </view>
      </view>
      <view class="kb-spacer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.kb { display: flex; flex-direction: column; height: 100vh; background: #faf8f5; }
.kb-top { background: #ffffff; border-bottom: 2rpx solid #e8e3db; flex-shrink: 0; padding-top: var(--status-bar-height, 0); }
.kb-nav { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 16rpx; }
.kb-nav-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.kb-nav-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }
.kb-search-wrap { padding: 0 24rpx 18rpx; }
.kb-search { display: flex; align-items: center; gap: 12rpx; height: 72rpx; padding: 0 24rpx; background: #faf8f5; border-radius: 999rpx; }
.kb-search-input { flex: 1; font-size: 26rpx; color: #2c2c2c; }
.kb-ph { color: #999999; }
.kb-tabs { display: flex; padding: 0 24rpx; }
.kb-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; height: 80rpx; border-bottom: 4rpx solid transparent; position: relative; }
.kb-tab.on { border-bottom-color: var(--brand); }
.kb-tab-t { font-size: 26rpx; color: #666666; font-weight: 500; }
.kb-tab-t.on { color: var(--brand); }
.kb-badge { position: absolute; top: 10rpx; right: 28%; min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 999rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.kb-badge-t { font-size: 20rpx; color: #ffffff; }
.kb-body { flex: 1; overflow: hidden; }
.kb-list { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.kb-card { background: #ffffff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.kb-card-body { padding: 24rpx; }
.kb-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; margin-bottom: 12rpx; }
.kb-card-title { flex: 1; font-size: 30rpx; font-weight: 600; color: #2c2c2c; line-height: 1.4; }
.kb-pending { padding: 2rpx 12rpx; background: #fff0e0; border-radius: 999rpx; flex-shrink: 0; }
.kb-pending-t { font-size: 20rpx; color: #e8820c; }
.kb-card-summary { display: block; font-size: 26rpx; color: #666666; line-height: 1.6; margin-bottom: 18rpx; }
.kb-meta { display: flex; align-items: center; justify-content: space-between; }
.kb-meta-l, .kb-meta-r { display: flex; align-items: center; gap: 6rpx; }
.kb-meta-t { font-size: 22rpx; color: #999999; }
.kb-detail { margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid #e8e3db; }
.kb-detail-t { font-size: 26rpx; color: #666666; line-height: 1.6; white-space: pre-wrap; }
.kb-toggle { margin-top: 18rpx; display: flex; align-items: center; justify-content: center; gap: 6rpx; padding: 12rpx 0; }
.kb-toggle-t { font-size: 26rpx; color: var(--brand); }
.kb-actions { display: flex; border-top: 2rpx solid #e8e3db; }
.kb-action { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 22rpx 0; }
.kb-action-div { width: 2rpx; background: #e8e3db; }
.kb-action-t { font-size: 26rpx; }
.kb-action-t.ignore { color: #999999; }
.kb-action-t.confirm { color: var(--brand); }
.kb-empty { display: flex; flex-direction: column; align-items: center; padding-top: 160rpx; gap: 24rpx; }
.kb-empty-icon { width: 128rpx; height: 128rpx; border-radius: 999rpx; background: #faf8f5; display: flex; align-items: center; justify-content: center; }
.kb-empty-t { font-size: 26rpx; color: #999999; }
.kb-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.kb-retry-t { font-size: 26rpx; color: #fff; }
.kb-spacer { height: 40rpx; }
</style>
