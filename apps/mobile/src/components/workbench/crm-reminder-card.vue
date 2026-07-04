<template>
  <!-- 客户提醒待办卡（课-P3 服务环）：自包含拉取；失败或为空整体不渲染，绝不打扰工作台主流程 -->
  <view v-if="items.length" class="crc-card">
    <view class="crc-head" @tap="goCrm">
      <text class="crc-title">客户待跟进</text>
      <view class="crc-count"><text class="crc-count-txt">{{ items.length }}</text></view>
      <text class="crc-more">客户经营 ›</text>
    </view>

    <view v-for="r in items.slice(0, 3)" :key="r.id" class="crc-item">
      <view class="crc-item-main">
        <view class="crc-kind" :class="r.kind.toLowerCase()"><text class="crc-kind-txt">{{ r.kindLabel }}</text></view>
        <text class="crc-name">{{ r.clientName }}</text>
        <text class="crc-due">{{ fmtDate(r.dueAt) }}</text>
      </view>
      <view class="crc-actions">
        <view class="crc-btn primary" :class="{ disabled: submittingId === r.id }" @tap="onDraft(r)">
          <text class="crc-btn-txt primary">{{ r.aiDraft ? '复制话术' : 'AI话术' }}</text>
        </view>
        <view class="crc-btn" :class="{ disabled: submittingId === r.id }" @tap="onDone(r)">
          <text class="crc-btn-txt">完成</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { navigateTo } from '@/utils/router'
import { crmApi, type CrmReminder } from '@/lib/crm-data'

const items = ref<CrmReminder[]>([])
/** 正在提交写操作的提醒 id（防重复提交） */
const submittingId = ref('')

onMounted(async () => {
  try {
    const res = await crmApi.reminders('PENDING')
    items.value = res.items
  } catch {
    items.value = [] // 拉取失败：组件整体不渲染
  }
})

function goCrm() {
  navigateTo('/pkg-mine/crm/index')
}

/** 无草稿先 AI 生成（后端便宜档·失败降级模板），有草稿直接复制 */
async function onDraft(r: CrmReminder) {
  if (submittingId.value) return
  if (r.aiDraft) {
    uni.setClipboardData({ data: r.aiDraft, success: () => uni.showToast({ title: '话术已复制', icon: 'success' }) })
    return
  }
  submittingId.value = r.id
  try {
    const res = await crmApi.draftReminder(r.id)
    r.aiDraft = res.aiDraft
    uni.setClipboardData({ data: res.aiDraft, success: () => uni.showToast({ title: '话术已生成并复制', icon: 'success' }) })
  } catch {
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  } finally {
    submittingId.value = ''
  }
}

async function onDone(r: CrmReminder) {
  if (submittingId.value) return
  submittingId.value = r.id
  try {
    await crmApi.completeReminder(r.id)
    items.value = items.value.filter((it) => it.id !== r.id)
  } catch {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    submittingId.value = ''
  }
}

function fmtDate(s: string) {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<style scoped lang="scss">
.crc-card {
  margin: 0 24rpx 24rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: #ffffff;
}

.crc-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.crc-title { font-size: 30rpx; font-weight: 700; color: #1a1a1a; }
.crc-count { min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 999rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.crc-count-txt { font-size: 20rpx; font-weight: 600; color: #fff; }
.crc-more { margin-left: auto; font-size: 24rpx; color: #999; }

.crc-item { margin-top: 20rpx; padding: 20rpx; border-radius: 16rpx; background: #fafafa; }
.crc-item-main { display: flex; align-items: center; gap: 12rpx; }
.crc-kind { padding: 2rpx 14rpx; border-radius: 8rpx; background: #ffedd5;
  &.birthday { background: #fee2e2; }
  &.lichun { background: #dcfce7; }
  &.repurchase { background: #dbeafe; }
}
.crc-kind-txt { font-size: 20rpx; font-weight: 600; color: #9a3412; }
.crc-name { font-size: 26rpx; font-weight: 600; color: #333; }
.crc-due { margin-left: auto; font-size: 22rpx; color: #999; }

.crc-actions { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
.crc-btn { padding: 8rpx 28rpx; border-radius: 999rpx; border: 1rpx solid #e5e5e5; background: #fff;
  &.primary { border-color: #c41e3a; background: #c41e3a; }
  &.disabled { opacity: 0.5; }
}
.crc-btn-txt { font-size: 24rpx; color: #666;
  &.primary { font-weight: 600; color: #fff; }
}
</style>
