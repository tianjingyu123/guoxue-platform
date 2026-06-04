<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="nav-bar">
      <view
        class="nav-left"
        @click="goBack"
      >
        <text class="nav-back">
          ‹
        </text>
      </view>
      <text class="nav-title">
        我的草稿
      </text>
      <view class="nav-right" />
    </view>

    <!-- 加载中 -->
    <LoadingSkeleton
      v-if="loading && drafts.length === 0"
      type="list"
    />

    <!-- 草稿列表 -->
    <view
      v-else-if="drafts.length > 0"
      class="draft-list"
    >
      <view
        v-for="draft in drafts"
        :key="draft.id"
        class="draft-card"
        @click="editDraft(draft)"
      >
        <view class="draft-body">
          <text class="draft-title">
            {{ draft.title || '无标题' }}
          </text>
          <text class="draft-excerpt">
            {{ draft.content?.slice(0, 100) || '暂无内容' }}
          </text>
          <view class="draft-meta">
            <text class="draft-time">
              {{ formatTime(draft.updatedAt || draft.createdAt) }}
            </text>
          </view>
        </view>
        <view class="draft-actions">
          <text
            class="draft-delete"
            @click.stop="removeDraft(draft)"
          >
            删除
          </text>
        </view>
      </view>
    </view>

    <!-- 空 -->
    <EmptyState
      v-else
      icon="📝"
      text="暂无草稿"
    />

    <view class="bottom-safe" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { contentApi } from "../../api"
import LoadingSkeleton from "../../components/LoadingSkeleton.vue"
import EmptyState from "../../components/EmptyState.vue"

const drafts = ref<any[]>([])
const loading = ref(false)

onMounted(() => {
  fetchDrafts()
})

async function fetchDrafts() {
  loading.value = true
  try {
    const res = await contentApi.drafts({ page: 1, pageSize: 50 })
    const list = res?.list || res?.data || res || []
    drafts.value = Array.isArray(list) ? list : []
  } catch {
    drafts.value = []
  } finally {
    loading.value = false
  }
}

function editDraft(draft: any) {
  uni.navigateTo({
    url: `/pages/articles/editor?draftId=${draft.id}&circleId=${draft.circleId || ""}`,
  })
}

async function removeDraft(draft: any) {
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: "删除草稿",
      content: "确定要删除该草稿吗？此操作不可撤销。",
      success: (res) => resolve(res.confirm),
      fail: () => resolve(false),
    })
  })
  if (!confirmed) return
  try {
    await contentApi.deleteDraft(draft.id)
    drafts.value = drafts.value.filter((d) => d.id !== draft.id)
    uni.showToast({ title: "已删除", icon: "success" })
  } catch {
    uni.showToast({ title: "删除失败", icon: "none" })
  }
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function goBack() {
  uni.navigateBack()
}
</script>

<style>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 20px;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  padding-top: calc(10px + env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1px solid #E8E0D5;
}
.nav-left {
  width: 44px;
}
.nav-back {
  font-size: 32px;
  color: #333;
  line-height: 1;
}
.nav-title {
  font-size: 16px;
  font-weight: bold;
  color: #2C2C2C;
}
.nav-right {
  width: 44px;
}

.draft-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.draft-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.draft-body {
  flex: 1;
  min-width: 0;
}

.draft-title {
  font-size: 15px;
  font-weight: bold;
  color: #2C2C2C;
  display: block;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-excerpt {
  font-size: 13px;
  color: #999;
  display: block;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.draft-time {
  font-size: 11px;
  color: #ccc;
}

.draft-actions {
  flex-shrink: 0;
}

.draft-delete {
  font-size: 12px;
  color: #C41E3A;
  padding: 4px 10px;
  border: 1px solid #fde8e8;
  border-radius: 12px;
}

.bottom-safe {
  height: calc(40px + env(safe-area-inset-bottom));
}
</style>
