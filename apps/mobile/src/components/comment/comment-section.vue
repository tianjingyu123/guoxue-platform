<script setup lang="ts">
/**
 * 统一评论区组合件 —— 页面接入的一站式入口
 * 用法（页面里）：
 *   <comment-section target-type="POST" :target-id="postId" :author-id="post?.author.id" />
 * 装配 comment-list + comment-input-bar：
 * - 回复：列表上抛 reply → 输入条进入「回复 @xx」态并弹键盘
 * - 发送：先乐观插入（顶级插列表顶部/回复插对应楼）+ 真连 POST /comment；
 *   成功后静默 refresh 换取落库真 id；失败移除乐观项、回填输入、toast 后端文案（审核/禁言口径）
 * - 底部自带占位垫片，避免内容被 fixed 输入条遮挡
 */
import { nextTick, ref, watch } from 'vue'
import CommentList from '@/components/comment/comment-list.vue'
import CommentInputBar from '@/components/comment/comment-input-bar.vue'
import { createComment, type CommentItem, type CommentTargetType } from '@/lib/comment-data'
import { getUserInfo, getToken } from '@/utils/storage'

interface Props {
  targetType: CommentTargetType
  targetId: string
  /** 内容作者 id（评论者命中显示金色「作者」标签） */
  authorId?: string
  theme?: 'light' | 'dark'
  /** true 时不渲染底部占位垫片（页面自己有底垫时避免双份空白，如文章页 .ad-bottom-pad） */
  noPad?: boolean
  /** 默认不常驻输入条，由页面入口或回复动作按需唤起 */
  deferredInput?: boolean
  /** 页面侧递增此信号，可稳定唤起延迟输入条（避免跨端组件 ref 差异） */
  openSignal?: number
}
const props = withDefaults(defineProps<Props>(), {
  authorId: '',
  theme: 'light',
  noPad: false,
  deferredInput: false,
  openSignal: 0,
})

const emit = defineEmits<{
  (e: 'count-change', total: number): void
  (e: 'sent', comment: CommentItem): void
}>()

const listRef = ref<{
  refresh: () => Promise<void> | void
  addOptimistic: (c: CommentItem) => void
  addOptimisticReply: (rootId: string, c: CommentItem) => void
  removeComment: (id: string) => void
} | null>(null)
const inputRef = ref<{ focus: () => void; clear: () => void; setText: (v: string) => void } | null>(null)

const replyTo = ref<{ id: string; nickname: string; rootId: string } | null>(null)
const sending = ref(false)
const inputVisible = ref(!props.deferredInput)

async function showInput() {
  inputVisible.value = true
  await nextTick()
  inputRef.value?.focus()
}

watch(
  () => props.openSignal,
  (value, previous) => {
    if (props.deferredInput && value !== previous) void showInput()
  },
)

function dismissInput() {
  if (sending.value) return
  replyTo.value = null
  inputVisible.value = false
}

async function onReply(p: { target: CommentItem; rootId: string }) {
  if (!getToken()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (p.target.id.startsWith('temp-')) return // 未落库的乐观评论还没有真 id，不可回复
  replyTo.value = { id: p.target.id, nickname: p.target.user.nickname, rootId: p.rootId }
  await showInput()
}

async function onSend(content: string) {
  if (sending.value) return
  if (!getToken()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  const target = replyTo.value
  const me = getUserInfo<{ id?: string | number; nickname?: string; avatar?: string }>()
  const temp: CommentItem = {
    id: `temp-${Date.now()}`,
    user: { id: String(me?.id ?? ''), nickname: me?.nickname || '我', avatar: me?.avatar || '' },
    content,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    isLiked: false,
    replies: [],
    ...(target ? { replyToName: target.nickname } : {}),
  }

  sending.value = true
  // 乐观上屏：回复进对应楼，顶级插列表顶部
  if (target) listRef.value?.addOptimisticReply(target.rootId, temp)
  else listRef.value?.addOptimistic(temp)
  inputRef.value?.clear()
  replyTo.value = null

  try {
    const real = await createComment(props.targetType, props.targetId, content, target?.id)
    // 真连成功：静默刷新换取落库真 id（refresh 非首载不闪骨架）
    await listRef.value?.refresh()
    emit('sent', real)
    if (props.deferredInput) inputVisible.value = false
  } catch (e) {
    // 失败回滚：移除乐观项 + 回填输入内容与回复态，toast 后端文案（含审核拒绝/禁言口径）
    listRef.value?.removeComment(temp.id)
    inputRef.value?.setText(content)
    replyTo.value = target
    uni.showToast({ title: (e as Error)?.message || '发送失败，请重试', icon: 'none' })
  } finally {
    sending.value = false
  }
}

/** 供页面手动刷新（如页面下拉刷新时联动）+ 聚焦输入框（头条式底栏「写评论」入口） */
defineExpose({
  refresh: () => listRef.value?.refresh(),
  focusInput: showInput,
})
</script>

<template>
  <view class="csec">
    <comment-list
      ref="listRef"
      :target-type="targetType"
      :target-id="targetId"
      :author-id="authorId"
      :theme="theme"
      @reply="onReply"
      @empty-tap="showInput"
      @count-change="(n) => emit('count-change', n)"
    />
    <!-- 垫片：给 fixed 输入条让位（含安全区）；页面自带底垫时传 no-pad 关掉 -->
    <view v-if="!noPad && inputVisible" class="csec__pad" />
    <comment-input-bar
      v-if="inputVisible"
      ref="inputRef"
      :theme="theme"
      :reply-to="replyTo"
      :sending="sending"
      :dismissible="deferredInput"
      @send="onSend"
      @cancel-reply="replyTo = null"
      @dismiss="dismissInput"
    >
      <!-- 透传页面级右侧动作区（头条式底栏图标排）·不传时输入条保持旧版样式 -->
      <template v-if="$slots['bar-actions']" #actions>
        <slot name="bar-actions" />
      </template>
    </comment-input-bar>
  </view>
</template>

<style scoped>
.csec__pad {
  height: calc(140rpx + constant(safe-area-inset-bottom));
  height: calc(140rpx + env(safe-area-inset-bottom));
}
</style>
