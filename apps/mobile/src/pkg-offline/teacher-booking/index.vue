<script setup lang="ts">
/**
 * 预约到店（师资预约）—— 2026-07-14 接线新建
 *
 * 背景：驿站详情页的**主 CTA** 在该驿站没排线下课时是「预约到店」，
 *   跳 `/offline/teacher-booking?stationId=xxx` —— **这个页面根本不存在**，点了没反应。
 *   而后端整套是好的（POST /offline/stations/:id/teacher-bookings + 站长确认 PUT .../confirm），
 *   前端连封装 offlineApi.createBooking 都早就写好了，只差这一个页面。
 *
 * 预约成功后是「待站长确认」，不是即时成交 —— 文案如实说明，不让用户以为约上了就一定能去。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { offlineApi, type StationTeacherLite } from '@/lib/offline-data'

const stationId = ref('')
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

const teachers = ref<StationTeacherLite[]>([])
const teacherId = ref('')
const bookingDate = ref('')
const remark = ref('')

/** 只能约今天之后（含今天）——后端不挡，前端别让用户约到过去 */
const today = computed(() => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
})

const selected = computed(() => teachers.value.find((t) => t.id === teacherId.value) || null)
const canSubmit = computed(() => !!teacherId.value && !!bookingDate.value && !submitting.value)

onLoad((opt) => {
  stationId.value = String((opt as Record<string, string>)?.stationId || (opt as Record<string, string>)?.id || '')
})

async function load() {
  if (!stationId.value) {
    error.value = '缺少驿站参数，请从驿站详情页进入'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    teachers.value = await offlineApi.getStationTeachers(stationId.value)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function onDateChange(e: { detail: { value: string } }) {
  bookingDate.value = e.detail.value
}

async function submit() {
  if (!canSubmit.value) {
    if (!teacherId.value) uni.showToast({ title: '请选择讲师', icon: 'none' })
    else if (!bookingDate.value) uni.showToast({ title: '请选择到店日期', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await offlineApi.createBooking(stationId.value, {
      teacherId: teacherId.value,
      bookingDate: bookingDate.value,
      remark: remark.value.trim() || undefined,
    })
    uni.showModal({
      title: '预约已提交',
      content: '已通知驿站，待站长确认后生效。可在「我的-预约」中查看进度。',
      showCancel: false,
      confirmColor: '#C41E3A',
      success: () => goBack(),
    })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '预约失败，请稍后重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <view class="page">
    <view class="topbar">
      <view class="back" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
      <text class="topbar-title">预约到店</text>
    </view>

    <view v-if="loading" class="state">
      <view class="skel" /><view class="skel" />
    </view>
    <view v-else-if="error" class="state center">
      <text class="state-t">{{ error }}</text>
      <view class="retry" @tap="load"><text class="retry-t">重试</text></view>
    </view>
    <view v-else-if="!teachers.length" class="state center">
      <text class="state-t">该驿站还没有登记讲师，暂时无法预约</text>
    </view>

    <template v-else>
      <text class="group-label">选择讲师</text>
      <view class="group">
        <view
          v-for="t in teachers"
          :key="t.id"
          class="teacher"
          :class="{ on: teacherId === t.id }"
          @tap="teacherId = t.id"
        >
          <image v-if="t.avatar" class="avatar" :src="t.avatar" mode="aspectFill" />
          <view v-else class="avatar avatar-ph"><text class="avatar-t">{{ t.name.charAt(0) }}</text></view>
          <view class="tmain">
            <text class="tname">{{ t.name }}</text>
            <text v-if="t.specialties?.length" class="tspec">{{ t.specialties.join(' · ') }}</text>
          </view>
          <view class="radio" :class="{ on: teacherId === t.id }">
            <app-icon v-if="teacherId === t.id" name="check" :size="20" color="#fff" />
          </view>
        </view>
      </view>

      <text class="group-label">到店日期</text>
      <view class="group">
        <picker mode="date" :start="today" :value="bookingDate" @change="onDateChange">
          <view class="row">
            <text class="row-label">选择日期</text>
            <view class="row-right">
              <text class="row-value" :class="{ ph: !bookingDate }">{{ bookingDate || '请选择' }}</text>
              <app-icon name="chevron-right" :size="28" color="#c8c8cd" />
            </view>
          </view>
        </picker>
      </view>

      <text class="group-label">备注（选填）</text>
      <view class="group">
        <textarea
          v-model="remark"
          class="ta"
          placeholder="想咨询的方向、到店时段等"
          placeholder-class="ph"
          :maxlength="200"
        />
      </view>

      <view class="tip">
        <app-icon name="info" :size="24" color="#C9A96E" />
        <text class="tip-t">预约提交后需驿站站长确认才生效，确认结果会以消息通知你。</text>
      </view>

      <view class="savebar">
        <view class="btn" :class="{ disabled: !canSubmit }" @tap="submit">
          <text class="btn-t">{{ submitting ? '提交中…' : `预约${selected ? ' · ' + selected.name : ''}` }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: calc(176rpx + env(safe-area-inset-bottom)); }

.topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx; padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.back { display: flex; align-items: center; }
.topbar-title { font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); flex: 1; }

.state { padding: 32rpx; }
.state.center { padding: 160rpx 80rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.skel { height: 120rpx; border-radius: 28rpx; background: #fff; margin-bottom: 24rpx; }
.state-t { font-size: 28rpx; color: var(--text-tertiary, #999); text-align: center; line-height: 1.7; }
.retry { margin-top: 12rpx; padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.retry-t { font-size: 26rpx; color: #fff; }

.group-label { display: block; margin: 36rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999); }
.group {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 32rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}

.teacher { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 28rpx; }
.teacher + .teacher { border-top: 1rpx solid var(--separator, #ede7dd); }
.avatar { width: 84rpx; height: 84rpx; border-radius: 999rpx; flex-shrink: 0; }
.avatar-ph { background: var(--gold-soft, rgba(201,169,110,.16)); display: flex; align-items: center; justify-content: center; }
.avatar-t { font-size: 32rpx; color: #a98b52; font-weight: 600; }
.tmain { flex: 1; min-width: 0; }
.tname { display: block; font-size: 30rpx; color: var(--text-primary, #2c2c2c); font-weight: 500; }
.tspec { display: block; margin-top: 6rpx; font-size: 24rpx; color: var(--text-tertiary, #999); }
.radio {
  width: 40rpx; height: 40rpx; border-radius: 999rpx; flex-shrink: 0;
  border: 2rpx solid #d8d3ca; display: flex; align-items: center; justify-content: center;
}
.radio.on { background: var(--brand, #c41e3a); border-color: var(--brand, #c41e3a); }

.row { display: flex; align-items: center; padding: 28rpx 32rpx; }
.row-label { flex: 1; font-size: 30rpx; color: var(--text-primary, #2c2c2c); }
.row-right { display: flex; align-items: center; gap: 8rpx; }
.row-value { font-size: 28rpx; color: var(--text-secondary, #6e6e73); }
.row-value.ph { color: #b9b3aa; }

/* uni-app 坑：原生 textarea 必须给明确高度 */
.ta { width: 100%; box-sizing: border-box; height: 160rpx; padding: 24rpx 28rpx; font-size: 28rpx; color: var(--text-primary, #2c2c2c); }
.ph { color: #b9b3aa; }

.tip { margin: 28rpx 36rpx 0; display: flex; align-items: flex-start; gap: 12rpx; }
.tip-t { flex: 1; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.7; }

.savebar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 30;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.btn { height: 92rpx; border-radius: 46rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; justify-content: center; }
.btn.disabled { opacity: 0.5; }
.btn-t { font-size: 32rpx; font-weight: 600; color: #fff; letter-spacing: 2rpx; }
</style>
