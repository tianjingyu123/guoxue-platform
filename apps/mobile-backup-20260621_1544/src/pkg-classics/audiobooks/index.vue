<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ClassicsHeader from '@/components/classics/classics-header.vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { classicsApi, fmtPlays, type AudioBookFull } from '@/lib/classics-data'

const items = ref<AudioBookFull[]>([])
const favorites = ref<string[]>([])

const feature = computed(() => items.value[0])
const rest = computed(() => items.value.slice(1))

onMounted(async () => {
  const res = await classicsApi.audiobooks()
  items.value = res.items
})

function toggleFavorite(id: string) {
  favorites.value = favorites.value.includes(id)
    ? favorites.value.filter((f) => f !== id)
    : [...favorites.value, id]
}

function goPlayer(id: string) {
  uni.navigateTo({ url: `/pkg-classics/audiobooks/player?id=${id}` })
}
</script>

<template>
  <view class="ab-page">
    <classics-header title="听书" />

    <view class="ab-main">
      <!-- Hero -->
      <view class="ab-hero">
        <text class="ab-hero-kicker">
          名家播讲
        </text>
        <text class="ab-hero-title">
          轻松听典籍
        </text>
      </view>

      <!-- 今日主打 - 大卡 -->
      <view class="ab-feature-sec">
        <view
          class="ab-feature"
          @tap="goPlayer(feature.id)"
        >
          <text class="ab-feature-tag">
            编辑主打
          </text>
          <view class="ab-feature-body">
            <FlatCover
              :title="feature.shortTitle"
              :cover-color="coverColorForBook(feature.shortTitle)"
              title-size="36rpx"
              class="ab-feature-cover"
            />
            <view class="ab-feature-info">
              <text class="ab-feature-name">
                {{ feature.title }}
              </text>
              <text class="ab-feature-desc">
                {{ feature.desc }}
              </text>
              <view class="ab-feature-meta">
                <view class="ab-meta-item">
                  <app-icon
                    name="clock"
                    :size="28"
                    color="rgba(255,255,255,0.7)"
                  />
                  <text>{{ feature.duration }}</text>
                </view>
                <view class="ab-meta-item">
                  <app-icon
                    name="headphones"
                    :size="28"
                    color="rgba(255,255,255,0.7)"
                  />
                  <text>{{ fmtPlays(feature.plays) }}</text>
                </view>
              </view>
              <view class="ab-feature-btn">
                <app-icon
                  name="play"
                  :size="32"
                  color="#6f4521"
                  :fill="true"
                />
                <text class="ab-feature-btn-txt">
                  立即收听
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 全部有声书 -->
      <view class="ab-list-sec">
        <text class="ab-list-title">
          全部有声书
        </text>
        <view class="ab-list">
          <view
            v-for="book in rest"
            :key="book.id"
            class="ab-row"
          >
            <view
              class="ab-row-main"
              @tap="goPlayer(book.id)"
            >
              <FlatCover
                :title="book.shortTitle"
                :cover-color="coverColorForBook(book.shortTitle)"
                title-size="24rpx"
                class="ab-row-cover"
              />
              <view class="ab-row-info">
                <text class="ab-row-title">
                  {{ book.title }}
                </text>
                <text class="ab-row-desc">
                  {{ book.desc }}
                </text>
                <view class="ab-row-meta">
                  <text class="ab-row-quality">
                    {{ book.quality }}
                  </text>
                  <view class="ab-meta-item">
                    <app-icon
                      name="clock"
                      :size="24"
                      color="#999999"
                    />
                    <text>{{ book.duration }}</text>
                  </view>
                  <view class="ab-meta-item">
                    <app-icon
                      name="headphones"
                      :size="24"
                      color="#999999"
                    />
                    <text>{{ fmtPlays(book.plays) }}</text>
                  </view>
                </view>
              </view>
            </view>
            <view class="ab-row-actions">
              <view
                class="ab-fav-btn"
                @tap="toggleFavorite(book.id)"
              >
                <app-icon
                  name="heart"
                  :size="40"
                  :color="favorites.includes(book.id) ? '#c41e3a' : '#cccccc'"
                  :fill="favorites.includes(book.id)"
                />
              </view>
              <view
                class="ab-play-btn"
                @tap="goPlayer(book.id)"
              >
                <app-icon
                  name="play"
                  :size="32"
                  color="#ffffff"
                  :fill="true"
                />
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ab-page {
  min-height: 100vh;
  background: var(--classics-bg);
  padding-bottom: 160rpx;
}
.ab-main {
  max-width: 100%;
}

/* Hero */
.ab-hero {
  padding: 16rpx 40rpx 32rpx;
}
.ab-hero-kicker {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  color: #c41e3a;
  margin-bottom: 12rpx;
}
.ab-hero-title {
  display: block;
  font-size: 68rpx;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -1rpx;
  color: var(--foreground);
}

/* 今日主打 大卡 */
.ab-feature-sec {
  padding: 0 40rpx 40rpx;
}
.ab-feature {
  position: relative;
  border-radius: 56rpx;
  overflow: hidden;
  padding: 48rpx;
  background: linear-gradient(150deg, #a06a38, #5f3a1a);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
  &:active { transform: scale(0.99); }
}
.ab-feature-tag {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
}
.ab-feature-body {
  margin-top: 32rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.ab-feature-cover {
  width: 184rpx;
  flex-shrink: 0;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.25);
}
.ab-feature-info {
  flex: 1;
  min-width: 0;
}
.ab-feature-name {
  display: block;
  color: #fff;
  font-weight: 700;
  font-size: 40rpx;
}
.ab-feature-desc {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 26rpx;
  margin-top: 8rpx;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ab-feature-meta {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}
.ab-meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
  white-space: nowrap;
}
.ab-feature-btn {
  margin-top: 24rpx;
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 40rpx;
  border-radius: 999rpx;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}
.ab-feature-btn-txt {
  color: #6f4521;
  font-size: 28rpx;
  font-weight: 600;
}

/* 全部有声书 */
.ab-list-sec {
  padding: 0 40rpx;
}
.ab-list-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  letter-spacing: -0.5rpx;
  color: var(--foreground);
  margin-bottom: 28rpx;
}
.ab-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.ab-row {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 32rpx;
  background: var(--card);
  border-radius: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.ab-row-main {
  display: flex;
  align-items: center;
  gap: 32rpx;
  flex: 1;
  min-width: 0;
  &:active { transform: scale(0.99); }
}
.ab-row-cover {
  width: 128rpx;
  flex-shrink: 0;
}
.ab-row-info {
  flex: 1;
  min-width: 0;
}
.ab-row-title {
  display: block;
  font-weight: 600;
  font-size: 30rpx;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ab-row-desc {
  display: block;
  font-size: 24rpx;
  color: var(--muted-foreground);
  margin-top: 8rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ab-row-meta {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 20rpx;
  font-size: 22rpx;
  color: var(--muted-foreground);
}
.ab-row-quality {
  flex-shrink: 0;
  white-space: nowrap;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  background: var(--muted);
}
.ab-row-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  flex-shrink: 0;
}
.ab-fav-btn {
  &:active { transform: scale(0.9); }
}
.ab-play-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  &:active { transform: scale(0.9); }
}
</style>
