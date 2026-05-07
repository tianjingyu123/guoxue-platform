<template>
  <view class="content-card" @click="goDetail">
    <image v-if="article.cover" :src="article.cover" class="card-cover" mode="aspectFill" />
    <view class="card-body">
      <view class="card-title">{{ article.title }}</view>
      <view class="card-meta">
        <text v-if="article.author" class="meta-author">{{ article.author }}</text>
        <text v-if="article.dynasty" class="meta-dynasty">{{ article.dynasty }}</text>
        <text class="meta-time">{{ formatTime(article.createdAt) }}</text>
      </view>
      <view class="card-excerpt" v-if="article.excerpt">{{ article.excerpt }}</view>
      <view class="card-tags" v-if="article.tags && article.tags.length">
        <text v-for="tag in article.tags" :key="tag" class="tag">{{ tag }}</text>
      </view>
      <view class="card-stats">
        <text class="stat-item">📖 {{ article.viewCount ?? 0 }}</text>
        <text class="stat-item">👍 {{ article.likeCount ?? 0 }}</text>
        <text class="stat-item">⭐ {{ article.collectCount ?? 0 }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Article {
  id: string
  title: string
  cover?: string
  excerpt?: string
  author?: string
  dynasty?: string
  tags?: string[]
  viewCount?: number
  likeCount?: number
  collectCount?: number
  createdAt?: string
}

const props = defineProps<{
  article: Article
}>()

function goDetail() {
  uni.navigateTo({
    url: `/pages/detail/detail?id=${props.article.id}&type=ARTICLE`
  })
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.content-card {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-cover {
  width: 100%;
  height: 180px;
  display: block;
}

.card-body {
  padding: 12px 14px 14px;
}

.card-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #999;
  margin: 6px 0;
}

.meta-author {
  color: #8b4513;
}

.meta-dynasty {
  color: #8b4513;
  font-size: 11px;
  background: #f5f0e6;
  padding: 1px 6px;
  border-radius: 3px;
}

.meta-time {
  margin-left: auto;
}

.card-excerpt {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 6px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0;
}

.tag {
  font-size: 11px;
  color: #8b4513;
  background: #f5f0e6;
  padding: 2px 8px;
  border-radius: 10px;
  line-height: 1.6;
}

.card-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0ece4;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
