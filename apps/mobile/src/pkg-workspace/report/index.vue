<script setup lang="ts">
/**
 * 报告编辑器（对应 V0 report-editor.tsx + report-document.tsx + report-preview.tsx）
 *
 * 老师的定稿动线：逐章 AI 起草 → 亲手改 → 定稿 → 生成只读链接交付客户。
 *
 * 🔴 盘面（report.paipan）是排盘引擎算好后原样存档的，这里只读、只展示，**绝不重算**。
 * AI 也只写解读文字，不碰任何干支/星曜/卦爻——引擎是唯一真源。
 *
 * 🔴 合规：AI 起草的章节要显式标注「AI 初稿」，交付页固定挂免责声明。
 * 老师改过之后 ai 标记就摘掉（那已是他自己的判断，署他的名）。
 */
import { ref, computed } from 'vue'
import { buildH5Url } from '@/utils/share'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import { wsApi, type ReportRecord, type ReportChapter } from '../lib/workspace-api'

const id = ref('')
const loading = ref(true)
const failed = ref(false)
const saving = ref(false)
const report = ref<ReportRecord | null>(null)
const chapters = ref<ReportChapter[]>([])
const isPro = ref(false)

/** 正在 AI 起草的章节 key（同时只允许一章，避免老师连点把额度打光） */
const drafting = ref('')
/** 展开的章节（默认全展开，写作时更顺手） */
const collapsed = ref<Record<string, boolean>>({})

const dirty = ref(false)

/**
 * 交付链接的域名固定用线上 H5 —— 客户是在自己手机的浏览器里打开的，
 * 不能用 location.origin（小程序里根本没有 location），也不能用局域网调试地址。
 * 与 components/home/daily-verse.vue 的分享链接同一个域。
 */
const shareUrl = computed(() =>
  report.value?.shareToken
    ? buildH5Url('pkg-workspace/shared/index', { token: report.value.shareToken })
    : '',
)

onLoad((q) => {
  id.value = (q?.id as string) || ''
  load()
})

/** 兜底按钮：有 id 则重试加载，无 id（缺参）则返回上一页 */
function onFallback() {
  if (id.value) load()
  else uni.navigateBack()
}

async function load() {
  if (!id.value) {
    failed.value = true
    loading.value = false
    return
  }
  loading.value = true
  failed.value = false
  try {
    const [r, pro] = await Promise.all([wsApi.getReport(id.value), wsApi.pro()])
    report.value = r
    chapters.value = (r.chapters ?? []).map((c) => ({ ...c }))
    isPro.value = pro.isPro
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

function onEdit(i: number, e: any) {
  chapters.value[i].body = e.detail.value
  // 老师动过手的章节就不再算 AI 初稿——署的是他的名，责任也是他的
  if (chapters.value[i].ai) chapters.value[i].ai = false
  dirty.value = true
}

async function aiDraft(i: number) {
  const c = chapters.value[i]
  if (drafting.value) return
  if (c.body.trim()) {
    const ok = await new Promise<boolean>((resolve) =>
      uni.showModal({
        title: '覆盖本章正文？',
        content: '本章已有内容，AI 起草会覆盖它。',
        success: (r) => resolve(r.confirm),
      }),
    )
    if (!ok) return
  }
  drafting.value = c.key
  try {
    const res = await wsApi.aiDraft({
      chapterTitle: c.title,
      reportTypeLabel: report.value!.typeLabel,
      clientName: report.value!.clientName,
      // 盘面原样传给 AI —— 它据此解读，不自己推算
      paipan: report.value!.paipan ?? {},
    })
    chapters.value[i].body = res.text
    chapters.value[i].ai = true
    dirty.value = true
  } catch (e: any) {
    uni.showToast({ title: e?.message || 'AI 起草失败', icon: 'none' })
  } finally {
    drafting.value = ''
  }
}

async function save(status?: 'draft' | 'final') {
  if (!report.value) return
  saving.value = true
  try {
    const r = await wsApi.updateReport(id.value, {
      title: report.value.title,
      chapters: chapters.value,
      status: status ?? report.value.status,
    })
    report.value = { ...report.value, status: r.status }
    dirty.value = false
    uni.showToast({ title: status === 'final' ? '已定稿' : '已保存', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

/** 交付：生成只读链接（会员专属；后端也有闸门） */
async function share() {
  if (!isPro.value) {
    uni.showModal({
      title: '交付报告需要会员',
      content: '生成只读链接把报告发给客户，是从业者会员权益。',
      confirmText: '去开通',
      success: (r) => {
        if (r.confirm) uni.navigateTo({ url: '/pkg-workspace/pro/index' })
      },
    })
    return
  }
  if (dirty.value) await save('final')
  try {
    const res = await wsApi.shareReport(id.value)
    report.value = { ...report.value!, shareToken: res.shareToken, sharedAt: res.sharedAt, status: 'delivered' }
    copyShare()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '生成失败', icon: 'none' })
  }
}

function copyShare() {
  if (!shareUrl.value) return
  uni.setClipboardData({
    data: shareUrl.value,
    success: () => uni.showToast({ title: '链接已复制，发给客户即可', icon: 'none' }),
  })
}

function unshare() {
  uni.showModal({
    title: '撤回交付链接',
    content: '撤回后客户将无法再打开这份报告。',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await wsApi.unshareReport(id.value)
        report.value = { ...report.value!, shareToken: null, sharedAt: null }
        uni.showToast({ title: '已撤回', icon: 'success' })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '撤回失败', icon: 'none' })
      }
    },
  })
}

function preview() {
  if (dirty.value) {
    uni.showToast({ title: '请先保存', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pkg-workspace/report/preview?id=${id.value}` })
}

/** 归档到案例库（做过的单子沉淀下来） */
function archive() {
  if (!report.value) return
  uni.navigateTo({
    url: `/pkg-workspace/cases/index?fromReport=${id.value}&title=${encodeURIComponent(report.value.title)}&clientName=${encodeURIComponent(report.value.clientName)}`,
  })
}
</script>

<template>
  <view class="re">
    <ToolHeader title="报告编辑" :subtitle="report?.typeLabel || ''" />

    <view v-if="loading" class="re-skeleton" />
    <view v-else-if="failed" class="re-fallback">
      <view class="re-fallback-icon">
        <AppIcon name="alert-circle" :size="56" color="#C41E3A" />
      </view>
      <text class="re-fallback-title">{{ id ? '加载失败' : '缺少报告参数' }}</text>
      <text class="re-fallback-desc">{{ id ? '网络异常或报告不存在，请重试' : '请从报告列表进入本页' }}</text>
      <view class="re-fallback-btn" @tap="onFallback">
        <text class="re-fallback-btn-txt">{{ id ? '重新加载' : '返回上一页' }}</text>
      </view>
    </view>

    <template v-else-if="report">
      <scroll-view class="re-body" scroll-y :show-scrollbar="false">
        <!-- 抬头 -->
        <PaperCard gold padding="lg">
          <input v-model="report.title" class="re-title-input" @input="dirty = true" />
          <view class="re-meta">
            <text class="re-meta-item">{{ report.clientName }}</text>
            <text v-if="report.clientBirth" class="re-meta-item">{{ report.clientBirth }}</text>
            <text class="re-meta-badge" :class="`re-meta-badge--${report.status}`">
              {{ report.status === 'draft' ? '草稿' : report.status === 'final' ? '已定稿' : '已交付' }}
            </text>
          </view>
        </PaperCard>

        <!-- 盘面（只读快照） -->
        <PaperCard v-if="report.paipan" padding="lg">
          <SectionTitle title="盘面" :subtitle="`来自${report.paipan.toolLabel} · 引擎算定，不可改`" />
          <view class="re-paipan">
            <text class="re-paipan-summary">{{ report.paipan.summary || '已存档盘面数据' }}</text>
            <view class="re-paipan-hint">
              <AppIcon name="info" :size="14" color="#9A8C7E" />
              <text class="re-paipan-hint-txt">盘面由排盘引擎算定并存档，AI 与本页都只做解读，不会改动它。</text>
            </view>
          </view>
        </PaperCard>
        <PaperCard v-else padding="lg">
          <view class="re-nopaipan">
            <AppIcon name="info" :size="16" color="#B8860B" />
            <text class="re-nopaipan-txt">
              这份报告没有盘面（手动新建的）。想要图文并茂，请去排盘中心起盘，在结果页点「生成报告」。
            </text>
          </view>
        </PaperCard>

        <!-- 章节 -->
        <PaperCard v-for="(c, i) in chapters" :key="c.key" padding="lg">
          <view class="re-ch-head">
            <view class="re-ch-title-box" @tap="collapsed[c.key] = !collapsed[c.key]">
              <text class="re-ch-idx">{{ i + 1 }}</text>
              <text class="re-ch-title">{{ c.title }}</text>
              <text v-if="c.ai" class="re-ch-ai">AI 初稿</text>
            </view>
            <view class="re-ch-draft" :class="{ 're-ch-draft--busy': drafting === c.key }" @tap="aiDraft(i)">
              <AppIcon name="sparkles" :size="14" :color="drafting === c.key ? '#B8AA9A' : '#C41E3A'" />
              <text class="re-ch-draft-txt" :class="{ 're-ch-draft-txt--busy': drafting === c.key }">
                {{ drafting === c.key ? '起草中…' : 'AI 起草' }}
              </text>
            </view>
          </view>

          <textarea
            v-if="!collapsed[c.key]"
            :value="c.body"
            class="re-ch-body"
            placeholder="点右上「AI 起草」生成初稿，或直接在这里写"
            placeholder-class="re-ph"
            auto-height
            :maxlength="-1"
            @input="onEdit(i, $event)"
          />
          <text v-else-if="c.body" class="re-ch-fold">{{ c.body.slice(0, 40) }}…</text>
        </PaperCard>

        <!-- 交付 -->
        <PaperCard padding="lg">
          <SectionTitle title="交付客户" :subtitle="isPro ? '生成只读链接，客户无需登录即可查看' : '会员专属'" />

          <view v-if="report.shareToken" class="re-share">
            <view class="re-share-box">
              <text class="re-share-url">{{ shareUrl }}</text>
            </view>
            <view class="re-share-ops">
              <view class="re-btn re-btn--ghost" @tap="copyShare">
                <text class="re-btn-txt re-btn-txt--ghost">复制链接</text>
              </view>
              <view class="re-btn re-btn--ghost" @tap="unshare">
                <text class="re-btn-txt re-btn-txt--ghost">撤回交付</text>
              </view>
            </view>
          </view>
          <view v-else class="re-btn re-btn--gold" @tap="share">
            <AppIcon name="share-2" :size="16" color="#fff" />
            <text class="re-btn-txt re-btn-txt--primary">{{ isPro ? '定稿并生成交付链接' : '开通会员以交付报告' }}</text>
          </view>
        </PaperCard>

        <view class="re-bottom-space" />
      </scroll-view>

      <!-- 底部操作条 -->
      <view class="re-bar">
        <view class="re-bar-btn" @tap="archive">
          <AppIcon name="book-marked" :size="18" color="#7A6C5E" />
          <text class="re-bar-btn-txt">归档案例</text>
        </view>
        <view class="re-bar-btn" @tap="preview">
          <AppIcon name="eye" :size="18" color="#7A6C5E" />
          <text class="re-bar-btn-txt">预览</text>
        </view>
        <view class="re-bar-save" @tap="save()">
          <text class="re-bar-save-txt">{{ saving ? '保存中…' : dirty ? '保存' : '已保存' }}</text>
        </view>
        <view class="re-bar-final" @tap="save('final')">
          <text class="re-bar-final-txt">定稿</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.re {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F7F3EC;
}

.re-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx;
  box-sizing: border-box;
}

.re-body > view {
  margin-bottom: 24rpx;
}

.re-skeleton {
  height: 400rpx;
  margin: 24rpx;
  border-radius: 16rpx;
  background: rgba(154, 140, 126, 0.1);
}

.re-fallback {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
}

.re-fallback-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
}

.re-fallback-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #3A2A1E;
}

.re-fallback-desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #9A8C7E;
  text-align: center;
}

.re-fallback-btn {
  margin-top: 40rpx;
  height: 76rpx;
  padding: 0 56rpx;
  border-radius: 999rpx;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.re-fallback-btn-txt {
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
}

/* 抬头 */
.re-title-input {
  width: 100%;
  height: 72rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.re-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}

.re-meta-item {
  font-size: 24rpx;
  color: #9A8C7E;
}

.re-meta-badge {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.re-meta-badge--draft {
  background: rgba(154, 140, 126, 0.14);
  color: #7A6C5E;
}

.re-meta-badge--final {
  background: rgba(184, 134, 11, 0.12);
  color: #B8860B;
}

.re-meta-badge--delivered {
  background: rgba(45, 122, 78, 0.12);
  color: #2D7A4E;
}

/* 盘面 */
.re-paipan {
  margin-top: 20rpx;
}

.re-paipan-summary {
  font-size: 26rpx;
  line-height: 1.7;
  color: #3A2A1E;
}

.re-paipan-hint,
.re-nopaipan {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-top: 16rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.08);
}

.re-nopaipan {
  margin-top: 0;
  background: rgba(184, 134, 11, 0.08);
}

.re-paipan-hint-txt,
.re-nopaipan-txt {
  flex: 1;
  font-size: 21rpx;
  line-height: 1.6;
  color: #7A6C5E;
}

.re-nopaipan-txt {
  color: #8A6914;
}

/* 章节 */
.re-ch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.re-ch-title-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  min-width: 0;
}

.re-ch-idx {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
  font-size: 22rpx;
  font-weight: 700;
  color: #C41E3A;
}

.re-ch-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.re-ch-ai {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(184, 134, 11, 0.12);
  font-size: 18rpx;
  color: #B8860B;
}

.re-ch-draft {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 52rpx;
  padding: 0 18rpx;
  flex-shrink: 0;
  border: 1rpx solid rgba(196, 30, 58, 0.35);
  border-radius: 26rpx;
}

.re-ch-draft--busy {
  border-color: rgba(154, 140, 126, 0.3);
}

.re-ch-draft-txt {
  font-size: 22rpx;
  font-weight: 600;
  color: #C41E3A;
}

.re-ch-draft-txt--busy {
  color: #B8AA9A;
}

.re-ch-body {
  width: 100%;
  min-height: 200rpx;
  margin-top: 20rpx;
  padding: 20rpx;
  box-sizing: border-box;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
  line-height: 1.8;
  color: #3A2A1E;
}

.re-ph {
  color: #C4B8A8;
}

.re-ch-fold {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #9A8C7E;
}

/* 交付 */
.re-share-box {
  margin-top: 20rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.08);
}

.re-share-url {
  font-size: 22rpx;
  line-height: 1.6;
  color: #7A6C5E;
  word-break: break-all;
}

.re-share-ops {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.re-share-ops .re-btn {
  flex: 1;
}

.re-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 88rpx;
  border-radius: 12rpx;
}

.re-btn--gold {
  margin-top: 20rpx;
  background: #C41E3A;
}

.re-btn--ghost {
  border: 1rpx solid rgba(196, 30, 58, 0.4);
}

.re-btn-txt {
  font-size: 26rpx;
  font-weight: 600;
}

.re-btn-txt--primary {
  color: #fff;
}

.re-btn-txt--ghost {
  color: #C41E3A;
}

.re-bottom-space {
  height: 40rpx;
}

/* 底部条 */
.re-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #FDFAF4;
  border-top: 1rpx solid rgba(58, 42, 30, 0.08);
}

.re-bar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  width: 96rpx;
}

.re-bar-btn-txt {
  font-size: 18rpx;
  color: #7A6C5E;
}

.re-bar-save,
.re-bar-final {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  border-radius: 40rpx;
}

.re-bar-save {
  border: 1rpx solid rgba(196, 30, 58, 0.4);
}

.re-bar-save-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: #C41E3A;
}

.re-bar-final {
  background: #C41E3A;
}

.re-bar-final-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}
</style>
