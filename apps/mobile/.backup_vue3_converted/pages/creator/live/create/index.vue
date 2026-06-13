<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1 -ml-1">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="text-lg font-semibold text-foreground">创建直播</text>
        </view>
        <view class="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs text-muted-foreground rounded-md hover:bg-secondary/50 transition-colors">
          <text>⚙️</text>
          <text>更多设置</text>
        </view>
      </view>
    </view>

    <!-- ===== 主体内容 ===== -->
    <view class="px-4 py-4 space-y-4">
      <!-- ===== 基础信息区 ===== -->
      <view class="bg-white rounded-xl p-4 border border-border">
        <view class="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
          <text></text>
          <text>基础信息</text>
        </view>

        <!-- 封面上传 -->
        <view class="flex gap-4 mb-4">
          <view class="relative">
            <template v-if="coverImage">
              <view class="w-28 h-40 rounded-lg overflow-hidden relative group">
                <image :src="coverImage" mode="aspectFill" class="w-full h-full" />
                <view class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <view class="inline-flex items-center justify-center px-2 h-7 text-xs rounded-md bg-secondary text-foreground font-medium">更换</view>
                </view>
              </view>
            </template>
            <template v-else>
              <view class="w-28 h-40 rounded-lg border-2 border-dashed border-border bg-secondary/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-secondary/50 transition-colors">
                <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <text class="text-lg text-primary"></text>
                </view>
                <text class="text-xs text-muted-foreground">上传封面</text>
                <text class="text-[10px] text-muted-foreground">9:16比例</text>
              </view>
            </template>
            <view class="absolute -top-2 -right-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary text-white border-0">必填</view>
          </view>

          <view class="flex-1 space-y-3">
            <!-- 直播标题 -->
            <view>
              <input
                v-model="title"
                placeholder="输入直播标题（5-30字）"
                maxlength="30"
                class="w-full h-10 px-3 text-sm rounded-md border border-border bg-background outline-none focus:border-primary/50"
              />
              <text class="text-[10px] text-muted-foreground mt-1 block text-right">{{ title.length }}/30</text>
            </view>

            <!-- 直播类型 -->
            <view class="flex gap-2">
              <view
                @click="liveType = 'knowledge'"
                :class="[
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors',
                  liveType === 'knowledge'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border'
                ]"
              >
                <text></text>
                <text>知识授课</text>
              </view>
              <view
                @click="liveType = 'commerce'"
                :class="[
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors',
                  liveType === 'commerce'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border'
                ]"
              >
                <text></text>
                <text>电商带货</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 直播简介 -->
        <textarea
          v-model="description"
          placeholder="输入直播简介，让观众了解本场直播内容..."
          class="w-full px-3 py-2 text-sm rounded-md border border-border bg-background outline-none resize-none mb-4 min-h-[3rem]"
          rows="2"
        />

        <!-- 时间设置 -->
        <view class="grid grid-cols-2 gap-3 mb-4">
          <view>
            <text class="text-xs text-muted-foreground mb-1.5 block">开播时间</text>
            <view class="relative">
              <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
              <input
                type="datetime-local"
                v-model="startTime"
                class="w-full h-10 pl-9 pr-3 text-sm rounded-md border border-border bg-background outline-none"
              />
            </view>
          </view>
          <view>
            <text class="text-xs text-muted-foreground mb-1.5 block">预计时长</text>
            <view class="relative">
              <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">🕐</text>
              <picker mode="selector" :range="durationLabels" :value="durationIndex" @change="onDurationChange" class="w-full h-10 pl-9 pr-3 flex items-center text-sm rounded-md border border-border bg-background">
                <text>{{ durationLabels[durationIndex] }}</text>
              </picker>
            </view>
          </view>
        </view>

        <!-- 所属圈子 -->
        <view>
          <text class="text-xs text-muted-foreground mb-1.5 block">所属圈子</text>
          <view class="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] pb-1">
            <view
              v-for="circle in circleList"
              :key="circle.id"
              @click="selectedCircle = circle.id"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-lg border flex-shrink-0 transition-colors',
                selectedCircle === circle.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              ]"
            >
              <view class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <text class="text-[10px] text-primary font-medium">{{ circle.name[0] }}</text>
              </view>
              <text class="text-xs font-medium text-foreground">{{ circle.name }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ===== 推流模式区 ===== -->
      <view class="bg-white rounded-xl p-4 border border-border">
        <view class="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
          <text>📻</text>
          <text>推流模式</text>
        </view>

        <view class="grid grid-cols-2 gap-3">
          <view
            @click="streamMode = 'mobile'"
            :class="[
              'relative p-4 rounded-xl border-2 transition-all',
              streamMode === 'mobile'
                ? 'border-primary bg-primary/5'
                : 'border-border'
            ]"
          >
            <view class="flex flex-col items-center gap-3">
              <view :class="['w-12 h-12 rounded-xl flex items-center justify-center', streamMode === 'mobile' ? 'bg-primary text-white' : 'bg-secondary text-foreground']">
                <text class="text-xl"></text>
              </view>
              <view class="text-center">
                <text class="text-sm font-medium block text-foreground">手机/Web端</text>
                <text class="text-[10px] text-muted-foreground mt-0.5 block">竖屏直播，适合展示人像</text>
              </view>
            </view>
            <view v-if="streamMode === 'mobile'" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <text class="text-xs text-white font-bold">✓</text>
            </view>
          </view>

          <view
            @click="streamMode = 'obs'"
            :class="[
              'relative p-4 rounded-xl border-2 transition-all',
              streamMode === 'obs'
                ? 'border-primary bg-primary/5'
                : 'border-border'
            ]"
          >
            <view class="flex flex-col items-center gap-3">
              <view :class="['w-12 h-12 rounded-xl flex items-center justify-center', streamMode === 'obs' ? 'bg-primary text-white' : 'bg-secondary text-foreground']">
                <text class="text-xl">🖥</text>
              </view>
              <view class="text-center">
                <text class="text-sm font-medium block text-foreground">OBS推流</text>
                <text class="text-[10px] text-muted-foreground mt-0.5 block">横屏授课，适合展示课件</text>
              </view>
            </view>
            <view v-if="streamMode === 'obs'" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <text class="text-xs text-white font-bold">✓</text>
            </view>
            <view class="absolute top-2 left-2 inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-[#8B5CF6] text-white border-0">专业</view>
          </view>
        </view>

        <!-- OBS模式下显示推流地址 -->
        <view v-if="streamMode === 'obs'" class="mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
          <text class="text-xs text-muted-foreground mb-2 block">推流地址将在创建后生成，请使用OBS等推流软件进行直播。</text>
          <view class="inline-flex items-center justify-center h-7 px-3 text-xs rounded-md border border-border bg-background text-foreground font-medium">
            查看OBS配置教程
          </view>
        </view>
      </view>

      <!-- ===== 视觉与场景配置区 ===== -->
      <view class="bg-white rounded-xl p-4 border border-border">
        <view class="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
          <text></text>
          <text>视觉与场景配置</text>
        </view>

        <!-- 美颜设置 -->
        <view class="mb-4">
          <view class="flex items-center justify-between mb-3">
            <text class="text-xs font-medium text-foreground">美颜调节</text>
            <view class="inline-flex items-center justify-center gap-1 h-6 text-xs text-primary rounded-md bg-transparent">
              <text class="text-xs"></text>
              <text @click="applyOneClickBeauty">一键美颜</text>
            </view>
          </view>
          <view class="space-y-3">
            <view v-for="item in beautyItems" :key="item.key" class="flex items-center gap-3">
              <text class="text-xs text-muted-foreground w-8">{{ item.label }}</text>
              <input
                type="range"
                min="0"
                max="100"
                :value="item.value"
                @input="updateBeauty(item.key, parseInt(($event.target as HTMLInputElement).value))"
                class="flex-1 h-1 appearance-none cursor-pointer rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
                style="background: #F5F1EB"
              />
              <text class="text-xs text-muted-foreground w-8 text-right">{{ item.value }}%</text>
            </view>
          </view>
        </view>

        <!-- 滤镜选择 -->
        <view class="mb-4">
          <text class="text-xs font-medium mb-2 block text-foreground">滤镜效果</text>
          <view class="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] pb-1">
            <view v-for="filter in filterPresets" :key="filter.id" @click="selectedFilter = filter.value" class="flex-shrink-0 w-14 text-center">
              <view :class="['w-14 h-14 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 mb-1 border-2 transition-colors', selectedFilter === filter.value ? 'border-primary' : 'border-transparent']" />
              <text :class="['text-[10px]', selectedFilter === filter.value ? 'text-primary font-medium' : 'text-muted-foreground']">{{ filter.name }}</text>
            </view>
          </view>
        </view>

        <!-- 虚拟背景 -->
        <view class="mb-4">
          <view class="flex items-center justify-between mb-2">
            <text class="text-xs font-medium text-foreground">虚拟背景</text>
            <view class="flex items-center gap-2">
              <text class="text-[10px] text-muted-foreground">绿幕抠图</text>
              <view @click="enableGreenScreen = !enableGreenScreen" :class="['w-9 h-5 rounded-full relative transition-colors', enableGreenScreen ? 'bg-primary' : 'bg-[#E8E0D5]']">
                <view :class="['absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', enableGreenScreen ? 'translate-x-4' : '']" />
              </view>
            </view>
          </view>
          <view class="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] pb-1">
            <view class="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
              <text class="text-sm text-muted-foreground">➕</text>
              <text class="text-[9px] text-muted-foreground">上传</text>
            </view>
            <view
              v-for="bg in virtualBackgrounds"
              :key="bg.id"
              @click="selectedBackground = bg.id"
              :class="[
                'relative flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 border-2 transition-colors overflow-hidden',
                selectedBackground === bg.id ? 'border-primary' : 'border-transparent'
              ]"
            >
              <view v-if="bg.type === 'video'" class="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center">
                <text class="text-white" style="font-size: 6px;">▶</text>
              </view>
              <view class="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] py-0.5 text-center">{{ bg.name }}</view>
            </view>
          </view>
        </view>

        <!-- OBS模式下的画中画设置 -->
        <view v-if="streamMode === 'obs'" class="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <view class="flex items-center gap-2">
            <text class="text-sm text-primary">🗃</text>
            <view>
              <text class="text-xs font-medium block text-foreground">人像画中画</text>
              <text class="text-[10px] text-muted-foreground block">将主播人像叠加在课件上</text>
            </view>
          </view>
          <view @click="enablePIP = !enablePIP" :class="['w-9 h-5 rounded-full relative transition-colors', enablePIP ? 'bg-primary' : 'bg-[#E8E0D5]']">
            <view :class="['absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', enablePIP ? 'translate-x-4' : '']" />
          </view>
        </view>
      </view>

      <!-- ===== 高级功能配置区（折叠） ===== -->
      <view class="bg-white rounded-xl border border-border overflow-hidden">
        <view @click="showAdvanced = !showAdvanced" class="w-full flex items-center justify-between p-4">
          <view class="text-sm font-semibold flex items-center gap-2 text-foreground">
            <text>⚙️</text>
            <text>高级功能配置</text>
          </view>
          <text class="text-sm text-foreground transition-transform" :class="showAdvanced ? 'rotate-180' : ''">▼</text>
        </view>

        <view v-if="showAdvanced" class="px-4 pb-4 space-y-4">
          <!-- 连麦设置 -->
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground"></text>
              <text class="text-xs text-foreground">开启连麦</text>
            </view>
            <view class="flex items-center gap-2">
              <picker
                v-if="enableConnect"
                mode="selector"
                :range="connectSlotsLabels"
                :value="connectSlotsIndex"
                @change="onConnectSlotsChange"
                class="h-7 px-2 flex items-center text-xs rounded border border-border bg-background"
              >
                <text>{{ connectSlotsLabels[connectSlotsIndex] }}</text>
              </picker>
              <view @click="enableConnect = !enableConnect" :class="['w-9 h-5 rounded-full relative transition-colors', enableConnect ? 'bg-primary' : 'bg-[#E8E0D5]']">
                <view :class="['absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', enableConnect ? 'translate-x-4' : '']" />
              </view>
            </view>
          </view>

          <!-- 付费设置 -->
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground">👑</text>
              <text class="text-xs text-foreground">付费观看</text>
            </view>
            <view class="flex items-center gap-2">
              <input
                v-if="isPaid"
                v-model="price"
                type="number"
                placeholder="价格"
                class="w-20 h-7 text-xs px-2 rounded border border-border bg-background outline-none"
              />
              <view @click="isPaid = !isPaid" :class="['w-9 h-5 rounded-full relative transition-colors', isPaid ? 'bg-primary' : 'bg-[#E8E0D5]']">
                <view :class="['absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', isPaid ? 'translate-x-4' : '']" />
              </view>
            </view>
          </view>

          <!-- 回放设置 -->
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground">▶️</text>
              <text class="text-xs text-foreground">开启回放</text>
            </view>
            <view @click="enableReplay = !enableReplay" :class="['w-9 h-5 rounded-full relative transition-colors', enableReplay ? 'bg-primary' : 'bg-[#E8E0D5]']">
              <view :class="['absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', enableReplay ? 'translate-x-4' : '']" />
            </view>
          </view>

          <!-- 直播间主题 -->
          <view>
            <text class="text-xs mb-2 block text-foreground">直播间皮肤</text>
            <view class="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              <view v-for="theme in themeSkins" :key="theme.id" @click="selectedTheme = theme.id" class="flex-shrink-0 text-center">
                <view :class="['w-12 h-12 rounded-lg bg-gradient-to-br mb-1 border-2 transition-colors', theme.color, selectedTheme === theme.id ? 'border-primary' : 'border-transparent']" />
                <text :class="['text-[10px]', selectedTheme === theme.id ? 'text-primary font-medium' : 'text-muted-foreground']">{{ theme.name }}</text>
              </view>
            </view>
          </view>

          <!-- 敏感词过滤 -->
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground"></text>
              <text class="text-xs text-foreground">敏感词过滤</text>
            </view>
            <view @click="enableFilter = !enableFilter" :class="['w-9 h-5 rounded-full relative transition-colors', enableFilter ? 'bg-primary' : 'bg-[#E8E0D5]']">
              <view :class="['absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', enableFilter ? 'translate-x-4' : '']" />
            </view>
          </view>

          <!-- 观众禁言 -->
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground"></text>
              <text class="text-xs text-foreground">全员禁言</text>
            </view>
            <view @click="enableMute = !enableMute" :class="['w-9 h-5 rounded-full relative transition-colors', enableMute ? 'bg-primary' : 'bg-[#E8E0D5]']">
              <view :class="['absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', enableMute ? 'translate-x-4' : '']" />
            </view>
          </view>
        </view>
      </view>

      <!-- ===== 商品管理区（电商带货可见） ===== -->
      <view v-if="liveType === 'commerce'" class="bg-white rounded-xl p-4 border border-border">
        <view class="flex items-center justify-between mb-4">
          <view class="text-sm font-semibold flex items-center gap-2 text-foreground">
            <text></text>
            <text>商品管理</text>
          </view>
          <view @click="showProductPicker = true" class="inline-flex items-center justify-center gap-1 h-7 px-3 text-xs rounded-md border border-border bg-background text-foreground font-medium">
            <text class="text-xs">➕</text>
            <text>添加商品</text>
          </view>
        </view>

        <template v-if="selectedProducts.length === 0">
          <view class="py-8 text-center">
            <text class="text-2xl text-muted-foreground/30 block mb-2"></text>
            <text class="text-sm text-muted-foreground block">暂未添加商品</text>
            <text class="text-xs text-muted-foreground mt-1 block">从商城选品添加到直播购物袋</text>
          </view>
        </template>
        <template v-else>
          <view class="space-y-2">
            <view v-for="(productId, index) in selectedProducts" :key="productId" class="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
              <text class="text-sm text-muted-foreground">⣿</text>
              <view class="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">{{ index + 1 }}</view>
              <view class="w-12 h-12 rounded-lg bg-secondary" />
              <view class="flex-1 min-w-0">
                <text class="text-sm font-medium block text-foreground truncate">{{ getProduct(productId)?.name }}</text>
                <text class="text-xs text-primary block">¥{{ getProduct(productId)?.price }}</text>
              </view>
              <template v-if="seckillProductId === productId">
                <view class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500 text-white border-0">秒杀</view>
              </template>
              <template v-else>
                <view @click="seckillProductId = productId" class="inline-flex items-center justify-center gap-0.5 h-6 text-[10px] text-muted-foreground rounded-md bg-transparent">
                  <text class="text-xs">⚡</text>
                  <text>设为秒杀</text>
                </view>
              </template>
              <view @click="removeProduct(productId)">
                <text class="text-sm text-muted-foreground hover:text-red-500 transition-colors">🗑</text>
              </view>
            </view>
          </view>
        </template>
      </view>

      <!-- ===== 直播团队管理区 ===== -->
      <view class="bg-white rounded-xl p-4 border border-border">
        <view class="flex items-center justify-between mb-4">
          <view class="text-sm font-semibold flex items-center gap-2 text-foreground">
            <text></text>
            <text>直播团队管理</text>
          </view>
          <view @click="showHostPicker = true" class="inline-flex items-center justify-center gap-1 h-7 px-3 text-xs rounded-md border border-border bg-background text-foreground font-medium">
            <text class="text-[10px]">➕</text>
            <text>添加成员</text>
          </view>
        </view>

        <!-- 角色权限说明 -->
        <view class="mb-4 p-3 rounded-lg bg-secondary/50 text-xs space-y-1">
          <text class="font-medium text-foreground mb-2 block">角色权限说明：</text>
          <view class="grid grid-cols-2 gap-2 text-muted-foreground">
            <text><view class="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium bg-red-500 text-white mr-1">主播</view>最高权限，管理所有</text>
            <text><view class="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium bg-orange-500 text-white mr-1">副播</view>推商品/券/抽奖/弹幕</text>
            <text><view class="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium bg-blue-500 text-white mr-1">场控</view>后台配置/数据监控</text>
            <text><view class="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium bg-green-500 text-white mr-1">嘉宾</view>仅参与连麦互动</text>
          </view>
        </view>

        <!-- 当前用户（主播/Owner） -->
        <view class="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
          <view class="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 border-2 border-primary">
            <text class="text-sm text-white font-medium">我</text>
          </view>
          <view class="flex-1">
            <view class="flex items-center gap-2">
              <text class="text-sm font-medium text-foreground">我</text>
              <view class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500 text-white border-0">主播 Owner</view>
            </view>
            <text class="text-[10px] text-muted-foreground block">创建/编辑/删除直播，管理所有成员，获取推流码</text>
          </view>
        </view>

        <!-- 已添加的团队成员 -->
        <view v-if="hosts.length > 0" class="space-y-2">
          <view v-for="host in hosts" :key="host.id" class="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
            <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <text class="text-sm text-primary font-medium">{{ getHostInfo(host.id)?.name[0] }}</text>
            </view>
            <view class="flex-1">
              <view class="flex items-center gap-2">
                <text class="text-sm font-medium text-foreground">{{ getHostInfo(host.id)?.name }}</text>
                <view :class="['inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white border-0', getRoleColor(host.role)]">{{ getRoleLabel(host.role) }}</view>
                <view v-if="getHostInfo(host.id)?.isOnline" class="w-1.5 h-1.5 rounded-full bg-green-500" />
              </view>
              <text class="text-[10px] text-muted-foreground block">{{ getHostInfo(host.id)?.role }} · {{ getRoleDesc(host.role) }}</text>
            </view>
            <view @click="removeHost(host.id)">
              <text class="text-sm text-muted-foreground hover:text-red-500 transition-colors">✖</text>
            </view>
          </view>
        </view>

        <view v-if="hosts.length === 0">
          <text class="text-xs text-muted-foreground block text-center py-4">添加团队成员来协助管理直播间。副播可推送商品/优惠券/抽奖，场控负责后台配置和数据监控。</text>
        </view>
      </view>
    </view>

    <!-- ===== 底部操作栏 ===== -->
    <view class="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
      <view class="flex items-center gap-3 p-4">
        <view @click="goBack" class="flex-1 inline-flex items-center justify-center h-10 px-4 text-sm rounded-md border border-border bg-background text-foreground font-medium">
          保存草稿
        </view>
        <view class="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 text-sm rounded-md bg-primary text-white font-medium">
          <text class="text-sm">📻</text>
          <text>创建直播</text>
        </view>
      </view>
    </view>

    <!-- ===== 商品选择弹窗 ===== -->
    <view v-if="showProductPicker" class="fixed inset-0 z-50 bg-black/50" @click="showProductPicker = false">
      <view
        class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-hidden animate-[slide-up_0.3s_ease-out]"
        @click.stop
      >
        <view class="flex items-center justify-between p-4 border-b border-border">
          <text class="font-semibold text-foreground">选择商品</text>
          <view @click="showProductPicker = false">
            <text class="text-lg text-foreground">✖</text>
          </view>
        </view>
        <view class="p-4">
          <view class="relative mb-4">
            <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
            <input placeholder="搜索商品" class="w-full h-10 pl-9 pr-3 text-sm rounded-md border border-border bg-background outline-none" />
          </view>
          <view class="space-y-2 max-h-[50vh] overflow-y-auto">
            <view
              v-for="product in productList"
              :key="product.id"
              @click="toggleProduct(product.id)"
              :class="[
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors',
                selectedProducts.includes(product.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              ]"
            >
              <view class="w-14 h-14 rounded-lg bg-secondary flex-shrink-0" />
              <view class="flex-1 text-left">
                <text class="text-sm font-medium block text-foreground">{{ product.name }}</text>
                <text class="text-xs text-primary block">¥{{ product.price }}</text>
                <text class="text-[10px] text-muted-foreground block">库存 {{ product.stock }}</text>
              </view>
              <view :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors', selectedProducts.includes(product.id) ? 'border-primary bg-primary' : 'border-border']">
                <text v-if="selectedProducts.includes(product.id)" class="text-xs text-white font-bold">✓</text>
              </view>
            </view>
          </view>
        </view>
        <view class="p-4 border-t border-border">
          <view @click="showProductPicker = false" class="w-full inline-flex items-center justify-center h-10 text-sm rounded-md bg-primary text-white font-medium">
            确定添加 ({{ selectedProducts.length }})
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 主播选择弹窗 ===== -->
    <view v-if="showHostPicker" class="fixed inset-0 z-50 bg-black/50" @click="showHostPicker = false">
      <view
        class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-hidden animate-[slide-up_0.3s_ease-out]"
        @click.stop
      >
        <view class="flex items-center justify-between p-4 border-b border-border">
          <text class="font-semibold text-foreground">添加团队成员</text>
          <view @click="showHostPicker = false">
            <text class="text-lg text-foreground">✖</text>
          </view>
        </view>
        <view class="p-4">
          <view class="relative mb-4">
            <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
            <input
              v-model="hostSearchQuery"
              placeholder="搜索圈子成员或签约讲师"
              class="w-full h-10 pl-9 pr-3 text-sm rounded-md border border-border bg-background outline-none"
            />
          </view>

          <!-- 角色选择说明 -->
          <view class="mb-4 p-2.5 rounded-lg bg-secondary/50 text-[11px] text-muted-foreground">
            <text class="font-medium text-foreground mb-1 block">选择成员后请指定角色：</text>
            <text class="block">· 副播：推送商品/优惠券/抽奖/弹幕管理</text>
            <text class="block">· 场控：后台配置/数据监控/复盘</text>
            <text class="block">· 嘉宾：仅参与连麦互动</text>
          </view>

          <text class="text-xs text-muted-foreground mb-3 block">从圈子成员中选择</text>
          <view class="space-y-2 max-h-[40vh] overflow-y-auto">
            <view
              v-for="host in availableHosts"
              :key="host.id"
              :class="[
                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                isHostAdded(host.id) ? 'border-primary bg-primary/5' : 'border-border'
              ]"
            >
              <view class="relative">
                <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <text class="text-sm text-primary font-medium">{{ host.name[0] }}</text>
                </view>
                <view v-if="host.isOnline" class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
              </view>
              <view class="flex-1">
                <view class="flex items-center gap-2">
                  <text class="text-sm font-medium text-foreground">{{ host.name }}</text>
                  <view class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-foreground">{{ host.role }}</view>
                  <text v-if="host.isOnline" class="text-[10px] text-green-500">在线</text>
                </view>
                <template v-if="isHostAdded(host.id)">
                  <view class="flex items-center gap-1.5 mt-1">
                    <view
                      v-for="role in (['cohost', 'operator', 'guest'] as const)"
                      :key="role"
                      @click="updateHostRole(host.id, role)"
                      :class="[
                        'px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer',
                        getAddedHost(host.id)?.role === role
                          ? `${getRoleColor(role)} text-white`
                          : 'bg-secondary text-muted-foreground'
                      ]"
                    >
                      {{ getRoleLabel(role) }}
                    </view>
                  </view>
                </template>
                <template v-else>
                  <text class="text-[10px] text-muted-foreground mt-0.5 block">点击添加到团队</text>
                </template>
              </view>
              <view
                @click="toggleHost(host.id)"
                :class="[
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                  isHostAdded(host.id) ? 'border-primary bg-primary' : 'border-border'
                ]"
              >
                <text :class="['text-xs', isHostAdded(host.id) ? 'text-white font-bold' : 'text-muted-foreground']">
                  {{ isHostAdded(host.id) ? '✓' : '➕' }}
                </text>
              </view>
            </view>
          </view>
        </view>
        <view class="p-4 border-t border-border">
          <view @click="showHostPicker = false" class="w-full inline-flex items-center justify-center h-10 text-sm rounded-md bg-primary text-white font-medium">
            完成添加 ({{ hosts.length }}人)
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// ===== Mock 数据 =====

// 圈子列表
const circleList = [
  { id: 1, name: '易学研习社', avatar: '', members: 2860 },
  { id: 2, name: '紫微斗数交流群', avatar: '', members: 1580 },
  { id: 3, name: '风水布局研究会', avatar: '', members: 960 },
]

// 滤镜预设
const filterPresets = [
  { id: 1, name: '原图', preview: '', value: 'none' },
  { id: 2, name: '国风', preview: '', value: 'guofeng' },
  { id: 3, name: '宣纸', preview: '', value: 'xuanzhi' },
  { id: 4, name: '水墨', preview: '', value: 'shuimo' },
  { id: 5, name: '日系', preview: '', value: 'rixi' },
  { id: 6, name: '复古', preview: '', value: 'fugu' },
]

// 虚拟背景
const virtualBackgrounds = [
  { id: 1, name: '书房', preview: '', type: 'image' },
  { id: 2, name: '山水', preview: '', type: 'image' },
  { id: 3, name: '茶室', preview: '', type: 'image' },
  { id: 4, name: '竹林', preview: '', type: 'video' },
  { id: 5, name: '自定义', preview: '', type: 'custom' },
]

// 直播间主题皮肤
const themeSkins = [
  { id: 1, name: '默认', preview: '', color: 'from-gray-500 to-gray-600' },
  { id: 2, name: '国风红', preview: '', color: 'from-red-500 to-rose-600' },
  { id: 3, name: '墨韵', preview: '', color: 'from-gray-800 to-gray-900' },
  { id: 4, name: '青花', preview: '', color: 'from-blue-500 to-indigo-600' },
  { id: 5, name: '金玉', preview: '', color: 'from-amber-500 to-yellow-500' },
]

// 商品列表
const productList = [
  { id: 1, name: '渊海子平精装版', price: 98, image: '', stock: 156 },
  { id: 2, name: '专业罗盘（铜制）', price: 398, image: '', stock: 28 },
  { id: 3, name: '五帝钱开光套装', price: 88, image: '', stock: 89 },
  { id: 4, name: '八字精批课程', price: 199, image: '', stock: 999 },
]

// 可添加的主播/副播
const availableHosts = [
  { id: 1, name: '紫微大师', avatar: '', role: '讲师', isOnline: true },
  { id: 2, name: '易道先生', avatar: '', role: '圈主', isOnline: true },
  { id: 3, name: '风水学徒', avatar: '', role: '助教', isOnline: false },
]

// ===== 角色映射表 =====
const roleMap: Record<string, { label: string; color: string; desc: string }> = {
  cohost: { label: '副播', color: 'bg-orange-500', desc: '推送商品/优惠券/抽奖/弹幕管理' },
  operator: { label: '场控', color: 'bg-blue-500', desc: '后台配置/数据监控/复盘' },
  guest: { label: '嘉宾', color: 'bg-green-500', desc: '连麦互动' },
}

function getRoleLabel(role: string): string {
  return roleMap[role]?.label ?? role
}
function getRoleColor(role: string): string {
  return roleMap[role]?.color ?? 'bg-gray-500'
}
function getRoleDesc(role: string): string {
  return roleMap[role]?.desc ?? ''
}

// ===== 基础信息状态 =====
const title = ref('')
const description = ref('')
const coverImage = ref('')
const liveType = ref<'knowledge' | 'commerce'>('knowledge')
const startTime = ref('')
const duration = ref('60')
const durationLabels = ['30分钟', '1小时', '1.5小时', '2小时', '3小时']
const durationValues = ['30', '60', '90', '120', '180']
const durationIndex = computed(() => Math.max(0, durationValues.indexOf(duration.value)))
function onDurationChange(e: any) { duration.value = durationValues[e.detail.value] }
const selectedCircle = ref<number | null>(null)

// ===== 推流模式 =====
const streamMode = ref<'mobile' | 'obs'>('mobile')

// ===== 视觉配置状态 =====
const beautySettings = ref({ smooth: 50, thin: 30, whiten: 40 })
const selectedFilter = ref('none')
const selectedBackground = ref<number | null>(null)
const enableGreenScreen = ref(false)
const enablePIP = ref(true)

// 美颜滑条数据
const beautyItems = computed(() => [
  { key: 'smooth', label: '磨皮', value: beautySettings.value.smooth },
  { key: 'thin', label: '瘦脸', value: beautySettings.value.thin },
  { key: 'whiten', label: '美白', value: beautySettings.value.whiten },
])

function updateBeauty(key: string, value: number) {
  beautySettings.value = { ...beautySettings.value, [key]: value }
}

// ===== 高级设置状态 =====
const showAdvanced = ref(false)
const enableConnect = ref(true)
const connectSlots = ref(4)
const connectSlotsLabels = ['2个麦位', '4个麦位', '6个麦位']
const connectSlotsValues = [2, 4, 6]
const connectSlotsIndex = computed(() => Math.max(0, connectSlotsValues.indexOf(connectSlots.value)))
function onConnectSlotsChange(e: any) { connectSlots.value = connectSlotsValues[e.detail.value] }
const isPaid = ref(false)
const price = ref('')
const enableReplay = ref(true)
const selectedTheme = ref(1)
const enableFilter = ref(true)
const enableMute = ref(false)

// ===== 商品管理状态 =====
const selectedProducts = ref<number[]>([])
const showProductPicker = ref(false)
const seckillProductId = ref<number | null>(null)

function getProduct(id: number) {
  return productList.find(p => p.id === id)
}

function toggleProduct(id: number) {
  const idx = selectedProducts.value.indexOf(id)
  if (idx >= 0) {
    selectedProducts.value.splice(idx, 1)
  } else {
    selectedProducts.value.push(id)
  }
}

function removeProduct(id: number) {
  selectedProducts.value = selectedProducts.value.filter(pid => pid !== id)
}

// ===== 直播团队管理状态 =====
const hosts = ref<{ id: number; role: string }[]>([])
const showHostPicker = ref(false)
const hostSearchQuery = ref('')

function getHostInfo(id: number) {
  return availableHosts.find(h => h.id === id)
}

function getAddedHost(id: number) {
  return hosts.value.find(h => h.id === id)
}

function isHostAdded(id: number): boolean {
  return !!getAddedHost(id)
}

function toggleHost(id: number) {
  const existing = getAddedHost(id)
  if (existing) {
    hosts.value = hosts.value.filter(h => h.id !== id)
  } else {
    hosts.value.push({ id, role: 'cohost' })
  }
}

function updateHostRole(id: number, role: string) {
  hosts.value = hosts.value.map(h => h.id === id ? { ...h, role } : h)
}

function removeHost(id: number) {
  hosts.value = hosts.value.filter(h => h.id !== id)
}

// ===== 导航 =====
function applyOneClickBeauty() {
  beautySettings.value = { smooth: 100, thin: 80, whiten: 90 }
  uni.showToast({ title: '已应用一键美颜', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
