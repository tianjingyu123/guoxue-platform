<script setup lang="ts">
/** 课程播放页 P3 · V0 还原（视频态 + 图文态 + 音频态 + 试看态 + 完课态/证书弹层） */
import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import { goBack, navigateTo } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import PurchaseSheet from '@/components/common/purchase-sheet.vue'
import { courseApi, type PlayerChapter, type PlayerChapterLesson, type Certificate } from '@/lib/course-data'

const loading = ref(true)
const error = ref('')
const lessonId = ref('')
const courseId = ref('')

// 播放内容详情对象，模板 v-else 裸访问字段，保留 any 避免 null 链式报错
const content = ref<any>(null)
// 章节列表，模板裸访问 lessons 等字段，保留 any
const chapters = ref<any[]>([])

// 纯 UI 播放状态
const isPlaying = ref(false)
const isMuted = ref(false)
const isFullscreen = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = ref(1)
const showControls = ref(true)
const showChapterDrawer = ref(false)
const showQuestionPanel = ref(false)
const showSpeedMenu = ref(false)
const isAudioMode = ref(false)
const questionContent = ref('')
const submittingQuestion = ref(false)
// 倍速：拍板清单 0.75/1/1.25/1.5/2x（不增不减）
const speeds = [0.75, 1, 1.25, 1.5, 2]
const currentLessonId = ref('')
// 是否已起播过：起播前只显示单个居中播放钮（uni 原生 cover 钮已关），起播后封面层永久隐藏
const started = ref(false)
// 课时就地切换中（防并发重复点击）
const switching = ref(false)
// 视频源加载失败（404/转码中/格式不支持）→ 诚实态而非黑屏
const playError = ref(false)
// 续播：起播后跳到上次观看秒数（consume once·仅 currentProgress>0）
const resumeAt = ref(0)
// 进度回写节流时间戳（每 10s 最多回写一次）
let lastSaveTs = 0
// 自动连播（默认开，可关）
const autoNext = ref(true)
// 下部 Tab：目录 / 简介 / 讨论
const activeTab = ref<'catalog' | 'intro' | 'discuss'>('catalog')
// 访问权限 + 课程概要（试看提示条 / 播放页内购买用，静默拉取不阻塞播放）
const hasAccess = ref(false)
const courseDetail = ref<any>(null)
const showPurchase = ref(false)
// 试看态：付费课未购（能进播放页的必是免费试看章节，后端 content 端点已鉴权）
const trialMode = computed(() => !!courseDetail.value && !courseDetail.value.isFree && !hasAccess.value)
// 图文态判定：课时无播放媒体地址（videoUrl 为空）→ 图文课时，走沉浸阅读
const isArticleMode = computed(() => !!content.value && !content.value.videoUrl)

// 完课态：全部课时学完（getProgress 完成数==总数）
const completedAll = ref(false)
const showCongrats = ref(false)
// 证书弹层
const showCert = ref(false)
const cert = ref<Certificate | null>(null)
const certLoading = ref(false)

const progressPercent = computed(() => duration.value ? (currentTime.value / duration.value) * 100 : 0)

// 当前课时在目录中的序号（第 N / 共 M 讲）
const flatLessons = computed<PlayerChapterLesson[]>(() =>
  (chapters.value as PlayerChapter[]).flatMap((c) => c.lessons || []))
const lessonIndex = computed(() => {
  const i = flatLessons.value.findIndex((l) => l.id === currentLessonId.value)
  return i >= 0 ? i + 1 : 0
})
const lessonTotal = computed(() => flatLessons.value.length)

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
// 真实视频控制：经 videoContext 驱动播放器（composition API 下必须带组件实例，否则找不到 video 导致 play() 空转）
const inst = getCurrentInstance()
function playerCtx() { return uni.createVideoContext('courseVideo', inst?.proxy) }
function togglePlay() { if (isPlaying.value) playerCtx().pause(); else playerCtx().play() }
function changeSpeed(rate: number) { playbackRate.value = rate; showSpeedMenu.value = false; playerCtx().playbackRate(rate) }
// 前进/后退 15 秒（音频态控件，视频态复用 seek）
function seekBy(delta: number) {
  const t = Math.max(0, Math.min(duration.value || 0, currentTime.value + delta))
  currentTime.value = t
  playerCtx().seek(t)
}
// 控制层自动隐藏：播放中 4 秒无操作淡出，暂停/操作时常显
let hideTimer: ReturnType<typeof setTimeout> | null = null
function scheduleHideControls() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { if (isPlaying.value) showControls.value = false }, 4000)
}
onUnmounted(() => { if (hideTimer) clearTimeout(hideTimer) })
// 切页/切后台时暂停视频，根除后台多音轨（点讲师/作者头像跳转时原视频不再后台出声）
onHide(() => { try { playerCtx().pause() } catch { /* 图文态无 video 元素·忽略 */ } })
// 起播/暂停事件：首次 @play 后封面层永久隐藏（autoplay 被浏览器拦截时封面层单钮点一次即播）
function onPlay() {
  isPlaying.value = true; started.value = true; showControls.value = true; scheduleHideControls()
  // 续播定位：起播后 seek 到上次观看秒数（后端 currentProgress 已算好·消费一次防重复跳）
  // 已看完的课时（进度≈片尾）不跳，避免 seek 到末尾立即 ended 触发自动连播
  if (resumeAt.value > 0 && (!duration.value || resumeAt.value < duration.value - 5)) {
    const t = resumeAt.value
    resumeAt.value = 0
    setTimeout(() => playerCtx().seek(t), 80)
  } else {
    resumeAt.value = 0
  }
}
// 视频源加载失败（.mov 安卓不支持 / 转码中 / 404）→ 诚实态提示而非黑屏
function onVideoError() { playError.value = true; isPlaying.value = false }
function onPause() { isPlaying.value = false; showControls.value = true; if (hideTimer) clearTimeout(hideTimer) }
// 点播放器区域：起播后切换控制层显隐（控制层内交互元素已 stop 不冒泡到这里）
function onPlayerTap() {
  if (!started.value) return
  showControls.value = !showControls.value
  if (showControls.value) scheduleHideControls()
}
// 进度回填（自定义进度条/时间显示由此驱动）
// uni video 的 timeupdate 事件 detail 含 currentTime/duration；DOM 类型不含故用 any
function onTimeUpdate(e: any) {
  currentTime.value = e?.detail?.currentTime || 0
  if (e?.detail?.duration) duration.value = e.detail.duration
  saveProgressThrottled()
}
// 进度回写（节流 10s/次）：仅有真实观看权限时回写，试看未购不写避免 403 噪声
function saveProgressThrottled() {
  if (!currentLessonId.value || !duration.value || trialMode.value) return
  const now = Date.now()
  if (now - lastSaveTs < 10000) return
  lastSaveTs = now
  const pct = Math.min(100, Math.round((currentTime.value / duration.value) * 100))
  if (pct <= 0) return
  courseApi.saveProgress(currentLessonId.value, pct, true).catch(() => { /* 静默：进度回写失败不打断播放 */ })
}
// 视频态进度轨点击跳转（保守：只做 tap 定位，touchmove 拖动不做）
function onTrackTap(e: any) {
  if (!duration.value) return
  uni.createSelectorQuery().in(inst?.proxy as any).select('.track').boundingClientRect((rect: any) => {
    const r = Array.isArray(rect) ? rect[0] : rect
    if (!r || !r.width) return
    const x = e?.detail?.x ?? e?.changedTouches?.[0]?.clientX ?? e?.touches?.[0]?.clientX ?? 0
    const ratio = Math.max(0, Math.min(1, (x - r.left) / r.width))
    const t = ratio * duration.value
    currentTime.value = t
    playerCtx().seek(t)
  }).exec()
}
// 播完自动进入下一节（可关）
function onEnded() {
  isPlaying.value = false
  if (autoNext.value && content.value?.nextLesson) switchLesson(content.value.nextLesson.id)
}
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) playerCtx().requestFullScreen({ direction: 0 })
  else playerCtx().exitFullScreen()
}
// 课时切换：就地换源续播（不再整页跳转重载——连播/上一节下一节/目录切换均一步到位）
async function switchLesson(id: string) {
  if (!id || switching.value) return
  if (id === currentLessonId.value) { showChapterDrawer.value = false; return }
  // 目标课时锁定（试看用户连播/下一课到付费章节）→ 直接拉起购买，不打接口吃 403 报错
  const target = (chapters.value as PlayerChapter[])
    .flatMap((c) => (c.lessons || []).map((l) => ({ c, l })))
    .find((x) => x.l.id === id)
  if (target && lessonLocked(target.c, target.l)) {
    showChapterDrawer.value = false
    if (courseDetail.value) showPurchase.value = true
    else uni.showToast({ title: '请购买课程后观看', icon: 'none' })
    return
  }
  switching.value = true
  showChapterDrawer.value = false
  try {
    const next = await courseApi.getPlayerContent(id)
    currentLessonId.value = id
    lessonId.value = id
    content.value = next
    currentTime.value = 0
    duration.value = next.duration || 0
    resumeAt.value = next.currentProgress || 0 // 续播定位：换课时后起播跳到上次进度
    playError.value = false
    lastSaveTs = 0
    started.value = !!next.videoUrl ? started.value : true
    // 换源后立即续播（用户已有交互，程序化播放不被拦截）
    if (next.videoUrl) setTimeout(() => playerCtx().play(), 60)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '切换失败，请重试', icon: 'none' })
  } finally {
    switching.value = false
  }
}
async function submitQuestion() {
  if (!questionContent.value.trim() || submittingQuestion.value) return
  submittingQuestion.value = true
  try {
    await courseApi.askQuestion(courseId.value, questionContent.value.trim(), lessonId.value || undefined)
    uni.showToast({ title: '问题已提交', icon: 'success' })
    questionContent.value = ''
    showQuestionPanel.value = false
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败，请重试', icon: 'none' })
  } finally {
    submittingQuestion.value = false
  }
}
// 已购/免费课全解锁；未购仅免费试看章节可点（此前漏判 hasAccess，已购用户在目录里被误锁）
function lessonLocked(chapter: PlayerChapter, lesson: PlayerChapterLesson) {
  if (hasAccess.value || courseDetail.value?.isFree) return false
  return !lesson.isFree && !chapter.isFree
}
// 目录内点击课时：锁定（未购付费）→ 直接拉起购买面板（不再只弹 toast 断路）；否则一步切换播放
function onDrawerLessonTap(chapter: PlayerChapter, lesson: PlayerChapterLesson) {
  if (lessonLocked(chapter, lesson)) {
    showChapterDrawer.value = false
    if (courseDetail.value) showPurchase.value = true
    else uni.showToast({ title: '请购买课程后观看', icon: 'none' })
    return
  }
  switchLesson(lesson.id)
}
// 播放页内购买成功：立即解锁 + 隐藏试看条（目录锁态由 hasAccess 响应式解开）
function onPurchased() {
  showPurchase.value = false
  hasAccess.value = true
  uni.showToast({ title: '购买成功，已解锁全部章节', icon: 'success' })
}

// 图文态「完成本讲」：切换到下一课时（末讲则触发完课横幅刷新）
function onArticleDone() {
  if (content.value?.nextLesson) switchLesson(content.value.nextLesson.id)
  else refreshProgress()
}

// 完课进度检查（静默）：全部课时学完则展示祝贺横幅
async function refreshProgress() {
  if (!courseId.value) return
  try {
    const p = await courseApi.getProgress(courseId.value, true)
    if (p.totalLessons > 0 && p.completedLessons >= p.totalLessons) {
      completedAll.value = true
      showCongrats.value = true
    }
  } catch { /* 静默：无进度不显示完课横幅 */ }
}
// 打开证书弹层：真连 getCertificate（未学完后端 403 → toast 提示）
async function openCert() {
  showCongrats.value = false
  showCert.value = true
  if (cert.value || certLoading.value) return
  certLoading.value = true
  try {
    cert.value = await courseApi.getCertificate(courseId.value)
  } catch (e) {
    showCert.value = false
    uni.showToast({ title: (e as Error)?.message || '证书暂未生成', icon: 'none' })
  } finally {
    certLoading.value = false
  }
}
// 「写个评价」：跳课程详情评价区（complete 页已退役，F3 写评价弹层未上线前先落详情页真实评价入口，不制造死链）
function goReview() {
  showCongrats.value = false
  showCert.value = false
  navigateTo(`/pkg-course/detail/index?id=${courseId.value}&tab=review`)
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    if (!courseId.value) throw new Error('缺少课程参数，请从课程页进入')
    const playerChapters = await courseApi.getPlayerChapters(courseId.value)
    chapters.value = playerChapters
    // 深链/分享未带 lesson 参数时，回退到目录中第一个课时（不再用占位 '1' 打后端）
    if (!lessonId.value) {
      const first = playerChapters.flatMap((c) => c.lessons || [])[0]
      if (!first?.id) throw new Error('该课程暂无可播放的课时')
      lessonId.value = first.id
      currentLessonId.value = first.id
    }
    content.value = await courseApi.getPlayerContent(lessonId.value)
    duration.value = content.value?.duration || 0
    resumeAt.value = content.value?.currentProgress || 0 // 续播定位：起播跳到上次观看秒数
    playError.value = false
    lastSaveTs = 0
    // 图文课时无视频，无需起播封面
    if (isArticleMode.value) started.value = true
    // 权限 + 课程概要 + 完课进度并行静默回填（不阻塞播放主链路）
    void courseApi.checkAccess(courseId.value).then((v) => { hasAccess.value = v }).catch(() => { /* 静默 */ })
    void courseApi.getDetail(courseId.value).then((d) => { courseDetail.value = d }).catch(() => { /* 静默：无概要则不显示试看条 */ })
    void refreshProgress()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  lessonId.value = options?.lesson || ''
  courseId.value = options?.id || ''
  currentLessonId.value = lessonId.value
})

onMounted(() => {
  loadData()
})

// 🔴 买完课回来仍未购态修复：从收银台/详情页返回播放页时回刷购买态
//    （微信渠道跳收银页支付后 PurchaseSheet 不会 emit paid，此前只进页拉一次，试看条/目录锁态永不解开）
//    防抖：首次 onShow（进页）跳过，loadData 已并行拉取
let firstShowDone = false
onShow(() => {
  if (!firstShowDone) { firstShowDone = true; return }
  if (!courseId.value) return
  void courseApi.checkAccess(courseId.value).then((v) => { hasAccess.value = v }).catch(() => { /* 静默 */ })
})
</script>

<template>
  <!-- 骨架屏 -->
  <view v-if="loading" class="page">
    <view class="sk sk-dark sk-video" />
    <view class="sk-lines">
      <view class="sk sk-l1" />
      <view class="sk-tabs">
        <view class="sk sk-tab" /><view class="sk sk-tab" /><view class="sk sk-tab" />
      </view>
      <view class="sk sk-l2" /><view class="sk sk-l2" /><view class="sk sk-l2" />
    </view>
  </view>

  <!-- Error -->
  <view v-else-if="error" class="error-wrap">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>

  <!-- ══════════ 图文态：整页沉浸阅读 ══════════ -->
  <view v-else-if="isArticleMode" class="page">
    <!-- 完课横幅 -->
    <view v-if="showCongrats" class="congrats">
      <view class="congrats-title serif">
        <app-icon name="award" :size="40" color="#C9A96E" />
        <text class="congrats-title-txt">恭喜完成全部课程</text>
      </view>
      <text class="congrats-sub">{{ lessonTotal }} 讲全部学完 · 学习证书已生成</text>
      <view class="congrats-btns">
        <view class="cbtn primary" @tap="openCert"><text class="cbtn-txt-w">查看证书</text></view>
        <view class="cbtn soft" @tap="goReview"><text class="cbtn-txt-r">写个评价</text></view>
      </view>
    </view>

    <!-- 顶栏：返回 + 课时切换入口 -->
    <view class="a-nav">
      <view class="a-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <view class="a-nav-mid" @tap="showChapterDrawer = true">
        <text class="a-nav-mid-txt">第 {{ lessonIndex }}/{{ lessonTotal }} 讲 · 目录</text>
        <app-icon name="chevron-down" :size="24" color="#6E6E73" />
      </view>
      <view class="a-nav-btn" />
    </view>

    <scroll-view scroll-y class="a-scroll">
      <view class="article">
        <text class="a-title serif">{{ content.title }}</text>
        <text class="a-meta">第 {{ lessonIndex }} 讲 · 图文</text>
        <!-- 图文正文：后端把课时富文本落在 content 字段（getPlayerContent 未单列此字段时为空，走占位诚实降级，不臆造正文） -->
        <rich-text v-if="content.content" class="a-body" :nodes="content.content" />
        <text v-else class="a-body-text">本讲为图文课时，暂无正文内容。</text>
      </view>
      <!-- 完成本讲 -->
      <view class="done-zone">
        <view class="done-btn" @tap="onArticleDone">
          <text class="done-btn-txt">{{ content.nextLesson ? '完成本讲，下一讲' : '完成本讲' }}</text>
          <app-icon name="chevron-right" :size="30" color="#ffffff" />
        </view>
        <text v-if="content.nextLesson" class="done-hint">下一讲 · {{ content.nextLesson.title }}</text>
      </view>
    </scroll-view>

    <!-- 目录抽屉（图文态复用） -->
    <view v-if="showChapterDrawer" class="drawer-modal">
      <view class="drawer-mask" @tap="showChapterDrawer = false" />
      <view class="drawer">
        <view class="drawer-hdr">
          <text class="drawer-title serif">课程目录</text>
          <view @tap="showChapterDrawer = false"><app-icon name="x" :size="36" color="#2C2C2C" /></view>
        </view>
        <scroll-view scroll-y class="drawer-body">
          <view v-for="chapter in chapters" :key="chapter.id" class="dw-chapter">
            <text class="dw-chapter-title">{{ chapter.title }}</text>
            <view class="dw-lessons">
              <view
                v-for="lesson in chapter.lessons" :key="lesson.id"
                class="dw-lesson"
                :class="{ current: lesson.id === currentLessonId, locked: lessonLocked(chapter, lesson) }"
                @tap="onDrawerLessonTap(chapter, lesson)"
              >
                <app-icon v-if="lesson.isCompleted" name="check-circle" :size="30" color="#34A853" />
                <app-icon v-else-if="lessonLocked(chapter, lesson)" name="lock" :size="28" color="#999999" />
                <app-icon v-else name="play" :size="28" color="#999999" />
                <text class="dw-lesson-title">{{ lesson.title }}</text>
                <text class="dw-lesson-dur">{{ formatTime(lesson.duration) }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <purchase-sheet
      :open="showPurchase"
      :product="courseDetail ? { id: courseDetail.id, name: courseDetail.title, cover: courseDetail.cover, price: courseDetail.price, originalPrice: courseDetail.originalPrice } : null"
      biz-type="COURSE" :allow-qty="false"
      @close="showPurchase = false" @paid="onPurchased"
    />
    <!-- 证书弹层（图文态复用，见下方公共弹层） -->
    <view v-if="showCert" class="cert-mask" @tap="showCert = false">
      <view class="cert-modal" @tap.stop>
        <view v-if="certLoading" class="cert-loading"><text class="cert-loading-txt">证书生成中…</text></view>
        <view v-else-if="cert" class="cert-paper">
          <view class="cert-head">
            <app-icon name="award" :size="56" color="#C9A96E" />
            <text class="cert-h-title serif">结业证书</text>
            <text class="cert-h-sub">CERTIFICATE OF COMPLETION</text>
          </view>
          <text class="cert-name serif">{{ cert.studentName }}</text>
          <text class="cert-line">恭喜您完成</text>
          <text class="cert-subject serif">《{{ cert.courseName }}》</text>
          <view class="cert-stats">
            <view class="cert-stat"><text class="cert-stat-v">{{ cert.totalHours }}h</text><text class="cert-stat-l">学习时长</text></view>
            <view class="cert-stat"><text class="cert-stat-v">{{ lessonTotal }}节</text><text class="cert-stat-l">完成章节</text></view>
            <view v-if="cert.score != null" class="cert-stat"><text class="cert-stat-v">{{ cert.score }}</text><text class="cert-stat-l">成绩</text></view>
          </view>
          <view class="cert-foot">
            <text class="cert-foot-t">讲师：{{ cert.instructor }}</text>
            <text class="cert-foot-t">证书编号：{{ cert.certificateNo }}</text>
            <text class="cert-foot-t">颁发日期：{{ cert.completedAt }}</text>
          </view>
        </view>
        <view class="cert-actions">
          <view class="cert-action save" @tap="showCert = false"><text class="cert-action-save-txt">关闭</text></view>
          <view class="cert-action more" @tap="goReview"><text class="cert-action-more-txt">写个评价</text></view>
        </view>
      </view>
    </view>
  </view>

  <!-- ══════════ 视频态 / 音频态 / 试看态 ══════════ -->
  <view v-else class="page">
    <!-- 完课横幅（顶部下弹） -->
    <view v-if="showCongrats" class="congrats">
      <view class="congrats-title serif">
        <app-icon name="award" :size="40" color="#C9A96E" />
        <text class="congrats-title-txt">恭喜完成全部课程</text>
      </view>
      <text class="congrats-sub">{{ lessonTotal }} 讲全部学完 · 学习证书已生成</text>
      <view class="congrats-btns">
        <view class="cbtn primary" @tap="openCert"><text class="cbtn-txt-w">查看证书</text></view>
        <view class="cbtn soft" @tap="goReview"><text class="cbtn-txt-r">写个评价</text></view>
      </view>
    </view>

    <!-- ── 播放区（深色沉浸 #111） ── -->
    <view class="player-zone">
      <!-- 顶条：返回 + 课程名 -->
      <view class="player-top">
        <view class="p-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#ffffff" /></view>
        <text class="p-top-title">{{ content.courseTitle }}</text>
        <view class="p-btn-ph" />
      </view>

      <!-- 音频态：封面大图 + 波形 + 播控（🔴UI 层盖在收起的 video 之上——video 不卸载，声音与进度继续） -->
      <view v-if="isAudioMode" class="audio-stage">
        <view class="audio-cover"><image class="audio-cover-img" :src="content.cover || courseDetail?.cover || ''" mode="aspectFill" /></view>
        <view class="wave">
          <view v-for="n in 40" :key="n" class="wave-i" :class="{ on: (n / 40) * 100 <= progressPercent }" :style="{ height: (10 + (n * 7) % 18) + 'rpx' }" />
        </view>
        <view class="audio-time"><text class="audio-time-t">{{ formatTime(currentTime) }}</text><text class="audio-time-t">{{ formatTime(duration) }}</text></view>
        <view class="audio-ctrl">
          <view class="a-skip" @tap="seekBy(-15)"><app-icon name="skip-back" :size="44" color="rgba(255,255,255,0.85)" /><text class="a-skip-t">15s</text></view>
          <view class="a-play" @tap="togglePlay"><app-icon :name="isPlaying ? 'pause' : 'play'" :size="44" color="#111111" :fill="!isPlaying" /></view>
          <view class="a-skip" @tap="seekBy(15)"><app-icon name="skip-forward" :size="44" color="rgba(255,255,255,0.85)" /><text class="a-skip-t">15s</text></view>
        </view>
        <view class="a-speed-wrap">
          <text class="a-speed" @tap="showSpeedMenu = !showSpeedMenu">{{ playbackRate }}x</text>
          <view v-if="showSpeedMenu" class="speed-menu speed-menu-audio">
            <text v-for="r in speeds" :key="r" class="speed-item" :class="{ active: playbackRate === r }" @tap="changeSpeed(r)">{{ r }}x</text>
          </view>
        </view>
        <view class="audio-exit" @tap="isAudioMode = false"><text class="audio-exit-t">恢复视频</text></view>
      </view>

      <!-- 视频态 / 试看态
           🔴 音频模式修复：此前 v-else 会把 video 整个卸载，playerCtx 指向已销毁元素，
           音频台播放/暂停/进度/倍速控件全部空转。现改为音频模式下仅视觉收起（height:0 overflow:hidden），
           video 元素常驻 DOM，切换前后 uni.createVideoContext('courseVideo') 始终作用于同一元素。 -->
      <view class="video" :class="{ 'video--audio': isAudioMode }" @tap="onPlayerTap">
        <video
          id="courseVideo"
          class="video-el"
          :src="content.videoUrl"
          :controls="false"
          :show-center-play-btn="false"
          :muted="isMuted"
          autoplay
          object-fit="contain"
          :poster="content.cover || ''"
          @play="onPlay"
          @pause="onPause"
          @timeupdate="onTimeUpdate"
          @ended="onEnded"
          @error="onVideoError"
        />

        <!-- 不可播诚实态：源加载失败（.mov 安卓不支持 / 转码中 / 404）→ 提示而非黑屏 -->
        <view v-if="playError" class="video-unplayable">
          <app-icon name="video-off" :size="60" color="rgba(255,255,255,0.6)" />
          <text class="video-unplayable-t">该课时视频暂不可播</text>
          <text class="video-unplayable-s">格式暂不支持或正在转码，请稍后再试</text>
        </view>

        <!-- 起播前封面层：唯一一层中央播放钮，整层可点（失败态不显示，让位诚实态） -->
        <view v-if="!started && !playError" class="start-cover" @tap.stop="togglePlay">
          <view class="start-btn"><app-icon name="play" :size="60" color="#ffffff" :fill="true" /></view>
        </view>

        <!-- 控制条（起播后出现，播放中 4 秒淡出） -->
        <view v-else class="ctrl" :class="{ hidden: !showControls }" @tap.stop>
          <!-- 进度：当前时长 · 可拖轨 · 总时长 -->
          <view class="ctrl-progress">
            <text class="time">{{ formatTime(currentTime) }}</text>
            <view class="track" @tap.stop="onTrackTap"><view class="track-fill" :style="{ width: progressPercent + '%' }" /><view class="track-dot" :style="{ left: progressPercent + '%' }" /></view>
            <text class="time">{{ formatTime(duration) }}</text>
          </view>
          <view class="ctrl-row">
            <view class="ctrl-play" @tap="togglePlay"><app-icon :name="isPlaying ? 'pause' : 'play'" :size="40" color="#ffffff" :fill="!isPlaying" /></view>
            <view class="ctrl-right">
              <!-- 倍速 -->
              <view class="speed-wrap">
                <text class="ctrl-txt" @tap="showSpeedMenu = !showSpeedMenu">{{ playbackRate }}x</text>
                <view v-if="showSpeedMenu" class="speed-menu">
                  <text v-for="r in speeds" :key="r" class="speed-item" :class="{ active: playbackRate === r }" @tap="changeSpeed(r)">{{ r }}x</text>
                </view>
              </view>
              <!-- 音频模式 -->
              <view @tap="isAudioMode = true"><app-icon name="headphones" :size="34" color="#ffffff" /></view>
              <!-- 全屏 -->
              <view @tap="toggleFullscreen"><app-icon :name="isFullscreen ? 'minimize' : 'maximize'" :size="34" color="#ffffff" /></view>
            </view>
          </view>
        </view>

        <!-- 试看中：非阻断提示条（底部半透明深底 + 白字 + 小购买钮） -->
        <view v-if="trialMode && started" class="trial-bar" @tap.stop>
          <text class="trial-txt">试看中 · 购买解锁全部 {{ lessonTotal }} 讲</text>
          <view class="trial-buy" @tap="showPurchase = true"><text class="trial-buy-t">¥{{ courseDetail?.price }} 购买</text></view>
        </view>
      </view>
    </view>

    <!-- ── 课时标题行 ── -->
    <view class="lesson-head">
      <text class="lesson-title serif">{{ content.title }}</text>
      <text class="lesson-idx">第 {{ lessonIndex }}/{{ lessonTotal }} 讲</text>
    </view>

    <!-- ── Tab 三栏 ── -->
    <view class="tabs">
      <view class="tab" :class="{ active: activeTab === 'catalog' }" @tap="activeTab = 'catalog'"><text class="tab-txt">目录</text></view>
      <view class="tab" :class="{ active: activeTab === 'intro' }" @tap="activeTab = 'intro'"><text class="tab-txt">简介</text></view>
      <view class="tab" :class="{ active: activeTab === 'discuss' }" @tap="activeTab = 'discuss'"><text class="tab-txt">讨论</text></view>
    </view>

    <!-- Tab · 目录 -->
    <view v-if="activeTab === 'catalog'" class="tab-body">
      <view class="autoplay-row">
        <text class="autoplay-txt">播完自动播放下一课时</text>
        <view class="switch" :class="{ off: !autoNext }" @tap="autoNext = !autoNext"><view class="switch-knob" /></view>
      </view>
      <view v-for="chapter in chapters" :key="chapter.id" class="cat-chapter">
        <text class="cat-chapter-title">{{ chapter.title }}</text>
        <view
          v-for="lesson in chapter.lessons" :key="lesson.id"
          class="lesson-row"
          :class="{ current: lesson.id === currentLessonId, done: lesson.isCompleted, locked: lessonLocked(chapter, lesson) }"
          @tap="onDrawerLessonTap(chapter, lesson)"
        >
          <!-- 状态图标：播放中动效 / 已完成 / 锁定 / 序号 -->
          <view v-if="lesson.id === currentLessonId && isPlaying" class="eq"><view class="eq-i" /><view class="eq-i" /><view class="eq-i" /></view>
          <app-icon v-else-if="lesson.isCompleted" name="check-circle" :size="28" color="#34A853" />
          <app-icon v-else-if="lessonLocked(chapter, lesson)" name="lock" :size="26" color="#999999" />
          <app-icon v-else name="play" :size="24" color="#999999" />
          <text class="lesson-name">{{ lesson.title }}</text>
          <text class="lesson-dur" :class="{ playing: lesson.id === currentLessonId }">{{ lesson.id === currentLessonId ? '播放中' : formatTime(lesson.duration) }}</text>
        </view>
      </view>
    </view>

    <!-- Tab · 简介 -->
    <view v-else-if="activeTab === 'intro'" class="tab-body">
      <text class="sec-title">课程简介</text>
      <text class="intro-text">{{ courseDetail?.description || content.courseTitle || '暂无课程简介' }}</text>
      <view v-if="courseDetail?.instructor" class="teacher" @tap="courseDetail.instructor.id && navigateTo(`/pkg-course/instructor/index?id=${courseDetail.instructor.id}`)">
        <smart-avatar :src="courseDetail.instructor.avatar" :name="courseDetail.instructor.name || ''" class="teacher-avatar" />
        <view class="t-info">
          <text class="t-name">{{ courseDetail.instructor.name }}</text>
          <text class="t-title">{{ courseDetail.instructor.title || '主讲老师' }}</text>
        </view>
        <app-icon name="chevron-right" :size="30" color="#999999" />
      </view>
    </view>

    <!-- Tab · 讨论（评论流后端暂无课时级列表端点，入口保留：向老师提问 + 吸底输入） -->
    <view v-else class="tab-body discuss-body">
      <view class="discuss-empty">
        <app-icon name="message-circle" :size="64" color="#C9A96E" />
        <text class="discuss-empty-t">还没有讨论，来问老师第一个问题</text>
      </view>
      <view class="input-bar" @tap="showQuestionPanel = true">
        <view class="input-box"><text class="input-box-t">说说你的想法…</text></view>
      </view>
    </view>

    <!-- 章节抽屉（视频态目录快捷入口，与 Tab 目录同规则） -->
    <view v-if="showChapterDrawer" class="drawer-modal">
      <view class="drawer-mask" @tap="showChapterDrawer = false" />
      <view class="drawer">
        <view class="drawer-hdr">
          <text class="drawer-title serif">课程目录</text>
          <view @tap="showChapterDrawer = false"><app-icon name="x" :size="36" color="#2C2C2C" /></view>
        </view>
        <scroll-view scroll-y class="drawer-body">
          <view v-for="chapter in chapters" :key="chapter.id" class="dw-chapter">
            <text class="dw-chapter-title">{{ chapter.title }}</text>
            <view class="dw-lessons">
              <view
                v-for="lesson in chapter.lessons" :key="lesson.id"
                class="dw-lesson"
                :class="{ current: lesson.id === currentLessonId, locked: lessonLocked(chapter, lesson) }"
                @tap="onDrawerLessonTap(chapter, lesson)"
              >
                <app-icon v-if="lesson.isCompleted" name="check-circle" :size="30" color="#34A853" />
                <app-icon v-else-if="lessonLocked(chapter, lesson)" name="lock" :size="28" color="#999999" />
                <app-icon v-else name="play" :size="28" color="#999999" />
                <text class="dw-lesson-title">{{ lesson.title }}</text>
                <text class="dw-lesson-dur">{{ formatTime(lesson.duration) }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 播放页内购买弹窗 -->
    <purchase-sheet
      :open="showPurchase"
      :product="courseDetail ? { id: courseDetail.id, name: courseDetail.title, cover: courseDetail.cover, price: courseDetail.price, originalPrice: courseDetail.originalPrice } : null"
      biz-type="COURSE" :allow-qty="false"
      @close="showPurchase = false" @paid="onPurchased"
    />

    <!-- 提问面板 -->
    <view v-if="showQuestionPanel" class="sheet-modal">
      <view class="sheet-mask" @tap="showQuestionPanel = false" />
      <view class="q-sheet">
        <view class="q-sheet-hdr">
          <text class="q-sheet-title serif">向老师提问</text>
          <view @tap="showQuestionPanel = false"><app-icon name="x" :size="36" color="#2C2C2C" /></view>
        </view>
        <view class="q-sheet-body">
          <textarea v-model="questionContent" class="q-input" placeholder="描述你的问题，老师会尽快回复..." placeholder-class="q-ph" />
        </view>
        <view class="q-sheet-foot">
          <view class="q-submit" :class="{ disabled: !questionContent.trim() || submittingQuestion }" @tap="submitQuestion">
            <text class="q-submit-txt">{{ submittingQuestion ? '提交中...' : '提交问题' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 证书弹层 -->
    <view v-if="showCert" class="cert-mask" @tap="showCert = false">
      <view class="cert-modal" @tap.stop>
        <view v-if="certLoading" class="cert-loading"><text class="cert-loading-txt">证书生成中…</text></view>
        <view v-else-if="cert" class="cert-paper">
          <view class="cert-head">
            <app-icon name="award" :size="56" color="#C9A96E" />
            <text class="cert-h-title serif">结业证书</text>
            <text class="cert-h-sub">CERTIFICATE OF COMPLETION</text>
          </view>
          <text class="cert-name serif">{{ cert.studentName }}</text>
          <text class="cert-line">恭喜您完成</text>
          <text class="cert-subject serif">《{{ cert.courseName }}》</text>
          <view class="cert-stats">
            <view class="cert-stat"><text class="cert-stat-v">{{ cert.totalHours }}h</text><text class="cert-stat-l">学习时长</text></view>
            <view class="cert-stat"><text class="cert-stat-v">{{ lessonTotal }}节</text><text class="cert-stat-l">完成章节</text></view>
            <view v-if="cert.score != null" class="cert-stat"><text class="cert-stat-v">{{ cert.score }}</text><text class="cert-stat-l">成绩</text></view>
          </view>
          <view class="cert-foot">
            <text class="cert-foot-t">讲师：{{ cert.instructor }}</text>
            <text class="cert-foot-t">证书编号：{{ cert.certificateNo }}</text>
            <text class="cert-foot-t">颁发日期：{{ cert.completedAt }}</text>
          </view>
        </view>
        <view class="cert-actions">
          <view class="cert-action save" @tap="showCert = false"><text class="cert-action-save-txt">关闭</text></view>
          <view class="cert-action more" @tap="goReview"><text class="cert-action-more-txt">写个评价</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; position: relative; }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }

/* ═══ 播放区（深色 #111） ═══ */
.player-zone { background: #111; position: relative; }
.player-top { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; }
.p-btn { width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; }
.p-btn-ph { width: 64rpx; }
.p-top-title { flex: 1; text-align: center; color: rgba(255,255,255,0.85); font-size: 26rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin: 0 16rpx; }

/* 视频 16:9（padding-top 撑高，X5 安全） */
.video { position: relative; width: 100%; padding-top: 56.25%; background: #000; }
/* 音频模式：video 收起不卸载（尺寸归零仍在 DOM，声音/timeupdate/seek 全部继续；恢复视频只是撑回高度） */
.video--audio { padding-top: 0; height: 0; overflow: hidden; }
.video-el { position: absolute; inset: 0; width: 100%; height: 100%; background: #000; }

/* 不可播诚实态 */
.video-unplayable { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16rpx; background: rgba(0,0,0,0.72); }
.video-unplayable-t { color: rgba(255,255,255,0.9); font-size: 28rpx; }
.video-unplayable-s { color: rgba(255,255,255,0.55); font-size: 22rpx; }

/* 起播前封面层 */
.start-cover { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.28); }
.start-btn { width: 128rpx; height: 128rpx; border-radius: 50%; background: rgba(196,30,58,0.9); display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.4); }

/* 控制条 */
.ctrl { position: absolute; left: 0; right: 0; bottom: 0; padding: 44rpx 28rpx 20rpx; background: linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0)); transition: opacity 0.3s; }
.ctrl.hidden { opacity: 0; pointer-events: none; }
.ctrl-progress { display: flex; align-items: center; gap: 16rpx; }
.time { color: #fff; font-size: 22rpx; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.track { flex: 1; height: 6rpx; border-radius: 4rpx; background: rgba(255,255,255,0.28); position: relative; }
.track-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4rpx; background: #C41E3A; }
.track-dot { position: absolute; top: 50%; width: 24rpx; height: 24rpx; border-radius: 50%; background: #fff; transform: translate(-50%, -50%); box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.4); }
.ctrl-row { display: flex; align-items: center; gap: 32rpx; margin-top: 16rpx; }
.ctrl-play { display: flex; align-items: center; }
.ctrl-right { margin-left: auto; display: flex; align-items: center; gap: 28rpx; }
.ctrl-txt { color: #fff; font-size: 24rpx; font-weight: 600; }
.speed-wrap { position: relative; }
.speed-menu { position: absolute; bottom: 100%; right: 0; margin-bottom: 16rpx; background: #27272A; border-radius: 16rpx; padding: 8rpx 0; min-width: 108rpx; }
.speed-item { display: block; padding: 14rpx 24rpx; font-size: 24rpx; color: #fff; text-align: center; }
.speed-item.active { color: #C41E3A; }

/* 试看提示条 */
.trial-bar { position: absolute; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.66); display: flex; align-items: center; gap: 20rpx; padding: 18rpx 28rpx; }
.trial-txt { color: #fff; font-size: 26rpx; flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.trial-buy { background: #C41E3A; border-radius: 999rpx; padding: 12rpx 28rpx; flex-shrink: 0; }
.trial-buy-t { color: #fff; font-size: 24rpx; font-weight: 700; }

/* ═══ 音频态 ═══ */
.audio-stage { display: flex; flex-direction: column; align-items: center; padding: 52rpx 40rpx 48rpx; }
.audio-cover { width: 400rpx; height: 400rpx; border-radius: 36rpx; overflow: hidden; box-shadow: 0 24rpx 72rpx rgba(0,0,0,0.5); background: #222; }
.audio-cover-img { width: 100%; height: 100%; }
.wave { display: flex; align-items: center; gap: 6rpx; height: 56rpx; margin-top: 52rpx; }
.wave-i { width: 6rpx; border-radius: 4rpx; background: rgba(255,255,255,0.25); }
.wave-i.on { background: #C41E3A; }
.audio-time { display: flex; justify-content: space-between; width: 100%; max-width: 600rpx; margin-top: 16rpx; }
.audio-time-t { color: rgba(255,255,255,0.6); font-size: 22rpx; font-variant-numeric: tabular-nums; }
.audio-ctrl { display: flex; align-items: center; gap: 68rpx; margin-top: 36rpx; }
.a-skip { display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.a-skip-t { color: rgba(255,255,255,0.75); font-size: 20rpx; }
.a-play { width: 120rpx; height: 120rpx; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.4); }
.a-speed-wrap { position: relative; margin-top: 36rpx; }
.a-speed { color: #fff; font-size: 26rpx; font-weight: 600; background: rgba(255,255,255,0.12); padding: 10rpx 24rpx; border-radius: 999rpx; }
.speed-menu-audio { bottom: auto; top: 100%; right: 50%; transform: translateX(50%); margin: 16rpx 0 0; }
.audio-exit { margin-top: 28rpx; padding: 14rpx 36rpx; background: rgba(255,255,255,0.1); border-radius: 999rpx; }
.audio-exit-t { color: #fff; font-size: 24rpx; }

/* ═══ 课时标题行 ═══ */
.lesson-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 40rpx 20rpx; }
.lesson-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.lesson-idx { font-size: 26rpx; color: #999999; flex-shrink: 0; margin-left: 20rpx; }

/* ═══ Tab 三栏 ═══ */
.tabs { display: flex; gap: 52rpx; padding: 0 40rpx; border-bottom: 1rpx solid #EDE7DD; }
.tab { padding: 16rpx 0 20rpx; position: relative; }
.tab-txt { font-size: 30rpx; color: #6E6E73; }
.tab.active .tab-txt { color: #2C2C2C; font-weight: 700; }
.tab.active::after { content: ""; position: absolute; left: 50%; transform: translateX(-50%); bottom: 0; width: 40rpx; height: 6rpx; border-radius: 4rpx; background: #C41E3A; }

.tab-body { padding: 28rpx 40rpx 56rpx; }

/* 自动连播开关 */
.autoplay-row { display: flex; align-items: center; justify-content: space-between; padding-bottom: 20rpx; }
.autoplay-txt { font-size: 26rpx; color: #6E6E73; }
.switch { width: 80rpx; height: 48rpx; border-radius: 24rpx; background: #C41E3A; position: relative; flex-shrink: 0; transition: background 0.2s; }
.switch.off { background: #D8D3CB; }
.switch-knob { position: absolute; top: 4rpx; right: 4rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: #fff; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.2); transition: all 0.2s; }
.switch.off .switch-knob { right: auto; left: 4rpx; }

/* 目录列表 */
.cat-chapter-title { display: block; font-size: 30rpx; font-weight: 700; color: #2C2C2C; padding: 20rpx 0 8rpx; }
.lesson-row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 0; border-bottom: 1rpx solid #EDE7DD; }
.lesson-name { flex: 1; font-size: 30rpx; color: #2C2C2C; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.lesson-dur { font-size: 26rpx; color: #999999; flex-shrink: 0; }
.lesson-dur.playing { color: #C41E3A; }
.lesson-row.done .lesson-name { color: #6E6E73; }
.lesson-row.current .lesson-name { color: #C41E3A; font-weight: 700; }
.lesson-row.locked { opacity: 0.5; }
/* 播放中动效（三根跳动竖条） */
.eq { display: flex; align-items: flex-end; gap: 4rpx; height: 24rpx; flex-shrink: 0; width: 28rpx; justify-content: center; }
.eq-i { width: 6rpx; border-radius: 2rpx; background: #C41E3A; }
.eq-i:nth-child(1) { height: 12rpx; animation: eq 1s ease-in-out infinite; }
.eq-i:nth-child(2) { height: 24rpx; animation: eq 1s ease-in-out 0.2s infinite; }
.eq-i:nth-child(3) { height: 16rpx; animation: eq 1s ease-in-out 0.4s infinite; }
@keyframes eq { 50% { transform: scaleY(0.4); } }

/* 简介 Tab */
.sec-title { display: block; font-size: 30rpx; font-weight: 700; color: #2C2C2C; margin: 8rpx 0 20rpx; }
.intro-text { display: block; font-size: 28rpx; line-height: 1.8; color: #6E6E73; }
.teacher { display: flex; align-items: center; gap: 24rpx; background: #FFFFFF; border: 1rpx solid #EDE7DD; border-radius: 28rpx; padding: 26rpx 28rpx; margin-top: 32rpx; }
.teacher-avatar { width: 92rpx; height: 92rpx; border-radius: 50%; flex-shrink: 0; }
.teacher-avatar-ph { background: rgba(201,169,110,0.16); display: flex; align-items: center; justify-content: center; }
.teacher-avatar-t { font-size: 34rpx; font-weight: 700; color: #C9A96E; }
.t-info { flex: 1; min-width: 0; }
.t-name { display: block; font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.t-title { font-size: 24rpx; color: #C9A96E; margin-top: 4rpx; }

/* 讨论 Tab */
.discuss-body { min-height: 400rpx; }
.discuss-empty { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding: 72rpx 0; }
.discuss-empty-t { font-size: 26rpx; color: #999999; }
.input-bar { position: fixed; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-top: 1rpx solid #EDE7DD; padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); }
.input-box { height: 76rpx; border-radius: 999rpx; background: #F8F4EC; display: flex; align-items: center; padding: 0 32rpx; }
.input-box-t { font-size: 28rpx; color: #999999; }

/* ═══ 完课横幅 ═══ */
.congrats { position: absolute; top: 0; left: 0; right: 0; background: #FFFFFF; padding: 32rpx 40rpx 36rpx; box-shadow: 0 12rpx 48rpx rgba(0,0,0,0.16); border-radius: 0 0 36rpx 36rpx; z-index: 30; }
.congrats-title { display: flex; align-items: center; gap: 16rpx; }
.congrats-title-txt { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.congrats-sub { display: block; font-size: 26rpx; color: #6E6E73; margin-top: 8rpx; }
.congrats-btns { display: flex; gap: 20rpx; margin-top: 28rpx; }
.cbtn { flex: 1; height: 80rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.cbtn.primary { background: #C41E3A; }
.cbtn.soft { background: rgba(196,30,58,0.08); }
.cbtn-txt-w { font-size: 28rpx; font-weight: 600; color: #fff; }
.cbtn-txt-r { font-size: 28rpx; font-weight: 600; color: #C41E3A; }

/* ═══ 图文态 ═══ */
.a-nav { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; background: #FAF8F5; border-bottom: 1rpx solid #EDE7DD; z-index: 10; }
.a-nav-btn { width: 68rpx; height: 68rpx; border-radius: 50%; background: #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }
.a-nav-mid { display: flex; align-items: center; gap: 10rpx; }
.a-nav-mid-txt { font-size: 26rpx; color: #6E6E73; }
.a-scroll { height: 100vh; }
.article { padding: 44rpx 40rpx 28rpx; }
.a-title { display: block; font-size: 44rpx; font-weight: 700; line-height: 1.45; color: #2C2C2C; }
.a-meta { display: block; font-size: 26rpx; color: #999999; margin-top: 20rpx; padding-bottom: 36rpx; border-bottom: 1rpx solid #EDE7DD; }
.a-body { margin-top: 20rpx; font-size: 32rpx; line-height: 1.8; color: #2C2C2C; }
.a-body-text { display: block; margin-top: 36rpx; font-size: 32rpx; line-height: 1.8; color: #2C2C2C; }
.done-zone { padding: 16rpx 40rpx 80rpx; }
.done-btn { height: 96rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.done-btn-txt { font-size: 32rpx; font-weight: 700; color: #fff; }
.done-hint { display: block; text-align: center; font-size: 24rpx; color: #999999; margin-top: 20rpx; }

/* ═══ 章节抽屉 ═══ */
.drawer-modal { position: fixed; inset: 0; z-index: 50; }
.drawer-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
.drawer { position: absolute; right: 0; top: 0; bottom: 0; width: 580rpx; background: #FFFFFF; display: flex; flex-direction: column; }
.drawer-hdr { padding: 32rpx; border-bottom: 1rpx solid #EDE7DD; display: flex; align-items: center; justify-content: space-between; }
.drawer-title { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.drawer-body { flex: 1; padding: 24rpx 32rpx; }
.dw-chapter { margin-bottom: 40rpx; }
.dw-chapter-title { display: block; font-size: 28rpx; font-weight: 500; color: #6E6E73; margin-bottom: 16rpx; }
.dw-lessons { display: flex; flex-direction: column; gap: 8rpx; }
.dw-lesson { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; border-radius: 20rpx; }
.dw-lesson.current { background: rgba(196,30,58,0.08); }
.dw-lesson.locked { opacity: 0.5; }
.dw-lesson-title { flex: 1; font-size: 28rpx; color: #2C2C2C; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.dw-lesson.current .dw-lesson-title { color: #C41E3A; font-weight: 700; }
.dw-lesson-dur { font-size: 24rpx; color: #999999; }

/* ═══ 提问面板 ═══ */
.sheet-modal { position: fixed; inset: 0; z-index: 50; }
.sheet-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
.q-sheet { position: absolute; bottom: 0; left: 0; right: 0; background: #FFFFFF; border-radius: 40rpx 40rpx 0 0; }
.q-sheet-hdr { padding: 32rpx; border-bottom: 1rpx solid #EDE7DD; display: flex; align-items: center; justify-content: space-between; }
.q-sheet-title { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.q-sheet-body { padding: 32rpx; }
.q-input { width: 100%; height: 256rpx; background: #F8F4EC; border-radius: 20rpx; padding: 28rpx; font-size: 28rpx; color: #2C2C2C; box-sizing: border-box; }
.q-ph { color: #999999; }
.q-sheet-foot { padding: 24rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); }
.q-submit { width: 100%; height: 92rpx; background: #C41E3A; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.q-submit.disabled { opacity: 0.5; }
.q-submit-txt { font-size: 30rpx; font-weight: 600; color: #fff; }

/* ═══ 证书弹层（纯色纸面，X5 无毛玻璃承载） ═══ */
.cert-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 48rpx; }
.cert-modal { width: 100%; max-width: 660rpx; }
.cert-loading { background: #FFFDF7; border-radius: 32rpx; padding: 96rpx 0; text-align: center; }
.cert-loading-txt { font-size: 28rpx; color: #999999; }
.cert-paper { background: #FDF7E9; border: 2rpx solid rgba(201,169,110,0.5); border-radius: 32rpx; padding: 56rpx 48rpx; text-align: center; }
.cert-head { display: flex; flex-direction: column; align-items: center; gap: 10rpx; margin-bottom: 32rpx; }
.cert-h-title { font-size: 40rpx; font-weight: 700; color: #C9A96E; margin-top: 8rpx; }
.cert-h-sub { font-size: 20rpx; letter-spacing: 4rpx; color: #C9A96E; }
.cert-name { display: block; font-size: 48rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 16rpx; }
.cert-line { display: block; font-size: 26rpx; color: #6E6E73; }
.cert-subject { display: block; font-size: 32rpx; font-weight: 700; color: #C41E3A; margin: 16rpx 0 32rpx; }
.cert-stats { display: flex; justify-content: space-around; padding: 32rpx 0; border-top: 1rpx solid rgba(201,169,110,0.3); border-bottom: 1rpx solid rgba(201,169,110,0.3); margin-bottom: 32rpx; }
.cert-stat { display: flex; flex-direction: column; gap: 8rpx; }
.cert-stat-v { font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.cert-stat-l { font-size: 24rpx; color: #999999; }
.cert-foot { display: flex; flex-direction: column; gap: 8rpx; }
.cert-foot-t { font-size: 22rpx; color: #999999; }
.cert-actions { display: flex; gap: 20rpx; margin-top: 32rpx; }
.cert-action { flex: 1; height: 88rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.cert-action.save { background: #FFFFFF; border: 1rpx solid #C41E3A; }
.cert-action-save-txt { font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.cert-action.more { background: #C41E3A; }
.cert-action-more-txt { font-size: 28rpx; font-weight: 600; color: #fff; }

/* ═══ 骨架屏 / 错误 ═══ */
.sk { position: relative; overflow: hidden; background: #EFEAE2; }
.sk-dark { background: #1E1E1E; }
.sk-video { width: 100%; padding-top: 56.25%; }
.sk-lines { padding: 28rpx 40rpx; display: flex; flex-direction: column; gap: 28rpx; }
.sk-l1 { height: 36rpx; width: 70%; border-radius: 8rpx; }
.sk-tabs { display: flex; gap: 52rpx; }
.sk-tab { height: 30rpx; width: 64rpx; border-radius: 8rpx; }
.sk-l2 { height: 30rpx; width: 90%; border-radius: 8rpx; }
.error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.error-text { font-size: 28rpx; color: #6E6E73; }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
