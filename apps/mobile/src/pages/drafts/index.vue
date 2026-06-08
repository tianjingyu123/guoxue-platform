<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">drafts</text>
      <text class="v0-route">V0: drafts</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">草稿箱</text>
              <view class="w-9" />
            </view>
    
            <!--   -->
            <view class="flex items-center px-4 pb-3 gap-2 overflow-x-auto scrollbar-hide">
              
    <view v-for="(tab, index) in tabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.id }}
                  @click={() => setActiveTab(tab.id)}
                  class={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {{ tab.label }}
                  {tab.id !== "all" && (
                    <text class="ml-1 text-xs opacity-70">
                      ({drafts.filter(d => d.type === tab.id).length})
                    </text>
                  )}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4">
            {filteredDrafts.length > 0 ? (
              <view class="space-y-3">
                
    <view v-for="(draft, index) in filteredDrafts" :key="index"> {
                  const config = typeConfig[draft.type as keyof typeof typeConfig]
                  const Icon = config.icon
                  const isSwiped = swipedId === draft.id
    
                  return (
                    <view 
                      key={draft.id} 
                      class="relative overflow-hidden rounded-xl"
                    >
                      <!--   -->
                      <view 
                        class={cn(
                          "absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center transition-transform duration-200",
                          isSwiped ? "translate-x-0" : "translate-x-full"
                        )}
                      >
                        <view class="v0-btn"
                          @click={() => setShowDeleteConfirm(draft.id)}
                          class="flex flex-col items-center gap-1 text-destructive-foreground"
                        >
                          <Trash2 class="w-5 h-5" />
                          <text class="text-xs">删除</text>
                        </view>
                      </view>
    
                      <!--   -->
                      <Card 
                        class={cn(
                          "relative bg-card transition-transform duration-200 cursor-pointer",
                          isSwiped ? "-translate-x-20" : "translate-x-0"
                        )}
                        @click={() => {
                          if (isSwiped) {
                            setSwipedId(null)
                           }}
                        onTouchStart={(e) => {
                          const touch = e.touches[0]
                          const startX = touch.clientX
                          const handleTouchMove = (moveEvent: TouchEvent) => {
                            const moveTouch = moveEvent.touches[0]
                            const diff = startX - moveTouch.clientX
                            if (diff > 50) {
                              setSwipedId(draft.id)
                            } else if (diff < -50) {{ setSwipedId(null) }}
                          }
                          const handleTouchEnd = () => {
                            document.removeEventListener("touchmove", handleTouchMove)
                            document.removeEventListener("touchend", handleTouchEnd)
                          }
                          document.addEventListener("touchmove", handleTouchMove)
                          document.addEventListener("touchend", handleTouchEnd)
                        }}
                      >
                        <Link href={`${config.editPath}&draft=${{ draft.id }}`}>
                          <view class="p-4">
                            <view class="flex items-start gap-3">
                              <!--   -->
                              {draft.type === "video" ? (
                                <view class="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 relative">
                                  <Video class="w-6 h-6 text-muted-foreground" />
                                  <Badge class={cn("absolute -top-1 -right-1 text-[10px] px-1.5 py-0", config.color, "text-white border-0")}>
                                    视频
                                  </Badge>
                                </view>
                              ) : (
                                <view class={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.color)}>
                                  <Icon class="w-5 h-5 text-white" />
                                </view>
                              )}
    
                              <!--   -->
                              <view class="flex-1 min-w-0">
                                <view class="flex items-center gap-2 mb-1">
                                  <text class="font-medium text-sm text-foreground line-clamp-1">
                                    {draft.title || "无标题草稿"}
                                  </text>
                                  {draft.type !== "video" && (
                                    <Badge variant="outline" class="text-[10px] px-1.5 py-0 border-border text-muted-foreground flex-shrink-0">
                                      {{ config.label }}
                                    </Badge>
                                  )}
                                </view>
                                <text class="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {{ draft.content }}
                                </text>
                                <view class="flex items-center justify-between">
                                  <text class="text-[10px] text-muted-foreground/70">
                                    {{ draft.circle }}
                                  </text>
                                  <text class="text-[10px] text-muted-foreground/70">
                                    {{ formatTime(draft.savedAt) }}
                                  </text>
                                </view>
                              </view>
    
                              <!--   -->
                              <Edit3 class="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                            </view>
                          </view>
                        </Link>
                      </Card>
                    </view>
                  )
                })}
              </view>
            ) : (
              /* 空状态 */
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <FileText class="w-10 h-10 text-muted-foreground/40" />
                </view>
                <text class="text-muted-foreground text-sm mb-1">暂无草稿</text>
                <text class="text-muted-foreground/70 text-xs mb-4">发布内容时可保存为草稿</text>
                <Link
                  href="/publish"
                  class="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                >
                  去发布内容
                </Link>
              </view>
            )}
          </view>
    
          <!--   -->
          {showDeleteConfirm !== null && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <view class="w-[80%] max-w-sm bg-card rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <view class="p-6 text-center">
                  <view class="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <Trash2 class="w-6 h-6 text-destructive" />
                  </view>
                  <text class="font-semibold text-base text-foreground mb-2">确认删除草稿？</text>
                  <text class="text-sm text-muted-foreground">删除后无法恢复，请确认是否继续</text>
                </view>
                <view class="flex border-t border-border">
                  <view class="v0-btn"
                    @click={() => {
                      setShowDeleteConfirm(null)
                      setSwipedId(null)
                    }}
                    class="flex-1 py-3.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors border-r border-border"
                  >
                    取消
                  </view>
                  <view class="v0-btn"
                    @click={() => handleDelete(showDeleteConfirm)}
                    class="flex-1 py-3.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    删除
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
const draftsData = [
const typeConfig = {
const tabs = [
  const filteredDrafts = activeTab === "all" 

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