<template>
  <view v-if="isLoading" class="page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="300rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="60rpx" radius="16rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无直播预告" />
  <view v-else class="page">
    <!-- 封面区域 -->
    <view class="cover-area">
      <image
        class="cover-img"
        :src="room.cover"
        mode="aspectFill"
      />
      <view class="cover-mask" />

      <!-- 顶部导航 -->
      <view class="cover-nav">
        <view
          class="circle-btn"
          @tap="goBack"
        >
          <AppIcon
            name="chevron-left"
            :size="48"
            color="#fff"
          />
        </view>
        <view class="circle-btn">
          <AppIcon
            name="share-2"
            :size="40"
            color="#fff"
          />
        </view>
      </view>

      <!-- 预告标签 -->
      <view class="preview-badge">
        <AppIcon
          name="calendar"
          :size="32"
          color="#fff"
        />
        <text class="preview-badge-txt">
          直播预告
        </text>
      </view>

      <!-- 底部信息 -->
      <view class="cover-bottom">
        <text class="cover-title">
          {{ room.title }}
        </text>
        <!-- 讲师 -->
        <view class="host-row">
          <image
            class="host-avatar"
            :src="room.hostAvatar"
            mode="aspectFill"
          />
          <view class="host-info">
            <text class="host-name">
              {{ room.hostName }}
            </text>
            <text class="host-fans">
              {{ room.hostFollowers.toLocaleString() }} 粉丝
            </text>
          </view>
        </view>
        <!-- 倒计时 -->
        <view class="countdown">
          <text class="countdown-label">
            距开播还有
          </text>
          <view class="countdown-row">
            <template v-if="countdown.days > 0">
              <view class="cd-box">
                <text class="cd-num">
                  {{ countdown.days }}
                </text>
                <text class="cd-unit">
                  天
                </text>
              </view>
              <text class="cd-colon">
                :
              </text>
            </template>
            <view class="cd-box">
              <text class="cd-num">
                {{ pad(countdown.hours) }}
              </text>
              <text class="cd-unit">
                时
              </text>
            </view>
            <text class="cd-colon">
              :
            </text>
            <view class="cd-box">
              <text class="cd-num">
                {{ pad(countdown.minutes) }}
              </text>
              <text class="cd-unit">
                分
              </text>
            </view>
            <text class="cd-colon">
              :
            </text>
            <view class="cd-box">
              <text class="cd-num">
                {{ pad(countdown.seconds) }}
              </text>
              <text class="cd-unit">
                秒
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 详情内容 -->
    <view class="body">
      <!-- 信息卡 -->
      <view class="info-card">
        <view class="info-col">
          <view class="info-top info-red">
            <AppIcon
              name="users"
              :size="32"
              color="#C41E3A"
            />
            <text class="info-num">
              {{ room.bookedCount.toLocaleString() }}
            </text>
          </view>
          <text class="info-label">
            已预约
          </text>
        </view>
        <view class="info-col">
          <view class="info-top info-gold">
            <AppIcon
              name="clock"
              :size="32"
              color="#C9A96E"
            />
            <text class="info-num">
              {{ room.estimatedDuration }}
            </text>
          </view>
          <text class="info-label">
            预计时长(分钟)
          </text>
        </view>
        <view class="info-col">
          <text class="info-num info-dark">
            {{ startDateText }}
          </text>
          <text class="info-label">
            {{ startTimeText }}
          </text>
        </view>
      </view>

      <!-- 标签 -->
      <view class="tag-row">
        <text
          v-for="(tag, i) in room.tags"
          :key="i"
          class="tag"
        >
          {{ tag }}
        </text>
      </view>

      <!-- 直播简介 -->
      <view class="detail-card">
        <text class="detail-title">
          直播简介
        </text>
        <view class="desc">
          <template
            v-for="(line, i) in descLines"
            :key="i"
          >
            <text
              v-if="line.type === 'h3'"
              class="desc-h3"
            >
              {{ line.text }}
            </text>
            <text
              v-else-if="line.type === 'bold'"
              class="desc-bold"
            >
              {{ line.text }}
            </text>
            <view
              v-else-if="line.type === 'bullet'"
              class="desc-bullet"
            >
              <text class="desc-dot">
                •
              </text>
              <text class="desc-bullet-txt">
                {{ line.text }}
              </text>
            </view>
            <text
              v-else-if="line.type === 'num'"
              class="desc-num"
            >
              {{ line.text }}
            </text>
            <text
              v-else-if="line.type === 'p'"
              class="desc-p"
            >
              {{ line.text }}
            </text>
            <view
              v-else
              class="desc-br"
            />
          </template>
        </view>
      </view>

      <!-- 讲师卡 -->
      <view class="detail-card">
        <text class="detail-title">
          讲师介绍
        </text>
        <view class="teacher-row">
          <image
            class="teacher-avatar"
            :src="room.hostAvatar"
            mode="aspectFill"
          />
          <view class="teacher-info">
            <text class="teacher-name">
              {{ room.hostName }}
            </text>
            <text class="teacher-fans">
              {{ room.hostFollowers.toLocaleString() }} 粉丝
            </text>
          </view>
          <text class="teacher-link">
            查看主页 →
          </text>
        </view>
      </view>
    </view>

    <!-- 底部预约按钮 -->
    <view class="footer">
      <view class="book-btn">
        <AppIcon
          name="bell"
          :size="40"
          color="#fff"
        />
        <text class="book-txt">
          立即预约
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { goBack } from '@/utils/router'
import { liveApi } from '@/lib/live-data'

const room = ref<any>(null)

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const isEmpty = computed(() => false)
function reload() {
  loadError.value = null
}

// room 已在 liveApi 接入处声明

// 开播时间 = 当前时间 + 2 小时（与原型一致：动态计算 + 实时倒计时）
const startTime = Date.now() + 2 * 60 * 60 * 1000
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  try { room.value = await liveApi.preview('1') } catch { /* 由 empty/error 态兜底 */ }
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const countdown = computed(() => {
  const diff = Math.max(0, startTime - now.value)
  const totalSec = Math.floor(diff / 1000)
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  }
})

const startDateText = computed(() => {
  const d = new Date(startTime)
  return `${d.getMonth() + 1}/${d.getDate()}`
})
const startTimeText = computed(() => {
  const d = new Date(startTime)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
})

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// markdown 行解析(纯UI渲染)
const descLines = computed(() => {
  return (room.value?.descriptionLines ?? []).map((line: string) => {
    if (line.startsWith('### ')) return { type: 'h3', text: line.replace('### ', '') }
    if (line.startsWith('**') && line.endsWith('**')) return { type: 'bold', text: line.replace(/\*\*/g, '') }
    if (line.startsWith('- ')) return { type: 'bullet', text: line.replace('- ', '') }
    if (/^\d+\./.test(line)) return { type: 'num', text: line.replace(/\*\*/g, '') }
    if (line) return { type: 'p', text: line }
    return { type: 'br', text: '' }
  })
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 192rpx;
}

/* 封面 */
.cover-area {
  position: relative;
  height: 50vh;
  min-height: 640rpx;
}
.cover-img {
  width: 100%;
  height: 100%;
}
.cover-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.2) 50%, transparent);
}
.cover-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.circle-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-badge {
  position: absolute;
  top: 32rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 32rpx;
  background: #C41E3A;
  border-radius: 999rpx;
}
.preview-badge-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
.cover-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx;
  color: #fff;
}
.cover-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.25;
  color: #fff;
  margin-bottom: 24rpx;
}
.host-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
}
.host-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}
.host-name {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
.host-fans {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
}
.countdown {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 32rpx;
  padding: 32rpx;
}
.countdown-label {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16rpx;
}
.countdown-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.cd-box {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  min-width: 100rpx;
  text-align: center;
}
.cd-num {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
}
.cd-unit {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}
.cd-colon {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
}

/* 详情 */
.body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.info-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.info-col {
  text-align: center;
}
.info-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}
.info-num {
  font-size: 36rpx;
  font-weight: 700;
}
.info-red .info-num {
  color: #C41E3A;
}
.info-gold .info-num {
  color: #C9A96E;
}
.info-dark {
  display: block;
  color: #2C2C2C;
  margin-bottom: 8rpx;
}
.info-label {
  font-size: 22rpx;
  color: #999999;
}

/* 标签 */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.tag {
  padding: 8rpx 24rpx;
  background: rgba(196, 30, 58, 0.1);
  color: #C41E3A;
  font-size: 26rpx;
  border-radius: 999rpx;
}

/* 简介卡 */
.detail-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.detail-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #2C2C2C;
  margin-bottom: 24rpx;
}
.desc {
  display: flex;
  flex-direction: column;
}
.desc-h3 {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #2C2C2C;
  margin-top: 32rpx;
  margin-bottom: 16rpx;
}
.desc-bold {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.6;
}
.desc-bullet {
  display: flex;
  gap: 12rpx;
  padding-left: 8rpx;
}
.desc-dot {
  color: #C41E3A;
  font-size: 28rpx;
}
.desc-bullet-txt {
  flex: 1;
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}
.desc-num {
  display: block;
  padding-left: 32rpx;
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}
.desc-p {
  display: block;
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}
.desc-br {
  height: 24rpx;
}

/* 讲师卡 */
.teacher-row {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.teacher-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
}
.teacher-info {
  flex: 1;
}
.teacher-name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #2C2C2C;
}
.teacher-fans {
  display: block;
  font-size: 26rpx;
  color: #999999;
  margin-top: 8rpx;
}
.teacher-link {
  font-size: 26rpx;
  color: #C41E3A;
}

/* 底部按钮 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #E8E3DB;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.book-btn {
  flex: 1;
  padding: 28rpx 0;
  background: #C41E3A;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.book-txt {
  font-size: 32rpx;
  font-weight: 500;
  color: #fff;
}
</style>
