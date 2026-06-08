<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: creator/live/create</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <BackButton />
                <text class="text-lg font-semibold">创建直播</text>
              </view>
              <Button variant="ghost" size="sm" class="text-muted-foreground">
                <Settings class="w-4 h-4 mr-1" />
                更多设置
              </Button>
            </view>
          </view>
    
          <view class="px-4 py-4 space-y-4">
            <!--   -->
            <Card class="p-4">
              <text class="text-sm font-semibold mb-4 flex items-center gap-2">
                <Video class="w-4 h-4 text-primary" />
                基础信息
              </text>
              
              <!--   -->
              <view class="flex gap-4 mb-4">
                <view class="relative">
                  {coverImage ? (
                    <view class="w-28 h-40 rounded-lg overflow-hidden relative group">
                      <image src={{ coverImage }} alt="封面" class="w-full h-full object-cover" />
                      <view class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="sm" variant="secondary" class="h-7 text-xs">更换</Button>
                      </view>
                    </view>
                  ) : (
                    <view class="v0-btn" class="w-28 h-40 rounded-lg border-2 border-dashed border-border bg-secondary/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-secondary/50 transition-colors">
                      <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Camera class="w-5 h-5 text-primary" />
                      </view>
                      <text class="text-xs text-muted-foreground">上传封面</text>
                      <text class="text-[10px] text-muted-foreground">9:16比例</text>
                    </view>
                  )}
                  <Badge class="absolute -top-2 -right-2 text-[10px] bg-primary border-0">必填</Badge>
                </view>
                
                <view class="flex-1 space-y-3">
                  <!--   -->
                  <view>
                    <Input
                      placeholder="输入直播标题（5-30字）"
                      value={{ title }}
                      @change={(e) => setTitle(e.target.value)}
                      class="text-sm"
                      maxLength={{ 30 }}
                    />
                    <text class="text-[10px] text-muted-foreground mt-1 text-right">{{ title.length }}/30</text>
                  </view>
                  
                  <!--   -->
                  <view class="flex gap-2">
                    <view class="v0-btn"
                      @click={() => setLiveType("knowledge")}
                      class={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors",
                        liveType === "knowledge" 
                          ? "border-primary bg-primary/5 text-primary" 
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <BookOpen class="w-3.5 h-3.5" />
                      知识授课
                    </view>
                    <view class="v0-btn"
                      @click={() => setLiveType("commerce")}
                      class={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors",
                        liveType === "commerce" 
                          ? "border-primary bg-primary/5 text-primary" 
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <ShoppingBag class="w-3.5 h-3.5" />
                      电商带货
                    </view>
                  </view>
                </view>
              </view>
              
              <!--   -->
              <Textarea
                placeholder="输入直播简介，让观众了解本场直播内容..."
                value={{ description }}
                @change={(e) => setDescription(e.target.value)}
                class="text-sm resize-none mb-4"
                rows={{ 2 }}
              />
              
              <!--   -->
              <view class="grid grid-cols-2 gap-3 mb-4">
                <view>
                  <text class="text-xs text-muted-foreground mb-1.5 block">开播时间</text>
                  <view class="relative">
                    <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="datetime-local"
                      value={{ startTime }}
                      @change={(e) => setStartTime(e.target.value)}
                      class="pl-9 text-sm"
                    />
                  </view>
                </view>
                <view>
                  <text class="text-xs text-muted-foreground mb-1.5 block">预计时长</text>
                  <view class="relative">
                    <Clock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      value={{ duration }}
                      @change={(e) => setDuration(e.target.value)}
                      class="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm appearance-none cursor-pointer"
                    >
                      <option value="30">30分钟</option>
                      <option value="60">1小时</option>
                      <option value="90">1.5小时</option>
                      <option value="120">2小时</option>
                      <option value="180">3小时</option>
                    </select>
                  </view>
                </view>
              </view>
              
              <!--   -->
              <view>
                <text class="text-xs text-muted-foreground mb-1.5 block">所属圈子</text>
                <view class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  
    <view v-for="(circle, index) in circleList" :key="index"> (
                    <view class="v0-btn"
                      key={{ circle.id }}
                      @click={() => setSelectedCircle(circle.id)}
                      class={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border flex-shrink-0 transition-colors",
                        selectedCircle === circle.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <Avatar class="w-6 h-6">
                        <AvatarFallback class="text-[10px] bg-primary/10 text-primary">{{ circle.name[0] }}</AvatarFallback>
                      </Avatar>
                      <text class="text-xs font-medium">{{ circle.name }}</text>
                    </view>
                  ))}
                </view>
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="text-sm font-semibold mb-4 flex items-center gap-2">
                <Radio class="w-4 h-4 text-primary" />
                推流模式
              </text>
              
              <view class="grid grid-cols-2 gap-3">
                <view class="v0-btn"
                  @click={() => setStreamMode("mobile")}
                  class={cn(
                    "relative p-4 rounded-xl border-2 transition-all",
                    streamMode === "mobile" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <view class="flex flex-col items-center gap-3">
                    <view class={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      streamMode === "mobile" ? "bg-primary text-white" : "bg-secondary"
                    )}>
                      <Smartphone class="w-6 h-6" />
                    </view>
                    <view class="text-center">
                      <text class="text-sm font-medium">手机/Web端</text>
                      <text class="text-[10px] text-muted-foreground mt-0.5">竖屏直播，适合展示人像</text>
                    </view>
                  </view>
                  {streamMode === "mobile" && (
                    <view class="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check class="w-3 h-3 text-white" />
                    </view>
                  )}
                </view>
                
                <view class="v0-btn"
                  @click={() => setStreamMode("obs")}
                  class={cn(
                    "relative p-4 rounded-xl border-2 transition-all",
                    streamMode === "obs" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <view class="flex flex-col items-center gap-3">
                    <view class={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      streamMode === "obs" ? "bg-primary text-white" : "bg-secondary"
                    )}>
                      <Monitor class="w-6 h-6" />
                    </view>
                    <view class="text-center">
                      <text class="text-sm font-medium">OBS推流</text>
                      <text class="text-[10px] text-muted-foreground mt-0.5">横屏授课，适合展示课件</text>
                    </view>
                  </view>
                  {streamMode === "obs" && (
                    <view class="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check class="w-3 h-3 text-white" />
                    </view>
                  )}
                  <Badge class="absolute top-2 left-2 text-[9px] bg-violet-500 border-0">专业</Badge>
                </view>
              </view>
              
              <!--   -->
              {streamMode === "obs" && (
                <view class="mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
                  <text class="text-xs text-muted-foreground mb-2">推流地址将在创建后生成，请使用OBS等推流软件进行直播。</text>
                  <Button size="sm" variant="outline" class="text-xs h-7">
                    查看OBS配置教程
                  </Button>
                </view>
              )}
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="text-sm font-semibold mb-4 flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-primary" />
                视觉与场景配置
              </text>
              
              <!--   -->
              <view class="mb-4">
                <view class="flex items-center justify-between mb-3">
                  <text class="text-xs font-medium">美颜调节</text>
                  <Button size="sm" variant="ghost" class="h-6 text-xs text-primary">
                    <Wand2 class="w-3 h-3 mr-1" />
                    一键美颜
                  </Button>
                </view>
                <view class="space-y-3">
                  {[
                    { key: "smooth", label: "磨皮", value: beautySettings.smooth },
                    { key: "thin", label: "瘦脸", value: beautySettings.thin },
                    { key: "whiten", label: "美白", value: beautySettings.whiten },
                  ].map(item => (
                    <view key={{ item.key }} class="flex items-center gap-3">
                      <text class="text-xs text-muted-foreground w-8">{{ item.label }}</text>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={{ item.value }}
                        @change={(e) => setBeautySettings(prev => ({ ...prev, [item.key]: parseInt(e.target.value) }))}
                        class="flex-1 h-1 bg-secondary rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                      />
                      <text class="text-xs text-muted-foreground w-8 text-right">{{ item.value }}%</text>
                    </view>
                  ))}
                </view>
              </view>
              
              <!--   -->
              <view class="mb-4">
                <text class="text-xs font-medium mb-2 block">滤镜效果</text>
                <view class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  
    <view v-for="(filter, index) in filterPresets" :key="index"> (
                    <view class="v0-btn"
                      key={{ filter.id }}
                      @click={() => setSelectedFilter(filter.value)}
                      class={cn(
                        "flex-shrink-0 w-14 text-center",
                      )}
                    >
                      <view class={cn(
                        "w-14 h-14 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 mb-1 border-2 transition-colors",
                        selectedFilter === filter.value ? "border-primary" : "border-transparent"
                      )} />
                      <text class={cn(
                        "text-[10px]",
                        selectedFilter === filter.value ? "text-primary font-medium" : "text-muted-foreground"
                      )}>{{ filter.name }}</text>
                    </view>
                  ))}
                </view>
              </view>
              
              <!--   -->
              <view class="mb-4">
                <view class="flex items-center justify-between mb-2">
                  <text class="text-xs font-medium">虚拟背景</text>
                  <view class="flex items-center gap-2">
                    <text class="text-[10px] text-muted-foreground">绿幕抠图</text>
                    <Switch :checked={{ enableGreenScreen }} onCheckedChange={{ setEnableGreenScreen }} />
                  </view>
                </view>
                <view class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  <view class="v0-btn" class="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                    <Plus class="w-4 h-4 text-muted-foreground" />
                    <text class="text-[9px] text-muted-foreground">上传</text>
                  </view>
                  
    <view v-for="(bg, index) in virtualBackgrounds" :key="index"> (
                    <view class="v0-btn"
                      key={{ bg.id }}
                      @click={() => setSelectedBackground(bg.id)}
                      class={cn(
                        "relative flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 border-2 transition-colors overflow-hidden",
                        selectedBackground === bg.id ? "border-primary" : "border-transparent"
                      )}
                    >
                      {bg.type === "video" && (
                        <view class="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center">
                          <Play class="w-2 h-2 text-white fill-white" />
                        </view>
                      )}
                      <text class="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] py-0.5 text-center">{{ bg.name }}</text>
                    </view>
                  ))}
                </view>
              </view>
              
              <!--   -->
              {streamMode === "obs" && (
                <view class="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <view class="flex items-center gap-2">
                    <Layers class="w-4 h-4 text-primary" />
                    <view>
                      <text class="text-xs font-medium">人像画中画</text>
                      <text class="text-[10px] text-muted-foreground">将主播人像叠加在课件上</text>
                    </view>
                  </view>
                  <Switch :checked={{ enablePIP }} onCheckedChange={{ setEnablePIP }} />
                </view>
              )}
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden">
              <view class="v0-btn"
                @click={() => setShowAdvanced(!showAdvanced)}
                class="w-full flex items-center justify-between p-4"
              >
                <text class="text-sm font-semibold flex items-center gap-2">
                  <Settings class="w-4 h-4 text-primary" />
                  高级功能配置
                </text>
                <template v-if="showAdvanced">
    ChevronUp class="w-4 h-4" /> : <ChevronDown class="w-4 h-4" />}
              </view>
              
              {showAdvanced && (
                <view class="px-4 pb-4 space-y-4">
                  <!--   -->
                  <view class="flex items-center justify-between">
                    <view class="flex items-center gap-2">
                      <Mic class="w-4 h-4 text-muted-foreground" />
                      <text class="text-xs">开启连麦</text>
                    </view>
                    <view class="flex items-center gap-2">
                      {{ enableConnect && (
                        <select
                          value={connectSlots }}
                          @change={(e) => setConnectSlots(parseInt(e.target.value))}
                          class="h-7 px-2 rounded border border-input bg-background text-xs"
                        >
                          <option value={{ 2 }}>2个麦位</option>
                          <option value={{ 4 }}>4个麦位</option>
                          <option value={{ 6 }}>6个麦位</option>
                        </select>
                      )}
                      <Switch :checked={{ enableConnect }} onCheckedChange={{ setEnableConnect }} />
                    </view>
                  </view>
                  
                  <!--   -->
                  <view class="flex items-center justify-between">
                    <view class="flex items-center gap-2">
                      <Crown class="w-4 h-4 text-muted-foreground" />
                      <text class="text-xs">付费观看</text>
                    </view>
                    <view class="flex items-center gap-2">
                      {isPaid && (
                        <Input
                          type="number"
                          placeholder="价格"
                          value={{ price }}
                          @change={(e) => setPrice(e.target.value)}
                          class="w-20 h-7 text-xs"
                        />
                      )}
                      <Switch :checked={{ isPaid }} onCheckedChange={{ setIsPaid }} />
                    </view>
                  </view>
                  
                  <!--   -->
                  <view class="flex items-center justify-between">
                    <view class="flex items-center gap-2">
                      <Play class="w-4 h-4 text-muted-foreground" />
                      <text class="text-xs">开启回放</text>
                    </view>
                    <Switch :checked={{ enableReplay }} onCheckedChange={{ setEnableReplay }} />
                  </view>
                  
                  <!--   -->
                  <view>
                    <text class="text-xs mb-2 block">直播间皮肤</text>
                    <view class="flex gap-2 overflow-x-auto scrollbar-hide">
                      
    <view v-for="(theme, index) in themeSkins" :key="index"> (
                        <view class="v0-btn"
                          key={{ theme.id }}
                          @click={() => setSelectedTheme(theme.id)}
                          class="flex-shrink-0 text-center"
                        >
                          <view class={cn(
                            "w-12 h-12 rounded-lg bg-gradient-to-br mb-1 border-2 transition-colors",
                            theme.color,
                            selectedTheme === theme.id ? "border-primary" : "border-transparent"
                          )} />
                          <text class={cn(
                            "text-[10px]",
                            selectedTheme === theme.id ? "text-primary font-medium" : "text-muted-foreground"
                          )}>{{ theme.name }}</text>
                        </view>
                      ))}
                    </view>
                  </view>
                  
                  <!--   -->
                  <view class="flex items-center justify-between">
                    <view class="flex items-center gap-2">
                      <Ban class="w-4 h-4 text-muted-foreground" />
                      <text class="text-xs">敏感词过滤</text>
                    </view>
                    <Switch :checked={{ enableFilter }} onCheckedChange={{ setEnableFilter }} />
                  </view>
                  
                  <!--   -->
                  <view class="flex items-center justify-between">
                    <view class="flex items-center gap-2">
                      <MessageSquare class="w-4 h-4 text-muted-foreground" />
                      <text class="text-xs">全员禁言</text>
                    </view>
                    <Switch :checked={{ enableMute }} onCheckedChange={{ setEnableMute }} />
                  </view>
                </view>
              )}
            </Card>
    
            <!--   -->
            {liveType === "commerce" && (
              <Card class="p-4">
                <view class="flex items-center justify-between mb-4">
                  <text class="text-sm font-semibold flex items-center gap-2">
                    <ShoppingBag class="w-4 h-4 text-primary" />
                    商品管理
                  </text>
                  <Button size="sm" variant="outline" class="h-7 text-xs" @click={() => setShowProductPicker(true)}>
                    <Plus class="w-3 h-3 mr-1" />
                    添加商品
                  </Button>
                </view>
                
                {selectedProducts.length === 0 ? (
                  <view class="py-8 text-center">
                    <ShoppingBag class="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <text class="text-sm text-muted-foreground">暂未添加商品</text>
                    <text class="text-xs text-muted-foreground mt-1">从商城选品添加到直播购物袋</text>
                  </view>
                ) : (
                  <view class="space-y-2">
                    
    <view v-for="(productId, index) in selectedProducts" :key="index"> {
                      const product = productList.find(p => p.id === productId)
                      if (!product) return null
                      return (
                        <view key={product.id} class="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                          <GripVertical class="w-4 h-4 text-muted-foreground cursor-move" />
                          <text class="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">{{ index + 1 }}</text>
                          <view class="w-12 h-12 rounded-lg bg-secondary" />
                          <view class="flex-1 min-w-0">
                            <text class="text-sm font-medium truncate">{{ product.name }}</text>
                            <text class="text-xs text-primary">¥{{ product.price }}</text>
                          </view>
                          {seckillProductId === product.id ? (
                            <Badge class="text-[10px] bg-red-500 border-0">秒杀</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              class="h-6 text-[10px] text-muted-foreground"
                              @click={() => setSeckillProductId(product.id)}
                            >
                              <Zap class="w-3 h-3 mr-0.5" />
                              设为秒杀
                            </Button>
                          )}
                          <view class="v0-btn" @click={() => setSelectedProducts(prev => prev.filter(id => id !== product.id))}>
                            <Trash2 class="w-4 h-4 text-muted-foreground hover:text-red-500 transition-colors" />
                          </view>
                        </view>
                      )
                    })}
                  </view>
                )}
              </Card>
            )}
    
            <!--   -->
            <Card class="p-4">
              <view class="flex items-center justify-between mb-4">
                <text class="text-sm font-semibold flex items-center gap-2">
                  <Users class="w-4 h-4 text-primary" />
                  直播团队管理
                </text>
                <Button size="sm" variant="outline" class="h-7 text-xs" @click={() => setShowHostPicker(true)}>
                  <UserPlus class="w-3 h-3 mr-1" />
                  添加成员
                </Button>
              </view>
              
              <!--   -->
              <view class="mb-4 p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                <text class="font-medium text-foreground mb-2">角色权限说明：</text>
                <view class="grid grid-cols-2 gap-2 text-muted-foreground">
                  <text><Badge class="mr-1 text-[8px] bg-red-500 border-0">主播</Badge>最高权限，管理所有</text>
                  <text><Badge class="mr-1 text-[8px] bg-orange-500 border-0">副播</Badge>推商品/券/抽奖/弹幕</text>
                  <text><Badge class="mr-1 text-[8px] bg-blue-500 border-0">场控</Badge>后台配置/数据监控</text>
                  <text><Badge class="mr-1 text-[8px] bg-green-500 border-0">嘉宾</Badge>仅参与连麦互动</text>
                </view>
              </view>
              
              <!--   -->
              <view class="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
                <Avatar class="w-10 h-10 border-2 border-primary">
                  <AvatarFallback class="bg-primary text-white">我</AvatarFallback>
                </Avatar>
                <view class="flex-1">
                  <view class="flex items-center gap-2">
                    <text class="text-sm font-medium">我</text>
                    <Badge class="text-[10px] bg-red-500 border-0">主播 Owner</Badge>
                  </view>
                  <text class="text-[10px] text-muted-foreground">创建/编辑/删除直播，管理所有成员，获取推流码</text>
                </view>
              </view>
              
              <!--   -->
              {hosts.length > 0 && (
                <view class="space-y-2">
                  
    <view v-for="(host, index) in hosts" :key="index"> {
                    const hostInfo = availableHosts.find(h => h.id === host.id)
                    if (!hostInfo) return null
                    const roleColor = host.role === "cohost" ? "bg-orange-500" : host.role === "operator" ? "bg-blue-500" : "bg-green-500"
                    const roleLabel = host.role === "cohost" ? "副播" : host.role === "operator" ? "场控" : "嘉宾"
                    const roleDesc = host.role === "cohost" ? "推送商品/优惠券/抽奖/弹幕管理" : host.role === "operator" ? "后台配置/数据监控/复盘" : "连麦互动"
                    return (
                      <view key={{ host.id }} class="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <Avatar class="w-10 h-10">
                          <AvatarFallback>{{ hostInfo.name[0] }}</AvatarFallback>
                        </Avatar>
                        <view class="flex-1">
                          <view class="flex items-center gap-2">
                            <text class="text-sm font-medium">{{ hostInfo.name }}</text>
                            <Badge class={cn("text-[10px] border-0", roleColor)}>{{ roleLabel }}</Badge>
                            {hostInfo.isOnline && <text class="w-1.5 h-1.5 rounded-full bg-green-500" />}
                          </view>
                          <text class="text-[10px] text-muted-foreground">{{ hostInfo.role }} · {{ roleDesc }}</text>
                        </view>
                        <view class="v0-btn" @click={() => setHosts(prev => prev.filter(h => h.id !== host.id))}>
                          <X class="w-4 h-4 text-muted-foreground hover:text-red-500 transition-colors" />
                        </view>
                      </view>
                    )
                  })}
                </view>
              )}
              
              {hosts.length === 0 && (
                <text class="text-xs text-muted-foreground text-center py-4">
                  添加团队成员来协助管理直播间。副播可推送商品/优惠券/抽奖，场控负责后台配置和数据监控。
                </text>
              )}
            </Card>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-pb">
            <view class="flex items-center gap-3 p-4">
              <Button variant="outline" class="flex-1" @click={() => router.back()}>
                保存草稿
              </Button>
              <Button class="flex-1 bg-primary hover:bg-primary/90">
                <Radio class="w-4 h-4 mr-2" />
                创建直播
              </Button>
            </view>
          </view>
    
          <!--   -->
          {showProductPicker && (
            <view class="fixed inset-0 z-50 bg-black/50" @click={() => setShowProductPicker(false)}>
              <view 
                class="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
                @click={e => e.stopPropagation()}
              >
                <view class="flex items-center justify-between p-4 border-b border-border">
                  <text class="font-semibold">选择商品</text>
                  <view class="v0-btn" @click={() => setShowProductPicker(false)}>
                    <X class="w-5 h-5" />
                  </view>
                </view>
                <view class="p-4">
                  <view class="relative mb-4">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="搜索商品" class="pl-9" />
                  </view>
                  <view class="space-y-2 max-h-[50vh] overflow-y-auto">
                    
    <view v-for="(product, index) in productList" :key="index"> (
                      <view class="v0-btn"
                        key={{ product.id }}
                        @click={() => {
                          if (selectedProducts.includes(product.id)) {
                            setSelectedProducts(prev => prev.filter(id => id !== product.id))
                          } else {
                            setSelectedProducts(prev => [...prev, product.id])
                           }}
                        class={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          selectedProducts.includes(product.id) 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <view class="w-14 h-14 rounded-lg bg-secondary flex-shrink-0" />
                        <view class="flex-1 text-left">
                          <text class="text-sm font-medium">{{ product.name }}</text>
                          <text class="text-xs text-primary">¥{{ product.price }}</text>
                          <text class="text-[10px] text-muted-foreground">库存 {{ product.stock }}</text>
                        </view>
                        <view class={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          selectedProducts.includes(product.id) 
                            ? "border-primary bg-primary" 
                            : "border-border"
                        )}>
                          {selectedProducts.includes(product.id) && <Check class="w-3 h-3 text-white" />}
                        </view>
                      </view>
                    ))}
                  </view>
                </view>
                <view class="p-4 border-t border-border">
                  <Button class="w-full" @click={() => setShowProductPicker(false)}>
                    确定添加 ({{ selectedProducts.length }})
                  </Button>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showHostPicker && (
            <view class="fixed inset-0 z-50 bg-black/50" @click={() => setShowHostPicker(false)}>
              <view 
                class="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
                @click={e => e.stopPropagation()}
              >
                <view class="flex items-center justify-between p-4 border-b border-border">
                  <text class="font-semibold">添加团队成员</text>
                  <view class="v0-btn" @click={() => setShowHostPicker(false)}>
                    <X class="w-5 h-5" />
                  </view>
                </view>
                <view class="p-4">
                  <view class="relative mb-4">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="搜索圈子成员或签约讲师" 
                      class="pl-9"
                      value={{ hostSearchQuery }}
                      @change={(e) => setHostSearchQuery(e.target.value)}
                    />
                  </view>
                  
                  <!--   -->
                  <view class="mb-4 p-2.5 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
                    <text class="font-medium text-foreground mb-1">选择成员后请指定角色：</text>
                    <text>· 副播：推送商品/优惠券/抽奖/弹幕管理</text>
                    <text>· 场控：后台配置/数据监控/复盘</text>
                    <text>· 嘉宾：仅参与连麦互动</text>
                  </view>
                  
                  <text class="text-xs text-muted-foreground mb-3">从圈子成员中选择</text>
                  <view class="space-y-2 max-h-[40vh] overflow-y-auto">
                    
    <view v-for="(host, index) in availableHosts" :key="index"> {
                      const addedHost = hosts.find(h => h.id === host.id)
                      const isAdded = !!addedHost
                      return (
                        <view
                          key={host.id}
                          class={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                            isAdded ? "border-primary bg-primary/5" : "border-border"
                          )}
                        >
                          <view class="relative">
                            <Avatar class="w-10 h-10">
                              <AvatarFallback>{{ host.name[0] }}</AvatarFallback>
                            </Avatar>
                            {host.isOnline && (
                              <text class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
                            )}
                          </view>
                          <view class="flex-1">
                            <view class="flex items-center gap-2">
                              <text class="text-sm font-medium">{{ host.name }}</text>
                              <Badge variant="secondary" class="text-[10px]">{{ host.role }}</Badge>
                              {host.isOnline && <text class="text-[10px] text-green-500">在线</text>}
                            </view>
                            <!--   -->
                            {isAdded ? (
                              <view class="flex items-center gap-1.5 mt-1">
                                {["cohost", "operator", "guest"].map(role => {
                                  const roleInfo = {
                                    cohost: { label: "副播", color: "bg-orange-500" },
                                    operator: { label: "场控", color: "bg-blue-500" },
                                    guest: { label: "嘉宾", color: "bg-green-500" },
                                  }[role]!
                                  return (
                                    <view class="v0-btn"
                                      key={{ role }}
                                      @click={() => setHosts(prev => prev.map(h => h.id === host.id ? { ...h, role } : h))}
                                      class={cn(
                                        "px-2 py-0.5 rounded text-[10px] transition-colors",
                                        addedHost?.role === role ? `${{ roleInfo.color }} text-white` : "bg-secondary text-muted-foreground"
                                      )}
                                    >
                                      {{ roleInfo.label }}
                                    </view>
                                  )
                                })}
                              </view>
                            ) : (
                              <text class="text-[10px] text-muted-foreground mt-0.5">点击添加到团队</text>
                            )}
                          </view>
                          <view class="v0-btn"
                            @click={() => {
                              if (isAdded) {
                                setHosts(prev => prev.filter(h => h.id !== host.id))
                              } else {
                                setHosts(prev => [...prev, { id: host.id, role: "cohost" }])
                               }}
                            class={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                              isAdded ? "border-primary bg-primary" : "border-border hover:border-primary/50"
                            )}
                          >
                            <template v-if="isAdded">
    Check class="w-3.5 h-3.5 text-white" /> : <Plus class="w-3.5 h-3.5 text-muted-foreground" />}
                          </view>
                        </view>
                      )
                    })}
                  </view>
                </view>
                <view class="p-4 border-t border-border">
                  <Button class="w-full" @click={() => setShowHostPicker(false)}>
                    完成添加 ({{ hosts.length }}人)
                  </Button>
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
const circleList = [
const filterPresets = [
const virtualBackgrounds = [
const themeSkins = [
const productList = [
const availableHosts = [
                const roleColor = host.role === "cohost" ? "bg-orange-500" : host.role === "operator" ? "bg-blue-500" : "bg-green-500"
                const roleLabel = host.role === "cohost" ? "副播" : host.role === "operator" ? "场控" : "嘉宾"
                const roleDesc = host.role === "cohost" ? "推送商品/优惠券/抽奖/弹幕管理" : host.role === "operator" ? "后台配置/数据监控/复盘" : "连麦互动"
                              const roleInfo = {

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