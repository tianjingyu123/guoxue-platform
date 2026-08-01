<script setup lang="ts">
/**
 * 周易起名 · 名字详批页——自 V0 app/qiming/detail/page.tsx 还原
 * onLoad 取 name/gender 本地重算 analyzeName：总览卡（大字+得分环+四维分）+ 共享分析主体
 * 取舍：①V0 SVG 得分环 → 圆环 view（小程序端无内联 SVG）
 *       ②收藏按钮实做本地持久化（rebu:qiming-favorites，与结果页星标同源）
 *       ③「选定此名」= 收藏并提示（V0 无落点）；「继续挑选」返回结果页
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { analyzeName } from '@/pkg-paipan2/lib/xingming-engine'
import type { NameDetail } from '@/pkg-paipan2/lib/qiming-data'
import NameDetailSections from './name-detail-sections.vue'
import { isQimingFavorite, toggleQimingFavorite } from './store'

// R4 合规：小程序端无占卜类目，标题改文化研究表述
let hdrTitle = '名字详批'
// #ifdef MP-WEIXIN
hdrTitle = '姓名文化研究'
// #endif

/** 五行配色（全局 --wuxing-* token） */
const WX_COLOR: Record<string, string> = {
  木: 'var(--wuxing-wood)',
  火: 'var(--wuxing-fire)',
  土: 'var(--wuxing-earth)',
  金: 'var(--wuxing-metal)',
  水: 'var(--wuxing-water)',
}
const wxColor = (w: string) => WX_COLOR[w] ?? 'var(--text-ink)'

const SUB_LABELS: { key: 'yin' | 'xing' | 'yi' | 'li'; label: string }[] = [
  { key: 'yin', label: '音律' },
  { key: 'xing', label: '字形' },
  { key: 'yi', label: '字义' },
  { key: 'li', label: '数理' },
]

const fullName = ref('')
const gender = ref<'男' | '女'>('男')
const detail = ref<NameDetail | null>(null)
const errMsg = ref('')
const favorite = ref(false)

onLoad((opts: Record<string, string> = {}) => {
  const name = opts.name ? decodeURIComponent(opts.name) : ''
  if (!name || [...name].length < 2) {
    errMsg.value = '参数无效，请从推荐列表进入详批。'
    return
  }
  fullName.value = name
  gender.value = opts.gender === '女' ? '女' : '男'
  try {
    detail.value = analyzeName({ fullName: name, gender: gender.value })
    favorite.value = isQimingFavorite(name)
  } catch {
    errMsg.value = '解析失败，请返回重试。'
  }
})

const c = computed(() => detail.value?.candidate ?? null)

function onToggleFavorite() {
  if (!c.value) return
  favorite.value = toggleQimingFavorite({
    name: fullName.value,
    gender: gender.value,
    score: c.value.score,
    subScores: c.value.subScores,
  })
  uni.showToast({ title: favorite.value ? '已收藏此名' : '已取消收藏', icon: 'none' })
}

function onChoose() {
  if (!c.value) return
  if (!favorite.value) {
    favorite.value = toggleQimingFavorite({
      name: fullName.value,
      gender: gender.value,
      score: c.value.score,
      subScores: c.value.subScores,
    })
  }
  uni.showToast({ title: `已选定「${fullName.value}」并加入收藏`, icon: 'none' })
}

function onBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) { navigateBack(); return }
  navigateTo('/pkg-paipan2/qiming/index')
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" @back="onBack">
      <template #actions>
        <view v-if="detail" class="hdr-fav" @tap="onToggleFavorite">
          <app-icon name="star" :size="28" :color="favorite ? '#f59e0b' : 'var(--brand)'" />
          <text class="hdr-fav-text">{{ favorite ? '已收藏' : '收藏' }}</text>
        </view>
      </template>
    </tool-header>

    <!-- 错误态 -->
    <view v-if="!detail || !c" class="error-wrap">
      <text class="error-text">{{ errMsg || '推演中…' }}</text>
      <view v-if="errMsg" class="error-btn" @tap="onBack">
        <text class="error-btn-text">返回</text>
      </view>
    </view>

    <scroll-view v-else scroll-y class="body">
      <view class="inner">
        <!-- 名字总览卡 -->
        <view class="overview">
          <view class="ov-top">
            <view class="ov-chars">
              <view v-for="(ch, i) in c.chars" :key="i" class="ov-char">
                <text class="ov-py">{{ ch.pinyin }}</text>
                <text class="ov-zi">{{ ch.char }}</text>
                <text class="ov-wx" :style="{ color: wxColor(ch.wuxing) }">{{ ch.wuxing }} · {{ ch.strokes }}画</text>
              </view>
            </view>
            <view class="ov-score">
              <view class="ov-ring">
                <text class="ov-ring-num">{{ c.score }}</text>
              </view>
              <text class="ov-score-label">综合得分</text>
            </view>
          </view>

          <!-- 四维分项 -->
          <view class="subs">
            <view v-for="s in SUB_LABELS" :key="s.key" class="sub-cell">
              <text class="sub-label">{{ s.label }}</text>
              <text class="sub-num">{{ c.subScores[s.key] }}</text>
            </view>
          </view>

          <text class="ov-brief">{{ c.brief }}</text>
          <text v-if="c.poem" class="ov-poem">《{{ c.poem.source }}》：「{{ c.poem.quote }}」</text>
        </view>

        <!-- 分析主体（与姓名解析工具共享） -->
        <name-detail-sections :detail="detail" />

        <!-- 底部动作 -->
        <view class="actions">
          <view class="act-btn act-btn-outline" @tap="onChoose">
            <text class="act-text act-text-outline">选定此名</text>
          </view>
          <view class="act-btn act-btn-solid" @tap="onBack">
            <text class="act-text act-text-solid">继续挑选</text>
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="以上内容为传统姓名学规则化分析，仅供传统文化研习参考，不构成任何预测或建议。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; height: 0; }
.inner { padding: 24rpx 32rpx 96rpx; display: flex; flex-direction: column; gap: 24rpx; }

.hdr-fav {
  display: flex; align-items: center; gap: 8rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.3); border-radius: 999rpx;
  padding: 10rpx 24rpx;
  &:active { background: rgba(196, 30, 58, 0.05); }
}
.hdr-fav-text { font-size: 24rpx; font-weight: 500; color: var(--brand); }

/* ── 错误态 ── */
.error-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; padding: 0 48rpx; }
.error-text { font-size: 28rpx; line-height: 1.7; color: var(--text-soft); text-align: center; }
.error-btn { padding: 20rpx 40rpx; background: var(--brand); border-radius: 24rpx; box-shadow: 0 6rpx 20rpx rgba(196, 30, 58, 0.28); }
.error-btn:active { opacity: 0.8; }
.error-btn-text { font-size: 28rpx; font-weight: 700; color: #fff; }

/* ── 总览卡 ── */
.overview { background: var(--card); border: 1rpx solid var(--line); border-radius: 16rpx; padding: 32rpx; }
.ov-top { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; }
.ov-chars { display: flex; align-items: flex-end; gap: 24rpx; }
.ov-char { display: flex; flex-direction: column; align-items: center; }
.ov-py { font-size: 22rpx; color: var(--text-soft); }
.ov-zi { font-family: Georgia, 'Songti SC', serif; font-size: 72rpx; font-weight: 700; line-height: 1.2; color: var(--text-ink); }
.ov-wx { font-size: 22rpx; font-weight: 700; }
.ov-score { display: flex; flex-direction: column; align-items: center; gap: 8rpx; flex-shrink: 0; }
.ov-ring {
  width: 128rpx; height: 128rpx; border-radius: 50%;
  border: 10rpx solid var(--brand);
  box-shadow: inset 0 0 0 4rpx rgba(196, 30, 58, 0.08);
  display: flex; align-items: center; justify-content: center;
}
.ov-ring-num { font-family: Georgia, 'Songti SC', serif; font-size: 40rpx; font-weight: 700; color: var(--brand); }
.ov-score-label { font-size: 20rpx; color: var(--text-soft); }

/* ── 四维分项 ── */
.subs { margin-top: 24rpx; display: flex; gap: 12rpx; }
.sub-cell {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2rpx;
  background: rgba(0, 0, 0, 0.03); border-radius: 12rpx; padding: 12rpx 8rpx;
}
.sub-label { font-size: 20rpx; color: var(--text-soft); }
.sub-num { font-family: Georgia, 'Songti SC', serif; font-size: 28rpx; font-weight: 700; color: var(--text-ink); }

.ov-brief { display: block; margin-top: 20rpx; font-size: 24rpx; line-height: 1.7; color: var(--text-ink); }
.ov-poem { display: block; margin-top: 8rpx; font-family: Georgia, 'Songti SC', serif; font-size: 22rpx; color: var(--text-soft); }

/* ── 底部动作 ── */
.actions { display: flex; gap: 16rpx; }
.act-btn { flex: 1; padding: 24rpx; border-radius: 24rpx; }
.act-btn:active { opacity: 0.85; }
.act-btn-outline { border: 1rpx solid rgba(196, 30, 58, 0.3); }
.act-btn-solid { background: var(--brand); box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3); }
.act-text { display: block; text-align: center; font-size: 28rpx; font-weight: 500; }
.act-text-outline { color: var(--brand); }
.act-text-solid { color: #fff; font-weight: 700; }
</style>
