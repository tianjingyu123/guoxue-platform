<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          浏览历史
        </text>
        <text
          v-if="totalCount > 0"
          class="header-clear"
          @click="showClearDialog = true"
        >
          清空
        </text>
        <view
          v-else
          class="header-right"
        />
      </view>
    </view>

    <!-- 统计 -->
    <view
      v-if="totalCount > 0"
      class="stats-bar"
    >
      <text>📊 共 {{ totalCount }} 条记录 · 近30天</text>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && historyGroups.length === 0"
      empty-icon="🕐"
      empty-title="暂无浏览记录"
      empty-description="去发现更多精彩内容吧"
      empty-action-text="去逛逛"
      :empty-show-action="true"
      skeleton-type="card"
      @retry="loadData"
      @empty-action="goHome"
    >
      <view class="history-content">
        <view
          v-for="group in historyGroups"
          :key="group.date"
          class="history-group"
        >
          <view class="date-header">
            {{ group.label }}
          </view>

          <view
            v-for="item in group.items"
            :key="item.id"
            class="history-item"
            :class="{ deleting: deletingId === item.id }"
          >
            <view
              class="history-item-main"
              @click="handleItemClick(item)"
            >
              <view class="history-thumb">
                <image
                  v-if="item.cover"
                  :src="item.cover"
                  class="history-thumb-img"
                  mode="aspectFill"
                />
                <view
                  v-else
                  class="history-thumb-placeholder"
                  :class="'htp-' + item.type"
                >
                  <text class="history-thumb-icon">
                    {{ typeIcon(item.type) }}
                  </text>
                </view>
                <view
                  v-if="item.type === 'video'"
                  class="history-play-overlay"
                >
                  <text class="history-play-icon">
                    ▶
                  </text>
                </view>
              </view>
              <view class="history-info">
                <view class="history-info-top">
                  <text
                    class="history-type-tag"
                    :class="'htt-' + item.type"
                  >
                    {{ typeLabel(item.type) }}
                  </text>
                  <text class="history-title">
                    {{ item.title }}
                  </text>
                </view>
                <view class="history-meta">
                  <text>{{ item.viewedAt }}</text>
                  <text v-if="item.progress !== undefined && item.duration">
                    · <text :class="item.progress >= 100 ? 'done' : ''">
                      {{ formatProgress(item.progress, item.duration) }}
                    </text>
                  </text>
                </view>
              </view>
              <view
                v-if="item.progress !== undefined && item.progress < 100"
                class="history-continue"
                @click.stop="handleItemClick(item)"
              >
                继续
              </view>
            </view>

            <!-- 左滑删除 -->
            <view
              class="history-delete-btn"
              @click="handleDelete(item.id)"
            >
              🗑
            </view>
          </view>
        </view>

        <view class="history-footer">
          仅展示近30天的浏览记录
        </view>
      </view>
    </DataState>

    <!-- 清空确认弹窗 -->
    <view
      v-if="showClearDialog"
      class="dialog-overlay"
      @click="showClearDialog = false"
    >
      <view
        class="dialog-content"
        @click.stop
      >
        <view class="dialog-icon-wrap">
          <text class="dialog-icon">
            🗑
          </text>
        </view>
        <text class="dialog-title">
          清空浏览历史
        </text>
        <text class="dialog-desc">
          确定要清空所有浏览记录吗？此操作不可恢复
        </text>
        <view class="dialog-actions">
          <view
            class="dialog-btn dialog-btn-cancel"
            @click="showClearDialog = false"
          >
            取消
          </view>
          <view
            class="dialog-btn dialog-btn-confirm-danger"
            @click="handleClearAll"
          >
            清空
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataState from '../../components/DataState.vue'

interface HistoryItem {
  id: string
  type: string
  title: string
  cover?: string
  progress?: number
  duration?: number
  viewedAt: string
}

interface HistoryGroup {
  date: string
  label: string
  items: HistoryItem[]
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const historyGroups = ref<HistoryGroup[]>([])
const showClearDialog = ref(false)
const deletingId = ref<string | null>(null)

const totalCount = computed(() => historyGroups.value.reduce((sum, g) => sum + g.items.length, 0))

function typeIcon(type: string): string {
  const map: Record<string, string> = { course: '📖', video: '🎬', live: '📡', article: '📄', product: '🛍', circle: '👥' }
  return map[type] || '📁'
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { course: '课程', video: '视频', live: '直播', article: '文章', product: '商品', circle: '圈子' }
  return map[type] || type
}

function formatProgress(progress: number, duration: number): string {
  if (progress >= 100) return '已看完'
  const watched = Math.floor((progress / 100) * duration)
  const minutes = Math.floor(watched / 60)
  return '已观看 ' + minutes + ' 分钟'
}

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 600))
    historyGroups.value = [
      {
        date: '2026-06-04', label: '今天',
        items: [
          { id: '1', type: 'course', title: '周易入门：从零开始学习易经', cover: '', progress: 45, duration: 3600, viewedAt: '14:30' },
          { id: '2', type: 'video', title: '梅花易数实战案例分析', cover: '', progress: 100, duration: 1200, viewedAt: '12:15' },
          { id: '3', type: 'article', title: '八字命理中的十神详解', viewedAt: '10:20' },
        ],
      },
      {
        date: '2026-06-03', label: '昨天',
        items: [
          { id: '4', type: 'live', title: '风水布局直播答疑', cover: '', viewedAt: '20:00' },
          { id: '5', type: 'product', title: '开光铜葫芦摆件', cover: '', viewedAt: '16:45' },
        ],
      },
      {
        date: '2026-06-01', label: '6月1日',
        items: [
          { id: '6', type: 'course', title: '六爻预测高级班', cover: '', progress: 30, duration: 7200, viewedAt: '19:30' },
        ],
      },
    ]
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function handleDelete(itemId: string) {
  historyGroups.value = historyGroups.value
    .map((g) => ({ ...g, items: g.items.filter((i) => i.id !== itemId) }))
    .filter((g) => g.items.length > 0)
  deletingId.value = null
}

function handleClearAll() {
  historyGroups.value = []
  showClearDialog.value = false
  uni.showToast({ title: '已清空', icon: 'success' })
}

function handleItemClick(item: HistoryItem) {
  uni.showToast({ title: '打开：' + item.title, icon: 'none' })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-right { width: 80rpx; }
.header-clear { font-size: 24rpx; color: #EF4444; padding: 8rpx; }

.stats-bar { padding: 16rpx 24rpx; background: #FAF8F5; font-size: 22rpx; color: #999; border-bottom: 1rpx solid #E8E3DB; }

.history-content { padding: 0 0 40rpx; }
.history-group { margin-bottom: 8rpx; }
.date-header { padding: 24rpx 24rpx 16rpx; font-size: 24rpx; font-weight: 500; color: #999; background: #F5F0E8; position: sticky; top: 88rpx; z-index: 5; }

.history-item { display: flex; align-items: stretch; overflow: hidden; transition: all 0.3s; background: #fff; margin: 0 24rpx 2rpx; border-radius: 16rpx; margin-bottom: 8rpx; }
.history-item.deleting { position: relative; }
.history-item-main { flex: 1; display: flex; gap: 16rpx; padding: 20rpx; align-items: center; }
.history-thumb { width: 180rpx; height: 120rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; position: relative; }
.history-thumb-img { width: 100%; height: 100%; }
.history-thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.htp-course { background: #E3F2FD; }
.htp-video { background: #FCE4EC; }
.htp-live { background: #FFEBEE; }
.htp-article { background: #E8F5E9; }
.htp-product { background: #FFF3E0; }
.htp-circle { background: #F3E5F5; }
.history-thumb-icon { font-size: 40rpx; }

.history-play-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); }
.history-play-icon { width: 56rpx; height: 56rpx; border-radius: 50%; background: rgba(0,0,0,0.5); color: #fff; font-size: 24rpx; display: flex; align-items: center; justify-content: center; }

.history-info { flex: 1; min-width: 0; }
.history-info-top { display: flex; align-items: flex-start; gap: 8rpx; }
.history-type-tag { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 6rpx; color: #fff; flex-shrink: 0; margin-top: 2rpx; }
.htt-course { background: #1976D2; }
.htt-video { background: #E91E63; }
.htt-live { background: #EF4444; }
.htt-article { background: #22C55E; }
.htt-product { background: #F59E0B; }
.htt-circle { background: #7B1FA2; }

.history-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.history-meta { font-size: 20rpx; color: #999; margin-top: 8rpx; }
.history-meta .done { color: #22C55E; }

.history-continue { flex-shrink: 0; padding: 8rpx 20rpx; background: #FDE8E8; color: #C41E3A; font-size: 20rpx; border-radius: 20rpx; }
.history-delete-btn { width: 100rpx; background: #EF4444; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 36rpx; flex-shrink: 0; }

.history-footer { text-align: center; padding: 32rpx; font-size: 22rpx; color: #B8B0A4; }

/* 弹窗 */
.dialog-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 48rpx; }
.dialog-content { background: #fff; border-radius: 24rpx; padding: 40rpx 32rpx; width: 100%; max-width: 560rpx; text-align: center; }
.dialog-icon-wrap { margin-bottom: 16rpx; }
.dialog-icon { font-size: 56rpx; }
.dialog-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; display: block; }
.dialog-desc { font-size: 24rpx; color: #666; margin-top: 12rpx; display: block; line-height: 1.6; }
.dialog-actions { display: flex; gap: 20rpx; margin-top: 28rpx; }
.dialog-btn { flex: 1; height: 80rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 500; }
.dialog-btn-cancel { background: #F5F0E8; color: #666; }
.dialog-btn-confirm-danger { background: #EF4444; color: #fff; }
</style>
