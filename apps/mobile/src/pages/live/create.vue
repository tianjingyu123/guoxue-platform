<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="nav-bar">
      <view
        class="nav-left"
        @click="goBack"
      >
        <text class="nav-back">
          ‹
        </text>
      </view>
      <text class="nav-title">
        {{ editMode ? '编辑直播间' : '创建直播间' }}
      </text>
      <view class="nav-right">
        <text
          class="submit-btn"
          :class="{ disabled: submitting || !canSubmit }"
          @click="submit"
        >
          {{ submitting ? '创建中...' : editMode ? '保存' : '创建' }}
        </text>
      </view>
    </view>

    <!-- 表单内容 -->
    <scroll-view
      scroll-y
      class="form-scroll"
    >
      <!-- 封面 -->
      <view class="form-section">
        <view class="cover-row">
          <view
            v-if="cover"
            class="cover-preview-wrap"
            @click="chooseCover"
          >
            <image
              :src="cover"
              class="cover-preview"
              mode="aspectFill"
            />
            <view class="cover-overlay">
              <text class="cover-change">
                更换
              </text>
            </view>
          </view>
          <view
            v-else
            class="cover-upload"
            @click="chooseCover"
          >
            <text class="cover-upload-icon">
              📷
            </text>
            <text class="cover-upload-text">
              上传封面
            </text>
            <text class="cover-upload-hint">
              建议比例 16:9
            </text>
          </view>
        </view>
      </view>

      <!-- 表单 -->
      <view class="form-body">
        <!-- 标题 -->
        <view class="form-row">
          <text class="form-label">
            直播标题 <text class="required">
              *
            </text>
          </text>
          <input
            v-model="title"
            class="form-input"
            placeholder="输入直播标题，如：周易六十四卦精讲"
            maxlength="50"
          >
          <text class="char-count">
            {{ title.length }}/50
          </text>
        </view>

        <!-- 分类 -->
        <view
          class="form-row"
          @click="showCategoryPicker = true"
        >
          <text class="form-label">
            直播分类 <text class="required">
              *
            </text>
          </text>
          <view class="form-select">
            <text :class="{ placeholder: !selectedCategory }">
              {{ selectedCategory || '请选择分类' }}
            </text>
            <text class="select-arrow">
              ›
            </text>
          </view>
        </view>

        <!-- 开始时间 -->
        <view
          class="form-row"
          @click="showDatePicker = true"
        >
          <text class="form-label">
            开播时间 <text class="required">
              *
            </text>
          </text>
          <view class="form-select">
            <text :class="{ placeholder: !startTime }">
              {{ startTime ? formatPickerDate(startTime) : '请选择开播时间' }}
            </text>
            <text class="select-arrow">
              ›
            </text>
          </view>
        </view>

        <!-- 直播类型 -->
        <view class="form-row">
          <text class="form-label">
            直播类型
          </text>
          <view class="type-grid">
            <text
              v-for="t in liveTypes"
              :key="t.value"
              class="type-item"
              :class="{ active: liveType === t.value }"
              @click="liveType = t.value"
            >
              <text class="type-icon">
                {{ t.icon }}
              </text>
              <text class="type-name">
                {{ t.label }}
              </text>
            </text>
          </view>
        </view>

        <!-- 发布到圈子 -->
        <view class="form-row">
          <text class="form-label">
            同步到圈子
          </text>
          <view
            class="form-select"
            @click="showCirclePicker = true"
          >
            <text :class="{ placeholder: !selectedCircle }">
              {{ selectedCircle || '选择圈子（可选）' }}
            </text>
            <text class="select-arrow">
              ›
            </text>
          </view>
        </view>

        <!-- 简介 -->
        <view class="form-row">
          <text class="form-label">
            直播简介
          </text>
          <textarea
            v-model="description"
            class="form-textarea"
            placeholder="介绍一下直播内容..."
            maxlength="500"
          />
          <text class="char-count">
            {{ description.length }}/500
          </text>
        </view>

        <!-- 收费 -->
        <view class="form-row">
          <text class="form-label">
            收费设置
          </text>
          <view class="charge-row">
            <text
              v-for="ch in chargeOptions"
              :key="ch.value"
              class="charge-item"
              :class="{ active: chargeType === ch.value }"
              @click="chargeType = ch.value"
            >
              {{ ch.label }}
            </text>
          </view>
          <view
            v-if="chargeType === 'PAID'"
            class="price-row"
          >
            <text class="price-symbol">
              ¥
            </text>
            <input
              v-model.number="chargePrice"
              class="price-input"
              type="digit"
              placeholder="输入价格"
            >
          </view>
        </view>
      </view>

      <view class="bottom-safe" />
    </scroll-view>

    <!-- 分类选择弹窗 -->
    <view
      v-if="showCategoryPicker"
      class="picker-mask"
      @click="showCategoryPicker = false"
    >
      <view
        class="picker-panel"
        @click.stop
      >
        <view class="picker-header">
          <text class="picker-title">
            选择分类
          </text>
          <text
            class="picker-close"
            @click="showCategoryPicker = false"
          >
            ✕
          </text>
        </view>
        <scroll-view
          scroll-y
          class="picker-list"
        >
          <text
            v-for="cat in categories"
            :key="cat.id"
            class="picker-item"
            :class="{ active: categoryId === cat.id }"
            @click="selectCategory(cat)"
          >
            {{ cat.name }}
          </text>
        </scroll-view>
      </view>
    </view>

    <!-- 时间选择 -->
    <view
      v-if="showDatePicker"
      class="picker-mask"
      @click="showDatePicker = false"
    >
      <view
        class="picker-panel"
        @click.stop
      >
        <view class="picker-header">
          <text class="picker-title">
            选择开播时间
          </text>
          <text
            class="picker-close"
            @click="showDatePicker = false"
          >
            ✕
          </text>
        </view>
        <picker
          ref="datePickerRef"
          mode="date"
          :value="datePickerValue"
          :start="todayStr"
          style="display:none;"
          @change="onDateChange"
        />
        <picker
          ref="timePickerRef"
          mode="time"
          :value="timePickerValue"
          style="display:none;"
          @change="onTimeChange"
        />
        <view class="datetime-row">
          <text
            class="datetime-btn"
            @click="openDatePicker"
          >
            📅 {{ datePickerValue }}
          </text>
          <text
            class="datetime-btn"
            @click="openTimePicker"
          >
            🕐 {{ timePickerValue }}
          </text>
        </view>
        <view class="quick-times">
          <text
            v-for="qt in quickTimes"
            :key="qt.label"
            class="quick-time-item"
            @click="selectQuickTime(qt)"
          >
            {{ qt.label }}
          </text>
        </view>
        <view class="picker-confirm">
          <text
            class="confirm-btn"
            @click="confirmDateTime"
          >
            确定
          </text>
        </view>
      </view>
    </view>

    <!-- 圈子选择弹窗 -->
    <view
      v-if="showCirclePicker"
      class="picker-mask"
      @click="showCirclePicker = false"
    >
      <view
        class="picker-panel"
        @click.stop
      >
        <view class="picker-header">
          <text class="picker-title">
            选择圈子
          </text>
          <text
            class="picker-close"
            @click="showCirclePicker = false"
          >
            ✕
          </text>
        </view>
        <scroll-view
          scroll-y
          class="picker-list"
        >
          <text
            class="picker-item"
            :class="{ active: circleId === '' }"
            @click="circleId = ''; selectedCircle = '不限于圈子'; showCirclePicker = false"
          >
            不限于圈子
          </text>
          <text
            v-for="c in circleList"
            :key="c.id"
            class="picker-item"
            :class="{ active: circleId === (c.circle?.id || c.id) }"
            @click="selectCircle(c)"
          >
            {{ c.circle?.name || c.name }}
          </text>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { liveApi, circleApi, uploadApi } from '../../api'

const title = ref('')
const cover = ref('')
const description = ref('')
const circleId = ref('')
const selectedCircle = ref('')
const categoryId = ref('')
const selectedCategory = ref('')
const liveType = ref('knowledge')
const chargeType = ref('FREE')
const chargePrice = ref(0)
const submitting = ref(false)
const editMode = ref(false)
const roomId = ref('')

const showCategoryPicker = ref(false)
const showDatePicker = ref(false)
const showCirclePicker = ref(false)

const startTime = ref('')
const datePickerValue = ref('')
const timePickerValue = ref('12:00')

const categories = ref<{ id: string; name: string }[]>([])
const circleList = ref<any[]>([])

const liveTypes = [
  { value: 'knowledge', label: '知识授课', icon: '📚' },
  { value: 'ecommerce', label: '电商带货', icon: '🛍️' },
  { value: 'entertainment', label: '互动交流', icon: '🎙️' },
]

const chargeOptions = [
  { value: 'FREE', label: '免费' },
  { value: 'PAID', label: '付费' },
  { value: 'MEMBER', label: '会员免费' },
]

const quickTimes = [
  { label: '一小时后', offset: 1 },
  { label: '两小时后', offset: 2 },
  { label: '今天 20:00', custom: true, hour: 20, minute: 0 },
  { label: '明天 10:00', custom: true, tomorrow: true, hour: 10, minute: 0 },
  { label: '明天 20:00', custom: true, tomorrow: true, hour: 20, minute: 0 },
]

const todayStr = computed(() => {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
})

const canSubmit = computed(() => !!title.value.trim() && !!categoryId.value && !!startTime.value)

onMounted(() => {
  fetchCategories()
  fetchMyCircles()
  initDateTime()

  // 检查是否为编辑模式
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  if (opts.id) {
    editMode.value = true
    roomId.value = opts.id
    loadEditData(opts.id)
  }
})

function initDateTime() {
  const now = new Date()
  datePickerValue.value = todayStr.value
  timePickerValue.value =
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes() + 30).padStart(2, '0')
}

async function loadEditData(id: string) {
  try {
    const room = await liveApi.roomDetail(id)
    if (room) {
      title.value = room.title || ''
      cover.value = room.cover || ''
      description.value = room.description || ''
      if (room.startAt || room.startTime) {
        const d = new Date(room.startAt || room.startTime)
        datePickerValue.value = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0')
        timePickerValue.value =
          String(d.getHours()).padStart(2, '0') + ':' +
          String(d.getMinutes()).padStart(2, '0')
        startTime.value = room.startAt || room.startTime
      }
      if (room.categoryId) {
        categoryId.value = room.categoryId
        const cat = categories.value.find((c) => c.id === room.categoryId)
        if (cat) selectedCategory.value = cat.name
      }
      liveType.value = room.type || 'knowledge'
    }
  } catch {
    // 静默
  }
}

async function fetchCategories() {
  try {
    // 模拟分类数据，实际从 API 获取
    categories.value = [
      { id: '1', name: '易经国学' },
      { id: '2', name: '风水堪舆' },
      { id: '3', name: '命理八字' },
      { id: '4', name: '紫微斗数' },
      { id: '5', name: '面相手相' },
      { id: '6', name: '六爻占卜' },
      { id: '7', name: '奇门遁甲' },
      { id: '8', name: '中医养生' },
      { id: '9', name: '书法艺术' },
      { id: '10', name: '其他' },
    ]
  } catch {
    /* empty */
  }
}

async function fetchMyCircles() {
  try {
    const res = await circleApi.my()
    circleList.value = Array.isArray(res) ? res : []
  } catch {
    /* 静默 */
  }
}

function chooseCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const fp = res.tempFilePaths?.[0]
      if (!fp) return
      try {
        const uploadRes: any = await uploadApi.image(fp)
        const url = uploadRes?.data?.url || uploadRes?.url || ''
        if (url) cover.value = url
        else uni.showToast({ title: '上传失败', icon: 'none' })
      } catch {
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    },
  })
}

function selectCategory(cat: { id: string; name: string }) {
  categoryId.value = cat.id
  selectedCategory.value = cat.name
  showCategoryPicker.value = false
}

function selectCircle(c: any) {
  circleId.value = c.circle?.id || c.id
  selectedCircle.value = c.circle?.name || c.name
  showCirclePicker.value = false
}

function onDateChange(e: any) {
  datePickerValue.value = e.detail.value
}

function onTimeChange(e: any) {
  timePickerValue.value = e.detail.value
}

function openDatePicker() {
  // uni-app picker 需通过它的绑定触发，这里用 uni.showModal 模拟
  uni.showToast({ title: '请点击日期输入框', icon: 'none' })
}

function openTimePicker() {
  uni.showToast({ title: '请点击时间输入框', icon: 'none' })
}

function selectQuickTime(qt: any) {
  const now = new Date()
  if (qt.offset) {
    now.setHours(now.getHours() + qt.offset)
  } else if (qt.tomorrow) {
    now.setDate(now.getDate() + 1)
    now.setHours(qt.hour, qt.minute, 0, 0)
  } else {
    now.setHours(qt.hour, qt.minute, 0, 0)
  }
  datePickerValue.value =
    now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0')
  timePickerValue.value =
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0')
  confirmDateTime()
}

function confirmDateTime() {
  startTime.value = datePickerValue.value + 'T' + timePickerValue.value + ':00'
  showDatePicker.value = false
}

function formatPickerDate(t: string): string {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000)
  const time =
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0')
  if (diffDays === 0) return '今天 ' + time
  if (diffDays === 1) return '明天 ' + time
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + time
}

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    const data: Record<string, any> = {
      title: title.value.trim(),
      type: liveType.value,
      categoryId: categoryId.value,
      startTime: startTime.value,
    }
    if (cover.value) data.cover = cover.value
    if (description.value.trim()) data.description = description.value.trim()
    if (circleId.value) data.circleId = circleId.value
    if (chargeType.value !== 'FREE') {
      data.chargeType = chargeType.value
      if (chargeType.value === 'PAID' && chargePrice.value > 0) {
        data.chargePrice = chargePrice.value
      }
    }

    if (editMode.value && roomId.value) {
      await liveApi.updateRoom(roomId.value, data)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      const res = await liveApi.createRoom(data)
      uni.showToast({ title: '直播间创建成功', icon: 'success' })
      // 创建成功后跳转到推流配置
      const newId = res?.id || res?.roomId || ''
      if (newId) {
        setTimeout(() => {
          uni.redirectTo({
            url: `/pages/live/stream-config?roomId=${newId}`,
          })
        }, 800)
        return
      }
    }

    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
}

/* ===== 导航栏 ===== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  padding-top: calc(20rpx + env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1rpx solid #E8E0D5;
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-left {
  width: 88rpx;
}
.nav-back {
  font-size: 56rpx;
  color: #333;
  line-height: 1;
  font-weight: 300;
}
.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #2C2C2C;
}
.nav-right {
  display: flex;
  gap: 12rpx;
  align-items: center;
}
.submit-btn {
  font-size: 26rpx;
  color: #fff;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  padding: 12rpx 32rpx;
  border-radius: 28rpx;
  font-weight: 500;
  box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.2);
}
.submit-btn.disabled {
  opacity: 0.4;
  box-shadow: none;
}

/* ===== 封面 ===== */
.form-section {
  margin: 24rpx;
}
.cover-row {
  display: flex;
  justify-content: center;
}
.cover-preview-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 16rpx;
  overflow: hidden;
  background: #ddd;
}
.cover-preview {
  width: 100%;
  height: 100%;
}
.cover-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.4);
  padding: 12rpx;
  text-align: center;
}
.cover-change {
  font-size: 24rpx;
  color: #fff;
}
.cover-upload {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 16rpx;
  border: 2rpx dashed #C9A96E;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.cover-upload-icon {
  font-size: 64rpx;
}
.cover-upload-text {
  font-size: 28rpx;
  color: #C41E3A;
  font-weight: 500;
}
.cover-upload-hint {
  font-size: 22rpx;
  color: #ccc;
}

/* ===== 表单 ===== */
.form-body {
  margin: 0 24rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.form-row {
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #F5F0E8;
  position: relative;
}
.form-row:last-child {
  border-bottom: none;
}
.form-label {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 12rpx;
  display: block;
}
.required {
  color: #C41E3A;
}
.form-input {
  width: 100%;
  height: 60rpx;
  border: 1rpx solid #E8E0D5;
  border-radius: 10rpx;
  padding: 0 16rpx;
  font-size: 28rpx;
  color: #2C2C2C;
  box-sizing: border-box;
}
.form-textarea {
  width: 100%;
  min-height: 140rpx;
  border: 1rpx solid #E8E0D5;
  border-radius: 10rpx;
  padding: 16rpx;
  font-size: 28rpx;
  color: #2C2C2C;
  box-sizing: border-box;
}
.char-count {
  position: absolute;
  bottom: 12rpx;
  right: 28rpx;
  font-size: 22rpx;
  color: #ccc;
}

/* ===== 选择器 ===== */
.form-select {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  border: 1rpx solid #E8E0D5;
  border-radius: 10rpx;
  font-size: 28rpx;
  color: #2C2C2C;
}
.form-select .placeholder {
  color: #ccc;
}
.select-arrow {
  font-size: 36rpx;
  color: #ccc;
  font-weight: 300;
}

/* ===== 类型选择 ===== */
.type-grid {
  display: flex;
  gap: 16rpx;
}
.type-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 0;
  border-radius: 12rpx;
  border: 1rpx solid #E8E0D5;
  background: #FAFAF5;
}
.type-item.active {
  border-color: #C41E3A;
  background: #fef0f0;
  box-shadow: 0 0 0 1rpx rgba(196, 30, 58, 0.2);
}
.type-icon {
  font-size: 40rpx;
}
.type-name {
  font-size: 22rpx;
  color: #666;
}

/* ===== 收费选择 ===== */
.charge-row {
  display: flex;
  gap: 12rpx;
}
.charge-item {
  padding: 12rpx 28rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #666;
  border: 1rpx solid #E8E0D5;
  background: #FAFAF5;
}
.charge-item.active {
  color: #fff;
  background: #C41E3A;
  border-color: #C41E3A;
}
.price-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
}
.price-symbol {
  font-size: 32rpx;
  color: #C41E3A;
  font-weight: bold;
}
.price-input {
  flex: 1;
  height: 60rpx;
  border: 1rpx solid #E8E0D5;
  border-radius: 10rpx;
  padding: 0 16rpx;
  font-size: 28rpx;
  color: #2C2C2C;
}

/* ===== 弹窗 ===== */
.picker-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.picker-panel {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #F5F0E8;
}
.picker-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #2C2C2C;
}
.picker-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}
.picker-list {
  padding: 16rpx 0;
  max-height: 60vh;
}
.picker-item {
  display: block;
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #2C2C2C;
  border-bottom: 1rpx solid #F5F0E8;
}
.picker-item.active {
  color: #C41E3A;
  font-weight: bold;
  background: #fef0f0;
}
.picker-item:last-child {
  border-bottom: none;
}

/* ===== 时间选择 ===== */
.datetime-row {
  display: flex;
  justify-content: center;
  gap: 32rpx;
  padding: 32rpx;
}
.datetime-btn {
  font-size: 28rpx;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #F5F0E8;
  color: #2C2C2C;
}
.quick-times {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 0 32rpx 24rpx;
}
.quick-time-item {
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #C41E3A;
  background: #fef0f0;
}
.picker-confirm {
  padding: 16rpx 32rpx 40rpx;
}
.confirm-btn {
  display: block;
  text-align: center;
  padding: 20rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: bold;
}

.bottom-safe {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
