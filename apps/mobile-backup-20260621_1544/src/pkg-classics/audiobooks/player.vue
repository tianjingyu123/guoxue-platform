<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { classicsApi, type AudioBookDetail } from '@/lib/classics-data'

const bookId = ref('default')
const book = ref<AudioBookDetail>({
  title: '', author: '', narrator: '', dynasty: '', chapters: [],
})

const isPlaying = ref(false)
const progress = ref(0)
const currentChapter = ref(0)
const speed = ref(1)
const liked = ref(false)
const showChapters = ref(false)

const chapter = computed(() => {
  if (!book.value) return { title: '', duration: '' }
  return book.value.chapters[currentChapter.value]
})

const curMin = computed(() => Math.floor((progress.value / 100) * 8))
const curSec = computed(() =>
  String(Math.floor(((progress.value / 100) * 495) % 60)).padStart(2, '0'),
)

let timer: ReturnType<typeof setInterval> | null = null
watch(isPlaying, (playing) => {
  if (timer) { clearInterval(timer); timer = null }
  if (playing) {
    timer = setInterval(() => {
      progress.value = progress.value >= 100 ? 0 : progress.value + 0.4
    }, 200)
  }
})
onUnmounted(() => { if (timer) clearInterval(timer) })

onLoad(async (q) => {
  if (q && q.id) bookId.value = q.id
  const res = await classicsApi.audiobookDetail(bookId.value)
  book.value = res.detail
})

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/index/index' })
}
function togglePlay() {
  isPlaying.value = !isPlaying.value
}
function changeSpeed() {
  speed.value = speed.value >= 2 ? 0.5 : speed.value + 0.5
}
function playChapter(index: number) {
  currentChapter.value = index
  progress.value = 0
  isPlaying.value = true
  showChapters.value = false
}
function prevChapter() {
  playChapter(Math.max(0, currentChapter.value - 1))
}
function nextChapter() {
  playChapter(Math.min(book.value.chapters.length - 1, currentChapter.value + 1))
}
</script>

<template>
  <view class="ap-page">
    <!-- 顶部栏 -->
    <view class="ap-header">
      <view class="ap-statusbar" />
      <view class="ap-header-inner">
        <view
          class="ap-circle-btn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#2c2c2c"
          />
        </view>
        <text class="ap-header-title">
          听书
        </text>
        <view class="ap-circle-btn">
          <app-icon
            name="share-2"
            :size="40"
            color="#2c2c2c"
          />
        </view>
      </view>
    </view>

    <view class="ap-main">
      <!-- 旋转唱片封面 -->
      <view
        class="ap-disc"
        :class="{ 'ap-disc--spin': isPlaying }"
      >
        <view class="ap-disc-ring ap-disc-ring1" />
        <view class="ap-disc-ring ap-disc-ring2" />
        <view class="ap-disc-book">
          <view class="ap-disc-spine" />
          <view class="ap-disc-title">
            <text
              v-for="(ch, i) in book.title.split('')"
              :key="i"
              class="ap-disc-char"
            >
              {{ ch }}
            </text>
          </view>
        </view>
      </view>

      <!-- 书名 + 朗读者 -->
      <view class="ap-titlebox">
        <text class="ap-title">
          {{ book.title }}
        </text>
        <text class="ap-sub">
          {{ book.dynasty }} · {{ book.author }} 著 · {{ book.narrator }} 朗读
        </text>
        <text class="ap-chapter">
          {{ chapter.title }}
        </text>
      </view>

      <!-- 进度条 -->
      <view class="ap-progress">
        <view class="ap-progress-track">
          <view
            class="ap-progress-fill"
            :style="{ width: progress + '%' }"
          />
        </view>
        <view class="ap-progress-time">
          <text>{{ curMin }}:{{ curSec }}</text>
          <text>{{ chapter.duration }}</text>
        </view>
      </view>

      <!-- 播放控制 -->
      <view class="ap-controls">
        <view
          class="ap-speed"
          @tap="changeSpeed"
        >
          {{ speed }}x
        </view>
        <view
          class="ap-ctrl-icon"
          @tap="prevChapter"
        >
          <app-icon
            name="skip-back"
            :size="56"
            color="#2c2c2c"
          />
        </view>
        <view
          class="ap-play"
          @tap="togglePlay"
        >
          <app-icon
            :name="isPlaying ? 'pause' : 'play'"
            :size="56"
            color="#ffffff"
            :fill="isPlaying"
          />
        </view>
        <view
          class="ap-ctrl-icon"
          @tap="nextChapter"
        >
          <app-icon
            name="skip-forward"
            :size="56"
            color="#2c2c2c"
          />
        </view>
        <view
          class="ap-like"
          @tap="liked = !liked"
        >
          <app-icon
            name="heart"
            :size="48"
            :color="liked ? '#ef4444' : '#2c2c2c'"
            :fill="liked"
          />
        </view>
      </view>

      <!-- 底部操作 -->
      <view class="ap-actions">
        <view
          class="ap-action"
          @tap="showChapters = true"
        >
          <app-icon
            name="list"
            :size="40"
            color="#999999"
          />
          <text class="ap-action-txt">
            目录
          </text>
        </view>
        <view class="ap-action">
          <app-icon
            name="repeat"
            :size="40"
            color="#999999"
          />
          <text class="ap-action-txt">
            循环
          </text>
        </view>
        <view class="ap-action">
          <app-icon
            name="moon"
            :size="40"
            color="#999999"
          />
          <text class="ap-action-txt">
            定时
          </text>
        </view>
      </view>
    </view>

    <!-- 章节目录抽屉 -->
    <view
      v-if="showChapters"
      class="ap-mask"
      @tap="showChapters = false"
    >
      <view
        class="ap-sheet"
        @tap.stop
      >
        <view class="ap-sheet-head">
          <text class="ap-sheet-title">
            目录 · 共{{ book.chapters.length }}章
          </text>
          <text
            class="ap-sheet-close"
            @tap="showChapters = false"
          >
            关闭
          </text>
        </view>
        <scroll-view
          scroll-y
          class="ap-sheet-list"
        >
          <view
            v-for="(ch, index) in book.chapters"
            :key="ch.id"
            class="ap-sheet-item"
            :class="{ 'ap-sheet-item--on': index === currentChapter }"
            @tap="playChapter(index)"
          >
            <text
              class="ap-sheet-item-title"
              :class="{ 'ap-sheet-item-title--on': index === currentChapter }"
            >
              {{ ch.title }}
            </text>
            <text class="ap-sheet-item-dur">
              {{ ch.duration }}
            </text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ap-page {
  min-height: 100vh;
  background: var(--background);
  display: flex;
  flex-direction: column;
}

/* 顶部栏 */
.ap-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: linear-gradient(to bottom, #f5f0e6, #faf8f5);
}
.ap-statusbar {
  height: var(--status-bar-height, 0px);
}
.ap-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.ap-circle-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: color-mix(in srgb, var(--card) 80%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  &:active { transform: scale(0.92); }
}
.ap-header-title {
  font-family: var(--font-serif);
  font-size: 32rpx;
  font-weight: 700;
  color: #78350f;
}

.ap-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 48rpx 0;
}

/* 旋转唱片 */
.ap-disc {
  position: relative;
  width: 448rpx;
  height: 448rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #2a2118, #4a3a28);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 30rpx rgba(80, 60, 30, 0.3);
}
@keyframes ap-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.ap-disc--spin {
  animation: ap-rotate 8s linear infinite;
}
.ap-disc-ring {
  position: absolute;
  border-radius: 50%;
  border: 1rpx solid rgba(255, 251, 235, 0.1);
}
.ap-disc-ring1 { inset: 32rpx; }
.ap-disc-ring2 { inset: 64rpx; }
.ap-disc-book {
  position: relative;
  width: 192rpx;
  height: 256rpx;
  border-radius: 6rpx;
  background: linear-gradient(135deg, #f7f3e8, #ebe3d0);
  border: 1rpx solid rgba(208, 192, 160, 0.5);
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ap-disc-spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 16rpx;
  background: #d4c4a8;
}
.ap-disc-title {
  writing-mode: vertical-rl;
  display: flex;
}
.ap-disc-char {
  font-family: var(--font-serif);
  font-size: 32rpx;
  font-weight: 700;
  color: #3d3225;
}

/* 书名 */
.ap-titlebox {
  text-align: center;
  margin-top: 64rpx;
}
.ap-title {
  display: block;
  font-family: var(--font-serif);
  font-size: 48rpx;
  font-weight: 700;
  color: #78350f;
}
.ap-sub {
  display: block;
  font-size: 28rpx;
  color: var(--muted-foreground);
  margin-top: 8rpx;
}
.ap-chapter {
  display: block;
  font-size: 28rpx;
  color: color-mix(in srgb, var(--foreground) 80%, transparent);
  margin-top: 24rpx;
  font-weight: 500;
}

/* 进度条 */
.ap-progress {
  width: 100%;
  max-width: 896rpx;
  margin-top: 64rpx;
}
.ap-progress-track {
  height: 12rpx;
  background: #e5ddd0;
  border-radius: 999rpx;
  overflow: hidden;
}
.ap-progress-fill {
  height: 100%;
  background: #d97706;
  border-radius: 999rpx;
  transition: width 0.2s linear;
}
.ap-progress-time {
  display: flex;
  justify-content: space-between;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* 播放控制 */
.ap-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
  margin-top: 64rpx;
}
.ap-speed {
  width: 96rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
  color: #92400e;
}
.ap-ctrl-icon {
  &:active { transform: scale(0.9); }
}
.ap-play {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(217, 119, 6, 0.3);
  &:active { transform: scale(0.95); }
}
.ap-like {
  width: 96rpx;
  display: flex;
  justify-content: center;
}

/* 底部操作 */
.ap-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 64rpx;
  margin-top: 64rpx;
  margin-bottom: 32rpx;
}
.ap-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  color: var(--muted-foreground);
}
.ap-action-txt {
  font-size: 22rpx;
  color: var(--muted-foreground);
}

/* 章节抽屉 */
.ap-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
}
.ap-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 70vh;
  background: var(--card);
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
}
.ap-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid var(--border);
}
.ap-sheet-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--foreground);
}
.ap-sheet-close {
  font-size: 28rpx;
  color: var(--muted-foreground);
}
.ap-sheet-list {
  max-height: calc(70vh - 100rpx);
  padding: 16rpx;
}
.ap-sheet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-radius: 16rpx;
}
.ap-sheet-item--on {
  background: #fffbeb;
}
.ap-sheet-item-title {
  font-size: 28rpx;
  color: var(--foreground);
}
.ap-sheet-item-title--on {
  color: #b45309;
  font-weight: 500;
}
.ap-sheet-item-dur {
  font-size: 24rpx;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
</style>
