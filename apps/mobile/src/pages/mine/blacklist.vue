<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <view class="header-left">
          <text
            class="back-btn"
            @click="goBack"
          >
            ←
          </text>
          <text class="header-title">
            黑名单管理
          </text>
        </view>
        <text
          class="header-add"
          @click="openAddSheet"
        >
          ＋ 添加
        </text>
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && blacklist.length === 0"
      empty-icon="🚫"
      empty-title="暂无黑名单用户"
      empty-description="点击右上角添加黑名单"
      empty-action-text="添加"
      :empty-show-action="true"
      skeleton-type="list"
      @retry="loadBlacklist"
      @empty-action="openAddSheet"
    >
      <view class="content">
        <view
          v-for="user in blacklist"
          :key="user.id"
          class="user-card"
        >
          <view class="user-left">
            <image
              v-if="user.avatar"
              :src="user.avatar"
              class="user-avatar"
              mode="aspectFill"
            />
            <view
              v-else
              class="user-avatar-placeholder"
            >
              <text class="user-avatar-text">
                {{ (user.nickname || '?').slice(0, 1) }}
              </text>
            </view>
            <view class="user-info">
              <text class="user-name">
                {{ user.nickname }}
              </text>
              <text class="user-date">
                {{ user.blockedAt }} 加入黑名单
              </text>
              <text
                v-if="user.reason"
                class="user-reason"
              >
                原因：{{ user.reason }}
              </text>
            </view>
          </view>
          <view
            class="btn-remove"
            @click="confirmRemove(user)"
          >
            移出
          </view>
        </view>

        <!-- 底部提示 -->
        <view
          v-if="blacklist.length > 0"
          class="bottom-tip"
        >
          <text class="bottom-tip-text">
            共 {{ blacklist.length }} 人在黑名单中
          </text>
          <text class="bottom-tip-sub">
            黑名单用户无法与您互动
          </text>
        </view>
      </view>
    </DataState>

    <!-- 移除确认弹窗 -->
    <view
      v-if="removeDialogOpen"
      class="dialog-overlay"
      @click="closeRemoveDialog"
    >
      <view
        class="dialog-content"
        @click.stop
      >
        <text class="dialog-title">
          移出黑名单
        </text>
        <text class="dialog-desc">
          确定要将「{{ selectedUser?.nickname }}」移出黑名单吗？移出后对方可以与您互动。
        </text>
        <view class="dialog-actions">
          <view
            class="dialog-btn dialog-btn-cancel"
            @click="closeRemoveDialog"
          >
            取消
          </view>
          <view
            class="dialog-btn dialog-btn-confirm"
            :class="{ disabled: removing }"
            @click="handleRemove"
          >
            {{ removing ? '移出中...' : '确定移出' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 添加黑名单底部弹窗 -->
    <view
      v-if="addSheetOpen"
      class="sheet-overlay"
      @click="closeAddSheet"
    >
      <view
        class="sheet-content"
        @click.stop
      >
        <view class="sheet-header">
          <text class="sheet-title">
            添加黑名单
          </text>
          <text
            class="sheet-close"
            @click="closeAddSheet"
          >
            ✕
          </text>
        </view>

        <!-- 搜索框 -->
        <view class="search-box">
          <text class="search-icon">
            🔍
          </text>
          <input
            v-model="searchKeyword"
            class="search-input"
            placeholder="搜索用户昵称"
            confirm-type="search"
            @confirm="handleSearch"
          >
          <text
            v-if="searchKeyword"
            class="search-clear"
            @click="clearSearch"
          >
            ✕
          </text>
        </view>

        <!-- 搜索结果 -->
        <scroll-view
          scroll-y
          class="search-results"
        >
          <view
            v-if="searching"
            class="search-state"
          >
            搜索中...
          </view>
          <view
            v-else-if="searchKeyword && searchResults.length === 0"
            class="search-state"
          >
            未找到相关用户
          </view>
          <view
            v-else-if="!searchKeyword"
            class="search-state search-hint"
          >
            <text class="search-hint-icon">
              🔍
            </text>
            <text>输入用户昵称进行搜索</text>
          </view>
          <view
            v-for="user in searchResults"
            :key="user.id"
            class="search-user-item"
          >
            <image
              v-if="user.avatar"
              :src="user.avatar"
              class="search-user-avatar"
              mode="aspectFill"
            />
            <view
              v-else
              class="search-user-avatar-placeholder"
            >
              <text class="user-avatar-text">
                {{ (user.nickname || '?').slice(0, 1) }}
              </text>
            </view>
            <text class="search-user-name">
              {{ user.nickname }}
            </text>
            <text
              v-if="user.isBlocked"
              class="search-user-blocked"
            >
              已拉黑
            </text>
            <view
              v-else
              class="btn-block"
              :class="{ disabled: adding === user.id }"
              @click="handleAddToBlacklist(user)"
            >
              {{ adding === user.id ? '添加中...' : '拉黑' }}
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import DataState from '../../components/DataState.vue'

interface BlacklistItem {
  id: string
  userId: string
  nickname: string
  avatar?: string
  blockedAt: string
  reason?: string
}

interface SearchUserItem {
  id: number
  nickname: string
  avatar?: string
  isBlocked: boolean
}

const blacklist = ref<BlacklistItem[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

// 移除确认
const removeDialogOpen = ref(false)
const selectedUser = ref<BlacklistItem | null>(null)
const removing = ref(false)

// 添加黑名单
const addSheetOpen = ref(false)
const searchKeyword = ref('')
const searchResults = ref<SearchUserItem[]>([])
const searching = ref(false)
const adding = ref<number | null>(null)

onMounted(() => {
  loadBlacklist()
})

async function loadBlacklist() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 500))
    blacklist.value = [
      { id: '1', userId: 'u1', nickname: '恶意用户A', avatar: '', blockedAt: '2026-01-15', reason: '发布不良信息' },
      { id: '2', userId: 'u2', nickname: '广告号B', avatar: '', blockedAt: '2026-02-20', reason: '频繁发送广告' },
      { id: '3', userId: 'u3', nickname: '骚扰者C', avatar: '', blockedAt: '2026-03-10' },
    ]
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function confirmRemove(user: BlacklistItem) {
  selectedUser.value = user
  removeDialogOpen.value = true
}

function closeRemoveDialog() {
  removeDialogOpen.value = false
  selectedUser.value = null
}

async function handleRemove() {
  if (!selectedUser.value) return
  removing.value = true
  try {
    await new Promise((r) => setTimeout(r, 800))
    blacklist.value = blacklist.value.filter((u) => u.id !== selectedUser.value!.id)
    removeDialogOpen.value = false
    selectedUser.value = null
    uni.showToast({ title: '已移出黑名单', icon: 'success' })
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    removing.value = false
  }
}

function openAddSheet() {
  addSheetOpen.value = true
}

function closeAddSheet() {
  addSheetOpen.value = false
  searchKeyword.value = ''
  searchResults.value = []
}

function clearSearch() {
  searchKeyword.value = ''
  searchResults.value = []
}

async function handleSearch() {
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }
  searching.value = true
  try {
    await new Promise((r) => setTimeout(r, 500))
    searchResults.value = [
      { id: 101, nickname: '用户D', avatar: '', isBlocked: false },
      { id: 102, nickname: '用户E', avatar: '', isBlocked: true },
    ]
  } catch {
    // ignore
  } finally {
    searching.value = false
  }
}

// Debounced search
watch(searchKeyword, (val) => {
  if (!val.trim()) {
    searchResults.value = []
    return
  }
  const timer = setTimeout(() => {
    handleSearch()
  }, 300)
  // Cleanup handled by Vue's watch
  // Using a simple approach
})

const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null)
watch(searchKeyword, (val) => {
  if (searchTimer.value) clearTimeout(searchTimer.value)
  if (!val.trim()) {
    searchResults.value = []
    return
  }
  searchTimer.value = setTimeout(() => {
    handleSearch()
  }, 300)
})

async function handleAddToBlacklist(user: SearchUserItem) {
  adding.value = user.id
  try {
    await new Promise((r) => setTimeout(r, 600))
    searchResults.value = searchResults.value.map((u) =>
      u.id === user.id ? { ...u, isBlocked: true } : u
    )
    loadBlacklist()
    uni.showToast({ title: '已拉黑', icon: 'success' })
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    adding.value = null
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

/* 顶部导航 */
.header {
  background: #fff;
  border-bottom: 1rpx solid #E8E3DB;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.back-btn {
  font-size: 36rpx;
  color: #2C2C2C;
  padding: 8rpx;
}
.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.header-add {
  font-size: 26rpx;
  color: #C41E3A;
  font-weight: 500;
  padding: 8rpx;
}

/* 内容区 */
.content {
  padding: 24rpx;
}
.user-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.user-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}
.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.user-avatar-placeholder {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.user-avatar-text {
  font-size: 28rpx;
  color: #C9A96E;
  font-weight: 500;
}
.user-info {
  flex: 1;
  min-width: 0;
}
.user-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-date {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}
.user-reason {
  font-size: 22rpx;
  color: #B8B0A4;
  margin-top: 2rpx;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btn-remove {
  padding: 12rpx 28rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #C41E3A;
  border: 1rpx solid #C41E3A;
  background: transparent;
  flex-shrink: 0;
  margin-left: 16rpx;
}

/* 底部提示 */
.bottom-tip {
  text-align: center;
  padding: 32rpx 0;
}
.bottom-tip-text {
  font-size: 24rpx;
  color: #B8B0A4;
  display: block;
}
.bottom-tip-sub {
  font-size: 22rpx;
  color: #B8B0A4;
  margin-top: 8rpx;
  display: block;
}

/* 移除确认弹窗 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.dialog-content {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  width: 100%;
  max-width: 560rpx;
}
.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
  text-align: center;
  display: block;
  margin-bottom: 16rpx;
}
.dialog-desc {
  font-size: 26rpx;
  color: #666;
  text-align: center;
  display: block;
  line-height: 1.6;
  margin-bottom: 32rpx;
}
.dialog-actions {
  display: flex;
  gap: 20rpx;
}
.dialog-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 500;
}
.dialog-btn-cancel {
  background: #F5F0E8;
  color: #666;
}
.dialog-btn-confirm {
  background: #C41E3A;
  color: #fff;
}
.dialog-btn-confirm.disabled {
  opacity: 0.5;
}

/* 添加黑名单底部弹窗 */
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
}
.sheet-content {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 32rpx;
  position: relative;
  border-bottom: 1rpx solid #F5F0E8;
}
.sheet-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.sheet-close {
  position: absolute;
  right: 32rpx;
  font-size: 28rpx;
  color: #999;
  padding: 8rpx;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  margin: 20rpx 24rpx;
  background: #FAF8F5;
  border-radius: 16rpx;
  padding: 0 20rpx;
  border: 1rpx solid #E8E3D7;
}
.search-icon {
  font-size: 28rpx;
  color: #B8B0A4;
  margin-right: 12rpx;
}
.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 26rpx;
  color: #2C2C2C;
  background: transparent;
  border: none;
  outline: none;
}
.search-clear {
  font-size: 24rpx;
  color: #B8B0A4;
  padding: 8rpx;
}

/* 搜索结果 */
.search-results {
  flex: 1;
  padding: 0 24rpx 24rpx;
  overflow-y: auto;
  max-height: calc(70vh - 200rpx);
}
.search-state {
  text-align: center;
  padding: 48rpx 0;
  font-size: 26rpx;
  color: #8B7E6A;
}
.search-hint-icon {
  font-size: 48rpx;
  display: block;
  margin-bottom: 16rpx;
  color: #E8E3D7;
}
.search-user-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: #FAF8F5;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
}
.search-user-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.search-user-avatar-placeholder {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #E8E3D7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.search-user-name {
  flex: 1;
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.search-user-blocked {
  font-size: 22rpx;
  color: #B8B0A4;
}
.btn-block {
  padding: 10rpx 28rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
  color: #C41E3A;
  border: 1rpx solid #C41E3A;
}
.btn-block.disabled {
  opacity: 0.5;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
