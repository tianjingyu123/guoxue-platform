<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">publish</text>
      <text class="v0-route">V0: publish</text>
    </view>
        <view class="min-h-screen bg-background max-w-lg mx-auto">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
      <BackButton />
      <text class="font-semibold text-foreground">发布内容</text>
              <view class="v0-btn"
                :disabled={{ !canPublish }}
                class={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  canPublish
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                发布
              </view>
            </view>
          </view>
    
          <view class="p-4 pb-24 space-y-4">
            <!--   -->
            <view class="flex gap-2">
              
    <view v-for="(type, index) in contentTypes" :key="index"> {
                const Icon = type.icon
                const isActive = contentType === type.id
                return (
                  <view class="v0-btn"
                    key={{ type.id }}
                    @click={() => {
                      setContentType(type.id)
                      setUploadedMedia([])
                    }}
                    class={cn(
                      "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <Icon class={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                    <text class={cn("text-sm font-medium", isActive ? "text-primary" : "text-foreground")}>
                      {{ type.label }}
                    </text>
                    <text class="text-[10px] text-muted-foreground">{{ type.desc }}</text>
                  </view>
                )
              })}
            </view>
    
            <!--   -->
            {(contentType === "post" || contentType === "article") && (
              <input
                type="text"
                value={{ title }}
                @change={(e) => setTitle(e.target.value)}
                placeholder="请输入标题（选填）"
                class="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            )}
    
            <!--   -->
            {contentType === "video" && (
              <input
                type="text"
                value={{ title }}
                @change={(e) => setTitle(e.target.value)}
                placeholder="添加视频标题，获得更多曝光"
                class="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            )}
    
            <!--   -->
            {(contentType === "post" || contentType === "article") && (
              <view class="bg-card rounded-xl border border-border overflow-hidden">
                <!--   -->
                {contentType === "article" && (
                  <view class="flex items-center gap-1 px-3 py-2 border-b border-border bg-secondary/30">
                    <view class="v0-btn" class="p-2 rounded hover:bg-secondary transition-colors">
                      <Bold class="w-4 h-4 text-muted-foreground" />
                    </view>
                    <view class="v0-btn" class="p-2 rounded hover:bg-secondary transition-colors">
                      <Italic class="w-4 h-4 text-muted-foreground" />
                    </view>
                    <view class="v0-btn" class="p-2 rounded hover:bg-secondary transition-colors">
                      <List class="w-4 h-4 text-muted-foreground" />
                    </view>
                    <view class="v0-btn" class="p-2 rounded hover:bg-secondary transition-colors">
                      <Link2 class="w-4 h-4 text-muted-foreground" />
                    </view>
                    <view class="v0-btn" class="p-2 rounded hover:bg-secondary transition-colors">
                      <AlignLeft class="w-4 h-4 text-muted-foreground" />
                    </view>
                    <view class="flex-1" />
                    <view class="v0-btn" 
                      @click={() => setShowRecommendPanel(!showRecommendPanel)}
                      class="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Plus class="w-3 h-3" />
                      推荐卡片
                    </view>
                  </view>
                )}
                <textarea
                  value={{ content }}
                  @change={(e) => setContent(e.target.value)}
                  placeholder={contentType === "article" ? "开始撰写你的文章..." : "分享你的想法..."}
                  class="w-full min-h-[200px] px-4 py-3 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                />
              </view>
            )}
    
            <!--   -->
            {showRecommendPanel && contentType === "article" && (
              <Card class="p-4 bg-card border-primary/30">
                <text class="text-sm font-medium text-foreground mb-3">插入推荐卡片</text>
                <view class="grid grid-cols-5 gap-2">
                  
    <view v-for="(card, index) in recommendCardTypes" :key="index"> {
                    const Icon = card.icon
                    return (
                      <view class="v0-btn"
                        key={{ card.id }}
                        @click={() => handleInsertCard(card.id)}
                        class="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <view class={cn("w-10 h-10 rounded-full flex items-center justify-center", card.color)}>
                          <Icon class="w-5 h-5" />
                        </view>
                        <text class="text-xs text-foreground">{{ card.label }}</text>
                      </view>
                    )
                  })}
                </view>
              </Card>
            )}
    
            <!--   -->
            {contentType === "post" && (
              <view class="space-y-2">
                <view class="flex items-center justify-between">
                  <text class="text-sm text-muted-foreground">添加图片/视频</text>
                  <text class="text-xs text-muted-foreground">{{ uploadedMedia.length }}/9</text>
                </view>
                <view class="grid grid-cols-3 gap-2">
                  
    <view v-for="(media, index) in uploadedMedia" :key="index"> (
                    <view key={media.id} class="aspect-square relative bg-secondary rounded-lg overflow-hidden">
                      <view class="w-full h-full flex items-center justify-center">
                        {media.type === "video" ? (
                          <Video class="w-8 h-8 text-muted-foreground" />
                        ) : (
                          <ImageIcon class="w-8 h-8 text-muted-foreground" />
                        )}
                      </view>
                      <view class="v0-btn"
                        @click={() => handleRemoveMedia(media.id)}
                        class="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <X class="w-3 h-3 text-white" />
                      </view>
                    </view>
                  ))}
                  {uploadedMedia.length < 9 && (
                    <view class="v0-btn"
                      @click={{ handleAddMedia }}
                      class="aspect-square bg-secondary rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
                    >
                      <Plus class="w-6 h-6 text-muted-foreground" />
                      <text class="text-xs text-muted-foreground">添加</text>
                    </view>
                  )}
                </view>
              </view>
            )}
    
            <!--   -->
            {contentType === "video" && (
              <view class="space-y-4">
                <!--   -->
                <view class="space-y-2">
                  <text class="text-sm text-muted-foreground">上传视频</text>
                  {uploadedMedia.length === 0 ? (
                    <view class="v0-btn"
                      @click={{ handleAddMedia }}
                      class="w-full aspect-video bg-secondary rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                    >
                      <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Video class="w-6 h-6 text-primary" />
                      </view>
                      <text class="text-sm text-muted-foreground">点击上传视频</text>
                      <text class="text-xs text-muted-foreground">支持 MP4、MOV 格式，最大 500MB</text>
                    </view>
                  ) : (
                    <view class="relative aspect-video bg-secondary rounded-xl overflow-hidden">
                      <view class="w-full h-full flex items-center justify-center">
                        <Video class="w-12 h-12 text-muted-foreground" />
                      </view>
                      <Badge class="absolute top-2 left-2 bg-black/60 text-white text-xs">
                        {{ uploadedMedia[0].name }}
                      </Badge>
                      <view class="v0-btn"
                        @click={() => setUploadedMedia([])}
                        class="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <X class="w-4 h-4 text-white" />
                      </view>
                    </view>
                  )}
                </view>
    
                <!--   -->
                {uploadedMedia.length > 0 && (
                  <view class="space-y-2">
                    <text class="text-sm text-muted-foreground">选择封面</text>
                    <view class="flex gap-2">
                      {[1, 2, 3].map((i) => (
                        <view class="v0-btn"
                          key={{ i }}
                          @click={() => setVideoCover(String(i))}
                          class={cn(
                            "flex-1 aspect-video bg-secondary rounded-lg border-2 flex items-center justify-center transition-all",
                            videoCover === String(i) ? "border-primary" : "border-transparent"
                          )}
                        >
                          <text class="text-xs text-muted-foreground">第{{ i }}帧</text>
                        </view>
                      ))}
                      <view class="v0-btn" class="flex-1 aspect-video bg-secondary rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 hover:border-primary/50 transition-colors">
                        <Plus class="w-4 h-4 text-muted-foreground" />
                        <text class="text-[10px] text-muted-foreground">自定义</text>
                      </view>
                    </view>
                  </view>
                )}
    
                <!--   -->
                {uploadedMedia.length > 0 && (
                  <Card 
                    class="p-4 bg-card cursor-pointer hover:bg-secondary/50 transition-colors"
                    @click={() => setLinkedProducts([1])}
                  >
                    <view class="flex items-center justify-between">
                      <view class="flex items-center gap-3">
                        <view class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <ShoppingBag class="w-5 h-5 text-orange-500" />
                        </view>
                        <view>
                          <text class="text-sm font-medium text-foreground">关联商品</text>
                          <text class="text-xs text-muted-foreground">
                            {linkedProducts.length > 0 ? `已关联 ${linkedProducts.length} 件商品` : "从商城选择商品进行带货"}
                          </text>
                        </view>
                      </view>
                      <ChevronRight class="w-5 h-5 text-muted-foreground" />
                    </view>
                  </Card>
                )}
              </view>
            )}
    
            <!--   -->
            <Card 
              class="p-4 bg-card cursor-pointer hover:bg-secondary/50 transition-colors"
              @click={() => setShowCircleSelect(!showCircleSelect)}
            >
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-3">
                  <Avatar class="w-10 h-10">
                    <AvatarImage src={{ selectedCircle.avatar }} />
                    <AvatarFallback class="bg-primary/10 text-primary text-sm">
                      {{ selectedCircle.name[0] }}
                    </AvatarFallback>
                  </Avatar>
                  <view>
                    <text class="text-sm font-medium text-foreground">{{ selectedCircle.name }}</text>
                    <text class="text-xs text-muted-foreground">{{ selectedCircle.members }} 成员</text>
                  </view>
                </view>
                <view class="flex items-center gap-2">
                  <Badge variant="outline" class="text-xs border-primary/30 text-primary">
                    发布到此圈子
                  </Badge>
                  <ChevronRight class="w-5 h-5 text-muted-foreground" />
                </view>
              </view>
            </Card>
    
            <!--   -->
            {showCircleSelect && (
              <Card class="p-2 bg-card border-primary/30">
                
    <view v-for="(circle, index) in myCircles" :key="index"> (
                  <view class="v0-btn"
                    key={{ circle.id }}
                    @click={() => {
                      setSelectedCircle(circle)
                      setShowCircleSelect(false)
                    }}
                    class={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                      selectedCircle.id === circle.id ? "bg-primary/10" : "hover:bg-secondary"
                    )}
                  >
                    <Avatar class="w-8 h-8">
                      <AvatarFallback class="bg-primary/10 text-primary text-xs">
                        {{ circle.name[0] }}
                      </AvatarFallback>
                    </Avatar>
                    <view class="flex-1 text-left">
                      <text class="text-sm text-foreground">{{ circle.name }}</text>
                      <text class="text-xs text-muted-foreground">{{ circle.members }} 成员</text>
                    </view>
                    {selectedCircle.id === circle.id && (
                      <view class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <text class="text-white text-xs">✓</text>
                      </view>
                    )}
                  </view>
                ))}
              </Card>
            )}
    
            <!--   -->
            <Card class="bg-card overflow-hidden">
              <view class="v0-btn"
                @click={() => setShowSettings(!showSettings)}
                class="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
              >
                <view class="flex items-center gap-3">
                  <Settings2 class="w-5 h-5 text-muted-foreground" />
                  <text class="text-sm font-medium text-foreground">发布设置</text>
                </view>
                <ChevronRight class={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  showSettings && "rotate-90"
                )} />
              </view>
              
              {showSettings && (
                <view class="border-t border-border">
                  <!--   -->
                  <view class="flex items-center justify-between p-4 border-b border-border">
                    <view class="flex items-center gap-3">
                      <Clock class="w-5 h-5 text-muted-foreground" />
                      <view>
                        <text class="text-sm text-foreground">定时发布</text>
                        {scheduleEnabled && scheduleTime && (
                          <text class="text-xs text-primary">{{ scheduleTime }}</text>
                        )}
                      </view>
                    </view>
                    <view class="v0-btn"
                      @click={() => setScheduleEnabled(!scheduleEnabled)}
                      class={cn(
                        "w-11 h-6 rounded-full transition-colors relative",
                        scheduleEnabled ? "bg-primary" : "bg-secondary"
                      )}
                    >
                      <view class={cn(
                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                        scheduleEnabled ? "left-5" : "left-0.5"
                      )} />
                    </view>
                  </view>
                  
                  {scheduleEnabled && (
                    <view class="p-4 border-b border-border bg-secondary/30">
                      <view class="flex items-center gap-2">
                        <Calendar class="w-4 h-4 text-muted-foreground" />
                        <input
                          type="datetime-local"
                          value={{ scheduleTime }}
                          @change={(e) => setScheduleTime(e.target.value)}
                          class="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                        />
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  {contentType === "article" && (
                    <view class="flex items-center justify-between p-4">
                      <view class="flex items-center gap-3">
                        <Globe class="w-5 h-5 text-muted-foreground" />
                        <view>
                          <text class="text-sm text-foreground">推送到首页</text>
                          <text class="text-xs text-muted-foreground">需经平台审核</text>
                        </view>
                      </view>
                      <view class="v0-btn"
                        @click={() => setPushToHome(!pushToHome)}
                        class={cn(
                          "w-11 h-6 rounded-full transition-colors relative",
                          pushToHome ? "bg-primary" : "bg-secondary"
                        )}
                      >
                        <view class={cn(
                          "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                          pushToHome ? "left-5" : "left-0.5"
                        )} />
                      </view>
                    </view>
                  )}
                </view>
              )}
            </Card>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
            <view class="max-w-lg mx-auto flex items-center justify-between p-4">
              <view class="v0-btn" class="px-6 py-2.5 rounded-full border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors">
                存为草稿
              </view>
              <view class="v0-btn"
                :disabled={{ !canPublish }}
                class={cn(
                  "px-8 py-2.5 rounded-full text-sm font-medium transition-all",
                  canPublish
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {scheduleEnabled ? "定时发布" : "立即发布"}
              </view>
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
const contentTypes = [
const recommendCardTypes = [
const myCircles = [
    const newMedia: UploadedMedia = {

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