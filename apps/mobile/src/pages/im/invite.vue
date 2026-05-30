<template>
  <view class="page">
    <view class="search-wrap"><input v-model="keyword" placeholder="搜索好友" class="search-input" /></view>
    <view class="list">
      <view v-for="u in filtered" :key="u.id" class="user-item">
        <image :src="u.avatar || ''" class="avatar" mode="aspectFill" />
        <text class="name">{{ u.nickname || u.name }}</text>
        <button class="btn-invite" :class="{ invited: u.invited }" @click="invite(u)">{{ u.invited ? '已邀请' : '邀请' }}</button>
      </view>
    </view>
    <button v-if="selected.length" class="btn-confirm" @click="confirm">确认邀请 ({{ selected.length }})</button>
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { imApi } from '../../api'
const keyword = ref(''); const friends = ref<any[]>([]); const selected = ref<string[]>([])
const filtered = computed(() => keyword.value ? friends.value.filter(u => (u.nickname || u.name || '').includes(keyword.value)) : friends.value)
onMounted(async () => {
  try { const res: any = await imApi.getFriendList(); friends.value = (Array.isArray(res) ? res : res?.data || []).map((f: any) => ({ ...f, invited: false })) } catch {}
})
function invite(u: any) { u.invited = !u.invited; selected.value = friends.value.filter(f => f.invited).map(f => f.id) }
function confirm() { uni.showToast({ title: '邀请已发送' }); setTimeout(() => uni.navigateBack(), 1500) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.search-wrap { padding: 10px 16px; background: #fff; }
.search-input { background: #f5f5f5; border-radius: 20px; padding: 8px 14px; font-size: 14px; }
.list { background: #fff; margin-top: 1px; }
.user-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; }
.avatar { width: 38px; height: 38px; border-radius: 50%; }
.name { flex: 1; font-size: 14px; }
.btn-invite { padding: 4px 14px; border-radius: 14px; font-size: 12px; background: #C41E3A; color: #fff; border: none; line-height: 26px; }
.btn-invite.invited { background: #eee; color: #999; }
.btn-confirm { position: fixed; bottom: 20px; left: 16px; right: 16px; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 14px; font-size: 15px; }
</style>
