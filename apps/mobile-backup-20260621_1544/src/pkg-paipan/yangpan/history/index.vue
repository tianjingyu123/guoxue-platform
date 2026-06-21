<script setup lang="ts">
/** 阳盘命理奇门排盘记录页——从原型 app/paipan/yangpan/history/page.tsx 1:1 迁移 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { yangpanApi } from '@/lib/yangpan-data'

interface Rec {
  id: string; clientName: string; clientBirth: string; createdAt: string
}

const records = ref<Rec[]>([])
const loading = ref(true)
const error = ref('')
const total = ref(0)
const searchQuery = ref('')

async function fetchHistory() {
  loading.value = true
  error.value = ''
  try {
    const res = await yangpanApi.history()
    records.value = res.records || []
    total.value = res.total || 0
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(fetchHistory)

function formatBirth(birth: string) {
  try {
    const parts = birth.match(/(\d{4})[年-](\d{1,2})[月-](\d{1,2})[日\s]+(\d{1,2}):?(\d{2})?/)
    if (parts) return `${parts[1]}年${parts[2]}月${parts[3]}日 ${parts[4]}时${parts[5] || '00'}分`
  } catch {}
  return birth
}

function openRecord(rec: Rec) {
  const parts = rec.clientBirth.match(/(\d{4})[年-](\d{1,2})[月-](\d{1,2})[日\s]+(\d{1,2}):?(\d{2})?/)
  if (parts) {
    const qs = `year=${parts[1]}&month=${parts[2]}&day=${parts[3]}&hour=${parts[4]}&minute=${parts[5] || '0'}&matter=${encodeURIComponent(rec.clientName)}&fromHistory=1&recordId=${encodeURIComponent(rec.id)}`
    navigateTo(`/paipan/yangpan/result?${qs}`)
  }
}

const filteredRecords = computed(() => {
  if (!searchQuery.value) return records.value
  return records.value.filter(r => r.clientName.includes(searchQuery.value))
})
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-inner">
        <view
          class="hdr-back"
          @tap="navigateTo('/paipan/yangpan')"
        >
          <app-icon
            name="chevron-left"
            :size="40"
            color="var(--text-ink)"
          />
        </view>
        <text class="hdr-title">
          排盘记录
        </text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search">
      <view class="search-box">
        <app-icon
          name="search"
          :size="28"
          color="var(--text-soft)"
        />
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索事项名称..."
          placeholder-class="search-ph"
        >
      </view>
    </view>

    <!-- 记录列表 -->
    <scroll-view
      scroll-y
      class="body"
    >
      <view
        v-if="loading"
        class="empty"
      >
        <view class="loading-spinner" />
        <text class="empty-title">
          加载中...
        </text>
      </view>
      <view
        v-else-if="error"
        class="empty"
      >
        <app-icon
          name="alert-circle"
          :size="64"
          color="#ef4444"
        />
        <text class="empty-title">
          {{ error }}
        </text>
        <view
          class="error-retry"
          @tap="fetchHistory"
        >
          <text class="error-retry-text">
            重试
          </text>
        </view>
      </view>
      <view
        v-else-if="filteredRecords.length === 0"
        class="empty"
      >
        <text class="empty-title">
          {{ searchQuery ? '没有匹配的记录' : '暂无排盘记录' }}
        </text>
        <text
          v-if="!searchQuery"
          class="empty-sub"
        >
          完成排盘并保存后，记录会显示在这里
        </text>
      </view>
      <view
        v-else
        class="list"
      >
        <view
          v-for="r in filteredRecords"
          :key="r.id"
          class="rec"
          @tap="openRecord(r)"
        >
          <view class="rec-bar" />
          <view class="rec-body">
            <view class="rec-content">
              <view class="rec-name">
                {{ r.clientName || '未命名' }}
              </view>
              <view class="rec-meta">
                <text class="rec-time">
                  {{ formatBirth(r.clientBirth) }}
                </text>
              </view>
            </view>
            <app-icon
              name="chevron-right"
              :size="24"
              color="#cccccc"
            />
          </view>
        </view>
        <view class="list-foot">
          <text class="list-foot-text">
            共 {{ total }} 条记录
          </text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }

.hdr { position: sticky; top: 0; z-index: 20; background: var(--bg-paper); border-bottom: 2rpx solid var(--border); padding-top: var(--status-bar-height, 0); }
.hdr-inner { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; }
.hdr-back { padding: 8rpx; margin-left: -8rpx; }
.hdr-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }

.search { padding: 20rpx 24rpx; border-bottom: 2rpx solid var(--border); }
.search-box { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 28rpx; background: rgba(0,0,0,0.04); border-radius: 999rpx; }
.search-input { flex: 1; font-size: 28rpx; color: var(--text-ink); }
.search-ph { color: var(--text-soft); }

.body { flex: 1; padding: 20rpx 24rpx; }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400rpx; }
.empty-title { font-size: 34rpx; color: var(--text-soft); margin-bottom: 12rpx; }
.empty-sub { font-size: 26rpx; color: var(--text-soft); }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.rec { background: var(--card); border-radius: 20rpx; border: 2rpx solid var(--border); overflow: hidden; display: flex; }
.rec-bar { width: 8rpx; flex-shrink: 0; background: #4f6ef7; }
.rec-body { flex: 1; padding: 28rpx; display: flex; align-items: flex-start; gap: 20rpx; }
.rec-content { flex: 1; }
.rec-name { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.rec-meta { display: flex; align-items: center; gap: 20rpx; }
.rec-time { font-size: 26rpx; color: var(--text-soft); }

.loading-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid var(--border, #e5e7eb); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-retry { margin-top: 16rpx; padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.error-retry-text { font-size: 28rpx; color: #fff; font-weight: 500; }
.list-foot { padding: 24rpx; text-align: center; }
.list-foot-text { font-size: 22rpx; color: var(--text-soft); }
</style>
