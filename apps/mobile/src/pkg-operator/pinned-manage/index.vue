<!--
  S2 · 主推位管理面板（分站运营商 V0 重构·本委托灵魂）
  竖列 9 板块 × 横向 6 主推位；站长点「+」拉起 S3 选品库锁定内容。
  三个「没有」：无分站装修 / 无独立分站页 / 无独立账号。
-->
<template>
  <view class="page">
    <!-- 自定义导航：取消 / 主推位管理 / 保存 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarH + 'px' }">
      <text class="nav-cancel" @tap="onCancel">取消</text>
      <text class="nav-title">主推位管理</text>
      <text class="nav-save" :class="{ disabled: !dirty }" @tap="onSave">保存</text>
    </view>

    <!-- 加载 / 错误 三态 -->
    <view v-if="loading" class="state"><text class="state-t">加载中…</text></view>
    <view v-else-if="error" class="state">
      <text class="state-t">{{ error }}</text>
      <view class="state-btn" @tap="load"><text>重试</text></view>
    </view>

    <!-- 全空态引导（所有板块均无内容） -->
    <view v-else-if="allEmpty" class="empty-wrap">
      <view class="empty-ill"><text class="empty-ill-ic">✦</text></view>
      <text class="empty-title">开始配置你的主推位</text>
      <text class="empty-desc">从平台内容库挑选优质内容锁定到各板块主推位，你的客户浏览平台时会优先看到它们。</text>
      <view class="empty-btn" @tap="openPicker(boards[0])"><text>选择首页主推内容</text></view>
      <view class="empty-steps">
        <view class="empty-step"><text class="n">1</text><text class="t">选板块</text></view>
        <view class="empty-step"><text class="n">2</text><text class="t">挑内容</text></view>
        <view class="empty-step"><text class="n">3</text><text class="t">保存</text></view>
      </view>
    </view>

    <!-- 正常态 -->
    <template v-else>
      <view class="hint-bar">
        <text>每个板块最多锁定 6 个主推内容，优先展示给你的客户；点「＋」从选品库添加，可替换、移除。</text>
      </view>
      <scroll-view scroll-y class="scroll-area">
        <view v-for="b in boards" :key="b.board" class="board">
          <view class="board-head">
            <text class="board-name">{{ b.label }}</text>
            <text class="board-count"><text class="hl">{{ filledCount(b) }}</text>/6</text>
            <text class="board-scope" :class="{ live: b.board === 'live' }">{{ b.scope }}</text>
          </view>
          <scroll-view scroll-x class="pin-track">
            <view v-for="slot in b.slots" :key="slot.slotIndex" class="pin">
              <!-- 已锁内容 -->
              <view v-if="slot.content" class="pin-filled" @tap="openPicker(b, slot.slotIndex)">
                <view class="pin-cover" :style="coverStyle(slot.content)">
                  <text v-if="!slot.content.cover" class="cover-char">{{ firstChar(slot.content.title) }}</text>
                  <text class="replace-badge">点击替换</text>
                </view>
                <view class="pin-remove" @tap.stop="removeContent(b, slot)"><text>×</text></view>
                <view class="pin-body">
                  <text class="pin-title">{{ slot.content.title }}</text>
                  <text class="pin-sub">{{ typeLabel(slot.content.contentType) }}</text>
                </view>
              </view>
              <!-- 空位 -->
              <view v-else class="pin-slot" @tap="openPicker(b, slot.slotIndex)">
                <view class="plus"><text class="plus-ic">＋</text></view>
                <text class="plus-label">主推位</text>
              </view>
            </view>
          </scroll-view>
        </view>
        <view style="height: 40rpx"></view>
      </scroll-view>
    </template>

    <!-- S3 选品库半屏面板 -->
    <pinned-picker
      v-if="pickerVisible"
      :station-id="stationId"
      :board="pickerBoard.board"
      :board-label="pickerBoard.label"
      :available-slots="pickerAvailable"
      :locked-other="lockedOtherIds"
      @confirm="onPickerConfirm"
      @close="pickerVisible = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { apiGet } from '@/utils/request'
import {
  pinnedApi,
  CONTENT_TYPE_LABEL,
  type PinnedBoardData,
  type PinnedContentBrief,
  type PinnedSlotInput,
} from '@/lib/station-pinned-data'
import PinnedPicker from './PinnedPicker.vue'

const COVER_GRADIENTS = [
  'linear-gradient(135deg,#8B2D3B,#C41E3A)',
  'linear-gradient(135deg,#4A5D6B,#6E8496)',
  'linear-gradient(135deg,#B8924F,#C9A96E)',
  'linear-gradient(135deg,#5A6B4A,#7D9166)',
  'linear-gradient(135deg,#6B4A5A,#96688A)',
  'linear-gradient(135deg,#3E4A5B,#566A82)',
]

const statusBarH = ref(0)
const loading = ref(true)
const error = ref('')
const stationId = ref('')
const boards = ref<PinnedBoardData[]>([])
const dirtyBoards = ref<Set<string>>(new Set())

// 选品面板状态
const pickerVisible = ref(false)
const pickerBoard = ref<PinnedBoardData>({} as PinnedBoardData)
const pickerReplaceIndex = ref<number | null>(null)

const dirty = computed(() => dirtyBoards.value.size > 0)
const allEmpty = computed(() => boards.value.every((b) => filledCount(b) === 0))

// 打开选品面板时可选的空位数（替换=1，新增=剩余空位）
const pickerAvailable = computed(() => {
  if (pickerReplaceIndex.value !== null) return 1
  return pickerBoard.value.slots ? pickerBoard.value.slots.filter((s) => !s.content).length : 0
})

// 其他板块已锁的 contentId（选品列表置灰"已锁定"）
const lockedOtherIds = computed(() => {
  const ids: string[] = []
  for (const b of boards.value) {
    if (b.board === pickerBoard.value.board) continue
    for (const s of b.slots) if (s.content) ids.push(s.content.id)
  }
  return ids
})

function filledCount(b: PinnedBoardData): number {
  return b.slots.filter((s) => s.content).length
}
function firstChar(t: string): string {
  return (t || '·').trim().charAt(0)
}
function typeLabel(t: string): string {
  return CONTENT_TYPE_LABEL[t] || ''
}
function coverStyle(c: PinnedContentBrief) {
  if (c.cover) return { backgroundImage: `url(${c.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  const idx = Math.abs(hashStr(c.id)) % COVER_GRADIENTS.length
  return { backgroundImage: COVER_GRADIENTS[idx] }
}
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return h
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (!stationId.value) {
      const st = await apiGet<{ id: string }>('/station/my')
      stationId.value = st.id
    }
    boards.value = await pinnedApi.getBoards(stationId.value)
    dirtyBoards.value = new Set()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function openPicker(b: PinnedBoardData, slotIndex?: number) {
  pickerBoard.value = b
  // 点已锁位=替换该位；点空位=从空位起新增
  pickerReplaceIndex.value = slotIndex !== undefined && b.slots[slotIndex]?.content ? slotIndex : null
  pickerVisible.value = true
}

function onPickerConfirm(items: PinnedContentBrief[]) {
  const b = boards.value.find((x) => x.board === pickerBoard.value.board)
  if (!b) {
    pickerVisible.value = false
    return
  }
  if (pickerReplaceIndex.value !== null) {
    // 替换单个位
    b.slots[pickerReplaceIndex.value].content = items[0] || null
  } else {
    // 依次填入空位
    let i = 0
    for (const slot of b.slots) {
      if (i >= items.length) break
      if (!slot.content) {
        slot.content = items[i]
        i++
      }
    }
  }
  dirtyBoards.value.add(b.board)
  pickerVisible.value = false
}

function removeContent(b: PinnedBoardData, slot: { slotIndex: number; content: PinnedContentBrief | null }) {
  const target = boards.value.find((x) => x.board === b.board)
  if (!target) return
  target.slots[slot.slotIndex].content = null
  dirtyBoards.value.add(b.board)
}

async function onSave() {
  if (!dirty.value) return
  uni.showLoading({ title: '保存中', mask: true })
  try {
    for (const board of dirtyBoards.value) {
      const b = boards.value.find((x) => x.board === board)
      if (!b) continue
      const slots: PinnedSlotInput[] = b.slots.map((s) => ({
        slotIndex: s.slotIndex,
        contentType: s.content ? s.content.contentType : null,
        contentId: s.content ? s.content.id : null,
      }))
      await pinnedApi.saveBatch(stationId.value, board, slots)
    }
    dirtyBoards.value = new Set()
    uni.hideLoading()
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  }
}

function onCancel() {
  if (!dirty.value) {
    uni.navigateBack()
    return
  }
  uni.showModal({
    title: '放弃修改？',
    content: '你有未保存的主推位改动，确定放弃吗？',
    confirmText: '放弃',
    cancelText: '继续编辑',
    success: (r) => {
      if (r.confirm) uni.navigateBack()
    },
  })
}

onLoad((q?: Record<string, string>) => {
  try {
    statusBarH.value = uni.getSystemInfoSync().statusBarHeight || 0
  } catch (e) {
    statusBarH.value = 0
  }
  if (q?.stationId) stationId.value = q.stationId
  load()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

/* 导航 */
.nav-bar {
  height: 100rpx;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 38rpx;
  border-bottom: 1rpx solid #ece7df;
  flex-shrink: 0;
}
.nav-cancel {
  font-size: 29rpx;
  color: #6e6e73;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 33rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-save {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
  background: #c41e3a;
  padding: 11rpx 30rpx;
  border-radius: 999rpx;
}
.nav-save.disabled {
  background: #d8d2c8;
}

/* 三态 */
.state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding-top: 200rpx;
}
.state-t {
  font-size: 27rpx;
  color: #9b9691;
}
.state-btn {
  padding: 14rpx 44rpx;
  border: 1rpx solid #c41e3a;
  border-radius: 999rpx;
}
.state-btn text {
  font-size: 27rpx;
  color: #c41e3a;
}

/* 说明条 */
.hint-bar {
  background: rgba(201, 169, 110, 0.12);
  padding: 21rpx 38rpx;
  flex-shrink: 0;
}
.hint-bar text {
  font-size: 23rpx;
  color: #97794a;
  line-height: 1.6;
}

.scroll-area {
  flex: 1;
  padding: 30rpx 38rpx 54rpx;
}

/* 板块卡 */
.board {
  background: #fff;
  border-radius: 35rpx;
  padding: 30rpx 26rpx 26rpx;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
  margin-bottom: 26rpx;
}
.board-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 26rpx;
}
.board-name {
  font-size: 31rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.board-count {
  font-size: 23rpx;
  color: #9b9691;
}
.board-count .hl {
  color: #c41e3a;
  font-weight: 700;
}
.board-scope {
  margin-left: auto;
  font-size: 21rpx;
  color: #9b9691;
  background: #f5f2ec;
  padding: 5rpx 17rpx;
  border-radius: 999rpx;
}
.board-scope.live {
  color: #c41e3a;
  background: rgba(196, 30, 58, 0.08);
}

/* 主推位轨道 */
.pin-track {
  white-space: nowrap;
  width: 100%;
}
.pin {
  display: inline-block;
  width: 177rpx;
  margin-right: 19rpx;
  vertical-align: top;
}
.pin:last-child {
  margin-right: 0;
}

/* 空位 */
.pin-slot {
  width: 177rpx;
  height: 223rpx;
  border-radius: 25rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3rpx dashed #d8c9a8;
  background: rgba(201, 169, 110, 0.05);
}
.pin-slot .plus {
  width: 58rpx;
  height: 58rpx;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.plus-ic {
  font-size: 36rpx;
  color: #c9a96e;
  line-height: 1;
}
.plus-label {
  font-size: 21rpx;
  color: #ab8f5f;
  margin-top: 12rpx;
}

/* 已锁卡 */
.pin-filled {
  position: relative;
  width: 177rpx;
  border-radius: 25rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(44, 38, 30, 0.08);
}
.pin-cover {
  width: 177rpx;
  height: 154rpx;
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background-size: cover;
  background-position: center;
}
.cover-char {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 52rpx;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Songti SC', serif;
}
.replace-badge {
  width: 100%;
  text-align: center;
  font-size: 18rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  padding: 4rpx 0;
}
.pin-remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.pin-remove text {
  color: #fff;
  font-size: 26rpx;
  line-height: 1;
}
.pin-body {
  background: #fff;
  padding: 11rpx 13rpx 15rpx;
}
.pin-title {
  font-size: 21rpx;
  font-weight: 600;
  color: #2c2c2c;
  line-height: 1.3;
  height: 54rpx;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.pin-sub {
  font-size: 19rpx;
  color: #c41e3a;
  font-weight: 600;
  margin-top: 6rpx;
  display: block;
}

/* 全空态引导 */
.empty-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 64rpx;
  text-align: center;
}
.empty-ill {
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, rgba(201, 169, 110, 0.18), transparent 70%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-ill-ic {
  font-size: 90rpx;
  color: #c9a96e;
}
.empty-title {
  font-family: 'Songti SC', serif;
  font-size: 42rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-top: 8rpx;
}
.empty-desc {
  font-size: 25rpx;
  color: #6e6e73;
  line-height: 1.7;
  margin-top: 22rpx;
}
.empty-btn {
  margin-top: 52rpx;
  background: #c41e3a;
  padding: 24rpx 76rpx;
  border-radius: 999rpx;
  box-shadow: 0 8rpx 30rpx rgba(196, 30, 58, 0.25);
}
.empty-btn text {
  color: #fff;
  font-size: 29rpx;
  font-weight: 600;
}
.empty-steps {
  display: flex;
  gap: 34rpx;
  margin-top: 60rpx;
}
.empty-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 11rpx;
}
.empty-step .n {
  width: 50rpx;
  height: 50rpx;
  border-radius: 50%;
  background: #fff;
  border: 3rpx solid #c9a96e;
  color: #ab8f5f;
  font-size: 25rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-step .t {
  font-size: 21rpx;
  color: #9b9691;
}
</style>
