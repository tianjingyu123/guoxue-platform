<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">排盘工具</text>
      <text class="v0-route">V0: paipan/yangpan/history/groups</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="sticky top-0 z-20 bg-background border-b border-border">
            <view class="flex items-center justify-between px-4 h-12">
              <Link href="/yangpan/history" class="p-1 -ml-1">
                <ChevronLeft class="w-6 h-6" />
              </Link>
              <text class="text-base font-bold">分组管理</text>
              <view class="v0-btn" 
                @click={() => setShowAddModal(true)}
                class="p-1 -mr-1 text-primary"
              >
                <Plus class="w-5 h-5" />
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 p-3">
            <view class="bg-card rounded-xl border border-border overflow-hidden">
              
    <view v-for="(group, index) in groups" :key="index"> (
                <view 
                  key={group.id}
                  class={`flex items-center justify-between px-4 py-3 ${index !== groups.length - 1 ? "border-b border-border/60" : ""}`}
                >
                  <view class="flex items-center gap-3">
                    <view class={`w-3 h-3 rounded-full ${group.color}`} />
                    {editingGroup === group.id ? (
                      <input
                        type="text"
                        defaultValue={{ group.name }}
                        autoFocus
                        class="text-sm bg-secondary/50 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-primary/30"
                        @blur={(e) => handleRenameGroup(group.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {{ handleRenameGroup(group.id, e.currentTarget.value) } }}
                      />
                    ) : (
                      <text class="text-sm font-medium text-foreground">{{ group.name }}</text>
                    )}
                    <text class="text-xs text-muted-foreground">({{ group.count }})</text>
                  </view>
                  <view class="flex items-center gap-2">
                    <view class="v0-btn" 
                      @click={() => setEditingGroup(group.id)}
                      class="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded transition-colors"
                    >
                      <Pencil class="w-4 h-4" />
                    </view>
                    {group.name !== "未分类" && (
                      <view class="v0-btn" 
                        @click={() => handleDeleteGroup(group.id)}
                        class="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 class="w-4 h-4" />
                      </view>
                    )}
                  </view>
                </view>
              ))}
            </view>
    
            <text class="text-xs text-muted-foreground text-center mt-4">
              删除分组后，该分组下的记录将移动到"未分类"
            </text>
          </view>
    
          <!--   -->
          {showAddModal && (
            <view class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <view class="bg-card w-full max-w-sm rounded-xl animate-scale-in">
                <view class="flex items-center justify-between px-4 py-3 border-b border-border">
                  <text class="font-medium">添加分组</text>
                  <view class="v0-btn" @click={() => setShowAddModal(false)} class="p-1 text-muted-foreground hover:text-foreground">
                    <X class="w-5 h-5" />
                  </view>
                </view>
                <view class="p-4">
                  <input
                    type="text"
                    placeholder="请输入分组名称"
                    value={{ newGroupName }}
                    @change={(e) => setNewGroupName(e.target.value)}
                    autoFocus
                    class="w-full px-3 py-2.5 bg-secondary/50 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </view>
                <view class="p-4 pt-0 flex gap-2">
                  <view class="v0-btn" 
                    @click={() => setShowAddModal(false)}
                    class="flex-1 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    取消
                  </view>
                  <view class="v0-btn" 
                    @click={{ handleAddGroup }}
                    class="flex-1 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                  >
                    确定
                  </view>
                </view>
              </view>
            </view>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const initialGroups = [

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