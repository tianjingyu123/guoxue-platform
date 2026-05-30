<template>
  <view class="page">
    <view class="header">
      <text class="title">选择你感兴趣的领域</text>
      <text class="subtitle">选3-8个，为您定制专属内容</text>
    </view>
    <view class="tag-grid">
      <view
        v-for="tag in tags" :key="tag.id"
        class="tag-item" :class="{ active: selected.includes(tag.id) }"
        @click="toggle(tag.id)"
      >
        <text class="tag-icon">{{ tag.icon }}</text>
        <text class="tag-name">{{ tag.name }}</text>
        <text v-if="selected.includes(tag.id)" class="tag-check">✓</text>
      </view>
    </view>
    <view class="footer">
      <button class="btn-start" :disabled="selected.length < 3" @click="submit">
        开始探索（{{ selected.length }}/8）
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { recommendApi } from '../../api'

const selected = ref<string[]>([])
const tags = ref<any[]>([])

const defaultTags = [
  { id: 'classic', name: '经典', icon: '📜' },
  { id: 'poetry', name: '诗词', icon: '🌸' },
  { id: 'mingli', name: '命理', icon: '🔮' },
  { id: 'fengshui', name: '风水', icon: '🧭' },
  { id: 'yangsheng', name: '养生', icon: '🧘' },
  { id: 'wushu', name: '武术', icon: '🥋' },
  { id: 'chadao', name: '茶道', icon: '🍵' },
  { id: 'shufa', name: '书法', icon: '🖌️' },
  { id: 'guohua', name: '国画', icon: '🎨' },
  { id: 'yinyue', name: '音乐', icon: '🎵' },
  { id: 'lishi', name: '历史', icon: '📖' },
  { id: 'zhongyi', name: '中医', icon: '💊' },
  { id: 'yijing', name: '易经', icon: '☯️' },
  { id: 'daojiao', name: '道教', icon: '🏯' },
  { id: 'fojiao', name: '佛教', icon: '🛕' },
  { id: 'rujia', name: '儒家', icon: '🎓' },
  { id: 'qigong', name: '气功', icon: '🌀' },
  { id: 'taiyi', name: '太乙', icon: '⭐' },
  { id: 'qimen', name: '奇门', icon: '🚪' },
  { id: 'liuyao', name: '六爻', icon: '🪙' },
]

onMounted(async () => {
  try {
    const res: any = await recommendApi.defaultInterests()
    if (res?.length) tags.value = res
  } catch { tags.value = defaultTags }
})

function toggle(id: string) {
  const idx = selected.value.indexOf(id)
  if (idx >= 0) { selected.value.splice(idx, 1) }
  else if (selected.value.length < 8) { selected.value.push(id) }
}

async function submit() {
  if (selected.value.length < 3) return
  try {
    await recommendApi.setInterests(selected.value)
  } catch {}
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style>
.page { min-height: 100vh; background: linear-gradient(180deg, #C41E3A 0%, #F5F0E8 30%); padding-bottom: 100px; }
.header { text-align: center; padding: 40px 20px 20px; }
.title { font-size: 24px; font-weight: bold; color: #fff; display: block; }
.subtitle { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 8px; display: block; }
.tag-grid { display: flex; flex-wrap: wrap; padding: 16px; gap: 12px; justify-content: center; }
.tag-item {
  width: calc(25% - 9px); aspect-ratio: 1;
  background: #fff; border-radius: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.tag-item.active { border: 2px solid #C41E3A; }
.tag-icon { font-size: 28px; }
.tag-name { font-size: 12px; color: #666; margin-top: 4px; }
.tag-check {
  position: absolute; top: 4px; right: 6px;
  width: 18px; height: 18px; background: #C41E3A; border-radius: 50%;
  color: #fff; font-size: 11px; text-align: center; line-height: 18px;
}
.footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 20px 30px; background: linear-gradient(transparent, #F5F0E8 40%); }
.btn-start {
  width: 100%; height: 48px; border-radius: 24px; background: #C41E3A; color: #fff;
  font-size: 16px; font-weight: bold; border: none; text-align: center; line-height: 48px;
}
.btn-start[disabled] { background: #ccc; color: #999; }
</style>
