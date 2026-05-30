<template>
  <view class="page">
    <view class="section">
      <text class="title">隐私授权管理</text>
      <view class="perm" v-for="p in perms" :key="p.key">
        <view class="perm-info"><text class="perm-name">{{ p.name }}</text><text class="perm-desc">{{ p.desc }}</text></view>
        <switch :checked="p.enabled" @change="togglePerm(p, $event)" color="#C41E3A" />
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const perms = ref([
  { key: 'location', name: '位置信息', desc: '用于同城功能', enabled: true },
  { key: 'camera', name: '相机', desc: '用于拍照上传', enabled: true },
  { key: 'album', name: '相册', desc: '用于选择图片', enabled: true },
  { key: 'notification', name: '通知推送', desc: '接收消息提醒', enabled: false },
  { key: 'contacts', name: '通讯录', desc: '用于邀请好友', enabled: false },
])
function togglePerm(p: any, e: any) { p.enabled = e.detail.value }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 16px; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 12px; }
.perm { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #f5f5f5; }
.perm:last-child { border-bottom: none; }
.perm-name { font-size: 14px; display: block; }
.perm-desc { font-size: 11px; color: #999; display: block; margin-top: 2px; }
</style>
