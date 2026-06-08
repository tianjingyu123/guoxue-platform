<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">history</text>
      <text class="v0-route">V0: history</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">浏览历史</text>
              <view class="flex items-center gap-2">
                {!isEditMode && history.length > 0 && (
                  <view class="v0-btn" @click={{ handleClearAll }} class="text-sm text-muted-foreground">
                    清空
                  </view>
                )}
                {history.length > 0 && (
                  <view class="v0-btn" 
                    @click={() => {
                      setIsEditMode(!isEditMode)
                      setSelectedIds([])
                    }}
                    class="text-sm text-primary"
                  >
                    {isEditMode ? "完成" : "管理"}
                  </view>
                )}
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="p-4">
            <DataState
              isLoading={{ loading }}
              isError={{ !!error }}
              isEmpty={{ history.length === 0 }}
              errorMessage={{ error || undefined }}
              emptyMessage="暂无浏览历史"
              onRetry={{ fetchData }}
            >
              
    <view v-for="(group, groupIndex) in history" :key="groupIndex"> (
                <view key={groupIndex} class="mb-6">
                  <text class="text-sm font-medium text-muted-foreground mb-3">{{ group.date }}</text>
                  <view class="space-y-2">
                    {group.items.map(item => {
                      const Icon = typeIcons[item.type]
                      return (
                        <view key={item.id} class="flex items-center gap-3">
                          <!--   -->
                          {isEditMode && (
                            <view class="v0-btn"
                              @click={() => toggleSelect(item.id)}
                              class={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                selectedIds.includes(item.id)
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground/30"
                              )}
                            >
                              {selectedIds.includes(item.id) && <Check class="w-4 h-4 text-primary-foreground" />}
                            </view>
                          )}
    
                          <Link href={{ getTypeUrl(item.type, item.id) }} class="flex-1">
                            <Card class="flex gap-3 p-3 hover:bg-secondary/50 transition-colors">
                              <!--   -->
                              <view class="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                <Icon class="w-5 h-5 text-muted-foreground/60" />
                              </view>
    
                              <!--   -->
                              <view class="flex-1 min-w-0">
                                <view class="flex items-center gap-2 mb-0.5">
                                  <Badge class={cn("text-[10px] px-1.5 py-0", typeColors[item.type])}>
                                    {{ typeLabels[item.type] }}
                                  </Badge>
                                  <text class="text-[10px] text-muted-foreground">{{ item.time }}</text>
                                </view>
                                <text class="font-medium text-sm text-foreground line-clamp-1">{{ item.title }}</text>
                                <text class="text-xs text-muted-foreground mt-0.5">{{ item.subtitle }}</text>
                                
                                <!--   -->
                                {item.type === "course" && item.progress !== undefined && (
                                  <view class="mt-2">
                                    <view class="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                      <text>学习进度</text>
                                      <text>{{ item.progress }}%</text>
                                    </view>
                                    <view class="h-1.5 bg-secondary rounded-full overflow-hidden">
                                      <view 
                                        class="h-full bg-primary rounded-full transition-all"
                                        :style=" width: `${{ item.progress }}%` }}
                                      />
                                    </view>
                                  </view>
                                )}
                              </view>
                            </Card>
                          </Link>
                        </view>
                      )
                    })}
                  </view>
                </view>
              ))}
            </DataState>
          </view>
    
          <!--   -->
          {isEditMode && selectedIds.length > 0 && (
            <view class="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
              <view class="flex items-center justify-between">
                <view class="v0-btn" 
                  @click={() => setSelectedIds(allItems.map(i => i.id))}
                  class="text-sm text-primary"
                >
                  全选
                </view>
                <view class="v0-btn"
                  @click={{ handleDelete }}
                  class="flex items-center gap-2 px-6 py-2 bg-destructive text-destructive-foreground rounded-full text-sm"
                >
                  <Trash2 class="w-4 h-4" />
                  删除 ({{ selectedIds.length }})
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
const typeIcons: Record<HistoryItemType, React.ComponentType<{ className?: string }>> = {
const typeLabels: Record<HistoryItemType, string> = {
const typeColors: Record<HistoryItemType, string> = {

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