<template>
  <view class="page">
    <view class="preview-card">
      <image :src="room.cover || ''" class="cover" mode="aspectFill" />
      <text class="title">{{ room.title }}</text>
      <text class="time">{{ room.startTime?.slice(0, 16) }}</text>
      <text class="anchor">主播：{{ room.anchorName }}</text>
      <text class="book-count">{{ room.bookCount || 0 }}人已预约</text>
      <button class="btn-book" :class="{ booked }" @click="toggleBook">{{ booked ? '已预约' : '预约直播' }}</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { liveRoomApi } from '../../api'
const room = ref<any>({})
const booked = ref(false)
onMounted(async () => {
  const id = (getCurrentPages().pop()?.options || {}).id || ''
  try { room.value = await liveRoomApi.getPlayUrl(id) || {} } catch {}
})
async function toggleBook() {
  try {
    if (booked.value) { await liveRoomApi.unbook(room.value.id); booked.value = false }
    else { await liveRoomApi.book(room.value.id); booked.value = true; uni.showToast({ title: '预约成功', icon: 'success' }) }
  } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 16px; }
.preview-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; }
.cover { width: 100%; height: 200px; border-radius: 10px; }
.title { font-size: 18px; font-weight: bold; display: block; margin-top: 12px; }
.time { font-size: 14px; color: #C41E3A; display: block; margin-top: 6px; }
.anchor { font-size: 13px; color: #666; display: block; margin-top: 4px; }
.book-count { font-size: 12px; color: #999; margin-top: 8px; display: block; }
.btn-book { width: 200px; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 16px; border: none; margin: 16px auto 0; text-align: center; line-height: 44px; }
.btn-book.booked { background: #ccc; }
</style>
