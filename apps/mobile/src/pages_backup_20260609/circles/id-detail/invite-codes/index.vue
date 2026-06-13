<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text class="back-icon">←</text><text class="nav-title">邀请码管理</text></view><text class="nav-add" @click="showCreate=true">＋</text></view>

    <view v-if="isLoading" class="skel"><view v-for="i in 4" :key="i" class="skel-block"/></view>
    <scroll-view v-else scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view class="stats-grid">
        <view class="stat-card red"><text class="sc-val">{{stats.totalInvited}}</text><text class="sc-label">总邀请人数</text></view>
        <view class="stat-card white"><text class="sc-val dark">{{stats.thisWeek}}</text><text class="sc-label">本周新增</text></view>
        <view class="stat-card white"><text class="sc-val dark">{{stats.usedCodes}}</text><text class="sc-label">已使用码</text></view>
        <view class="stat-card white"><text class="sc-val dark">{{stats.pendingCodes}}</text><text class="sc-label">待使用码</text></view>
      </view>

      <text class="list-title">邀请码列表</text>
      <view v-if="inviteCodes.length===0" class="empty"><text class="empty-icon">🎁</text><text class="empty-text">还没有创建邀请码</text><view class="empty-btn" @click="showCreate=true">创建邀请码</view></view>

      <view v-for="code in inviteCodes" :key="code.id" class="code-card" :class="{dim:code.status==='disabled'}">
        <view class="cc-head">
          <view><text class="cc-code">{{code.code}}</text><text class="cc-status" :class="'st-'+code.status">{{statusLabel(code.status)}}</text></view>
          <view class="cc-menu" @click="activeMenu=activeMenu===code.id?null:code.id">⋯</view>
          <view v-if="activeMenu===code.id" class="cc-drop">
            <view v-if="code.status==='active'" class="cc-drop-item" @click="disableCode(code.id)">🚫 禁用</view>
            <view class="cc-drop-item danger" @click="deleteCode(code.id)">🗑️ 删除</view>
          </view>
        </view>
        <text class="cc-date">创建于 {{fmtDate(code.createdAt)}}{{code.expiresAt?'·过期于 '+fmtDate(code.expiresAt):''}}</text>
        <view class="cc-progress"><view class="cc-phead"><text>使用进度</text><text>{{code.usedCount}}/{{code.maxUses}}</text></view><view class="cc-pbar"><view class="cc-pfill" :style="{width:(code.usedCount/code.maxUses*100)+'%'}"/></view></view>
        <view class="cc-btns">
          <view class="cc-btn copy" @click="copyCode(code.code)"><text>{{copiedCode===code.code?'✓已复制':'📋 复制'}}</text></view>
          <view class="cc-btn share" @click="shareCode(code.code)"><text>📤 分享</text></view>
        </view>
        <view v-if="code.usedBy&&code.usedBy.length>0" class="cc-used">
          <view class="cc-used-toggle" @click="expandedCode=expandedCode===code.id?null:code.id"><text>查看使用记录({{code.usedBy.length}})</text><text :class="{rot:expandedCode===code.id}">▼</text></view>
          <view v-if="expandedCode===code.id" class="cc-used-list">
            <view v-for="u in code.usedBy" :key="u.id" class="cc-user"><text class="ccu-avatar">{{u.name[0]}}</text><view><text class="ccu-name">{{u.name}}</text><text class="ccu-date">{{u.usedAt}}</text></view></view>
          </view>
        </view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>

    <view v-if="showCreate" class="mask" @click="showCreate=false"/>
    <view v-if="showCreate" class="create-sheet">
      <view class="cs-head"><text class="cs-title">生成新邀请码</text><text class="cs-close" @click="showCreate=false">✕</text></view>
      <view class="cs-body">
        <text class="cs-label">最大使用次数</text>
        <view class="cs-nums"><text v-for="n in [5,10,20,50,100]" :key="n" class="cs-num" :class="{sel:newMax===n}" @click="newMax=n">{{n}}次</text></view>
        <view class="cs-hint">💡 邀请码生成后，被邀请人可通过邀请码直接加入圈子</view>
      </view>
      <view class="cs-foot"><view class="cs-submit" :class="{dis:creating}" @click="handleCreate"><text>{{creating?'生成中...':'生成邀请码'}}</text></view></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const isLoading=ref(true),inviteCodes=ref<any[]>([])
const stats=ref({totalInvited:156,usedCodes:12,pendingCodes:5,thisWeek:23})
const activeMenu=ref<string|null>(null),expandedCode=ref<string|null>(null),copiedCode=ref<string|null>(null)
const showCreate=ref(false),newMax=ref(10),creating=ref(false)

const mockCodes=[{id:'1',code:'GUOXUE2024A',maxUses:10,usedCount:8,status:'active',createdAt:'2024-01-15',usedBy:[{id:'1',name:'张三',usedAt:'2024-01-16'},{id:'2',name:'李四',usedAt:'2024-01-17'}]},{id:'2',code:'GUOXUE2024B',maxUses:5,usedCount:5,status:'expired',createdAt:'2024-01-10',expiresAt:'2024-01-20'},{id:'3',code:'VIP888',maxUses:100,usedCount:45,status:'active',createdAt:'2024-01-01'},{id:'4',code:'TEST123',maxUses:3,usedCount:1,status:'disabled',createdAt:'2024-01-05'}]

function statusLabel(s:string){const m:any={active:'有效',disabled:'已禁用',expired:'已过期'};return m[s]||s}
function fmtDate(d:string){return new Date(d).getMonth()+1+'/'+new Date(d).getDate()}

async function handleCreate(){creating.value=true;await new Promise(r=>setTimeout(r,1000));inviteCodes.value.unshift({id:Date.now().toString(),code:'NEW'+Math.random().toString(36).substring(2,8).toUpperCase(),maxUses:newMax.value,usedCount:0,status:'active',createdAt:new Date().toISOString()});stats.value.pendingCodes++;showCreate.value=false;creating.value=false}
function disableCode(id:string){inviteCodes.value=inviteCodes.value.map(c=>c.id===id?{...c,status:'disabled'}:c);activeMenu.value=null}
function deleteCode(id:string){inviteCodes.value=inviteCodes.value.filter(c=>c.id!==id);activeMenu.value=null}
function copyCode(code:string){uni.setClipboardData({data:code});copiedCode.value=code;setTimeout(()=>copiedCode.value=null,2000)}
function shareCode(code:string){const url='/pages/circles/id-detail/join?code='+code;uni.setClipboardData({data:url});copiedCode.value=code;setTimeout(()=>copiedCode.value=null,2000)}

function goBack(){uni.navigateBack()}
onMounted(async()=>{await new Promise(r=>setTimeout(r,600));inviteCodes.value=mockCodes;isLoading.value=false})
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx}
.back-icon{font-size:36rpx;color:#2C2C2C}
.nav-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.nav-add{font-size:36rpx;color:#C41E3A;padding:8rpx}
.content{padding:24rpx}
.stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-bottom:24rpx}
.stat-card{border-radius:20rpx;padding:28rpx}
.stat-card.red{background:linear-gradient(135deg,#C41E3A,#A01830)}
.stat-card.white{background:#fff;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.sc-val{font-size:40rpx;font-weight:700;color:#fff;display:block;margin-bottom:4rpx}
.sc-val.dark{color:#2C2C2C}
.sc-label{font-size:22rpx;color:rgba(255,255,255,.8)}
.stat-card.white .sc-label{color:#999}
.list-title{font-size:24rpx;color:#999;margin-bottom:16rpx;display:block}
.empty{text-align:center;padding:100rpx 0}
.empty-icon{font-size:80rpx;display:block;margin-bottom:16rpx}
.empty-text{font-size:26rpx;color:#999;margin-bottom:24rpx}
.empty-btn{display:inline-block;padding:16rpx 48rpx;background:#C41E3A;color:#fff;border-radius:40rpx;font-size:26rpx}
.code-card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04);position:relative}
.code-card.dim{opacity:.6}
.cc-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8rpx}
.cc-code{font-size:34rpx;font-weight:700;color:#2C2C2C;font-family:monospace}
.cc-status{font-size:20rpx;padding:4rpx 14rpx;border-radius:8rpx;margin-left:12rpx}
.st-active{background:rgba(34,197,94,.1);color:#22c55e}
.st-disabled{background:#f0f0f0;color:#999}
.st-expired{background:rgba(249,115,22,.1);color:#f97316}
.cc-menu{font-size:36rpx;color:#999;padding:4rpx 12rpx;z-index:1}
.cc-drop{position:absolute;right:24rpx;top:60rpx;background:#fff;border-radius:16rpx;box-shadow:0 4rpx 20rpx rgba(0,0,0,.1);z-index:10;overflow:hidden}
.cc-drop-item{padding:16rpx 28rpx;font-size:24rpx;color:#666;border-bottom:1px solid #F5F1EB}
.cc-drop-item.danger{color:#C41E3A;border-bottom:none}
.cc-date{font-size:22rpx;color:#999;display:block;margin-bottom:16rpx}
.cc-progress{margin-bottom:16rpx}
.cc-phead{display:flex;justify-content:space-between;font-size:22rpx;color:#999;margin-bottom:6rpx}
.cc-pbar{height:12rpx;background:#F5F1EB;border-radius:6rpx;overflow:hidden}
.cc-pfill{height:100%;background:linear-gradient(90deg,#C41E3A,#E85A5A);border-radius:6rpx}
.cc-btns{display:flex;gap:12rpx;margin-bottom:16rpx}
.cc-btn{flex:1;padding:18rpx;text-align:center;border-radius:16rpx;font-size:24rpx}
.cc-btn.copy{background:#F5F1EB;color:#666}
.cc-btn.share{background:#C41E3A;color:#fff}
.cc-used-toggle{display:flex;justify-content:space-between;padding:16rpx 0;border-top:1px solid #F5F1EB;font-size:24rpx;color:#999}
.rot{transform:rotate(180deg)}
.cc-used-list{padding-bottom:8rpx}
.cc-user{display:flex;align-items:center;gap:12rpx;padding:12rpx;background:#F5F1EB;border-radius:16rpx;margin-bottom:8rpx}
.ccu-avatar{width:48rpx;height:48rpx;border-radius:50%;background:#E8E0D5;display:flex;align-items:center;justify-content:center;font-size:20rpx;color:#999}
.ccu-name{font-size:24rpx;color:#2C2C2C;display:block}
.ccu-date{font-size:20rpx;color:#999}
.mask{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100}
.create-sheet{position:fixed;bottom:0;left:0;right:0;background:#fff;border-radius:32rpx 32rpx 0 0;z-index:101}
.cs-head{display:flex;justify-content:space-between;align-items:center;padding:24rpx;border-bottom:1px solid #E8E0D5}
.cs-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.cs-close{font-size:28rpx;color:#999;padding:8rpx}
.cs-body{padding:24rpx}
.cs-label{font-size:26rpx;font-weight:500;color:#2C2C2C;margin-bottom:16rpx;display:block}
.cs-nums{display:flex;gap:12rpx;margin-bottom:24rpx}
.cs-num{flex:1;padding:20rpx;text-align:center;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;color:#999}
.cs-num.sel{background:#C41E3A;color:#fff}
.cs-hint{background:#FFF8E6;padding:20rpx;border-radius:16rpx;font-size:22rpx;color:#8B6914}
.cs-foot{padding:24rpx;border-top:1px solid #E8E0D5}
.cs-submit{padding:24rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E85A5A);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:500}
.cs-submit.dis{opacity:.5}
.skel{padding:24rpx}
.skel-block{height:120rpx;background:#e8e8e8;border-radius:20rpx;margin-bottom:16rpx}
</style>
