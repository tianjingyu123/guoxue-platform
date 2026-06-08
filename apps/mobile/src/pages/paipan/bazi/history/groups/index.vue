<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">八字排盘</text>
      <text class="v0-route">V0: paipan/bazi/history/groups</text>
    </view>
          <view class="min-h-screen bg-card flex flex-col">
            <!--   -->
            <view class="bg-primary text-white px-4 py-3 flex items-center">
              <view class="v0-btn" 
                @click={() => {
                  setEditingGroup(null)
                  setNewGroupName("")
                }}
                class="p-1 -ml-1"
              >
                <ChevronLeft class="w-6 h-6" />
              </view>
              <text class="flex-1 text-center text-base font-medium pr-6">编辑分组</text>
            </view>
    
            <!--   -->
            <view class="flex-1 p-4">
              <input
                type="text"
                value={{ newGroupName }}
                @change={(e) => setNewGroupName(e.target.value)}
                class="w-full px-4 py-3 bg-gray-50 rounded-xl text-base outline-none focus:ring-2 focus:ring-primary"
                placeholder="分组名称"
              />
            </view>
    
            <!--   -->
            <view class="p-4 flex gap-3">
              <view class="v0-btn"
                @click={{ handleDeleteGroup }}
                class="flex flex-col items-center justify-center px-4 py-2 bg-secondary rounded-2xl text-muted-foreground hover:bg-secondary/80 transition-colors"
              >
                <Trash2 class="w-5 h-5 mb-0.5" />
                <text class="text-xs">删除分组</text>
              </view>
              <view class="v0-btn"
                @click={{ handleSaveEdit }}
                :disabled={{ !newGroupName.trim() }}
                class="flex-1 py-3 bg-primary text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                完成
              </view>
            </view>
          </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据


async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>