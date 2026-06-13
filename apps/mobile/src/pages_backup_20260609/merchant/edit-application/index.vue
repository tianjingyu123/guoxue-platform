<template>
  <view class="page" data-v0-route="merchant/edit-application">
        <view class="min-h-screen bg-background pb-32">
          
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center h-14 px-4">
              <!-- component:link -->
                
              <!-- /component:link -->
              <text class="text-lg font-semibold">修改入驻资料</text>
            </view>
          </view>
    
          <view class="p-4">
            <!-- component:card -->
              <view class="flex items-start gap-2">
                
                <view class="text-xs text-muted-foreground">
                  <text>修改入驻资料需要重新审核，审核期间店铺正常营业。</text>
                  <text class="mt-1">部分敏感信息修改后可能影响店铺信用评级。</text>
                </view>
              </view>
            <!-- /component:card -->
          </view>
          
          <view class="px-4 space-y-4">
            
            <!-- component:card -->
              <view class="flex items-center justify-between">
                <text class="font-medium">店铺信息</text>
                <!-- component:badge -->""}<!-- /component:badge -->
              </view>
              
              <view class="space-y-2">
                <!-- component:label -->店铺名称<!-- /component:label -->
                <!-- component:input --> setFormData(prev => (""))}
                />
                <text class="text-xs text-muted-foreground">店铺名称每年只能修改1次</text>
              </view>
            <!-- /component:card -->
    
            <!-- component:card -->
              <text class="font-medium">资质材料</text>
              
              <view class="space-y-2">
                <!-- component:label -->营业执照<!-- /component:label -->
                <view class="flex items-center gap-3">
                  <view class="w-24 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <view class="text-center">
                      
                      <text class="text-[10px] text-muted-foreground">已上传</text>
                    </view>
                  </view>
                  <!-- component:button -->
                    
                    重新上传
                  <!-- /component:button -->
                </view>
              </view>
              
              <view class="space-y-2">
                <!-- component:label -->法人身份证<!-- /component:label -->
                <view class="grid grid-cols-2 gap-3">
                  <view class="aspect-[3/2] rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <view class="text-center">
                      
                      <text class="text-xs text-muted-foreground">人像面</text>
                    </view>
                  </view>
                  <view class="aspect-[3/2] rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <view class="text-center">
                      
                      <text class="text-xs text-muted-foreground">国徽面</text>
                    </view>
                  </view>
                </view>
                <view class="flex justify-end">
                  <!-- component:button -->
                    
                    重新上传
                  <!-- /component:button -->
                </view>
              </view>
              
              <view class="space-y-2">
                <!-- component:label -->法人姓名<!-- /component:label -->
                <!-- component:input --> setFormData(prev => (""))}
                />
              </view>
            <!-- /component:card -->
    
            <!-- component:card -->
              <text class="font-medium">联系人信息</text>
              
              <view class="space-y-2">
                <!-- component:label -->联系人姓名<!-- /component:label -->
                <!-- component:input --> setFormData(prev => (""))}
                />
              </view>
              
              <view class="space-y-2">
                <!-- component:label -->联系电话<!-- /component:label -->
                <!-- component:input --> setFormData(prev => (""))}
                />
              </view>
              
              <view class="space-y-2">
                <!-- component:label -->联系邮箱<!-- /component:label -->
                <!-- component:input --> setFormData(prev => (""))}
                />
              </view>
            <!-- /component:card -->
    
            <!-- component:card -->
              <text class="font-medium">经营类目</text>
              <view class="flex flex-wrap gap-2">
                ""}<!-- /component:badge -->
                ))}
              </view>
              <!-- component:button -->
                修改经营类目
              <!-- /component:button -->
              <text class="text-xs text-muted-foreground">新增类目可能需要提供额外资质</text>
            <!-- /component:card -->
          </view>
    
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
            <!-- component:button -->
              ""
              提交修改申请
            <!-- /component:button -->
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

onMounted(() => { loading.value = false })
onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.hr { height: 1px; background: #E8E0D5; margin: 24rpx 0; }
</style>