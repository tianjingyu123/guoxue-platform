<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">submissions</text>
      <text class="v0-route">V0: submissions</text>
    </view>
        <view class="min-h-screen bg-background max-w-lg mx-auto">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
      <view class="flex items-center justify-between px-4 h-14">
      <BackButton fallbackPath="/profile" />
      <text class="font-semibold text-base text-foreground">我的投稿</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="sticky top-14 z-30 bg-background border-b border-border">
            <view class="flex items-center px-4 py-2 gap-2 overflow-x-auto scrollbar-hide">
              
    <view v-for="(tab, index) in filterTabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.id }}
                  @click={() => setActiveFilter(tab.id)}
                  class={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeFilter === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {{ tab.label }}
                  <text class={cn(
                    "text-xs",
                    activeFilter === tab.id ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {{ getCount(tab.id) }}
                  </text>
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-3">
            {filteredSubmissions.length > 0 ? (
              filteredSubmissions.map(submission => {
                const config = statusConfig[submission.status]
                const StatusIcon = config.icon
                
                return (
                  <Card key={submission.id} class="overflow-hidden">
                    <view class="flex gap-3 p-3">
                      <!--   -->
                      <view class="w-20 h-20 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center">
                        <FileText class="w-8 h-8 text-muted-foreground/40" />
                      </view>
                      
                      <!--   -->
                      <view class="flex-1 min-w-0">
                        <text class="font-medium text-sm text-foreground line-clamp-2 leading-snug">
                          {{ submission.title }}
                        </text>
                        
                        <view class="flex items-center gap-2 mt-1.5">
                          <Badge 
                            variant="outline" 
                            class={cn("text-[10px] px-1.5 py-0 gap-1", config.color)}
                          >
                            <StatusIcon class="w-3 h-3" />
                            {{ config.label }}
                          </Badge>
                          <text class="text-[10px] text-muted-foreground">
                            {{ submission.submitTime }}
                          </text>
                        </view>
                        
                        <!--   -->
                        {submission.status === "approved" && (
                          <view class="flex items-center gap-3 mt-1.5">
                            <text class="text-[10px] text-green-500">{{ config.description }}</text>
                            {submission.views && (
                              <text class="text-[10px] text-muted-foreground">
                                {{ submission.views }}阅读 · {{ submission.likes }}点赞
                              </text>
                            )}
                          </view>
                        )}
                        
                        {submission.status === "pending" && (
                          <text class="text-[10px] text-amber-500 mt-1.5">{{ config.description }}</text>
                        )}
                        
                        {submission.status === "rejected" && submission.reason && (
                          <text class="text-[10px] text-red-500 mt-1.5 line-clamp-2">
                            原因：{{ submission.reason }}
                          </text>
                        )}
                      </view>
                    </view>
                    
                    <!--   -->
                    {submission.status === "rejected" && (
                      <view class="px-3 pb-3">
                        <Link 
                          href={`/publish?draft=${submission.id}`}
                          class="flex items-center justify-center gap-1.5 w-full py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium text-foreground transition-colors"
                        >
                          <Edit3 class="w-4 h-4" />
                          重新编辑
                        </Link>
                      </view>
                    )}
                    
                    <!--   -->
                    {submission.status === "approved" && (
                      <Link 
                        href={`/article/${submission.id}`}
                        class="flex items-center justify-between px-3 py-2 border-t border-border hover:bg-secondary/50 transition-colors"
                      >
                        <text class="text-xs text-muted-foreground">查看文章</text>
                        <ChevronRight class="w-4 h-4 text-muted-foreground" />
                      </Link>
                    )}
                  </Card>
                )
              })
            ) : (
              /* 空状态 */
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <FileText class="w-10 h-10 text-muted-foreground/40" />
                </view>
                <text class="text-muted-foreground text-sm mb-2">暂无投稿记录</text>
                <text class="text-muted-foreground/70 text-xs text-center px-8 mb-6">
                  优质文章可推送至首页获取更多曝光，去试试吧
                </text>
                <Link
                  href="/publish"
                  class="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                >
                  去发布文章
                </Link>
              </view>
            )}
          </view>
    
          <!--   -->
          {filteredSubmissions.length > 0 && (
            <view class="px-4 pb-8">
              <Card class="p-4 bg-secondary/30">
                <text class="text-sm font-medium text-foreground mb-2">投稿说明</text>
                <view class="space-y-1.5 text-xs text-muted-foreground">
                  <view class="flex items-start gap-2">
                    <text class="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                    文章审核一般在1-3个工作日内完成
                  </view>
                  <view class="flex items-start gap-2">
                    <text class="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                    审核通过的文章将推荐至首页，获得更多曝光
                  </view>
                  <view class="flex items-start gap-2">
                    <text class="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                    未通过的文章可根据建议修改后重新提交
                  </view>
                  <view class="flex items-start gap-2">
                    <text class="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                    原创优质内容更容易获得推荐
                  </view>
                </view>
              </Card>
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
const submissionsData = [
const statusConfig = {
const filterTabs = [

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