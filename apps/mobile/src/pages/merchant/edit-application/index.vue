<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商家中心</text>
      <text class="v0-route">V0: merchant/edit-application</text>
    </view>
        <view class="min-h-screen bg-background pb-32">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center h-14 px-4">
              <Link href="/merchant/profile" class="mr-3">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="text-lg font-semibold">修改入驻资料</text>
            </view>
          </view>
          
          <!--   -->
          <view class="p-4">
            <Card class="p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200/50">
              <view class="flex items-start gap-2">
                <AlertCircle class="w-4 h-4 text-amber-600 mt-0.5" />
                <view class="text-xs text-muted-foreground">
                  <text>修改入驻资料需要重新审核，审核期间店铺正常营业。</text>
                  <text class="mt-1">部分敏感信息修改后可能影响店铺信用评级。</text>
                </view>
              </view>
            </Card>
          </view>
          
          <view class="px-4 space-y-4">
            <!--   -->
            <Card class="p-4 space-y-4">
              <view class="flex items-center justify-between">
                <text class="font-medium">店铺信息</text>
                <Badge variant="secondary" class="text-xs">{{ formData.shopType }}</Badge>
              </view>
              
              <view class="space-y-2">
                <Label>店铺名称</Label>
                <Input 
                  value={{ formData.shopName }}
                  @change={e => setFormData(prev => ({ ...prev, shopName: e.target.value }))}
                />
                <text class="text-xs text-muted-foreground">店铺名称每年只能修改1次</text>
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4 space-y-4">
              <text class="font-medium">资质材料</text>
              
              <view class="space-y-2">
                <Label>营业执照</Label>
                <view class="flex items-center gap-3">
                  <view class="w-24 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <view class="text-center">
                      <Check class="w-5 h-5 text-green-600 mx-auto" />
                      <text class="text-[10px] text-muted-foreground">已上传</text>
                    </view>
                  </view>
                  <Button variant="outline" size="sm">
                    <Upload class="w-4 h-4 mr-1" />
                    重新上传
                  </Button>
                </view>
              </view>
              
              <view class="space-y-2">
                <Label>法人身份证</Label>
                <view class="grid grid-cols-2 gap-3">
                  <view class="aspect-[3/2] rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <view class="text-center">
                      <Check class="w-5 h-5 text-green-600 mx-auto" />
                      <text class="text-xs text-muted-foreground">人像面</text>
                    </view>
                  </view>
                  <view class="aspect-[3/2] rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <view class="text-center">
                      <Check class="w-5 h-5 text-green-600 mx-auto" />
                      <text class="text-xs text-muted-foreground">国徽面</text>
                    </view>
                  </view>
                </view>
                <view class="flex justify-end">
                  <Button variant="outline" size="sm">
                    <Upload class="w-4 h-4 mr-1" />
                    重新上传
                  </Button>
                </view>
              </view>
              
              <view class="space-y-2">
                <Label>法人姓名</Label>
                <Input 
                  value={{ formData.legalPerson }}
                  @change={e => setFormData(prev => ({ ...prev, legalPerson: e.target.value }))}
                />
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4 space-y-4">
              <text class="font-medium">联系人信息</text>
              
              <view class="space-y-2">
                <Label>联系人姓名</Label>
                <Input 
                  value={{ formData.contactName }}
                  @change={e => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                />
              </view>
              
              <view class="space-y-2">
                <Label>联系电话</Label>
                <Input 
                  value={{ formData.contactPhone }}
                  @change={e => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                />
              </view>
              
              <view class="space-y-2">
                <Label>联系邮箱</Label>
                <Input 
                  type="email"
                  value={{ formData.contactEmail }}
                  @change={e => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                />
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4 space-y-4">
              <text class="font-medium">经营类目</text>
              <view class="flex flex-wrap gap-2">
                {formData.categories.map(cat => (
                  <Badge key={cat} variant="secondary">{{ cat }}</Badge>
                ))}
              </view>
              <Button variant="outline" size="sm" class="w-full">
                修改经营类目
              </Button>
              <text class="text-xs text-muted-foreground">新增类目可能需要提供额外资质</text>
            </Card>
          </view>
          
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
            <Button class="w-full" @click={{ handleSubmit }} :disabled={{ isSubmitting }}>
              <template v-if="isSubmitting">
    Loader2 class="w-4 h-4 mr-2 animate-spin" /> : null}
              提交修改申请
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
const existingData = {

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