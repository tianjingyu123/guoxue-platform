<script setup lang="ts">
/**
 * F4 课程问答（课内问答独立页）
 * 视觉：V0 阶段二视觉稿 f4-qa.html（问答流正常态 + 我要提问半屏弹层）+ f-pages-states.html（空态/骨架）
 * 真连：
 *   - courseApi.getLearnData(courseId).questions → 问答列表（唯一含问答列表的方法）
 *   - courseApi.askQuestion(courseId, question, chapterId?) → 提交提问
 *
 * 诚实降级说明：
 *   后端问答列表（RawQuestion / LearnQuestion）只有 answers(回答数量) 与 isAnswered(是否已答)，
 *   无「讲师回答正文」字段。故 V0 视觉稿中的「讲师回答块（头像+金标+回答正文）」无法真连——
 *   本页对已答问题展示「已解答 · N 条回答」金色标识，对未答问题展示「等待讲师回答」，不臆造回答内容。
 *   若后续后端补出回答正文/讲师信息字段，可在此页扩展回答块。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'
import { courseApi, type LearnQuestion } from '@/lib/course-data'

// 自定义导航状态栏高度
const statusBarHeight = ref(0)

// 页面参数
const courseId = ref('')

// 三态
const loading = ref(true)
const error = ref('')
const questions = ref<LearnQuestion[]>([])

// 提问弹层
const showAsk = ref(false)
const askText = ref('')
const submitting = ref(false)

async function load() {
  if (!courseId.value) {
    loading.value = false
    error.value = '缺少课程参数'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const data = await courseApi.getLearnData(courseId.value)
    questions.value = data.questions
  } catch {
    error.value = '问答加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onLoad((opts?: Record<string, string>) => {
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })
  courseId.value = opts?.courseId || opts?.id || ''
  load()
})

function retry() { load() }
function goBack() { navigateBack() }

function openAsk() {
  askText.value = ''
  showAsk.value = true
}
function closeAsk() {
  if (submitting.value) return
  showAsk.value = false
}

async function submitAsk() {
  const q = askText.value.trim()
  if (!q) {
    uni.showToast({ title: '请输入你的问题', icon: 'none' })
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    await courseApi.askQuestion(courseId.value, q)
    uni.showToast({ title: '提问已提交', icon: 'success' })
    showAsk.value = false
    askText.value = ''
    // 重新拉取，把新提问纳入列表（待答态）
    await load()
  } catch {
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <!-- ══ 顶部导航（自定义·左返回 + 衬线标题）══ -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" hover-class="btn-press" @tap="goBack">
        <app-icon name="chevron-left" :size="36" color="#2C2C2C" />
      </view>
      <text class="nav-title serif">课程问答</text>
    </view>

    <!-- ══ 错误态 ══ -->
    <view v-if="error" class="state-wrap">
      <text class="state-text">{{ error }}</text>
      <view class="retry-btn" hover-class="btn-press" @tap="retry"><text class="retry-text">重试</text></view>
    </view>

    <!-- ══ 骨架屏（通用列表·总览+卡×3 微光）══ -->
    <view v-else-if="loading" class="body-pad">
      <view v-for="n in 3" :key="n" class="sk-card">
        <view class="sk-card-head">
          <view class="sk sk-avatar" />
          <view class="sk sk-line" style="width:120rpx" />
          <view class="sk sk-line" style="width:70rpx;margin-left:auto" />
        </view>
        <view class="sk sk-line" style="width:90%" />
        <view class="sk sk-line" style="width:60%" />
        <view class="sk sk-block" />
      </view>
    </view>

    <!-- ══ 空态（还没有提问）══ -->
    <view v-else-if="questions.length === 0" class="empty">
      <view class="empty-illus">
        <app-icon name="message-circle" :size="88" color="#C9A96E" :stroke-width="1.5" />
      </view>
      <text class="empty-title serif">还没有提问</text>
      <text class="empty-desc">对课程内容有疑惑？{{ '\n' }}讲师在等你的第一个问题</text>
      <view class="empty-btn" hover-class="btn-press" @tap="openAsk">
        <text class="empty-btn-txt">我要提问</text>
      </view>
    </view>

    <!-- ══ 问答流（正常态）══ -->
    <view v-else class="body-pad">
      <view v-for="q in questions" :key="q.id" class="card">
        <!-- 提问人行 -->
        <view class="q-head">
          <view class="q-avatar">
            <image v-if="q.author.avatar" class="q-avatar-img" :src="q.author.avatar" mode="aspectFill" lazy-load />
            <text v-else class="q-avatar-ph">{{ (q.author.name || '匿').charAt(0) }}</text>
          </view>
          <text class="q-name">{{ q.author.name || '匿名' }}</text>
          <text class="q-time num">{{ q.createdAt }}</text>
        </view>
        <!-- 问题正文 -->
        <text class="q-text">{{ q.content }}</text>
        <!-- 章节归属（有则显示） -->
        <view v-if="q.chapterTitle" class="q-chapter">
          <app-icon name="message-square" :size="22" color="#999999" />
          <text class="q-chapter-txt">{{ q.chapterTitle }}</text>
        </view>
        <!-- 已答标识（后端无回答正文·诚实降级为「已解答·N条回答」金标）-->
        <view v-if="q.isAnswered" class="answered">
          <app-icon name="badge-check" :size="26" color="#C9A96E" :fill="false" />
          <text class="answered-txt">
            讲师已解答<text v-if="q.answers > 0" class="answered-count"> · {{ q.answers }} 条回答</text>
          </text>
        </view>
        <!-- 待答态 -->
        <view v-else class="pending">
          <app-icon name="clock" :size="24" color="#999999" />
          <text class="pending-txt">等待讲师回答</text>
        </view>
      </view>
    </view>

    <!-- ══ 吸底「我要提问」（非空态显示；空态已内置按钮）══ -->
    <view v-if="!loading && !error && questions.length > 0" class="bottom-bar" :style="{ paddingBottom: 'calc(24rpx + env(safe-area-inset-bottom))' }">
      <view class="btn-ask" hover-class="btn-press" @tap="openAsk">
        <app-icon name="edit" :size="30" color="#FFFFFF" />
        <text class="btn-ask-txt">我要提问</text>
      </view>
    </view>

    <!-- ══ 提问半屏弹层（纯色实底·非毛玻璃）══ -->
    <view v-if="showAsk" class="mask" @tap="closeAsk">
      <view class="sheet" @tap.stop :style="{ paddingBottom: 'calc(28rpx + env(safe-area-inset-bottom))' }">
        <view class="sheet-head">
          <text class="sheet-title serif">我要提问</text>
          <view class="sheet-close" hover-class="btn-press" @tap="closeAsk">
            <text class="sheet-close-x">×</text>
          </view>
        </view>
        <textarea
          v-model="askText"
          class="sheet-input"
          :maxlength="500"
          placeholder="向讲师提出你的问题，描述越具体越容易获得解答…"
          placeholder-class="sheet-ph"
          :disabled="submitting"
          auto-height
        />
        <text class="sheet-note">讲师回答后会通知你</text>
        <view class="btn-submit" :class="{ disabled: submitting || !askText.trim() }" hover-class="btn-press" @tap="submitAsk">
          <text class="btn-submit-txt">{{ submitting ? '提交中…' : '提交问题' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ── 视觉 token（V0 委托书第七节）── */
.page {
  min-height: 100vh;
  background: #FAF8F5;
}
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.num { font-variant-numeric: tabular-nums; font-family: "SF Mono", "Roboto Mono", monospace; }
.btn-press { opacity: 0.6; }

/* ── 顶部导航 ── */
.nav {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 40rpx 20rpx;
  background: #FAF8F5;
}
.nav-back {
  width: 72rpx; height: 72rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: #FFFFFF;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}
.nav-title { font-size: 40rpx; font-weight: 700; letter-spacing: 2rpx; color: #2C2C2C; }

/* ── 内容主体 ── */
.body-pad { padding: 24rpx 40rpx 200rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* ── 问答卡 ── */
.card { background: #FFFFFF; border-radius: 36rpx; padding: 32rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 20rpx; }
.q-head { display: flex; align-items: center; gap: 20rpx; }
.q-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; overflow: hidden; background: #F8F4EC; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.q-avatar-img { width: 100%; height: 100%; }
.q-avatar-ph { font-size: 26rpx; color: #6E6E73; }
.q-name { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.q-time { margin-left: auto; font-size: 24rpx; color: #999999; }
.q-text { font-size: 30rpx; font-weight: 600; line-height: 1.6; color: #2C2C2C; }
.q-chapter { display: flex; align-items: center; gap: 8rpx; }
.q-chapter-txt { font-size: 24rpx; color: #999999; }

/* ── 已答标识（金标·诚实降级无回答正文）── */
.answered { display: flex; align-items: center; gap: 10rpx; background: rgba(201,169,110,0.14); border-radius: 16rpx; padding: 16rpx 20rpx; }
.answered-txt { font-size: 26rpx; font-weight: 600; color: #8A6D3B; }
.answered-count { font-weight: 400; color: #8A6D3B; }

/* ── 待答态 ── */
.pending { display: flex; align-items: center; gap: 10rpx; }
.pending-txt { font-size: 26rpx; color: #999999; }

/* ── 吸底提问栏 ── */
.bottom-bar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  background: #FFFFFF; border-top: 2rpx solid #EDE7DD;
  padding: 24rpx 40rpx;
}
.btn-ask {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  height: 96rpx; border-radius: 999rpx; background: #C41E3A;
}
.btn-ask-txt { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }

/* ── 空态 ── */
.empty { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 160rpx 60rpx; text-align: center; }
.empty-illus { width: 220rpx; height: 220rpx; border-radius: 50%; background: #F8F4EC; display: flex; align-items: center; justify-content: center; }
.empty-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.empty-desc { font-size: 28rpx; color: #999999; line-height: 1.6; white-space: pre-line; }
.empty-btn { margin-top: 12rpx; height: 88rpx; padding: 0 56rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; }
.empty-btn-txt { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }

/* ── 错误态 ── */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 0; gap: 24rpx; }
.state-text { font-size: 28rpx; color: #6E6E73; }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

/* ── 骨架屏（#F0EBE2 微光 1.4s）── */
.sk { position: relative; overflow: hidden; background: #F0EBE2; border-radius: 12rpx; }
.sk::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation: shimmer 1.4s infinite; }
@keyframes shimmer { 100% { transform: translateX(100%); } }
.sk-card { background: #FFFFFF; border-radius: 36rpx; padding: 32rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 20rpx; }
.sk-card-head { display: flex; align-items: center; gap: 20rpx; }
.sk-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; }
.sk-line { height: 30rpx; }
.sk-block { height: 72rpx; border-radius: 16rpx; margin-top: 4rpx; }

/* ── 提问半屏弹层 ── */
.mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.45); display: flex; flex-direction: column; justify-content: flex-end; }
.sheet { background: #FFFFFF; border-radius: 36rpx 36rpx 0 0; padding: 40rpx 40rpx 28rpx; display: flex; flex-direction: column; gap: 28rpx; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; }
.sheet-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.sheet-close { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F8F4EC; display: flex; align-items: center; justify-content: center; }
.sheet-close-x { font-size: 34rpx; color: #999999; line-height: 1; }
.sheet-input { width: 100%; box-sizing: border-box; background: #F8F4EC; border-radius: 16rpx; padding: 28rpx; min-height: 240rpx; font-size: 30rpx; color: #2C2C2C; line-height: 1.6; }
.sheet-ph { color: #999999; }
.sheet-note { font-size: 24rpx; color: #999999; }
.btn-submit { height: 96rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.btn-submit.disabled { opacity: 0.5; }
.btn-submit-txt { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }
</style>
