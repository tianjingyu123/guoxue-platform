<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-white border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="text-foreground text-lg">←</text>
        </view>
        <text class="text-base font-semibold text-foreground">黑名单管理</text>
        <view @click="addSheetOpen = true" class="p-1 -mr-1">
          <text class="text-primary text-lg">+</text>
        </view>
      </view>
    </view>

    <!-- Content -->
    <view class="p-4">
      <view v-if="loading" class="space-y-3">
        <view v-for="i in 5" :key="i" class="bg-white rounded-xl p-4 animate-pulse">
          <view class="flex items-center gap-3">
            <view class="w-12 h-12 bg-muted rounded-full" />
            <view class="flex-1">
              <view class="h-4 bg-muted rounded w-24 mb-2" />
              <view class="h-3 bg-muted rounded w-32" />
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="error" class="py-16 flex flex-col items-center">
        <text class="text-4xl text-muted-foreground/30 mb-4">⚠</text>
        <text class="text-sm text-muted-foreground mb-1">{{ error }}</text>
        <view @click="loadBlacklist" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm">
          <text>重新加载</text>
        </view>
      </view>

      <view v-else-if="blacklist.length === 0" class="py-16 flex flex-col items-center">
        <text class="text-4xl text-muted-foreground/30 mb-4"></text>
        <text class="text-sm text-muted-foreground mb-1">暂无黑名单用户</text>
        <text class="text-xs text-muted-foreground/60">点击右上角添加黑名单</text>
      </view>

      <view v-else class="space-y-3">
        <view v-for="user in blacklist" :key="user.id" class="bg-white rounded-xl p-4 border border-border">
          <view class="flex items-center gap-3">
            <!-- Avatar -->
            <view class="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
              <text>{{ user.nickname[0] }}</text>
            </view>

            <!-- User Info -->
            <view class="flex-1 min-w-0">
              <text class="font-medium text-foreground truncate block">{{ user.nickname }}</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ user.blockedAt }} 加入黑名单</text>
              <text v-if="user.reason" class="text-xs text-muted-foreground/60 mt-0.5 truncate block">原因：{{ user.reason }}</text>
            </view>

            <!-- Remove Button -->
            <view
              @click="confirmRemove(user)"
              class="px-3 py-1.5 rounded-lg border border-destructive text-danger text-xs font-medium"
            >
              <text>移出</text>
            </view>
          </view>
        </view>

        <!-- Bottom Info -->
        <view class="mt-4 text-center">
          <text class="text-sm text-muted-foreground block">共 {{ blacklist.length }} 人在黑名单中</text>
          <text class="text-xs text-muted-foreground/60 mt-1 block">黑名单用户无法与您互动</text>
        </view>
      </view>
    </view>

    <!-- Remove Confirm Dialog -->
    <view v-if="removeDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <view class="bg-white rounded-2xl p-6 mx-6 max-w-xs w-full">
        <text class="text-base font-semibold text-foreground block mb-2">移出黑名单</text>
        <text class="text-sm text-muted-foreground block mb-4">
          确定要将「{{ selectedUser?.nickname }}」移出黑名单吗？移出后对方可以与您互动。
        </text>
        <view class="flex gap-3">
          <view @click="removeDialogOpen = false" class="flex-1 h-11 bg-muted text-foreground rounded-xl font-medium flex items-center justify-center text-sm">
            <text>取消</text>
          </view>
          <view
            @click="handleRemove"
            :class="['flex-1 h-11 bg-danger text-white rounded-xl font-medium flex items-center justify-center text-sm', removing ? 'opacity-50' : '']"
          >
            <text>{{ removing ? '移出中…' : '确定移出' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Add Blacklist Sheet -->
    <view v-if="addSheetOpen" class="fixed inset-0 z-50 flex items-end bg-black/50" @click="addSheetOpen = false">
      <view class="w-full bg-white rounded-t-2xl max-h-[70vh]" @click.stop>
        <view class="sticky top-0 bg-white border-b border-border py-3 px-4">
          <text class="text-center font-semibold block text-foreground">添加黑名单</text>
        </view>
        <view class="p-4">
          <!-- Search -->
          <view class="relative mb-4">
            <view class="absolute left-3 top-1/2 -translate-y-1/2">
              <text class="text-muted-foreground"></text>
            </view>
            <input
              v-model="searchKeyword"
              @input="handleSearchInput"
              placeholder="搜索用户昵称"
              class="w-full h-10 pl-10 pr-8 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <view
              v-if="searchKeyword"
              @click="searchKeyword = ''; searchResults = []"
              class="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <text class="text-muted-foreground">✕</text>
            </view>
          </view>

          <!-- Search Results -->
          <view class="space-y-2 overflow-y-auto max-h-[calc(70vh-140px)]">
            <view v-if="searching" class="text-center py-8 text-muted-foreground">
              <text>搜索中…</text>
            </view>
            <view v-else-if="searchKeyword && searchResults.length === 0" class="text-center py-8 text-muted-foreground">
              <text>未找到相关用户</text>
            </view>
            <view v-else-if="!searchKeyword" class="text-center py-8 text-muted-foreground">
              <text class="text-4xl block mb-2"></text>
              <text class="text-sm">输入用户昵称进行搜索</text>
            </view>
            <view v-else>
              <view v-for="user in searchResults" :key="user.id" class="flex items-center gap-3 p-3 bg-background rounded-lg">
                <view class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
                  <text>{{ user.nickname[0] }}</text>
                </view>
                <text class="flex-1 font-medium text-foreground">{{ user.nickname }}</text>
                <text v-if="user.isBlocked" class="text-sm text-muted-foreground">已拉黑</text>
                <view
                  v-else
                  @click="handleAddToBlacklist(user)"
                  :class="['px-3 py-1.5 rounded-lg border border-destructive text-danger text-xs font-medium', adding === user.id ? 'opacity-50' : '']"
                >
                  <text>{{ adding === user.id ? '添加中…' : '拉黑' }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const blacklist = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const removeDialogOpen = ref(false)
const selectedUser = ref<any>(null)
const removing = ref(false)

const addSheetOpen = ref(false)
const searchKeyword = ref('')
const searchResults = ref<any[]>([])
const searching = ref(false)
const adding = ref<number | null>(null)

// Mock load
const loadBlacklist = () => {
  loading.value = true
  error.value = null
  setTimeout(() => {
    // 模拟偶尔失败
    if (Math.random() < 0.05) {
      error.value = '网络错误，请重试'
      loading.value = false
      return
    }
    blacklist.value = [
      { id: 1, userId: 101, nickname: '恶意用户A', avatar: '', blockedAt: '2024-06-01', reason: '发送垃圾广告' },
      { id: 2, userId: 102, nickname: '骚扰用户B', avatar: '', blockedAt: '2024-06-05', reason: '言语骚扰' },
    ]
    loading.value = false
  }, 300)
}

loadBlacklist()

function confirmRemove(user: any) {
  selectedUser.value = user
  removeDialogOpen.value = true
}

function handleRemove() {
  if (!selectedUser.value) return
  removing.value = true
  setTimeout(() => {
    blacklist.value = blacklist.value.filter(u => u.id !== selectedUser.value.id)
    removeDialogOpen.value = false
    selectedUser.value = null
    removing.value = false
  }, 500)
}

function handleSearchInput() {
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }
  searching.value = true
  setTimeout(() => {
    searchResults.value = [
      { id: 201, nickname: '用户C', avatar: '', isBlocked: false },
      { id: 202, nickname: '用户D', avatar: '', isBlocked: false },
    ].filter(u => u.nickname.includes(searchKeyword.value))
    searching.value = false
  }, 300)
}

function handleAddToBlacklist(user: any) {
  adding.value = user.id
  setTimeout(() => {
    searchResults.value = searchResults.value.map(u =>
      u.id === user.id ? { ...u, isBlocked: true } : u
    )
    loadBlacklist()
    adding.value = null
  }, 300)
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
