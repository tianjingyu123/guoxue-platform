<script setup lang="ts">
/**
 * 立极尺入口页——自 V0 app/lijichi/page.tsx 还原
 * 输入：客户名称（选填）+ 二十四山向（底部弹层选择）→ 创建立极尺进入盘面。
 * 取舍：V0 独立历史页 app/lijichi/history（157 行，含搜索/多选管理）砍成本页内嵌本地历史弹层
 *       （key: rebu:lijichi-history，上限 50，同批内惯例；搜索/多选管理裁掉，保留清空）；
 *       V0 SEED 假数据不带（诚实空态）；分享用 tool-header 内置；R4 合规：小程序端标题改文化研究表述。
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { loadLijichiHistory, clearLijichiHistory, type LijichiHistoryItem } from './lijichi-history'
import { MOUNTAINS } from '@/pkg-paipan/lib/xuankong-data'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '热卜立极尺'
// #ifdef MP-WEIXIN
hdrTitle = '立极文化研究'
// #endif


const customer = ref('')
const sittingIdx = ref<number | null>(null)
const showPicker = ref(false)
const showHelp = ref(false)

function shanxiangLabel(i: number) {
  return `${MOUNTAINS[i]}山${MOUNTAINS[(i + 12) % 24]}向`
}

function pickSitting(i: number) {
  sittingIdx.value = i
  showPicker.value = false
}

function handleCreate() {
  if (sittingIdx.value === null) {
    uni.showToast({ title: '请先选择山向', icon: 'none' })
    return
  }
  const params: Record<string, unknown> = {
    customer: customer.value.trim(),
    sitting: sittingIdx.value,
  }
  navigateTo(`/pkg-paipan/lijichi/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}

// ── 本地历史记录（盘面页「保存」写入，此处只读展示） ──
const showHistory = ref(false)
const records = ref<LijichiHistoryItem[]>([])

function loadRecords() {
  records.value = loadLijichiHistory()
}
onShow(loadRecords)

function openHistory() {
  loadRecords()
  showHistory.value = true
}
function clearHistory() {
  clearLijichiHistory()
  records.value = []
}
function openRecord(r: LijichiHistoryItem) {
  showHistory.value = false
  const params: Record<string, unknown> = {
    customer: r.client === '未命名' ? '' : r.client,
    sitting: r.sitting,
  }
  if (typeof r.heading === 'number') params.heading = r.heading
  if (r.plate) params.plate = r.plate
  if (r.note) params.note = r.note
  navigateTo(`/pkg-paipan/lijichi/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header
      :title="hdrTitle"
      subtitle="以宅中心立极 · 定二十四山向"
      share
      :share-title="hdrTitle"
      help
      @help="showHelp = true"
    >
      <template #actions>
        <view class="th-history-btn" @tap="openHistory">
          <app-icon name="history" :size="36" color="var(--text-ink)" />
        </view>
      </template>
    </tool-header>

    <scroll-view scroll-y class="body">
      <view class="inner">
        <!-- 朱底题头 -->
        <view class="hero">
          <text class="hero-title">立极尺</text>
          <text class="hero-sub">宅中心为太极点 · 二十四山叠图定坐向</text>
        </view>

        <!-- 表单卡片 -->
        <view class="form-card">
          <view class="form-row">
            <text class="form-label">客户名称</text>
            <input
              v-model="customer"
              class="name-input"
              type="text"
              placeholder="请输入客户名称（选填）"
            >
          </view>

          <view class="picker-block">
            <view
              class="picker-btn"
              :class="{ 'picker-btn-on': sittingIdx !== null }"
              @tap="showPicker = true"
            >
              <text class="picker-btn-text" :class="{ 'picker-btn-text-on': sittingIdx !== null }">
                {{ sittingIdx === null ? '选择山向' : shanxiangLabel(sittingIdx) }}
              </text>
              <app-icon name="chevron-down" :size="32" color="var(--text-soft)" />
            </view>
            <view class="help-link" @tap="showHelp = true">
              <app-icon name="help-circle" :size="28" color="var(--gold-foreground)" />
              <text class="help-link-text">立极尺使用说明【点击查看】</text>
            </view>
          </view>
        </view>

        <!-- 创建按钮 -->
        <view
          class="submit"
          :class="{ 'submit-off': sittingIdx === null }"
          @tap="handleCreate"
        >
          <text class="submit-text">创建立极尺</text>
        </view>

        <!-- 简介 -->
        <text class="intro">
          立极尺（立极规）以宅之中心为「太极点」，将二十四山盘叠于户型图之上，定出坐向与二十四山方位，为玄空飞星、八宅等理气布局提供准绳。请先选择山向创建，再上传户型图对齐立极。内容仅供参考。
        </text>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="立极尺为传统堪舆文化工具，所示方位仅供文化研究与参考，不构成任何决策建议。"
        />
      </view>
    </scroll-view>

    <!-- 山向选择弹层 -->
    <view v-if="showPicker" class="mask" @tap="showPicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-hdr">
          <text class="sheet-cancel" @tap="showPicker = false">取消</text>
          <text class="sheet-title">选择山向</text>
          <text class="sheet-ok" @tap="showPicker = false">确定</text>
        </view>
        <scroll-view scroll-y class="picker-list">
          <view
            v-for="(m, i) in MOUNTAINS"
            :key="i"
            class="picker-item"
            :class="{ 'picker-item-on': sittingIdx === i }"
            @tap="pickSitting(i)"
          >
            <text class="picker-item-text" :class="{ 'picker-item-text-on': sittingIdx === i }">
              {{ shanxiangLabel(i) }}
            </text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 使用说明弹层 -->
    <view v-if="showHelp" class="mask mask-center" @tap="showHelp = false">
      <view class="modal" @tap.stop>
        <view class="modal-hdr">
          <text class="modal-title">立极尺使用说明</text>
          <view class="modal-close" @tap="showHelp = false">
            <app-icon name="x" :size="36" color="var(--text-soft)" />
          </view>
        </view>
        <scroll-view scroll-y class="modal-body">
          <text class="modal-p">1. 选择住宅坐向（山向），点击「创建立极尺」进入盘面。</text>
          <text class="modal-p">2. 点击「上传」导入户型平面图，切换到「户型图模式」后，可拖动、缩放、旋转户型图，使墙体与二十四山对齐，立极尺保持锁定。</text>
          <text class="modal-p">3. 非户型图模式下，可用「左转 / 右转」或拖动盘面微调朝向；「旋转锁定」可固定盘面。</text>
          <text class="modal-p">4. 「切换样式」在三元 / 三合 / 综合 / 简易盘之间循环切换；对齐后点「玄空飞星」可按坐向排盘。</text>
          <text class="modal-p">5. 完成后点「保存」记录本次立极，可在本页右上角「历史记录」中回看。</text>
          <text class="modal-p modal-p-soft">以宅中心为太极点立极，内容仅供参考。</text>
        </scroll-view>
      </view>
    </view>

    <!-- 历史记录弹层（本地存储） -->
    <view v-if="showHistory" class="mask" @tap="showHistory = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-hdr">
          <text class="sheet-cancel" @tap="showHistory = false">关闭</text>
          <text class="sheet-title">历史记录</text>
          <text
            class="sheet-clear"
            :class="{ 'sheet-clear-off': records.length === 0 }"
            @tap="clearHistory"
          >清空</text>
        </view>
        <scroll-view scroll-y class="picker-list">
          <view v-if="records.length === 0" class="history-empty">
            <app-icon name="ruler" :size="72" color="var(--line)" />
            <text class="history-empty-text">暂无立极记录，创建并保存后自动留存</text>
          </view>
          <view
            v-for="r in records"
            :key="r.id"
            class="history-item"
            @tap="openRecord(r)"
          >
            <view class="history-icon">
              <app-icon name="ruler" :size="32" color="var(--brand)" />
            </view>
            <view class="history-main">
              <text class="history-client">{{ r.client }}</text>
              <view class="history-meta">
                <text class="history-date">{{ r.dateText }}</text>
                <text class="history-sx">{{ r.shanxiang }}</text>
                <text v-if="typeof r.heading === 'number'" class="history-deg">{{ Math.round(r.heading) }}°</text>
                <text v-if="r.note" class="history-note">有笔记</text>
              </view>
            </view>
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

.th-history-btn {
  width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%;
  &:active { background: rgba(0, 0, 0, 0.05); }
}

/* ── 朱底题头 ── */
.hero {
  padding: 48rpx 40rpx; border-radius: 32rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  display: flex; flex-direction: column; align-items: center; gap: 8rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.25);
}
.hero-title {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 52rpx; font-weight: 700; letter-spacing: 16rpx; color: #fff;
  /* 让 letter-spacing 视觉居中 */
  margin-left: 16rpx;
}
.hero-sub { font-size: 24rpx; color: rgba(255, 255, 255, 0.8); }

/* ── 表单卡片 ── */
.form-card {
  background: var(--card);
  border-radius: 32rpx;
  border: 1rpx solid var(--line);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.form-row {
  display: flex; align-items: center; justify-content: space-between; gap: 24rpx;
  padding: 34rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.form-label { font-size: 30rpx; font-weight: 700; color: var(--text-ink); flex-shrink: 0; }
.name-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }

.picker-block { padding: 34rpx 32rpx 28rpx; display: flex; flex-direction: column; gap: 28rpx; }
.picker-btn {
  display: flex; align-items: center; justify-content: space-between; gap: 16rpx;
  padding: 26rpx 32rpx;
  border-radius: 16rpx;
  border: 1rpx solid var(--line);
  background: var(--bg-paper);
  &:active { border-color: var(--brand); }
}
.picker-btn-on { border-color: rgba(196, 30, 58, 0.5); }
.picker-btn-text {
  font-size: 30rpx; color: var(--text-soft);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.picker-btn-text-on {
  color: var(--text-ink);
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.help-link { display: flex; align-items: center; gap: 10rpx; }
.help-link-text { font-size: 26rpx; font-weight: 500; color: var(--gold-foreground); }

/* ── 创建按钮 ── */
.submit {
  padding: 32rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
  &:active { transform: scale(0.99); }
}
.submit-off { opacity: 0.5; box-shadow: none; }
.submit-text { display: block; text-align: center; font-size: 32rpx; font-weight: 700; color: #fff; }

.intro { font-size: 26rpx; line-height: 1.8; color: var(--text-soft); }

/* ── 弹层通用 ── */
.mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex; align-items: flex-end;
}
.mask-center { align-items: center; justify-content: center; padding: 48rpx; background: rgba(0, 0, 0, 0.5); }
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
  flex-shrink: 0;
}
.sheet-cancel { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.sheet-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.sheet-ok { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.sheet-clear { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.sheet-clear-off { opacity: 0.4; }
.picker-list { max-height: 56vh; }
.picker-item {
  padding: 26rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.picker-item-on { background: rgba(196, 30, 58, 0.05); }
.picker-item-text { display: block; text-align: center; font-size: 28rpx; color: var(--text-soft); }
.picker-item-text-on {
  color: var(--brand); font-weight: 600; font-size: 32rpx;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}

/* ── 使用说明弹窗 ── */
.modal {
  width: 100%;
  max-width: 640rpx;
  background: var(--card);
  border-radius: 32rpx;
  overflow: hidden;
}
.modal-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 40rpx;
  border-bottom: 1rpx solid var(--line);
}
.modal-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.modal-close {
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
}
.modal-body { max-height: 60vh; padding: 32rpx 40rpx; box-sizing: border-box; }
.modal-p { display: block; font-size: 28rpx; line-height: 1.8; color: var(--text-ink); margin-bottom: 20rpx; }
.modal-p-soft { color: var(--text-soft); margin-bottom: 0; }

/* ── 历史记录 ── */
.history-empty {
  padding: 80rpx 48rpx;
  display: flex; flex-direction: column; align-items: center; gap: 20rpx;
}
.history-empty-text { font-size: 26rpx; color: var(--text-soft); }
.history-item {
  display: flex; align-items: flex-start; gap: 20rpx;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.history-icon {
  width: 72rpx; height: 72rpx; flex-shrink: 0;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.1);
  display: flex; align-items: center; justify-content: center;
}
.history-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10rpx; }
.history-client {
  font-size: 30rpx; font-weight: 600; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.history-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 12rpx; }
.history-date { font-size: 22rpx; color: var(--text-soft); }
.history-sx { font-size: 22rpx; color: rgba(196, 30, 58, 0.8); }
.history-deg { font-size: 22rpx; color: var(--text-soft); }
.history-note {
  padding: 2rpx 12rpx; border-radius: 8rpx;
  background: rgba(201, 169, 110, 0.18);
  font-size: 20rpx; font-weight: 500; color: var(--gold-foreground);
}
</style>
