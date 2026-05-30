<template>
  <view class="page">
    <view class="header">
      <text class="title">发起提问</text>
      <text class="subtitle" v-if="circleName">{{ circleName }}</text>
    </view>

    <view class="form">
      <view class="form-item">
        <text class="form-label">圈子</text>
        <text class="form-value">{{ circleName || '请从圈子进入' }}</text>
      </view>

      <view class="form-item">
        <text class="form-label">向谁提问</text>
        <picker :range="memberNames" @change="onPickMember">
          <text class="picker-text">{{ selectedName || '请选择嘉宾' }}</text>
        </picker>
      </view>

      <view class="form-item">
        <text class="form-label">问题内容</text>
        <textarea v-model="question" placeholder="请输入你的问题（最多500字）" maxlength="500" class="textarea" />
        <text class="char-count">{{ question.length }}/500</text>
      </view>

      <view class="form-item">
        <text class="form-label">提问金额（虚拟币）</text>
        <view class="price-options">
          <text v-for="p in priceOptions" :key="p" :class="['price-tag', { active: priceCoin === p }]" @click="priceCoin = p">{{ p }}币</text>
        </view>
        <input v-model.number="priceCoin" type="number" placeholder="自定义金额" class="custom-input" />
      </view>

      <view class="form-item">
        <text class="form-label">围观价格（可选，0=不可围观）</text>
        <input v-model.number="peekPriceCoin" type="number" placeholder="默认为0" class="custom-input" />
        <text class="form-hint">其他人支付此金额后可围观答案</text>
      </view>

      <button class="submit-btn" @click="submit" :loading="submitting" :disabled="!canSubmit">提交提问</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { questionApi, circleApi } from '../../api'
import { useCoinStore } from '../../store/coinStore'

const circleId = ref('')
const circleName = ref('')
const answererId = ref('')
const selectedName = ref('')
const question = ref('')
const priceCoin = ref(50)
const peekPriceCoin = ref(0)
const submitting = ref(false)
const members = ref<any[]>([])

const priceOptions = [10, 30, 50, 100, 200]

const memberNames = computed(() => members.value.map((m: any) => m.user?.nickname || m.userId || ''))

const canSubmit = computed(() => {
  return circleId.value && answererId.value && question.value.trim() && priceCoin.value >= 10
})

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  circleId.value = opts.circleId || ''
  circleName.value = decodeURIComponent(opts.circleName || '')

  if (circleId.value) {
    try {
      const detail: any = await circleApi.detail(circleId.value)
      members.value = detail?.members || []
    } catch { /* */ }
  }
})

function onPickMember(e: any) {
  const idx = e.detail.value
  const m = members.value[idx]
  if (m) {
    answererId.value = m.userId
    selectedName.value = m.user?.nickname || m.userId
  }
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const text = question.value.trim()
    await questionApi.ask({
      circleId: circleId.value,
      answererId: answererId.value,
      questionTitle: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
      question: text,
      priceCoin: priceCoin.value,
      peekPriceCoin: peekPriceCoin.value || 0,
    })
    uni.showToast({ title: '提问成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (e: any) {
    uni.showToast({ title: e.errMsg || '提问失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }
.header { margin-bottom: 16px; }
.title { font-size: 20px; font-weight: bold; color: #C41E3A; }
.subtitle { font-size: 13px; color: #999; margin-left: 8px; }
.form { background: #fff; border-radius: 10px; padding: 16px; }
.form-item { margin-bottom: 18px; }
.form-label { font-size: 14px; font-weight: bold; color: #333; display: block; margin-bottom: 8px; }
.form-value { font-size: 14px; color: #666; }
.form-hint { font-size: 11px; color: #bbb; display: block; margin-top: 4px; }
.picker-text { font-size: 14px; color: #C41E3A; padding: 8px 12px; background: #F5F0E8; border-radius: 6px; display: block; }
.textarea { width: 100%; min-height: 100px; padding: 10px; border: 1px solid #E8E0D5; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.char-count { font-size: 11px; color: #bbb; text-align: right; display: block; margin-top: 4px; }
.price-options { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.price-tag { padding: 6px 14px; border-radius: 16px; font-size: 13px; background: #F5F0E8; color: #666; }
.price-tag.active { background: #C41E3A; color: #fff; }
.custom-input { width: 100%; padding: 8px 10px; border: 1px solid #E8E0D5; border-radius: 6px; font-size: 14px; box-sizing: border-box; margin-top: 6px; }
.submit-btn { width: 100%; background: #C41E3A; color: #fff; border-radius: 24px; padding: 12px; font-size: 16px; border: none; margin-top: 8px; }
.submit-btn[disabled] { background: #ccc; }
</style>
