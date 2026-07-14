<script setup lang="ts">
/** F3 课程评价列表页 — V0 视觉还原（双视角合一）
 * ①学员视角（默认）：评分总览 + 评价流 + 吸底「写个评价」入口（点开写评价半屏弹层：星级+文本）
 * ②讲师视角（?role=instructor）：讲师查看自己课程评价并可回复；回复框/已回复引用块替代写评价入口
 * 三态：骨架屏(加载中) / 空态(暂无评价) / 正常列表
 * 真连接口：
 *   - 评价读取：courseApi.getReviews(courseId)
 *   - 讲师回复：courseApi.replyReview(reviewId, reply)  ← course-data 已有
 *   - 写评价（学员提交新评价）：courseApi.createReview(courseId, rating, content) → POST /courses/:id/reviews
 *     （2026-07-14 接线：此前是「即将开放」假 toast，用户写的评价被丢弃；后端端点其实一直都在）
 * onLoad 取 evt.courseId（兼容 id）；role=instructor 进讲师视角
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import { courseApi, type CourseReview } from '@/lib/course-data'

// 自定义导航栏状态栏占位高度
const statusBarHeight = ref(0)
const courseId = ref('')
const courseTitle = ref('')
// 视角：'student' 学员（默认）/ 'instructor' 讲师
const role = ref<'student' | 'instructor'>('student')
const isInstructor = computed(() => role.value === 'instructor')

const loading = ref(true)
const error = ref('')
const reviews = ref<CourseReview[]>([])

// ── 评分总览派生（真连数据聚合：平均分 + 五档分布） ──
const avgRating = computed(() => {
  if (reviews.value.length === 0) return 0
  const sum = reviews.value.reduce((s, r) => s + (Number(r.rating) || 0), 0)
  return Math.round((sum / reviews.value.length) * 10) / 10
})
// 五档分布百分比（[5星%,4星%,3星%,2星%,1星%]）
const ratingDist = computed(() => {
  const total = reviews.value.length
  const buckets = [0, 0, 0, 0, 0] // index 0=5星 … 4=1星
  if (total === 0) return buckets
  for (const r of reviews.value) {
    const star = Math.round(Number(r.rating) || 0)
    if (star >= 1 && star <= 5) buckets[5 - star]++
  }
  return buckets.map((c) => Math.round((c / total) * 100))
})

// ── 写评价半屏弹层（学员视角） ──
const showWriteSheet = ref(false)
const writeRating = ref(5)
const writeContent = ref('')
const writeSubmitting = ref(false)
const ratingTips = ['很差', '较差', '一般', '满意', '非常满意']
const writeTip = computed(() => ratingTips[Math.min(Math.max(writeRating.value, 1), 5) - 1])

// ── 讲师回复态（讲师视角，单条编辑） ──
const editingId = ref('')
const replyDraft = ref('')
const submittingId = ref('')

async function loadReviews() {
  loading.value = true
  error.value = ''
  try {
    reviews.value = await courseApi.getReviews(courseId.value)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

// ── 学员：写评价弹层 ──
function openWriteSheet() {
  writeRating.value = 5
  writeContent.value = ''
  showWriteSheet.value = true
}
function closeWriteSheet() {
  showWriteSheet.value = false
}
function pickStar(n: number) {
  writeRating.value = n
}
async function submitReview() {
  if (writeSubmitting.value) return
  if (!writeContent.value.trim()) {
    uni.showToast({ title: '说说你的收获吧', icon: 'none' })
    return
  }
  writeSubmitting.value = true
  try {
    // 🔴 原来这里是「评价功能即将开放」的假 toast，用户写的评价被直接丢弃 ——
    //    而后端 POST /courses/:id/reviews 一直都在（注释却写着"需后端补"）。
    await courseApi.createReview(courseId.value, writeRating.value, writeContent.value.trim())
    showWriteSheet.value = false
    uni.showToast({ title: '评价已发布', icon: 'success' })
    await loadReviews() // 立刻回读，让用户看到自己的评价真的在列表里
  } catch (e) {
    // 后端会挡：未购买 403 / 已评价 400 —— 如实回显，不吞掉
    uni.showToast({ title: (e as Error)?.message || '发布失败，请稍后重试', icon: 'none' })
  } finally {
    writeSubmitting.value = false
  }
}

// ── 讲师：回复评价（真连 courseApi.replyReview） ──
function startReply(rv: CourseReview) {
  editingId.value = rv.id
  replyDraft.value = rv.reply || ''
}
function cancelReply() {
  editingId.value = ''
  replyDraft.value = ''
}
async function submitReply(rv: CourseReview) {
  if (submittingId.value || !replyDraft.value.trim()) return
  submittingId.value = rv.id
  try {
    await courseApi.replyReview(rv.id, replyDraft.value.trim())
    // 本地更新，避免整列表刷新
    const target = reviews.value.find((r) => r.id === rv.id)
    if (target) target.reply = replyDraft.value.trim()
    editingId.value = ''
    replyDraft.value = ''
    uni.showToast({ title: '回复成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '回复失败，请重试', icon: 'none' })
  } finally {
    submittingId.value = ''
  }
}

onLoad((options) => {
  try {
    const info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch { /* 取不到状态栏高度退化为 0 */ }
  courseId.value = options?.courseId || options?.id || ''
  courseTitle.value = options?.title ? decodeURIComponent(options.title) : ''
  if (options?.role === 'instructor') role.value = 'instructor'
  loadReviews()
})
</script>

<template>
  <view class="page">
    <!-- ══ 自定义导航栏 ══ -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" hover-class="press" @tap="goBack">
        <app-icon name="chevron-left" :size="36" color="#2C2C2C" />
      </view>
      <view class="nav-titles">
        <text class="nav-title serif">{{ isInstructor ? '评价管理' : '学员评价' }}</text>
        <text v-if="isInstructor && courseTitle" class="nav-sub">{{ courseTitle }}</text>
      </view>
      <view class="nav-back" />
    </view>

    <!-- ══ 骨架屏（加载中·通用列表：总览卡 + 评价卡×3） ══ -->
    <view v-if="loading" class="body-pad">
      <view class="sk sk-overview" />
      <view class="sk sk-review" />
      <view class="sk sk-review sk-review--sm" />
      <view class="sk sk-review" />
    </view>

    <!-- ══ 错误态 ══ -->
    <view v-else-if="error" class="status-wrap">
      <app-icon name="message-circle" :size="56" color="#DDDDDD" />
      <text class="status-text">{{ error }}</text>
      <view class="retry-btn" hover-class="press" @tap="loadReviews"><text class="retry-txt">重试</text></view>
    </view>

    <!-- ══ 空态（暂无评价） ══ -->
    <view v-else-if="reviews.length === 0" class="empty">
      <view class="empty-illus">
        <app-icon name="star" :size="46" color="#C9A96E" />
      </view>
      <text class="empty-title serif">暂无评价</text>
      <text class="empty-desc">{{ isInstructor ? '学员评价后，你可以在这里回复' : '购买后欢迎首评，你的评价会帮到更多同好' }}</text>
      <view v-if="!isInstructor" class="empty-btn" hover-class="press" @tap="openWriteSheet">
        <text class="empty-btn-txt">写下第一条评价</text>
      </view>
    </view>

    <!-- ══ 正常列表 ══ -->
    <view v-else class="body-pad">
      <!-- 讲师视角提示条 -->
      <view v-if="isInstructor" class="role-tip">
        <app-icon name="user" :size="26" color="#C41E3A" />
        <text class="role-tip-txt">讲师视角 · 你可以回复学员的评价</text>
      </view>

      <!-- ══ 区块1 评分总览（学员视角展示；讲师视角以提示条替代顶部） ══ -->
      <view v-if="!isInstructor" class="card overview">
        <view class="ov-left">
          <text class="ov-score">{{ avgRating || '—' }}</text>
          <view class="stars">
            <app-icon
              v-for="i in 5" :key="i" name="star" :size="28"
              :color="i <= Math.round(avgRating) ? '#C9A96E' : '#EDE7DD'" :fill="i <= Math.round(avgRating)"
            />
          </view>
          <text class="ov-count">共 {{ reviews.length }} 条评价</text>
        </view>
        <view class="ov-bars">
          <view v-for="(pct, idx) in ratingDist" :key="idx" class="bar-row">
            <text class="bar-label">{{ 5 - idx }}星</text>
            <view class="bar-track"><view class="bar-fill" :style="{ width: pct + '%' }" /></view>
            <text class="bar-pct">{{ pct }}%</text>
          </view>
        </view>
      </view>

      <!-- ══ 区块2 评价流 ══ -->
      <view v-for="rv in reviews" :key="rv.id" class="card review">
        <view class="rv-head">
          <image v-if="rv.user.avatar" lazy-load class="rv-avatar" :src="rv.user.avatar" mode="aspectFill" />
          <view v-else class="rv-avatar rv-avatar--fb">
            <app-icon name="user" :size="24" color="#C9B99A" />
          </view>
          <view class="rv-meta">
            <text class="rv-name">{{ rv.user.name }}</text>
            <view class="stars stars--sm">
              <app-icon
                v-for="i in 5" :key="i" name="star" :size="22"
                :color="i <= Number(rv.rating) ? '#C9A96E' : '#EDE7DD'" :fill="i <= Number(rv.rating)"
              />
            </view>
          </view>
          <text class="rv-time">{{ rv.createdAt }}</text>
        </view>

        <text class="rv-content">{{ rv.content }}</text>

        <!-- 已回复引用块（金浅底·深色文字·配色红线不用金字）；讲师视角带「修改」轻入口 -->
        <view v-if="rv.reply && editingId !== rv.id" class="rv-reply">
          <view class="rv-reply-head">
            <text class="rv-reply-b">{{ isInstructor ? '我的回复：' : '讲师回复：' }}</text>
            <text v-if="isInstructor" class="rv-reply-edit" @tap="startReply(rv)">修改</text>
          </view>
          <text class="rv-reply-txt">{{ rv.reply }}</text>
        </view>

        <!-- 讲师视角·回复编辑框（未回复或点了修改） -->
        <template v-else-if="isInstructor">
          <view v-if="editingId === rv.id" class="reply-edit">
            <textarea
              class="reply-textarea"
              placeholder="回复这条评价…"
              placeholder-class="ta-ph"
              :value="replyDraft"
              :maxlength="500"
              @input="(e: any) => replyDraft = e.detail.value"
            />
            <view class="reply-actions">
              <view class="reply-btn reply-btn--outline" hover-class="press" @tap="cancelReply">
                <text class="reply-btn-txt reply-btn-txt--outline">取消</text>
              </view>
              <view
                class="reply-btn"
                :class="{ 'reply-btn--disabled': submittingId === rv.id || !replyDraft.trim() }"
                hover-class="press"
                @tap="submitReply(rv)"
              >
                <text class="reply-btn-txt">{{ submittingId === rv.id ? '提交中…' : '发布回复' }}</text>
              </view>
            </view>
          </view>
          <!-- 未回复：一行回复入口（替代学员的写评价入口） -->
          <view v-else class="reply-box" hover-class="press" @tap="startReply(rv)">
            <view class="reply-input"><text class="reply-input-ph">回复这条评价…</text></view>
            <view class="reply-send"><text class="reply-send-txt">回复</text></view>
          </view>
        </template>
      </view>
    </view>

    <!-- ══ 学员视角·吸底「写个评价」 ══ -->
    <view
      v-if="!isInstructor && !loading && !error && reviews.length > 0"
      class="bottom-bar"
      :style="{ paddingBottom: 'calc(24rpx + env(safe-area-inset-bottom))' }"
    >
      <view class="btn-write" hover-class="press" @tap="openWriteSheet">
        <app-icon name="edit" :size="30" color="#ffffff" />
        <text class="btn-write-txt">写个评价</text>
      </view>
    </view>

    <!-- ══ 写评价半屏弹层（学员视角） ══ -->
    <view v-if="showWriteSheet" class="modal">
      <view class="modal-mask" @tap="closeWriteSheet" />
      <view class="sheet">
        <view class="sheet-head">
          <text class="sheet-title serif">写个评价</text>
          <view class="sheet-close" hover-class="press" @tap="closeWriteSheet">
            <app-icon name="x" :size="30" color="#999999" />
          </view>
        </view>
        <!-- 星级选择 -->
        <view class="star-select">
          <view v-for="n in 5" :key="n" hover-class="press" @tap="pickStar(n)">
            <app-icon name="star" :size="52" :color="n <= writeRating ? '#C9A96E' : '#EDE7DD'" :fill="n <= writeRating" />
          </view>
        </view>
        <text class="star-tip">{{ writeTip }}</text>
        <!-- 文本框 -->
        <textarea
          class="sheet-input"
          placeholder="说说这门课带给你的收获…"
          placeholder-class="ta-ph"
          :value="writeContent"
          :maxlength="500"
          @input="(e: any) => writeContent = e.detail.value"
        />
        <view
          class="btn-submit"
          :class="{ 'btn-submit--disabled': writeSubmitting || !writeContent.trim() }"
          hover-class="press"
          @tap="submitReview"
        >
          <text class="btn-submit-txt">{{ writeSubmitting ? '提交中…' : '提交评价' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.press { opacity: 0.85; }

/* ── 自定义导航栏 ── */
.nav { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 32rpx 16rpx; background: #FAF8F5; }
.nav-back { width: 68rpx; height: 68rpx; flex-shrink: 0; border-radius: 999rpx; background: #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }
.nav-titles { flex: 1; min-width: 0; }
.nav-title { display: block; font-size: 38rpx; font-weight: 700; color: #2C2C2C; letter-spacing: 2rpx; }
.nav-sub { display: block; font-size: 24rpx; color: #999; margin-top: 4rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

/* ── 内容区 ── */
.body-pad { padding: 12rpx 40rpx 180rpx; display: flex; flex-direction: column; gap: 24rpx; }
.card { background: #FFFFFF; border-radius: 36rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }

/* ── 讲师视角提示条 ── */
.role-tip { display: flex; align-items: center; gap: 12rpx; background: rgba(196,30,58,0.08); border-radius: 16rpx; padding: 18rpx 24rpx; }
.role-tip-txt { font-size: 26rpx; font-weight: 600; color: #C41E3A; }

/* ── 评分总览 ── */
.overview { display: flex; gap: 36rpx; align-items: center; }
.ov-left { display: flex; flex-direction: column; align-items: center; gap: 10rpx; flex-shrink: 0; }
.ov-score { font-size: 84rpx; font-weight: 700; color: #C9A96E; font-variant-numeric: tabular-nums; line-height: 1; }
.stars { display: flex; gap: 4rpx; }
.stars--sm { gap: 2rpx; }
.ov-count { font-size: 22rpx; color: #999; }
.ov-bars { flex: 1; display: flex; flex-direction: column; gap: 10rpx; min-width: 0; }
.bar-row { display: flex; align-items: center; gap: 14rpx; }
.bar-label { font-size: 22rpx; color: #999; flex-shrink: 0; width: 44rpx; }
.bar-track { flex: 1; height: 10rpx; border-radius: 6rpx; background: #F8F4EC; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 6rpx; background: #C9A96E; }
.bar-pct { font-size: 22rpx; color: #999; flex-shrink: 0; width: 60rpx; text-align: right; font-variant-numeric: tabular-nums; }

/* ── 评价流 ── */
.review { display: flex; flex-direction: column; gap: 18rpx; }
.rv-head { display: flex; align-items: center; gap: 18rpx; }
.rv-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; flex-shrink: 0; background: #F8F4EC; }
.rv-avatar--fb { display: flex; align-items: center; justify-content: center; }
.rv-meta { flex: 1; min-width: 0; }
.rv-name { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.rv-time { flex-shrink: 0; font-size: 24rpx; color: #999; }
.rv-content { font-size: 28rpx; line-height: 1.7; color: #2C2C2C; }

/* 已回复引用块 */
.rv-reply { background: rgba(201,169,110,0.14); border-radius: 16rpx; padding: 20rpx 24rpx; }
.rv-reply-head { display: flex; align-items: center; }
.rv-reply-b { flex: 1; font-size: 26rpx; font-weight: 600; color: #8A6D3B; }
.rv-reply-edit { flex-shrink: 0; font-size: 24rpx; color: #C41E3A; }
.rv-reply-txt { display: block; margin-top: 8rpx; font-size: 26rpx; line-height: 1.6; color: #6E6E73; }

/* 讲师回复编辑框 */
.reply-edit { display: flex; flex-direction: column; gap: 16rpx; }
.reply-textarea { width: 100%; box-sizing: border-box; min-height: 140rpx; padding: 20rpx; background: #F8F4EC; border-radius: 16rpx; font-size: 28rpx; color: #2C2C2C; line-height: 1.6; }
.ta-ph { color: #999; }
.reply-actions { display: flex; justify-content: flex-end; gap: 16rpx; }
.reply-btn { padding: 0 40rpx; height: 72rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.reply-btn--outline { background: #FFFFFF; border: 1rpx solid #EDE7DD; }
.reply-btn--disabled { opacity: 0.5; }
.reply-btn-txt { font-size: 26rpx; font-weight: 600; color: #FFFFFF; }
.reply-btn-txt--outline { color: #6E6E73; }

/* 讲师未回复：一行回复入口 */
.reply-box { display: flex; align-items: center; gap: 16rpx; }
.reply-input { flex: 1; min-width: 0; background: #F8F4EC; border-radius: 999rpx; padding: 20rpx 28rpx; }
.reply-input-ph { font-size: 26rpx; color: #999; }
.reply-send { flex-shrink: 0; background: #C41E3A; border-radius: 999rpx; padding: 20rpx 34rpx; }
.reply-send-txt { font-size: 26rpx; font-weight: 600; color: #FFFFFF; }

/* ── 吸底写评价按钮 ── */
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-top: 1rpx solid #EDE7DD; padding: 20rpx 40rpx; z-index: 50; }
.btn-write { height: 92rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.btn-write-txt { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }

/* ── 写评价半屏弹层 ── */
.modal { position: fixed; inset: 0; z-index: 60; }
.modal-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.45); }
.sheet { position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 36rpx 36rpx 0 0; padding: 32rpx 40rpx calc(48rpx + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 28rpx; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; }
.sheet-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.sheet-close { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F8F4EC; display: flex; align-items: center; justify-content: center; }
.star-select { display: flex; justify-content: center; gap: 24rpx; padding: 8rpx 0; }
.star-tip { text-align: center; font-size: 26rpx; color: #C9A96E; font-weight: 600; margin-top: -12rpx; }
.sheet-input { width: 100%; box-sizing: border-box; background: #F8F4EC; border-radius: 16rpx; padding: 24rpx; min-height: 200rpx; font-size: 30rpx; color: #2C2C2C; line-height: 1.6; }
.btn-submit { height: 92rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.btn-submit--disabled { opacity: 0.5; }
.btn-submit-txt { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }

/* ── 状态态：错误 ── */
.status-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 80rpx; gap: 24rpx; }
.status-text { font-size: 28rpx; color: #6E6E73; }
.retry-btn { padding: 16rpx 56rpx; background: #C41E3A; border-radius: 999rpx; }
.retry-txt { font-size: 28rpx; color: #FFFFFF; }

/* ── 空态 ── */
.empty { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 180rpx 80rpx; text-align: center; }
.empty-illus { width: 176rpx; height: 176rpx; border-radius: 50%; background: #F8F4EC; display: flex; align-items: center; justify-content: center; }
.empty-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.empty-desc { font-size: 28rpx; color: #999; line-height: 1.6; }
.empty-btn { margin-top: 8rpx; padding: 24rpx 72rpx; background: #C41E3A; border-radius: 999rpx; }
.empty-btn-txt { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }

/* ── 骨架屏（微光 1.4s） ── */
.sk { position: relative; overflow: hidden; background: #F0EBE2; border-radius: 36rpx; }
.sk::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: shine 1.4s infinite; }
@keyframes shine { 100% { transform: translateX(100%); } }
.sk-overview { height: 220rpx; }
.sk-review { height: 260rpx; }
.sk-review--sm { height: 200rpx; }
</style>
