<script setup lang="ts">
/** 奇门排盘记录页——从原型 app/paipan/qimen/history/page.tsx 1:1 迁移 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { qimenApi } from '@/lib/qimen-data'

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
    const res = await qimenApi.history()
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
    navigateTo(`/paipan/qimen/result?${qs}`)
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
          @tap="navigateTo('/paipan/qimen')"
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
.hdr-more { padding: 8rpx; margin-right: -8rpx; }
.menu-mask { position: fixed; inset: 0; z-index: 10; }
.menu { position: absolute; right: 24rpx; top: 96rpx; z-index: 20; background: var(--card); border-radius: 20rpx; box-shadow: 0 8rpx 28rpx rgba(0,0,0,0.16); padding: 12rpx 0; min-width: 280rpx; }
.menu-item { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 32rpx; }
.menu-text { font-size: 28rpx; color: var(--text-ink); }

.groups { padding: 20rpx 24rpx; border-bottom: 2rpx solid var(--border); }
.groups-scroll { white-space: nowrap; }
.groups-row { display: inline-flex; gap: 16rpx; }
.grp { padding: 10rpx 32rpx; border-radius: 999rpx; background: rgba(0,0,0,0.04); }
.grp.on { background: var(--brand); }
.grp-t { font-size: 26rpx; color: var(--text-soft); }
.grp-t.on { color: #fff; font-weight: 500; }

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
.rec.sel { border-color: var(--brand); box-shadow: 0 0 0 3rpx rgba(196,30,58,0.3); }
.rec.pinned { background: rgba(245,158,11,0.06); }
.rec-bar { width: 8rpx; flex-shrink: 0; background: #4f6ef7; }
.rec-body { flex: 1; padding: 28rpx; display: flex; align-items: flex-start; gap: 20rpx; }
.rec-check { width: 38rpx; height: 38rpx; border-radius: 999rpx; border: 4rpx solid var(--border); flex-shrink: 0; margin-top: 4rpx; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.rec-check.on { border-color: var(--brand); background: var(--brand); }
.rec-content { flex: 1; }
.rec-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.rec-name-wrap { display: flex; align-items: center; gap: 12rpx; }
.rec-name { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.rec-group { font-size: 18rpx; color: var(--brand); background: rgba(196,30,58,0.1); padding: 2rpx 16rpx; border-radius: 999rpx; font-weight: 500; }
.rec-meta { display: flex; align-items: center; gap: 20rpx; }
.rec-time { font-size: 26rpx; color: var(--text-soft); }
.rec-ju { font-size: 26rpx; font-weight: 600; color: var(--brand); background: rgba(196,30,58,0.05); padding: 2rpx 16rpx; border-radius: 8rpx; }
.rec-pan { font-size: 22rpx; color: var(--text-soft); }

.bulk { position: sticky; bottom: 0; background: var(--card); border-top: 2rpx solid var(--border); padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 20rpx; }
.bulk-all { display: flex; align-items: center; gap: 12rpx; }
.bulk-check { width: 38rpx; height: 38rpx; border-radius: 999rpx; border: 4rpx solid var(--border); display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.bulk-check.on { border-color: var(--brand); background: var(--brand); }
.bulk-all-t { font-size: 28rpx; color: var(--text-ink); }
.bulk-actions { flex: 1; display: flex; gap: 20rpx; justify-content: flex-end; }
.bulk-btn { padding: 18rpx 44rpx; border-radius: 999rpx; }
.bulk-btn.cancel { background: rgba(0,0,0,0.05); }
.bulk-btn.danger { background: #ef4444; }
.bulk-btn.brand { background: var(--brand); }
.bulk-btn.disabled { opacity: 0.4; }
.bulk-btn-t { font-size: 28rpx; font-weight: 500; }
.bulk-btn-t.soft { color: var(--text-soft); }
.bulk-btn-t.light { color: #fff; }

.gp-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.gp-sheet { width: 100%; background: var(--card); border-radius: 32rpx 32rpx 0 0; }
.gp-head { padding: 28rpx; text-align: center; border-bottom: 2rpx solid var(--border); }
.gp-head-t { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.gp-list { max-height: 50vh; }
.gp-item { padding: 28rpx 32rpx; border-bottom: 2rpx solid rgba(0,0,0,0.06); }
.gp-item-t { font-size: 28rpx; color: var(--text-ink); }
.gp-foot { padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); border-top: 2rpx solid var(--border); }
.gp-cancel { padding: 22rpx 0; background: rgba(0,0,0,0.05); border-radius: 999rpx; text-align: center; }
.gp-cancel-t { font-size: 28rpx; font-weight: 500; color: var(--text-soft); }
.loading-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid var(--border, #e5e7eb); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-retry { margin-top: 16rpx; padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.error-retry-text { font-size: 28rpx; color: #fff; font-weight: 500; }
.list-foot { padding: 24rpx; text-align: center; }
.list-foot-text { font-size: 22rpx; color: var(--text-soft); }
</style>
