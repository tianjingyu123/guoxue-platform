<script setup lang="ts">
/**
 * 帖子详情页 — V0 circle-post-detail.html 还原（2026-07-10 浅色主题重写）
 * 结构：sticky 顶栏(返回+标题+⋯菜单) → 作者行(头像/昵称/时间·来自圈子) → 正文(Markdown 块) →
 *       音频条(后端无音频·诚实降级不渲染) → 图片双列 → 触点卡 → 互动栏 → 评论区。
 *       三态 = V0 骨架屏 / 错误卡（评论区三态由统一组件自带）。
 * 评论区 = 统一 CommentSection 组件（列表+吸底输入条+乐观更新+楼中楼一站式，自写评论区已删）。
 * 「⋯」菜单：圈主/管理员(getJoinStatus.role) = 置顶/精华/删除（circleManageApi）；作者本人 = 删除（后端放行作者删帖）；其他成员 = 举报（gotoReport 真提交）。
 * 打赏区/弹窗：后端无打赏统计（reward 恒 0）→ 死代码已删（V0 注释同口径：诚实隐藏）。
 */
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import TouchpointCard from '@/components/common/touchpoint-card.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import CommentSection from '@/components/comment/comment-section.vue'
import { goBack, navigateTo } from '@/utils/router'
import { gotoReport } from '@/lib/report-data'
import { getToken, getUserInfo } from '@/utils/storage'
import {
  postDetailApi, parseMarkdown,
  type PostDetail, type MdBlock,
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

// 互动防重复（进行中直接 return，避免快点连发）
const likeActing = ref(false)
const collectActing = ref(false)
const followActing = ref(false)

// 图片预览：原生 uni.previewImage（可左右滑切换/双指缩放·替换自写单图遮罩）
function previewPostImages(current: number) {
  const images = post.value?.images || []
  const urls = images.map((im) => im.url).filter(Boolean)
  if (!urls.length) return
  // current 是原始 images 下标；过滤空 url 后下标会错位，故用点击项自身的 url 定位（uni.previewImage 的 current 支持传 url）
  const clicked = images[current]?.url
  uni.previewImage({ urls, current: clicked && urls.includes(clicked) ? clicked : urls[0] })
}

// ─── 「⋯」菜单：圈主治理 / 举报 ───
const showMenu = ref(false)
const govActing = ref(false)
const myRole = ref<CircleMemberRole | null>(null)
/** 仅圈主/管理员可见治理项（置顶/精华/删除） */
const canGovern = computed(() => myRole.value === 'OWNER' || myRole.value === 'ADMIN')
/**
 * 作者本人（非治理角色）：菜单显示「删除」并隐藏「举报」（不给用户举报自己）。
 * 删除复用 govDeletePost（DELETE /circles/:id/posts/:postId）——已核后端
 * circle-post.service.deletePost：post.userId === 当前用户直接放行，非作者才查治理权限，
 * 无需另设普通删除端点。
 */
const myUserId = String(getUserInfo<{ id?: string | number }>()?.id ?? '')
const isAuthor = computed(() => !!myUserId && String(post.value?.author?.id || '') === myUserId)

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
    // 评论列表由统一 CommentSection 组件自行加载（含三态/分页/点赞态补种）
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

/**
 * 举报（普通成员菜单项）
 * 🔴 原实现是假 toast「举报已提交，感谢反馈」—— 骗用户说提交了，实际一个请求都不发。
 *    注释里写的「后端无举报端点」是错的：audit 模块的举报端点和 admin 处理台一直都在。
 */
function reportPost() {
  showMenu.value = false
  gotoReport('POST', String(postId.value), post.value?.content || post.value?.title, post.value?.author?.name)
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

// ─── 附件文件卡（文件名+大小+下载）───
function fmtFileSize(size: number): string {
  if (!size) return ''
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / 1024 / 1024).toFixed(1)}MB`
}
/** 打开/下载附件：H5 新窗口直接下载；小程序/App 先下载再用系统查看器打开 */
function openAttachment(f: { name: string; url: string }) {
  // #ifdef H5
  window.open(f.url, '_blank')
  return
  // #endif
  uni.showLoading({ title: '下载中…' })
  uni.downloadFile({
    url: f.url,
    success: (res) => {
      uni.hideLoading()
      if (res.statusCode !== 200) { uni.showToast({ title: '下载失败', icon: 'none' }); return }
      uni.openDocument({
        filePath: res.tempFilePath,
        showMenu: true,
        fail: () => uni.showToast({ title: '暂不支持预览该文件类型', icon: 'none' }),
      })
    },
    fail: () => { uni.hideLoading(); uni.showToast({ title: '下载失败', icon: 'none' }) },
  })
}

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

// ─── 评论区（统一 CommentSection 组件·点赞/回复/发送/楼中楼逻辑均在组件内） ───

/**
 * 互动栏「评论」按钮：滚动到评论区。
 * CommentSection 只 expose 了 refresh()（无 focusInput）→ 用 scroll-view 的 scroll-into-view 锚点方案；
 * 先清空再 nextTick 赋值，保证连点也能重新触发滚动。
 */
const scrollAnchor = ref('')
function scrollToComments() {
  scrollAnchor.value = ''
  nextTick(() => { scrollAnchor.value = 'pd-comments-anchor' })
}

/** 评论计数联动：CommentSection 首载/发送/回滚时 emit count-change → 同步互动栏与评论区标题 */
function onCommentCount(n: number) {
  if (post.value) post.value.comments = n
}

// 海报需 circleId：后端帖子详情端点是 GET /circles/:circleId/posts/:postId（缺它查不到内容）
function openShare() { navigateTo(`/pkg-circle/common/share-poster?type=post&targetId=${postId.value}&circleId=${circleId.value || ''}`) }
function openUser(id: string) { navigateTo(`/pkg-circle/user/profile?id=${id}`) }
function openCircle() { if (circleId.value) navigateTo(`/pkg-circle/circles/detail?id=${circleId.value}`) }
function fmt(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : String(n) }

onUnmounted(() => { if (audioCtx) { try { audioCtx.destroy() } catch {} } })
</script>

<template>
  <view class="pd">
    <!-- 顶栏：sticky 毛玻璃（V0 .topbar） -->
    <view class="pd-topbar">
      <view class="pd-top-btn pd-top-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="pd-top-title">帖子详情</text>
      <view class="pd-top-btn pd-top-menu" @tap="showMenu = !showMenu"><app-icon name="more-horizontal" :size="40" color="#6E6E73" /></view>
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
      <!-- 作者本人：删除自己的帖子（后端放行作者删除）·不显示「举报自己」 -->
      <view v-else-if="isAuthor" class="pd-menu-item" @tap="govDeletePost">
        <app-icon name="trash-2" :size="30" color="#C41E3A" />
        <text class="pd-menu-t danger">删除帖子</text>
      </view>
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

    <scroll-view v-else-if="post" scroll-y :scroll-into-view="scrollAnchor" scroll-with-animation class="pd-body">
      <!-- 作者行：头像 + 昵称(+头衔徽章) + 时间 · 来自圈子（圈名可点） -->
      <view class="pd-author">
        <view @tap="openUser(post.author.id)"><smart-avatar :src="post.author.avatar" :name="post.author.name" class="pd-avatar" /></view>
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

        <!-- 图片：双列 4:3 圆角（1 张整宽），点击原生大图预览（可滑动切换/缩放） -->
        <view v-if="post.images && post.images.length" class="pd-imgs" :class="{ single: post.images.length === 1 }">
          <image
            v-for="(img, i) in post.images" :key="i" lazy-load
            :src="img.url" class="pd-img" mode="aspectFill"
            @tap="previewPostImages(i)"
          />
        </view>

        <!-- 附件文件卡：文件名+大小+下载（V0 门控模型「帖子/文件/问答」核心三件套之一） -->
        <view v-if="post.attachments && post.attachments.length" class="pd-files">
          <view v-for="(f, i) in post.attachments" :key="i" class="pd-file" @tap="openAttachment(f)">
            <view class="pd-file-icon"><app-icon name="file-text" :size="40" color="#C41E3A" /></view>
            <view class="pd-file-info">
              <text class="pd-file-name">{{ f.name }}</text>
              <text v-if="f.size" class="pd-file-size">{{ fmtFileSize(f.size) }}</text>
            </view>
            <view class="pd-file-dl"><app-icon name="download" :size="32" color="#999999" /></view>
          </view>
        </view>

        <!-- 触点 #6 圈主的课：正文尾·服务端裁决无卡则不渲染 -->
        <touchpoint-card v-if="tp?.card" :card="tp.card" scene="circle_course" />
      </view>

      <!-- 互动栏：V0 横排左对齐（点赞/评论/收藏 + 分享），下边框分隔 -->
      <view class="pd-actions">
        <view class="pd-action" :class="{ 'pd-action-on': isLiked }" hover-class="pd-press" @tap="toggleLike">
          <app-icon name="heart" :size="36" :color="isLiked ? '#C41E3A' : '#6e6e73'" :fill="isLiked" />
          <text class="pd-action-t" :class="{ liked: isLiked }">{{ likes ? fmt(likes) : '点赞' }}</text>
        </view>
        <view class="pd-action" hover-class="pd-press" @tap="scrollToComments">
          <app-icon name="message-circle" :size="36" color="#6e6e73" />
          <text class="pd-action-t">{{ post.comments ? fmt(post.comments) : '评论' }}</text>
        </view>
        <view class="pd-action" :class="{ 'pd-action-gold-on': isCollected }" hover-class="pd-press" @tap="toggleCollect">
          <app-icon name="bookmark" :size="36" :color="isCollected ? '#C9A96E' : '#6e6e73'" :fill="isCollected" />
          <text class="pd-action-t" :class="{ collected: isCollected }">{{ collects ? fmt(collects) : '收藏' }}</text>
        </view>
        <view class="pd-action" hover-class="pd-press" @tap="openShare">
          <app-icon name="share-2" :size="36" color="#6e6e73" />
          <text class="pd-action-t">分享</text>
        </view>
      </view>

      <!-- 评论区：统一 CommentSection（列表+吸底输入条+乐观更新一站式·三态/楼中楼/点赞组件自带） -->
      <view id="pd-comments-anchor" class="pd-csec">
        <text class="pd-comments-head">评论 {{ post.comments }}</text>
        <comment-section
          target-type="POST"
          :target-id="postId"
          :author-id="post.author.id"
          @count-change="onCommentCount"
        />
      </view>
    </scroll-view>
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
/* 返回/⋯菜单按钮触控热区≥88rpx：容器扩大+负margin保持视觉位置 */
.pd-top-back { width: 88rpx; height: 88rpx; padding: 0; margin: -14rpx; display: flex; align-items: center; justify-content: center; }
.pd-top-menu { width: 88rpx; height: 88rpx; padding: 0; margin: -16rpx; display: flex; align-items: center; justify-content: center; }
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

/* 附件文件卡 */
.pd-files { display: flex; flex-direction: column; gap: 16rpx; margin-top: 32rpx; }
.pd-file {
  display: flex; align-items: center; gap: 20rpx;
  padding: 20rpx 24rpx;
  background: var(--bg-warm, #f8f4ec);
  border: 1rpx solid rgba(0,0,0,0.05);
  border-radius: 16rpx;
}
.pd-file-icon {
  width: 72rpx; height: 72rpx; border-radius: 12rpx;
  background: rgba(196,30,58,0.08);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.pd-file-info { flex: 1; min-width: 0; }
.pd-file-name {
  display: block; font-size: 28rpx; color: var(--text-ink, #2c2c2c);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pd-file-size { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; }
.pd-file-dl { padding: 8rpx; flex-shrink: 0; }

/* 互动栏：横排左对齐 + 下边框 */
.pd-actions {
  display: flex; align-items: center; gap: 16rpx;
  padding: 12rpx 28rpx; margin-top: 8rpx;
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
/* 每项 ≥88rpx 触达区·激活态浅色底衬胶囊（X5 防御：内容层 relative+z-index） */
.pd-action { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 10rpx; min-width: 88rpx; min-height: 88rpx; padding: 0 20rpx; border-radius: 999rpx; }
.pd-action-on { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }
.pd-action-gold-on { background: rgba(201, 169, 110, 0.14); }
.pd-press { opacity: 0.8; }
.pd-action-t { position: relative; z-index: 1; font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.pd-action-t.liked { color: var(--brand, #c41e3a); font-weight: 500; }
.pd-action-t.collected { color: #a8823f; font-weight: 500; }

/* 评论区（列表/输入条样式在统一组件内·此处只留标题与容器留白） */
.pd-csec { padding: 0 24rpx; }
.pd-comments-head { display: block; padding: 32rpx 16rpx 8rpx; font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
</style>
