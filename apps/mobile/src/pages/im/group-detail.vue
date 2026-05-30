<template>
  <view class="page">
    <view class="header">
      <image :src="group.avatar || ''" class="g-avatar" mode="aspectFill" />
      <text class="g-name">{{ group.name }}</text>
      <text class="g-count">{{ group.memberCount || 0 }}人</text>
    </view>
    <view class="section"><text class="section-title">群成员</text>
      <view class="members">
        <view v-for="m in members" :key="m.id" class="member">
          <image :src="m.avatar || ''" class="m-avatar" mode="aspectFill" />
          <text class="m-name">{{ m.nickname || m.name }}</text>
        </view>
      </view>
    </view>
    <view class="section">
      <view class="menu-item" @click="editName"><text>群名称</text><text class="menu-val">{{ group.name }}</text></view>
      <view class="menu-item"><text>消息免打扰</text><switch :checked="muted" @change="muted = $event.detail.value" color="#C41E3A" /></view>
    </view>
    <button class="btn-quit" @click="quit">退出群聊</button>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { imApi } from '../../api'
const group = ref<any>({}); const members = ref<any[]>([]); const muted = ref(false)
onMounted(async () => {
  const pages = getCurrentPages(); const opts = (pages[pages.length - 1] as any)?.options || {}
  const groupId = opts.groupId || ''
  try {
    const [g, m]: any = await Promise.all([imApi.getGroupDetail(groupId), imApi.getGroupMembers(groupId)])
    group.value = g || {}; members.value = Array.isArray(m) ? m : m?.data || []
  } catch {}
})
function editName() { uni.showToast({ title: '编辑群名', icon: 'none' }) }
function quit() { uni.showModal({ title: '确认退出？', success: (r) => { if (r.confirm) uni.navigateBack() } }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.header { background: #fff; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 12px; }
.g-avatar { width: 60px; height: 60px; border-radius: 12px; margin-bottom: 8px; }
.g-name { font-size: 16px; font-weight: 600; display: block; }
.g-count { font-size: 12px; color: #999; }
.section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.section-title { font-size: 14px; font-weight: 500; display: block; margin-bottom: 10px; }
.members { display: flex; flex-wrap: wrap; gap: 12px; }
.member { text-align: center; width: 50px; }
.m-avatar { width: 40px; height: 40px; border-radius: 50%; }
.m-name { font-size: 10px; display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
.menu-val { font-size: 13px; color: #999; }
.btn-quit { width: 100%; background: #fff; color: #C41E3A; border: none; border-radius: 12px; padding: 14px; font-size: 15px; margin-top: 20px; }
</style>
