<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text class="back-icon">←</text><text class="nav-title">入圈申请</text></view><view style="width:48rpx"/></view>
    <view class="stat-bar"><view class="sb-item"><text class="sb-num red">{{pendingRequests.length}}</text><text class="sb-label">待审批</text></view><view class="sb-div"/><view class="sb-item"><text class="sb-num">{{processedRequests.length}}</text><text class="sb-label">已处理</text></view></view>
    <view class="tab-row"><view class="tab" :class="{act:filter==='pending'}" @click="filter='pending';clearSel()">待审批</view><view class="tab" :class="{act:filter==='processed'}" @click="filter='processed';clearSel()">已处理</view></view>

    <view v-if="filter==='pending'&&pendingRequests.length>0" class="batch-bar"><view class="bb-check" @click="handleSelectAll"><view class="bb-cb" :class="{on:selectedIds.size===pendingRequests.length&&pendingRequests.length>0}"><text v-if="selectedIds.size===pendingRequests.length">✓</text></view><text>全选</text></view><view v-if="selectedIds.size>0" class="bb-btn" @click="batchApprove">批量通过({{selectedIds.size}})</view></view>

    <scroll-view v-if="!isLoading" scroll-y class="content" :style="{height:contentH}">
      <view v-if="displayRequests.length===0" class="empty"><text>{{filter==='pending'?'暂无待审批申请':'暂无已处理申请'}}</text></view>
      <view v-for="r in displayRequests" :key="r.id" class="req-card" :class="{sel:selectedIds.has(r.id)}">
        <view class="rc-top">
          <view v-if="r.status==='pending'" class="rc-cb" :class="{on:selectedIds.has(r.id)}" @click="handleSelect(r.id)"><text v-if="selectedIds.has(r.id)">✓</text></view>
          <text class="rc-avatar">{{r.user.name[0]}}</text>
          <view class="rc-info"><text class="rc-name">{{r.user.name}}</text><text v-if="r.status!=='pending'" class="rc-status" :class="r.status==='approved'?'green':'red'">{{r.status==='approved'?'已通过':'已拒绝'}}</text><text v-if="r.user.bio" class="rc-bio">{{r.user.bio}}</text><text class="rc-time">🕐 {{fmtTime(r.createdAt)}}</text></view>
          <text class="rc-expand" @click="toggleExpand(r.id)">{{expandedId===r.id?'▲':'▼'}}</text>
        </view>
        <view class="rc-reason"><text class="rc-rlabel">申请理由：</text>{{r.reason}}</view>
        <view v-if="expandedId===r.id" class="rc-detail"><text>申请时间：{{new Date(r.createdAt).toLocaleString('zh-CN')}}</text><text v-if="r.processedAt">处理时间：{{new Date(r.processedAt).toLocaleString('zh-CN')}}</text><text v-if="r.rejectReason" class="rc-rej">拒绝原因：{{r.rejectReason}}</text></view>
        <view v-if="r.status==='pending'" class="rc-actions"><view class="rca-btn reject" @click="rejectingId=r.id">✕ 拒绝</view><view class="rca-div"/><view class="rca-btn approve" @click="handleApprove(r.id)">✓ 通过</view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>

    <view v-if="rejectingId" class="mask" @click="rejectingId=null"/>
    <view v-if="rejectingId" class="reject-modal">
      <text class="rm-title">拒绝申请</text>
      <textarea v-model="rejectReason" class="rm-input" placeholder="请输入拒绝原因（选填）"/>
      <view class="rm-btns"><view class="rm-btn cancel" @click="rejectingId=null">取消</view><view class="rm-btn ok" @click="handleReject(rejectingId!,rejectReason);rejectReason=''">确认拒绝</view></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const filter=ref<'pending'|'processed'>('pending'),selectedIds=ref(new Set<string>()),expandedId=ref<string|null>(null),rejectingId=ref<string|null>(null),rejectReason=ref(''),isLoading=ref(false)

const mockRequests=[{id:'1',user:{name:'张三',bio:'命理爱好者'},reason:'对八字命理非常感兴趣，希望能加入圈子交流学习。',status:'pending' as const,createdAt:'2024-01-15T10:30:00Z'},{id:'2',user:{name:'李四',bio:'风水师从业5年'},reason:'想与圈内同好交流风水心得。',status:'pending' as const,createdAt:'2024-01-15T09:20:00Z'},{id:'3',user:{name:'王五'},reason:'朋友推荐的圈子。',status:'pending' as const,createdAt:'2024-01-14T18:45:00Z'},{id:'4',user:{name:'赵六',bio:'国学爱好者'},reason:'希望学习传统文化',status:'approved' as const,createdAt:'2024-01-13T14:00:00Z',processedAt:'2024-01-13T16:30:00Z'},{id:'5',user:{name:'钱七'},reason:'...',status:'rejected' as const,createdAt:'2024-01-12T11:00:00Z',processedAt:'2024-01-12T15:00:00Z',rejectReason:'申请理由过于简单'}]
const requests=ref(mockRequests)
const pendingRequests=computed(()=>requests.value.filter(r=>r.status==='pending'))
const processedRequests=computed(()=>requests.value.filter(r=>r.status!=='pending'))
const displayRequests=computed(()=>filter.value==='pending'?pendingRequests.value:processedRequests.value)
const contentH=computed(()=>'calc(100vh - 56px - '+(filter.value==='pending'?'160px':'120px')+')')

function fmtTime(d:string){const dt=new Date(d),h=Math.floor((Date.now()-dt.getTime())/3600000);return h<1?'刚刚':h<24?h+'小时前':Math.floor(h/24)+'天前'}
function handleSelect(id:string){const s=new Set(selectedIds.value);s.has(id)?s.delete(id):s.add(id);selectedIds.value=s}
function clearSel(){selectedIds.value=new Set()}
function handleSelectAll(){if(selectedIds.value.size===pendingRequests.value.length)selectedIds.value=new Set();else selectedIds.value=new Set(pendingRequests.value.map(r=>r.id))}
function toggleExpand(id:string){expandedId.value=expandedId.value===id?null:id}
function handleApprove(id:string){requests.value=requests.value.map(r=>r.id===id?{...r,status:'approved' as const,processedAt:new Date().toISOString()}:r);const s=new Set(selectedIds.value);s.delete(id);selectedIds.value=s}
function handleReject(id:string,reason:string){requests.value=requests.value.map(r=>r.id===id?{...r,status:'rejected' as const,processedAt:new Date().toISOString(),rejectReason:reason||undefined}:r);rejectingId.value=null}
function batchApprove(){const ids=Array.from(selectedIds.value);requests.value=requests.value.map(r=>ids.includes(r.id)?{...r,status:'approved' as const,processedAt:new Date().toISOString()}:r);selectedIds.value=new Set()}

function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx}
.back-icon{font-size:36rpx;color:#2C2C2C}
.nav-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.stat-bar{display:flex;align-items:center;padding:20rpx 24rpx;background:linear-gradient(90deg,rgba(196,30,58,.05),transparent)}
.sb-item{display:flex;align-items:center;gap:8rpx}
.sb-num{font-size:34rpx;font-weight:700;color:#2C2C2C}
.sb-num.red{color:#C41E3A}
.sb-label{font-size:22rpx;color:#999}
.sb-div{width:2rpx;height:40rpx;background:#E8E0D5;margin:0 32rpx}
.tab-row{display:flex;border-bottom:1px solid #E8E0D5;background:#FAF8F5}
.tab{flex:1;text-align:center;padding:20rpx;font-size:26rpx;color:#999;position:relative}
.tab.act{color:#C41E3A;font-weight:500}
.tab.act::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:48rpx;height:4rpx;background:#C41E3A;border-radius:2rpx}
.batch-bar{display:flex;align-items:center;justify-content:space-between;padding:16rpx 24rpx;background:#FAF8F5}
.bb-check{display:flex;align-items:center;gap:8rpx;font-size:24rpx;color:#666}
.bb-cb{width:36rpx;height:36rpx;border-radius:6rpx;border:2rpx solid #D9D9D9;display:flex;align-items:center;justify-content:center;font-size:22rpx}
.bb-cb.on{background:#C41E3A;border-color:#C41E3A;color:#fff}
.bb-btn{padding:10rpx 24rpx;background:#C41E3A;color:#fff;border-radius:40rpx;font-size:24rpx}
.content{padding:24rpx}
.empty{text-align:center;padding:120rpx 0;font-size:26rpx;color:#999}
.req-card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.06)}
.req-card.sel{border:2rpx solid #C41E3A}
.rc-top{display:flex;align-items:flex-start;gap:12rpx}
.rc-cb{width:36rpx;height:36rpx;border-radius:6rpx;border:2rpx solid #D9D9D9;display:flex;align-items:center;justify-content:center;font-size:20rpx;flex-shrink:0;margin-top:6rpx}
.rc-cb.on{background:#C41E3A;border-color:#C41E3A;color:#fff}
.rc-avatar{width:72rpx;height:72rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:28rpx;color:#2C2C2C;flex-shrink:0}
.rc-info{flex:1;min-width:0}
.rc-name{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}
.rc-status{font-size:20rpx;padding:2rpx 12rpx;border-radius:8rpx}
.rc-status.green{background:rgba(34,197,94,.1);color:#22c55e}
.rc-status.red{background:rgba(239,68,68,.1);color:#ef4444}
.rc-bio{font-size:22rpx;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.rc-time{font-size:20rpx;color:#999}
.rc-expand{font-size:28rpx;color:#999;padding:4rpx}
.rc-reason{font-size:24rpx;color:#666;margin-top:12rpx;padding-left:24rpx}
.rc-rlabel{color:#999}
.rc-detail{padding:16rpx 24rpx;margin-top:12rpx;border-top:1px solid #F5F1EB;font-size:22rpx;color:#999;line-height:1.8}
.rc-rej{color:#ef4444}
.rc-actions{display:flex;border-top:1px solid #F5F1EB;margin-top:16rpx}
.rca-btn{flex:1;text-align:center;padding:18rpx;font-size:26rpx}
.rca-btn.reject{color:#666}
.rca-btn.approve{color:#C41E3A;font-weight:500}
.rca-div{width:2rpx;background:#F5F1EB}
.mask{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100}
.reject-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:24rpx;padding:40rpx;width:580rpx;z-index:101}
.rm-title{font-size:32rpx;font-weight:600;color:#2C2C2C;margin-bottom:24rpx;display:block}
.rm-input{width:100%;height:160rpx;padding:20rpx;border:1px solid #E8E0D5;border-radius:16rpx;font-size:24rpx;box-sizing:border-box;resize:none}
.rm-btns{display:flex;gap:16rpx;margin-top:24rpx}
.rm-btn{flex:1;padding:22rpx;text-align:center;border-radius:20rpx;font-size:26rpx}
.rm-btn.cancel{border:1px solid #E8E0D5;color:#666}
.rm-btn.ok{background:#C41E3A;color:#fff}
</style>
