<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商家中心</text>
      <text class="v0-route">V0: merchant/products</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <view class="flex items-center gap-3">
                <Link href="/merchant/dashboard">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="text-lg font-semibold">商品管理</text>
              </view>
              <Link href="/merchant/product-edit">
                <Button size="sm" class="gap-1">
                  <Plus class="w-4 h-4" />
                  发布商品
                </Button>
              </Link>
            </view>
          </view>
          
          <!--   -->
          <view class="p-4 space-y-3">
            <view class="flex gap-2">
              <view class="relative flex-1">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="搜索商品名称" 
                  value={{ searchQuery }}
                  @change={e => setSearchQuery(e.target.value)}
                  class="pl-9"
                />
              </view>
              <Button variant="outline" size="icon">
                <Filter class="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ArrowUpDown class="w-4 h-4" />
              </Button>
            </view>
            
            <!--   -->
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
              <TabsList class="w-full grid grid-cols-4 h-9">
                <TabsTrigger value="all" class="text-xs">全部({{ stats.all }})</TabsTrigger>
                <TabsTrigger value="online" class="text-xs">已上架({{ stats.online }})</TabsTrigger>
                <TabsTrigger value="offline" class="text-xs">已下架({{ stats.offline }})</TabsTrigger>
                <TabsTrigger value="soldout" class="text-xs">已售罄({{ stats.soldout }})</TabsTrigger>
              </TabsList>
            </Tabs>
          </view>
          
          <!--   -->
          <view class="px-4 space-y-3">
            
    <view v-for="(product, index) in filteredProducts" :key="index"> (
              <Card key={product.id} class="p-3">
                <view class="flex gap-3">
                  <!--   -->
                  <view class="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 relative">
                    <text class="text-2xl">📦</text>
                    <input 
                      type="checkbox"
                      :checked={{ selectedProducts.includes(product.id) }}
                      @change={() => toggleSelect(product.id)}
                      class="absolute top-1 left-1 w-4 h-4 rounded"
                    />
                  </view>
                  
                  <!--   -->
                  <view class="flex-1 min-w-0">
                    <view class="flex items-start justify-between gap-2">
                      <text class="text-sm font-medium text-foreground line-clamp-2">{{ product.title }}</text>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" class="w-7 h-7 flex-shrink-0">
                            <MoreHorizontal class="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye class="w-4 h-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/merchant/product-edit?id=${product.id}`}>
                              <Edit class="w-4 h-4 mr-2" />
                              编辑商品
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {product.status === "online" ? "下架商品" : "上架商品"}
                          </DropdownMenuItem>
                          <DropdownMenuItem class="text-destructive" @click={() => handleDeleteClick({ id: product.id, title: product.title })}>
                            <Trash2 class="w-4 h-4 mr-2" />
                            删除商品
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </view>
                    
                    <view class="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" class="text-[10px]">{{ product.category }}</Badge>
                      <Badge class={cn("text-[10px]", statusConfig[product.status as keyof typeof statusConfig].color)}>
                        {{ statusConfig[product.status as keyof typeof statusConfig].label }}
                      </Badge>
                    </view>
                    
                    <view class="flex items-center justify-between mt-2">
                      <!--   -->
                      {editingProduct === product.id && editingField === "price" ? (
                        <view class="flex items-center gap-1">
                          <text class="text-sm">¥</text>
                          <Input
                            type="number"
                            value={{ editValue }}
                            @change={e => setEditValue(e.target.value)}
                            class="w-20 h-7 text-sm"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" class="w-6 h-6" @click={{ saveQuickEdit }} :disabled={{ isSaving }}>
                            <template v-if="isSaving">
    Loader2 class="w-3 h-3 animate-spin" /> : <Check class="w-3 h-3 text-green-600" />}
                          </Button>
                          <Button size="icon" variant="ghost" class="w-6 h-6" @click={{ cancelQuickEdit }}>
                            <X class="w-3 h-3 text-red-500" />
                          </Button>
                        </view>
                      ) : (
                        <view class="v0-btn" 
                          class="flex items-baseline gap-1 hover:bg-secondary/50 rounded px-1 -ml-1 transition-colors"
                          @click={() => startQuickEdit(product.id, "price", product.price)}
                        >
                          <text class="text-base font-bold text-primary">¥{{ product.price }}</text>
                          {product.originalPrice && (
                            <text class="text-xs text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
                          )}
                          <Edit class="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </view>
                      )}
                    </view>
                    
                    <view class="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <!--   -->
                      {editingProduct === product.id && editingField === "stock" ? (
                        <view class="flex items-center gap-1">
                          <text>库存:</text>
                          <Input
                            type="number"
                            value={{ editValue }}
                            @change={e => setEditValue(e.target.value)}
                            class="w-16 h-6 text-xs"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" class="w-5 h-5" @click={{ saveQuickEdit }} :disabled={{ isSaving }}>
                            <template v-if="isSaving">
    Loader2 class="w-3 h-3 animate-spin" /> : <Check class="w-3 h-3 text-green-600" />}
                          </Button>
                          <Button size="icon" variant="ghost" class="w-5 h-5" @click={{ cancelQuickEdit }}>
                            <X class="w-3 h-3 text-red-500" />
                          </Button>
                        </view>
                      ) : (
                        <view class="v0-btn" 
                          class="hover:bg-secondary/50 rounded px-1 -ml-1 transition-colors"
                          @click={() => startQuickEdit(product.id, "stock", product.stock)}
                        >
                          库存: <text class={product.stock === 0 ? "text-red-500" : ""}>{{ product.stock }}</text>
                          <Edit class="w-3 h-3 ml-0.5 inline opacity-0 group-hover:opacity-100" />
                        </view>
                      )}
                      <text>销量: {{ product.sales }}</text>
                    </view>
                  </view>
                </view>
              </Card>
            ))}
            
            {filteredProducts.length === 0 && (
              <view class="py-20 text-center">
                <text class="text-muted-foreground">暂无商品</text>
                <Link href="/merchant/product-edit">
                  <Button class="mt-4">发布第一个商品</Button>
                </Link>
              </view>
            )}
          </view>
          
          <!--   -->
          {selectedProducts.length > 0 && (
            <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
              <view class="flex items-center justify-between">
                <text class="text-sm text-muted-foreground">
                  已选择 {{ selectedProducts.length }} 件商品
                </text>
                <view class="flex gap-2">
                  <Button variant="outline" size="sm">批量下架</Button>
                  <Button variant="destructive" size="sm">批量删除</Button>
                </view>
              </view>
            </view>
          )}
          
          <!--   -->
          <AlertDialog open={{ deleteDialogOpen }} onOpenChange={{ setDeleteDialogOpen }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除商品？</AlertDialogTitle>
                <AlertDialogDescription>
                  您即将删除商品「{{ deleteTarget?.title }}」，删除后将无法恢复。确定要继续吗？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel :disabled={{ isDeleting }}>取消</AlertDialogCancel>
                <AlertDialogAction 
                  @click={{ handleDeleteConfirm }} 
                  :disabled={{ isDeleting }}
                  class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <template v-if="isDeleting">
    Loader2 class="w-4 h-4 mr-2 animate-spin" /> : null}
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const products = [
const statusConfig = {
  const stats = {

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