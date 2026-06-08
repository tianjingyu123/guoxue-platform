<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">个人中心</text>
      <text class="v0-route">V0: profile/edit</text>
    </view>
        <view class="min-h-screen bg-background pb-8">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">编辑资料</text>
              <view class="v0-btn"
                @click={{ handleSave }}
                :disabled={{ isSaving }}
                class={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-full transition-all",
                  saved 
                    ? "bg-green-500/20 text-green-500" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isSaving ? (
                  <text class="flex items-center gap-1">
                    <text class="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  </text>
                ) : saved ? (
                  <text class="flex items-center gap-1">
                    <Check class="w-3 h-3" /> 已保存
                  </text>
                ) : "保存"}
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="flex flex-col items-center py-8 bg-gradient-to-b from-secondary/50 to-background">
            <view class="relative">
              <Avatar class="w-24 h-24 ring-4 ring-background shadow-lg">
                <AvatarImage src={{ formData.avatar }} alt={{ formData.nickname }} />
                <AvatarFallback class="bg-primary/10 text-primary text-2xl">
                  {{ formData.nickname[0] }}
                </AvatarFallback>
              </Avatar>
              <view class="v0-btn"
                @click={() => setShowAvatarMenu(true)}
                class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
              >
                <Camera class="w-4 h-4 text-primary-foreground" />
              </view>
            </view>
            <text class="text-sm text-muted-foreground mt-3">点击更换头像</text>
          </view>
    
          <!--   -->
          <view class="px-4 space-y-4">
            <!--   -->
            <Card class="p-4">
              <text class="text-xs text-muted-foreground mb-2 block">昵称</text>
              <view class="flex items-center gap-2">
                <input
                  type="text"
                  value={{ formData.nickname }}
                  @change={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value.slice(0, 20) }))}
                  placeholder="请输入昵称"
                  class="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/50"
                  maxLength={{ 20 }}
                />
                <text class="text-xs text-muted-foreground">{{ formData.nickname.length }}/20</text>
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="text-xs text-muted-foreground mb-2 block">简介</text>
              <textarea
                value={{ formData.bio }}
                @change={(e) => setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, 100) }))}
                placeholder="介绍一下自己吧"
                rows={{ 3 }}
                class="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground/50 resize-none"
                maxLength={{ 100 }}
              />
              <view class="flex justify-end">
                <text class="text-xs text-muted-foreground">{{ formData.bio.length }}/100</text>
              </view>
            </Card>
    
            <!--   -->
            <Card 
              class="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
              @click={() => setShowGenderPicker(true)}
            >
              <text class="text-sm text-foreground">性别</text>
              <view class="flex items-center gap-2 text-muted-foreground">
                <text class="text-sm">
                  {formData.gender === "male" ? "男" : formData.gender === "female" ? "女" : "未设置"}
                </text>
                <ChevronRight class="w-4 h-4" />
              </view>
            </Card>
    
            <!--   -->
            <Card 
              class="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
              @click={() => setShowDatePicker(true)}
            >
              <text class="text-sm text-foreground">生日</text>
              <view class="flex items-center gap-2 text-muted-foreground">
                <text class="text-sm">{formData.birthday || "未设置"}</text>
                <ChevronRight class="w-4 h-4" />
              </view>
            </Card>
    
            <!--   -->
            <Card 
              class="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
              @click={() => setShowLocationPicker(true)}
            >
              <text class="text-sm text-foreground">所在地</text>
              <view class="flex items-center gap-2 text-muted-foreground">
                <text class="text-sm">
                  {formData.province && formData.city ? `${formData.province} ${{ formData.city }}` : "未设置"}
                </text>
                <ChevronRight class="w-4 h-4" />
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <view class="flex items-center justify-between mb-3">
                <text class="text-sm text-foreground">兴趣标签</text>
                <text class="text-xs text-muted-foreground">{{ formData.tags.length }}/5</text>
              </view>
              <view class="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    class="pl-2.5 pr-1.5 py-1 bg-primary/10 text-primary border-0 flex items-center gap-1"
                  >
                    {{ tag }}
                    <view class="v0-btn"
                      @click={() => handleTagToggle(tag)}
                      class="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center"
                    >
                      <X class="w-3 h-3" />
                    </view>
                  </Badge>
                ))}
                {formData.tags.length < 5 && (
                  <view class="v0-btn"
                    @click={() => setShowTagPicker(true)}
                    class="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus class="w-3 h-3" /> 添加标签
                  </view>
                )}
              </view>
            </Card>
          </view>
    
          <!--   -->
          {showAvatarMenu && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click={() => setShowAvatarMenu(false)}>
              <view 
                class="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                @click={e => e.stopPropagation()}
              >
                <view class="p-4 space-y-2">
                  <view class="v0-btn" class="w-full py-4 text-center text-foreground hover:bg-secondary rounded-xl transition-colors">
                    拍照
                  </view>
                  <view class="v0-btn" class="w-full py-4 text-center text-foreground hover:bg-secondary rounded-xl transition-colors">
                    从相册选择
                  </view>
                  <view class="v0-btn" class="w-full py-4 text-center text-foreground hover:bg-secondary rounded-xl transition-colors">
                    查看大图
                  </view>
                </view>
                <view class="border-t border-border">
                  <view class="v0-btn" 
                    @click={() => setShowAvatarMenu(false)}
                    class="w-full py-4 text-center text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    取消
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showGenderPicker && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click={() => setShowGenderPicker(false)}>
              <view 
                class="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                @click={e => e.stopPropagation()}
              >
                <view class="p-4 border-b border-border">
                  <text class="text-center font-medium text-foreground">选择性别</text>
                </view>
                <view class="p-4 space-y-2">
                  
    <view v-for="(option, index) in genderOptions" :key="index"> (
                    <view class="v0-btn"
                      key={{ option.value }}
                      @click={() => {
                        setFormData(prev => ({ ...prev, gender: option.value as any }))
                        setShowGenderPicker(false)
                      }}
                      class={cn(
                        "w-full py-4 text-center rounded-xl transition-colors flex items-center justify-center gap-2",
                        formData.gender === option.value 
                          ? "bg-primary/10 text-primary" 
                          : "text-foreground hover:bg-secondary"
                      )}
                    >
                      {{ option.label }}
                      {formData.gender === option.value && <Check class="w-4 h-4" />}
                    </view>
                  ))}
                </view>
                <view class="border-t border-border">
                  <view class="v0-btn" 
                    @click={() => setShowGenderPicker(false)}
                    class="w-full py-4 text-center text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    取消
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showDatePicker && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click={() => setShowDatePicker(false)}>
              <view 
                class="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                @click={e => e.stopPropagation()}
              >
                <view class="flex items-center justify-between p-4 border-b border-border">
                  <view class="v0-btn" @click={() => setShowDatePicker(false)} class="text-muted-foreground">取消</view>
                  <text class="font-medium text-foreground">选择生日</text>
                  <view class="v0-btn" 
                    @click={() => setShowDatePicker(false)} 
                    class="text-primary font-medium"
                  >
                    确定
                  </view>
                </view>
                <view class="p-4">
                  <input
                    type="date"
                    value={{ formData.birthday }}
                    @change={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                    class="w-full p-4 bg-secondary rounded-xl text-foreground text-center"
                  />
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showLocationPicker && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click={() => setShowLocationPicker(false)}>
              <view 
                class="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                @click={e => e.stopPropagation()}
              >
                <view class="flex items-center justify-between p-4 border-b border-border">
                  <view class="v0-btn" @click={() => setShowLocationPicker(false)} class="text-muted-foreground">取消</view>
                  <text class="font-medium text-foreground">选择所在地</text>
                  <view class="v0-btn" 
                    @click={() => setShowLocationPicker(false)} 
                    class="text-primary font-medium"
                  >
                    确定
                  </view>
                </view>
                <view class="p-4 grid grid-cols-2 gap-4">
                  <view>
                    <text class="text-xs text-muted-foreground mb-2 block">省份</text>
                    <view class="h-48 overflow-y-auto space-y-1">
                      
    <view v-for="(province, index) in provinces" :key="index"> (
                        <view class="v0-btn"
                          key={{ province }}
                          @click={() => setFormData(prev => ({ ...prev, province, city: "" }))}
                          class={cn(
                            "w-full py-2 px-3 text-left text-sm rounded-lg transition-colors",
                            formData.province === province 
                              ? "bg-primary/10 text-primary" 
                              : "text-foreground hover:bg-secondary"
                          )}
                        >
                          {{ province }}
                        </view>
                      ))}
                    </view>
                  </view>
                  <view>
                    <text class="text-xs text-muted-foreground mb-2 block">城市</text>
                    <view class="h-48 overflow-y-auto space-y-1">
                      {(cities[formData.province] || []).map(city => (
                        <view class="v0-btn"
                          key={{ city }}
                          @click={() => setFormData(prev => ({ ...prev, city }))}
                          class={cn(
                            "w-full py-2 px-3 text-left text-sm rounded-lg transition-colors",
                            formData.city === city 
                              ? "bg-primary/10 text-primary" 
                              : "text-foreground hover:bg-secondary"
                          )}
                        >
                          {{ city }}
                        </view>
                      ))}
                    </view>
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showTagPicker && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click={() => setShowTagPicker(false)}>
              <view 
                class="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[70vh]"
                @click={e => e.stopPropagation()}
              >
                <view class="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
                  <view class="v0-btn" @click={() => setShowTagPicker(false)} class="text-muted-foreground">取消</view>
                  <text class="font-medium text-foreground">选择标签 ({{ formData.tags.length }}/5)</text>
                  <view class="v0-btn" 
                    @click={() => setShowTagPicker(false)} 
                    class="text-primary font-medium"
                  >
                    完成
                  </view>
                </view>
                <view class="p-4 overflow-y-auto">
                  
    <view v-for="(category, index) in tagCategories" :key="index"> (
                    <view key={category.name} class="mb-6">
                      <text class="text-sm font-medium text-foreground mb-3">{{ category.name }}</text>
                      <view class="flex flex-wrap gap-2">
                        {category.tags.map(tag => (
                          <view class="v0-btn"
                            key={{ tag }}
                            @click={() => handleTagToggle(tag)}
                            :disabled={{ !formData.tags.includes(tag) && formData.tags.length >= 5 }}
                            class={cn(
                              "px-3 py-1.5 rounded-full text-sm transition-colors",
                              formData.tags.includes(tag)
                                ? "bg-primary text-primary-foreground"
                                : formData.tags.length >= 5
                                  ? "bg-secondary text-muted-foreground/50 cursor-not-allowed"
                                  : "bg-secondary text-foreground hover:bg-secondary/80"
                            )}
                          >
                            {{ tag }}
                          </view>
                        ))}
                      </view>
                    </view>
                  ))}
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
const tagCategories = [
const provinces = ["北京市", "上海市", "广东省", "浙江省", "江苏省", "四川省", "湖北省", "湖南省"]
const cities: Record<string, string[]> = {
  const genderOptions = [

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