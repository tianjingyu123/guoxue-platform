<template>
  <view class="page">
    <view class="balance-card"><text class="b-label">可提现余额</text><text class="b-amount">¥{{ balance }}</text></view>
    <view class="form">
      <text class="f-label">提现金额</text>
      <input v-model="amount" type="digit" placeholder="请输入提现金额" class="input" />
      <text class="fee">手续费 ¥{{ fee }}</text>
      <text class="f-label">到账账户</text>
      <view class="account" @click="selectCard">{{ selectedCard || '选择银行卡' }} ▸</view>
      <button class="btn" @click="submit">确认提现</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { commissionApi } from '../../api'

const balance = ref('0.00')
const amount = ref('')
const selectedCard = ref('')
const fee = computed(() => (parseFloat(amount.value || '0') * 0.01).toFixed(2))

function selectCard() { uni.showToast({ title: '选择银行卡', icon: 'none' }) }
async function submit() {
  if (!amount.value || parseFloat(amount.value) <= 0) { uni.showToast({ title: '请输入金额', icon: 'none' }); return }
  try { await commissionApi.applyWithdrawal({ amount: parseFloat(amount.value) }); uni.showToast({ title: '提现申请已提交', icon: 'success' }) } catch {}
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.balance-card { background: linear-gradient(135deg, #C41E3A, #8B0000); border-radius: 12px; padding: 20px; color: #fff; text-align: center; margin-bottom: 12px; }
.b-label { font-size: 13px; opacity: 0.8; }
.b-amount { font-size: 36px; font-weight: bold; display: block; margin-top: 4px; }
.form { background: #fff; border-radius: 12px; padding: 16px; }
.f-label { font-size: 14px; color: #666; display: block; margin-bottom: 6px; margin-top: 12px; }
.input { border: 1px solid #ddd; border-radius: 10px; padding: 12px; font-size: 16px; background: #F5F0E8; }
.fee { font-size: 12px; color: #999; display: block; margin-top: 4px; }
.account { border: 1px solid #ddd; border-radius: 10px; padding: 12px; font-size: 14px; background: #F5F0E8; color: #666; }
.btn { width: 100%; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 16px; border: none; margin-top: 20px; text-align: center; line-height: 44px; }
</style>
