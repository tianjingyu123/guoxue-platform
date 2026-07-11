<script setup lang="ts">
/**
 * 诸葛神数结果页——自 V0 app/zhuge/result/page.tsx 还原
 * onLoad 取 input（三字）本地重算：康熙笔画 → 各取个位组三位数 → 循环归 384 签
 * 取舍：①AI 深断区块本批砍掉（不接假数据）
 *       ②引擎已弃 cnchar 直查康熙字典库（tradChars 恒等原字），V0 的「繁体 X X X」行去掉，
 *         改示「康熙笔画 a / b / c · 取数 abc」；生僻字不在字典库时引擎抛错 → 错误态 + toast 提示换字
 *       ③起卦成功自动写入本地历史（rebu:zhuge-history · 上限 50）
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import {
  paiZhuge, cnSignNumber, zhugeVerdict, type ZhugeResult,
} from '@/pkg-paipan2/lib/zhuge-engine'
import { saveZhugeHistory } from './history'

const result = ref<ZhugeResult | null>(null)
const errMsg = ref('')

onLoad((opts: Record<string, string> = {}) => {
  const w = opts.input ? decodeURIComponent(opts.input) : ''
  if (!w) {
    errMsg.value = '参数无效，请重新输入三个汉字。'
    return
  }
  try {
    const r = paiZhuge(w)
    result.value = r
    saveZhugeHistory({ input: r.input, signNumber: r.signNumber, luck: r.sign.luck })
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : '起卦失败，请重新输入三个汉字。'
    uni.showToast({ title: errMsg.value, icon: 'none' })
  }
})

/** 签等配色：上=朱砂吉、下=弱化、中=琥珀 */
const luckColor = computed(() => {
  const luck = result.value?.sign.luck ?? ''
  if (luck.startsWith('上')) return 'var(--brand)'
  if (luck.startsWith('下')) return 'var(--text-soft)'
  return '#b45309'
})

/** 卦名括号配平（部分签库卦名尾括号缺失，口径同 V0） */
function normalizeGua(gua: string): string {
  const open = (gua.match(/[（(]/g) ?? []).length
  const close = (gua.match(/[）)]/g) ?? []).length
  return open > close ? `${gua})` : gua
}

const guaLine = computed(() =>
  result.value ? `${result.value.sign.gong} ${normalizeGua(result.value.sign.gua)}` : '')

const verdicts = computed(() => (result.value ? zhugeVerdict(result.value) : []))

function retry() {
  navigateTo('/pkg-paipan2/zhuge/index')
}

function onBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) { navigateBack(); return }
  navigateTo('/pkg-paipan2/zhuge/index')
}
</script>

<template>
  <view class="page">
    <tool-header
      title="诸葛神数"
      subtitle="随心三字 · 签由念起"
      share
      share-title="诸葛神数"
      @back="onBack"
    >
      <template #actions>
        <view
          v-if="result"
          class="hdr-btn"
          @tap="retry"
        >
          <app-icon
            name="refresh-cw"
            :size="34"
            color="var(--text-ink)"
          />
        </view>
      </template>
    </tool-header>

    <!-- 错误态：参数缺失 / 生僻字不在康熙字典库 -->
    <view
      v-if="!result"
      class="error-wrap"
    >
      <text class="error-text">
        {{ errMsg || '推演中…' }}
      </text>
      <view
        v-if="errMsg"
        class="error-btn"
        @tap="retry"
      >
        <text class="error-btn-text">
          返回起卦
        </text>
      </view>
    </view>

    <scroll-view
      v-else
      scroll-y
      class="body"
    >
      <view class="inner">
        <!-- 签头 -->
        <paper-card padding="md">
          <view class="sign-head">
            <view class="sign-head-bar" />
            <text class="sign-head-title">
              诸葛神算第{{ cnSignNumber(result.signNumber) }}签
            </text>
            <text
              class="sign-head-luck"
              :style="{ color: luckColor }"
            >
              【{{ result.sign.luck }}】
            </text>
          </view>
          <text class="sign-intro">
            您所输入汉字<text class="sign-intro-chars">【{{ result.input }}】</text>占得第{{ result.signNumber }}签
          </text>
          <text class="sign-gua">
            {{ guaLine }}
          </text>
          <text class="sign-meta">
            康熙笔画 {{ result.strokes.join(' / ') }} · 取数 {{ result.digits.join('') }}
          </text>
        </paper-card>

        <!-- 签文 -->
        <paper-card padding="md">
          <section-title title="签文" />
          <view class="sec-body">
            <text class="sign-text">
              {{ result.sign.text }}
            </text>
          </view>
        </paper-card>

        <!-- 详细解签 -->
        <paper-card padding="md">
          <section-title title="详细解签" />
          <view class="sec-body paras">
            <text
              v-for="(p, i) in result.sign.jie"
              :key="i"
              class="para"
              :class="{ 'para-soft': p.startsWith('解签') }"
            >
              {{ p }}
            </text>
          </view>
        </paper-card>

        <!-- 白话总断 -->
        <paper-card padding="md">
          <section-title title="白话总断" />
          <view class="sec-body paras">
            <text
              v-for="(v, i) in verdicts"
              :key="i"
              class="para"
            >
              {{ v }}
            </text>
          </view>
        </paper-card>

        <!-- 重要提示 -->
        <paper-card padding="md">
          <section-title title="重要提示" />
          <view class="sec-body">
            <text class="notice-text">
              我们在生活中难免遭遇困惑，签辞给我们提供了一种启示，或作为其他工具的辅助参考，但大家不可以太过依赖、迷信，这样反而产生副作用。得到启示以后就应该穿过迷惘，努力向前，不要沉溺于此，内容仅供参考。
            </text>
          </view>
        </paper-card>

        <!-- 再测一次 -->
        <view
          class="again-btn"
          @tap="retry"
        >
          <text class="again-btn-text">
            再测一次
          </text>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="以上内容为传统签辞白话整理，仅供传统文化研习参考，不构成任何预测或建议。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; height: 0; }
.inner { padding: 24rpx 32rpx 96rpx; display: flex; flex-direction: column; gap: 28rpx; }

.hdr-btn {
  width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  &:active { background: rgba(0, 0, 0, 0.05); }
}

/* ── 错误态 ── */
.error-wrap {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 32rpx; padding: 0 48rpx;
}
.error-text { font-size: 28rpx; line-height: 1.7; color: var(--text-soft); text-align: center; }
.error-btn {
  padding: 20rpx 40rpx; background: var(--brand); border-radius: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(196, 30, 58, 0.28);
  &:active { opacity: 0.8; }
}
.error-btn-text { font-size: 28rpx; font-weight: 700; color: #fff; }

/* ── 签头 ── */
.sign-head { display: flex; align-items: center; gap: 16rpx; }
.sign-head-bar { width: 8rpx; height: 32rpx; border-radius: 999rpx; background: var(--brand); }
.sign-head-title { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.sign-head-luck {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx; font-weight: 700;
}
.sign-intro { display: block; margin-top: 24rpx; font-size: 26rpx; line-height: 1.7; color: var(--text-ink); }
.sign-intro-chars {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-weight: 700;
}
.sign-gua { display: block; margin-top: 8rpx; font-size: 26rpx; color: var(--text-ink); }
.sign-meta { display: block; margin-top: 16rpx; font-size: 24rpx; color: var(--text-soft); }

/* ── 区块正文 ── */
.sec-body { margin-top: 24rpx; }
.sign-text {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 32rpx; font-weight: 500; line-height: 2; color: var(--brand);
}
.paras { display: flex; flex-direction: column; gap: 20rpx; }
.para { font-size: 26rpx; line-height: 1.75; color: var(--text-ink); }
.para-soft { color: var(--text-soft); }
.notice-text { font-size: 24rpx; line-height: 1.75; color: #b45309; }

/* ── 再测一次 ── */
.again-btn {
  padding: 26rpx; background: var(--card); border: 1rpx solid var(--line); border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  &:active { opacity: 0.8; }
}
.again-btn-text {
  display: block; text-align: center;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 30rpx; font-weight: 700; color: var(--text-ink);
}
</style>
