<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商家中心</text>
      <text class="v0-route">V0: merchant/product-edit</text>
    </view>
        <view class="min-h-screen bg-background pb-32">
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center h-14 px-4">
              <Link href="/merchant/products" class="mr-3">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="text-lg font-semibold">{isEdit ? "编辑商品" : "发布商品"}</text>
            </view>
          </view>
          
          <view class="p-4 space-y-4">
            <!--   -->
            <Card class="p-4">
              <view class="flex items-center justify-between mb-3">
                <text class="font-medium">商品图片</text>
                <text class="text-xs text-muted-foreground">最多9张，首图为封面</text>
              </view>
              <view class="grid grid-cols-3 gap-3">
                {formData.images.map((_, index) => (
                  <view key={index} class="aspect-square rounded-lg bg-muted relative overflow-hidden border-2 border-dashed border-border">
                    <view class="absolute inset-0 flex items-center justify-center">
                      <Camera class="w-8 h-8 text-muted-foreground" />
                    </view>
                    <view class="v0-btn" 
                      @click={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))} 
                      class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
                    >
                      <X class="w-4 h-4 text-white" />
                    </view>
                    {index === 0 && (
                      <Badge class="absolute bottom-1 left-1 text-[10px]">封面</Badge>
                    )}
                  </view>
                ))}
                {formData.images.length < 9 && (
                  <view class="v0-btn" 
                    @click={() => setFormData(prev => ({ ...prev, images: [...prev.images, String(prev.images.length + 1)] }))}
                    class="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus class="w-8 h-8 text-muted-foreground" />
                    <text class="text-xs text-muted-foreground mt-1">添加图片</text>
                  </view>
                )}
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4 space-y-4">
              <text class="font-medium">基本信息</text>
              
              <view class="space-y-2">
                <Label>商品名称 <text class="text-destructive">*</text></Label>
                <Input 
                  placeholder="请输入商品名称（最多60字）" 
                  value={{ formData.title }} 
                  @change={e => setFormData(prev => ({ ...prev, title: e.target.value }))} 
                  maxLength={{ 60 }}
                />
                <text class="text-xs text-muted-foreground text-right">{{ formData.title.length }}/60</text>
              </view>
              
              <view class="space-y-2">
                <Label>商品卖点</Label>
                <Input 
                  placeholder="简要描述商品特点（最多30字）" 
                  value={{ formData.subtitle }} 
                  @change={e => setFormData(prev => ({ ...prev, subtitle: e.target.value }))} 
                  maxLength={{ 30 }}
                />
              </view>
              
              <view class="space-y-2">
                <Label>商品详情</Label>
                <Textarea 
                  placeholder="详细描述商品信息、规格、使用方法等" 
                  value={{ formData.description }} 
                  @change={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                  rows={{ 5 }}
                />
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4 space-y-4">
              <text class="font-medium">价格库存</text>
              
              <view class="grid grid-cols-2 gap-4">
                <view class="space-y-2">
                  <Label>售价 <text class="text-destructive">*</text></Label>
                  <view class="relative">
                    <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</text>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={{ formData.price }} 
                      @change={e => setFormData(prev => ({ ...prev, price: e.target.value }))} 
                      class="pl-8"
                    />
                  </view>
                </view>
                <view class="space-y-2">
                  <Label>原价（划线价）</Label>
                  <view class="relative">
                    <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</text>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={{ formData.originalPrice }} 
                      @change={e => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))} 
                      class="pl-8"
                    />
                  </view>
                </view>
              </view>
              
              <view class="grid grid-cols-2 gap-4">
                <view class="space-y-2">
                  <Label>库存 <text class="text-destructive">*</text></Label>
                  <Input 
                    type="number" 
                    placeholder="请输入库存数量" 
                    value={{ formData.stock }} 
                    @change={e => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  />
                </view>
                <view class="space-y-2">
                  <Label>限购数量</Label>
                  <Input 
                    type="number" 
                    placeholder="不限制" 
                    value={{ formData.limitPerPerson }} 
                    @change={e => setFormData(prev => ({ ...prev, limitPerPerson: e.target.value }))}
                  />
                </view>
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4 space-y-4">
              <text class="font-medium">分类与标签</text>
              
              <view class="space-y-2">
                <Label>商品分类 <text class="text-destructive">*</text></Label>
                <Select value={{ formData.category }} onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择商品分类" />
                  </SelectTrigger>
                  <SelectContent>
                    
    <view v-for="(cat, index) in categories" :key="index"> (
                      <SelectItem key={cat.id} value={{ cat.id }}>
                        <view class="flex items-center justify-between w-full">
                          <text>{{ cat.name }}</text>
                          <text class="text-xs text-muted-foreground ml-2">佣金{{ cat.fee }}</text>
                        </view>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCategory && (
                  <text class="text-xs text-muted-foreground flex items-center gap-1">
                    <Info class="w-3 h-3" />
                    该分类平台收取 {{ selectedCategory.fee }} 技术服务费
                  </text>
                )}
              </view>
              
              <view class="space-y-2">
                <Label>商品标签（最多5个）</Label>
                <view class="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" class="gap-1">
                      {{ tag }}
                      <view class="v0-btn" @click={() => removeTag(tag)}>
                        <X class="w-3 h-3" />
                      </view>
                    </Badge>
                  ))}
                </view>
                <view class="flex gap-2">
                  <Input 
                    placeholder="输入标签后回车添加" 
                    value={{ newTag }} 
                    @change={e => setNewTag(e.target.value)} 
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} 
                    class="flex-1"
                  />
                  <Button variant="outline" @click={{ addTag }} :disabled={{ formData.tags.length >= 5 }}>
                    <Plus class="w-4 h-4" />
                  </Button>
                </view>
              </view>
            </Card>
            
            <!--   -->
            <Card class="p-4 space-y-4">
              <text class="font-medium">其他设置</text>
              
              <view class="flex items-center justify-between">
                <view>
                  <Label>虚拟商品</Label>
                  <text class="text-xs text-muted-foreground mt-0.5">虚拟商品无需发货</text>
                </view>
                <Switch 
                  :checked={{ formData.isVirtual }}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, isVirtual: checked }))}
                />
              </view>
              
              <view class="flex items-center justify-between">
                <view>
                  <Label>支持退款</Label>
                  <text class="text-xs text-muted-foreground mt-0.5">买家可申请退款退货</text>
                </view>
                <Switch 
                  :checked={{ formData.allowRefund }}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, allowRefund: checked }))}
                />
              </view>
            </Card>
          </view>
          
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
            <view class="flex gap-3">
              <Button 
                variant="outline" 
                class="flex-1" 
                @click={{ handleSaveDraft }} 
                :disabled={{ isSaving }}
              >
                <template v-if="isSaving">
    Loader2 class="w-4 h-4 mr-2 animate-spin" /> : <Save class="w-4 h-4 mr-2" />}
                保存草稿
              </Button>
              <Button 
                class="flex-1" 
                @click={{ handlePublish }} 
                :disabled={{ isSubmitting }}
              >
                <template v-if="isSubmitting">
    Loader2 class="w-4 h-4 mr-2 animate-spin" /> : <Send class="w-4 h-4 mr-2" />}
                {isEdit ? "保存修改" : "立即发布"}
              </Button>
            </view>
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
const categories = [

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