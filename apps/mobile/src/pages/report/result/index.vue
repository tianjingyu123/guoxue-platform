<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">数据报告</text>
      <text class="v0-route">V0: report/result</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b">
            <view class="flex items-center h-14 px-4">
              <Button variant="ghost" size="icon" @click={() => router.back()}>
                <ArrowLeft class="w-5 h-5" />
              </Button>
              <text class="flex-1 text-center font-medium">举报处理结果</text>
              <view class="w-10" />
            </view>
          </view>
    
          <!--   -->
          {stats && (
            <view class="p-4 bg-muted/30">
              <view class="grid grid-cols-4 gap-2 text-center">
                <view class="bg-background rounded-lg p-3">
                  <view class="text-lg font-bold">{{ stats.total }}</view>
                  <view class="text-xs text-muted-foreground">总举报</view>
                </view>
                <view class="bg-background rounded-lg p-3">
                  <view class="text-lg font-bold text-amber-600">{{ stats.pending + stats.processing }}</view>
                  <view class="text-xs text-muted-foreground">处理中</view>
                </view>
                <view class="bg-background rounded-lg p-3">
                  <view class="text-lg font-bold text-green-600">{{ stats.resolved }}</view>
                  <view class="text-xs text-muted-foreground">已处理</view>
                </view>
                <view class="bg-background rounded-lg p-3">
                  <view class="text-lg font-bold text-red-600">{{ stats.rejected }}</view>
                  <view class="text-xs text-muted-foreground">已驳回</view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          <view class="flex items-center gap-2 px-4 py-3 overflow-x-auto border-b">
            <Filter class="w-4 h-4 text-muted-foreground shrink-0" />
            
    <view v-for="(filter, index) in statusFilters" :key="index"> (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                class="shrink-0"
                @click={() => setStatusFilter(filter.value)}
              >
                {{ filter.label }}
              </Button>
            ))}
          </view>
    
          <!--   -->
          <DataState
            loading={{ loading }}
            empty={{ records.length === 0 }}
            emptyMessage="暂无举报记录"
          >
            <view class="divide-y">
              
    <view v-for="(record, index) in records" :key="index"> (
                <view
                  key={record.id}
                  class="p-4 bg-background active:bg-muted/50 cursor-pointer"
                  @click={() => handleViewDetail(record)}
                >
                  <view class="flex items-start gap-3">
                    <!--   -->
                    <view class="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {{ record.targetAvatar ? (
                        <image 
                          src={record.targetAvatar }} 
                          alt="" 
                          class="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        getTargetTypeIcon(record.targetType)
                      )}
                    </view>
    
                    <!--   -->
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2 mb-1">
                        <text class="font-medium truncate">{{ record.targetTitle }}</text>
                        <Badge variant="outline" class="text-xs shrink-0">
                          {{ getTargetTypeLabel(record.targetType) }}
                        </Badge>
                      </view>
                      <text class="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {{ getReportTypeLabel(record.reportType) }}：{{ record.reason }}
                      </text>
                      <view class="flex items-center justify-between">
                        <text class="text-xs text-muted-foreground">{{ record.createdAt }}</text>
                        <Badge class={{ getReportStatusColor(record.status) }}>
                          {{ getStatusIcon(record.status) }}
                          <text class="ml-1">{{ getReportStatusLabel(record.status) }}</text>
                        </Badge>
                      </view>
                    </view>
    
                    <ChevronRight class="w-5 h-5 text-muted-foreground shrink-0" />
                  </view>
                </view>
              ))}
            </view>
          </DataState>
    
          <!--   -->
          <Sheet open={{ showDetail }} onOpenChange={{ setShowDetail }}>
            <SheetContent side="bottom" class="h-[85vh] rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>举报详情</SheetTitle>
              </SheetHeader>
    
              {selectedRecord && (
                <view class="mt-4 space-y-4 overflow-y-auto max-h-[calc(85vh-100px)]">
                  <!--   -->
                  <view class="bg-muted/30 rounded-lg p-4">
                    <text class="text-sm font-medium mb-3">举报对象</text>
                    <view class="flex items-center gap-3">
                      <view class="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        {{ selectedRecord.targetAvatar ? (
                          <image 
                            src={selectedRecord.targetAvatar }} 
                            alt="" 
                            class="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          getTargetTypeIcon(selectedRecord.targetType)
                        )}
                      </view>
                      <view>
                        <view class="font-medium">{{ selectedRecord.targetTitle }}</view>
                        <view class="text-sm text-muted-foreground">
                          {{ getTargetTypeLabel(selectedRecord.targetType) }}
                        </view>
                      </view>
                    </view>
                  </view>
    
                  <!--   -->
                  <view class="space-y-3">
                    <text class="text-sm font-medium">举报信息</text>
                    <view class="grid grid-cols-2 gap-3 text-sm">
                      <view>
                        <text class="text-muted-foreground">举报类型：</text>
                        <text>{{ getReportTypeLabel(selectedRecord.reportType) }}</text>
                      </view>
                      <view>
                        <text class="text-muted-foreground">提交时间：</text>
                        <text>{{ selectedRecord.createdAt }}</text>
                      </view>
                    </view>
                    <view class="text-sm">
                      <text class="text-muted-foreground">举报原因：</text>
                      <text class="mt-1">{{ selectedRecord.reason }}</text>
                    </view>
                    {selectedRecord.evidence && selectedRecord.evidence.length > 0 && (
                      <view>
                        <text class="text-sm text-muted-foreground">证据截图：</text>
                        <view class="flex gap-2 mt-2">
                          {selectedRecord.evidence.map((img, idx) => (
                            <image
                              key={idx}
                              src={{ img }}
                              alt={`证据${idx + 1}`}
                              class="w-20 h-20 rounded-lg object-cover border"
                            />
                          ))}
                        </view>
                      </view>
                    )}
                  </view>
    
                  <Separator />
    
                  <!--   -->
                  <view class="space-y-3">
                    <view class="flex items-center justify-between">
                      <text class="text-sm font-medium">处理状态</text>
                      <Badge class={{ getReportStatusColor(selectedRecord.status) }}>
                        {{ getReportStatusLabel(selectedRecord.status) }}
                      </Badge>
                    </view>
    
                    {selectedRecord.result ? (
                      <view class="bg-muted/30 rounded-lg p-4 space-y-3">
                        <view class="flex items-center gap-2">
                          <text class="text-sm text-muted-foreground">处理结论：</text>
                          <text class={`font-medium ${getConclusionColor(selectedRecord.result.conclusion)}`}>
                            {{ getConclusionLabel(selectedRecord.result.conclusion) }}
                          </text>
                        </view>
                        {selectedRecord.result.action && (
                          <view class="text-sm">
                            <text class="text-muted-foreground">处理措施：</text>
                            <text class="mt-1">{{ selectedRecord.result.action }}</text>
                          </view>
                        )}
                        <view class="text-sm">
                          <text class="text-muted-foreground">处理说明：</text>
                          <text class="mt-1">{{ selectedRecord.result.description }}</text>
                        </view>
                        <view class="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <text>处理人：{{ selectedRecord.result.handler }}</text>
                          <text>{{ selectedRecord.result.handledAt }}</text>
                        </view>
                      </view>
                    ) : (
                      <view class="bg-muted/30 rounded-lg p-4 text-center text-sm text-muted-foreground">
                        <Clock class="w-8 h-8 mx-auto mb-2 text-amber-500" />
                        <text>正在处理中，请耐心等待</text>
                        <text class="text-xs mt-1">预计1-3个工作日内处理完成</text>
                      </view>
                    )}
                  </view>
    
                  <!--   -->
                  {selectedRecord.status === 'rejected' && (
                    <view class="pt-4">
                      <Link href={`/report/appeal?id=${selectedRecord.id}`}>
                        <Button variant="outline" class="w-full">
                          <AlertTriangle class="w-4 h-4 mr-2" />
                          我要申诉
                        </Button>
                      </Link>
                      <text class="text-xs text-muted-foreground text-center mt-2">
                        如对处理结果有异议，可提交申诉
                      </text>
                    </view>
                  )}
                </view>
              )}
            </SheetContent>
          </Sheet>
    
          <!--   -->
          {loading && (
            <view class="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <view key={i} class="flex gap-3">
                  <Skeleton class="w-10 h-10 rounded-full shrink-0" />
                  <view class="flex-1 space-y-2">
                    <Skeleton class="h-4 w-2/3" />
                    <Skeleton class="h-3 w-full" />
                    <Skeleton class="h-3 w-1/3" />
                  </view>
                </view>
              ))}
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
const statusFilters: { value: ReportStatus | 'all'; label: string }[] = [
  const icons: Record<string, React.ReactNode> = {
  const icons: Record<ReportStatus, React.ReactNode> = {

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