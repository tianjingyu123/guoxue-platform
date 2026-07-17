<script setup lang="ts">
/**
 * 统一评论列表容器
 * - 自带三态：loading 骨架（仅首载）/ 错误重试 / 空态「还没有评论，来抢沙发～」
 * - 点赞：本组件统一乐观更新 + 失败回滚（POST /interaction/like targetType=COMMENT 真 toggle）
 * - 点赞态补种：登录态下批量 GET /interaction/like/check（失败静默）
 * - 分页：顶级评论分页，「查看更多评论」追加；楼中楼随行全量
 * - 对外暴露：refresh() / addOptimistic(c) / addOptimisticReply(rootId, c) / removeComment(id)
 * - 回复按钮上抛 reply 事件，由父级（comment-section 或页面）决定输入交互
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import CommentItemCard from '@/components/comment/comment-item.vue'
import {
  fetchComments, toggleCommentLike, checkCommentsLiked,
  type CommentItem, type CommentTargetType,
} from '@/lib/comment-data'
import { getToken } from '@/utils/storage'

interface Props {
  targetType: CommentTargetType
  targetId: string
  /** 内容作者 id（透传 comment-item 显示金色「作者」标签） */
  authorId?: string
  theme?: 'light' | 'dark'
}
const props = withDefaults(defineProps<Props>(), { authorId: '', theme: 'light' })

const emit = defineEmits<{
  (e: 'reply', payload: { target: CommentItem; rootId: string }): void
  (e: 'count-change', total: number): void
}>()

const isDark = computed(() => props.theme === 'dark')

const items = ref<CommentItem[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')
const initialLoaded = ref(false)

const PAGE_SIZE = 20
const page = ref(1)
const loadingMore = ref(false)
const hasMore = computed(() => items.value.length < total.value)

async function load() {
  if (!props.targetId) return
  if (!initialLoaded.value) loading.value = true // 后续 refresh 静默，不闪骨架
  error.value = ''
  try {
    const r = await fetchComments(props.targetType, props.targetId, { page: 1, pageSize: PAGE_SIZE })
    items.value = r.items
    total.value = r.total
    page.value = 1
    initialLoaded.value = true
    emit('count-change', total.value)
    seedLiked(r.items) // 不 await：点赞态补种失败/慢绝不阻塞列表
  } catch (e) {
    if (!initialLoaded.value) error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const r = await fetchComments(props.targetType, props.targetId, { page: page.value + 1, pageSize: PAGE_SIZE })
    page.value += 1
    // 乐观插入窗口内可能与新页重复 → 按 id 去重后追加
    const seen = new Set(items.value.map((c) => c.id))
    const fresh = r.items.filter((c) => !seen.has(c.id))
    items.value.push(...fresh)
    total.value = r.total
    emit('count-change', total.value)
    seedLiked(fresh)
  } catch {
    uni.showToast({ title: '加载失败，请重试', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

/** 批量补种当前用户点赞态（仅登录态·失败静默） */
async function seedLiked(list: CommentItem[]) {
  if (!getToken()) return
  const ids: string[] = []
  for (const c of list) {
    if (c.id) ids.push(c.id)
    for (const r of c.replies) if (r.id) ids.push(r.id)
  }
  const liked = await checkCommentsLiked(ids)
  if (!liked.length) return
  const set = new Set(liked.map(String))
  for (const c of list) {
    if (set.has(c.id)) c.isLiked = true
    for (const r of c.replies) if (set.has(r.id)) r.isLiked = true
  }
}

// targetId 常由页面 onLoad 异步注入 → watch + immediate，注入后自动首载
watch(
  () => `${props.targetType}|${props.targetId}`,
  () => {
    if (props.targetId) {
      initialLoaded.value = false
      load()
    }
  },
  { immediate: true },
)

// ───── 点赞：乐观更新 + 失败回滚（防连点·以服务端 { liked } 校准） ─────
const likeActing: Record<string, boolean> = {}

function findComment(id: string, rootId: string): CommentItem | null {
  const root = items.value.find((c) => c.id === rootId)
  if (!root) return null
  if (root.id === id) return root
  return root.replies.find((r) => r.id === id) ?? null
}

async function onLike(p: { id: string; rootId: string }) {
  if (!getToken()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (p.id.startsWith('temp-')) return // 乐观未落库的临时评论不可点赞
  const c = findComment(p.id, p.rootId)
  if (!c || likeActing[p.id]) return
  likeActing[p.id] = true
  const prevLiked = c.isLiked
  const prevCount = c.likeCount
  c.isLiked = !prevLiked
  c.likeCount = Math.max(0, prevCount + (c.isLiked ? 1 : -1))
  try {
    const r = await toggleCommentLike(p.id)
    if (r && typeof r.liked === 'boolean' && r.liked !== c.isLiked) {
      // 服务端真实状态与乐观预期不一致（并发窗口）→ 以服务端为准校正
      c.isLiked = r.liked
      c.likeCount = Math.max(0, prevCount + (r.liked === prevLiked ? 0 : r.liked ? 1 : -1))
    }
  } catch {
    c.isLiked = prevLiked
    c.likeCount = prevCount
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    likeActing[p.id] = false
  }
}

// ───── 对外接口（父级组合件/页面用） ─────
function refresh() {
  return load()
}
/** 乐观插入一条顶级评论到列表顶部 */
function addOptimistic(c: CommentItem) {
  items.value.unshift(c)
  total.value += 1
  emit('count-change', total.value)
}
/** 乐观插入一条楼中楼回复到指定顶级评论 */
function addOptimisticReply(rootId: string, c: CommentItem) {
  const root = items.value.find((x) => x.id === rootId)
  if (root) root.replies.push(c)
}
/** 按 id 移除（顶级或楼中楼·乐观失败回滚用） */
function removeComment(id: string) {
  const idx = items.value.findIndex((c) => c.id === id)
  if (idx >= 0) {
    items.value.splice(idx, 1)
    total.value = Math.max(0, total.value - 1)
    emit('count-change', total.value)
    return
  }
  for (const c of items.value) {
    const ri = c.replies.findIndex((r) => r.id === id)
    if (ri >= 0) {
      c.replies.splice(ri, 1)
      return
    }
  }
}
defineExpose({ refresh, addOptimistic, addOptimisticReply, removeComment })
</script>

<template>
  <view class="cl" :class="{ 'cl--dark': isDark }">
    <!-- 骨架（仅首载） -->
    <view v-if="loading" class="cl__skeleton">
      <view v-for="i in 3" :key="i" class="cl__skel-row">
        <view class="cl__skel-avatar" />
        <view class="cl__skel-lines">
          <view class="cl__skel-line cl__skel-line--w40" />
          <view class="cl__skel-line" />
          <view class="cl__skel-line cl__skel-line--w70" />
        </view>
      </view>
    </view>

    <!-- 错误重试 -->
    <view v-else-if="error" class="cl__error">
      <text class="cl__error-txt">{{ error }}</text>
      <view class="cl__retry" @tap="refresh()"><text class="cl__retry-txt">重试</text></view>
    </view>

    <!-- 空态 -->
    <view v-else-if="items.length === 0" class="cl__empty">
      <app-icon name="message-circle" :size="72" :color="isDark ? 'rgba(255,255,255,0.18)' : '#d9d2c7'" />
      <text class="cl__empty-txt">还没有评论，来抢沙发～</text>
    </view>

    <!-- 列表 -->
    <template v-else>
      <comment-item-card
        v-for="c in items"
        :key="c.id"
        :comment="c"
        :author-id="authorId"
        :theme="theme"
        @reply="(p) => emit('reply', p)"
        @like="onLike"
      />
      <view v-if="hasMore" class="cl__more" @tap="loadMore">
        <text class="cl__more-txt">{{ loadingMore ? '加载中…' : `查看更多评论` }}</text>
      </view>
      <view v-else class="cl__end"><text class="cl__end-txt">— 到底啦 —</text></view>
    </template>
  </view>
</template>

<style scoped>
.cl { padding: 0 4rpx; }

/* 骨架（opacity 脉冲） */
.cl__skeleton { padding: 8rpx 0; }
.cl__skel-row { display: flex; gap: 20rpx; padding: 20rpx 0; animation: cl-pulse 1.4s ease-in-out infinite; }
.cl__skel-avatar { width: 64rpx; height: 64rpx; border-radius: 999rpx; background: #ece7df; flex-shrink: 0; }
.cl__skel-lines { flex: 1; display: flex; flex-direction: column; gap: 14rpx; padding-top: 6rpx; }
.cl__skel-line { height: 24rpx; border-radius: 8rpx; background: #ece7df; }
.cl__skel-line--w40 { width: 40%; }
.cl__skel-line--w70 { width: 70%; }
@keyframes cl-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* 错误 */
.cl__error { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding: 72rpx 0; }
.cl__error-txt { font-size: 26rpx; color: #999999; }
.cl__retry { padding: 14rpx 48rpx; border-radius: 999rpx; border: 1rpx solid #d9d2c7; }
.cl__retry-txt { font-size: 26rpx; color: #666666; }

/* 空态 */
.cl__empty { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 96rpx 0; }
.cl__empty-txt { font-size: 26rpx; color: #999999; }

/* 加载更多 / 到底 */
.cl__more { display: flex; justify-content: center; padding: 24rpx 0; }
.cl__more-txt { font-size: 24rpx; color: #576b95; padding: 12rpx 32rpx; }
.cl__end { display: flex; justify-content: center; padding: 32rpx 0 16rpx; }
.cl__end-txt { font-size: 22rpx; color: #c4beb4; }

/* ───── 深色主题 ───── */
.cl--dark .cl__skel-avatar,
.cl--dark .cl__skel-line { background: rgba(255, 255, 255, 0.08); }
.cl--dark .cl__error-txt { color: rgba(233, 228, 221, 0.55); }
.cl--dark .cl__retry { border-color: rgba(255, 255, 255, 0.22); }
.cl--dark .cl__retry-txt { color: rgba(233, 228, 221, 0.75); }
.cl--dark .cl__empty-txt { color: rgba(255, 255, 255, 0.55); }
.cl--dark .cl__more-txt { color: rgba(151, 178, 217, 0.9); }
.cl--dark .cl__end-txt { color: rgba(255, 255, 255, 0.25); }
</style>
