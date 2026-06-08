<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/data-export</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                <ChevronLeft class="w-5 h-5" />
              </view>
              <text class="font-medium">数据导出</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="flex border-b border-border">
            <view class="v0-btn"
              @click={() => setActiveTab('create')}
              class={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'create' 
                  ? 'text-[#C41E3A] border-[#C41E3A]' 
                  : 'text-muted-foreground border-transparent'
              }`}
            >
              申请导出
            </view>
            <view class="v0-btn"
              @click={() => setActiveTab('records')}
              class={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'records' 
                  ? 'text-[#C41E3A] border-[#C41E3A]' 
                  : 'text-muted-foreground border-transparent'
              }`}
            >
              导出记录
              {records.filter(r => r.status === 'completed').length > 0 && (
                <text class="ml-1 px-1.5 py-0.5 text-xs bg-[#C41E3A] text-white rounded-full">
                  {records.filter(r => r.status === 'completed').length}
                </text>
              )}
            </view>
          </view>
    
          {activeTab === 'create' ? (
            <view class="p-4 space-y-4">
              <!--   -->
              <view class="flex gap-3 p-4 bg-blue-50 rounded-xl">
                <Info class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <view class="text-sm text-blue-800">
                  <text class="font-medium mb-1">数据导出说明</text>
                  <view class="space-y-1 text-blue-700">
                    <view>• 导出文件为 ZIP 压缩包格式</view>
                    <view>• 处理时间约 5-30 分钟，完成后通知您</view>
                    <view>• 文件有效期 7 天，请及时下载</view>
                    <view>• 每月最多申请 3 次导出</view>
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="bg-card rounded-2xl overflow-hidden">
                <view class="flex items-center justify-between p-4 border-b border-border">
                  <text class="font-medium">选择导出数据</text>
                  <view class="v0-btn"
                    @click={{ selectAll }}
                    class="text-sm text-[#C41E3A]"
                  >
                    {selectedTypes.length === dataTypes.length ? '取消全选' : '全选'}
                  </view>
                </view>
                
                <view class="divide-y divide-border">
                  
    <view v-for="(type, index) in dataTypes" :key="index"> (
                    <view class="v0-btn"
                      key={{ type.id }}
                      @click={() => toggleType(type.id)}
                      class="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <view class={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        selectedTypes.includes(type.id) ? 'bg-[#C41E3A] text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {{ type.icon }}
                      </view>
                      <view class="flex-1 min-w-0">
                        <text class="font-medium">{{ type.name }}</text>
                        <text class="text-xs text-muted-foreground mt-0.5">{{ type.description }}</text>
                      </view>
                      <view class="flex items-center gap-2">
                        <text class="text-xs text-muted-foreground">{{ type.estimatedSize }}</text>
                        <view class={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedTypes.includes(type.id) 
                            ? 'bg-[#C41E3A] border-[#C41E3A]' 
                            : 'border-muted-foreground/30'
                        }`}>
                          {selectedTypes.includes(type.id) && (
                            <Check class="w-3 h-3 text-white" />
                          )}
                        </view>
                      </view>
                    </view>
                  ))}
                </view>
              </view>
    
              <!--   -->
              {selectedTypes.length > 0 && (
                <view class="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                  <text class="text-sm text-muted-foreground">
                    已选 {{ selectedTypes.length }} 项数据
                  </text>
                  <text class="text-sm font-medium">
                    预估大小: 约 {{ selectedTypes.length * 2 }}MB
                  </text>
                </view>
              )}
            </view>
          ) : (
            <view class="p-4">
              {loading ? (
                <view class="space-y-4">
                  {[1, 2, 3].map(i => (
                    <view key={i} class="bg-card rounded-2xl p-4 animate-pulse">
                      <view class="h-5 w-24 bg-muted rounded mb-3" />
                      <view class="h-4 w-48 bg-muted rounded mb-2" />
                      <view class="h-4 w-32 bg-muted rounded" />
                    </view>
                  ))}
                </view>
              ) : records.length === 0 ? (
                <view class="flex flex-col items-center justify-center py-16">
                  <view class="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Download class="w-8 h-8 text-muted-foreground" />
                  </view>
                  <text class="text-muted-foreground mb-4">暂无导出记录</text>
                  <view class="v0-btn"
                    @click={() => setActiveTab('create')}
                    class="text-[#C41E3A] text-sm"
                  >
                    去申请导出
                  </view>
                </view>
              ) : (
                <view class="space-y-4">
                  
    <view v-for="(record, index) in records" :key="index"> {
                    const statusConfig = getStatusConfig(record.status)
                    return (
                      <view key={record.id} class="bg-card rounded-2xl p-4">
                        <view class="flex items-start justify-between mb-3">
                          <view class={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            {{ statusConfig.icon }}
                            {{ statusConfig.label }}
                          </view>
                          <text class="text-xs text-muted-foreground">
                            {{ formatDate(record.createdAt) }}
                          </text>
                        </view>
                        
                        <text class="text-sm mb-2">
                          {{ getTypeNames(record.types) }}
                        </text>
                        
                        {record.status === 'completed' && record.expireAt && (
                          <text class="text-xs text-muted-foreground mb-3">
                            文件大小: {{ record.fileSize }} · 有效期至 {{ formatDate(record.expireAt) }}
                          </text>
                        )}
                        
                        {record.status === 'processing' && (
                          <view class="flex items-center gap-2 text-xs text-blue-600">
                            <view class="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                              <view class="h-full w-1/3 bg-blue-500 rounded-full animate-pulse" />
                            </view>
                            <text>处理中...</text>
                          </view>
                        )}
                        
                        {record.status === 'completed' && (
                          <view class="v0-btn"
                            @click={() => window.open(record.downloadUrl, '_blank')}
                            class="w-full mt-3 py-2.5 bg-[#C41E3A] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <Download class="w-4 h-4" />
                            下载文件
                          </view>
                        )}
                        
                        {record.status === 'expired' && (
                          <view class="v0-btn"
                            @click={() => {
                              setSelectedTypes(record.types)
                              setActiveTab('create')
                            }}
                            class="w-full mt-3 py-2.5 bg-muted text-foreground rounded-xl text-sm font-medium"
                          >
                            重新申请
                          </view>
                        )}
                      </view>
                    )
                  })}
                </view>
              )}
            </view>
          )}
    
          <!--   -->
          {activeTab === 'create' && (
            <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
              <view class="v0-btn"
                @click={{ handleSubmit }}
                :disabled={{ selectedTypes.length === 0 || submitting }}
                class="w-full py-3.5 bg-[#C41E3A] text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  
                    <RefreshCw class="w-4 h-4 animate-spin" />
                    提交中...
                  
                ) : (
                  
                    <Download class="w-4 h-4" />
                    申请导出 ({{ selectedTypes.length }} 项)
                  
                )}
              </view>
            </view>
          )}
    
          <!--   -->
          {activeTab === 'create' && <view class="h-24" />}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const dataTypes: DataType[] = [
      const newRecord: ExportRecord = {

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