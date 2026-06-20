<template>
  <view class="sc-card">
    <view class="sc-row">
      <!-- 封面占位 -->
      <view class="sc-cover">
        <app-icon
          :name="schedule.type === 'knowledge' ? 'book-open' : 'shopping-bag'"
          :size="24"
          color="rgba(196,30,58,0.5)"
        />
        <text
          v-if="schedule.seriesName"
          class="sc-series-tag"
        >
          {{ schedule.seriesIndex }}/{{ schedule.seriesTotal }}
        </text>
      </view>

      <!-- 内容 -->
      <view class="sc-content">
        <view class="sc-head">
          <view class="sc-title-wrap">
            <text class="sc-title">
              {{ schedule.title }}
            </text>
            <text
              v-if="schedule.seriesName"
              class="sc-series-name"
            >
              {{ schedule.seriesName }}
            </text>
          </view>
          <view
            class="sc-badge"
            :style="badgeStyle"
          >
            {{ statusLabel }}
          </view>
        </view>
        <view class="sc-meta">
          <view
            v-if="showDate"
            class="sc-meta-item"
          >
            <app-icon
              name="calendar"
              :size="12"
              color="#999"
            />
            <text class="sc-meta-text">
              {{ formatDate(schedule.date) }}
            </text>
          </view>
          <view class="sc-meta-item">
            <app-icon
              name="clock"
              :size="12"
              color="#999"
            />
            <text class="sc-meta-text">
              {{ schedule.time }}
            </text>
          </view>
          <text class="sc-meta-text">
            {{ schedule.duration }}分钟
          </text>
          <view class="sc-meta-item">
            <app-icon
              name="eye"
              :size="12"
              color="#999"
            />
            <text class="sc-meta-text">
              {{ schedule.status === 'completed' ? schedule.actualViewers : `预计${schedule.viewerEstimate}` }}
            </text>
          </view>
        </view>
      </view>

      <!-- 操作菜单 -->
      <view class="sc-menu-wrap">
        <view
          class="sc-menu-btn"
          @tap.stop="showMenu = !showMenu"
        >
          <app-icon
            name="more-horizontal"
            :size="16"
            color="#1a1a1a"
          />
        </view>
        <template v-if="showMenu">
          <view
            class="sc-menu-mask"
            @tap.stop="showMenu = false"
          />
          <view class="sc-menu">
            <view
              class="sc-menu-item"
              @tap.stop="onItem('edit')"
            >
              <app-icon
                name="edit-3"
                :size="16"
                color="#1a1a1a"
              />
              <text class="sc-menu-text">
                编辑
              </text>
            </view>
            <view
              class="sc-menu-item"
              @tap.stop="onItem('copy')"
            >
              <app-icon
                name="copy"
                :size="16"
                color="#1a1a1a"
              />
              <text class="sc-menu-text">
                复制
              </text>
            </view>
            <view
              class="sc-menu-item"
              @tap.stop="onItem('del')"
            >
              <app-icon
                name="trash-2"
                :size="16"
                color="#dc2626"
              />
              <text class="sc-menu-text sc-menu-text-danger">
                删除
              </text>
            </view>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { scheduleStatusConfig, type ScheduleItem } from '@/lib/live-data'

const props = defineProps<{ schedule: ScheduleItem; showDate?: boolean }>()
const emit = defineEmits<{ edit: []; copy: []; del: [] }>()

const showMenu = ref(false)

const statusLabel = computed(() => scheduleStatusConfig[props.schedule.status]?.label ?? '')
const badgeStyle = computed(() => {
  const cfg = scheduleStatusConfig[props.schedule.status]
  if (!cfg) return {}
  const [bg, color, border] = cfg.badge.split('|')
  return { background: bg, color, border: `1px solid ${border}` }
})

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
function onItem(type: 'edit' | 'copy' | 'del') {
  showMenu.value = false
  emit(type)
}
</script>

<style scoped>
.sc-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  overflow: hidden;
}
.sc-row {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
}
.sc-cover {
  width: 192rpx;
  height: 128rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(201, 169, 110, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}
.sc-series-tag {
  position: absolute;
  bottom: 8rpx;
  left: 8rpx;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 16rpx;
}
.sc-content {
  flex: 1;
  min-width: 0;
}
.sc-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.sc-title-wrap {
  min-width: 0;
  flex: 1;
}
.sc-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.sc-series-name {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-badge {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
}
.sc-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}
.sc-meta-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.sc-meta-text {
  font-size: 22rpx;
  color: #999;
}
.sc-menu-wrap {
  position: relative;
}
.sc-menu-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sc-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.sc-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 8rpx;
  z-index: 50;
  width: 200rpx;
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 12rpx;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 8rpx 0;
}
.sc-menu-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
}
.sc-menu-text {
  font-size: 26rpx;
  color: #1a1a1a;
}
.sc-menu-text-danger {
  color: #dc2626;
}
</style>
