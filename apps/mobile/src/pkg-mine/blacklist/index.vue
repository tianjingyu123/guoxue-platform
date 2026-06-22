<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { mineApi, type BlacklistItem, type SearchUserItem } from '@/lib/mine-data'

const { data: pageData, isLoading, loadError, reload } = useAsyncData(async () => {
  const users = await mineApi.getBlacklist()
  return { users, pool: [] as SearchUserItem[] }
})

const dataIsEmpty = computed(() => {
  const u = pageData.value?.users
  return u !== undefined && u.length === 0
})

const list = ref<BlacklistItem[]>([])
watch(() => pageData.value?.users, (val) => {
  if (val) list.value = val.map((u: any) => ({ ...u }))
}, { immediate: true })

const blacklistSearchPool = computed(() => pageData.value?.pool ?? [])

// 移除确认
const removeDialog = ref(false)
const selected = ref<BlacklistItem | null>(null)
const removing = ref(false)

function askRemove(u: BlacklistItem) {
  selected.value = u
  removeDialog.value = true
}
function confirmRemove() {
  if (!selected.value) return
  removing.value = true
  setTimeout(() => {
    list.value = list.value.filter((u) => u.id !== selected.value!.id)
    removing.value = false
    removeDialog.value = false
    selected.value = null
    uni.showToast({ title: '已移出黑名单', icon: 'none' })
  }, 500)
}

// 添加黑名单
const addSheet = ref(false)
const keyword = ref('')
const searching = ref(false)
const results = ref<SearchUserItem[]>([])
const adding = ref<number | null>(null)

watch(keyword, (kw) => {
  if (!kw.trim()) {
    results.value = []
    return
  }
  searching.value = true
  setTimeout(() => {
    results.value = blacklistSearchPool.value
      .filter((u) => u.nickname.includes(kw.trim()))
      .map((u) => ({ ...u }))
    searching.value = false
  }, 300)
})

function openAdd() {
  addSheet.value = true
  keyword.value = ''
  results.value = []
}
function addToBlacklist(u: SearchUserItem) {
  if (u.isBlocked) return
  adding.value = u.id
  setTimeout(() => {
    results.value = results.value.map((r) => (r.id === u.id ? { ...r, isBlocked: true } : r))
    list.value = [
      { id: Date.now(), userId: u.id, nickname: u.nickname, avatar: u.avatar, blockedAt: new Date().toISOString().slice(0, 10) },
      ...list.value,
    ]
    adding.value = null
    uni.showToast({ title: '已加入黑名单', icon: 'none' })
  }, 500)
}

const isEmpty = computed(() => list.value.length === 0)
</script>

<template>
  <view v-if="isLoading" class="page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="88rpx" radius="0" mb="24rpx" />
      <AppSkeleton width="100%" height="160rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="120rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="120rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="dataIsEmpty" title="黑名单为空" />
  <view v-else class="page">
    <app-nav-bar
      title="黑名单管理"
      title-align="left"
      :title-size="36"
    >
      <template #right>
        <view
          class="nav-btn"
          @tap="openAdd"
        >
          <AppIcon
            name="plus"
            :size="22"
            color="#C41E3A"
          />
        </view>
      </template>
    </app-nav-bar>

    <scroll-view
      scroll-y
      class="scroll"
    >
      <!-- 空状态 -->
      <view
        v-if="isEmpty"
        class="empty"
      >
        <view class="empty-icon">
          <AppIcon
            name="user-x"
            :size="44"
            color="#C9C2B6"
          />
        </view>
        <text class="empty-title">
          暂无黑名单用户
        </text>
        <text class="empty-desc">
          点击右上角添加黑名单
        </text>
      </view>

      <!-- 列表 -->
      <template v-else>
        <view
          v-for="u in list"
          :key="u.id"
          class="item"
        >
          <image
            class="avatar"
            :src="u.avatar"
            mode="aspectFill"
          />
          <view class="item-body">
            <text class="item-name">
              {{ u.nickname }}
            </text>
            <text class="item-time">
              {{ u.blockedAt }} 加入黑名单
            </text>
            <text
              v-if="u.reason"
              class="item-reason"
            >
              原因：{{ u.reason }}
            </text>
          </view>
          <view
            class="btn-remove"
            @tap="askRemove(u)"
          >
            <text class="btn-remove-text">
              移出
            </text>
          </view>
        </view>

        <view class="footer">
          <text class="footer-line">
            共 {{ list.length }} 人在黑名单中
          </text>
          <text class="footer-sub">
            黑名单用户无法与您互动
          </text>
        </view>
      </template>
    </scroll-view>

    <!-- 移除确认弹窗 -->
    <view
      v-if="removeDialog"
      class="mask center mask-fade-in"
      @tap="removeDialog = false"
    >
      <view
        class="dialog dialog-pop-in"
        @tap.stop
      >
        <text class="dialog-title">
          移出黑名单
        </text>
        <text class="dialog-desc">
          确定要将「{{ selected?.nickname }}」移出黑名单吗？移出后对方可以与您互动。
        </text>
        <view class="dialog-actions">
          <view
            class="dialog-btn ghost"
            @tap="removeDialog = false"
          >
            <text class="dialog-btn-text">
              取消
            </text>
          </view>
          <view
            class="dialog-btn solid"
            @tap="confirmRemove"
          >
            <text class="dialog-btn-text solid-text">
              {{ removing ? '移出中...' : '确定移出' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 添加黑名单底部弹窗 -->
    <view
      v-if="addSheet"
      class="mask mask-fade-in"
      @tap="addSheet = false"
    >
      <view
        class="sheet sheet-slide-up"
        @tap.stop
      >
        <view class="sheet-head">
          <text class="sheet-title">
            添加黑名单
          </text>
        </view>
        <view class="search">
          <AppIcon
            name="search"
            :size="18"
            color="#b8b0a4"
          />
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索用户昵称"
            placeholder-class="ph"
            confirm-type="search"
          >
          <view
            v-if="keyword"
            class="search-clear"
            @tap="keyword = ''"
          >
            <AppIcon
              name="x"
              :size="16"
              color="#b8b0a4"
            />
          </view>
        </view>

        <scroll-view
          scroll-y
          class="results"
        >
          <view
            v-if="searching"
            class="result-hint"
          >
            搜索中...
          </view>
          <view
            v-else-if="keyword && results.length === 0"
            class="result-hint"
          >
            未找到相关用户
          </view>
          <view
            v-else-if="!keyword"
            class="result-empty"
          >
            <AppIcon
              name="alert-circle"
              :size="40"
              color="#E8E3D7"
            />
            <text class="result-empty-text">
              输入用户昵称进行搜索
            </text>
          </view>
          <template v-else>
            <view
              v-for="u in results"
              :key="u.id"
              class="result-item"
            >
              <image
                class="result-avatar"
                :src="u.avatar"
                mode="aspectFill"
              />
              <text class="result-name">
                {{ u.nickname }}
              </text>
              <text
                v-if="u.isBlocked"
                class="result-done"
              >
                已拉黑
              </text>
              <view
                v-else
                class="btn-block"
                @tap="addToBlacklist(u)"
              >
                <text class="btn-block-text">
                  {{ adding === u.id ? '添加中...' : '拉黑' }}
                </text>
              </view>
            </view>
          </template>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
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
.btn-remove { padding: 12rpx 28rpx; border: 1rpx solid #C41E3A; border-radius: 999rpx; flex-shrink: 0; }
.btn-remove-text { font-size: 26rpx; color: #C41E3A; }

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
.dialog-btn.solid { background: #C41E3A; }
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
.btn-block { padding: 10rpx 28rpx; border: 1rpx solid #C41E3A; border-radius: 999rpx; }
.btn-block-text { font-size: 26rpx; color: #C41E3A; }
</style>
