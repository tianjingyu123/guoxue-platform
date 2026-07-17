<script setup lang="ts">
/**
 * 诸葛神数入口页——自 V0 app/zhuge/page.tsx 还原
 * 心诚仪式：安静默想所问之事，随心输入三个汉字 → 结果页本地重算
 * 取舍：①开始前先试算一次，接住引擎「不在康熙字典库」错误 toast 提示换字（引擎已弃 cnchar 改直查康熙字典库）
 *       ②补测算历史弹层（本地 rebu:zhuge-history · 上限 50，沿用梅花易数范式）
 *       ③性能（2026-07-17 审计）：签库+康熙笔画共约 968KB JSON 随 zhuge-engine 静态引入，
 *         未摇签先下全量数据——输入页改动态 import()（点「开始」才加载引擎），
 *         result 页保持静态引（引擎打进独立 chunk，两处共享同一份，不重复下载）
 */
import { ref, computed } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { loadZhugeHistory, clearZhugeHistory, type ZhugeHistoryRecord } from './history'

// 汉字判定：与 zhuge-engine 的 isHan 同一正则。此处本地内联而非从引擎 import——
// 输入校验每次击键都要跑，静态引引擎会把 968KB 签库/笔画库拖进输入页首包（性能后置的初衷就没了）
const HAN_RE = /^[一-鿿㐀-䶿]$/u
const isHan = (ch: string) => HAN_RE.test(ch)

const chars = ref('')
const trimmed = computed(() => chars.value.trim())
const charList = computed(() => Array.from(trimmed.value))
const valid = computed(() => charList.value.length === 3 && charList.value.every(isHan))

// 防重入：动态加载引擎期间重复点「开始」不重复触发
let submitting = false

async function submit() {
  if (!valid.value || submitting) return
  submitting = true
  try {
    // 摇签动作后才动态加载引擎（签库+康熙笔画数据随 chunk 此刻才下载）
    const { paiZhuge } = await import('@/pkg-paipan2/lib/zhuge-engine')
    // 预检：生僻字不在康熙字典库时提前拦截（占卜须准确，不静默兜底）
    try {
      paiZhuge(trimmed.value)
    } catch (e) {
      uni.showToast({ title: e instanceof Error ? e.message : '起卦失败，请换字再测', icon: 'none' })
      return
    }
    navigateTo(`/pkg-paipan2/zhuge/result?input=${encodeURIComponent(trimmed.value)}`)
  } catch {
    // 弱网下引擎 chunk 加载失败：给明确提示，可重试
    uni.showToast({ title: '网络不佳，加载签库失败，请重试', icon: 'none' })
  } finally {
    submitting = false
  }
}

// ─── 测算历史（本地存储弹层） ───
const showHistory = ref(false)
const records = ref<ZhugeHistoryRecord[]>([])

function openHistory() {
  records.value = loadZhugeHistory()
  showHistory.value = true
}
function onClearHistory() {
  clearZhugeHistory()
  records.value = []
}
function openRecord(r: ZhugeHistoryRecord) {
  showHistory.value = false
  navigateTo(`/pkg-paipan2/zhuge/result?input=${encodeURIComponent(r.input)}`)
}
</script>

<template>
  <view class="page">
    <tool-header
      title="诸葛神数"
      subtitle="随心三字 · 签由念起"
      share
      share-title="诸葛神数"
    >
      <template #actions>
        <view
          class="hdr-btn"
          @tap="openHistory"
        >
          <app-icon
            name="history"
            :size="36"
            color="var(--text-ink)"
          />
        </view>
      </template>
    </tool-header>

    <scroll-view
      scroll-y
      class="body"
    >
      <view class="inner">
        <!-- 引导与输入 -->
        <paper-card padding="lg">
          <text class="guide">
            安静默想你所想之事，随心而起输入三个字
          </text>
          <view class="input-row">
            <input
              v-model="chars"
              class="char-input"
              type="text"
              :maxlength="3"
              placeholder="请输入三个汉字"
              placeholder-class="char-input-ph"
              confirm-type="done"
              @confirm="submit"
            >
            <view
              class="start-btn"
              :class="{ 'start-btn-disabled': !valid }"
              @tap="submit"
            >
              <text class="start-btn-text">
                开始
              </text>
            </view>
          </view>
          <text
            v-if="trimmed && !valid"
            class="invalid-hint"
          >
            需输入恰好三个汉字
          </text>
        </paper-card>

        <!-- 说明 -->
        <paper-card padding="lg">
          <view class="notes">
            <text class="note-p">
              《诸葛神数》相传为三国诸葛亮所著，测字与六十四卦三百八十四爻对应，谶语句法，长短不一，寓意深远，内容仅供参考。
            </text>
            <text class="note-p">
              当需要抉择时，意念始发，随心写三个字。这三个字可以跟所想之事相关，也可以不相关，要随心而起、脱口而出，不能绞尽脑汁、斟酌再三。无论输入简体还是繁体，笔画数均按繁体（康熙）笔画计算。
            </text>
            <text class="note-p">
              签辞给我们提供一种启示，或作为其他工具的辅助参考，但不可过分依赖、迷信。得到启示以后就应该穿过迷惘，努力向前，不要沉溺于此。
            </text>
          </view>
        </paper-card>

        <!-- 心念footer -->
        <view class="motto">
          <app-icon
            name="sparkles"
            :size="24"
            color="var(--text-soft)"
          />
          <text class="motto-text">
            字是心念的投影 · 签由念起
          </text>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="本工具仅供传统文化爱好者研究学习使用，签辞内容不构成任何预测或建议。"
        />
      </view>
    </scroll-view>

    <!-- 测算历史弹层（本地存储） -->
    <view
      v-if="showHistory"
      class="mask"
      @tap="showHistory = false"
    >
      <view
        class="sheet"
        @tap.stop
      >
        <view class="sheet-hdr">
          <text
            class="sheet-cancel"
            @tap="showHistory = false"
          >
            关闭
          </text>
          <text class="sheet-title">
            测算历史
          </text>
          <text
            class="sheet-clear"
            :class="{ 'sheet-clear-off': records.length === 0 }"
            @tap="onClearHistory"
          >
            清空
          </text>
        </view>
        <scroll-view
          scroll-y
          class="history-list"
        >
          <view
            v-if="records.length === 0"
            class="history-empty"
          >
            <text class="history-empty-text">
              暂无测算记录，输入三字起卦后自动留存
            </text>
          </view>
          <view
            v-for="r in records"
            :key="r.id"
            class="history-item"
            @tap="openRecord(r)"
          >
            <view class="history-item-main">
              <text class="history-input">
                {{ r.input }}
              </text>
              <text class="history-sign">
                第{{ r.signNumber }}签 · {{ r.luck }}
              </text>
            </view>
            <text class="history-date">
              {{ r.dateText }}
            </text>
          </view>
        </scroll-view>
      </view>
    </view>
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

/* ── 引导与输入 ── */
.guide {
  display: block; text-align: center;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx; font-weight: 500; line-height: 1.7; color: var(--brand);
}
.input-row { margin-top: 32rpx; display: flex; align-items: stretch; gap: 16rpx; }
.char-input {
  flex: 1; min-width: 0; box-sizing: border-box;
  height: 96rpx; padding: 0 32rpx;
  border-radius: 24rpx; border: 1rpx solid var(--line);
  background: var(--bg-paper);
  text-align: center;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 40rpx; letter-spacing: 0.5em; color: var(--text-ink);
}
.char-input-ph { font-size: 26rpx; letter-spacing: 0; color: var(--text-soft); }
.start-btn {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  padding: 0 48rpx; border-radius: 24rpx;
  background: var(--brand);
  box-shadow: 0 6rpx 20rpx rgba(196, 30, 58, 0.28);
  &:active { opacity: 0.8; }
}
.start-btn-disabled { opacity: 0.5; box-shadow: none; }
.start-btn-text { font-size: 28rpx; font-weight: 700; color: #fff; }
.invalid-hint {
  display: block; margin-top: 16rpx; text-align: center;
  font-size: 24rpx; color: var(--text-soft);
}

/* ── 说明 ── */
.notes { display: flex; flex-direction: column; gap: 20rpx; }
.note-p { font-size: 26rpx; line-height: 1.75; color: var(--text-soft); }

/* ── 心念footer ── */
.motto { display: flex; align-items: center; justify-content: center; gap: 10rpx; }
.motto-text { font-size: 22rpx; color: var(--text-soft); }

/* ── 历史弹层 ── */
.mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%;
  background: var(--card);
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
  max-height: 70vh;
  display: flex; flex-direction: column;
}
.sheet-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.sheet-cancel { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.sheet-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.sheet-clear { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.sheet-clear-off { opacity: 0.4; }
.history-list { max-height: 56vh; }
.history-empty { padding: 80rpx 48rpx; }
.history-empty-text { display: block; text-align: center; font-size: 26rpx; color: var(--text-soft); line-height: 1.6; }
.history-item {
  display: flex; align-items: center; justify-content: space-between; gap: 20rpx;
  padding: 26rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.history-item-main { display: flex; flex-direction: column; gap: 8rpx; min-width: 0; flex: 1; }
.history-input {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 30rpx; font-weight: 700; letter-spacing: 0.2em; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.history-sign { font-size: 24rpx; color: var(--brand); }
.history-date { font-size: 22rpx; color: var(--text-soft); flex-shrink: 0; }
</style>
