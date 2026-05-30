<template>
  <view class="page">
    <view class="section">
      <text class="title">批量发放优惠券</text>
      <view class="form-item"><text class="label">优惠券类型</text><picker :range="couponTypes" @change="form.couponType = couponTypes[$event.detail.value]"><text>{{ form.couponType || '请选择' }}</text></picker></view>
      <view class="form-item"><text class="label">目标用户</text><picker :range="targetTypes" @change="form.target = targetTypes[$event.detail.value]"><text>{{ form.target || '全部用户' }}</text></picker></view>
      <view class="form-item"><text class="label">数量</text><input v-model="form.count" type="number" class="input" placeholder="发放数量" /></view>
      <button class="btn-send" @click="send">确认发放</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const couponTypes = ['满减券', '折扣券', '免邮券']
const targetTypes = ['全部用户', 'VIP用户', '新用户', '指定用户']
const form = ref({ couponType: '', target: '全部用户', count: '' })
function send() { uni.showModal({ title: '确认发放？', content: `将向${form.value.target}发放${form.value.count}张${form.value.couponType}`, success: (r) => { if (r.confirm) uni.showToast({ title: '发放成功' }) } }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 20px 16px; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 16px; }
.form-item { margin-bottom: 14px; }
.label { font-size: 13px; color: #666; display: block; margin-bottom: 6px; }
.input { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; width: 100%; box-sizing: border-box; }
.btn-send { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; margin-top: 12px; }
</style>
