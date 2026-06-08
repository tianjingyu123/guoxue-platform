<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">分享</text>
      <text class="v0-route">V0: substation/share</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="flex items-center gap-3">
                <Link href="/substation/settings">
                  <Button variant="ghost" size="icon" class="h-9 w-9">
                    <ArrowLeft class="w-5 h-5" />
                  </Button>
                </Link>
                <text class="text-lg font-semibold">分享推广中心</text>
              </view>
              <Link href={`/substation/${stationInfo.id}/poster`}>
                <Button variant="outline" size="sm">
                  <QrCode class="w-4 h-4 mr-1" />
                  分站海报
                </Button>
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 bg-gradient-to-r from-success/10 to-success/5 border-b border-success/20">
            <view class="flex items-center gap-2">
              <Gift class="w-4 h-4 text-success" />
              <text class="text-sm text-foreground">
                分享内容，用户购买即可获得 <text class="font-bold text-success">10%-30%</text> 佣金
              </text>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3">
            <view class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索要分享的内容..."
                value={{ searchQuery }}
                @change={(e) => setSearchQuery(e.target.value)}
                class="pl-10 bg-secondary/50"
              />
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pb-3">
            <view class="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              
    <view v-for="(type, index) in contentTypes" :key="index"> (
                <Button
                  key={type.id}
                  variant={activeType === type.id ? "default" : "outline"}
                  size="sm"
                  @click={() => setActiveType(type.id)}
                  class="flex-shrink-0"
                >
                  <type.icon class="w-3.5 h-3.5 mr-1" />
                  {{ type.label }}
                </Button>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 space-y-3">
            
    <view v-for="(content, index) in filteredContents" :key="index"> {
              const typeConfig = getTypeConfig(content.type)
              return (
                <Card key={content.id} class="p-3">
                  <view class="flex gap-3">
                    <!--   -->
                    <view class="w-20 h-20 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center">
                      <typeConfig.icon class="w-8 h-8 text-muted-foreground/50" />
                    </view>
                    
                    <!--   -->
                    <view class="flex-1 min-w-0">
                      <view class="flex items-start justify-between gap-2">
                        <view class="flex-1 min-w-0">
                          <view class="flex items-center gap-1.5 mb-1">
                            <Badge variant="secondary" class="text-[10px] px-1.5">
                              {{ typeConfig.label }}
                            </Badge>
                            {(content as any).isFree && (
                              <Badge class="text-[10px] px-1.5 bg-green-100 text-green-700">免费</Badge>
                            )}
                          </view>
                          <text class="font-medium text-sm line-clamp-1">{{ content.title }}</text>
                        </view>
                      </view>
                      
                      <!--   -->
                      <view class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {(content as any).price && (
                          <text class="text-primary font-medium">¥{{ (content as any).price }}</text>
                        )}
                        {{ (content as any).sales && <text>{(content as any).sales }}销量</text>}
                        {{ (content as any).students && <text>{(content as any).students }}学员</text>}
                        {{ (content as any).members && <text>{(content as any).members }}成员</text>}
                        {{ (content as any).participants && <text>{(content as any).participants }}人参与</text>}
                        {{ (content as any).views && <text>{(content as any).views }}浏览</text>}
                        {{ (content as any).reservations && <text>{(content as any).reservations }}人预约</text>}
                      </view>
                      
                      <!--   -->
                      <view class="flex items-center justify-between mt-2">
                        <view class="flex items-center gap-1">
                          <text class="text-[10px] text-muted-foreground">预计佣金</text>
                          <text class="text-sm font-bold text-success">
                            {content.commissionAmount > 0 ? `¥${content.commissionAmount}` : "引流"}
                          </text>
                          <text class="text-[10px] text-muted-foreground">({{ content.commission }})</text>
                        </view>
                        
                        <!--   -->
                        <view class="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            class="h-7 px-2 text-xs"
                            @click={() => handleCopyLink(content)}
                          >
                            <template v-if="copied">
    Check class="w-3 h-3 mr-1" /> : <Copy class="w-3 h-3 mr-1" />}
                            链接
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            class="h-7 px-2 text-xs"
                            @click={() => handleGeneratePoster(content)}
                          >
                            <Share2 class="w-3 h-3 mr-1" />
                            海报
                          </Button>
                        </view>
                      </view>
                    </view>
                  </view>
                </Card>
              )
            })}
            
            {filteredContents.length === 0 && (
              <view class="text-center py-12">
                <Search class="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <text class="text-muted-foreground">暂无相关内容</text>
              </view>
            )}
          </view>
    
          <!--   -->
          {showPoster && selectedContent && (
            <view class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <view class="bg-background rounded-2xl w-full max-w-sm overflow-hidden">
                <!--   -->
                <view class="p-4">
                  <view class="aspect-[9/16] bg-gradient-to-br from-primary/10 via-background to-gold/10 rounded-xl border border-border p-4 flex flex-col">
                    <!--   -->
                    <view class="flex-1">
                      <!--   -->
                      <view class="aspect-video bg-secondary rounded-lg mb-3 flex items-center justify-center">
                        {(() => {
                          const config = getTypeConfig(selectedContent.type)
                          return <config.icon class="w-12 h-12 text-muted-foreground/30" />
                        })()}
                      </view>
                      
                      <!--   -->
                      <text class="font-bold text-lg mb-2">{{ selectedContent.title }}</text>
                      
                      <!--   -->
                      <view class="flex items-center gap-2 mb-3">
                        {(selectedContent as any).price ? (
                          
                            <text class="text-2xl font-bold text-primary">¥{{ (selectedContent as any).price }}</text>
                            {(selectedContent as any).originalPrice && (
                              <text class="text-sm text-muted-foreground line-through">¥{{ (selectedContent as any).originalPrice }}</text>
                            )}
                          
                        ) : (
                          <Badge class="bg-green-100 text-green-700">免费</Badge>
                        )}
                      </view>
                      
                      <!--   -->
                      <view class="flex flex-wrap gap-1.5">
                        {(selectedContent as any).sales && (
                          <Badge variant="secondary" class="text-[10px]">{{ (selectedContent as any).sales }}人已购</Badge>
                        )}
                        {(selectedContent as any).students && (
                          <Badge variant="secondary" class="text-[10px]">{{ (selectedContent as any).students }}学员</Badge>
                        )}
                        {(selectedContent as any).members && (
                          <Badge variant="secondary" class="text-[10px]">{{ (selectedContent as any).members }}成员</Badge>
                        )}
                        {(selectedContent as any).participants && (
                          <Badge variant="secondary" class="text-[10px]">{{ (selectedContent as any).participants }}人参与</Badge>
                        )}
                      </view>
                    </view>
                    
                    <!--   -->
                    <view class="mt-auto pt-4 border-t border-border">
                      <view class="flex items-center gap-3">
                        <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <text class="text-primary font-bold">{{ stationInfo.ownerName[0] }}</text>
                        </view>
                        <view class="flex-1">
                          <text class="text-sm font-medium">{{ stationInfo.ownerName }}</text>
                          <text class="text-[10px] text-muted-foreground">{{ stationInfo.name }}站长推荐</text>
                        </view>
                        <view class="w-14 h-14 bg-white rounded-lg border border-border flex items-center justify-center">
                          <QrCode class="w-10 h-10 text-foreground" />
                        </view>
                      </view>
                      <text class="text-[10px] text-center text-muted-foreground mt-2">长按识别二维码查看详情</text>
                    </view>
                  </view>
                </view>
                
                <!--   -->
                <view class="p-4 pt-0 grid grid-cols-2 gap-3">
                  <Button variant="outline" @click={() => setShowPoster(false)}>
                    取消
                  </Button>
                  <Button>
                    <Download class="w-4 h-4 mr-1" />
                    保存海报
                  </Button>
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
const contentTypes = [
const shareableContents = [
const stationInfo = {
    const matchType = activeType === "all" || item.type === activeType

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