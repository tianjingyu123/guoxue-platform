<template>
  <view class="fav-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">我的收藏</text>
        <text class="header-edit" @click="isEdit = !isEdit; selectedIds.clear()">{{ isEdit ? '完成' : '编辑' }}</text>
      </view>
    </view>

    <!-- 类型Tab -->
    <view class="tab-bar">
      <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
        <text v-for="t in tabs" :key="t.id" class="tab-item" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">{{ t.label }}({{ t.count }})</text>
      </scroll-view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="load-area">
      <view v-for="i in 3" :key="i" class="sk-card"><view class="sk-line w60" /><view class="sk-line w90" /></view>
    </view>

    <!-- 空 -->
    <view v-else-if="filteredFavs.length === 0" class="empty-wrap">
      <text class="empty-icon">💝</text>
      <text class="empty-title">暂无收藏</text>
      <text class="empty-desc">快去发现精彩内容吧</text>
    </view>

    <!-- 收藏列表 -->
    <view v-else class="fav-list">
      <view v-for="item in filteredFavs" :key="item.id" class="fav-card">
        <view v-if="isEdit" class="fav-select" :class="{ on: selectedIds.has(item.id) }" @click="toggleSelect(item.id)">
          <text v-if="selectedIds.has(item.id)" class="fs-check">✓</text>
        </view>
        <view class="fav-img">
          <image v-if="item.image" :src="item.image" class="fav-img-real" mode="aspectFill" />
          <text v-else class="fav-img-fb">{{ typeIcon(item.type) }}</text>
          <text class="fav-type-badge">{{ typeLabel(item.type) }}</text>
        </view>
        <view class="fav-info">
          <text class="fav-title">{{ item.title }}</text>
          <text class="fav-desc">{{ item.description }}</text>
          <view class="fav-meta">
            <text v-if="item.price" class="fav-price">¥{{ item.price }}</text>
            <text class="fav-stat">{{ item.statLabel }}</text>
            <text class="fav-time">{{ item.time }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部批量操作 -->
    <view v-if="isEdit && selectedIds.size" class="bottom-bar">
      <view class="bb-left" @click="toggleAll">
        <view class="bb-check" :class="{ on: isAllSelected }"><text v-if="isAllSelected">✓</text></view>
        <text class="bb-all-text">全选</text>
      </view>
      <view class="bb-del" @click="batchDelete"><text>删除({{ selectedIds.size }})</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

interface FavItem { id: number; type: string; title: string; description: string; image: string; price?: number; statLabel: string; time: string }

const tabs = [
  { id: 'all', label: '全部', count: 12 },
  { id: 'article', label: '文章', count: 5 },
  { id: 'course', label: '课程', count: 3 },
  { id: 'product', label: '商品', count: 2 },
  { id: 'circle', label: '圈子', count: 2 },
]

const items = reactive<FavItem[]>([
  { id: 1, type: 'article', title: '八字命理入门：如何看懂你的命盘', description: '八字命理是中华传统命理学的重要分支...', image: '', statLabel: '1.2k阅读', time: '收藏于3天前' },
  { id: 2, type: 'course', title: '紫微斗数入门精讲', description: '周易大师 · 32课时', image: '', price: 199, statLabel: '856人在学', time: '收藏于5天前' },
  { id: 3, type: 'product', title: '《渊海子平》精装典藏版', description: '精装版 / 全三册', image: '', price: 168, statLabel: '256人已购', time: '收藏于1周前' },
  { id: 4, type: 'circle', title: '八字命理研习社', description: '1,280成员 · 专注八字命理学习', image: '', statLabel: '98%好评', time: '收藏于2周前' },
  { id: 5, type: 'article', title: '十神配置与人生格局的关系探讨', description: '深入分析十神在命盘中的作用...', image: '', statLabel: '890阅读', time: '收藏于3周前' },
  { id: 6, type: 'course', title: '风水堪舆实战课', description: '张玄风 · 24课时', image: '', price: 299, statLabel: '428人在学', time: '收藏于1个月前' },
])

const activeTab = ref('all')
const loading = ref(false)
const isEdit = ref(false)
const selectedIds = ref(new Set<number>())

const filteredFavs = computed(() => {
  if (activeTab.value === 'all') return items
  return items.filter(i => i.type === activeTab.value)
})
const isAllSelected = computed(() => selectedIds.value.size === filteredFavs.value.length && filteredFavs.value.length > 0)

function typeLabel(t: string) {
  const m: Record<string, string> = { article: '文章', course: '课程', product: '商品', circle: '圈子' }
  return m[t] || t
}
function typeIcon(t: string) {
  const m: Record<string, string> = { article: '📄', course: '📖', product: '🛍', circle: '👥' }
  return m[t] || '📄'
}
function toggleSelect(id: number) {
  const n = new Set(selectedIds.value); n.has(id) ? n.delete(id) : n.add(id); selectedIds.value = n
}
function toggleAll() {
  if (isAllSelected.value) { selectedIds.value = new Set(); return }
  selectedIds.value = new Set(filteredFavs.value.map(i => i.id))
}
function batchDelete() {
  if (selectedIds.value.size === 0) return
  for (let i = items.length - 1; i >= 0; i--) {
    if (selectedIds.value.has(items[i].id)) items.splice(i, 1)
  }
  selectedIds.value = new Set(); isEdit.value = false
  uni.showToast({ title: '已删除', icon: 'success' })
}
</script>

<style scoped>
.fav-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 120rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { flex: 1; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-edit { font-size: 26rpx; color: #C41E3A; font-weight: 500; }

.tab-bar { border-bottom: 1px solid #E8E0D5; }
.tab-scroll { white-space: nowrap; padding: 0 24rpx; }
.tab-item { display: inline-block; padding: 20rpx 24rpx; font-size: 26rpx; color: #999; }
.tab-item.active { color: #C41E3A; font-weight: 600; position: relative; }
.tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 24rpx; right: 24rpx; height: 4rpx; background: #C41E3A; border-radius: 2rpx; }

.load-area { padding: 24rpx; }
.sk-card { background: #fff; padding: 32rpx; border-radius: 16rpx; margin-bottom: 16rpx; }
.sk-line { height: 28rpx; background: #F2EFEA; border-radius: 6rpx; margin-bottom: 12rpx; }
.w60 { width: 60%; }
.w90 { width: 90%; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 48rpx; }
.empty-icon { font-size: 96rpx; margin-bottom: 24rpx; }
.empty-title { font-size: 32rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 8rpx; }
.empty-desc { font-size: 26rpx; color: #999; }

.fav-list { padding: 16rpx 24rpx; }
.fav-card { display: flex; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); align-items: center; }
.fav-select { width: 40rpx; height: 40rpx; border-radius: 50%; border: 3rpx solid #CCC; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fav-select.on { background: #C41E3A; border-color: #C41E3A; }
.fs-check { font-size: 24rpx; color: #fff; font-weight: 700; }

.fav-img { width: 160rpx; height: 160rpx; border-radius: 16rpx; background: #F5F1EB; position: relative; overflow: hidden; flex-shrink: 0; }
.fav-img-real { width: 100%; height: 100%; }
.fav-img-fb { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.fav-type-badge { position: absolute; top: 8rpx; left: 8rpx; font-size: 18rpx; color: #fff; background: rgba(0,0,0,0.5); padding: 2rpx 10rpx; border-radius: 6rpx; }

.fav-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.fav-title { font-size: 28rpx; font-weight: 500; color: #333; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fav-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.fav-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 8rpx; }
.fav-price { font-size: 26rpx; color: #C41E3A; font-weight: 500; }
.fav-stat, .fav-time { font-size: 22rpx; color: #999; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: #fff; border-top: 1px solid #E8E0D5; display: flex; justify-content: space-between; align-items: center; padding: 12rpx 24rpx; padding-bottom: calc(12rpx + env(safe-area-inset-bottom)); }
.bb-left { display: flex; align-items: center; gap: 12rpx; }
.bb-check { width: 40rpx; height: 40rpx; border-radius: 50%; border: 3rpx solid #CCC; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #fff; }
.bb-check.on { background: #C41E3A; border-color: #C41E3A; }
.bb-all-text { font-size: 26rpx; color: #2C2C2C; }
.bb-del { padding: 16rpx 40rpx; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: 500; }
</style>
