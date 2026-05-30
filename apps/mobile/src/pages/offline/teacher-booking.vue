<template>
  <view class="page">
    <view class="section">
      <text class="title">预约老师</text>
      <view class="teachers">
        <view v-for="t in teachers" :key="t.id" class="teacher-card" :class="{ selected: t.id === selectedTeacher }" @click="selectedTeacher = t.id">
          <image :src="t.avatar || ''" class="t-avatar" mode="aspectFill" />
          <text class="t-name">{{ t.name }}</text>
          <text class="t-spec">{{ t.specialty || '' }}</text>
        </view>
      </view>
    </view>
    <view class="section">
      <text class="section-title">选择时间</text>
      <view class="slots">
        <view v-for="s in slots" :key="s.time" class="slot" :class="{ active: s.time === selectedSlot, disabled: !s.available }" @click="s.available && (selectedSlot = s.time)">
          <text>{{ s.time }}</text>
        </view>
      </view>
    </view>
    <view class="section">
      <textarea v-model="note" placeholder="备注（可选）" class="textarea" />
    </view>
    <button class="btn-book" @click="submit">确认预约</button>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { offlineApi } from '../../api'
const teachers = ref<any[]>([]); const slots = ref<any[]>([])
const selectedTeacher = ref(''); const selectedSlot = ref(''); const note = ref('')
onMounted(async () => {
  try {
    const res: any = await offlineApi.getBookingOptions()
    teachers.value = res?.teachers || []
    slots.value = res?.slots || [{ time: '09:00', available: true }, { time: '10:00', available: true }, { time: '14:00', available: true }, { time: '15:00', available: false }]
  } catch {}
})
async function submit() {
  if (!selectedTeacher.value || !selectedSlot.value) { uni.showToast({ title: '请选择老师和时间', icon: 'none' }); return }
  try { await offlineApi.createBooking({ teacherId: selectedTeacher.value, time: selectedSlot.value, note: note.value }); uni.showToast({ title: '预约成功' }); setTimeout(() => uni.navigateBack(), 1500) } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.title, .section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 12px; }
.teachers { display: flex; gap: 12px; overflow-x: auto; }
.teacher-card { text-align: center; padding: 10px; border: 1px solid #eee; border-radius: 10px; min-width: 80px; }
.teacher-card.selected { border-color: #C41E3A; background: #FFF8F8; }
.t-avatar { width: 44px; height: 44px; border-radius: 50%; margin-bottom: 4px; }
.t-name { font-size: 12px; display: block; }
.t-spec { font-size: 10px; color: #999; display: block; }
.slots { display: flex; flex-wrap: wrap; gap: 8px; }
.slot { padding: 8px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 13px; }
.slot.active { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.slot.disabled { opacity: 0.4; }
.textarea { border: 1px solid #ddd; border-radius: 8px; padding: 10px; font-size: 14px; height: 60px; width: 100%; box-sizing: border-box; }
.btn-book { width: calc(100% - 24px); margin: 0 12px; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 14px; font-size: 15px; }
</style>
