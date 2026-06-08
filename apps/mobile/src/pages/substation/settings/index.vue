<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">settings</text>
      <text class="v0-route">V0: substation/settings</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <view class="max-w-lg mx-auto">
            <!--   -->
            <view class="sticky top-0 z-50 h-11 flex items-center justify-between px-4 bg-background border-b border-border">
              <Link href="/substation/dashboard" class="p-1">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="font-medium">个性化设置</text>
              <Link href={`/substation/${config.name}/home`} class="p-1 text-primary">
                <Eye class="w-5 h-5" />
              </Link>
            </view>
            
            <!--   -->
            <Link href="/substation/share">
              <view class="mx-4 mt-4 p-3 bg-gradient-to-r from-success/10 to-success/5 border border-success/30 rounded-xl flex items-center justify-between">
                <view class="flex items-center gap-3">
                  <view class="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                    <Share2 class="w-5 h-5 text-success" />
                  </view>
                  <view>
                    <text class="font-medium text-sm">分享推广中心</text>
                    <text class="text-[10px] text-muted-foreground">分享商品/活动/课程赚取佣金</text>
                  </view>
                </view>
                <text class="text-xs text-success font-medium">去分享 →</text>
              </view>
            </Link>
            
            <!--   -->
            <view class="mx-4 mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg flex items-start gap-2">
              <AlertCircle class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <text class="text-xs text-amber-700 dark:text-amber-400">
                修改后需要审核通过才能生效，审核时间约1-3个工作日
              </text>
            </view>
            
            <!--   -->
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }} class="mt-4">
              <TabsList class="w-full grid grid-cols-3 mx-4 max-w-[calc(100%-2rem)]">
                <TabsTrigger value="brand">品牌设置</TabsTrigger>
                <TabsTrigger value="hero">首页装修</TabsTrigger>
                <TabsTrigger value="featured">精选内容</TabsTrigger>
              </TabsList>
              
              <!--   -->
              <TabsContent value="brand" class="px-4 mt-4 space-y-4">
                <!--   -->
                <Card class="p-4">
                  <text class="flex items-center gap-2 text-sm font-medium mb-3">
                    <Type class="w-4 h-4" />
                    分站名称
                  </text>
                  <Input
                    value={{ config.name }}
                    @change={(e) => updateConfig("name", e.target.value)}
                    placeholder="如：青云国学小站"
                    maxLength={{ 20 }}
                  />
                  <text class="text-xs text-muted-foreground mt-2">
                    最多20个字，修改需审核
                  </text>
                </Card>
                
                <!--   -->
                <Card class="p-4">
                  <text class="flex items-center gap-2 text-sm font-medium mb-3">
                    <ImageIcon class="w-4 h-4" />
                    分站Logo
                  </text>
                  <view class="flex items-center gap-4">
                    <view class="w-20 h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary">
                      {{ config.logo ? (
                        <image src={config.logo }} alt="" class="w-full h-full object-contain" />
                      ) : (
                        <Upload class="w-5 h-5 text-muted-foreground" />
                      )}
                    </view>
                    <view class="flex-1">
                      <Button variant="outline" size="sm">
                        <Upload class="w-4 h-4 mr-2" />
                        上传Logo
                      </Button>
                      <text class="text-xs text-muted-foreground mt-1">
                        建议尺寸 200×60px，PNG格式
                      </text>
                    </view>
                  </view>
                </Card>
                
                <!--   -->
                <Card class="p-4">
                  <text class="flex items-center gap-2 text-sm font-medium mb-3">
                    <Palette class="w-4 h-4" />
                    主题色
                  </text>
                  <view class="grid grid-cols-4 gap-3">
                    
    <view v-for="(color, index) in presetColors" :key="index"> (
                      <view class="v0-btn"
                        key={{ color.value }}
                        @click={() => updateConfig("themeColor", color.value)}
                        class={cn(
                          "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all",
                          config.themeColor === color.value 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "border-transparent"
                        )}
                        :style=" backgroundColor: color.value }}
                      >
                        {config.themeColor === color.value && (
                          <Check class="w-5 h-5 text-white" />
                        )}
                      </view>
                    ))}
                  </view>
                  <view class="flex items-center gap-2 mt-3">
                    {presetColors.slice(0, 4).map((color) => (
                      <text 
                        key={color.value}
                        class="flex-1 text-center text-[10px] text-muted-foreground"
                      >
                        {{ color.name }}
                      </text>
                    ))}
                  </view>
                  <view class="flex items-center gap-2 mt-1">
                    {presetColors.slice(4).map((color) => (
                      <text 
                        key={color.value}
                        class="flex-1 text-center text-[10px] text-muted-foreground"
                      >
                        {{ color.name }}
                      </text>
                    ))}
                  </view>
                </Card>
                
                <!--   -->
                <Card class="p-4">
                  <text class="flex items-center gap-2 text-sm font-medium mb-3">
                    <Star class="w-4 h-4" />
                    站长介绍
                  </text>
                  <view class="flex items-center gap-3 mb-3">
                    <view 
                      class="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
                      :style=" backgroundColor: config.themeColor }}
                    >
                      {{ config.masterAvatar ? (
                        <image src={config.masterAvatar }} alt="" class="w-full h-full object-cover" />
                      ) : (
                        <view class="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                          {{ config.masterName.charAt(0) }}
                        </view>
                      )}
                    </view>
                    <Button variant="outline" size="sm">
                      <Upload class="w-4 h-4 mr-2" />
                      更换头像
                    </Button>
                  </view>
                  <Textarea
                    value={{ config.masterIntro }}
                    @change={(e) => updateConfig("masterIntro", e.target.value)}
                    placeholder="介绍一下自己，让用户更了解你..."
                    rows={{ 4 }}
                    maxLength={{ 500 }}
                  />
                  <text class="text-xs text-muted-foreground mt-2 text-right">
                    {{ config.masterIntro.length }}/500
                  </text>
                </Card>
              </TabsContent>
              
              <!--   -->
              <TabsContent value="hero" class="px-4 mt-4 space-y-4">
                <!--   -->
                <Card class="p-4">
                  <text class="flex items-center justify-between mb-3">
                    <text class="flex items-center gap-2 text-sm font-medium">
                      <ImageIcon class="w-4 h-4" />
                      首页Banner
                    </text>
                    <text class="text-xs text-muted-foreground">
                      {{ config.heroImages.length }}/3张
                    </text>
                  </text>
                  <view class="grid grid-cols-3 gap-2">
                    {config.heroImages.map((img, index) => (
                      <view key={index} class="relative aspect-[2/1] rounded-lg overflow-hidden group">
                        {{ img ? (
                          <image src={img }} alt="" class="w-full h-full object-cover" />
                        ) : (
                          <view class="w-full h-full bg-secondary flex items-center justify-center">
                            <ImageIcon class="w-6 h-6 text-muted-foreground" />
                          </view>
                        )}
                        <view class="v0-btn" 
                          @click={() => {
                            const newImages = config.heroImages.filter((_, i) => i !== index)
                            updateConfig("heroImages", newImages)
                          }}
                          class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X class="w-3 h-3 text-white" />
                        </view>
                      </view>
                    ))}
                    {config.heroImages.length < 3 && (
                      <view class="v0-btn" class="aspect-[2/1] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors">
                        <Plus class="w-5 h-5 text-muted-foreground" />
                        <text class="text-[10px] text-muted-foreground">添加</text>
                      </view>
                    )}
                  </view>
                  <text class="text-xs text-muted-foreground mt-2">
                    建议尺寸 750×375px，支持1-3张轮播
                  </text>
                </Card>
                
                <!--   -->
                <Card class="p-4">
                  <text class="flex items-center gap-2 text-sm font-medium mb-3">
                    <Eye class="w-4 h-4" />
                    预览效果
                  </text>
                  <view 
                    class="aspect-[2/1] rounded-xl overflow-hidden"
                    :style=" backgroundColor: config.themeColor }}
                  >
                    {{ config.heroImages[0] ? (
                      <image src={config.heroImages[0] }} alt="" class="w-full h-full object-cover" />
                    ) : (
                      <view class="w-full h-full flex items-center justify-center">
                        <text class="text-white/50 text-sm">上传Banner后预览</text>
                      </view>
                    )}
                  </view>
                </Card>
              </TabsContent>
              
              <!--   -->
              <TabsContent value="featured" class="px-4 mt-4 space-y-4">
                <Card class="p-4">
                  <view class="flex items-center justify-between mb-3">
                    <text class="flex items-center gap-2 text-sm font-medium">
                      <Star class="w-4 h-4" />
                      站长精选
                    </text>
                    <text class="text-xs text-muted-foreground">
                      {{ config.featured.length }}/6个
                    </text>
                  </view>
                  
                  <text class="text-xs text-muted-foreground mb-4">
                    从平台内容中挑选推荐给你的用户，精选内容会在首页显著展示
                  </text>
                  
                  <!--   -->
                  <view class="space-y-3 mb-4">
                    {config.featured.map((item, index) => (
                      <view key={item.id} class="p-3 bg-secondary/50 rounded-lg">
                        <view class="flex items-center gap-2 mb-2">
                          <GripVertical class="w-4 h-4 text-muted-foreground cursor-move" />
                          <Badge 
                            variant="secondary" 
                            class="text-[10px]"
                            :style=" 
                              backgroundColor: `${{ config.themeColor }}15`,
                              color: config.themeColor,
                            }}
                          >
                            {item.type === "course" ? "课程" : item.type === "circle" ? "圈子" : "文章"}
                          </Badge>
                          <text class="flex-1 text-sm font-medium truncate">{{ item.title }}</text>
                          <view class="v0-btn" 
                            @click={() => handleRemoveFeatured(item.id)}
                            class="p-1 hover:bg-destructive/10 rounded"
                          >
                            <Trash2 class="w-4 h-4 text-destructive" />
                          </view>
                        </view>
                        <Input
                          value={item.recommendation || ""}
                          @change={(e) => handleUpdateRecommendation(item.id, e.target.value)}
                          placeholder="添加推荐语（可选）"
                          class="text-xs h-8"
                          maxLength={{ 50 }}
                        />
                      </view>
                    ))}
                  </view>
                  
                  <!--   -->
                  {config.featured.length < 6 && (
                    <view class="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        @click={() => { setContentPickerType("course"); setShowContentPicker(true) }}
                        class="text-xs"
                      >
                        <BookOpen class="w-3 h-3 mr-1" />
                        添加课程
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        @click={() => { setContentPickerType("circle"); setShowContentPicker(true) }}
                        class="text-xs"
                      >
                        <Users class="w-3 h-3 mr-1" />
                        添加圈子
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        @click={() => { setContentPickerType("article"); setShowContentPicker(true) }}
                        class="text-xs"
                      >
                        <FileText class="w-3 h-3 mr-1" />
                        添加文章
                      </Button>
                    </view>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
            
            <!--   -->
            <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border max-w-lg mx-auto">
              <Button 
                class="w-full"
                :style=" backgroundColor: config.themeColor }}
                @click={{ handleSave }}
                :disabled={{ !hasChanges || isSaving }}
              >
                {isSaving ? (
                  
                    <Save class="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  
                ) : (
                  
                    <Save class="w-4 h-4 mr-2" />
                    {hasChanges ? "保存修改" : "已保存"}
                  
                )}
              </Button>
            </view>
          </view>
          
          <!--   -->
          {showContentPicker && (
            <view class="fixed inset-0 z-50 bg-black/50" @click={() => setShowContentPicker(false)}>
              <view 
                class="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[70vh] overflow-hidden"
                @click={e => e.stopPropagation()}
              >
                <view class="p-4 border-b border-border flex items-center justify-between">
                  <text class="font-medium">
                    选择{contentPickerType === "course" ? "课程" : contentPickerType === "circle" ? "圈子" : "文章"}
                  </text>
                  <view class="v0-btn" @click={() => setShowContentPicker(false)}>
                    <X class="w-5 h-5" />
                  </view>
                </view>
                
                <view class="p-4">
                  <view class="relative mb-4">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="搜索..." class="pl-10" />
                  </view>
                  
                  <view class="space-y-2 max-h-[50vh] overflow-y-auto">
                    {(contentPickerType === "course" ? availableContent.courses :
                      contentPickerType === "circle" ? availableContent.circles :
                      availableContent.articles
                    ).map(item => {
                      const isSelected = config.featured.some(f => f.id === item.id)
                      return (
                        <view class="v0-btn"
                          key={{ item.id }}
                          @click={() => !isSelected && handleAddFeatured(contentPickerType, item)}
                          :disabled={{ isSelected }}
                          class={cn(
                            "w-full p-3 rounded-lg flex items-center justify-between text-left transition-colors",
                            isSelected ? "bg-secondary/50 opacity-50" : "hover:bg-secondary"
                          )}
                        >
                          <view>
                            <text class="font-medium text-sm">{{ item.title }}</text>
                            <text class="text-xs text-muted-foreground mt-0.5">
                              {"price" in item && `¥${{ item.price }}`}
                              {"members" in item && `${{ item.members }}成员`}
                              {"views" in item && `${{ item.views }}阅读`}
                            </text>
                          </view>
                          {isSelected ? (
                            <Check class="w-4 h-4 text-primary" />
                          ) : (
                            <Plus class="w-4 h-4 text-muted-foreground" />
                          )}
                        </view>
                      )
                    })}
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
const presetColors = [
const currentConfig = {
const availableContent = {
    const newItem: FeaturedItem = {

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