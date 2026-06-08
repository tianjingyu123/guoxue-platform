<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">个人中心</text>
      <text class="v0-route">V0: merchant/profile</text>
    </view>
        <view class="min-h-screen bg-background pb-32">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <view class="flex items-center gap-3">
                <Link href="/merchant/dashboard">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="text-lg font-semibold">店铺设置</text>
              </view>
              <Link href="/merchant/shop-preview">
                <Button variant="ghost" size="sm">
                  <Eye class="w-4 h-4 mr-1" />
                  预览
                </Button>
              </Link>
            </view>
          </view>
          
          <view class="p-4 space-y-4">
            <!--   -->
            <Card class="p-4">
              <text class="font-medium mb-4">店铺形象</text>
              <view class="flex items-center gap-4">
                <view class="relative">
                  <view class="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                    <Store class="w-10 h-10 text-muted-foreground" />
                  </view>
                  <view class="v0-btn" class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                    <Camera class="w-4 h-4" />
                  </view>
                </view>
                <view class="flex-1">
                  <text class="text-sm font-medium">店铺Logo</text>
                  <text class="text-xs text-muted-foreground mt-1">建议尺寸200x200px，支持JPG、PNG格式</text>
                </view>
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4 space-y-4">
              <text class="font-medium">基本信息</text>
              
              <view class="space-y-2">
                <Label>店铺名称</Label>
                <Input 
                  value={{ formData.name }}
                  @change={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入店铺名称"
                  maxLength={{ 20 }}
                />
              </view>
              
              <view class="space-y-2">
                <Label>店铺口号</Label>
                <Input 
                  value={{ formData.slogan }}
                  @change={e => setFormData(prev => ({ ...prev, slogan: e.target.value }))}
                  placeholder="一句话介绍您的店铺"
                  maxLength={{ 30 }}
                />
              </view>
              
              <view class="space-y-2">
                <Label>店铺简介</Label>
                <Textarea 
                  value={{ formData.description }}
                  @change={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="详细介绍您的店铺"
                  rows={{ 4 }}
                />
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4 space-y-4">
              <text class="font-medium">联系方式</text>
              
              <view class="space-y-2">
                <Label class="flex items-center gap-2">
                  <Phone class="w-4 h-4" />
                  联系电话
                </Label>
                <Input 
                  value={{ formData.phone }}
                  @change={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="请输入联系电话"
                />
              </view>
              
              <view class="space-y-2">
                <Label class="flex items-center gap-2">
                  <MapPin class="w-4 h-4" />
                  店铺地址
                </Label>
                <Input 
                  value={{ formData.address }}
                  @change={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="请输入店铺地址（选填）"
                />
              </view>
              
              <view class="space-y-2">
                <Label class="flex items-center gap-2">
                  <Clock class="w-4 h-4" />
                  营业时间
                </Label>
                <Input 
                  value={{ formData.businessHours }}
                  @change={e => setFormData(prev => ({ ...prev, businessHours: e.target.value }))}
                  placeholder="例如: 09:00-21:00"
                />
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4 space-y-4">
              <text class="font-medium">营业设置</text>
              
              <view class="flex items-center justify-between">
                <view>
                  <Label>店铺营业状态</Label>
                  <text class="text-xs text-muted-foreground mt-0.5">关闭后买家将无法下单</text>
                </view>
                <Switch 
                  :checked={{ formData.isOpen }}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, isOpen: checked }))}
                />
              </view>
              
              <view class="flex items-center justify-between">
                <view>
                  <Label>自动回复</Label>
                  <text class="text-xs text-muted-foreground mt-0.5">买家首次咨询时自动回复</text>
                </view>
                <Switch 
                  :checked={{ formData.autoReply }}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, autoReply: checked }))}
                />
              </view>
              
              {formData.autoReply && (
                <view class="space-y-2">
                  <Label>自动回复内容</Label>
                  <Textarea 
                    value={{ formData.autoReplyContent }}
                    @change={e => setFormData(prev => ({ ...prev, autoReplyContent: e.target.value }))}
                    placeholder="请输入自动回复内容"
                    rows={{ 3 }}
                  />
                </view>
              )}
            </Card>
            
            <!--   -->
            <Card class="p-4">
              <Link href="/merchant/edit-application" class="flex items-center justify-between py-2">
                <view>
                  <text class="text-sm font-medium">修改入驻资料</text>
                  <text class="text-xs text-muted-foreground mt-0.5">修改营业执照、法人信息等</text>
                </view>
                <ChevronRight class="w-5 h-5 text-muted-foreground" />
              </Link>
            </Card>
          </view>
          
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
            <Button class="w-full" @click={{ handleSave }} :disabled={{ isSaving }}>
              <template v-if="isSaving">
    Loader2 class="w-4 h-4 mr-2 animate-spin" /> : <Save class="w-4 h-4 mr-2" />}
              保存修改
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
const shopData = {

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