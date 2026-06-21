<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import {
  myComments,
  commentTypeNames,
  commentTypeStyles,
  type MyCommentItem,
} from '@/lib/mine-data'

const list = ref<MyCommentItem[]>(myComments.map((c) => ({ ...c })))
const isEditMode = ref(false)
const selectedIds = ref<number[]>([])
const activeId = ref<number | null>(null)

const isEmpty = computed(() => list.value.length === 0)

function toggleEdit() {
  isEditMode.value = !isEditMode.value
  selectedIds.value = []
  activeId.value = null
}
function toggleSelect(id: number) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((i) => i !== id)
    : [...selectedIds.value, id]
}
function selectAll() {
  selectedIds.value = list.value.map((c) => c.id)
}
function toggleActive(id: number) {
  if (isEditMode.value) return
  activeId.value = activeId.value === id ? null : id
}
function deleteOne(id: number) {
  list.value = list.value.filter((c) => c.id !== id)
  activeId.value = null
  uni.showToast({ title: '已删除', icon: 'none' })
}
function batchDelete() {
  if (selectedIds.value.length === 0) return
  list.value = list.value.filter((c) => !selectedIds.value.includes(c.id))
  selectedIds.value = []
  isEditMode.value = false
  uni.showToast({ title: '已删除', icon: 'none' })
}
function openTarget() {
  uni.showToast({ title: '内容详情开发中', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <app-nav-bar
      title="我的评论"
      back-icon="arrow-left"
    >
      <template #right>
        <text
          v-if="!isEmpty"
          class="nav-action"
          @tap="toggleEdit"
        >
          {{ isEditMode ? '完成' : '管理' }}
        </text>
      </template>
    </app-nav-bar>

    <!-- 空态 -->
    <view
      v-if="isEmpty"
      class="empty"
    >
      <view class="empty-icon">
        <AppIcon
          name="message-square"
          :size="44"
          color="#C9C2B6"
        />
      </view>
      <text class="empty-title">
        暂无评论记录
      </text>
      <text class="empty-desc">
        去参与更多互动吧
      </text>
    </view>

    <scroll-view
      v-else
      scroll-y
      class="scroll"
      :style="{ paddingBottom: isEditMode ? '160rpx' : '24rpx' }"
    >
      <view class="comment-list">
        <view
          v-for="c in list"
          :key="c.id"
          class="comment-row"
        >
          <view
            v-if="isEditMode"
            class="checkbox"
            :class="{ checked: selectedIds.includes(c.id) }"
            @tap="toggleSelect(c.id)"
          >
            <AppIcon
              v-if="selectedIds.includes(c.id)"
              name="check"
              :size="16"
              color="#fff"
            />
          </view>

          <view
            class="card"
            @tap="toggleActive(c.id)"
          >
            <text class="comment-content">
              {{ c.content }}
            </text>

            <!-- 目标内容 -->
            <view
              class="target"
              @tap.stop="openTarget"
            >
              <view
                v-if="c.target.cover"
                class="target-cover"
              >
                <image
                  class="target-img"
                  :src="c.target.cover"
                  mode="aspectFill"
                />
              </view>
              <view
                v-else
                class="target-icon"
                :style="{ background: commentTypeStyles[c.target.type].bg }"
              >
                <AppIcon
                  :name="commentTypeStyles[c.target.type].icon"
                  :size="22"
                  :color="commentTypeStyles[c.target.type].color"
                />
              </view>
              <view class="target-body">
                <text
                  class="target-tag"
                  :style="{ color: commentTypeStyles[c.target.type].color, background: commentTypeStyles[c.target.type].bg }"
                >
                  {{ commentTypeNames[c.target.type] }}
                </text>
                <text class="target-title">
                  {{ c.target.title }}
                </text>
              </view>
              <AppIcon
                name="chevron-right"
                :size="18"
                color="#c9c2b6"
              />
            </view>

            <!-- 底部 -->
            <view class="comment-foot">
              <text class="comment-time">
                {{ c.createdAt }}
              </text>
              <view class="foot-stats">
                <view class="fs-item">
                  <AppIcon
                    name="heart"
                    :size="14"
                    color="#8a8178"
                  />
                  <text class="fs-num">
                    {{ c.likeCount }}
                  </text>
                </view>
                <view class="fs-item">
                  <AppIcon
                    name="message-circle"
                    :size="14"
                    color="#8a8178"
                  />
                  <text class="fs-num">
                    {{ c.replyCount }}
                  </text>
                </view>
                <text
                  v-if="c.hasReply"
                  class="reply-tag"
                >
                  有回复
                </text>
              </view>
            </view>

            <!-- 删除确认 -->
            <view
              v-if="!isEditMode && activeId === c.id"
              class="del-row"
              @tap.stop
            >
              <text
                class="del-cancel"
                @tap="activeId = null"
              >
                取消
              </text>
              <text
                class="del-confirm"
                @tap="deleteOne(c.id)"
              >
                删除评论
              </text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 批量操作栏 -->
    <view
      v-if="isEditMode"
      class="batch-bar"
    >
      <text
        class="batch-all"
        @tap="selectAll"
      >
        全选
      </text>
      <view
        class="batch-del"
        :class="{ disabled: selectedIds.length === 0 }"
        @tap="batchDelete"
      >
        <AppIcon
          name="trash-2"
          :size="16"
          color="#fff"
        />
        <text class="batch-del-text">
          删除 ({{ selectedIds.length }})
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.nav-action { font-size: 28rpx; color: #C41E3A; }

.empty { flex: 1; padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.empty-icon { width: 140rpx; height: 140rpx; border-radius: 50%; background: #F2ECE1; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.empty-title { font-size: 28rpx; color: #6f6760; }
.empty-desc { font-size: 24rpx; color: #b8b0a4; }

.scroll { flex: 1; padding: 24rpx; box-sizing: border-box; }
.comment-list { display: flex; flex-direction: column; gap: 20rpx; }
.comment-row { display: flex; align-items: center; gap: 16rpx; }
.checkbox { width: 44rpx; height: 44rpx; border-radius: 50%; border: 2rpx solid #c9c2b6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.checkbox.checked { background: #C41E3A; border-color: #C41E3A; }

.card { flex: 1; min-width: 0; background: #fff; border-radius: 20rpx; padding: 24rpx; }
.comment-content { display: block; font-size: 28rpx; color: #2C2C2C; line-height: 1.6; margin-bottom: 20rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.target { display: flex; align-items: center; gap: 16rpx; padding: 18rpx; background: #FAF8F5; border-radius: 14rpx; }
.target-cover { width: 80rpx; height: 80rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; background: #F2ECE1; }
.target-img { width: 100%; height: 100%; }
.target-icon { width: 80rpx; height: 80rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.target-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.target-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 6rpx; align-self: flex-start; }
.target-title { font-size: 26rpx; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.comment-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid #F2ECE1; }
.comment-time { font-size: 22rpx; color: #b8b0a4; }
.foot-stats { display: flex; align-items: center; gap: 24rpx; }
.fs-item { display: flex; align-items: center; gap: 6rpx; }
.fs-num { font-size: 22rpx; color: #8a8178; }
.reply-tag { font-size: 20rpx; color: #C41E3A; background: rgba(196,30,58,0.1); padding: 2rpx 12rpx; border-radius: 8rpx; }

.del-row { display: flex; margin-top: 20rpx; border-top: 1rpx solid #F2ECE1; }
.del-cancel { flex: 1; text-align: center; padding: 20rpx 0; font-size: 26rpx; color: #8a8178; }
.del-confirm { flex: 1; text-align: center; padding: 20rpx 0; font-size: 26rpx; color: #C41E3A; font-weight: 500; border-left: 1rpx solid #F2ECE1; }

.batch-bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1rpx solid #EDE7DC; padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; justify-content: space-between; z-index: 20; }
.batch-all { font-size: 28rpx; color: #C41E3A; }
.batch-del { display: flex; align-items: center; gap: 10rpx; background: #C41E3A; padding: 16rpx 40rpx; border-radius: 999rpx; }
.batch-del.disabled { opacity: 0.5; }
.batch-del-text { font-size: 28rpx; color: #fff; }
</style>
