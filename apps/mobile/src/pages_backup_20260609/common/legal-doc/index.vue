<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text class="back-icon">←</text><text class="nav-title">{{doc.title||'法律文档'}}</text></view><text v-if="toc.length>0" class="toc-btn" @click="showToc=!showToc">目录</text></view>

    <view v-if="isLoading" class="loading"><text class="spinner">⏳</text></view>
    <view v-else-if="!doc" class="empty"><text>📄</text><text>文档不存在</text></view>
    <view v-else class="body">
      <view class="meta"><text>版本：{{doc.version||'-'}}</text><text>生效日期：{{doc.effectiveDate||'-'}}</text></view>
      <view v-if="doc.hasConfirmed" class="confirmed"><text>✓ 您已确认</text></view>

      <scroll-view scroll-y class="doc-content" :style="{height:needConfirm?'calc(100vh - 56px - 80rpx - 140rpx)':'calc(100vh - 56px - 80rpx)'}" @scrolltolower="hasScrolled=true">
        <rich-text :nodes="doc.htmlContent||doc.plainContent" class="richtext"/>
        <view v-if="!doc.htmlContent&&!doc.plainContent" class="fallback">
          <view v-for="(s,i) in sections" :key="i"><text class="s-h2" v-if="s.startsWith('##')">{{s.replace('##','').trim()}}</text><text class="s-p" v-else>{{s}}</text></view>
        </view>
        <view style="height:48rpx"/>
      </scroll-view>

      <view v-if="needConfirm" class="confirm-bar">
        <view v-if="!hasScrolled" class="cb-hint"><text>请滚动到页面底部后确认</text></view>
        <view class="cb-btn" :class="{dis:!hasScrolled||isConfirming}" @click="handleConfirm">
          <text>{{isConfirming?'⏳确认中...':hasScrolled?'✓ 我已阅读并同意':'请阅读完整内容'}}</text>
        </view>
      </view>
      <view v-else class="back-bar"><view class="cb-btn" @click="goBack"><text>返回</text></view></view>
    </view>

    <view v-if="showToc" class="toc-mask" @click="showToc=false"/>
    <view v-if="showToc" class="toc-panel">
      <text class="toc-panel-title">目录</text>
      <view v-for="item in toc" :key="item.id" class="toc-link" :class="'lv'+item.level" @click="showToc=false">{{item.title}}</view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const isLoading=ref(true),doc=ref<any>(null),toc=ref<any[]>([]),needConfirm=ref(true),hasScrolled=ref(false),isConfirming=ref(false),showToc=ref(false)

const sections=['## 第一条 总则','本协议是用户与平台之间关于使用服务的法律协议。','## 第二条 用户注册','用户应提供真实、准确的注册信息。','## 第三条 用户行为规范','用户不得利用平台进行违法活动。','## 第四条 知识产权','平台内容受知识产权法保护。','## 第五条 免责声明','平台不对用户间的交易承担责任。','## 第六条 协议修改','平台有权修改本协议，修改后公示即生效。']

onMounted(async()=>{await new Promise(r=>setTimeout(r,600));doc.value={title:'用户协议',version:'v2.1',effectiveDate:'2024-01-01',requireConfirm:true,hasConfirmed:false};toc.value=[{id:'h1',title:'第一条 总则',level:2},{id:'h2',title:'第二条 用户注册',level:2},{id:'h3',title:'第三条 用户行为规范',level:2},{id:'h4',title:'第四条 知识产权',level:2},{id:'h5',title:'第五条 免责声明',level:2},{id:'h6',title:'第六条 协议修改',level:2}];isLoading.value=false})

async function handleConfirm(){isConfirming.value=true;await new Promise(r=>setTimeout(r,800));doc.value={...doc.value,hasConfirmed:true};isConfirming.value=false;setTimeout(()=>uni.navigateBack(),500)}
function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx}
.back-icon{font-size:36rpx;color:#2C2C2C}
.nav-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.toc-btn{font-size:26rpx;color:#C41E3A}
.loading{display:flex;align-items:center;justify-content:center;padding:120rpx 0}
.spinner{font-size:56rpx;animation:spin 1s linear infinite}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.empty{display:flex;flex-direction:column;align-items:center;padding:120rpx 0;font-size:26rpx;color:#999;gap:16rpx}
.meta{display:flex;gap:32rpx;padding:20rpx 24rpx;background:#F5F1EB;font-size:22rpx;color:#999;border-bottom:1px solid #E8E0D5}
.confirmed{display:flex;align-items:center;gap:8rpx;padding:16rpx 24rpx;background:rgba(34,197,94,.08);font-size:22rpx;color:#22c55e}
.doc-content{padding:24rpx}
.richtext{font-size:28rpx;color:#2C2C2C;line-height:1.8}
.fallback{}
.s-h2{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block;margin:32rpx 0 16rpx;padding-bottom:12rpx;border-bottom:1px solid #E8E0D5}
.s-p{font-size:26rpx;color:#666;line-height:1.8;margin-bottom:16rpx}

.confirm-bar,.back-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #E8E0D5;padding:20rpx 24rpx;z-index:50}
.cb-hint{text-align:center;font-size:22rpx;color:#999;margin-bottom:8rpx}
.cb-btn{width:100%;padding:24rpx;text-align:center;border-radius:24rpx;font-size:28rpx;font-weight:500;background:#C41E3A;color:#fff}
.cb-btn.dis{background:#D9D9D9;color:#999}
.toc-mask{position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:50}
.toc-panel{position:fixed;top:56px;right:0;bottom:0;width:420rpx;background:#fff;z-index:51;padding:24rpx;overflow-y:auto}
.toc-panel-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}
.toc-link{display:block;padding:16rpx 12rpx;font-size:24rpx;color:#666;border-radius:12rpx}
.toc-link.lv2{font-weight:500}.toc-link.lv3{padding-left:36rpx;font-size:22rpx}
</style>
