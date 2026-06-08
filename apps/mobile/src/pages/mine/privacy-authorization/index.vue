<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/privacy-authorization</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                <ChevronLeft class="w-5 h-5" />
              </view>
              <text class="font-semibold">隐私授权管理</text>
              <view class="w-9" />
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            <!--   -->
            <view class="bg-blue-50 rounded-2xl p-4">
              <view class="flex gap-3">
                <view class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield class="w-5 h-5 text-blue-600" />
                </view>
                <view class="flex-1">
                  <text class="font-medium text-blue-900">隐私保护说明</text>
                  <text class="text-sm text-blue-700 mt-1">
                    我们重视您的隐私。以下权限仅在您主动使用相关功能时请求，
                    您可以随时在此管理授权状态。
                  </text>
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="bg-card rounded-2xl p-4 shadow-sm">
              <view class="flex items-center justify-between">
                <view>
                  <text class="text-sm text-muted-foreground">已授权权限</text>
                  <text class="text-2xl font-bold text-foreground">
                    {{ authorizedCount }}<text class="text-base font-normal text-muted-foreground">/{{ permissions.length }}</text>
                  </text>
                </view>
                <view class="flex -space-x-2">
                  {permissions.filter(p => ['authorized', 'always', 'while_using'].includes(p.status)).slice(0, 4).map(p => (
                    <view key={{ p.id }} class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center border-2 border-white">
                      <view class="text-green-600">{{ p.icon }}</view>
                    </view>
                  ))}
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="bg-card rounded-2xl shadow-sm overflow-hidden">
              <view class="p-4 border-b border-border">
                <text class="font-medium">权限列表</text>
              </view>
              <view class="divide-y divide-border">
                
    <view v-for="(permission, index) in permissions" :key="index"> (
                  <view class="v0-btn"
                    key={{ permission.id }}
                    @click={() => handlePermissionClick(permission)}
                    class="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <view class={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      ['authorized', 'always', 'while_using'].includes(permission.status)
                        ? 'bg-green-100 text-green-600'
                        : permission.status === 'denied'
                        ? 'bg-red-100 text-red-500'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {{ permission.icon }}
                    </view>
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2">
                        <text class="font-medium">{{ permission.name }}</text>
                        {permission.required && (
                          <text class="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">必需</text>
                        )}
                      </view>
                      <text class="text-sm text-muted-foreground truncate mt-0.5">
                        {{ permission.description }}
                      </text>
                    </view>
                    <view class="flex items-center gap-2">
                      <text class={`text-xs px-2 py-1 rounded-full ${getStatusColor(permission.status)}`}>
                        {{ getStatusText(permission.status) }}
                      </text>
                      <ChevronRight class="w-4 h-4 text-muted-foreground" />
                    </view>
                  </view>
                ))}
              </view>
            </view>
    
            <!--   -->
            <view class="bg-amber-50 rounded-2xl p-4">
              <view class="flex gap-3">
                <Info class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <view class="text-sm text-amber-800">
                  <text class="font-medium mb-1">温馨提示</text>
                  <view class="space-y-1 text-amber-700">
                    <view>• 拒绝授权不会影响基础功能使用</view>
                    <view>• 部分功能需要对应权限才能正常工作</view>
                    <view>• 您可以随时在系统设置中修改权限</view>
                  </view>
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="v0-btn" 
              @click={() => {
                // 模拟跳转系统设置
                alert('即将跳转到系统设置...')
              }}
              class="w-full p-4 bg-card rounded-2xl shadow-sm flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <view class="flex items-center gap-3">
                <view class="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <Settings class="w-5 h-5 text-muted-foreground" />
                </view>
                <text class="font-medium">前往系统设置</text>
              </view>
              <ChevronRight class="w-5 h-5 text-muted-foreground" />
            </view>
          </view>
    
          <!--   -->
          {showAuthDialog && selectedPermission && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/50" @click={() => setShowAuthDialog(false)}>
              <view 
                class="w-full max-w-lg bg-background rounded-t-3xl animate-in slide-in-from-bottom duration-300"
                @click={e => e.stopPropagation()}
              >
                <view class="p-6">
                  <!--   -->
                  <view class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <view class="text-primary scale-150">{{ selectedPermission.icon }}</view>
                  </view>
    
                  <text class="text-xl font-bold text-center mb-2">
                    允许访问{{ selectedPermission.name }}？
                  </text>
                  <text class="text-center text-muted-foreground mb-4">
                    {{ selectedPermission.purpose }}
                  </text>
    
                  <!--   -->
                  <view class="bg-muted rounded-xl p-4 mb-6">
                    <view class="flex items-start gap-3">
                      <CheckCircle class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <view class="text-sm">
                        <text class="font-medium text-foreground">数据安全承诺</text>
                        <text class="text-muted-foreground mt-1">
                          我们仅在您使用相关功能时访问此权限，不会在后台收集或上传您的数据。
                        </text>
                      </view>
                    </view>
                  </view>
    
                  <!--   -->
                  {selectedPermission.degradedFeature && (
                    <view class="bg-amber-50 rounded-xl p-3 mb-6 flex items-start gap-2">
                      <AlertCircle class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <text class="text-sm text-amber-700">
                        如果拒绝授权，{{ selectedPermission.degradedFeature }}
                      </text>
                    </view>
                  )}
    
                  <!--   -->
                  <view class="space-y-3">
                    {selectedPermission.id === 'location' ? (
                      
                        <view class="v0-btn"
                          @click={() => handleAuthorize('always')}
                          class="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium"
                        >
                          始终允许
                        </view>
                        <view class="v0-btn"
                          @click={() => handleAuthorize('while_using')}
                          class="w-full h-12 bg-primary/10 text-primary rounded-xl font-medium"
                        >
                          仅在使用应用期间允许
                        </view>
                      
                    ) : (
                      <view class="v0-btn"
                        @click={() => handleAuthorize('authorized')}
                        class="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium"
                      >
                        允许
                      </view>
                    )}
                    <view class="v0-btn"
                      @click={() => handleAuthorize('deny')}
                      class="w-full h-12 text-muted-foreground rounded-xl font-medium"
                    >
                      不允许
                    </view>
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showDeniedDialog && selectedPermission && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click={() => setShowDeniedDialog(false)}>
              <view 
                class="w-full max-w-sm bg-background rounded-2xl animate-in zoom-in-95 duration-200"
                @click={e => e.stopPropagation()}
              >
                <view class="p-6 text-center">
                  <view class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle class="w-7 h-7 text-green-600" />
                  </view>
                  <text class="text-lg font-bold mb-2">已授权 {{ selectedPermission.name }}</text>
                  <text class="text-sm text-muted-foreground mb-6">
                    如需修改权限状态，请前往系统设置中的应用权限管理进行修改。
                  </text>
                  <view class="flex gap-3">
                    <view class="v0-btn"
                      @click={() => setShowDeniedDialog(false)}
                      class="flex-1 h-11 bg-muted rounded-xl font-medium"
                    >
                      取消
                    </view>
                    <view class="v0-btn"
                      @click={() => {
                        setShowDeniedDialog(false)
                        alert('即将跳转到系统设置...')
                      }}
                      class="flex-1 h-11 bg-primary text-primary-foreground rounded-xl font-medium"
                    >
                      前往设置
                    </view>
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