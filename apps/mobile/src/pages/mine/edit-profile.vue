<template>
  <view class="page">
    <view class="form">
      <view class="avatar-row" @click="changeAvatar">
        <text class="label">头像</text>
        <image :src="avatar || ''" class="avatar" mode="aspectFill" />
      </view>
      <view class="row"><text class="label">昵称</text><input v-model="nickname" class="input" /></view>
      <view class="row"><text class="label">简介</text><textarea v-model="bio" class="textarea" /></view>
      <view class="row"><text class="label">性别</text><view class="gender"><text :class="{ active: gender === 'M' }" @click="gender = 'M'">男</text><text :class="{ active: gender === 'F' }" @click="gender = 'F'">女</text></view></view>
      <button class="btn" @click="save">保存</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { authApi, uploadApi } from '../../api'
const avatar = ref('')
const nickname = ref('')
const bio = ref('')
const gender = ref('M')
async function changeAvatar() { uni.showToast({ title: '选择头像', icon: 'none' }) }
async function save() { try { await authApi.updateProfile({ nickname: nickname.value, bio: bio.value, gender: gender.value }); uni.showToast({ title: '已保存', icon: 'success' }) } catch {} }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.form { background: #fff; border-radius: 12px; padding: 16px; }
.avatar-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #f5f5f5; }
.avatar { width: 64px; height: 64px; border-radius: 50%; background: #eee; }
.label { font-size: 14px; color: #666; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #f5f5f5; }
.input { flex: 1; text-align: right; font-size: 14px; padding: 4px 0; }
.textarea { flex: 1; text-align: right; font-size: 14px; min-height: 60px; padding: 4px 0; }
.gender { display: flex; gap: 12px; }
.gender text { padding: 4px 16px; border-radius: 14px; background: #F5F0E8; font-size: 13px; }
.gender text.active { background: #C41E3A; color: #fff; }
.btn { width: 100%; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; margin-top: 20px; text-align: center; line-height: 44px; }
</style>
