<template>
  <view class="page">
    <view class="stats"><text class="s-label">已获得成就</text><text class="s-val">{{ unlocked }}/{{ total }}</text></view>
    <view class="grid">
      <view v-for="a in list" :key="a.id" class="ach-item" :class="{ locked: !a.unlocked }">
        <text class="ach-icon">{{ a.icon || '🏆' }}</text>
        <text class="ach-name">{{ a.name }}</text>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { userApi } from '../../api'
const list = ref<any[]>([])
const unlocked = computed(() => list.value.filter(a => a.unlocked).length)
const total = computed(() => list.value.length)
onMounted(async () => {
  try { const res: any = await (userApi as any).getAchievements?.(); list.value = Array.isArray(res) ? res : res?.data || res?.list || [] } catch {}
  if (!list.value.length) list.value = [
    { id: '1', icon: '📚', name: '初学者', unlocked: true },
    { id: '2', icon: '🎓', name: '学有所成', unlocked: true },
    { id: '3', icon: '✍️', name: '笔耕不辍', unlocked: false },
    { id: '4', icon: '🏅', name: '竞赛达人', unlocked: false },
  ]
})
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.stats { background: linear-gradient(135deg, #C41E3A, #C9A96E); border-radius: 12px; padding: 20px; text-align: center; color: #fff; margin-bottom: 12px; }
.s-label { font-size: 13px; opacity: 0.8; display: block; }
.s-val { font-size: 28px; font-weight: bold; display: block; margin-top: 4px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.ach-item { background: #fff; border-radius: 10px; padding: 16px 8px; text-align: center; }
.ach-item.locked { opacity: 0.4; }
.ach-icon { font-size: 28px; display: block; margin-bottom: 6px; }
.ach-name { font-size: 12px; display: block; }
</style>
