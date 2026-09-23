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
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import { wsApi, type ReportRecord, type ReportChapter } from '../lib/workspace-api'

const id = ref('')
const loading = ref(true)
const failed = ref(false)
const saving = ref(false)
const sharing = ref(false)
const unsharing = ref(false)
const report = ref<ReportRecord | null>(null)
const chapters = ref<ReportChapter[]>([])
const isPro = ref(false)

/** 正在 AI 起草的章节 key（同时只允许一章，避免老师连点把额度打光） */
const drafting = ref('')
/** 展开的章节（默认全展开，写作时更顺手） */
const collapsed = ref<Record<string, boolean>>({})

function isFactChapter(chapter: ReportChapter): boolean {
  return chapter.deterministic === true || /盘面事实|起盘校验|起卦校验|起局校验|起课校验/.test(chapter.title)
}

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
onShow(async () => {
  if (!report.value) return
  try { isPro.value = (await wsApi.pro()).isPro } catch { /* 保留上次状态，交付仍由服务端校验 */ }
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
  if (report.value?.shareToken || saving.value || sharing.value || rewriting.value || drafting.value === chapters.value[i]?.key) return
  chapters.value[i].body = e.detail.value
  // 老师动过手的章节就不再算 AI 初稿——署的是他的名，责任也是他的
  if (chapters.value[i].ai) chapters.value[i].ai = false
  dirty.value = true
}

// 一键改写成交付口径：平台报告是给学习者看的，交给客户要换成通俗、老师视角的说法。
// 盘面事实章不动（那是排盘数据），改完仍是草稿，老师可以继续改。
const rewriting = ref(false)
async function rewriteForClient() {
  if (!report.value || saving.value || rewriting.value || drafting.value || sharing.value || report.value.shareToken) return
  const ok = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '改写成给客户看的话',
      content: '会把各章改得更通俗、用你对客户说话的口吻；盘面结论不变。改完仍可继续编辑。',
      confirmText: '开始改写',
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    })
  })
  if (!ok || saving.value || drafting.value || sharing.value || report.value?.shareToken) return
  if (dirty.value && !(await save())) return
  if (drafting.value || sharing.value || report.value?.shareToken) return
  rewriting.value = true
  uni.showLoading({ title: '正在改写…', mask: true })
  try {
    const res = await wsApi.rewriteForClient(report.value.id)
    report.value = res.report
    chapters.value = (res.report.chapters ?? []).map((c) => ({ ...c }))
    dirty.value = false
    uni.showToast({
      title: res.failed ? `已改写 ${res.rewritten} 章，${res.failed} 章未成功` : `已改写 ${res.rewritten} 章`,
      icon: 'none',
    })
  } catch (e) {
    const message = (e as Error)?.message || '改写失败，请稍后重试'
    if (message.includes('其他设备修改')) {
      uni.showModal({
        title: '报告已有新版本',
        content: '另一设备保存了新的内容。重新加载后可继续改写。',
        confirmText: '重新加载',
        success: (r) => { if (r.confirm) load() },
      })
    } else {
      uni.showToast({ title: message, icon: 'none' })
    }
  } finally {
    uni.hideLoading()
    rewriting.value = false
  }
}

async function aiDraft(i: number) {
  const c = chapters.value[i]
  if (!c || isFactChapter(c) || saving.value || drafting.value || rewriting.value || sharing.value || report.value?.shareToken) return
  if (!report.value?.paipan && !c.body.trim()) return
  if (c.body.trim()) {
    const ok = await new Promise<boolean>((resolve) =>
      uni.showModal({
        title: '覆盖本章正文？',
        content: report.value?.paipan ? '本章已有内容，AI 起草会覆盖它。' : 'AI 将按本章原稿润色，不补充新的盘面判断，并会覆盖当前正文。',
        success: (r) => resolve(r.confirm),
      }),
    )
    if (!ok || saving.value || rewriting.value || sharing.value || report.value?.shareToken) return
  }
  // 手建报告的本章要点必须先落库，服务端才会以这份原稿为依据润色。
  if (dirty.value && !(await save())) return
  if (rewriting.value || sharing.value || report.value?.shareToken) return
  drafting.value = c.key
  try {
    const res = await wsApi.aiDraft({
      reportId: report.value!.id,
      chapterKey: c.key,
    })
    chapters.value[i].body = res.text
    chapters.value[i].ai = true
    dirty.value = true
  } catch (e: any) {
    const message = e?.message || 'AI 起草失败'
    if (message.includes('其他设备修改') || message.includes('报告已交付')) {
      uni.showModal({
        title: '报告状态已变化',
        content: '另一设备已更新这份报告，请重新加载后再继续。',
        confirmText: '重新加载',
        success: (r) => { if (r.confirm) load() },
      })
    } else {
      uni.showToast({ title: message, icon: 'none' })
    }
  } finally {
    drafting.value = ''
  }
}

async function save(status?: 'draft' | 'final'): Promise<boolean> {
  if (!report.value || saving.value || rewriting.value || drafting.value || report.value.shareToken) return false
  if (!report.value.updatedAt) {
    uni.showToast({ title: '报告版本缺失，请重新加载后再保存', icon: 'none' })
    return false
  }
  saving.value = true
  try {
    const r = await wsApi.updateReport(id.value, {
      title: report.value.title,
      chapters: chapters.value,
      status: status ?? report.value.status,
      updatedAt: report.value.updatedAt,
    })
    report.value = r
    chapters.value = (r.chapters ?? []).map((c) => ({ ...c }))
    dirty.value = false
    uni.showToast({ title: status === 'final' ? '已定稿' : '已保存', icon: 'success' })
    return true
  } catch (e: any) {
    const message = e?.message || '保存失败'
    if (message.includes('其他设备修改')) {
      uni.showModal({
        title: '报告已有新版本',
        content: '另一设备已保存新内容。重新加载会放弃本页未保存的修改，请先复制需要保留的文字。',
        confirmText: '重新加载',
        cancelText: '留在本页',
        success: (r) => { if (r.confirm) load() },
      })
    } else {
      uni.showToast({ title: message, icon: 'none' })
    }
    return false
  } finally {
    saving.value = false
  }
}

/** 交付：生成只读链接（会员专属；后端也有闸门） */
async function share() {
  if (!report.value || report.value.shareToken || sharing.value || unsharing.value || saving.value || rewriting.value || drafting.value) return
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
  sharing.value = true
  try {
    const emptyCount = chapters.value.filter((c) => !c.body.trim()).length
    if (emptyCount) {
      const proceed = await new Promise<boolean>((resolve) => uni.showModal({
        title: '报告还有空白章节',
        content: `有 ${emptyCount} 章尚未填写，客户会看到空白内容。确认仍要交付吗？`,
        confirmText: '仍要交付',
        cancelText: '继续编辑',
        success: (r) => resolve(!!r.confirm),
        fail: () => resolve(false),
      }))
      if (!proceed) return
    }
    if (dirty.value && !(await save('final'))) return
    const res = await wsApi.shareReport(id.value)
    report.value = { ...report.value!, shareToken: res.shareToken, sharedAt: res.sharedAt, status: 'delivered' }
    copyShare()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '生成失败', icon: 'none' })
  } finally {
    sharing.value = false
  }
}

function copyShare() {
  if (!shareUrl.value) return
  uni.setClipboardData({
    data: shareUrl.value,
    success: () => uni.showToast({ title: '链接已复制，发给客户即可', icon: 'none' }),
  })
}

async function unshare() {
  if (!report.value?.shareToken || sharing.value || unsharing.value) return
  const expectedToken = report.value.shareToken
  unsharing.value = true
  try {
    const confirmed = await new Promise<boolean>((resolve) => uni.showModal({
      title: '撤回交付链接',
      content: '撤回后客户将无法再打开这份报告。',
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    }))
    if (!confirmed) return
    const result = await wsApi.unshareReport(id.value, expectedToken)
    report.value = { ...report.value!, shareToken: result.shareToken, sharedAt: result.sharedAt, status: result.status, updatedAt: result.updatedAt }
    uni.showToast({ title: result.shareToken ? '链接状态已更新' : '已撤回', icon: result.shareToken ? 'none' : 'success' })
  } catch (e: any) {
    const message = e?.message || '撤回失败'
    if (message.includes('交付链接已更新')) {
      uni.showModal({
        title: '交付链接已有变化',
        content: '另一设备已更新了交付状态，请重新加载后确认当前链接。',
        confirmText: '重新加载',
        success: (r) => { if (r.confirm) load() },
      })
    } else {
      uni.showToast({ title: message, icon: 'none' })
    }
  } finally {
    unsharing.value = false
  }
}

function preview() {
  if (rewriting.value || drafting.value || sharing.value || saving.value) {
    uni.showToast({ title: '请等当前操作完成后再预览', icon: 'none' })
    return
  }
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
          <input v-model="report.title" class="re-title-input" :disabled="!!report.shareToken || saving || sharing || rewriting" @input="dirty = true" />
          <view class="re-meta">
            <text class="re-meta-item">{{ report.clientName }}</text>
            <text v-if="report.clientBirth" class="re-meta-item">{{ report.clientBirth }}</text>
            <text class="re-meta-badge" :class="`re-meta-badge--${report.status}`">
              {{ report.status === 'draft' ? '草稿' : report.status === 'final' ? '已定稿' : '已交付' }}
            </text>
          </view>
        </PaperCard>

        <view v-if="report.shareToken" class="re-delivered-notice">
          客户链接已生效，当前内容已锁定。需要修改时，请先在下方撤回交付，修改并预览后再生成链接。
        </view>

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
              这份手建报告没有盘面。可先写下本章要点，再用 AI 润色；若要依据盘面起草，请从排盘结果创建报告。
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
            <view v-if="!report.shareToken && !isFactChapter(c) && (report.paipan || c.body.trim())" class="re-ch-draft" :class="{ 're-ch-draft--busy': drafting === c.key }" @tap="aiDraft(i)">
              <AppIcon name="sparkles" :size="14" :color="drafting === c.key ? '#B8AA9A' : '#C41E3A'" />
              <text class="re-ch-draft-txt" :class="{ 're-ch-draft-txt--busy': drafting === c.key }">
                {{ drafting === c.key ? '处理中…' : report.paipan ? 'AI 起草' : 'AI 润色' }}
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
            :disabled="!!report.shareToken || saving || sharing || rewriting || drafting === c.key"
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
                <text class="re-btn-txt re-btn-txt--ghost">{{ unsharing ? '撤回中…' : '撤回交付' }}</text>
              </view>
            </view>
          </view>
          <view v-else class="re-btn re-btn--gold" @tap="share">
            <AppIcon name="share-2" :size="16" color="#fff" />
            <text class="re-btn-txt re-btn-txt--primary">{{ sharing ? '生成中…' : isPro ? '定稿并生成交付链接' : '开通会员以交付报告' }}</text>
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
        <view v-if="!report.shareToken" class="re-bar-btn" @tap="rewriteForClient">
          <AppIcon name="wand-2" :size="18" color="#7A6C5E" />
          <text class="re-bar-btn-txt">{{ rewriting ? '改写中…' : '改成客户口径' }}</text>
        </view>
        <view class="re-bar-btn" @tap="preview">
          <AppIcon name="eye" :size="18" color="#7A6C5E" />
          <text class="re-bar-btn-txt">预览</text>
        </view>
        <view v-if="!report.shareToken" class="re-bar-save" @tap="save()">
          <text class="re-bar-save-txt">{{ saving ? '保存中…' : dirty ? '保存' : '已保存' }}</text>
        </view>
        <view v-if="!report.shareToken" class="re-bar-final" @tap="save('final')">
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

.re-delivered-notice {
  padding: 24rpx 28rpx;
  border-radius: 16rpx;
  background: #FFF6E5;
  color: #76551D;
  font-size: 25rpx;
  line-height: 1.6;
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
