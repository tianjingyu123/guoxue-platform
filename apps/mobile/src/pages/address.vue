<template>
  <view class="page v0-page" data-v0-route="address">
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
      <view class="flex items-center justify-between px-4 h-14">
      <BackButton fallbackPath="/profile" />
      <text class="h1" class="font-semibold text-base text-foreground">收货地址</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-3">
            {addresses.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <MapPin class="w-8 h-8 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground text-sm">暂无收货地址</text>
                <text class="text-muted-foreground/70 text-xs mt-1">添加地址后可快速下单</text>
              </view>
            ) : (
              addresses.map(address => (
                <view
                  key={address.id}
                  class="relative overflow-hidden"
                  onTouchStart={() => setSwipedId(null)}
                >
                  <!--   -->
                  <view 
                    class="v0-class"
                    @click={() => setShowDeleteConfirm(address.id)}
                  >
                    <Trash2 class="w-5 h-5 text-destructive-foreground" />
                  </view>
                  
                  <Card 
                    class="v0-class"
                    @click={() => {
                      if (swipedId === address.id) {
                        setSwipedId(null)
                      } else {{ setSwipedId(address.id) } }}
                  >
                    <view class="flex items-start justify-between">
                      <view class="flex-1 min-w-0">
                        <!--   -->
                        <view class="flex items-center gap-3 mb-2">
                          <text class="font-semibold text-foreground">{{ address.name }}</text>
                          <text class="text-sm text-muted-foreground">{{ address.phone }}</text>
                          {{ address.isDefault && (
                            <Badge class="text-[10px] px-1.5 py-0 bg-accent/20 text-accent border-0">
                              默认
                            </Badge>
                          ) }}
                        </view>
                        
                        <!--   -->
                        <text class="text-sm text-muted-foreground leading-relaxed">
                          {{ address.province }}{{ address.city !== address.province ? address.city : "" }}{{ address.district }}{{ address.street }}{{ address.detail }}
                        </text>
                      </view>
                      
                      <!--   -->
                      <view class="v0-btn"
                        @click={(e) => {
                          e.stopPropagation()
                          openEditModal(address)
                        }}
                        class="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 class="w-4 h-4" />
                      </view>
                    </view>
                    
                    <!--   -->
                    {!address.isDefault && (
                      <view class="v0-btn"
                        @click={(e) => {
                          e.stopPropagation()
                          handleSetDefault(address.id)
                        }}
                        class="mt-3 pt-3 border-t border-border w-full text-left text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        设为默认地址
                      </view>
                    )}
                  </Card>
                </view>
              ))
            )}
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-pb">
            <view class="v0-btn"
              @click={() => openEditModal()}
              class="w-full py-3 bg-primary text-primary-foreground font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Plus class="w-5 h-5" />
              新增收货地址
            </view>
          </view>
    
          <!--   -->
          {showDeleteConfirm !== null && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <Card class="w-full max-w-sm p-6 text-center">
                <text class="h3" class="font-semibold text-lg text-foreground mb-2">确认删除</text>
                <text class="text-sm text-muted-foreground mb-6">删除后将无法恢复，确定要删除这个地址吗？</text>
                <view class="flex gap-3">
                  <view class="v0-btn"
                    @click={() => setShowDeleteConfirm(null)}
                    class="flex-1 py-2.5 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    取消
                  </view>
                  <view class="v0-btn"
                    @click={() => handleDelete(showDeleteConfirm)}
                    class="flex-1 py-2.5 bg-destructive text-destructive-foreground font-medium rounded-xl hover:bg-destructive/90 transition-colors"
                  >
                    删除
                  </view>
                </view>
              </Card>
            </view>
          )}
    
          <!--   -->
          {showEditModal && (
            <view class="fixed inset-0 z-50 bg-background">
              <!--   -->
              <view class="sticky top-0 z-40 bg-background border-b border-border safe-area-pt">
                <view class="flex items-center justify-between px-4 h-14">
                  <view class="v0-btn"
                    @click={() => setShowEditModal(false)}
                    class="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
                  >
                    <X class="w-5 h-5 text-foreground" />
                  </view>
                  <text class="h1" class="font-semibold text-base text-foreground">
                    {{ editingAddress ? "编辑地址" : "新增地址" }}
                  </text>
                  <view class="v0-btn"
                    @click={{ handleSave }}
                    :disabled={{ !formData.name || !formData.phone || !formData.province || !formData.detail }}
                    class="text-sm text-primary font-medium disabled:text-muted-foreground"
                  >
                    保存
                  </view>
                </view>
              </view>
    
              <view class="p-4 space-y-4">
                <!--   -->
                <view>
                  <text class="text-sm text-muted-foreground mb-1.5 block">收件人</text>
                  <input
                    type="text"
                    value={{ formData.name }}
                    @change={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入收件人���名"
                    class="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </view>
    
                <!--   -->
                <view>
                  <text class="text-sm text-muted-foreground mb-1.5 block">手机号</text>
                  <input
                    type="tel"
                    value={{ formData.phone }}
                    @change={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="请输入手机号码"
                    class="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </view>
    
                <!--   -->
                <view>
                  <text class="text-sm text-muted-foreground mb-1.5 block">所在地区</text>
                  <view class="v0-btn"
                    @click={() => {
                      setRegionStep("province")
                      setShowRegionPicker(true)
                    }}
                    class="w-full px-4 py-3 bg-secondary rounded-xl text-left flex items-center justify-between"
                  >
                    <text class="v0-class">
                      {{ formData.province ? `${formData.province }} ${{ formData.city }} ${{ formData.district }}` : "请选择省/市/区"}
                    </text>
                    <ChevronRight class="w-4 h-4 text-muted-foreground" />
                  </view>
                </view>
    
                <!--   -->
                <view>
                  <text class="text-sm text-muted-foreground mb-1.5 block">详细地址</text>
                  <textarea
                    value={{ formData.detail }}
                    @change={(e) => setFormData(prev => ({ ...prev, detail: e.target.value }))}
                    placeholder="街道、楼牌号等"
                    rows={{ 3 }}
                    class="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </view>
    
                <!--   -->
                <view class="flex items-center justify-between py-3">
                  <text class="text-sm text-foreground">设为默认地址</text>
                  <view class="v0-btn"
                    @click={() => setFormData(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                    class="v0-class"
                  >
                    <view class="v0-class" />
                  </view>
                </view>
              </view>
    
              <!--   -->
              {showRegionPicker && (
                <view class="fixed inset-0 z-50 flex items-end bg-black/60">
                  <view class="w-full bg-card rounded-t-2xl max-h-[60vh] flex flex-col">
                    <view class="flex items-center justify-between px-4 py-3 border-b border-border">
                      <view class="v0-btn"
                        @click={() => {
                          if (regionStep === "city") {
                            setRegionStep("province")
                          } else if (regionStep === "district") {{ setRegionStep("city") }} else {{ setShowRegionPicker(false) } }}
                        class="text-sm text-muted-foreground"
                      >
                        {{ regionStep === "province" ? "取消" : "返回" }}
                      </view>
                      <text class="h3" class="font-medium text-foreground">
                        {{ regionStep === "province" ? "选择省份" : regionStep === "city" ? "选择城市" : "选择区县" }}
                      </text>
                      <view class="w-10" />
                    </view>
                    <view class="flex-1 overflow-y-auto">
                      {getCurrentRegionOptions().map(option => (
                        <view class="v0-btn"
                          key={option}
                          @click={() => handleSelectRegion(option)}
                          class="w-full px-4 py-3 text-left text-foreground hover:bg-secondary transition-colors flex items-center justify-between"
                        >
                          <text>{{ option }}</text>
                          {{ ((regionStep === "province" && formData.province === option) ||
                            (regionStep === "city" && formData.city === option) ||
                            (regionStep === "district" && formData.district === option)) && (
                            <Check class="w-4 h-4 text-primary" />
                          ) }}
                        </view>
                      ))}
                    </view>
                  </view>
                </view>
              )}
            </view>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API - V0 路由: address
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.v0-page {
  padding: 24rpx;
}

/* 按钮样式 */
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 列表项 */
.v0-li {
  padding: 24rpx;
  border-bottom: 1px solid #E8E0D5;
}

/* 分隔线 */
.hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>