<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">法律条款</text>
      <text class="v0-route">V0: legal/data-collection-list</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
            <view class="flex items-center justify-between">
              <view class="flex items-center gap-3">
                <view class="v0-btn" 
                  @click={() => router.back()}
                  class="p-1 -ml-1 hover:bg-muted rounded-full transition-colors"
                >
                  <ChevronLeft class="w-6 h-6" />
                </view>
                <text class="text-lg font-semibold">个人信息收集清单</text>
              </view>
              <Button
                variant="ghost"
                size="sm"
                @click={() => router.push('/settings/privacy')}
              >
                <Settings class="w-4 h-4 mr-1" />
                管理授权
              </Button>
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            <!--   -->
            <view class="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <view class="flex gap-3">
                <Shield class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <view class="space-y-2">
                  <text class="text-sm text-blue-800">
                    根据《个人信息保护法》第17条规定，我们向您明示收集的个人信息清单。
                    您可以随时在「设置-隐私」中管理您的授权。
                  </text>
                  <view class="flex gap-4 text-xs text-blue-700">
                    <text>共 {{ totalFields }} 项信息</text>
                    <text>必需 {{ requiredFields }} 项</text>
                    <text>可选 {{ totalFields - requiredFields }} 项</text>
                  </view>
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="flex justify-end gap-2">
              <view class="v0-btn" 
                @click={{ expandAll }}
                class="text-xs text-primary hover:underline"
              >
                全部展开
              </view>
              <text class="text-muted-foreground">|</text>
              <view class="v0-btn" 
                @click={{ collapseAll }}
                class="text-xs text-primary hover:underline"
              >
                全部收起
              </view>
            </view>
    
            <!--   -->
            <view class="space-y-3">
              
    <view v-for="(category, index) in dataCategories" :key="index"> {
                const isExpanded = expandedCategories.includes(category.id)
                const requiredCount = category.fields.filter(f => f.isRequired).length
                
                return (
                  <view 
                    key={category.id}
                    class="bg-card border border-border rounded-xl overflow-hidden"
                  >
                    <!--   -->
                    <view class="v0-btn"
                      @click={() => toggleCategory(category.id)}
                      class="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <view class="flex items-center gap-3">
                        <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          {{ category.icon }}
                        </view>
                        <view class="text-left">
                          <view class="flex items-center gap-2">
                            <text class="font-medium">{{ category.name }}</text>
                            <text class="text-xs text-muted-foreground">
                              {{ category.fields.length }}项
                            </text>
                          </view>
                          <text class="text-xs text-muted-foreground">{{ category.description }}</text>
                        </view>
                      </view>
                      <view class="flex items-center gap-2">
                        {category.canManage && (
                          <text class="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                            可管理
                          </text>
                        )}
                        {isExpanded ? (
                          <ChevronUp class="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown class="w-5 h-5 text-muted-foreground" />
                        )}
                      </view>
                    </view>
    
                    <!--   -->
                    {isExpanded && (
                      <view class="border-t border-border">
                        {category.fields.map((field, index) => (
                          <view 
                            key={field.name}
                            class={cn(
                              "px-4 py-3",
                              index !== category.fields.length - 1 && "border-b border-border"
                            )}
                          >
                            <view class="flex items-start justify-between gap-2">
                              <view class="flex-1 min-w-0">
                                <view class="flex items-center gap-2">
                                  <text class="font-medium text-sm">{{ field.name }}</text>
                                  {field.isRequired ? (
                                    <text class="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                      必需
                                    </text>
                                  ) : (
                                    <text class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                      可选
                                    </text>
                                  )}
                                </view>
                                <text class="text-xs text-muted-foreground mt-1">
                                  {{ field.purpose }}
                                </text>
                              </view>
                              {field.legalBasis && (
                                <text class="text-xs text-muted-foreground whitespace-nowrap">
                                  {{ field.legalBasis }}
                                </text>
                              )}
                            </view>
                          </view>
                        ))}
                        
                        <!--   -->
                        {category.canManage && (
                          <view class="px-4 py-3 bg-muted/30">
                            <view class="v0-btn"
                              @click={() => router.push('/settings/privacy')}
                              class="text-sm text-primary flex items-center gap-1 hover:underline"
                            >
                              管理此类信息的授权
                              <ExternalLink class="w-3 h-3" />
                            </view>
                          </view>
                        )}
                      </view>
                    )}
                  </view>
                )
              })}
            </view>
    
            <!--   -->
            <view class="bg-muted/50 rounded-xl p-4 space-y-3">
              <text class="font-medium text-sm">标签说明</text>
              <view class="grid grid-cols-2 gap-3 text-xs">
                <view class="flex items-center gap-2">
                  <text class="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">必需</text>
                  <text class="text-muted-foreground">提供基本服务所必需</text>
                </view>
                <view class="flex items-center gap-2">
                  <text class="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">可选</text>
                  <text class="text-muted-foreground">可拒绝，不影响基本功能</text>
                </view>
                <view class="flex items-center gap-2">
                  <text class="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">可管理</text>
                  <text class="text-muted-foreground">可在设置中开启/关闭</text>
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="bg-muted/50 rounded-xl p-4 space-y-3">
              <text class="font-medium text-sm">处理依据说明</text>
              <view class="space-y-2 text-xs text-muted-foreground">
                <view class="flex gap-2">
                  <text class="font-medium text-foreground w-16 flex-shrink-0">合同履行</text>
                  <text>为履行与您签订的用户协议所必需</text>
                </view>
                <view class="flex gap-2">
                  <text class="font-medium text-foreground w-16 flex-shrink-0">同意</text>
                  <text>基于您的明示同意收集，可随时撤回</text>
                </view>
                <view class="flex gap-2">
                  <text class="font-medium text-foreground w-16 flex-shrink-0">合法利益</text>
                  <text>为维护平台安全、优化服务所必需</text>
                </view>
                <view class="flex gap-2">
                  <text class="font-medium text-foreground w-16 flex-shrink-0">法律义务</text>
                  <text>为履行法定义务所必需</text>
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="text-center space-y-2 pt-4">
              <text class="text-sm text-muted-foreground">
                如有疑问，请联系我们
              </text>
              <text class="text-sm">
                <text href="mailto:privacy@rebu.com" class="text-primary hover:underline">
                  privacy@rebu.com
                </text>
              </text>
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-pb">
            <Button 
              class="w-full bg-primary hover:bg-primary/90"
              @click={() => router.push('/settings/privacy')}
            >
              管理我的授权
            </Button>
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
const dataCategories: DataCategory[] = [

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