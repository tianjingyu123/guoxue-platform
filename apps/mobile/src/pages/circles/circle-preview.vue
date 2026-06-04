<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="preview-header">
        <image
          :src="circle.cover || circle.avatar || ''"
          class="circle-cover"
          mode="aspectFill"
        />
        <text class="circle-name">
          {{ circle.name }}
        </text>
        <text class="circle-desc">
          {{ circle.description || circle.intro }}
        </text>
        <view class="stats">
          <text>{{ circle.memberCount || 0 }} 成员</text><text>{{ circle.postCount || 0 }} 帖子</text>
        </view>
        <button
          class="btn-join"
          @click="joinCircle"
        >
          {{ joined ? '进入圈子' : '加入圈子' }}
        </button>
      </view>
      <view class="recent-posts">
        <text class="section-title">
          最新帖子
        </text>
        <view
          v-for="p in posts"
          :key="p.id"
          class="post-item"
          @click="goPost(p)"
        >
          <text class="post-title">
            {{ p.title }}
          </text>
          <text class="post-excerpt">
            {{ p.excerpt || p.content?.slice(0, 80) }}
          </text>
        </view>
        <EmptyState
          v-if="!posts.length"
          text="暂无帖子"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { circleApi } from '../../api'

const loading = ref(true)
const circle = ref<any>({})
const posts = ref<any[]>([])
const joined = ref(false)

onMounted(async () => {
  const query = getCurrentPages().pop()?.options || {}
  const id = query.id || query.circleId || ''
  if (!id) { loading.value = false; return }
  try {
    const [detail, postData] = await Promise.all([circleApi.detail(id), circleApi.posts(id, { pageSize: 3 })])
    circle.value = detail || {}
    posts.value = Array.isArray(postData) ? postData : postData?.data || postData?.list || []
  } catch {} finally { loading.value = false }
})

async function joinCircle() {
  try {
    await circleApi.join(circle.value.id)
    joined.value = true
    uni.showToast({ title: '已加入圈子', icon: 'success' })
  } catch {}
}
function goPost(p: any) {
  uni.navigateTo({ url: `/pages/circles/post-detail?id=${p.id}&circleId=${circle.value.id}` })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; }
.preview-header { text-align: center; padding: 20px 16px; background: linear-gradient(180deg, #C41E3A 0%, #fff 60%); }
.circle-cover { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #fff; }
.circle-name { font-size: 22px; font-weight: bold; display: block; margin-top: 12px; }
.circle-desc { font-size: 13px; color: #666; display: block; margin-top: 6px; padding: 0 20px; }
.stats { display: flex; justify-content: center; gap: 24px; margin-top: 12px; font-size: 13px; color: #999; }
.btn-join { width: 200px; height: 40px; background: #C41E3A; color: #fff; border-radius: 20px; border: none; font-size: 15px; margin-top: 16px; }
.recent-posts { padding: 16px; }
.section-title { font-size: 16px; font-weight: 500; margin-bottom: 12px; display: block; }
.post-item { background: #fff; border-radius: 10px; padding: 12px; margin-bottom: 8px; }
.post-title { font-size: 14px; font-weight: 500; display: block; }
.post-excerpt { font-size: 12px; color: #999; margin-top: 4px; display: block; }
</style>
