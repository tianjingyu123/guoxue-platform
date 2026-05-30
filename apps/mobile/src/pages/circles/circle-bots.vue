<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="bots.length" class="list">
      <view v-for="bot in bots" :key="bot.id" class="bot-card" @click="goChat(bot)">
        <image :src="bot.avatar || ''" class="bot-avatar" mode="aspectFill" />
        <view class="bot-info">
          <text class="bot-name">{{ bot.name }}</text>
          <text class="bot-desc">{{ bot.description || bot.intro }}</text>
        </view>
      </view>
    </view>
    <EmptyState v-else text="暂无智能体" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { botApi } from '../../api'

const loading = ref(true)
const bots = ref<any[]>([])

onMounted(async () => {
  const query = getCurrentPages().pop()?.options || {}
  const circleId = query.circleId || query.id || ''
  try {
    const res: any = circleId ? await botApi.circleBots(circleId) : await botApi.list()
    bots.value = Array.isArray(res) ? res : res?.data || res?.list || []
  } catch {} finally { loading.value = false }
})

function goChat(bot: any) {
  uni.navigateTo({ url: `/pages/bots/bot-chat?id=${bot.id}` })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.list { display: flex; flex-direction: column; gap: 10px; }
.bot-card { display: flex; gap: 12px; background: #fff; border-radius: 12px; padding: 14px; align-items: center; }
.bot-avatar { width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0; background: #eee; }
.bot-info { flex: 1; }
.bot-name { font-size: 15px; font-weight: 500; display: block; }
.bot-desc { font-size: 12px; color: #999; margin-top: 4px; display: block; }
</style>
