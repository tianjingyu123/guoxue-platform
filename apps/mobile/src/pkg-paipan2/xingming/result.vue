<script setup lang="ts">
/**
 * 姓名解析 · 结果页——自 V0 app/xingming/result/page.tsx 还原
 * onLoad 取 payload 本地重算 analyzeName：总览卡（大字+得分环+命主信息行+四维分）+ 共享分析主体
 * 取舍：①AI辅助分析按钮砍掉（不接假数据）；「保存」实做写入本地历史（rebu:xingming-history，进入页面即自动留存）
 *       ②V0 用 lunar-typescript 算生肖/农历 → 本地 bazi-engine（立春分界口径一致）；星座本页内置分界表
 *       ③V0 SVG 得分环 → 圆环 view（小程序端无内联 SVG）
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { analyzeName } from '@/pkg-paipan2/lib/xingming-engine'
import { computeBazi } from '@/pkg-paipan2/lib/bazi-engine'
import type { NameDetail } from '@/pkg-paipan2/lib/qiming-data'
import NameDetailSections from '@/pkg-paipan2/qiming/name-detail-sections.vue'
import { saveXingmingHistory } from './history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述
let hdrTitle = '姓名详解'
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

/** 星座分界表（月, 当月起始日, 星座） */
const XZ_TABLE: [number, string][] = [
  [20, '摩羯座'], [19, '水瓶座'], [21, '双鱼座'], [20, '白羊座'], [21, '金牛座'], [22, '双子座'],
  [23, '巨蟹座'], [23, '狮子座'], [23, '处女座'], [24, '天秤座'], [23, '天蝎座'], [22, '射手座'],
]
function xingzuoOf(month: number, day: number): string {
  return day < XZ_TABLE[month - 1][0] ? XZ_TABLE[month - 1][1] : XZ_TABLE[month % 12][1]
}

const fullName = ref('')
const gender = ref<'男' | '女'>('男')
const detail = ref<NameDetail | null>(null)
const errMsg = ref('')
const birthInfo = ref<{ shengxiao?: string; xingzuo?: string; birthText?: string }>({})
const saved = ref(false)

/** 解析 "YYYY-MM-DD HH:mm" */
function parseBirth(birth: string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  const m = birth.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})$/)
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), hour: Number(m[4]), minute: Number(m[5]) }
}

onLoad((opts: Record<string, string> = {}) => {
  try {
    const p = JSON.parse(decodeURIComponent(opts.payload ?? '')) as Record<string, string>
    const name = (p.name ?? '').trim()
    if (!name || [...name].length < 2) {
      errMsg.value = '参数无效，请返回重新填写。'
      return
    }
    fullName.value = name
    gender.value = p.gender === '女' ? '女' : '男'

    // 生肖/农历生辰（立春分界，与 V0 lunar-typescript 口径一致）
    const birth = parseBirth(p.birth ?? '')
    if (birth) {
      try {
        const bazi = computeBazi({
          name: '',
          gender: gender.value,
          ...birth,
          city: p.city || undefined,
          useTrueSolar: false,
        })
        birthInfo.value = {
          shengxiao: bazi.zodiac,
          xingzuo: xingzuoOf(birth.month, birth.day),
          birthText: `${birth.year}年${birth.month}月${birth.day}日 ${birth.hour}时${birth.minute}分（${bazi.lunarDate.replace(/^.*?年/, '')}）`,
        }
      } catch {
        birthInfo.value = {}
      }
    }

    detail.value = analyzeName({ fullName: name, gender: gender.value, shengxiao: birthInfo.value.shengxiao })
    // 进入页面即自动留存历史（保存按钮为显式确认）
    saveXingmingHistory({
      name,
      gender: gender.value,
      birth: p.birth ?? '',
      city: p.city || undefined,
      district: p.district || undefined,
      score: detail.value.candidate.score,
    })
  } catch {
    errMsg.value = '参数解析失败，请返回重新填写。'
  }
})

const c = computed(() => detail.value?.candidate ?? null)

function onSave() {
  if (saved.value) return
  saved.value = true
  uni.showToast({ title: '已存入解析记录', icon: 'none' })
}

function retry() {
  navigateTo('/pkg-paipan2/xingming/index')
}

function onBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) { navigateBack(); return }
  navigateTo('/pkg-paipan2/xingming/index')
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" share :share-title="hdrTitle" @back="onBack" />

    <!-- 错误态 -->
    <view v-if="!detail || !c" class="error-wrap">
      <text class="error-text">{{ errMsg || '推演中…' }}</text>
      <view v-if="errMsg" class="error-btn" @tap="retry">
        <text class="error-btn-text">返回重填</text>
      </view>
    </view>

    <scroll-view v-else scroll-y class="body">
      <view class="inner">
        <!-- 姓名总览卡（第一屏紧凑：大字+得分环+命主信息行+四维分） -->
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
              <text class="ov-score-label">综合得分 · 满分120</text>
            </view>
          </view>

          <!-- 命主信息行 -->
          <view class="meta">
            <text class="meta-item">性别：<text class="meta-strong">{{ gender }}</text></text>
            <text v-if="birthInfo.shengxiao" class="meta-item">生肖：<text class="meta-strong">{{ birthInfo.shengxiao }}</text></text>
            <text v-if="birthInfo.xingzuo" class="meta-item">星座：<text class="meta-strong">{{ birthInfo.xingzuo }}</text></text>
            <text v-if="birthInfo.birthText" class="meta-item meta-item-full">生辰：<text class="meta-strong">{{ birthInfo.birthText }}</text></text>
          </view>

          <!-- 四维分项 -->
          <view class="subs">
            <view v-for="s in SUB_LABELS" :key="s.key" class="sub-cell">
              <text class="sub-label">{{ s.label }}</text>
              <text class="sub-num">{{ c.subScores[s.key] }}</text>
            </view>
          </view>

          <text class="ov-brief">{{ c.brief }}</text>
        </view>

        <!-- 分析主体（与起名详批共享） -->
        <name-detail-sections :detail="detail" />

        <!-- 底部动作 -->
        <view class="actions">
          <view class="act-btn" :class="saved ? 'act-btn-saved' : 'act-btn-outline'" @tap="onSave">
            <app-icon :name="saved ? 'check' : 'save'" :size="28" :color="saved ? '#15803d' : 'var(--brand)'" />
            <text class="act-text" :class="saved ? 'act-text-saved' : 'act-text-outline'">{{ saved ? '已保存' : '保存' }}</text>
          </view>
          <view class="act-btn act-btn-solid" @tap="retry">
            <text class="act-text act-text-solid">再测一个</text>
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

/* ── 命主信息行 ── */
.meta {
  margin-top: 24rpx; display: flex; flex-wrap: wrap; align-items: center;
  column-gap: 24rpx; row-gap: 8rpx;
  background: rgba(0, 0, 0, 0.03); border-radius: 12rpx; padding: 16rpx 20rpx;
}
.meta-item { font-size: 22rpx; color: var(--text-soft); }
.meta-item-full { width: 100%; }
.meta-strong { color: var(--text-ink); }

/* ── 四维分项 ── */
.subs { margin-top: 24rpx; display: flex; gap: 12rpx; }
.sub-cell {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2rpx;
  background: rgba(0, 0, 0, 0.03); border-radius: 12rpx; padding: 12rpx 8rpx;
}
.sub-label { font-size: 20rpx; color: var(--text-soft); }
.sub-num { font-family: Georgia, 'Songti SC', serif; font-size: 28rpx; font-weight: 700; color: var(--text-ink); }

.ov-brief { display: block; margin-top: 20rpx; font-size: 24rpx; line-height: 1.7; color: var(--text-ink); }

/* ── 底部动作 ── */
.actions { display: flex; gap: 16rpx; }
.act-btn {
  flex: 1; padding: 24rpx; border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center; gap: 10rpx;
}
.act-btn:active { opacity: 0.85; }
.act-btn-outline { border: 1rpx solid rgba(196, 30, 58, 0.3); }
.act-btn-saved { border: 1rpx solid rgba(21, 128, 61, 0.4); background: rgba(21, 128, 61, 0.05); }
.act-btn-solid { background: var(--brand); box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3); }
.act-text { font-size: 28rpx; font-weight: 500; }
.act-text-outline { color: var(--brand); }
.act-text-saved { color: #15803d; }
.act-text-solid { color: #fff; font-weight: 700; }
</style>
