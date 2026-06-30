<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { mineApi, type BlacklistItem } from '@/lib/mine-data'

const list = ref<BlacklistItem[]>([])
const loading = ref(true)
const error = ref('')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await mineApi.getBlacklist()
    list.value = data.map((u: BlacklistItem) => ({ ...u }))
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() {
  fetchData()
}

onMounted(() => {
  fetchData()
})

// 移除确认
const removeDialog = ref(false)
const selected = ref<BlacklistItem | null>(null)
const removing = ref(false)

function askRemove(u: BlacklistItem) {
  selected.value = u
  removeDialog.value = true
}
async function confirmRemove() {
  if (!selected.value || removing.value) return
  removing.value = true
  try {
    await mineApi.unblockUser(selected.value.userId)
    list.value = list.value.filter((u) => u.id !== selected.value!.id)
    uni.showToast({ title: '已移出黑名单', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    removing.value = false
    removeDialog.value = false
    selected.value = null
  }
}

// 拉黑入口：平台从用户主页「拉黑」按钮发起（POST /users/:id/block），此处不提供用户搜索
// 后端暂无用户搜索端点 → 诚实提示，不伪造搜索结果
function openAdd() {
  uni.showToast({ title: '请在用户主页拉黑对方', icon: 'none' })
}

const isEmpty = computed(() => list.value.length === 0)
</script>

<template>
  <view class="page">
    <app-nav-bar title="黑名单管理" title-align="left" :title-size="36">
      <template #right>
        <view class="nav-btn" @tap="openAdd">
          <AppIcon name="plus" :size="22" color="#C41E3A" />
        </view>
      </template>
    </app-nav-bar>

    <!-- 加载/错误 -->
    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else-if="error" class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
    <scroll-view v-else scroll-y class="scroll">
      <!-- 空状态 -->
      <view v-if="isEmpty" class="empty">
        <view class="empty-icon">
          <AppIcon name="user-x" :size="44" color="#C9C2B6" />
        </view>
        <text class="empty-title">暂无黑名单用户</text>
        <text class="empty-desc">点击右上角添加黑名单</text>
      </view>

      <!-- 列表 -->
      <template v-else>
        <view v-for="u in list" :key="u.id" class="item">
          <image lazy-load class="avatar" :src="u.avatar" mode="aspectFill" />
          <view class="item-body">
            <text class="item-name">{{ u.nickname }}</text>
            <text class="item-time">{{ u.blockedAt }} 加入黑名单</text>
            <text v-if="u.reason" class="item-reason">原因：{{ u.reason }}</text>
          </view>
          <view class="btn-remove" @tap="askRemove(u)"><text class="btn-remove-text">移出</text></view>
        </view>

        <view class="footer">
          <text class="footer-line">共 {{ list.length }} 人在黑名单中</text>
          <text class="footer-sub">黑名单用户无法与您互动</text>
        </view>
      </template>
    </scroll-view>

    <!-- 移除确认弹窗 -->
    <view v-if="removeDialog" class="mask center mask-fade-in" @tap="removeDialog = false">
      <view class="dialog dialog-pop-in" @tap.stop>
        <text class="dialog-title">移出黑名单</text>
        <text class="dialog-desc">确定要将「{{ selected?.nickname }}」移出黑名单吗？移出后对方可以与您互动。</text>
        <view class="dialog-actions">
          <view class="dialog-btn ghost" @tap="removeDialog = false"><text class="dialog-btn-text">取消</text></view>
          <view class="dialog-btn solid" @tap="confirmRemove"><text class="dialog-btn-text solid-text">{{ removing ? '移出中...' : '确定移出' }}</text></view>
        </view>
      </view>
    </view>

  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 三态 */
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
.nav-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.scroll { flex: 1; padding: 24rpx; box-sizing: border-box; }

.empty { padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.empty-icon { width: 140rpx; height: 140rpx; border-radius: 50%; background: #F2ECE1; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.empty-title { font-size: 28rpx; color: #6f6760; }
.empty-desc { font-size: 24rpx; color: #b8b0a4; }

.item { background: #fff; border-radius: 20rpx; padding: 24rpx; display: flex; align-items: center; gap: 20rpx; margin-bottom: 20rpx; }
.avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: #F2ECE1; flex-shrink: 0; }
.item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.item-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.item-time { font-size: 22rpx; color: #8a8178; }
.item-reason { font-size: 22rpx; color: #b8b0a4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-remove { padding: 12rpx 28rpx; border: 1rpx solid var(--brand); border-radius: 999rpx; flex-shrink: 0; }
.btn-remove-text { font-size: 26rpx; color: var(--brand); }

.footer { text-align: center; padding: 24rpx 0; display: flex; flex-direction: column; gap: 8rpx; }
.footer-line { font-size: 26rpx; color: #b8b0a4; }
.footer-sub { font-size: 22rpx; color: #b8b0a4; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; display: flex; align-items: flex-end; }
.mask.center { align-items: center; justify-content: center; padding: 0 48rpx; }

.dialog { width: 100%; max-width: 560rpx; background: #fff; border-radius: 28rpx; padding: 44rpx 40rpx 32rpx; box-sizing: border-box; }
.dialog-title { display: block; font-size: 32rpx; font-weight: 700; color: #2C2C2C; text-align: center; margin-bottom: 16rpx; }
.dialog-desc { display: block; font-size: 26rpx; color: #8a8178; text-align: center; line-height: 1.6; margin-bottom: 32rpx; }
.dialog-actions { display: flex; gap: 20rpx; }
.dialog-btn { flex: 1; height: 84rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.dialog-btn.ghost { background: #F2ECE1; }
.dialog-btn.solid { background: var(--brand); }
.dialog-btn-text { font-size: 28rpx; color: #2C2C2C; font-weight: 500; }
.solid-text { color: #fff; }

.sheet { width: 100%; height: 70vh; background: #fff; border-radius: 40rpx 40rpx 0 0; padding: 32rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); box-sizing: border-box; display: flex; flex-direction: column; }
.sheet-head { padding-bottom: 24rpx; }
.sheet-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.search { display: flex; align-items: center; gap: 16rpx; background: #FAF8F5; border: 1rpx solid #EDE7DC; border-radius: 16rpx; padding: 0 24rpx; height: 80rpx; margin-bottom: 24rpx; }
.search-input { flex: 1; font-size: 28rpx; color: #2C2C2C; }
.ph { color: #b8b0a4; }
.search-clear { width: 40rpx; height: 40rpx; display: flex; align-items: center; justify-content: center; }
.results { flex: 1; }
.result-hint { text-align: center; padding: 64rpx 0; font-size: 26rpx; color: #8a8178; }
.result-empty { padding: 80rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.result-empty-text { font-size: 26rpx; color: #b8b0a4; }
.result-item { display: flex; align-items: center; gap: 20rpx; background: #FAF8F5; border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 16rpx; }
.result-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #E8E3D7; flex-shrink: 0; }
.result-name { flex: 1; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.result-done { font-size: 26rpx; color: #b8b0a4; }
.btn-block { padding: 10rpx 28rpx; border: 1rpx solid var(--brand); border-radius: 999rpx; }
.btn-block-text { font-size: 26rpx; color: var(--brand); }
</style>
