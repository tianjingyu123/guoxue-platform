<script setup lang="ts">
/**
 * 咨询现场（对应 V0 consult-session.tsx）
 * 老师面客时的专注模式：客户信息 + 计时 + 随手记 + 一键排盘/出报告/记账/完结。
 *
 * 笔记本地暂存（按预约 id），中途退出不丢；完结时写入客户服务记录（CRM），
 * 并可顺手记一笔收入 —— 这两件事老师做完咨询最容易忘。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import { navigateTo } from '@/utils/router'
import { wsApi, type Appointment } from '../lib/workspace-api'

const props = defineProps<{ appointment: Appointment }>()
const emit = defineEmits<{ (e: 'exit'): void; (e: 'generate-report'): void }>()

const NOTE_KEY = (id: string) => `rebu:consult-note:${id}`

const seconds = ref(0)
const note = ref('')
const finishing = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

/* 完结弹层：顺手记账 */
const finishOpen = ref(false)
const fFee = ref('')
const fPay = ref('现金')
const PAYS = ['现金', '微信', '支付宝', '转账']

onMounted(() => {
  try {
    note.value = (uni.getStorageSync(NOTE_KEY(props.appointment.id)) as string) || ''
  } catch {
    note.value = ''
  }
  fFee.value = props.appointment.fee ? String(props.appointment.fee) : ''
  timer = setInterval(() => (seconds.value += 1), 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  saveNote()
})

function saveNote() {
  try {
    uni.setStorageSync(NOTE_KEY(props.appointment.id), note.value)
  } catch {
    /* 存储失败不打断咨询 */
  }
}

function onNote(e: any) {
  note.value = e.detail.value
  saveNote()
}

function clock(): string {
  const h = Math.floor(seconds.value / 3600)
  const m = Math.floor((seconds.value % 3600) / 60)
  const s = seconds.value % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** 现场排盘：直接跳真工具页（工作台不自带盘） */
function goPaipan() {
  navigateTo('/paipan/bazi')
}

async function finish() {
  finishing.value = true
  try {
    await wsApi.updateAppointment(props.appointment.id, {
      status: 'done',
      note: note.value || props.appointment.note || undefined,
    })
    // 顺手记一笔（填了金额才记）
    const fee = Number(fFee.value)
    if (fee > 0) {
      await wsApi.addLedger({
        clientName: props.appointment.clientName,
        service: props.appointment.service,
        amount: fee,
        payMethod: fPay.value,
        note: '咨询现场完结',
      })
    }
    try {
      uni.removeStorageSync(NOTE_KEY(props.appointment.id))
    } catch {
      /* ignore */
    }
    uni.showToast({ title: '已完结', icon: 'success' })
    emit('exit')
  } catch (e: any) {
    uni.showToast({ title: e?.message || '完结失败', icon: 'none' })
  } finally {
    finishing.value = false
    finishOpen.value = false
  }
}
</script>

<template>
  <view class="cs">
    <!-- 客户 + 计时 -->
    <PaperCard gold padding="lg">
      <view class="cs-head">
        <view class="cs-avatar">{{ appointment.clientName.slice(0, 1) }}</view>
        <view class="cs-head-info">
          <text class="cs-name">{{ appointment.clientName }}</text>
          <text class="cs-service">{{ appointment.service }} · {{ appointment.channel }}</text>
        </view>
        <view class="cs-clock">
          <text class="cs-clock-txt">{{ clock() }}</text>
          <text class="cs-clock-label">已进行</text>
        </view>
      </view>
      <view v-if="appointment.note" class="cs-brief">
        <text class="cs-brief-label">客户诉求 / 备课要点</text>
        <text class="cs-brief-txt">{{ appointment.note }}</text>
      </view>
    </PaperCard>

    <!-- 现场工具 -->
    <PaperCard padding="lg">
      <SectionTitle title="现场工具" />
      <view class="cs-tools">
        <view class="cs-tool" @tap="goPaipan">
          <view class="cs-tool-icon">
            <AppIcon name="compass" :size="22" color="#C41E3A" />
          </view>
          <text class="cs-tool-label">现场排盘</text>
        </view>
        <view class="cs-tool" @tap="emit('generate-report')">
          <view class="cs-tool-icon">
            <AppIcon name="scroll-text" :size="22" color="#C41E3A" />
          </view>
          <text class="cs-tool-label">出报告</text>
        </view>
        <view class="cs-tool" @tap="finishOpen = true">
          <view class="cs-tool-icon">
            <AppIcon name="wallet" :size="22" color="#C41E3A" />
          </view>
          <text class="cs-tool-label">收款完结</text>
        </view>
      </view>
    </PaperCard>

    <!-- 随手记 -->
    <PaperCard padding="lg">
      <SectionTitle title="咨询笔记" subtitle="自动暂存，退出不丢" />
      <textarea
        :value="note"
        class="cs-note"
        placeholder="随手记下断语要点、客户反馈、后续跟进事项……"
        placeholder-class="cs-ph"
        @input="onNote"
      />
    </PaperCard>

    <!-- 底部 -->
    <view class="cs-actions">
      <view class="cs-btn cs-btn--ghost" @tap="emit('exit')">
        <text class="cs-btn-txt cs-btn-txt--ghost">暂离（笔记保留）</text>
      </view>
      <view class="cs-btn cs-btn--primary" @tap="finishOpen = true">
        <text class="cs-btn-txt cs-btn-txt--primary">结束咨询</text>
      </view>
    </view>

    <!-- 完结 + 记账 -->
    <view v-if="finishOpen" class="cs-mask" @tap="finishOpen = false">
      <view class="cs-sheet" @tap.stop>
        <text class="cs-sheet-title">结束咨询</text>
        <text class="cs-sheet-sub">顺手记一笔，账本才对得上（不收费就留空）</text>

        <text class="cs-label">本次收费</text>
        <input v-model="fFee" class="cs-input" type="digit" placeholder="0" placeholder-class="cs-ph" />

        <text class="cs-label">收款方式</text>
        <view class="cs-chips">
          <view
            v-for="p in PAYS"
            :key="p"
            class="cs-chip"
            :class="{ 'cs-chip--on': fPay === p }"
            @tap="fPay = p"
          >
            <text class="cs-chip-txt" :class="{ 'cs-chip-txt--on': fPay === p }">{{ p }}</text>
          </view>
        </view>

        <view class="cs-btn cs-btn--primary cs-btn--full" @tap="finish">
          <text class="cs-btn-txt cs-btn-txt--primary">{{ finishing ? '处理中…' : '确认完结' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.cs {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx 24rpx 48rpx;
}

.cs-head {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.cs-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: #C41E3A;
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.cs-head-info {
  flex: 1;
  min-width: 0;
}

.cs-name {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.cs-service {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #9A8C7E;
}

.cs-clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.cs-clock-txt {
  font-size: 34rpx;
  font-weight: 700;
  color: #C41E3A;
  font-variant-numeric: tabular-nums;
}

.cs-clock-label {
  font-size: 20rpx;
  color: #B8AA9A;
}

.cs-brief {
  margin-top: 24rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.08);
}

.cs-brief-label {
  display: block;
  margin-bottom: 6rpx;
  font-size: 21rpx;
  color: #9A8C7E;
}

.cs-brief-txt {
  font-size: 26rpx;
  line-height: 1.7;
  color: #3A2A1E;
}

/* 工具 */
.cs-tools {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-top: 24rpx;
}

.cs-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 0;
}

.cs-tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
}

.cs-tool-label {
  font-size: 23rpx;
  color: #3A2A1E;
}

/* 笔记 */
.cs-note {
  width: 100%;
  height: 320rpx;
  margin-top: 24rpx;
  padding: 20rpx;
  box-sizing: border-box;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
  line-height: 1.8;
  color: #3A2A1E;
}

.cs-ph {
  color: #C4B8A8;
}

/* 按钮 */
.cs-actions {
  display: flex;
  gap: 16rpx;
}

.cs-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 44rpx;
}

.cs-btn--full {
  width: 100%;
  margin-top: 32rpx;
  border-radius: 12rpx;
}

.cs-btn--primary {
  background: #C41E3A;
}

.cs-btn--ghost {
  border: 1rpx solid rgba(196, 30, 58, 0.4);
}

.cs-btn-txt {
  font-size: 26rpx;
  font-weight: 600;
}

.cs-btn-txt--primary {
  color: #fff;
}

.cs-btn-txt--ghost {
  color: #C41E3A;
}

/* 弹层 */
.cs-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}

.cs-sheet {
  width: 100%;
  padding: 32rpx 32rpx calc(48rpx + env(safe-area-inset-bottom));
  border-radius: 24rpx 24rpx 0 0;
  background: #FDFAF4;
}

.cs-sheet-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #3A2A1E;
  text-align: center;
}

.cs-sheet-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9A8C7E;
  text-align: center;
}

.cs-label {
  display: block;
  margin: 24rpx 0 12rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.cs-input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
  color: #3A2A1E;
}

.cs-chips {
  display: flex;
  gap: 12rpx;
}

.cs-chip {
  padding: 10rpx 24rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 30rpx;
}

.cs-chip--on {
  border-color: #C41E3A;
  background: #C41E3A;
}

.cs-chip-txt {
  font-size: 24rpx;
  color: #3A2A1E;
}

.cs-chip-txt--on {
  color: #fff;
}
</style>
