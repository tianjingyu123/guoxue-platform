<template>
  <view class="page">
    <view class="section">
      <text class="title">个人数据导出</text>
      <text class="desc">您可以导出您在平台上的所有个人数据，包括个人信息、学习记录、评论内容等。</text>
      <view class="options">
        <view class="opt" v-for="o in options" :key="o.key" @click="o.checked = !o.checked">
          <text>{{ o.label }}</text>
          <text :class="o.checked ? 'checked' : 'unchecked'">{{ o.checked ? '✓' : '' }}</text>
        </view>
      </view>
      <button class="btn-export" @click="doExport">申请导出</button>
      <text class="note">数据将在24小时内准备完毕，届时通过消息通知您下载。</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const options = ref([
  { key: 'profile', label: '个人信息', checked: true },
  { key: 'learning', label: '学习记录', checked: true },
  { key: 'comments', label: '评论内容', checked: true },
  { key: 'orders', label: '订单信息', checked: false },
  { key: 'collections', label: '收藏内容', checked: false },
])
function doExport() { uni.showToast({ title: '导出申请已提交', icon: 'none' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 20px 16px; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 8px; }
.desc { font-size: 13px; color: #666; line-height: 1.6; display: block; margin-bottom: 16px; }
.opt { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
.checked { color: #C41E3A; font-weight: bold; }
.btn-export { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; margin-top: 16px; }
.note { font-size: 11px; color: #999; display: block; margin-top: 10px; text-align: center; }
</style>
