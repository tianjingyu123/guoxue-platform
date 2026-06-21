<script setup lang="ts">
/**
 * 八字历史 · 用户列表（从原型 app/paipan/bazi/history/page.tsx 1:1 高保真迁移）
 * 结构：顶栏(返回/用户列表·案例库Tab/更多菜单) + 搜索栏 + 分组标签 + 记录列表(性别头像+信息+四柱八字) + 三种批量操作栏(删除/置顶/分组) + 分组选择弹窗
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { baziApi } from '@/lib/bazi-result-data'

interface Rec {
  id: string; clientName: string; clientBirth: string; createdAt: string
}

const records = ref<Rec[]>([])
const loading = ref(true)
const error = ref('')
const total = ref(0)
const page = ref(1)

const searchQuery = ref('')

async function fetchHistory() {
  loading.value = true
  error.value = ''
  try {
    const res = await baziApi.history()
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
  // "1983-6-18 14:31" or "1983年6月18日 14:31" → parse to display
  try {
    const parts = birth.match(/(\d{4})[年-](\d{1,2})[月-](\d{1,2})[日\s]+(\d{1,2}):?(\d{2})?/)
    if (parts) {
      return `${parts[1]}年${parts[2]}月${parts[3]}日 ${parts[4]}时${parts[5] || '00'}分`
    }
  } catch {}
  return birth
}

function openRecord(rec: Rec) {
  // 解析出生时间作为路由参数
  const parts = rec.clientBirth.match(/(\d{4})[年-](\d{1,2})[月-](\d{1,2})[日\s]+(\d{1,2}):?(\d{2})?/)
  if (parts) {
    const qs = `year=${parts[1]}&month=${parts[2]}&day=${parts[3]}&hour=${parts[4]}&minute=${parts[5] || '0'}&name=${encodeURIComponent(rec.clientName)}&fromHistory=1&recordId=${encodeURIComponent(rec.id)}`
    navigateTo(`/paipan/bazi/result?${qs}`)
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
      <view class="hdr-bar">
        <view
          class="hdr-back"
          @tap="navigateBack()"
        >
          <app-icon
            name="chevron-left"
            :size="40"
            color="#666666"
          />
        </view>
        <view class="seg">
          <view class="seg-item seg-on">
            <text class="seg-text seg-text-on">
              用户列表
            </text>
          </view>
          <view
            class="seg-item"
            @tap="navigateTo('/paipan/bazi/history/celebrities')"
          >
            <text class="seg-text">
              案例库
            </text>
            <text class="vip-badge">
              VIP
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-wrap">
      <view class="search-box">
        <app-icon
          name="search"
          :size="30"
          color="#999999"
        />
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索客户名称"
          placeholder-class="search-ph"
        >
      </view>
    </view>

    <!-- 记录列表 -->
    <scroll-view
      scroll-y
      class="list"
    >
      <!-- loading -->
      <view
        v-if="loading"
        class="empty"
      >
        <view class="loading-spinner" />
        <text class="empty-text">
          加载中...
        </text>
      </view>
      <!-- error -->
      <view
        v-else-if="error"
        class="empty"
      >
        <app-icon
          name="alert-circle"
          :size="80"
          color="#ef4444"
        />
        <text class="empty-text">
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
      <!-- empty -->
      <view
        v-else-if="filteredRecords.length === 0"
        class="empty"
      >
        <app-icon
          name="search"
          :size="96"
          color="#cccccc"
        />
        <text class="empty-text">
          {{ searchQuery ? '没有匹配的记录' : '暂无排盘记录' }}
        </text>
        <text
          v-if="!searchQuery"
          class="empty-sub"
        >
          完成排盘并保存后，记录会显示在这里
        </text>
      </view>
      <!-- list -->
      <view v-else>
        <view
          v-for="rec in filteredRecords"
          :key="rec.id"
          class="row"
          @tap="openRecord(rec)"
        >
          <view class="avatar avatar-m">
            <app-icon
              name="user"
              :size="36"
              color="#60a5fa"
            />
          </view>
          <view class="info">
            <view class="info-top">
              <text class="info-name">
                {{ rec.clientName || '未知' }}
              </text>
            </view>
            <text class="info-date">
              {{ formatBirth(rec.clientBirth) }}
            </text>
          </view>
          <view class="info-arrow">
            <app-icon
              name="chevron-right"
              :size="28"
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
/* 顶栏 */
.hdr { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 2rpx solid var(--border); padding-top: var(--status-bar-height, 0); }
.hdr-bar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; position: relative; }
.hdr-back { padding: 6rpx; }
.seg { display: flex; background: var(--secondary); border-radius: 999rpx; padding: 4rpx; }
.seg-item { padding: 10rpx 32rpx; border-radius: 999rpx; position: relative; }
.seg-on { background: var(--card); box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08); }
.seg-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.seg-text-on { color: var(--text-ink); }
.vip-badge { position: absolute; top: -8rpx; right: -8rpx; font-size: 16rpx; font-weight: 500; color: var(--gold); background: rgba(201,169,110,0.18); border-radius: 6rpx; padding: 0 6rpx; line-height: 1.6; }
/* 搜索栏 */
.search-wrap { background: var(--card); padding: 20rpx 24rpx; border-bottom: 2rpx solid var(--border); }
.search-box { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 24rpx; background: var(--secondary); border-radius: 20rpx; }
.search-input { flex: 1; font-size: 26rpx; color: var(--text-ink); }
.search-ph { color: rgba(153,153,153,0.6); }
/* 列表 */
.list { flex: 1; background: var(--card); }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 0; gap: 20rpx; }
.empty-text { font-size: 28rpx; color: var(--text-soft); }
.row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; border-bottom: 2rpx solid var(--border); }
.avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-m { background: #eff6ff; }
.avatar-f { background: #fdf2f8; }
.info { flex: 1; min-width: 0; }
.info-top { display: flex; align-items: center; gap: 12rpx; }
.info-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }
.info-date { font-size: 22rpx; color: var(--text-soft); margin-top: 4rpx; }
.loading-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid var(--border, #e5e7eb); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-retry { margin-top: 16rpx; padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.error-retry-text { font-size: 28rpx; color: #fff; font-weight: 500; }
.empty-sub { font-size: 24rpx; color: var(--text-soft); margin-top: 8rpx; }
.info-arrow { flex-shrink: 0; }
.list-foot { padding: 24rpx; text-align: center; }
.list-foot-text { font-size: 22rpx; color: var(--text-soft); }
</style>
