<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text class="back-icon">←</text><text class="nav-title">知识库</text></view><view style="width:48rpx"/></view>
    <view class="search-wrap"><text class="s-icon">🔍</text><input v-model="keyword" class="s-input" placeholder="搜索知识..."/></view>
    <view class="tab-row"><view class="tab" :class="{act:activeTab==='confirmed'}" @click="activeTab='confirmed'"><text>📚 已入库</text></view><view v-if="isOwner" class="tab" :class="{act:activeTab==='pending'}" @click="activeTab='pending'"><text>待确认</text><text v-if="pendingCount>0" class="tab-badge">{{pendingCount}}</text></view></view>

    <view v-if="loading" class="skel"><view v-for="i in 4" :key="i" class="skel-item"/></view>
    <view v-else-if="items.length===0" class="empty"><text class="empty-icon">📚</text><text>{{activeTab==='confirmed'?'暂无知识内容':'暂无待确认内容'}}</text></view>
    <scroll-view v-else scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px - 56px)'}">
      <view v-for="item in items" :key="item.id" class="k-card">
        <view class="kc-head"><text class="kc-title">{{item.title}}</text><text v-if="item.status==='pending'" class="kc-badge">待确认</text></view>
        <text class="kc-summary">{{item.summary}}</text>
        <view v-if="item.tags&&item.tags.length>0" class="kc-tags"><text v-for="t in item.tags.slice(0,3)" :key="t" class="kc-tag">🏷️{{t}}</text></view>
        <view class="kc-meta"><text>📄 {{sourceLabel(item.source.type)}}：{{item.source.name}}</text><text class="kc-date">🕐 {{new Date(item.createdAt).toLocaleDateString()}}</text></view>
        <view v-if="expandedId===item.id" class="kc-body"><text class="kc-content">{{item.content}}</text></view>
        <view class="kc-toggle" @click="toggleExpand(item.id)"><text>{{expandedId===item.id?'收起':'查看详情'}} {{expandedId===item.id?'▲':'▼'}}</text></view>
        <view v-if="isOwner&&item.status==='pending'" class="kc-actions"><view class="kca-btn ignore" @click="handleIgnore(item.id)">✕ 忽略</view><view class="kca-div"/><view class="kca-btn confirm" @click="handleConfirm(item.id)">✓ 确认入库</view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const activeTab=ref<'confirmed'|'pending'>('confirmed'),keyword=ref(''),items=ref<any[]>([]),loading=ref(true),isOwner=ref(true),expandedId=ref<string|null>(null),pendingCount=ref(5)

const mockItems=[{id:'1',title:'八字命理中的天干地支基础知识',summary:'天干地支是中国古代记录时间的系统，由十天干和十二地支组成。',content:'天干包括：甲、乙、丙、丁、戊、己、庚、辛、壬、癸\n地支包括：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥',source:{type:'post',name:'周易大师的帖子'},status:'confirmed',tags:['八字','天干地支','基础'],createdAt:'2024-01-15T10:00:00Z'},{id:'2',title:'紫微斗数十二宫位详解',summary:'紫微斗数的命盘由十二个宫位组成，分别是命宫、兄弟宫、夫妻宫...',content:'紫微斗数的命盘由十二个宫位组成\n1.命宫-代表个人性格特质\n2.兄弟宫-兄弟姐妹关系\n3.夫妻宫-婚姻感情',source:{type:'article',name:'紫微斗数入门'},status:'confirmed',tags:['紫微斗数','宫位'],createdAt:'2024-01-14T15:30:00Z'},{id:'3',title:'风水中的五行生克关系',summary:'五行相生：木生火、火生土、土生金、金生水、水生木。',content:'五行相生：木生火、火生土、土生金、金生水、水生木\n五行相克：木克土、土克水、水克火、火克金、金克木',source:{type:'manual',name:'管理员整理'},status:activeTab.value, tags:['风水','五行'],createdAt:'2024-01-13T09:00:00Z'}]

function sourceLabel(t:string){const m:any={post:'帖子',article:'文章',manual:'手动'};return m[t]||t}
function toggleExpand(id:string){expandedId.value=expandedId.value===id?null:id}
function handleConfirm(id:string){items.value=items.value.filter(i=>i.id!==id)}
function handleIgnore(id:string){items.value=items.value.filter(i=>i.id!==id)}
function goBack(){uni.navigateBack()}

onMounted(async()=>{await new Promise(r=>setTimeout(r,600));items.value=mockItems.map(i=>({...i,status:activeTab.value}));loading.value=false})
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx}
.back-icon{font-size:36rpx;color:#2C2C2C}
.nav-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.search-wrap{display:flex;align-items:center;padding:16rpx 24rpx}
.s-icon{font-size:28rpx;margin-right:12rpx}
.s-input{flex:1;height:72rpx;background:#fff;border-radius:40rpx;padding:0 24rpx;font-size:26rpx;color:#2C2C2C}
.tab-row{display:flex;border-bottom:1px solid #E8E0D5}
.tab{flex:1;text-align:center;padding:20rpx;font-size:26rpx;color:#999;position:relative;border-bottom:2rpx solid transparent}
.tab.act{color:#C41E3A;border-bottom-color:#C41E3A}
.tab-badge{position:absolute;top:12rpx;margin-left:8rpx;background:#C41E3A;color:#fff;font-size:18rpx;padding:2rpx 10rpx;border-radius:20rpx}
.skel{padding:24rpx}.skel-item{height:180rpx;background:#e8e8e8;border-radius:16rpx;margin-bottom:16rpx}
.empty{text-align:center;padding:120rpx 0;font-size:26rpx;color:#999}
.empty-icon{font-size:72rpx;display:block;margin-bottom:16rpx}
.content{padding:24rpx}
.k-card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.kc-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12rpx}
.kc-title{font-size:28rpx;font-weight:600;color:#2C2C2C;flex:1}
.kc-badge{font-size:20rpx;padding:4rpx 14rpx;background:rgba(249,115,22,.1);color:#f97316;border-radius:8rpx;margin-left:12rpx}
.kc-summary{font-size:24rpx;color:#666;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12rpx}
.kc-tags{display:flex;flex-wrap:wrap;gap:8rpx;margin-bottom:12rpx}
.kc-tag{font-size:20rpx;padding:4rpx 12rpx;background:#FAF8F5;border-radius:8rpx;color:#999}
.kc-meta{display:flex;justify-content:space-between;font-size:20rpx;color:#999;margin-bottom:12rpx}
.kc-date{margin-left:auto}
.kc-body{margin-top:12rpx;padding-top:12rpx;border-top:1px solid #E8E0D5}
.kc-content{font-size:24rpx;color:#666;line-height:1.6;white-space:pre-wrap}
.kc-toggle{text-align:center;padding:12rpx 0 0;font-size:24rpx;color:#C41E3A}
.kc-actions{display:flex;border-top:1px solid #E8E0D5;margin-top:16rpx}
.kca-btn{flex:1;text-align:center;padding:16rpx;font-size:24rpx}
.kca-btn.ignore{color:#999}.kca-btn.confirm{color:#C41E3A;font-weight:500}
.kca-div{width:2rpx;background:#E8E0D5}
</style>
