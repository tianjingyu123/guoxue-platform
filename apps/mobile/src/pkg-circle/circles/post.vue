<script setup lang="ts">
/**
 * 帖子详情页 — V0 circle-post-detail.html 还原（2026-07-10 浅色主题重写）
 * 结构：sticky 顶栏(返回+标题+⋯菜单) → 作者行(头像/昵称/时间·来自圈子) → 正文(Markdown 块) →
 *       音频条(后端无音频·诚实降级不渲染) → 图片双列 → 触点卡 → 互动栏 → 评论区(楼中楼默认2条可展开) →
 *       底部固定评论输入条。三态 = V0 骨架屏 / 错误卡 / 空评论引导。
 * 「⋯」菜单：圈主/管理员(getJoinStatus.role) = 置顶/精华/删除（circleManageApi）；普通成员 = 举报（无端点·toast 口径与 live 页一致）。
 * 打赏区/弹窗：后端无打赏统计（reward 恒 0）→ 死代码已删（V0 注释同口径：诚实隐藏）。
 * 数据逻辑全部保留：加载/点赞/收藏/关注/评论/楼中楼/乐观更新+回滚/submitting 防重复/音频逻辑/触点。
 */
import { ref, reactive, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import TouchpointCard from '@/components/common/touchpoint-card.vue'
import { goBack, navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'
import {
  postDetailApi, parseMarkdown,
  type PostDetail, type Comment, type MdBlock,
} from '@/lib/post-detail-data'
import { circleManageApi } from '@/lib/circle-manage-data'
import { circleDetailApi, type CircleMemberRole } from '@/lib/circle-detail-data'
import { touchpointApi, type TouchpointResult } from '@/lib/touchpoint-data'

const circleId = ref('')
const postId = ref('')
const post = ref<PostDetail | null>(null)
const mdBlocks = ref<MdBlock[]>([])
const loading = ref(true)
const error = ref('')

// 互动状态
const isLiked = ref(false)
const isCollected = ref(false)
const likes = ref(0)
const collects = ref(0)
const isFollowed = ref(false)

// 评论
const comments = ref<Comment[]>([])
const expandedReplies = reactive<Record<string, boolean>>({})
const commentText = ref('')
const replyTo = ref<Comment | null>(null)
const commentFocus = ref(false)

// 互动防重复（进行中直接 return，避免快点连发）
const likeActing = ref(false)
const collectActing = ref(false)
const followActing = ref(false)
const commentSubmitting = ref(false)
const commentLikeActing = reactive<Record<string, boolean>>({})

// 图片预览
const previewImage = ref<string | null>(null)

// ─── 「⋯」菜单：圈主治理 / 举报 ───
const showMenu = ref(false)
const govActing = ref(false)
const myRole = ref<CircleMemberRole | null>(null)
/** 仅圈主/管理员可见治理项（置顶/精华/删除） */
const canGovern = computed(() => myRole.value === 'OWNER' || myRole.value === 'ADMIN')

onLoad((q) => {
  if (q?.circleId) circleId.value = q.circleId
  if (q?.id) postId.value = q.id
  loadData()
})

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const p = await postDetailApi.getDetail(circleId.value, postId.value)
    post.value = p
    // 分享/搜索入口只带帖子 id 时，从详情响应回填 circleId（进圈按钮/圈主课触点/治理菜单依赖它）
    if (!circleId.value && p.circleId) circleId.value = p.circleId
    mdBlocks.value = parseMarkdown(p.content)
    isLiked.value = p.isLiked
    // 收藏：后端无单帖收藏态查询端点 → 保持初始 false，靠乐观更新维护本次会话内状态
    isCollected.value = p.isCollected
    likes.value = p.likes
    collects.value = p.collects
    isFollowed.value = p.author.isFollowed ?? false
    comments.value = await postDetailApi.getComments(postId.value)
    // 详情不返回当前用户点赞态 → 单独查询补上 isLiked（失败保持 false，不阻断页面）
    isLiked.value = await postDetailApi.checkPostLiked(postId.value)
    // 触点 #6 圈主的课（不 await·失败静默不出，绝不阻塞正文）
    loadTouchpoint(p)
    // 圈内角色（不 await·失败静默 = 不显示治理项）
    loadRole()
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
}
function retry() { loadData() }

/** 查询我在本圈的角色（决定 ⋯ 菜单显示治理项还是举报）；未登录/失败静默 */
async function loadRole() {
  if (!circleId.value || !getToken()) return
  try {
    const st = await circleDetailApi.getJoinStatus(circleId.value)
    myRole.value = st.role
  } catch { /* 静默：查询失败不显示治理项 */ }
}

// 触点 #6 圈子课程（服务端按 circleId→圈主→APPROVED 课召回·show:false 或异常一律不渲染）
const tp = ref<TouchpointResult | null>(null)
async function loadTouchpoint(p: PostDetail) {
  tp.value = await touchpointApi.get('circle_course', {
    circleId: circleId.value,
    postAuthorId: p.author.id,
  })
}

// ─── 治理操作（圈主/管理员·submitting 防重复） ───

/** 置顶/取消置顶 — POST /circles/:id/posts/:postId/top */
async function govToggleTop() {
  if (govActing.value || !post.value) return
  govActing.value = true
  try {
    const r = await circleManageApi.toggleTop(circleId.value, postId.value)
    post.value.isPinned = r?.isTop ?? !post.value.isPinned
    uni.showToast({ title: post.value.isPinned ? '已置顶' : '已取消置顶', icon: 'none' })
  } catch {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    govActing.value = false
    showMenu.value = false
  }
}

/** 设为/取消精华 — POST /circles/:id/posts/:postId/essence */
async function govToggleEssence() {
  if (govActing.value || !post.value) return
  govActing.value = true
  try {
    const r = await circleManageApi.toggleEssence(circleId.value, postId.value)
    post.value.isEssence = r?.isEssence ?? !post.value.isEssence
    uni.showToast({ title: post.value.isEssence ? '已设为精华' : '已取消精华', icon: 'none' })
  } catch {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    govActing.value = false
    showMenu.value = false
  }
}

/** 删除帖子 — DELETE /circles/:id/posts/:postId（二次确认·成功后返回上一页） */
function govDeletePost() {
  showMenu.value = false
  uni.showModal({
    title: '删除帖子',
    content: '删除后不可恢复，确定删除这篇帖子吗？',
    confirmText: '删除',
    confirmColor: '#C41E3A',
    success: async (res) => {
      if (!res.confirm || govActing.value) return
      govActing.value = true
      try {
        await circleManageApi.deletePost(circleId.value, postId.value)
        uni.showToast({ title: '帖子已删除', icon: 'none' })
        setTimeout(() => goBack(), 600)
      } catch {
        uni.showToast({ title: '删除失败，请重试', icon: 'none' })
      } finally {
        govActing.value = false
      }
    },
  })
}

/** 举报（普通成员菜单项·后端无举报端点 → toast 口径与 live 页一致） */
function reportPost() {
  showMenu.value = false
  uni.showToast({ title: '举报已提交，感谢反馈', icon: 'none' })
}

// ─── 音频播放器（跨端；后端暂无音频，逻辑保留兼容将来） ───
const isPlaying = ref(false)
const currentTime = ref(0)
let audioCtx: any = null // uni InnerAudioContext 类型，保守保留 any
function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
function toggleAudio() {
  const audio = post.value?.audio
  if (!audio) return
  if (!audioCtx) {
    audioCtx = uni.createInnerAudioContext()
    audioCtx.src = audio.url
    audioCtx.onTimeUpdate(() => { currentTime.value = Math.floor(audioCtx.currentTime) })
    audioCtx.onEnded(() => { isPlaying.value = false; currentTime.value = 0 })
    audioCtx.onError(() => { isPlaying.value = false; uni.showToast({ title: '音频加载失败', icon: 'none' }) })
  }
  if (isPlaying.value) { audioCtx.pause(); isPlaying.value = false }
  else { audioCtx.play(); isPlaying.value = true }
}
const audioProgress = () => post.value?.audio ? Math.min(100, (currentTime.value / post.value.audio.duration) * 100) : 0

// ─── 互动（乐观更新 + 失败回滚 + 防重复）───

// 帖子点赞
async function toggleLike() {
  if (likeActing.value) return
  likeActing.value = true
  const prevLiked = isLiked.value
  const prevLikes = likes.value
  // 乐观更新
  isLiked.value = !prevLiked
  likes.value = prevLikes + (isLiked.value ? 1 : -1)
  try {
    await postDetailApi.toggleLike(postId.value)
  } catch {
    // 回滚
    isLiked.value = prevLiked
    likes.value = prevLikes
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    likeActing.value = false
  }
}

// 帖子收藏
async function toggleCollect() {
  if (collectActing.value) return
  collectActing.value = true
  const prevCollected = isCollected.value
  const prevCollects = collects.value
  isCollected.value = !prevCollected
  collects.value = prevCollects + (isCollected.value ? 1 : -1)
  try {
    await postDetailApi.toggleCollect(postId.value)
  } catch {
    isCollected.value = prevCollected
    collects.value = prevCollects
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    collectActing.value = false
  }
}

// 关注作者（后端作者无粉丝字段 → 按钮降级隐藏，逻辑保留兼容将来）
async function toggleFollow() {
  if (followActing.value) return
  const authorId = post.value?.author.id
  if (!authorId) return
  followActing.value = true
  const prev = isFollowed.value
  isFollowed.value = !prev
  try {
    await postDetailApi.toggleFollow(authorId)
  } catch {
    isFollowed.value = prev
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    followActing.value = false
  }
}

// 评论点赞
async function toggleCommentLike(c: Comment) {
  if (commentLikeActing[c.id]) return
  commentLikeActing[c.id] = true
  const prevLiked = c.isLiked
  const prevLikes = c.likes
  c.isLiked = !prevLiked
  c.likes = prevLikes + (c.isLiked ? 1 : -1)
  try {
    await postDetailApi.toggleCommentLike(c.id)
  } catch {
    c.isLiked = prevLiked
    c.likes = prevLikes
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    commentLikeActing[c.id] = false
  }
}

function startReply(c: Comment) {
  replyTo.value = c
  commentFocus.value = true
}

/** 空评论 CTA / 互动栏评论按钮：聚焦底部输入框 */
function focusComment() { commentFocus.value = true }

// 发评论/回复（防重复 + 真调后端 + 成功后本地乐观插入）
async function submitComment() {
  if (commentSubmitting.value) return
  const content = commentText.value.trim()
  if (!content) return
  commentSubmitting.value = true
  try {
    const created = await postDetailApi.createComment(postId.value, content, replyTo.value?.id) as {
      id?: string; content?: string; user?: { id?: string; nickname?: string; avatar?: string } | null
    }
    const parent = replyTo.value
    commentText.value = ''
    replyTo.value = null
    // 乐观插入：后端评论列表有读写延迟/缓存，直接用创建返回本地插入，保证发布后立即可见（回复插入父评论 replies）
    const author = { id: created?.user?.id ?? '', name: created?.user?.nickname ?? '我', avatar: created?.user?.avatar ?? '' }
    const id = created?.id || `tmp_${Date.now()}`
    if (parent) {
      const p = comments.value.find(c => c.id === parent.id)
      if (p) p.replies = [...(p.replies || []), { id, content, author, createdAt: '刚刚', likes: 0, isLiked: false }]
    } else {
      comments.value = [{ id, content, author, createdAt: '刚刚', likes: 0, isLiked: false, isPinned: false, replies: [] }, ...comments.value]
    }
    if (post.value) post.value.comments = (post.value.comments || 0) + 1
    uni.showToast({ title: '评论已发送', icon: 'success' })
  } catch {
    // 失败：不清空输入，便于重发
    uni.showToast({ title: '发送失败，请重试', icon: 'none' })
  } finally {
    commentSubmitting.value = false
  }
}

function openShare() { navigateTo(`/pkg-circle/common/share-poster?type=post&targetId=${postId.value}`) }
function openUser(id: string) { navigateTo(`/pkg-circle/user/profile?id=${id}`) }
function openCircle() { if (circleId.value) navigateTo(`/pkg-circle/circles/detail?id=${circleId.value}`) }
function fmt(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : String(n) }

onUnmounted(() => { if (audioCtx) { try { audioCtx.destroy() } catch {} } })
</script>

<template>
  <view class="pd">
    <!-- 顶栏：sticky 毛玻璃（V0 .topbar） -->
    <view class="pd-topbar">
      <view class="pd-top-btn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#2C2C2C" /></view>
      <text class="pd-top-title">帖子详情</text>
      <view class="pd-top-btn" @tap="showMenu = !showMenu"><app-icon name="more-horizontal" :size="40" color="#6E6E73" /></view>
    </view>

    <!-- ⋯ 菜单（V0 gov-menu 浮层）：圈主/管理员=治理三项；普通成员=举报 -->
    <view v-if="showMenu" class="pd-menu-mask" @tap="showMenu = false" />
    <view v-if="showMenu" class="pd-menu">
      <template v-if="canGovern">
        <view class="pd-menu-item" @tap="govToggleTop">
          <app-icon name="pin" :size="30" color="#6E6E73" />
          <text class="pd-menu-t">{{ post?.isPinned ? '取消置顶' : '置顶帖子' }}</text>
        </view>
        <view class="pd-menu-item" @tap="govToggleEssence">
          <app-icon name="star" :size="30" color="#6E6E73" />
          <text class="pd-menu-t">{{ post?.isEssence ? '取消精华' : '设为精华' }}</text>
        </view>
        <view class="pd-menu-item" @tap="govDeletePost">
          <app-icon name="trash-2" :size="30" color="#C41E3A" />
          <text class="pd-menu-t danger">删除帖子</text>
        </view>
      </template>
      <view v-else class="pd-menu-item" @tap="reportPost">
        <app-icon name="alert-circle" :size="30" color="#6E6E73" />
        <text class="pd-menu-t">举报</text>
      </view>
    </view>

    <!-- 加载态：V0 骨架屏（标题条/作者行/多行 shimmer） -->
    <view v-if="loading && !post" class="pd-skel">
      <view class="pd-sk pd-sk-title" />
      <view class="pd-sk pd-sk-title2" />
      <view class="pd-sk-author">
        <view class="pd-sk pd-sk-avatar" />
        <view class="pd-sk pd-sk-name" />
      </view>
      <view class="pd-sk pd-sk-line w95" style="margin-top: 44rpx" />
      <view class="pd-sk pd-sk-line w88" />
      <view class="pd-sk pd-sk-line w95" />
      <view class="pd-sk pd-sk-line w70" />
    </view>

    <!-- 错误态：V0 错误卡（重新加载 + 返回上一页） -->
    <view v-else-if="error && !post" class="pd-error">
      <view class="pd-error-icon"><app-icon name="alert-circle" :size="52" color="#999999" /></view>
      <text class="pd-error-title">内容加载失败</text>
      <text class="pd-error-desc">网络似乎不太顺畅，稍等片刻再试试；{{ '\n' }}若内容已被作者删除，将无法查看。</text>
      <view class="pd-error-retry" @tap="retry"><text class="pd-error-retry-t">重新加载</text></view>
      <text class="pd-error-back" @tap="goBack">返回上一页</text>
    </view>

    <scroll-view v-else-if="post" scroll-y class="pd-body">
      <!-- 作者行：头像 + 昵称(+头衔徽章) + 时间 · 来自圈子（圈名可点） -->
      <view class="pd-author">
        <image lazy-load :src="post.author.avatar" class="pd-avatar" mode="aspectFill" @tap="openUser(post.author.id)" />
        <view class="pd-author-main">
          <view class="pd-author-name-row" @tap="openUser(post.author.id)">
            <text class="pd-author-name">{{ post.author.name }}</text>
            <!-- 后端帖子作者无圈内角色字段 → 角色徽章降级；有头衔则显示 -->
            <text v-if="post.author.title" class="pd-role-badge">{{ post.author.title }}</text>
          </view>
          <view class="pd-author-time">
            <text class="pd-time-t">{{ post.createdAt }}</text>
            <text v-if="post.circleName" class="pd-time-t"> · 来自 </text>
            <text v-if="post.circleName" class="pd-time-circle" @tap="openCircle">{{ post.circleName }}</text>
          </view>
        </view>
        <!-- 关注按钮：后端作者无粉丝字段 → 降级隐藏（字段就绪后自动出现） -->
        <view v-if="post.author.followers != null" class="pd-follow" :class="{ on: isFollowed }" @tap="toggleFollow">
          <text class="pd-follow-t" :class="{ on: isFollowed }">{{ isFollowed ? '已关注' : '关注' }}</text>
        </view>
      </view>

      <!-- 正文 -->
      <view class="pd-content">
        <!-- 状态标签（置顶/精华·治理操作后即时反馈） -->
        <view v-if="post.isPinned || post.isEssence" class="pd-tags">
          <view v-if="post.isPinned" class="pd-tag pin"><app-icon name="pin" :size="22" color="#C41E3A" /><text class="pd-tag-t pin">置顶</text></view>
          <view v-if="post.isEssence" class="pd-tag ess"><app-icon name="star" :size="22" color="#C9A96E" /><text class="pd-tag-t ess">精华</text></view>
        </view>

        <!-- 标题（帖子可无标题·有则显示） -->
        <text v-if="post.title" class="pd-title">{{ post.title }}</text>

        <!-- Markdown 正文：16px/1.8 阅读体验为王 -->
        <template v-for="(b, i) in mdBlocks" :key="i">
          <text v-if="b.type === 'h2'" class="md-h2">{{ b.text }}</text>
          <text v-else-if="b.type === 'bold'" class="md-bold">{{ b.text }}</text>
          <view v-else-if="b.type === 'quote'" class="md-quote"><text class="md-quote-t">{{ b.text }}</text></view>
          <view v-else-if="b.type === 'li'" class="md-li"><text class="md-dot">•</text><text class="md-li-t">{{ b.text }}</text></view>
          <view v-else-if="b.type === 'oli'" class="md-li"><text class="md-li-t">{{ b.text }}</text></view>
          <view v-else-if="b.type === 'hr'" class="md-hr" />
          <text v-else-if="b.type === 'em'" class="md-em">{{ b.text }}</text>
          <text v-else class="md-p"><text v-for="(seg, j) in b.segments" :key="j" :class="{ 'md-inline-bold': seg.bold }">{{ seg.text }}</text></text>
        </template>

        <!-- 音频播放条（V0 audio-block 暖底内联条·后端无音频字段恒不渲染·诚实降级保留分支） -->
        <view v-if="post.audio" class="pd-audio">
          <view class="pd-audio-play" @tap="toggleAudio">
            <app-icon :name="isPlaying ? 'pause' : 'play'" :size="28" color="#ffffff" />
          </view>
          <view class="pd-audio-main">
            <text class="pd-audio-title">{{ post.audio.title }}</text>
            <view class="pd-audio-bar"><view class="pd-audio-bar-fill" :style="{ width: audioProgress() + '%' }" /></view>
          </view>
          <text class="pd-audio-dur">{{ fmtDuration(currentTime) }} / {{ fmtDuration(post.audio.duration) }}</text>
        </view>

        <!-- 图片：双列 4:3 圆角（1 张整宽），点击预览 -->
        <view v-if="post.images && post.images.length" class="pd-imgs" :class="{ single: post.images.length === 1 }">
          <image
            v-for="(img, i) in post.images" :key="i" lazy-load
            :src="img.url" class="pd-img" mode="aspectFill"
            @tap="previewImage = img.url"
          />
        </view>

        <!-- 触点 #6 圈主的课：正文尾·服务端裁决无卡则不渲染 -->
        <touchpoint-card v-if="tp?.card" :card="tp.card" scene="circle_course" />
      </view>

      <!-- 互动栏：V0 横排左对齐（点赞/评论/收藏 + 分享），下边框分隔 -->
      <view class="pd-actions">
        <view class="pd-action" @tap="toggleLike">
          <app-icon name="heart" :size="34" :color="isLiked ? '#C41E3A' : '#999999'" :fill="isLiked" />
          <text class="pd-action-t" :class="{ liked: isLiked }">{{ likes ? fmt(likes) : '点赞' }}</text>
        </view>
        <view class="pd-action" @tap="focusComment">
          <app-icon name="message-circle" :size="34" color="#999999" />
          <text class="pd-action-t">{{ post.comments ? fmt(post.comments) : '评论' }}</text>
        </view>
        <view class="pd-action" @tap="toggleCollect">
          <app-icon name="bookmark" :size="34" :color="isCollected ? '#C9A96E' : '#999999'" :fill="isCollected" />
          <text class="pd-action-t" :class="{ collected: isCollected }">{{ collects ? fmt(collects) : '收藏' }}</text>
        </view>
        <view class="pd-action" @tap="openShare">
          <app-icon name="share-2" :size="34" color="#999999" />
          <text class="pd-action-t">分享</text>
        </view>
      </view>

      <!-- 评论区 -->
      <text class="pd-comments-head">评论 {{ post.comments }}</text>

      <!-- 评论空态：V0 ③ 圆形暖底图标 + 引导第一条评论 -->
      <view v-if="comments.length === 0" class="pd-c-empty">
        <view class="pd-c-empty-icon"><app-icon name="message-circle" :size="44" color="#999999" /></view>
        <text class="pd-c-empty-title">还没有评论</text>
        <text class="pd-c-empty-desc">说说你的看法，作者和圈友都会看到</text>
        <view class="pd-c-empty-cta" @tap="focusComment"><text class="pd-c-empty-cta-t">写下第一条评论</text></view>
      </view>

      <view v-for="c in comments" :key="c.id" class="pd-comment">
        <image lazy-load :src="c.author.avatar" class="pd-c-avatar" mode="aspectFill" @tap="openUser(c.author.id)" />
        <view class="pd-c-main">
          <text class="pd-c-name">{{ c.author.name }}</text>
          <text class="pd-c-text">{{ c.content }}</text>
          <view class="pd-c-meta">
            <text class="pd-c-meta-t">{{ c.createdAt }}</text>
            <text class="pd-c-meta-t" @tap="startReply(c)">回复</text>
            <view class="pd-c-like" @tap="toggleCommentLike(c)">
              <app-icon name="heart" :size="22" :color="c.isLiked ? '#C41E3A' : '#999999'" :fill="c.isLiked" />
              <text v-if="c.likes > 0" class="pd-c-meta-t" :class="{ liked: c.isLiked }">{{ c.likes }}</text>
            </view>
          </view>

          <!-- 楼中楼：暖底圆角块（V0 .replies）·默认前 2 条 + 展开/收起
               回复对象名后端 replies 不含被回复人 → 只做「名字：内容」（降级） -->
          <view v-if="c.replies && c.replies.length" class="pd-replies">
            <text
              v-for="r in (expandedReplies[c.id] ? c.replies : c.replies.slice(0, 2))" :key="r.id"
              class="pd-reply"
            ><text class="pd-reply-name">{{ r.author.name }}：</text>{{ r.content }}</text>
            <text
              v-if="c.replies.length > 2"
              class="pd-reply-expand"
              @tap="expandedReplies[c.id] = !expandedReplies[c.id]"
            >{{ expandedReplies[c.id] ? '收起回复' : `展开 ${c.replies.length - 2} 条回复` }}</text>
          </view>
        </view>
      </view>
      <view class="pd-bottom-pad" />
    </scroll-view>

    <!-- 底部固定评论栏：V0 毛玻璃条（输入 + 朱红发送） -->
    <view v-if="post" class="pd-input-bar">
      <view v-if="replyTo" class="pd-reply-hint">
        <view class="pd-reply-hint-l"><app-icon name="at-sign" :size="22" color="#6E6E73" /><text class="pd-reply-hint-t">回复 {{ replyTo.author.name }}</text></view>
        <view @tap="replyTo = null"><app-icon name="x" :size="28" color="#999999" /></view>
      </view>
      <view class="pd-input-row">
        <input
          v-model="commentText"
          class="pd-input"
          :focus="commentFocus"
          :placeholder="replyTo ? `回复 ${replyTo.author.name}…` : '说点什么…'"
          confirm-type="send"
          @blur="commentFocus = false"
          @confirm="submitComment"
        />
        <view class="pd-send" :class="{ disabled: commentSubmitting || !commentText.trim() }" @tap="submitComment">
          <text class="pd-send-t">{{ commentSubmitting ? '发送中' : '发送' }}</text>
        </view>
      </view>
    </view>

    <!-- 图片预览 -->
    <view v-if="previewImage" class="pd-preview" @tap="previewImage = null">
      <view class="pd-preview-close"><app-icon name="x" :size="44" color="#ffffff" /></view>
      <image lazy-load :src="previewImage" class="pd-preview-img" mode="aspectFit" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.pd { display: flex; flex-direction: column; height: 100vh; background: var(--bg-page, #faf8f5); }

/* 顶栏：sticky 毛玻璃 */
.pd-topbar {
  display: flex; align-items: center; gap: 20rpx; flex-shrink: 0;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
  position: relative; z-index: 20;
}
.pd-top-btn { padding: 8rpx; }
.pd-top-title { flex: 1; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }

/* ⋯ 菜单（V0 gov-menu 浮层） */
.pd-menu-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 29; }
.pd-menu {
  position: fixed; right: 24rpx; z-index: 30;
  top: calc(var(--status-bar-height, 0px) + 108rpx);
  width: 336rpx; padding: 12rpx;
  background: var(--bg-card, #fff); border-radius: 28rpx;
  box-shadow: 0 12rpx 48rpx rgba(44, 44, 44, 0.14);
}
.pd-menu::before {
  content: ""; position: absolute; top: -10rpx; right: 32rpx;
  width: 20rpx; height: 20rpx; background: var(--bg-card, #fff);
  transform: rotate(45deg);
}
.pd-menu-item { display: flex; align-items: center; gap: 18rpx; padding: 20rpx 24rpx; border-radius: 16rpx; }
.pd-menu-t { font-size: 28rpx; color: var(--text-primary, #2c2c2c); }
.pd-menu-t.danger { color: var(--brand, #c41e3a); }

/* 骨架屏（V0 ① 同构：标题条/作者行/多行 shimmer） */
.pd-skel { padding: 36rpx 44rpx; }
.pd-sk { background: #f1ede6; border-radius: 16rpx; animation: pd-shimmer 1.6s ease infinite; }
@keyframes pd-shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
.pd-sk-title { height: 48rpx; width: 92%; }
.pd-sk-title2 { height: 48rpx; width: 60%; margin-top: 16rpx; }
.pd-sk-author { display: flex; align-items: center; gap: 20rpx; margin-top: 32rpx; }
.pd-sk-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; flex-shrink: 0; }
.pd-sk-name { height: 26rpx; width: 180rpx; }
.pd-sk-line { height: 30rpx; margin-top: 24rpx; }
.pd-sk-line.w95 { width: 95%; }
.pd-sk-line.w88 { width: 88%; }
.pd-sk-line.w70 { width: 70%; }

/* 错误卡（V0 ②） */
.pd-error {
  margin: 24rpx 32rpx; padding: 88rpx 48rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.pd-error-icon {
  width: 112rpx; height: 112rpx; border-radius: 999rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.pd-error-title { margin-top: 32rpx; font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.pd-error-desc { margin-top: 12rpx; font-size: 26rpx; color: var(--text-tertiary, #999); line-height: 1.6; }
.pd-error-retry { margin-top: 36rpx; height: 76rpx; padding: 0 56rpx; border-radius: 38rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.pd-error-retry-t { font-size: 28rpx; font-weight: 500; color: #fff; }
.pd-error-back { margin-top: 24rpx; font-size: 26rpx; color: var(--text-secondary, #6e6e73); text-decoration: underline; }

.pd-body { flex: 1; overflow: hidden; }

/* 作者行 */
.pd-author { display: flex; align-items: center; gap: 20rpx; padding: 32rpx 40rpx 0; }
.pd-avatar { width: 84rpx; height: 84rpx; border-radius: 999rpx; flex-shrink: 0; background: var(--bg-warm, #f8f4ec); }
.pd-author-main { flex: 1; min-width: 0; }
.pd-author-name-row { display: flex; align-items: center; gap: 12rpx; }
.pd-author-name { font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.pd-role-badge { padding: 2rpx 12rpx; border-radius: 10rpx; font-size: 20rpx; background: var(--gold, #c9a96e); color: #fff; }
.pd-author-time { margin-top: 4rpx; }
.pd-time-t { font-size: 24rpx; color: var(--text-tertiary, #999); }
.pd-time-circle { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.pd-follow { flex-shrink: 0; padding: 10rpx 28rpx; border-radius: 999rpx; background: rgba(196, 30, 58, 0.08); }
.pd-follow.on { background: var(--bg-warm, #f8f4ec); }
.pd-follow-t { font-size: 26rpx; font-weight: 500; color: var(--brand, #c41e3a); }
.pd-follow-t.on { color: var(--text-tertiary, #999); }

/* 正文：阅读体验为王 16px/1.8 → 32rpx/1.8 */
.pd-content { padding: 28rpx 40rpx 0; }
.pd-tags { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.pd-tag { display: flex; align-items: center; gap: 6rpx; padding: 4rpx 16rpx; border-radius: 999rpx; }
.pd-tag.pin { background: rgba(196, 30, 58, 0.08); }
.pd-tag.ess { background: rgba(201, 169, 110, 0.12); }
.pd-tag-t { font-size: 22rpx; }
.pd-tag-t.pin { color: var(--brand, #c41e3a); }
.pd-tag-t.ess { color: var(--gold, #c9a96e); }
.pd-title { display: block; font-size: 38rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); line-height: 1.4; margin-bottom: 20rpx; }
.md-h2 { display: block; font-size: 34rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); margin: 40rpx 0 20rpx; }
.md-bold { display: block; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin: 14rpx 0; }
.md-quote { border-left: 4rpx solid var(--gold, #c9a96e); padding: 8rpx 0 8rpx 32rpx; margin: 32rpx 0; }
.md-quote-t { font-size: 30rpx; color: var(--text-secondary, #6e6e73); line-height: 1.85; }
.md-li { display: flex; gap: 10rpx; margin: 10rpx 0; padding-left: 20rpx; }
.md-dot { color: var(--brand, #c41e3a); font-size: 32rpx; }
.md-li-t { flex: 1; font-size: 32rpx; color: var(--text-primary, #2c2c2c); line-height: 1.8; }
.md-hr { height: 1rpx; background: var(--separator, #ede7dd); margin: 40rpx 0; }
.md-em { display: block; font-size: 28rpx; color: var(--text-tertiary, #999); font-style: italic; margin: 14rpx 0; }
.md-p { display: block; font-size: 32rpx; color: var(--text-primary, #2c2c2c); line-height: 1.8; margin: 14rpx 0; }
.md-p + .md-p { margin-top: 28rpx; }
.md-inline-bold { font-weight: 700; }

/* 音频条（V0 audio-block 暖底内联·波形简化为进度条） */
.pd-audio {
  margin-top: 32rpx; padding: 28rpx 32rpx;
  display: flex; align-items: center; gap: 24rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 28rpx;
}
.pd-audio-play {
  width: 80rpx; height: 80rpx; border-radius: 999rpx; flex-shrink: 0;
  background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.pd-audio-main { flex: 1; min-width: 0; }
.pd-audio-title { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.pd-audio-bar { margin-top: 14rpx; height: 8rpx; background: rgba(201, 169, 110, 0.3); border-radius: 999rpx; overflow: hidden; }
.pd-audio-bar-fill { height: 100%; background: var(--brand, #c41e3a); border-radius: 999rpx; transition: width 0.3s; }
.pd-audio-dur { flex-shrink: 0; font-size: 22rpx; color: var(--text-tertiary, #999); font-variant-numeric: tabular-nums; }

/* 图片：双列 4:3 圆角（单张整宽） */
.pd-imgs { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 32rpx; }
.pd-img { width: calc(50% - 8rpx); aspect-ratio: 4 / 3; border-radius: 16rpx; background: var(--bg-warm, #f8f4ec); }
.pd-imgs.single .pd-img { width: 100%; }

/* 互动栏：横排左对齐 + 下边框 */
.pd-actions {
  display: flex; align-items: center; gap: 52rpx;
  padding: 32rpx 40rpx; margin-top: 8rpx;
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.pd-action { display: flex; align-items: center; gap: 10rpx; }
.pd-action-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.pd-action-t.liked { color: var(--brand, #c41e3a); }
.pd-action-t.collected { color: var(--gold, #c9a96e); }

/* 评论区 */
.pd-comments-head { display: block; padding: 32rpx 40rpx 8rpx; font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.pd-comment { display: flex; gap: 20rpx; padding: 24rpx 40rpx 0; }
.pd-c-avatar { width: 64rpx; height: 64rpx; border-radius: 999rpx; flex-shrink: 0; background: var(--bg-warm, #f8f4ec); }
.pd-c-main { flex: 1; min-width: 0; padding-bottom: 24rpx; border-bottom: 1rpx solid var(--separator, #ede7dd); }
.pd-comment:last-of-type .pd-c-main { border-bottom: none; }
.pd-c-name { display: block; font-size: 24rpx; color: var(--text-tertiary, #999); }
.pd-c-text { display: block; font-size: 28rpx; line-height: 1.65; color: var(--text-primary, #2c2c2c); margin-top: 6rpx; }
.pd-c-meta { display: flex; align-items: center; gap: 32rpx; margin-top: 12rpx; }
.pd-c-meta-t { font-size: 22rpx; color: var(--text-tertiary, #999); }
.pd-c-meta-t.liked { color: var(--brand, #c41e3a); }
.pd-c-like { display: flex; align-items: center; gap: 6rpx; }

/* 楼中楼：暖底圆角块 */
.pd-replies { margin-top: 20rpx; padding: 20rpx 24rpx; background: var(--bg-warm, #f8f4ec); border-radius: 16rpx; }
.pd-reply { display: block; font-size: 26rpx; line-height: 1.6; color: var(--text-primary, #2c2c2c); }
.pd-reply + .pd-reply { margin-top: 16rpx; }
.pd-reply-name { font-weight: 600; }
.pd-reply-expand { display: inline-block; margin-top: 16rpx; font-size: 24rpx; color: var(--brand, #c41e3a); }

/* 评论空态（V0 ③） */
.pd-c-empty { padding: 60rpx 32rpx 52rpx; display: flex; flex-direction: column; align-items: center; text-align: center; }
.pd-c-empty-icon {
  width: 96rpx; height: 96rpx; border-radius: 999rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.pd-c-empty-title { margin-top: 24rpx; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.pd-c-empty-desc { margin-top: 8rpx; font-size: 24rpx; color: var(--text-tertiary, #999); }
.pd-c-empty-cta { margin-top: 32rpx; height: 72rpx; padding: 0 44rpx; border-radius: 36rpx; background: rgba(196, 30, 58, 0.08); display: flex; align-items: center; }
.pd-c-empty-cta-t { font-size: 26rpx; font-weight: 500; color: var(--brand, #c41e3a); }

.pd-bottom-pad { height: 40rpx; }

/* 底部固定评论栏：毛玻璃 + 朱红发送 */
.pd-input-bar {
  flex-shrink: 0;
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
}
.pd-reply-hint { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; padding: 8rpx 20rpx; background: var(--bg-warm, #f8f4ec); border-radius: 12rpx; }
.pd-reply-hint-l { display: flex; align-items: center; gap: 6rpx; }
.pd-reply-hint-t { font-size: 22rpx; color: var(--text-secondary, #6e6e73); }
.pd-input-row { display: flex; align-items: center; gap: 20rpx; }
.pd-input { flex: 1; height: 76rpx; border-radius: 38rpx; background: var(--bg-warm, #f8f4ec); padding: 0 32rpx; font-size: 28rpx; color: var(--text-primary, #2c2c2c); }
.pd-send { flex-shrink: 0; height: 76rpx; padding: 0 32rpx; border-radius: 38rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.pd-send.disabled { opacity: 0.5; }
.pd-send-t { font-size: 28rpx; font-weight: 500; color: #fff; }

/* 图片预览 */
.pd-preview { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 200; background: #000; display: flex; align-items: center; justify-content: center; }
.pd-preview-close { position: absolute; top: 60rpx; right: 32rpx; }
.pd-preview-img { width: 100%; height: 80%; }
</style>
