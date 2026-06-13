<template>
  <view
    class="circle-card"
    @click="goDetail"
  >
    <image
      v-if="circle.cover"
      :src="circle.cover"
      class="card-cover"
      mode="aspectFill"
    />
    <view class="card-body">
      <view class="card-header">
        <text class="card-name">
          {{ circle.name }}
        </text>
        <text
          class="type-tag"
          :class="circle.type"
        >
          {{ circle.type === 'paid' ? '付费' : '免费' }}
        </text>
      </view>
      <view
        v-if="circle.intro"
        class="card-intro"
      >
        {{ circle.intro }}
      </view>
      <view
        v-if="circle.tags && circle.tags.length"
        class="card-tags"
      >
        <text
          v-for="tag in circle.tags"
          :key="tag"
          class="tag"
        >
          {{ tag }}
        </text>
      </view>
      <view class="card-stats">
        <text class="stat-item">
          👥 {{ circle.memberCount ?? 0 }} 成员
        </text>
        <text class="stat-item">
          📝 {{ circle.postCount ?? 0 }} 帖子
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Circle {
  id: string
  name: string
  cover?: string
  intro?: string
  memberCount?: number
  postCount?: number
  type?: string
  tags?: string[]
}

const props = defineProps<{
  circle: Circle
}>()

function goDetail() {
  uni.navigateTo({
    url: `/pages/circles/circle-detail?id=${props.circle.id}`
  })
}
</script>

<style scoped>
.circle-card {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-cover {
  width: 100%;
  height: 130px;
  display: block;
}

.card-body {
  padding: 12px 14px 14px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.type-tag.free {
  color: #2e7d32;
  background: #e8f5e9;
}

.type-tag.paid {
  color: #8b4513;
  background: #f5f0e6;
}

.card-intro {
  font-size: 13px;
  color: #888;
  line-height: 1.5;
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
  gap: 3px;
}
</style>
