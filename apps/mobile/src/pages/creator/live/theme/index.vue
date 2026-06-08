<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: creator/live/theme</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="flex items-center gap-3">
                <view class="v0-btn" @click={() => router.back()}>
                  <ChevronLeft class="w-5 h-5" />
                </view>
                <text class="text-lg font-semibold">直播间装修</text>
              </view>
              <Button size="sm">
                保存配置
              </Button>
            </view>
          </view>
    
          <view class="flex flex-col lg:flex-row">
            <!--   -->
            <view class="flex-1 p-4 space-y-4">
              <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
                <TabsList class="w-full grid grid-cols-3">
                  <TabsTrigger value="templates" class="text-xs">
                    <Palette class="w-3.5 h-3.5 mr-1" />
                    主题模版
                  </TabsTrigger>
                  <TabsTrigger value="elements" class="text-xs">
                    <Image class="w-3.5 h-3.5 mr-1" />
                    视觉元素
                  </TabsTrigger>
                  <TabsTrigger value="effects" class="text-xs">
                    <Sparkles class="w-3.5 h-3.5 mr-1" />
                    动效配置
                  </TabsTrigger>
                </TabsList>
    
                <!--   -->
                <TabsContent value="templates" class="mt-4 space-y-4">
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium mb-3">预设氛围模版</text>
                    <view class="grid grid-cols-2 gap-3">
                      
    <view v-for="(theme, index) in themeTemplates" :key="index"> (
                        <Card 
                          key={theme.id}
                          @click={() => setSelectedTheme(theme.id)}
                          class={cn(
                            "relative overflow-hidden cursor-pointer transition-all",
                            selectedTheme === theme.id 
                              ? "ring-2 ring-primary ring-offset-2" 
                              : "hover:shadow-md"
                          )}
                        >
                          <!--   -->
                          <view class={cn(
                            "h-20 bg-gradient-to-br flex items-center justify-center",
                            theme.bgGradient
                          )}>
                            <text class="text-3xl">{{ theme.preview }}</text>
                            
                            <!--   -->
                            {selectedTheme === theme.id && (
                              <view class="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check class="w-3 h-3 text-white" />
                              </view>
                            )}
                            
                            <!--   -->
                            {!theme.isFree && (
                              <Badge class="absolute top-2 left-2 bg-amber-500 text-[10px] px-1.5">
                                <Crown class="w-2.5 h-2.5 mr-0.5" />
                                会员
                              </Badge>
                            )}
                            
                            <!--   -->
                            {theme.isUsing && (
                              <Badge class="absolute bottom-2 right-2 bg-green-500 text-[10px]">
                                使用中
                              </Badge>
                            )}
                          </view>
                          
                          <!--   -->
                          <view class="p-2.5">
                            <text class="text-sm font-medium">{{ theme.name }}</text>
                            <text class="text-[10px] text-muted-foreground mt-0.5">{{ theme.desc }}</text>
                            
                            <!--   -->
                            <view class="flex items-center gap-1.5 mt-2">
                              <view 
                                class="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                :style=" backgroundColor: theme.primaryColor }}
                              />
                              <view 
                                class="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                :style=" backgroundColor: theme.secondaryColor }}
                              />
                              <text class="text-[10px] text-muted-foreground ml-1">主色调</text>
                            </view>
                          </view>
                        </Card>
                      ))}
                    </view>
                  </view>
    
                  <!--   -->
                  <Card class="p-4">
                    <view class="flex items-center justify-between mb-3">
                      <text class="text-sm font-medium">自定义主题</text>
                      <Badge variant="outline" class="text-[10px]">
                        <Crown class="w-2.5 h-2.5 mr-0.5" />
                        高级会员专享
                      </Badge>
                    </view>
    
                    <!--   -->
                    <view class="mb-4">
                      <text class="text-xs text-muted-foreground mb-2 block">品牌Logo</text>
                      <view class="flex items-center gap-3">
                        <view class="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30">
                          <Upload class="w-5 h-5 text-muted-foreground" />
                        </view>
                        <view class="text-xs text-muted-foreground">
                          <text>支持PNG/JPG格式</text>
                          <text>建议尺寸200x200px</text>
                        </view>
                      </view>
                    </view>
    
                    <!--   -->
                    <view class="mb-4">
                      <text class="text-xs text-muted-foreground mb-2 block">主色调</text>
                      <view class="flex items-center gap-2">
                        {["#8B5CF6", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"].map(color => (
                          <view class="v0-btn"
                            key={{ color }}
                            @click={() => setCustomColor(color)}
                            class={cn(
                              "w-8 h-8 rounded-full border-2 transition-transform",
                              customColor === color ? "scale-110 border-white shadow-lg" : "border-transparent"
                            )}
                            :style=" backgroundColor: color }}
                          />
                        ))}
                        <text class="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden">
                          <Plus class="w-4 h-4 text-muted-foreground" />
                          <input type="color" class="absolute w-0 h-0 opacity-0" />
                        </text>
                      </view>
                    </view>
    
                    <!--   -->
                    <view>
                      <text class="text-xs text-muted-foreground mb-2 block">自定义背景</text>
                      <view class="grid grid-cols-3 gap-2">
                        <view class="aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                          <view class="text-center">
                            <Upload class="w-5 h-5 text-muted-foreground mx-auto" />
                            <text class="text-[10px] text-muted-foreground mt-1 block">上传图片</text>
                          </view>
                        </view>
                        <view class="aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                          <view class="text-center">
                            <Play class="w-5 h-5 text-muted-foreground mx-auto" />
                            <text class="text-[10px] text-muted-foreground mt-1 block">上传视频</text>
                          </view>
                        </view>
                        <view class="aspect-video rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center cursor-pointer">
                          <text class="text-[10px] text-white font-medium">绿幕</text>
                        </view>
                      </view>
                    </view>
                  </Card>
                </TabsContent>
    
                <!--   -->
                <TabsContent value="elements" class="mt-4 space-y-4">
                  <!--   -->
                  <Card class="p-4">
                    <text class="text-sm font-medium mb-3">背景设置</text>
                    <view class="space-y-3">
                      <view class="flex items-center justify-between">
                        <text class="text-sm">背景模糊</text>
                        <view class="w-32">
                          <Slider defaultValue={{ [30] }} max={{ 100 }} step={{ 10 }} />
                        </view>
                      </view>
                      <view class="flex items-center justify-between">
                        <text class="text-sm">背景暗度</text>
                        <view class="w-32">
                          <Slider defaultValue={{ [50] }} max={{ 100 }} step={{ 10 }} />
                        </view>
                      </view>
                    </view>
                  </Card>
    
                  <!--   -->
                  <Card class="p-4">
                    <view class="flex items-center justify-between mb-3">
                      <text class="text-sm font-medium">直播间挂件</text>
                      <Button variant="ghost" size="sm" class="h-7 text-xs">
                        <Plus class="w-3 h-3 mr-1" />
                        添加挂件
                      </Button>
                    </view>
                    
                    <view class="grid grid-cols-2 gap-2">
                      
    <view v-for="(pendant, index) in pendants" :key="index"> (
                        <view 
                          key={pendant.id}
                          @click={() => togglePendant(pendant.id)}
                          class={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            activePendants.includes(pendant.id) 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:bg-secondary/50"
                          )}
                        >
                          <view class="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xl">
                            {{ pendant.icon }}
                          </view>
                          <view class="flex-1 min-w-0">
                            <text class="text-sm font-medium">{{ pendant.name }}</text>
                            <text class="text-[10px] text-muted-foreground">位置：{{ pendant.position }}</text>
                          </view>
                          <Switch 
                            :checked={{ activePendants.includes(pendant.id) }} 
                            onCheckedChange={() => togglePendant(pendant.id)}
                          />
                        </view>
                      ))}
                    </view>
                  </Card>
    
                  <!--   -->
                  <Card class="p-4">
                    <text class="text-sm font-medium mb-3">UI组件样式</text>
                    <view class="space-y-3">
                      <view class="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                        <view class="flex items-center gap-2">
                          <Users class="w-4 h-4 text-muted-foreground" />
                          <text class="text-sm">观众列表样式</text>
                        </view>
                        <Badge variant="outline" class="text-[10px]">头像堆叠</Badge>
                      </view>
                      <view class="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                        <view class="flex items-center gap-2">
                          <Gift class="w-4 h-4 text-muted-foreground" />
                          <text class="text-sm">礼物栏样式</text>
                        </view>
                        <Badge variant="outline" class="text-[10px]">底部横条</Badge>
                      </view>
                      <view class="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                        <view class="flex items-center gap-2">
                          <Heart class="w-4 h-4 text-muted-foreground" />
                          <text class="text-sm">弹幕气泡样式</text>
                        </view>
                        <Badge variant="outline" class="text-[10px]">圆角气泡</Badge>
                      </view>
                    </view>
                  </Card>
                </TabsContent>
    
                <!--   -->
                <TabsContent value="effects" class="mt-4 space-y-4">
                  <!--   -->
                  <Card class="p-4">
                    <text class="text-sm font-medium mb-3">动效开关</text>
                    <view class="space-y-3">
                      
    <view v-for="(effect, index) in effects" :key="index"> (
                        <view 
                          key={effect.id}
                          class="flex items-center justify-between p-3 rounded-lg border border-border"
                        >
                          <view class="flex items-center gap-3">
                            <view class={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              effectSettings[effect.type as keyof typeof effectSettings] 
                                ? "bg-primary/10 text-primary" 
                                : "bg-secondary text-muted-foreground"
                            )}>
                              {effect.type === "enter" && <Users class="w-5 h-5" />}
                              {effect.type === "like" && <Heart class="w-5 h-5" />}
                              {effect.type === "gift" && <Gift class="w-5 h-5" />}
                              {effect.type === "danmaku" && <Sparkles class="w-5 h-5" />}
                            </view>
                            <view>
                              <text class="text-sm font-medium">{{ effect.name }}</text>
                              <text class="text-[10px] text-muted-foreground">{{ effect.desc }}</text>
                            </view>
                          </view>
                          <Switch 
                            :checked={{ effectSettings[effect.type as keyof typeof effectSettings] }}
                            onCheckedChange={() => toggleEffect(effect.type)}
                          />
                        </view>
                      ))}
                    </view>
                  </Card>
    
                  <!--   -->
                  <Card class="p-4">
                    <text class="text-sm font-medium mb-3">入场特效样式</text>
                    <view class="grid grid-cols-3 gap-2">
                      {["祥云入场", "金光闪烁", "简约淡入", "烟花绽放", "波纹扩散", "无特效"].map((style, idx) => (
                        <view 
                          key={{ style }}
                          class={cn(
                            "p-3 rounded-lg border text-center cursor-pointer transition-colors",
                            idx === 0 ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                          )}
                        >
                          <view class="w-8 h-8 rounded-full bg-secondary mx-auto mb-1.5 flex items-center justify-center text-sm">
                            {idx === 0 ? "☁️" : idx === 1 ? "✨" : idx === 2 ? "💫" : idx === 3 ? "🎆" : idx === 4 ? "🌊" : "⬜"}
                          </view>
                          <text class="text-[10px]">{{ style }}</text>
                        </view>
                      ))}
                    </view>
                  </Card>
    
                  <!--   -->
                  <Card class="p-4">
                    <text class="text-sm font-medium mb-3">点赞动效样式</text>
                    <view class="grid grid-cols-4 gap-2">
                      {["❤️ 爱心", "👍 点赞", "🌸 花瓣", "⭐ 星星"].map((style, idx) => (
                        <view 
                          key={{ style }}
                          class={cn(
                            "p-2 rounded-lg border text-center cursor-pointer transition-colors",
                            idx === 0 ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                          )}
                        >
                          <text class="text-xs">{{ style }}</text>
                        </view>
                      ))}
                    </view>
                  </Card>
                </TabsContent>
              </Tabs>
            </view>
    
            <!--   -->
            <view class="lg:w-80 p-4 lg:border-l border-border">
              <Card class="overflow-hidden">
                <view class="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30">
                  <text class="text-xs font-medium">实时预览</text>
                  <view class="flex items-center gap-1">
                    <view class="v0-btn" 
                      @click={() => setIsPreviewPlaying(!isPreviewPlaying)}
                      class="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary"
                    >
                      <template v-if="isPreviewPlaying">
    Pause class="w-3.5 h-3.5" /> : <Play class="w-3.5 h-3.5" />}
                    </view>
                    <view class="v0-btn" class="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary">
                      <RotateCcw class="w-3.5 h-3.5" />
                    </view>
                  </view>
                </view>
                
                <!--   -->
                <view class={cn(
                  "aspect-[9/16] relative overflow-hidden bg-gradient-to-br",
                  currentTheme.bgGradient
                )}>
                  <!--   -->
                  <view class="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <view class="flex items-center gap-2 px-2 py-1 bg-black/30 backdrop-blur-sm rounded-full">
                      <Avatar class="w-6 h-6 border border-white/30">
                        <AvatarFallback class="text-[10px]">主</AvatarFallback>
                      </Avatar>
                      <text class="text-white text-[10px]">主播昵称</text>
                    </view>
                    <view class="flex items-center gap-1 px-2 py-1 bg-black/30 backdrop-blur-sm rounded-full">
                      <Eye class="w-3 h-3 text-white/70" />
                      <text class="text-white text-[10px]">1.2万</text>
                    </view>
                  </view>
    
                  <!--   -->
                  {activePendants.includes(1) && (
                    <view class="absolute top-12 left-3 text-2xl opacity-80">福</view>
                  )}
                  {activePendants.includes(4) && (
                    <view class="absolute top-12 right-3 text-xl opacity-80">🪙</view>
                  )}
    
                  <!--   -->
                  <view class="absolute left-3 bottom-32 space-y-1.5 max-w-[70%]">
                    <view class="px-2 py-1 bg-black/40 backdrop-blur-sm rounded-full">
                      <text class="text-[10px] text-white">
                        <text class="text-amber-400 mr-1">用户A</text>
                        老师讲得真好！
                      </text>
                    </view>
                    <view class="px-2 py-1 bg-black/40 backdrop-blur-sm rounded-full">
                      <text class="text-[10px] text-white">
                        <text class="text-amber-400 mr-1">用户B</text>
                        涨知识了
                      </text>
                    </view>
                  </view>
    
                  <!--   -->
                  {effectSettings.like && isPreviewPlaying && (
                    <view class="absolute right-6 bottom-40 space-y-2 animate-ai-float">
                      <Heart class="w-5 h-5 text-red-500 fill-red-500 opacity-80" />
                      <Heart class="w-4 h-4 text-red-500 fill-red-500 opacity-60" />
                      <Heart class="w-3 h-3 text-red-500 fill-red-500 opacity-40" />
                    </view>
                  )}
    
                  <!--   -->
                  <view class="absolute bottom-3 left-3 right-3">
                    <view class="flex items-center gap-2">
                      <view class="flex-1 h-8 px-3 bg-white/10 backdrop-blur-sm rounded-full flex items-center">
                        <text class="text-[10px] text-white/50">说点什么...</text>
                      </view>
                      <view class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <Heart class="w-4 h-4 text-white" />
                      </view>
                      <view class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <Gift class="w-4 h-4 text-white" />
                      </view>
                    </view>
                  </view>
    
                  <!--   -->
                  <view class="absolute bottom-16 left-3 right-3">
                    <view 
                      class="h-1 rounded-full opacity-50"
                      :style=" backgroundColor: currentTheme.primaryColor }}
                    />
                  </view>
                </view>
              </Card>
    
              <!--   -->
              <Card class="mt-4 p-3">
                <text class="text-xs font-medium mb-2">当前配置</text>
                <view class="space-y-1.5 text-[10px] text-muted-foreground">
                  <view class="flex items-center justify-between">
                    <text>主题模版</text>
                    <text class="font-medium text-foreground">{{ currentTheme.name }}</text>
                  </view>
                  <view class="flex items-center justify-between">
                    <text>已启用挂件</text>
                    <text class="font-medium text-foreground">{{ activePendants.length }}个</text>
                  </view>
                  <view class="flex items-center justify-between">
                    <text>已启用动效</text>
                    <text class="font-medium text-foreground">
                      {{ Object.values(effectSettings).filter(Boolean).length }}个
                    </text>
                  </view>
                </view>
              </Card>
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-pb">
            <view class="flex gap-3">
              <Button variant="outline" class="flex-1">
                重置默认
              </Button>
              <Button class="flex-1">
                保存并应用
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
const themeTemplates = [
const pendants = [
const effects = [

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