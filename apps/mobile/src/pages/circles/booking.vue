<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="section">
        <text class="section-title">选择时间</text>
        <view class="time-slots">
          <view v-for="(slot, i) in timeSlots" :key="i" class="slot-item" :class="{ active: selectedSlot === i }" @click="selectedSlot = i">
            <text class="slot-date">{{ slot.date }}</text>
            <text class="slot-time">{{ slot.time }}</text>
          </view>
        </view>
      </view>
      <view class="section">
        <text class="section-title">预约主题</text>
        <input v-model="topic" class="input" placeholder="请输入预约主题" />
      </view>
      <button class="btn-submit" @click="submitBooking">提交预约</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'

const loading = ref(false)
const selectedSlot = ref(-1)
const topic = ref('')
const timeSlots = ref([
  { date: '明天', time: '09:00-10:00' },
  { date: '明天', time: '14:00-15:00' },
  { date: '后天', time: '09:00-10:00' },
  { date: '后天', time: '14:00-15:00' },
])

function submitBooking() {
  if (selectedSlot.value < 0) { uni.showToast({ title: '请选择时间', icon: 'none' }); return }
  uni.showToast({ title: '预约已提交', icon: 'success' })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.section-title { font-size: 15px; font-weight: 500; margin-bottom: 10px; display: block; }
.time-slots { display: flex; flex-wrap: wrap; gap: 8px; }
.slot-item { padding: 10px 16px; background: #F5F0E8; border-radius: 10px; text-align: center; border: 2px solid transparent; }
.slot-item.active { border-color: #C41E3A; background: #FFF0F0; }
.slot-date { font-size: 14px; font-weight: 500; display: block; }
.slot-time { font-size: 12px; color: #999; display: block; }
.input { border: 1px solid #ddd; border-radius: 10px; padding: 10px 14px; font-size: 14px; background: #F5F0E8; }
.btn-submit { width: 100%; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; margin-top: 20px; text-align: center; line-height: 44px; }
</style>
