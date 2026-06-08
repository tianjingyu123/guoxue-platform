<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">收藏</text>
      <text class="v0-route">V0: favorites</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">我的收藏</text>
              <view class="v0-btn" 
                @click={() => {
                  setIsEditMode(!isEditMode)
                  setSelectedIds([])
                }}
                class="text-sm text-primary"
              >
                {isEditMode ? "完成" : "管理"}
              </view>
            </view>
    
            <!--   -->
            <view class="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-2">
              
    <view v-for="(tab, index) in tabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.id }}
                  @click={() => setActiveTab(tab.id)}
                  class={cn(
                    "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {{ tab.name }}
                  <text class="ml-1 opacity-70">{{ tab.count }}</text>
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="flex justify-center py-2">
            <view class="v0-btn"
              @click={{ handleRefresh }}
              :disabled={{ isRefreshing }}
              class="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw class={cn("w-3 h-3", isRefreshing && "animate-spin")} />
              {isRefreshing ? '刷新中...' : '下拉刷新'}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 space-y-3">
            {isLoading ? (
              // 骨架屏
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={{ i }} class="flex gap-3 p-3">
                  <view class="w-16 h-16 rounded-lg bg-secondary animate-pulse flex-shrink-0" />
                  <view class="flex-1 space-y-2">
                    <view class="h-4 w-20 bg-secondary rounded animate-pulse" />
                    <view class="h-4 w-full bg-secondary rounded animate-pulse" />
                    <view class="h-3 w-2/3 bg-secondary rounded animate-pulse" />
                  </view>
                </Card>
              ))
            ) : favorites.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-20">
                <Heart class="w-16 h-16 text-muted-foreground/30 mb-4" />
                <text class="text-muted-foreground mb-4">暂无收藏内容</text>
                <Link href="/discover" class="px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm">
                  去发现
                </Link>
              </view>
            ) : (
              
                
    <view v-for="(item, index) in favorites" :key="index"> {
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
    
                      <Link href={{ getFavoriteLink(item) }} class="flex-1">
                        <Card class={cn(
                          "flex gap-3 p-3 hover:bg-secondary/50 transition-colors",
                          item.isInvalid && "opacity-60"
                        )}>
                          <!--   -->
                          <view class="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                            {{ item.cover ? (
                              <image src={item.cover }} alt={{ item.title }} class="w-full h-full object-cover" />
                            ) : (
                              <view class="w-full h-full flex items-center justify-center">
                                <Icon class="w-6 h-6 text-muted-foreground/60" />
                              </view>
                            )}
                          </view>
    
                          <!--   -->
                          <view class="flex-1 min-w-0">
                            <view class="flex items-center gap-2 mb-1">
                              <Badge class={cn("text-[10px] px-1.5 py-0", getFavoriteTypeColor(item.type))}>
                                {{ getFavoriteTypeName(item.type) }}
                              </Badge>
                              {item.isInvalid && (
                                <Badge variant="secondary" class="text-[10px] px-1.5 py-0">
                                  已失效
                                </Badge>
                              )}
                              <text class="text-[10px] text-muted-foreground">
                                {item.collectedAt.split(' ')[0]}
                              </text>
                            </view>
                            <text class="font-medium text-sm text-foreground line-clamp-1">{{ item.title }}</text>
                            <text class="text-xs text-muted-foreground mt-0.5 line-clamp-1">{{ item.subtitle }}</text>
                            <view class="flex items-center justify-between mt-1">
                              {item.price > 0 ? (
                                <view class="flex items-center gap-2">
                                  <text class="text-sm font-bold text-primary">¥{{ item.price }}</text>
                                  {item.originalPrice && item.originalPrice > item.price && (
                                    <text class="text-xs text-muted-foreground line-through">
                                      ¥{{ item.originalPrice }}
                                    </text>
                                  )}
                                </view>
                              ) : (
                                <text class="text-xs text-green-600">免费</text>
                              )}
                            </view>
                          </view>
                        </Card>
                      </Link>
    
                      <!--   -->
                      {!isEditMode && (
                        <view class="v0-btn"
                          @click={() => handleRemove(item.id)}
                          class="p-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 class="w-4 h-4" />
                        </view>
                      )}
                    </view>
                  )
                })}
    
                <!--   -->
                {hasMore && (
                  <view class="v0-btn"
                    @click={() => loadFavorites()}
                    class="w-full py-3 text-sm text-muted-foreground hover:text-foreground"
                  >
                    加载更多
                  </view>
                )}
              
            )}
          </view>
    
          <!--   -->
          {isEditMode && selectedIds.length > 0 && (
            <view class="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
              <view class="flex items-center justify-between">
                <view class="v0-btn" 
                  @click={{ handleSelectAll }}
                  class="text-sm text-primary"
                >
                  {selectedIds.length === favorites.length ? '取消全选' : '全选'}
                </view>
                <view class="v0-btn"
                  @click={{ handleBatchRemove }}
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
const typeIcons: Record<FavoriteType, React.ComponentType<{ className?: string }>> = {

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